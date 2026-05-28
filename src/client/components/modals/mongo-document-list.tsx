import type { DatabaseColumn, DatabaseRow, DatabaseRowFilter } from "../../api";
import { DatabaseGridPagination, type DatabaseGridPaginationState } from "./database-grid-pagination";
import { MongoQueryBar } from "./mongo-query-bar";

function columnType(columns: DatabaseColumn[], name: string) {
  return columns.find((column) => column.name === name)?.type ?? "text";
}

function documentKeys(columns: DatabaseColumn[], row: DatabaseRow) {
  const keys = new Set<string>();
  if ("_id" in row || columns.some((column) => column.name === "_id")) keys.add("_id");
  columns.forEach((column) => {
    if (column.name !== "_id") keys.add(column.name);
  });
  Object.keys(row).forEach((key) => {
    if (key !== "_id") keys.add(key);
  });
  return Array.from(keys);
}

function formatMongoValue(value: unknown, type: string) {
  if (value === null || value === undefined) return "null";
  if (type === "objectId" && typeof value === "string") return `ObjectId('${value}')`;
  if (typeof value === "string") {
    if (type === "date") return value;
    if (type === "array" || type === "object") return value;
    return `"${value}"`;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function valueClass(value: unknown, type: string) {
  if (value === null || value === undefined) return "text-zinc-600";
  if (type === "objectId") return "text-orange-400";
  if (type === "date") return "text-sky-400";
  if (type === "array" || type === "object") return "text-violet-300";
  if (typeof value === "number") return "text-amber-300";
  if (typeof value === "boolean") return "text-fuchsia-300";
  return "text-emerald-400";
}

export function MongoDocumentList({
  columns,
  rows,
  busy,
  scopeLabel,
  query,
  pagination,
  onQueryChange,
  onFind,
  onClearQuery
}: {
  columns: DatabaseColumn[];
  rows: DatabaseRow[];
  busy: string;
  scopeLabel: string;
  query: string;
  pagination: DatabaseGridPaginationState;
  onQueryChange: (value: string) => void;
  onFind: (filters: DatabaseRowFilter[], source: string) => void;
  onClearQuery: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MongoQueryBar scopeLabel={scopeLabel} query={query} busy={busy} onQueryChange={onQueryChange} onFind={onFind} onClear={onClearQuery} />

      <div className="min-h-0 flex-1 overflow-auto">
        {rows.length === 0 ? (
          <div className="flex h-full min-h-48 items-center justify-center border border-zinc-800 bg-zinc-950/45 px-5 py-8 text-center text-sm text-zinc-500">
            {busy === "rows" ? "Loading documents..." : query.trim() ? "No documents match this query." : "No documents in this collection."}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="border border-zinc-700 bg-zinc-950 px-4 py-4 font-mono text-sm leading-6">
                {documentKeys(columns, row).map((key) => {
                  const type = columnType(columns, key);
                  const value = row[key];
                  return (
                    <div key={key} className="grid min-w-0 grid-cols-[max-content_minmax(0,1fr)] gap-3">
                      <div className="min-w-0 truncate text-zinc-100">{key}:</div>
                      <div className={`min-w-0 truncate ${valueClass(value, type)}`} title={formatMongoValue(value, type)}>
                        {formatMongoValue(value, type)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <DatabaseGridPagination pagination={pagination} loadedRows={rows.length} busy={busy} />
    </div>
  );
}
