"use client";

import * as React from "react";
import { Coins, ArrowRight, CircleDollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTokenStore } from "@/lib/phyto/stores";
import { formatTokens } from "@/lib/phyto/formatting";

interface InsufficientTokensModalProps {
  /**
   * Called when the user clicks "Buy tokens". The parent navigates to the
   * Billing tab and (in the real app) to /billing/topup, then back via
   * return_url. The 402 modal auto-clears on open.
   */
  onGoToBilling: () => void;
}

/**
 * InsufficientTokensModal — opens automatically whenever any API call
 * throws an InsufficientTokensError (the mock-api layer sets the store;
 * the real axios interceptor in `src/api/client.ts` would do the same on a
 * 402 response).
 *
 * Per spec:
 *   "On 402, open a modal with balance, required, and a top-up link."
 *   "After top-up, auto-retry the failed operation."
 *
 * The modal shows balance / required / difference and a single call to
 * action. After a successful top-up the mock-api.addTokens() helper
 * re-triggers the pending retry op automatically.
 */
export function InsufficientTokensModal({
  onGoToBilling,
}: InsufficientTokensModalProps) {
  const error = useTokenStore((s) => s.insufficientTokensError);
  const pendingRetryOp = useTokenStore((s) => s.pendingRetryOp);
  const clear = useTokenStore((s) => s.clearInsufficientTokensError);

  const open = error !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) clear();
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        aria-describedby="itt-desc"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CircleDollarSign
              aria-hidden="true"
              className="text-rose-600 dark:text-rose-400"
              style={{ width: "1.1rem", height: "1.1rem" }}
            />
            Insufficient tokens
          </DialogTitle>
          <DialogDescription id="itt-desc">
            The operation requires more tokens than your current balance.
            Top up to continue — the operation will retry automatically
            once the top-up completes.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="space-y-3">
            <dl className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-md border bg-muted/40 p-3">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Balance
                </dt>
                <dd className="mt-1 font-mono text-base tabular-nums">
                  {error.balance}
                </dd>
              </div>
              <div className="rounded-md border bg-muted/40 p-3">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Required
                </dt>
                <dd className="mt-1 font-mono text-base tabular-nums">
                  {error.required}
                </dd>
              </div>
              <div className="rounded-md border border-rose-300 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-rose-700 dark:text-rose-300">
                  Difference
                </dt>
                <dd className="mt-1 font-mono text-base tabular-nums text-rose-700 dark:text-rose-300">
                  +{error.required - error.balance}
                </dd>
              </div>
            </dl>

            {pendingRetryOp && (
              <div
                className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                aria-live="polite"
              >
                <Coins
                  aria-hidden="true"
                  style={{ width: "0.85rem", height: "0.85rem" }}
                  className="mt-0.5 shrink-0"
                />
                <span>
                  <span className="font-semibold">Auto-retry queued.</span>{" "}
                  Once you top up, the operation{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                    {pendingRetryOp.operation_id}
                  </code>{" "}
                  will run again automatically.
                </span>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Smallest pack: 100 tokens for $9.00. New users start with{" "}
              {formatTokens(50)} free.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => clear()}
            aria-label="Dismiss and do nothing"
          >
            Dismiss
          </Button>
          <Button
            size="sm"
            onClick={() => {
              clear();
              onGoToBilling();
            }}
            aria-label="Go to billing to buy tokens"
            className="gap-1.5"
          >
            Buy tokens
            <ArrowRight aria-hidden="true" style={{ width: "0.9rem", height: "0.9rem" }} />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
