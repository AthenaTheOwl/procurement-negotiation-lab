export const MODEL_STATUSES = [
  "draft",
  "simulated",
  "shadow",
  "pilot",
  "production",
] as const;

export type ModelStatus = (typeof MODEL_STATUSES)[number];

export interface CoordinationScope {
  vendor?: string;
  category?: string;
  productFamily?: string;
  sku?: string;
  marketplace?: string;
  region?: string;
  fc?: string;
  lane?: string;
  week?: string;
  contractType?: string;
}

export interface CoordinationModel {
  modelId: string;
  owner: string;
  scope: CoordinationScope;
  objective: string;
  constraints: string[];
  outputs: string[];
  status: ModelStatus;
}

export interface ScopeResolution {
  requested: CoordinationScope;
  selected: CoordinationModel | null;
  candidates: CoordinationModel[];
  fallbackOrder: string[];
}

export interface MenuCostSignals {
  basePoPerUnit: number;
  marginalCostPerUnit: number;
  holdingCostPerUnit: number;
  capacityShadowPricePerUnit: number;
  latenessExternalityPerUnit: number;
  standardRebatePerUnit?: number;
  flexibilityCreditPerUnit?: number;
}

export type MenuOptionKind = "fast" | "standard" | "flex";

export interface ExplainabilityChip {
  label: string;
  amountPerUnit: number;
}

export interface MenuOption {
  optionId: "A" | "B" | "C";
  kind: MenuOptionKind;
  label: string;
  quantity: number;
  shipWindowDays: [number, number];
  feePerUnit: number;
  creditPerUnit: number;
  netAdjustmentPerUnit: number;
  settlementPricePerUnit: number;
  platformMarginPerUnit: number;
  chips: ExplainabilityChip[];
}

