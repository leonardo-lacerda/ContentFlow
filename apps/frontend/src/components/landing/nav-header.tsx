import { NAV_LINKS } from "./landing.constants";

export function NavHeader() {
  return (
    <header className="nav" id="nav">
      <div className="container nav__inner">
        <a href="#top" className="brand" aria-label="ContentFlow — início">
          <span className="brand__mark" aria-hidden="true" />
          <span className="brand__name">ContentFlow</span>
        </a>

        <nav className="nav__links" aria-label="Navegação principal">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="nav__actions">
          <a href="/auth/login" className="btn btn--ghost">
            Entrar
          </a>
          <a href="/auth" className="btn btn--primary">
            Criar conteúdo grátis
          </a>
        </div>

        <button
          className="nav__toggle"
          id="navToggle"
          aria-label="Abrir menu"
          aria-expanded="false"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className="nav__mobile" id="navMobile" hidden>
        {NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
        <a href="/auth/login" className="btn btn--ghost">
          Entrar
        </a>
        <a href="/auth" className="btn btn--primary">
          Criar conteúdo grátis
        </a>
      </div>
    </header>
  );
}
