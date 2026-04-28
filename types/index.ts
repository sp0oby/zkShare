import { z } from "zod";

/** Single main endpoint: POST /api/v1/context */
export const contextOperationSchema = z.enum([
  "store",
  "prove",
  "share",
  "search",
  "enclave",
]);

export const contextRequestSchema = z
  .object({
    operation: contextOperationSchema,
    user_id: z.string().min(1).max(256).optional(),
    fact_key: z.string().min(1).max(512).optional(),
    value: z.string().max(100_000).optional(),
    query: z.string().min(1).max(8_000).optional(),
    recipient_agent_id: z.string().min(1).max(512).optional(),
    action: z.string().min(1).max(256).optional(),
    parameters: z.record(z.string(), z.unknown()).optional(),
    /** Optional: 1536-dim vector for semantic search. If set, the server will not call an embedding model on your fact text (reduces third-party exposure; you must use a consistent model / projection). */
    embedding: z.array(z.number()).length(1536).optional(),
  })
  .superRefine((data, ctx) => {
    switch (data.operation) {
      case "store":
        if (!data.fact_key) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "fact_key is required for store",
            path: ["fact_key"],
          });
        }
        if (data.value === undefined || data.value === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "value is required for store",
            path: ["value"],
          });
        }
        break;
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
      case "enclave":
        if (!data.action) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "action is required for enclave",
            path: ["action"],
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
  | "CONFIG_ERROR";

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
