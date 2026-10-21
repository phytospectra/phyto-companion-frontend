"use client";

import * as React from "react";
import { initMocks } from "@/mocks/init";

/**
 * Client-only MSW bootstrap. Renders nothing; starts the mock service
 * worker once on mount when NEXT_PUBLIC_USE_MOCKS=true in development.
 */
export function MockProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    void initMocks();
  }, []);

  return <>{children}</>;
}
