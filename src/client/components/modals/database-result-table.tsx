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
    <div className="overflow-auto border border-[#26323d] bg-[#090f12]">
      <table className="min-w-full border-collapse text-left font-mono text-sm">
        <thead className="sticky top-0 z-10 bg-[#0b1116] text-zinc-400">
          <tr>
            {columnMeta.map((column) => (
              <th key={column.name} className="min-w-[220px] border-b border-r border-[#26323d] px-4 py-3 font-semibold">
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
            <tr key={rowIndex} className="border-b border-[#26323d] odd:bg-[#090f12] even:bg-[#0d1519] hover:bg-[#162127]">
              {columnNames.map((column) => {
                const value = row[column] ?? null;
                return (
                  <td key={column} className="min-w-[220px] max-w-[320px] border-r border-[#26323d] px-4 py-3 align-middle text-zinc-200">
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
