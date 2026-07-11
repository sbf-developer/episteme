import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import { api, type Goal, type Document, type CalendarEvent, type Kpi, type DoItem } from "@/lib/api";
import type { OverviewLayout, OverviewSectionId } from "@/lib/overview";
import { OVERVIEW_SECTION_LABELS } from "@/lib/overview";
import { OverviewCustomize } from "@/components/OverviewCustomize";

function formatEventDate(iso: string, allDay: boolean) {
  const d = new Date(iso);
  if (allDay) return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function kpiMeta(kpi: Kpi) {
  const pct = kpi.targetValue !== 0 ? Math.round((kpi.currentValue / kpi.targetValue) * 100) : 0;
  return `${pct}%`;
}

const DEFAULT_LAYOUT: OverviewLayout = {
  sections: [
    { id: "ask-ai", visible: true },
    { id: "do-list", visible: true },
    { id: "kpis", visible: true },
    { id: "upcoming", visible: true },
    { id: "goals", visible: true },
    { id: "notes", visible: true },
  ],
};

type SectionItem = { id: string; title: string; meta?: string; href?: string };

type SectionData = {
  title: string;
  link: string;
  empty: string;
  items: SectionItem[];
};

export function HomePage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [doItems, setDoItems] = useState<DoItem[]>([]);
  const [notes, setNotes] = useState<Document[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [layout, setLayout] = useState<OverviewLayout>(DEFAULT_LAYOUT);
  const [customizing, setCustomizing] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const layoutSaveGen = useRef(0);

  useEffect(() => {
    setLoadingOverview(true);
    setOverviewError(null);
    Promise.all([
      api.goals.list(),
      api.kpis.list(),
      api.doList.list(),
      api.documents.list(),
      api.calendar.list({ upcoming: true }),
    ])
      .then(([g, k, d, n, e]) => {
        setGoals(g.filter((x) => x.status === "ACTIVE").slice(0, 5));
        setKpis(k.slice(0, 5));
        setDoItems(d.filter((x) => !x.done).slice(0, 5));
        setNotes(n.slice(0, 5));
        setEvents(e.slice(0, 5));
      })
      .catch((err) => {
        setOverviewError(err instanceof Error ? err.message : "Could not load overview");
      })
      .finally(() => setLoadingOverview(false));

    api.settings
      .getOverview()
      .then(setLayout)
      .catch(() => setLayout(DEFAULT_LAYOUT));
  }, []);

  const persistLayout = useCallback((next: OverviewLayout) => {
    setLayout(next);
    setLayoutError(null);
    clearTimeout(saveTimer.current);
    setSavingLayout(true);
    saveTimer.current = setTimeout(async () => {
      const gen = ++layoutSaveGen.current;
      try {
        const saved = await api.settings.updateOverview(next);
        if (gen !== layoutSaveGen.current) return;
        setLayout(saved);
      } catch (err) {
        if (gen !== layoutSaveGen.current) return;
        setLayoutError(err instanceof Error ? err.message : "Could not save layout");
      } finally {
        if (gen === layoutSaveGen.current) setSavingLayout(false);
      }
    }, 400);
  }, []);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const sectionData = useMemo(
    (): Record<OverviewSectionId, SectionData> => ({
      "ask-ai": { title: "Ask AI", link: "/ai", empty: "", items: [] },
      "do-list": {
        title: "Do-list",
        link: "/do-list",
        empty: "Nothing to do",
        items: doItems.map((d) => ({ id: d.id, title: d.title })),
      },
      kpis: {
        title: "KPIs",
        link: "/kpis",
        empty: "No KPIs tracked",
        items: kpis.map((k) => ({ id: k.id, title: k.title, meta: kpiMeta(k) })),
      },
      upcoming: {
        title: "Upcoming",
        link: "/calendar",
        empty: "Nothing scheduled",
        items: events.map((e) => ({
          id: e.id,
          title: e.title,
          meta: formatEventDate(e.startAt, e.allDay),
        })),
      },
      goals: {
        title: "Goals",
        link: "/goals",
        empty: "No active goals",
        items: goals.map((g) => ({ id: g.id, title: g.title })),
      },
      notes: {
        title: "Notes",
        link: "/notes",
        empty: "No notes yet",
        items: notes.map((n) => ({
          id: n.id,
          title: n.title,
          meta: n.type.toLowerCase(),
          href: `/notes/${n.id}`,
        })),
      },
    }),
    [doItems, kpis, events, goals, notes]
  );

  const visibleSections = layout.sections.filter((s) => s.visible);

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">Overview</h2>
        <button
          type="button"
          onClick={() => setCustomizing((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
            customizing
              ? "bg-[var(--color-text)] text-white"
              : "text-[var(--color-text-tertiary)] hover:bg-[var(--color-border-subtle)] hover:text-[var(--color-text)]"
          }`}
        >
          <SlidersHorizontal size={14} strokeWidth={1.75} />
          {customizing ? "Done" : "Customize"}
        </button>
      </div>

      {customizing && (
        <div className="mb-8">
          {layoutError && (
            <p className="mb-2 text-xs text-red-600">{layoutError}</p>
          )}
          <OverviewCustomize
            layout={layout}
            labels={OVERVIEW_SECTION_LABELS}
            onChange={persistLayout}
            onReset={() => persistLayout(DEFAULT_LAYOUT)}
            saving={savingLayout}
          />
        </div>
      )}

      {overviewError && (
        <p className="mb-4 text-sm text-red-600">{overviewError}</p>
      )}

      {loadingOverview ? (
        <div className="flex justify-center py-16">
          <div className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-[var(--color-border)] border-t-[var(--color-text-tertiary)]" />
        </div>
      ) : (
      <div className="space-y-10">
        {visibleSections.map((section) => {
          if (section.id === "ask-ai") {
            return (
              <Link
                key={section.id}
                to="/ai"
                className="group -mx-2 flex items-center justify-between rounded-xl px-2 py-3 transition-colors hover:bg-[var(--color-border-subtle)]"
              >
                <span className="text-sm font-medium text-[var(--color-text)]">Ask AI</span>
                <ChevronRight
                  size={15}
                  strokeWidth={1.75}
                  className="text-[var(--color-text-tertiary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--color-text-secondary)]"
                />
              </Link>
            );
          }

          const data = sectionData[section.id as OverviewSectionId];
          if (!data) return null;
          return (
            <Section
              key={section.id}
              title={data.title}
              link={data.link}
              empty={data.empty}
              items={data.items}
            />
          );
        })}
      </div>
      )}
    </div>
  );
}

function Section({
  title,
  link,
  empty,
  items,
}: {
  title: string;
  link: string;
  empty: string;
  items: SectionItem[];
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]">
          {title}
        </h3>
        <Link
          to={link}
          className="shrink-0 text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text)]"
        >
          All
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="px-1 py-1 text-sm text-[var(--color-text-tertiary)]">{empty}</p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={item.href ?? link}
                className="group flex items-center justify-between gap-4 rounded-lg px-1 py-2 transition-colors hover:bg-[var(--color-border-subtle)]"
              >
                <span className="min-w-0 truncate text-sm text-[var(--color-text)]">{item.title}</span>
                {item.meta && (
                  <span className="shrink-0 text-xs text-[var(--color-text-tertiary)]">{item.meta}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
