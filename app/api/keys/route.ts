import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-server";
import { generateApiKeyRaw, hashApiKey } from "@/lib/api-key";
import { PRICING } from "@/lib/pricing";

export const runtime = "nodejs";

/** Create a new API key for the signed-in user (shown once). */
export async function POST() {
  const supabaseAuth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const raw = generateApiKeyRaw();
  const hash = hashApiKey(raw);
  const prefix = raw.slice(0, 12);

  const stripeCustomerId =
    typeof user.app_metadata?.stripe_customer_id === "string"
      ? user.app_metadata.stripe_customer_id
      : null;

  const admin = createSupabaseServiceRoleClient();

  const { data: siblings } = await admin
    .from("api_keys")
    .select("monthly_limit, plan_tier")
    .eq("user_id", user.id)
    .is("revoked_at", null);

  let monthlyLimit = PRICING.free.operationsPerMonth;
  let planTier = "free";
  if (siblings?.length) {
    const best = siblings.reduce((a, b) => (b.monthly_limit > a.monthly_limit ? b : a));
    monthlyLimit = best.monthly_limit;
    planTier = (best.plan_tier as string) || "free";
  }

  const { error } = await admin.from("api_keys").insert({
    user_id: user.id,
    key_hash: hash,
    key_prefix: prefix,
    monthly_limit: monthlyLimit,
    plan_tier: planTier,
    calls_this_month: 0,
    billing_period_start: new Date().toISOString().slice(0, 10),
    stripe_customer_id: stripeCustomerId,
  });

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, api_key: raw });
}

/** List masked keys for dashboard */
export async function GET() {
  const supabaseAuth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin
    .from("api_keys")
    .select(
      "id, key_prefix, revoked_at, monthly_limit, plan_tier, calls_this_month, billing_period_start, stripe_customer_id",
    )
    .eq("user_id", user.id)
    .order("id", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, keys: data ?? [] });
}
