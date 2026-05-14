import type { ViewState } from "../model/views";

interface ParticipantRosterProps {
  view: ViewState;
}

function money(value: number | undefined): string {
  if (value === undefined) return "—";
  const abs = Math.abs(Math.round(value));
  const formatted = `$${abs.toLocaleString()}`;
  return value < 0 ? `-${formatted}` : formatted;
}

export function ParticipantRoster({ view }: ParticipantRosterProps) {
  return (
    <div className="participant-roster" data-testid="participant-roster">
      <h4>Participants ({view.participants.length})</h4>
      <ul className="participant-list">
        {view.participants.map((participant) => (
          <li
            key={participant.id}
            className={participant.isSelf ? "participant-row self" : "participant-row"}
            data-testid={`participant-${participant.id}`}
          >
            <div>
              <strong>{participant.name}</strong>
              <span className="muted"> · {participant.role}</span>
              {participant.isSelf && <span className="self-tag">you</span>}
            </div>
            <div className="participant-stats">
              <span>reliability: {participant.reliability !== undefined ? participant.reliability.toFixed(2) : "private"}</span>
              <span>outside: {money(participant.outsideOption)}</span>
              <span>capacity: {participant.capacity !== undefined ? participant.capacity : "private"}</span>
            </div>
            {participant.privateFieldsRedacted.length > 0 && (
              <p
                className="muted private-tag"
                data-testid={`redacted-${participant.id}`}
              >
                supplier private — {participant.privateFieldsRedacted.length} field(s) hidden
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
