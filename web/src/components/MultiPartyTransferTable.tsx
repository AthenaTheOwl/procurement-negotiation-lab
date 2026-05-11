import type { MultiPartyTransferRow } from "../model/shapleyTransfer";

function money(value: number): string {
  const abs = Math.abs(Math.round(value));
  const formatted = `$${abs.toLocaleString()}`;
  return value < 0 ? `-${formatted}` : formatted;
}

interface MultiPartyTransferTableProps {
  rows: MultiPartyTransferRow[];
  splitRule: string;
}

export function MultiPartyTransferTable({ rows, splitRule }: MultiPartyTransferTableProps) {
  return (
    <div className="table-wrap" data-testid="multi-party-ledger">
      <p className="muted">Split rule: <code>{splitRule}</code></p>
      <table>
        <thead>
          <tr>
            <th>Participant</th>
            <th>Role</th>
            <th>Share</th>
            <th>Before</th>
            <th>Outside</th>
            <th>Transfer</th>
            <th>After</th>
            <th>OK?</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.participantId} data-testid={`mp-row-${row.participantId}`}>
              <td>{row.party}</td>
              <td>{row.role}</td>
              <td>{Math.round(row.share * 100)}%</td>
              <td>{money(row.utilityBeforeTransfer)}</td>
              <td>{money(row.outsideOption)}</td>
              <td>{money(row.transfer)}</td>
              <td>{money(row.utilityAfterTransfer)}</td>
              <td>{row.noWorseOff ? "yes" : "no"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
