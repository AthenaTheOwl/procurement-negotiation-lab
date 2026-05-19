/**
 * ConvergenceAnimation — small SVG widget that animates a "negotiation"
 * converging to a settlement point.
 *
 * Variants:
 *   kind="oracle"  → single dot lands at target after a 200ms beat.
 *   kind="admm"    → two dots (buyer, supplier) zig-zag toward each
 *                    other in 6 iterations.
 *   kind="vcg"     → like admm + a transfer arrow appears on the last
 *                    iteration.
 *
 * Runs when `playing` is set to true (parent controls).
 */

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

export type ConvergenceKind = "oracle" | "admm" | "vcg";

export interface ConvergenceAnimationProps {
  kind: ConvergenceKind;
  /** total animation duration in ms (caller controls pacing) */
  duration?: number;
  /** flip to true to run the animation; reset to false to rewind */
  playing: boolean;
  onComplete?: () => void;
  width?: number;
  height?: number;
  testId?: string;
}

export function ConvergenceAnimation({
  kind,
  duration = 2_000,
  playing,
  onComplete,
  width = 220,
  height = 140,
  testId,
}: ConvergenceAnimationProps) {
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) {
      setProgress(0);
      startRef.current = null;
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      return;
    }
    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const t = Math.min(1, (timestamp - startRef.current) / duration);
      setProgress(t);
      if (t < 1) {
        frameRef.current = window.requestAnimationFrame(step);
      } else {
        onComplete?.();
      }
    };
    frameRef.current = window.requestAnimationFrame(step);
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [playing, duration, onComplete]);

  const padding = 18;
  const targetX = width / 2;
  const targetY = height / 2;

  // For ADMM/VCG, two dots that converge toward targetX/targetY.
  const buyerStartX = padding;
  const supplierStartX = width - padding;
  const buyerY = height * 0.32;
  const supplierY = height * 0.68;

  // Easing — ease-out cubic
  const ease = 1 - Math.pow(1 - progress, 3);

  const buyerCurX = buyerStartX + ease * (targetX - buyerStartX);
  const buyerCurY = buyerY + ease * (targetY - buyerY);
  const supplierCurX = supplierStartX + ease * (targetX - supplierStartX);
  const supplierCurY = supplierY + ease * (targetY - supplierY);

  const oracleOpacity = progress < 0.2 ? 0 : Math.min(1, (progress - 0.2) / 0.3);

  const wrapper: CSSProperties = {
    background: "var(--neutral-bg, #f7f7f4)",
    borderRadius: "var(--radius-tile, 12px)",
    padding: "var(--space-3, 12px)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2, 8px)",
    alignItems: "center",
  };

  return (
    <div style={wrapper} data-testid={testId ?? `convergence-${kind}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${kind} convergence animation`}
        data-progress={progress.toFixed(2)}
      >
        {/* settlement-zone background */}
        <circle
          cx={targetX}
          cy={targetY}
          r={20}
          fill="var(--deal-zone, rgba(27, 182, 118, 0.15))"
        />
        {kind === "oracle" ? (
          <circle
            cx={targetX}
            cy={targetY}
            r={9}
            fill="var(--role-coordinator, #6d54ff)"
            opacity={oracleOpacity}
            data-testid="oracle-dot"
          />
        ) : (
          <>
            <circle
              cx={buyerCurX}
              cy={buyerCurY}
              r={9}
              fill="var(--role-buyer, #3a78ff)"
              data-testid="buyer-dot"
            />
            <circle
              cx={supplierCurX}
              cy={supplierCurY}
              r={9}
              fill="var(--role-supplier, #f5a83a)"
              data-testid="supplier-dot"
            />
          </>
        )}
        {kind === "vcg" && progress > 0.9 && (
          <line
            x1={buyerCurX + 8}
            y1={buyerCurY}
            x2={supplierCurX - 8}
            y2={supplierCurY}
            stroke="var(--role-coordinator, #6d54ff)"
            strokeWidth={2}
            markerEnd="url(#arrow)"
            data-testid="vcg-transfer"
          />
        )}
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--role-coordinator, #6d54ff)" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
