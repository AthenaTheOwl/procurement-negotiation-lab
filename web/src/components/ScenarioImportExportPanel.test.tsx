import { describe, expect, it, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ScenarioImportExportPanel } from "./ScenarioImportExportPanel";
import { makeScenario } from "../model/simulation";

afterEach(() => {
  cleanup();
});

describe("ScenarioImportExportPanel", () => {
  it("renders copy + load controls", () => {
    const scenario = makeScenario();
    render(<ScenarioImportExportPanel scenario={scenario} onLoad={() => {}} />);
    expect(screen.getByTestId("scenario-copy-btn")).toBeTruthy();
    const loadBtn = screen.getByTestId("scenario-load-btn") as HTMLButtonElement;
    expect(loadBtn.disabled).toBe(true);
  });

  it("rejects malformed JSON with a field-path error", () => {
    const scenario = makeScenario();
    render(<ScenarioImportExportPanel scenario={scenario} onLoad={() => {}} />);
    const textarea = screen.getByTestId("scenario-paste-textarea") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "{ not json" } });
    fireEvent.click(screen.getByTestId("scenario-load-btn"));
    expect(screen.getByTestId("scenario-errors")).toBeTruthy();
  });

  it("accepts a valid scenario JSON and calls onLoad with migrated data", () => {
    const scenario = makeScenario({ splitRule: "shapley" });
    type Loaded = typeof scenario;
    const captured: { value: Loaded | null } = { value: null };
    render(
      <ScenarioImportExportPanel
        scenario={scenario}
        onLoad={(loaded) => {
          captured.value = loaded as Loaded;
        }}
      />,
    );
    const textarea = screen.getByTestId("scenario-paste-textarea") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: JSON.stringify(scenario) } });
    fireEvent.click(screen.getByTestId("scenario-load-btn"));
    expect(captured.value).not.toBeNull();
    expect(captured.value?.splitRule).toBe("shapley");
  });

  it("migrates scenarios missing schemaVersion with a warning", () => {
    const scenario = makeScenario();
    const raw = { ...scenario } as Record<string, unknown>;
    delete raw.schemaVersion;
    delete raw.splitRule;
    delete raw.provenance;
    render(<ScenarioImportExportPanel scenario={scenario} onLoad={() => {}} />);
    const textarea = screen.getByTestId("scenario-paste-textarea") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: JSON.stringify(raw) } });
    fireEvent.click(screen.getByTestId("scenario-load-btn"));
    expect(screen.getByTestId("scenario-warnings")).toBeTruthy();
  });
});
