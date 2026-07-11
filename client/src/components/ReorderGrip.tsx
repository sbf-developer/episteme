import { GripVertical } from "lucide-react";

export function ReorderGrip() {
  return (
    <GripVertical
      size={14}
      strokeWidth={1.75}
      className="mt-0.5 shrink-0 cursor-grab text-[var(--color-text-tertiary)] active:cursor-grabbing"
      aria-hidden
    />
  );
}

export function reorderRowClass(isDragOver?: boolean) {
  return isDragOver
    ? "bg-[var(--color-border-subtle)] ring-1 ring-[var(--color-border)]"
    : "";
}
