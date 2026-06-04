export type ServiceFormPayload = {
  name: string;
  repoFullName?: string | null;
  repoUrl?: string;
  branch: string;
  rootDir?: string;
  dockerImage?: string;
  internalPort: number;
  installCommand?: string;
  buildCommand?: string;
  startCommand?: string;
  staticOutput?: string;
  runtimeMode?: "web" | "worker";
  databasePublicEnabled?: boolean;
  databasePublicHostname?: string;
  postgresLogicalReplicationEnabled?: boolean;
  env?: Array<{
    key: string;
    value: string;
  }>;
};
