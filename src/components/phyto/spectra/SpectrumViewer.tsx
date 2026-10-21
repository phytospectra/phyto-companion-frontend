"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  ReferenceArea,
  Tooltip as RTooltip,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatMz, formatPpm } from "@/lib/phyto/formatting";
import {
  MOCK_HSQC_PEAKS,
  MOCK_MS2_OBSERVED,
  MOCK_MS2_PREDICTED,
} from "@/lib/phyto/fixtures";

/**
 * SpectrumViewer — recharts-based stand-in for the real Plotly-based
 * `src/components/spectra/SpectrumViewer.tsx`. The real component is
 * lazy-loaded (Plotly is ~3MB) — here we keep it eager-loaded because
 * the sandbox already includes recharts.
 *
 * Two views, as per spec:
 *   - MS2 mirror plot (top: observed, bottom: predicted mirrored)
 *   - HSQC overlay (C vs H ppm, with unmatched predicted peaks flagged)
 */
export function SpectrumViewer() {
  return (
    <Card className="p-3">
      <Tabs defaultValue="ms2" className="w-full">
        <TabsList>
          <TabsTrigger value="ms2">MS2 mirror</TabsTrigger>
          <TabsTrigger value="hsqc">HSQC overlay</TabsTrigger>
        </TabsList>
        <TabsContent value="ms2" className="mt-2">
          <Ms2Mirror />
        </TabsContent>
        <TabsContent value="hsqc" className="mt-2">
          <HsqcOverlay />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function Ms2Mirror() {
  // For mirror plot, observed is +intensity, predicted is -intensity
  const obs = MOCK_MS2_OBSERVED.map((p) => ({ ...p, intensity_signed: p.intensity }));
  const pred = MOCK_MS2_PREDICTED.map((p) => ({
    ...p,
    intensity_signed: -p.intensity,
  }));
  const data = [...obs, ...pred];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          observed
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
          predicted (mirrored)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
          unmatched (gap)
        </span>
      </div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="mz"
              type="number"
              domain={["dataMin - 10", "dataMax + 10"]}
              tickFormatter={(v) => formatMz(Number(v))}
              stroke="currentColor"
              fontSize={10}
              label={{
                value: "m/z",
                position: "insideBottom",
                offset: -4,
                fontSize: 11,
              }}
            />
            <YAxis
              dataKey="intensity_signed"
              domain={[-110, 110]}
              tickFormatter={(v) => `${Math.abs(Number(v))}%`}
              stroke="currentColor"
              fontSize={10}
            />
            <ZAxis range={[60, 60]} />
            <ReferenceArea y1={0} y2={110} fill="#10b981" fillOpacity={0.04} />
            <ReferenceArea y1={-110} y2={0} fill="#6366f1" fillOpacity={0.04} />
            <RTooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const p = payload[0].payload as {
                  mz: number;
                  intensity: number;
                  intensity_signed: number;
                };
                const isObs = p.intensity_signed > 0;
                return (
                  <div className="rounded-md border bg-background p-2 text-xs shadow">
                    <div className="font-mono">m/z = {formatMz(p.mz)}</div>
                    <div>
                      {isObs ? "observed" : "predicted"}: {p.intensity}%
                    </div>
                  </div>
                );
              }}
            />
            <Scatter
              data={obs}
              fill="#10b981"
              shape="circle"
            />
            <Scatter
              data={pred}
              fill="#6366f1"
              shape="circle"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground">
        Orange peaks in the observed trace have no predicted counterpart
        (gaps). Indigo peaks in the predicted trace have no observed
        counterpart.
      </p>
    </div>
  );
}

function HsqcOverlay() {
  const observed = MOCK_HSQC_PEAKS.filter((p) => p.in_observed);
  const unmatched = MOCK_HSQC_PEAKS.filter((p) => !p.in_observed);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          observed (matched)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
          unmatched predicted (gap)
        </span>
      </div>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 32 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="c_ppm"
              type="number"
              domain={["dataMin - 5", "dataMax + 5"]}
              tickFormatter={(v) => Number(v).toFixed(1)}
              stroke="currentColor"
              fontSize={10}
              label={{
                value: "13C (ppm)",
                position: "insideBottom",
                offset: -10,
                fontSize: 11,
              }}
            />
            <YAxis
              dataKey="h_ppm"
              type="number"
              domain={["dataMin - 0.5", "dataMax + 0.5"]}
              tickFormatter={(v) => formatPpm(Number(v)).replace(" ppm", "")}
              stroke="currentColor"
              fontSize={10}
              label={{
                value: "1H (ppm)",
                angle: -90,
                position: "insideLeft",
                fontSize: 11,
              }}
            />
            <ZAxis range={[120, 120]} />
            <RTooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const p = payload[0].payload as {
                  c_ppm: number;
                  h_ppm: number;
                  label: string;
                  in_observed: boolean;
                };
                return (
                  <div className="rounded-md border bg-background p-2 text-xs shadow">
                    <div className="font-semibold">{p.label}</div>
                    <div className="font-mono">
                      {p.c_ppm.toFixed(2)} / {p.h_ppm.toFixed(2)} ppm
                    </div>
                    <div>
                      {p.in_observed ? "observed ✓" : "predicted, not observed (gap)"}
                    </div>
                  </div>
                );
              }}
            />
            <Scatter
              data={observed}
              fill="#10b981"
              shape="circle"
            />
            <Scatter
              data={unmatched}
              fill="#f97316"
              shape="diamond"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground">
        HSQC correlation peaks. Matched observed↔predicted pairs appear in
        emerald. Orange diamonds mark predicted peaks the spectrum did not
        show — these are the cross-modal gaps reported in the evidence panel.
      </p>
    </div>
  );
}
