import { COMPARISON_ROWS } from "./landing.constants";

const COMPARISON_COLUMNS = [
  { key: "canva", name: "Canva" },
  { key: "chatgpt", name: "ChatGPT" },
  { key: "scheduling", name: "Ferramentas de Scheduling" },
] as const;

function StatusIcon({ value }: { value: boolean | "partial" }) {
  if (value === true) return <span>✅</span>;
  if (value === "partial") return <span>⚠️</span>;
  return <span style={{ opacity: 0.4 }}>❌</span>;
}

export function ComparisonSection() {
  return (
    <section className="pricing" id="comparacao">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">Comparação</span>
          <h2>Por que ContentFlow e não as alternativas?</h2>
          <p>
            Veja como o fluxo completo se compara com ferramentas genéricas.
          </p>
        </div>

        <div
          className="pricing__grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
        >
          {COMPARISON_COLUMNS.map((col) => (
            <article key={col.key} className="plan reveal">
              <h3 className="plan__name">{col.name}</h3>
              <ul className="ticks">
                {COMPARISON_ROWS.map((row) => (
                  <li key={row.feature}>
                    <StatusIcon value={row[col.key]} /> {row.feature}
                  </li>
                ))}
              </ul>
            </article>
          ))}

          <article className="plan plan--featured reveal">
            <span className="plan__tag">Completo</span>
            <h3 className="plan__name">ContentFlow</h3>
            <ul className="ticks">
              {COMPARISON_ROWS.map((row) => (
                <li key={row.feature}>
                  <StatusIcon value={row.contentflow} /> {row.feature}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
