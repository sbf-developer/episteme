import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const typeColors: Record<string, string> = {
  DOCUMENT: "#0071e3",
  GOAL: "#34c759",
  ACTION: "#ff9500",
  DO_ITEM: "#ff9500",
  CALENDAR_EVENT: "#af52de",
  FILE: "#5856d6",
};

export type GraphNodeData = {
  label: string;
  type: string;
};

const positions = [Position.Top, Position.Right, Position.Bottom, Position.Left];

function GraphNodeComponent({ data }: NodeProps) {
  const d = data as GraphNodeData;
  const color = typeColors[d.type] ?? "#ccc";

  return (
    <div
      className="graph-node"
      style={{
        background: "#fff",
        border: `1.5px solid ${color}`,
        borderRadius: 10,
        padding: "10px 16px",
        fontSize: 13,
        fontWeight: 500,
        minWidth: 100,
        maxWidth: 220,
        textAlign: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {positions.map((pos) => (
        <Handle
          key={pos}
          type="source"
          position={pos}
          style={{
            width: 9,
            height: 9,
            background: "#888",
            border: "2px solid #fff",
          }}
        />
      ))}
      <span className="leading-snug">{d.label}</span>
    </div>
  );
}

export const GraphNode = memo(GraphNodeComponent);
