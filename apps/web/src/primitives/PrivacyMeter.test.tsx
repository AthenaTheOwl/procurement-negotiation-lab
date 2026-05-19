import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PrivacyMeter } from "./PrivacyMeter";

afterEach(() => cleanup());

describe("PrivacyMeter", () => {
  it("renders 0% at exposure 0", () => {
    render(<PrivacyMeter exposure={0} />);
    expect(screen.getByTestId("privacy-meter-readout").textContent).toBe("0%");
  });

  it("renders 50% at exposure 0.5", () => {
    render(<PrivacyMeter exposure={0.5} />);
    expect(screen.getByTestId("privacy-meter-readout").textContent).toBe("50%");
  });

  it("clamps exposure above 1", () => {
    render(<PrivacyMeter exposure={1.5} />);
    expect(screen.getByTestId("privacy-meter-readout").textContent).toBe("100%");
  });

  it("clamps negative exposure to 0", () => {
    render(<PrivacyMeter exposure={-0.3} />);
    expect(screen.getByTestId("privacy-meter-readout").textContent).toBe("0%");
  });

  it("uses custom label", () => {
    render(<PrivacyMeter exposure={0.4} label="how much you've shared" />);
    expect(
      screen.getByLabelText(/how much you've shared: 40 percent/i),
    ).toBeTruthy();
  });
});
