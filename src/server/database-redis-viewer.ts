import {
  columnsFromRows,
  filterRowsInMemory,
  paginateRows,
  runDockerExec,
  type DatabaseColumn,
  type DatabaseContext,
  type DatabaseRowFilter,
  type DatabaseTable,
  type RowData
} from "./database-viewer-shared.js";

function redisKeyId(key: string) {
  return `redis:${Buffer.from(key).toString("base64url")}`;
}

function redisKeyFromId(id: string) {
  if (!id.startsWith("redis:")) throw new Error("Invalid Redis key");
  return Buffer.from(id.slice("redis:".length), "base64url").toString();
}

function parseLines(output: string) {
  if (!output) return [];
  return output.split(/\r?\n/).filter((line) => line.length > 0);
}

function redisKeyForInsert(table: string, values: RowData) {
  const explicitKey = String(values.key ?? "").trim();
  if (explicitKey) return explicitKey;
  if (table.startsWith("redis:")) return redisKeyFromId(table);
  return "";
}

function redisKeyForDelete(table: string, primaryKey: RowData) {
  const explicitKey = String(primaryKey.key ?? "").trim();
  if (explicitKey) return explicitKey;
  if (table.startsWith("redis:")) return redisKeyFromId(table);
  return "";
}

function redisKeyForUpdate(table: string, primaryKey: RowData) {
  const explicitKey = String(primaryKey.key ?? "").trim();
  if (explicitKey) return explicitKey;
  if (table.startsWith("redis:")) return redisKeyFromId(table);
  return "";
}

function redisValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function hasRedisField(row: RowData, field: string) {
  return Object.prototype.hasOwnProperty.call(row, field);
}

async function applyRedisTtl(ctx: DatabaseContext, key: string, values: RowData) {
  const ttl = Number(values.ttl ?? values.expiresIn ?? 0);
  if (Number.isFinite(ttl) && ttl > 0) {
    await runRedis(ctx, ["EXPIRE", key, String(Math.floor(ttl))]);
  }
}

async function runRedis(ctx: DatabaseContext, args: string[]) {
  const password = ctx.envMap.get("REDIS_PASSWORD") || "";
  const command = (withPassword: boolean) => [
    "redis-cli",
    "--no-auth-warning",
    "-h",
    "127.0.0.1",
    "-p",
    String(ctx.service.internalPort),
    ...(withPassword && password ? ["-a", password] : []),
    "--raw",
    ...args
  ];

  try {
    const result = await runDockerExec(ctx.containerName, command(true));
    return result.stdout.trimEnd();
  } catch (error) {
    if (password && error instanceof Error && error.message.toLowerCase().includes("auth")) {
      const result = await runDockerExec(ctx.containerName, command(false));
      return result.stdout.trimEnd();
    }
    throw error;
  }
}

async function redisKeyType(ctx: DatabaseContext, key: string) {
  return (await runRedis(ctx, ["TYPE", key])).trim() || "none";
}

async function redisKeyCount(ctx: DatabaseContext, key: string, type: string) {
  try {
    if (type === "string") return 1;
    if (type === "list") return Number(await runRedis(ctx, ["LLEN", key]));
    if (type === "set") return Number(await runRedis(ctx, ["SCARD", key]));
    if (type === "zset") return Number(await runRedis(ctx, ["ZCARD", key]));
    if (type === "hash") return Number(await runRedis(ctx, ["HLEN", key]));
    if (type === "stream") return Number(await runRedis(ctx, ["XLEN", key]));
  } catch {
    return null;
  }
  return null;
}

function baseColumns(rows: RowData[], preferredNames: string[]) {
  return columnsFromRows(rows, preferredNames).map((column) => ({
    ...column,
    primaryKey: column.name === "key" || column.name === "field" || column.name === "index" || column.name === "member"
  }));
}

function tableResponse(ctx: DatabaseContext, rows: RowData[], columns: DatabaseColumn[], table: string, limit: number, offset: number, filters: DatabaseRowFilter[]) {
  const filteredRows = filterRowsInMemory(rows, columns, filters);
  return {
    engine: ctx.dbType,
    editable: false,
    table,
    columns,
    rows: paginateRows(filteredRows, limit, offset),
    limit,
    offset,
    totalRows: filteredRows.length
  };
}

