"use client";

import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/phyto/layout/AppShell";
import type { PageId } from "@/components/phyto/layout/types";
import { InsufficientTokensModal } from "@/components/phyto/common/InsufficientTokensModal";
import { UploadPage } from "@/components/phyto/upload/UploadPage";
import { AnalysisPage } from "@/components/phyto/analysis/AnalysisPage";
import { NetworkPage } from "@/components/phyto/network/NetworkPage";
import { ElucidationPage } from "@/components/phyto/elucidation/ElucidationPage";
import { PharmacologyPage } from "@/components/phyto/mechanism/PharmacologyPage";
import { ResultsPage } from "@/components/phyto/ResultsPage";
import { BillingPage } from "@/components/phyto/billing/BillingPage";
import { SettingsPage } from "@/components/phyto/SettingsPage";
import { useTokenStore } from "@/lib/phyto/stores";

/**
 * Phytospectra — single-page demo composition.
 *
 * In the real Vite+React frontend this would be the React Router layout
 * in `App.tsx`. Because the sandbox exposes only the `/` route, we
 * compose every page in-place and switch via local state. The component
 * contract for each page is identical to the spec — they would map
 * 1:1 to routes:
 *
 *   /upload       → <UploadPage />
 *   /analysis/:id → <AnalysisPage run_id={id} />
 *   /network      → <NetworkPage />
 *   /elucidation  → <ElucidationPage />
 *   /pharmacology → <PharmacologyPage />
 *   /results/:id  → <ResultsPage />
 *   /billing      → <BillingPage />
 *   /settings     → <SettingsPage />
 */
export default function Home() {
  const [page, setPage] = React.useState<PageId>("upload");
  const [runId, setRunId] = React.useState<string>("run_4a7e9c2b");
  const setInsufficient = useTokenStore((s) => s.setInsufficientTokensError);
  const setPendingRetry = useTokenStore((s) => s.setPendingRetryOp);

  function navigate(p: PageId) {
    setPage(p);
  }

  function onRunStarted(id: string) {
    setRunId(id);
    setPage("analysis");
  }

  /**
   * Demo: trigger a 402 directly. We deliberately set the
   * InsufficientTokensError store state with required > balance (cost
   * 62 by default, which exceeds the new-user balance of 50). This is
   * the same code path the real axios interceptor would take when the
   * backend returns a 402 response body
   * { detail, balance, required, topup_url }.
   *
   * We also queue a pending retry op so the modal shows the auto-retry
   * banner, and after the user tops up the addTokens helper in stores.ts
   * fires that retry automatically.
   */
  function simulateInsufficient() {
    const balance = useTokenStore.getState().balance?.balance ?? 0;
    const required = balance + 50; // always exceed current balance
    const operation_id = `demo_force_402_${Date.now()}`;
    setPendingRetry({
      operation_id,
      retry: async () => {
        // In the real flow this re-runs the actual failed operation. In
        // the demo we just toast + navigate to elucidation to show the
        // flow resolved.
        const { toast: _t } = await import("@/hooks/use-toast");
        _t({
          title: "Auto-retry succeeded",
          description: `Operation ${operation_id} re-run after top-up.`,
        });
        setPage("elucidation");
      },
    });
    setInsufficient({
      operation_id,
      balance,
      required,
      topup_url: "/billing/topup",
    });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <AppShell activePage={page} onNavigate={navigate}>
        {page === "upload" && <UploadPage onRunStarted={onRunStarted} />}
        {page === "analysis" && (
          <AnalysisPage
            run_id={runId}
            onViewResults={() => setPage("results")}
          />
        )}
        {page === "network" && <NetworkPage />}
        {page === "elucidation" && <ElucidationPage />}
        {page === "pharmacology" && <PharmacologyPage />}
        {page === "results" && (
          <ResultsPage onNavigateToMechanism={() => setPage("pharmacology")} />
        )}
        {page === "billing" && (
          <BillingPage onTriggerInsufficient={simulateInsufficient} />
        )}
        {page === "settings" && <SettingsPage />}
      </AppShell>
      <InsufficientTokensModal onGoToBilling={() => setPage("billing")} />
    </TooltipProvider>
  );
}
