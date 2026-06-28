/**
 * Template Usage Tracker — ContentFlow Template Engine v2.0
 *
 * Tracks which templates are used, how often, and by which organizations.
 * Provides analytics endpoints and recommendation signal data.
 *
 * This is an in-memory tracker suitable for single-server deployments.
 * For production scale, swap the Maps for Prisma/Redis-backed storage.
 */

import { Logger } from '@nestjs/common';
import {
  carouselTemplateDefinitions,
  getTemplateDefinitionById,
  type CarouselTemplateDefinition,
} from './template-definitions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single usage event recorded when a template is selected / applied. */
export interface TemplateUsageEvent {
  /** Auto-generated event id. */
  id: string;
  /** Template id from the registry. */
  templateId: string;
  /** Organization / workspace id. */
  orgId: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** Platform the carousel was generated for (optional). */
  platform?: string;
  /** Niche / industry context (optional). */
  niche?: string;
  /** Slide count that was ultimately generated. */
  slideCount?: number;
  /** Whether the carousel passed editorial review. */
  editorialPassed?: boolean;
}

/** Aggregated usage stats for a single template. */
export interface TemplateUsageStats {
  templateId: string;
  label: string;
  totalUses: number;
  uniqueOrgs: number;
  avgSlideCount: number;
  editorialPassRate: number;
  lastUsedAt: string | null;
  platformBreakdown: Record<string, number>;
  nicheBreakdown: Record<string, number>;
}

/** Global usage report across all templates. */
export interface TemplateUsageReport {
  generatedAt: string;
  totalEvents: number;
  templates: TemplateUsageStats[];
  topTemplates: Array<{ templateId: string; label: string; totalUses: number }>;
  recentlyUsed: TemplateUsageEvent[];
}

// ---------------------------------------------------------------------------
// Internal state (in-memory)
// ---------------------------------------------------------------------------

const logger = new Logger('TemplateUsageTracker');

let eventCounter = 0;
const usageEvents: TemplateUsageEvent[] = [];

/**
 * Maximum number of events kept in memory.
 * Older events are evicted when the limit is exceeded.
 */
const MAX_EVENTS = 5_000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Record a template usage event.
 *
 * @returns The created event (with generated id and timestamp).
 */
export function recordTemplateUsage(params: {
  templateId: string;
  orgId: string;
  platform?: string;
  niche?: string;
  slideCount?: number;
  editorialPassed?: boolean;
}): TemplateUsageEvent {
  // Validate that the template exists
  const template = getTemplateDefinitionById(params.templateId);
  if (!template) {
    logger.warn(
      `attempted to record usage for unknown template "${params.templateId}"`
    );
  }

  eventCounter++;
  const event: TemplateUsageEvent = {
    id: `usage_${Date.now()}_${eventCounter}`,
    templateId: params.templateId,
    orgId: params.orgId,
    timestamp: new Date().toISOString(),
    platform: params.platform,
    niche: params.niche,
    slideCount: params.slideCount,
    editorialPassed: params.editorialPassed,
  };

  usageEvents.unshift(event);

  // Evict oldest if over limit
  if (usageEvents.length > MAX_EVENTS) {
    usageEvents.length = MAX_EVENTS;
  }

  logger.debug(
    `recorded usage: template=${params.templateId} org=${params.orgId}`
  );

  return event;
}

/**
 * Get usage statistics for a specific template.
 */
export function getTemplateUsageStats(
  templateId: string
): TemplateUsageStats | null {
  const template = getTemplateDefinitionById(templateId);
  const events = usageEvents.filter((e) => e.templateId === templateId);

  if (!template) {
    return null;
  }

  const uniqueOrgs = new Set(events.map((e) => e.orgId));
  const slideCounts = events
    .map((e) => e.slideCount)
    .filter((s): s is number => typeof s === 'number' && s > 0);
  const editorialEvents = events.filter(
    (e) => typeof e.editorialPassed === 'boolean'
  );
  const editorialPassed = editorialEvents.filter(
    (e) => e.editorialPassed === true
  );

  const platformBreakdown: Record<string, number> = {};
  const nicheBreakdown: Record<string, number> = {};

  for (const event of events) {
    if (event.platform) {
      platformBreakdown[event.platform] =
        (platformBreakdown[event.platform] || 0) + 1;
    }
    if (event.niche) {
      nicheBreakdown[event.niche] =
        (nicheBreakdown[event.niche] || 0) + 1;
    }
  }

  return {
    templateId,
    label: template.label,
    totalUses: events.length,
    uniqueOrgs: uniqueOrgs.size,
    avgSlideCount:
      slideCounts.length > 0
        ? Math.round(
            slideCounts.reduce((a, b) => a + b, 0) / slideCounts.length
          )
        : template.recommendedSlideCount,
    editorialPassRate:
      editorialEvents.length > 0
        ? Number(
            (editorialPassed.length / editorialEvents.length).toFixed(3)
          )
        : 1,
    lastUsedAt: events.length > 0 ? events[0].timestamp : null,
    platformBreakdown,
    nicheBreakdown,
  };
}

