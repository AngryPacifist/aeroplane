import { readRepoFile } from "./github-connect.js";

export type FrameworkMeta = {
  logoUrl: null | string;
  name: string;
  slug: string;
  website: null | string;
};

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

type SvglRoute = string | { dark?: string; light?: string };

type SvglLogo = {
  route: SvglRoute;
  title: string;
  url?: string;
  wordmark?: SvglRoute;
};

type DetectionCandidate = {
  match: (deps: Set<string>) => boolean;
  name: string;
  search: string;
  slug: string;
};

const DETECTION_CANDIDATES: DetectionCandidate[] = [
  { slug: "astro", name: "Astro", search: "Astro", match: (deps) => deps.has("astro") },
  { slug: "nextjs", name: "Next.js", search: "Next.js", match: (deps) => deps.has("next") },
  { slug: "nuxt", name: "Nuxt", search: "Nuxt", match: (deps) => deps.has("nuxt") },
  { slug: "sveltekit", name: "SvelteKit", search: "SvelteKit", match: (deps) => deps.has("@sveltejs/kit") },
  { slug: "solidstart", name: "SolidStart", search: "SolidStart", match: (deps) => deps.has("@solidjs/start") },
  { slug: "remix", name: "Remix", search: "Remix", match: (deps) => deps.has("@remix-run/dev") || deps.has("@remix-run/react") },
  { slug: "elysia", name: "Elysia", search: "Elysia", match: (deps) => deps.has("elysia") || [...deps].some((dep) => dep.startsWith("@elysiajs/")) },
  { slug: "hono", name: "Hono", search: "Hono", match: (deps) => deps.has("hono") },
  { slug: "nestjs", name: "NestJS", search: "NestJS", match: (deps) => deps.has("@nestjs/core") },
  { slug: "fastify", name: "Fastify", search: "Fastify", match: (deps) => deps.has("fastify") },
  { slug: "express", name: "Express", search: "Express", match: (deps) => deps.has("express") },
  { slug: "vite", name: "Vite", search: "Vite", match: (deps) => deps.has("vite") },
  { slug: "react", name: "React", search: "React", match: (deps) => deps.has("react") },
  { slug: "vue", name: "Vue", search: "Vue", match: (deps) => deps.has("vue") },
  { slug: "svelte", name: "Svelte", search: "Svelte", match: (deps) => deps.has("svelte") },
  { slug: "angular", name: "Angular", search: "Angular", match: (deps) => deps.has("@angular/core") }
];

const frameworkCache = new Map<string, { expiresAt: number; value: FrameworkMeta | null }>();
const svglCache = new Map<string, { expiresAt: number; value: FrameworkMeta | null }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function cacheKey(repoFullName: string, branch: string, rootDir: null | string) {
  return `${repoFullName}::${branch}::${rootDir ?? ""}`;
}

function pickRoute(route: SvglRoute | undefined) {
  if (!route) return null;
  if (typeof route === "string") return route;
  return route.dark ?? route.light ?? null;
}

async function resolveSvglLogo(candidate: DetectionCandidate): Promise<FrameworkMeta | null> {
  const cached = svglCache.get(candidate.slug);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  try {
    const response = await fetch(`https://api.svgl.app?search=${encodeURIComponent(candidate.search)}`, {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) {
      svglCache.set(candidate.slug, { value: null, expiresAt: Date.now() + CACHE_TTL_MS });
      return null;
    }

    const results = (await response.json()) as SvglLogo[];
    const normalizedSearch = candidate.search.toLowerCase();
    const exact =
      results.find((entry) => entry.title.toLowerCase() === normalizedSearch) ??
      results.find((entry) => entry.title.toLowerCase().includes(normalizedSearch));

    const value: FrameworkMeta | null = exact
      ? {
          slug: candidate.slug,
          name: candidate.name,
          logoUrl: pickRoute(exact.route) ?? pickRoute(exact.wordmark),
          website: exact.url ?? null
        }
      : {
          slug: candidate.slug,
          name: candidate.name,
          logoUrl: null,
          website: null
        };

    svglCache.set(candidate.slug, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  } catch {
    const fallback = {
      slug: candidate.slug,
      name: candidate.name,
      logoUrl: null,
      website: null
    };
    svglCache.set(candidate.slug, { value: fallback, expiresAt: Date.now() + CACHE_TTL_MS });
    return fallback;
  }
}

function parsePackageJson(source: null | string) {
  if (!source) return null;
  try {
    return JSON.parse(source) as PackageJson;
  } catch {
    return null;
  }
}

function packageJsonPaths(rootDir: null | string) {
  const normalizedRoot = rootDir?.trim().replace(/^\/+|\/+$/g, "") ?? "";
  return normalizedRoot ? [`${normalizedRoot}/package.json`, "package.json"] : ["package.json"];
}

async function readPackageJsons(repoFullName: string, branch: string, rootDir: null | string) {
  const packageJsons: PackageJson[] = [];

  for (const path of packageJsonPaths(rootDir)) {
    const content = await readRepoFile(repoFullName, branch, path);
    const parsed = parsePackageJson(content);
    if (parsed) packageJsons.push(parsed);
  }

  return packageJsons;
}

function dependencySet(packageJson: PackageJson) {
  return new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {})
  ]);
}

export async function detectFramework(repoFullName: null | string, branch: string, rootDir: null | string) {
  if (!repoFullName) return null;

  if (repoFullName.startsWith("database:")) {
    const dbType = repoFullName.split(":")[1];
    if (dbType === "postgres") {
      return {
        slug: "postgres",
        name: "PostgreSQL",
        logoUrl: "https://svgl.app/library/postgresql.svg",
        website: "https://www.postgresql.org/"
      };
    }
    if (dbType === "mysql") {
      return {
        slug: "mysql",
        name: "MySQL",
        logoUrl: "https://svgl.app/library/mysql-icon-dark.svg",
        website: "https://www.mysql.com/"
      };
    }
    if (dbType === "redis") {
      return {
        slug: "redis",
        name: "Redis",
        logoUrl: "https://svgl.app/library/redis.svg",
        website: "https://redis.io/"
      };
    }
    if (dbType === "mongodb") {
      return {
        slug: "mongodb",
        name: "MongoDB",
        logoUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg",
        website: "https://www.mongodb.com/"
      };
    }
    if (dbType === "clickhouse") {
      return {
        slug: "clickhouse",
        name: "ClickHouse",
        logoUrl: "https://cdn.simpleicons.org/clickhouse",
        website: "https://clickhouse.com/"
      };
    }
  }

  const key = cacheKey(repoFullName, branch, rootDir);
  const cached = frameworkCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const packageJsons = await readPackageJsons(repoFullName, branch, rootDir);
  if (packageJsons.length === 0) {
    frameworkCache.set(key, { value: null, expiresAt: Date.now() + CACHE_TTL_MS });
    return null;
  }

  const match =
    packageJsons
      .map((packageJson) => dependencySet(packageJson))
      .map((deps) => DETECTION_CANDIDATES.find((candidate) => candidate.match(deps)) ?? null)
      .find(Boolean) ?? null;
  if (!match) {
    frameworkCache.set(key, { value: null, expiresAt: Date.now() + CACHE_TTL_MS });
    return null;
  }

  const framework = await resolveSvglLogo(match);
  frameworkCache.set(key, { value: framework, expiresAt: Date.now() + CACHE_TTL_MS });
  return framework;
}
