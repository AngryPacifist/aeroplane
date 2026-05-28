import { Add01Icon, Refresh03Icon } from "@hugeicons/core-free-icons";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api, type DatabaseRow, type DatabaseRowsResponse, type DatabaseTable } from "../../api";
import { Dropdown } from "../ui/dropdown";
import { AppIcon, FormInput, shellButton } from "../ui/primitives";
import { DatabaseInsertSheet } from "./database-insert-sheet";
import { RedisDeleteKeyModal } from "./redis-delete-key-modal";
import { RedisKeyActionsMenu } from "./redis-key-actions-menu";

type RedisInsertMode = "key" | "item";

const numberFormatter = new Intl.NumberFormat();

function valueText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function prettyValue(value: unknown) {
  const text = valueText(value);
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function ttlLabel(value: unknown) {
  const ttl = Number(value);
  if (ttl === -1) return "No expiry";
  if (ttl === -2) return "Expired";
  if (Number.isFinite(ttl) && ttl >= 0) return `${numberFormatter.format(ttl)}s`;
  return "Unknown";
}

function itemCountLabel(table: DatabaseTable | null) {
  if (!table) return "0 items";
  if (table.rowCount === null) return "unknown";
  if (table.schema === "string") return `${numberFormatter.format(table.rowCount)} value`;
  return `${numberFormatter.format(table.rowCount)} item${table.rowCount === 1 ? "" : "s"}`;
}

function redisColumnsForType(type: string) {
  if (type === "hash") return ["field", "value"];
  if (type === "list") return ["index", "value"];
  if (type === "set") return ["value"];
  if (type === "zset") return ["member", "score"];
  return ["value"];
}

function redisContentText(type: string, rows: DatabaseRow[]) {
  if (type === "string") return valueText(rows[0]?.value);
  if (type === "hash") {
    return JSON.stringify(
      Object.fromEntries(rows.map((row) => [valueText(row.field), row.value ?? ""])),
      null,
      2
    );
  }
  if (type === "list" || type === "set") {
    return JSON.stringify(rows.map((row) => row.value ?? ""), null, 2);
  }
  if (type === "zset") {
    return JSON.stringify(rows.map((row) => ({ member: row.member ?? "", score: row.score ?? 0 })), null, 2);
  }
  return JSON.stringify(rows, null, 2);
}

function RedisItems({ type, rows }: { type: string; rows: DatabaseRow[] }) {
  if (type === "string") {
    return (
      <div className="min-h-0 flex-1 overflow-auto border border-zinc-700 bg-zinc-950 p-4">
        <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-6 text-emerald-200">{prettyValue(rows[0]?.value)}</pre>
      </div>
    );
  }

  const columns = redisColumnsForType(type);
  return (
    <div className="min-h-0 flex-1 overflow-auto border border-zinc-700 bg-zinc-950">
      {rows.length === 0 ? (
        <div className="flex h-full min-h-48 items-center justify-center px-5 text-center text-sm text-zinc-500">No items in this key.</div>
      ) : rows.map((row, index) => (
        <div key={index} className="grid gap-3 border-b border-zinc-800 px-4 py-3 text-sm text-zinc-200 md:grid-cols-[160px_minmax(0,1fr)]">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            {columns[0]}: {valueText(row[columns[0]])}
          </div>
          <div className="min-w-0 font-mono text-sm text-zinc-200">
            {columns.length > 1 ? (
              <span className="break-words">{valueText(row[columns[1]])}</span>
            ) : (
              <span className="break-words">{valueText(row[columns[0]])}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RedisBrowserPanel({ serviceId }: { serviceId: string }) {
  const [keys, setKeys] = useState<DatabaseTable[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [rowsResult, setRowsResult] = useState<DatabaseRowsResponse | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [insertOpen, setInsertOpen] = useState(false);
  const [insertMode, setInsertMode] = useState<RedisInsertMode>("key");
  const [insertError, setInsertError] = useState("");
  const [insertDraft, setInsertDraft] = useState<Record<string, string>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);

  const selectedKeyMeta = useMemo(() => keys.find((key) => key.id === selectedKey) ?? null, [keys, selectedKey]);
  const selectedType = selectedKeyMeta?.schema ?? rowsResult?.rows[0]?.type?.toString() ?? "";
  const rows = rowsResult?.rows ?? [];
  const firstRow = rows[0] ?? {};

  const typeOptions = useMemo(() => {
    const types = Array.from(new Set(keys.map((key) => key.schema).filter(Boolean))).sort();
    return [{ value: "all", label: "All Types" }, ...types.map((type) => ({ value: type, label: type.toUpperCase() }))];
  }, [keys]);

  const filteredKeys = useMemo(() => {
    const query = search.trim().toLowerCase();
    return keys.filter((key) => {
      const matchesType = typeFilter === "all" || key.schema === typeFilter;
      const matchesSearch = !query || key.name.toLowerCase().includes(query);
      return matchesType && matchesSearch;
    });
  }, [keys, search, typeFilter]);

  async function loadKeys() {
    setBusy("keys");
    setError("");
    try {
      const result = await api.databaseTables(serviceId);
      setKeys(result.tables);
      const nextKey = result.tables.find((key) => key.id === selectedKey)?.id ?? result.tables[0]?.id ?? "";
      setSelectedKey(nextKey);
      if (result.tables.length === 0) setRowsResult(null);
      return { tables: result.tables, selected: nextKey };
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not load Redis keys");
      return { tables: [], selected: "" };
    } finally {
      setBusy("");
    }
  }

  async function loadRows(key = selectedKey) {
    if (!key) return;
    setBusy("rows");
    setError("");
    try {
      const result = await api.databaseRows(serviceId, key, 200, 0, []);
      setRowsResult(result);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not load Redis key");
    } finally {
      setBusy("");
    }
  }

  function openAddKey() {
    setInsertMode("key");
    setInsertDraft({ key: "", type: "string", field: "", member: "", score: "0", value: "", ttl: "" });
    setInsertError("");
    setInsertOpen(true);
  }

  function openAddItem() {
    if (!selectedKeyMeta) return;
    setInsertMode("item");
    setInsertDraft({
      key: selectedKeyMeta.name,
      type: selectedKeyMeta.schema,
      field: "",
      member: "",
      score: "0",
      value: "",
      ttl: ""
    });
    setInsertError("");
    setInsertOpen(true);
  }

  async function insertRedis(event: FormEvent) {
    event.preventDefault();
    setBusy("insert");
    setInsertError("");
    try {
      const table = insertMode === "item" && selectedKey ? selectedKey : "__new__";
      const result = await api.insertDatabaseRow(serviceId, { table, values: insertDraft });
      setInsertOpen(false);
      const refreshed = await loadKeys();
      const nextKey = result.table ?? refreshed.selected;
      if (nextKey) {
        setSelectedKey(nextKey);
        await loadRows(nextKey);
      }
    } catch (issue) {
      setInsertError(issue instanceof Error ? issue.message : "Could not add Redis key");
    } finally {
      setBusy("");
    }
  }

  async function copyRedisText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  async function deleteSelectedKey() {
    if (!selectedKeyMeta) return;

    setBusy("delete");
    setError("");
    try {
      await api.deleteDatabaseRow(serviceId, { table: selectedKey, primaryKey: { key: selectedKeyMeta.name } });
      setDeleteOpen(false);
      const refreshed = await loadKeys();
      if (refreshed.selected) {
        await loadRows(refreshed.selected);
      } else {
        setRowsResult(null);
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not delete Redis key");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    setSelectedKey("");
    setRowsResult(null);
    void loadKeys();
  }, [serviceId]);

  useEffect(() => {
    if (selectedKey) void loadRows(selectedKey);
  }, [selectedKey]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Dropdown value={typeFilter} options={typeOptions} onChange={setTypeFilter} className="w-44" />
        <FormInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search keys" className="min-w-64 flex-1" />
        <button type="button" className="inline-flex h-11 w-11 items-center justify-center border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:border-zinc-500 hover:text-white" onClick={() => void loadKeys()} disabled={busy === "keys"} aria-label="Refresh keys">
          <AppIcon icon={Refresh03Icon} size={16} />
        </button>
        <button type="button" className={shellButton("primary")} onClick={openAddKey} disabled={busy === "insert"}>
          <AppIcon icon={Add01Icon} size={15} />
          Key
        </button>
      </div>

      {error ? <div className="border border-rose-500/30 bg-rose-950/25 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col overflow-hidden border border-zinc-800 bg-zinc-950/45">
          <div className="border-b border-zinc-800 px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Keys
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {busy === "keys" && keys.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-zinc-500">Loading keys...</div>
            ) : filteredKeys.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-zinc-500">No keys found.</div>
            ) : filteredKeys.map((key) => {
              const selected = selectedKey === key.id;
              return (
                <button
                  key={key.id}
                  type="button"
                  className={`mb-1 flex w-full items-center justify-between gap-3 border px-3 py-3 text-left transition ${
                    selected
                      ? "border-[#4FB8B2]/55 bg-[#4FB8B2]/12 text-[#9af4ee]"
                      : "border-transparent text-zinc-300 hover:border-zinc-800 hover:bg-zinc-900"
                  }`}
                  onClick={() => setSelectedKey(key.id)}
                >
                  <span className="min-w-0 truncate text-sm font-medium">{key.name}</span>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{key.schema}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-h-0 flex-col border border-zinc-800 bg-zinc-950/45 p-5">
          {!selectedKeyMeta ? (
            <div className="flex min-h-0 flex-1 items-center justify-center text-center text-sm text-zinc-500">Choose a key to inspect its value.</div>
          ) : busy === "rows" && !rowsResult ? (
            <div className="flex min-h-0 flex-1 items-center justify-center text-center text-sm text-zinc-500">Loading key...</div>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate font-hero text-xl text-zinc-100">{selectedKeyMeta.name}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="border border-[#4FB8B2]/35 bg-[#4FB8B2]/12 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9af4ee]">{selectedType || "unknown"}</span>
                    <span className="border border-zinc-700 bg-zinc-900 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400">{itemCountLabel(selectedKeyMeta)}</span>
                    {selectedType === "string" && firstRow.bytes !== undefined ? (
                      <span className="border border-zinc-700 bg-zinc-900 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400">Size: {numberFormatter.format(Number(firstRow.bytes))} B</span>
                    ) : null}
                    <span className="border border-zinc-700 bg-zinc-900 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400">TTL: {ttlLabel(firstRow.ttl)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedType && selectedType !== "string" ? (
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center border border-zinc-800 bg-zinc-900/70 text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-900 disabled:opacity-60"
                      onClick={openAddItem}
                      disabled={busy === "insert"}
                      title="Add item"
                      aria-label="Add item"
                    >
                      <AppIcon icon={Add01Icon} size={15} />
                    </button>
                  ) : null}
                  <RedisKeyActionsMenu
                    disabled={busy === "delete"}
                    onCopyContent={() => copyRedisText(redisContentText(selectedType, rows))}
                    onCopyKey={() => copyRedisText(selectedKeyMeta.name)}
                    onDelete={() => setDeleteOpen(true)}
                  />
                </div>
              </div>
              <RedisItems type={selectedType} rows={rows} />
            </>
          )}
        </div>
      </div>

      {insertOpen ? (
        <DatabaseInsertSheet
          engine="redis"
          title={insertMode === "item" ? "Add item" : "Add key"}
          subtitle={insertMode === "item" ? selectedKeyMeta?.name ?? "Redis key" : "Redis"}
          buttonLabel={insertMode === "item" ? "Add item" : "Add key"}
          columns={[]}
          draft={insertDraft}
          error={insertError}
          busy={busy}
          onDraftChange={setInsertDraft}
          onSubmit={insertRedis}
          onClose={() => {
            setInsertOpen(false);
            setInsertError("");
          }}
        />
      ) : null}

      <RedisDeleteKeyModal
        open={deleteOpen}
        keyName={selectedKeyMeta?.name ?? ""}
        busy={busy === "delete"}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteSelectedKey}
      />
    </div>
  );
}
