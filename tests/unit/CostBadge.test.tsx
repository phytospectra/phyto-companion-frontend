import * as React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CostBadge } from "@/components/phyto/common/CostBadge";
import { useTokenStore } from "@/lib/phyto/stores";

function resetBalance(balance: number) {
  useTokenStore.getState().setBalance({
    balance,
    user_id: "test-user",
    last_updated: new Date().toISOString(),
  });
}

function renderCost(cost: number) {
  return render(
    <TooltipProvider delayDuration={0}>
      <CostBadge cost={cost} operation="Test operation" />
    </TooltipProvider>
  );
}

describe("CostBadge", () => {
  beforeEach(() => resetBalance(50));

  it("shows the operation's token cost", () => {
    renderCost(12);
    expect(screen.getByRole("status")).toHaveTextContent("12");
  });

  it("shows the current balance in its accessible label", () => {
    resetBalance(50);
    renderCost(12);
    expect(screen.getByRole("status")).toHaveAccessibleName(/Current balance: 50/);
  });
});
