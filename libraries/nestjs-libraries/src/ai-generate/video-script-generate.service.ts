import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { VideoScriptSchema, VIDEO_FORMATS } from './schemas/video-script.schema';
import type { VideoScript } from './schemas/video-script.schema';
import { validateAiResponse } from './ai-response-validator';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';
import { CarouselProjectService } from '@gitroom/nestjs-libraries/database/prisma/carousel-projects/carousel-project.service';
import { GenerationJobService } from '@gitroom/nestjs-libraries/database/prisma/generation-jobs/generation-job.service';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'sk-proj-' });

const SYSTEM_PROMPT = `You are an expert short-form video scriptwriter. You transform carousel content into engaging video scripts for Reels, TikTok, and Shorts.

You must:
1. Convert slide content into timed scenes
2. Keep each scene short (3-8 seconds for Shorts, 5-15 for Reels/TikTok)
3. Write punchy text overlays with specific positions and animations
4. Add visual direction (pan, zoom, transition, motion notes)
5. Include voiceover text for each scene
6. Keep total duration within platform limits
7. Make the script feel native to video, not like reading slides

Video script rules:
- Hook in first 2 seconds
- One idea per scene
- Text overlays should be readable in 2 seconds
- End with clear CTA
- Visual notes should be specific and actionable
- Use varied transitions between scenes
- Motion notes should describe camera movement (Ken Burns, pan, zoom)`;

@Injectable()
export class VideoScriptGenerateService {
  private readonly logger = new Logger(VideoScriptGenerateService.name);

  constructor(
    private brandProfileService: BrandProfileService,
    private carouselProjectService: CarouselProjectService,
    private generationJobService: GenerationJobService,
  ) {}

  async generateVideoScript(orgId: string, dto: {
    brandProfileId: string;
    carouselProjectId: string;
    format: string;
    maxDuration?: number;
    additionalContext?: string;
  }): Promise<VideoScript> {
    const brand = await this.brandProfileService.getBrand(dto.brandProfileId);
    if (!brand || brand.organizationId !== orgId) throw new Error('Brand not found');

    const project = await this.carouselProjectService.getProject(dto.carouselProjectId, orgId);
    if (!project) throw new Error('Carousel project not found');

    const dna = await this.brandProfileService.getLatestDnaSnapshot(dto.brandProfileId);
    const formatConfig = VIDEO_FORMATS.find(f => f.id === dto.format) || VIDEO_FORMATS[0];
    const maxDuration = dto.maxDuration || formatConfig.maxDuration;

    const job = await this.generationJobService.createJob({
      organizationId: orgId,
      brandProfileId: dto.brandProfileId,
      type: 'VIDEO_SCRIPT',
      model: 'gpt-4.1',
      provider: 'openai',
      promptVersion: '2.0.0',
      schemaVersion: '2.0.0',
    });

    try {
      await this.generationJobService.startJob(job.id);

      const slides = project.slides as any[];
      const slideDescriptions = slides.map((s: any, i: number) =>
        `Slide ${i + 1}: Headline: "${s.headline || s.title || ''}" | Body: "${s.body || s.description || ''}" | CTA: "${s.cta || ''}" | Image: ${s.imagePrompt || s.imageUrl || 'N/A'}`
      ).join('\n');

      const prompt = `Convert this carousel into a ${formatConfig.name} video script.

## Brand
Name: ${brand.name}
Voice: ${JSON.stringify(dna?.voice || {})}

## Carousel
Title: ${project.title}
Caption: ${project.caption || ''}
Slides:
${slideDescriptions}

## Requirements
Format: ${formatConfig.name} (${formatConfig.aspectRatio})
Max duration: ${maxDuration} seconds
${dto.additionalContext ? `Instructions: ${dto.additionalContext}` : ''}

Create a scene-by-scene script with:
- Each slide becomes a scene
- Timing for each scene (2-8 seconds)
- Text overlays with position (top/center/bottom) and animation (fade-in/slide-up/typewriter/pop)
- Transition types (cut/crossfade/slide-left/slide-right/zoom-in/zoom-out)
- Voiceover text for narration
- Motion notes (Ken Burns effect, pan direction, zoom target)
- Keep scenes varied and engaging
- End with CTA scene

Return JSON.`;

      const rawResponse = await openai.chat.completions.parse({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        response_format: zodResponseFormat(VideoScriptSchema, 'videoScript'),
      });

      const parsed = rawResponse.choices[0].message.parsed;
      if (!parsed) throw new Error('Failed to parse AI response');

      const validation = validateAiResponse('video-script', JSON.stringify(parsed));
      if (!validation.success) throw new Error('Validation failed: ' + JSON.stringify(validation.errors));

      await this.generationJobService.completeJob(job.id, validation.data);
      this.logger.log(`Video script generated, job ${job.id}`);
      return validation.data as VideoScript;
    } catch (error: any) {
      await this.generationJobService.failJob(job.id, error.message);
      throw error;
    }
  }
}
