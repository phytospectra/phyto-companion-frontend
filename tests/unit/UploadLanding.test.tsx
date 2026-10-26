import * as React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadLanding } from "@/components/phyto/upload/UploadLanding";
import { AuthProvider } from "@/auth/AuthProvider";
import { SampleAnalysisDialog } from "@/components/phyto/upload/SampleAnalysisDialog";

function renderLanding() {
  return render(
    <AuthProvider>
      <UploadLanding />
    </AuthProvider>
  );
}

describe("UploadLanding (unauthenticated /upload)", () => {
  beforeEach(() => {
    // AuthProvider mock mode signs in locally; the landing must render its
    // form regardless, and mock sign-in flips status to authenticated.
    process.env.NEXT_PUBLIC_USE_MOCKS = "true";
  });

  it("shows the value proposition, benefits, and trust note before sign-in", () => {
    renderLanding();

    expect(
      screen.getByRole("heading", {
        name: /Upload your NMR \/ LC-MS data and receive evidence-graded structural hypotheses/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Evidence-graded hypotheses, not black-box guesses/i)[0]
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Built for natural-product discovery workflows/i)[0]
    ).toBeInTheDocument();
    expect(screen.getByText(/Your data stays yours\./)).toBeInTheDocument();
  });

  it("offers Google and email sign-in with labelled controls", () => {
    renderLanding();

    expect(screen.getByTestId("google-signin")).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in with email/i })
    ).toBeInTheDocument();
    // ORCID is flag-gated off until the Firebase provider is registered.
    expect(screen.queryByTestId("orcid-signin")).not.toBeInTheDocument();
  });

  it("opens the sample-analysis dialog, clearly labelled as demo data", async () => {
    renderLanding();

    await userEvent.click(
      screen.getByRole("button", { name: /see a sample analysis/i })
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/Sample analysis — demonstration data/i);
    expect(dialog).toHaveTextContent(/It is not your data/i);
    // The embedded report renders the fixture-driven ResultsPage content.
    expect(screen.getByText(/Assembled report/i)).toBeInTheDocument();
  });
});

describe("SampleAnalysisDialog", () => {
  it("renders a trigger labelled as needing no account", () => {
    render(<SampleAnalysisDialog />);
    expect(
      screen.getByRole("button", { name: /see a sample analysis/i })
    ).toBeInTheDocument();
  });
});