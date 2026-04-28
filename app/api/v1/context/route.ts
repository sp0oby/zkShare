import { randomBytes, randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { contextRequestSchema } from "@/types";
import type { ApiErrorCode, ContextOperation } from "@/types";
import { validateApiKey, incrementApiKeyUsage } from "@/lib/api-key";
import { rateLimitOrThrow, RATE_LIMIT_RETRY_AFTER_SEC } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-server";
import { encryptFactPlaintext } from "@/lib/encryption";
import {
  computeCommitment,
  buildProofPayload,
  answerYesNoFromPlaintext,
  verifyZkshareProofDetailed,
} from "@/lib/zk";
import { DB_EMBEDDING_DIM, embedText, projectEmbeddingToDb, toPgVectorString } from "@/lib/embeddings";
import { decryptFactRow } from "@/lib/encryption";
import { runSandbox } from "@/lib/sandbox";
import { semanticSearchOverFacts, hydrateSearchResults, type RankedFactRow } from "@/lib/search";
import { logError } from "@/lib/logger";
import { assertCryptoSecrets, assertSupabaseConfig } from "@/lib/env";

export const runtime = "nodejs";

assertCryptoSecrets();
assertSupabaseConfig();

/** Max JSON body size for /context (bytes) — agents should stream large payloads elsewhere */
const MAX_BODY_BYTES = 512 * 1024;

function corsHeaders(request: NextRequest): Record<string, string> {
  const configured = process.env.ZKSHARE_CORS_ORIGIN?.trim() ?? "";
  const origin = request.headers.get("origin")?.trim() ?? "";

  const baseHeaders: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization, x-request-id",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (!configured) {
    return baseHeaders;
  }

  if (configured === "*") {
    return { ...baseHeaders, "Access-Control-Allow-Origin": "*" };
  }

  const allowList = configured
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (origin && allowList.includes(origin)) {
    return { ...baseHeaders, "Access-Control-Allow-Origin": origin };
  }

  return baseHeaders;
}

function responseHeaders(
  request: NextRequest,
  requestId: string,
  extra?: Record<string, string>,
): Record<string, string> {
  return {
    ...corsHeaders(request),
    "x-request-id": requestId,
    ...extra,
  };
}

function err(
  request: NextRequest,
  requestId: string,
  status: number,
  code: ApiErrorCode,
  message: string,
  extraHeaders?: Record<string, string>,
) {
  return NextResponse.json(
    { success: false, error: code, message, request_id: requestId },
    { status, headers: responseHeaders(request, requestId, extraHeaders) },
  );
}

function ok<T extends Record<string, unknown>>(
  request: NextRequest,
  requestId: string,
  operation: ContextOperation,
  data: T,
  proof: string | null,
  verified: boolean,
  usage: { calls: number; limit: number },
) {
  return NextResponse.json(
    {
      success: true,
      operation,
      data,
      proof,
      verified,
      timestamp: new Date().toISOString(),
      usage,
      request_id: requestId,
    },
    { headers: responseHeaders(request, requestId) },
  );
}

