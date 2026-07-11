import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  ConnectionMode,
  type Connection,
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Trash2 } from "lucide-react";
import { api, type GraphData } from "@/lib/api";
import { GraphNode } from "@/components/GraphNode";
import { Button } from "@/components/ui/Button";

const nodeTypes = { graph: GraphNode };

const typeColors: Record<string, string> = {
  DOCUMENT: "#0071e3",
  GOAL: "#34c759",
  ACTION: "#ff9500",
  DO_ITEM: "#ff9500",
  CALENDAR_EVENT: "#af52de",
  FILE: "#5856d6",
};

function defaultPosition(index: number) {
  return { x: (index % 4) * 240, y: Math.floor(index / 4) * 140 };
}

function graphToFlow(data: GraphData): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = data.nodes.map((n, i) => {
    const saved = data.positions?.[n.id];
    return {
      id: n.id,
      type: "graph",
      data: { label: n.label, type: n.type },
      position: saved ?? defaultPosition(i),
      draggable: true,
      connectable: true,
    };
  });

  const edges: Edge[] = data.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label ?? undefined,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    style: { stroke: "#b0b0b0", strokeWidth: 1.5 },
    labelStyle: { fontSize: 11, fill: "#9a9a9a" },
    deletable: true,
    interactionWidth: 24,
  }));

  return { nodes, edges };
}

export function GraphPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const fitOnce = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const savePositions = useCallback((currentNodes: Node[]) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.connections.saveLayout(
        currentNodes.map((n) => ({
          nodeKey: n.id,
          x: n.position.x,
          y: n.position.y,
        }))
      );
    }, 500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.connections.graph();
      const flow = graphToFlow(data);
      setNodes(flow.nodes);
      setEdges(flow.edges);
      fitOnce.current = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load graph");
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    load();
    return () => clearTimeout(saveTimer.current);
  }, [load]);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const onNodeDragStop = useCallback(() => {
    savePositions(nodesRef.current);
  }, [savePositions]);

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;

      const sourceParts = connection.source.split(":");
      const targetParts = connection.target.split(":");
      if (sourceParts.length < 2 || targetParts.length < 2) return;

      const [sourceType, sourceId] = sourceParts as [
        "DOCUMENT" | "GOAL" | "ACTION" | "DO_ITEM" | "CALENDAR_EVENT" | "FILE",
        string,
      ];
      const [targetType, targetId] = targetParts as [
        "DOCUMENT" | "GOAL" | "ACTION" | "DO_ITEM" | "CALENDAR_EVENT" | "FILE",
        string,
      ];

      setConnectError(null);
      try {
        const conn = await api.connections.create({
          sourceType,
          sourceId,
          targetType,
          targetId,
        });
        setEdges((eds) =>
          addEdge(
            {
              ...connection,
              id: conn.id,
              markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
              style: { stroke: "#b0b0b0", strokeWidth: 1.5 },
              deletable: true,
              interactionWidth: 24,
            },
            eds
          )
        );
      } catch (err) {
        setConnectError(err instanceof Error ? err.message : "Failed to create connection");
      }
    },
    [setEdges]
  );

  const onEdgesDelete = useCallback(
    async (deleted: Edge[]) => {
      setSelectedEdgeId(null);
      const results = await Promise.allSettled(
        deleted.map((e) => api.connections.delete(e.id))
      );
      const failed = results.some((r) => r.status === "rejected");
      if (failed) {
        setConnectError("Some connections could not be deleted");
        load();
      }
    },
    [load]
  );

  const removeSelectedEdge = useCallback(async () => {
    if (!selectedEdgeId) return;
    const edge = edges.find((e) => e.id === selectedEdgeId);
    if (!edge) return;

    setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
    setConnectError(null);

    try {
      await api.connections.delete(selectedEdgeId);
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Could not delete connection");
      load();
    }
  }, [selectedEdgeId, edges, setEdges, load]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 px-4">
        <p className="text-center text-sm text-[var(--color-text-secondary)]">{error}</p>
        <Button variant="secondary" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-col gap-2 border-b border-[var(--color-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">Knowledge Graph</h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Click a line to select it, then Remove — or press Delete / Backspace
          </p>
          {connectError && <p className="mt-1 text-xs text-red-600">{connectError}</p>}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {selectedEdgeId && (
            <Button variant="danger" className="w-full sm:w-auto" onClick={removeSelectedEdge}>
              <Trash2 size={15} />
              Remove line
            </Button>
          )}
          <Button variant="secondary" className="w-full sm:w-auto" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {nodes.length === 0 ? (
          <div className="flex h-full min-h-[40vh] items-center justify-center px-4 text-center text-sm text-[var(--color-text-tertiary)]">
            Create notes, goals, or to-dos to see them here.
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onEdgesDelete={onEdgesDelete}
            onSelectionChange={({ edges: selected }) => {
              setSelectedEdgeId(selected[0]?.id ?? null);
            }}
            onPaneClick={() => setSelectedEdgeId(null)}
            connectionMode={ConnectionMode.Loose}
            nodesDraggable
            nodesConnectable
            elementsSelectable
            onInit={(instance) => {
              if (!fitOnce.current) {
                instance.fitView({ padding: 0.15 });
                fitOnce.current = true;
              }
            }}
            defaultEdgeOptions={{
              markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
              style: { stroke: "#b0b0b0", strokeWidth: 1.5 },
              interactionWidth: 24,
              deletable: true,
            }}
            connectionLineStyle={{ stroke: "#0071e3", strokeWidth: 2 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1} color="#f0f0f0" />
            <Controls showInteractive={false} className="!bottom-2 !left-2" />
            <MiniMap
              className="!hidden sm:!block"
              nodeColor={(n) => typeColors[(n.data as { type: string }).type] ?? "#ccc"}
              maskColor="rgba(0,0,0,0.05)"
            />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
