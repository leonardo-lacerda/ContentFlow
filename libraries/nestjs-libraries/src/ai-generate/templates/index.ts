/**
 * Templates barrel — re-exports everything from the template engine.
 */

export {
  TEMPLATE_SCHEMA_VERSION,
  carouselTemplateDefinitions,
  getTemplateDefinitionById,
} from './template-definitions';

export type {
  CarouselTemplateDefinition,
  SlideRule,
  EditorialCheck,
  TemplateNarrativeStructure,
} from './template-definitions';

export {
  recordTemplateUsage,
  getTemplateUsageStats,
  getAllTemplateUsageStats,
  getTemplateUsageReport,
  getRecentUsageEvents,
  getTemplatesByPopularity,
  getMostPopularTemplateForPlatform,
  getMostPopularTemplateForNiche,
  getEditorialPassRates,
  resetUsageData,
  getUsageEventCount,
} from './template-usage-tracker';

export type {
  TemplateUsageEvent,
  TemplateUsageStats,
  TemplateUsageReport,
} from './template-usage-tracker';

export { TemplateRegistry, templateRegistry } from './template-registry';
export {
  TemplateRecommenderService,
  type TemplateRecommendationInput,
} from './template-recommender.service';
