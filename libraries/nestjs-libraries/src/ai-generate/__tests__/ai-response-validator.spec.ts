import { validateAiResponse, buildAiMetadata, getPromptVersion } from '../ai-response-validator';

describe('validateAiResponse', () => {
  describe('video-script schema', () => {
    const validScript = JSON.stringify({
      title: 'Test Video',
      totalDuration: 30,
      scenes: [
        { sceneNumber: 1, duration: 5, headline: 'Hook', body: 'Text', visualNotes: 'Zoom' },
        { sceneNumber: 2, duration: 10, headline: 'Info', body: 'Details', visualNotes: 'Pan' },
      ],
    });

    it('should validate correct video script JSON', () => {
      const result = validateAiResponse('video-script', validScript);
      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
      expect(result.schemaVersion).toBe('1.0.0');
    });

    it('should handle markdown-fenced JSON', () => {
      const fenced = '```json\n' + validScript + '\n```';
      const result = validateAiResponse('video-script', fenced);
      expect(result.success).toBe(true);
    });

    it('should reject invalid JSON', () => {
      const result = validateAiResponse('video-script', 'not json at all');
      expect(result.success).toBe(false);
    });

    it('should reject script with less than 2 scenes', () => {
      const invalid = JSON.stringify({
        title: 'Short',
        totalDuration: 5,
        scenes: [{ sceneNumber: 1, duration: 5, headline: 'A', body: 'B', visualNotes: 'C' }],
      });
      const result = validateAiResponse('video-script', invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('social-post schema', () => {
    const validPost = JSON.stringify({
      posts: [
        {
          platform: 'instagram',
          content: 'Hello world!',
          hashtags: ['test'],
          tone: 'casual',
          charCount: 12,
        },
      ],
    });

    it('should validate correct social post', () => {
      const result = validateAiResponse('social-post', validPost);
      expect(result.success).toBe(true);
    });

    it('should reject empty posts', () => {
      const result = validateAiResponse('social-post', '{"posts":[]}');
      expect(result.success).toBe(false);
    });
  });

  describe('ad-creative schema', () => {
    const validAd = JSON.stringify({
      creatives: [
        {
          platform: 'meta_instagram',
          type: 'static',
          headline: 'Buy now!',
          primaryText: 'Great deal',
          ctaButton: 'Shop Now',
        },
      ],
    });

    it('should validate correct ad creative', () => {
      const result = validateAiResponse('ad-creative', validAd);
      expect(result.success).toBe(true);
    });
  });

  describe('email-campaign schema', () => {
    const validEmail = JSON.stringify({
      subject: 'Welcome!',
      blocks: [{ type: 'text', content: 'Hello' }],
    });

    it('should validate correct email campaign', () => {
      const result = validateAiResponse('email-campaign', validEmail);
      expect(result.success).toBe(true);
    });
  });

  describe('unknown schema type', () => {
    it('should return failure for unknown schema', () => {
      const result = validateAiResponse('nonexistent' as any, '{}');
      expect(result.success).toBe(false);
    });
  });
});

describe('buildAiMetadata', () => {
  it('should build metadata with all fields', () => {
    const meta = buildAiMetadata('video-script', 'gpt-4.1', 'openai', { tokens: 100 }, { cost: 0.01 });
    expect(meta).toEqual({
      model: 'gpt-4.1',
      provider: 'openai',
      promptVersion: expect.any(String),
      schemaVersion: '1.0.0',
      usage: { tokens: 100 },
      costEstimate: { cost: 0.01 },
    });
  });

  it('should handle missing usage and cost', () => {
    const meta = buildAiMetadata('social-post', 'gpt-4', 'openai');
    expect(meta.usage).toBeUndefined();
    expect(meta.costEstimate).toBeUndefined();
  });
});

describe('getPromptVersion', () => {
  it('should return 1.0.0 for known schema types', () => {
    expect(getPromptVersion('social-post')).toBe('1.0.0');
    expect(getPromptVersion('video-script')).toBe('0.0.0'); // Not in the versions map yet
  });

  it('should return 0.0.0 for unknown types', () => {
    expect(getPromptVersion('unknown-type' as any)).toBe('0.0.0');
  });
});
