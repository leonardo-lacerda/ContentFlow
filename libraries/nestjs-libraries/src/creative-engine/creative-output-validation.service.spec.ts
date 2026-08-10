import { BadRequestException } from '@nestjs/common';
import { CreativeOutputValidationService } from './creative-output-validation.service';

describe('CreativeOutputValidationService', () => {
  const service = new CreativeOutputValidationService();

  it('accepts a valid video envelope', () => {
    expect(service.validate('video-generation', {
      provider: 'test',
      model: 'model',
      url: 'https://cdn.example.com/video.mp4',
    }).url).toContain('.mp4');
  });

  it('rejects missing media outputs', () => {
    expect(() => service.validate('video-generation', {
      provider: 'test',
      model: 'model',
    })).toThrow(BadRequestException);
  });

  it('requires SRT output for captions', () => {
    expect(() => service.validateTool('captions', {
      url: 'https://cdn.example.com/captions.txt',
      mimeType: 'text/plain',
    })).toThrow(BadRequestException);
  });
});
