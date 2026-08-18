import { describe, expect, it } from 'vitest';
import {
  extractPresentedArtifact,
  extractProseCarouselArtifact,
  extractProseIdeasArtifact,
  extractStructuredPresentedArtifact,
  extractTransportArtifact,
  parseBalancedJsonAt,
  stripTransportEnvelope,
} from './fallback-artifact-parser';

describe('parseBalancedJsonAt', () => {
  it('parses a balanced JSON object starting at the given index', () => {
    const content = 'prefix {"a":1,"b":{"c":2}} suffix';
    const result = parseBalancedJsonAt(content, content.indexOf('{'));
    expect(result?.value).toEqual({ a: 1, b: { c: 2 } });
  });

  it('handles braces inside string values without miscounting depth', () => {
    const content = '{"note":"a { b } c"}';
    const result = parseBalancedJsonAt(content, 0);
    expect(result?.value).toEqual({ note: 'a { b } c' });
  });

  it('returns null for unbalanced/invalid JSON', () => {
    expect(parseBalancedJsonAt('{"a":1,', 0)).toBeNull();
  });
});

describe('extractProseIdeasArtifact — sequence strategy (angulo: anchored)', () => {
  const content = [
    'Aqui estão 2 ideias para você:',
    '',
    'Bastidores da Produção',
    'Plataforma: Instagram',
    'Formato: Reels',
    'Gancho: Mostre como o produto é feito',
    'Angulo: Humanização da marca',
    'Objetivo: Engajamento',
    'CTA: Comente BASTIDORES',
    '',
    'Segredos do Setor',
    'Plataforma: LinkedIn',
    'Formato: Carrossel',
    'Gancho: Revele um segredo do mercado',
    'Angulo: Autoridade e confiança',
    'Objetivo: Geração de leads',
    'CTA: Salve este post',
  ].join('\n');

  it('recovers every idea anchored on an "angulo:" label', () => {
    const artifact = extractProseIdeasArtifact(content);
    expect(artifact).not.toBeNull();
    expect(artifact?.renderFromText).toBe(true);
    expect(artifact?.parsed.operation).toBe('ideas');
    expect(artifact?.parsed.ideas).toHaveLength(2);
    expect(artifact?.parsed.ideas.map((idea) => idea.title)).toEqual([
      'Bastidores da Produção',
      'Segredos do Setor',
    ]);
    expect(artifact?.parsed.ideas[0].platform).toBe('Instagram');
    expect(artifact?.parsed.ideas[1].platform).toBe('LinkedIn');
    expect(artifact?.parsed.ideas[1].hook).toBe('Revele um segredo do mercado');
  });

  it('is the loosest strategy: only a title is required, unlike the other two', () => {
    const minimal = 'Uma Ideia Solta\nAngulo: só isso mesmo';
    const artifact = extractProseIdeasArtifact(minimal);
    expect(artifact?.parsed.ideas).toHaveLength(1);
    expect(artifact?.parsed.ideas[0].title).toBe('Uma Ideia Solta');
    // Missing fields fall back to sensible defaults rather than dropping the idea.
    expect(artifact?.parsed.ideas[0].format).toBeTruthy();
    expect(artifact?.parsed.ideas[0].suggestedCta).toBeTruthy();
  });

  it('does not match prose without the "angulo:" label at all', () => {
    expect(extractProseIdeasArtifact('Isso é só uma resposta normal do assistente.')).toBeNull();
  });
});

describe('extractProseIdeasArtifact — title strategy (standalone **Title** line)', () => {
  // A single idea, so the sequence strategy's own title-scan finds nothing
  // usable before its "Angulo:" anchor (the only preceding line is the bold
  // title, and bold markers leave a residual leading "*" after cleanup that
  // the candidate filter excludes) and yields null, letting the title
  // strategy run. See the "known quirk" test below for what happens instead
  // once a second idea is added.
  const content = [
    '**Bastidores do Processo** (Instagram)',
    'Formato: Reels',
    'Gancho: Mostre como o trabalho acontece.',
    'Angulo: Humanização e confiança.',
    'Objetivo: Engajamento e autoridade',
    'CTA: Comente BASTIDORES.',
  ].join('\n');

  it('recovers the idea anchored on a standalone bold title line, with optional (Platform)', () => {
    const artifact = extractProseIdeasArtifact(content);
    expect(artifact?.parsed.ideas).toHaveLength(1);
    expect(artifact?.parsed.ideas[0].title).toBe('Bastidores do Processo');
    expect(artifact?.parsed.ideas[0].platform).toBe('Instagram');
    expect(artifact?.parsed.ideas[0].hook).toBe('Mostre como o trabalho acontece.');
  });

  it('defaults platform when the title line has no (Platform) suffix', () => {
    const noPlatform = content.replace(' (Instagram)', '');
    expect(extractProseIdeasArtifact(noPlatform)?.parsed.ideas[0].platform).toBe('Instagram');
  });

  it('requires format, hook, angle and CTA all present — a bare title line is not enough', () => {
    const bareTitleOnly = '**Uma Ideia Sem Campos**\n\nSó um título, nada mais.';
    expect(extractProseIdeasArtifact(bareTitleOnly)).toBeNull();
  });
});

