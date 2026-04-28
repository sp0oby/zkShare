import "server-only";
import type { ContextOperation } from "@/types";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-server";

export async function writeAuditLog(input: {
  operation: ContextOperation | string;
  apiKeyId: string | null;
  logicalUserId?: string | null;
  payload?: Record<string, unknown>;
}) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    await supabase.from("audit_logs").insert({
      api_key_id: input.apiKeyId,
      user_id: input.logicalUserId ?? null,
      operation: input.operation,
      payload: input.payload ?? {},
    });
  } catch {
    // Never fail the request on audit write; log server-side in observability.
  }
}
