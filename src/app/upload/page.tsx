"use client";

import { useRouter } from "next/navigation";
import { AppFrame } from "@/components/phyto/layout/AppFrame";
import { UploadPage } from "@/components/phyto/upload/UploadPage";
import { UploadLanding } from "@/components/phyto/upload/UploadLanding";
import { LoadingSpinner } from "@/components/phyto/common/LoadingSpinner";
import { useAuth } from "@/auth/AuthProvider";

/**
 * /upload is the product's front door.
 *
 * - unauthenticated → value proposition + sign-in (no redirect to /login;
 *   the pitch stays on screen)
 * - authenticated    → the upload workspace
 * - loading          → brief spinner while Firebase restores the session
 */
export default function UploadRoute() {
  const router = useRouter();
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <LoadingSpinner label="Checking your session…" />
      </div>
    );
  }

  if (status !== "authenticated") {
    return <UploadLanding />;
  }

  return (
    <AppFrame>
      <UploadPage onRunStarted={(run_id) => router.push(`/analysis/${run_id}`)} />
    </AppFrame>
  );
}