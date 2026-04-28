import "server-only";
import type { PlanTier } from "@/lib/pricing";
import { defaultMonthlyLimitForTier } from "@/lib/pricing";
import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key);
  }
  return stripeSingleton;
}

export function getStripeWebhookSecret(): string {
  const s = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }
  return s;
}

/** Map Stripe recurring price id → plan tier (v1.0 PRD). */
export function planTierForPriceId(priceId: string | undefined): PlanTier {
  if (!priceId) return "free";
  if (process.env.STRIPE_PRICE_ENTERPRISE && priceId === process.env.STRIPE_PRICE_ENTERPRISE) {
    return "enterprise";
  }
  if (process.env.STRIPE_PRICE_PRO && priceId === process.env.STRIPE_PRICE_PRO) {
    return "pro";
  }
  if (process.env.STRIPE_PRICE_STARTER && priceId === process.env.STRIPE_PRICE_STARTER) {
    return "starter";
  }
  return "free";
}

/** Monthly included operations for a subscription line item. */
export function monthlyLimitForPriceId(priceId: string | undefined): number {
  return defaultMonthlyLimitForTier(planTierForPriceId(priceId));
}

/** Recurring price id for Checkout (must match Dashboard Products). */
export function stripePriceIdForCheckoutTier(tier: "starter" | "pro"): string | null {
  if (tier === "starter") {
    return process.env.STRIPE_PRICE_STARTER?.trim() || null;
  }
  return process.env.STRIPE_PRICE_PRO?.trim() || null;
}

export function isStripeBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}
