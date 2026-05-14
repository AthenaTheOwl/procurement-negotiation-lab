import { useEffect, useMemo, useRef } from "react";
import type { Participant } from "../../model/types";

interface SourceGraphProps {
  participants: Participant[];
  edges?: Array<{ source: string; target: string; quantity?: number }>;
  selectedId?: string;
  onSelect?: (participantId: string) => void;
}

interface CytoscapeLib {
  default?: (config: unknown) => unknown;
}

let cytoscapeImport: Promise<CytoscapeLib> | null = null;
function loadCytoscape(): Promise<CytoscapeLib> {
  if (!cytoscapeImport) {
    cytoscapeImport = import("cytoscape") as Promise<CytoscapeLib>;
  }
  return cytoscapeImport;
}

export function SourceGraph({ participants, edges, selectedId, onSelect }: SourceGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<{
    destroy?: () => void;
    on?: (event: string, selector: string, cb: (event: { target: { id(): string } }) => void) => void;
  } | null>(null);

  const computedEdges = useMemo(() => {
    if (edges && edges.length > 0) return edges;
    const buyer = participants.find((p) => p.role === "buyer");
    if (!buyer) return [] as Array<{ source: string; target: string; quantity?: number }>;
    return participants
      .filter((p) => p.id !== buyer.id)
      .map((p) => ({ source: p.id, target: buyer.id, quantity: p.capacity ?? 400 }));
  }, [participants, edges]);

  useEffect(() => {
    let cancelled = false;
    if (!containerRef.current) return;
    loadCytoscape()
      .then((mod) => {
        if (cancelled || !containerRef.current) return;
        const cyFactory = (mod.default ?? (mod as unknown as (config: unknown) => unknown)) as (config: {
          container: HTMLElement;
          elements: unknown[];
          style: unknown[];
          layout: { name: string };
        }) => {
          destroy?: () => void;
          on?: (
            event: string,
            selector: string,
            cb: (event: { target: { id(): string } }) => void,
          ) => void;
        };
        if (cyRef.current?.destroy) cyRef.current.destroy();
        const elements = [
          ...participants.map((p) => ({
            data: { id: p.id, label: p.name, role: p.role },
          })),
          ...computedEdges.map((edge) => ({
            data: {
              id: `${edge.source}->${edge.target}`,
              source: edge.source,
              target: edge.target,
              weight: Math.max(1, Math.log10(Math.max(2, edge.quantity ?? 1))),
            },
          })),
        ];
        const instance = cyFactory({
          container: containerRef.current,
          elements,
          style: [
            {
              selector: "node",
              style: {
                "background-color": "#f4a85f",
                label: "data(label)",
                color: "#fff",
                "text-valign": "center",
                "font-size": "10px",
                width: 32,
                height: 32,
              },
            },
            {
              selector: 'node[role = "buyer"]',
              style: { "background-color": "#5ba3f4" },
            },
            {
              selector: "edge",
              style: {
                width: "data(weight)",
                "line-color": "rgba(255,255,255,0.35)",
                "curve-style": "bezier",
                "target-arrow-shape": "triangle",
                "target-arrow-color": "rgba(255,255,255,0.35)",
              },
            },
            {
              selector: `node[id = "${selectedId ?? ""}"]`,
              style: { "border-width": 3, "border-color": "#f4a85f" },
            },
          ],
          layout: { name: "circle" },
        });
        cyRef.current = instance;
        instance.on?.("tap", "node", (event) => {
          if (onSelect) onSelect(event.target.id());
        });
      })
      .catch(() => {
        // cytoscape failed to load — fall back to inline list rendering
      });
    return () => {
      cancelled = true;
      if (cyRef.current?.destroy) cyRef.current.destroy();
    };
  }, [participants, computedEdges, selectedId, onSelect]);

  return (
    <div className="source-graph-wrap" data-testid="source-graph">
      <div ref={containerRef} className="source-graph" style={{ height: 240, width: "100%" }} />
      <ul className="source-graph-fallback">
        {participants.map((p) => (
          <li key={p.id}>
            <strong>{p.name}</strong> <span className="muted">({p.role})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
