"use client";

import { useRouter } from "next/navigation";
import { AppFrame } from "@/components/phyto/layout/AppFrame";
import { ResultsPage } from "@/components/phyto/ResultsPage";

export default function ResultsRoute() {
  const router = useRouter();
  return (
    <AppFrame>
      <ResultsPage onNavigateToMechanism={() => router.push("/pharmacology")} />
    </AppFrame>
  );
}
