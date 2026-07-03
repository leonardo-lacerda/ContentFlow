import { Injectable, NotFoundException } from '@nestjs/common';
import { CarouselDraftRepository } from './carousel-draft.repository';

@Injectable()
export class CarouselDraftService {
  constructor(private repository: CarouselDraftRepository) {}

  async saveDraft(orgId: string, data: {
    id?: string;
    brandProfileId?: string;
    status?: string;
    data: Record<string, unknown>;
  }) {
    return this.repository.upsertByOrg(orgId, data);
  }

  async getDraft(orgId: string, id: string) {
    const draft = await this.repository.findByIdAndOrg(id, orgId);
    if (!draft) {
      throw new NotFoundException('Draft not found');
    }
    return draft;
  }

  async listDrafts(orgId: string) {
    return this.repository.findByOrganization(orgId);
  }

  async deleteDraft(orgId: string, id: string) {
    const draft = await this.repository.findByIdAndOrg(id, orgId);
    if (!draft) {
      throw new NotFoundException('Draft not found');
    }
    return this.repository.delete(id, orgId);
  }
}
