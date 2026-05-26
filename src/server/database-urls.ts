import type { Service } from "./schema.js";

type DatabaseServiceShape = Pick<Service, "repoUrl" | "repoFullName">;

type DatabaseUrlOptions = {
  dbType: string;
  envMap: Map<string, string>;
  host: string;
  port: number;
};

export function isDatabaseService(service: DatabaseServiceShape) {
  return service.repoUrl === "database" || (service.repoFullName?.startsWith("database:") ?? false);
}

export function databaseTypeForService(service: DatabaseServiceShape) {
  return service.repoFullName?.split(":")[1] || "postgres";
}

export function buildDatabaseConnectionUrl({ dbType, envMap, host, port }: DatabaseUrlOptions) {
  if (dbType === "mysql") {
    const user = envMap.get("MYSQL_USER") || "mysql";
    const password = envMap.get("MYSQL_PASSWORD") || "";
    const dbName = envMap.get("MYSQL_DATABASE") || "aeroplane";
    return {
      key: "DATABASE_URL",
      value: `mysql://${user}:${password}@${host}:${port}/${dbName}`
    };
  }

  if (dbType === "redis") {
    const password = envMap.get("REDIS_PASSWORD") || "";
    return {
      key: "REDIS_URL",
      value: password ? `redis://:${password}@${host}:${port}` : `redis://${host}:${port}`
    };
  }

  if (dbType === "mongodb") {
    const user = envMap.get("MONGO_INITDB_ROOT_USERNAME") || "mongo";
    const password = envMap.get("MONGO_INITDB_ROOT_PASSWORD") || "";
    return {
      key: "MONGODB_URI",
      value: `mongodb://${user}:${password}@${host}:${port}/?authSource=admin`
    };
  }

  if (dbType === "clickhouse") {
    const user = envMap.get("CLICKHOUSE_USER") || "clickhouse";
    const password = envMap.get("CLICKHOUSE_PASSWORD") || "";
    const dbName = envMap.get("CLICKHOUSE_DB") || "aeroplane";
    return {
      key: "CLICKHOUSE_URL",
      value: `clickhouse://${user}:${password}@${host}:${port}/${dbName}`
    };
  }

  const user = envMap.get("POSTGRES_USER") || "postgres";
  const password = envMap.get("POSTGRES_PASSWORD") || "";
  const dbName = envMap.get("POSTGRES_DB") || "aeroplane";
  return {
    key: "DATABASE_URL",
    value: `postgresql://${user}:${password}@${host}:${port}/${dbName}`
  };
}