export interface CertificationCheck {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

export interface MenuGuardrails {
  maxFastFeePerUnit: number;
  maxCreditPerUnit: number;
  minPlatformMarginPerUnit: number;
  maxFeeVariancePerUnit: number;
}

export interface VendorReservation {
  optionId: MenuOption["optionId"];
  minimumCreditPerUnit?: number;
  maximumFeePerUnit?: number;
  hardBlock?: boolean;
}

export interface ClearedAgreement {
  selected: MenuOption | null;
  rejected: Array<{ optionId: string; reason: string }>;
  contract: {
    quantity: number;
    arrivalWindowDays: [number, number];
    feePerUnit: number;
    creditPerUnit: number;
    measurementWindowDays: number;
  } | null;
}

const SCOPE_KEYS: Array<keyof CoordinationScope> = [
  "vendor",
  "category",
  "productFamily",
  "sku",
  "marketplace",
  "region",
  "fc",
  "lane",
  "week",
  "contractType",
];

const STATUS_RANK: Record<ModelStatus, number> = {
  draft: 0,
  simulated: 1,
  shadow: 2,
  pilot: 3,
  production: 4,
};

export const DEFAULT_MENU_SIGNALS: MenuCostSignals = {
  basePoPerUnit: 10,
  marginalCostPerUnit: 7.8,
  holdingCostPerUnit: 0.05,
  capacityShadowPricePerUnit: 0.18,
  latenessExternalityPerUnit: 0.07,
  standardRebatePerUnit: 0.03,
  flexibilityCreditPerUnit: 0.12,
};

export const DEFAULT_MENU_GUARDRAILS: MenuGuardrails = {
  maxFastFeePerUnit: 0.5,
  maxCreditPerUnit: 0.35,
  minPlatformMarginPerUnit: 1.25,
  maxFeeVariancePerUnit: 0.45,
};

export const SAMPLE_MODELS: CoordinationModel[] = [
  {
    modelId: "global.default.replenishment-flex.v1",
    owner: "platform",
    scope: { contractType: "replenishment" },
    objective: "maximize expected margin while preserving arrival reliability",
    constraints: ["quantity >= 0", "ship_window in allowed_windows"],
    outputs: ["ranked_options", "reservation_prices", "explanation"],
    status: "production",
  },
  {
    modelId: "category.electronics.flex-window.v2",
    owner: "platform",
    scope: {
      category: "electronics.accessories",
      marketplace: "US",
      contractType: "replenishment",
    },
    objective: "trade arrival speed against scarce FC capacity",
    constraints: ["fast_fee <= 0.50", "credit <= 0.35"],
    outputs: ["ranked_options", "guardrail_checks", "explanation"],
    status: "pilot",
  },
  {
    modelId: "vendor-123.sku-001.abe8.w22.v4",
    owner: "vendor_123",
    scope: {
      vendor: "vendor_123",
      sku: "SKU-001",
      fc: "ABE8",
      week: "2026-W22",
      marketplace: "US",
      contractType: "replenishment",
    },
    objective:
      "maximize contribution margin subject to factory capacity and cash timing",
    constraints: [
      "quantity <= 1500",
      "quantity >= 500",
      "delay <= 14 days",
      "payment_delay <= 45 days",
    ],
    outputs: [
      "ranked_options",
      "reservation_prices",
      "hard_constraints",
      "explanation",
    ],
    status: "shadow",
  },
];

export function scopeSpecificity(scope: CoordinationScope): number {
  return SCOPE_KEYS.reduce(
    (score, key) => score + (scope[key] === undefined ? 0 : 1),
    0,
  );
}

export function matchesScope(
  modelScope: CoordinationScope,
  requested: CoordinationScope,
): boolean {
  return SCOPE_KEYS.every((key) => {
    const value = modelScope[key];
    return value === undefined || requested[key] === value;
  });
}

export function fallbackOrderForScope(scope: CoordinationScope): string[] {
  const order: string[] = [];
  if (scope.sku && scope.vendor && scope.fc && scope.week) {
    order.push("SKU x vendor x FC x week");
  }
  if (scope.sku && scope.vendor && scope.region) {
    order.push("SKU x vendor x region");
  }
  if (scope.productFamily && scope.vendor) {
    order.push("product family x vendor");
  }
  if (scope.category && scope.vendor) {
    order.push("category x vendor");
  }
  if (scope.category) {
    order.push("category default");
  }
  order.push("global default");
  return order;
}

export function resolveCoordinationModel(
  models: CoordinationModel[],
  requested: CoordinationScope,
): ScopeResolution {
  const candidates = models
    .filter((model) => matchesScope(model.scope, requested))
    .sort((a, b) => {
      const byScope = scopeSpecificity(b.scope) - scopeSpecificity(a.scope);
      if (byScope !== 0) return byScope;
      const byStatus = STATUS_RANK[b.status] - STATUS_RANK[a.status];
      if (byStatus !== 0) return byStatus;
      return a.modelId.localeCompare(b.modelId);
    });
  return {
    requested,
    selected: candidates[0] ?? null,
    candidates,
    fallbackOrder: fallbackOrderForScope(requested),
  };
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function option(
  input: Omit<MenuOption, "netAdjustmentPerUnit" | "settlementPricePerUnit" | "platformMarginPerUnit">,
  signals: MenuCostSignals,
): MenuOption {
  const netAdjustmentPerUnit = roundCents(input.feePerUnit - input.creditPerUnit);
  const settlementPricePerUnit = roundCents(signals.basePoPerUnit + netAdjustmentPerUnit);
  const platformMarginPerUnit = roundCents(
    settlementPricePerUnit - signals.marginalCostPerUnit,
  );
  return {
    ...input,
    feePerUnit: roundCents(input.feePerUnit),
    creditPerUnit: roundCents(input.creditPerUnit),
    netAdjustmentPerUnit,
    settlementPricePerUnit,
    platformMarginPerUnit,
  };
}

export function generateMenuOptions(
  signals: MenuCostSignals = DEFAULT_MENU_SIGNALS,
): MenuOption[] {
  const standardRebate = signals.standardRebatePerUnit ?? 0.03;
  const flexCredit = signals.flexibilityCreditPerUnit ?? 0.12;
  return [
    option(
      {
        optionId: "A",
        kind: "fast",
        label: "Fast / scarce",
        quantity: 1200,
        shipWindowDays: [2, 3],
        feePerUnit:
          signals.capacityShadowPricePerUnit + signals.latenessExternalityPerUnit,
        creditPerUnit: 0,
        chips: [
          {
            label: "capacity",
            amountPerUnit: signals.capacityShadowPricePerUnit,
          },
          {
            label: "lateness risk",
            amountPerUnit: signals.latenessExternalityPerUnit,
          },
        ],
      },
      signals,
    ),
    option(
      {
        optionId: "B",
        kind: "standard",
        label: "Standard",
        quantity: 1000,
        shipWindowDays: [5, 7],
        feePerUnit: 0,
        creditPerUnit: standardRebate,
        chips: [
          {
            label: "efficient frontier",
            amountPerUnit: -standardRebate,
          },
        ],
      },
      signals,
    ),
    option(
      {
        optionId: "C",
        kind: "flex",
        label: "Flex / low touch",
        quantity: 700,
        shipWindowDays: [10, 14],
        feePerUnit: 0,
        creditPerUnit: flexCredit + signals.holdingCostPerUnit,
        chips: [
          {
            label: "flex credit",
            amountPerUnit: -flexCredit,
          },
          {
            label: "holding relief",
            amountPerUnit: -signals.holdingCostPerUnit,
          },
        ],
      },
      signals,
    ),
  ];
}

export function certifyCoordinationModel(
  model: CoordinationModel,
  options: MenuOption[],
  guardrails: MenuGuardrails = DEFAULT_MENU_GUARDRAILS,
): CertificationCheck[] {
  const fees = options.map((o) => o.feePerUnit);
  const credits = options.map((o) => o.creditPerUnit);
  const margins = options.map((o) => o.platformMarginPerUnit);
  const maxFee = Math.max(...fees);
  const minFee = Math.min(...fees);
  const hasExplanations = options.every((o) => o.chips.length > 0);

  return [
    {
      id: "schema",
      label: "Schema",
      pass: Boolean(model.modelId && model.owner && model.objective),
      detail: "model id, owner, and objective are present",
    },
    {
      id: "scope",
      label: "Scope",
      pass: scopeSpecificity(model.scope) > 0,
      detail: `${scopeSpecificity(model.scope)} scope field(s) set`,
    },
    {
      id: "outputs",
      label: "Allowed outputs",
      pass: model.outputs.includes("ranked_options") && model.outputs.includes("explanation"),
      detail: "model returns preferences, constraints, and explanation",
    },
    {
      id: "feasibility",
      label: "Feasibility",
      pass: options.every((o) => o.quantity > 0 && o.shipWindowDays[0] <= o.shipWindowDays[1]),
      detail: "quantities and ship windows are feasible",
    },
    {
      id: "guardrails",
      label: "Guardrails",
      pass:
        maxFee <= guardrails.maxFastFeePerUnit &&
        Math.max(...credits) <= guardrails.maxCreditPerUnit &&
        Math.min(...margins) >= guardrails.minPlatformMarginPerUnit,
      detail: "fees, credits, and margin stay inside configured bounds",
    },
    {
      id: "fairness",
      label: "Fairness",
      pass: maxFee - minFee <= guardrails.maxFeeVariancePerUnit,
      detail: "per-vendor fast-window fee variance remains capped",
    },
    {
      id: "explainability",
      label: "Explainability",
      pass: hasExplanations,
      detail: "each option carries cost chips for the vendor-facing UI",
    },
  ];
}

export function clearMenuAgreement(
  options: MenuOption[],
  reservations: VendorReservation[],
  guardrails: MenuGuardrails = DEFAULT_MENU_GUARDRAILS,
): ClearedAgreement {
  const rejected: ClearedAgreement["rejected"] = [];
  const reservationById = new Map(
    reservations.map((reservation) => [reservation.optionId, reservation]),
  );

  const feasible = options.filter((option) => {
    const reservation = reservationById.get(option.optionId);
    if (reservation?.hardBlock) {
      rejected.push({ optionId: option.optionId, reason: "vendor hard constraint" });
      return false;
    }
    if (
      reservation?.maximumFeePerUnit !== undefined &&
      option.feePerUnit > reservation.maximumFeePerUnit
    ) {
      rejected.push({ optionId: option.optionId, reason: "fee exceeds vendor range" });
      return false;
    }
    if (
      reservation?.minimumCreditPerUnit !== undefined &&
      option.creditPerUnit < reservation.minimumCreditPerUnit
    ) {
      rejected.push({ optionId: option.optionId, reason: "credit below vendor range" });
      return false;
    }
    if (option.platformMarginPerUnit < guardrails.minPlatformMarginPerUnit) {
      rejected.push({ optionId: option.optionId, reason: "margin guardrail" });
      return false;
    }
    return true;
  });

  const selected =
    feasible.sort((a, b) => {
      const byMargin = b.platformMarginPerUnit - a.platformMarginPerUnit;
      if (byMargin !== 0) return byMargin;
      return b.quantity - a.quantity;
    })[0] ?? null;

  return {
    selected,
    rejected,
    contract: selected
      ? {
          quantity: selected.quantity,
          arrivalWindowDays: selected.shipWindowDays,
          feePerUnit: selected.feePerUnit,
          creditPerUnit: selected.creditPerUnit,
          measurementWindowDays: 14,
        }
      : null,
  };
}