describe('extractProseIdeasArtifact — formato strategy (formato: anchored, bold title embedded mid-line)', () => {
  // The bold title sits mid-sentence rather than alone on its own line, so
  // the title strategy's whole-line-anchored regex does not match it, and the
  // line's own colon (in "Ideia sugerida:") excludes it from the sequence
  // strategy's candidate scan too — isolating the formato strategy, which
  // scans for a bold segment anywhere in the preceding text, not just a
  // standalone line.
  const content = [
    'Ideia sugerida: **Bastidores do Processo**',
    'Formato: Reels',
    'Gancho: Mostre como o trabalho acontece.',
    'Angulo: Humanização e confiança.',
    'Objetivo: Engajamento e autoridade',
    'CTA: Comente BASTIDORES.',
  ].join('\n');

  it('recovers the idea anchored on "formato:" with the last bold segment as title', () => {
    const artifact = extractProseIdeasArtifact(content);
    expect(artifact?.parsed.ideas).toHaveLength(1);
    expect(artifact?.parsed.ideas[0].title).toBe('Bastidores do Processo');
    expect(artifact?.parsed.ideas[0].format).toBe('Reels');
  });
});

describe('extractProseIdeasArtifact — strategy precedence', () => {
  it('prefers the sequence (angulo:) strategy when its shape is present, matching the original call order', () => {
    // Also contains a bold-title-only line, which would satisfy the title
    // strategy on its own — the sequence strategy must still win.
    const content = [
      '**Um Título Solto**',
      '',
      'Ideia Principal',
      'Angulo: Isso deve ganhar',
    ].join('\n');
    const artifact = extractProseIdeasArtifact(content);
    expect(artifact?.parsed.ideas[0].title).toBe('Ideia Principal');
  });
});

describe('extractProseIdeasArtifact — known quirk (documented, not fixed here)', () => {
  it('mis-titles a second+ idea when every title in a multi-idea list is bold', () => {
    // Characterizes a pre-existing limitation carried over unchanged from the
    // original extractSequenceIdeasArtifact: bold title lines are correctly
    // excluded from the title-candidate scan (see the strategy above), but for
    // the SECOND idea onward the scan window starts mid-line, right after the
    // previous idea's "Angulo:" label — so the previous idea's own angle VALUE
    // (not a full line, just the text after the label on that same source
    // line) leaks in as the only remaining plain-text candidate. Bold titles
    // are a common model output style, so this is a real, reachable gap - left
    // untouched here since fixing the underlying window computation is a
    // separate, higher-risk change from this consolidation. Tracked for a
    // follow-up, not silently relied upon.
    const content = [
      '**Bastidores do Processo** (Instagram)',
      'Formato: Reels',
      'Gancho: Mostre como o trabalho acontece.',
      'Angulo: Humanização e confiança.',
      'Objetivo: Engajamento e autoridade',
      'CTA: Comente BASTIDORES.',
      '',
      '**Segredos do Setor**',
      'Formato: Carrossel',
      'Gancho: Revele um segredo do mercado.',
      'Angulo: Autoridade.',
      'Objetivo: Geração de leads',
      'CTA: Salve este post.',
    ].join('\n');
    const artifact = extractProseIdeasArtifact(content);
    // The first idea is dropped entirely (empty title candidate pool), and
    // the second idea's title is wrongly filled with the first idea's own
    // angle value instead of "Segredos do Setor".
    expect(artifact?.parsed.ideas).toHaveLength(1);
    expect(artifact?.parsed.ideas[0].title).toBe('Humanização e confiança.');
  });
});

