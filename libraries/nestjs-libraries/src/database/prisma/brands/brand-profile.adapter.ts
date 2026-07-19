import { Organization } from '@prisma/client';

export interface LegacyCompanyProfile {
  id: string;
  /** Alguns legados usam `name`; o JSON normalizado usa `companyName`. */
  name?: string;
  companyName?: string;
  website?: string;
  industry?: string;
  targetAudience?: string;
  productsOrServices?: string;
  differentials?: string;
  toneOfVoice?: string;
  summary?: string;
  visualIdentitySummary?: string;
  brandColors?: string;
  brandFonts?: string;
  defaultCta?: string;
  forbiddenTerms?: string;
  contentPreferences?: string;
  visualIdentityAssets?: any;
  brandPalettes?: any;
  brandFontPresets?: any;
  brandLogos?: any;
  styleRules?: any;
  inspirationLibrary?: any;
  ideasLibrary?: any;
  updatedAt?: string;
}

export interface BrandProfileInput {
  name: string;
  website?: string;
  industry?: string;
}

export class BrandProfileAdapter {
  /**
   * Converte dados de CompanyProfile legado para BrandProfileInput
   */
  static fromLegacyCompanyProfile(company: LegacyCompanyProfile): BrandProfileInput {
    return {
      name: company.companyName || company.name || 'Minha Marca',
      website: company.website || undefined,
      industry: company.industry || undefined,
    };
  }

  /**
   * Extrai dados de DNA de um CompanyProfile legado
   */
  static extractDnaFromLegacy(company: LegacyCompanyProfile): any {
    return {
      summary: {
        tagline: '',
        description: company.summary || '',
        industry: company.industry || '',
        targetAudience: company.targetAudience || '',
      },
      voice: {
        tone: company.toneOfVoice || '',
        style: '',
        personality: '',
        forbiddenWords: String(company.forbiddenTerms || '').split(/[,;]/).map((s) => s.trim()).filter(Boolean),
      },
      audience: {
        demographics: '',
        painPoints: [] as string[],
        desires: [] as string[],
        objections: [] as string[],
      },
      offer: {
        products: String(company.productsOrServices || '').split(/[,;]/).map((s) => s.trim()).filter(Boolean),
        services: [] as string[],
        uniqueSellingPoints: String(company.differentials || '').split(/[,;]/).map((s) => s.trim()).filter(Boolean),
        pricingHint: '',
      },
      visual: {
        colors: String(company.brandColors || '').split(/[,;]/).map((s) => s.trim()).filter(Boolean),
        style: company.visualIdentitySummary || '',
        typographyHint: company.brandFonts || '',
      },
      constraints: {
        do: '',
        avoid: '',
        requiredElements: '',
      },
    };
  }

  /**
   * Verifica se uma Organization tem dados legados de CompanyProfile
   */
  static hasLegacyData(org: Organization): boolean {
    if (!org.description) return false;
    try {
      const parsed = JSON.parse(org.description);
      return !!(
        parsed.companies ||
        parsed.name ||
        parsed.companyName ||
        parsed.website
      );
    } catch {
      return false;
    }
  }

  /**
   * Extrai a lista de empresas do JSON legado
   */
  static parseLegacyCompanies(org: Organization): LegacyCompanyProfile[] {
    if (!org.description) return [];
    try {
      const parsed = JSON.parse(org.description);
      if (parsed.companies && Array.isArray(parsed.companies)) {
        return parsed.companies as LegacyCompanyProfile[];
      }
      if (parsed.name || parsed.companyName) {
        return [parsed as LegacyCompanyProfile];
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Obtém o ID da empresa selecionada no JSON legado
   */
  static getLegacySelectedCompanyId(org: Organization): string | null {
    if (!org.description) return null;
    try {
      const parsed = JSON.parse(org.description);
      return parsed.selectedCompanyId || null;
    } catch {
      return null;
    }
  }
}
