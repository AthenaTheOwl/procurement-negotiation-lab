import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Level05 } from "./Level05";
import { emptyProgress } from "../../state/learnProgress";

let rafQueue: Array<(t: number) => void> = [];

function flushRaf(timestamp: number) {
  // Each callback may schedule new callbacks; flush in waves until idle
  // (capped to avoid infinite loops if duration is large).
  for (let wave = 0; wave < 10 && rafQueue.length > 0; wave += 1) {
    const batch = rafQueue;
    rafQueue = [];
    for (const cb of batch) cb(timestamp);
  }
}

beforeEach(() => {
  rafQueue = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    rafQueue.push(cb);
    return rafQueue.length;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function setup(overrides: { onComplete?: () => void } = {}) {
  return render(
    <Level05
      progress={emptyProgress()}
      onComplete={overrides.onComplete ?? (() => {})}
    />,
  );
}

describe("Level05", () => {
  it("renders three mechanism panels with placeholder stats", () => {
    setup();
    expect(screen.getByTestId("panel-oracle")).toBeTruthy();
    expect(screen.getByTestId("panel-admm")).toBeTruthy();
    expect(screen.getByTestId("panel-vcg")).toBeTruthy();
    const stats = screen.getByTestId("stats-oracle");
    expect(stats.textContent).toContain("—");
  });

  it("Continue is disabled before Run all", () => {
    setup();
    const cont = screen.getByTestId("level-continue") as HTMLButtonElement;
    expect(cont.disabled).toBe(true);
  });

  it("Run all triggers all three animations and fills stats", () => {
    setup();
    fireEvent.click(screen.getByTestId("run-all"));
    // The animation drives via raf; trigger frame at end.
    act(() => {
      flushRaf(0);
    });
    act(() => {
      flushRaf(2_500);
    });
    // After completion, stats panels should have real values (no "—").
    const stats = screen.getByTestId("stats-oracle");
    expect(stats.textContent).not.toContain("—");
  });

  it("Run again replays the animations after completion (regression for stuck-running bug)", () => {
    setup();
    // First run
    fireEvent.click(screen.getByTestId("run-all"));
    act(() => {
      flushRaf(0);
    });
    act(() => {
      flushRaf(2_500);
    });
    // Button should re-enable and read "Run again"
    const button = screen.getByTestId("run-all") as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.textContent).toMatch(/run again/i);
    // Click it; animations should play again (button disabled, finished resets)
    fireEvent.click(button);
    expect((screen.getByTestId("run-all") as HTMLButtonElement).disabled).toBe(true);
    // Drain the new raf cycle
    act(() => {
      flushRaf(0);
    });
    act(() => {
      flushRaf(2_500);
    });
    // Re-enabled and back to "Run again" after the replay
    expect((screen.getByTestId("run-all") as HTMLButtonElement).disabled).toBe(false);
  });

  it("after Run all completes, reveal blurb appears and Continue unlocks", () => {
    const onComplete = vi.fn();
    setup({ onComplete });
    fireEvent.click(screen.getByTestId("run-all"));
    act(() => {
      flushRaf(0);
    });
    act(() => {
      flushRaf(2_500);
    });
    expect(screen.getByTestId("level5-reveal")).toBeTruthy();
    const cont = screen.getByTestId("level-continue") as HTMLButtonElement;
    expect(cont.disabled).toBe(false);
    fireEvent.click(cont);
    expect(onComplete).toHaveBeenCalled();
  });
});
