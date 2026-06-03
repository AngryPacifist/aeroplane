import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { findCaddyCertificateForHost, waitForCaddyCertificateForHost } from "./caddy-certificates.js";
import { config } from "./config.js";
import { runDockerExec } from "./database-viewer-shared.js";
import type { Service } from "./schema.js";

export const postgresTlsMountPath = "/etc/aeroplane/postgres-tls";

const serverCertFile = "server.crt";
const serverKeyFile = "server.key";
const caCertFile = "ca.crt";
const caKeyFile = "ca.key";
const serverCsrFile = "server.csr";
const serverConfigFile = "server-openssl.cnf";

export type PostgresTlsAssets = {
  hostDir: string;
  volumeName: string;
  caCertPath: string;
  serverCertPath: string;
  serverKeyPath: string;
  certificateSource: "aeroplane-ca" | "public-ca";
};

export type PostgresTlsInfo = {
  configured: boolean;
  active: boolean | null;
  publicAccessEnabled: boolean;
  hostname: string | null;
  port: number;
  database: string;
  user: string;
  sslMode: "verify-full";
  connectionString: string | null;
  caDownloadUrl: string;
  caFingerprint: string | null;
  certificateHosts: string[];
  certificateSource: "aeroplane-ca" | "public-ca";
  wranglerCommand: string | null;
};

export type PostgresTlsVolumePrepPlan = {
  containerName: string;
  commands: string[][];
  cleanupCommand: string[];
};

type EnvMap = Map<string, string>;

function run(command: string, args: string[]) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error((stderr || stdout || `${command} exited with ${code}`).trim()));
      }
    });
  });
}

function shellQuote(value: string | number) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function safeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "postgres";
}

function tlsVolumeName(serviceId: string) {
  const hash = createHash("sha256").update(serviceId).digest("hex").slice(0, 16);
  return `aeroplane-postgres-tls-${hash}`;
}

function assetPaths(serviceId: string): Omit<PostgresTlsAssets, "certificateSource"> & {
  caKeyPath: string;
  serverCsrPath: string;
  serverConfigPath: string;
} {
  const hostDir = resolve(config.dataDir, "postgres-tls", serviceId);
  return {
    hostDir,
    volumeName: tlsVolumeName(serviceId),
    caCertPath: join(hostDir, caCertFile),
    caKeyPath: join(hostDir, caKeyFile),
    serverCertPath: join(hostDir, serverCertFile),
    serverKeyPath: join(hostDir, serverKeyFile),
    serverCsrPath: join(hostDir, serverCsrFile),
    serverConfigPath: join(hostDir, serverConfigFile)
  };
}

export function postgresTlsCertificateHosts(service: Service) {
  const hosts = new Set<string>([service.slug, "localhost"]);
  if (service.databasePublicHostname) hosts.add(service.databasePublicHostname);
  return Array.from(hosts).filter(Boolean);
}

function opensslConfigForHosts(hosts: string[]) {
  const dnsEntries = hosts.map((host, index) => `DNS.${index + 1} = ${host}`);
  return [
    "[req]",
    "default_bits = 2048",
    "prompt = no",
    "default_md = sha256",
    "distinguished_name = dn",
    "req_extensions = v3_req",
    "",
    "[dn]",
    "CN = Aeroplane Postgres",
    "",
    "[v3_req]",
    "basicConstraints = CA:FALSE",
    "keyUsage = digitalSignature, keyEncipherment",
    "extendedKeyUsage = serverAuth",
    "subjectAltName = @alt_names",
    "",
    "[alt_names]",
    ...dnsEntries,
    "IP.1 = 127.0.0.1"
  ].join("\n");
}

function caFingerprint(caCertPath: string) {
  if (!existsSync(caCertPath)) return null;
  return createHash("sha256").update(readFileSync(caCertPath)).digest("hex");
}

