import { Injectable, Logger } from '@nestjs/common';
import {
  carouselTemplateDefinitions,
  getTemplateDefinitionById,
  type CarouselTemplateDefinition,
} from './templates';
import type { TemplateRecommendationDto } from '../dtos/ai-generate/template-recommendation.dto';
import {
  getTemplateUsageStats,
} from './templates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TemplateRecommendationResult {
  templateId: string;
  name: string;
  reason: string;
  confidence: number;
  /** Template category for frontend grouping. */
  category: string;
  /** Quick summary of the template's narrative structure. */
  narrativeName: string;
  /** Suggested slide range. */
  recommendedSlideCount: { min: number; max: number; default: number };
  /** Recommended CTA text. */
  recommendedCta: string;
}

export interface TemplateRecommendationResponse {
  recommendations: TemplateRecommendationResult[];
  totalCandidates: number;
  querySummary: string;
}

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

/**
 * Calculate a fuzzy match score between a query value and an array of values.
 * Returns 1.0 for exact match, 0.5 for partial (substring), 0 otherwise.
 */
function scoreArrayMatch(
  query: string | undefined,
  values: string[]
): number {
  if (!query) return 0;
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  for (const v of values) {
    if (v.toLowerCase() === q) return 1.0;
  }
  for (const v of values) {
    if (v.toLowerCase().includes(q) || q.includes(v.toLowerCase())) return 0.5;
  }
  return 0;
}

/**
 * Calculate a fuzzy string similarity score.
 * Returns 1.0 for exact match, 0.7 for substring containment, 0 otherwise.
 */
function scoreStringMatch(
  query: string | undefined,
  target: string
): number {
  if (!query) return 0;
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (!q || !t) return 0;

  if (q === t) return 1.0;
  if (t.includes(q) || q.includes(t)) return 0.7;

  // Word-level overlap
  const qWords = q.split(/\s+/);
  const tWords = new Set(t.split(/\s+/));
  const overlap = qWords.filter((w) => tWords.has(w)).length;
  if (overlap > 0 && qWords.length > 0) {
    return 0.4 * (overlap / qWords.length);
  }

  return 0;
}

/**
 * Build a human-readable reason for why a template was recommended.
 */
