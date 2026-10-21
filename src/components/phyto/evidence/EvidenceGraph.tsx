"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EvidenceEdge, EvidenceGraph as EvidenceGraphT, EvidenceNode } from "@/lib/phyto/types";
import { cn } from "@/lib/utils";

const NODE_R = 8;
const W = 280;
const H = 220;

/**
 * EvidenceGraph — a tiny SVG visualisation of an evidence graph for use
 * inside the EvidencePanel slide-over.
 *
 * Nodes are positioned on a circle (deterministic, no layout engine).
 * Node colour encodes type:
 *   - observation (green): something the spectrum actually showed
 *   - prediction (blue): something a model predicted
 *   - match (purple): an observed↔predicted pairing
 *   - gap (orange, dashed outline): an unmatched peak or contradiction
 *
 * Edges encode relation: supports (solid), contradicts (red), gap (dashed).
 *
 * Per spec:
 *   "Every candidate, network node, and mechanism claim has an 'Evidence'
 *    button that opens a panel showing: supporting spectral features,
 *    unmatched observed peaks (gaps), unmatched predicted peaks (gaps),
 *    cross-modal propagation chains, and citations."
 */
function nodeColor(type: EvidenceNode["type"]): string {
  switch (type) {
    case "observation":
      return "#10b981"; // emerald-500
    case "prediction":
      return "#6366f1"; // indigo-500 (we only use indigo inside this graph
      // viz where it carries an extra semantic dimension; not as a UI
      // accent colour elsewhere)
    case "match":
      return "#8b5cf6"; // violet-500
    case "gap":
      return "#f97316"; // orange-500
  }
}

function edgeStroke(relation: EvidenceEdge["relation"]): {
  stroke: string;
  dash: string;
} {
  switch (relation) {
    case "supports":
      return { stroke: "#94a3b8", dash: "" };
    case "contradicts":
      return { stroke: "#ef4444", dash: "4 3" };
    case "gap":
      return { stroke: "#f97316", dash: "3 3" };
  }
}

interface EvidenceGraphProps {
  graph: EvidenceGraphT;
  className?: string;
}

export function EvidenceGraph({ graph, className }: EvidenceGraphProps) {
  const { nodes, edges } = graph;
  // Position nodes on a circle inside the SVG viewBox. Graph is always
  // small (≤ ~10 nodes per spec) so we compute positions inline; no
  // memo needed.
  const cx = W / 2;
  const cy = H / 2;
  const r = Math.min(W, H) / 2 - NODE_R * 2.5;
  const positions = new Map<string, { x: number; y: number }>(
    nodes.map((node, i) => {
      const angle =
        (i / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
      return [
        node.id,
        { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) },
      ];
    })
  );

  return (
    <svg
      role="img"
      aria-label={`Evidence graph with ${nodes.length} claims and ${edges.length} relations`}
      viewBox={`0 0 ${W} ${H}`}
      className={cn("w-full", className)}
      style={{ maxHeight: "260px" }}
    >
      {/* Edges first (under nodes) */}
      <g>
        {edges.map((e, i) => {
          const s = positions.get(e.source);
          const t = positions.get(e.target);
          if (!s || !t) return null;
          const { stroke, dash } = edgeStroke(e.relation);
          return (
            <line
              key={`e-${i}`}
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              stroke={stroke}
              strokeWidth={1.2}
              strokeDasharray={dash || undefined}
              opacity={0.75}
            />
          );
        })}
      </g>
      {/* Nodes */}
      <g>
        {nodes.map((node) => {
          const p = positions.get(node.id);
          if (!p) return null;
          const fill = nodeColor(node.type);
          const isGap = node.type === "gap";
          return (
            <Tooltip key={node.id}>
              <TooltipTrigger asChild>
                <g
                  tabIndex={0}
                  role="button"
                  aria-label={`${node.type}: ${node.claim}`}
                  className="cursor-help"
                >
                  {isGap && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={NODE_R + 3}
                      fill="none"
                      stroke={fill}
                      strokeWidth={1}
                      strokeDasharray="2 2"
                    />
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={NODE_R}
                    fill={fill}
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                </g>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-[240px] text-left"
              >
                <div className="space-y-1 text-xs">
                  <div className="font-semibold uppercase tracking-wide text-[10px]">
                    {node.type}
                  </div>
                  <div className="font-normal">{node.claim}</div>
                  {node.confidence !== undefined && (
                    <div className="text-muted-foreground">
                      confidence: {node.confidence.toFixed(2)}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </g>
    </svg>
  );
}
