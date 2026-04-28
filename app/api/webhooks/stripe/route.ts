import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-server";
import {
  getStripe,
  getStripeWebhookSecret,
  monthlyLimitForPriceId,
  planTierForPriceId,
} from "@/lib/stripe";
import { PRICING } from "@/lib/pricing";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ received: false, error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = getStripe();
  const sig = request.headers.get("stripe-signature");
  const raw = await request.text();

  if (!sig) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, getStripeWebhookSecret());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "invalid payload";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as import("stripe").Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        const userId = session.metadata?.supabase_user_id ?? session.client_reference_id;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (!userId || !customerId) break;

        const { data: existingUser, error: getUserErr } = await supabase.auth.admin.getUserById(
          userId,
        );
        if (getUserErr || !existingUser.user) break;
        const meta = {
          ...(existingUser.user.app_metadata as Record<string, unknown>),
          stripe_customer_id: customerId,
        };
        await supabase.auth.admin.updateUserById(userId, { app_metadata: meta });

        await supabase
          .from("api_keys")
          .update({
            stripe_customer_id: customerId,
            ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}),
          })
          .eq("user_id", userId)
          .is("revoked_at", null);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as import("stripe").Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const priceId = sub.items.data[0]?.price?.id;
        const limit = monthlyLimitForPriceId(priceId);
        const tier = planTierForPriceId(priceId);
        const userId = sub.metadata?.supabase_user_id as string | undefined;

        const payload = {
          monthly_limit: limit,
          plan_tier: tier,
          stripe_subscription_id: sub.id,
          stripe_customer_id: customerId,
        };

        if (userId) {
          await supabase
            .from("api_keys")
            .update(payload)
            .eq("user_id", userId)
            .is("revoked_at", null);
        } else {
          await supabase.from("api_keys").update(payload).eq("stripe_customer_id", customerId);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as import("stripe").Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        await supabase
          .from("api_keys")
          .update({
            monthly_limit: PRICING.free.operationsPerMonth,
            plan_tier: "free",
            stripe_subscription_id: null,
          })
          .eq("stripe_customer_id", customerId);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "handler error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
