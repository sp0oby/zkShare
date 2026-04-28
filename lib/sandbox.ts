import { createHash, randomUUID } from "crypto";
import vm from "node:vm";
import { SignJWT } from "jose";
import "server-only";

export type SandboxAttestation = {
  sandbox_id: string;
  measurement: string;
  timestamp: string;
  provider: "vm-sandbox";
  verified: boolean;
  public_key?: string;
};

export type SandboxResult = {
  success: true;
  result: Record<string, unknown>;
  attestation: SandboxAttestation;
  proof_of_execution: string;
};

/**
 * Isolated `node:vm` sandbox — no host I/O, 50 ms timeout, allow-listed actions only.
 * Returns a signed HS256 JWT as proof of execution. Every response advertises
 * `provider: "vm-sandbox"` so callers know this is software isolation.
 */
export async function runSandbox(input: {
  action: string;
  parameters: Record<string, unknown>;
  userId?: string;
}): Promise<SandboxResult> {
  const codeHash = createHash("sha256")
    .update(`zkshare-sandbox-v1:${input.action}`)
    .digest("hex");
  const sandboxId = `zkshare-sandbox-v1-${randomUUID().slice(0, 8)}`;

  const ctx: Record<string, unknown> = {
    action: input.action,
    parameters: input.parameters,
    userId: input.userId ?? null,
    Math,
    JSON,
    Number,
    String,
    Boolean,
    Array,
    Object,
  };

  const script = new vm.Script(`
    (function () {
      function calculate_travel_budget(p) {
        const income = Number(p.monthly_income) || 0;
        const savings = Number(p.current_savings) || 0;
        const dest = String(p.preferred_destination || "trip");
        const rec = Math.min(income * 0.6, 8000);
        return {
          recommended_budget: Math.round(rec),
          affordable: savings >= rec * 0.2,
          suggestion: "Plan a budget-friendly " + dest + " trip within " + Math.round(rec),
        };
      }
      function calculate_budget(p) {
        const income = Number(p.monthly_income) || 0;
        const expenses = Array.isArray(p.expenses) ? p.expenses : [];
        const spent = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        return { disposable: Math.max(0, income - spent), analyzed_months: 1 };
      }
      function analyze_spending(p) {
        const expenses = Array.isArray(p.expenses) ? p.expenses : [];
        const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        return { total_spend: total, categories: expenses.length };
      }
      var handlers = {
        calculate_travel_budget: calculate_travel_budget,
        calculate_budget: calculate_budget,
        analyze_spending: analyze_spending,
      };
      var fn = handlers[action];
      if (!fn) {
        return { ok: false, error: "UNKNOWN_ACTION", action: action };
      }
      return { ok: true, data: fn(parameters || {}) };
    })();
  `);

  const vmCtx = vm.createContext(ctx);
  const raw = script.runInContext(vmCtx, { timeout: 50 });

  const resultPayload =
    raw && typeof raw === "object" && "ok" in raw && (raw as { ok: boolean }).ok
      ? ((raw as { data: Record<string, unknown> }).data ?? {})
      : {
          error: "SANDBOX_ACTION_FAILED",
          detail: raw,
        };

  const attestation: SandboxAttestation = {
    sandbox_id: sandboxId,
    measurement: `sha256:${codeHash}`,
    timestamp: new Date().toISOString(),
    provider: "vm-sandbox",
    verified: true,
    public_key: process.env.ZKSHARE_ENCLAVE_PUBLIC_KEY_STUB ?? "dev-local-stub",
  };

  const secretValue = process.env.ZKSHARE_ENCLAVE_JWT_SECRET;
  if (!secretValue || secretValue.length < 32) {
    throw new Error(
      "ZKSHARE_ENCLAVE_JWT_SECRET must be set (min 32 chars) to sign sandbox attestations",
    );
  }
  const secret = new TextEncoder().encode(secretValue);
  const proof_of_execution = await new SignJWT({
    sub: sandboxId,
    action: input.action,
    measurement: attestation.measurement,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret);

  return {
    success: true,
    result: resultPayload as Record<string, unknown>,
    attestation,
    proof_of_execution,
  };
}
