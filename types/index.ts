import { z } from "zod";

/** Single main endpoint: POST /api/v1/context */
export const contextOperationSchema = z.enum([
  "store",
  "prove",
  "share",
  "search",
  "sandbox",
  /** Verify an HMAC-sealed proof envelope from `prove` / `share` without reading fact plaintext. */
  "verify_proof",
]);

export const contextRequestSchema = z
  .object({
    operation: contextOperationSchema,
    user_id: z.string().min(1).max(256).optional(),
    fact_key: z.string().min(1).max(512).optional(),
    value: z.string().max(100_000).optional(),
    /** Client-sealed store: AES-GCM parts + commitment (server never sees plaintext). */
    ciphertext: z.string().max(500_000).optional(),
    iv: z.string().max(512).optional(),
    auth_tag: z.string().max(512).optional(),
    commitment: z.string().min(8).max(4096).optional(),
    /** `verify_proof`: base64url proof string from a prior prove/share response. */
    proof: z.string().min(24).optional(),
    query: z.string().min(1).max(8_000).optional(),
    recipient_agent_id: z.string().min(1).max(512).optional(),
    action: z.string().min(1).max(256).optional(),
    parameters: z.record(z.string(), z.unknown()).optional(),
    /**
     * 1536-dim vector (same model/projection as server `embedText`).
     * Required for client-sealed `store` so the server never embeds labels or ciphertext.
     * Optional for server-sealed `store` (server can embed from fact text).
     */
    embedding: z.array(z.number()).length(1536).optional(),
  })
  .superRefine((data, ctx) => {
    switch (data.operation) {
      case "store": {
        if (!data.fact_key) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "fact_key is required for store",
            path: ["fact_key"],
          });
        }
        const hasClientBundle = Boolean(
          (data.ciphertext?.trim() ?? "") &&
            (data.iv?.trim() ?? "") &&
            (data.auth_tag?.trim() ?? "") &&
            (data.commitment?.trim() ?? ""),
        );
        const hasValue = data.value !== undefined && data.value !== "";
        if (hasClientBundle && hasValue) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "Use either value (server-sealed) or ciphertext + iv + auth_tag + commitment (client-sealed), not both",
            path: ["value"],
          });
        }
        if (!hasClientBundle && !hasValue) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "Provide value for server-sealed store, or ciphertext, iv, auth_tag, and commitment for client-sealed store",
            path: ["value"],
          });
        }
        if (
          hasClientBundle &&
          (!data.embedding || data.embedding.length !== 1536)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "Client-sealed store requires embedding (1536 numbers) so the server never derives vectors from your metadata",
            path: ["embedding"],
          });
        }
        break;
      }
      case "prove":
      case "share":
        if (!data.fact_key) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "fact_key is required",
            path: ["fact_key"],
          });
        }
        if (!data.query) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "query is required",
            path: ["query"],
          });
        }
        if (data.operation === "share" && !data.recipient_agent_id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "recipient_agent_id is required for share",
            path: ["recipient_agent_id"],
          });
        }
        break;
      case "search":
        if (!data.query) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "query is required for search",
            path: ["query"],
          });
        }
        break;
      case "sandbox":
        if (!data.action) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "action is required for sandbox",
            path: ["action"],
          });
        }
        break;
      case "verify_proof":
        if (!data.proof?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "proof is required for verify_proof",
            path: ["proof"],
          });
        }
        break;
      default:
        break;
    }
  });

export type ContextRequest = z.infer<typeof contextRequestSchema>;
export type ContextOperation = z.infer<typeof contextOperationSchema>;

export type ApiErrorCode =
  | "INVALID_API_KEY"
  | "RATE_LIMITED"
  | "VALIDATION_ERROR"
  | "FACT_NOT_FOUND"
  | "PROOF_FAILED"
  | "INTERNAL_ERROR"
  | "CONFIG_ERROR"
  | "CLIENT_ENCRYPTED";

export type ContextSuccessResponse<TData = Record<string, unknown>> = {
  success: true;
  operation: ContextOperation;
  data: TData;
  proof: string | null;
  verified: boolean;
  timestamp: string;
  usage: { calls: number; limit: number };
};

export type ContextErrorResponse = {
  success: false;
  error: ApiErrorCode;
  message: string;
};

export type FactRow = {
  id: string;
  user_id: string | null;
  fact_key: string;
  ciphertext: string;
  iv: string;
  auth_tag: string;
  commitment: string;
  embedding: string | null;
  created_at: string;
};

export type ApiKeyRow = {
  id: string;
  user_id: string | null;
  key_hash: string;
  key_prefix: string;
  revoked_at: string | null;
  monthly_limit: number;
  calls_this_month: number;
  billing_period_start: string;
  /** free | starter | pro | enterprise */
  plan_tier?: string | null;
};
