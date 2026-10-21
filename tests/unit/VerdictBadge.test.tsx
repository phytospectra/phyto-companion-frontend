import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VerdictBadge } from "@/components/phyto/common/VerdictBadge";
import { VERDICT_META } from "@/lib/phyto/constants";

function renderBadge(verdict: Parameters<typeof VerdictBadge>[0]["verdict"]) {
  return render(
    <TooltipProvider delayDuration={0}>
      <VerdictBadge verdict={verdict} />
    </TooltipProvider>
  );
}

describe("VerdictBadge", () => {
  it("renders the verdict's short text label", () => {
    renderBadge("CONFIRMED");
    expect(screen.getByText(VERDICT_META.CONFIRMED.short)).toBeInTheDocument();
  });

  it("applies the verdict-specific colour classes", () => {
    renderBadge("AMBIGUOUS");
    const badge = screen.getByRole("status");
    expect(badge.className).toContain("rose");
    expect(badge.className).not.toContain("emerald");
  });

  it("shows the full definition in a tooltip on hover", async () => {
    const user = userEvent.setup();
    renderBadge("TENTATIVE");
    const badge = screen.getByRole("status");
    await user.hover(badge);
    // The full definition appears in the tooltip content.
    expect(
      await screen.findByText(VERDICT_META.TENTATIVE.definition)
    ).toBeInTheDocument();
  });
});
