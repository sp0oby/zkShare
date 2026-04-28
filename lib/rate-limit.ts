import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import "server-only";
import { requestsPerSecondForMonthlyLimit } from "@/lib/pricing";

/** `Retry-After` header value (seconds) on HTTP 429 */
export const RATE_LIMIT_RETRY_AFTER_SEC = 10;

export function createRatelimiter(maxPerWindow: number, windowSeconds: number) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    const redis = new Redis({ url, token });
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxPerWindow, `${windowSeconds} s`),
      analytics: true,
      prefix: "zkshare",
    });
  }
  return null;
}

const localBuckets = new Map<string, { count: number; reset: number }>();

/**
 * Per API key: limit derived from subscription (requests/sec).
 * Uses Upstash when configured; otherwise in-process window (dev).
 */
export async function rateLimitOrThrow(
  apiKeyId: string,
  monthlyLimit: number,
): Promise<void> {
  const maxRps = requestsPerSecondForMonthlyLimit(monthlyLimit);
  const limiter = createRatelimiter(maxRps, 1);

  if (limiter) {
    const { success } = await limiter.limit(apiKeyId);
    if (!success) {
      const err = new Error("RATE_LIMITED");
      (err as Error & { code: string }).code = "RATE_LIMITED";
      throw err;
    }
    return;
  }

  const now = Date.now();
  const windowMs = 1000;
  const b = localBuckets.get(apiKeyId);
  if (!b || now > b.reset) {
    localBuckets.set(apiKeyId, { count: 1, reset: now + windowMs });
    return;
  }
  if (b.count >= maxRps) {
    const err = new Error("RATE_LIMITED");
    (err as Error & { code: string }).code = "RATE_LIMITED";
    throw err;
  }
  b.count += 1;
}
