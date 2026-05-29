import { desc, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { nanoid } from "nanoid";
import { config } from "./config.js";
import { databaseTypeForService, isDatabaseService } from "./database-urls.js";
import { runDockerExec, type DatabaseContext } from "./database-viewer-shared.js";
import { containerNameForService, getServiceById } from "./deploy.js";
import { db, nowIso } from "./db.js";
import { deleteR2Object, uploadFileToR2 } from "./r2-storage.js";
import { databaseBackups, envVars, type DatabaseBackup } from "./schema.js";
import { getSystemSettings } from "./system-settings.js";

export type BackupStorageTarget = "disk" | "disk+r2";

function envMapForService(serviceId: string) {
  const rows = db.select().from(envVars).where(eq(envVars.serviceId, serviceId)).all();
  return new Map(rows.map((row) => [row.key, row.value]));
}

function databaseContext(serviceId: string): DatabaseContext {
  const service = getServiceById(serviceId);
  if (!service || !isDatabaseService(service)) {
    throw new Error("Database service not found");
  }

  return {
    service,
    dbType: databaseTypeForService(service),
    envMap: envMapForService(service.id),
    containerName: containerNameForService(service.id)
  };
}

function runDocker(args: string[]) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });
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
        reject(new Error((stderr || stdout || "Docker command failed").trim()));
      }
    });
  });
}