function buildReason(
  template: CarouselTemplateDefinition,
  scores: {
    platform: number;
    niche: number;
    goal: number;
    tone: number;
    category: number;
    textDensity: number;
    popularity: number;
  }
): string {
  const parts: string[] = [];

  if (scores.platform >= 1.0) {
    parts.push(`ideal para a plataforma escolhida`);
  } else if (scores.platform >= 0.5) {
    parts.push(`compatível com a plataforma`);
  }

  if (scores.niche >= 1.0) {
    parts.push(`perfeito para o nicho`);
  } else if (scores.niche >= 0.5) {
    parts.push(`bom fit para o nicho`);
  }

  if (scores.goal >= 0.7) {
    parts.push(`alinha-se com o objetivo de "${template.goal}"`);
  }

  if (scores.tone >= 0.7) {
    parts.push(`tom ${template.tone}`);
  }

  if (scores.category >= 0.7) {
    parts.push(`categoria "${template.category}"`);
  }

  if (scores.popularity > 0.1) {
    parts.push(`template popular entre outros usuários`);
  }

  if (parts.length === 0) {
    return template.description;
  }

  return parts.join(', ') + '.';
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class TemplateRecommendationService {
  private readonly logger = new Logger(TemplateRecommendationService.name);

  /**
   * Recommend templates based on user-provided criteria.
   *
   * Scoring weights (sum to 1.0):
   * - platform:    0.25
   * - niche:       0.25
   * - goal:        0.15
   * - tone:        0.10
   * - category:    0.10
   * - textDensity: 0.05
   * - popularity:  0.10
   */
  recommend(
    dto: TemplateRecommendationDto
  ): TemplateRecommendationResponse {
    const limit = Math.min(Math.max(dto.limit ?? 5, 1), 16);
    const excludeSet = new Set(dto.excludeIds ?? []);

    // Only consider active templates
    const candidates = carouselTemplateDefinitions.filter(
      (t) => t.active && !excludeSet.has(t.id)
    );

    const scored: Array<{
      template: CarouselTemplateDefinition;
      confidence: number;
      reason: string;
      scores: Record<string, number>;
    }> = [];

    for (const template of candidates) {
      const platformScore = scoreArrayMatch(
        dto.platform,
        template.preferredPlatforms
      );
      const nicheScore = scoreArrayMatch(dto.niche, template.preferredNiches);
      const goalScore = scoreStringMatch(dto.goal, template.goal);
      const toneScore = scoreStringMatch(dto.tone, template.tone);
      const categoryScore = scoreStringMatch(dto.category, template.category);
      const textDensityScore =
        dto.textDensity && dto.textDensity === template.textDensity ? 1 : 0;

      // Popularity signal from usage tracker
      let popularityScore = 0;
      const usageStats = getTemplateUsageStats(template.id);
      if (usageStats && usageStats.totalUses > 0) {
        // Normalize: more uses → higher score, capped at 1.0
        // Using log scale so very popular templates don't dominate
        popularityScore = Math.min(
          1,
          Math.log10(usageStats.totalUses + 1) / 3
        );
      }

      // Weighted confidence
      const confidence =
        platformScore * 0.25 +
        nicheScore * 0.25 +
        goalScore * 0.15 +
        toneScore * 0.1 +
        categoryScore * 0.1 +
        textDensityScore * 0.05 +
        popularityScore * 0.1;

      const scores = {
        platform: platformScore,
        niche: nicheScore,
        goal: goalScore,
        tone: toneScore,
        category: categoryScore,
        textDensity: textDensityScore,
        popularity: popularityScore,
      };

      const reason = buildReason(template, scores);

      scored.push({ template, confidence, reason, scores });
    }

    // Sort by confidence descending
    scored.sort((a, b) => b.confidence - a.confidence);

    const topResults = scored.slice(0, limit);

    const recommendations: TemplateRecommendationResult[] = topResults.map(
      (s) => ({
        templateId: s.template.id,
        name: s.template.label,
        reason: s.reason,
        confidence: Number(s.confidence.toFixed(3)),
        category: s.template.category,
        narrativeName: s.template.narrative.name,
        recommendedSlideCount: s.template.recommendedSlideCount,
        recommendedCta: s.template.recommendedCta,
      })
    );

    // Build a human-readable query summary
    const summaryParts: string[] = [];
    if (dto.platform) summaryParts.push(`platform=${dto.platform}`);
    if (dto.niche) summaryParts.push(`niche=${dto.niche}`);
    if (dto.goal) summaryParts.push(`goal=${dto.goal}`);
    if (dto.tone) summaryParts.push(`tone=${dto.tone}`);
    if (dto.category) summaryParts.push(`category=${dto.category}`);
    if (dto.textDensity)
      summaryParts.push(`textDensity=${dto.textDensity}`);
    if (dto.topic) summaryParts.push(`topic="${dto.topic}"`);

    this.logger.debug(
      `Recommendations generated: ${recommendations.length}/${candidates.length} candidates`
    );

    return {
      recommendations,
      totalCandidates: candidates.length,
      querySummary:
        summaryParts.length > 0
          ? summaryParts.join(', ')
          : 'No filters applied — returning best overall templates',
    };
  }

  /**
   * Get a single template recommendation by id.
   * Returns null if the template is not found or inactive.
   */
  getTemplateById(
    templateId: string
  ): CarouselTemplateDefinition | null {
    const template = getTemplateDefinitionById(templateId);
    if (!template || !template.active) return null;
    return template;
  }

  /**
   * Get a summary list of all active templates (for browsing/selection UI).
   */
  getCatalog(): Array<{
    id: string;
    label: string;
    description: string;
    category: string;
    goal: string;
    tone: string;
    preferredPlatforms: string[];
    preferredNiches: string[];
    recommendedSlideCount: { min: number; max: number; default: number };
    textDensity: string;
    narrativeName: string;
    recommendedCta: string;
  }> {
    return carouselTemplateDefinitions
      .filter((t) => t.active)
      .map((t) => ({
        id: t.id,
        label: t.label,
        description: t.description,
        category: t.category,
        goal: t.goal,
        tone: t.tone,
        preferredPlatforms: t.preferredPlatforms,
        preferredNiches: t.preferredNiches,
        recommendedSlideCount: t.recommendedSlideCount,
        textDensity: t.textDensity,
        narrativeName: t.narrative.name,
        recommendedCta: t.recommendedCta,
      }));
  }
}
