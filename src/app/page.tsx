"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/auth/AuthProvider";
import { LoadingSpinner } from "@/components/phyto/common/LoadingSpinner";

/**
 * Root route. Redirects to /upload when authenticated, /login otherwise.
 */
export default function Home() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    router.replace(status === "authenticated" ? "/upload" : "/login");
  }, [status, router]);

  return (
    <div className="grid min-h-screen place-items-center">
      <LoadingSpinner label="Loading…" />
    </div>
  );
}
