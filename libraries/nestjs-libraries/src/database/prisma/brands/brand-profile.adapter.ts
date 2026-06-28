import { Organization } from '@prisma/client';

export interface LegacyCompanyProfile {
  id: string;
  name: string;
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
      name: company.name || 'Minha Marca',
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
        tagline: company.summary || '',
        description: '',
        industry: company.industry || '',
        targetAudience: company.targetAudience || '',
      },
      voice: {
        tone: company.toneOfVoice || '',
        style: '',
        personality: '',
        forbiddenWords: company.forbiddenTerms || '',
      },
      audience: {
        demographics: '',
        painPoints: '',
        desires: '',
        objections: '',
      },
      offer: {
        products: company.productsOrServices || '',
        services: '',
        uniqueSellingPoints: company.differentials || '',
        pricingHint: '',
      },
      visual: {
        colors: company.brandColors || '',
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
      return !!(parsed.companies || parsed.name || parsed.website);
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
      if (parsed.name) {
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