describe('extractProseCarouselArtifact — slide strategy (Slide N: / Título: / Texto: anchored)', () => {
  // Reproduces the shape observed live in production: a "text/copy" creation
  // request (creationType='text') where the model organized its answer as a
  // slide-by-slide carousel proposal in markdown instead of calling
  // contentPresentationTool with operation=carousel.
  const content = [
    'Aqui está uma proposta completa de copy para o Instagram:',
    '',
    '📌 Opção de Carrossel (7 Slides) | Formato 4:5',
    '',
    'Slide 1 (Capa / Gancho):',
    'Título: Por que seu engajamento no Instagram não vira pipeline de vendas?',
    'Subtítulo: A métrica da vaidade que está custando a previsibilidade da sua receita.',
    'Slide 2:',
    'Título: Curtida não fecha contrato.',
    'Texto: No B2B, buscar engajamento genérico atrai o público errado.',
    'Slide 3:',
    'Título: O desalinhamento clássico',
    'Texto: Marketing comemora posts com alto alcance. Vendas reclama de leads desqualificados.',
  ].join('\n');

  it('recovers every slide anchored on a "Slide N:" heading', () => {
    const artifact = extractProseCarouselArtifact(content);
    expect(artifact).not.toBeNull();
    expect(artifact?.renderFromText).toBe(true);
    expect(artifact?.parsed.operation).toBe('carousel');
    expect(artifact?.parsed.slides).toHaveLength(3);
    expect(artifact?.parsed.slides[0].headline).toBe(
      'Por que seu engajamento no Instagram não vira pipeline de vendas?'
    );
    expect(artifact?.parsed.slides[0].highlight).toBe(
      'A métrica da vaidade que está custando a previsibilidade da sua receita.'
    );
    expect(artifact?.parsed.slides[1].body).toBe(
      'No B2B, buscar engajamento genérico atrai o público errado.'
    );
  });

  it('derives the artifact title from the line preceding "Slide 1"', () => {
    const artifact = extractProseCarouselArtifact(content);
    expect(artifact?.parsed.title).toBe('Opção de Carrossel (7 Slides) | Formato 4:5');
  });

  it('leaves the intro sentence before the slide breakdown out of the stripped raw text', () => {
    const artifact = extractProseCarouselArtifact(content);
    expect(artifact?.sourceStart).toBeGreaterThan(content.indexOf('Aqui está'));
  });

  it('requires at least 2 slides — a single stray "slide" mention is too weak a signal', () => {
    const single = 'Vou te mostrar o Slide 1 como exemplo.\nTítulo: Um exemplo qualquer';
    expect(extractProseCarouselArtifact(single)).toBeNull();
  });

  it('drops a slide heading with no recognizable Título field', () => {
    const missingTitle = [
      'Slide 1:',
      'Texto: só corpo, sem título',
      'Slide 2:',
      'Título: Este tem título',
    ].join('\n');
    const artifact = extractProseCarouselArtifact(missingTitle);
    expect(artifact).toBeNull();
  });

  it('returns null for ordinary prose with no slide structure', () => {
    expect(extractProseCarouselArtifact('Isso é só uma resposta normal do assistente.')).toBeNull();
  });
});

describe('extractPresentedArtifact — orchestrator picks up the carousel prose fallback', () => {
  it('recovers a CAROUSEL_PREVIEW artifact end to end via the orchestrator', () => {
    const content = [
      'Slide 1:',
      'Título: Primeiro slide',
      'Texto: corpo do primeiro',
      'Slide 2:',
      'Título: Segundo slide',
      'Texto: corpo do segundo',
    ].join('\n');
    const artifact = extractPresentedArtifact(content);
    expect(artifact?.parsed.operation).toBe('carousel');
    expect((artifact?.parsed as any).slides).toHaveLength(2);
  });
});

