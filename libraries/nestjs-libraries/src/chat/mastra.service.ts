import { Mastra } from '@mastra/core/mastra';
import { ConsoleLogger } from '@mastra/core/logger';
import { pStore } from '@gitroom/nestjs-libraries/chat/mastra.store';
import { Injectable } from '@nestjs/common';
import { LoadToolsService } from '@gitroom/nestjs-libraries/chat/load.tools.service';

@Injectable()
export class MastraService {
  static mastra: Mastra;
  constructor(private _loadToolsService: LoadToolsService) {}
  async mastra() {
    MastraService.mastra =
      MastraService.mastra ||
      new Mastra({
        storage: pStore,
        agents: {
          // Unchanged, full tool set - this is the one exposed over MCP
          // (start.mcp.ts) to external clients. Keep it byte-identical.
          contentflow: await this._loadToolsService.agent(),
          // Studio chat UI's agent (see docs/studio-audit.md, item C4): same
          // instructions, but creativeEngineTool split into 6 smaller tools.
          // Never exposed over MCP.
          'contentflow-studio': await this._loadToolsService.studioAgent(),
          // Headless Studio agent for the /mcp-studio endpoint: same creative
          // capabilities as contentflow-studio but without CreationOptionsTool
          // (frontend configurator card). Uses MCP-surface prompt rules.
          'contentflow-studio-mcp': await this._loadToolsService.studioMcpAgent(),
        },
        logger: new ConsoleLogger({
          level: 'info',
        }),
      });

    return MastraService.mastra;
  }
}
