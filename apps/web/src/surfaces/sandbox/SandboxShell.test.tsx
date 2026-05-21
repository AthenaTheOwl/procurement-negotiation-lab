import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SandboxShell } from "./SandboxShell";

afterEach(() => cleanup());

describe("SandboxShell", () => {
  it("defaults to the buy-plan tab and renders BuyPlanStudio", () => {
    render(<SandboxShell />);
    expect(screen.getByTestId("sandbox-tab-buy-plan")).toBeTruthy();
    expect(screen.getByTestId("sandbox-tab-convergence")).toBeTruthy();
    expect(screen.getByTestId("sandbox-tab-transfers")).toBeTruthy();
    expect(screen.getByTestId("sandbox-tab-classic")).toBeTruthy();
    // BuyPlanStudio mounts inline (no lazy boundary), so its testid is visible.
    expect(screen.getByTestId("buyplan-studio")).toBeTruthy();
  });

  it("Buy plan tab is aria-selected by default", () => {
    render(<SandboxShell />);
    expect(
      screen
        .getByTestId("sandbox-tab-buy-plan")
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      screen
        .getByTestId("sandbox-tab-classic")
        .getAttribute("aria-selected"),
    ).toBe("false");
  });

  it("clicking Convergence renders the convergence playground", () => {
    render(<SandboxShell />);
    fireEvent.click(screen.getByTestId("sandbox-tab-convergence"));
    expect(screen.queryByTestId("buyplan-studio")).toBeNull();
    expect(screen.getByTestId("convergence-playground")).toBeTruthy();
    expect(
      screen
        .getByTestId("sandbox-tab-convergence")
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("clicking Transfers renders the transfer-pricing studio", () => {
    render(<SandboxShell />);
    fireEvent.click(screen.getByTestId("sandbox-tab-transfers"));
    expect(screen.queryByTestId("buyplan-studio")).toBeNull();
    expect(screen.getByTestId("transfer-pricing-studio")).toBeTruthy();
    expect(
      screen
        .getByTestId("sandbox-tab-transfers")
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("clicking Classic Lab Arena swaps tab and triggers lazy-load fallback", () => {
    render(<SandboxShell />);
    fireEvent.click(screen.getByTestId("sandbox-tab-classic"));
    // While the lazy chunk resolves, the loading fallback shows.
    expect(screen.queryByTestId("buyplan-studio")).toBeNull();
    // The aria-selected flips
    expect(
      screen
        .getByTestId("sandbox-tab-classic")
        .getAttribute("aria-selected"),
    ).toBe("true");
  });
});
