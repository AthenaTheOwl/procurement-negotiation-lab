import type { Participant } from "../model/types";
import { describeView, type ViewMode } from "../model/views";

interface ViewPickerProps {
  participants: Participant[];
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewPicker({ participants, value, onChange }: ViewPickerProps) {
  const buyers = participants.filter((p) => p.role === "buyer");
  const otherRoles = participants.filter((p) => p.role !== "buyer" && p.role !== "coordinator");

  function activeKey(): string {
    if (value === "coordinator") return "coordinator";
    return `${value.role}|${value.participantId}`;
  }

  return (
    <div className="view-picker" data-testid="view-picker">
      <div className="section-label">2a. Whose seat are you in?</div>
      <p className="muted">
        Coordinator sees orchestration, no private cost structures. Each participant view
        renders only the data that party would have in a real flow.
      </p>
      <div className="view-picker-buttons">
        <button
          className={value === "coordinator" ? "view-button active" : "view-button"}
          onClick={() => onChange("coordinator")}
          data-testid="view-coordinator"
        >
          Coordinator
        </button>
        {buyers.map((participant) => {
          const mode: ViewMode = { role: "buyer", participantId: participant.id };
          const key = `buyer|${participant.id}`;
          return (
            <button
              key={key}
              className={activeKey() === key ? "view-button active" : "view-button"}
              onClick={() => onChange(mode)}
              data-testid={`view-${participant.id}`}
            >
              {participant.name} ({participant.role})
            </button>
          );
        })}
        {otherRoles.map((participant) => {
          const role: "supplier" = "supplier";
          const mode: ViewMode = { role, participantId: participant.id };
          const key = `supplier|${participant.id}`;
          return (
            <button
              key={key}
              className={activeKey() === key ? "view-button active" : "view-button"}
              onClick={() => onChange(mode)}
              data-testid={`view-${participant.id}`}
            >
              {participant.name} ({participant.role})
            </button>
          );
        })}
      </div>
      <p className="muted" data-testid="view-description">{describeView(value)}</p>
    </div>
  );
}
