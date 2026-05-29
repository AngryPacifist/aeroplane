import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { config } from "./config.js";

const encryptedPrefix = "enc:v1:";

function activeSecretKey() {
  return process.env.AEROPLANE_SECRET_KEY || config.secretKey;
}

function encryptionKey() {
  const secret = activeSecretKey();
  if (!secret) {
    throw new Error("AEROPLANE_SECRET_KEY is required to encrypt secrets");
  }
  return createHash("sha256").update(secret).digest();
}

export function hasSecretKey() {
  return Boolean(activeSecretKey());
}

export function generateSecretKey() {
  return randomBytes(32).toString("base64url");
}

export function isEncryptedSecret(value: string) {
  return value.startsWith(encryptedPrefix);
}

export function encryptSecret(value: string) {
  if (!value || isEncryptedSecret(value)) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    encryptedPrefix.slice(0, -1),
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url")
  ].join(":");
}

export function decryptSecret(value: string) {
  if (!value || !isEncryptedSecret(value)) return value;
  const [, , ivText, tagText, ciphertextText] = value.split(":");
  if (!ivText || !tagText || !ciphertextText) {
    throw new Error("Encrypted secret is malformed");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, "base64url")),
    decipher.final()
  ]).toString("utf8");
}
