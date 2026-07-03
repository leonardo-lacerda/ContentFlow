/**
 * Ad Policy Checker — Validates ad creatives against platform policies
 * and brand constraints. Returns warnings and flags for review.
 */

import { type AdCreative } from '../schemas/ad-creative.schema';
import { adTemplateRegistry } from './ad-template-registry';

export type PolicyCheckResult = {
  warnings: PolicyWarning[];
  claimsFlags: ClaimFlag[];
  overallSeverity: 'clean' | 'info' | 'warning' | 'critical';
};

export type PolicyWarning = {
  ruleId: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  suggestion?: string;
  category: string;
};

export type ClaimFlag = {
  claim: string;
  severity: 'info' | 'warning' | 'critical';
  category: string;
  platform?: string;
};

// Platform-specific restricted patterns
const META_HEALTH_RESTRICTIONS = [
  {
    pattern: /before\s*(and|&)\s*after/i,
    message: 'Meta restricts before/after images in health and beauty ads.',
    severity: 'critical' as const,
    category: 'before-after',
  },
  {
    pattern: /cur[ea]|treat(?:ment)?.*(?:cancer|diabetes|HIV|aids)/i,
    message: 'Meta prohibits cure claims for specific medical conditions.',
    severity: 'critical' as const,
    category: 'health',
  },
  {
    pattern: /weight\s*loss|lose\s*weight|fat\s*burn/i,
    message: 'Weight loss ads have additional restrictions on Meta.',
    severity: 'warning' as const,
    category: 'health',
  },
];

