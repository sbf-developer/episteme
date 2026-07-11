import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Target, CheckSquare, FileText, Sparkles, Calendar, Gauge, ListTodo } from "lucide-react";
import { api, type Goal, type Action, type Document, type CalendarEvent, type Kpi, type DoItem } from "@/lib/api";

function formatEventDate(iso: string, allDay: boolean) {
  const d = new Date(iso);
  if (allDay) return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function kpiMeta(kpi: Kpi) {
  const pct = kpi.targetValue !== 0 ? Math.round((kpi.currentValue / kpi.targetValue) * 100) : 0;
  return `${pct}%`;
}

export function HomePage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [doItems, setDoItems] = useState<DoItem[]>([]);
  const [notes, setNotes] = useState<Document[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    Promise.all([
      api.goals.list(),
      api.actions.list(),
      api.kpis.list(),
      api.doList.list(),
      api.documents.list(),
      api.calendar.list({ upcoming: true }),
    ]).then(([g, a, k, d, n, e]) => {
      setGoals(g.filter((x) => x.status === "ACTIVE").slice(0, 5));
      setActions(a.filter((x) => x.status !== "DONE").slice(0, 5));
      setKpis(k.slice(0, 5));
      setDoItems(d.filter((x) => !x.done).slice(0, 5));
      setNotes(n.slice(0, 5));
      setEvents(e.slice(0, 5));
    });
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h2 className="text-xl font-semibold tracking-tight">Overview</h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Your personal knowledge and progress at a glance.
      </p>

      <div className="mt-8 grid gap-6">
        <Section
          title="Do-list"
          icon={<ListTodo size={16} />}
          link="/do-list"
          empty="Nothing to do"
          items={doItems.map((d) => ({ id: d.id, title: d.title }))}
        />
        <Section
          title="KPIs"
          icon={<Gauge size={16} />}
          link="/kpis"
          empty="No KPIs tracked"
          items={kpis.map((k) => ({ id: k.id, title: k.title, meta: kpiMeta(k) }))}
        />
        <Section
          title="Upcoming"
          icon={<Calendar size={16} />}
          link="/calendar"
          empty="Nothing scheduled"
          items={events.map((e) => ({
            id: e.id,
            title: e.title,
            meta: formatEventDate(e.startAt, e.allDay),
          }))}
        />
        <Section
          title="Active goals"
          icon={<Target size={16} />}
          link="/goals"
          empty="No active goals yet"
          items={goals.map((g) => ({ id: g.id, title: g.title, meta: g.description || undefined }))}
        />
        <Section
          title="Next actions"
          icon={<CheckSquare size={16} />}
          link="/actions"
          empty="No pending actions"
          items={actions.map((a) => ({
            id: a.id,
            title: a.title,
            meta: a.status.replace("_", " "),
          }))}
        />
        <Section
          title="Recent notes"
          icon={<FileText size={16} />}
          link="/notes"
          empty="No notes yet"
          items={notes.map((n) => ({
            id: n.id,
            title: n.title,
            meta: n.type,
            href: `/notes/${n.id}`,
          }))}
        />
      </div>

      <Link
        to="/ai"
        className="mt-8 flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 transition-colors hover:border-[var(--color-accent)]"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
          <Sparkles size={18} />
        </div>
        <div>
          <p className="text-sm font-medium">Ask AI</p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Context-aware help across your goals, KPIs, Do-list, calendar, and notes.
          </p>
        </div>
      </Link>
    </div>
  );
}

function Section({
  title,
  icon,
  link,
  empty,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  link: string;
  empty: string;
  items: { id: string; title: string; meta?: string; href?: string }[];
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)]">
          {icon}
          {title}
        </div>
        <Link to={link} className="text-xs text-[var(--color-accent)] hover:underline">
          View all
        </Link>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[var(--color-text-tertiary)]">{empty}</p>
        ) : (
          items.map((item, i) => (
            <Link
              key={item.id}
              to={item.href ?? link}
              className={`flex flex-col gap-1 px-4 py-3 text-sm transition-colors hover:bg-[var(--color-border-subtle)] sm:flex-row sm:items-center sm:justify-between ${
                i > 0 ? "border-t border-[var(--color-border-subtle)]" : ""
              }`}
            >
              <span className="truncate font-medium">{item.title}</span>
              {item.meta && (
                <span className="ml-3 shrink-0 text-xs text-[var(--color-text-tertiary)]">
                  {item.meta}
                </span>
              )}
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
