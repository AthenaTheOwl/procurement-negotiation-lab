import { labTakeaway, makeScenario } from "@lab/engine";
const BERGEMANN_ARTICLE_URL =
  "https://www.linkedin.com/pulse/how-mechanism-design-theory-helps-optimize-amazon-vendor-9igre/";

interface HeroProps {
  onStartArc: () => void;
  onOpenLab: () => void;
  onOpenPlay: () => void;
}

function money(value: number): string {
  const abs = Math.abs(value);
  const formatted = `$${Math.round(abs).toLocaleString()}`;
  return value < 0 ? `-${formatted}` : formatted;
}

export function Hero({ onStartArc, onOpenLab, onOpenPlay }: HeroProps) {
  const defaultScenario = makeScenario();
  const takeaway = labTakeaway(defaultScenario);
  const gap = money(takeaway.coordinationGap);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <div className="eyebrow">mechanism design for procurement coordination</div>
        <h1 id="hero-title">Local planning leaves {gap} on the table.</h1>
        <p>
          A buyer and vendor each see only part of the supply-chain problem. This
          lab shows how CPP/ADMM coordination, VCG-style incentives, and CBT
          transfers can recover joint value without forcing either side to
          disclose its full cost structure.
        </p>
        <div className="hero-source">
          Based on Dirk Bergemann's mechanism-design thesis for vendor
          collaboration.{" "}
          <a href={BERGEMANN_ARTICLE_URL} target="_blank" rel="noreferrer">
            Read the source article
          </a>
        </div>
        <div className="hero-actions" data-testid="hero-actions">
          <button className="primary" onClick={onStartArc}>
            Walk the arc
          </button>
          <button className="secondary" onClick={onOpenLab}>
            Open lab
          </button>
          <button className="secondary" onClick={onOpenPlay}>
            Play case
          </button>
        </div>
      </div>

      <aside className="hero-proof" aria-label="Default scenario proof point">
        <span>Default scenario</span>
        <strong>{gap}</strong>
        <p>Coordination gap between JIT local planning and the centralized oracle.</p>
      </aside>
    </section>
  );
}

export { BERGEMANN_ARTICLE_URL };
