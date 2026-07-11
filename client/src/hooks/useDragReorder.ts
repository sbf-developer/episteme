import { useCallback, useEffect, useRef, useState } from "react";

export function useDragReorder<T extends { id: string }>(
  items: T[],
  onReorder: (orderedIds: string[]) => void | Promise<void>
) {
  const dragId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [optimisticItems, setOptimisticItems] = useState<T[] | null>(null);

  useEffect(() => {
    setOptimisticItems(null);
  }, [items]);

  const displayItems = optimisticItems ?? items;

  const commitReorder = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return;
      const list = [...displayItems];
      const fromIdx = list.findIndex((i) => i.id === fromId);
      const toIdx = list.findIndex((i) => i.id === toId);
      if (fromIdx < 0 || toIdx < 0) return;
      const [moved] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, moved);
      setOptimisticItems(list);
      void Promise.resolve(onReorder(list.map((i) => i.id))).catch(() =>
        setOptimisticItems(null)
      );
    },
    [displayItems, onReorder]
  );

  const rowProps = useCallback(
    (id: string) => ({
      draggable: true as const,
      onDragStart: () => {
        dragId.current = id;
      },
      onDragEnter: () => setDragOverId(id),
      onDragLeave: () => setDragOverId(null),
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDrop: () => {
        if (dragId.current) commitReorder(dragId.current, id);
        dragId.current = null;
        setDragOverId(null);
      },
      onDragEnd: () => {
        dragId.current = null;
        setDragOverId(null);
      },
      "data-drag-over": dragOverId === id ? true : undefined,
    }),
    [commitReorder, dragOverId]
  );

  return { displayItems, rowProps, dragOverId };
}
