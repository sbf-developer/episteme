import { useEffect, useState } from "react";
import { Plus, CheckSquare } from "lucide-react";
import { api, type Action, type Goal } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
    await api.actions.delete(id);
    load();
  };

  const active = actions.filter((a) => a.status !== "DONE");
  const done = actions.filter((a) => a.status === "DONE");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Actions</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Concrete steps toward your goals.
        </p>
      </div>

      <div className="mt-6 flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Add an action…"
          className="flex-1"
        />
        <Button variant="primary" onClick={create}>
          <Plus size={16} />
          Add
        </Button>
      </div>

      <ActionList
        title="To do"
        actions={active}
        goals={goals}
        onCycle={cycleStatus}
        onRemove={remove}
        onUpdate={load}
      />

      {done.length > 0 && (
        <ActionList
          title="Done"
          actions={done}
          goals={goals}
          onCycle={cycleStatus}
          onRemove={remove}
          onUpdate={load}
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
  muted,
}: {
  title: string;
  actions: Action[];
  goals: Goal[];
  onCycle: (a: Action) => void;
  onRemove: (id: string) => void;
  onUpdate: () => void;
  muted?: boolean;
}) {
  if (actions.length === 0) return null;

  return (
    <div className={`mt-6 ${muted ? "opacity-60" : ""}`}>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
        {title}
      </h3>
      <div className="space-y-1">
        {actions.map((action) => (
          <div
            key={action.id}
            className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2.5"
          >
            <button
              onClick={() => onCycle(action)}
              className="text-lg leading-none text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
              title="Cycle status"
            >
              {statusIcons[action.status]}
            </button>
            <span
              className={`flex-1 text-sm ${action.status === "DONE" ? "line-through text-[var(--color-text-tertiary)]" : "font-medium"}`}
            >
              {action.title}
            </span>
            <select
              value={action.goalId ?? ""}
              onChange={async (e) => {
                await api.actions.update(action.id, {
                  goalId: e.target.value || null,
                });
                onUpdate();
              }}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs text-[var(--color-text-tertiary)]"
            >
              <option value="">No goal</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => onRemove(action.id)}
              className="text-xs text-[var(--color-text-tertiary)] hover:text-red-600"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
