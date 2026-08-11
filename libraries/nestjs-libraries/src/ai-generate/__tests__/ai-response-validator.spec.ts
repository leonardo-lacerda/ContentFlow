import { validateAiResponse, buildAiMetadata, getPromptVersion } from '../ai-response-validator';

const validVideoScript = {
  title: 'Test Video',
  platform: 'Instagram Reels',
  format: 'REELS',
  language: 'pt-BR',
  totalDurationSec: 15,
  scenes: [
    { index: 0, durationSec: 5, headline: 'Hook', body: 'Text', motionNotes: 'Zoom' },
    { index: 1, durationSec: 10, headline: 'Info', body: 'Details', motionNotes: 'Pan' },
  ],
};

const validSocialPost = {
  posts: [{
    platform: 'instagram',
    content: 'Hello world!',
    hashtags: ['test'],
    tone: 'casual',
    charCount: 12,
    rationale: 'The direct message is easy to understand.',
    hookAnalysis: 'The opening is short and clear.',
    platformOptimization: 'The format works well for Instagram.',
    visualGuidance: [{ type: 'photo', description: 'Product in use', style: 'clean', colors: null, textOverlay: null }],
    engagementStrategy: { technique: 'question hook', explanation: 'Invites replies.', expectedOutcome: 'Comments' },
    postingStrategy: { bestTime: '12:00', bestDay: 'Tuesday', frequency: 'Weekly', repurposeSuggestions: ['Story'] },
    growthTips: [
      { category: 'engagement', tip: 'Reply quickly', impact: 'quick-win' },
      { category: 'repurposing', tip: 'Reuse the hook', impact: 'medium-term' },
    ],
    expectedEngagement: { likes: '10-20', comments: '2-5', shares: '1-3', notes: 'Benchmark' },
  }],
};

const validAdCreative = {
  ads: [{
    platform: 'META_INSTAGRAM',
    type: 'STATIC',
    objective: 'CONVERSION',
    headline: 'Buy now!',
    primaryText: 'Great deal',
    ctaButton: 'SHOP_NOW',
    rationale: 'The offer-focused message reduces friction.',
    emotionalHook: 'Desire for a better outcome',
    platformOptimization: 'Short copy fits the placement.',
    targeting: [{ audience: 'Shoppers', demographics: 'Adults', interests: ['shopping'], exclusions: null, rationale: 'Relevant audience' }],
    abTests: [{ variant: 'headline', currentValue: 'Buy now!', suggestedAlternative: 'Get yours', hypothesis: 'Benefit-led copy may improve clicks' }],
    growthTips: [
      { category: 'creative', tip: 'Test a close-up', impact: 'quick-win' },
      { category: 'targeting', tip: 'Retarget visitors', impact: 'medium-term' },
    ],
    preLaunchChecklist: ['Check URL', 'Review policy'],
    expectedMetrics: { ctr: '1-2%', cpc: '$1', conversionRate: '2-4%', notes: 'Benchmark' },
    policyWarnings: [],
    claimsFlags: [],
  }],
};

const validEmailCampaign = {
  type: 'NEWSLETTER',
  name: 'Monthly newsletter',
  subject: 'Welcome!',
  blocks: [{ type: 'text', content: 'Hello' }],
};

describe('validateAiResponse', () => {
  describe('video-script schema', () => {
    const validScript = JSON.stringify(validVideoScript);

    it('should validate correct video script JSON', () => {
      const result = validateAiResponse('video-script', validScript);
      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
      expect(result.schemaVersion).toBe('2.0.0');
    });

    it('should handle markdown-fenced JSON', () => {
      const fenced = '```json\n' + validScript + '\n```';
      expect(validateAiResponse('video-script', fenced).success).toBe(true);
    });

    it('should reject invalid JSON', () => {
      expect(validateAiResponse('video-script', 'not json at all').success).toBe(false);
    });

    it('should accept a single valid scene', () => {
      const invalid = JSON.stringify({ ...validVideoScript, scenes: [validVideoScript.scenes[0]] });
      expect(validateAiResponse('video-script', invalid).success).toBe(true);
    });
  });

  describe('social-post schema', () => {
    it('should validate correct social post', () => {
      expect(validateAiResponse('social-post', JSON.stringify(validSocialPost)).success).toBe(true);
    });

    it('should reject empty posts', () => {
      expect(validateAiResponse('social-post', '{"posts":[]}').success).toBe(false);
    });
  });

  describe('ad-creative schema', () => {
    it('should validate correct ad creative', () => {
      expect(validateAiResponse('ad-creative', JSON.stringify(validAdCreative)).success).toBe(true);
    });
  });

  describe('email-campaign schema', () => {
    it('should validate correct email campaign', () => {
      expect(validateAiResponse('email-campaign', JSON.stringify(validEmailCampaign)).success).toBe(true);
    });
  });

  describe('unknown schema type', () => {
    it('should return failure for unknown schema', () => {
      expect(validateAiResponse('nonexistent' as any, '{}').success).toBe(false);
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
      schemaVersion: '2.0.0',
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
  it('should return the current prompt version for known schema types', () => {
    expect(getPromptVersion('social-post')).toBe('1.0.0');
    expect(getPromptVersion('video-script')).toBe('1.0.0');
  });

  it('should return 0.0.0 for unknown types', () => {
    expect(getPromptVersion('unknown-type' as any)).toBe('0.0.0');
  });
});
