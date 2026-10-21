"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * App Router error boundary. Catches render errors in the route segment
 * and its children; `reset()` re-attempts rendering.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = React.useState(false);

  const details = React.useMemo(
    () =>
      JSON.stringify(
        {
          message: error.message,
          name: error.name,
          digest: error.digest,
          stack: error.stack,
        },
        null,
        2
      ),
    [error]
  );

  async function copyDetails(): Promise<void> {
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-lg border-rose-300 dark:border-rose-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle
              aria-hidden="true"
              className="text-rose-600 dark:text-rose-400"
              style={{ width: "1.1rem", height: "1.1rem" }}
            />
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred while rendering this page."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={reset}>
              Try again
            </Button>
            <Button size="sm" variant="outline" onClick={() => void copyDetails()}>
              {copied ? "Copied" : "Copy error details"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
