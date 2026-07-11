import { useRef, useState } from "react";
import { GripVertical, Eye, EyeOff, RotateCcw } from "lucide-react";

export type LayoutSectionConfig = {
  id: string;
  visible: boolean;
};

export type LayoutConfig = {
  sections: LayoutSectionConfig[];
};

type Props = {
  layout: LayoutConfig;
  labels: Record<string, string>;
  onChange: (layout: LayoutConfig) => void;
  onReset: () => void;
  saving?: boolean;
  hint?: string;
};

export function OverviewCustomize({
  layout,
  labels,
  onChange,
  onReset,
  saving,
  hint = "Drag to reorder. Hide sections you don't need — nothing is deleted.",
}: Props) {
  const dragId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const visible = layout.sections.filter((s) => s.visible);
  const hidden = layout.sections.filter((s) => !s.visible);

  const reorder = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const sections = [...layout.sections];
    const fromIndex = sections.findIndex((s) => s.id === fromId);
    const toIndex = sections.findIndex((s) => s.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = sections.splice(fromIndex, 1);
    sections.splice(toIndex, 0, moved);
    onChange({ sections });
  };

  const setVisible = (id: string, visible: boolean) => {
    onChange({
      sections: layout.sections.map((s) => (s.id === id ? { ...s, visible } : s)),
    });
  };

  return (
    <div className="rounded-xl bg-[var(--color-border-subtle)] px-3 py-4 sm:px-4">
      <p className="mb-3 text-xs text-[var(--color-text-tertiary)]">{hint}</p>

      <div className="space-y-1">
        {visible.map((section) => (
          <CustomizeRow
            key={section.id}
            section={section}
            labels={labels}
            dragOver={dragOverId === section.id}
            saving={saving}
            onDragStart={() => {
              dragId.current = section.id;
            }}
            onDragEnter={() => setDragOverId(section.id)}
            onDragLeave={() => setDragOverId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragId.current) reorder(dragId.current, section.id);
              dragId.current = null;
              setDragOverId(null);
            }}
            onDragEnd={() => {
              dragId.current = null;
              setDragOverId(null);
            }}
            onToggle={() => setVisible(section.id, false)}
            toggleLabel="Hide"
            toggleIcon={<EyeOff size={14} strokeWidth={1.75} />}
          />
        ))}
      </div>

      {hidden.length > 0 && (
        <div className="mt-4 border-t border-[var(--color-border)] pt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]">
            Hidden
          </p>
          <div className="space-y-1">
            {hidden.map((section) => (
              <CustomizeRow
                key={section.id}
                section={section}
                labels={labels}
                muted
                saving={saving}
                onToggle={() => setVisible(section.id, true)}
                toggleLabel="Show"
                toggleIcon={<Eye size={14} strokeWidth={1.75} />}
              />
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onReset}
        disabled={saving}
        className="mt-4 flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text)] disabled:opacity-50"
      >
        <RotateCcw size={13} />
        Reset to default
      </button>
    </div>
  );
}

function CustomizeRow({
  section,
  labels,
  muted,
  dragOver,
  saving,
  onDragStart,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onDragEnd,
  onToggle,
  toggleLabel,
  toggleIcon,
}: {
  section: LayoutSectionConfig;
  labels: Record<string, string>;
  muted?: boolean;
  dragOver?: boolean;
  saving?: boolean;
  onDragStart?: () => void;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  onToggle: () => void;
  toggleLabel: string;
  toggleIcon: React.ReactNode;
}) {
  const draggable = !!onDragStart;

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-2 rounded-lg px-2 py-2 transition-colors ${
        dragOver ? "bg-white" : muted ? "opacity-70" : "bg-[var(--color-surface-elevated)]"
      }`}
    >
      {draggable ? (
        <GripVertical
          size={14}
          className="shrink-0 cursor-grab text-[var(--color-text-tertiary)] active:cursor-grabbing"
        />
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      <span className="min-w-0 flex-1 text-sm text-[var(--color-text)]">
        {labels[section.id] ?? section.id}
      </span>
      <button
        type="button"
        onClick={onToggle}
        disabled={saving}
        className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-border-subtle)] hover:text-[var(--color-text)] disabled:opacity-50"
      >
        {toggleIcon}
        {toggleLabel}
      </button>
    </div>
  );
}
