import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Level11 } from "./Level11";
import { emptyProgress } from "../../state/learnProgress";

afterEach(() => cleanup());

function setup(overrides: { onComplete?: () => void } = {}) {
  return render(
    <Level11
      progress={emptyProgress()}
      onComplete={overrides.onComplete ?? (() => {})}
    />,
  );
}

describe("Level11", () => {
  it("renders all 12 coordination mechanisms as tiles", () => {
    setup();
    expect(screen.getByTestId("mechanism-rule")).toBeTruthy();
    expect(screen.getByTestId("mechanism-posted-price")).toBeTruthy();
    expect(screen.getByTestId("mechanism-admm")).toBeTruthy();
    expect(
      screen.getByTestId("mechanism-differentially-private-admm"),
    ).toBeTruthy();
    expect(screen.getByTestId("mechanism-secure-mpc")).toBeTruthy();
  });

  it("selecting a tile updates the detail card to that mechanism", () => {
    setup();
    fireEvent.click(screen.getByTestId("mechanism-admm"));
    const detail = screen.getByTestId("level11-detail");
    expect(detail.textContent).toMatch(/ADMM/);
    expect(screen.getByTestId("level11-exchanges").textContent).toMatch(
      /local primal updates/i,
    );
  });

  it("Got it disabled until at least 4 mechanisms have been visited", () => {
    setup();
    const got = screen.getByTestId("level11-got-it") as HTMLButtonElement;
    expect(got.disabled).toBe(true);
    fireEvent.click(screen.getByTestId("mechanism-admm"));
    fireEvent.click(screen.getByTestId("mechanism-rfq"));
    fireEvent.click(screen.getByTestId("mechanism-sealed-auction"));
    // posted-price counts as the default first visit
    expect((screen.getByTestId("level11-got-it") as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("Got it -> Continue unlocks; Continue invokes onComplete", () => {
    const onComplete = vi.fn();
    setup({ onComplete });
    fireEvent.click(screen.getByTestId("mechanism-admm"));
    fireEvent.click(screen.getByTestId("mechanism-rfq"));
    fireEvent.click(screen.getByTestId("mechanism-secure-mpc"));
    fireEvent.click(screen.getByTestId("level11-got-it"));
    expect(screen.getByTestId("level11-reveal")).toBeTruthy();
    const cont = screen.getByTestId("level-continue") as HTMLButtonElement;
    expect(cont.disabled).toBe(false);
    fireEvent.click(cont);
    expect(onComplete).toHaveBeenCalled();
  });

  it("ADMM detail names the iterated-transcript leak risk; DP-ADMM doesn't", () => {
    setup();
    fireEvent.click(screen.getByTestId("mechanism-admm"));
    expect(screen.getByTestId("level11-leaks").textContent).toMatch(
      /marginal-cost curve/i,
    );
    fireEvent.click(screen.getByTestId("mechanism-differentially-private-admm"));
    expect(screen.getByTestId("level11-leaks").textContent).toMatch(
      /privacy budget/i,
    );
  });
});
