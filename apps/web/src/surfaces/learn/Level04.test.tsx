import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Level04 } from "./Level04";
import { emptyProgress } from "../../state/learnProgress";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function setup(overrides: { onComplete?: () => void } = {}) {
  return render(
    <Level04
      progress={emptyProgress()}
      onComplete={overrides.onComplete ?? (() => {})}
    />,
  );
}

describe("Level04", () => {
  it("renders two utility curves and a share slider", () => {
    setup();
    expect(screen.getByTestId("level4-curve-buyer")).toBeTruthy();
    expect(screen.getByTestId("level4-curve-supplier")).toBeTruthy();
    expect(screen.getByTestId("level4-share")).toBeTruthy();
  });

  it("starts at 0% share with buyer below outside option", () => {
    setup();
    expect(screen.getByTestId("level4-status").textContent).toMatch(
      /buyer would walk/i,
    );
  });

  it("moving share to 50% lands in the feasible band", () => {
    setup();
    const slider = screen.getByLabelText(
      /buyer's share/i,
    ) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "50" } });
    expect(screen.getByTestId("level4-status").textContent).toMatch(
      /both above outside option/i,
    );
  });

  it("reveal stays disabled until the user holds in the feasible band", () => {
    vi.useFakeTimers();
    setup();
    const reveal = screen.getByTestId("predict-reveal-button");
    expect((reveal as HTMLButtonElement).disabled).toBe(true);
    const slider = screen.getByLabelText(
      /buyer's share/i,
    ) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "50" } });
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect((reveal as HTMLButtonElement).disabled).toBe(false);
  });

  it("reveal then continue invokes onComplete", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    setup({ onComplete });
    const slider = screen.getByLabelText(
      /buyer's share/i,
    ) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "50" } });
    act(() => {
      vi.advanceTimersByTime(700);
    });
    fireEvent.click(screen.getByTestId("predict-reveal-button"));
    fireEvent.click(screen.getByTestId("level-continue"));
    expect(onComplete).toHaveBeenCalled();
  });
});
