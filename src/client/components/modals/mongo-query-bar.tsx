import { ArrowDown01Icon, Cancel01Icon, Clock01Icon, Search01Icon, StarIcon } from "@hugeicons/core-free-icons";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DatabaseRowFilter } from "../../api";
import { AppIcon } from "../ui/primitives";
import { mongoQuerySyntaxError, mongoQueryToFilters } from "./mongo-query-utils";

type StoredQuery = {
  text: string;
  savedAt: string;
};

type QueryTab = "recents" | "favorites";

function storageKey(scopeLabel: string, kind: QueryTab) {
  return `aeroplane:mongo:${kind}:${scopeLabel}`;
}

function readStoredQueries(scopeLabel: string, kind: QueryTab) {
  try {
    const raw = window.localStorage.getItem(storageKey(scopeLabel, kind));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed
          .filter((item): item is StoredQuery => Boolean(item?.text) && typeof item.text === "string")
          .slice(0, 24)
      : [];
  } catch {
    return [];
  }
}

function writeStoredQueries(scopeLabel: string, kind: QueryTab, queries: StoredQuery[]) {
  window.localStorage.setItem(storageKey(scopeLabel, kind), JSON.stringify(queries.slice(0, 24)));
}

function upsertQuery(queries: StoredQuery[], text: string) {
  const trimmed = text.trim();
  if (!trimmed) return queries;
  return [{ text: trimmed, savedAt: new Date().toISOString() }, ...queries.filter((item) => item.text !== trimmed)].slice(0, 24);
}

