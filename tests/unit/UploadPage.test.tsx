import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadPage } from "@/components/phyto/upload/UploadPage";
import { clearToken, setToken } from "@/api/client";
import { useTokenStore } from "@/lib/phyto/stores";
import { MAX_UPLOAD_FILE_BYTES } from "@/lib/phyto/constants";

function mzML(name = "sample.mzML") {
  return new File(["<mzML/>"], name, { type: "application/xml" });
}

function renderUpload() {
  const onRunStarted = vi.fn();
  render(<UploadPage onRunStarted={onRunStarted} />);
  return { onRunStarted };
}

async function pick(file: File) {
  await userEvent.upload(screen.getByTestId("file-input"), file, {
    applyAccept: false,
  });
}

describe("UploadPage", () => {
  beforeEach(() => {
    clearToken();
    setToken("test-id-token");
    useTokenStore.getState().setBalance({
      balance: 500,
      user_id: "test-user",
      last_updated: new Date().toISOString(),
    });
  });

  it("reports an unsupported file by name and keeps it out of the list", async () => {
    renderUpload();
    await pick(new File(["x"], "chromatogram.pdf", { type: "application/pdf" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Skipped chromatogram\.pdf — unsupported format/
    );
    expect(
      screen.queryByLabelText("Selected spectra files")
    ).not.toBeInTheDocument();
  });

  it("rejects an over-limit file with an actionable message", async () => {
    renderUpload();
    // Simulate a 201 MB file without allocating the bytes.
    const big = new File(["x"], "huge.mzML", { type: "application/xml" });
    Object.defineProperty(big, "size", { value: MAX_UPLOAD_FILE_BYTES + 1 });
    await pick(big);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /exceeds the 200\.00 MB per-file limit/
    );
    expect(
      screen.queryByLabelText("Selected spectra files")
    ).not.toBeInTheDocument();
  });

  it("requires at least one spectra file before starting", async () => {
    const { onRunStarted } = renderUpload();

    await userEvent.click(
      screen.getByRole("button", { name: /start analysis/i })
    );

    expect(
      await screen.findByText(/add at least one spectra file/i)
    ).toBeInTheDocument();
    expect(onRunStarted).not.toHaveBeenCalled();
    expect(screen.getByTestId("upload-status")).toHaveTextContent(
      /could not be started/i
    );
  });

  it("starts a run through POST /runs and reports the returned run_id", async () => {
    const { onRunStarted } = renderUpload();
    await pick(mzML());
    await screen.findByText("sample.mzML");
    expect(screen.getByTestId("file-selection-status")).toHaveTextContent(
      "1 file selected."
    );

    await userEvent.click(
      screen.getByRole("button", { name: /start analysis/i })
    );

    await waitFor(() => expect(onRunStarted).toHaveBeenCalledTimes(1));
    expect(onRunStarted).toHaveBeenCalledWith(
      expect.stringMatching(/^run_/)
    );
    expect(await screen.findByTestId("upload-status")).toHaveTextContent(
      /analysis run run_ started|started\. opening/i
    );
  });

  it("rejects a malformed HRMS m/z on single-compound workflows", async () => {
    renderUpload();
    await pick(mzML());
    await screen.findByText("sample.mzML");

    // Switch to the single-compound "novelty" workflow.
    await userEvent.click(
      screen.getByRole("button", { name: /novelty/i })
    );

    const hrms = screen.getByLabelText(/HRMS m\/z/i);
    // A negative m/z is physically meaningless; the number input still
    // accepts the keystrokes, so the schema is what must reject it.
    await userEvent.type(hrms, "-5");

    await userEvent.click(
      screen.getByRole("button", { name: /start analysis/i })
    );

    expect(
      await screen.findByText(/HRMS m\/z must be a positive number/i)
    ).toBeInTheDocument();
  });

  it("lists accepted formats and shows the privacy note in the drop zone", () => {
    renderUpload();
    // The description splits the format list and the help link across
    // nodes, so match on the stable fragments.
    expect(
      screen.getByText(/Accepted: .* Multiple files or a single archive/)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "What file types are supported?" })).toBeInTheDocument();
    expect(
      screen.getByText(/Your data stays yours\./)
    ).toBeInTheDocument();
  });
});