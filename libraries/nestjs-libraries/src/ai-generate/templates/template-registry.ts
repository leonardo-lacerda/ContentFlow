/**
 * TemplateRegistry — Wraps the template definitions array with typed
 * convenience methods (get, getAll, getActive, getByCategory, getByGoal).
 *
 * This is a plain class (not @Injectable) — instantiate it once or use
 * the exported singleton. For NestJS DI, register it as a provider and
 * inject where needed.
 */

import {
  carouselTemplateDefinitions,
  getTemplateDefinitionById,
  type CarouselTemplateDefinition,
} from './template-definitions';

export class TemplateRegistry {
  private readonly templates: CarouselTemplateDefinition[];

  constructor(templates?: CarouselTemplateDefinition[]) {
    this.templates = templates ?? carouselTemplateDefinitions;
  }

  /** Get a single template by id, or undefined if not found. */
  get(id: string): CarouselTemplateDefinition | undefined {
    return this.templates.find((t) => t.id === id);
  }

  /** Same as get() but throws if the template does not exist. */
  require(id: string): CarouselTemplateDefinition {
    const template = this.get(id);
    if (!template) {
      throw new Error(`Template not found: "${id}"`);
    }
    return template;
  }

  /** Return every template in the catalog. */
  getAll(): CarouselTemplateDefinition[] {
    return [...this.templates];
  }

  /** Return only active templates. */
  getActive(): CarouselTemplateDefinition[] {
    return this.templates.filter((t) => t.active);
  }

  /** Return templates that belong to the given category. */
  getByCategory(category: string): CarouselTemplateDefinition[] {
    const lower = category.toLowerCase();
    return this.templates.filter((t) => t.category.toLowerCase() === lower);
  }

  /** Return templates whose goal field contains the given substring (case-insensitive). */
  getByGoal(goal: string): CarouselTemplateDefinition[] {
    const lower = goal.toLowerCase();
    return this.templates.filter((t) => t.goal.toLowerCase().includes(lower));
  }

  /** Return templates that list the given platform in preferredPlatforms. */
  getByPlatform(platform: string): CarouselTemplateDefinition[] {
    const lower = platform.toLowerCase();
    return this.templates.filter((t) =>
      t.preferredPlatforms.some((p) => p.toLowerCase() === lower)
    );
  }

  /** Return templates that list the given niche in preferredNiches. */
  getByNiche(niche: string): CarouselTemplateDefinition[] {
    const lower = niche.toLowerCase();
    return this.templates.filter((t) =>
      t.preferredNiches.some((n) => n.toLowerCase() === lower)
    );
  }

  /** Return a lightweight summary of every template (no heavy nested fields). */
  getSummary(): Array<{
    id: string;
    label: string;
    description: string;
    category: string;
    goal: string;
    tone: string;
    active: boolean;
    preferredPlatforms: string[];
    recommendedSlideCount: { min: number; max: number; default: number };
  }> {
    return this.templates.map((t) => ({
      id: t.id,
      label: t.label,
      description: t.description,
      category: t.category,
      goal: t.goal,
      tone: t.tone,
      active: t.active,
      preferredPlatforms: t.preferredPlatforms,
      recommendedSlideCount: t.recommendedSlideCount,
    }));
  }

  /** Return all unique template ids. */
  getIds(): string[] {
    return this.templates.map((t) => t.id);
  }
}

/** Pre-built singleton for convenience (avoids creating a new instance every time). */
export const templateRegistry = new TemplateRegistry();
