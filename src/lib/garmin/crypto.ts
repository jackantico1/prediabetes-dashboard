import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * AES-256-GCM for the Garmin token blob at rest. The key is derived from
 * TOKEN_ENCRYPTION_KEY with SHA-256, so any sufficiently random string works.
 * Changing the key orphans stored tokens (users reconnect Garmin).
 */
function key(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret || secret.length < 16) throw new Error("TOKEN_ENCRYPTION_KEY must be set (at least 16 characters) to store Garmin tokens.");
  return createHash("sha256").update(secret).digest();
}

export const encryptionConfigured = () => Boolean(process.env.TOKEN_ENCRYPTION_KEY && process.env.TOKEN_ENCRYPTION_KEY.length >= 16);

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${data.toString("base64url")}`;
}

export function decrypt(blob: string): string {
  const [v, ivB, tagB, dataB] = blob.split(".");
  if (v !== "v1" || !ivB || !tagB || !dataB) throw new Error("Unrecognized token blob format");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataB, "base64url")), decipher.final()]).toString("utf8");
}
