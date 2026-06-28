/**
 * TemplateRecommenderService — NestJS-injectable service that provides
 * template lookup, filtering, and lightweight recommendation logic.
 *
 * Wraps the TemplateRegistry singleton so it can be injected into
 * controllers and other services via standard NestJS DI.
 */

import { Injectable } from '@nestjs/common';
import { TemplateRegistry, templateRegistry } from './template-registry';
import type { CarouselTemplateDefinition } from './template-definitions';

export interface TemplateRecommendationInput {
  platform?: string;
  goal?: string;
  niche?: string;
  tone?: string;
}

@Injectable()
export class TemplateRecommenderService {
  private readonly registry: TemplateRegistry;

  constructor() {
    this.registry = templateRegistry;
  }

  /** Get a single template by id. */
  getById(id: string): CarouselTemplateDefinition | undefined {
    return this.registry.get(id);
  }

  /** Get a single template by id or throw. */
  requireById(id: string): CarouselTemplateDefinition {
    return this.registry.require(id);
  }

  /** Return all templates. */
  getAll(): CarouselTemplateDefinition[] {
    return this.registry.getAll();
  }

  /** Return only active templates. */
  getActive(): CarouselTemplateDefinition[] {
    return this.registry.getActive();
  }

  /** Filter by category. */
  getByCategory(category: string): CarouselTemplateDefinition[] {
    return this.registry.getByCategory(category);
  }

  /** Filter by goal. */
  getByGoal(goal: string): CarouselTemplateDefinition[] {
    return this.registry.getByGoal(goal);
  }

  /** Lightweight summaries (no nested narrative/visual fields). */
  getSummary() {
    return this.registry.getSummary();
  }

  /**
   * Recommend templates based on a combination of signals.
   * Returns active templates scored by how many criteria they match,
   * sorted by score descending.
   */
  recommend(
    input: TemplateRecommendationInput
  ): CarouselTemplateDefinition[] {
    const active = this.registry.getActive();

    if (!input.platform && !input.goal && !input.niche && !input.tone) {
      return active;
    }

    const scored = active.map((template) => {
      let score = 0;

      if (
        input.platform &&
        template.preferredPlatforms.some(
          (p) => p.toLowerCase() === input.platform!.toLowerCase()
        )
      ) {
        score += 3;
      }

      if (
        input.goal &&
        template.goal.toLowerCase().includes(input.goal.toLowerCase())
      ) {
        score += 2;
      }

      if (
        input.niche &&
        template.preferredNiches.some(
          (n) => n.toLowerCase() === input.niche!.toLowerCase()
        )
      ) {
        score += 2;
      }

      if (
        input.tone &&
        template.tone.toLowerCase().includes(input.tone.toLowerCase())
      ) {
        score += 1;
      }

      return { template, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.template);
  }
}
