import { BadRequestException, Injectable } from '@nestjs/common';
import { CreativeCapability, CreativeProviderOutput } from './creative-engine.types';

const MAX_OUTPUT_BYTES = 1024 * 1024 * 1024;

@Injectable()
export class CreativeOutputValidationService {
  validate(capability: CreativeCapability, output: CreativeProviderOutput) {
    if (!output || !output.provider || !output.model) {
      throw new BadRequestException('Creative provider returned an incomplete output envelope');
    }
    const url = output.url || output.audioUrl;
    const urlRequired = !['translation'].includes(capability);
    if (urlRequired && !url) {
      throw new BadRequestException(`Creative provider returned no output URL for ${capability}`);
    }
    if (url && !/^https?:\/\//i.test(url)) {
      throw new BadRequestException('Creative output URL must use HTTP or HTTPS');
    }
    const duration = Number(output.metadata?.durationSec ?? output.metadata?.duration ?? 0);
    if (duration < 0 || duration > 180) {
      throw new BadRequestException('Creative output duration is outside the allowed range');
    }
    const sizeBytes = Number(output.metadata?.sizeBytes ?? output.metadata?.fileSize ?? 0);
    if (sizeBytes < 0 || sizeBytes > MAX_OUTPUT_BYTES) {
      throw new BadRequestException('Creative output exceeds the allowed size');
    }
    const mimeType = String(output.metadata?.mimeType || '').toLowerCase();
    if (mimeType) {
      const expected = capability === 'image-generation' ? 'image/'
        : ['text-to-speech'].includes(capability) ? 'audio/'
          : ['translation', 'captions'].includes(capability) ? '' : 'video/';
      if (expected && !mimeType.startsWith(expected)) throw new BadRequestException(`Creative output MIME type must be ${expected}`);
    }
    return output;
  }

  validateTool(tool: string, output: { url?: string; mimeType?: string; metadata?: Record<string, unknown> }) {
    if (!output) throw new BadRequestException('Creative tool returned no output');
    if (output.url && !/^https?:\/\//i.test(output.url)) {
      throw new BadRequestException('Creative tool output URL must use HTTP or HTTPS');
    }
    const sizeBytes = Number(output.metadata?.sizeBytes ?? output.metadata?.fileSize ?? 0);
    if (sizeBytes < 0 || sizeBytes > MAX_OUTPUT_BYTES) throw new BadRequestException('Creative tool output exceeds the allowed size');
    if (['resize', 'trim', 'merge', 'compose', 'scene-render'].includes(tool) && !output.url) {
      throw new BadRequestException(`Creative tool ${tool} returned no media URL`);
    }
    if (tool === 'captions' && !['application/x-subrip', 'text/vtt'].includes(output.mimeType || '')) {
      throw new BadRequestException('Captions tool must return an SRT or VTT asset');
    }
    return output;
  }
}
