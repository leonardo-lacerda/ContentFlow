import { Injectable } from '@nestjs/common';
import { BrandProfileRepository } from './brand-profile.repository';
import { BrandDnaSnapshotRepository } from './brand-dna-snapshot.repository';
import { BrandAssetRepository } from './brand-asset.repository';
import { BrandProfileAdapter } from './brand-profile.adapter';
import { Organization } from '@prisma/client';
import { CreateBrandProfileDto } from '@gitroom/nestjs-libraries/dtos/settings/create-brand-profile.dto';
import { UpdateBrandProfileDto } from '@gitroom/nestjs-libraries/dtos/settings/update-brand-profile.dto';
import { AnalyzeBrandDto } from '@gitroom/nestjs-libraries/dtos/settings/analyze-brand.dto';
import { CreateBrandDnaSnapshotDto } from '@gitroom/nestjs-libraries/dtos/settings/create-brand-dna-snapshot.dto';
import { BrandDnaExtractionService } from '@gitroom/nestjs-libraries/ai-generate/brand-dna-extraction.service';

@Injectable()
export class BrandProfileService {
  constructor(
    private brandProfileRepository: BrandProfileRepository,
    private brandDnaSnapshotRepository: BrandDnaSnapshotRepository,
    private brandAssetRepository: BrandAssetRepository,
    private brandDnaExtractionService: BrandDnaExtractionService
  ) {}

  async getBrands(orgId: string) {
    return this.brandProfileRepository.findByOrganization(orgId);
  }

  async getBrand(id: string, orgId: string) {
    return this.brandProfileRepository.findById(id, orgId);
  }

  async getSelectedBrand(orgId: string) {
    return this.brandProfileRepository.findSelected(orgId);
  }

  async createBrand(orgId: string, dto: CreateBrandProfileDto) {
    return this.brandProfileRepository.create({
      organizationId: orgId,
      name: dto.name,
      website: dto.website,
      industry: dto.industry,
    });
  }

  async updateBrand(id: string, orgId: string, dto: UpdateBrandProfileDto) {
    return this.brandProfileRepository.update(id, orgId, dto);
  }

  async deleteBrand(id: string, orgId: string) {
    return this.brandProfileRepository.softDelete(id, orgId);
  }

  async selectBrand(orgId: string, brandId: string) {
    return this.brandProfileRepository.selectBrand(orgId, brandId);
  }

  async getDnaSnapshots(brandProfileId: string) {
    return this.brandDnaSnapshotRepository.findByBrandProfile(brandProfileId);
  }

  async getLatestDnaSnapshot(brandProfileId: string) {
    return this.brandDnaSnapshotRepository.findLatest(brandProfileId);
  }

  async getAssets(brandProfileId: string, type?: string) {
    return this.brandAssetRepository.findByBrandProfile(brandProfileId, type);
  }

  async createAsset(brandProfileId: string, data: { type: string; mediaId?: string; sourceUrl?: string; metadata?: any }) {
    return this.brandAssetRepository.create({ brandProfileId, ...data });
  }

  async analyzeBrand(orgId: string, brandId: string, dto: AnalyzeBrandDto) {
    const brand = await this.brandProfileRepository.findById(brandId, orgId);
    if (!brand) {
      throw new Error('Brand not found');
    }
    return this.brandDnaExtractionService.analyze(brandId, dto.url);
  }

  async migrateFromLegacy(orgId: string, org: Organization) {
    if (!BrandProfileAdapter.hasLegacyData(org)) {
      return null;
    }

    const existing = await this.brandProfileRepository.findByOrganization(orgId);
    if (existing.length > 0) {
      return existing[0];
    }

    const companies = BrandProfileAdapter.parseLegacyCompanies(org);
    if (companies.length === 0) return null;

    const selectedCompanyId = BrandProfileAdapter.getLegacySelectedCompanyId(org);

    for (const company of companies) {
      const input = BrandProfileAdapter.fromLegacyCompanyProfile(company);
      const brand = await this.brandProfileRepository.create({
        organizationId: orgId,
        name: input.name,
        website: input.website,
        industry: input.industry,
      });

      if (selectedCompanyId === company.id) {
        await this.brandProfileRepository.selectBrand(orgId, brand.id);
      }

      const dnaData = BrandProfileAdapter.extractDnaFromLegacy(company);
      await this.brandDnaSnapshotRepository.create({
        brandProfileId: brand.id,
        version: 1,
        sourceType: 'legacy_migration',
        summary: dnaData.summary,
        voice: dnaData.voice,
        audience: dnaData.audience,
        offer: dnaData.offer,
        visual: dnaData.visual,
        constraints: dnaData.constraints,
        promptVersion: 'legacy',
        model: 'legacy',
      });
    }

    return this.brandProfileRepository.findByOrganization(orgId);
  }

  async createDnaSnapshot(orgId: string, brandId: string, dto: CreateBrandDnaSnapshotDto) {
    const brand = await this.brandProfileRepository.findById(brandId, orgId);
    if (!brand) {
      throw new Error('Brand not found');
    }

    const latest = await this.brandDnaSnapshotRepository.findLatest(brandId);
    const nextVersion = latest ? latest.version + 1 : 1;

    return this.brandDnaSnapshotRepository.create({
      brandProfileId: brandId,
      version: nextVersion,
      sourceType: dto.sourceType,
      sourceUrl: dto.sourceUrl,
      summary: dto.summary,
      voice: dto.voice,
      audience: dto.audience,
      offer: dto.offer,
      visual: dto.visual,
      constraints: dto.constraints,
      promptVersion: 'manual',
      model: 'manual',
    });
  }

  async approveAsset(assetId: string) {
    return this.brandAssetRepository.approve(assetId);
  }

  async deleteAsset(assetId: string) {
    return this.brandAssetRepository.softDelete(assetId);
  }

  async validateBrandOwnership(orgId: string, brandId: string): Promise<void> {
    const valid = await this.brandProfileRepository.validateOwnership(brandId, orgId);
    if (!valid) {
      throw new Error('Brand not found or access denied');
    }
  }
}
