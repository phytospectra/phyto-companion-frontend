"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional custom fallback; receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  /** Called when an error is caught (e.g. to log to an error service). */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Class component error boundary for page-level isolation.
 *
 * Wraps a subtree so a render error in one page does not take down the
 * surrounding AppShell.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.props.onError?.(error, info);
    // Keep a trail in the console for local debugging.
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <Card className="border-rose-300 dark:border-rose-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle
              aria-hidden="true"
              className="text-rose-600 dark:text-rose-400"
              style={{ width: "1.1rem", height: "1.1rem" }}
            />
            This section failed to render
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred."}
          </p>
          <Button size="sm" variant="outline" onClick={this.reset}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }
}

export default ErrorBoundary;
