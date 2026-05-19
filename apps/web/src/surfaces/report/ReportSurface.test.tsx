import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { assembleReport, clearAll, makeScenario, saveRun } from "@lab/engine";
import { ReportSurface } from "./ReportSurface";

function setQuery(query: string): void {
  const url = new URL(window.location.href);
  url.search = query;
  window.history.replaceState({}, "", url.toString());
}

describe("ReportSurface", () => {
  beforeEach(() => {
    clearAll();
  });

  afterEach(() => {
    cleanup();
    setQuery("");
  });

  it("renders a saved run when ?report=<id> is present", () => {
    const scenario = makeScenario({ presetId: "advanced-packaging-bottleneck" });
    const report = assembleReport({ scenario, auditMode: false });
    saveRun(report);
    setQuery(`?report=${encodeURIComponent(report.id)}`);
    render(<ReportSurface />);
    expect(screen.getByTestId("report-surface")).toBeTruthy();
    expect(screen.getAllByText(/Coordination gap/i).length).toBeGreaterThan(0);
  });

  it("renders an error when neither id nor json is provided", () => {
    setQuery("");
    render(<ReportSurface />);
    expect(screen.getByTestId("report-surface-error")).toBeTruthy();
  });

  it("renders an error when the saved run id cannot be found", () => {
    setQuery("?report=nonexistent");
    render(<ReportSurface />);
    expect(screen.getByTestId("report-surface-error")).toBeTruthy();
  });
});
