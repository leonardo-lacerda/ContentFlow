import { STEPS } from "./landing.constants";

export function HowItWorksSection() {
  return (
    <section className="steps">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">Como funciona</span>
          <h2>Da URL ao post pronto, em três passos.</h2>
        </div>
        <div className="steps__grid">
          {STEPS.map((step) => (
            <div key={step.number} className="step reveal">
              <span className="step__n">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
