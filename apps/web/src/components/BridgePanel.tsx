import { useState } from "react";
import type { ChipMapData, ChipMapSeed, EvidenceAttachment, LabScenario, RiskCorpus } from "@lab/engine";
import { CHIP_MAP_NODES_URL, SUPPLIER_RISK_CHUNKS_URL, attachEvidence, fetchChipMapData, fetchRiskCorpus, seedFromChipMap } from "@lab/engine";
interface BridgePanelProps {
  scenario: LabScenario;
  onSeedFromChipMap: (seed: ChipMapSeed) => void;
  onAttachRiskEvidence: (evidence: EvidenceAttachment) => void;
}

export function BridgePanel({ onSeedFromChipMap, onAttachRiskEvidence }: BridgePanelProps) {
  const [chipMap, setChipMap] = useState<ChipMapData | null>(null);
  const [chipMapError, setChipMapError] = useState<string | null>(null);
  const [centerId, setCenterId] = useState<string>("");
  const [corpus, setCorpus] = useState<RiskCorpus | null>(null);
  const [corpusError, setCorpusError] = useState<string | null>(null);
  const [selectedChunkIds, setSelectedChunkIds] = useState<string[]>([]);
  const [loadingChip, setLoadingChip] = useState(false);
  const [loadingRisk, setLoadingRisk] = useState(false);

  async function loadChipMap() {
    setLoadingChip(true);
    setChipMapError(null);
    try {
      const data = await fetchChipMapData();
      setChipMap(data);
      if (data.nodes.length > 0 && !centerId) {
        setCenterId(data.nodes[0].id);
      }
    } catch (error) {
      setChipMapError((error as Error).message);
    } finally {
      setLoadingChip(false);
    }
  }

  function seedFromChipMapNode() {
    if (!chipMap || !centerId) return;
    try {
      const seed = seedFromChipMap(chipMap, centerId);
      onSeedFromChipMap(seed);
    } catch (error) {
      setChipMapError((error as Error).message);
    }
  }

  async function loadCorpus() {
    setLoadingRisk(true);
    setCorpusError(null);
    try {
      const data = await fetchRiskCorpus();
      setCorpus(data);
    } catch (error) {
      setCorpusError((error as Error).message);
    } finally {
      setLoadingRisk(false);
    }
  }

  function toggleChunk(id: string) {
    setSelectedChunkIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function attachSelected() {
    if (!corpus) return;
    const evidence = attachEvidence(corpus, selectedChunkIds);
    onAttachRiskEvidence(evidence);
  }

  return (
    <div className="results-card" data-testid="bridge-panel">
      <h3>8. Bridges to other repos</h3>
      <p className="muted">
        Fetch open data from sibling repos (public GitHub raw URLs only). Each successful
        bridge stamps the scenario with provenance metadata that flows into run reports.
      </p>

      <div className="bridge-section">
        <h4>chip-supply-chain-map</h4>
        <p className="muted">
          Source: <a href={CHIP_MAP_NODES_URL} target="_blank" rel="noreferrer">{CHIP_MAP_NODES_URL}</a>
        </p>
        <div className="button-row">
          <button onClick={loadChipMap} disabled={loadingChip} data-testid="chipmap-fetch-btn">
            {loadingChip ? "fetching…" : chipMap ? "refetch" : "fetch graph"}
          </button>
        </div>
        {chipMapError && <p className="callout warn">{chipMapError}</p>}
        {chipMap && (
          <>
            <label className="select-label">
              Center node
              <select
                value={centerId}
                onChange={(event) => setCenterId(event.target.value)}
                data-testid="chipmap-center-select"
              >
                {chipMap.nodes.map((node) => (
                  <option key={node.id} value={node.id}>{node.name} ({node.type})</option>
                ))}
              </select>
            </label>
            <div className="button-row">
              <button className="primary" onClick={seedFromChipMapNode} data-testid="chipmap-seed-btn">
                Seed scenario from selected node
              </button>
            </div>
            <p className="muted">{chipMap.nodes.length} node(s), {chipMap.edges.length} edge(s). Fetched {chipMap.fetchedAt.slice(0, 19)}.</p>
          </>
        )}
      </div>

      <div className="bridge-section">
        <h4>supplier-risk-rag-agent</h4>
        <p className="muted">
          Source: <a href={SUPPLIER_RISK_CHUNKS_URL} target="_blank" rel="noreferrer">{SUPPLIER_RISK_CHUNKS_URL}</a>
        </p>
        <div className="button-row">
          <button onClick={loadCorpus} disabled={loadingRisk} data-testid="risk-fetch-btn">
            {loadingRisk ? "fetching…" : corpus ? "refetch" : "fetch corpus"}
          </button>
        </div>
        {corpusError && <p className="callout warn">{corpusError}</p>}
        {corpus && (
          <>
            <p className="muted">{corpus.chunks.length} chunk(s) loaded.</p>
            <ul className="risk-chunk-list" data-testid="risk-chunk-list">
              {corpus.chunks.slice(0, 8).map((chunk, idx) => {
                const id = `${chunk.cik ?? chunk.company ?? `chunk-${idx}`}|${chunk.accession ?? chunk.section ?? "n/a"}`;
                return (
                  <li key={id}>
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={selectedChunkIds.includes(id)}
                        onChange={() => toggleChunk(id)}
                      />
                      <strong>{chunk.company ?? chunk.ticker ?? chunk.cik ?? "unknown"}</strong>
                      <span className="muted"> · {chunk.section ?? chunk.risk_category ?? "?"}</span>
                    </label>
                    <p className="muted">{chunk.text.slice(0, 200)}…</p>
                  </li>
                );
              })}
            </ul>
            <div className="button-row">
              <button
                className="primary"
                disabled={selectedChunkIds.length === 0}
                onClick={attachSelected}
                data-testid="risk-attach-btn"
              >
                Attach evidence
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
