"use client";

import { AppFrame } from "@/components/phyto/layout/AppFrame";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ElucidationPage } from "@/components/phyto/elucidation/ElucidationPage";

export default function ElucidationRoute() {
  return (
    <AppFrame>
      <ErrorBoundary>
        <ElucidationPage />
      </ErrorBoundary>
    </AppFrame>
  );
}
