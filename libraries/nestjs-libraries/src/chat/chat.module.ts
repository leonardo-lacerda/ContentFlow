import { Global, Module } from '@nestjs/common';
import { LoadToolsService } from '@gitroom/nestjs-libraries/chat/load.tools.service';
import { MastraService } from '@gitroom/nestjs-libraries/chat/mastra.service';
import { ToolConfirmationService } from '@gitroom/nestjs-libraries/chat/tool-confirmation.service';
import { allToolProviders } from '@gitroom/nestjs-libraries/chat/tools/tool.list';

@Global()
@Module({
  providers: [
    MastraService,
    LoadToolsService,
    ToolConfirmationService,
    ...allToolProviders,
  ],
  get exports() {
    return this.providers;
  },
})
export class ChatModule {}
