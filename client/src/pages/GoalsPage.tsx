import { useEffect, useState } from "react";
import { Plus, Target } from "lucide-react";
import { api, type Goal } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ReorderGrip, reorderRowClass } from "@/components/ReorderGrip";
import { useDragReorder } from "@/hooks/useDragReorder";

const statusColors: Record<Goal["status"], string> = {
  ACTIVE: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-green-50 text-green-700",
  PAUSED: "bg-amber-50 text-amber-700",
  ARCHIVED: "bg-gray-50 text-gray-500",
};

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const load = () => api.goals.list().then(setGoals);
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!newTitle.trim()) return;
    await api.goals.create({ title: newTitle.trim() });
    setNewTitle("");
    load();
  };

  const update = async (id: string, data: Partial<Goal>) => {
    await api.goals.update(id, data);
    load();
    setEditing(null);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this goal?")) return;
    await api.goals.delete(id);
    load();
  };

  const reorder = async (ids: string[]) => {
    await api.goals.reorder(ids);
    await load();
  };

  const { displayItems, rowProps } = useDragReorder(goals, reorder);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Goals</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Define what you're working toward. Drag to set your priority order.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Add a new goal…"
          className="flex-1"
        />
        <Button variant="subtle" onClick={create}>
          <Plus size={15} strokeWidth={2} />
          Add
        </Button>
      </div>

      <div className="mt-6 space-y-2">
        {goals.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-16 text-center">
            <Target size={32} className="mx-auto text-[var(--color-text-tertiary)]" />
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">No goals yet</p>
          </div>
        ) : (
          displayItems.map((goal) => {
            const drag = rowProps(goal.id);
            return (
              <div
                key={goal.id}
                {...drag}
                className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 transition-colors ${reorderRowClass(drag["data-drag-over"])}`}
              >
                {editing === goal.id ? (
                  <EditGoal goal={goal} onSave={(d) => update(goal.id, d)} onCancel={() => setEditing(null)} />
                ) : (
                  <div className="flex items-start gap-2 sm:gap-3">
                    <ReorderGrip />
                    <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium">{goal.title}</h3>
                          <span className={`rounded px-1.5 py-0.5 text-xs ${statusColors[goal.status]}`}>
                            {goal.status}
                          </span>
                        </div>
                        {goal.description && (
                          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                            {goal.description}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1">
                        <Button variant="ghost" onClick={() => setEditing(goal.id)}>
                          Edit
                        </Button>
                        <select
                          value={goal.status}
                          onChange={(e) =>
                            update(goal.id, { status: e.target.value as Goal["status"] })
                          }
                          className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs"
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="PAUSED">Paused</option>
                          <option value="ARCHIVED">Archived</option>
                        </select>
                        <Button variant="ghost" onClick={() => remove(goal.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function EditGoal({
  goal,
  onSave,
  onCancel,
}: {
  goal: Goal;
  onSave: (data: Partial<Goal>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description);

  return (
    <div className="space-y-3">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description…"
        className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        rows={3}
      />
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => onSave({ title, description })}>
          Save
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
