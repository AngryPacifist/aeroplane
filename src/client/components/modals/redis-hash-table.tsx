import { Cancel01Icon, CheckmarkCircle02Icon, Delete02Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import type { Dispatch, SetStateAction } from "react";
import type { DatabaseRow } from "../../api";
import { AppIcon } from "../ui/primitives";

const hashGridClass = "grid grid-cols-[minmax(160px,0.36fr)_minmax(240px,1fr)_168px]";
const hashCellClass = "min-w-0 border-r border-zinc-800 px-3 py-2.5";
const hashInputClass = "h-8 w-full min-w-0 border border-zinc-700 bg-zinc-900 px-2 font-mono text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[#4FB8B2]/60";

function valueText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function hashItemId(row: DatabaseRow, index: number) {
  return `hash:${valueText(row.field) || index}`;
}

function hashEditDraft(row: DatabaseRow) {
  return { field: valueText(row.field), value: valueText(row.value) };
}

function HashActionButton({
  title,
  tone = "neutral",
  disabled,
  onClick,
  icon
}: {
  title: string;
  tone?: "neutral" | "primary" | "danger";
  disabled?: boolean;
  onClick: () => void;
  icon: unknown;
}) {
  const toneClass =
    tone === "primary"
      ? "border-[#4FB8B2]/35 bg-[#4FB8B2]/10 text-[#7fe3dd] hover:bg-[#4FB8B2]/15"
      : tone === "danger"
        ? "border-rose-500/35 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15"
        : "border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100";

  return (
    <button
      type="button"
      className={`inline-flex h-8 w-8 items-center justify-center border transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      <AppIcon icon={icon} size={14} />
    </button>
  );
}

export function RedisHashTable({
  rows,
  deleting,
  saving,
  confirmingDeleteId,
  editingItemId,
  editDraft,
  setConfirmingDeleteId,
  setEditingItemId,
  setEditDraft,
  onDeleteItem,
  onSaveItem
}: {
  rows: DatabaseRow[];
  deleting: boolean;
  saving: boolean;
  confirmingDeleteId: string;
  editingItemId: string;
  editDraft: Record<string, string>;
  setConfirmingDeleteId: Dispatch<SetStateAction<string>>;
  setEditingItemId: Dispatch<SetStateAction<string>>;
  setEditDraft: Dispatch<SetStateAction<Record<string, string>>>;
  onDeleteItem: (row: DatabaseRow) => void;
  onSaveItem: (row: DatabaseRow, values: Record<string, string>) => Promise<void> | void;
}) {
  async function saveHashItem(row: DatabaseRow) {
    await onSaveItem(row, editDraft);
    setEditingItemId("");
    setEditDraft({});
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto border border-zinc-700 bg-zinc-950">
      {rows.length === 0 ? (
        <div className="flex h-full min-h-48 items-center justify-center px-5 text-center text-sm text-zinc-500">No fields in this hash.</div>
      ) : (
        <div className="min-w-[640px]">
          <div className={`${hashGridClass} border-b border-zinc-800 bg-zinc-950/80 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500`}>
            <div className={`${hashCellClass} py-2`}>Field</div>
            <div className={`${hashCellClass} py-2`}>Value</div>
            <div className="px-3 py-2 text-right">Actions</div>
          </div>

          {rows.map((row, index) => {
            const itemId = hashItemId(row, index);
            const confirming = confirmingDeleteId === itemId;
            const editing = editingItemId === itemId;

            return (
              <div key={itemId} className={`${hashGridClass} border-b border-zinc-800 text-sm text-zinc-200 last:border-b-0`}>
                {editing ? (
                  <>
                    <div className={hashCellClass}>
                      <input
                        value={editDraft.field ?? ""}
                        onChange={(event) => setEditDraft((current) => ({ ...current, field: event.target.value }))}
                        className={hashInputClass}
                        placeholder="field"
                      />
                    </div>
                    <div className={hashCellClass}>
                      <input
                        value={editDraft.value ?? ""}
                        onChange={(event) => setEditDraft((current) => ({ ...current, value: event.target.value }))}
                        className={hashInputClass}
                        placeholder="value"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 px-3 py-2.5">
                      <HashActionButton title="Save field" tone="primary" disabled={saving} onClick={() => void saveHashItem(row)} icon={CheckmarkCircle02Icon} />
                      <HashActionButton
                        title="Cancel edit"
                        disabled={saving}
                        onClick={() => {
                          setEditingItemId("");
                          setEditDraft({});
                        }}
                        icon={Cancel01Icon}
                      />
                    </div>
                  </>
                ) : confirming ? (
                  <>
                    <div className={hashCellClass}>
                      <span className="block truncate font-mono text-zinc-300">{valueText(row.field)}</span>
                    </div>
                    <div className={hashCellClass}>
                      <span className="block break-words font-mono text-zinc-100">{valueText(row.value)}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2 px-3 py-2.5">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-200">Confirm?</span>
                      <HashActionButton
                        title="Yes, delete field"
                        tone="danger"
                        disabled={deleting}
                        onClick={() => {
                          setConfirmingDeleteId("");
                          onDeleteItem(row);
                        }}
                        icon={CheckmarkCircle02Icon}
                      />
                      <HashActionButton title="No, cancel delete" disabled={deleting} onClick={() => setConfirmingDeleteId("")} icon={Cancel01Icon} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className={hashCellClass}>
                      <span className="block truncate font-mono text-zinc-300">{valueText(row.field)}</span>
                    </div>
                    <div className={hashCellClass}>
                      <span className="block break-words font-mono text-zinc-100">{valueText(row.value)}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2 px-3 py-2.5">
                      <HashActionButton
                        title="Edit field"
                        disabled={saving || deleting}
                        onClick={() => {
                          setConfirmingDeleteId("");
                          setEditingItemId(itemId);
                          setEditDraft(hashEditDraft(row));
                        }}
                        icon={PencilEdit02Icon}
                      />
                      <HashActionButton title="Delete field" disabled={deleting} onClick={() => setConfirmingDeleteId(itemId)} icon={Delete02Icon} />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
