import type { ContentIdea } from './content-artifacts.component';

export type TextIdeasArtifact = {
  raw: string;
  sourceStart: number;
  renderFromText: true;
  parsed: {
    operation: 'ideas';
    title: string;
    ideas: ContentIdea[];
  };
};

const cleanIdeaLine = (line: unknown) =>
  String(line ?? '')
    .trim()
    .replace(/^[-*•]\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .trim();

/**
 * Recovers the interactive ideas card when the provider returns the compact
 * summary that the Studio agent sometimes uses instead of a tool payload.
 * It intentionally accepts only lines with a title, parenthesized format and
 * an em dash description, and only when the surrounding answer has ideas
 * signals. Normal prose is therefore left untouched.
 */
export const extractSummaryIdeasArtifact = (content: string): TextIdeasArtifact | null => {
  const source = content.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  if (!/(?:ideias? prontas|op[cç][oõ]es geradas|interface interativa|resumo r[aá]pido)/i.test(source)) {
    return null;
  }

  const ideas: Array<{ line: string; index: number; idea: ContentIdea }> = [];
  source.split(/\r?\n/).forEach((rawLine, index) => {
    const line = cleanIdeaLine(rawLine);
    const match = line.match(/^(.+?)\s*\(([^()\n]+)\)\s+[—–-]\s+(.+)$/);
    if (!match) return;
    const [, title, descriptor, description] = match;
    const platform =
      descriptor.match(/\b(Instagram|TikTok|LinkedIn|YouTube|Facebook|Pinterest|Threads|X)\b/i)?.[1] ||
      descriptor;
    ideas.push({
      line,
      index,
      idea: {
        id: `summary-${index + 1}`,
        title: title.trim(),
        hook: description.trim(),
        angle: description.trim(),
        format: descriptor.trim(),
        platform,
        objective: 'Conteúdo pronto para desenvolver',
        suggestedCta: 'Selecione esta ideia para gerar a copy completa.',
      },
    });
  });

  if (!ideas.length) return null;
  const firstLine = ideas[0].line;
  const sourceStart = source.indexOf(firstLine);
  if (sourceStart < 0) return null;

  return {
    raw: source.slice(sourceStart),
    sourceStart,
    renderFromText: true,
    parsed: {
      operation: 'ideas',
      title: `${ideas.length} ideias prontas para usar`,
      ideas: ideas.map(({ idea }) => idea),
    },
  };
};
