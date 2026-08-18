import type { ContentIdea } from './content-artifacts.component';
import { extractSummaryIdeasArtifact } from './idea-summary-parser';

/**
 * Recovers a Studio ideas/carousel artifact from an assistant message's raw
 * text when the model answered in prose/JSON instead of calling
 * contentPresentationTool. Consolidates what used to be 5 independently
 * maintained parsers (extractStructuredPresentedArtifact,
 * extractLooseIdeasArtifactSafe, extractTitleIdeasArtifact,
 * extractSequenceIdeasArtifact, extractTransportArtifact) into two composed
 * strategies below (extractStructuredPresentedArtifact for JSON-shaped text,
 * extractProseIdeasArtifact for label/heading-shaped text), plus the existing
 * extractSummaryIdeasArtifact for the narrow "Title (Format) — desc" summary
 * format, which already had its own tests and is left as-is.
 *
 * Every successful match here carries `renderFromText: true`. This used to be
 * true only for extractSummaryIdeasArtifact's result — the other parsers only
 * ever stripped the raw JSON/prose blob out of the displayed message text
 * (`stripTransportEnvelope` / the `sourceStart` slicing in agent.chat.tsx) but
 * never actually caused a card to render, because StudioAssistantMessage only
 * renders a fallback card when `renderFromText` is set. That flag was added in
 * one commit that introduced extractSummaryIdeasArtifact specifically to
 * "restore interactive idea cards from text summaries" and was never
 * retrofitted onto the four pre-existing parsers. Net effect in production:
 * whenever the model dumped ideas/carousel content in one of those four other
 * shapes, the text was silently stripped from view and no card ever
 * appeared - the parsed content was recovered and then thrown away. Setting
 * the flag uniformly here fixes that silent data loss.
 */
export type ParsedIdeasArtifact = {
  raw: string;
  sourceStart: number;
  renderFromText: true;
  parsed: { operation: 'ideas'; title: string; ideas: ContentIdea[] };
};

export type ParsedCarouselArtifact = {
  raw: string;
  sourceStart: number;
  renderFromText: true;
  parsed: { operation: 'carousel'; [key: string]: any };
};

export type ParsedArtifact = ParsedIdeasArtifact | ParsedCarouselArtifact;

// --- shared balanced-brace JSON extraction --------------------------------

export const parseBalancedJsonAt = (content: string, objectStart: number) => {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = objectStart; index < content.length; index += 1) {
    const char = content[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        const raw = content.slice(objectStart, index + 1);
        try {
          return { raw, value: JSON.parse(raw) as Record<string, any> };
        } catch {
          return null;
        }
      }
    }
  }
  return null;
};

const findPresentationPayload = (value: unknown): Record<string, any> | null => {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPresentationPayload(item);
      if (found) return found;
    }
    return null;
  }
  const record = value as Record<string, any>;
  const candidate =
    record.args && typeof record.args === 'object'
      ? record.args
      : record.functionCall?.args && typeof record.functionCall.args === 'object'
        ? record.functionCall.args
        : record;
  if (candidate.operation === 'ideas' && Array.isArray(candidate.ideas)) return candidate;
  if (candidate.operation === 'carousel' && Array.isArray(candidate.slides)) return candidate;
  for (const child of Object.values(record)) {
    const found = findPresentationPayload(child);
    if (found) return found;
  }
  return null;
};

// --- transport envelope (structured JSON blob the runtime sometimes leaks) -