export async function OPTIONS(request: NextRequest) {
  const rid = request.headers.get("x-request-id")?.trim() || randomUUID();
  return new NextResponse(null, { status: 204, headers: responseHeaders(request, rid) });
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id")?.trim() || randomUUID();

  const len = request.headers.get("content-length");
  if (len && Number(len) > MAX_BODY_BYTES) {
    return err(request, requestId, 413, "VALIDATION_ERROR", "Request body too large");
  }

  const apiKeyHeader = request.headers.get("x-api-key");
  const keyRow = await validateApiKey(apiKeyHeader);
  if (!keyRow) {
    return err(request, requestId, 401, "INVALID_API_KEY", "API key is revoked or invalid");
  }

  try {
    await rateLimitOrThrow(keyRow.id, keyRow.monthly_limit);
  } catch (e) {
    if ((e as Error & { code?: string }).code === "RATE_LIMITED") {
      return err(request, requestId, 429, "RATE_LIMITED", "Too many requests for this API key", {
        "Retry-After": String(RATE_LIMIT_RETRY_AFTER_SEC),
      });
    }
    throw e;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err(request, requestId, 400, "VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = contextRequestSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors.join("; ") || "Invalid request";
    return err(request, requestId, 400, "VALIDATION_ERROR", msg);
  }

  const input = parsed.data;
  const logicalUserId = input.user_id ?? "";
  const supabase = createSupabaseServiceRoleClient();

  const finish = async <T extends Record<string, unknown>>(
    operation: ContextOperation,
    data: T,
    proof: string | null,
    verified: boolean,
  ) => {
    await incrementApiKeyUsage(keyRow.id);
    await writeAuditLog({
      operation,
      apiKeyId: keyRow.id,
      logicalUserId,
      payload: { operation, request_id: requestId },
    });
    const calls = keyRow.calls_this_month + 1;
    return ok(request, requestId, operation, data, proof, verified, {
      calls,
      limit: keyRow.monthly_limit,
    });
  };

  try {
    switch (input.operation) {
      case "store": {
        const hasClientBundle = Boolean(
          input.ciphertext?.trim() &&
            input.iv?.trim() &&
            input.auth_tag?.trim() &&
            input.commitment?.trim(),
        );

        if (hasClientBundle) {
          const embeddingVec = projectEmbeddingToDb(input.embedding!);

          const { data: inserted, error } = await supabase
            .from("facts")
            .upsert(
              {
                api_key_id: keyRow.id,
                logical_user_id: logicalUserId,
                fact_key: input.fact_key!,
                ciphertext: input.ciphertext!.trim(),
                iv: input.iv!.trim(),
                auth_tag: input.auth_tag!.trim(),
                commitment: input.commitment!.trim(),
                embedding: toPgVectorString(embeddingVec),
                client_encrypted: true,
              },
              { onConflict: "api_key_id,logical_user_id,fact_key" },
            )
            .select("id")
            .single();

          if (error) {
            logError("store_client_sealed_failed", {
              request_id: requestId,
              message: error.message,
            });
            return err(request, requestId, 500, "INTERNAL_ERROR", "Could not persist fact");
          }

          return finish(
            "store",
            {
              fact_id: inserted.id,
              commitment: input.commitment!.trim(),
              client_encrypted: true,
            },
            null,
            true,
          );
        }

        const enc = encryptFactPlaintext(input.value!);
        const commitment = computeCommitment(input.fact_key!, input.value!);
        const embeddingVec =
          input.embedding && input.embedding.length === DB_EMBEDDING_DIM
            ? projectEmbeddingToDb(input.embedding)
            : await embedText(`${input.fact_key}: ${input.value}`);

        const { data: inserted, error } = await supabase
          .from("facts")
          .upsert(
            {
              api_key_id: keyRow.id,
              logical_user_id: logicalUserId,
              fact_key: input.fact_key!,
              ciphertext: enc.ciphertext,
              iv: enc.iv,
              auth_tag: enc.authTag,
              commitment,
              embedding: toPgVectorString(embeddingVec),
              client_encrypted: false,
            },
            { onConflict: "api_key_id,logical_user_id,fact_key" },
          )
          .select("id")
          .single();

        if (error) {
          logError("store_server_sealed_failed", {
            request_id: requestId,
            message: error.message,
          });
          return err(request, requestId, 500, "INTERNAL_ERROR", "Could not persist fact");
        }

        return finish(
          "store",
          { fact_id: inserted.id, commitment, client_encrypted: false },
          `zkshare:v1+hmac;groth16:optional:${commitment}`,
          true,
        );
      }
      case "prove": {
        const { data: fact, error } = await supabase
          .from("facts")
          .select("*")
          .eq("api_key_id", keyRow.id)
          .eq("logical_user_id", logicalUserId)
          .eq("fact_key", input.fact_key!)
          .maybeSingle();

        if (error || !fact) {
          return err(request, requestId, 404, "FACT_NOT_FOUND", "No fact found for this key and user scope");
        }

        if ((fact as { client_encrypted?: boolean }).client_encrypted) {
          return err(
            request,
            requestId,
            422,
            "CLIENT_ENCRYPTED",
            "This fact was client-sealed; the server cannot decrypt it. Run prove locally or use server-sealed store.",
          );
        }

        let plaintext: string;
        try {
          plaintext = decryptFactRow(fact as Record<string, unknown>);
        } catch {
          return err(request, requestId, 400, "PROOF_FAILED", "Unable to decrypt fact payload");
        }

        const answer = await answerYesNoFromPlaintext(input.query!, plaintext);
        if (answer === "unknown") {
          return err(
            request,
            requestId,
            400,
            "PROOF_FAILED",
            "Could not derive a definite yes/no answer for this query",
          );
        }

        const { proof, verified } = buildProofPayload({
          factId: fact.id as string,
          commitment: fact.commitment as string,
          query: input.query!,
          answer,
        });

        return finish("prove", { answer, commitment: fact.commitment }, proof, verified);
      }
      case "share": {
        const { data: fact, error } = await supabase
          .from("facts")
          .select("*")
          .eq("api_key_id", keyRow.id)
          .eq("logical_user_id", logicalUserId)
          .eq("fact_key", input.fact_key!)
          .maybeSingle();

        if (error || !fact) {
          return err(request, requestId, 404, "FACT_NOT_FOUND", "No fact found for this key and user scope");
        }

        if ((fact as { client_encrypted?: boolean }).client_encrypted) {
          return err(
            request,
            requestId,
            422,
            "CLIENT_ENCRYPTED",
            "This fact was client-sealed; the server cannot decrypt it. Run share locally or use server-sealed store.",
          );
        }

        let sharePlaintext: string;
        try {
          sharePlaintext = decryptFactRow(fact as Record<string, unknown>);
        } catch {
          return err(request, requestId, 400, "PROOF_FAILED", "Unable to decrypt fact payload");
        }
        const answer = await answerYesNoFromPlaintext(input.query!, sharePlaintext);
        if (answer === "unknown") {
          return err(
            request,
            requestId,
            400,
            "PROOF_FAILED",
            "Could not derive a definite yes/no answer for this query",
          );
        }
        const { proof, verified } = buildProofPayload({
          factId: fact.id as string,
          commitment: fact.commitment as string,
          query: input.query!,
          answer,
        });

        const shareToken = randomBytes(24).toString("base64url");
        const expiresAt = new Date(Date.now() + 7 * 864e5).toISOString();

        await supabase.from("share_tokens").insert({
          token: shareToken,
          fact_id: fact.id,
          recipient_agent_id: input.recipient_agent_id!,
          proof,
          expires_at: expiresAt,
        });

        return finish(
          "share",
          {
            share_token: shareToken,
            proof,
            expires_at: expiresAt,
            recipient_agent_id: input.recipient_agent_id,
          },
          proof,
          verified,
        );
      }
      case "search": {
        const qVec = await embedText(input.query!);
        const evStr = toPgVectorString(qVec);

        const { data: rpcRows, error: rpcErr } = await supabase.rpc("match_facts", {
          p_api_key_id: keyRow.id,
          p_logical_user_id: logicalUserId,
          query_embedding: evStr,
          match_count: 12,
        });

        let results: { fact_key: string; relevance: number; answer: string }[];

        if (!rpcErr && rpcRows && Array.isArray(rpcRows) && rpcRows.length > 0) {
          const ranked: RankedFactRow[] = (rpcRows as Record<string, unknown>[]).map((r) => ({
            id: String(r.id),
            fact_key: String(r.fact_key),
            commitment: String(r.commitment),
            ciphertext: String(r.ciphertext),
            iv: String(r.iv),
            auth_tag: String(r.auth_tag ?? (r as { authTag?: string }).authTag ?? ""),
            embedding: r.embedding as RankedFactRow["embedding"],
            client_encrypted: Boolean((r as { client_encrypted?: boolean }).client_encrypted),
            similarity: Number(r.similarity),
          }));
          results = await hydrateSearchResults({ query: input.query!, rows: ranked });
        } else {
          const { data: rows, error } = await supabase
            .from("facts")
            .select("id, fact_key, commitment, ciphertext, iv, auth_tag, embedding, client_encrypted")
            .eq("api_key_id", keyRow.id)
            .eq("logical_user_id", logicalUserId)
            .eq("client_encrypted", false);

          if (error) {
            logError("search_fallback_failed", {
              request_id: requestId,
              message: error.message,
            });
            return err(request, requestId, 500, "INTERNAL_ERROR", "Search failed");
          }

          results = await semanticSearchOverFacts({
            query: input.query!,
            rows: (rows ?? []) as import("@/lib/search").FactSearchRow[],
          });
        }

        return finish("search", { results }, null, true);
      }
      case "sandbox": {
        const exec = await runSandbox({
          action: input.action!,
          parameters: input.parameters ?? {},
          userId: logicalUserId || undefined,
        });
        return finish(
          "sandbox",
          {
            result: exec.result,
            attestation: exec.attestation,
          },
          exec.proof_of_execution,
          exec.attestation.verified,
        );
      }
      case "verify_proof": {
        const verdict = verifyZkshareProofDetailed(input.proof!.trim());
        if (verdict.status === "malformed") {
          return err(
            request,
            requestId,
            400,
            "VALIDATION_ERROR",
            "Proof is not a valid zkshare proof string (expected base64url JSON envelope)",
          );
        }
        const valid = verdict.status === "valid";
        return finish("verify_proof", { valid }, input.proof!.trim(), valid);
      }
      default:
        return err(request, requestId, 400, "VALIDATION_ERROR", "Unsupported operation");
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    logError("context_operation_failed", { request_id: requestId, message });
    return err(
      request,
      requestId,
      500,
      "INTERNAL_ERROR",
      "An internal error occurred. Reference the request_id when contacting support.",
    );
  }
}
