/**
 * UtilityCurve — SVG line chart with deal/walkaway zones.
 *
 * Takes a precomputed sample of (x, y) points and an outside-option
 * threshold. Renders:
 *   - shaded green region where y >= outsideOption (deal zone)
 *   - shaded red region below outsideOption (walkaway zone)
 *   - the curve itself
 *   - a horizontal dashed line at outsideOption
 *   - an active marker at currentX (interpolated)
 *
 * Layout-agnostic; the wrapping flex container in Level04 sizes it.
 */

import { useMemo } from "react";
import type { CSSProperties } from "react";

export interface UtilityCurvePoint {
  x: number;
  y: number;
}

export interface UtilityCurveProps {
  party: "buyer" | "supplier";
  points: UtilityCurvePoint[];
  outsideOption: number;
  currentX: number;
  /** force a max-y for scaling; defaults to max of points and outside option. */
  yMax?: number;
  /** force a min-y; defaults to min(points.y, outsideOption, 0). */
  yMin?: number;
  width?: number;
  height?: number;
  /** label shown above the chart */
  label?: string;
  testId?: string;
}

export function UtilityCurve({
  party,
  points,
  outsideOption,
  currentX,
  yMax,
  yMin,
  width = 280,
  height = 200,
  label,
  testId,
}: UtilityCurveProps) {
  const padding = { top: 12, right: 12, bottom: 24, left: 36 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const { xMin, xMax, yLo, yHi } = useMemo(() => {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const computedMin = Math.min(...ys, outsideOption);
    const computedMax = Math.max(...ys, outsideOption);
    const pad = (computedMax - computedMin) * 0.08;
    return {
      xMin: Math.min(...xs),
      xMax: Math.max(...xs),
      yLo: yMin ?? computedMin - pad,
      yHi: yMax ?? computedMax + pad,
    };
  }, [points, outsideOption, yMax, yMin]);

  const scaleX = (x: number) =>
    padding.left + ((x - xMin) / (xMax - xMin || 1)) * innerW;
  const scaleY = (y: number) =>
    padding.top + (1 - (y - yLo) / (yHi - yLo || 1)) * innerH;

  const outsideY = scaleY(outsideOption);
  const curvePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(p.x)},${scaleY(p.y)}`)
    .join(" ");

  // For the active marker, find the y by linear interpolation between
  // bracketing points (since points are sampled discretely).
  const currentY = (() => {
    if (points.length === 0) return outsideOption;
    if (currentX <= points[0].x) return points[0].y;
    if (currentX >= points[points.length - 1].x) {
      return points[points.length - 1].y;
    }
    for (let i = 1; i < points.length; i += 1) {
      if (points[i].x >= currentX) {
        const a = points[i - 1];
        const b = points[i];
        const t = (currentX - a.x) / (b.x - a.x || 1);
        return a.y + t * (b.y - a.y);
      }
    }
    return points[points.length - 1].y;
  })();

  const markerColor =
    currentY >= outsideOption
      ? "var(--surplus-good, #1bb676)"
      : "var(--surplus-lost, #d24a4a)";
  const roleColor =
    party === "buyer"
      ? "var(--role-buyer, #3a78ff)"
      : "var(--role-supplier, #f5a83a)";

  const wrapper: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2, 8px)",
  };
  const labelStyle: CSSProperties = {
    fontSize: "var(--type-1, 0.85rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  return (
    <div style={wrapper} data-testid={testId ?? `utility-curve-${party}`}>
      {label && <div style={labelStyle}>{label}</div>}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${party} utility curve, active value ${currentY.toFixed(0)}`}
      >
        {/* deal zone (above outside option) */}
        <rect
          x={padding.left}
          y={padding.top}
          width={innerW}
          height={Math.max(0, outsideY - padding.top)}
          fill="var(--deal-zone, rgba(27, 182, 118, 0.1))"
        />
        {/* walkaway zone (below outside option) */}
        <rect
          x={padding.left}
          y={outsideY}
          width={innerW}
          height={Math.max(0, padding.top + innerH - outsideY)}
          fill="var(--walkaway-zone, rgba(210, 74, 74, 0.1))"
        />
        {/* outside-option dashed line */}
        <line
          x1={padding.left}
          y1={outsideY}
          x2={padding.left + innerW}
          y2={outsideY}
          stroke="var(--neutral-fg-soft, #5b5b62)"
          strokeWidth={1.2}
          strokeDasharray="4 4"
          data-testid={`outside-line-${party}`}
        />
        <text
          x={padding.left + 4}
          y={outsideY - 4}
          fontSize="10"
          fill="var(--neutral-fg-soft, #5b5b62)"
        >
          outside ${Math.round(outsideOption).toLocaleString()}
        </text>
        {/* curve */}
        <path
          d={curvePath}
          stroke={roleColor}
          strokeWidth={2.4}
          fill="none"
          data-testid={`curve-line-${party}`}
        />
        {/* active marker */}
        <circle
          cx={scaleX(currentX)}
          cy={scaleY(currentY)}
          r={7}
          fill={markerColor}
          stroke="white"
          strokeWidth={2}
          data-testid={`curve-marker-${party}`}
        />
      </svg>
    </div>
  );
}
