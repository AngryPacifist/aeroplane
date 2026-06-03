import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config.js";
import { DATABASE_ICON_CATALOG, FRAMEWORK_ICON_CATALOG, frameworkIconEntryForSlug, type FrameworkIconCatalogEntry } from "./framework-icon-catalog.js";

type SvglRoute = string | { dark?: string; light?: string };

type SvglLogo = {
  route?: SvglRoute;
  title: string;
  url?: string;
  wordmark?: SvglRoute;
};

type CachedIconMeta = {
  logoUrl: string | null;
  sourceUrl: string | null;
  website: string | null;
};

const frameworkIconDir = join(config.dataDir, "framework-icons");
const svglMetaCache = new Map<string, { expiresAt: number; value: CachedIconMeta }>();
const iconDownloads = new Map<string, Promise<CachedIconMeta>>();
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_ICON_BYTES = 350_000;

function normalizeSlug(value: string) {
  return value
    .replace(/\.(svg|png|webp|jpg|jpeg)$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function iconPath(slug: string) {
  return join(frameworkIconDir, `${normalizeSlug(slug)}.svg`);
}

function pickRoute(route: SvglRoute | undefined) {
  if (!route) return null;
  if (typeof route === "string") return route;
  return route.dark ?? route.light ?? null;
}

function svglAssetUrl(route: string | null) {
  if (!route) return null;
  if (/^https?:\/\//i.test(route)) return route;
  if (route.startsWith("/")) return `https://svgl.app${route}`;
  return `https://svgl.app/${route}`;
}

function localIconUrl(slug: string) {
  return `/api/assets/framework-icons/${normalizeSlug(slug)}.svg`;
}

function entryTitles(entry: FrameworkIconCatalogEntry) {
  return [entry.search, entry.name, ...(entry.titleAliases ?? [])]
    .map((title) => title.toLowerCase())
    .filter(Boolean);
}

function pickSvglResult(entry: FrameworkIconCatalogEntry, results: SvglLogo[]) {
  const titles = entryTitles(entry);
  return (
    results.find((logo) => titles.includes(logo.title.toLowerCase())) ??
    results.find((logo) => titles.some((title) => logo.title.toLowerCase().includes(title))) ??
    null
  );
}

async function resolveSvglIconMeta(entry: FrameworkIconCatalogEntry): Promise<CachedIconMeta> {
  const cached = svglMetaCache.get(entry.slug);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  if (entry.sourcePath) {
    const value = {
      logoUrl: localIconUrl(entry.slug),
      sourceUrl: svglAssetUrl(`/library/${entry.sourcePath}`),
      website: entry.website ?? null
    };
    svglMetaCache.set(entry.slug, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  }

  const fallback = {
    logoUrl: null,
    sourceUrl: null,
    website: entry.website ?? null
  };

  try {
    const response = await fetch(`https://api.svgl.app?search=${encodeURIComponent(entry.search)}`, {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) {
      svglMetaCache.set(entry.slug, { value: fallback, expiresAt: Date.now() + CACHE_TTL_MS });
      return fallback;
    }

    const results = (await response.json()) as SvglLogo[];
    const exact = pickSvglResult(entry, results);
    const sourceUrl = svglAssetUrl(pickRoute(exact?.route) ?? pickRoute(exact?.wordmark));
    const value = {
      logoUrl: sourceUrl ? localIconUrl(entry.slug) : null,
      sourceUrl,
      website: exact?.url ?? entry.website ?? null
    };
    svglMetaCache.set(entry.slug, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  } catch {
    svglMetaCache.set(entry.slug, { value: fallback, expiresAt: Date.now() + CACHE_TTL_MS });
    return fallback;
  }
}

function looksLikeSvg(bytes: Buffer, contentType: string | null) {
  if (contentType?.toLowerCase().includes("svg")) return true;
  return bytes.subarray(0, 200).toString("utf8").trimStart().startsWith("<svg");
}

async function downloadIcon(entry: FrameworkIconCatalogEntry) {
  mkdirSync(frameworkIconDir, { recursive: true });
  const path = iconPath(entry.slug);
  if (existsSync(path)) {
    return {
      logoUrl: localIconUrl(entry.slug),
      sourceUrl: null,
      website: entry.website ?? null
    };
  }

  const meta = await resolveSvglIconMeta(entry);
  if (!meta.sourceUrl) return meta;

  const response = await fetch(meta.sourceUrl, {
    headers: { Accept: "image/svg+xml,image/*" }
  });
  if (!response.ok) return { ...meta, logoUrl: null };

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_ICON_BYTES) return { ...meta, logoUrl: null };

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_ICON_BYTES || !looksLikeSvg(bytes, response.headers.get("content-type"))) {
    return { ...meta, logoUrl: null };
  }

  writeFileSync(path, bytes);
  return { ...meta, logoUrl: localIconUrl(entry.slug) };
}

export function frameworkIconUrl(slug: string) {
  return localIconUrl(slug);
}

export async function cachedFrameworkIconMeta(entry: FrameworkIconCatalogEntry) {
  const slug = normalizeSlug(entry.slug);
  const existing = iconDownloads.get(slug);
  if (existing) return existing;

  const download = downloadIcon(entry).finally(() => {
    iconDownloads.delete(slug);
  });
  iconDownloads.set(slug, download);
  return download;
}

export async function frameworkIconAsset(fileName: string) {
  const slug = normalizeSlug(fileName);
  if (!slug) return null;

  const entry = frameworkIconEntryForSlug(slug);
  if (!entry) return null;

  const path = iconPath(slug);
  if (!existsSync(path)) {
    const meta = await cachedFrameworkIconMeta(entry);
    if (!meta.logoUrl || !existsSync(path)) return null;
  }

  return {
    body: readFileSync(path),
    contentType: "image/svg+xml"
  };
}

export async function prewarmFrameworkIconCache() {
  const entries = [...FRAMEWORK_ICON_CATALOG, ...DATABASE_ICON_CATALOG];
  const queue = [...entries];
  const workerCount = 4;

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (queue.length > 0) {
      const entry = queue.shift();
      if (!entry) return;
      await cachedFrameworkIconMeta(entry).catch(() => undefined);
    }
  }));
}
