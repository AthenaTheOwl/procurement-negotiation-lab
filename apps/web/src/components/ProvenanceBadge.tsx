import type { DataProvenance } from "@lab/engine";
import { PROVENANCE_BADGE_COLORS, PROVENANCE_LABELS, describeProvenance } from "@lab/engine";
interface ProvenanceBadgeProps {
  provenance?: DataProvenance;
  testId?: string;
}

export function ProvenanceBadge({ provenance, testId }: ProvenanceBadgeProps) {
  if (!provenance) {
    return (
      <span
        className="provenance-badge"
        style={{ backgroundColor: PROVENANCE_BADGE_COLORS.synthetic }}
        data-testid={testId}
        title={PROVENANCE_LABELS.synthetic}
      >
        synthetic
      </span>
    );
  }
  return (
    <span
      className="provenance-badge"
      style={{ backgroundColor: PROVENANCE_BADGE_COLORS[provenance.source] }}
      title={describeProvenance(provenance)}
      data-testid={testId}
    >
      {PROVENANCE_LABELS[provenance.source]}
    </span>
  );
}
