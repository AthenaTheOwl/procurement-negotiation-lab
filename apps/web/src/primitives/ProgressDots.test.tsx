import { describe, expect, it, afterEach, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { ProgressDots } from "./ProgressDots";

afterEach(() => {
  cleanup();
});

describe("ProgressDots", () => {
  it("renders one dot per level", () => {
    render(<ProgressDots current={1} total={8} completedThrough={0} />);
    for (let level = 1; level <= 8; level += 1) {
      expect(screen.getByTestId(`progress-dot-${level}`)).toBeTruthy();
    }
  });

  it("marks completed / current / locked states correctly", () => {
    render(<ProgressDots current={3} total={5} completedThrough={2} />);
    expect(
      screen.getByTestId("progress-dot-1").getAttribute("data-state"),
    ).toBe("completed");
    expect(
      screen.getByTestId("progress-dot-2").getAttribute("data-state"),
    ).toBe("completed");
    expect(
      screen.getByTestId("progress-dot-3").getAttribute("data-state"),
    ).toBe("current");
    expect(
      screen.getByTestId("progress-dot-4").getAttribute("data-state"),
    ).toBe("locked");
    expect(
      screen.getByTestId("progress-dot-5").getAttribute("data-state"),
    ).toBe("locked");
  });

  it("sets aria-current=step on the current level", () => {
    render(<ProgressDots current={4} total={8} completedThrough={3} />);
    expect(
      screen.getByTestId("progress-dot-4").getAttribute("aria-current"),
    ).toBe("step");
  });

  it("disables locked dots and enables completed/current when onJumpTo is supplied", () => {
    const onJumpTo = vi.fn();
    render(
      <ProgressDots
        current={3}
        total={5}
        completedThrough={2}
        onJumpTo={onJumpTo}
      />,
    );
    const completed = screen.getByTestId("progress-dot-1") as HTMLButtonElement;
    const current = screen.getByTestId("progress-dot-3") as HTMLButtonElement;
    const locked = screen.getByTestId("progress-dot-5") as HTMLButtonElement;
    expect(completed.disabled).toBe(false);
    expect(current.disabled).toBe(false);
    expect(locked.disabled).toBe(true);
    fireEvent.click(completed);
    fireEvent.click(current);
    fireEvent.click(locked);
    expect(onJumpTo).toHaveBeenCalledTimes(2);
    expect(onJumpTo).toHaveBeenCalledWith(1);
    expect(onJumpTo).toHaveBeenCalledWith(3);
  });
});
