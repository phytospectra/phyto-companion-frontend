"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/phyto/common/LoadingSpinner";
import { useAuth } from "./AuthProvider";

/**
 * Wraps pages that require authentication.
 *
 * - loading      → spinner
 * - unauthenticated → redirect to /login
 * - authenticated → children
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <LoadingSpinner label="Checking your session…" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <LoadingSpinner label="Redirecting to sign in…" />
      </div>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
