import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import "server-only";

const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;

function getMasterKey(): Buffer {
  const secret = process.env.ZKSHARE_ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "ZKSHARE_ENCRYPTION_SECRET must be set (min 32 chars) for encrypting facts at rest",
    );
  }
  return scryptSync(secret, "zkshare-salt-v1", KEY_LEN);
}

export function encryptFactPlaintext(plaintext: string): {
  ciphertext: string;
  iv: string;
  authTag: string;
} {
  const key = getMasterKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: enc.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptFactPayload(parts: {
  ciphertext: string;
  iv: string;
  /** DB / PostgREST use snake_case; some call sites use camelCase from encrypt output. */
  authTag?: string;
  auth_tag?: string;
}): string {
  const tagB64 = parts.authTag ?? parts.auth_tag;
  if (!tagB64) {
    throw new Error("missing auth tag (expected authTag or auth_tag)");
  }
  const key = getMasterKey();
  const iv = Buffer.from(parts.iv, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const decipher = createDecipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
  decipher.setAuthTag(authTag);
  const dec = Buffer.concat([
    decipher.update(Buffer.from(parts.ciphertext, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

/** Decrypt a `facts` row from `.select("*")` or explicit column lists. */
export function decryptFactRow(row: Record<string, unknown>): string {
  return decryptFactPayload({
    ciphertext: String(row.ciphertext ?? ""),
    iv: String(row.iv ?? ""),
    auth_tag: String(row.auth_tag ?? row.authTag ?? ""),
  });
}
