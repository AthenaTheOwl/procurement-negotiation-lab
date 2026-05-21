import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TransferPricingStudio } from "./TransferPricingStudio";

afterEach(() => cleanup());

describe("TransferPricingStudio", () => {
  it("renders surplus, selected transfer, and guardrail", () => {
    render(<TransferPricingStudio />);
    expect(screen.getByTestId("transfer-welfare-surplus")).toBeTruthy();
    expect(screen.getByTestId("transfer-selected")).toBeTruthy();
    expect(screen.getByTestId("transfer-guardrail")).toBeTruthy();
    expect(screen.getByText(/acceptable interval exists/i)).toBeTruthy();
  });

  it("switching to two-part tariff shows marginal components", () => {
    render(<TransferPricingStudio />);
    fireEvent.click(screen.getByTestId("transfer-method-two-part-tariff"));
    expect(screen.getByTestId("transfer-component-capacity")).toBeTruthy();
    expect(screen.getByTestId("transfer-component-fixed-surplus")).toBeTruthy();
  });

  it("negative welfare blocks the transfer", () => {
    render(<TransferPricingStudio />);
    fireEvent.change(screen.getByTestId("transfer-input-vendorIncrementalCost"), {
      target: { value: "20000" },
    });
    expect(screen.getByText(/blocked by welfare guardrail/i)).toBeTruthy();
    expect(screen.getByTestId("transfer-selected").textContent).toBe("$0");
  });
});
