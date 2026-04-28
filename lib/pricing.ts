/**
 * ZKshare v1.0 pricing (April 2026) — hybrid freemium + usage-based overages.
 * Stripe: base subscription per tier + metered price for over-limit operations ($0.005–$0.02/op, volume discounts via Stripe tiers).
 */

export const PRICING = {
  free: {
    label: "Free",
    monthlyUsd: 0,
    operationsPerMonth: 1_000,
    requestsPerSecond: 10,
    highlights: ["Testing & light agent use", "Community support"],
  },
  starter: {
    label: "Starter",
    monthlyUsd: 19,
    operationsPerMonth: 20_000,
    requestsPerSecond: 30,
    highlights: ["Higher rate limits", "Email support"],
  },
  pro: {
    label: "Pro",
    monthlyUsd: 49,
    operationsPerMonth: 100_000,
    requestsPerSecond: 100,
    highlights: ["Priority support", "Audit log export"],
  },
  enterprise: {
    label: "Enterprise",
    monthlyUsd: null as number | null,
    operationsPerMonth: null as number | null, // unlimited / contract
    requestsPerSecond: null as number | null, // SLA / custom
    highlights: ["Unlimited ops (contract)", "SLA", "Dedicated sandbox / custom integrations", "SOC 2 alignment support"],
  },
} as const;

/** Overage window: $0.005–$0.02 per operation — configure exact metered price in Stripe (tiered volume). */
export const OVERAGE_USD_PER_OP_MIN = 0.005;
export const OVERAGE_USD_PER_OP_MAX = 0.02;

export type PlanTier = "free" | "starter" | "pro" | "enterprise";

export function requestsPerSecondForMonthlyLimit(limit: number): number {
  if (limit >= 1_000_000) return 200;
  if (limit >= 100_000) return PRICING.pro.requestsPerSecond;
  if (limit >= 20_000) return PRICING.starter.requestsPerSecond;
  return PRICING.free.requestsPerSecond;
}

export function defaultMonthlyLimitForTier(tier: PlanTier): number {
  switch (tier) {
    case "free":
      return PRICING.free.operationsPerMonth;
    case "starter":
      return PRICING.starter.operationsPerMonth;
    case "pro":
      return PRICING.pro.operationsPerMonth;
    case "enterprise":
      return 999_999_999; // “unlimited” cap in app; contract governs
    default:
      return PRICING.free.operationsPerMonth;
  }
}

export function tierFromMonthlyLimit(limit: number): PlanTier {
  if (limit >= 999_999_000) return "enterprise";
  if (limit >= 100_000) return "pro";
  if (limit >= 20_000) return "starter";
  return "free";
}
