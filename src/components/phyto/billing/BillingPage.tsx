"use client";

import * as React from "react";
import { Coins, Sparkles, CheckCircle2, Receipt, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/phyto/layout/PageHeader";
import { CostBadge } from "@/components/phyto/common/CostBadge";
import { TOKEN_PACKS } from "@/lib/phyto/constants";
import { mockApi, newIdempotencyKey } from "@/lib/phyto/mock-api";
import { useTokenStore, addTokens } from "@/lib/phyto/stores";
import {
  formatDateTime,
  formatSignedTokens,
  formatTokens,
  formatUsd,
} from "@/lib/phyto/formatting";
import type { BillingTransaction, TokenPack } from "@/lib/phyto/types";
import { cn } from "@/lib/utils";

interface BillingPageProps {
  /** Called when the user clicks the 402-trigger demo button. */
  onTriggerInsufficient: () => void;
}

export function BillingPage({ onTriggerInsufficient }: BillingPageProps) {
  const balance = useTokenStore((s) => s.balance);
  const [transactions, setTransactions] = React.useState<BillingTransaction[]>([]);
  const [loadingTx, setLoadingTx] = React.useState(true);
  const [topupPending, setTopupPending] = React.useState<TokenPack["id"] | null>(null);

  // Load transactions on mount.
  React.useEffect(() => {
    mockApi.listTransactions().then((t) => {
      setTransactions(t);
      setLoadingTx(false);
    });
  }, []);

  async function buyPack(pack: TokenPack) {
    setTopupPending(pack.id);
    try {
      // Step 1: backend creates Stripe checkout session. In the real flow
      // the user is redirected to checkout_url and returns via
      // /billing/success?session_id=...
      await mockApi.topup(pack.id, newIdempotencyKey());
      toast({
        title: "Redirected to Stripe (simulated)",
        description: "Simulating return from checkout…",
      });
      // Step 2: simulate return — poll balance every 2s until it
      // increases. In the demo we just call confirmTopup which adds the
      // tokens immediately. The InsufficientTokensModal's auto-retry
      // fires if a pending op was queued.
      const newBalance = await mockApi.confirmTopup(pack.id);
      toast({
        title: "Top-up complete",
        description: `Balance is now ${formatTokens(newBalance.balance)}.`,
      });
      // Refresh the transactions list to show the new top-up.
      const tx = await mockApi.listTransactions();
      setTransactions(tx);
    } finally {
      setTopupPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Billing"
        title="Tokens & billing"
        description="Tokens power every metered operation. Buy a pack to top up — the failed operation (if any) auto-retries once the balance increases. No subscription; tokens do not expire."
      />

      {/* Balance card */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Coins aria-hidden="true" style={{ width: "1.5rem", height: "1.5rem" }} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Current balance
              </div>
              <div className="text-3xl font-semibold tabular-nums">
                {balance?.balance ?? 0}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  tokens
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Updated {balance ? formatDateTime(balance.last_updated) : "—"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => addTokens(5)} variant="ghost" size="sm" className="gap-1.5 text-xs">
              <Sparkles aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
              +5 demo tokens
            </Button>
            <Button
              onClick={onTriggerInsufficient}
              variant="outline"
              size="sm"
              className="gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950"
            >
              <CreditCard aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
              Simulate 402 (requires {(balance?.balance ?? 0) + 50} tokens)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Packs */}
      <div className="grid gap-4 md:grid-cols-3">
        {TOKEN_PACKS.map((pack) => (
          <Card
            key={pack.id}
            className={cn(
              "relative flex flex-col",
              pack.popular
                ? "border-emerald-500 shadow-sm dark:border-emerald-700"
                : ""
            )}
          >
            {pack.popular && (
              <Badge
                variant="default"
                className="absolute -top-2 left-4 bg-emerald-600 text-white"
              >
                Most popular
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="text-base">{pack.label}</CardTitle>
              <CardDescription>{pack.tokens} tokens</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold">{formatUsd(pack.price_usd)}</span>
                <span className="text-xs text-muted-foreground">
                  · {(pack.price_usd / pack.tokens * 100).toFixed(1)}¢/token
                </span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 flex-1">
                <li className="flex items-start gap-1">
                  <CheckCircle2 aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} className="text-emerald-600 mt-0.5 shrink-0" />
                  Tokens never expire
                </li>
                <li className="flex items-start gap-1">
                  <CheckCircle2 aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} className="text-emerald-600 mt-0.5 shrink-0" />
                  Failed ops auto-retry after top-up
                </li>
                <li className="flex items-start gap-1">
                  <CheckCircle2 aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} className="text-emerald-600 mt-0.5 shrink-0" />
                  Stripe Checkout · secure
                </li>
              </ul>
              <Button
                onClick={() => buyPack(pack)}
                disabled={topupPending !== null}
                variant={pack.popular ? "default" : "outline"}
                className="w-full gap-1.5"
              >
                {topupPending === pack.id ? "Processing…" : "Buy"}
                {topupPending !== pack.id && (
                  <CostBadge cost={0} operation="No charge to view" />
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt aria-hidden="true" style={{ width: "1rem", height: "1rem" }} />
            Transactions
          </CardTitle>
          <CardDescription>
            Top-ups and metered operations. Token deltas are signed: + for
            top-ups, − for operations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTx ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <ScrollArea className="h-[260px] rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Balance after</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {formatDateTime(t.ts)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            t.kind === "topup"
                              ? "border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300"
                              : "border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300"
                          )}
                        >
                          {t.kind}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{t.description}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-mono tabular-nums text-sm",
                          t.tokens > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
                        )}
                      >
                        {formatSignedTokens(t.tokens)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {t.balance_after}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
