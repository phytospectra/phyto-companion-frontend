import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { BillingPage } from "@/components/phyto/billing/BillingPage";
import { UploadPage } from "@/components/phyto/upload/UploadPage";
import { mockApi } from "@/lib/phyto/mock-api";
import { runsApi } from "@/api/runs";

afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("live-mode fail-closed boundaries", () => {
  it("does not load demo transactions or offer simulated purchases", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
    const transactions = vi.spyOn(mockApi, "listTransactions");
    render(<BillingPage onTriggerInsufficient={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Billing unavailable" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(transactions).not.toHaveBeenCalled();
  });

  it("labels demo workflows and disables every live launch", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
    const start = vi.spyOn(runsApi, "start");
    render(<UploadPage onRunStarted={vi.fn()} />);
    expect(screen.getByText(/backend supports reference_hsqc_identify/)).toBeInTheDocument();
    for (const id of ["identify", "compare", "novelty", "mechanism_hypothesis"]) {
      expect(screen.getByTestId(`workflow-${id}`)).toBeDisabled();
    }
    expect(screen.getByRole("button", { name: /start analysis/i })).toBeDisabled();
    expect(start).not.toHaveBeenCalled();
  });
});