describe('extractStructuredPresentedArtifact', () => {
  it('recovers an ideas payload from a bare {"operation":...} JSON blob in text', () => {
    const payload = {
      operation: 'ideas',
      ideas: [{ title: 'Ideia via JSON', hook: 'gancho', angle: 'angulo', platform: 'Instagram' }],
    };
    const content = `Aqui está: ${JSON.stringify(payload)} pronto.`;
    const artifact = extractStructuredPresentedArtifact(content);
    expect(artifact?.parsed.operation).toBe('ideas');
    expect(artifact?.parsed.ideas).toHaveLength(1);
    expect(artifact?.parsed.ideas[0].title).toBe('Ideia via JSON');
  });

  it('recovers a carousel payload from a {"functionCall":{"args":...}} blob', () => {
    const payload = {
      functionCall: {
        name: 'contentPresentationTool',
        args: {
          operation: 'carousel',
          slides: [{ headline: 'Slide 1' }, { headline: 'Slide 2' }],
        },
      },
    };
    const content = JSON.stringify(payload);
    const artifact = extractStructuredPresentedArtifact(content);
    expect(artifact?.parsed.operation).toBe('carousel');
    expect(artifact?.parsed.slides).toHaveLength(2);
  });

  it('recovers fragments when the JSON is truncated (missing closing brackets)', () => {
    const content = '{"operation":"ideas","ideas":[{"title":"Fragmento 1"},{"title":"Fragmento 2"}';
    const artifact = extractStructuredPresentedArtifact(content);
    expect(artifact?.parsed.operation).toBe('ideas');
    expect(artifact?.parsed.ideas?.map((i: any) => i.title)).toEqual(['Fragmento 1', 'Fragmento 2']);
  });

  it('returns null when there is no JSON-shaped presentation payload at all', () => {
    expect(extractStructuredPresentedArtifact('Só uma resposta em prosa, sem JSON.')).toBeNull();
  });
});

describe('extractTransportArtifact / stripTransportEnvelope', () => {
  const transportPayload = {
    format: 2,
    parts: [
      {
        toolName: 'contentPresentationTool',
        args: { operation: 'ideas', ideas: [{ title: 'Ideia via transporte' }] },
      },
    ],
  };
  const content = `texto antes ${JSON.stringify(transportPayload)} texto depois`;

  it('extracts the ideas payload from a format:2 transport envelope', () => {
    const artifact = extractTransportArtifact(content);
    expect(artifact?.parsed?.operation).toBe('ideas');
    expect(artifact?.parsed?.ideas).toHaveLength(1);
  });

  it('strips the transport envelope out of the displayed text, leaving the surrounding prose', () => {
    const stripped = stripTransportEnvelope(content);
    expect(stripped).toContain('texto antes');
    expect(stripped).toContain('texto depois');
    expect(stripped).not.toContain('"format":2');
    expect(stripped).not.toContain('contentPresentationTool');
  });

  it('returns the content unchanged when there is no transport envelope', () => {
    expect(stripTransportEnvelope('resposta comum')).toBe('resposta comum');
  });
});

describe('extractPresentedArtifact — orchestrator', () => {
  it('always marks a successful match as renderFromText, regardless of which strategy matched', () => {
    // Regression guard for the render-gate bug: before this fix, only
    // extractSummaryIdeasArtifact-shaped matches ever set renderFromText,
    // so every other successful parse silently rendered nothing.
    const sequenceShaped = 'Uma Ideia\nAngulo: teste';
    const structuredShaped = JSON.stringify({ operation: 'ideas', ideas: [{ title: 'X' }] });

    expect(extractPresentedArtifact(sequenceShaped)?.renderFromText).toBe(true);
    expect(extractPresentedArtifact(structuredShaped)?.renderFromText).toBe(true);
  });

  it('prefers a prose match over a structured JSON match when both are present in the same message', () => {
    const content = [
      'Ideia Prosa',
      'Angulo: vem da prosa',
      '',
      JSON.stringify({ operation: 'ideas', ideas: [{ title: 'Ideia JSON' }] }),
    ].join('\n');
    const artifact = extractPresentedArtifact(content);
    expect(artifact?.parsed.operation).toBe('ideas');
    expect((artifact?.parsed as any).ideas[0].title).toBe('Ideia Prosa');
  });

  it('falls through to the structured JSON match when no prose shape is present', () => {
    const content = JSON.stringify({ operation: 'carousel', slides: [{ headline: 'Slide único' }] });
    const artifact = extractPresentedArtifact(content);
    expect(artifact?.parsed.operation).toBe('carousel');
  });

  it('returns null for ordinary conversational replies (greetings, small talk)', () => {
    expect(extractPresentedArtifact('Olá! Como posso ajudar você hoje?')).toBeNull();
    expect(extractPresentedArtifact('Claro, vou preparar isso para você.')).toBeNull();
  });
});
