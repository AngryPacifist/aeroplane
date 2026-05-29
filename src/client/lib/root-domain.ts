export function cleanDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").replace(/\.+$/, "");
}

export function normalizeRootDomain(value: string) {
  return cleanDomain(value).replace(/^\*\./, "");
}

export function wildcardRootDomain(value: string) {
  const domain = normalizeRootDomain(value);
  return domain ? `*.${domain}` : "";
}

export function isWildcardRootDomain(value: string) {
  const domain = cleanDomain(value);
  return !domain || (domain.startsWith("*.") && normalizeRootDomain(domain).length > 0);
}
