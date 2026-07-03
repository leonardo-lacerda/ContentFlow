import { FEATURES } from "./landing.constants";

export function FeaturesSection() {
  return (
    <section className="pillars" id="recursos">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">O que você cria</span>
          <h2>Conteúdo completo, do conceito à arte.</h2>
          <p>
            Um estúdio para produzir tudo que sua marca publica — sem sair do
            lugar.
          </p>
        </div>

        <div className="pillars__grid">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="card reveal">
              <span className="card__icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  dangerouslySetInnerHTML={{ __html: feature.iconPath }}
                />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
