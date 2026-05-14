import { z } from "zod";
import type { Citation, DataProvenance, Participant } from "../types";
import { tag } from "./sourceProvenance";

export const CHIP_MAP_NODES_URL =
  "https://raw.githubusercontent.com/AthenaTheOwl/chip-supply-chain-map/main/src/data/nodes.csv";
export const CHIP_MAP_EDGES_URL =
  "https://raw.githubusercontent.com/AthenaTheOwl/chip-supply-chain-map/main/src/data/edges.csv";

const SESSION_CACHE_KEY = "procurement-lab.bridges.chipMap";

const chipMapNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  country: z.string().optional(),
  short_description: z.string().optional(),
  chokepoint_score: z.coerce.number().min(0).max(1).optional(),
});

const chipMapEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  relation: z.string(),
  strength: z.string().optional(),
});

export type ChipMapNode = z.infer<typeof chipMapNodeSchema>;
export type ChipMapEdge = z.infer<typeof chipMapEdgeSchema>;

export interface ChipMapData {
  nodes: ChipMapNode[];
  edges: ChipMapEdge[];
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

export async function fetchChipMapData(
  fetcher: FetchLike = (typeof fetch !== "undefined" ? (fetch as unknown as FetchLike) : (async () => {
    throw new Error("fetch not available");
  })),
): Promise<ChipMapData> {
  const cache = getCache();
  if (cache) {
    const raw = cache.getItem(SESSION_CACHE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as ChipMapData;
      } catch {
        cache.removeItem(SESSION_CACHE_KEY);
      }
    }
  }
  const [nodesRes, edgesRes] = await Promise.all([fetcher(CHIP_MAP_NODES_URL), fetcher(CHIP_MAP_EDGES_URL)]);
  if (!nodesRes.ok || !edgesRes.ok) {
    throw new Error("chip-supply-chain-map fetch failed");
  }
  const [nodesText, edgesText] = await Promise.all([nodesRes.text(), edgesRes.text()]);
  const nodes = parseCsv(nodesText, chipMapNodeSchema);
  const edges = parseCsv(edgesText, chipMapEdgeSchema);
  const data: ChipMapData = { nodes, edges, fetchedAt: new Date().toISOString() };
  if (cache) {
    cache.setItem(SESSION_CACHE_KEY, JSON.stringify(data));
  }
  return data;
}

export function clearChipMapCache(): void {
  const cache = getCache();
  if (cache) cache.removeItem(SESSION_CACHE_KEY);
}

function parseCsv<T>(text: string, schema: z.ZodSchema<T>): T[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map((value) => value.trim());
  const out: T[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    header.forEach((key, idx) => {
      row[key] = values[idx] ?? "";
    });
    const parsed = schema.safeParse(row);
    if (parsed.success) {
      out.push(parsed.data);
    }
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current.trim());
  return result;
}

export interface ChipMapSeed {
  participants: Participant[];
  provenance: DataProvenance;
  centerNode: ChipMapNode;
  neighbors: ChipMapNode[];
}

export function seedFromChipMap(data: ChipMapData, centerId: string): ChipMapSeed {
  const center = data.nodes.find((n) => n.id === centerId);
  if (!center) {
    throw new Error(`chip-map node ${centerId} not found`);
  }
  const neighborIds = new Set<string>();
  for (const edge of data.edges) {
    if (edge.source === centerId) neighborIds.add(edge.target);
    if (edge.target === centerId) neighborIds.add(edge.source);
  }
  const neighbors = data.nodes.filter((n) => neighborIds.has(n.id));
  const participants: Participant[] = [];
  participants.push({
    id: `${center.id}-buyer`,
    role: "buyer",
    name: `${center.name} (buyer)`,
    strategyId: "launch-protector-buyer",
    reliability: 1 - (center.chokepoint_score ?? 0.2) * 0.3,
    parameters: {
      urgency: 0.75,
      flexibility: 0.5,
      truthfulness: 0.78,
      privacyPreference: 0.55,
      riskAversion: 0.7,
    },
    outsideOption: 8400,
  });
  neighbors.slice(0, 4).forEach((node, idx) => {
    participants.push({
      id: `${node.id}`,
      role: node.type === "foundry" || node.type === "supplier" ? "supplier" : "packager",
      name: node.name,
      strategyId: idx === 0 ? "capacity-guard-supplier" : "yield-optimizer-supplier",
      reliability: 1 - (node.chokepoint_score ?? 0.25) * 0.35,
      capacity: 600 - idx * 40,
      outsideOption: 4800 - idx * 200,
      parameters: {
        urgency: 0.45,
        flexibility: 0.55,
        truthfulness: 0.75,
        privacyPreference: 0.7,
        riskAversion: 0.65,
      },
    });
  });
  const citations: Citation[] = neighbors.map((node) => ({
    source: "chip-supply-chain-map",
    sourceId: node.id,
    span: node.short_description,
    url: `https://github.com/AthenaTheOwl/chip-supply-chain-map`,
  }));
  return {
    participants,
    provenance: tag("chip-map", { sourceId: center.id, citations, notes: `seeded around ${center.name}` }),
    centerNode: center,
    neighbors,
  };
}
