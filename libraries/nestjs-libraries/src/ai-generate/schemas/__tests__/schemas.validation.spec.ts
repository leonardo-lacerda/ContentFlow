import { validate as validateSocialPost, parse as parseSocialPost } from '../social-post.schema';
import { validate as validateAdCreative, parse as parseAdCreative } from '../ad-creative.schema';
import { validate as validateEmailCampaign, parse as parseEmailCampaign } from '../email-campaign.schema';
import { validate as validateVideoScript, parse as parseVideoScript } from '../video-script.schema';

describe('Social Post Schema', () => {
  const validPost = {
    posts: [
      {
        platform: 'instagram',
        content: 'Check out our new product!',
        hashtags: ['marketing', 'newproduct'],
        cta: 'Link in bio',
        tone: 'professional',
        charCount: 150,
        rationale: 'A clear product benefit creates a practical reason to engage.',
        hookAnalysis: 'The direct opening immediately communicates the value.',
        platformOptimization: 'Line breaks and saves-oriented language fit Instagram.',
        visualGuidance: [{ type: 'photo', description: 'Product in use', style: 'clean', colors: null, textOverlay: null }],
        engagementStrategy: {
          technique: 'question hook',
          explanation: 'Invites the audience to share their experience.',
          expectedOutcome: 'Comments and saves',
        },
        postingStrategy: {
          bestTime: '12:00',
          bestDay: 'Tuesday',
          frequency: 'Weekly',
          repurposeSuggestions: ['Turn into a story poll'],
        },
        growthTips: [
          { category: 'engagement', tip: 'Reply to early comments', impact: 'quick-win' },
          { category: 'repurposing', tip: 'Reuse the hook in a Reel', impact: 'medium-term' },
        ],
        expectedEngagement: {
          likes: '100-200',
          comments: '10-20',
          shares: '5-10',
          notes: 'Illustrative benchmark',
        },
      },
    ],
  };

  it('should validate a correct social post batch', () => {
    const result = validateSocialPost(validPost);
    expect(result.success).toBe(true);
    expect(result.data?.posts).toHaveLength(1);
    expect(result.data?.posts[0].platform).toBe('instagram');
  });

  it('should reject empty posts array', () => {
    const result = validateSocialPost({ posts: [] });
    expect(result.success).toBe(false);
  });

  it('should reject post without platform', () => {
    const result = validateSocialPost({
      posts: [{ content: 'test', hashtags: [], tone: 'casual', charCount: 10 }],
    });
    expect(result.success).toBe(false);
  });

  it('should parse valid data correctly', () => {
    const data = parseSocialPost(validPost);
    expect(data.posts[0].content).toBe('Check out our new product!');
  });

  it('should throw on invalid data', () => {
    expect(() => parseSocialPost({})).toThrow();
  });
});

describe('Ad Creative Schema', () => {
  const validBatch = {
    ads: [
      {
        platform: 'META_INSTAGRAM',
        type: 'STATIC',
        objective: 'CONVERSION',
        headline: 'Buy Now!',
        primaryText: 'Great deal on shoes',
        ctaButton: 'Shop Now',
        rationale: 'The offer-focused copy reduces friction.',
        emotionalHook: 'Desire for a better outcome',
        platformOptimization: 'Short copy fits Instagram placements.',
        targeting: [{ audience: 'Shoe shoppers', demographics: 'Adults', interests: ['shoes'], exclusions: null, rationale: 'Relevant audience' }],
        abTests: [{ variant: 'headline', currentValue: 'Buy Now!', suggestedAlternative: 'Walk further', hypothesis: 'Benefit-led copy may improve clicks' }],
        growthTips: [
          { category: 'creative', tip: 'Test a product close-up', impact: 'quick-win' },
          { category: 'targeting', tip: 'Build a retargeting audience', impact: 'medium-term' },
        ],
        preLaunchChecklist: ['Check destination URL', 'Review policy warnings'],
        expectedMetrics: { ctr: '1-2%', cpc: '$1', conversionRate: '2-4%', notes: 'Illustrative benchmark' },
        policyWarnings: [],
        claimsFlags: [],
      },
    ],
  };

  it('should validate a correct ad creative batch', () => {
    const result = validateAdCreative(validBatch);
    expect(result.success).toBe(true);
    expect(result.data?.ads).toHaveLength(1);
    expect(result.data?.ads[0].platform).toBe('META_INSTAGRAM');
  });

  it('should reject empty creatives array', () => {
    const result = validateAdCreative({ ads: [] });
    expect(result.success).toBe(false);
  });

  it('should validate carousel ad type', () => {
    const carousel = {
      ads: [
        {
          platform: 'LINKEDIN',
          type: 'CAROUSEL',
          objective: 'AWARENESS',
          headline: 'Product Showcase',
          primaryText: 'See our range',
          ctaButton: 'Learn More',
          rationale: 'A showcase makes the range easy to understand.',
          emotionalHook: 'Curiosity',
          platformOptimization: 'Professional framing suits LinkedIn.',
          slideCount: 3,
          slides: [
            { index: 0, headline: 'Slide 1', body: 'Content 1' },
            { index: 1, headline: 'Slide 2', body: 'Content 2' },
          ],
          targeting: [{ audience: 'Decision makers', demographics: 'Adults', interests: ['business'], exclusions: null, rationale: 'Relevant audience' }],
          abTests: [{ variant: 'headline', currentValue: 'Product Showcase', suggestedAlternative: 'See the difference', hypothesis: 'Clearer promise may improve attention' }],
          growthTips: [
            { category: 'creative', tip: 'Use a strong cover', impact: 'quick-win' },
            { category: 'engagement', tip: 'Ask for opinions', impact: 'medium-term' },
          ],
          preLaunchChecklist: ['Review every slide', 'Check the CTA'],
          expectedMetrics: { ctr: '1-2%', cpc: '$2', conversionRate: '1-3%', notes: 'Illustrative benchmark' },
          policyWarnings: [],
          claimsFlags: [],
        },
      ],
    };
    const result = validateAdCreative(carousel);
    expect(result.success).toBe(true);
  });

  it('should parse valid data correctly', () => {
    const data = parseAdCreative(validBatch);
    expect(data.ads[0].headline).toBe('Buy Now!');
  });
});