/**
 * Get usage stats for ALL templates in the registry.
 */
export function getAllTemplateUsageStats(): TemplateUsageStats[] {
  return carouselTemplateDefinitions.map((t) => {
    const stats = getTemplateUsageStats(t.id);
    return (
      stats || {
        templateId: t.id,
        label: t.label,
        totalUses: 0,
        uniqueOrgs: 0,
        avgSlideCount: t.recommendedSlideCount,
        editorialPassRate: 1,
        lastUsedAt: null,
        platformBreakdown: {},
        nicheBreakdown: {},
      }
    );
  });
}

/**
 * Generate a full usage report with rankings.
 */
export function getTemplateUsageReport(): TemplateUsageReport {
  const allStats = getAllTemplateUsageStats();

  const topTemplates = [...allStats]
    .sort((a, b) => b.totalUses - a.totalUses)
    .slice(0, 5)
    .map((s) => ({
      templateId: s.templateId,
      label: s.label,
      totalUses: s.totalUses,
    }));

  return {
    generatedAt: new Date().toISOString(),
    totalEvents: usageEvents.length,
    templates: allStats,
    topTemplates,
    recentlyUsed: usageEvents.slice(0, 10),
  };
}

/**
 * Get recent usage events, optionally filtered by org or template.
 */
export function getRecentUsageEvents(params?: {
  orgId?: string;
  templateId?: string;
  limit?: number;
}): TemplateUsageEvent[] {
  let events = usageEvents;

  if (params?.orgId) {
    events = events.filter((e) => e.orgId === params.orgId);
  }
  if (params?.templateId) {
    events = events.filter((e) => e.templateId === params.templateId);
  }

  return events.slice(0, params?.limit ?? 20);
}

/**
 * Get templates ordered by popularity (most used first).
 * Useful for the recommendation engine to bias toward popular templates.
 */
export function getTemplatesByPopularity(): Array<{
  templateId: string;
  label: string;
  totalUses: number;
  rank: number;
}> {
  const allStats = getAllTemplateUsageStats();
  return allStats
    .sort((a, b) => b.totalUses - a.totalUses)
    .map((s, i) => ({
      templateId: s.templateId,
      label: s.label,
      totalUses: s.totalUses,
      rank: i + 1,
    }));
}

/**
 * Get the most popular template for a given platform.
 * Returns null if no usage data exists for that platform.
 */
export function getMostPopularTemplateForPlatform(
  platform: string
): { templateId: string; label: string; uses: number } | null {
  const lower = platform.toLowerCase();
  const allStats = getAllTemplateUsageStats();

  let best: { templateId: string; label: string; uses: number } | null = null;

  for (const stat of allStats) {
    const uses = stat.platformBreakdown[lower] || 0;
    if (uses > 0 && (!best || uses > best.uses)) {
      best = { templateId: stat.templateId, label: stat.label, uses };
    }
  }

  return best;
}

/**
 * Get the most popular template for a given niche.
 * Returns null if no usage data exists for that niche.
 */
export function getMostPopularTemplateForNiche(
  niche: string
): { templateId: string; label: string; uses: number } | null {
  const lower = niche.toLowerCase();
  const allStats = getAllTemplateUsageStats();

  let best: { templateId: string; label: string; uses: number } | null = null;

  for (const stat of allStats) {
    const uses = stat.nicheBreakdown[lower] || 0;
    if (uses > 0 && (!best || uses > best.uses)) {
      best = { templateId: stat.templateId, label: stat.label, uses };
    }
  }

  return best;
}

/**
 * Get editorial pass rates for all templates.
 * Useful for identifying templates that need editorial improvements.
 */
export function getEditorialPassRates(): Array<{
  templateId: string;
  label: string;
  passRate: number;
  totalReviewed: number;
}> {
  const allStats = getAllTemplateUsageStats();
  return allStats
    .filter((s) => s.totalUses > 0)
    .map((s) => ({
      templateId: s.templateId,
      label: s.label,
      passRate: s.editorialPassRate,
      totalReviewed: s.totalUses, // simplified: all uses count as "reviewed"
    }))
    .sort((a, b) => a.passRate - b.passRate);
}

/**
 * Reset all usage data (for testing).
 */
export function resetUsageData(): void {
  usageEvents.length = 0;
  eventCounter = 0;
  logger.debug('usage data reset');
}

/**
 * Get total number of recorded events.
 */
export function getUsageEventCount(): number {
  return usageEvents.length;
}
