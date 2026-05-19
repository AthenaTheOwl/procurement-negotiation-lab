import { SCHEMA_VERSION, parseScenario, type ScenarioSchemaOutput } from "./scenarioSchema";

export interface MigrateResult {
  ok: boolean;
  data?: ScenarioSchemaOutput;
  fromVersion: string;
  toVersion: string;
  warnings: string[];
  errors?: Array<{ path: string; message: string }>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function migrateScenario(input: unknown): MigrateResult {
  const warnings: string[] = [];
  if (!isObject(input)) {
    return {
      ok: false,
      fromVersion: "unknown",
      toVersion: SCHEMA_VERSION,
      warnings,
      errors: [{ path: "$", message: "scenario must be an object" }],
    };
  }
  const raw: Record<string, unknown> = { ...input };
  const fromVersion = typeof raw.schemaVersion === "string" ? raw.schemaVersion : "0.0.0";

  if (!raw.schemaVersion) {
    warnings.push(`schemaVersion missing; assuming pre-0.5.0; upgrading to ${SCHEMA_VERSION}`);
  } else if (raw.schemaVersion !== SCHEMA_VERSION) {
    warnings.push(`schemaVersion ${raw.schemaVersion} → ${SCHEMA_VERSION}`);
  }
  raw.schemaVersion = SCHEMA_VERSION;

  if (!raw.splitRule) {
    raw.splitRule = "proportional";
    warnings.push("splitRule defaulted to 'proportional'");
  }
  if (!raw.provenance) {
    raw.provenance = { source: "synthetic", citations: [] };
    warnings.push("provenance defaulted to synthetic");
  }

  // Backfill: older shapes may not yet carry alpha/epsilon/buyerReliability/etc
  const numericDefaults: Record<string, number> = {
    alpha: 1,
    epsilon: 0,
    buyerReliability: 1,
    supplierReliability: 1,
    customBuyerUrgency: 0.6,
    customSupplierFlexibility: 0.5,
    customTruthfulness: 0.7,
    customPrivacyPreference: 0.6,
    customRiskAversion: 0.6,
    participantCount: 2,
    productCount: 1,
    periodCount: 1,
    fulfillmentCenterCount: 3,
    leadTimeWeeks: 12,
  };
  for (const [field, value] of Object.entries(numericDefaults)) {
    if (typeof raw[field] !== "number") {
      raw[field] = value;
      warnings.push(`${field} defaulted to ${value}`);
    }
  }
  if (typeof raw.demand !== "number") {
    raw.demand = 500;
    warnings.push("demand defaulted to 500");
  }
  if (!raw.infoMode) {
    raw.infoMode = "forecast-band";
    warnings.push("infoMode defaulted to forecast-band");
  }

  const result = parseScenario(raw);
  if (!result.ok || !result.data) {
    return {
      ok: false,
      fromVersion,
      toVersion: SCHEMA_VERSION,
      warnings,
      errors: result.errors,
    };
  }
  return { ok: true, data: result.data, fromVersion, toVersion: SCHEMA_VERSION, warnings };
}
