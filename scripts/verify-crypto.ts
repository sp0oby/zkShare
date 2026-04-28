/**
 * Self-audit for the privacy-critical crypto paths. Runs in process, with no network or
 * database dependencies. Asserts:
 *
 *   - server-sealed encryption round trips,
 *   - tampered ciphertext fails to decrypt (auth-tag enforcement),
 *   - the proof envelope verifies as `valid` for the original message,
 *   - a flipped bit in the envelope verifies as `invalid` (well-formed but bad HMAC),
 *   - garbage input verifies as `malformed`,
 *   - the commitment is deterministic for a given (fact_key, plaintext, secret).
 *
 * Run with `pnpm run verify:crypto`. The script falls back to deterministic ephemeral
 * secrets if `ZKSHARE_*_SECRET` are unset so it works in CI without long-lived material.
 */

import { strict as assert } from "node:assert";
import process from "node:process";

if (!process.env.ZKSHARE_ENCRYPTION_SECRET) {
  process.env.ZKSHARE_ENCRYPTION_SECRET =
    "verify-crypto-script-encryption-secret-do-not-use-32";
}
if (!process.env.ZKSHARE_PROOF_SECRET) {
  process.env.ZKSHARE_PROOF_SECRET = "verify-crypto-script-proof-secret-do-not-use";
}

async function main() {
  const { encryptFactPlaintext, decryptFactPayload } = await import(
    "../lib/encryption.ts"
  );
  const {
    buildProofPayload,
    computeCommitment,
    verifyZkshareProofDetailed,
  } = await import("../lib/zk.ts");

  const fact_key = "test/preference";
  const plaintext = "strongly prefers beach vacations over mountains";

  const sealed = encryptFactPlaintext(plaintext);
  const recovered = decryptFactPayload({
    ciphertext: sealed.ciphertext,
    iv: sealed.iv,
    auth_tag: sealed.authTag,
  });
  assert.equal(recovered, plaintext, "encryption round trip should recover plaintext");

  const tampered = Buffer.from(sealed.ciphertext, "base64");
  tampered[0] ^= 0x01;
  let tamperedDetected = false;
  try {
    decryptFactPayload({
      ciphertext: tampered.toString("base64"),
      iv: sealed.iv,
      auth_tag: sealed.authTag,
    });
  } catch {
    tamperedDetected = true;
  }
  assert.ok(tamperedDetected, "tampered ciphertext must fail to decrypt");

  const c1 = computeCommitment(fact_key, plaintext);
  const c2 = computeCommitment(fact_key, plaintext);
  assert.equal(c1, c2, "commitments should be deterministic for the same inputs");
  assert.notEqual(
    c1,
    computeCommitment(fact_key, plaintext + "!"),
    "commitments should change when plaintext changes",
  );

  const { proof } = buildProofPayload({
    factId: "00000000-0000-0000-0000-000000000000",
    commitment: c1,
    query: "does the user prefer beach vacations?",
    answer: "yes",
  });

  const verdictValid = verifyZkshareProofDetailed(proof);
  assert.equal(verdictValid.status, "valid", "freshly built envelope must verify");

  const flipped = (() => {
    const decoded = Buffer.from(proof, "base64url").toString("utf8");
    const obj = JSON.parse(decoded);
    obj.a = obj.a === "yes" ? "no" : "yes";
    return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
  })();
  const verdictFlipped = verifyZkshareProofDetailed(flipped);
  assert.equal(
    verdictFlipped.status,
    "invalid",
    "answer-tampered envelope must verify as invalid (well-formed, bad HMAC)",
  );

  const malformed = "this-is-not-a-valid-zkshare-proof";
  const verdictMalformed = verifyZkshareProofDetailed(malformed);
  assert.equal(
    verdictMalformed.status,
    "malformed",
    "garbage input must verify as malformed",
  );

  console.log("[verify-crypto] OK");
}

main().catch((err) => {
  console.error("[verify-crypto] FAIL");
  console.error(err);
  process.exit(1);
});
