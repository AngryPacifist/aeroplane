import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, nowIso } from "./db.js";
import { services, envVars, projectGroups } from "./schema.js";
import { allocateHostPort } from "./deploy.js";
import { writeAndReloadCaddy } from "./caddy.js";

async function fetchRailwayGraphQL(token: string, query: string, variables: any = {}) {
  const res = await fetch("https://backboard.railway.app/graphql/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ query, variables })
  });

  if (!res.ok) {
    throw new Error(`Railway GraphQL request failed: ${res.statusText}`);
  }

  const body = await res.json() as any;
  if (body.errors && body.errors.length > 0) {
    throw new Error(body.errors[0].message);
  }

  return body.data;
}

export async function getRailwayProjects(token: string) {
  const query = `
    query GetRailwayProjects {
      projects {
        edges {
          node {
            id
            name
            description
            services {
              edges {
                node {
                  id
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await fetchRailwayGraphQL(token, query);
  const edges = data?.projects?.edges ?? [];
  
  return edges.map((edge: any) => {
    const node = edge.node;
    const servicesEdges = node.services?.edges ?? [];
    return {
      id: node.id,
      name: node.name,
      description: node.description ?? "",
      serviceCount: servicesEdges.length
    };
  });
}

export async function importRailwayProject(token: string, railwayProjectId: string) {
  const projectQuery = `
    query GetRailwayProjectDetails($id: String!) {
      project(id: $id) {
        id
        name
        description
        services {
          edges {
            node {
              id
              name
            }
          }
        }
        environments {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    }
  `;

  const projectData = await fetchRailwayGraphQL(token, projectQuery, { id: railwayProjectId });
  const rProject = projectData?.project;
  if (!rProject) {
    throw new Error("Railway project not found or token has insufficient permissions");
  }

  const servicesEdges = rProject.services?.edges ?? [];
  const environmentEdges = rProject.environments?.edges ?? [];
  const firstEnvId = environmentEdges[0]?.node?.id;

  const timestamp = nowIso();
  const projectGroupId = nanoid(10);
  
  // Create project slug
  const baseSlug = rProject.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "project";
  let projectSlug = baseSlug;
  let counter = 1;
  while (db.select().from(projectGroups).where(eq(projectGroups.slug, projectSlug)).get()) {
    projectSlug = `${baseSlug}-${counter++}`;
  }

  // Create Project Group
  db.insert(projectGroups).values({
    id: projectGroupId,
    name: rProject.name,
    slug: projectSlug,
    description: rProject.description ?? null,
    createdAt: timestamp,
    updatedAt: timestamp
  }).run();

  for (const edge of servicesEdges) {
    const sNode = edge.node;
    const serviceName = sNode.name;
    const serviceId = sNode.id;

    // Fetch individual service details (repo, branch, etc.)
    const serviceQuery = `
      query GetServiceSource($id: String!) {
        service(id: $id) {
          id
          name
          repo
          branch
        }
      }
    `;

    let repoUrl = "";
    let repoFullName = "";
    let branch = "main";
    let internalPort = 8080;
    let isDatabase = false;

    try {
      const sDetailData = await fetchRailwayGraphQL(token, serviceQuery, { id: serviceId });
      const sDetail = sDetailData?.service;
      if (sDetail) {
        branch = sDetail.branch || "main";
        if (sDetail.repo) {
          repoFullName = sDetail.repo.replace("https://github.com/", "").replace(/\.git$/, "");
          repoUrl = sDetail.repo.startsWith("http") ? sDetail.repo : `https://github.com/${sDetail.repo}`;
        }
      }
    } catch {
      // Gracefully fall back if repository query fails
    }

    // Auto-detect database types from service name
    const lowercaseName = serviceName.toLowerCase();
    if (!repoUrl) {
      if (lowercaseName.includes("postgres")) {
        isDatabase = true;
        repoUrl = "database";
        repoFullName = "database:postgres";
        internalPort = 5432;
      } else if (lowercaseName.includes("mysql")) {
        isDatabase = true;
        repoUrl = "database";
        repoFullName = "database:mysql";
        internalPort = 3306;
      } else if (lowercaseName.includes("redis")) {
        isDatabase = true;
        repoUrl = "database";
        repoFullName = "database:redis";
        internalPort = 6379;
      } else if (lowercaseName.includes("mongo")) {
        isDatabase = true;
        repoUrl = "database";
        repoFullName = "database:mongodb";
        internalPort = 27017;
      } else {
        // Fallback placeholder repo
        repoUrl = "https://github.com/railpack/railpack";
        repoFullName = "railpack/railpack";
      }
    }

    // Fetch variables for this service in the first environment
    let fetchedVars: Record<string, string> = {};
    if (firstEnvId) {
      const varsQuery = `
        query GetVariables($projectId: String!, $environmentId: String!, $serviceId: String!) {
          variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
        }
      `;
      try {
        const varsData = await fetchRailwayGraphQL(token, varsQuery, {
          projectId: railwayProjectId,
          environmentId: firstEnvId,
          serviceId
        });
        fetchedVars = varsData?.variables ?? {};
      } catch {
        // Fallback to empty variables if query fails
      }
    }

    // Create unique service slug
    const baseServiceSlug = serviceName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "service";
    let serviceSlug = baseServiceSlug;
    let sCounter = 1;
    while (db.select().from(services).where(eq(services.slug, serviceSlug)).get()) {
      serviceSlug = `${baseServiceSlug}-${sCounter++}`;
    }

    const hostPort = allocateHostPort();
    const targetServiceId = nanoid(10);

    // Insert Service
    db.insert(services).values({
      id: targetServiceId,
      projectId: projectGroupId,
      slug: serviceSlug,
      name: serviceName,
      repoFullName: repoFullName || null,
      repoUrl,
      branch,
      rootDir: null,
      githubToken: null,
      webhookSecret: nanoid(24),
      installCommand: null,
      buildCommand: null,
      startCommand: null,
      staticOutput: null,
      internalPort,
      hostPort,
      activePort: null,
      status: "idle",
      lastDeployedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp
    }).run();

    // Insert variables
    for (const [key, value] of Object.entries(fetchedVars)) {
      db.insert(envVars).values({
        id: nanoid(10),
        serviceId: targetServiceId,
        key,
        value,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
    }
  }

  // Trigger Caddy reload to map services
  await writeAndReloadCaddy();

  return { projectSlug };
}
