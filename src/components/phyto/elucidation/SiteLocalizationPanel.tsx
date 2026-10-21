"use client";

import * as React from "react";
import { MapPin, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DisclaimerBanner } from "@/components/phyto/common/DisclaimerBanner";
import type { SiteLocalization } from "@/lib/phyto/types";

interface SiteLocalizationPanelProps {
  localization: SiteLocalization;
}

/**
 * SiteLocalizationPanel — shows the localisation confidence, the number
 * of competing sites, and the rank of the true site.
 *
 * Per spec:
 *   "SiteLocalizationPanel: shows rank, confidence, competing sites,
 *    n_possible_sites. If n=1, show warning: 'trivially uninformative.'"
 */
export function SiteLocalizationPanel({ localization }: SiteLocalizationPanelProps) {
  const trivial = localization.n_possible_sites === 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin aria-hidden="true" style={{ width: "1rem", height: "1rem" }} className="text-violet-500" />
          Site localisation
        </CardTitle>
        <CardDescription>
          Where on the parent scaffold is the proposed edit?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <Stat
            label="Confidence"
            value={localization.localization_confidence.toFixed(2)}
          />
          <Stat
            label="Possible sites"
            value={String(localization.n_possible_sites)}
          />
          <Stat
            label="Rank of true site"
            value={localization.rank_of_true_site ? `#${localization.rank_of_true_site}` : "unknown"}
          />
          <Stat
            label="Competing sites"
            value={String(localization.competing_sites.length)}
          />
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Competing sites (atom indices on parent)
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {localization.competing_sites.map((i) => (
              <Badge
                key={i}
                variant="outline"
                className="font-mono text-[11px]"
              >
                atom #{i}
              </Badge>
            ))}
          </div>
        </div>

        {trivial && (
          <DisclaimerBanner title="Trivially uninformative" variant="warning">
            Only one possible edit site exists on this scaffold, so the
            localisation is structurally determined rather than
            evidence-determined. Do not report it as a confidence claim —
            recommend an alternative scaffold if localisation is the
            research question.
          </DisclaimerBanner>
        )}

        {!trivial && localization.localization_confidence < 0.5 && (
          <DisclaimerBanner title="Low localisation confidence" variant="warning">
            Localisation confidence is below 0.5. Multiple sites are
            statistically plausible; do not commit to a single site in the
            report without orthogonal evidence (e.g. HMBC, NOESY).
          </DisclaimerBanner>
        )}

        <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-muted/30 p-2 text-xs text-muted-foreground dark:border-slate-700">
          <AlertTriangle
            aria-hidden="true"
            style={{ width: "0.85rem", height: "0.85rem" }}
            className="mt-0.5 shrink-0"
          />
          <span>
            Localisation is a hypothesis, not an identification. The
            proposed SMILES is a candidate structure; the true site is the
            site the synthetic confirmation would target.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2 text-center">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="font-mono text-sm tabular-nums">{value}</div>
    </div>
  );
}
