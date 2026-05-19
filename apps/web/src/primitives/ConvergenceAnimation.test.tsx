import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { ConvergenceAnimation } from "./ConvergenceAnimation";

let rafQueue: Array<(t: number) => void> = [];

function flushRaf(timestamp: number) {
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

describe("ConvergenceAnimation", () => {
  it("renders oracle variant with a single dot", () => {
    render(<ConvergenceAnimation kind="oracle" playing={false} />);
    expect(screen.getByTestId("convergence-oracle")).toBeTruthy();
    expect(screen.getByTestId("oracle-dot")).toBeTruthy();
    expect(screen.queryByTestId("buyer-dot")).toBeNull();
  });

  it("renders admm variant with two dots", () => {
    render(<ConvergenceAnimation kind="admm" playing={false} />);
    expect(screen.getByTestId("convergence-admm")).toBeTruthy();
    expect(screen.getByTestId("buyer-dot")).toBeTruthy();
    expect(screen.getByTestId("supplier-dot")).toBeTruthy();
  });

  it("renders vcg variant; transfer arrow only appears after progress 0.9", () => {
    render(<ConvergenceAnimation kind="vcg" playing={false} />);
    expect(screen.getByTestId("convergence-vcg")).toBeTruthy();
    // No animation has run; transfer absent.
    expect(screen.queryByTestId("vcg-transfer")).toBeNull();
  });

  it("when playing flips to true, the animation runs and onComplete fires", () => {
    const onComplete = vi.fn();
    render(
      <ConvergenceAnimation
        kind="admm"
        duration={1000}
        playing
        onComplete={onComplete}
      />,
    );
    expect(rafQueue.length).toBeGreaterThan(0);
    // simulate frame 0 then frame at duration end
    act(() => {
      flushRaf(0);
    });
    act(() => {
      flushRaf(1000);
    });
    expect(onComplete).toHaveBeenCalled();
  });
});
