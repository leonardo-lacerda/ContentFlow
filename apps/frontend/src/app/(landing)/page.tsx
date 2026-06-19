'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export default function LandingPage() {
  useEffect(() => {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  }, []);

  return (
    <>
      <Script src="/landing-script.js" strategy="afterInteractive" />

      {/* NAV */}
      <header className="nav" id="nav">
        <div className="container nav__inner">
          <a href="#top" className="brand" aria-label="ContentFlow — início">
            <span className="brand__mark" aria-hidden="true" />
            <span className="brand__name">ContentFlow</span>
          </a>

          <nav className="nav__links" aria-label="Navegação principal">
            <a href="#recursos">Recursos</a>
            <a href="#formatos">Formatos</a>
            <a href="#exemplos">Exemplos</a>
            <a href="#precos">Preços</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="nav__actions">
            <a href="/auth" className="btn btn--ghost">Entrar</a>
            <a href="/auth" className="btn btn--primary">Criar conteúdo grátis</a>
          </div>

          <button
            className="nav__toggle"
            id="navToggle"
            aria-label="Abrir menu"
            aria-expanded="false"
          >
            <span /><span /><span />
          </button>
        </div>

        <div className="nav__mobile" id="navMobile" hidden>
          <a href="#recursos">Recursos</a>
          <a href="#formatos">Formatos</a>
          <a href="#exemplos">Exemplos</a>
          <a href="#precos">Preços</a>
          <a href="#faq">FAQ</a>
          <a href="/auth" className="btn btn--ghost">Entrar</a>
          <a href="/auth" className="btn btn--primary">Criar conteúdo grátis</a>
        </div>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="hero">
          <div className="container hero__grid">
            <div className="hero__copy reveal">
              <span className="eyebrow">Estúdio de conteúdo com IA</span>
              <h1 className="hero__title">
                Gere carrosséis, posts e legendas com a <em>cara da sua marca</em>.
              </h1>
              <p className="hero__sub">
                Configure sua marca uma vez e a inteligência cria conteúdo on-brand
                para todas as redes — pronto em minutos, sem começar do zero.
              </p>
              <div className="hero__cta">
                <a href="/auth" className="btn btn--primary btn--lg">Criar meu primeiro carrossel</a>
                <a href="#recursos" className="btn btn--text btn--lg">Ver como funciona →</a>
              </div>
              <p className="hero__trust">Sem cartão de crédito · Primeiros carrosséis grátis</p>
            </div>

            <div className="hero__visual reveal">
              <div className="showcase" id="showcase">
                <div className="piece piece--cream piece--main" id="heroMain">
                  <div className="piece__top"><span className="piece__mark" /><span>SUA MARCA</span></div>
                  <h3 className="piece__title" id="heroTitle">5 erros que travam o seu crescimento</h3>
                  <div className="piece__foot">
                    <span className="piece__cta">Arraste →</span>
                    <span className="piece__dots"><i /><i /><i /><i /><i /><i /></span>
                  </div>
                </div>
                <div className="showcase__thumbs" id="heroThumbs">
                  <div className="piece piece--ink piece--thumb is-active"><span>5 erros que travam o seu crescimento</span></div>
                  <div className="piece piece--white piece--thumb"><span>O método em 4 passos</span></div>
                  <div className="piece piece--sand piece--thumb"><span>Antes &amp; depois</span></div>
                  <div className="piece piece--cream piece--thumb"><span>Salve este post</span></div>
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

        {/* FAIXA DE FORMATOS */}
        <section className="channels" id="formatos">
          <div className="container">
            <p className="channels__label">Um estúdio, todos os formatos — sob medida para cada rede</p>
            <div className="channels__row">
              <span>Carrosséis</span><span>Posts únicos</span><span>Legendas</span>
              <span>Stories</span><span>Threads</span><span>Capas</span>
              <span>Variações por rede</span>
            </div>
            <p className="channels__note">Conteúdo otimizado para cada rede</p>
            <div className="logos" aria-label="Redes sociais suportadas">
              <span className="logos__item" title="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
                <span>Instagram</span>
              </span>
              <span className="logos__item" title="LinkedIn">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.06 3.77-2.06C20.4 8.64 21 11.1 21 14.06V21h-4v-6.2c0-1.48-.03-3.38-2.06-3.38-2.06 0-2.38 1.6-2.38 3.27V21H9z"/></svg>
                <span>LinkedIn</span>
              </span>
              <span className="logos__item" title="TikTok">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.3 2.2 1.7 3.9 3.8 4.2v2.6c-1.4.05-2.7-.4-3.8-1.2v6.1a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.07v2.7a2.9 2.9 0 1 0 2 2.76V3z"/></svg>
                <span>TikTok</span>
              </span>
              <span className="logos__item" title="YouTube">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.7-1.7C19.4 5.2 12 5.2 12 5.2s-7.4 0-8.9.4A2.5 2.5 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.7 1.7c1.5.4 8.9.4 8.9.4s7.4 0 8.9-.4a2.5 2.5 0 0 0 1.7-1.7C23 15.2 23 12 23 12zM9.8 15.3V8.7l5.7 3.3z"/></svg>
                <span>YouTube</span>
              </span>
              <span className="logos__item" title="X">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.2 2H21l-6.6 7.5L22 22h-6.8l-4.7-6.1L4.9 22H2l7.1-8L2 2h6.9l4.3 5.7zm-2.4 18h1.7L8.3 3.8H6.5z"/></svg>
                <span>X</span>
              </span>
              <span className="logos__item" title="Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.75-1.6 1.5V12h2.7l-.43 2.9h-2.3v7A10 10 0 0 0 22 12z"/></svg>
                <span>Facebook</span>
              </span>
            </div>
          </div>
        </section>

        {/* PROBLEMA → SOLUÇÃO */}
        <section className="problem">
          <div className="container problem__grid">
            <div className="problem__col reveal">
              <span className="eyebrow eyebrow--muted">Sem ContentFlow</span>
              <ul className="cons">
                <li>Horas no Canva e na copy, toda semana</li>
                <li>Conteúdo que foge da identidade da marca</li>
                <li>Bloqueio criativo e falta de ideias</li>
                <li>Cada rede pedindo um formato diferente</li>
              </ul>
            </div>
            <div className="problem__col problem__col--good reveal">
              <span className="eyebrow">Com ContentFlow</span>
              <ul className="ticks">
                <li>Carrosséis prontos em minutos, não em horas</li>
                <li>Identidade da marca aplicada automaticamente</li>
                <li>Ideias e copy geradas a partir do seu tema</li>
                <li>Uma ideia, adaptada para cada formato e rede</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CAPACIDADES */}
        <section className="pillars" id="recursos">
          <div className="container">
            <div className="section-head reveal">
              <span className="eyebrow">O que você cria</span>
              <h2>Conteúdo completo, do conceito à arte.</h2>
              <p>Um estúdio para produzir tudo que sua marca publica — sem sair do lugar.</p>
            </div>

            <div className="pillars__grid">
              <article className="card reveal">
                <span className="card__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="13" height="16" rx="2" /><rect x="18" y="6" width="3" height="12" rx="1.5" />
                  </svg>
                </span>
                <h3>Carrosséis</h3>
                <p>Slides com copy dentro da imagem, sequência editorial e identidade aplicada.</p>
              </article>

              <article className="card reveal">
                <span className="card__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 15l5-5 4 4 3-3 6 6" /><circle cx="8.5" cy="8.5" r="1.5" />
                  </svg>
                </span>
                <h3>Posts únicos</h3>
                <p>Imagens de impacto para o feed, prontas para qualquer campanha.</p>
              </article>

              <article className="card reveal">
                <span className="card__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 6h16M4 11h16M4 16h10" />
                  </svg>
                </span>
                <h3>Legendas</h3>
                <p>Texto que combina com o carrossel e com o tom da sua marca, em segundos.</p>
              </article>

              <article className="card reveal">
                <span className="card__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="5" width="8" height="14" rx="1.5" /><rect x="14" y="5" width="7" height="9" rx="1.5" />
                  </svg>
                </span>
                <h3>Variações por rede</h3>
                <p>A mesma ideia adaptada ao formato ideal de cada plataforma.</p>
              </article>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section className="steps">
          <div className="container">
            <div className="section-head reveal">
              <span className="eyebrow">Como funciona</span>
              <h2>Da marca à arte pronta, em três passos.</h2>
            </div>
            <div className="steps__grid">
              <div className="step reveal">
                <span className="step__n">1</span>
                <h3>Configure sua marca</h3>
                <p>Cores, fontes e tom de voz. Você faz isso uma vez e vale para tudo.</p>
              </div>
              <div className="step reveal">
                <span className="step__n">2</span>
                <h3>Descreva o tema e o formato</h3>
                <p>Briefing por seleção: escolha o assunto, o objetivo e o formato.</p>
              </div>
              <div className="step reveal">
                <span className="step__n">3</span>
                <h3>A IA gera o carrossel pronto</h3>
                <p>Copy e visual na sua identidade, prontos para editar, baixar e postar.</p>
              </div>
            </div>
          </div>
        </section>

        {/* DEEP DIVES */}
        <section className="feature">
          <div className="container feature__grid">
            <div className="feature__copy reveal">
              <span className="eyebrow">Estúdio de Carrosséis</span>
              <h2>Carrosséis editoriais, sem esforço de design.</h2>
              <p>Descreva o tema e o estúdio monta a sequência: gancho, desenvolvimento e fechamento — com a copy dentro da imagem e a cara da sua marca.</p>
              <ul className="ticks">
                <li>Briefing guiado, quase tudo por seleção</li>
                <li>Copy de cada slide gerada com IA</li>
                <li>Edite qualquer texto antes de exportar</li>
              </ul>
            </div>
            <div className="feature__visual reveal">
              <div className="frame">
                <div className="frame__bar"><span className="dot" /><span className="dot" /><span className="dot" /><span className="frame__title">Estúdio</span></div>
                <div className="studio">
                  <div className="studio__brief">
                    <span className="chip chip--on">Tema: produtividade</span>
                    <span className="chip">Carrossel</span>
                    <span className="chip">Tom: direto</span>
                  </div>
                  <div className="studio__slides">
                    <div className="piece piece--cream piece--mini"><span>Pare de fazer isso</span></div>
                    <div className="piece piece--ink piece--mini"><span>Faça assim</span></div>
                    <div className="piece piece--white piece--mini"><span>O resultado</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="container feature__grid feature__grid--reverse">
            <div className="feature__copy reveal">
              <span className="eyebrow">Posts e legendas</span>
              <h2>Não é só carrossel — é todo o seu feed.</h2>
              <p>Gere posts de imagem única e a legenda combinando, no mesmo tom. Tudo coerente, do visual ao texto.</p>
              <ul className="ticks">
                <li>Imagem e legenda no mesmo tom</li>
                <li>Sugestões de hook e CTA</li>
                <li>Pronto para copiar e publicar</li>
              </ul>
            </div>
            <div className="feature__visual reveal">
              <div className="frame">
                <div className="frame__bar"><span className="dot" /><span className="dot" /><span className="dot" /><span className="frame__title">Post + legenda</span></div>
                <div className="postmock">
                  <div className="piece piece--sand piece--post">
                    <div className="piece__top"><span className="piece__mark" /><span>SUA MARCA</span></div>
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
          </div>

          <div className="container feature__grid">
            <div className="feature__copy reveal">
              <span className="eyebrow">Empresas cadastradas</span>
              <h2>Cadastre sua marca uma vez. Use em tudo.</h2>
              <p>Cadastre a empresa com cores, fontes e tom de voz. A inteligência aplica esse contexto em cada carrossel — e você pode cadastrar quantas marcas quiser.</p>
              <ul className="ticks">
                <li>Cores e tipografia da marca em todo carrossel</li>
                <li>Tom de voz aprendido a partir da sua marca</li>
                <li>Cadastre várias empresas e alterne entre elas</li>
              </ul>
            </div>
            <div className="feature__visual reveal">
              <div className="frame">
                <div className="frame__bar"><span className="dot" /><span className="dot" /><span className="dot" /><span className="frame__title">Empresa</span></div>
                <div className="brandkit">
                  <div className="brandkit__row">
                    <span className="brandkit__k">Cores</span>
                    <span className="swatches"><i /><i /><i /><i /></span>
                  </div>
                  <div className="brandkit__row">
                    <span className="brandkit__k">Fontes</span>
                    <span className="brandkit__fonts"><em>Fraunces</em> · Inter</span>
                  </div>
                  <div className="brandkit__row">
                    <span className="brandkit__k">Tom</span>
                    <span className="chip chip--on">Editorial e direto</span>
                  </div>
                  <div className="brandkit__apply">
                    <div className="piece piece--cream piece--mini"><span>Aplicado</span></div>
                    <div className="piece piece--ink piece--mini"><span>Na sua marca</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* GALERIA */}
        <section className="gallery" id="exemplos">
          <div className="container">
            <div className="section-head reveal">
              <span className="eyebrow">Exemplos</span>
              <h2>Carrosséis que parecem feitos por um estúdio.</h2>
              <p>Estilos variados, sempre dentro da identidade da marca.</p>
            </div>
            <div className="gallery__grid">
              <div className="piece piece--photo piece--card reveal">
                <img src="https://picsum.photos/seed/contentflow-a/640/800" alt="Exemplo de carrossel" loading="lazy" />
                <div className="piece__overlay">
                  <div className="piece__top"><span className="piece__mark" /><span>MARCA A</span></div>
                  <h3 className="piece__title">3 ideias para esta semana</h3>
                  <span className="piece__cta">Salve →</span>
                </div>
              </div>
              <div className="piece piece--ink piece--card reveal">
                <div className="piece__top"><span className="piece__mark" /><span>MARCA B</span></div>
                <h3 className="piece__title">Como dobrar seu alcance</h3>
                <span className="piece__cta">Veja como →</span>
              </div>
              <div className="piece piece--photo piece--card reveal">
                <img src="https://picsum.photos/seed/contentflow-c/640/800" alt="Exemplo de post" loading="lazy" />
                <div className="piece__overlay">
                  <div className="piece__top"><span className="piece__mark" /><span>MARCA C</span></div>
                  <h3 className="piece__title">Mitos &amp; verdades</h3>
                  <span className="piece__cta">Descubra →</span>
                </div>
              </div>
              <div className="piece piece--sand piece--card reveal">
                <div className="piece__top"><span className="piece__mark" /><span>MARCA D</span></div>
                <h3 className="piece__title">O método em 4 passos</h3>
                <span className="piece__cta">Comece →</span>
              </div>
              <div className="piece piece--photo piece--card reveal">
                <img src="https://picsum.photos/seed/contentflow-e/640/800" alt="Exemplo de carrossel" loading="lazy" />
                <div className="piece__overlay">
                  <div className="piece__top"><span className="piece__mark" /><span>MARCA E</span></div>
                  <h3 className="piece__title">Antes &amp; depois</h3>
                  <span className="piece__cta">Compare →</span>
                </div>
              </div>
              <div className="piece piece--cream piece--card reveal">
                <div className="piece__top"><span className="piece__mark" /><span>MARCA F</span></div>
                <h3 className="piece__title">Guia rápido para iniciantes</h3>
                <span className="piece__cta">Aprenda →</span>
              </div>
            </div>
          </div>
        </section>

        {/* PROVA SOCIAL */}
        <section className="proof">
          <div className="container">
            <div className="proof__metrics reveal">
              <div><strong data-count="10" data-suffix="h+">0</strong><span>economizadas por semana</span></div>
              <div><strong data-count="3" data-suffix="x">0</strong><span>mais rápido para criar</span></div>
              <div><strong data-count="100" data-suffix="%">0</strong><span>na identidade da marca</span></div>
              <div><strong data-count="12" data-suffix="+">0</strong><span>formatos de conteúdo</span></div>
            </div>

            <div className="proof__quotes">
              <blockquote className="quote reveal">
                <p>"Em vez de uma tarde no Canva, faço um carrossel em minutos — e na nossa identidade."</p>
                <footer><img className="avatar" src="https://i.pravatar.cc/80?img=47" alt="" loading="lazy" /><span><strong>Marina A.</strong> · Social Media</span></footer>
              </blockquote>
              <blockquote className="quote reveal">
                <p>"A consistência da marca foi o que mais mudou. Tudo sai com a mesma cara."</p>
                <footer><img className="avatar" src="https://i.pravatar.cc/80?img=12" alt="" loading="lazy" /><span><strong>Rafael T.</strong> · Criador de conteúdo</span></footer>
              </blockquote>
              <blockquote className="quote reveal">
                <p>"Atendo mais clientes na agência porque a produção de conteúdo deixou de ser gargalo."</p>
                <footer><img className="avatar" src="https://i.pravatar.cc/80?img=32" alt="" loading="lazy" /><span><strong>Camila S.</strong> · Agência</span></footer>
              </blockquote>
            </div>
          </div>
        </section>

        {/* PREÇOS */}
        <section className="pricing" id="precos">
          <div className="container">
            <div className="section-head reveal">
              <span className="eyebrow">Preços</span>
              <h2>Comece grátis. Produza sem limites.</h2>
              <p>Planos simples que crescem com a sua produção de conteúdo.</p>
            </div>

            <div className="pricing__grid">
              <article className="plan reveal">
                <h3 className="plan__name">Início</h3>
                <p className="plan__price"><strong>R$ 0</strong><span>/mês</span></p>
                <p className="plan__desc">Para experimentar o estúdio e criar seus primeiros carrosséis.</p>
                <ul className="ticks">
                  <li>1 empresa cadastrada</li>
                  <li>10 carrosséis por mês (até 10 imagens cada)</li>
                  <li>Edição de copy e visual</li>
                </ul>
                <a href="/auth" className="btn btn--ghost btn--block">Criar grátis</a>
              </article>

              <article className="plan plan--featured reveal">
                <span className="plan__tag">Mais popular</span>
                <h3 className="plan__name">Profissional</h3>
                <p className="plan__price"><strong>R$ 79</strong><span>/mês</span></p>
                <p className="plan__desc">Para quem publica todos os dias e quer escala.</p>
                <ul className="ticks">
                  <li>Carrosséis ilimitados (até 10 imagens)</li>
                  <li>5 empresas cadastradas</li>
                  <li>Todos os formatos e variações por rede</li>
                  <li>Export em alta qualidade</li>
                </ul>
                <a href="/auth" className="btn btn--primary btn--block">Assinar Profissional</a>
              </article>

              <article className="plan reveal">
                <h3 className="plan__name">Estúdio</h3>
                <p className="plan__price"><strong>R$ 199</strong><span>/mês</span></p>
                <p className="plan__desc">Para agências e equipes com várias marcas.</p>
                <ul className="ticks">
                  <li>Tudo do Profissional</li>
                  <li>Empresas cadastradas ilimitadas</li>
                  <li>Membros da equipe</li>
                  <li>Biblioteca de mídia compartilhada</li>
                </ul>
                <a href="/auth" className="btn btn--ghost btn--block">Falar com vendas</a>
              </article>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="faq" id="faq">
          <div className="container faq__inner">
            <div className="section-head section-head--left reveal">
              <span className="eyebrow">Dúvidas</span>
              <h2>Perguntas frequentes.</h2>
            </div>

            <div className="faq__list">
              <details className="faq__item">
                <summary>Que tipos de conteúdo posso gerar?</summary>
                <p>Carrosséis, posts de imagem única, legendas e variações da mesma ideia para diferentes formatos e redes.</p>
              </details>
              <details className="faq__item">
                <summary>Como vocês mantêm a identidade da minha marca?</summary>
                <p>Você cadastra sua empresa com cores, fontes e tom de voz. A IA usa esse contexto em todos os carrosséis, mantendo tudo consistente — e você pode cadastrar várias empresas.</p>
              </details>
              <details className="faq__item">
                <summary>Posso editar o resultado?</summary>
                <p>Sim. Toda copy e cada elemento podem ser ajustados antes de exportar — a IA dá o ponto de partida, você tem o controle final.</p>
              </details>
              <details className="faq__item">
                <summary>As imagens geradas são minhas?</summary>
                <p>Sim. Os carrosséis que você cria são seus para usar como quiser nas suas redes e campanhas.</p>
              </details>
              <details className="faq__item">
                <summary>Preciso saber design?</summary>
                <p>Não. O briefing é por seleção e o estúdio cuida da composição. Você foca na mensagem, não nas ferramentas.</p>
              </details>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="cta-final">
          <div className="container cta-final__box reveal">
            <h2>Sua próxima semana de conteúdo, pronta hoje.</h2>
            <p>Crie carrosséis, posts e legendas com a cara da sua marca — comece de graça.</p>
            <a href="/auth" className="btn btn--primary btn--lg">Criar conteúdo grátis</a>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container footer__grid">
          <div className="footer__brand">
            <a href="#top" className="brand">
              <span className="brand__mark" aria-hidden="true" />
              <span className="brand__name">ContentFlow</span>
            </a>
            <p>O estúdio de conteúdo com IA para criar carrosséis, posts e legendas on-brand.</p>
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
          <span>© <span id="year" /> ContentFlow. Todos os direitos reservados.</span>
          <div className="footer__social">
            <a href="#" aria-label="Instagram">Instagram</a>
            <a href="#" aria-label="LinkedIn">LinkedIn</a>
            <a href="#" aria-label="X">X</a>
          </div>
        </div>
      </footer>
    </>
  );
}
