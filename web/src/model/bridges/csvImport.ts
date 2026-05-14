import Papa from "papaparse";
import { z } from "zod";
import type { Participant } from "../types";

const csvRowSchema = z.object({
  supplier_id: z.string().min(1),
  buyer_id: z.string().min(1),
  product_id: z.string().min(1),
  period: z.string().min(1),
  quantity: z.coerce.number().nonnegative(),
  unit_price: z.coerce.number().nonnegative(),
  capacity: z.coerce.number().nonnegative().optional(),
  reliability: z.coerce.number().min(0).max(1).optional(),
  outside_option: z.coerce.number().optional(),
  risk_score: z.coerce.number().min(0).max(1).optional(),
  source: z.string().optional(),
});

export type CSVRow = z.infer<typeof csvRowSchema>;

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

export interface ScenarioSeed {
  buyerIds: string[];
  supplierIds: string[];
  productIds: string[];
  periods: string[];
  totalQuantity: number;
  meanUnitPrice: number;
  rows: CSVRow[];
  derivedParticipants: Participant[];
}

export interface ImportResult {
  ok: boolean;
  seed?: ScenarioSeed;
  errors: ImportError[];
}

const DEFAULT_PARAMS = {
  urgency: 0.6,
  flexibility: 0.5,
  truthfulness: 0.7,
  privacyPreference: 0.6,
  riskAversion: 0.6,
};

export function parseImport(csv: string): ImportResult {
  const parsed = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
  });
  const errors: ImportError[] = parsed.errors.map((err) => ({
    row: err.row ?? 0,
    field: "$",
    message: err.message,
  }));
  const rows: CSVRow[] = [];
  parsed.data.forEach((rawRow, idx) => {
    const lineNumber = idx + 2; // 1 for header, 1-indexed
    const result = csvRowSchema.safeParse(rawRow);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          row: lineNumber,
          field: issue.path.join(".") || "$",
          message: issue.message,
        });
      }
      return;
    }
    rows.push(result.data);
  });
  if (rows.length === 0 || errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, seed: buildSeed(rows), errors };
}

function buildSeed(rows: CSVRow[]): ScenarioSeed {
  const buyerIds = uniq(rows.map((row) => row.buyer_id));
  const supplierIds = uniq(rows.map((row) => row.supplier_id));
  const productIds = uniq(rows.map((row) => row.product_id));
  const periods = uniq(rows.map((row) => row.period));
  const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
  const meanUnitPrice =
    rows.reduce((sum, row) => sum + row.unit_price, 0) / Math.max(1, rows.length);
  const derivedParticipants: Participant[] = [];
  for (const buyerId of buyerIds) {
    derivedParticipants.push({
      id: buyerId,
      role: "buyer",
      name: buyerId,
      strategyId: "jit-buyer",
      reliability: averageReliability(rows.filter((r) => r.buyer_id === buyerId)) ?? 1,
      parameters: { ...DEFAULT_PARAMS },
      outsideOption: averageOutside(rows.filter((r) => r.buyer_id === buyerId)) ?? 8000,
    });
  }
  for (const supplierId of supplierIds) {
    const supplierRows = rows.filter((r) => r.supplier_id === supplierId);
    derivedParticipants.push({
      id: supplierId,
      role: "supplier",
      name: supplierId,
      strategyId: "capacity-guard-supplier",
      reliability: averageReliability(supplierRows) ?? 0.9,
      parameters: { ...DEFAULT_PARAMS, flexibility: 0.45 },
      capacity: averageCapacity(supplierRows),
      outsideOption: averageOutside(supplierRows) ?? 4800,
    });
  }
  return {
    buyerIds,
    supplierIds,
    productIds,
    periods,
    totalQuantity,
    meanUnitPrice,
    rows,
    derivedParticipants,
  };
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values));
}

function averageReliability(rows: CSVRow[]): number | undefined {
  const valid = rows.map((row) => row.reliability).filter((value): value is number => value !== undefined);
  if (valid.length === 0) return undefined;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function averageCapacity(rows: CSVRow[]): number | undefined {
  const valid = rows.map((row) => row.capacity).filter((value): value is number => value !== undefined);
  if (valid.length === 0) return undefined;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function averageOutside(rows: CSVRow[]): number | undefined {
  const valid = rows
    .map((row) => row.outside_option)
    .filter((value): value is number => value !== undefined);
  if (valid.length === 0) return undefined;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export const CSV_COLUMN_CONVENTION = [
  "supplier_id",
  "buyer_id",
  "product_id",
  "period",
  "quantity",
  "unit_price",
  "capacity",
  "reliability",
  "outside_option",
  "risk_score",
  "source",
] as const;
