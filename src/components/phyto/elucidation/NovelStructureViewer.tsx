"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { SiteLocalization } from "@/lib/phyto/types";
import { truncateSmiles } from "@/lib/phyto/formatting";

interface NovelStructureViewerProps {
  localization: SiteLocalization;
}

/**
 * NovelStructureViewer — shows the parent SMILES and proposed (novel)
 * SMILES side by side with the edited atom index highlighted in orange.
 *
 * Per spec:
 *   "Every novel structure shows parent and proposed side-by-side with the
 *    edited site highlighted."
 *
 * In the real app this would be RDKit.js rendering the two structures with
 * the highlight atom set via `drawer.drawMoleculeWithHighlights`. In the
 * sandbox we render the SMILES strings as monospace text with the edited
 * atom index called out.
 */
export function NovelStructureViewer({ localization }: NovelStructureViewerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles aria-hidden="true" style={{ width: "1rem", height: "1rem" }} className="text-orange-500" />
          Parent → proposed structure
        </CardTitle>
        <CardDescription>
          Edit site: <span className="font-mono text-xs">atom #{localization.edit_atom_index}</span> · {localization.edit_type}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          <StructurePane
            label="Parent"
            smiles={localization.parent_smiles}
            highlightAtom={null}
          />
          <StructurePane
            label="Proposed (novel)"
            smiles={localization.novel_smiles}
            highlightAtom={localization.edit_atom_index}
          />
        </div>
        <div className="mt-3 rounded-md border border-orange-200 bg-orange-50/60 p-2 text-xs text-orange-900 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-200">
          <span className="font-semibold">Highlight:</span> atom{" "}
          <span className="font-mono">#{localization.edit_atom_index}</span>{" "}
          ({localization.edit_type}) — shown in the proposed structure with an
          orange marker. In the production viewer this is rendered on the
          actual 2D depiction.
        </div>
      </CardContent>
    </Card>
  );
}

function StructurePane({
  label,
  smiles,
  highlightAtom,
}: {
  label: string;
  smiles: string;
  highlightAtom: number | null;
}) {
  return (
    <div className="rounded-md border bg-card">
      <div className="border-b bg-muted/30 px-2 py-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="grid h-28 place-items-center p-2 text-center text-xs">
        <div className="space-y-1">
          <div className="font-mono text-[10px] leading-snug break-all">
            {truncateSmiles(smiles, 64)}
          </div>
          {highlightAtom !== null && (
            <span
              aria-label={`Edited atom index ${highlightAtom}`}
              className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-mono text-white"
            >
              ★ atom #{highlightAtom}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
