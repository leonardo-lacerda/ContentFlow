/**
 * Ad Template Definitions — ContentFlow Ads Generator v1.0.0
 *
 * Data-driven ad template catalog. Each template defines a narrative
 * structure, ad copy strategy, and policy checks specific to paid advertising.
 */

export const AD_TEMPLATE_SCHEMA_VERSION = '1.0.0';

export type AdTemplateSlideRole =
  | 'hook'
  | 'problem'
  | 'solution'
  | 'proof'
  | 'benefit'
  | 'comparison'
  | 'offer'
  | 'testimonial'
  | 'cta';

export type AdTemplateSlideRule = {
  role: AdTemplateSlideRole;
  description: string;
  maxHeadlineChars: number;
  maxBodyChars: number;
  isRequired: boolean;
};

export type AdPolicyCheck = {
  id: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  pattern?: string;
  message: string;
  platforms?: string[];
  category: string;
};

export type AdTemplateDefinition = {
  id: string;
  label: string;
  labelEn: string;
  description: string;
  version: string;
  active: boolean;
  category: string;
  objective: string[];
  preferredPlatforms: string[];
  slideStructure: AdTemplateSlideRule[];
  copyStrategy: {
    headlineApproach: string;
    primaryTextApproach: string;
    descriptionApproach: string;
    ctaRecommendation: string;
  };
  promptInstruction: string;
  policyChecks: AdPolicyCheck[];
  exampleHeadlines: string[];
  examplePrimaryTexts: string[];
};

