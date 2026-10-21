"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/phyto/layout/AppShell";
import { InsufficientTokensModal } from "@/components/phyto/common/InsufficientTokensModal";
import { useTokenStore } from "@/lib/phyto/stores";
import { ProtectedRoute } from "@/auth/ProtectedRoute";

/**
 * Raise a 402 exactly as the API client would on a real 402 response,
 * queueing an auto-retry for after top-up. Used by the Billing demo button.
 */
export function useSimulateInsufficient(): () => void {
  const router = useRouter();
  const setInsufficient = useTokenStore((s) => s.setInsufficientTokensError);
  const setPendingRetry = useTokenStore((s) => s.setPendingRetryOp);

  return React.useCallback(() => {
    const balance = useTokenStore.getState().balance?.balance ?? 0;
    const required = balance + 50;
    const operation_id = `demo_force_402_${Date.now()}`;
    setPendingRetry({
      operation_id,
      retry: async () => {
        const { toast } = await import("@/hooks/use-toast");
        toast({
          title: "Auto-retry succeeded",
          description: `Operation ${operation_id} re-run after top-up.`,
        });
        router.push("/elucidation");
      },
    });
    setInsufficient({
      operation_id,
      balance,
      required,
      topup_url: "/billing/topup",
    });
  }, [router, setInsufficient, setPendingRetry]);
}

/**
 * Authenticated application frame: AppShell + global 402 modal.
 *
 * Pages render as children so the shell is not remounted between routes.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <ProtectedRoute>
      <TooltipProvider delayDuration={200}>
        <AppShell>{children}</AppShell>
        <InsufficientTokensModal onGoToBilling={() => router.push("/billing")} />
      </TooltipProvider>
    </ProtectedRoute>
  );
}
