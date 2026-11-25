import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const VERSION = "v1";

// Derived from SESSION_SECRET by default so no extra setup is needed. Rotating whichever secret is used
// makes saved AI keys unreadable, and users are asked to re-enter them.
function masterSecret() {
  return process.env.AI_KEY_ENCRYPTION_SECRET || process.env.SESSION_SECRET;
}

function encryptionKey() {
  const secret = masterSecret();
  if (!secret) throw new Error("Neither AI_KEY_ENCRYPTION_SECRET nor SESSION_SECRET is set.");
  return Buffer.from(hkdfSync("sha256", secret, "pocket-watcher", "ai-provider-keys", 32));
}

export function isEncryptionConfigured() {
  return Boolean(masterSecret());
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptSecret(stored: string) {
  const [version, iv, tag, ciphertext] = stored.split(":");
  if (version !== VERSION || !iv || !tag || ciphertext === undefined) throw new Error("Unrecognised encrypted value.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
}
