"use client";

import * as React from "react";
import {
  FileSearch,
  FlaskConical,
  MapPin,
  Sparkles,
  Network as NetworkIcon,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/phyto/layout/PageHeader";
import { VerdictBadge } from "@/components/phyto/common/VerdictBadge";
import { UncertaintyBadge } from "@/components/phyto/common/UncertaintyBadge";
import { CostBadge } from "@/components/phyto/common/CostBadge";
import { EmptyState } from "@/components/phyto/common/EmptyState";
import { EvidencePanel } from "@/components/phyto/evidence/EvidencePanel";
import { NovelStructureViewer } from "@/components/phyto/elucidation/NovelStructureViewer";
import { SiteLocalizationPanel } from "@/components/phyto/elucidation/SiteLocalizationPanel";
import { mockApi, newIdempotencyKey } from "@/lib/phyto/mock-api";
import { PRICING_TABLE } from "@/lib/phyto/constants";
import {
  bestRank,
  formatMz,
  formatPercent,
  formatFormula,
  formatMargin,
  formulaMatches,
  truncateSmiles,
} from "@/lib/phyto/formatting";
import { MOCK_CANDIDATE_RANKS } from "@/lib/phyto/fixtures";
import type { CandidateRank, SiteLocalization, Verdict } from "@/lib/phyto/types";
import { cn } from "@/lib/utils";

type SortKey = "rank" | "score" | "coverage" | "name";

export function ElucidationPage() {
  const [ranks, setRanks] = React.useState<CandidateRank[]>(MOCK_CANDIDATE_RANKS);
  const [loading, setLoading] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(
    MOCK_CANDIDATE_RANKS[0]?.candidate.id ?? null
  );
  const [verdictFilter, setVerdictFilter] = React.useState<Verdict | "all">("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("rank");
  const [query, setQuery] = React.useState("");
  const [evidenceFor, setEvidenceFor] = React.useState<CandidateRank | null>(null);
  const [novelRanks, setNovelRanks] = React.useState<CandidateRank[]>([]);
  const [generatingNovel, setGeneratingNovel] = React.useState(false);
  const [localization, setLocalization] = React.useState<SiteLocalization | null>(null);

  const selected = ranks.find((r) => r.candidate.id === selectedId) ?? null;

  async function reRank() {
    setLoading(true);
    try {
      const { ranks: r } = await mockApi.rankCandidates(newIdempotencyKey());
      setRanks(r);
      toast({ title: "Re-ranked", description: `${r.length} candidates` });
    } catch {
      // 402 handled by global modal
    } finally {
      setLoading(false);
    }
  }

  async function generateNovel() {
    setGeneratingNovel(true);
    try {
      const novel = await mockApi.generateNovel(newIdempotencyKey());
      setNovelRanks(novel);
      toast({
        title: "Novel candidates generated",
        description: `${novel.length} proposed structures flagged as novelty`,
      });
      // Also produce a site localisation
      const loc = await mockApi.localizeSite(newIdempotencyKey());
      setLocalization(loc);
    } catch {
      // 402 handled by global modal
    } finally {
      setGeneratingNovel(false);
    }
  }

  const filtered = React.useMemo(() => {
    let out = ranks;
    if (verdictFilter !== "all") {
      out = out.filter((r) => r.verdict === verdictFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter(
        (r) =>
          r.candidate.name.toLowerCase().includes(q) ||
          formulaMatches(r.candidate.formula, q) ||
          r.candidate.smiles.toLowerCase().includes(q)
      );
    }
    out = [...out].sort((a, b) => {
      switch (sortKey) {
        case "score":
          return b.score - a.score;
        case "coverage":
          return b.coverage - a.coverage;
        case "name":
          return a.candidate.name.localeCompare(b.candidate.name);
        case "rank":
        default:
          return bestRank(a) - bestRank(b);
      }
    });
    return out;
  }, [ranks, verdictFilter, query, sortKey]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Elucidation"
        title="Candidate ranking"
        description="Every candidate carries a verdict badge (hover for definition), a ranking interval (ties are first-class), and an Evidence button. Hover any score for its definition; click a candidate to inspect its evidence graph."
        actions={
          <Button onClick={reRank} disabled={loading} variant="outline" size="sm" className="gap-1.5">
            <FileSearch aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
            Re-rank
            {!loading && <CostBadge cost={PRICING_TABLE.elucidate_candidates} operation="Re-rank candidates" />}
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 py-3">
          <div className="space-y-1">
            <label htmlFor="el-f-verdict" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Verdict
            </label>
            <Select value={verdictFilter} onValueChange={(v) => setVerdictFilter(v as Verdict | "all")}>
              <SelectTrigger id="el-f-verdict" className="w-44 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All verdicts</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="TENTATIVE">Tentative</SelectItem>
                <SelectItem value="AMBIGUOUS">Ambiguous</SelectItem>
                <SelectItem value="CANDIDATE">Candidate</SelectItem>
                <SelectItem value="ABSTAIN">Abstain</SelectItem>
                <SelectItem value="NOVELTY_FLAGGED">Novelty-flagged</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label htmlFor="el-f-sort" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Sort
            </label>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger id="el-f-sort" className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rank">Rank</SelectItem>
                <SelectItem value="score">Score</SelectItem>
                <SelectItem value="coverage">Coverage</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px] space-y-1">
            <label htmlFor="el-f-query" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Search
            </label>
            <Input
              id="el-f-query"
              placeholder="name, formula, or SMILES…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="text-xs text-muted-foreground ml-auto">
            {filtered.length} / {ranks.length} candidates
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Candidate table */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ranked candidates</CardTitle>
              <CardDescription>
                Ties are shown as an interval — "Rank 1 (tied with 2)" is
                more honest than "Rank 1."
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <CandidateTableSkeleton />
              ) : filtered.length === 0 ? (
                <EmptyState
                  title="No candidates ranked yet"
                  description="Adjust filters above or click Re-rank to compute fresh ranks."
                />
              ) : (
                <ScrollArea className="h-[420px] rounded-md border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card">
                      <TableRow>
                        <TableHead className="w-[120px]">Rank</TableHead>
                        <TableHead>Candidate</TableHead>
                        <TableHead className="w-[70px] text-right">Score</TableHead>
                        <TableHead className="w-[70px] text-right">Coverage</TableHead>
                        <TableHead className="w-[120px]">Verdict</TableHead>
                        <TableHead className="w-[100px] text-right">Evidence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((r) => {
                        const selected = r.candidate.id === selectedId;
                        return (
                          <TableRow
                            key={r.candidate.id}
                            data-state={selected ? "selected" : undefined}
                            onClick={() => setSelectedId(r.candidate.id)}
                            className="cursor-pointer"
                          >
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-sm font-semibold tabular-nums">
                                  #{bestRank(r)}
                                </div>
                                <UncertaintyBadge rank={r} />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                <div className="font-medium text-sm">
                                  {r.candidate.name}
                                </div>
                                <div className="font-mono text-[10px] text-muted-foreground">
                                  {formatFormula(r.candidate.formula)} · {formatMz(r.candidate.exact_mass)}
                                </div>
                                <div className="font-mono text-[10px] text-muted-foreground">
                                  {truncateSmiles(r.candidate.smiles)}
                                </div>
                                <Badge variant="outline" className="text-[9px]">
                                  {r.candidate.provenance}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-mono text-sm tabular-nums">
                                {r.score.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-mono text-sm tabular-nums">
                                {formatPercent(r.coverage)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <VerdictBadge verdict={r.verdict} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 text-[11px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEvidenceFor(r);
                                }}
                                aria-label={`Open evidence panel for ${r.candidate.name}`}
                              >
                                <NetworkIcon aria-hidden="true" style={{ width: "0.75rem", height: "0.75rem" }} />
                                Evidence
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Candidate detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <CandidateDetail
              rank={selected}
              onShowEvidence={() => setEvidenceFor(selected)}
              onGenerateNovel={generateNovel}
              generatingNovel={generatingNovel}
            />
          ) : (
            <EmptyState title="Select a candidate" description="Click any row in the table to inspect its evidence." />
          )}
        </div>
      </div>

      {/* Novel candidates + localisation */}
      {novelRanks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles aria-hidden="true" style={{ width: "1rem", height: "1rem" }} className="text-orange-500" />
              Novel structural relatives
            </CardTitle>
            <CardDescription>
              Generated from the top candidate. Each is flagged
              NOVELTY_FLAGGED — these are hypotheses, not identifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <div>
              <ScrollArea className="h-[260px] rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead className="w-[60px]">Rank</TableHead>
                      <TableHead>Proposed (parent)</TableHead>
                      <TableHead className="w-[100px]">Verdict</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {novelRanks.map((r) => (
                      <TableRow key={r.candidate.id}>
                        <TableCell>
                          <span className="text-xs font-semibold tabular-nums">
                            #{bestRank(r)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-[10px]">{truncateSmiles(r.candidate.smiles, 36)}</div>
                          <div className="text-[10px] text-muted-foreground">
                            parent: Quercetin
                          </div>
                        </TableCell>
                        <TableCell>
                          <VerdictBadge verdict={r.verdict} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
            <div className="space-y-4">
              {localization && (
                <>
                  <NovelStructureViewer localization={localization} />
                  <SiteLocalizationPanel localization={localization} />
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evidence slide-over */}
      {evidenceFor && (
        <EvidencePanel
          open={!!evidenceFor}
          onOpenChange={(o) => !o && setEvidenceFor(null)}
          title={evidenceFor.candidate.name}
          subtitle={`${formatFormula(evidenceFor.candidate.formula)} · ${formatMz(evidenceFor.candidate.exact_mass)}`}
          graph={evidenceFor.evidence_graph ?? { nodes: [], edges: [] }}
          unmatchedObserved={evidenceFor.gaps.filter((g) => g.toLowerCase().includes("observed"))}
          unmatchedPredicted={evidenceFor.gaps.filter((g) => g.toLowerCase().includes("predicted"))}
          propagationChains={[
            "MS2 cluster propagated → HSQC node C-3/H-3 via shared scaffold",
            "Quercetin match supports Kaempferin hypothesis via B-ring substitution",
          ]}
          citations={["LOTUS_isolate_4127", "GNPS library v27", "HMDB v4"]}
          verdictBadge={<VerdictBadge verdict={evidenceFor.verdict} />}
        />
      )}
    </div>
  );
}

function CandidateDetail({
  rank,
  onShowEvidence,
  onGenerateNovel,
  generatingNovel,
}: {
  rank: CandidateRank;
  onShowEvidence: () => void;
  onGenerateNovel: () => void;
  generatingNovel: boolean;
}) {
  const top1 = bestRank(rank) === 1;
  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span>{rank.candidate.name}</span>
          <VerdictBadge verdict={rank.verdict} />
        </CardTitle>
        <CardDescription className="font-mono text-xs">
          {formatFormula(rank.candidate.formula)} · exact mass {formatMz(rank.candidate.exact_mass)} · {rank.candidate.provenance}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 2D structure placeholder */}
        <StructurePanel smiles={rank.candidate.smiles} />

        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat label="Score" value={rank.score.toFixed(2)} />
          <Stat label="Coverage" value={formatPercent(rank.coverage)} />
          <Stat label="Margin" value={formatMargin(rank.margin)} />
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Source
          </div>
          <div className="text-xs font-mono mt-0.5">{rank.candidate.source}</div>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Gaps ({rank.gaps.length})
          </div>
          <ul className="mt-1 space-y-1 text-xs">
            {rank.gaps.length === 0 ? (
              <li className="text-muted-foreground">None.</li>
            ) : (
              rank.gaps.map((g, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 rounded-md border border-orange-200 bg-orange-50/50 px-2 py-1 dark:border-orange-900 dark:bg-orange-950/40"
                >
                  <span className="text-orange-600 dark:text-orange-400">⚠</span>
                  <span className="leading-snug">{g}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onShowEvidence}
            className="gap-1.5"
          >
            <NetworkIcon aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
            Open evidence panel
          </Button>
          {top1 && rank.verdict !== "CONFIRMED" && (
            <Button
              variant="default"
              size="sm"
              onClick={onGenerateNovel}
              disabled={generatingNovel}
              className="gap-1.5"
            >
              <Sparkles aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
              {generatingNovel ? "Generating…" : "Generate novel relatives"}
              {!generatingNovel && (
                <CostBadge cost={PRICING_TABLE.elucidate_novel + PRICING_TABLE.elucidate_localize} operation="Novel + localise" />
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StructurePanel({ smiles }: { smiles: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        2D structure
      </div>
      <div className="grid h-32 place-items-center rounded-md border bg-card text-center text-xs text-muted-foreground">
        {/* In the real app this is RDKit.js rendering the SMILES. */}
        <div className="space-y-1">
          <FlaskConical aria-hidden="true" style={{ width: "1.5rem", height: "1.5rem" }} className="mx-auto opacity-40" />
          <div className="font-mono text-[10px] break-all">{truncateSmiles(smiles, 60)}</div>
        </div>
      </div>
    </div>
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

function CandidateTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[80px]" />
          <Skeleton className="h-10 w-[80px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
      ))}
    </div>
  );
}
