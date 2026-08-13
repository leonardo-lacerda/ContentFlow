import { Injectable } from '@nestjs/common';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

// The schema is intentionally permissive. The Studio model (gpt-5-2 via kie.ai)
// frequently omits one or two fields per idea/slide; when the schema rejected
// those calls, the tool never returned an artifact, the chat fell back to raw
// text, and the UI rendered duplicated/looping idea cards. We now accept the
// partial payload and fill sensible defaults in `execute` instead of failing.
const ideaSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  hook: z.string().optional(),
  audiencePain: z.string().optional(),
  angle: z.string().optional(),
  format: z.string().optional(),
  platform: z.string().optional(),
  objective: z.string().optional(),
  suggestedCta: z.string().optional(),
  suggestedCaption: z.string().optional(),
});

const slideSchema = z.object({
  id: z.string().optional(),
  index: z.number().optional(),
  role: z.string().optional(),
  headline: z.string().optional(),
  body: z.string().optional(),
  highlight: z.string().optional(),
  cta: z.string().optional(),
  visualDirection: z.string().optional(),
  layout: z.string().optional(),
  imagePrompt: z.string().optional(),
  imageUrl: z.string().optional(),
  status: z.string().optional(),
});

type RawIdea = z.infer<typeof ideaSchema>;
type RawSlide = z.infer<typeof slideSchema>;

const clean = (value?: string | null) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

// First sentence (or a truncated clause) of a hook, usable as a short title.
const deriveTitle = (idea: RawIdea) => {
  const explicit = clean(idea.title);
  if (explicit) return explicit;
  const source = clean(idea.hook) || clean(idea.angle) || clean(idea.suggestedCaption);
  if (!source) return '';
  const firstSentence = source.split(/(?<=[.!?])\s/)[0] || source;
  const trimmed = firstSentence.replace(/^["“”'*\-\s]+/, '').replace(/["“”'*\s]+$/, '');
  return trimmed.length > 80 ? `${trimmed.slice(0, 77).trim()}…` : trimmed;
};

const normalizeIdea = (idea: RawIdea, index: number) => {
  const title = deriveTitle(idea);
  const hook = clean(idea.hook) || title;
  return {
    ...idea,
    id: idea.id || `idea-${index + 1}`,
    title,
    hook,
    angle: clean(idea.angle) || 'Conteúdo prático e relevante para o público da marca.',
    format: clean(idea.format) || 'Post para redes sociais',
    platform: clean(idea.platform) || 'Instagram',
    objective: clean(idea.objective) || 'Engajamento e autoridade',
    suggestedCta:
      clean(idea.suggestedCta) || 'Salve este conteúdo para consultar depois.',
  };
};

const normalizeSlide = (slide: RawSlide, index: number) => {
  const headline = clean(slide.headline) || clean(slide.highlight) || `Slide ${index + 1}`;
  const visualDirection =
    clean(slide.visualDirection) ||
    clean(slide.imagePrompt) ||
    `Direção visual para: ${headline}`;
  return {
    ...slide,
    id: slide.id || `slide-${index + 1}`,
    index:
      typeof slide.index === 'number' && slide.index > 0 ? slide.index : index + 1,
    headline,
    visualDirection,
    layout: clean(slide.layout) || 'text-card',
    imagePrompt: clean(slide.imagePrompt) || visualDirection,
  };
};

@Injectable()
export class ContentPresentationTool implements AgentToolInterface {
  name = 'contentPresentationTool';

  run() {
    return createTool({
      id: 'contentPresentationTool',
      description:
        'Prepare structured ContentFlow Studio artifacts for the chat UI. Use operation ideas to provide exactly the requested ready-to-use ideas, or operation carousel to provide a complete visual slide plan. This tool does not generate media, consume credits or save anything.',
      inputSchema: z.object({
        operation: z.enum(['ideas', 'carousel']).optional(),
        title: z.string().optional(),
        ideas: z.array(ideaSchema).optional(),
        platform: z.string().optional(),
        aspectRatio: z.string().optional(),
        caption: z.string().optional(),
        hashtags: z.array(z.string()).optional(),
        designSpec: z.record(z.any()).optional(),
        slides: z.array(slideSchema).optional(),
      }),
      outputSchema: z.object({ result: z.any() }),
      execute: async (input, context) => {
        checkAuth(input, context);
        const operation = input.operation || (input.ideas?.length ? 'ideas' : 'carousel');
        if (operation === 'ideas') {
          // Keep any item that carries at least a title or a hook; everything
          // else is backfilled with defaults so a mostly-empty item never blocks
          // the whole artifact.
          const ideas = ((input.ideas || []) as RawIdea[])
            .filter((idea: RawIdea) => clean(idea.title) || clean(idea.hook) || clean(idea.angle))
            .map(normalizeIdea)
            .filter((idea: ReturnType<typeof normalizeIdea>) => idea.title);
          if (!ideas.length) throw new Error('ideas are required for operation ideas');
          return {
            result: {
              type: 'IDEAS',
              source: 'contentPresentationTool',
              title: clean(input.title) || `${ideas.length} ideias prontas para usar`,
              ideas,
              requiresUserSelection: true,
            },
          };
        }
        const slides = ((input.slides || []) as RawSlide[])
          .filter((slide: RawSlide) => clean(slide.headline) || clean(slide.highlight) || clean(slide.body))
          .map(normalizeSlide);
        if (!slides.length) throw new Error('slides are required for operation carousel');
        return {
          result: {
            type: 'CAROUSEL_PREVIEW',
            source: 'contentPresentationTool',
            title: clean(input.title) || 'Seu carrossel',
            platform: input.platform || 'Instagram',
            aspectRatio: input.aspectRatio || '4:5',
            caption: input.caption,
            hashtags: input.hashtags || [],
            designSpec: input.designSpec,
            slides,
            requiresUserSelection: true,
          },
        };
      },
    });
  }
}
