import { Injectable } from '@nestjs/common';
import { GenerationJobRepository } from './generation-job.repository';
import { GenerationJobStatus, GenerationJobType } from '@prisma/client';

@Injectable()
export class GenerationJobService {
  constructor(private generationJobRepository: GenerationJobRepository) {}

  async getJobs(orgId: string) {
    return this.generationJobRepository.findByOrganization(orgId);
  }

  async getJob(id: string) {
    return this.generationJobRepository.findById(id);
  }

  async createJob(data: {
    organizationId: string;
    brandProfileId?: string;
    carouselProjectId?: string;
    type: GenerationJobType;
    idempotencyKey?: string;
    model?: string;
    provider?: string;
    promptVersion?: string;
    schemaVersion?: string;
    costEstimate?: number;
  }) {
    // Check idempotency key if provided
    if (data.idempotencyKey) {
      const existing = await this.generationJobRepository.findByIdempotencyKey(data.idempotencyKey);
      if (existing) {
        return existing;
      }
    }
    return this.generationJobRepository.create(data);
  }

  async startJob(id: string) {
    return this.generationJobRepository.updateStatus(id, 'RUNNING');
  }

  async waitingProvider(id: string) {
    return this.generationJobRepository.updateStatus(id, 'WAITING_PROVIDER');
  }

  async completeJob(id: string, result: any, usage?: any) {
    return this.generationJobRepository.complete(id, result, usage);
  }

  async failJob(id: string, error: string) {
    return this.generationJobRepository.fail(id, error);
  }

  async cancelJob(id: string) {
    return this.generationJobRepository.cancel(id);
  }

  async updateProgress(id: string, progress: any) {
    return this.generationJobRepository.updateProgress(id, progress);
  }

  async countActiveJobs(orgId: string) {
    return this.generationJobRepository.countByOrgAndStatus(orgId, 'RUNNING');
  }
}
