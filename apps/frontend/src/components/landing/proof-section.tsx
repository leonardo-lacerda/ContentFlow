import { SOCIAL_PROOF_METRICS, TESTIMONIALS } from "./landing.constants";

export function ProofSection() {
  return (
    <section className="proof">
      <div className="container">
        <div className="proof__metrics reveal">
          {SOCIAL_PROOF_METRICS.map((metric) => (
            <div key={metric.label}>
              <strong
                data-count={metric.count}
                data-suffix={metric.suffix}
              >
                0
              </strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>

        <div className="proof__quotes">
          {TESTIMONIALS.map((testimonial) => (
            <blockquote key={testimonial.name} className="quote reveal">
              <p>{testimonial.quote}</p>
              <footer>
                <img
                  className="avatar"
                  src={testimonial.avatar}
                  alt=""
                  loading="lazy"
                />
                <span>
                  <strong>{testimonial.name}</strong> · {testimonial.role}
                </span>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
