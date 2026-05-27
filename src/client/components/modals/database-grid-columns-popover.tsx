import { DragDropVerticalIcon, ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import type { DatabaseColumn } from "../../api";
import { AppIcon } from "../ui/primitives";

export function DatabaseGridColumnsPopover({
  columns,
  hiddenColumns,
  visibleCount,
  onToggleColumn
}: {
  columns: DatabaseColumn[];
  hiddenColumns: Set<string>;
  visibleCount: number;
  onToggleColumn: (column: string) => void;
}) {
  return (
    <div className="absolute left-0 top-full z-30 mt-2 w-[360px] border border-zinc-700 bg-zinc-950 shadow-[0_22px_70px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4">
        <div className="text-sm font-semibold text-zinc-100">Manage columns</div>
        <AppIcon icon={ViewOffSlashIcon} size={18} className="text-zinc-400" />
      </div>
      <div className="max-h-[420px] overflow-y-auto p-2">
        {columns.map((column) => {
          const visible = !hiddenColumns.has(column.name);
          return (
            <button
              key={column.name}
              type="button"
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition ${
                visible ? "bg-zinc-900 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              }`}
              onClick={() => onToggleColumn(column.name)}
              disabled={visible && visibleCount === 1}
            >
              <AppIcon icon={visible ? ViewIcon : ViewOffSlashIcon} size={17} className={visible ? "text-zinc-100" : "text-zinc-500"} />
              <span className="min-w-0 flex-1 truncate">{column.name}</span>
              <AppIcon icon={DragDropVerticalIcon} size={16} className="text-zinc-500" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
