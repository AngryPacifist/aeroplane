import { createHash } from "node:crypto";
import { PostHog } from "posthog-node";

const apiKey = (process.env.POSTHOG_API_KEY || process.env.POSTHOG_PROJECT_API_KEY || "").trim();
const disabled = process.env.POSTHOG_DISABLED === "true";
const posthog = apiKey && !disabled
  ? new PostHog(apiKey, {
      host: process.env.POSTHOG_HOST || undefined,
      disableGeoip: true,
      flushAt: 1,
      flushInterval: 5000
    })
  : null;

function firstHeaderValue(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function requestIp(req) {
  const forwardedFor = firstHeaderValue(req.headers["x-forwarded-for"]);
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "";

  return req.socket.remoteAddress || "";
}

function hashValue(value) {
  const salt = process.env.POSTHOG_DISTINCT_ID_SALT || apiKey || "get-aeroplane";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

function distinctIdForRequest(req) {
  const userAgent = firstHeaderValue(req.headers["user-agent"]);
  const ip = requestIp(req);
  return `installer:${hashValue(`${ip}:${userAgent}`).slice(0, 32)}`;
}

export function captureInstallerRequest(req, url) {
  if (!posthog || req.method !== "GET") return;

  const userAgent = firstHeaderValue(req.headers["user-agent"]);
  const ip = requestIp(req);

  try {
    posthog.capture({
      distinctId: distinctIdForRequest(req),
      event: "get_aeroplane_installer_requested",
      properties: {
        path: url.pathname,
        host: firstHeaderValue(req.headers.host),
        referrer: firstHeaderValue(req.headers.referer),
        user_agent: userAgent,
        ip_hash: ip ? hashValue(ip).slice(0, 32) : "",
        has_forwarded_for: Boolean(req.headers["x-forwarded-for"])
      }
    });
  } catch {
    // Analytics should never block serving the installer.
  }
}

export function shutdownAnalytics() {
  return posthog?.shutdown(2000) ?? Promise.resolve();
}
