import { describe, expect, it, afterEach, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { AgentFigure } from "./AgentFigure";

afterEach(() => {
  cleanup();
});

describe("AgentFigure", () => {
  it("renders an SVG image for the given role", () => {
    render(<AgentFigure role="buyer" />);
    const figure = screen.getByTestId("agent-figure-buyer");
    expect(figure.getAttribute("aria-label")).toContain("buyer");
  });

  it("reports the mood via data attribute", () => {
    render(<AgentFigure role="supplier" mood="worried" />);
    const figure = screen.getByTestId("agent-figure-supplier");
    expect(figure.getAttribute("data-mood")).toBe("worried");
  });

  it("renders all six roles without error", () => {
    const roles = [
      "buyer",
      "supplier",
      "packager",
      "logistics",
      "distributor",
      "coordinator",
    ] as const;
    for (const role of roles) {
      const { unmount } = render(<AgentFigure role={role} />);
      expect(screen.getByTestId(`agent-figure-${role}`)).toBeTruthy();
      unmount();
    }
  });

  it("renders all four moods without error", () => {
    const moods = ["neutral", "happy", "worried", "walked-away"] as const;
    for (const mood of moods) {
      const { unmount } = render(<AgentFigure role="buyer" mood={mood} />);
      expect(screen.getByTestId("agent-figure-buyer").getAttribute("data-mood")).toBe(
        mood,
      );
      unmount();
    }
  });

  it("dims the figure when mood is walked-away", () => {
    render(<AgentFigure role="buyer" mood="walked-away" />);
    const figure = screen.getByTestId("agent-figure-buyer");
    const style = figure.getAttribute("style") ?? "";
    expect(style).toContain("opacity: 0.3");
  });

  it("fires onActivate when clicked and treats itself as a button", () => {
    const onActivate = vi.fn();
    render(<AgentFigure role="buyer" onActivate={onActivate} />);
    const figure = screen.getByTestId("agent-figure-buyer");
    expect(figure.getAttribute("role")).toBe("button");
    fireEvent.click(figure);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("fires onActivate on Enter and Space keys", () => {
    const onActivate = vi.fn();
    render(<AgentFigure role="buyer" onActivate={onActivate} />);
    const figure = screen.getByTestId("agent-figure-buyer");
    fireEvent.keyDown(figure, { key: "Enter" });
    fireEvent.keyDown(figure, { key: " " });
    expect(onActivate).toHaveBeenCalledTimes(2);
  });

  it("renders the optional label below the figure", () => {
    render(<AgentFigure role="buyer" label="Northstar buyer" />);
    expect(screen.getByText("Northstar buyer")).toBeTruthy();
  });

  it("uses a unique aria-label for each role/mood pair when no label is given", () => {
    const { unmount } = render(<AgentFigure role="buyer" mood="happy" />);
    expect(
      screen.getByTestId("agent-figure-buyer").getAttribute("aria-label"),
    ).toBe("buyer agent, mood happy");
    unmount();
    render(<AgentFigure role="logistics" mood="worried" />);
    expect(
      screen.getByTestId("agent-figure-logistics").getAttribute("aria-label"),
    ).toBe("logistics agent, mood worried");
  });
});
