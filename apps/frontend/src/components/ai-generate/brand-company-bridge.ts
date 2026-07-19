import type { CompanyProfile } from './ai-generate-images.types';

/** Shapes parciais vindas da API Brand DNA */
export type BrandApi = {
  id: string;
  name?: string;
  website?: string | null;
  industry?: string | null;
  selected?: boolean;
  status?: string;
};

export type DnaApi = {
  summary?: {
    tagline?: string;
    description?: string;
    industry?: string;
    targetAudience?: string;
  };
  voice?: {
    tone?: string;
    style?: string;
    personality?: string;
    forbiddenWords?: string[] | string;
  };
  audience?: {
    demographics?: string;
    painPoints?: string[] | string;
    desires?: string[] | string;
    objections?: string[] | string;
  };
  offer?: {
    products?: string[] | string;
    services?: string[] | string;
    uniqueSellingPoints?: string[] | string;
    pricingHint?: string;
  };
  visual?: {
    colors?: string[] | string;
    style?: string;
    typographyHint?: string;
  };
  constraints?: {
    do?: string[] | string;
    avoid?: string[] | string;
    requiredElements?: string[] | string;
  };
};

const asList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const joinList = (value: unknown, sep = ', '): string =>
  asList(value).join(sep);

/**
 * Brand DNA → shape legado `CompanyProfile` usado pelo estúdio de carrossel.
 * Mantém o estúdio estável sem reescrever 20 arquivos.
 */
export function brandDnaToCompanyProfile(
  brand: BrandApi,
  dna?: DnaApi | null,
  legacyAssets?: Partial<CompanyProfile> | null
): CompanyProfile {
  const summary = dna?.summary;
  const voice = dna?.voice;
  const audience = dna?.audience;
  const offer = dna?.offer;
  const visual = dna?.visual;
  const constraints = dna?.constraints;

  const products = [
    ...asList(offer?.products),
    ...asList(offer?.services),
  ].filter(Boolean);

  const description =
    summary?.description ||
    summary?.tagline ||
    legacyAssets?.summary ||
    '';

  return {
    id: brand.id,
    companyName: brand.name || legacyAssets?.companyName || 'Minha marca',
    website: brand.website || legacyAssets?.website || '',
    industry:
      brand.industry ||
      summary?.industry ||
      legacyAssets?.industry ||
      '',
    targetAudience:
      summary?.targetAudience ||
      audience?.demographics ||
      legacyAssets?.targetAudience ||
      '',
    productsOrServices:
      products.join(', ') || legacyAssets?.productsOrServices || '',
    differentials:
      joinList(offer?.uniqueSellingPoints) ||
      legacyAssets?.differentials ||
      '',
    toneOfVoice:
      voice?.tone ||
      [voice?.tone, voice?.style, voice?.personality].filter(Boolean).join(', ') ||
      legacyAssets?.toneOfVoice ||
      '',
    summary: description,
    visualIdentitySummary:
      visual?.style || legacyAssets?.visualIdentitySummary || '',
    brandColors:
      joinList(visual?.colors) || legacyAssets?.brandColors || '',
    brandFonts:
      visual?.typographyHint || legacyAssets?.brandFonts || '',
    defaultCta: legacyAssets?.defaultCta || '',
    forbiddenTerms:
      joinList(voice?.forbiddenWords) ||
      joinList(constraints?.avoid) ||
      legacyAssets?.forbiddenTerms ||
      '',
    contentPreferences: legacyAssets?.contentPreferences || '',
    visualIdentityAssets: legacyAssets?.visualIdentityAssets || [],
    brandPalettes: legacyAssets?.brandPalettes || [],
    brandFontPresets: legacyAssets?.brandFontPresets || [],
    brandLogos: legacyAssets?.brandLogos || [],
    styleRules: legacyAssets?.styleRules || [],
    inspirationLibrary: legacyAssets?.inspirationLibrary || [],
    ideasLibrary: legacyAssets?.ideasLibrary || [],
    updatedAt: new Date().toISOString(),
    hasProfile: true,
  };
}

/** CompanyProfile (form do estúdio) → payload de DNA snapshot */
export function companyProfileToDnaPayload(company: CompanyProfile) {
  const forbidden = asList(company.forbiddenTerms);
  const colors = asList(company.brandColors);
  const products = asList(company.productsOrServices);
  const usps = asList(company.differentials);

  return {
    sourceType: 'studio-brand-kit',
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
      forbiddenWords: forbidden,
    },
    audience: {
      demographics: company.targetAudience || '',
      painPoints: [] as string[],
      desires: [] as string[],
      objections: [] as string[],
    },
    offer: {
      products,
      services: [] as string[],
      uniqueSellingPoints: usps,
      pricingHint: '',
    },
    visual: {
      colors,
      style: company.visualIdentitySummary || '',
      typographyHint: company.brandFonts || '',
    },
    constraints: {
      do: [] as string[],
      avoid: forbidden,
      requiredElements: [] as string[],
    },
  };
}
