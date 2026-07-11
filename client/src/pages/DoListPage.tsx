import { useEffect, useState } from "react";
import { Plus, ListTodo, Check } from "lucide-react";
import { api, type DoItem } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function DoListPage() {
  const [items, setItems] = useState<DoItem[]>([]);
  const [newTitle, setNewTitle] = useState("");

  const load = () => api.doList.list().then(setItems);
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!newTitle.trim()) return;
    await api.doList.create({ title: newTitle.trim() });
    setNewTitle("");
    load();
  };

  const toggle = async (item: DoItem) => {
    await api.doList.update(item.id, { done: !item.done });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await api.doList.delete(id);
    load();
  };

  const active = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Do-list</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Simple checklist for everyday todos.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Add to do…"
          className="flex-1"
        />
        <Button variant="subtle" onClick={create}>
          <Plus size={15} strokeWidth={2} />
          Add
        </Button>
      </div>

      <ItemSection title="To do" items={active} onToggle={toggle} onRemove={remove} />
      {done.length > 0 && (
        <ItemSection title="Done" items={done} onToggle={toggle} onRemove={remove} muted />
      )}

      {items.length === 0 && (
        <div className="mt-6 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-16 text-center">
          <ListTodo size={32} className="mx-auto text-[var(--color-text-tertiary)]" />
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">Nothing on your list yet</p>
        </div>
      )}
    </div>
  );
}

function ItemSection({
  title,
  items,
  onToggle,
  onRemove,
  muted,
}: {
  title: string;
  items: DoItem[];
  onToggle: (item: DoItem) => void;
  onRemove: (id: string) => void;
  muted?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div className={`mt-6 ${muted ? "opacity-60" : ""}`}>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
        {title}
      </h3>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-3 sm:px-4"
          >
            <button
              type="button"
              onClick={() => onToggle(item)}
              aria-label={item.done ? "Mark as not done" : "Mark as done"}
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                item.done
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                  : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
              }`}
            >
              {item.done && <Check size={12} strokeWidth={3} />}
            </button>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm leading-snug ${
                  item.done
                    ? "text-[var(--color-text-tertiary)] line-through"
                    : "font-medium text-[var(--color-text)]"
                }`}
              >
                {item.title}
              </p>
              {item.dueDate && (
                <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                  Due {new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="shrink-0 pt-0.5 text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-red-600"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
