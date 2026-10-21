"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * TanStack Query client provider. In the real app this is configured with
 * sensible defaults for retry (3x on 5xx for GET, 1x for POST with
 * Idempotency-Key), staleTime, and refetchOnWindowFocus. For the mock API
 * we keep it minimal — the mock always resolves in ~350ms.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: false, // mock never fails transiently
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
