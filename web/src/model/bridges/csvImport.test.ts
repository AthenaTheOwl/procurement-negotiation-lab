import { describe, it, expect } from "vitest";
import { parseImport } from "./csvImport";

describe("parseImport", () => {
  it("parses a valid CSV into a seed", () => {
    const csv = `supplier_id,buyer_id,product_id,period,quantity,unit_price,capacity,reliability,outside_option,risk_score,source
cinder,northstar,substrate-A,2026-Q1,420,118.5,600,0.92,5100,0.45,internal
horizon,northstar,substrate-A,2026-Q1,280,124,450,0.88,4700,0.55,internal`;
    const result = parseImport(csv);
    expect(result.ok).toBe(true);
    expect(result.seed?.buyerIds).toEqual(["northstar"]);
    expect(result.seed?.supplierIds.length).toBe(2);
    expect(result.seed?.rows.length).toBe(2);
    expect(result.seed?.derivedParticipants.length).toBe(3); // 1 buyer + 2 suppliers
  });

  it("surfaces per-row errors with line numbers when fields fail", () => {
    const csv = `supplier_id,buyer_id,product_id,period,quantity,unit_price
cinder,,substrate-A,2026-Q1,not-a-number,118.50
horizon,northstar,substrate-A,2026-Q1,420,118.50`;
    const result = parseImport(csv);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((err) => err.row === 2)).toBe(true);
  });
});
