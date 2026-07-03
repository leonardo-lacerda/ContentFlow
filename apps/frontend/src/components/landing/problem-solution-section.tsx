import { PROBLEM_ITEMS, SOLUTION_ITEMS } from "./landing.constants";

export function ProblemSolutionSection() {
  return (
    <section className="problem">
      <div className="container problem__grid">
        <div className="problem__col reveal">
          <span className="eyebrow eyebrow--muted">Sem ContentFlow</span>
          <ul className="cons">
            {PROBLEM_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="problem__col problem__col--good reveal">
          <span className="eyebrow">Com ContentFlow</span>
          <ul className="ticks">
            {SOLUTION_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
