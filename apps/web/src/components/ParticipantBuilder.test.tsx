import { describe, expect, it, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ParticipantBuilder } from "./ParticipantBuilder";
import { deriveParticipants, makeScenario } from "@lab/engine";
afterEach(() => {
  cleanup();
});

describe("ParticipantBuilder", () => {
  it("lists strategies and instantiates one with a single click", () => {
    const initial = deriveParticipants(makeScenario());
    let result = initial;
    render(
      <ParticipantBuilder
        participants={initial}
        onChange={(next) => {
          result = next;
        }}
      />,
    );
    expect(screen.getByTestId("strategy-list")).toBeTruthy();
    const addButton = screen.getByTestId("add-packager-cowos");
    fireEvent.click(addButton);
    expect(result.length).toBe(initial.length + 1);
    expect(result[result.length - 1].role).toBe("packager");
  });

  it("filters strategies by role", () => {
    const initial = deriveParticipants(makeScenario());
    render(<ParticipantBuilder participants={initial} onChange={() => {}} />);
    const supplierFilter = screen.getByTestId("filter-supplier");
    fireEvent.click(supplierFilter);
    expect(screen.queryByTestId("add-packager-cowos")).toBeNull();
    expect(screen.queryByTestId("add-capacity-guard-supplier")).toBeTruthy();
  });

  it("disables remove when only 2 participants remain", () => {
    const initial = deriveParticipants(makeScenario());
    render(<ParticipantBuilder participants={initial} onChange={() => {}} />);
    const removeBtn = screen.getByTestId(`remove-${initial[0].id}`) as HTMLButtonElement;
    expect(removeBtn.disabled).toBe(true);
  });

  it("disables add when 8 participants reached", () => {
    const filled = deriveParticipants(makeScenario({ participantCount: 8 }));
    render(<ParticipantBuilder participants={filled} onChange={() => {}} />);
    const button = screen.getByTestId("add-packager-cowos") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
