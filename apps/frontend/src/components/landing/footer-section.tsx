export function FooterSection() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <a href="#top" className="brand">
            <span className="brand__mark" aria-hidden="true" />
            <span className="brand__name">ContentFlow</span>
          </a>
          <p>
            O estúdio de conteúdo com IA para criar carrosséis, posts e legendas
            on-brand.
          </p>
        </div>
        <div className="footer__col">
          <h4>Produto</h4>
          <a href="#recursos">Recursos</a>
          <a href="#formatos">Formatos</a>
          <a href="#exemplos">Exemplos</a>
          <a href="#precos">Preços</a>
        </div>
        <div className="footer__col">
          <h4>Empresa</h4>
          <a href="#">Sobre</a>
          <a href="#">Contato</a>
          <a href="#">Blog</a>
        </div>
        <div className="footer__col">
          <h4>Legal</h4>
          <a href="#">Termos</a>
          <a href="#">Privacidade</a>
        </div>
      </div>
      <div className="container footer__base">
        <span>© 2026 ContentFlow. Todos os direitos reservados.</span>
        <div className="footer__social">
          <a href="#" aria-label="Instagram">
            Instagram
          </a>
          <a href="#" aria-label="LinkedIn">
            LinkedIn
          </a>
          <a href="#" aria-label="X">
            X
          </a>
        </div>
      </div>
    </footer>
  );
}
