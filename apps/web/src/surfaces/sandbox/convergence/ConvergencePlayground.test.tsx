import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ConvergencePlayground } from "./ConvergencePlayground";

afterEach(() => cleanup());

describe("ConvergencePlayground", () => {
  it("renders method choices, round log, and fallback menu", () => {
    render(<ConvergencePlayground />);
    expect(screen.getByTestId("convergence-method-consensus-admm")).toBeTruthy();
    expect(screen.getByTestId("convergence-final-consensus")).toBeTruthy();
    expect(screen.getByTestId("convergence-round-1")).toBeTruthy();
    expect(screen.getByTestId("convergence-menu-balanced")).toBeTruthy();
    expect(screen.getByTestId("convergence-guide-contract-menu")).toBeTruthy();
  });

  it("switching to price clearing changes the method surface", () => {
    render(<ConvergencePlayground />);
    fireEvent.click(screen.getByTestId("convergence-method-price-tatonnement"));
    expect(screen.getAllByText(/posted price/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/excess demand/i)).toBeTruthy();
  });

  it("editing target demand recomputes the residual", () => {
    render(<ConvergencePlayground />);
    fireEvent.click(screen.getByTestId("convergence-method-price-tatonnement"));
    const before = screen.getByTestId("convergence-final-residual").textContent;
    fireEvent.change(screen.getByTestId("convergence-input-targetDemand"), {
      target: { value: "3000" },
    });
    const after = screen.getByTestId("convergence-final-residual").textContent;
    expect(after).not.toBe(before);
  });
});
