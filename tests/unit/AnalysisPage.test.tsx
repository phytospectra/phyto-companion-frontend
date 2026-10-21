import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnalysisPage } from "@/components/phyto/analysis/AnalysisPage";
import { clearToken, setToken } from "@/api/client";
import { useTokenStore } from "@/lib/phyto/stores";

/** A run that is already parked at the human checkpoint. */
const RUN_ID = "run_4a7e9c2b";

function renderAnalysis(onViewResults = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={0}>
        <AnalysisPage run_id={RUN_ID} onViewResults={onViewResults} />
      </TooltipProvider>
    </QueryClientProvider>
  );
  return { onViewResults, client };
}

describe("AnalysisPage", () => {
  beforeEach(() => {
    clearToken();
    setToken("test-id-token");
    useTokenStore.getState().setBalance({
      balance: 100,
      user_id: "test-user",
      last_updated: new Date().toISOString(),
    });
  });

  it("renders the run's tasks and the awaiting-review checkpoint", async () => {
    renderAnalysis();

    expect(
      await screen.findByRole("heading", { name: /analysis ·/i })
    ).toBeInTheDocument();
    expect(await screen.findByTestId("task-elucidate_candidates")).toBeInTheDocument();
    expect(
      screen.getByTestId("checkpoint-node-post_elucidation")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /approval required/i })
    ).toBeInTheDocument();
  });

  it("blocks a checkpoint decision until a reason is typed", async () => {
    renderAnalysis();
    await screen.findByRole("heading", { name: /approval required/i });

    await userEvent.click(
      screen.getByRole("button", { name: /approve and continue/i })
    );

    expect(
      screen.getByText(/please give a reason of at least 10 characters/i)
    ).toBeInTheDocument();
    // The checkpoint is still awaiting review — nothing was submitted.
    expect(
      screen.getByRole("heading", { name: /approval required/i })
    ).toBeInTheDocument();
  });

  it("shows the token cost tracker against the current balance", async () => {
    renderAnalysis();

    expect(await screen.findByTestId("token-tracker")).toHaveTextContent(
      "15 / 100"
    );
  });

  it("submits an approval with the typed reason and clears the checkpoint", async () => {
    renderAnalysis();
    await screen.findByRole("heading", { name: /approval required/i });

    await userEvent.type(
      screen.getByLabelText(/reason for your decision/i),
      "Top-1 candidate matches all diagnostic fragments; proceed."
    );
    await userEvent.click(
      screen.getByRole("button", { name: /approve and continue/i })
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: /approval required/i })
      ).not.toBeInTheDocument()
    );
    // Approval resumes the run and records it in the audit log.
    expect(
      screen.getByLabelText(/^Status: Running$/i)
    ).toBeInTheDocument();
    expect(screen.getByText("checkpoint_approved")).toBeInTheDocument();
  });

  it("reports a rejection as a failed run with the reason surfaced", async () => {
    renderAnalysis();
    await screen.findByRole("heading", { name: /approval required/i });

    await userEvent.type(
      screen.getByLabelText(/reason for your decision/i),
      "MS2 evidence is too sparse to justify novel generation."
    );
    await userEvent.click(
      screen.getByRole("button", { name: /reject and stop/i })
    );

    await waitFor(() =>
      expect(screen.getByText(/^Run failed$/i)).toBeInTheDocument()
    );
    // The rejection reason is visible in the failure banner and the audit tail.
    expect(
      screen.getAllByText(/no further metered operations ran/i)
    ).toHaveLength(2);
    expect(screen.getByText("checkpoint_rejected")).toBeInTheDocument();
  });
});
