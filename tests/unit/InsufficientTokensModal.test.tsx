import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InsufficientTokensModal } from "@/components/phyto/common/InsufficientTokensModal";
import { useTokenStore } from "@/lib/phyto/stores";

describe("InsufficientTokensModal", () => {
  beforeEach(() => {
    useTokenStore.setState({
      insufficientTokensError: null,
      pendingRetryOp: null,
    });
  });

  it("opens when the store holds a 402 error state", async () => {
    render(<InsufficientTokensModal onGoToBilling={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    act(() => {
      useTokenStore.getState().setInsufficientTokensError({
        operation_id: "op_test",
        balance: 5,
        required: 15,
        topup_url: "/billing/topup",
      });
    });

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Insufficient tokens")).toBeInTheDocument();
  });

  it("calls onGoToBilling when the buy button is clicked", async () => {
    const user = userEvent.setup();
    const onGoToBilling = vi.fn();
    act(() => {
      useTokenStore.getState().setInsufficientTokensError({
        operation_id: "op_test",
        balance: 5,
        required: 15,
        topup_url: "/billing/topup",
      });
    });

    render(<InsufficientTokensModal onGoToBilling={onGoToBilling} />);
    await user.click(screen.getByRole("button", { name: /go to billing/i }));

    expect(onGoToBilling).toHaveBeenCalledTimes(1);
  });
});