export const extractTransportArtifact = (content: string) => {
  const normalized = content.replace(/\\"/g, '"');
  const formatStart = normalized.search(/\{\s*"format"\s*:\s*2\s*,\s*"parts"\s*:/);
  if (formatStart < 0) return null;
  const parsed = parseBalancedJsonAt(normalized, formatStart);
  if (!parsed || parsed.value.format !== 2 || !Array.isArray(parsed.value.parts)) return null;
  const payload = findPresentationPayload(parsed.value);
  if (!payload) return { sourceStart: formatStart, end: formatStart + parsed.raw.length, parsed: null };
  return {
    sourceStart: formatStart,
    end: formatStart + parsed.raw.length,
    parsed: { ...payload, operation: payload.operation || (payload.ideas ? 'ideas' : 'carousel') },
  };
};

export const stripTransportEnvelope = (content: string) => {
  const artifact = extractTransportArtifact(content);
  if (!artifact) return content;
  return `${content.slice(0, artifact.sourceStart)}${content.slice(artifact.end)}`.trim();
};

// --- JSON embedded in prose (functionCall / bare operation blob) ----------

export const extractStructuredPresentedArtifact = (content: string) => {
  const normalized = content.replace(/\\"/g, '"').replace(/\\\\n/g, '\n');
  const operationStart = normalized.indexOf('{"operation"');
  const functionStart = normalized.indexOf('{"functionCall"');
  const toolNameStart = normalized.indexOf('"toolName"');
  const toolArgsLabelStart = toolNameStart >= 0 ? normalized.indexOf('"args"', toolNameStart) : -1;
  const toolArgsStart = toolArgsLabelStart >= 0 ? normalized.indexOf('{', toolArgsLabelStart) : -1;
  const starts = [operationStart, functionStart, toolArgsStart].filter((value) => value >= 0).sort((a, b) => a - b);
  const start = starts[0] ?? -1;
  if (start < 0) return null;
  const sourceStart = toolNameStart >= 0 ? Math.max(0, content.lastIndexOf('{', toolNameStart)) : [
    content.indexOf('{"operation"'),
    content.indexOf('{\\"operation\\"'),
    content.indexOf('{"functionCall"'),
    content.indexOf('{\\"functionCall\\"'),
  ].filter((value) => value >= 0).sort((a, b) => a - b)[0] ?? 0;

  const parsedObject = parseBalancedJsonAt(normalized, start);
  const parsedArgs = parsedObject?.value?.functionCall?.args || parsedObject?.value;
  const parsedOperation = parsedArgs?.operation ||
    (Array.isArray(parsedArgs?.ideas) ? 'ideas' : Array.isArray(parsedArgs?.slides) ? 'carousel' : '');
  if (parsedObject && (parsedOperation === 'ideas' || parsedOperation === 'carousel')) {
    return { raw: parsedObject.raw, sourceStart, parsed: { ...parsedArgs, operation: parsedOperation } };
  }

  // Some providers append presentation metadata inside the array and omit the
  // final closing brackets. Recover each balanced card for a usable fallback.
  const ideasStart = normalized.indexOf('"ideas"', start);
  const slidesStart = normalized.indexOf('"slides"', start);
  const listKey = ideasStart >= 0 && (slidesStart < 0 || ideasStart < slidesStart) ? 'ideas' : 'slides';
  const listStart = normalized.indexOf('[', listKey === 'ideas' ? ideasStart : slidesStart);
  if (listStart < 0) return null;
  const recovered: any[] = [];
  let cursor = listStart + 1;
  let metadata: any = null;
  const noteStart = normalized.indexOf('Este resultado', start);
  while (cursor < normalized.length) {
    const objectStart = normalized.indexOf('{', cursor);
    if (objectStart < 0 || (noteStart >= 0 && objectStart >= noteStart)) break;
    const object = parseBalancedJsonAt(normalized, objectStart);
    if (!object) break;
    if (object.value?.operation === 'ideas' || object.value?.operation === 'carousel') metadata = object.value;
    else if (object.value?.title || object.value?.headline || object.value?.imagePrompt) recovered.push(object.value);
    cursor = objectStart + object.raw.length;
  }
  if (!recovered.length) return null;
  const operation = listKey === 'ideas' ? 'ideas' : 'carousel';
  return {
    raw: normalized.slice(start, Math.max(cursor, listStart)),
    sourceStart,
    parsed: { ...(metadata || {}), operation, [listKey]: recovered },
  };
};

// --- prose heuristics (label/heading-anchored ideas blocks) ---------------

const cleanIdeaLine = (line: unknown) =>
  String(line ?? '')
    .trim()
    .replace(/^[-*•]\s*/, '')
    .replace(/^#{1,6}\s*/, '')
    .replace(/\*\*/g, '')
    .trim();

const readField = (block: string, labels: string) => {
  // `labels` can be an alternation like 'gancho|hook' or 'chamada para acao|cta'.
  // Regex `|` has the lowest precedence, so interpolating it unparenthesized
  // (as this used to) built `gancho|hook[^:]*: *(.+)`, which is really two
  // alternatives: bare "gancho" (no capture group) OR "hook..." (with one).
  // Since the Studio's prompt is in Portuguese, "gancho:" is the common label,
  // and it always matched the group-less branch - silently returning '' for
  // every hook/CTA extraction that used a Portuguese label, which then always
  // fell back to a generic default. The non-capturing group here scopes the
  // alternation before the shared suffix pattern, so either label word feeds
  // the same capture group.
  const match = block.match(new RegExp(`(?:${labels})[^:]*: *(.+)`, 'i'));
  return match ? cleanIdeaLine(match[1]).replace(/^\*+\s*/, '').replace(/\*+$/, '').trim() : '';
};

// Same label matching as readField (accent/case-insensitive, run against the
// normalized block so "Título"/"titulo" both match), but slices the captured
// value out of the accent-preserving source block instead — so a recovered
// headline reads "não vira pipeline" rather than "nao vira pipeline". Relies
// on NFD-decompose-then-strip-combining-marks preserving one codepoint per
// character (true for the standard Portuguese diacritics), which keeps
// `sourceBlock` and `normalizedBlock` positionally aligned.
const readSourceField = (sourceBlock: string, normalizedBlock: string, labels: string) => {
  const match = normalizedBlock.match(new RegExp(`(?:${labels})[^:]*: *(.+)`, 'i'));
  if (!match || match.index == null) return '';
  const valueStart = match.index + (match[0].length - match[1].length);
  const valueEnd = valueStart + match[1].length;
  return cleanIdeaLine(sourceBlock.slice(valueStart, valueEnd)).replace(/^\*+\s*/, '').replace(/\*+$/, '').trim();
};

/**
 * Strategy 1 (tried first, matching the original precedence): anchors on each
 * "angulo:" occurrence and takes the last plain heading-like line before it as
 * the title. The loosest strategy - only a title is required - because the
 * "angulo:" label itself is a strong, distinctive signal of Studio ideas
 * content in Portuguese.
 */
const matchSequenceAnchored = (source: string, normalized: string): ContentIdea[] | null => {
  const matches = Array.from(normalized.matchAll(/angulo\s*:/gi));
  if (!matches.length) return null;
  const ideas: ContentIdea[] = [];
  matches.forEach((match, index) => {
    const angleStart = match.index ?? -1;
    if (angleStart < 0) return;
    const previousStart = index > 0 ? (matches[index - 1].index ?? 0) + matches[index - 1][0].length : 0;
    const nextStart = index + 1 < matches.length ? matches[index + 1].index ?? normalized.length : normalized.length;
    const block = normalized.slice(previousStart, nextStart);
    const title = source
      .slice(previousStart, angleStart)
      .split(/\r?\n/)
      .map(cleanIdeaLine)
      .filter((line) => line && !/:/.test(line) && !/^['"“”*]/.test(line) && !/^aqui estao|^aqui estão/i.test(line))
      .at(-1) || '';
    const idea: ContentIdea = {
      title: title.replace(/\s*\([^)]*\)\s*$/, '').trim(),
      platform: readField(block, 'plataforma') || 'Instagram',
      format: readField(block, 'formato') || 'Post para redes sociais',
      hook: readField(block, 'gancho|hook') || title.replace(/\s*\([^)]*\)\s*$/, '').trim(),
      angle: readField(block, 'angulo') || 'Conteúdo prático e relevante para o público da marca.',
      objective: readField(block, 'objetivo') || 'Engajamento e autoridade',
      suggestedCta: readField(block, 'chamada para acao|cta') || 'Salve este conteúdo para consultar depois.',
    };
    if (idea.title) ideas.push(idea);
  });
  return ideas.length ? ideas : null;
};

/**
 * Strategy 2: anchors on a standalone bolded title line (`**Title**` alone on
 * its own line, optionally with `(Platform)`). Requires format/hook/angle/cta
 * to all be present in the following block, since a bold-only line is a
 * weaker signal on its own than an explicit "angulo:" label.
 */
const matchTitleAnchored = (source: string, normalized: string): ContentIdea[] | null => {
  const titleMatches = Array.from(source.matchAll(/^\s*\*\*([^*\n:]+)\*\*(?:\s*\(([^)\n]+)\))?\s*$/gm));
  if (!titleMatches.length) return null;
  const ideas: ContentIdea[] = [];
  titleMatches.forEach((match, index) => {
    const start = match.index ?? -1;
    if (start < 0) return;
    const end = index + 1 < titleMatches.length ? titleMatches[index + 1].index ?? source.length : source.length;
    const block = normalized.slice(start + match[0].length, end);
    const idea: ContentIdea = {
      title: cleanIdeaLine(match[1]),
      platform: match[2] || readField(block, 'plataforma') || 'Instagram',
      format: readField(block, 'formato'),
      hook: readField(block, 'gancho|hook'),
      angle: readField(block, 'angulo'),
      objective: readField(block, 'objetivo') || 'Engajamento e autoridade',
      suggestedCta: readField(block, 'chamada para acao|cta'),
    };
    if (idea.title && idea.format && idea.hook && idea.angle && idea.suggestedCta) ideas.push(idea);
  });
  return ideas.length ? ideas : null;
};

/**
 * Strategy 3: anchors on each "formato:" occurrence, taking the last bolded
 * segment before it as the title. Requires format/hook/angle/cta all present,
 * same strictness rationale as strategy 2.
 */
const matchFormatoAnchored = (source: string, normalized: string): ContentIdea[] | null => {
  const matches = Array.from(normalized.matchAll(/formato\s*:/gi));
  if (!matches.length) return null;
  const ideas: ContentIdea[] = [];
  matches.forEach((match, index) => {
    const start = match.index ?? -1;
    if (start < 0) return;
    const previousStart = index > 0 ? matches[index - 1].index ?? 0 : 0;
    const nextStart = index + 1 < matches.length ? matches[index + 1].index ?? normalized.length : normalized.length;
    const block = normalized.slice(previousStart, nextStart);
    const titleCandidates = Array.from(source.slice(previousStart, start).matchAll(/\*\*([^*]+)\*\*/g))
      .map((item) => cleanIdeaLine(item[1]))
      .filter((line) => line && !/:/.test(line) && !/^(plataforma|formato|angulo|hook|gancho|objetivo|cta|dor do publico)/i.test(line));
    const title = (titleCandidates.at(-1) || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
    const idea: ContentIdea = {
      title,
      platform: readField(block, 'plataforma') || 'Instagram',
      format: readField(block, 'formato'),
      hook: readField(block, 'gancho|hook'),
      angle: readField(block, 'angulo'),
      objective: readField(block, 'objetivo') || 'Engajamento e autoridade',
      suggestedCta: readField(block, 'chamada para acao|cta'),
    };
    if (idea.title && idea.format && idea.hook && idea.angle && idea.suggestedCta) ideas.push(idea);
  });
  return ideas.length ? ideas : null;
};

const firstIndexOfAny = (content: string, values: string[]): number => {
  for (const value of values) {
    if (!value) continue;
    const index = content.indexOf(value);
    if (index >= 0) return index;
  }
  return -1;
};

/**
 * Tries the three label/heading-anchored strategies in the same precedence
 * the original three separate functions were called in: sequence (angulo:)
 * first, then standalone bold title, then formato:.
 */
export const extractProseIdeasArtifact = (content: string): ParsedIdeasArtifact | null => {
  const source = content.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  const normalized = source.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const strategies: Array<() => ContentIdea[] | null> = [
    () => matchSequenceAnchored(source, normalized),
    () => matchTitleAnchored(source, normalized),
    () => matchFormatoAnchored(source, normalized),
  ];

  for (const strategy of strategies) {
    const ideas = strategy();
    if (!ideas || !ideas.length) continue;
    const sourceStart = firstIndexOfAny(source, ideas.map((idea) => idea.title));
    if (sourceStart < 0) continue;
    return {
      raw: source.slice(sourceStart),
      sourceStart,
      renderFromText: true,
      parsed: { operation: 'ideas', title: `${ideas.length} ideias prontas para usar`, ideas },
    };
  }
  return null;
};

/**
 * Strategy 4 (carousel shape): anchors on each "Slide N" heading and reads
 * the Título/Subtítulo/Texto/CTA/Direção visual fields from the block that
 * follows. Recovers a CAROUSEL_PREVIEW artifact when the model writes a
 * slide-by-slide copy proposal in prose instead of calling
 * contentPresentationTool with operation=carousel — observed in production
 * when a "text/copy" creation request (creationType='text', which has no
 * card of its own) naturally organizes itself into slides: the model had no
 * tool call that matched a plain-text creationType, so it fell back to
 * markdown, and none of the three ideas-shaped strategies above recognize a
 * "Slide N: / Título: / Texto:" shape. Requires at least 2 slides with a
 * headline — a single stray "slide" mention in ordinary prose is too weak a
 * signal on its own.
 */
const matchSlideAnchored = (source: string, normalized: string) => {
  const matches = Array.from(normalized.matchAll(/slide\s*\d+\b/gi));
  if (matches.length < 2) return null;
  const slides: Array<{ index: number; headline: string; highlight?: string; body?: string; cta?: string; imagePrompt?: string }> = [];
  matches.forEach((match, index) => {
    const start = match.index ?? -1;
    if (start < 0) return;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? normalized.length : normalized.length;
    const block = normalized.slice(start, end);
    const sourceBlock = source.slice(start, end);
    const headline = readSourceField(sourceBlock, block, 'titulo|title');
    const highlight = readSourceField(sourceBlock, block, 'subtitulo|subtitle|destaque|highlight');
    const body = readSourceField(sourceBlock, block, 'texto|body|corpo');
    const cta = readSourceField(sourceBlock, block, 'chamada para acao|cta');
    const imagePrompt = readSourceField(sourceBlock, block, 'direcao visual|visual direction|imagem|visual');
    if (!headline) return;
    slides.push({
      index: Number(match[0].replace(/\D/g, '')) || index + 1,
      headline,
      ...(highlight && highlight !== headline ? { highlight } : {}),
      ...(body ? { body } : {}),
      ...(cta ? { cta } : {}),
      ...(imagePrompt ? { imagePrompt } : {}),
    });
  });
  return slides.length >= 2 ? slides : null;
};

export const extractProseCarouselArtifact = (content: string): ParsedCarouselArtifact | null => {
  const source = content.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  const normalized = source.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const slides = matchSlideAnchored(source, normalized);
  if (!slides) return null;
  const firstSlideMatch = normalized.match(/slide\s*\d+\b/i);
  const sourceStart = firstSlideMatch?.index ?? 0;
  const precedingLine = source
    .slice(0, sourceStart)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);
  const title = precedingLine
    ? precedingLine.replace(/^[^\p{L}\d]+/u, '').replace(/\*\*/g, '').trim()
    : 'Copy do carrossel';
  return {
    raw: source.slice(sourceStart),
    sourceStart,
    renderFromText: true,
    parsed: { operation: 'carousel', title: title || 'Copy do carrossel', slides },
  };
};

// --- orchestrator -----------------------------------------------------------

export const extractPresentedArtifact = (content: string): ParsedArtifact | null => {
  const visibleContent = stripTransportEnvelope(content);

  const proseArtifact = extractProseIdeasArtifact(visibleContent);
  if (proseArtifact) return proseArtifact;

  const proseCarousel = extractProseCarouselArtifact(visibleContent);
  if (proseCarousel) return proseCarousel;

  const transport = extractTransportArtifact(content);
  if (transport?.parsed) {
    return {
      raw: content.slice(transport.sourceStart, transport.end),
      sourceStart: transport.sourceStart,
      renderFromText: true,
      parsed: transport.parsed,
    } as ParsedArtifact;
  }

  const structured = extractStructuredPresentedArtifact(visibleContent);
  if (structured) {
    return { ...structured, renderFromText: true } as ParsedArtifact;
  }

  return extractSummaryIdeasArtifact(visibleContent);
};
