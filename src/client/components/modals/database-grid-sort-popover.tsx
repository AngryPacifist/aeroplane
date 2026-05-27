import { Cancel01Icon } from "@hugeicons/core-free-icons";
import type { DatabaseColumn } from "../../api";
import { AppIcon } from "../ui/primitives";
import type { GridSort, SortDirection } from "./database-grid-types";

export function DatabaseGridSortPopover({
  columns,
  sort,
  onSortChange
}: {
  columns: DatabaseColumn[];
  sort: GridSort | null;
  onSortChange: (sort: GridSort | null) => void;
}) {
  const selectedColumn = sort?.column ?? "";
  const direction = sort?.direction ?? "asc";

  function setColumn(column: string) {
    onSortChange({ column, direction });
  }

  function setDirection(nextDirection: SortDirection) {
    if (!selectedColumn) return;
    onSortChange({ column: selectedColumn, direction: nextDirection });
  }

  return (
    <div className="absolute left-0 top-full z-30 mt-2 w-[360px] border border-zinc-700 bg-zinc-950 shadow-[0_22px_70px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="text-[13px] font-semibold text-zinc-100">Sort by</div>
        <button
          type="button"
          className="inline-flex items-center gap-3 text-[13px] text-zinc-100 disabled:opacity-50"
          onClick={() => setDirection(direction === "asc" ? "desc" : "asc")}
          disabled={!selectedColumn}
        >
          <span>{direction === "asc" ? "Ascending" : "Descending"}</span>
          <span className={`relative h-6 w-10 rounded-full transition ${direction === "asc" ? "bg-teal-500/25" : "bg-zinc-800"}`}>
            <span className={`absolute top-1 h-4 w-4 rounded-full transition ${direction === "asc" ? "right-1 bg-teal-400" : "left-1 bg-zinc-500"}`} />
          </span>
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto p-2">
        {columns.map((column) => {
          const active = selectedColumn === column.name;
          return (
            <button
              key={column.name}
              type="button"
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] transition ${
                active ? "bg-zinc-800 text-zinc-50" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
              }`}
              onClick={() => setColumn(column.name)}
            >
              <span className={`grid h-5 w-5 flex-none place-items-center rounded-full border ${active ? "border-teal-500" : "border-zinc-700"}`}>
                {active ? <span className="h-2.5 w-2.5 rounded-full bg-teal-400" /> : null}
              </span>
              <span className="min-w-0 flex-1 truncate">{column.name}</span>
            </button>
          );
        })}
      </div>
      {sort ? (
        <div className="border-t border-zinc-800 p-2">
          <button type="button" className="inline-flex w-full items-center gap-3 px-3 py-2 text-[13px] text-zinc-300 hover:bg-zinc-900 hover:text-white" onClick={() => onSortChange(null)}>
            <AppIcon icon={Cancel01Icon} size={15} />
            Clear sorting
          </button>
        </div>
      ) : null}
    </div>
  );
}
