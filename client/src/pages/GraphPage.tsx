import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api, type GraphData } from "@/lib/api";
import { Button } from "@/components/ui/Button";

const typeColors: Record<string, string> = {
  DOCUMENT: "#0071e3",
  GOAL: "#34c759",
  ACTION: "#ff9500",
};

function graphToFlow(data: GraphData): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = data.nodes.map((n, i) => ({
    id: n.id,
    data: { label: n.label, type: n.type },
    position: { x: (i % 4) * 220, y: Math.floor(i / 4) * 120 },
    style: {
      background: "#fff",
      border: `1.5px solid ${typeColors[n.type] ?? "#ccc"}`,
      borderRadius: 10,
      padding: "8px 14px",
      fontSize: 13,
      fontWeight: 500,
      minWidth: 120,
      textAlign: "center" as const,
    },
  }));

  const edges: Edge[] = data.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label ?? undefined,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    style: { stroke: "#c8c8c8", strokeWidth: 1.5 },
    labelStyle: { fontSize: 11, fill: "#9a9a9a" },
  }));

  return { nodes, edges };
}

export function GraphPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await api.connections.graph();
    const flow = graphToFlow(data);
    setNodes(flow.nodes);
    setEdges(flow.edges);
    setLoading(false);
  }, [setNodes, setEdges]);

  useEffect(() => {
    load();
  }, [load]);

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const [sourceType, sourceId] = connection.source.split(":") as [
        "DOCUMENT" | "GOAL" | "ACTION",
        string,
      ];
      const [targetType, targetId] = connection.target.split(":") as [
        "DOCUMENT" | "GOAL" | "ACTION",
        string,
      ];

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
              style: { stroke: "#c8c8c8", strokeWidth: 1.5 },
            },
            eds
          )
        );
      } catch {
        // duplicate connection
      }
    },
    [setEdges]
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Knowledge Graph</h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Drag between nodes to connect ideas. Blue = notes, green = goals, orange = actions.
          </p>
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
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
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
