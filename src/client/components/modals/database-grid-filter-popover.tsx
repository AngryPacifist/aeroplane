import { Add01Icon, ArrowDown01Icon, Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { useMemo, useState } from "react";
import type { DatabaseColumn } from "../../api";
import { AppIcon } from "../ui/primitives";
import { createGridFilter, filterOperators, type FilterOperator, type GridFilter } from "./database-grid-types";

type OpenMenu = {
  filterId: string;
  kind: "column" | "operator";
} | null;

function pillClass(extra = "") {
  return `inline-flex h-8 items-center justify-between gap-2 bg-zinc-800 px-2.5 text-[13px] text-zinc-100 ${extra}`.trim();
}

export function DatabaseGridFilterPopover({
  columns,
  filters,
  onFiltersChange,
  canApply = false,
  canClear = false,
  applying = false,
  onApply,
  onClear,
  floating = true
}: {
  columns: DatabaseColumn[];
  filters: GridFilter[];
  onFiltersChange: (filters: GridFilter[]) => void;
  canApply?: boolean;
  canClear?: boolean;
  applying?: boolean;
  onApply?: () => void;
  onClear?: () => void;
  floating?: boolean;
}) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [columnSearch, setColumnSearch] = useState("");

  const filteredColumns = useMemo(() => {
    const search = columnSearch.trim().toLowerCase();
    if (!search) return columns;
    return columns.filter((column) => column.name.toLowerCase().includes(search));
  }, [columnSearch, columns]);

  function updateFilter(filterId: string, patch: Partial<GridFilter>) {
    onFiltersChange(filters.map((filter) => filter.id === filterId ? { ...filter, ...patch } : filter));
  }

  function removeFilter(filterId: string) {
    const nextFilters = filters.filter((filter) => filter.id !== filterId);
    onFiltersChange(nextFilters.length > 0 ? nextFilters : [createGridFilter(columns)]);
  }

  function addFilter() {
    onFiltersChange([...filters, createGridFilter(columns)]);
  }

  function selectColumn(filterId: string, column: string) {
    updateFilter(filterId, { column });
    setOpenMenu(null);
    setColumnSearch("");
  }

  function selectOperator(filterId: string, operator: FilterOperator) {
    const option = filterOperators.find((item) => item.value === operator);
    updateFilter(filterId, { operator, value: option?.requiresValue === false ? "" : filters.find((filter) => filter.id === filterId)?.value ?? "" });
    setOpenMenu(null);
  }

  const wrapperClass = floating
    ? "absolute left-0 top-full z-40 mt-2 w-[920px] max-w-[calc(100vw-3rem)] border border-zinc-700 bg-zinc-950 shadow-[0_22px_70px_rgba(0,0,0,0.45)]"
    : "mb-3 border border-zinc-700 bg-zinc-950";

  return (
    <div className={wrapperClass}>
      <div className="grid gap-3 p-2.5 md:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          {filters.map((filter, index) => {
            const operator = filterOperators.find((item) => item.value === filter.operator) ?? filterOperators[0];
            const columnMenuOpen = openMenu?.filterId === filter.id && openMenu.kind === "column";
            const operatorMenuOpen = openMenu?.filterId === filter.id && openMenu.kind === "operator";

            return (
              <div key={filter.id} className="grid gap-2 md:grid-cols-[34px_96px_minmax(150px,1fr)_minmax(150px,1fr)_minmax(140px,1fr)]">
                <button type="button" className="grid h-8 w-8 place-items-center bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white" onClick={() => removeFilter(filter.id)} aria-label="Remove filter">
                  <AppIcon icon={Cancel01Icon} size={14} />
                </button>
                <div className={`${pillClass("justify-center")} text-zinc-300`}>{index === 0 ? "where" : "and"}</div>

                <div className="relative min-w-0">
                  <button type="button" className={`${pillClass("w-full")}`} onClick={() => setOpenMenu(columnMenuOpen ? null : { filterId: filter.id, kind: "column" })}>
                    <span className="truncate">{filter.column || "Select column"}</span>
                    <AppIcon icon={ArrowDown01Icon} size={13} />
                  </button>
                  {columnMenuOpen ? (
                    <div className="absolute left-0 top-full z-50 mt-2 w-[280px] border border-zinc-700 bg-zinc-950 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                      <div className="flex items-center gap-2 border-b border-zinc-800 px-2.5 py-1.5 text-zinc-400">
                        <AppIcon icon={Search01Icon} size={15} />
                        <input
                          value={columnSearch}
                          onChange={(event) => setColumnSearch(event.target.value)}
                          placeholder="Search column..."
                          className="h-8 min-w-0 flex-1 bg-transparent text-[13px] text-zinc-100 outline-none placeholder:text-zinc-500"
                        />
                      </div>
                      <div className="max-h-64 overflow-y-auto p-1.5">
                        {filteredColumns.map((column) => (
                          <button
                            key={column.name}
                            type="button"
                            className={`block w-full px-2.5 py-1.5 text-left text-[13px] ${filter.column === column.name ? "bg-zinc-800 text-zinc-50" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"}`}
                            onClick={() => selectColumn(filter.id, column.name)}
                          >
                            <span className="block truncate">{column.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="relative min-w-0">
                  <button type="button" className={`${pillClass("w-full")}`} onClick={() => setOpenMenu(operatorMenuOpen ? null : { filterId: filter.id, kind: "operator" })}>
                    <span className="truncate">{operator.label}</span>
                    <AppIcon icon={ArrowDown01Icon} size={13} />
                  </button>
                  {operatorMenuOpen ? (
                    <div className="absolute left-0 top-full z-50 mt-2 w-[230px] border border-zinc-700 bg-zinc-950 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                      {filterOperators.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          className={`block w-full px-2.5 py-1.5 text-left text-[13px] ${filter.operator === item.value ? "bg-zinc-800 text-zinc-50" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"}`}
                          onClick={() => selectOperator(filter.id, item.value)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <input
                  value={filter.value}
                  onChange={(event) => updateFilter(filter.id, { value: event.target.value })}
                  disabled={!operator.requiresValue}
                  className="h-8 min-w-0 bg-zinc-800 px-2.5 text-[13px] text-zinc-100 outline-none placeholder:text-zinc-500 disabled:text-zinc-500"
                  placeholder={operator.requiresValue ? "Value" : "No value needed"}
                />
              </div>
            );
          })}
        </div>

        <div className="border-zinc-800 md:border-l md:pl-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="inline-flex h-8 items-center justify-center gap-2 bg-zinc-800 px-2.5 text-[13px] text-zinc-100 hover:bg-zinc-700" onClick={addFilter}>
              <AppIcon icon={Add01Icon} size={15} />
              Add filter
            </button>
            {canClear ? (
              <button
                type="button"
                className="inline-flex h-8 items-center justify-center bg-zinc-800 px-2.5 text-[13px] text-zinc-100 transition hover:bg-zinc-700 disabled:opacity-50"
                onClick={onClear}
                disabled={applying}
              >
                Clear filters
              </button>
            ) : null}
            {canApply ? (
              <button
                type="button"
                className="inline-flex h-8 items-center justify-center bg-teal-500/15 px-3 text-[13px] font-medium text-teal-200 transition hover:bg-teal-500/20 disabled:opacity-50"
                onClick={onApply}
                disabled={applying}
              >
                Apply
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
