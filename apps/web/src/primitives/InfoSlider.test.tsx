import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { INFO_STOPS, InfoSlider } from "./InfoSlider";

afterEach(() => cleanup());

describe("InfoSlider", () => {
  it("renders 6 stops in order", () => {
    render(<InfoSlider value="private" onChange={() => {}} />);
    for (const stop of INFO_STOPS) {
      expect(screen.getByTestId(`info-stop-${stop}`)).toBeTruthy();
    }
  });

  it("marks the current stop as pressed", () => {
    render(<InfoSlider value="cost-band" onChange={() => {}} />);
    const active = screen.getByTestId("info-stop-cost-band");
    expect(active.getAttribute("aria-pressed")).toBe("true");
    const idle = screen.getByTestId("info-stop-private");
    expect(idle.getAttribute("aria-pressed")).toBe("false");
  });

  it("clicking a stop fires onChange with that mode", () => {
    const onChange = vi.fn();
    render(<InfoSlider value="private" onChange={onChange} />);
    fireEvent.click(screen.getByTestId("info-stop-forecast-band"));
    expect(onChange).toHaveBeenCalledWith("forecast-band");
  });

  it("disabled slider does not fire onChange", () => {
    const onChange = vi.fn();
    render(<InfoSlider value="private" onChange={onChange} disabled />);
    fireEvent.click(screen.getByTestId("info-stop-full-oracle"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("highlight prop applies the highlight style to listed stops", () => {
    render(
      <InfoSlider
        value="private"
        onChange={() => {}}
        highlight={["cost-band", "forecast-band"]}
      />,
    );
    const highlighted = screen.getByTestId("info-stop-cost-band");
    expect(highlighted.getAttribute("style")).toContain("color-mix");
  });
});
