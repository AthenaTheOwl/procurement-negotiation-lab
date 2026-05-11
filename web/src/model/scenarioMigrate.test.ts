import { describe, expect, it } from "vitest";
import { migrateScenario } from "./scenarioMigrate";
import { makeScenario } from "./simulation";
import { SCHEMA_VERSION } from "./scenarioSchema";

describe("migrateScenario", () => {
  it("upgrades a missing schemaVersion to the current version with warnings", () => {
    const scenario = makeScenario();
    const raw = { ...scenario } as Record<string, unknown>;
    delete raw.schemaVersion;
    delete raw.splitRule;
    delete raw.provenance;
    const result = migrateScenario(raw);
    expect(result.ok).toBe(true);
    expect(result.data?.schemaVersion).toBe(SCHEMA_VERSION);
    expect(result.warnings.some((w) => w.includes("schemaVersion"))).toBe(true);
    expect(result.warnings.some((w) => w.includes("splitRule"))).toBe(true);
    expect(result.warnings.some((w) => w.includes("provenance"))).toBe(true);
  });

  it("preserves a current-version scenario without errors", () => {
    const scenario = makeScenario();
    const result = migrateScenario({
      ...scenario,
      schemaVersion: SCHEMA_VERSION,
      splitRule: "shapley",
      provenance: { source: "synthetic", citations: [] },
    });
    expect(result.ok).toBe(true);
    expect(result.data?.splitRule).toBe("shapley");
  });

  it("rejects non-object input with a clear error", () => {
    const result = migrateScenario(42);
    expect(result.ok).toBe(false);
    expect(result.errors?.[0].message).toMatch(/object/);
  });

  it("rejects a scenario missing required keys after defaults are applied", () => {
    const result = migrateScenario({
      presetId: "",
      infoMode: "private",
      buyerAgentId: "x",
      supplierAgentId: "y",
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it("round-trips export → migrate → schema parse cleanly", () => {
    const scenario = makeScenario({ splitRule: "equal" });
    const serialized = JSON.stringify(scenario);
    const parsed = JSON.parse(serialized);
    const migrated = migrateScenario(parsed);
    expect(migrated.ok).toBe(true);
    expect(migrated.data?.splitRule).toBe("equal");
  });
});
