/**
 * @lab/engine — shared TypeScript engine for the procurement-negotiation-lab.
 *
 * This is the public surface consumed by `apps/web` and `apps/mobile`.
 * Internal helpers and incidental types stay local to their modules.
 *
 * Everything re-exported here is part of the supported contract and
 * has at least one test in `packages/engine/src/**`.
 */

// --- types ---------------------------------------------------------------
export type {
  AgentArchetype,
  AgentParameters,
  AgentSide,
  AlgorithmResult,
  Beat,
  CapacityView,
  Choice,
  Citation,
  DataProvenance,
  DecoyAuditResult,
  Frontier,
  FrontierPlan,
  InfoMode,
  LabScenario,
  MechanismId,
  Participant,
  ParticipantRole,
  ProvenanceSource,
  RoundResult,
  ScenarioPreset,
  ScoreState,
  SplitRule,
  Story,
  Surface,
  TransferRow,
} from "./model/types";

// --- model: simulation core ---------------------------------------------
export {
  algorithmResults,
  detectEnding,
  effectiveCapacity,
  evaluateRound,
  frontier,
  infoModeLabel,
  informationSweep,
  initialScores,
  labTakeaway,
  makeScenario,
  multiPartyLedger,
  multiPartyWelfare,
  scoreAfterChoice,
  statedCapacity,
  transferLedger,
  vcgTransfer,
} from "./model/simulation";

// --- model: participants + views ----------------------------------------
export {
  deriveParticipants,
  participantsByRole,
  describeStrategyForParticipant,
  isPrivateField,
} from "./model/participants";
export {
  redactForView,
  viewKind,
  viewSelfId,
  describeView,
} from "./model/views";
export type { ViewMode, ViewKind, RedactedParticipant, ViewState } from "./model/views";

// --- model: multi-party transfers ----------------------------------------
export {
  multiPartyTransferLedger,
  shapleyValues,
} from "./model/shapleyTransfer";
export type {
  MultiPartyTransferInput,
  MultiPartyTransferRow,
} from "./model/shapleyTransfer";

// --- model: decoys -------------------------------------------------------
export { decoys, runDecoyAudit } from "./model/decoys";

// --- model: scenario schema + migration ---------------------------------
export {
  SCHEMA_VERSION,
  scenarioSchema,
  participantSchema,
  participantRoleSchema,
  infoModeSchema,
  agentParametersSchema,
  splitRuleSchema,
  provenanceSchema,
  citationSchema,
  provenanceSourceSchema,
  parseScenario,
  parseScenarioOrThrow,
} from "./model/scenarioSchema";
export type {
  ScenarioSchemaInput,
  ScenarioSchemaOutput,
  ParticipantSchemaOutput,
  ProvenanceSchemaOutput,
  CitationSchemaOutput,
  ParseResult,
} from "./model/scenarioSchema";
export { migrateScenario } from "./model/scenarioMigrate";
export type { MigrateResult } from "./model/scenarioMigrate";

// --- model: run reports --------------------------------------------------
export {
  RUN_REPORT_SCHEMA_VERSION,
  runReportSchema,
  parseRunReport,
} from "./model/runReportSchema";
export type { RunReport, RunReportInput } from "./model/runReportSchema";
export {
  assembleReport,
  generateRunId,
  reportLabelFromScenario,
} from "./model/runReport";
export type { AssembleReportInput } from "./model/runReport";
export type { RunReportFixtureOverrides } from "./model/factories";
export {
  STORAGE_PREFIX,
  INDEX_KEY,
  MAX_RUNS,
  saveRun,
  listRuns,
  loadRun,
  deleteRun,
  clearAll,
} from "./model/reportStorage";
export type { RunReportSummary } from "./model/reportStorage";
export { toMarkdown } from "./model/reportMarkdown";

// --- model: bridges ------------------------------------------------------
export {
  CSV_COLUMN_CONVENTION,
  parseImport,
} from "./model/bridges/csvImport";
export type { CSVRow, ImportError, ImportResult, ScenarioSeed } from "./model/bridges/csvImport";
export {
  CHIP_MAP_NODES_URL,
  CHIP_MAP_EDGES_URL,
  fetchChipMapData,
  seedFromChipMap,
  clearChipMapCache,
} from "./model/bridges/chipMap";
export type { ChipMapNode, ChipMapEdge, ChipMapData, ChipMapSeed } from "./model/bridges/chipMap";
export {
  SUPPLIER_RISK_CHUNKS_URL,
  fetchRiskCorpus,
  clearSupplierRiskCache,
  deriveRiskScore,
  attachEvidence,
} from "./model/bridges/supplierRisk";
export type { RiskChunk, RiskCorpus, EvidenceAttachment } from "./model/bridges/supplierRisk";
export {
  PROVENANCE_LABELS,
  PROVENANCE_BADGE_COLORS,
  tag,
  mergeProvenance,
  describeProvenance,
} from "./model/bridges/sourceProvenance";

