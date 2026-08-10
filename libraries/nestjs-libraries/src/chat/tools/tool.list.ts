import { IntegrationValidationTool } from '@gitroom/nestjs-libraries/chat/tools/integration.validation.tool';
import { IntegrationTriggerTool } from '@gitroom/nestjs-libraries/chat/tools/integration.trigger.tool';
import { IntegrationSchedulePostTool } from './integration.schedule.post';
import { GenerateVideoOptionsTool } from '@gitroom/nestjs-libraries/chat/tools/generate.video.options.tool';
import { VideoFunctionTool } from '@gitroom/nestjs-libraries/chat/tools/video.function.tool';
import { GenerateVideoTool } from '@gitroom/nestjs-libraries/chat/tools/generate.video.tool';
import { GenerateImageTool } from '@gitroom/nestjs-libraries/chat/tools/generate.image.tool';
import { IntegrationListTool } from '@gitroom/nestjs-libraries/chat/tools/integration.list.tool';
import { CreativeEngineTool } from '@gitroom/nestjs-libraries/chat/tools/creative.engine.tool';
import { ContentStudioTool } from '@gitroom/nestjs-libraries/chat/tools/content.studio.tool';
import { StudioArtifactTool } from '@gitroom/nestjs-libraries/chat/tools/studio.artifact.tool';
import { CreationOptionsTool } from '@gitroom/nestjs-libraries/chat/tools/creation.options.tool';
import { ContentPresentationTool } from '@gitroom/nestjs-libraries/chat/tools/content.presentation.tool';

export const toolList = [
  IntegrationListTool,
  IntegrationValidationTool,
  IntegrationTriggerTool,
  IntegrationSchedulePostTool,
  GenerateVideoOptionsTool,
  VideoFunctionTool,
  GenerateVideoTool,
  GenerateImageTool,
  CreativeEngineTool,
  ContentStudioTool,
  StudioArtifactTool,
  CreationOptionsTool,
  ContentPresentationTool,
];
