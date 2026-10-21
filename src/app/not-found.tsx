"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppFrame } from "@/components/phyto/layout/AppFrame";
import { useAuth } from "@/auth/AuthProvider";

/**
 * 404 page. Rendered inside the app shell when signed in, standalone
 * otherwise.
 */
export default function NotFound() {
  const { status } = useAuth();

  const content = (
    <div className="grid min-h-[50vh] place-items-center px-4">
      <div className="space-y-4 text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          404
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page you are looking for does not exist or has moved.
        </p>
        <Button asChild>
          <Link href="/upload">Back to upload</Link>
        </Button>
      </div>
    </div>
  );

  if (status === "authenticated") {
    return <AppFrame>{content}</AppFrame>;
  }

  return <div className="min-h-screen bg-background">{content}</div>;
}
