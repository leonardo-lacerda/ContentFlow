export function HeroSection() {
  return (
    <section className="hero">
      <div className="container hero__grid">
        <div className="hero__copy reveal">
          <span className="eyebrow">De URL para carrossel pronto</span>
          <h1 className="hero__title">
            Cole o site. A IA cria carrosséis com a{" "}
            <em>cara da sua marca</em>.
          </h1>
          <p className="hero__sub">
            ContentFlow extrai o DNA da sua marca — cores, tom, público — e
            gera carrosséis, posts e legendas automaticamente. Pronto em
            minutos.
          </p>
          <div className="hero__cta">
            <a href="/auth" className="btn btn--primary btn--lg">
              Comece com sua URL
            </a>
            <a href="#recursos" className="btn btn--text btn--lg">
              Ver como funciona →
            </a>
          </div>
          <p className="hero__trust">
            Sem cartão de crédito · Primeiros carrosséis grátis
          </p>
        </div>

        <div className="hero__visual reveal">
          <div className="showcase" id="showcase">
            <div
              className="piece piece--cream piece--main"
              id="heroMain"
            >
              <div className="piece__top">
                <span className="piece__mark" />
                <span>SUA MARCA</span>
              </div>
              <h3 className="piece__title" id="heroTitle">
                5 erros que travam o seu crescimento
              </h3>
              <div className="piece__foot">
                <span className="piece__cta">Arraste →</span>
                <span className="piece__dots">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
            <div className="showcase__thumbs" id="heroThumbs">
              <div className="piece piece--ink piece--thumb is-active">
                <span>5 erros que travam o seu crescimento</span>
              </div>
              <div className="piece piece--white piece--thumb">
                <span>O método em 4 passos</span>
              </div>
              <div className="piece piece--sand piece--thumb">
                <span>Antes &amp; depois</span>
              </div>
              <div className="piece piece--cream piece--thumb">
                <span>Salve este post</span>
              </div>
            </div>
          </div>
          <div className="floaty floaty--a">
            <span className="floaty__label">Gerado com IA</span>
            <strong>Carrossel · 6 slides</strong>
          </div>
          <div className="floaty floaty--b">
            <span className="floaty__label">Na sua identidade</span>
            <strong>Cores · fontes · tom</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
