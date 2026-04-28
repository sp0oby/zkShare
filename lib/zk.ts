import { createHash, createHmac, randomBytes } from "crypto";
import "server-only";
import { chatModelId, externalLlmDisabled, getOpenAICompatibleClient } from "@/lib/llm-client";

const VERSION = "zkshare-v1";

function proofSecret(): string {
  const s = process.env.ZKSHARE_PROOF_SECRET;
  if (!s || s.length < 16) {
    throw new Error("ZKSHARE_PROOF_SECRET must be set for commitment and proof HMACs");
  }
  return s;
}

/** Deterministic commitment to a fact value (stored alongside ciphertext; not reversible without secret). */
export function computeCommitment(factKey: string, plaintext: string): string {
  const salt = createHmac("sha256", proofSecret())
    .update(factKey)
    .digest("hex")
    .slice(0, 16);
  const h = createHash("sha256")
    .update(`${VERSION}:${factKey}:${salt}:${plaintext}`)
    .digest("hex");
  return `0x${h}`;
}

/**
 * Production proof envelope: binds commitment + natural-language query + yes/no answer.
 * Add Circom/Groth16 artifacts via `lib/zk-snark.ts` + `circuits/` when `commit.wasm` / `commit.zkey` are built.
 */
export function buildProofPayload(input: {
  factId: string;
  commitment: string;
  query: string;
  answer: "yes" | "no" | "unknown";
}): { proof: string; verified: true } {
  const nonce = randomBytes(8).toString("hex");
  const canonical = JSON.stringify({
    v: VERSION,
    fact_id: input.factId,
    c: input.commitment,
    q: input.query.trim().toLowerCase(),
    a: input.answer,
    n: nonce,
  });
  const sig = createHmac("sha256", proofSecret()).update(canonical).digest("base64url");
  const proof = Buffer.from(
    JSON.stringify({ ...JSON.parse(canonical), sig }),
    "utf8",
  ).toString("base64url");
  return { proof, verified: true };
}

/** Malformed = not decodable / wrong shape; invalid = well-formed envelope but bad HMAC or version. */
export type ZkshareProofVerification =
  | { status: "valid" }
  | { status: "invalid" }
  | { status: "malformed" };

export function verifyZkshareProofDetailed(proofB64: string): ZkshareProofVerification {
  try {
    const raw = Buffer.from(proofB64, "base64url").toString("utf8");
    const body = JSON.parse(raw) as {
      v?: unknown;
      fact_id?: unknown;
      c?: unknown;
      q?: unknown;
      a?: unknown;
      n?: unknown;
      sig?: unknown;
    };
    if (
      typeof body.v !== "string" ||
      typeof body.fact_id !== "string" ||
      typeof body.c !== "string" ||
      typeof body.q !== "string" ||
      typeof body.a !== "string" ||
      typeof body.n !== "string" ||
      typeof body.sig !== "string"
    ) {
      return { status: "malformed" };
    }
    const { sig, ...rest } = body;
    const canonical = JSON.stringify(rest);
    const expected = createHmac("sha256", proofSecret()).update(canonical).digest("base64url");
    if (sig !== expected || body.v !== VERSION) {
      return { status: "invalid" };
    }
    return { status: "valid" };
  } catch {
    return { status: "malformed" };
  }
}

export function verifyProofString(proofB64: string): boolean {
  return verifyZkshareProofDetailed(proofB64).status === "valid";
}

/** Lightweight NL yes/no from plaintext — external LLM sees fact text unless disabled (see ZKSHARE_DISABLE_EXTERNAL_LLM). */
export async function answerYesNoFromPlaintext(
  query: string,
  plaintext: string,
): Promise<"yes" | "no" | "unknown"> {
  if (externalLlmDisabled()) {
    return heuristicYesNo(query, plaintext);
  }
  const client = await getOpenAICompatibleClient();
  if (!client) {
    return heuristicYesNo(query, plaintext);
  }
  const completion = await client.chat.completions.create({
    model: chatModelId(),
    temperature: 0,
    max_tokens: 8,
    messages: [
      {
        role: "system",
        content:
          'Given PRIVATE_FACT and QUESTION, reply with exactly one word: yes, no, or unknown. No punctuation.',
      },
      {
        role: "user",
        content: `QUESTION: ${query}\nPRIVATE_FACT: ${plaintext.slice(0, 8000)}`,
      },
    ],
  });
  const text = completion.choices[0]?.message?.content?.trim().toLowerCase() ?? "";
  if (text.startsWith("yes")) return "yes";
  if (text.startsWith("no")) return "no";
  return "unknown";
}

function heuristicYesNo(query: string, value: string): "yes" | "no" | "unknown" {
  const q = query.toLowerCase();
  const v = value.toLowerCase();
  if (q.includes("prefer") && (q.includes("beach") || q.includes("mountain"))) {
    if (v.includes("beach") && !v.includes("mountain")) return "yes";
    if (v.includes("mountain") && !v.includes("beach")) return "no";
  }
  return "unknown";
}
