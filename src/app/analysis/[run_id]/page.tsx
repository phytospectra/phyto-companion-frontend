"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { AppFrame } from "@/components/phyto/layout/AppFrame";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AnalysisPage } from "@/components/phyto/analysis/AnalysisPage";

export default function AnalysisRoute({
  params,
}: {
  params: Promise<{ run_id: string }>;
}) {
  const { run_id } = use(params);
  const router = useRouter();
  return (
    <AppFrame>
      <ErrorBoundary>
        <AnalysisPage
          run_id={run_id}
          onViewResults={() => router.push(`/results/${run_id}`)}
        />
      </ErrorBoundary>
    </AppFrame>
  );
}
