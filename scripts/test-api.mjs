const API = "http://localhost:3000/api/v1/context";
const KEY = "zk_live_zmHXzzX44XCnfOwkxhuSV9kUlQKOMuQ8";

let passed = 0;
let failed = 0;
let skipped = 0;

function fakeEmbedding(dim = 1536) {
  const arr = [];
  for (let i = 0; i < dim; i++) arr.push(Math.random() * 2 - 1);
  const norm = Math.sqrt(arr.reduce((s, x) => s + x * x, 0)) || 1;
  return arr.map((x) => x / norm);
}

async function call(label, body, expectStatus, expectCheck) {
  const tag = `[${passed + failed + skipped + 1}]`;
  process.stdout.write(`\n${tag} ${label} ... `);
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "x-api-key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    const statusOk = expectStatus ? res.status === expectStatus : true;
    const checkOk = expectCheck ? expectCheck(json, res.status) : true;
    if (statusOk && checkOk) {
      console.log(`PASS (${res.status})`);
      passed++;
    } else {
      console.log(`FAIL (expected ${expectStatus}, got ${res.status})`);
      console.log(JSON.stringify(json, null, 2));
      failed++;
    }
    return json;
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    failed++;
    return null;
  }
}

async function callRaw(label, opts, expectStatus) {
  const tag = `[${passed + failed + skipped + 1}]`;
  process.stdout.write(`\n${tag} ${label} ... `);
  try {
    const res = await fetch(opts.url || API, {
      method: opts.method || "POST",
      headers: opts.headers || { "x-api-key": KEY, "Content-Type": "application/json" },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const json = await res.json();
    if (res.status === expectStatus) {
      console.log(`PASS (${res.status})`);
      passed++;
    } else {
      console.log(`FAIL (expected ${expectStatus}, got ${res.status})`);
      console.log(JSON.stringify(json, null, 2));
      failed++;
    }
    return json;
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    failed++;
    return null;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("ZKshare API — Full Test Suite");
  console.log("=".repeat(60));

  // ─── Health ───
  console.log("\n--- HEALTH ---");

  process.stdout.write(`\n[1] GET /api/health ... `);
  {
    const r = await fetch("http://localhost:3000/api/health");
    const j = await r.json();
    if (r.status === 200 && j.ok) { console.log("PASS"); passed++; }
    else { console.log("FAIL"); console.log(j); failed++; }
  }

  process.stdout.write(`\n[2] GET /api/health/ready ... `);
  {
    const r = await fetch("http://localhost:3000/api/health/ready");
    const j = await r.json();
    if (r.status === 200 && j.ok && j.database) { console.log("PASS"); passed++; }
    else { console.log("FAIL"); console.log(j); failed++; }
  }

  // ─── Auth ───
  console.log("\n\n--- AUTHENTICATION ---");

  await callRaw("Bad API key → 401", {
    headers: { "x-api-key": "zk_live_totallyBogusKeyValue123", "Content-Type": "application/json" },
    body: { operation: "store", fact_key: "x", value: "y" },
  }, 401);

  await callRaw("Missing API key → 401", {
    headers: { "Content-Type": "application/json" },
    body: { operation: "store", fact_key: "x", value: "y" },
  }, 401);

  // ─── Validation ───
  console.log("\n\n--- VALIDATION ---");

  await call("Missing required fields → 400", { operation: "store" }, 400);
  await call("Invalid operation → 400", { operation: "foobar", user_id: "u", fact_key: "k", value: "v" }, 400);

  // ─── Store (server-sealed with client-supplied embedding) ───
  console.log("\n\n--- STORE (server-sealed, client-supplied embedding) ---");

  const storeResult1 = await call(
    "store server-sealed fact #1",
    {
      operation: "store",
      user_id: "test_user_1",
      fact_key: "favorite_color",
      value: "blue is my favorite color",
      embedding: fakeEmbedding(),
    },
    200,
    (j) => j.success && j.data?.commitment && j.data?.client_encrypted === false,
  );

  const storeResult2 = await call(
    "store server-sealed fact #2",
    {
      operation: "store",
      user_id: "test_user_1",
      fact_key: "hometown",
      value: "grew up in Austin Texas",
      embedding: fakeEmbedding(),
    },
    200,
    (j) => j.success && j.data?.commitment && j.data?.client_encrypted === false,
  );

  const storeResult3 = await call(
    "store server-sealed fact #3",
    {
      operation: "store",
      user_id: "test_user_1",
      fact_key: "salary",
      value: "I earn $120,000 per year",
      embedding: fakeEmbedding(),
    },
    200,
    (j) => j.success && j.data?.fact_id,
  );

  // ─── Store (E2EE / client-sealed) ───
  console.log("\n\n--- STORE (E2EE / client-sealed) ---");

  const e2eeResult = await call(
    "store E2EE fact (ciphertext, iv, auth_tag, commitment, embedding)",
    {
      operation: "store",
      user_id: "test_user_1",
      fact_key: "secret_ssn",
      ciphertext: "U2FsdGVkX19abcdef0123456789abcdefexample",
      iv: "abcdef0123456789abcdef01",
      auth_tag: "fedcba9876543210fedcba98",
      commitment: "sha256:client-derived-commitment-placeholder-value",
      embedding: fakeEmbedding(),
    },
    200,
    (j) => j.success && j.data?.client_encrypted === true,
  );

  // ─── Upsert (overwrite existing fact) ───
  console.log("\n\n--- UPSERT ---");

  await call(
    "upsert overwrites fact #1",
    {
      operation: "store",
      user_id: "test_user_1",
      fact_key: "favorite_color",
      value: "actually, red is my real favorite",
      embedding: fakeEmbedding(),
    },
    200,
    (j) => j.success && j.data?.commitment,
  );

  // ─── Prove ───
  console.log("\n\n--- PROVE ---");

  const proveResult = await call(
    "prove: is the user's favorite color red?",
    {
      operation: "prove",
      user_id: "test_user_1",
      fact_key: "favorite_color",
      query: "is the user's favorite color red?",
    },
    200,
    (j) => j.success && j.data?.answer && j.proof,
  );

  const proveNonExist = await call(
    "prove: fact_key doesn't exist → 404",
    {
      operation: "prove",
      user_id: "test_user_1",
      fact_key: "nonexistent_key_xyz",
      query: "anything?",
    },
    404,
  );

  // prove on E2EE → 422
  await call(
    "prove: E2EE fact → 422 CLIENT_ENCRYPTED",
    {
      operation: "prove",
      user_id: "test_user_1",
      fact_key: "secret_ssn",
      query: "what is the SSN?",
    },
    422,
    (j) => j.error === "CLIENT_ENCRYPTED",
  );

  // ─── Verify Proof ───
  console.log("\n\n--- VERIFY PROOF ---");

  if (proveResult?.proof) {
    await call(
      "verify_proof: valid proof → verified: true",
      { operation: "verify_proof", proof: proveResult.proof },
      200,
      (j) => j.success && j.data?.valid === true,
    );

    // Decode, modify the answer field, re-encode to produce a well-formed but invalid proof
    const decoded = JSON.parse(Buffer.from(proveResult.proof, "base64url").toString("utf8"));
    decoded.a = decoded.a === "yes" ? "no" : "yes";
    const tampered = Buffer.from(JSON.stringify(decoded), "utf8").toString("base64url");
    await call(
      "verify_proof: tampered proof → valid: false",
      { operation: "verify_proof", proof: tampered },
      200,
      (j) => j.success && j.data?.valid === false,
    );
  } else {
    console.log("\n  [SKIP] No proof to verify (prove failed)");
    skipped += 2;
  }

  await call(
    "verify_proof: garbage string → 400",
    { operation: "verify_proof", proof: "totally-not-a-proof" },
    400,
  );

  // ─── Share ───
  console.log("\n\n--- SHARE ---");

  const shareResult = await call(
    "share: fact with recipient agent",
    {
      operation: "share",
      user_id: "test_user_1",
      fact_key: "favorite_color",
      query: "does the user like red?",
      recipient_agent_id: "agent_booking_456",
    },
    200,
    (j) => j.success && j.data?.share_token && j.data?.expires_at && j.proof,
  );

  // share on E2EE → 422
  await call(
    "share: E2EE fact → 422 CLIENT_ENCRYPTED",
    {
      operation: "share",
      user_id: "test_user_1",
      fact_key: "secret_ssn",
      query: "anything?",
      recipient_agent_id: "agent_x",
    },
    422,
    (j) => j.error === "CLIENT_ENCRYPTED",
  );

  // ─── Search ───
  console.log("\n\n--- SEARCH ---");

  // Search requires calling embedText, which may fail if the LLM provider is bad.
  // We test it anyway to document the behavior.
  const searchResult = await call(
    "search: what does the user like? (needs LLM embedding)",
    {
      operation: "search",
      user_id: "test_user_1",
      query: "what does the user like?",
    },
    null, // don't assert status — depends on LLM provider
    null,
  );
  if (searchResult && searchResult.success) {
    console.log("  -> Search returned results.");
  } else {
    console.log("  -> Search failed (likely LLM provider 401). This is expected if your OPENROUTER/OPENAI key is invalid.");
  }

  // ─── Sandbox ───
  console.log("\n\n--- SANDBOX ---");

  await call(
    "sandbox: calculate_travel_budget",
    {
      operation: "sandbox",
      user_id: "test_user_1",
      action: "calculate_travel_budget",
      parameters: { monthly_income: 6500, current_savings: 12000, preferred_destination: "beach" },
    },
    200,
    (j) =>
      j.success &&
      j.data?.result?.recommended_budget &&
      j.data?.attestation?.provider === "vm-sandbox" &&
      j.proof,
  );

  await call(
    "sandbox: calculate_budget",
    {
      operation: "sandbox",
      user_id: "test_user_1",
      action: "calculate_budget",
      parameters: { monthly_income: 5000, expenses: [{ amount: 1200 }, { amount: 800 }] },
    },
    200,
    (j) => j.success && j.data?.result?.disposable !== undefined,
  );

  await call(
    "sandbox: analyze_spending",
    {
      operation: "sandbox",
      user_id: "test_user_1",
      action: "analyze_spending",
      parameters: { expenses: [{ amount: 100 }, { amount: 200 }, { amount: 300 }] },
    },
    200,
    (j) => j.success && j.data?.result?.total_spend === 600,
  );

  await call(
    "sandbox: unknown action → returns error in result",
    {
      operation: "sandbox",
      user_id: "test_user_1",
      action: "does_not_exist",
      parameters: {},
    },
    200,
    (j) => j.success && j.data?.result?.error === "SANDBOX_ACTION_FAILED",
  );

  // ─── Usage tracking ───
  console.log("\n\n--- USAGE TRACKING ---");

  {
    const res = await fetch(API, {
      method: "POST",
      headers: { "x-api-key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        operation: "sandbox",
        user_id: "test_user_1",
        action: "analyze_spending",
        parameters: { expenses: [] },
      }),
    });
    const j = await res.json();
    process.stdout.write(`\n[${passed + failed + skipped + 1}] Usage counter increments ... `);
    if (j.usage && typeof j.usage.calls === "number" && j.usage.calls > 0 && j.usage.limit > 0) {
      console.log(`PASS (calls=${j.usage.calls}, limit=${j.usage.limit})`);
      passed++;
    } else {
      console.log("FAIL");
      console.log(j);
      failed++;
    }
  }

  // ─── CORS preflight ───
  console.log("\n\n--- CORS ---");

  process.stdout.write(`\n[${passed + failed + skipped + 1}] OPTIONS preflight → 204 ... `);
  {
    const r = await fetch(API, { method: "OPTIONS", headers: { Origin: "https://zkshare.dev" } });
    if (r.status === 204) { console.log("PASS"); passed++; }
    else { console.log(`FAIL (got ${r.status})`); failed++; }
  }

  // ─── Summary ───
  console.log("\n\n" + "=".repeat(60));
  console.log(`RESULTS:  ${passed} passed · ${failed} failed · ${skipped} skipped`);
  console.log("=".repeat(60));

  if (failed > 0) process.exit(1);
}

main();
