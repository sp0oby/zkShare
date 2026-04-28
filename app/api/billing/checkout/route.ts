import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-server";
import { getStripe, isStripeBillingConfigured, stripePriceIdForCheckoutTier } from "@/lib/stripe";

export const runtime = "nodejs";

type Body = { tier?: string };

/**
 * Start Stripe Checkout for an authenticated user (subscription mode).
 * Links the Stripe customer to Supabase on `checkout.session.completed` (webhook).
 */
export async function POST(request: NextRequest) {
  if (!isStripeBillingConfigured()) {
    return NextResponse.json(
      { success: false, error: "Stripe is not configured (missing STRIPE_SECRET_KEY)." },
      { status: 503 },
    );
  }

  const supabaseAuth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user?.id || !user.email) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const tier = body.tier === "pro" ? "pro" : body.tier === "starter" ? "starter" : null;
  if (!tier) {
    return NextResponse.json(
      { success: false, error: "tier must be starter or pro" },
      { status: 400 },
    );
  }

  const priceId = stripePriceIdForCheckoutTier(tier);
  if (!priceId) {
    return NextResponse.json(
      {
        success: false,
        error:
          tier === "starter"
            ? "STRIPE_PRICE_STARTER is not set"
            : "STRIPE_PRICE_PRO is not set",
      },
      { status: 503 },
    );
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

  const existingCustomerId = keyRow?.stripe_customer_id as string | undefined;

  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    request.headers.get("origin") ||
    "http://localhost:3000";

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    ...(existingCustomerId
      ? { customer: existingCustomerId }
      : { customer_email: user.email }),
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${site}/dashboard?billing=success`,
    cancel_url: `${site}/dashboard?billing=cancel`,
    metadata: {
      supabase_user_id: user.id,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
      },
    },
  });

  if (!session.url) {
    return NextResponse.json(
      { success: false, error: "Checkout did not return a URL" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, url: session.url });
}
