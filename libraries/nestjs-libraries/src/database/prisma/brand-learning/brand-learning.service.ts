import { Injectable } from '@nestjs/common';
import { BrandLearningRepository } from './brand-learning.repository';
import { BrandLearningStatus, BrandLearningType } from '@prisma/client';

@Injectable()
export class BrandLearningService {
  constructor(private brandLearningRepository: BrandLearningRepository) {}

  async getLearnings(brandProfileId: string, status?: BrandLearningStatus) {
    return this.brandLearningRepository.findByBrand(brandProfileId, status);
  }

  async getLearning(id: string) {
    return this.brandLearningRepository.findById(id);
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
    return this.brandLearningRepository.create(data);
  }

  async approveLearning(id: string) {
    return this.brandLearningRepository.approve(id);
  }

  async rejectLearning(id: string) {
    return this.brandLearningRepository.reject(id);
  }

  async applyLearning(id: string, version: number) {
    return this.brandLearningRepository.apply(id, version);
  }

  async getApprovedLearnings(brandProfileId: string) {
    return this.brandLearningRepository.findByBrand(
      brandProfileId,
      BrandLearningStatus.APPROVED
    );
  }

  async getLearningStats(brandProfileId: string) {
    return this.brandLearningRepository.countByStatus(brandProfileId);
  }
}
