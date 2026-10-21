"use client";

import * as React from "react";
import { Download, Filter, Layers, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/phyto/layout/PageHeader";
import { NetworkGraph } from "@/components/phyto/network/NetworkGraph";
import { CostBadge } from "@/components/phyto/common/CostBadge";
import { mockApi, newIdempotencyKey } from "@/lib/phyto/mock-api";
import { PRICING_TABLE } from "@/lib/phyto/constants";
import type { Network, NetworkEdge, NetworkNode } from "@/lib/phyto/types";
import { cn } from "@/lib/utils";

type Modality = "MS2" | "HSQC" | "Fused" | "Bioactivity";

const MODALITY_META: Record<
  Modality,
  { cost: number; description: string }
> = {
  MS2: {
    cost: PRICING_TABLE.network_ms2,
    description: "Solid edges, cosine-coloured (green high, red low). Nodes are observed [M+H]+ masses.",
  },
  HSQC: {
    cost: PRICING_TABLE.network_hsqc,
    description: "Dashed edges, distance-coloured (dark = strong). Nodes are C/H correlations.",
  },
  Fused: {
    cost: PRICING_TABLE.network_fused,
    description: "Node colour = modality (blue=MS2 only, green=HSQC only, purple=both). Cross-modal links solid.",
  },
  Bioactivity: {
    cost: PRICING_TABLE.network_bioactivity,
    description: "Node size by |r|, colour by p-value. Orange dashed ring = propagated_from.",
  },
};

export function NetworkPage() {
  const [modality, setModality] = React.useState<Modality>("MS2");
  const [network, setNetwork] = React.useState<Network | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [minScore, setMinScore] = React.useState(0);
  const [showTransitive, setShowTransitive] = React.useState(true);
  const [selectedNode, setSelectedNode] = React.useState<NetworkNode | null>(null);
  const [selectedEdge, setSelectedEdge] = React.useState<NetworkEdge | null>(null);

  const fetchNetwork = React.useCallback(async (m: Modality) => {
    setLoading(true);
    try {
      const n = await mockApi.getNetwork(m, newIdempotencyKey());
      setNetwork(n);
    } catch {
      // 402 handled by global modal
    } finally {
      setLoading(false);
    }
  }, []);

  // Load default network on first mount.
  React.useEffect(() => {
    fetchNetwork("MS2");
  }, [fetchNetwork]);

  function switchModality(m: Modality) {
    setModality(m);
    setNetwork(null);
    setSelectedNode(null);
    setSelectedEdge(null);
    fetchNetwork(m);
  }

  function exportPng() {
    toast({ title: "Export queued", description: "PNG export would render the SVG to canvas in production." });
  }
  function exportJson() {
    if (!network) return;
    const blob = new Blob([JSON.stringify(network, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `phytospectra-${modality}-network.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Networking"
        title="Spectral networks"
        description="Four modalities, one graph viewer. Click a node for its annotation, MSI level, and evidence; click an edge for score and modality. Every fetch costs tokens — the badge shows the cost before you switch."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportPng} className="gap-1.5">
              <Download aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
              PNG
            </Button>
            <Button variant="outline" size="sm" onClick={exportJson} className="gap-1.5">
              <Download aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
              Cytoscape JSON
            </Button>
          </div>
        }
      />

      <Tabs value={modality} onValueChange={(v) => switchModality(v as Modality)}>
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="MS2" className="gap-1.5">
            MS2
            <CostBadge cost={MODALITY_META.MS2.cost} size="sm" />
          </TabsTrigger>
          <TabsTrigger value="HSQC" className="gap-1.5">
            HSQC
            <CostBadge cost={MODALITY_META.HSQC.cost} size="sm" />
          </TabsTrigger>
          <TabsTrigger value="Fused" className="gap-1.5">
            Fused
            <CostBadge cost={MODALITY_META.Fused.cost} size="sm" />
          </TabsTrigger>
          <TabsTrigger value="Bioactivity" className="gap-1.5">
            Bioactivity
            <CostBadge cost={MODALITY_META.Bioactivity.cost} size="sm" />
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 text-xs text-muted-foreground">
          {MODALITY_META[modality].description}
        </div>

        {(["MS2", "HSQC", "Fused", "Bioactivity"] as const).map((m) => (
          <TabsContent key={m} value={m} className="mt-4">
            <div className="grid gap-6 lg:grid-cols-4">
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers aria-hidden="true" style={{ width: "1rem", height: "1rem" }} />
                      {m} network
                    </CardTitle>
                    <CardDescription>
                      {MODALITY_META[m].description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading || !network ? (
                      <div className="grid h-[380px] place-items-center">
                        <Skeleton className="h-full w-full rounded-md" />
                      </div>
                    ) : (
                      <NetworkGraph
                        network={filterNetwork(network, minScore, showTransitive)}
                        modality={m}
                        minScore={minScore}
                        onNodeClick={(n) => setSelectedNode(n)}
                        onEdgeClick={(e) => setSelectedEdge(e)}
                      />
                    )}
                    <Legend modality={m} />
                  </CardContent>
                </Card>
              </div>

              {/* Filters + selection panel */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Filter aria-hidden="true" style={{ width: "0.95rem", height: "0.95rem" }} />
                      Filters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="net-score" className="text-xs">
                        Min score: {minScore.toFixed(2)}
                      </Label>
                      <Slider
                        id="net-score"
                        value={[minScore]}
                        onValueChange={(v) => setMinScore(v[0])}
                        min={0}
                        max={1}
                        step={0.05}
                        aria-label="Minimum edge score"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="net-trans" className="text-xs">
                        Show transitive edges
                      </Label>
                      <Switch
                        id="net-trans"
                        checked={showTransitive}
                        onCheckedChange={setShowTransitive}
                        aria-label="Toggle transitive edges"
                      />
                    </div>
                    <div className="rounded-md border border-slate-200 bg-muted/30 p-2 text-[11px] text-muted-foreground dark:border-slate-700">
                      <div className="flex items-center gap-1 font-medium">
                        <Info aria-hidden="true" style={{ width: "0.75rem", height: "0.75rem" }} />
                        Nodes: {network?.nodes.length ?? 0} · Edges: {network?.edges.length ?? 0}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedNode ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Selected node</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <Detail k="label" v={selectedNode.label} />
                      <Detail k="modality" v={selectedNode.modality} />
                      {selectedNode.annotation && (
                        <>
                          <Detail k="annotation" v={selectedNode.annotation.name} />
                          <Detail k="MSI level" v={String(selectedNode.annotation.msi_level)} />
                        </>
                      )}
                      {selectedNode.propagated_from && (
                        <Detail k="propagated from" v={selectedNode.propagated_from} />
                      )}
                      {selectedNode.bioactivity_r !== undefined && (
                        <>
                          <Detail k="r" v={selectedNode.bioactivity_r.toFixed(2)} />
                          <Detail k="p" v={selectedNode.bioactivity_p?.toFixed(3) ?? "—"} />
                        </>
                      )}
                    </CardContent>
                  </Card>
                ) : selectedEdge ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Selected edge</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <Detail k="source" v={selectedEdge.source} />
                      <Detail k="target" v={selectedEdge.target} />
                      <Detail k="modality" v={selectedEdge.modality} />
                      <Detail k="score" v={selectedEdge.score.toFixed(3)} />
                      <Detail k="transitive" v={String(selectedEdge.is_transitive)} />
                    </CardContent>
                  </Card>
                ) : (
                  <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground text-center">
                    Click a node or edge in the graph to see details.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function filterNetwork(
  n: Network,
  minScore: number,
  showTransitive: boolean
): Network {
  return {
    ...n,
    edges: n.edges.filter(
      (e) => e.score >= minScore && (showTransitive || !e.is_transitive)
    ),
  };
}

function Legend({ modality }: { modality: Modality }) {
  const items: { color: string; label: string; dashed?: boolean }[] =
    modality === "Bioactivity"
      ? [
          { color: "#15803d", label: "p < 0.01" },
          { color: "#65a30d", label: "p < 0.05" },
          { color: "#a3a3a3", label: "p ≥ 0.05" },
        ]
      : modality === "Fused"
      ? [
          { color: "#2563eb", label: "MS2 only" },
          { color: "#16a34a", label: "HSQC only" },
          { color: "#8b5cf6", label: "Both" },
        ]
      : modality === "HSQC"
      ? [
          { color: "#065f46", label: "score > 0.85 (strong)" },
          { color: "#10b981", label: "score 0.7–0.85" },
          { color: "#6ee7b7", label: "score < 0.7", dashed: true },
        ]
      : [
          { color: "#16a34a", label: "cosine > 0.75" },
          { color: "#eab308", label: "cosine 0.5–0.75" },
          { color: "#dc2626", label: "cosine < 0.5" },
        ];
  return (
    <ul className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1">
          <span
            aria-hidden="true"
            className="inline-block h-2 w-3 rounded-sm"
            style={{
              backgroundColor: it.dashed ? "transparent" : it.color,
              border: it.dashed ? `1.5px dashed ${it.color}` : `1.5px solid ${it.color}`,
            }}
          />
          {it.label}
        </li>
      ))}
      <li className="ml-auto text-[10px]">
        Node with{" "}
        <span className="inline-block h-2 w-2 rounded-full border border-amber-500" style={{ background: "transparent" }} />{" "}
        is propagated_from
      </li>
    </ul>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono truncate">{v}</span>
    </div>
  );
}
