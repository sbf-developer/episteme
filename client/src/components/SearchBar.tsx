import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, Target, CheckSquare, X } from "lucide-react";
import { api, type SearchResult } from "@/lib/api";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { results } = await api.search(query);
        setResults(results);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const icon = (type: SearchResult["type"]) => {
    switch (type) {
      case "document":
        return <FileText size={14} />;
      case "goal":
        return <Target size={14} />;
      case "action":
        return <CheckSquare size={14} />;
    }
  };

  const go = (r: SearchResult) => {
    setOpen(false);
    setQuery("");
    if (r.type === "document") navigate(`/notes/${r.id}`);
    else if (r.type === "goal") navigate(`/goals`);
    else navigate(`/actions`);
  };

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          placeholder="Search notes, goals, actions…"
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-2 pl-9 pr-8 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (results.length > 0 || loading) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-lg">
          {loading && (
            <div className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">Searching…</div>
          )}
          {!loading &&
            results.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => go(r)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[var(--color-border-subtle)]"
              >
                <span className="text-[var(--color-text-tertiary)]">{icon(r.type)}</span>
                <span className="flex-1 truncate font-medium">{r.title}</span>
                <span className="text-xs text-[var(--color-text-tertiary)]">{r.subtitle}</span>
              </button>
            ))}
          {!loading && results.length === 0 && query && (
            <div className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">No results</div>
          )}
        </div>
      )}
    </div>
  );
}