export async function getRedisTables(ctx: DatabaseContext) {
  const keys: string[] = [];
  let cursor = "0";
  do {
    const scanOutput = await runRedis(ctx, ["SCAN", cursor, "COUNT", "500"]);
    const lines = parseLines(scanOutput);
    cursor = lines[0] ?? "0";
    keys.push(...lines.slice(1));
  } while (cursor !== "0" && keys.length < 2000);
  keys.sort((left, right) => left.localeCompare(right));

  const tables: DatabaseTable[] = [];

  for (const key of keys) {
    const type = await redisKeyType(ctx, key);
    tables.push({
      id: redisKeyId(key),
      schema: type,
      name: key,
      rowCount: await redisKeyCount(ctx, key, type)
    });
  }

  return {
    engine: ctx.dbType,
    supported: true,
    editable: false,
    tables
  };
}

export async function getRedisRows(ctx: DatabaseContext, table: string, limit: number, offset: number, filters: DatabaseRowFilter[] = []) {
  const key = redisKeyFromId(table);
  const type = await redisKeyType(ctx, key);
  const ttl = Number(await runRedis(ctx, ["TTL", key]));

  if (type === "string") {
    const value = await runRedis(ctx, ["GET", key]);
    const bytes = Number(await runRedis(ctx, ["STRLEN", key]));
    const rows: RowData[] = [{ key, type, ttl, bytes, value }];
    const columns = baseColumns(rows, ["key", "type", "ttl", "bytes", "value"]);
    return tableResponse(ctx, rows, columns, table, limit, offset, filters);
  }

  if (type === "hash") {
    const values = parseLines(await runRedis(ctx, ["HGETALL", key]));
    const rows: RowData[] = [];
    for (let index = 0; index < values.length; index += 2) {
      rows.push({ key, type, ttl, field: values[index] ?? "", value: values[index + 1] ?? "" });
    }
    const columns = baseColumns(rows, ["key", "type", "ttl", "field", "value"]);
    return tableResponse(ctx, rows, columns, table, limit, offset, filters);
  }

  if (type === "list") {
    const values = parseLines(await runRedis(ctx, ["LRANGE", key, "0", "-1"]));
    const rows = values.map((value, index) => ({ key, type, ttl, index, value }));
    const columns = baseColumns(rows, ["key", "type", "ttl", "index", "value"]);
    return tableResponse(ctx, rows, columns, table, limit, offset, filters);
  }

  if (type === "set") {
    const rows = parseLines(await runRedis(ctx, ["SMEMBERS", key]))
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({ key, type, ttl, value }));
    const columns = baseColumns(rows, ["key", "type", "ttl", "value"]);
    return tableResponse(ctx, rows, columns, table, limit, offset, filters);
  }

  if (type === "zset") {
    const values = parseLines(await runRedis(ctx, ["ZRANGE", key, "0", "-1", "WITHSCORES"]));
    const rows: RowData[] = [];
    for (let index = 0; index < values.length; index += 2) {
      rows.push({ key, type, ttl, member: values[index] ?? "", score: Number(values[index + 1] ?? 0) });
    }
    const columns = baseColumns(rows, ["key", "type", "ttl", "member", "score"]);
    return tableResponse(ctx, rows, columns, table, limit, offset, filters);
  }

  const rows: RowData[] = [{ key, type, ttl, value: type === "none" ? "Key no longer exists" : "Preview is not available for this Redis type yet" }];
  const columns = baseColumns(rows, ["key", "type", "ttl", "value"]);
  return tableResponse(ctx, rows, columns, table, limit, offset, filters);
}

export async function insertRedisRow(ctx: DatabaseContext, table: string, values: RowData) {
  const key = redisKeyForInsert(table, values);
  if (!key) throw new Error("Redis key is required");

  const existingType = table.startsWith("redis:") ? await redisKeyType(ctx, key) : "";
  const type = existingType && existingType !== "none"
    ? existingType
    : redisValue(values.type || "string").toLowerCase();

  if (type === "string") {
    await runRedis(ctx, ["SET", key, redisValue(values.value)]);
  } else if (type === "hash") {
    const field = redisValue(values.field).trim();
    if (!field) throw new Error("Hash field is required");
    await runRedis(ctx, ["HSET", key, field, redisValue(values.value)]);
  } else if (type === "list") {
    await runRedis(ctx, ["RPUSH", key, redisValue(values.value)]);
  } else if (type === "set") {
    await runRedis(ctx, ["SADD", key, redisValue(values.value)]);
  } else if (type === "zset") {
    const member = redisValue(values.member || values.value).trim();
    const score = Number(values.score ?? 0);
    if (!member) throw new Error("Sorted set member is required");
    if (!Number.isFinite(score)) throw new Error("Sorted set score must be numeric");
    await runRedis(ctx, ["ZADD", key, String(score), member]);
  } else {
    throw new Error("Choose string, hash, list, set, or zset");
  }

  await applyRedisTtl(ctx, key, values);
  return { ok: true, table: redisKeyId(key) };
}

