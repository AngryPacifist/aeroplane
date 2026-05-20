import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projectGroups = sqliteTable("project_groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const services = sqliteTable("projects", {
  id: text("id").primaryKey(),
  projectId: text("project_group_id").notNull(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  repoFullName: text("repo_full_name"),
  repoUrl: text("repo_url").notNull(),
  branch: text("branch").notNull(),
  rootDir: text("root_dir"),
  githubToken: text("github_token"),
  webhookSecret: text("webhook_secret").notNull(),
  installCommand: text("install_command"),
  buildCommand: text("build_command"),
  startCommand: text("start_command"),
  staticOutput: text("static_output"),
  internalPort: integer("internal_port").notNull(),
  hostPort: integer("host_port").notNull(),
  status: text("status").notNull(),
  lastDeployedAt: text("last_deployed_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const deployments = sqliteTable("deployments", {
  id: text("id").primaryKey(),
  serviceId: text("project_id").notNull(),
  commitSha: text("commit_sha"),
  status: text("status").notNull(),
  trigger: text("trigger").notNull(),
  imageTag: text("image_tag"),
  containerName: text("container_name"),
  startedAt: text("started_at"),
  finishedAt: text("finished_at"),
  createdAt: text("created_at").notNull()
});

export const deploymentLogs = sqliteTable("deployment_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deploymentId: text("deployment_id").notNull(),
  line: text("line").notNull(),
  stream: text("stream").notNull(),
  createdAt: text("created_at").notNull()
});

export const envVars = sqliteTable("env_vars", {
  id: text("id").primaryKey(),
  serviceId: text("project_id").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const domains = sqliteTable("domains", {
  id: text("id").primaryKey(),
  serviceId: text("project_id").notNull(),
  hostname: text("hostname").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export type ProjectGroup = typeof projectGroups.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Deployment = typeof deployments.$inferSelect;
export type NewDeployment = typeof deployments.$inferInsert;
export type DeploymentLog = typeof deploymentLogs.$inferSelect;
export type EnvVar = typeof envVars.$inferSelect;
export type Domain = typeof domains.$inferSelect;
