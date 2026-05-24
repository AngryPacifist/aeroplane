import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { nanoid } from "nanoid";
import * as schema from "./schema.js";
import { createUniqueSlug } from "../shared/slug.js";

const dataDir = resolve(process.env.DATA_DIR ?? "data");
mkdirSync(dataDir, { recursive: true });

const sqlitePath = resolve(dataDir, "deploy.db");
mkdirSync(dirname(sqlitePath), { recursive: true });

export const sqlite = new Database(sqlitePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
CREATE TABLE IF NOT EXISTS project_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  project_group_id TEXT,
  slug TEXT,
  name TEXT NOT NULL,
  repo_full_name TEXT,
  repo_url TEXT NOT NULL,
  branch TEXT NOT NULL,
  root_dir TEXT,
  github_token TEXT,
  webhook_secret TEXT NOT NULL,
  install_command TEXT,
  build_command TEXT,
  start_command TEXT,
  static_output TEXT,
  internal_port INTEGER NOT NULL,
  host_port INTEGER NOT NULL UNIQUE,
  active_port INTEGER,
  status TEXT NOT NULL,
  last_deployed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deployments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  commit_sha TEXT,
  status TEXT NOT NULL,
  trigger TEXT NOT NULL,
  image_tag TEXT,
  container_name TEXT,
  started_at TEXT,
  finished_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deployment_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deployment_id TEXT NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  line TEXT NOT NULL,
  stream TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS env_vars (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, key)
);

CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);

function hasColumn(table: string, column: string) {
  const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

if (!hasColumn("projects", "project_group_id")) {
  sqlite.exec("ALTER TABLE projects ADD COLUMN project_group_id TEXT");
}

if (!hasColumn("projects", "slug")) {
  sqlite.exec("ALTER TABLE projects ADD COLUMN slug TEXT");
}

if (!hasColumn("projects", "repo_full_name")) {
  sqlite.exec("ALTER TABLE projects ADD COLUMN repo_full_name TEXT");
}

if (!hasColumn("projects", "root_dir")) {
  sqlite.exec("ALTER TABLE projects ADD COLUMN root_dir TEXT");
}

if (!hasColumn("projects", "active_port")) {
  sqlite.exec("ALTER TABLE projects ADD COLUMN active_port INTEGER");
}

sqlite.exec(`
CREATE INDEX IF NOT EXISTS idx_deployments_project_created ON deployments(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_deployment_created ON deployment_logs(deployment_id, id ASC);
CREATE INDEX IF NOT EXISTS idx_env_project_key ON env_vars(project_id, key);
CREATE INDEX IF NOT EXISTS idx_project_groups_slug ON project_groups(slug);
CREATE INDEX IF NOT EXISTS idx_services_project_group ON projects(project_group_id);
CREATE INDEX IF NOT EXISTS idx_services_slug ON projects(slug);
`);

const projectGroupSlugRows = sqlite.prepare("SELECT slug FROM project_groups").all() as Array<{ slug: string }>;
const projectGroupSlugs = new Set(projectGroupSlugRows.map((row) => row.slug));

const serviceRows = sqlite
  .prepare("SELECT id, name, repo_url, repo_full_name, project_group_id, slug, created_at, updated_at FROM projects")
  .all() as Array<{
  id: string;
  name: string;
  repo_url: string;
  repo_full_name: null | string;
  project_group_id: null | string;
  slug: null | string;
  created_at: string;
  updated_at: string;
}>;

for (const service of serviceRows) {
  let projectGroupId = service.project_group_id;
  let serviceSlug = service.slug;

  if (!projectGroupId) {
    const groupId = nanoid(10);
    const groupSlug = createUniqueSlug(service.name, projectGroupSlugs);
    sqlite
      .prepare("INSERT INTO project_groups (id, name, slug, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(groupId, service.name, groupSlug, null, service.created_at, service.updated_at);
    projectGroupId = groupId;
  }

  if (!serviceSlug) {
    serviceSlug = createUniqueSlug(service.name, new Set());
  }

  const repoFullName =
    service.repo_full_name ??
    service.repo_url
      .replace(/^https:\/\/github\.com\//, "")
      .replace(/^git@github\.com:/, "")
      .replace(/\.git$/, "");

  sqlite
    .prepare("UPDATE projects SET project_group_id = ?, slug = ?, repo_full_name = COALESCE(repo_full_name, ?) WHERE id = ?")
    .run(projectGroupId, serviceSlug, repoFullName, service.id);
}

export const db = drizzle(sqlite, { schema });

export function nowIso() {
  return new Date().toISOString();
}
