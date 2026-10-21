"use client";

import { useRouter } from "next/navigation";
import { AppFrame } from "@/components/phyto/layout/AppFrame";
import { UploadPage } from "@/components/phyto/upload/UploadPage";

export default function UploadRoute() {
  const router = useRouter();
  return (
    <AppFrame>
      <UploadPage onRunStarted={(run_id) => router.push(`/analysis/${run_id}`)} />
    </AppFrame>
  );
}
