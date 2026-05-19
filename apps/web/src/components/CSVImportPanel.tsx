import { useState } from "react";
import type { ImportResult } from "@lab/engine";
import { CSV_COLUMN_CONVENTION, parseImport } from "@lab/engine";
interface CSVImportPanelProps {
  onSeed: (result: ImportResult) => void;
}

const EXAMPLE_CSV = `supplier_id,buyer_id,product_id,period,quantity,unit_price,capacity,reliability,outside_option,risk_score,source
cinder-01,northstar,substrate-A,2026-Q1,420,118.50,600,0.92,5100,0.45,internal
horizon-02,northstar,substrate-A,2026-Q1,280,124.00,450,0.88,4700,0.55,internal
horizon-02,northstar,substrate-A,2026-Q2,320,121.00,470,0.89,4800,0.55,internal
vela-03,northstar,substrate-B,2026-Q1,180,142.00,260,0.85,3600,0.6,internal`;

export function CSVImportPanel({ onSeed }: CSVImportPanelProps) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleParse() {
    const parsed = parseImport(text);
    setResult(parsed);
    if (parsed.ok) onSeed(parsed);
  }

  function loadExample() {
    setText(EXAMPLE_CSV);
  }

  return (
    <div className="results-card" data-testid="csv-import-panel">
      <h3>7. Import a procurement CSV</h3>
      <p className="muted">
        Paste a procurement CSV in the Open-Contracting-style column convention. Each row
        is one buyer/supplier/product/period commitment. Validation runs in-browser.
      </p>
      <details>
        <summary>Column convention</summary>
        <ul>
          {CSV_COLUMN_CONVENTION.map((column) => (
            <li key={column}><code>{column}</code></li>
          ))}
        </ul>
      </details>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={6}
        placeholder='paste CSV here (header row required)'
        data-testid="csv-textarea"
      />
      <div className="button-row">
        <button className="primary" onClick={handleParse} data-testid="csv-parse-btn">
          Validate + seed scenario
        </button>
        <button className="secondary" onClick={loadExample} data-testid="csv-example-btn">
          Load example
        </button>
      </div>
      {result && result.ok && result.seed && (
        <div className="callout" data-testid="csv-result-success">
          <strong>{result.seed.rows.length} row(s) accepted.</strong> {result.seed.buyerIds.length} buyer(s),
          {" "}{result.seed.supplierIds.length} supplier(s), {result.seed.productIds.length} product(s),
          {" "}{result.seed.periods.length} period(s). Mean unit price ${result.seed.meanUnitPrice.toFixed(2)}.
        </div>
      )}
      {result && !result.ok && result.errors.length > 0 && (
        <div className="callout warn" data-testid="csv-result-errors">
          <strong>{result.errors.length} error(s):</strong>
          <ul>
            {result.errors.slice(0, 6).map((err, idx) => (
              <li key={idx}>line {err.row} · {err.field}: {err.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
