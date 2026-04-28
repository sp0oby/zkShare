import { createHash, randomBytes } from "crypto";
import "server-only";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-server";
import type { ApiKeyRow } from "@/types";

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function generateApiKeyRaw(): string {
  const body = randomBytes(24).toString("base64url");
  return `zk_live_${body}`;
}

function isNewBillingPeriod(periodStartIso: string | Date): boolean {
  const start =
    periodStartIso instanceof Date
      ? periodStartIso
      : new Date(periodStartIso + "T00:00:00.000Z");
  const now = new Date();
  return (
    start.getUTCFullYear() !== now.getUTCFullYear() ||
    start.getUTCMonth() !== now.getUTCMonth()
  );
}

export async function validateApiKey(rawKey: string | null): Promise<ApiKeyRow | null> {
  if (!rawKey || !rawKey.startsWith("zk_live_")) return null;
  const hash = hashApiKey(rawKey);
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_hash", hash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !data) return null;

  let row = data as ApiKeyRow;

  if (isNewBillingPeriod(row.billing_period_start)) {
    const today = new Date().toISOString().slice(0, 10);
    await supabase
      .from("api_keys")
      .update({ calls_this_month: 0, billing_period_start: today })
      .eq("id", row.id);
    const { data: refreshed } = await supabase
      .from("api_keys")
      .select("*")
      .eq("id", row.id)
      .single();
    if (refreshed) row = refreshed as ApiKeyRow;
    else {
      row = { ...row, calls_this_month: 0, billing_period_start: today };
    }
  }

  const accountUsage = await getAccountUsage(supabase, row.user_id);
  if (accountUsage >= row.monthly_limit) return null;

  return row;
}

async function getAccountUsage(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  userId: string | null,
): Promise<number> {
  if (!userId) return 0;
  const { data } = await supabase
    .from("api_keys")
    .select("calls_this_month")
    .eq("user_id", userId)
    .is("revoked_at", null);
  if (!data || data.length === 0) return 0;
  return data.reduce((sum, r) => sum + ((r.calls_this_month as number) ?? 0), 0);
}

export async function getAccountUsageForUser(userId: string | null): Promise<number> {
  if (!userId) return 0;
  const supabase = createSupabaseServiceRoleClient();
  return getAccountUsage(supabase, userId);
}

export async function incrementApiKeyUsage(id: string) {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.rpc("increment_api_key_usage", { p_id: id });
  if (error) {
    const { data } = await supabase
      .from("api_keys")
      .select("calls_this_month")
      .eq("id", id)
      .single();
    const next = (data?.calls_this_month as number) ?? 0;
    await supabase.from("api_keys").update({ calls_this_month: next + 1 }).eq("id", id);
  }
}
