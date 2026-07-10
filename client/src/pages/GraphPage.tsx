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
import { api, type GraphData } from "@/lib/api";
import { GraphNode } from "@/components/GraphNode";
import { Button } from "@/components/ui/Button";

const nodeTypes = { graph: GraphNode };

const typeColors: Record<string, string> = {
  DOCUMENT: "#0071e3",
  GOAL: "#34c759",
  ACTION: "#ff9500",
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
  }));

  return { nodes, edges };
}

export function GraphPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
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
        "DOCUMENT" | "GOAL" | "ACTION" | "CALENDAR_EVENT" | "FILE",
        string,
      ];
      const [targetType, targetId] = targetParts as [
        "DOCUMENT" | "GOAL" | "ACTION" | "CALENDAR_EVENT" | "FILE",
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-[var(--color-text-secondary)]">{error}</p>
        <Button variant="secondary" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Knowledge Graph</h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Drag nodes to arrange · drag from a dot to connect · select an edge and press Delete to remove
          </p>
          {connectError && (
            <p className="mt-1 text-xs text-red-600">{connectError}</p>
          )}
        </div>
        <Button variant="secondary" onClick={load}>
          Refresh
        </Button>
      </div>

      <div className="flex-1">
        {nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-tertiary)]">
            Create notes, goals, or actions to see them here.
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
            }}
            connectionLineStyle={{ stroke: "#0071e3", strokeWidth: 2 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1} color="#f0f0f0" />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={(n) => typeColors[(n.data as { type: string }).type] ?? "#ccc"}
              maskColor="rgba(0,0,0,0.05)"
            />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
