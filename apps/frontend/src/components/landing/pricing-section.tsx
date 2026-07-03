import { PRICING_PLANS } from "./landing.constants";

export function PricingSection() {
  return (
    <section className="pricing" id="precos">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">Preços</span>
          <h2>Comece grátis. Produza sem limites.</h2>
          <p>Planos simples que crescem com a sua produção de conteúdo.</p>
        </div>

        <div className="pricing__grid">
          {PRICING_PLANS.map((plan) => (
            <article
              key={plan.name}
              className={`plan${plan.featured ? " plan--featured" : ""} reveal`}
            >
              {plan.tag && <span className="plan__tag">{plan.tag}</span>}
              <h3 className="plan__name">{plan.name}</h3>
              <p className="plan__price">
                <strong>{plan.price}</strong>
                <span>{plan.period}</span>
              </p>
              <p className="plan__desc">{plan.description}</p>
              <ul className="ticks">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <a
                href={plan.cta.href}
                className={`btn btn--${plan.cta.variant} btn--block`}
              >
                {plan.cta.label}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
