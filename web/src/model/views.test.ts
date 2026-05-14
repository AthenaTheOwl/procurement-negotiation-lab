import { describe, it, expect } from "vitest";
import { makeScenario } from "./simulation";
import { deriveParticipants } from "./participants";
import { redactForView } from "./views";

describe("redactForView", () => {
  it("coordinator view shows all participants un-redacted", () => {
    const scenario = makeScenario({ participantCount: 4 });
    const participants = deriveParticipants(scenario);
    const view = redactForView(participants, "coordinator");
    expect(view.kind).toBe("coordinator");
    expect(view.participants.every((p) => p.privateFieldsRedacted.length === 0)).toBe(true);
    expect(view.participants.every((p) => p.outsideOption !== undefined)).toBe(true);
  });

  it("buyer view hides other participants' outside options and capacity", () => {
    const scenario = makeScenario({ participantCount: 4 });
    const participants = deriveParticipants(scenario);
    const view = redactForView(participants, { role: "buyer", participantId: participants[0].id });
    expect(view.kind).toBe("buyer");
    expect(view.selfId).toBe(participants[0].id);
    const others = view.participants.filter((p) => !p.isSelf);
    for (const other of others) {
      expect(other.outsideOption).toBeUndefined();
      expect(other.capacity).toBeUndefined();
      expect(other.privateFieldsRedacted.length).toBeGreaterThan(0);
    }
    const self = view.participants.find((p) => p.isSelf);
    expect(self?.outsideOption).toBeDefined();
  });

  it("supplier view hides truthfulness and other competitors' capacity", () => {
    const scenario = makeScenario({ participantCount: 4 });
    const participants = deriveParticipants(scenario);
    const supplier = participants.find((p) => p.role === "supplier")!;
    const view = redactForView(participants, { role: "supplier", participantId: supplier.id });
    expect(view.kind).toBe("supplier");
    const competitors = view.participants.filter((p) => !p.isSelf && p.role === "supplier");
    for (const competitor of competitors) {
      expect(competitor.parameters?.truthfulness).toBeUndefined();
      expect(competitor.capacity).toBeUndefined();
    }
  });
});
