import { z } from "zod";
import type { Citation, DataProvenance } from "../types";
import { tag } from "./sourceProvenance";

export const SUPPLIER_RISK_CHUNKS_URL =
  "https://raw.githubusercontent.com/AthenaTheOwl/supplier-risk-rag-agent/main/data/sample_corpus/chunks.jsonl";

const SESSION_CACHE_KEY = "procurement-lab.bridges.supplierRisk";

const riskChunkSchema = z.object({
  cik: z.string().optional(),
  accession: z.string().optional(),
  ticker: z.string().optional(),
  company: z.string().optional(),
  section: z.string().optional(),
  text: z.string().min(1),
  risk_category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type RiskChunk = z.infer<typeof riskChunkSchema>;

export interface RiskCorpus {
  chunks: RiskChunk[];
  fetchedAt: string;
}

interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getCache(): SessionStorageLike | null {
  if (typeof globalThis === "undefined") return null;
  return (globalThis as { sessionStorage?: SessionStorageLike }).sessionStorage ?? null;
}

type FetchLike = (input: string) => Promise<{ ok: boolean; text(): Promise<string> }>;

export async function fetchRiskCorpus(
  fetcher: FetchLike = (typeof fetch !== "undefined" ? (fetch as unknown as FetchLike) : (async () => {
    throw new Error("fetch not available");
  })),
): Promise<RiskCorpus> {
  const cache = getCache();
  if (cache) {
    const raw = cache.getItem(SESSION_CACHE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as RiskCorpus;
      } catch {
        cache.removeItem(SESSION_CACHE_KEY);
      }
    }
  }
  const response = await fetcher(SUPPLIER_RISK_CHUNKS_URL);
  if (!response.ok) {
    throw new Error("supplier-risk-rag-agent fetch failed");
  }
  const text = await response.text();
  const chunks: RiskChunk[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      const result = riskChunkSchema.safeParse(parsed);
      if (result.success) chunks.push(result.data);
    } catch {
      // skip malformed lines
    }
  }
  const corpus: RiskCorpus = { chunks, fetchedAt: new Date().toISOString() };
  if (cache) {
    cache.setItem(SESSION_CACHE_KEY, JSON.stringify(corpus));
  }
  return corpus;
}

export function clearSupplierRiskCache(): void {
  const cache = getCache();
  if (cache) cache.removeItem(SESSION_CACHE_KEY);
}

const RISK_CATEGORY_WEIGHT: Record<string, number> = {
  "export-controls": 0.85,
  "customer-concentration": 0.55,
  "advanced-packaging": 0.65,
  "supplier-capacity": 0.6,
  "lithography-equipment": 0.7,
  default: 0.4,
};

export function deriveRiskScore(chunk: RiskChunk): number {
  const category = (chunk.risk_category ?? "").trim();
  if (category in RISK_CATEGORY_WEIGHT) {
    return RISK_CATEGORY_WEIGHT[category];
  }
  if (!chunk.tags || chunk.tags.length === 0) {
    return RISK_CATEGORY_WEIGHT.default;
  }
  const tagged = chunk.tags
    .map((tag) => RISK_CATEGORY_WEIGHT[tag] ?? null)
    .filter((value): value is number => value !== null);
  if (tagged.length === 0) return RISK_CATEGORY_WEIGHT.default;
  return tagged.reduce((sum, value) => sum + value, 0) / tagged.length;
}

export interface EvidenceAttachment {
  riskScore: number;
  provenance: DataProvenance;
  citations: Citation[];
  excerpts: Array<{ company: string; section: string; text: string }>;
}

export function attachEvidence(corpus: RiskCorpus, chunkIds: string[]): EvidenceAttachment {
  const selected = corpus.chunks.filter((chunk) =>
    chunkIds.includes(`${chunk.cik ?? chunk.company ?? "unknown"}|${chunk.accession ?? chunk.section ?? "n/a"}`),
  );
  const useChunks = selected.length > 0 ? selected : corpus.chunks.slice(0, Math.min(corpus.chunks.length, chunkIds.length));
  const riskScore =
    useChunks.length === 0
      ? RISK_CATEGORY_WEIGHT.default
      : useChunks.reduce((sum, chunk) => sum + deriveRiskScore(chunk), 0) / useChunks.length;
  const citations: Citation[] = useChunks.map((chunk) => ({
    source: "supplier-risk-rag-agent",
    sourceId: `${chunk.cik ?? chunk.company ?? "unknown"}|${chunk.accession ?? chunk.section ?? "n/a"}`,
    span: chunk.text.slice(0, 240),
    url: "https://github.com/AthenaTheOwl/supplier-risk-rag-agent",
  }));
  const excerpts = useChunks.map((chunk) => ({
    company: chunk.company ?? chunk.ticker ?? chunk.cik ?? "unknown",
    section: chunk.section ?? chunk.risk_category ?? "n/a",
    text: chunk.text.slice(0, 320),
  }));
  return {
    riskScore,
    provenance: tag("supplier-risk-rag", { citations, notes: `${useChunks.length} chunk(s) attached` }),
    citations,
    excerpts,
  };
}
