import { describe, expect, it } from 'vitest';
import { extractSummaryIdeasArtifact } from './idea-summary-parser';

describe('extractSummaryIdeasArtifact', () => {
  it('recovers interactive ideas from the compact provider summary', () => {
    const response = [
      'Apresentei as 3 ideias prontas de conteúdo diretamente na interface interativa do ContentFlow Studio!',
      '',
      'Aqui está um resumo rápido das opções geradas para você:',
      '',
      'Bastidores do Processo (Instagram Reels/TikTok) — Foco em conexão e humanização, mostrando a rotina de criação da marca.',
      'Mito vs. Realidade no Nicho (Carrossel no Instagram) — Foco em autoridade e salvamentos, desmistificando erros comuns.',
      'Tutorial Passo a Passo (TikTok / Vídeo) — Foco em conversão e vendas, demonstrando a solução de um problema em poucas etapas.',
    ].join('\n');

    const artifact = extractSummaryIdeasArtifact(response);

    expect(artifact?.renderFromText).toBe(true);
    expect(artifact?.parsed.operation).toBe('ideas');
    expect(artifact?.parsed.ideas).toHaveLength(3);
    expect(artifact?.parsed.ideas.map((idea) => idea.title)).toEqual([
      'Bastidores do Processo',
      'Mito vs. Realidade no Nicho',
      'Tutorial Passo a Passo',
    ]);
    expect(artifact?.parsed.ideas[1].platform).toBe('Instagram');
  });

  it('does not turn ordinary prose into an artifact', () => {
    expect(
      extractSummaryIdeasArtifact('A ideia (é apenas um exemplo) — sem pedido de conteúdo.')
    ).toBeNull();
  });
});
