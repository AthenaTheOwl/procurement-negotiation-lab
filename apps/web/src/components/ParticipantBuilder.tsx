import { useMemo, useState } from "react";
import type { Participant, ParticipantRole, Strategy } from "@lab/engine";
import { strategies } from "@lab/engine";
interface ParticipantBuilderProps {
  participants: Participant[];
  onChange: (participants: Participant[]) => void;
}

function makeIdFromName(name: string, taken: Set<string>): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "participant";
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function instantiate(strategy: Strategy, taken: Set<string>): Participant {
  const id = makeIdFromName(strategy.shortName, taken);
  return {
    id,
    role: strategy.role,
    name: strategy.shortName,
    strategyId: strategy.id,
    reliability: strategy.defaultReliability,
    capacity: strategy.defaultCapacity,
    outsideOption: strategy.defaultOutsideOption,
    parameters: { ...strategy.defaultParameters },
  };
}

const ROLE_FILTERS: Array<{ value: ParticipantRole | "all"; label: string }> = [
  { value: "all", label: "all" },
  { value: "buyer", label: "buyer" },
  { value: "supplier", label: "supplier" },
  { value: "packager", label: "packager" },
  { value: "logistics", label: "logistics" },
  { value: "distributor", label: "distributor" },
  { value: "coordinator", label: "coordinator" },
];

export function ParticipantBuilder({ participants, onChange }: ParticipantBuilderProps) {
  const [filter, setFilter] = useState<ParticipantRole | "all">("all");
  const takenIds = useMemo(() => new Set(participants.map((p) => p.id)), [participants]);
  const filtered = useMemo(
    () => (filter === "all" ? strategies : strategies.filter((s) => s.role === filter)),
    [filter],
  );

  function handleAdd(strategy: Strategy) {
    if (participants.length >= 8) return;
    const newParticipant = instantiate(strategy, takenIds);
    onChange([...participants, newParticipant]);
  }

  function handleRemove(id: string) {
    if (participants.length <= 2) return;
    onChange(participants.filter((participant) => participant.id !== id));
  }

  return (
    <div className="participant-builder" data-testid="participant-builder">
      <div className="section-label">2b. Add a participant from the strategy library</div>
      <p className="muted">
        Ten strategies span buyer, supplier, packager, logistics, distributor, and coordinator
        roles. One click instantiates the strategy as a new participant with its default utility
        formula, parameters, reliability prior, and outside option.
      </p>
      <div className="view-picker-buttons" role="tablist">
        {ROLE_FILTERS.map((option) => (
          <button
            key={option.value}
            className={filter === option.value ? "view-button active" : "view-button"}
            onClick={() => setFilter(option.value)}
            data-testid={`filter-${option.value}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <ul className="strategy-list" data-testid="strategy-list">
        {filtered.map((strategy) => (
          <li key={strategy.id} className="strategy-list-item">
            <div className="strategy-headline">
              <strong>{strategy.name}</strong>
              <span className="muted"> · {strategy.role}</span>
            </div>
            <p className="muted">{strategy.description}</p>
            <code className="strategy-formula">{strategy.defaultUtilityFormula}</code>
            <div className="button-row">
              <button
                className="primary"
                onClick={() => handleAdd(strategy)}
                disabled={participants.length >= 8}
                data-testid={`add-${strategy.id}`}
              >
                + add to scenario
              </button>
            </div>
          </li>
        ))}
      </ul>
      {participants.length > 0 && (
        <div className="callout">
          <strong>Current scenario participants:</strong>
          <ul className="current-participants">
            {participants.map((participant) => (
              <li key={participant.id}>
                <span>{participant.name} <span className="muted">({participant.role}, strategy <code>{participant.strategyId}</code>)</span></span>
                <button
                  className="link-button"
                  onClick={() => handleRemove(participant.id)}
                  disabled={participants.length <= 2}
                  data-testid={`remove-${participant.id}`}
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
          {participants.length >= 8 && (
            <p className="muted">Max 8 participants reached — remove one before adding another.</p>
          )}
        </div>
      )}
    </div>
  );
}
