import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, Target, CheckSquare, X, Calendar, FolderUp } from "lucide-react";
import { api, type SearchResult } from "@/lib/api";

type SearchBarProps = {
  collapsed?: boolean;
  className?: string;
};

export function SearchBar({ collapsed = false, className = "" }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRequestRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const requestId = ++searchRequestRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { results } = await api.search(query);
        if (requestId !== searchRequestRef.current) return;
        setResults(results);
        setOpen(true);
      } catch {
        if (requestId !== searchRequestRef.current) return;
        setResults([]);
        setOpen(true);
      } finally {
        if (requestId === searchRequestRef.current) setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        if (collapsed) setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [collapsed]);

  useEffect(() => {
    if (expanded && inputRef.current) inputRef.current.focus();
  }, [expanded]);

  const icon = (type: SearchResult["type"]) => {
    switch (type) {
      case "document":
        return <FileText size={14} />;
      case "goal":
        return <Target size={14} />;
      case "action":
        return <CheckSquare size={14} />;
      case "event":
        return <Calendar size={14} />;
      case "file":
        return <FolderUp size={14} />;
    }
  };

  const go = (r: SearchResult) => {
    setOpen(false);
    setQuery("");
    setExpanded(false);
    if (r.type === "document") navigate(`/notes/${r.id}`);
    else if (r.type === "goal") navigate(`/goals`);
    else if (r.type === "action") navigate(`/actions`);
    else if (r.type === "event") navigate(`/calendar`);
    else navigate(`/documents`);
  };

  const resultsDropdown = open && (results.length > 0 || loading || query) && (
    <div
      className={`absolute z-50 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-lg ${
        collapsed
          ? "left-full top-0 ml-2 w-72"
          : "left-0 right-0 top-full mt-1"
      }`}
    >
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
  );

  if (collapsed) {
    return (
      <div ref={ref} className={`relative ${className}`}>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex w-full items-center justify-center rounded-[var(--radius-sm)] p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-white/60 hover:text-[var(--color-text)]"
          title="Search"
        >
          <Search size={18} strokeWidth={1.75} />
        </button>
        {expanded && (
          <div className="absolute left-full top-0 z-50 ml-2 w-64 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-2 shadow-lg">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query && setOpen(true)}
                placeholder="Search…"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] py-1.5 pl-8 pr-7 text-sm outline-none focus:border-[var(--color-accent)]"
              />
              {query && (
                <button
                  onClick={() => { setQuery(""); setOpen(false); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {resultsDropdown}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative w-full ${className}`}>
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          placeholder="Search everything…"
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-2 pl-9 pr-8 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {resultsDropdown}
    </div>
  );
}
