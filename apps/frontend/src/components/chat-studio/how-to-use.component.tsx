'use client';

import { useEffect, type CSSProperties } from 'react';

export type StudioExample = {
  icon: string;
  title: string;
  category: string;
  prompt: string;
  result: string;
};

export const studioExamples: StudioExample[] = [
  {
    icon: '✦',
    title: 'Gerar ideias',
    category: 'Estratégia',
    prompt: 'Me dê 10 ideias de conteúdo para uma consultoria financeira que quer atrair empresários pelo Instagram.',
    result: 'Ângulos de conteúdo, ganchos, objetivo de cada ideia e indicação do próximo formato.',
  },
  {
    icon: '▤',
    title: 'Criar carrossel',
    category: 'Conteúdo',
    prompt: 'Transforme esta ideia em um carrossel de 7 slides, com linguagem simples, CTA e legenda pronta.',
    result: 'Slides organizados, headline, texto, CTA, legenda e hashtags para revisar e salvar.',
  },
  {
    icon: '▶',
    title: 'Planejar vídeo',
    category: 'Vídeo',
    prompt: 'Crie um roteiro UGC de 30 segundos para vender meu curso de inglês no Reels.',
    result: 'Gancho, cenas, falas, visual, ritmo, CTA e plano para gerar o vídeo depois.',
  },
  {
    icon: '□',
    title: 'Criar imagem',
    category: 'Visual',
    prompt: 'Crie uma imagem vertical para divulgar esta oferta, usando uma estética premium e direta.',
    result: 'Brief visual com composição, direção de arte, texto seguro e geração após sua confirmação.',
  },
  {
    icon: '↗',
    title: 'Adaptar conteúdo',
    category: 'Repurpose',
    prompt: 'Pegue este carrossel e adapte para LinkedIn, e-mail e um roteiro curto de vídeo.',
    result: 'Variações nativas para cada canal, preservando a ideia central e o tom da sua marca.',
  },
  {
    icon: '✓',
    title: 'Preparar publicação',
    category: 'Publicação',
    prompt: 'Revise este conteúdo, ajuste para Instagram e deixe pronto para eu aprovar a publicação.',
    result: 'Revisão final, canal, legenda, mídia e checklist. Nada é publicado sem sua confirmação.',
  },
];

type HowToUseProps = {
  open: boolean;
  onClose: () => void;
  onUseExample: (prompt: string) => void;
};

export function HowToUse({ open, onClose, onUseExample }: HowToUseProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="cf-howto" role="presentation">
      <button
        type="button"
        aria-label="Fechar Como usar"
        className="cf-howto__backdrop"
        onClick={onClose}
      />
      <section
        className="cf-howto__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cf-howto-title"
      >
        <div className="cf-howto__glow" aria-hidden="true" />
        <header className="cf-howto__header">
          <div>
            <div className="cf-howto__eyebrow">
              <span className="cf-howto__pulse" aria-hidden="true" />
              ContentFlow Studio
            </div>
            <h2 id="cf-howto-title">Converse. A gente transforma.</h2>
            <p>
              Você não precisa aprender uma ferramenta nova. Diga o que quer
              criar como falaria com uma pessoa e refine junto com o chat.
            </p>
          </div>
          <button
            type="button"
            className="cf-howto__close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <div className="cf-howto__steps" aria-label="Como funciona">
          {[
            ['01', 'Diga o objetivo', 'Conte o que você quer alcançar.'],
            ['02', 'Escolha o formato', 'Peça ideia, carrossel, vídeo ou imagem.'],
            ['03', 'Revise conversando', 'Peça ajustes até ficar com a sua cara.'],
            ['04', 'Confirme para gerar', 'Ações com créditos só acontecem com seu ok.'],
          ].map(([number, title, description]) => (
            <div className="cf-howto__step" key={number}>
              <span>{number}</span>
              <div>
                <strong>{title}</strong>
                <small>{description}</small>
              </div>
            </div>
          ))}
        </div>

        <div className="cf-howto__examples-head">
          <div>
            <span className="cf-howto__eyebrow">Experimente uma ideia</span>
            <h3>Você pede assim. O chat entrega isso.</h3>
          </div>
          <span className="cf-howto__count">{studioExamples.length} exemplos</span>
        </div>

        <div className="cf-howto__examples">
          {studioExamples.map((example, index) => (
            <article
              className="cf-howto__example"
              style={{ '--cf-howto-delay': `${index * 55}ms` } as CSSProperties}
              key={example.title}
            >
              <div className="cf-howto__example-top">
                <span className="cf-howto__icon" aria-hidden="true">
                  {example.icon}
                </span>
                <div>
                  <span>{example.category}</span>
                  <h4>{example.title}</h4>
                </div>
              </div>
              <div className="cf-howto__quote">
                <small>Você pede</small>
                <p>“{example.prompt}”</p>
              </div>
              <div className="cf-howto__result">
                <small>O chat entrega</small>
                <p>{example.result}</p>
              </div>
              <button
                type="button"
                className="cf-howto__use"
                onClick={() => onUseExample(example.prompt)}
              >
                Usar este exemplo <span aria-hidden="true">→</span>
              </button>
            </article>
          ))}
        </div>

        <footer className="cf-howto__footer">
          <span aria-hidden="true">⌘</span>
          Dica: quanto mais contexto você der, mais a resposta fica com a cara da sua marca.
          <button type="button" onClick={onClose}>
            Voltar para o chat
          </button>
        </footer>
      </section>
    </div>
  );
}
