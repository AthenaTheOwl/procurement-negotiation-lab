/**
 * AgentFigure — round-friendly SVG character per spec 0010.
 *
 * 6 roles × 4 moods × 3 sizes. Static SVG; motion clips (Lottie) wired
 * later. The component is intentionally self-contained — no engine
 * imports — so it can be lifted into the mobile app with only the
 * SVG element imports swapped for react-native-svg.
 */

import type { CSSProperties } from "react";

export type AgentRole =
  | "buyer"
  | "supplier"
  | "packager"
  | "logistics"
  | "distributor"
  | "coordinator";

export type AgentMood = "neutral" | "happy" | "worried" | "walked-away";

export type AgentSize = "small" | "medium" | "large";

export interface AgentFigureProps {
  role: AgentRole;
  mood?: AgentMood;
  size?: AgentSize;
  /** play a motion clip on mount (currently no-op; wired to Lottie in Phase 8) */
  motion?: "wave" | "nod-yes" | "shake-no" | "walk-away" | null;
  /** click/tap handler; treated as a button when set */
  onActivate?: () => void;
  /** optional caption rendered below the figure */
  label?: string;
  /** optional className for outer wrapper */
  className?: string;
}

const ROLE_ACCENTS: Record<AgentRole, string> = {
  buyer: "var(--role-buyer, #3a78ff)",
  supplier: "var(--role-supplier, #f4a85f)",
  packager: "var(--role-packager, #9b8cff)",
  logistics: "var(--role-logistics, #1bb6c5)",
  distributor: "var(--role-distributor, #c64bd5)",
  coordinator: "var(--role-coordinator, #65d195)",
};

const SIZE_PX: Record<AgentSize, { w: number; h: number }> = {
  small: { w: 48, h: 60 },
  medium: { w: 96, h: 120 },
  large: { w: 160, h: 200 },
};

function MouthPath({ mood }: { mood: AgentMood }) {
  // Centered around (32, 26) on the 64-wide head
  if (mood === "happy") return <path d="M 27 28 Q 32 33 37 28" />;
  if (mood === "worried") return <path d="M 27 30 Q 30 27 32 30 T 37 30" />;
  if (mood === "walked-away") return null;
  return <path d="M 28 29 L 36 29" />;
}

function EyePaths({ mood }: { mood: AgentMood }) {
  if (mood === "walked-away") return null;
  const yOffset = mood === "worried" ? -1 : 0;
  return (
    <>
      <circle cx={26} cy={21 + yOffset} r={1.6} fill="currentColor" />
      <circle cx={38} cy={21 + yOffset} r={1.6} fill="currentColor" />
      {mood === "worried" && (
        <>
          <path d="M 23 17 L 28 19" />
          <path d="M 36 19 L 41 17" />
        </>
      )}
    </>
  );
}

function RoleProp({ role }: { role: AgentRole }) {
  // 18×18 prop region centered at (52, 53)
  const x = 42;
  const y = 44;
  if (role === "buyer") {
    // shopping cart
    return (
      <g transform={`translate(${x}, ${y})`}>
        <path
          d="M 1 4 L 4 4 L 6 13 L 16 13 L 18 5 L 5 5"
          fill="none"
          strokeWidth={1.8}
        />
        <circle cx={7} cy={16} r={1.4} />
        <circle cx={14} cy={16} r={1.4} />
      </g>
    );
  }
  if (role === "supplier") {
    // factory: two rectangles with a small smoke puff
    return (
      <g transform={`translate(${x}, ${y})`}>
        <rect x={2} y={6} width={6} height={11} rx={1} />
        <rect x={9} y={3} width={7} height={14} rx={1} />
        <circle cx={11} cy={1} r={1.4} fill="currentColor" opacity={0.55} />
      </g>
    );
  }
  if (role === "packager") {
    // box / cube
    return (
      <g transform={`translate(${x}, ${y})`} fill="none" strokeWidth={1.8}>
        <path d="M 2 6 L 10 2 L 18 6 L 18 14 L 10 18 L 2 14 Z" />
        <path d="M 2 6 L 10 10 L 18 6" />
        <path d="M 10 10 L 10 18" />
      </g>
    );
  }
  if (role === "logistics") {
    // small truck
    return (
      <g transform={`translate(${x}, ${y})`} fill="none" strokeWidth={1.8}>
        <rect x={1} y={5} width={10} height={8} rx={1} />
        <path d="M 11 9 L 14 9 L 17 11 L 17 13 L 11 13 Z" />
        <circle cx={5} cy={15} r={1.6} fill="currentColor" />
        <circle cx={14} cy={15} r={1.6} fill="currentColor" />
      </g>
    );
  }
  if (role === "distributor") {
    // warehouse silhouette
    return (
      <g transform={`translate(${x}, ${y})`} fill="none" strokeWidth={1.8}>
        <path d="M 1 7 L 10 2 L 18 7 L 18 17 L 1 17 Z" />
        <rect x={7} y={11} width={6} height={6} />
      </g>
    );
  }
  // coordinator: clipboard
  return (
    <g transform={`translate(${x}, ${y})`} fill="none" strokeWidth={1.8}>
      <rect x={3} y={3} width={12} height={15} rx={1} />
      <rect x={6} y={1} width={6} height={3} rx={0.5} />
      <path d="M 6 9 L 12 9" />
      <path d="M 6 12 L 12 12" />
      <path d="M 6 15 L 10 15" />
    </g>
  );
}

export function AgentFigure({
  role,
  mood = "neutral",
  size = "medium",
  motion = null,
  onActivate,
  label,
  className,
}: AgentFigureProps) {
  const { w, h } = SIZE_PX[size];
  const accent = ROLE_ACCENTS[role];
  const dimmed = mood === "walked-away";
  const wrapperStyle: CSSProperties = {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--space-2, 8px)",
    opacity: dimmed ? 0.3 : 1,
    transition: "opacity var(--motion-mid, 240ms) var(--easing-soft, ease)",
    cursor: onActivate ? "pointer" : "default",
  };
  const handleClick = onActivate;
  const ariaLabel = label ?? `${role} agent, mood ${mood}`;

  return (
    <span
      role={onActivate ? "button" : "img"}
      aria-label={ariaLabel}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (!onActivate) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate();
        }
      }}
      tabIndex={onActivate ? 0 : -1}
      style={wrapperStyle}
      className={className}
      data-testid={`agent-figure-${role}`}
      data-mood={mood}
      data-motion={motion ?? "none"}
    >
      <svg
        width={w}
        height={h}
        viewBox="0 0 64 80"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: accent }}
      >
        {/* torso: rounded rectangle with role accent fill */}
        <rect
          x={16}
          y={32}
          width={32}
          height={40}
          rx={12}
          ry={12}
          fill={accent}
          opacity={0.18}
        />
        <rect
          x={16}
          y={32}
          width={32}
          height={40}
          rx={12}
          ry={12}
          fill="none"
        />
        {/* head */}
        <circle cx={32} cy={20} r={14} fill={accent} opacity={0.18} />
        <circle cx={32} cy={20} r={14} fill="none" />
        {/* face */}
        <EyePaths mood={mood} />
        <MouthPath mood={mood} />
        {/* prop */}
        <RoleProp role={role} />
      </svg>
      {label !== undefined && (
        <span
          style={{
            fontSize: "var(--type-1, 0.85rem)",
            color: "var(--neutral-fg-soft, #5b5b62)",
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
