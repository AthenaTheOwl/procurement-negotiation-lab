import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  fetchChipMapData,
  seedFromChipMap,
  clearChipMapCache,
  type ChipMapData,
} from "./chipMap";

const NODES_CSV = `id,name,type,country,short_description,chokepoint_score
tsmc,TSMC,foundry,TW,Leading-edge foundry,0.85
asml,ASML,equipment,NL,EUV monopoly,0.92
nvda,NVIDIA,fabless,US,GPU + AI accelerator demand,0.4
`;

const EDGES_CSV = `source,target,relation,strength
asml,tsmc,supplies-equipment,critical
tsmc,nvda,produces-chips,critical
`;

function mockFetcher(): (input: string) => Promise<{ ok: boolean; text: () => Promise<string> }> {
  return async (url: string) => {
    if (url.endsWith("nodes.csv")) {
      return { ok: true, text: async () => NODES_CSV };
    }
    if (url.endsWith("edges.csv")) {
      return { ok: true, text: async () => EDGES_CSV };
    }
    return { ok: false, text: async () => "" };
  };
}

describe("chip-map bridge", () => {
  beforeEach(() => {
    clearChipMapCache();
  });
  afterEach(() => {
    clearChipMapCache();
  });

  it("fetchChipMapData parses public nodes + edges CSVs", async () => {
    const data = await fetchChipMapData(mockFetcher());
    expect(data.nodes.length).toBe(3);
    expect(data.edges.length).toBe(2);
    expect(data.nodes[0].id).toBe("tsmc");
  });

  it("caches in sessionStorage on second call", async () => {
    let calls = 0;
    const fetcher: (url: string) => Promise<{ ok: boolean; text: () => Promise<string> }> = async (url) => {
      calls += 1;
      return mockFetcher()(url);
    };
    await fetchChipMapData(fetcher);
    await fetchChipMapData(fetcher);
    expect(calls).toBe(2); // 2 from first call: nodes + edges; cached on second
  });

  it("seedFromChipMap produces a buyer + supplier participants", async () => {
    const data: ChipMapData = await fetchChipMapData(mockFetcher());
    const seed = seedFromChipMap(data, "tsmc");
    expect(seed.participants[0].role).toBe("buyer");
    expect(seed.provenance.source).toBe("chip-map");
    expect(seed.provenance.citations.length).toBeGreaterThan(0);
  });

  it("seedFromChipMap throws when the center node is unknown", async () => {
    const data: ChipMapData = await fetchChipMapData(mockFetcher());
    expect(() => seedFromChipMap(data, "unknown")).toThrow();
  });

  it("surfaces fetch failures clearly", async () => {
    const failingFetcher = async () => ({ ok: false, text: async () => "" });
    await expect(fetchChipMapData(failingFetcher)).rejects.toThrow();
  });
});
