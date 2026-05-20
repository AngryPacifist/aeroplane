export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "untitled";
}

export function createUniqueSlug(value: string, taken: Set<string>) {
  const base = slugify(value);
  let candidate = base;
  let counter = 2;

  while (taken.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  taken.add(candidate);
  return candidate;
}
