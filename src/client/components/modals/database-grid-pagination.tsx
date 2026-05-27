import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { AppIcon } from "../ui/primitives";

export type DatabaseGridPaginationState = {
  limit: number;
  offset: number;
  totalRows: number;
  onPageChange: (offset: number) => void;
  onPageSizeChange: (limit: number) => void;
};

export function DatabaseGridPagination({
  pagination,
  loadedRows,
  busy
}: {
  pagination: DatabaseGridPaginationState;
  loadedRows: number;
  busy: string;
}) {
  const totalPages = Math.max(1, Math.ceil(pagination.totalRows / pagination.limit));
  const currentPage = pagination.totalRows === 0 ? 0 : Math.floor(pagination.offset / pagination.limit) + 1;
  const pageStart = pagination.totalRows === 0 ? 0 : pagination.offset + 1;
  const pageEnd = Math.min(pagination.offset + loadedRows, pagination.totalRows);
  const canPageBack = pagination.offset > 0;
  const canPageForward = pagination.offset + pagination.limit < pagination.totalRows;

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-300">
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">
        {pageStart}-{pageEnd} of {pagination.totalRows}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">Rows</span>
        {[25, 50, 100, 200].map((size) => (
          <button
            key={size}
            type="button"
            className={`inline-flex h-7 items-center justify-center border px-2.5 font-mono text-[11px] font-semibold transition ${
              pagination.limit === size
                ? "border-[#4FB8B2]/45 bg-[#4FB8B2]/12 text-[#9af4ee]"
                : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-white"
            }`}
            onClick={() => pagination.onPageSizeChange(size)}
            disabled={busy === "rows"}
          >
            {size}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">
          Page {currentPage} of {pagination.totalRows === 0 ? 0 : totalPages}
        </div>
        <button
          type="button"
          className="inline-flex h-7 w-8 items-center justify-center border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => pagination.onPageChange(Math.max(0, pagination.offset - pagination.limit))}
          disabled={!canPageBack || busy === "rows"}
          aria-label="Previous page"
        >
          <AppIcon icon={ArrowLeft01Icon} size={14} />
        </button>
        <button
          type="button"
          className="inline-flex h-7 w-8 items-center justify-center border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => pagination.onPageChange(pagination.offset + pagination.limit)}
          disabled={!canPageForward || busy === "rows"}
          aria-label="Next page"
        >
          <AppIcon icon={ArrowRight01Icon} size={14} />
        </button>
      </div>
    </div>
  );
}
