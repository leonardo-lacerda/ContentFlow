import {
  adTemplateDefinitions,
  getAdTemplateDefinitionById,
  type AdTemplateDefinition,
} from './ad-template-definitions';

export class AdTemplateRegistry {
  private readonly templates: AdTemplateDefinition[];

  constructor(templates?: AdTemplateDefinition[]) {
    this.templates = templates ?? adTemplateDefinitions;
  }

  get(id: string): AdTemplateDefinition | undefined {
    return this.templates.find((t) => t.id === id);
  }

  require(id: string): AdTemplateDefinition {
    const template = this.get(id);
    if (!template) {
      throw new Error(`Ad template not found: "${id}"`);
    }
    return template;
  }

  getAll(): AdTemplateDefinition[] {
    return [...this.templates];
  }

  getActive(): AdTemplateDefinition[] {
    return this.templates.filter((t) => t.active);
  }

  getByObjective(objective: string): AdTemplateDefinition[] {
    return this.templates.filter((t) => t.objective.includes(objective));
  }

  getByPlatform(platform: string): AdTemplateDefinition[] {
    return this.templates.filter((t) => t.preferredPlatforms.includes(platform));
  }

  getByCategory(category: string): AdTemplateDefinition[] {
    const lower = category.toLowerCase();
    return this.templates.filter((t) => t.category.toLowerCase() === lower);
  }

  getSummary(): Array<{
    id: string;
    label: string;
    labelEn: string;
    description: string;
    category: string;
    objective: string[];
    active: boolean;
    preferredPlatforms: string[];
  }> {
    return this.templates.map((t) => ({
      id: t.id,
      label: t.label,
      labelEn: t.labelEn,
      description: t.description,
      category: t.category,
      objective: t.objective,
      active: t.active,
      preferredPlatforms: t.preferredPlatforms,
    }));
  }

  getIds(): string[] {
    return this.templates.map((t) => t.id);
  }
}

export const adTemplateRegistry = new AdTemplateRegistry();
