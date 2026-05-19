import { describe, expect, it, afterEach, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { QuantityKnob } from "./QuantityKnob";

afterEach(() => {
  cleanup();
});

describe("QuantityKnob", () => {
  it("renders the label and current value", () => {
    render(
      <QuantityKnob
        label="Negotiated quantity"
        value={425}
        min={0}
        max={600}
        unit="units"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Negotiated quantity")).toBeTruthy();
    expect(screen.getByText("425 units")).toBeTruthy();
  });

  it("calls onChange with the new numeric value", () => {
    const onChange = vi.fn();
    render(
      <QuantityKnob
        label="q"
        value={100}
        min={0}
        max={500}
        onChange={onChange}
      />,
    );
    const slider = screen.getByLabelText("q") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "250" } });
    expect(onChange).toHaveBeenCalledWith(250);
  });

  it("calls onRelease on pointerup with the current value", () => {
    const onRelease = vi.fn();
    render(
      <QuantityKnob
        label="q"
        value={100}
        min={0}
        max={500}
        onChange={() => {}}
        onRelease={onRelease}
      />,
    );
    const slider = screen.getByLabelText("q") as HTMLInputElement;
    fireEvent.pointerUp(slider);
    expect(onRelease).toHaveBeenCalledWith(100);
  });

  it("honors a custom format function", () => {
    render(
      <QuantityKnob
        label="surplus"
        value={1825}
        min={0}
        max={10000}
        onChange={() => {}}
        format={(v) => `$${v.toLocaleString()}`}
      />,
    );
    expect(screen.getByText("$1,825")).toBeTruthy();
  });

  it("disables the input when disabled prop is true", () => {
    render(
      <QuantityKnob
        label="q"
        value={0}
        min={0}
        max={100}
        onChange={() => {}}
        disabled
      />,
    );
    const slider = screen.getByLabelText("q") as HTMLInputElement;
    expect(slider.disabled).toBe(true);
  });
});