function fileFingerprint(filePath: string) {
  if (!existsSync(filePath)) return null;
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function certificateSource(service: Service, serverCertPath: string): PostgresTlsAssets["certificateSource"] {
  if (!service.databasePublicHostname) return "aeroplane-ca";
  const caddyCertificate = findCaddyCertificateForHost(service.databasePublicHostname);
  if (!caddyCertificate) return "aeroplane-ca";
  return fileFingerprint(serverCertPath) === fileFingerprint(caddyCertificate.certPath) ? "public-ca" : "aeroplane-ca";
}

async function ensureCa(paths: ReturnType<typeof assetPaths>, service: Service) {
  if (existsSync(paths.caCertPath) && existsSync(paths.caKeyPath)) return;

  await run("openssl", ["genrsa", "-out", paths.caKeyPath, "4096"]);
  chmodSync(paths.caKeyPath, 0o600);
  await run("openssl", [
    "req",
    "-x509",
    "-new",
    "-nodes",
    "-key",
    paths.caKeyPath,
    "-sha256",
    "-days",
    "3650",
    "-subj",
    `/CN=Aeroplane Postgres CA ${service.slug}`,
    "-out",
    paths.caCertPath
  ]);
  chmodSync(paths.caCertPath, 0o644);
}

async function createServerCertificate(paths: ReturnType<typeof assetPaths>, service: Service) {
  const hosts = postgresTlsCertificateHosts(service);
  writeFileSync(paths.serverConfigPath, opensslConfigForHosts(hosts));
  await run("openssl", ["genrsa", "-out", paths.serverKeyPath, "2048"]);
  chmodSync(paths.serverKeyPath, 0o600);
  await run("openssl", ["req", "-new", "-key", paths.serverKeyPath, "-out", paths.serverCsrPath, "-config", paths.serverConfigPath]);
  await run("openssl", [
    "x509",
    "-req",
    "-in",
    paths.serverCsrPath,
    "-CA",
    paths.caCertPath,
    "-CAkey",
    paths.caKeyPath,
    "-CAcreateserial",
    "-out",
    paths.serverCertPath,
    "-days",
    "825",
    "-sha256",
    "-extensions",
    "v3_req",
    "-extfile",
    paths.serverConfigPath
  ]);
  chmodSync(paths.serverCertPath, 0o644);
}

async function usePublicCertificate(paths: ReturnType<typeof assetPaths>, service: Service) {
  if (!service.databasePublicHostname) return false;
  const certificate = await waitForCaddyCertificateForHost(service.databasePublicHostname);
  if (!certificate) return false;

  try {
    await ensureCa(paths, service);
    copyFileSync(certificate.certPath, paths.serverCertPath);
    copyFileSync(certificate.keyPath, paths.serverKeyPath);
    chmodSync(paths.serverCertPath, 0o644);
    chmodSync(paths.serverKeyPath, 0o600);
    return true;
  } catch {
    return false;
  }
}

export async function ensurePostgresTlsAssets(service: Service): Promise<PostgresTlsAssets> {
  const paths = assetPaths(service.id);
  mkdirSync(paths.hostDir, { recursive: true });
  const publicCertificateReady = await usePublicCertificate(paths, service);
  if (!publicCertificateReady) {
    await ensureCa(paths, service);
    await createServerCertificate(paths, service);
  }
  return {
    hostDir: paths.hostDir,
    volumeName: paths.volumeName,
    caCertPath: paths.caCertPath,
    serverCertPath: paths.serverCertPath,
    serverKeyPath: paths.serverKeyPath,
    certificateSource: publicCertificateReady ? "public-ca" : "aeroplane-ca"
  };
}

export function postgresTlsVolumeCreateDockerArgs(assets: PostgresTlsAssets) {
  return ["volume", "create", assets.volumeName];
}

export function postgresTlsVolumePrepareDockerPlan(image: string, assets: PostgresTlsAssets): PostgresTlsVolumePrepPlan {
  const containerName = `aeroplane-postgres-tls-prep-${randomBytes(6).toString("hex")}`;
  const fixPermissions = [
    "set -eu",
    `chown postgres:postgres ${postgresTlsMountPath}/${serverKeyFile} ${postgresTlsMountPath}/${serverCertFile} ${postgresTlsMountPath}/${caCertFile}`,
    `chmod 600 ${postgresTlsMountPath}/${serverKeyFile}`,
    `chmod 644 ${postgresTlsMountPath}/${serverCertFile} ${postgresTlsMountPath}/${caCertFile}`
  ].join("; ");

  return {
    containerName,
    commands: [
      [
        "run",
        "-d",
        "--name",
        containerName,
        "--entrypoint",
        "sh",
        "--user",
        "root",
        "-v",
        `${assets.volumeName}:${postgresTlsMountPath}`,
        image,
        "-lc",
        "sleep 300"
      ],
      ["cp", assets.serverKeyPath, `${containerName}:${postgresTlsMountPath}/${serverKeyFile}`],
      ["cp", assets.serverCertPath, `${containerName}:${postgresTlsMountPath}/${serverCertFile}`],
      ["cp", assets.caCertPath, `${containerName}:${postgresTlsMountPath}/${caCertFile}`],
      ["exec", "--user", "root", containerName, "sh", "-lc", fixPermissions]
    ],
    cleanupCommand: ["rm", "-f", containerName]
  };
}

export function postgresTlsVolumeArg(assets: PostgresTlsAssets) {
  return `${assets.volumeName}:${postgresTlsMountPath}:ro`;
}

export function postgresTlsServerArgs() {
  return [
    "postgres",
    "-c",
    "ssl=on",
    "-c",
    `ssl_cert_file=${postgresTlsMountPath}/${serverCertFile}`,
    "-c",
    `ssl_key_file=${postgresTlsMountPath}/${serverKeyFile}`,
    "-c",
    `ssl_ca_file=${postgresTlsMountPath}/${caCertFile}`
  ];
}

function postgresConnectionString(service: Service, envMap: EnvMap) {
  if (!service.databasePublicHostname) return null;
  const user = envMap.get("POSTGRES_USER") || "postgres";
  const password = envMap.get("POSTGRES_PASSWORD") || "";
  const dbName = envMap.get("POSTGRES_DB") || "aeroplane";
  const url = new URL(`postgresql://${service.databasePublicHostname}:${service.hostPort}/${dbName}`);
  url.username = user;
  url.password = password;
  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}

function wranglerCommand(service: Service, connectionString: string | null) {
  if (!connectionString) return null;
  const caName = `aeroplane-${safeName(service.slug)}-postgres-ca`;
  const hyperdriveName = `aeroplane-${safeName(service.slug)}`;
  return [
    `npx wrangler cert upload certificate-authority --ca-cert aeroplane-postgres-ca.pem --name ${shellQuote(caName)}`,
    `npx wrangler hyperdrive create ${shellQuote(hyperdriveName)} --connection-string=${shellQuote(connectionString)} --ca-certificate-id <CA_CERT_ID> --sslmode verify-full`
  ].join("\n");
}

export async function checkPostgresTlsActive(service: Service, envMap: EnvMap, containerName: string) {
  const user = envMap.get("POSTGRES_USER") || "postgres";
  const password = envMap.get("POSTGRES_PASSWORD") || "";
  const dbName = envMap.get("POSTGRES_DB") || "aeroplane";

  try {
    const result = await runDockerExec(
      containerName,
      [
        "psql",
        "-h",
        "127.0.0.1",
        "-p",
        String(service.internalPort),
        "-U",
        user,
        "-d",
        dbName,
        "--tuples-only",
        "--no-align",
        "--command",
        "select ssl from pg_stat_ssl where pid = pg_backend_pid()"
      ],
      { PGPASSWORD: password, PGSSLMODE: "require" }
    );
    return result.stdout.trim() === "t";
  } catch {
    return false;
  }
}

export function getPostgresTlsInfo(service: Service, envMap: EnvMap, active: boolean | null): PostgresTlsInfo {
  const paths = assetPaths(service.id);
  const connectionString = postgresConnectionString(service, envMap);
  return {
    configured: Boolean(connectionString),
    active,
    publicAccessEnabled: Boolean(service.databasePublicEnabled),
    hostname: service.databasePublicHostname,
    port: service.hostPort,
    database: envMap.get("POSTGRES_DB") || "aeroplane",
    user: envMap.get("POSTGRES_USER") || "postgres",
    sslMode: "verify-full",
    connectionString,
    caDownloadUrl: `/api/services/${service.id}/database/tls/ca`,
    caFingerprint: caFingerprint(paths.caCertPath),
    certificateHosts: postgresTlsCertificateHosts(service),
    certificateSource: certificateSource(service, paths.serverCertPath),
    wranglerCommand: wranglerCommand(service, connectionString)
  };
}
