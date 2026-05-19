import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { UtilityCurve } from "./UtilityCurve";

afterEach(() => cleanup());

const linearPoints = Array.from({ length: 11 }, (_, i) => ({
  x: i / 10,
  y: 8000 + i * 1000,
}));

describe("UtilityCurve", () => {
  it("renders outside-option line and curve path", () => {
    render(
      <UtilityCurve
        party="buyer"
        points={linearPoints}
        outsideOption={9000}
        currentX={0.5}
      />,
    );
    expect(screen.getByTestId("curve-line-buyer")).toBeTruthy();
    expect(screen.getByTestId("outside-line-buyer")).toBeTruthy();
    expect(screen.getByTestId("curve-marker-buyer")).toBeTruthy();
  });

  it("uses green marker when currentY is above outsideOption", () => {
    render(
      <UtilityCurve
        party="buyer"
        points={linearPoints}
        outsideOption={9000}
        currentX={1}
      />,
    );
    const marker = screen.getByTestId("curve-marker-buyer");
    expect(marker.getAttribute("fill")).toContain("surplus-good");
  });

  it("uses red marker when currentY is below outsideOption", () => {
    render(
      <UtilityCurve
        party="buyer"
        points={linearPoints}
        outsideOption={11000}
        currentX={0}
      />,
    );
    const marker = screen.getByTestId("curve-marker-buyer");
    expect(marker.getAttribute("fill")).toContain("surplus-lost");
  });

  it("clamps currentX to the sampled range", () => {
    render(
      <UtilityCurve
        party="supplier"
        points={linearPoints}
        outsideOption={9000}
        currentX={5}
      />,
    );
    // marker still rendered, no crash
    expect(screen.getByTestId("curve-marker-supplier")).toBeTruthy();
  });

  it("renders a label when provided", () => {
    render(
      <UtilityCurve
        party="buyer"
        points={linearPoints}
        outsideOption={9000}
        currentX={0.5}
        label="buyer utility"
      />,
    );
    expect(screen.getByText(/buyer utility/i)).toBeTruthy();
  });
});