export async function updateRedisRow(ctx: DatabaseContext, table: string, primaryKey: RowData, values: RowData) {
  const key = redisKeyForUpdate(table, primaryKey);
  if (!key) throw new Error("Redis key is required");

  if (hasRedisField(values, "ttl") || hasRedisField(values, "persist")) {
    const ttl = Number(values.ttl ?? -1);
    if (values.persist === true || ttl < 0) {
      await runRedis(ctx, ["PERSIST", key]);
      return { ok: true };
    }
    if (!Number.isFinite(ttl)) throw new Error("TTL must be numeric");
    await runRedis(ctx, ["EXPIRE", key, String(Math.floor(ttl))]);
    return { ok: true };
  }

  const type = redisValue(primaryKey.type || (await redisKeyType(ctx, key))).toLowerCase();

  if (type === "string") {
    const ttl = Number(await runRedis(ctx, ["TTL", key]));
    await runRedis(ctx, ["SET", key, redisValue(values.value)]);
    if (Number.isFinite(ttl) && ttl > 0) {
      await runRedis(ctx, ["EXPIRE", key, String(Math.floor(ttl))]);
    }
    return { ok: true };
  }

  if (type === "hash") {
    const oldField = redisValue(primaryKey.field);
    const nextField = redisValue(values.field || oldField).trim();
    if (!oldField || !nextField) throw new Error("Hash field is required");
    if (nextField !== oldField) await runRedis(ctx, ["HDEL", key, oldField]);
    await runRedis(ctx, ["HSET", key, nextField, redisValue(values.value)]);
    return { ok: true };
  }

  if (type === "list") {
    const index = Number(primaryKey.index);
    if (!Number.isInteger(index) || index < 0) throw new Error("List index is required");
    await runRedis(ctx, ["LSET", key, String(index), redisValue(values.value)]);
    return { ok: true };
  }

  if (type === "set") {
    const oldValue = redisValue(primaryKey.value);
    const nextValue = redisValue(values.value);
    if (oldValue !== nextValue) {
      await runRedis(ctx, ["SREM", key, oldValue]);
      await runRedis(ctx, ["SADD", key, nextValue]);
    }
    return { ok: true };
  }

  if (type === "zset") {
    const oldMember = redisValue(primaryKey.member);
    const nextMember = redisValue(values.member || oldMember).trim();
    const score = Number(values.score ?? primaryKey.score ?? 0);
    if (!oldMember || !nextMember) throw new Error("Sorted set member is required");
    if (!Number.isFinite(score)) throw new Error("Sorted set score must be numeric");
    if (nextMember !== oldMember) await runRedis(ctx, ["ZREM", key, oldMember]);
    await runRedis(ctx, ["ZADD", key, String(score), nextMember]);
    return { ok: true };
  }

  throw new Error("Editing is not available for this Redis type");
}

export async function deleteRedisRow(ctx: DatabaseContext, table: string, primaryKey: RowData) {
  const key = redisKeyForDelete(table, primaryKey);
  if (!key) throw new Error("Redis key is required");

  const type = redisValue(primaryKey.type || (await redisKeyType(ctx, key))).toLowerCase();
  const wholeKeyDelete = !hasRedisField(primaryKey, "field") && !hasRedisField(primaryKey, "index") && !hasRedisField(primaryKey, "member") && !hasRedisField(primaryKey, "value");

  if (wholeKeyDelete || type === "string") {
    await runRedis(ctx, ["DEL", key]);
    return { ok: true };
  }

  if (type === "hash") {
    const field = redisValue(primaryKey.field);
    if (!field) throw new Error("Hash field is required");
    await runRedis(ctx, ["HDEL", key, field]);
    return { ok: true };
  }

  if (type === "list") {
    const index = Number(primaryKey.index);
    if (!Number.isInteger(index) || index < 0) throw new Error("List index is required");
    const marker = `__aeroplane_deleted_${Date.now()}_${Math.random().toString(36).slice(2)}__`;
    await runRedis(ctx, ["LSET", key, String(index), marker]);
    await runRedis(ctx, ["LREM", key, "1", marker]);
    return { ok: true };
  }

  if (type === "set") {
    await runRedis(ctx, ["SREM", key, redisValue(primaryKey.value)]);
    return { ok: true };
  }

  if (type === "zset") {
    const member = redisValue(primaryKey.member);
    if (!member) throw new Error("Sorted set member is required");
    await runRedis(ctx, ["ZREM", key, member]);
    return { ok: true };
  }

  await runRedis(ctx, ["DEL", key]);
  return { ok: true };
}
