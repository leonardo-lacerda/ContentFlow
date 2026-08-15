import { IntegrationValidationTool } from '@gitroom/nestjs-libraries/chat/tools/integration.validation.tool';
import { IntegrationTriggerTool } from '@gitroom/nestjs-libraries/chat/tools/integration.trigger.tool';
import { IntegrationSchedulePostTool } from './integration.schedule.post';
import { GenerateVideoOptionsTool } from '@gitroom/nestjs-libraries/chat/tools/generate.video.options.tool';
import { VideoFunctionTool } from '@gitroom/nestjs-libraries/chat/tools/video.function.tool';
import { GenerateVideoTool } from '@gitroom/nestjs-libraries/chat/tools/generate.video.tool';
import { GenerateImageTool } from '@gitroom/nestjs-libraries/chat/tools/generate.image.tool';
import { IntegrationListTool } from '@gitroom/nestjs-libraries/chat/tools/integration.list.tool';
import { CreativeEngineTool } from '@gitroom/nestjs-libraries/chat/tools/creative.engine.tool';
import { CreativeCatalogTool } from '@gitroom/nestjs-libraries/chat/tools/creative-catalog.tool';
import { CreativeProjectTool } from '@gitroom/nestjs-libraries/chat/tools/creative-project.tool';
import { CreativeGenerationTool } from '@gitroom/nestjs-libraries/chat/tools/creative-generation.tool';
import { CreativeJobTool } from '@gitroom/nestjs-libraries/chat/tools/creative-job.tool';
import { CreativePublishTool } from '@gitroom/nestjs-libraries/chat/tools/creative-publish.tool';
import { CreativeWorkflowTool } from '@gitroom/nestjs-libraries/chat/tools/creative-workflow.tool';
import { ContentStudioTool } from '@gitroom/nestjs-libraries/chat/tools/content.studio.tool';
import { StudioArtifactTool } from '@gitroom/nestjs-libraries/chat/tools/studio.artifact.tool';
import { CreationOptionsTool } from '@gitroom/nestjs-libraries/chat/tools/creation.options.tool';
import { ContentPresentationTool } from '@gitroom/nestjs-libraries/chat/tools/content.presentation.tool';

// Tools shared by every agent, regardless of which creative-tool surface they use.
const sharedTools = [
  IntegrationListTool,
  IntegrationValidationTool,
  IntegrationTriggerTool,
  IntegrationSchedulePostTool,
  GenerateVideoOptionsTool,
  VideoFunctionTool,
  GenerateVideoTool,
  GenerateImageTool,
  ContentStudioTool,
  StudioArtifactTool,
  CreationOptionsTool,
  ContentPresentationTool,
];

// The full tool list, unchanged, for the original 'contentflow' Mastra agent.
// This agent is the one exposed publicly over MCP (see start.mcp.ts and
// docs/creative-engine/mcp.md) - external clients call `creativeEngineTool`
// by name, so it must keep existing exactly as-is here for backward
// compatibility, even though the Studio chat agent below no longer uses it.
export const toolList = [...sharedTools, CreativeEngineTool];

// Same tool set, but with creativeEngineTool's 40 operations split into 6
// smaller, domain-focused tools (see docs/studio-audit.md, item C4) - used
// only by the internal 'contentflow-studio' agent that powers the Studio
// chat UI, never exposed over MCP.
export const studioToolList = [
  ...sharedTools,
  CreativeCatalogTool,
  CreativeProjectTool,
  CreativeGenerationTool,
  CreativeJobTool,
  CreativePublishTool,
  CreativeWorkflowTool,
];

// Union of every tool class across both lists, each appearing once - this is
// what actually needs registering as a NestJS provider (ChatModule). toolList
// and studioToolList themselves are the ordered, per-agent picks that
// LoadToolsService reads from, not provider registrations.
export const allToolProviders = [
  ...sharedTools,
  CreativeEngineTool,
  CreativeCatalogTool,
  CreativeProjectTool,
  CreativeGenerationTool,
  CreativeJobTool,
  CreativePublishTool,
  CreativeWorkflowTool,
];
