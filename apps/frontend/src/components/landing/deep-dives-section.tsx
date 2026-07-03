import { DEEP_DIVES } from "./landing.constants";

function CarouselStudioVisual() {
  return (
    <div className="feature__visual reveal">
      <div className="frame">
        <div className="frame__bar">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
          <span className="frame__title">Estúdio</span>
        </div>
        <div className="studio">
          <div className="studio__brief">
            <span className="chip chip--on">Tema: produtividade</span>
            <span className="chip">Carrossel</span>
            <span className="chip">Tom: direto</span>
          </div>
          <div className="studio__slides">
            <div className="piece piece--cream piece--mini">
              <span>Pare de fazer isso</span>
            </div>
            <div className="piece piece--ink piece--mini">
              <span>Faça assim</span>
            </div>
            <div className="piece piece--white piece--mini">
              <span>O resultado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostCaptionVisual() {
  return (
    <div className="feature__visual reveal">
      <div className="frame">
        <div className="frame__bar">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
          <span className="frame__title">Post + legenda</span>
        </div>
        <div className="postmock">
          <div className="piece piece--sand piece--post">
            <div className="piece__top">
              <span className="piece__mark" />
              <span>SUA MARCA</span>
            </div>
            <h3 className="piece__title">O guia rápido de copy</h3>
          </div>
          <div className="postmock__caption">
            <span className="bar bar--lg" />
            <span className="bar bar--md" />
            <span className="bar bar--lg" />
            <span className="bar bar--sm" />
            <span className="caption__tags">#marketing #copywriting</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandKitVisual() {
  return (
    <div className="feature__visual reveal">
      <div className="frame">
        <div className="frame__bar">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
          <span className="frame__title">Empresa</span>
        </div>
        <div className="brandkit">
          <div className="brandkit__row">
            <span className="brandkit__k">Cores</span>
            <span className="swatches">
              <i />
              <i />
              <i />
              <i />
            </span>
          </div>
          <div className="brandkit__row">
            <span className="brandkit__k">Fontes</span>
            <span className="brandkit__fonts">
              <em>Fraunces</em> · Inter
            </span>
          </div>
          <div className="brandkit__row">
            <span className="brandkit__k">Tom</span>
            <span className="chip chip--on">Editorial e direto</span>
          </div>
          <div className="brandkit__apply">
            <div className="piece piece--cream piece--mini">
              <span>Aplicado</span>
            </div>
            <div className="piece piece--ink piece--mini">
              <span>Na sua marca</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const VISUALS = [CarouselStudioVisual, PostCaptionVisual, BrandKitVisual];

export function DeepDivesSection() {
  return (
    <section className="feature">
      {DEEP_DIVES.map((dive, index) => {
        const Visual = VISUALS[index];
        return (
          <div
            key={dive.eyebrow}
            className={`container feature__grid${dive.reverse ? " feature__grid--reverse" : ""}`}
          >
            <div className="feature__copy reveal">
              <span className="eyebrow">{dive.eyebrow}</span>
              <h2>{dive.title}</h2>
              <p>{dive.description}</p>
              <ul className="ticks">
                {dive.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
            <Visual />
          </div>
        );
      })}
    </section>
  );
}
