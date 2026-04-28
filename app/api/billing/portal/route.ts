import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-server";
import { getStripe, isStripeBillingConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Stripe Customer Portal — update payment method, cancel, switch plans (per Stripe config).
 */
export async function POST(request: NextRequest) {
  if (!isStripeBillingConfigured()) {
    return NextResponse.json(
      { success: false, error: "Stripe is not configured." },
      { status: 503 },
    );
  }

  const supabaseAuth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const admin = createSupabaseServiceRoleClient();
  const { data: keyRow } = await admin
    .from("api_keys")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .not("stripe_customer_id", "is", null)
    .limit(1)
    .maybeSingle();

  const customerId = keyRow?.stripe_customer_id as string | undefined;
  if (!customerId) {
    return NextResponse.json(
      { success: false, error: "No billing account on file. Subscribe to a paid plan first." },
      { status: 400 },
    );
  }

  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    request.headers.get("origin") ||
    "http://localhost:3000";

  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${site}/dashboard`,
  });

  return NextResponse.json({ success: true, url: portal.url });
}
