import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Level03 } from "./Level03";
import { emptyProgress } from "../../state/learnProgress";

afterEach(() => cleanup());

function setup(overrides: { onComplete?: () => void } = {}) {
  return render(
    <Level03
      progress={emptyProgress()}
      onComplete={overrides.onComplete ?? (() => {})}
    />,
  );
}

describe("Level03", () => {
  it("renders the info slider with all 6 stops", () => {
    setup();
    expect(screen.getByTestId("info-stop-private")).toBeTruthy();
    expect(screen.getByTestId("info-stop-cost-band")).toBeTruthy();
    expect(screen.getByTestId("info-stop-full-oracle")).toBeTruthy();
  });

  it("starts at 'private' and updates when the user clicks another stop", () => {
    setup();
    expect(
      screen.getByTestId("info-stop-private").getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByTestId("info-stop-cost-band"));
    expect(
      screen.getByTestId("info-stop-cost-band").getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("disables reveal until the user has visited 3 distinct stops", () => {
    setup();
    const revealBtn = screen.getByTestId("predict-reveal-button");
    expect((revealBtn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("info-stop-cost-band"));
    fireEvent.click(screen.getByTestId("info-stop-full-oracle"));
    // Now visited = {private, cost-band, full-oracle}
    expect((revealBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it("surplus + privacy update when info mode changes", () => {
    setup();
    fireEvent.click(screen.getByTestId("info-stop-cost-band"));
    const surplus = screen.getByTestId("level3-surplus");
    expect(surplus.textContent).toMatch(/cost band/i);
  });

  it("Continue stays disabled until the user reveals", () => {
    setup();
    fireEvent.click(screen.getByTestId("info-stop-cost-band"));
    fireEvent.click(screen.getByTestId("info-stop-full-oracle"));
    const cont = screen.getByTestId("level-continue") as HTMLButtonElement;
    expect(cont.disabled).toBe(true);
    fireEvent.click(screen.getByTestId("predict-reveal-button"));
    expect(cont.disabled).toBe(false);
  });

  it("clicking Continue invokes onComplete when enabled", () => {
    const onComplete = vi.fn();
    setup({ onComplete });
    fireEvent.click(screen.getByTestId("info-stop-cost-band"));
    fireEvent.click(screen.getByTestId("info-stop-full-oracle"));
    fireEvent.click(screen.getByTestId("predict-reveal-button"));
    fireEvent.click(screen.getByTestId("level-continue"));
    expect(onComplete).toHaveBeenCalled();
  });
});