export const adTemplateDefinitions: AdTemplateDefinition[] = [
  // 1. PROBLEM → SOLUTION
  {
    id: 'problem-solution',
    label: 'Problema → Solução',
    labelEn: 'Problem → Solution',
    description:
      'Ad that identifies a clear pain point and presents the product/service as the direct solution.',
    version: '1.0.0',
    active: true,
    category: 'conversion',
    objective: ['CONVERSION', 'TRAFFIC', 'CONSIDERATION'],
    preferredPlatforms: ['META_FACEBOOK', 'META_INSTAGRAM', 'LINKEDIN'],
    slideStructure: [
      { role: 'hook', description: 'Hook that identifies the pain', maxHeadlineChars: 125, maxBodyChars: 0, isRequired: true },
      { role: 'problem', description: 'Deepen the problem/pain point', maxHeadlineChars: 125, maxBodyChars: 150, isRequired: true },
      { role: 'solution', description: 'Present product as solution', maxHeadlineChars: 125, maxBodyChars: 150, isRequired: true },
      { role: 'benefit', description: 'Main resulting benefit', maxHeadlineChars: 125, maxBodyChars: 100, isRequired: true },
      { role: 'cta', description: 'Direct CTA with offer', maxHeadlineChars: 125, maxBodyChars: 80, isRequired: true },
    ],
    copyStrategy: {
      headlineApproach: 'Short and direct, focused on pain or solution. Ex: "Tired of X? Discover Y"',
      primaryTextApproach: 'Start with pain, then present solution in 2-3 sentences',
      descriptionApproach: 'Reinforce the main benefit in one line',
      ctaRecommendation: 'LEARN_MORE or SIGN_UP',
    },
    promptInstruction:
      'Generate a Problem→Solution ad. Start with a hook identifying the main pain point. Deepen the problem in 1-2 sentences. Present the product/service as the direct solution. Highlight the main benefit. Close with a clear CTA.',
    policyChecks: [
      { id: 'ps-no-exaggeration', description: 'Check for alarmist language', severity: 'warning', message: 'Avoid excessively alarmist language about the problem.', category: 'tone' },
      { id: 'ps-solution-evidence', description: 'Check for proof backing the solution', severity: 'info', message: 'Consider adding social proof or data to validate the solution.', category: 'proof' },
    ],
    exampleHeadlines: ['Tired of losing time with X?', 'The problem nobody talks about with Y'],
    examplePrimaryTexts: [
      'Did you know 70% of professionals face this problem every day? Our solution was designed to eliminate it for good.',
    ],
  },

  // 2. SOCIAL PROOF
  {
    id: 'social-proof',
    label: 'Prova Social',
    labelEn: 'Social Proof',
    description:
      'Ad centered on testimonials, results, and credibility. Uses concrete proof (numbers, cases, testimonials) to build trust.',
    version: '1.0.0',
    active: true,
    category: 'proof',
    objective: ['CONSIDERATION', 'CONVERSION'],
    preferredPlatforms: ['META_FACEBOOK', 'META_INSTAGRAM', 'LINKEDIN'],
    slideStructure: [
      { role: 'hook', description: 'Hook with impressive data or result', maxHeadlineChars: 125, maxBodyChars: 0, isRequired: true },
      { role: 'proof', description: 'Concrete proof (number, case, result)', maxHeadlineChars: 125, maxBodyChars: 150, isRequired: true },
      { role: 'testimonial', description: 'Real customer testimonial or result', maxHeadlineChars: 125, maxBodyChars: 150, isRequired: true },
      { role: 'benefit', description: 'What the audience can expect', maxHeadlineChars: 125, maxBodyChars: 100, isRequired: true },
      { role: 'cta', description: 'CTA with subtle urgency', maxHeadlineChars: 125, maxBodyChars: 80, isRequired: true },
    ],
    copyStrategy: {
      headlineApproach: 'Use concrete numbers and results. Ex: "+500 businesses transformed"',
      primaryTextApproach: 'Start with the result, then show the path. Use quotes for testimonials.',
      descriptionApproach: 'Reinforce credibility (ex: "4.9/5 rating on Google")',
      ctaRecommendation: 'LEARN_MORE or GET_OFFER',
    },
    promptInstruction:
      'Generate a social proof ad. Start with a concrete result or impressive data point. Present a real case or testimonial. Highlight what the audience can achieve. Close with a CTA inviting them to try.',
    policyChecks: [
      { id: 'sp-no-fake-testimonials', description: 'Check testimonial authenticity', severity: 'critical', message: 'Fake testimonials violate Meta and LinkedIn policies.', category: 'testimonials' },
      { id: 'sp-no-misleading-numbers', description: 'Check for misleading numbers', severity: 'warning', message: 'Numbers must be verifiable and contextualized.', category: 'claims' },
    ],
    exampleHeadlines: ['+2,000 companies already use our solution', 'Proven result: 40% more productivity'],
    examplePrimaryTexts: [
      '"In 3 months, we tripled our results." — CEO, Company X. See how you can do the same.',
    ],
  },

  // 3. OFFER / PROMOTION
  {
    id: 'offer-promotion',
    label: 'Oferta / Promoção',
    labelEn: 'Offer / Promotion',
    description:
      'Ad focused on a specific offer with urgency. Ideal for promotions, launches, discounts, and seasonal campaigns.',
    version: '1.0.0',
    active: true,
    category: 'offer',
    objective: ['CONVERSION', 'TRAFFIC', 'AWARENESS'],
    preferredPlatforms: ['META_FACEBOOK', 'META_INSTAGRAM', 'LINKEDIN'],
    slideStructure: [
      { role: 'hook', description: 'Hook with the offer (discount, bonus, deadline)', maxHeadlineChars: 125, maxBodyChars: 0, isRequired: true },
      { role: 'benefit', description: 'What the customer gets from the offer', maxHeadlineChars: 125, maxBodyChars: 120, isRequired: true },
      { role: 'proof', description: 'Proof the offer is valuable', maxHeadlineChars: 125, maxBodyChars: 100, isRequired: false },
      { role: 'offer', description: 'Offer details (price, discount, bonus)', maxHeadlineChars: 125, maxBodyChars: 100, isRequired: true },
      { role: 'cta', description: 'Urgent CTA with deadline', maxHeadlineChars: 125, maxBodyChars: 80, isRequired: true },
    ],
    copyStrategy: {
      headlineApproach: 'Highlight the discount or offer. Ex: "50% OFF — Last 2 days"',
      primaryTextApproach: 'Start with the offer, show value, create urgency',
      descriptionApproach: 'Reinforce urgency or exclusivity',
      ctaRecommendation: 'SHOP_NOW, GET_OFFER or SIGN_UP',
    },
    promptInstruction:
      'Generate an offer/promotion ad. Start with the main offer (discount, bonus, special condition). Show the value the customer receives. Create urgency with a deadline or scarcity. Close with an immediate action CTA.',
    policyChecks: [
      { id: 'of-no-fake-urgency', description: 'Check for fake urgency', severity: 'warning', message: 'False urgency (fake scarcity) violates advertising policies.', category: 'claims' },
      { id: 'of-no-misleading-pricing', description: 'Check for misleading pricing', severity: 'critical', message: 'Promotional prices must be real and verifiable.', category: 'pricing' },
    ],
    exampleHeadlines: ['50% OFF — Only until Friday', 'Free plan for 30 days'],
    examplePrimaryTexts: [
      'Take advantage of our biggest promotion of the year: 50% off all plans. Offer valid until 06/30.',
    ],
  },

  // 4. COMPARISON / BEFORE-AFTER
  {
    id: 'comparison',
    label: 'Comparação / Antes & Depois',
    labelEn: 'Comparison / Before & After',
    description:
      'Ad that compares the "before" (problem) with the "after" (solution). Can include competitor comparison or customer transformation.',
    version: '1.0.0',
    active: true,
    category: 'conversion',
    objective: ['CONVERSION', 'CONSIDERATION', 'TRAFFIC'],
    preferredPlatforms: ['META_FACEBOOK', 'META_INSTAGRAM'],
    slideStructure: [
      { role: 'hook', description: 'Hook: "Still doing X?"', maxHeadlineChars: 125, maxBodyChars: 0, isRequired: true },
      { role: 'problem', description: 'Current state (before) — pain, difficulty', maxHeadlineChars: 125, maxBodyChars: 120, isRequired: true },
      { role: 'comparison', description: 'Visual/verbal contrast before vs after', maxHeadlineChars: 125, maxBodyChars: 120, isRequired: true },
      { role: 'solution', description: 'How the solution makes the transition', maxHeadlineChars: 125, maxBodyChars: 120, isRequired: true },
      { role: 'cta', description: 'CTA for achieving the result', maxHeadlineChars: 125, maxBodyChars: 80, isRequired: true },
    ],
    copyStrategy: {
      headlineApproach: 'Direct contrast. Ex: "From 0 to 10,000 followers in 90 days"',
      primaryTextApproach: 'Describe before, then show the transformation, cite the path',
      descriptionApproach: 'Reinforce the achievable result',
      ctaRecommendation: 'LEARN_MORE or SIGN_UP',
    },
    promptInstruction:
      'Generate a comparison/before-after ad. Start with the audience\'s current state (before). Show the possible transformation (after). Explain how the product/service makes this transition. Close with CTA.',
    policyChecks: [
      { id: 'cp-no-misleading-before-after', description: 'Check before/after is not misleading', severity: 'critical', message: 'Before/after comparisons cannot be misleading or unrealistic.', category: 'before-after', platforms: ['META_FACEBOOK', 'META_INSTAGRAM'] },
      { id: 'cp-no-body-shaming', description: 'Check for body-shaming', severity: 'critical', message: 'Ads cannot use body-shaming or insecurity manipulation.', category: 'sensitive' },
    ],
    exampleHeadlines: ['From 2h/day to 15 minutes', 'Before: chaotic. After: organized.'],
    examplePrimaryTexts: [
      'Before: losing 2 hours a day on manual tasks. After: automating everything in 15 minutes. See how.',
    ],
  },

  // 5. TESTIMONIAL / CASE STUDY
  {
    id: 'testimonial',
    label: 'Depoimento / Case',
    labelEn: 'Testimonial / Case Study',
    description:
      'Ad built entirely around a real testimonial or success story. Makes the customer the protagonist and the brand the enabler.',
    version: '1.0.0',
    active: true,
    category: 'proof',
    objective: ['CONSIDERATION', 'CONVERSION'],
    preferredPlatforms: ['META_FACEBOOK', 'META_INSTAGRAM', 'LINKEDIN'],
    slideStructure: [
      { role: 'hook', description: 'Hook with the testimonial quote', maxHeadlineChars: 125, maxBodyChars: 0, isRequired: true },
      { role: 'testimonial', description: 'Full testimonial / context', maxHeadlineChars: 125, maxBodyChars: 150, isRequired: true },
      { role: 'proof', description: 'Numbers or case results', maxHeadlineChars: 125, maxBodyChars: 120, isRequired: true },
      { role: 'solution', description: 'How the brand helped achieve the result', maxHeadlineChars: 125, maxBodyChars: 120, isRequired: true },
      { role: 'cta', description: 'CTA for achieving similar results', maxHeadlineChars: 125, maxBodyChars: 80, isRequired: true },
    ],
    copyStrategy: {
      headlineApproach: 'Use the strongest testimonial quote as hook',
      primaryTextApproach: 'Structure as mini-case: context → challenge → solution → result',
      descriptionApproach: 'Client name and title for credibility',
      ctaRecommendation: 'LEARN_MORE or REQUEST_DEMO',
    },
    promptInstruction:
      'Generate a testimonial/case study ad. Start with the most impactful testimonial quote. Provide context about who the client is and what their challenge was. Show the results achieved. Explain how the brand helped. Close with CTA inviting similar results.',
    policyChecks: [
      { id: 'tm-no-fake-testimonial', description: 'Check testimonial is genuine', severity: 'critical', message: 'Testimonials must be from real clients. Fictional testimonials violate advertising policies.', category: 'testimonials' },
      { id: 'tm-no-unrealistic-results', description: 'Check results are not unrealistic', severity: 'warning', message: 'Results cannot be guaranteed. Use "results may vary" or "typical results".', category: 'claims' },
    ],
    exampleHeadlines: ['"We tripled revenue in 6 months"', 'Case: How Company X grew 300%'],
    examplePrimaryTexts: [
      '"Before we had 50 leads/month. Now we have 500. Everything changed when we implemented Brand Y\'s solution." — Marketing Director, Company X',
    ],
  },
];

export function getAdTemplateDefinitionById(id: string): AdTemplateDefinition | undefined {
  return adTemplateDefinitions.find((t) => t.id === id);
}

export function getAdTemplatesByObjective(objective: string): AdTemplateDefinition[] {
  return adTemplateDefinitions.filter((t) => t.objective.includes(objective));
}

export function getAdTemplatesByPlatform(platform: string): AdTemplateDefinition[] {
  return adTemplateDefinitions.filter((t) => t.preferredPlatforms.includes(platform));
}
