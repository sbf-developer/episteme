import { useEffect, useState } from "react";
import { Plus, CheckSquare } from "lucide-react";
import { api, type Action, type Goal } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ReorderGrip, reorderRowClass } from "@/components/ReorderGrip";
import { useDragReorder } from "@/hooks/useDragReorder";

const statusIcons: Record<Action["status"], string> = {
  TODO: "○",
  IN_PROGRESS: "◐",
  DONE: "●",
  BLOCKED: "⊘",
};

export function ActionsPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newTitle, setNewTitle] = useState("");

  const load = async () => {
    const [a, g] = await Promise.all([api.actions.list(), api.goals.list()]);
    setActions(a);
    setGoals(g);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!newTitle.trim()) return;
    await api.actions.create({ title: newTitle.trim() });
    setNewTitle("");
    load();
  };

  const cycleStatus = async (action: Action) => {
    const order: Action["status"][] = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"];
    const next = order[(order.indexOf(action.status) + 1) % order.length];
    await api.actions.update(action.id, { status: next });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this action?")) return;
    await api.actions.delete(id);
    load();
  };

  const reorder = async (ids: string[], section: "active" | "done") => {
    await api.actions.reorder(ids, section);
    await load();
  };

  const active = actions.filter((a) => a.status !== "DONE");
  const done = actions.filter((a) => a.status === "DONE");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Actions</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Concrete steps toward your goals. Drag to set your priority order.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Add an action…"
          className="flex-1"
        />
        <Button variant="subtle" onClick={create}>
          <Plus size={15} strokeWidth={2} />
          Add
        </Button>
      </div>

      <ActionList
        title="Active"
        actions={active}
        goals={goals}
        onCycle={cycleStatus}
        onRemove={remove}
        onUpdate={load}
        onReorder={(ids) => reorder(ids, "active")}
      />

      {done.length > 0 && (
        <ActionList
          title="Done"
          actions={done}
          goals={goals}
          onCycle={cycleStatus}
          onRemove={remove}
          onUpdate={load}
          onReorder={(ids) => reorder(ids, "done")}
          muted
        />
      )}

      {actions.length === 0 && (
        <div className="mt-6 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-16 text-center">
          <CheckSquare size={32} className="mx-auto text-[var(--color-text-tertiary)]" />
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">No actions yet</p>
        </div>
      )}
    </div>
  );
}

function ActionList({
  title,
  actions,
  goals,
  onCycle,
  onRemove,
  onUpdate,
  onReorder,
  muted,
}: {
  title: string;
  actions: Action[];
  goals: Goal[];
  onCycle: (a: Action) => void;
  onRemove: (id: string) => void;
  onUpdate: () => void;
  onReorder: (ids: string[]) => void | Promise<void>;
  muted?: boolean;
}) {
  const { displayItems, rowProps } = useDragReorder(actions, onReorder);

  if (actions.length === 0) return null;

  return (
    <div className={`mt-6 ${muted ? "opacity-60" : ""}`}>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
        {title}
      </h3>
      <div className="space-y-1.5">
        {displayItems.map((action) => {
          const drag = rowProps(action.id);
          return (
            <div
              key={action.id}
              {...drag}
              className={`flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-3 transition-colors sm:gap-3 sm:px-4 ${reorderRowClass(drag["data-drag-over"])}`}
            >
              <ReorderGrip />
              <button
                type="button"
                onClick={() => onCycle(action)}
                className="mt-0.5 shrink-0 text-lg leading-none text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
                title="Cycle status"
              >
                {statusIcons[action.status]}
              </button>
              <div className="min-w-0 flex-1 space-y-2">
                <p
                  className={`text-sm leading-snug ${
                    action.status === "DONE"
                      ? "text-[var(--color-text-tertiary)] line-through"
                      : "font-medium text-[var(--color-text)]"
                  }`}
                >
                  {action.title}
                </p>
                <select
                  value={action.goalId ?? ""}
                  onChange={async (e) => {
                    await api.actions.update(action.id, {
                      goalId: e.target.value || null,
                    });
                    onUpdate();
                  }}
                  className="w-full max-w-xs rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs text-[var(--color-text-secondary)]"
                >
                  <option value="">No goal</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => onRemove(action.id)}
                className="shrink-0 pt-0.5 text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-red-600"
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
