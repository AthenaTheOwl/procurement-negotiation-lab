import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SurplusBar } from "./SurplusBar";

afterEach(() => {
  cleanup();
});

describe("SurplusBar", () => {
  it("renders value and lost segments proportionally", () => {
    render(<SurplusBar value={750} lost={250} label="surplus" />);
    const value = screen.getByTestId("surplus-bar-value");
    const lost = screen.getByTestId("surplus-bar-lost");
    expect(value.getAttribute("style")).toContain("width: 75%");
    expect(lost.getAttribute("style")).toContain("width: 25%");
  });

  it("renders only the value segment when lost is zero", () => {
    render(<SurplusBar value={500} />);
    const value = screen.getByTestId("surplus-bar-value");
    const lost = screen.getByTestId("surplus-bar-lost");
    expect(value.getAttribute("style")).toContain("width: 100%");
    expect(lost.getAttribute("style")).toContain("width: 0%");
  });

  it("clamps negative values to zero", () => {
    render(<SurplusBar value={-100} lost={-50} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("0");
  });

  it("uses an explicit max for scaling when provided", () => {
    render(<SurplusBar value={100} lost={100} max={1000} />);
    const value = screen.getByTestId("surplus-bar-value");
    expect(value.getAttribute("style")).toContain("width: 10%");
  });

  it("formats the readout as captured + lost when both present", () => {
    render(<SurplusBar value={1825} lost={950} />);
    expect(screen.getByText("$1,825 captured, $950 lost")).toBeTruthy();
  });

  it("uses the override readout when supplied", () => {
    render(<SurplusBar value={1825} readout="custom text" />);
    expect(screen.getByText("custom text")).toBeTruthy();
  });

  it("exposes a progressbar role with accurate aria values", () => {
    render(<SurplusBar value={400} lost={100} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuenow")).toBe("400");
    expect(bar.getAttribute("aria-valuemax")).toBe("500");
  });
});
