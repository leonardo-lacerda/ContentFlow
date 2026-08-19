import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

@Injectable()
export class GenerateImageTool implements AgentToolInterface {
  private storage = UploadFactory.createStorage();

  constructor(private _mediaService: MediaService) {}
  name = 'generateImageTool';

  run() {
    return createTool({
      id: 'generateImageTool',
      description: `Generate image to use in a post,
                    in case the user specified a platform that requires attachment and attachment was not provided,
                    ask if they want to generate a picture of a video.
                    This consumes the user's AI image credits, so it requires explicit confirmed=true: ask the user first and only pass confirmed=true after they accept.
      `,
      mcp: {
        annotations: {
          title: 'Generate Image',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      inputSchema: z.object({
        prompt: z.string(),
        confirmed: z
          .boolean()
          .optional()
          .describe(
            'Must be true to actually generate. Generation consumes credits, so ask the user first and only set this after they explicitly accept.'
          ),
      }),
      outputSchema: z.object({
        id: z.string(),
        path: z.string(),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        if (inputData.confirmed !== true) {
          throw new Error(
            'Esta acao consome creditos de imagem e exige confirmacao explicita do usuario antes de continuar.'
          );
        }
        const org = JSON.parse((context?.requestContext as any)?.get('organization') as string);
        const image = await this._mediaService.generateImage(
          inputData.prompt,
          org
        );

        const file = await this.storage.uploadSimple(
          'data:image/png;base64,' + image
        );

        return this._mediaService.saveFile(org.id, file.split('/').pop(), file);
      },
    });
  }
}
