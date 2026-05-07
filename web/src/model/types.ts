export type Surface = "play" | "lab" | "study";

export type InfoMode =
  | "private"
  | "risk-only"
  | "capacity-band"
  | "cost-band"
  | "forecast-band"
  | "full-oracle";

export type AlgorithmId =
  | "centralized-oracle"
  | "admm"
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

export interface AlgorithmResult {
  id: AlgorithmId;
  name: string;
  plainEnglish: string;
  iterations: number;
  residual: number;
  runtimeMs: number;
  globalUtility: number;
  oracleGap: number;
  feasible: boolean;
  quality: "best benchmark" | "strong" | "mixed" | "weak";
}

export interface LabScenario {
  demand: number;
  volatility: number;
  capacityTightness: number;
  participantCount: number;
  productCount: number;
  periodCount: number;
  infoMode: InfoMode;
}
