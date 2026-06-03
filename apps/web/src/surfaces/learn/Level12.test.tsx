import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Level12 } from "./Level12";
import { emptyProgress } from "../../state/learnProgress";

afterEach(() => cleanup());

function setup(overrides: { onComplete?: () => void } = {}) {
  return render(
    <Level12
      progress={emptyProgress()}
      onComplete={overrides.onComplete ?? (() => {})}
    />,
  );
}

describe("Level12", () => {
  it("renders the weighted-Nash, BATNA, and leakage framing", () => {
    setup();
    expect(
      screen.getByRole("heading", { name: /Weighted-Nash with a privacy budget/i }),
    ).toBeTruthy();
    expect(screen.getByTestId("level12-batna-explain").textContent).toMatch(
      /outside option/i,
    );
    expect(screen.getByTestId("level12-privacy-explain").textContent).toMatch(
      /measured epsilon/i,
    );
  });

  it("shows bounded-leakage epsilon by default", () => {
    setup();
    expect(screen.getByTestId("level12-leakage-card").textContent).toMatch(
      /epsilon/i,
    );
    expect(screen.getByTestId("level12-leakage-card").textContent).toMatch(
      /Bound/i,
    );
  });

  it("switches to the plaintext oracle and names the missing privacy claim", () => {
    setup();
    fireEvent.click(screen.getByTestId("level12-mode-plaintext"));
    expect(screen.getByTestId("level12-leakage-card").textContent).toMatch(
      /full oracle/i,
    );
    expect(screen.getByTestId("level12-leakage-card").textContent).toMatch(
      /sees every utility formula/i,
    );
  });

  it("requires both mechanisms and Got it before Continue completes", () => {
    const onComplete = vi.fn();
    setup({ onComplete });
    const cont = screen.getByTestId("level-continue") as HTMLButtonElement;
    expect(cont.disabled).toBe(true);

    const got = screen.getByTestId("level12-got-it") as HTMLButtonElement;
    expect(got.disabled).toBe(true);
    fireEvent.click(screen.getByTestId("level12-mode-plaintext"));
    expect((screen.getByTestId("level12-got-it") as HTMLButtonElement).disabled).toBe(
      false,
    );
    fireEvent.click(screen.getByTestId("level12-got-it"));
    expect((screen.getByTestId("level-continue") as HTMLButtonElement).disabled).toBe(
      false,
    );
    fireEvent.click(screen.getByTestId("level-continue"));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
