import { z } from "zod";
import { provenanceSchema } from "./scenarioSchema";

export const RUN_REPORT_SCHEMA_VERSION = "0.6.0" as const;

const algorithmResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  plainEnglish: z.string(),
  convergence: z.enum(["converged", "oscillating", "stalled", "benchmark"]),
  iterations: z.number(),
  residual: z.number(),
  runtimeMs: z.number(),
  globalUtility: z.number(),
  oracleGap: z.number(),
  privacyExposure: z.number(),
  incentiveStory: z.string(),
  informationRequired: z.string(),
  feasible: z.boolean(),
  quality: z.enum(["best benchmark", "strong", "mixed", "weak"]),
  transferMagnitude: z.number(),
  buyerEffectiveCapacity: z.number(),
  supplierEffectiveCapacity: z.number(),
});

const transferRowSchema = z.object({
  party: z.string(),
  utilityBeforeTransfer: z.number(),
  outsideOption: z.number(),
  transfer: z.number(),
  utilityAfterTransfer: z.number(),
  noWorseOff: z.boolean(),
  participantId: z.string().optional(),
  role: z.string().optional(),
  share: z.number().optional(),
});

const frontierPlanSchema = z.object({
  id: z.string(),
  label: z.string(),
  mechanismId: z.string(),
  mechanismName: z.string(),
  globalUtility: z.number(),
  buyerUtility: z.number(),
  supplierUtility: z.number(),
  surplus: z.number(),
  residual: z.number(),
  oracleGap: z.number(),
  robustnessNote: z.string(),
  transferRows: z.array(transferRowSchema),
});

const frontierSchema = z.object({
  plans: z.array(frontierPlanSchema),
  epsilon: z.number(),
  K: z.number(),
  optimalUtility: z.number(),
});

const decoyAuditSchema = z.object({
  decoyId: z.string(),
  title: z.string(),
  match: z.boolean(),
  expectedPattern: z.string(),
  actualPattern: z.string(),
  catchesMisreportKind: z.string(),
  explanation: z.string(),
});

export const runReportSchema = z.object({
  schemaVersion: z.literal(RUN_REPORT_SCHEMA_VERSION).default(RUN_REPORT_SCHEMA_VERSION),
  id: z.string().min(1),
  timestamp: z.string().min(1),
  label: z.string().min(1),
  scenario: z.record(z.string(), z.unknown()),
  parameters: z.object({
    alpha: z.number(),
    epsilon: z.number(),
    auditMode: z.boolean(),
    splitRule: z.enum(["proportional", "equal", "shapley"]).optional(),
  }),
  reliabilityByAgent: z.record(z.string(), z.number()),
  algorithmResults: z.array(algorithmResultSchema),
  frontier: frontierSchema.optional(),
  decoyAudit: z.array(decoyAuditSchema).optional(),
  computed: z.object({
    coordinationGap: z.number(),
    bestNonOracle: z.string(),
    bestNonOracleGap: z.number(),
    transferLedger: z.array(transferRowSchema),
    multiPartyLedger: z.array(transferRowSchema).optional(),
    totalOutside: z.number().optional(),
    surplus: z.number().optional(),
  }),
  provenance: provenanceSchema.optional(),
  notes: z.string().optional(),
});

export type RunReportInput = z.input<typeof runReportSchema>;
export type RunReport = z.output<typeof runReportSchema>;

export function parseRunReport(json: string): { ok: true; data: RunReport } | { ok: false; errors: Array<{ path: string; message: string }> } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    return {
      ok: false,
      errors: [{ path: "$", message: `not valid JSON: ${(error as Error).message}` }],
    };
  }
  const result = runReportSchema.safeParse(parsed);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return {
    ok: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join(".") || "$",
      message: issue.message,
    })),
  };
}
