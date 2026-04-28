#!/usr/bin/env node
/**
 * No API key required — health, auth rejection, OPTIONS, core HTML routes.
 *
 * Usage: node scripts/smoke-public.mjs
 * Env: BASE_URL=https://zkshare.io (defaults to zkshare.io for production smoke)
 */
const BASE = (process.env.BASE_URL?.trim().replace(/\/$/, "") || "https://zkshare.io");

let failed = 0;
function ok(name, cond, detail = "") {
  if (cond) {
    console.log(`  OK   ${name}${detail}`);
  } else {
    console.log(`  FAIL ${name}${detail}`);
    failed++;
  }
}

async function main() {
  console.log(`Smoke (public): ${BASE}\n`);

  // Health
  {
    const r = await fetch(`${BASE}/api/health`);
    const j = await r.json();
    ok("GET /api/health 200 + ok:true", r.status === 200 && j.ok === true);
  }
  {
    const r = await fetch(`${BASE}/api/health/ready`);
    const j = await r.json();
    ok("GET /api/health/ready 200 + database:true", r.status === 200 && j.ok === true && j.database === true);
    if (j.warnings?.length) console.log(`       warnings: ${j.warnings.join(" | ")}`);
  }

  // Auth barrier
  {
    const r = await fetch(`${BASE}/api/v1/context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "store", fact_key: "x", value: "y" }),
    });
    const j = await r.json().catch(() => ({}));
    ok("POST /api/v1/context without key → 401", r.status === 401 && j.error === "INVALID_API_KEY");
  }

  // CORS preflight
  {
    const r = await fetch(`${BASE}/api/v1/context`, {
      method: "OPTIONS",
      headers: { Origin: BASE },
    });
    ok("OPTIONS /api/v1/context → 204", r.status === 204);
  }

  // Frontend pages (HTML)
  for (const path of [
    "/",
    "/docs",
    "/api-key",
    "/terms",
    "/privacy",
    "/dashboard",
  ]) {
    const r = await fetch(`${BASE}${path}`, { redirect: "follow" });
    ok(`GET ${path} → HTML`, r.status === 200 && String(r.headers.get("content-type") || "").includes("text/html"));
  }

  console.log("");
  if (failed) {
    console.log(`Smoke failed: ${failed} check(s)`);
    process.exit(1);
  }
  console.log("Smoke passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