const GENERIC_RESTRICTIONS = [
  {
    pattern: /guarantee[ds]?|100%\s*(success|results)|results?\s*guaranteed/i,
    message: 'Guaranteeing results is not permitted in ads.',
    severity: 'critical' as const,
    category: 'guarantees',
  },
  {
    pattern: /miracle|revolutionary|effortless|no\s*work/i,
    message: '"Effortless" or "miracle" claims are restricted by most platforms.',
    severity: 'warning' as const,
    category: 'exaggeration',
  },
  {
    pattern: /last\s*chance|ends?\s*(today|now)|only\s*\d+\s*left|limited\s*time/i,
    message: 'False urgency (without a real deadline) violates advertising policies.',
    severity: 'warning' as const,
    category: 'urgency',
  },
  {
    pattern: /best\s*in\s*the\s*world|#1\s*(in|of)\s*(the\s*)?world/i,
    message: 'Absolute superiority claims must be verifiable.',
    severity: 'warning' as const,
    category: 'superlatives',
  },
  {
    pattern: /secret|hidden|they\s*(don\'t|won\'t)\s*tell\s*you/i,
    message: '"Secret" marketing can be seen as deceptive.',
    severity: 'info' as const,
    category: 'tone',
  },
];

/**
 * Run all policy checks on an ad creative.
 */
export function runAdPolicyChecks(
  ad: AdCreative,
  brandConstraints?: { forbiddenTerms?: string[]; complianceNotes?: string[] }
): PolicyCheckResult {
  const warnings: PolicyWarning[] = [];
  const claimsFlags: ClaimFlag[] = [];

  // 1. Template-specific checks
  if (ad.adTemplateId) {
    const template = adTemplateRegistry.get(ad.adTemplateId);
    if (template) {
      for (const check of template.policyChecks) {
        if (check.pattern) {
          const regex = new RegExp(check.pattern, 'i');
          const textToCheck = `${ad.headline} ${ad.primaryText} ${ad.description || ''}`;
          if (regex.test(textToCheck)) {
            warnings.push({
              ruleId: check.id,
              severity: check.severity,
              message: check.message,
              category: check.category,
            });
          }
        } else {
          warnings.push({
            ruleId: check.id,
            severity: check.severity,
            message: check.message,
            category: check.category,
          });
        }
      }
    }
  }

  // 2. Platform-specific checks
  const fullText = `${ad.headline} ${ad.primaryText} ${ad.description || ''}`;

  if (ad.platform === 'META_FACEBOOK' || ad.platform === 'META_INSTAGRAM') {
    for (const restriction of META_HEALTH_RESTRICTIONS) {
      if (restriction.pattern.test(fullText)) {
        claimsFlags.push({
          claim: fullText.match(restriction.pattern)?.[0] || '',
          severity: restriction.severity,
          category: restriction.category,
          platform: ad.platform,
        });
      }
    }
  }

  // 3. Generic restrictions
  for (const restriction of GENERIC_RESTRICTIONS) {
    if (restriction.pattern.test(fullText)) {
      warnings.push({
        ruleId: `GENERIC_${restriction.category.toUpperCase()}`,
        severity: restriction.severity,
        message: restriction.message,
        category: restriction.category,
      });
    }
  }

  // 4. Brand constraint checks
  if (brandConstraints?.forbiddenTerms) {
    for (const term of brandConstraints.forbiddenTerms) {
      if (fullText.toLowerCase().includes(term.toLowerCase())) {
        warnings.push({
          ruleId: `BRAND_FORBIDDEN_${term.toUpperCase().replace(/\s+/g, '_')}`,
          severity: 'warning',
          message: `Brand-forbidden term found: "${term}"`,
          category: 'brand-constraints',
        });
      }
    }
  }

  // 5. Carousel-specific checks
  if (ad.type === 'CAROUSEL' && ad.slides) {
    if (ad.slides.length < 2) {
      warnings.push({
        ruleId: 'CAROUSEL_MIN_SLIDES',
        severity: 'critical',
        message: 'Carousel must have at least 2 slides.',
        category: 'format',
      });
    }
    if (ad.platform === 'LINKEDIN' && ad.slides.length > 5) {
      warnings.push({
        ruleId: 'LINKEDIN_MAX_SLIDES',
        severity: 'critical',
        message: 'LinkedIn supports a maximum of 5 carousel slides.',
        category: 'format',
      });
    }
  }

  // 6. Character limit checks
  const platformLimits: Record<string, { headline: number; primaryText: number }> = {
    META_FACEBOOK: { headline: 125, primaryText: 500 },
    META_INSTAGRAM: { headline: 125, primaryText: 500 },
    LINKEDIN: { headline: 70, primaryText: 3000 },
  };
  const limits = platformLimits[ad.platform];
  if (limits) {
    if (ad.headline.length > limits.headline) {
      warnings.push({
        ruleId: 'HEADLINE_TOO_LONG',
        severity: 'warning',
        message: `Headline exceeds ${limits.headline} characters for ${ad.platform} (${ad.headline.length}/${limits.headline})`,
        category: 'format',
      });
    }
    if (ad.primaryText.length > limits.primaryText) {
      warnings.push({
        ruleId: 'PRIMARY_TEXT_TOO_LONG',
        severity: 'warning',
        message: `Primary text exceeds ${limits.primaryText} characters for ${ad.platform} (${ad.primaryText.length}/${limits.primaryText})`,
        category: 'format',
      });
    }
  }

  // Calculate overall severity
  const hasCritical = warnings.some((w) => w.severity === 'critical') || claimsFlags.some((c) => c.severity === 'critical');
  const hasWarning = warnings.some((w) => w.severity === 'warning') || claimsFlags.some((c) => c.severity === 'warning');
  const hasInfo = warnings.some((w) => w.severity === 'info') || claimsFlags.some((c) => c.severity === 'info');

  const overallSeverity: PolicyCheckResult['overallSeverity'] = hasCritical
    ? 'critical'
    : hasWarning
    ? 'warning'
    : hasInfo
    ? 'info'
    : 'clean';

  return { warnings, claimsFlags, overallSeverity };
}

/**
 * Format policy check results for export/display.
 */
export function formatPolicySummary(result: PolicyCheckResult): string {
  const lines: string[] = [];
  if (result.overallSeverity === 'clean') {
    return 'No compliance issues detected.';
  }
  lines.push(`Compliance: ${result.overallSeverity.toUpperCase()}`);
  if (result.warnings.length > 0) {
    lines.push('Warnings:');
    for (const w of result.warnings) {
      const icon = w.severity === 'critical' ? '[!]' : w.severity === 'warning' ? '[~]' : '[i]';
      lines.push(`  ${icon} [${w.ruleId}] ${w.message}`);
    }
  }
  if (result.claimsFlags.length > 0) {
    lines.push('Claims Flags:');
    for (const c of result.claimsFlags) {
      const icon = c.severity === 'critical' ? '[!]' : '[~]';
      lines.push(`  ${icon} "${c.claim}" (${c.category}${c.platform ? ` — ${c.platform}` : ''})`);
    }
  }
  return lines.join('\n');
}
