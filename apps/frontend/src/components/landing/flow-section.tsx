import { FLOW_STEPS } from "./landing.constants";

export function FlowSection() {
  return (
    <section className="steps">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">Fluxo completo</span>
          <h2>URL → DNA → Ideias → Carrossel → Calendário</h2>
          <p>
            Do site da sua marca ao agendamento no calendário, tudo em um só
            lugar.
          </p>
        </div>
        <div
          className="steps__grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
        >
          {FLOW_STEPS.map((step) => (
            <div key={step.title} className="step reveal">
              <span className="step__n">{step.emoji}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