// --- model: factories + decision event log ------------------------------
export {
  buildParticipant,
  buildScenario,
  resetFactories,
} from "./model/factories";
export {
  appendEvent,
  createLog,
  eventKindCounts,
  now,
} from "./model/decisionEvent";
export type { DecisionEvent, DecisionEventLog } from "./model/decisionEvent";

// --- model: formula engine (spec 0003) -----------------------------------
export { FormulaError, compileFormula } from "./model/formula";
export type { CompiledFormula } from "./model/formula";

// --- data: presets, agents, strategies, story ---------------------------
export { agentArchetypes, agentById, agentsForSide } from "./data/agents";
export { scenarioPresets, presetById } from "./data/scenarios";
export {
  strategies,
  strategyById,
  strategiesForRole,
  strategyCountByRole,
} from "./data/strategies";
export type { Strategy } from "./data/strategies";
export { substrateCrunch } from "./data/story";
export { glossary, termOrder } from "./data/glossary";
export { arcSteps } from "./data/arc";
export type { ArcStep, ArcStepId } from "./data/arc";

// --- learn surface helpers ----------------------------------------------
export {
  buyerUtilityAt,
  supplierUtilityAt,
  jointUtilityAt,
  sampleJointCurve,
  findJointOptimum,
  defaultLearnScenario,
} from "./learn/jointUtility";
export type { JointPoint, LearnScenarioDefaults } from "./learn/jointUtility";
export {
  DEFAULT_BUYER_OUTSIDE,
  DEFAULT_SUPPLIER_OUTSIDE,
  feasibleBand,
  sampleSplitCurve,
  splitOutcome,
} from "./learn/split";
export type { SplitConfig, SplitPoint } from "./learn/split";
export {
  COMMITMENT_KINDS,
  DEFAULT_MULTI_PERIOD_CONFIG,
  SHORTFALL_PENALTY,
  applyPreset,
  defaultMultiPeriodPlan,
  evaluateMultiPeriodPlan,
  optimalMultiPeriodPlan,
  optimalQuantityForWeek,
} from "./learn/multiPeriod";
export type {
  CommitmentKind,
  MultiPeriodConfig,
  MultiPeriodPreset,
  MultiPeriodResult,
  WeekPlan,
  WeekResult,
} from "./learn/multiPeriod";
export {
  SHARE_VERSION,
  decodeParticipant,
  encodeParticipant,
} from "./learn/shareEncoder";
export type { SharedParticipant } from "./learn/shareEncoder";
export {
  appendRound,
  applyAccept,
  decodeSession,
  encodeSession,
  isDealClosed,
  latestOfferFor,
  newSession,
} from "./learn/negotiationSession";
export type {
  NegotiationRole,
  NegotiationState,
  Offer,
  RoundRecord,
} from "./learn/negotiationSession";
export {
  DEFAULT_MENU_GUARDRAILS,
  DEFAULT_MENU_SIGNALS,
  MODEL_STATUSES,
  SAMPLE_MODELS,
  certifyCoordinationModel,
  clearMenuAgreement,
  fallbackOrderForScope,
  generateMenuOptions,
  matchesScope,
  resolveCoordinationModel,
  scopeSpecificity,
} from "./learn/modelStudio";
export type {
  CertificationCheck,
  ClearedAgreement,
  CoordinationModel,
  CoordinationScope,
  ExplainabilityChip,
  MenuCostSignals,
  MenuGuardrails,
  MenuOption,
  MenuOptionKind,
  ModelStatus,
  ScopeResolution,
  VendorReservation,
} from "./learn/modelStudio";
export {
  COORDINATION_CATALOG,
  catalogSummary,
  entryById,
} from "./learn/coordinationCatalog";
export type {
  CoordinationEntry,
  CoordinationFamily,
  CoordinationSummary,
  Confidentiality,
} from "./learn/coordinationCatalog";
export {
  DEFAULT_SKU_PARAMS,
  defaultBuyPlan,
  evaluateBuyPlan,
  optimalBuyPlan,
} from "./learn/buyPlan";
export type {
  PlanResult,
  Relationship,
  RelationshipCorrection,
  RelationshipKind,
  SkuEvalResult,
  SkuParameters,
  SkuRow,
} from "./learn/buyPlan";
