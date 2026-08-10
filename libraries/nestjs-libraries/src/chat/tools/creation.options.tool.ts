import { Injectable } from '@nestjs/common';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

const creationTypes = ['image', 'video', 'carousel', 'text'] as const;

@Injectable()
export class CreationOptionsTool implements AgentToolInterface {
  name = 'creationOptionsTool';

  run() {
    return createTool({
      id: 'creationOptionsTool',
      description:
        'Prepare the simple, user-facing options for a new ContentFlow creation. This is a planning tool and must be called before any image, video, carousel or text generation. It does not generate media or consume credits. Return the detected creation type and sensible suggestions for the frontend configurator.',
      mcp: {
        annotations: {
          title: 'Creation Options',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      inputSchema: z.object({
        creationType: z.enum(creationTypes),
        title: z.string().max(160),
        brief: z.string().max(1200),
        suggestedPlatform: z.string().optional(),
        suggestedAspectRatio: z.string().optional(),
        suggestedTone: z.string().optional(),
        suggestedStyle: z.string().optional(),
        suggestedDurationSec: z.number().int().positive().optional(),
        suggestedSlideCount: z.number().int().positive().optional(),
        suggestedLength: z.string().optional(),
      }),
      outputSchema: z.object({ result: z.any() }),
      execute: async (input, context) => {
        checkAuth(input, context);
        return {
          result: {
            type: 'CREATION_OPTIONS',
            ...input,
            source: 'creationOptionsTool',
            requiresUserSelection: true,
          },
        };
      },
    });
  }
}
