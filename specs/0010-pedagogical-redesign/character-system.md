# character-system: round-friendly agents for web + mobile

## Goals

Same six roles + four moods + four motion clips, rendered identically
on web (HTML SVG) and mobile (`react-native-svg`). All hand-buildable
without a designer; Lottie clips sourced from LottieFiles (free
licenses) or hand-rolled.

## Roles

| Role | Distinguishing prop | Accent color token |
|---|---|---|
| buyer | shopping cart | `--role-buyer` (#3a78ff) |
| supplier | factory + smokestack | `--role-supplier` (#f4a85f) |
| packager | box / cube | `--role-packager` (#9b8cff) |
| logistics | small truck | `--role-logistics` (#1bb6c5) |
| distributor | warehouse silhouette | `--role-distributor` (#c64bd5) |
| coordinator | clipboard | `--role-coordinator` (#65d195) |

Every role uses the same body silhouette (round head + rounded
rectangle torso). Only the prop next to the figure changes, plus the
accent color. This keeps the system buildable in an evening.

## Moods

| Mood | Eye path | Mouth path | Opacity |
|---|---|---|---|
| neutral | two dots | flat line | 100% |
| happy | two dots with smile-arc | upward arc | 100% |
| worried | two dots with brow | wavy line | 100% |
| walked-away | empty silhouette (no face) | (none) | 30%, dashed stroke |

## Geometry (one 64×80 viewBox per figure)

```
viewBox: 0 0 64 80
head:    cx=32 cy=20 r=14
torso:   x=16 y=32 width=32 height=40 rx=12 ry=12
prop:    icon at x=42 y=44 width=18 height=18
```

A single SVG path string per body/prop. Mood swaps the inner face
paths only. Total size on disk: ~200 lines of TS per `AgentFigure`
component (6 roles × ~30 lines each).

## Lottie clips (4)

Each clip is a ~1-second JSON file in `packages/engine/assets/lottie/`:

| Clip | When it plays | Source |
|---|---|---|
| `wave.json` | Level intro on agent's first appearance | LottieFiles "wave hand" |
| `nod-yes.json` | Reveal: prediction correct / deal closed | LottieFiles "nod yes" |
| `shake-no.json` | Reveal: prediction wrong / walk-away near | LottieFiles "shake no" |
| `walk-away.json` | Walked-away mood transition | hand-rolled |

Lottie clips overlay the static `AgentFigure` on the same coordinate
system. The static SVG provides the colors + props; Lottie provides
the motion.

## Sizes

| Size token | Width × height |
|---|---|
| small | 48 × 60 |
| medium | 96 × 120 |
| large | 160 × 200 |

Mobile defaults to `medium`; web defaults to `large`.

## Component API (both web + mobile)

```ts
type AgentFigureProps = {
  role: "buyer" | "supplier" | "packager" | "logistics" | "distributor" | "coordinator";
  mood: "neutral" | "happy" | "worried" | "walked-away";
  size?: "small" | "medium" | "large";
  /** play a Lottie clip on mount; clip resolves to assets/lottie/<id>.json */
  motion?: "wave" | "nod-yes" | "shake-no" | "walk-away" | null;
  /** tap/click handler */
  onActivate?: () => void;
};
```

Web implementation: a single `<svg>` with the resolved paths + an
optional `<Lottie animationData={...} />` overlay (lottie-web).

Mobile implementation: a single `<Svg>` from `react-native-svg` with
the same paths + an optional `<LottieView source={...} />` overlay
(lottie-react-native).

## Accessibility

- Each figure renders an `aria-label` on web and `accessibilityLabel`
  on mobile, formatted as `"{role} agent, mood {mood}"`.
- Buttons that wrap figures use the figure's label for screen readers.
- Color contrast for accent tokens verified against
  `--neutral-bg` and `--neutral-fg` at AA on web; same tokens on
  mobile.

## Out of scope

- Custom poses beyond the four moods (no "running", no "celebrating",
  etc.). Add later if needed.
- Custom skin tones / cultural variants. Generic round figures only.
- Sound effects. Optional, deferred to Phase 8 polish.
