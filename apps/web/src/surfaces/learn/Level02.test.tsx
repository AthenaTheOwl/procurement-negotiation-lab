import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Level02 } from "./Level02";
import { emptyProgress } from "../../state/learnProgress";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function setup(overrides: { onComplete?: () => void } = {}) {
  return render(
    <Level02
      progress={emptyProgress()}
      onComplete={overrides.onComplete ?? (() => {})}
    />,
  );
}

describe("Level02", () => {
  it("renders the title and knob", () => {
    setup();
    expect(screen.getByText(/Close the gap/i)).toBeTruthy();
    expect(screen.getByTestId("level2-knob")).toBeTruthy();
  });

  it("Continue is disabled until the user reveals", () => {
    setup();
    const cont = screen.getByTestId("level-continue") as HTMLButtonElement;
    expect(cont.disabled).toBe(true);
  });

  it("surplus bar updates when the knob moves", () => {
    setup();
    const knob = screen.getByLabelText(/units to commit/i) as HTMLInputElement;
    fireEvent.change(knob, { target: { value: "425" } });
    expect(screen.getByText(/Joint surplus at q = 425/i)).toBeTruthy();
  });

  it("readout flips to 'sweet spot' near the optimum", () => {
    setup();
    const knob = screen.getByLabelText(/units to commit/i) as HTMLInputElement;
    // The default-scenario optimum is around q=425; the tolerance is +/-25.
    fireEvent.change(knob, { target: { value: "500" } });
    expect(screen.getByTestId("level2-readout").textContent).toMatch(
      /sweet spot/i,
    );
  });

  it("reveal locks the prediction and shows the truth", () => {
    setup();
    const knob = screen.getByLabelText(/units to commit/i) as HTMLInputElement;
    fireEvent.change(knob, { target: { value: "300" } });
    fireEvent.click(screen.getByTestId("predict-reveal-button"));
    expect(screen.getByTestId("predict-reveal-guess").textContent).toContain(
      "300",
    );
    expect(screen.getByTestId("predict-reveal-truth").textContent).toMatch(
      /units/,
    );
  });

  it("Continue becomes enabled after reveal if user is at the optimum", () => {
    setup();
    const knob = screen.getByLabelText(/units to commit/i) as HTMLInputElement;
    fireEvent.change(knob, { target: { value: "500" } });
    fireEvent.pointerUp(knob);
    fireEvent.click(screen.getByTestId("predict-reveal-button"));
    const cont = screen.getByTestId("level-continue") as HTMLButtonElement;
    expect(cont.disabled).toBe(false);
  });

  it("clicking Continue invokes onComplete when enabled", () => {
    const onComplete = vi.fn();
    setup({ onComplete });
    const knob = screen.getByLabelText(/units to commit/i) as HTMLInputElement;
    fireEvent.change(knob, { target: { value: "500" } });
    fireEvent.pointerUp(knob);
    fireEvent.click(screen.getByTestId("predict-reveal-button"));
    fireEvent.click(screen.getByTestId("level-continue"));
    expect(onComplete).toHaveBeenCalled();
  });
});
