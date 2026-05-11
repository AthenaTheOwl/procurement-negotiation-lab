export type Surface = "arc" | "play" | "lab" | "study";

export type InfoMode =
  | "private"
  | "risk-only"
  | "capacity-band"
  | "cost-band"
  | "forecast-band"
  | "full-oracle";

export type MechanismId =
  | "jit-baseline"
  | "centralized-oracle"
  | "cpp-admm"
  | "cpp-vcg"
  | "menu-contracts"
  | "alternating-best-response"
  | "price-only"
  | "consensus-averaging";

export interface Choice {
  id: string;
  label: string;
  say: string;
  upside: string;
  risk: string;
  quantityMultiplier: number;
  infoMode: InfoMode;
  relationshipDelta: number;
  coverageRiskDelta: number;
  budgetPressureDelta: number;
  privacyDelta: number;
}

export interface Beat {
  id: string;
  week: number;
  title: string;
  briefing: string;
  decisionPrompt: string;
  supplierPrivate: string;
  lesson: string;
  choices: Choice[];
  terms: string[];
}

export interface Story {
  title: string;
  role: string;
  buyer: string;
  supplier: string;
  job: string;
  stakes: string;
  beats: Beat[];
}

export interface ScoreState {
  relationship: number;
  coverageRisk: number;
  budgetPressure: number;
  privacyShared: number;
}

export interface RoundResult {
  beat: Beat;
  choice: Choice;
  buyerAsk: number;
  supplierComfort: number;
  settledQuantity: number;
  residual: number;
  buyerUtility: number;
  supplierUtility: number;
  globalUtility: number;
  oracleGap: number;
  surplus: number;
  transferFeasible: boolean;
  cinderResponse: string;
  plainEnglish: string;
  nextScores: ScoreState;
}

export interface AgentArchetype {
  id: string;
  side: "buyer" | "supplier" | "either";
  name: string;
  shortName: string;
  oneLine: string;
  objective: string;
  privateInfo: string;
  strategy: string;
  parameters: {
    urgency: number;
    flexibility: number;
    truthfulness: number;
    privacyPreference: number;
    riskAversion: number;
  };
}

export interface ScenarioPreset {
  id: string;
  name: string;
  oneLine: string;
  soWhat: string;
  defaults: Partial<LabScenario>;
}

export interface AlgorithmResult {
  id: MechanismId;
  name: string;
  plainEnglish: string;
  convergence: "converged" | "oscillating" | "stalled" | "benchmark";
  iterations: number;
  residual: number;
  runtimeMs: number;
  globalUtility: number;
  oracleGap: number;
  privacyExposure: number;
  incentiveStory: string;
  informationRequired: string;
  feasible: boolean;
  quality: "best benchmark" | "strong" | "mixed" | "weak";
  transferMagnitude: number;
  buyerEffectiveCapacity: number;
  supplierEffectiveCapacity: number;
}

export interface LabScenario {
  presetId: string;
  demand: number;
  volatility: number;
  capacityTightness: number;
  leadTimeWeeks: number;
  fulfillmentCenterCount: number;
  participantCount: number;
  productCount: number;
  periodCount: number;
  infoMode: InfoMode;
  buyerAgentId: string;
  supplierAgentId: string;
  customBuyerUrgency: number;
  customSupplierFlexibility: number;
  customTruthfulness: number;
  customPrivacyPreference: number;
  customRiskAversion: number;
  alpha: number;
  buyerReliability: number;
  supplierReliability: number;
  epsilon: number;
}

export interface CapacityView {
  party: "buyer" | "supplier";
  stated: number;
  reliability: number;
  effective: number;
}

export interface TransferRow {
  party: string;
  utilityBeforeTransfer: number;
  outsideOption: number;
  transfer: number;
  utilityAfterTransfer: number;
  noWorseOff: boolean;
}

export interface FrontierPlan {
  id: string;
  label: string;
  mechanismId: MechanismId;
  mechanismName: string;
  globalUtility: number;
  buyerUtility: number;
  supplierUtility: number;
  surplus: number;
  residual: number;
  oracleGap: number;
  robustnessNote: string;
  transferRows: TransferRow[];
}

export interface Frontier {
  plans: FrontierPlan[];
  epsilon: number;
  K: number;
  optimalUtility: number;
}

export interface DecoyAuditResult {
  decoyId: string;
  title: string;
  match: boolean;
  expectedPattern: string;
  actualPattern: string;
  catchesMisreportKind: string;
  explanation: string;
}
