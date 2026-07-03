import { GALLERY_ITEMS } from "./landing.constants";

export function GallerySection() {
  return (
    <section className="gallery" id="exemplos">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">Exemplos</span>
          <h2>Carrosséis que parecem feitos por um estúdio.</h2>
          <p>Estilos variados, sempre dentro da identidade da marca.</p>
        </div>
        <div className="gallery__grid">
          {GALLERY_ITEMS.map((item) => {
            const isPhoto = item.variant === "photo";
            return (
              <div
                key={item.brand}
                className={`piece piece--${item.variant} piece--card reveal`}
              >
                {isPhoto && item.image && (
                  <img
                    src={item.image}
                    alt={`Exemplo de ${item.title.replace(/&amp;/g, "&")}`}
                    loading="lazy"
                  />
                )}
                {isPhoto ? (
                  <div className="piece__overlay">
                    <div className="piece__top">
                      <span className="piece__mark" />
                      <span>{item.brand}</span>
                    </div>
                    <h3
                      className="piece__title"
                      dangerouslySetInnerHTML={{ __html: item.title }}
                    />
                    <span className="piece__cta">{item.cta}</span>
                  </div>
                ) : (
                  <>
                    <div className="piece__top">
                      <span className="piece__mark" />
                      <span>{item.brand}</span>
                    </div>
                    <h3
                      className="piece__title"
                      dangerouslySetInnerHTML={{ __html: item.title }}
                    />
                    <span className="piece__cta">{item.cta}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
