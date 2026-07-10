import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Target, CheckSquare, FileText, Sparkles } from "lucide-react";
import { api, type Goal, type Action, type Document } from "@/lib/api";

export function HomePage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [notes, setNotes] = useState<Document[]>([]);

  useEffect(() => {
    Promise.all([
      api.goals.list(),
      api.actions.list(),
      api.documents.list(),
    ]).then(([g, a, n]) => {
      setGoals(g.filter((x) => x.status === "ACTIVE").slice(0, 5));
      setActions(a.filter((x) => x.status !== "DONE").slice(0, 5));
      setNotes(n.slice(0, 5));
    });
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h2 className="text-xl font-semibold tracking-tight">Overview</h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Your personal knowledge and progress at a glance.
      </p>

      <div className="mt-8 grid gap-6">
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
            Get help planning, connecting ideas, and deciding what to do next.
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
              className={`flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-[var(--color-border-subtle)] ${
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
