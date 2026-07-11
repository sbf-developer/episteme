import { useEffect, useState } from "react";
import { Plus, Gauge } from "lucide-react";
import { api, type Kpi } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function progressPercent(kpi: Kpi) {
  if (kpi.targetValue === 0) return 0;
  return Math.min(100, Math.round((kpi.currentValue / kpi.targetValue) * 100));
}

export function KpisPage() {
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const load = () => api.kpis.list().then(setKpis);
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    const target = parseFloat(newTarget);
    if (!newTitle.trim() || Number.isNaN(target)) return;
    await api.kpis.create({ title: newTitle.trim(), targetValue: target });
    setNewTitle("");
    setNewTarget("");
    load();
  };

  const update = async (id: string, data: Partial<Kpi>) => {
    await api.kpis.update(id, data);
    load();
    setEditing(null);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this KPI?")) return;
    await api.kpis.delete(id);
    load();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">KPIs</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Track the numbers that matter most.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Metric name…"
          className="flex-1"
        />
        <Input
          value={newTarget}
          onChange={(e) => setNewTarget(e.target.value)}
          placeholder="Target"
          type="number"
          className="w-full sm:w-28"
        />
        <Button variant="subtle" onClick={create}>
          <Plus size={15} strokeWidth={2} />
          Add
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {kpis.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-16 text-center">
            <Gauge size={32} className="mx-auto text-[var(--color-text-tertiary)]" />
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">No KPIs yet</p>
          </div>
        ) : (
          kpis.map((kpi) => (
            <div
              key={kpi.id}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4"
            >
              {editing === kpi.id ? (
                <EditKpi kpi={kpi} onSave={(d) => update(kpi.id, d)} onCancel={() => setEditing(null)} />
              ) : (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium">{kpi.title}</h3>
                      {kpi.description && (
                        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{kpi.description}</p>
                      )}
                      <p className="mt-2 text-sm text-[var(--color-text)]">
                        <span className="font-semibold">{kpi.currentValue}</span>
                        {kpi.unit && <span className="text-[var(--color-text-tertiary)]"> {kpi.unit}</span>}
                        <span className="text-[var(--color-text-tertiary)]"> / {kpi.targetValue}</span>
                        {kpi.unit && <span className="text-[var(--color-text-tertiary)]"> {kpi.unit}</span>}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" onClick={() => setEditing(kpi.id)}>
                        Edit
                      </Button>
                      <Button variant="ghost" onClick={() => remove(kpi.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border-subtle)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                        style={{ width: `${progressPercent(kpi)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">{progressPercent(kpi)}% of target</p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Input
                      type="number"
                      defaultValue={kpi.currentValue}
                      className="w-28"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = parseFloat((e.target as HTMLInputElement).value);
                          if (!Number.isNaN(val)) update(kpi.id, { currentValue: val });
                        }
                      }}
                    />
                    <span className="text-xs text-[var(--color-text-tertiary)]">Update current value, press Enter</span>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EditKpi({
  kpi,
  onSave,
  onCancel,
}: {
  kpi: Kpi;
  onSave: (data: Partial<Kpi>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(kpi.title);
  const [description, setDescription] = useState(kpi.description);
  const [currentValue, setCurrentValue] = useState(String(kpi.currentValue));
  const [targetValue, setTargetValue] = useState(String(kpi.targetValue));
  const [unit, setUnit] = useState(kpi.unit);

  return (
    <div className="space-y-3">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description…"
        className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        rows={2}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} type="number" placeholder="Current" />
        <Input value={targetValue} onChange={(e) => setTargetValue(e.target.value)} type="number" placeholder="Target" />
        <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit (%, $, etc.)" />
      </div>
      <div className="flex gap-2">
        <Button
          variant="primary"
          onClick={() => {
            const current = parseFloat(currentValue);
            const target = parseFloat(targetValue);
            if (!title.trim() || Number.isNaN(target)) return;
            onSave({
              title,
              description,
              currentValue: Number.isNaN(current) ? 0 : current,
              targetValue: target,
              unit,
            });
          }}
        >
          Save
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
