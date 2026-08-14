import { Injectable } from '@nestjs/common';
import { BrandLearningRepository } from './brand-learning.repository';
import { BrandLearningStatus, BrandLearningType } from '@prisma/client';

@Injectable()
export class BrandLearningService {
  constructor(private brandLearningRepository: BrandLearningRepository) {}

  async getLearnings(orgId: string, brandProfileId: string, status?: BrandLearningStatus) {
    return this.brandLearningRepository.findByBrand(orgId, brandProfileId, status);
  }

  async getLearning(orgId: string, id: string) {
    return this.brandLearningRepository.findById(id, orgId);
  }

  async createLearning(data: {
    brandProfileId: string;
    organizationId: string;
    type: BrandLearningType;
    title: string;
    description: string;
    evidence?: any;
    confidence?: number;
    metadata?: any;
  }) {
    await this.brandLearningRepository.assertBrandOwnership(
      data.brandProfileId,
      data.organizationId,
    );
    return this.brandLearningRepository.create(data);
  }

  async approveLearning(orgId: string, id: string) {
    return this.brandLearningRepository.approve(id, orgId);
  }

  async rejectLearning(orgId: string, id: string) {
    return this.brandLearningRepository.reject(id, orgId);
  }

  async applyLearning(orgId: string, id: string, version: number) {
    return this.brandLearningRepository.apply(id, orgId, version);
  }

  async getApprovedLearnings(orgId: string, brandProfileId: string) {
    return this.brandLearningRepository.findByBrand(
      orgId,
      brandProfileId,
      BrandLearningStatus.APPROVED
    );
  }

  async getLearningStats(orgId: string, brandProfileId: string) {
    return this.brandLearningRepository.countByStatus(brandProfileId, orgId);
  }
}
