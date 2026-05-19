import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Level07 } from "./Level07";
import { emptyProgress } from "../../state/learnProgress";

afterEach(() => cleanup());

function setup(overrides: { onComplete?: () => void } = {}) {
  return render(
    <Level07
      progress={emptyProgress()}
      onComplete={overrides.onComplete ?? (() => {})}
    />,
  );
}

describe("Level07", () => {
  it("renders the honesty toggle starting OFF", () => {
    setup();
    const toggle = screen.getByTestId("honesty-toggle");
    expect(toggle.textContent).toBe("OFF");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });

  it("Continue disabled until the user toggles honesty", () => {
    setup();
    const cont = screen.getByTestId("level-continue") as HTMLButtonElement;
    expect(cont.disabled).toBe(true);
    fireEvent.click(screen.getByTestId("honesty-toggle"));
    expect((screen.getByTestId("level-continue") as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("toggling on flips the indicator and reveal blurb appears", () => {
    setup();
    fireEvent.click(screen.getByTestId("honesty-toggle"));
    expect(screen.getByTestId("honesty-toggle").textContent).toBe("ON");
    expect(screen.getByTestId("level7-reveal")).toBeTruthy();
  });

  it("summary updates after toggling honesty", () => {
    setup();
    const beforeText = screen.getByTestId("level7-summary").textContent;
    fireEvent.click(screen.getByTestId("honesty-toggle"));
    const afterText = screen.getByTestId("level7-summary").textContent;
    expect(afterText).not.toBe(beforeText);
  });

  it("Continue invokes onComplete after honesty toggled", () => {
    const onComplete = vi.fn();
    setup({ onComplete });
    fireEvent.click(screen.getByTestId("honesty-toggle"));
    fireEvent.click(screen.getByTestId("level-continue"));
    expect(onComplete).toHaveBeenCalled();
  });
});
