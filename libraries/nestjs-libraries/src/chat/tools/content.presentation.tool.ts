import { Injectable } from '@nestjs/common';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

const ideaSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  hook: z.string().min(1),
  audiencePain: z.string().optional(),
  angle: z.string().min(1),
  format: z.string().min(1),
  platform: z.string().min(1),
  objective: z.string().optional(),
  suggestedCta: z.string().min(1),
  suggestedCaption: z.string().optional(),
});

const slideSchema = z.object({
  id: z.string().optional(),
  index: z.number().int().positive(),
  role: z.string().optional(),
  headline: z.string().min(1),
  body: z.string().optional(),
  highlight: z.string().optional(),
  cta: z.string().optional(),
  visualDirection: z.string().min(1),
  layout: z.string().min(1),
  imagePrompt: z.string().min(1),
  imageUrl: z.string().url().optional(),
  status: z.string().optional(),
});

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
        title: z.string().min(1),
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
          if (!input.ideas?.length) throw new Error('ideas are required for operation ideas');
          return {
            result: {
              type: 'IDEAS',
              source: 'contentPresentationTool',
              title: input.title,
              ideas: input.ideas,
              requiresUserSelection: true,
            },
          };
        }
        if (!input.slides?.length) throw new Error('slides are required for operation carousel');
        return {
          result: {
            type: 'CAROUSEL_PREVIEW',
            source: 'contentPresentationTool',
            title: input.title,
            platform: input.platform || 'Instagram',
            aspectRatio: input.aspectRatio || '4:5',
            caption: input.caption,
            hashtags: input.hashtags || [],
            designSpec: input.designSpec,
            slides: input.slides,
            requiresUserSelection: true,
          },
        };
      },
    });
  }
}
