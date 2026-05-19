import type { Citation, DataProvenance, ProvenanceSource } from "../types";

export const PROVENANCE_LABELS: Record<ProvenanceSource, string> = {
  synthetic: "synthetic (Lab default)",
  "chip-map": "chip-supply-chain-map (public)",
  "supplier-risk-rag": "supplier-risk-rag-agent (public)",
  "user-imported": "user paste (in-session)",
  "csv-imported": "CSV import (Open Contracting shape)",
};

export const PROVENANCE_BADGE_COLORS: Record<ProvenanceSource, string> = {
  synthetic: "#3a3f4a",
  "chip-map": "#2563eb",
  "supplier-risk-rag": "#7c3aed",
  "user-imported": "#0d9488",
  "csv-imported": "#b45309",
};

export function tag(
  source: ProvenanceSource,
  options: { sourceId?: string; citations?: Citation[]; notes?: string } = {},
): DataProvenance {
  return {
    source,
    sourceId: options.sourceId,
    fetchedAt: new Date().toISOString(),
    citations: options.citations ?? [],
    notes: options.notes,
  };
}

export function mergeProvenance(base: DataProvenance, addition: DataProvenance): DataProvenance {
  return {
    source: addition.source,
    sourceId: addition.sourceId ?? base.sourceId,
    fetchedAt: addition.fetchedAt ?? base.fetchedAt,
    citations: dedupeCitations([...base.citations, ...addition.citations]),
    notes: addition.notes ?? base.notes,
  };
}

function dedupeCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const citation of citations) {
    const key = `${citation.source}|${citation.sourceId ?? ""}|${citation.span ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(citation);
  }
  return out;
}

export function describeProvenance(provenance: DataProvenance): string {
  const label = PROVENANCE_LABELS[provenance.source];
  const sourceId = provenance.sourceId ? ` · ${provenance.sourceId}` : "";
  const fetched = provenance.fetchedAt ? ` · fetched ${provenance.fetchedAt.slice(0, 10)}` : "";
  const cites =
    provenance.citations.length > 0
      ? ` · ${provenance.citations.length} citation${provenance.citations.length === 1 ? "" : "s"}`
      : "";
  return `${label}${sourceId}${fetched}${cites}`;
}
