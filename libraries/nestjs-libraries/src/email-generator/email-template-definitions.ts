/**
 * Email template definitions for Email Campaign Generator.
 * Data-driven template catalog following the pattern of ad-template-definitions.ts.
 */

export const EMAIL_TEMPLATE_SCHEMA_VERSION = '1.0.0';

export type EmailTemplateBlockRole =
  | 'header_logo'
  | 'header_image'
  | 'heading'
  | 'text'
  | 'carousel'
  | 'cta'
  | 'divider'
  | 'social_links'
  | 'footer'
  | 'spacer';

export type EmailTemplateStructure = {
  role: EmailTemplateBlockRole;
  description: string;
  isRequired: boolean;
  blockType: string;
};

export type EmailTemplateDefinition = {
  id: string;
  label: string;
  labelEn: string;
  description: string;
  version: string;
  active: boolean;
  category: 'newsletter' | 'welcome' | 'promotional';
  blockStructure: EmailTemplateStructure[];
  copyStrategy: {
    subjectApproach: string;
    preheaderApproach: string;
    bodyApproach: string;
    ctaApproach: string;
  };
  promptInstruction: string;
  exampleSubjects: string[];
};

export const emailTemplateDefinitions: EmailTemplateDefinition[] = [
  // 1. Newsletter based on carousel
  {
    id: 'newsletter-carousel',
    label: 'Newsletter Baseada em Carrossel',
    labelEn: 'Carousel Newsletter',
    description: 'Newsletter that presents multiple content items in card/carousel format. Ideal for weekly content digest.',
    version: '1.0.0',
    active: true,
    category: 'newsletter',
    blockStructure: [
      { role: 'header_logo', description: 'Brand logo at top', isRequired: true, blockType: 'image' },
      { role: 'heading', description: 'Newsletter main title', isRequired: true, blockType: 'heading' },
      { role: 'text', description: 'Introduction/context text', isRequired: true, blockType: 'text' },
      { role: 'carousel', description: 'Content cards (3-6 items)', isRequired: true, blockType: 'carousel' },
      { role: 'divider', description: 'Separator before CTA', isRequired: false, blockType: 'divider' },
      { role: 'cta', description: 'Primary CTA (read more, access content)', isRequired: true, blockType: 'cta' },
      { role: 'social_links', description: 'Social media links', isRequired: false, blockType: 'social_links' },
      { role: 'footer', description: 'Footer with unsubscribe', isRequired: true, blockType: 'text' },
    ],
    copyStrategy: {
      subjectApproach: 'Use newsletter main theme + curiosity hook. Ex: "Weekly [Brand]: 5 tips for [topic]"',
      preheaderApproach: 'One-line summary of the best content in this edition',
      bodyApproach: 'Brief introduction contextualizing the content. Friendly, direct tone. Each card should have a catchy title + 2-3 line summary.',
      ctaApproach: 'Clear CTA: "Read all articles" or "Access full content"',
    },
    promptInstruction: 'Generate a carousel-format newsletter from the provided content. Each card should contain: catchy title, 2-3 sentence summary, and link. The tone should be [TONE]. The newsletter should have 3-6 content cards, each derived from an approved content piece.',
    exampleSubjects: [
      '📰 Weekly [Brand]: The news you need to know',
      '[Brand] Digest: 5 ideas to transform your business',
    ],
  },

  // 2. Welcome sequence
  {
    id: 'welcome-sequence',
    label: 'Sequência de Boas-Vindas',
    labelEn: 'Welcome Sequence',
    description: 'Series of 3-5 welcome emails that introduce the brand gradually. Each email has a specific goal.',
    version: '1.0.0',
    active: true,
    category: 'welcome',
    blockStructure: [
      { role: 'header_logo', description: 'Brand logo', isRequired: true, blockType: 'image' },
      { role: 'heading', description: 'Welcome title', isRequired: true, blockType: 'heading' },
      { role: 'text', description: 'Personalized introduction text', isRequired: true, blockType: 'text' },
      { role: 'cta', description: 'Contextual CTA (varies by sequence email)', isRequired: true, blockType: 'cta' },
      { role: 'footer', description: 'Footer with unsubscribe', isRequired: true, blockType: 'text' },
    ],
    copyStrategy: {
      subjectApproach: 'Email 1: "Welcome to [Brand]! 🎉" / Email 2: "About what we do..." / Email 3: "Your next step"',
      preheaderApproach: 'Varies by email — from gratitude to call to action',
      bodyApproach: 'Warm and welcoming tone. Email 1: introduction + expectations. Email 2: values + value proposition. Email 3: main CTA + offer.',
      ctaApproach: 'Progressive: "Explore" → "Learn more" → "Get started"',
    },
    promptInstruction: 'Generate a sequence of [N] welcome emails for [BRAND]. Email 1: welcome + expectations. Email 2: brand introduction and value proposition. Email 3+: value content + progressive CTA. The tone should be [TONE]. Each email should be independent but cohesive.',
    exampleSubjects: [
      '👋 Welcome to [Brand]! We\'re happy to have you here',
      '💡 What makes [Brand] different',
      '🚀 Ready to start? Here\'s your next step',
    ],
  },

  // 3. Promotional campaign
  {
    id: 'promotional-campaign',
    label: 'Campanha Promocional',
    labelEn: 'Promotional Campaign',
    description: 'High-impact email for promoting offers, launches, or events. Focus on conversion with clear CTA.',
    version: '1.0.0',
    active: true,
    category: 'promotional',
    blockStructure: [
      { role: 'header_image', description: 'Promotional banner highlight', isRequired: true, blockType: 'image' },
      { role: 'heading', description: 'Promotion/offer title', isRequired: true, blockType: 'heading' },
      { role: 'text', description: 'Offer description with benefits', isRequired: true, blockType: 'text' },
      { role: 'cta', description: 'Conversion CTA (Buy, Subscribe, etc.)', isRequired: true, blockType: 'cta' },
      { role: 'text', description: 'Social proof or testimonial', isRequired: false, blockType: 'text' },
      { role: 'divider', description: 'Separator', isRequired: false, blockType: 'divider' },
      { role: 'text', description: 'Terms or urgency (deadline, limited)', isRequired: false, blockType: 'text' },
      { role: 'footer', description: 'Footer with unsubscribe', isRequired: true, blockType: 'text' },
    ],
    copyStrategy: {
      subjectApproach: 'Urgency + Benefit. Ex: "🔥 [X]% OFF on [Product] — only until [date]"',
      preheaderApproach: 'Reinforce the offer in 1 line: "Exclusive limited-time offer"',
      bodyApproach: 'Focus on main benefit. Use numbers and data. Social proof. Scarcity/time limit.',
      ctaApproach: 'Direct and clear CTA: "Get the offer", "Secure my spot", "Buy now"',
    },
    promptInstruction: 'Generate a promotional email for [BRAND] promoting [OFFER]. The email should have: eye-catching banner, title with urgency, benefit-focused description, social proof if available, clear conversion CTA. Tone: [TONE]. Include urgency.',
    exampleSubjects: [
      '🔥 Exclusive offer: [X]% OFF on [Product] — only until [date]',
      '🚀 Launch: [Product/Service] available now!',
    ],
  },
];

// ---- Helper functions ----

export function getEmailTemplateById(id: string): EmailTemplateDefinition | undefined {
  return emailTemplateDefinitions.find(t => t.id === id);
}

export function getEmailTemplatesByCategory(category: string): EmailTemplateDefinition[] {
  return emailTemplateDefinitions.filter(t => t.category === category && t.active);
}

export function getActiveEmailTemplates(): EmailTemplateDefinition[] {
  return emailTemplateDefinitions.filter(t => t.active);
}
