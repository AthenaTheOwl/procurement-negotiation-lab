import { z } from "zod";

export const SCHEMA_VERSION = "0.5.0" as const;

export const participantRoleSchema = z.enum([
  "buyer",
  "supplier",
  "packager",
  "logistics",
  "distributor",
  "coordinator",
]);

export const infoModeSchema = z.enum([
  "private",
  "risk-only",
  "capacity-band",
  "cost-band",
  "forecast-band",
  "full-oracle",
]);

export const agentParametersSchema = z.object({
  urgency: z.number().min(0).max(1),
  flexibility: z.number().min(0).max(1),
  truthfulness: z.number().min(0).max(1),
  privacyPreference: z.number().min(0).max(1),
  riskAversion: z.number().min(0).max(1),
});

export const participantSchema = z.object({
  id: z.string().min(1),
  role: participantRoleSchema,
  name: z.string().min(1),
  strategyId: z.string().min(1),
  reliability: z.number().min(0).max(1),
  capacity: z.number().min(0).optional(),
  outsideOption: z.number().min(0).optional(),
  parameters: agentParametersSchema,
});

export const splitRuleSchema = z.enum(["proportional", "equal", "shapley"]);

export const provenanceSourceSchema = z.enum([
  "synthetic",
  "chip-map",
  "supplier-risk-rag",
  "user-imported",
  "csv-imported",
]);

export const citationSchema = z.object({
  source: z.string().min(1),
  sourceId: z.string().optional(),
  span: z.string().optional(),
  url: z.string().optional(),
});

export const provenanceSchema = z.object({
  source: provenanceSourceSchema,
  sourceId: z.string().optional(),
  fetchedAt: z.string().optional(),
  citations: z.array(citationSchema).default([]),
  notes: z.string().optional(),
});

export const scenarioSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION).default(SCHEMA_VERSION),
    presetId: z.string().min(1),
    participants: z.array(participantSchema).min(2).max(8).optional(),
    demand: z.number().min(0),
    volatility: z.number().min(0).max(2),
    capacityTightness: z.number().min(0).max(1),
    leadTimeWeeks: z.number().min(1).max(52),
    fulfillmentCenterCount: z.number().int().min(1).max(20),
    participantCount: z.number().int().min(2).max(8),
    productCount: z.number().int().min(1).max(10),
    periodCount: z.number().int().min(1).max(12),
    infoMode: infoModeSchema,
    buyerAgentId: z.string().min(1),
    supplierAgentId: z.string().min(1),
    customBuyerUrgency: z.number().min(0).max(1),
    customSupplierFlexibility: z.number().min(0).max(1),
    customTruthfulness: z.number().min(0).max(1),
    customPrivacyPreference: z.number().min(0).max(1),
    customRiskAversion: z.number().min(0).max(1),
    alpha: z.number().min(0).max(1),
    buyerReliability: z.number().min(0).max(1),
    supplierReliability: z.number().min(0).max(1),
    epsilon: z.number().min(0).max(0.5),
    splitRule: splitRuleSchema.default("proportional"),
    provenance: provenanceSchema.default({ source: "synthetic", citations: [] }),
  })
  .superRefine((value, ctx) => {
    if (value.participants && value.participants.length !== value.participantCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `participants length (${value.participants.length}) must equal participantCount (${value.participantCount})`,
        path: ["participants"],
      });
    }
    if (value.participants) {
      const buyers = value.participants.filter((p) => p.role === "buyer").length;
      if (buyers < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "at least one buyer is required",
          path: ["participants"],
        });
      }
    }
  });

export type ScenarioSchemaInput = z.input<typeof scenarioSchema>;
export type ScenarioSchemaOutput = z.output<typeof scenarioSchema>;
export type ParticipantSchemaOutput = z.output<typeof participantSchema>;
export type ProvenanceSchemaOutput = z.output<typeof provenanceSchema>;
export type SplitRule = z.output<typeof splitRuleSchema>;
export type ParticipantRole = z.output<typeof participantRoleSchema>;
export type CitationSchemaOutput = z.output<typeof citationSchema>;

export interface ParseResult<T> {
  ok: boolean;
  data?: T;
  errors?: Array<{ path: string; message: string }>;
}

export function parseScenario(input: unknown): ParseResult<ScenarioSchemaOutput> {
  const result = scenarioSchema.safeParse(input);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return {
    ok: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}

export function parseScenarioOrThrow(input: unknown): ScenarioSchemaOutput {
  const result = parseScenario(input);
  if (!result.ok || !result.data) {
    const detail = (result.errors ?? []).map((e) => `${e.path}: ${e.message}`).join("; ");
    throw new Error(`invalid scenario: ${detail}`);
  }
  return result.data;
}
