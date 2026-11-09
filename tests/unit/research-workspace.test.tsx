import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResearchWorkspace } from "@/components/phyto/research/ResearchWorkspace";
import { researchApi, parsePeaks, capabilitiesSchema, type Capabilities, type ResearchRun } from "@/api/research";
import { RequestTimeoutError } from "@/api/client";

const capability: Capabilities = {
  schema_version: 1, scientific_execution: "real", scientific_validation: "not_validated",
  configuration_valid: true, dependencies_available: true,
  supported_workflows: ["reference_hsqc_identify"], analysis_tokens: 20,
  pricing_provisional: true, run_storage: "process_local", production_ready: false, limitations: [],
};
const run: ResearchRun = {
  run_id: "run-private", workflow: "reference_hsqc_identify", status: "awaiting_review",
  scientific_execution: "real", scientific_validation: "not_validated", scientific_results: [],
  provenance_manifest_id: "manifest-test", awaiting_task_id: "review",
  tasks: [{ id: "review", requires_checkpoint: "before_confirmed_claim", status: "pending" }],
};
beforeEach(() => {
  vi.spyOn(researchApi, "capabilities").mockResolvedValue(capability);
  vi.spyOn(researchApi, "start").mockResolvedValue({ run_id: run.run_id });
  vi.spyOn(researchApi, "get").mockResolvedValue(run);
  vi.spyOn(researchApi, "approve").mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function enterQuery() {
  await waitFor(() => expect(screen.getByRole("button", { name: "Run reference ranking" })).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Sample identifier"), { target: { value: "sample-1" } });
  fireEvent.change(screen.getByLabelText("Molecular formula"), { target: { value: "C2H6O" } });
  fireEvent.change(screen.getByLabelText("HSQC peaks"), { target: { value: "1.2,18\n3.6,58,2" } });
}
it("blocks execution when backend capabilities are unavailable or mock", async () => {
  vi.mocked(researchApi.capabilities).mockResolvedValue({ ...capability, scientific_execution: "mock" });
  render(<ResearchWorkspace owner="alice" />);
  await screen.findByText(/No demo fallback/);
  expect(screen.getByRole("button", { name: "Run reference ranking" })).toBeDisabled();
  expect(researchApi.start).not.toHaveBeenCalled();
});
it("submits real peaks, retrieves evidence and requires explicit review", async () => {
  render(<ResearchWorkspace owner="alice" />);
  await enterQuery();
  fireEvent.click(screen.getByRole("button", { name: "Run reference ranking" }));
  const button = await screen.findByRole("button", { name: "Record review and complete checkpoint" });
  expect(button).toBeDisabled();
  expect(researchApi.start).toHaveBeenCalledWith("sample-1", "C2H6O", [
    { h_ppm: 1.2, c_ppm: 18, intensity: 1, experiment_type: "HSQC" },
    { h_ppm: 3.6, c_ppm: 58, intensity: 2, experiment_type: "HSQC" },
  ], expect.any(String), expect.any(AbortSignal));
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(button);
  await waitFor(() => expect(researchApi.approve).toHaveBeenCalledWith("run-private", "alice", expect.any(AbortSignal)));
});
it("freezes an uncertain submission and never generates an automatic retry", async () => {
  vi.mocked(researchApi.start).mockRejectedValue(new RequestTimeoutError());
  render(<ResearchWorkspace owner="alice" />);
  await enterQuery();
  fireEvent.click(screen.getByRole("button", { name: "Run reference ranking" }));
  await screen.findByRole("alert");
  expect(screen.getByText(/Do not submit it again with a new key/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Run reference ranking" })).toBeDisabled();
  expect(researchApi.start).toHaveBeenCalledTimes(1);
});
it("preserves a returned run ID when result retrieval fails", async () => {
  vi.mocked(researchApi.get).mockRejectedValue(new Error("Network failed"));
  render(<ResearchWorkspace owner="alice" />);
  await enterQuery();
  fireEvent.click(screen.getByRole("button", { name: "Run reference ranking" }));
  await screen.findByRole("alert");
  expect(screen.getByLabelText("Run ID")).toHaveValue("run-private");
  expect(screen.getByRole("button", { name: "Run reference ranking" })).toBeDisabled();
});
it("account-key remount discards private results and cancels outstanding requests", async () => {
  const view = render(<ResearchWorkspace key="alice" owner="alice" />);
  await enterQuery();
  fireEvent.click(screen.getByRole("button", { name: "Run reference ranking" }));
  await screen.findByText(/Run run-private:/);
  const signal = vi.mocked(researchApi.start).mock.calls[0][4];
  view.rerender(<ResearchWorkspace key="bob" owner="bob" />);
  expect(screen.queryByText(/Run run-private:/)).not.toBeInTheDocument();
  expect(screen.getByLabelText("Sample identifier")).toHaveValue("");
  expect(signal?.aborted).toBe(true);
});
it("rejects malformed, nonfinite and oversized observations", () => {
  for (const input of ["", "NaN,3", "1,Infinity", "1,2,-1", "16,2", "1,2,3,4", "1.2,,100", "1.2; ;100", "1.2,18,,100", "1,2\n".repeat(257)]) {
    expect(() => parsePeaks(input)).toThrow();
  }
  expect(() => capabilitiesSchema.parse({ ...capability, scientific_execution: "future-mode" })).toThrow();
});

it("clears uncertainty only when the original accepted run is recovered", async () => {
  vi.mocked(researchApi.get).mockRejectedValueOnce(new Error("Network failed"));
  render(<ResearchWorkspace owner="alice" />);
  await enterQuery();
  fireEvent.click(screen.getByRole("button", { name: "Run reference ranking" }));
  await screen.findByRole("alert");
  vi.mocked(researchApi.get).mockResolvedValueOnce({ ...run, run_id: "another-run" });
  fireEvent.change(screen.getByLabelText("Run ID"), { target: { value: "another-run" } });
  fireEvent.click(screen.getByRole("button", { name: "Load or refresh run" }));
  await screen.findByText(/Run another-run:/);
  expect(screen.getByRole("button", { name: "Run reference ranking" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Run ID"), { target: { value: "run-private" } });
  fireEvent.click(screen.getByRole("button", { name: "Load or refresh run" }));
  await screen.findByText(/Run run-private:/);
  await waitFor(() => expect(screen.getByRole("button", { name: "Run reference ranking" })).toBeEnabled());
  expect(researchApi.start).toHaveBeenCalledTimes(1);
});
