import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseImport } from "./csvImport";

const __dirname = dirname(fileURLToPath(import.meta.url));
// 5 ups: bridges → model → src → engine → packages → repo root
const EXAMPLE_PATH = resolve(
  __dirname,
  "../../../../../data/example-imports/open-contracting-sample.csv",
);

describe("data/example-imports/open-contracting-sample.csv", () => {
  it("parses cleanly against parseImport", () => {
    const csv = readFileSync(EXAMPLE_PATH, "utf-8");
    const result = parseImport(csv);
    expect(result.ok).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.seed?.rows.length).toBeGreaterThan(0);
    expect(result.seed?.buyerIds.length).toBeGreaterThan(0);
    expect(result.seed?.supplierIds.length).toBeGreaterThan(0);
    expect(result.seed?.derivedParticipants.length).toBeGreaterThan(0);
  });
});
