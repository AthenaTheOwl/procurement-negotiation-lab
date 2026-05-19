import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, fireEvent } from "@testing-library/react";
import { Level01 } from "./Level01";
import { emptyProgress } from "../../state/learnProgress";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("Level01", () => {
  it("renders both figures + the Settle button on first load", () => {
    render(<Level01 progress={emptyProgress()} onComplete={() => {}} />);
    expect(screen.getByTestId("agent-figure-buyer")).toBeTruthy();
    expect(screen.getByTestId("agent-figure-supplier")).toBeTruthy();
    expect(screen.getByTestId("settle-button")).toBeTruthy();
    expect(screen.queryByTestId("surplus-bar")).toBeNull();
  });

  it("shows the wants / has thought bubbles", () => {
    render(<Level01 progress={emptyProgress()} onComplete={() => {}} />);
    expect(screen.getByTestId("buyer-thought").textContent).toContain("500");
    expect(screen.getByTestId("supplier-thought").textContent).toContain("350");
  });

  it("clicking Settle reveals the SurplusBar and removes the button", () => {
    render(<Level01 progress={emptyProgress()} onComplete={() => {}} />);
    fireEvent.click(screen.getByTestId("settle-button"));
    expect(screen.getByTestId("surplus-bar")).toBeTruthy();
    expect(screen.queryByTestId("settle-button")).toBeNull();
  });

  it("keeps Continue disabled until the reveal beat elapses, then unlocks it", () => {
    render(<Level01 progress={emptyProgress()} onComplete={() => {}} />);
    fireEvent.click(screen.getByTestId("settle-button"));
    const continueBtn = screen.getByTestId("level-continue") as HTMLButtonElement;
    expect(continueBtn.disabled).toBe(true);
    // Advance fake timers past the REVEAL_BEAT_MS (600ms).
    act(() => {
      vi.advanceTimersByTime(700);
    });
    // Re-query after state update.
    expect((screen.getByTestId("level-continue") as HTMLButtonElement).disabled).toBe(false);
  });

  it("fires onComplete only after Continue is enabled and clicked", () => {
    const onComplete = vi.fn();
    render(<Level01 progress={emptyProgress()} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId("settle-button"));
    const continueBtn = screen.getByTestId("level-continue");
    fireEvent.click(continueBtn);
    // Still disabled at this point.
    expect(onComplete).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(700);
    });
    fireEvent.click(screen.getByTestId("level-continue"));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("switches both figures to worried mood when settled", () => {
    render(<Level01 progress={emptyProgress()} onComplete={() => {}} />);
    fireEvent.click(screen.getByTestId("settle-button"));
    expect(
      screen.getByTestId("agent-figure-buyer").getAttribute("data-mood"),
    ).toBe("worried");
    expect(
      screen.getByTestId("agent-figure-supplier").getAttribute("data-mood"),
    ).toBe("worried");
  });

  it("renders progress dots with Level 1 as current", () => {
    render(<Level01 progress={emptyProgress()} onComplete={() => {}} />);
    expect(
      screen.getByTestId("progress-dot-1").getAttribute("data-state"),
    ).toBe("current");
  });
});
