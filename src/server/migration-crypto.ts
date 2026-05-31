import { createCipheriv, createDecipheriv, randomBytes, scrypt as scryptCallback } from "node:crypto";
import { createReadStream, createWriteStream, openSync, readSync, closeSync, writeFileSync, rmSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const bundleMagic = "AEROPLANE-BUNDLE-V1";

type EncryptedBundleHeader = {
  algorithm: "aes-256-gcm";
  kdf: "scrypt";
  salt: string;
  iv: string;
  tag: string;
};

async function deriveKey(passphrase: string, salt: Buffer) {
  return (await scrypt(passphrase, salt, 32)) as Buffer;
}

function parseBundleHeader(bundlePath: string) {
  const fd = openSync(bundlePath, "r");
  const buffer = Buffer.alloc(64 * 1024);
  const bytesRead = readSync(fd, buffer, 0, buffer.length, 0);
  closeSync(fd);

  const headerText = buffer.subarray(0, bytesRead).toString("utf8");
  const firstNewline = headerText.indexOf("\n");
  const secondNewline = firstNewline >= 0 ? headerText.indexOf("\n", firstNewline + 1) : -1;
  if (firstNewline < 0 || secondNewline < 0) {
    throw new Error("Migration bundle header is incomplete");
  }

  const magic = headerText.slice(0, firstNewline);
  if (magic !== bundleMagic) {
    throw new Error("This is not an Aeroplane migration bundle");
  }

  const header = JSON.parse(headerText.slice(firstNewline + 1, secondNewline)) as EncryptedBundleHeader;
  if (header.algorithm !== "aes-256-gcm" || header.kdf !== "scrypt") {
    throw new Error("Migration bundle encryption is not supported");
  }

  return {
    header,
    payloadOffset: Buffer.byteLength(headerText.slice(0, secondNewline + 1))
  };
}

export async function encryptMigrationArchive(sourcePath: string, targetPath: string, passphrase: string) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(passphrase, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertextPath = `${targetPath}.cipher`;

  try {
    await pipeline(createReadStream(sourcePath), cipher, createWriteStream(ciphertextPath));
    const header: EncryptedBundleHeader = {
      algorithm: "aes-256-gcm",
      kdf: "scrypt",
      salt: salt.toString("base64url"),
      iv: iv.toString("base64url"),
      tag: cipher.getAuthTag().toString("base64url")
    };

    writeFileSync(targetPath, `${bundleMagic}\n${JSON.stringify(header)}\n`);
    await pipeline(createReadStream(ciphertextPath), createWriteStream(targetPath, { flags: "a" }));
  } finally {
    rmSync(ciphertextPath, { force: true });
  }
}

export async function decryptMigrationArchive(bundlePath: string, targetPath: string, passphrase: string) {
  const { header, payloadOffset } = parseBundleHeader(bundlePath);
  const key = await deriveKey(passphrase, Buffer.from(header.salt, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(header.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(header.tag, "base64url"));

  try {
    await pipeline(createReadStream(bundlePath, { start: payloadOffset }), decipher, createWriteStream(targetPath));
  } catch {
    rmSync(targetPath, { force: true });
    throw new Error("Could not decrypt migration bundle. Check the passphrase and file.");
  }
}
