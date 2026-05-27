import type { DatabaseColumn, DatabaseRow, DatabaseRowValue } from "../../api";

function displayValue(value: DatabaseRowValue) {
  if (value === null) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function DatabaseResultTable({
  columns,
  rows,
  emptyLabel = "No rows returned."
}: {
  columns: Array<DatabaseColumn | string>;
  rows: DatabaseRow[];
  emptyLabel?: string;
}) {
  const columnMeta = columns.map((column) => (
    typeof column === "string"
      ? { name: column, type: "" }
      : { name: column.name, type: column.type }
  ));
  const columnNames = columnMeta.map((column) => column.name);

  if (columnNames.length === 0 || rows.length === 0) {
    return <div className="border border-zinc-800 bg-zinc-950/45 px-5 py-8 text-sm text-zinc-500">{emptyLabel}</div>;
  }

  return (
    <div className="h-full min-h-0 overflow-auto border border-zinc-700 bg-zinc-950">
      <table className="min-w-full border-collapse text-left font-mono text-sm">
        <thead className="sticky top-0 z-10 bg-zinc-950 text-zinc-400">
          <tr>
            {columnMeta.map((column) => (
              <th key={column.name} className="min-w-[220px] border-b border-r border-zinc-700 px-4 py-3 font-semibold">
                <span className="block truncate">
                  <span className="text-zinc-300">{column.name}</span>
                  {column.type ? <span className="ml-2 text-zinc-500">{column.type}</span> : null}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-zinc-800 odd:bg-zinc-950 even:bg-zinc-900/45 hover:bg-zinc-800/60">
              {columnNames.map((column) => {
                const value = row[column] ?? null;
                return (
                  <td key={column} className="min-w-[220px] max-w-[320px] border-r border-zinc-800 px-4 py-3 align-middle text-zinc-200">
                    <span className={`block truncate ${value === null ? "text-zinc-600" : ""}`} title={displayValue(value)}>
                      {displayValue(value)}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
