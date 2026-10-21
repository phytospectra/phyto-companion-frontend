"use client";

import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Network, NetworkEdge, NetworkNode } from "@/lib/phyto/types";
import { cn } from "@/lib/utils";

const W = 600;
const H = 360;

interface NetworkGraphProps {
  network: Network;
  /** Which modality styling to use — affects edge colour and node colour. */
  modality: "MS2" | "HSQC" | "Fused" | "Bioactivity";
  /** Minimum score for an edge to be visible (0–1). */
  minScore?: number;
  onNodeClick?: (node: NetworkNode) => void;
  onEdgeClick?: (edge: NetworkEdge) => void;
  className?: string;
}

/**
 * NetworkGraph — a small SVG-based network visualiser. In the real app
 * this would be a Cytoscape.js wrapper (`src/components/network/NetworkGraph.tsx`)
 * consuming the JSON returned by `POST /networks/export/cytoscape`. In the
 * sandbox demo we render an equivalent layout in SVG so the user can see
 * the same visual semantics (modality-coded edges, propagated_from nodes,
 * bioactivity node sizing) without pulling in Cytoscape.
 *
 * Layout: deterministic circular placement; MS2 nodes on the outer ring,
 * HSQC nodes on an inner ring. Edge styling encodes the per-spec rules:
 *   MS2: solid edges, colour = cosine (green high, red low)
 *   HSQC: dashed edges, colour = distance (dark strong)
 *   Fused: node colour = modality (blue=MS2 only, green=HSQC only, purple=both)
 *   Bioactivity: node size = |r|, colour = p-value
 */
export function NetworkGraph({
  network,
  modality,
  minScore = 0,
  onNodeClick,
  onEdgeClick,
  className,
}: NetworkGraphProps) {
  const ms2Nodes = network.nodes.filter((n) => n.modality !== "HSQC");
  const hsqcNodes = network.nodes.filter((n) => n.modality === "HSQC");
  const fusedHasBoth = network.nodes.some((n) => n.modality === "both");

  // Position nodes: MS2 on outer ring, HSQC on inner ring.
  const positions = React.useMemo(() => {
    const cx = W / 2;
    const cy = H / 2;
    const map = new Map<string, { x: number; y: number }>();
    const rOuter = Math.min(W, H) / 2 - 30;
    const rInner = rOuter * 0.55;
    const placeRing = (
      arr: NetworkNode[],
      r: number
    ) => {
      const n = arr.length;
      arr.forEach((node, i) => {
        const angle = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
        map.set(node.id, {
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        });
      });
    };
    placeRing(ms2Nodes, rOuter);
    placeRing(hsqcNodes, rInner);
    return map;
  }, [ms2Nodes, hsqcNodes]);

  const visibleEdges = network.edges.filter((e) => e.score >= minScore);

  const edgeStyle = (e: NetworkEdge): { stroke: string; dash: string } => {
    if (modality === "HSQC") {
      // dashed; colour by distance (dark = strong => we invert score, so
      // high score => dark green)
      return {
        stroke: e.score > 0.85 ? "#065f46" : e.score > 0.7 ? "#10b981" : "#6ee7b7",
        dash: "4 3",
      };
    }
    // MS2 / Fused / Bioactivity: solid edges coloured by score
    if (e.score > 0.75) return { stroke: "#16a34a", dash: "" }; // green-600 high
    if (e.score > 0.5) return { stroke: "#eab308", dash: "" }; // yellow-500 mid
    return { stroke: "#dc2626", dash: "" }; // red-600 low
  };

  const nodeStyle = (node: NetworkNode): { fill: string; r: number } => {
    if (modality === "Bioactivity") {
      const r = Math.abs(node.bioactivity_r ?? 0);
      const p = node.bioactivity_p ?? 1;
      const size = 6 + r * 14;
      const fill = p < 0.01 ? "#15803d" : p < 0.05 ? "#65a30d" : "#a3a3a3";
      return { fill, r: size };
    }
    if (modality === "Fused") {
      if (node.modality === "both") return { fill: "#8b5cf6", r: 10 };
      if (node.modality === "MS2") return { fill: "#2563eb", r: 8 };
      return { fill: "#16a34a", r: 8 };
    }
    if (modality === "HSQC") return { fill: "#16a34a", r: 8 };
    return { fill: "#2563eb", r: 8 };
  };

  return (
    <svg
      role="img"
      aria-label={`Network graph: ${network.nodes.length} nodes, ${visibleEdges.length} edges (${modality})`}
      viewBox={`0 0 ${W} ${H}`}
      className={cn("w-full", className)}
      style={{ maxHeight: "380px" }}
    >
      <g>
        {visibleEdges.map((e, i) => {
          const s = positions.get(e.source);
          const t = positions.get(e.target);
          if (!s || !t) return null;
          const { stroke, dash } = edgeStyle(e);
          return (
            <Tooltip key={`e-${i}`}>
              <TooltipTrigger asChild>
                <line
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  stroke={stroke}
                  strokeWidth={1.5}
                  strokeDasharray={dash || undefined}
                  opacity={0.7}
                  onClick={() => onEdgeClick?.(e)}
                  className="cursor-pointer"
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-left">
                <div className="text-xs space-y-0.5">
                  <div className="font-semibold">
                    {e.source} ↔ {e.target}
                  </div>
                  <div>modality: {e.modality}</div>
                  <div>score: {e.score.toFixed(3)}</div>
                  <div>{e.is_transitive ? "transitive edge" : "direct edge"}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </g>
      <g>
        {network.nodes.map((node) => {
          const p = positions.get(node.id);
          if (!p) return null;
          const { fill, r } = nodeStyle(node);
          return (
            <Tooltip key={node.id}>
              <TooltipTrigger asChild>
                <g
                  tabIndex={0}
                  role="button"
                  aria-label={`Node ${node.label}${node.annotation ? `: ${node.annotation.name}` : ""}`}
                  onClick={() => onNodeClick?.(node)}
                  className="cursor-pointer"
                >
                  {node.propagated_from && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={r + 4}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={1}
                      strokeDasharray="2 2"
                    />
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    fill={fill}
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                  <text
                    x={p.x}
                    y={p.y + r + 12}
                    textAnchor="middle"
                    className="fill-foreground text-[10px]"
                  >
                    {node.label}
                  </text>
                </g>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px] text-left">
                <div className="text-xs space-y-1">
                  <div className="font-semibold">{node.label}</div>
                  {node.annotation && (
                    <div>
                      annotation: {node.annotation.name} (MSI level{" "}
                      {node.annotation.msi_level})
                    </div>
                  )}
                  <div>modality: {node.modality}</div>
                  {node.propagated_from && (
                    <div>propagated from: {node.propagated_from}</div>
                  )}
                  {node.bioactivity_r !== undefined && (
                    <div>
                      bioactivity r = {node.bioactivity_r.toFixed(2)}, p ={" "}
                      {node.bioactivity_p?.toFixed(3)}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </g>
      {fusedHasBoth && modality === "Fused" && (
        <text
          x={W - 8}
          y={H - 6}
          textAnchor="end"
          className="fill-muted-foreground text-[10px]"
        >
          blue=MS2 only · green=HSQC only · purple=both
        </text>
      )}
    </svg>
  );
}