function queryTokens(source: string) {
  return source.match(/'[^'\\]*(?:\\.[^'\\]*)*'?|"[^"\\]*(?:\\.[^"\\]*)*"?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?|[$A-Z_a-z][\w$.-]*(?=\s*:)|[{}:[\],]|\s+|./g) ?? [];
}

function tokenClass(token: string) {
  if (/^['"]/.test(token)) return "text-emerald-400";
  if (/^-?\d/.test(token)) return "text-amber-300";
  if (/^(true|false|null)$/.test(token)) return "text-fuchsia-300";
  if (/^[$A-Z_a-z][\w$.-]*$/.test(token)) return "text-zinc-100";
  if (/^[{}:[\],]$/.test(token)) return "text-zinc-500";
  return "text-zinc-400";
}

function QueryHighlight({ source }: { source: string }) {
  return (
    <>
      {queryTokens(source).map((token, index) => (
        <span key={`${token}-${index}`} className={tokenClass(token)}>
          {token}
        </span>
      ))}
    </>
  );
}

function highlightedSuggestion(text: string, needle: string) {
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (!needle || index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <span className="text-[#7fe3dd]">{text.slice(index, index + needle.length)}</span>
      {text.slice(index + needle.length)}
    </>
  );
}

export function MongoQueryBar({
  scopeLabel,
  query,
  busy,
  onQueryChange,
  onFind,
  onClear
}: {
  scopeLabel: string;
  query: string;
  busy: string;
  onQueryChange: (value: string) => void;
  onFind: (filters: DatabaseRowFilter[], source: string) => void;
  onClear: () => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [queryScrollLeft, setQueryScrollLeft] = useState(0);
  const [activeTab, setActiveTab] = useState<QueryTab>("recents");
  const [recents, setRecents] = useState<StoredQuery[]>([]);
  const [favorites, setFavorites] = useState<StoredQuery[]>([]);
  const syntaxError = mongoQuerySyntaxError(query);
  const trimmedQuery = query.trim();
  const favoriteTexts = useMemo(() => new Set(favorites.map((item) => item.text)), [favorites]);
  const suggestions = useMemo(() => {
    const search = trimmedQuery.toLowerCase();
    if (!search) return [];
    const combined = [...favorites, ...recents].filter((item, index, items) => items.findIndex((candidate) => candidate.text === item.text) === index);
    return combined.filter((item) => item.text.toLowerCase().includes(search)).slice(0, 6);
  }, [favorites, recents, trimmedQuery]);

  useEffect(() => {
    setRecents(readStoredQueries(scopeLabel, "recents"));
    setFavorites(readStoredQueries(scopeLabel, "favorites"));
    setMenuOpen(false);
  }, [scopeLabel]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setInputFocused(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setQueryScrollLeft(inputRef.current?.scrollLeft ?? 0);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [query]);

  function syncQueryScroll() {
    window.requestAnimationFrame(() => {
      setQueryScrollLeft(inputRef.current?.scrollLeft ?? 0);
    });
  }

  function saveRecents(next: StoredQuery[]) {
    setRecents(next);
    writeStoredQueries(scopeLabel, "recents", next);
  }

  function saveFavorites(next: StoredQuery[]) {
    setFavorites(next);
    writeStoredQueries(scopeLabel, "favorites", next);
  }

  function runFind(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (syntaxError || busy === "rows") return;
    if (trimmedQuery) saveRecents(upsertQuery(recents, trimmedQuery));
    onFind(mongoQueryToFilters(trimmedQuery), trimmedQuery);
    setInputFocused(false);
  }

  function selectQuery(text: string) {
    onQueryChange(text);
    setMenuOpen(false);
    setInputFocused(false);
  }

  function toggleFavorite(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (favoriteTexts.has(trimmed)) {
      saveFavorites(favorites.filter((item) => item.text !== trimmed));
    } else {
      saveFavorites(upsertQuery(favorites, trimmed));
    }
  }

  const listedQueries = activeTab === "recents" ? recents : favorites;
  const showSuggestions = inputFocused && !menuOpen && suggestions.length > 0;

  return (
    <div ref={rootRef} className="relative mb-3">
      <form
        className={`flex h-11 items-center border bg-zinc-950 text-zinc-100 ${
          syntaxError ? "border-rose-500/70" : "border-zinc-700"
        }`}
        onSubmit={runFind}
      >
        <button
          type="button"
          className="flex h-full items-center gap-2 border-r border-zinc-800 px-3 text-zinc-100 transition hover:bg-zinc-900"
          onClick={() => {
            setActiveTab("recents");
            setMenuOpen((current) => !current);
          }}
          aria-label="Recent queries"
          aria-expanded={menuOpen}
        >
          <AppIcon icon={Clock01Icon} size={16} />
          <AppIcon icon={ArrowDown01Icon} size={13} className={`text-zinc-300 transition ${menuOpen ? "rotate-180" : ""}`} />
        </button>

        <div className="relative h-full min-w-0 flex-1">
          {query ? (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <pre
                className="absolute left-4 top-1/2 m-0 whitespace-pre font-mono text-sm leading-none"
                style={{ transform: `translate(${-queryScrollLeft}px, -50%)` }}
              >
                <QueryHighlight source={query} />
              </pre>
            </div>
          ) : null}
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              onQueryChange(event.target.value);
              syncQueryScroll();
            }}
            onClick={syncQueryScroll}
            onFocus={() => {
              setInputFocused(true);
              syncQueryScroll();
            }}
            onKeyUp={syncQueryScroll}
            onScroll={(event) => setQueryScrollLeft(event.currentTarget.scrollLeft)}
            className={`relative h-full w-full bg-transparent px-4 font-mono text-sm outline-none placeholder:text-zinc-500 ${query ? "text-transparent caret-zinc-100" : "text-zinc-100"}`}
            placeholder="Type a query: { field: 'value' }"
            spellCheck={false}
          />
        </div>

        {trimmedQuery ? (
          <>
            <button
              type="button"
              className={`mr-2 inline-flex h-7 w-7 items-center justify-center border transition ${
                favoriteTexts.has(trimmedQuery)
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : "border-zinc-700 bg-zinc-900/80 text-zinc-400 hover:border-zinc-500 hover:text-white"
              }`}
              onClick={() => toggleFavorite(trimmedQuery)}
              title={favoriteTexts.has(trimmedQuery) ? "Remove favorite" : "Save favorite"}
              aria-label={favoriteTexts.has(trimmedQuery) ? "Remove favorite" : "Save favorite"}
            >
              <AppIcon icon={StarIcon} size={14} />
            </button>
            <button
              type="button"
              className="mr-2 inline-flex h-7 items-center gap-1.5 border border-zinc-700 bg-zinc-900/80 px-2.5 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-white"
              onClick={onClear}
              disabled={busy === "rows"}
            >
              <AppIcon icon={Cancel01Icon} size={13} />
              Clear
            </button>
          </>
        ) : null}

        <button
          type="submit"
          className="mr-2 inline-flex h-7 items-center gap-1.5 border border-[#4FB8B2]/45 bg-[#4FB8B2]/15 px-2.5 text-xs font-medium text-[#7fe3dd] transition hover:bg-[#4FB8B2]/25 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={Boolean(syntaxError) || busy === "rows"}
        >
          <AppIcon icon={Search01Icon} size={13} />
          Find
        </button>
      </form>

      {syntaxError ? <div className="mt-1 font-mono text-[10px] text-rose-300">{syntaxError}</div> : null}

      {showSuggestions ? (
        <div className="absolute left-14 right-24 top-full z-40 mt-1 border border-zinc-700 bg-zinc-950 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
          {suggestions.map((item) => (
            <button
              key={item.text}
              type="button"
              className="block w-full px-2.5 py-2 text-left font-mono text-xs text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
              onMouseDown={(event) => {
                event.preventDefault();
                selectQuery(item.text);
              }}
            >
              {highlightedSuggestion(item.text, trimmedQuery)}
            </button>
          ))}
        </div>
      ) : null}

      {menuOpen ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-[460px] border border-zinc-700 bg-zinc-950 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="font-hero text-lg text-zinc-100">Queries in {scopeLabel}</div>
          <div className="mt-4 inline-flex border border-zinc-700 bg-zinc-950 p-1">
            {(["recents", "favorites"] as QueryTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`inline-flex h-8 items-center gap-2 px-3 text-sm font-semibold capitalize transition ${
                  activeTab === tab ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                <AppIcon icon={tab === "recents" ? Clock01Icon : StarIcon} size={15} />
                {tab}
              </button>
            ))}
          </div>

          <div className="mt-4 max-h-64 overflow-y-auto">
            {listedQueries.length === 0 ? (
              <div className="flex min-h-40 items-center justify-center border border-zinc-800 bg-zinc-950/70 px-5 text-center text-sm text-zinc-500">
                {activeTab === "recents" ? "Your recent queries will appear here." : "Saved favorite queries will appear here."}
              </div>
            ) : listedQueries.map((item) => (
              <div key={item.text} className="group flex items-center gap-2 border-b border-zinc-900 py-2 last:border-b-0">
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate px-2 py-1.5 text-left font-mono text-xs text-zinc-300 transition group-hover:bg-zinc-900 group-hover:text-white"
                  onClick={() => selectQuery(item.text)}
                >
                  {item.text}
                </button>
                <button
                  type="button"
                  className={`inline-flex h-7 w-7 items-center justify-center border transition ${
                    favoriteTexts.has(item.text)
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                      : "border-zinc-800 bg-zinc-900/70 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
                  }`}
                  onClick={() => toggleFavorite(item.text)}
                  title={favoriteTexts.has(item.text) ? "Remove favorite" : "Save favorite"}
                  aria-label={favoriteTexts.has(item.text) ? "Remove favorite" : "Save favorite"}
                >
                  <AppIcon icon={StarIcon} size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
