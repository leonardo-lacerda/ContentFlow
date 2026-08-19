import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { AddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/add.team.member.dto';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import dayjs from 'dayjs';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { Organization, ShortLinkPreference } from '@prisma/client';
import { CompanyProfileDto } from '@gitroom/nestjs-libraries/dtos/settings/company-profile.dto';
import { CompanyProfileSummaryDto } from '@gitroom/nestjs-libraries/dtos/settings/company-profile-summary.dto';
import { ExtractContentService } from '@gitroom/nestjs-libraries/openai/extract.content.service';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';
import { BillingEntitlementsService } from '@gitroom/nestjs-libraries/services/billing-entitlements.service';

const COMPANY_PROFILE_TYPE = 'company_profile_v1';
const COMPANY_PROFILE_COLLECTION_TYPE = 'company_profiles_v2';

type CompanyProfilePayload = {
  __type: typeof COMPANY_PROFILE_TYPE;
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
  visualIdentityAssets?: VisualIdentityAsset[];
  brandPalettes?: BrandPalette[];
  brandFontPresets?: BrandFontPreset[];
  brandLogos?: BrandLogoAsset[];
  styleRules?: StyleRule[];
  inspirationLibrary?: CompanyInspiration[];
  ideasLibrary?: CompanyIdea[];
  updatedAt?: string;
};

type CompanyProfilesPayload = {
  __type: typeof COMPANY_PROFILE_COLLECTION_TYPE;
  selectedCompanyId?: string;
  companies?: CompanyProfile[];
};

type CompanyProfile = {
  id?: string;
  companyName: string;
  website: string;
  industry: string;
  targetAudience: string;
  productsOrServices: string;
  differentials: string;
  toneOfVoice: string;
  summary: string;
  visualIdentitySummary: string;
  brandColors: string;
  brandFonts: string;
  defaultCta: string;
  forbiddenTerms: string;
  contentPreferences: string;
  visualIdentityAssets: VisualIdentityAsset[];
  brandPalettes: BrandPalette[];
  brandFontPresets: BrandFontPreset[];
  brandLogos: BrandLogoAsset[];
  styleRules: StyleRule[];
  inspirationLibrary: CompanyInspiration[];
  ideasLibrary: CompanyIdea[];
  updatedAt: string;
};

type CompanyIdea = {
  id: string;
  title: string;
  hook: string;
  goal: string;
  angle: string;
  createdAt: string;
};

type VisualIdentityAsset = {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  description: string;
};

type BrandPalette = {
  id: string;
  name: string;
  colors: string[];
  usage: string;
};

type BrandFontPreset = {
  id: string;
  name: string;
  headline: string;
  body: string;
  usage: string;
};

type BrandLogoAsset = {
  id: string;
  name: string;
  dataUrl: string;
  usage: string;
  description: string;
};

type StyleRule = {
  id: string;
  type: 'do' | 'dont';
  text: string;
};

type CompanyInspiration = {
  id: string;
  name: string;
  src: string;
  source: string;
  category: string;
  favorite: boolean;
  approved: boolean;
  description: string;
};

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeWebsiteUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(withProtocol).toString();
  } catch (error) {
    return '';
  }
}

function makeCompanyId() {
  return `company_${Date.now()}_${makeId(12)}`;
}

function makeVisualAssetId() {
  return `brand_asset_${Date.now()}_${makeId(12)}`;
}

function makeBrandKitId(prefix: string) {
  return `${prefix}_${Date.now()}_${makeId(12)}`;
}

function cleanVisualIdentityAssets(value: unknown): VisualIdentityAsset[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((asset) => {
      const item = asset as Partial<VisualIdentityAsset>;
      const dataUrl = cleanText(item.dataUrl);
      const type = cleanText(item.type) || 'image/jpeg';
      if (!dataUrl.startsWith('data:image/')) {
        return null;
      }

      return {
        id: cleanText(item.id) || makeVisualAssetId(),
        name: cleanText(item.name) || 'Referência visual',
        type,
        dataUrl: dataUrl.slice(0, 450000),
        description: cleanText(item.description).slice(0, 1600),
      };
    })
    .filter(Boolean)
    .slice(0, 8) as VisualIdentityAsset[];
}

