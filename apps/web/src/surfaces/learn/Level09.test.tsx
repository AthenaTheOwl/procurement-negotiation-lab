import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Level09 } from "./Level09";
import { emptyProgress } from "../../state/learnProgress";

afterEach(() => cleanup());

function setup(overrides: {
  onComplete?: () => void;
  onOpenSandbox?: () => void;
} = {}) {
  return render(
    <Level09
      progress={emptyProgress()}
      onComplete={overrides.onComplete ?? (() => {})}
      onOpenSandbox={overrides.onOpenSandbox}
    />,
  );
}

describe("Level09", () => {
  it("renders all 12 week rows with editable q + commitment", () => {
    setup();
    for (let w = 1; w <= 12; w += 1) {
      expect(screen.getByTestId(`week-${w}`)).toBeTruthy();
    }
    expect((screen.getByTestId("commitment-1") as HTMLSelectElement).value).toBe(
      "firm",
    );
  });

  it("Continue disabled until reveal", () => {
    setup();
    expect((screen.getByTestId("level-continue") as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("editing a q value updates the totals", () => {
    setup();
    const beforeTotal = screen.getByTestId("level9-total").textContent;
    const q1 = screen.getByTestId("q-1") as HTMLInputElement;
    fireEvent.change(q1, { target: { value: "100" } });
    const afterTotal = screen.getByTestId("level9-total").textContent;
    expect(afterTotal).not.toBe(beforeTotal);
  });

  it("`all-firm` preset switches every commitment dropdown to firm", () => {
    setup();
    fireEvent.click(screen.getByTestId("preset-all-firm"));
    for (let w = 1; w <= 12; w += 1) {
      expect(
        (screen.getByTestId(`commitment-${w}`) as HTMLSelectElement).value,
      ).toBe("firm");
    }
  });

  it("`optimal` preset closes the gap to zero", () => {
    setup();
    fireEvent.change(screen.getByTestId("q-1") as HTMLInputElement, {
      target: { value: "200" },
    });
    fireEvent.click(screen.getByTestId("preset-optimal"));
    const gap = screen.getByTestId("level9-gap").textContent ?? "";
    expect(gap).toMatch(/\$0/);
  });

  it("reveal button unlocks after the user edits, and Continue unlocks after reveal", () => {
    setup();
    expect(
      (screen.getByTestId("level9-reveal") as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByTestId("preset-all-firm"));
    expect(
      (screen.getByTestId("level9-reveal") as HTMLButtonElement).disabled,
    ).toBe(false);
    fireEvent.click(screen.getByTestId("level9-reveal"));
    expect(screen.getByTestId("level9-reveal-text")).toBeTruthy();
    expect((screen.getByTestId("level-continue") as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("Continue calls onComplete and onOpenSandbox (graduation)", () => {
    const onComplete = vi.fn();
    const onOpenSandbox = vi.fn();
    setup({ onComplete, onOpenSandbox });
    fireEvent.click(screen.getByTestId("preset-optimal"));
    fireEvent.click(screen.getByTestId("level9-reveal"));
    fireEvent.click(screen.getByTestId("level-continue"));
    expect(onComplete).toHaveBeenCalled();
    expect(onOpenSandbox).toHaveBeenCalled();
  });
});
