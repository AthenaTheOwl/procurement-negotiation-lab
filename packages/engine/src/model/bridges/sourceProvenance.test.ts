import { describe, it, expect } from "vitest";
import { describeProvenance, mergeProvenance, tag } from "./sourceProvenance";

describe("sourceProvenance", () => {
  it("tag stamps a fetchedAt timestamp", () => {
    const provenance = tag("chip-map", { sourceId: "tsmc" });
    expect(provenance.source).toBe("chip-map");
    expect(provenance.sourceId).toBe("tsmc");
    expect(typeof provenance.fetchedAt).toBe("string");
    expect(provenance.citations).toEqual([]);
  });

  it("merge keeps citations across sources and dedupes by source|id|span", () => {
    const a = tag("chip-map", { citations: [{ source: "a", sourceId: "x", span: "hello" }] });
    const b = tag("supplier-risk-rag", {
      citations: [
        { source: "a", sourceId: "x", span: "hello" }, // dup
        { source: "b", sourceId: "y", span: "world" },
      ],
    });
    const merged = mergeProvenance(a, b);
    expect(merged.source).toBe("supplier-risk-rag");
    expect(merged.citations).toHaveLength(2);
  });

  it("describeProvenance formats a human readable summary", () => {
    const provenance = tag("csv-imported", {
      sourceId: "csv-12-rows",
      citations: [
        { source: "csv", sourceId: "row1" },
        { source: "csv", sourceId: "row2" },
      ],
    });
    const description = describeProvenance(provenance);
    expect(description).toContain("CSV import");
    expect(description).toContain("2 citation");
  });
});
