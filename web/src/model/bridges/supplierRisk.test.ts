import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  attachEvidence,
  clearSupplierRiskCache,
  deriveRiskScore,
  fetchRiskCorpus,
} from "./supplierRisk";

const SAMPLE_JSONL = [
  JSON.stringify({
    cik: "0001045810",
    accession: "0001045810-25",
    ticker: "NVDA",
    company: "NVIDIA",
    section: "Risk Factors",
    text: "Our customers are concentrated and a significant fraction of revenue is derived from a small number of buyers.",
    risk_category: "customer-concentration",
  }),
  JSON.stringify({
    cik: "0000937966",
    ticker: "AMAT",
    company: "Applied Materials",
    section: "Risk Factors",
    text: "Export restrictions to certain countries may limit our ability to sell advanced equipment.",
    risk_category: "export-controls",
  }),
].join("\n");

function mockFetcher() {
  return async () => ({ ok: true, text: async () => SAMPLE_JSONL });
}

describe("supplier-risk bridge", () => {
  beforeEach(() => {
    clearSupplierRiskCache();
  });
  afterEach(() => {
    clearSupplierRiskCache();
  });

  it("fetchRiskCorpus parses JSONL lines", async () => {
    const corpus = await fetchRiskCorpus(mockFetcher());
    expect(corpus.chunks.length).toBe(2);
  });

  it("deriveRiskScore maps known categories to weights", () => {
    expect(deriveRiskScore({ text: "x", risk_category: "export-controls" })).toBeGreaterThan(0.7);
    expect(deriveRiskScore({ text: "x" })).toBeLessThan(0.5);
  });

  it("attachEvidence returns a risk score, provenance, and citations", async () => {
    const corpus = await fetchRiskCorpus(mockFetcher());
    const id = `${corpus.chunks[1].cik}|${corpus.chunks[1].accession ?? corpus.chunks[1].section ?? "n/a"}`;
    const evidence = attachEvidence(corpus, [id]);
    expect(evidence.citations.length).toBeGreaterThan(0);
    expect(evidence.provenance.source).toBe("supplier-risk-rag");
    expect(evidence.riskScore).toBeGreaterThan(0);
  });
});
