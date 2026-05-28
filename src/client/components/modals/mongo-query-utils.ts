import type { DatabaseRowFilter } from "../../api";

function toJsonishMongoQuery(source: string) {
  return source
    .replace(/([{,]\s*)([$A-Z_a-z][\w$.-]*)\s*:/g, '$1"$2":')
    .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_match, value: string) => JSON.stringify(value.replace(/\\'/g, "'")));
}

export function mongoQueryToFilters(source: string): DatabaseRowFilter[] {
  const trimmed = source.trim();
  if (!trimmed) return [];

  const parsed = JSON.parse(toJsonishMongoQuery(trimmed)) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("Mongo query must be an object, like { field: 'value' }");
  }

  return Object.entries(parsed).map(([column, value]) => ({
    column,
    operator: "equals" as const,
    value: value === null || value === undefined ? "null" : String(value)
  }));
}

export function mongoQuerySyntaxError(source: string) {
  const trimmed = source.trim();
  if (!trimmed) return "";

  try {
    mongoQueryToFilters(trimmed);
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid Mongo query";
  }
}
