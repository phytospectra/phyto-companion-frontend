"use client";

import { AppFrame, useSimulateInsufficient } from "@/components/phyto/layout/AppFrame";
import { BillingPage } from "@/components/phyto/billing/BillingPage";

export default function BillingRoute() {
  const simulateInsufficient = useSimulateInsufficient();
  return (
    <AppFrame>
      <BillingPage onTriggerInsufficient={simulateInsufficient} />
    </AppFrame>
  );
}
