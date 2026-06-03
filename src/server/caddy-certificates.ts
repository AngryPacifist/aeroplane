import { X509Certificate } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { config } from "./config.js";

export type CaddyCertificate = {
  certPath: string;
  keyPath: string;
  validTo: string;
};

function caddyDataDir() {
  return resolve(process.env.CADDY_DATA_DIR ?? process.env.AEROPLANE_CADDY_DATA_DIR ?? join(config.dataDir, "caddy"));
}

function candidateCertificateDirs(root: string, depth = 0): string[] {
  if (depth > 4 || !existsSync(root)) return [];

  const entries = readdirSync(root, { withFileTypes: true });
  const dirs = [root];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      dirs.push(...candidateCertificateDirs(join(root, entry.name), depth + 1));
    }
  }
  return dirs;
}

function validCertificateForHost(certPath: string, hostname: string) {
  try {
    const certificate = new X509Certificate(readFileSync(certPath));
    if (!certificate.checkHost(hostname)) return null;
    if (Date.parse(certificate.validTo) <= Date.now()) return null;
    return certificate;
  } catch {
    return null;
  }
}

export function findCaddyCertificateForHost(hostname: string): CaddyCertificate | null {
  const normalizedHostname = hostname.trim().toLowerCase();
  if (!normalizedHostname || normalizedHostname === "localhost" || normalizedHostname.endsWith(".localhost")) return null;

  const certificatesRoot = join(caddyDataDir(), "certificates");
  for (const dir of candidateCertificateDirs(certificatesRoot)) {
    const certPath = join(dir, `${normalizedHostname}.crt`);
    const keyPath = join(dir, `${normalizedHostname}.key`);
    if (!existsSync(certPath) || !existsSync(keyPath)) continue;

    const certificate = validCertificateForHost(certPath, normalizedHostname);
    if (!certificate) continue;

    return {
      certPath,
      keyPath,
      validTo: certificate.validTo
    };
  }

  return null;
}

export async function waitForCaddyCertificateForHost(hostname: string, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  let certificate = findCaddyCertificateForHost(hostname);
  while (!certificate && Date.now() < deadline) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
    certificate = findCaddyCertificateForHost(hostname);
  }
  return certificate;
}