function cleanBrandPalettes(value: unknown): BrandPalette[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((palette) => {
      const item = palette as Partial<BrandPalette>;
      const colors = Array.isArray(item.colors)
        ? item.colors.map((color) => cleanText(color).slice(0, 24)).filter(Boolean)
        : [];
      if (!colors.length) {
        return null;
      }

      return {
        id: cleanText(item.id) || makeBrandKitId('palette'),
        name: cleanText(item.name) || 'Paleta da marca',
        colors: colors.slice(0, 12),
        usage: cleanText(item.usage).slice(0, 500),
      };
    })
    .filter(Boolean)
    .slice(0, 12) as BrandPalette[];
}

function cleanBrandFontPresets(value: unknown): BrandFontPreset[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((font) => {
      const item = font as Partial<BrandFontPreset>;
      const headline = cleanText(item.headline).slice(0, 160);
      const body = cleanText(item.body).slice(0, 160);
      if (!headline && !body) {
        return null;
      }

      return {
        id: cleanText(item.id) || makeBrandKitId('font'),
        name: cleanText(item.name) || 'Preset tipográfico',
        headline,
        body,
        usage: cleanText(item.usage).slice(0, 500),
      };
    })
    .filter(Boolean)
    .slice(0, 12) as BrandFontPreset[];
}

function cleanBrandLogos(value: unknown): BrandLogoAsset[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((logo) => {
      const item = logo as Partial<BrandLogoAsset>;
      const dataUrl = cleanText(item.dataUrl);
      if (!dataUrl.startsWith('data:image/')) {
        return null;
      }

      return {
        id: cleanText(item.id) || makeBrandKitId('logo'),
        name: cleanText(item.name) || 'Logo da marca',
        dataUrl: dataUrl.slice(0, 450000),
        usage: cleanText(item.usage).slice(0, 500),
        description: cleanText(item.description).slice(0, 1000),
      };
    })
    .filter(Boolean)
    .slice(0, 8) as BrandLogoAsset[];
}

function cleanStyleRules(value: unknown): StyleRule[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((rule) => {
      const item = rule as Partial<StyleRule>;
      const text = cleanText(item.text).slice(0, 500);
      if (!text) {
        return null;
      }

      return {
        id: cleanText(item.id) || makeBrandKitId('rule'),
        type: item.type === 'dont' ? 'dont' : 'do',
        text,
      };
    })
    .filter(Boolean)
    .slice(0, 40) as StyleRule[];
}

function cleanInspirationLibrary(value: unknown): CompanyInspiration[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((inspiration) => {
      const item = inspiration as Partial<CompanyInspiration>;
      const src = cleanText(item.src);
      if (!src.startsWith('data:image/') && !src.startsWith('/ai-references/')) {
        return null;
      }

      return {
        id: cleanText(item.id) || makeBrandKitId('inspiration'),
        name: cleanText(item.name) || 'Inspiração',
        src: src.startsWith('data:image/') ? src.slice(0, 450000) : src.slice(0, 500),
        source: cleanText(item.source) || 'company',
        category: cleanText(item.category) || 'geral',
        favorite: !!item.favorite,
        approved: !!item.approved,
        description: cleanText(item.description).slice(0, 1000),
      };
    })
    .filter(Boolean)
    .slice(0, 80) as CompanyInspiration[];
}

function cleanCompanyIdeas(value: unknown): CompanyIdea[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();

  return value
    .map((idea) => {
      const item = idea as Partial<CompanyIdea>;
      const title = cleanText(item.title).slice(0, 240);
      if (!title) {
        return null;
      }

      const normalized = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
      if (!normalized || seen.has(normalized)) {
        return null;
      }
      seen.add(normalized);

      return {
        id: cleanText(item.id) || makeBrandKitId('idea'),
        title,
        hook: cleanText(item.hook).slice(0, 500),
        goal: cleanText(item.goal).slice(0, 240),
        angle: cleanText(item.angle).slice(0, 500),
        createdAt: cleanText(item.createdAt) || new Date().toISOString(),
      };
    })
    .filter(Boolean)
    .slice(0, 120) as CompanyIdea[];
}

