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
    creatives: [
      {
        platform: 'meta_instagram',
        type: 'static',
        headline: 'Buy Now!',
        primaryText: 'Great deal on shoes',
        ctaButton: 'Shop Now',
        policyWarnings: [],
      },
    ],
  };

  it('should validate a correct ad creative batch', () => {
    const result = validateAdCreative(validBatch);
    expect(result.success).toBe(true);
    expect(result.data?.creatives).toHaveLength(1);
    expect(result.data?.creatives[0].platform).toBe('meta_instagram');
  });

  it('should reject empty creatives array', () => {
    const result = validateAdCreative({ creatives: [] });
    expect(result.success).toBe(false);
  });

  it('should validate carousel ad type', () => {
    const carousel = {
      creatives: [
        {
          platform: 'linkedin',
          type: 'carousel',
          headline: 'Product Showcase',
          primaryText: 'See our range',
          ctaButton: 'Learn More',
          slideCount: 3,
          slides: [
            { headline: 'Slide 1', body: 'Content 1' },
            { headline: 'Slide 2', body: 'Content 2' },
          ],
        },
      ],
    };
    const result = validateAdCreative(carousel);
    expect(result.success).toBe(true);
  });

  it('should parse valid data correctly', () => {
    const data = parseAdCreative(validBatch);
    expect(data.creatives[0].headline).toBe('Buy Now!');
  });
});

describe('Email Campaign Schema', () => {
  const validCampaign = {
    subject: 'Welcome to our newsletter',
    preheader: 'Monthly updates from ContentFlow',
    blocks: [
      { type: 'heading' as const, text: 'Hello!', level: 1 },
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
      subject: 'Test',
      blocks: [
        { type: 'divider' },
        { type: 'spacer', height: 30 },
        { type: 'image', url: 'https://example.com/img.png', alt: 'Test' },
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
    totalDuration: 30,
    scenes: [
      {
        sceneNumber: 1,
        duration: 5,
        headline: 'Hook',
        body: 'Check this out!',
        visualNotes: 'Zoom in on product',
      },
      {
        sceneNumber: 2,
        duration: 10,
        headline: 'Features',
        body: 'Amazing features',
        visualNotes: 'Pan left across features',
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
    expect(result.data?.totalDuration).toBe(30);
  });

  it('should reject script with less than 2 scenes', () => {
    const result = validateVideoScript({
      title: 'Short',
      totalDuration: 5,
      scenes: [{ sceneNumber: 1, duration: 5, headline: 'Hook', body: 'Hi', visualNotes: 'Static' }],
    });
    expect(result.success).toBe(false);
  });

  it('should validate with optional fields', () => {
    const minimal = {
      title: 'Quick Video',
      totalDuration: 10,
      scenes: [
        { sceneNumber: 1, duration: 5, headline: 'A', body: 'B', visualNotes: 'C' },
        { sceneNumber: 2, duration: 5, headline: 'D', body: 'E', visualNotes: 'F' },
      ],
    };
    const result = validateVideoScript(minimal);
    expect(result.success).toBe(true);
    expect(result.data?.narration).toBeUndefined();
  });

  it('should parse valid data correctly', () => {
    const data = parseVideoScript(validScript);
    expect(data.title).toBe('Product Demo Reel');
    expect(data.scenes[0].transition).toBeUndefined();
  });
});
