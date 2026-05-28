import type { FormEvent } from "react";
import { useState } from "react";
import type { DatabaseColumn, DatabaseRow, DatabaseRowFilter } from "../../api";
import { DatabaseGridPagination, type DatabaseGridPaginationState } from "./database-grid-pagination";
import { MongoDocumentCard, mongoDocumentSource } from "./mongo-document-card";
import { MongoDocumentModal } from "./mongo-document-modal";
import { MongoQueryBar } from "./mongo-query-bar";

export function MongoDocumentList({
  columns,
  rows,
  busy,
  scopeLabel,
  query,
  pagination,
  onQueryChange,
  onFind,
  onClearQuery,
  onSaveDocument,
  onDeleteDocument
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
  onSaveDocument: (row: DatabaseRow, document: string) => Promise<void>;
  onDeleteDocument: (row: DatabaseRow) => Promise<void>;
}) {
  const [editingRow, setEditingRow] = useState<DatabaseRow | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState("");

  function beginEdit(row: DatabaseRow) {
    setEditingRow(row);
    setEditDraft({ document: mongoDocumentSource(columns, row) });
    setEditError("");
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingRow) return;
    setEditError("");
    try {
      await onSaveDocument(editingRow, editDraft.document ?? "");
      setEditingRow(null);
      setEditDraft({});
    } catch (issue) {
      setEditError(issue instanceof Error ? issue.message : "Could not save document");
    }
  }

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
              <MongoDocumentCard
                key={String(row._id ?? rowIndex)}
                columns={columns}
                row={row}
                busy={busy}
                onEdit={() => beginEdit(row)}
                onDelete={() => onDeleteDocument(row)}
              />
            ))}
          </div>
        )}
      </div>

      <DatabaseGridPagination pagination={pagination} loadedRows={rows.length} busy={busy} />

      {editingRow ? (
        <MongoDocumentModal
          title="Edit document"
          subtitle={scopeLabel}
          buttonLabel="Save document"
          draft={editDraft}
          error={editError}
          busy={busy}
          showTargetFields={false}
          onDraftChange={setEditDraft}
          onSubmit={submitEdit}
          onClose={() => {
            setEditingRow(null);
            setEditDraft({});
            setEditError("");
          }}
        />
      ) : null}
    </div>
  );
}