describe('Email Campaign Schema', () => {
  const validCampaign = {
    type: 'NEWSLETTER' as const,
    name: 'Monthly newsletter',
    subject: 'Welcome to our newsletter',
    preheader: 'Monthly updates from ContentFlow',
    blocks: [
      { type: 'heading' as const, content: 'Hello!', level: 'h1' as const },
      { type: 'text' as const, content: 'Welcome aboard.' },
      { type: 'cta' as const, text: 'Get Started', url: 'https://example.com' },
    ],
    ctaText: 'Get Started',
    ctaUrl: 'https://example.com',
    ctaColor: '#3b82f6',
  };

  it('should validate a correct email campaign', () => {
    const result = validateEmailCampaign(validCampaign);
    expect(result.success).toBe(true);
    expect(result.data?.subject).toBe('Welcome to our newsletter');
    expect(result.data?.blocks).toHaveLength(3);
  });

  it('should reject campaign without blocks', () => {
    const result = validateEmailCampaign({ subject: 'test', blocks: [] });
    expect(result.success).toBe(false);
  });

  it('should validate block types correctly', () => {
    const campaign = {
      type: 'NEWSLETTER' as const,
      name: 'Test campaign',
      subject: 'Test',
      blocks: [
        { type: 'divider' },
        { type: 'spacer', height: 30 },
      { type: 'image', src: 'https://example.com/img.png', alt: 'Test' },
      ],
    };
    const result = validateEmailCampaign(campaign);
    expect(result.success).toBe(true);
  });

  it('should parse valid data correctly', () => {
    const data = parseEmailCampaign(validCampaign);
    expect(data.ctaText).toBe('Get Started');
  });
});

describe('Video Script Schema', () => {
  const validScript = {
    title: 'Product Demo Reel',
    platform: 'Instagram Reels',
    format: 'REELS',
    language: 'pt-BR',
    totalDurationSec: 15,
    scenes: [
      {
        index: 0,
        durationSec: 5,
        headline: 'Hook',
        body: 'Check this out!',
        motionNotes: 'Zoom in on product',
      },
      {
        index: 1,
        durationSec: 10,
        headline: 'Features',
        body: 'Amazing features',
        motionNotes: 'Pan left across features',
      },
    ],
    narration: 'Check this out! Amazing features await.',
    hashtags: ['product', 'demo'],
    caption: 'New product demo!',
  };

  it('should validate a correct video script', () => {
    const result = validateVideoScript(validScript);
    expect(result.success).toBe(true);
    expect(result.data?.scenes).toHaveLength(2);
    expect(result.data?.totalDurationSec).toBe(15);
  });

  it('should accept a script with one scene', () => {
    const result = validateVideoScript({
      title: 'Short',
      platform: 'Reels',
      format: 'REELS',
      language: 'pt-BR',
      totalDurationSec: 5,
      scenes: [{ index: 0, durationSec: 5, headline: 'Hook', body: 'Hi', motionNotes: 'Static' }],
    });
    expect(result.success).toBe(true);
  });

  it('should validate with optional fields', () => {
    const minimal = {
      title: 'Quick Video',
      platform: 'TikTok',
      format: 'TIKTOK',
      language: 'pt-BR',
      totalDurationSec: 10,
      scenes: [
        { index: 0, durationSec: 5, headline: 'A', body: 'B', motionNotes: 'C' },
        { index: 1, durationSec: 5, headline: 'D', body: 'E', motionNotes: 'F' },
      ],
    };
    const result = validateVideoScript(minimal);
    expect(result.success).toBe(true);
    expect(result.data?.narration).toBeUndefined();
  });

  it('should parse valid data correctly', () => {
    const data = parseVideoScript(validScript);
    expect(data.title).toBe('Product Demo Reel');
    expect(data.scenes[0].transition).toBe('crossfade');
  });
});
