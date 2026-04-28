import "server-only";

/**
 * Centralized environment validation. Import for side effects in any server boundary that
 * must not start with insecure defaults: `app/api/v1/context/route.ts`, the Stripe webhook,
 * and the readiness probe.
 *
 * The application must not silently fall back to a default value for any cryptographic
 * secret. Validation runs lazily so unit tests can import individual `lib/*` modules without
 * requiring full production config.
 */

export type RequiredSecretSpec = {
  name: string;
  minLength: number;
  description: string;
};

const CRYPTO_SECRETS: RequiredSecretSpec[] = [
  {
    name: "ZKSHARE_ENCRYPTION_SECRET",
    minLength: 32,
    description: "AES-256-GCM master secret for server-sealed facts",
  },
  {
    name: "ZKSHARE_PROOF_SECRET",
    minLength: 16,
    description: "HMAC-SHA256 secret for commitments and proof envelopes",
  },
  {
    name: "ZKSHARE_ENCLAVE_JWT_SECRET",
    minLength: 32,
    description: "HS256 secret for sandbox attestation JWTs",
  },
];

const SUPABASE_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

export function assertCryptoSecrets(): void {
  const errors: string[] = [];
  for (const spec of CRYPTO_SECRETS) {
    const value = process.env[spec.name];
    if (!value || value.length < spec.minLength) {
      errors.push(
        `${spec.name} must be set and at least ${spec.minLength} characters (${spec.description})`,
      );
    }
  }
  if (errors.length) {
    throw new Error(
      `Refusing to start with insecure configuration:\n  - ${errors.join("\n  - ")}`,
    );
  }
}

export function assertSupabaseConfig(): void {
  const missing = SUPABASE_KEYS.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `Supabase environment variables missing: ${missing.join(", ")}. The data plane cannot start.`,
    );
  }
}

export type RuntimeReadiness = {
  ok: boolean;
  missing: string[];
  warnings: string[];
};

/** Non-throwing variant for health probes and CLI tooling. */
export function checkRuntimeReadiness(): RuntimeReadiness {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const spec of CRYPTO_SECRETS) {
    const value = process.env[spec.name];
    if (!value || value.length < spec.minLength) {
      missing.push(spec.name);
    }
  }
  for (const k of SUPABASE_KEYS) {
    if (!process.env[k]) missing.push(k);
  }

  const cors = process.env.ZKSHARE_CORS_ORIGIN?.trim();
  if (cors === "*") {
    warnings.push("ZKSHARE_CORS_ORIGIN is '*'. Restrict to explicit origins before exposing the API.");
  }
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    warnings.push(
      "Upstash Redis is not configured. Rate limiting falls back to in-process memory (not safe for multi-instance deployments).",
    );
  }
  if (
    !process.env.OPENROUTER_API_KEY &&
    !process.env.OPENAI_API_KEY &&
    process.env.ZKSHARE_DISABLE_EXTERNAL_LLM !== "true"
  ) {
    warnings.push(
      "No LLM provider configured and ZKSHARE_DISABLE_EXTERNAL_LLM is not 'true'. prove/share/search will fall back to heuristics.",
    );
  }

  return {
    ok: missing.length === 0,
    missing,
    warnings,
  };
}