function extractResponseText(data: any) {
  if (typeof data?.output_text === 'string') {
    return data.output_text.trim();
  }

  const output = Array.isArray(data?.output) ? data.output : [];
  return output
    .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
    .map((content: any) => content?.text || content?.output_text || '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

@Injectable()
export class OrganizationService {
  constructor(
    private _organizationRepository: OrganizationRepository,
    private _notificationsService: NotificationService,
    private _extractContentService: ExtractContentService,
    private brandProfileService: BrandProfileService,
    private readonly entitlements: BillingEntitlementsService,
  ) {}

  private emptyCompany(org?: { name?: string | null } | null): CompanyProfile {
    return {
      id: makeCompanyId(),
      companyName: cleanText(org?.name),
      website: '',
      industry: '',
      targetAudience: '',
      productsOrServices: '',
      differentials: '',
      toneOfVoice: '',
      summary: '',
      visualIdentitySummary: '',
      brandColors: '',
      brandFonts: '',
      defaultCta: '',
      forbiddenTerms: '',
      contentPreferences: '',
      visualIdentityAssets: [],
      brandPalettes: [],
      brandFontPresets: [],
      brandLogos: [],
      styleRules: [],
      inspirationLibrary: [],
      ideasLibrary: [],
      updatedAt: '',
    };
  }

  private normalizeCompany(
    company: Partial<Record<keyof CompanyProfile, unknown>> & {
      visualIdentityAssets?: unknown;
      [key: string]: unknown;
    },
    org?: { name?: string | null } | null
  ): CompanyProfile {
    return {
      id: cleanText(company.id) || makeCompanyId(),
      companyName: cleanText(company.companyName, cleanText(org?.name)),
      website: cleanText(company.website),
      industry: cleanText(company.industry),
      targetAudience: cleanText(company.targetAudience),
      productsOrServices: cleanText(company.productsOrServices),
      differentials: cleanText(company.differentials),
      toneOfVoice: cleanText(company.toneOfVoice),
      summary: cleanText(company.summary),
      visualIdentitySummary: cleanText(company.visualIdentitySummary),
      brandColors: cleanText(company.brandColors),
      brandFonts: cleanText(company.brandFonts),
      defaultCta: cleanText(company.defaultCta),
      forbiddenTerms: cleanText(company.forbiddenTerms),
      contentPreferences: cleanText(company.contentPreferences),
      visualIdentityAssets: cleanVisualIdentityAssets(company.visualIdentityAssets),
      brandPalettes: cleanBrandPalettes((company as any).brandPalettes),
      brandFontPresets: cleanBrandFontPresets((company as any).brandFontPresets),
      brandLogos: cleanBrandLogos((company as any).brandLogos),
      styleRules: cleanStyleRules((company as any).styleRules),
      inspirationLibrary: cleanInspirationLibrary((company as any).inspirationLibrary),
      ideasLibrary: cleanCompanyIdeas((company as any).ideasLibrary),
      updatedAt: cleanText(company.updatedAt),
    };
  }

  private parseCompanyProfiles(
    org: { name?: string | null; description?: string | null } | null
  ): { companies: CompanyProfile[]; selectedCompanyId: string } {
    const rawDescription = cleanText(org?.description);
    if (!rawDescription) {
      const empty = this.emptyCompany(org);
      return { companies: [], selectedCompanyId: empty.id! };
    }

    try {
      const parsed = JSON.parse(rawDescription) as CompanyProfilesPayload | CompanyProfilePayload;

      if (parsed?.__type === COMPANY_PROFILE_COLLECTION_TYPE) {
        const companies = Array.isArray((parsed as CompanyProfilesPayload).companies)
          ? (parsed as CompanyProfilesPayload).companies!.map((company) => this.normalizeCompany(company, org))
          : [];
        const selectedCompanyId =
          cleanText((parsed as CompanyProfilesPayload).selectedCompanyId) || companies[0]?.id || this.emptyCompany(org).id!;
        return { companies, selectedCompanyId };
      }

      if (parsed?.__type === COMPANY_PROFILE_TYPE) {
        const legacy = this.normalizeCompany(
          {
            companyName: cleanText(org?.name),
            website: cleanText((parsed as CompanyProfilePayload).website),
            industry: cleanText((parsed as CompanyProfilePayload).industry),
            targetAudience: cleanText((parsed as CompanyProfilePayload).targetAudience),
            productsOrServices: cleanText((parsed as CompanyProfilePayload).productsOrServices),
            differentials: cleanText((parsed as CompanyProfilePayload).differentials),
            toneOfVoice: cleanText((parsed as CompanyProfilePayload).toneOfVoice),
            summary: cleanText((parsed as CompanyProfilePayload).summary),
            visualIdentitySummary: cleanText((parsed as CompanyProfilePayload).visualIdentitySummary),
            brandColors: cleanText((parsed as CompanyProfilePayload).brandColors),
            brandFonts: cleanText((parsed as CompanyProfilePayload).brandFonts),
            defaultCta: cleanText((parsed as CompanyProfilePayload).defaultCta),
            forbiddenTerms: cleanText((parsed as CompanyProfilePayload).forbiddenTerms),
            contentPreferences: cleanText((parsed as CompanyProfilePayload).contentPreferences),
            visualIdentityAssets: cleanVisualIdentityAssets((parsed as CompanyProfilePayload).visualIdentityAssets),
            brandPalettes: cleanBrandPalettes((parsed as CompanyProfilePayload).brandPalettes),
            brandFontPresets: cleanBrandFontPresets((parsed as CompanyProfilePayload).brandFontPresets),
            brandLogos: cleanBrandLogos((parsed as CompanyProfilePayload).brandLogos),
            styleRules: cleanStyleRules((parsed as CompanyProfilePayload).styleRules),
            inspirationLibrary: cleanInspirationLibrary((parsed as CompanyProfilePayload).inspirationLibrary),
            ideasLibrary: cleanCompanyIdeas((parsed as CompanyProfilePayload).ideasLibrary),
            updatedAt: cleanText((parsed as CompanyProfilePayload).updatedAt),
          },
          org
        );
        return { companies: [legacy], selectedCompanyId: legacy.id! };
      }
    } catch (error) {
      const legacy = this.normalizeCompany(
        { companyName: cleanText(org?.name), summary: rawDescription },
        org
      );
      return { companies: [legacy], selectedCompanyId: legacy.id! };
    }

    const legacy = this.normalizeCompany(
      { companyName: cleanText(org?.name), summary: rawDescription },
      org
    );
    return { companies: [legacy], selectedCompanyId: legacy.id! };
  }

  private serializeCompanyProfiles(companies: CompanyProfile[], selectedCompanyId?: string) {
    const normalized = companies.map((company) => this.normalizeCompany(company));
    return JSON.stringify({
      __type: COMPANY_PROFILE_COLLECTION_TYPE,
      selectedCompanyId: selectedCompanyId || normalized[0]?.id || '',
      companies: normalized.map((company) => ({
        ...company,
        updatedAt: company.updatedAt || new Date().toISOString(),
      })),
    } satisfies CompanyProfilesPayload);
  }

  async createOrgAndUser(
    body: Omit<CreateOrgUserDto, 'providerToken'> & { providerId?: string },
    ip: string,
    userAgent: string
  ) {
    return this._organizationRepository.createOrgAndUser(
      body,
      this._notificationsService.hasEmailProvider(),
      ip,
      userAgent
    );
  }

  async getCount() { return this._organizationRepository.getCount(); }
  async createMaxUser(id: string, name: string, saasName: string, email: string) { return this._organizationRepository.createMaxUser(id, name, saasName, email); }
  addUserToOrg(userId: string, id: string, orgId: string, role: 'USER' | 'ADMIN') { return this._organizationRepository.addUserToOrg(userId, id, orgId, role); }
  getOrgById(id: string) { return this._organizationRepository.getOrgById(id); }
  getOrgByApiKey(api: string) { return this._organizationRepository.getOrgByApiKey(api); }
  getUserOrg(id: string) { return this._organizationRepository.getUserOrg(id); }
  getOrgsByUserId(userId: string) { return this._organizationRepository.getOrgsByUserId(userId); }
  updateApiKey(orgId: string) { return this._organizationRepository.updateApiKey(orgId); }

  getPublicApiKey(storedApiKey?: string | null) {
    if (!storedApiKey) return '';
    // secureDecryption already falls back to the legacy CBC format for
    // values that don't carry the gcm:v1: prefix — decrypt unconditionally
    // instead of returning legacy ciphertext as if it were the plaintext key.
    try {
      return AuthService.secureDecryption(storedApiKey);
    } catch {
      return '';
    }
  }

  // aes-256-cbc (the legacy format) has no auth tag, so decrypting with the
  // wrong key silently returns garbage instead of throwing — a key that
  // predates the current DATA_ENCRYPTION_KEY/JWT_SECRET, or that was never
  // re-encrypted after a secret rotation, decrypts to nonsense with no
  // error. Validate against the stored hash and regenerate when it doesn't
  // match, so a broken key self-heals instead of being served as-is.
  async resolveDisplayApiKey(organization: {
    id: string;
    apiKey?: string | null;
    apiKeyHash?: string | null;
  }) {
    const decrypted = this.getPublicApiKey(organization.apiKey);
    if (
      decrypted &&
      organization.apiKeyHash &&
      AuthService.hashApiKey(decrypted) === organization.apiKeyHash
    ) {
      return decrypted;
    }
    const { apiKey } = await this.updateApiKey(organization.id);
    return apiKey;
  }
  getTeam(orgId: string) { return this._organizationRepository.getTeam(orgId); }

  async setStreak(organizationId: string, type: 'start' | 'end') { return this._organizationRepository.setStreak(organizationId, type); }
  getOrgByCustomerId(customerId: string) { return this._organizationRepository.getOrgByCustomerId(customerId); }

  async inviteTeamMember(orgId: string, body: AddTeamMemberDto) {
    const team = await this._organizationRepository.getTeam(orgId);
    await this.entitlements.assertCapacity(orgId, 'members', team?.users.length || 0);
    const timeLimit = dayjs().add(1, 'hour').format('YYYY-MM-DD HH:mm:ss');
    const id = makeId(5);
    const url =
      process.env.FRONTEND_URL +
      `/?org=${AuthService.signJWT(
        { ...body, orgId, timeLimit, id },
        { type: 'org-invite', expiresIn: '1h' }
      )}`;
    if (body.sendEmail) {
      await this._notificationsService.sendEmail(body.email, 'You have been invited to join an organization', `You have been invited to join an organization. Click <a href="${url}">here</a> to join.<br />The link will expire in 1 hour.`);
    }
    return { url };
  }

  async deleteTeamMember(org: Organization, userId: string) {
    const userOrgs = await this._organizationRepository.getOrgsByUserId(userId);
    const findOrgToDelete = userOrgs.find((orgUser) => orgUser.id === org.id);
    if (!findOrgToDelete) throw new Error('User is not part of this organization');
    // @ts-ignore
    const myRole = org.users[0].role;
    const userRole = findOrgToDelete.users[0].role;
    const myLevel = myRole === 'USER' ? 0 : myRole === 'ADMIN' ? 1 : 2;
    const userLevel = userRole === 'USER' ? 0 : userRole === 'ADMIN' ? 1 : 2;
    if (myLevel < userLevel) throw new Error('You do not have permission to delete this user');
    return this._organizationRepository.deleteTeamMember(org.id, userId);
  }

  disableOrEnableNonSuperAdminUsers(orgId: string, disable: boolean) { return this._organizationRepository.disableOrEnableNonSuperAdminUsers(orgId, disable); }
  getShortlinkPreference(orgId: string) { return this._organizationRepository.getShortlinkPreference(orgId); }
  updateShortlinkPreference(orgId: string, shortlink: ShortLinkPreference) { return this._organizationRepository.updateShortlinkPreference(orgId, shortlink); }

  async getOnboardingStatus(orgId: string) {
    const row = await this._organizationRepository.getOnboardingStatus(orgId);
    return {
      completedAt: row?.onboardingCompletedAt ?? null,
      progress: (row?.onboardingProgress as Record<string, unknown> | null) ?? null,
    };
  }

  async updateOnboardingStatus(
    orgId: string,
    body: {
      progress?: {
        currentStep?: string;
        brandId?: string;
        skippedFeatureIds?: string[];
        openedFeatureIds?: string[];
        version?: string;
      };
      complete?: boolean;
      reset?: boolean;
    }
  ) {
    if (body.reset) {
      const cleared = await this._organizationRepository.updateOnboardingStatus(orgId, {
        onboardingCompletedAt: null,
        onboardingProgress: {
          currentStep: 'welcome',
          brandId: '',
          skippedFeatureIds: [],
          openedFeatureIds: [],
          version: '1',
        },
      });
      return {
        completedAt: cleared.onboardingCompletedAt ?? null,
        progress: (cleared.onboardingProgress as Record<string, unknown> | null) ?? null,
      };
    }

    const current = await this._organizationRepository.getOnboardingStatus(orgId);
    const currentProgress =
      (current?.onboardingProgress as Record<string, unknown> | null) ?? {};
    const nextProgress = body.progress
      ? {
          ...currentProgress,
          ...body.progress,
          skippedFeatureIds:
            body.progress.skippedFeatureIds ??
            (currentProgress.skippedFeatureIds as string[] | undefined) ??
            [],
          openedFeatureIds:
            body.progress.openedFeatureIds ??
            (currentProgress.openedFeatureIds as string[] | undefined) ??
            [],
          version: body.progress.version || (currentProgress.version as string) || '1',
        }
      : currentProgress;

    const updated = await this._organizationRepository.updateOnboardingStatus(orgId, {
      onboardingProgress: nextProgress,
      ...(body.complete
        ? { onboardingCompletedAt: new Date() }
        : {}),
    });

    return {
      completedAt: updated.onboardingCompletedAt ?? null,
      progress: (updated.onboardingProgress as Record<string, unknown> | null) ?? null,
    };
  }

  async getCompanyProfiles(orgId: string) {
    const org = await this._organizationRepository.getCompanyProfile(orgId);
    return this.parseCompanyProfiles(org);
  }

  async getCompanyProfile(orgId: string) {
    const collection = await this.getCompanyProfiles(orgId);
    const profile = collection.companies.find((company) => company.id === collection.selectedCompanyId) || collection.companies[0] || this.emptyCompany();
    return { ...profile, hasProfile: !!profile.summary || !!profile.website || !!profile.industry };
  }

  async upsertCompanyProfile(orgId: string, body: CompanyProfileDto) {
    const current = await this._organizationRepository.getCompanyProfile(orgId);
    const collection = this.parseCompanyProfiles(current);
    const bodyId = cleanText((body as CompanyProfileDto & { id?: string }).id);
    const targetId = bodyId || makeCompanyId();
    const previous = collection.companies.find((company) => company.id === targetId);
    const nextProfile = this.normalizeCompany({ ...previous, ...body, id: targetId, updatedAt: new Date().toISOString() }, current);

    const companies = previous
      ? collection.companies.map((company) => (company.id === targetId ? nextProfile : company))
      : [...collection.companies, nextProfile];

    const updated = await this._organizationRepository.updateCompanyProfile(orgId, {
      name: cleanText(current?.name) || nextProfile.companyName,
      description: this.serializeCompanyProfiles(companies, targetId),
    });

    const parsed = this.parseCompanyProfiles(updated);
    const profile = parsed.companies.find((company) => company.id === targetId) || nextProfile;
    return { ...profile, hasProfile: !!profile.summary };
  }

  async deleteCompanyProfile(orgId: string, id: string) {
    const targetId = cleanText(id);
    if (!targetId) {
      throw new HttpException('Company id is required', HttpStatus.BAD_REQUEST);
    }

    const current = await this._organizationRepository.getCompanyProfile(orgId);
    const collection = this.parseCompanyProfiles(current);
    const companies = collection.companies.filter((company) => company.id !== targetId);

    if (companies.length === collection.companies.length) {
      throw new HttpException('Company profile not found', HttpStatus.NOT_FOUND);
    }

    const selectedCompanyId =
      collection.selectedCompanyId === targetId
        ? companies[0]?.id || ''
        : collection.selectedCompanyId;

    const updated = await this._organizationRepository.updateCompanyProfile(orgId, {
      description: this.serializeCompanyProfiles(companies, selectedCompanyId),
    });

    return this.parseCompanyProfiles(updated);
  }

  async generateCompanySummary(orgId: string, body: CompanyProfileSummaryDto) {
    const openAiApiKey = process.env.AI_GENERATE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const openAiBaseUrl = process.env.AI_GENERATE_OPENAI_BASE_URL?.replace(/\/$/, '') || 'https://api.openai.com';
    const resolvedModel = process.env.AI_GENERATE_OPENAI_TEXT_MODEL || 'gpt-4.1-mini';

    if (!openAiApiKey) throw new HttpException('OpenAI API is not configured', HttpStatus.SERVICE_UNAVAILABLE);

    const website = normalizeWebsiteUrl(cleanText(body.website));
    if (!website) throw new HttpException('Website URL is required', HttpStatus.BAD_REQUEST);

    const current = await this._organizationRepository.getCompanyProfile(orgId);
    const collection = this.parseCompanyProfiles(current);
    const bodyId = cleanText((body as CompanyProfileSummaryDto & { id?: string }).id);
    const targetId = bodyId || makeCompanyId();
    const previous = collection.companies.find((company) => company.id === targetId);
    const baseProfile = this.normalizeCompany({ ...previous, ...body, id: targetId, website, updatedAt: new Date().toISOString() }, current);

    let websiteText = '';
    try { websiteText = cleanText(await this._extractContentService.extractContent(website)); } catch (error) { websiteText = ''; }
    if (!websiteText) throw new HttpException('Nao foi possivel extrair conteudo do site informado', HttpStatus.BAD_REQUEST);

    const response = await fetch(`${openAiBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${openAiApiKey}` },
      body: JSON.stringify({
        model: resolvedModel,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        user: orgId,
        messages: [
          { role: 'system', content: 'Voce e estrategista de marketing B2B/B2C. Gere um resumo empresarial claro, factual e util para criacao de posts em redes sociais. Retorne apenas JSON valido.' },
          { role: 'user', content: `Analise os dados da empresa e o texto do site.\n\nDados estruturados:\n${JSON.stringify(baseProfile, null, 2)}\n\nTexto do site (pode estar truncado):\n${websiteText.slice(0, 12000)}\n\nRetorne exatamente este JSON:\n{\n  "summary": "resumo em portugues (entre 120 e 280 palavras) explicando o negocio, publico, dores e proposta de valor",\n  "contentPillars": ["pilar 1", "pilar 2", "pilar 3", "pilar 4"],\n  "postIdeas": ["ideia 1 de post carrossel", "ideia 2", "ideia 3", "ideia 4", "ideia 5", "ideia 6", "ideia 7", "ideia 8"]\n}\n\nRegras: sem exageros, sem promessas absolutas, linguagem natural pt-BR, ideias objetivas e acionaveis. Se houver Brand Kit, identidade visual, termos proibidos ou preferencias de conteudo, preserve esse contexto no resumo e nas ideias.` },
        ],
      }),
    });

    const data = (await response.json().catch(() => ({}))) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } | string; message?: string };
    if (!response.ok) {
      const errorMessage = data.message || (typeof data.error === 'string' ? data.error : data.error?.message) || 'Failed to generate company summary';
      throw new HttpException(errorMessage, HttpStatus.BAD_GATEWAY);
    }

    const content = cleanText(data.choices?.[0]?.message?.content);
    if (!content) throw new HttpException('OpenAI did not return summary content', HttpStatus.BAD_GATEWAY);

    let payload: { summary?: string; contentPillars?: string[]; postIdeas?: string[] } = {};
    try { payload = JSON.parse(content); } catch (error) {
      const start = content.indexOf('{');
      const end = content.lastIndexOf('}');
      if (start >= 0 && end > start) payload = JSON.parse(content.slice(start, end + 1));
      else throw new HttpException('Invalid summary response format', HttpStatus.BAD_GATEWAY);
    }

    const nextProfile = this.normalizeCompany({ ...baseProfile, summary: cleanText(payload.summary, baseProfile.summary), updatedAt: new Date().toISOString() }, current);
    const companies = previous
      ? collection.companies.map((company) => (company.id === targetId ? nextProfile : company))
      : [...collection.companies, nextProfile];

    const updated = await this._organizationRepository.updateCompanyProfile(orgId, {
      name: cleanText(current?.name) || nextProfile.companyName,
      description: this.serializeCompanyProfiles(companies, targetId),
    });

    const parsed = this.parseCompanyProfiles(updated);
    const profile = parsed.companies.find((company) => company.id === targetId) || nextProfile;
    return {
      profile: { ...profile, hasProfile: true },
      companies: parsed.companies,
      selectedCompanyId: targetId,
      contentPillars: Array.isArray(payload.contentPillars) ? payload.contentPillars.map((item) => cleanText(item)).filter(Boolean).slice(0, 8) : [],
      postIdeas: Array.isArray(payload.postIdeas) ? payload.postIdeas.map((item) => cleanText(item)).filter(Boolean).slice(0, 12) : [],
    };
  }

  async generateCompanyVisualIdentity(orgId: string, body: CompanyProfileDto) {
    const openAiApiKey = process.env.AI_GENERATE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const openAiBaseUrl = process.env.AI_GENERATE_OPENAI_BASE_URL?.replace(/\/$/, '') || 'https://api.openai.com';
    const requestedModel =
      process.env.AI_GENERATE_OPENAI_REFERENCE_DESCRIPTION_MODEL || 'gpt-image-1.5';
    const fallbackModel =
      process.env.AI_GENERATE_OPENAI_REFERENCE_DESCRIPTION_FALLBACK_MODEL || 'gpt-4.1-mini';
    const models = Array.from(new Set([requestedModel, fallbackModel].filter(Boolean)));

    if (!openAiApiKey) {
      throw new HttpException('OpenAI API is not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const current = await this._organizationRepository.getCompanyProfile(orgId);
    const collection = this.parseCompanyProfiles(current);
    const bodyId = cleanText((body as CompanyProfileDto & { id?: string }).id);
    const targetId = bodyId || makeCompanyId();
    const previous = collection.companies.find((company) => company.id === targetId);
    const baseProfile = this.normalizeCompany(
      { ...previous, ...body, id: targetId, updatedAt: new Date().toISOString() },
      current
    );
    const assets = cleanVisualIdentityAssets(baseProfile.visualIdentityAssets);

    if (!assets.length) {
      throw new HttpException('Envie pelo menos uma imagem de identidade visual', HttpStatus.BAD_REQUEST);
    }

    let visualIdentitySummary = '';
    let usedModel = '';
    let lastError = 'Failed to describe visual identity';

    for (const model of models) {
      const response = await fetch(`${openAiBaseUrl}/v1/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model,
          user: orgId,
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text:
                    'Analise estas imagens enviadas como identidade visual de uma empresa. Retorne em português um guia prático, sem JSON, com no máximo 1800 caracteres. Foque em: paleta de cores, tipografia percebida, composição, estilo fotográfico/ilustrativo, uso de logo, textura, atmosfera, hierarquia visual, elementos recorrentes, o que manter e o que evitar. Não copie marcas de terceiros; transforme em direção visual reutilizável para posts e carrosséis.',
                },
                ...assets.slice(0, 6).map((asset) => ({
                  type: 'input_image',
                  image_url: asset.dataUrl,
                  detail: 'high',
                })),
              ],
            },
          ],
          max_output_tokens: 700,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        lastError =
          data?.message ||
          (typeof data?.error === 'string' ? data.error : data?.error?.message) ||
          lastError;
        continue;
      }

      visualIdentitySummary = extractResponseText(data).slice(0, 4000);
      if (visualIdentitySummary) {
        usedModel = model;
        break;
      }
    }

    if (!visualIdentitySummary) {
      throw new HttpException(lastError, HttpStatus.BAD_GATEWAY);
    }

    const describedAssets = assets.map((asset) => ({
      ...asset,
      description: asset.description || visualIdentitySummary.slice(0, 900),
    }));
    const nextProfile = this.normalizeCompany(
      {
        ...baseProfile,
        visualIdentityAssets: describedAssets,
        visualIdentitySummary,
        updatedAt: new Date().toISOString(),
      },
      current
    );
    const companies = previous
      ? collection.companies.map((company) => (company.id === targetId ? nextProfile : company))
      : [...collection.companies, nextProfile];

    const updated = await this._organizationRepository.updateCompanyProfile(orgId, {
      name: cleanText(current?.name) || nextProfile.companyName,
      description: this.serializeCompanyProfiles(companies, targetId),
    });

    const parsed = this.parseCompanyProfiles(updated);
    const profile = parsed.companies.find((company) => company.id === targetId) || nextProfile;
    return {
      profile: { ...profile, hasProfile: !!profile.summary },
      companies: parsed.companies,
      selectedCompanyId: targetId,
      model: usedModel,
    };
  }

  async migrateCompanyProfiles(org: Organization) {
    return this.brandProfileService.migrateFromLegacy(org.id, org);
  }
}
