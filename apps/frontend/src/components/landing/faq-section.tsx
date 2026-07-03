import { FAQ_ITEMS } from "./landing.constants";

export function FAQSection() {
  return (
    <section className="faq" id="faq">
      <div className="container faq__inner">
        <div className="section-head section-head--left reveal">
          <span className="eyebrow">Dúvidas</span>
          <h2>Perguntas frequentes.</h2>
        </div>

        <div className="faq__list">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className="faq__item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
