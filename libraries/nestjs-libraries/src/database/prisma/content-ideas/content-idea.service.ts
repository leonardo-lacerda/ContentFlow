import { Injectable } from '@nestjs/common';
import { ContentIdeaRepository } from './content-idea.repository';
import { ContentIdeaStatus } from '@prisma/client';

@Injectable()
export class ContentIdeaService {
  constructor(private contentIdeaRepository: ContentIdeaRepository) {}

  async getIdeas(orgId: string) {
    return this.contentIdeaRepository.findByOrganization(orgId);
  }

  async getIdeasByBrand(orgId: string, brandProfileId: string, status?: ContentIdeaStatus) {
    return this.contentIdeaRepository.findByBrandProfile(orgId, brandProfileId, status);
  }

  async getIdea(id: string, orgId: string) {
    return this.contentIdeaRepository.findById(id, orgId);
  }

  async createIdea(data: {
    organizationId: string;
    brandProfileId: string;
    title: string;
    hook: string;
    goal: string;
    angle: string;
    templateSuggestion?: string;
    platformSuggestion?: string;
    score?: number;
  }) {
    return this.contentIdeaRepository.create(data);
  }

  async approveIdea(id: string, orgId: string) {
    return this.contentIdeaRepository.updateStatus(id, orgId, ContentIdeaStatus.APPROVED);
  }

  async rejectIdea(id: string, orgId: string, reason?: string) {
    return this.contentIdeaRepository.updateStatus(id, orgId, ContentIdeaStatus.REJECTED, reason);
  }

  async saveIdea(id: string, orgId: string) {
    return this.contentIdeaRepository.updateStatus(id, orgId, ContentIdeaStatus.SAVED);
  }

  async archiveIdea(id: string, orgId: string) {
    return this.contentIdeaRepository.updateStatus(id, orgId, ContentIdeaStatus.ARCHIVED);
  }

  async markAsUsed(id: string, orgId: string) {
    return this.contentIdeaRepository.updateStatus(id, orgId, ContentIdeaStatus.USED);
  }

  async getExistingTitles(brandProfileId: string) {
    const ideas = await this.contentIdeaRepository.findExistingTitles(brandProfileId);
    return ideas.map(i => i.title);
  }

  async countByBrandAndStatus(brandProfileId: string, status: ContentIdeaStatus) {
    return this.contentIdeaRepository.countByBrandAndStatus(brandProfileId, status);
  }
}