function shellQuote(value: string | number) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function safeTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function localBackupDir(serviceId: string) {
  const dir = resolve(config.dataDir, "backups", serviceId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function backupBaseName(ctx: DatabaseContext, backupId: string, extension: string) {
  return `${safeTimestamp()}-${ctx.service.slug}-${ctx.dbType}-${backupId}.${extension}`;
}

async function copyBackupFromContainer(ctx: DatabaseContext, remotePath: string, localPath: string) {
  await runDocker(["cp", `${ctx.containerName}:${remotePath}`, localPath]);
  await runDockerExec(ctx.containerName, ["rm", "-f", remotePath]).catch(() => undefined);
}

function fileSha256(localPath: string) {
  return createHash("sha256").update(readFileSync(localPath)).digest("hex");
}

async function createPostgresBackup(ctx: DatabaseContext, backupId: string) {
  const user = ctx.envMap.get("POSTGRES_USER") || "postgres";
  const password = ctx.envMap.get("POSTGRES_PASSWORD") || "";
  const dbName = ctx.envMap.get("POSTGRES_DB") || "aeroplane";
  const localPath = resolve(localBackupDir(ctx.service.id), backupBaseName(ctx, backupId, "dump"));
  const remotePath = `/tmp/aeroplane-backup-${backupId}.dump`;

  await runDockerExec(
    ctx.containerName,
    [
      "pg_dump",
      "-h",
      "127.0.0.1",
      "-p",
      String(ctx.service.internalPort),
      "-U",
      user,
      "-d",
      dbName,
      "-Fc",
      "-f",
      remotePath
    ],
    { PGPASSWORD: password }
  );
  await copyBackupFromContainer(ctx, remotePath, localPath);
  return { localPath, format: "pg_dump custom" };
}

async function createMysqlBackup(ctx: DatabaseContext, backupId: string) {
  const user = ctx.envMap.get("MYSQL_USER") || "root";
  const password = ctx.envMap.get("MYSQL_PASSWORD") || ctx.envMap.get("MYSQL_ROOT_PASSWORD") || "";
  const dbName = ctx.envMap.get("MYSQL_DATABASE") || "aeroplane";
  const localPath = resolve(localBackupDir(ctx.service.id), backupBaseName(ctx, backupId, "sql"));
  const remotePath = `/tmp/aeroplane-backup-${backupId}.sql`;

  await runDockerExec(
    ctx.containerName,
    [
      "sh",
      "-lc",
      `mysqldump -h 127.0.0.1 -P ${Number(ctx.service.internalPort)} -u ${shellQuote(user)} --single-transaction --routines --triggers --events ${shellQuote(dbName)} > ${shellQuote(remotePath)}`
    ],
    { MYSQL_PWD: password }
  );
  await copyBackupFromContainer(ctx, remotePath, localPath);
  return { localPath, format: "mysqldump sql" };
}

async function createMongoBackup(ctx: DatabaseContext, backupId: string) {
  const user = ctx.envMap.get("MONGO_INITDB_ROOT_USERNAME") || "mongo";
  const password = ctx.envMap.get("MONGO_INITDB_ROOT_PASSWORD") || "";
  const auth = password ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@` : "";
  const uri = `mongodb://${auth}127.0.0.1:${ctx.service.internalPort}/?authSource=admin`;
  const localPath = resolve(localBackupDir(ctx.service.id), backupBaseName(ctx, backupId, "archive.gz"));
  const remotePath = `/tmp/aeroplane-backup-${backupId}.archive.gz`;

  await runDockerExec(ctx.containerName, ["mongodump", `--archive=${remotePath}`, "--gzip", "--uri", uri]);
  await copyBackupFromContainer(ctx, remotePath, localPath);
  return { localPath, format: "mongodump archive.gz" };
}

async function createRedisBackup(ctx: DatabaseContext, backupId: string) {
  const password = ctx.envMap.get("REDIS_PASSWORD") || "";
  const localPath = resolve(localBackupDir(ctx.service.id), backupBaseName(ctx, backupId, "rdb"));
  const remotePath = `/tmp/aeroplane-backup-${backupId}.rdb`;
  const command = (includePassword: boolean) => [
    "redis-cli",
    "-h",
    "127.0.0.1",
    "-p",
    String(ctx.service.internalPort),
    ...(includePassword && password ? ["-a", password] : []),
    "--rdb",
    remotePath
  ];

  try {
    await runDockerExec(ctx.containerName, command(true));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!password || !/AUTH|password/i.test(message)) throw error;
    await runDockerExec(ctx.containerName, command(false));
  }

  await copyBackupFromContainer(ctx, remotePath, localPath);
  return { localPath, format: "redis rdb" };
}

async function createLocalBackup(ctx: DatabaseContext, backupId: string) {
  if (ctx.dbType === "postgres") return createPostgresBackup(ctx, backupId);
  if (ctx.dbType === "mysql") return createMysqlBackup(ctx, backupId);
  if (ctx.dbType === "mongodb" || ctx.dbType === "mongo") return createMongoBackup(ctx, backupId);
  if (ctx.dbType === "redis") return createRedisBackup(ctx, backupId);
  throw new Error(`${ctx.dbType} backups are not available yet`);
}

function publicBackup(row: DatabaseBackup) {
  return {
    id: row.id,
    serviceId: row.serviceId,
    engine: row.engine,
    status: row.status,
    storage: row.storage,
    format: row.format,
    localPath: row.localPath,
    fileName: row.localPath ? basename(row.localPath) : null,
    r2Key: row.r2Key,
    sizeBytes: row.sizeBytes,
    checksum: row.checksum,
    error: row.error,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt
  };
}

export function listDatabaseBackups(serviceId: string) {
  databaseContext(serviceId);
  return db
    .select()
    .from(databaseBackups)
    .where(eq(databaseBackups.serviceId, serviceId))
    .orderBy(desc(databaseBackups.createdAt))
    .all()
    .map(publicBackup);
}

export async function createDatabaseBackup(serviceId: string, storage: BackupStorageTarget) {
  const ctx = databaseContext(serviceId);
  const settings = getSystemSettings();
  if (storage === "disk+r2" && !settings.r2) {
    throw new Error("Connect R2 in System Settings before uploading backups.");
  }

  const backupId = nanoid(10);
  const createdAt = nowIso();
  db.insert(databaseBackups)
    .values({
      id: backupId,
      serviceId,
      engine: ctx.dbType,
      status: "running",
      storage,
      format: "pending",
      localPath: null,
      r2Key: null,
      sizeBytes: null,
      checksum: null,
      error: null,
      createdAt,
      startedAt: createdAt,
      finishedAt: null
    })
    .run();

  try {
    const local = await createLocalBackup(ctx, backupId);
    const stats = statSync(local.localPath);
    const checksum = fileSha256(local.localPath);
    let r2Key: string | null = null;

    if (storage === "disk+r2") {
      const r2 = settings.r2;
      if (!r2) throw new Error("R2 is not connected");
      r2Key = `database-backups/${ctx.service.projectId}/${ctx.service.slug}/${basename(local.localPath)}`;
      await uploadFileToR2(r2, local.localPath, r2Key);
    }

    db.update(databaseBackups)
      .set({
        status: "succeeded",
        format: local.format,
        localPath: local.localPath,
        r2Key,
        sizeBytes: stats.size,
        checksum,
        error: null,
        finishedAt: nowIso()
      })
      .where(eq(databaseBackups.id, backupId))
      .run();
  } catch (error) {
    db.update(databaseBackups)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Backup failed",
        finishedAt: nowIso()
      })
      .where(eq(databaseBackups.id, backupId))
      .run();
    throw error;
  }

  const backup = db.select().from(databaseBackups).where(eq(databaseBackups.id, backupId)).get();
  if (!backup) throw new Error("Backup was not recorded");
  return publicBackup(backup);
}

export function getDatabaseBackupFile(serviceId: string, backupId: string) {
  databaseContext(serviceId);
  const backup = db
    .select()
    .from(databaseBackups)
    .where(eq(databaseBackups.id, backupId))
    .get();
  if (!backup || backup.serviceId !== serviceId || !backup.localPath || !existsSync(backup.localPath)) {
    throw new Error("Backup file not found");
  }
  return { backup: publicBackup(backup), localPath: backup.localPath };
}

export async function deleteDatabaseBackup(serviceId: string, backupId: string) {
  databaseContext(serviceId);
  const backup = db
    .select()
    .from(databaseBackups)
    .where(eq(databaseBackups.id, backupId))
    .get();
  if (!backup || backup.serviceId !== serviceId) {
    throw new Error("Backup not found");
  }

  if (backup.localPath && existsSync(backup.localPath)) {
    rmSync(backup.localPath, { force: true });
  }

  const r2 = getSystemSettings().r2;
  if (backup.r2Key && r2) {
    await deleteR2Object(r2, backup.r2Key).catch(() => undefined);
  }

  db.delete(databaseBackups).where(eq(databaseBackups.id, backupId)).run();
  return { ok: true };
}
