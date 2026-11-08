import * as React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
const route = vi.hoisted(() => ({ path: "/network" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.path, useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/auth/ProtectedRoute", () => ({ ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/phyto/layout/AppShell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/phyto/common/InsufficientTokensModal", () => ({ InsufficientTokensModal: () => null }));
import { AppFrame } from "@/components/phyto/layout/AppFrame";
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });
it("blocks direct live navigation to demonstration screens before mounting their data loaders", () => {
  vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
  const loadDemo = vi.fn();
  function Demo() { loadDemo(); return <p>demo-result</p>; }
  render(<AppFrame><Demo /></AppFrame>);
  expect(screen.getByRole('heading', { name: /Workflow unavailable/ })).toBeInTheDocument();
  expect(loadDemo).not.toHaveBeenCalled();
});
it("allows the real workspace through the live frame", () => {
  vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false"); route.path = '/upload';
  render(<AppFrame><p>real-workspace</p></AppFrame>);
  expect(screen.getByText('real-workspace')).toBeInTheDocument();
  route.path = '/network';
});
