import { Injectable } from '@nestjs/common';
import { CarouselProjectRepository } from './carousel-project.repository';
import { ApprovalStatus, CarouselProjectStatus } from '@prisma/client';

@Injectable()
export class CarouselProjectService {
  constructor(private carouselProjectRepository: CarouselProjectRepository) {}

  async getProjects(orgId: string) {
    return this.carouselProjectRepository.findByOrganization(orgId);
  }

  async getProjectsByBrand(orgId: string, brandProfileId: string, status?: CarouselProjectStatus) {
    return this.carouselProjectRepository.findByBrandProfile(orgId, brandProfileId, status);
  }

  async getProject(id: string, orgId: string) {
    return this.carouselProjectRepository.findById(id, orgId);
  }

  async createProject(data: {
    organizationId: string;
    brandProfileId: string;
    contentIdeaId?: string;
    title: string;
    slides: any;
    caption?: string;
    hashtags?: string[];
    metadata?: any;
  }) {
    return this.carouselProjectRepository.create(data);
  }

  async updateProject(id: string, orgId: string, data: {
    title?: string;
    slides?: any;
    caption?: string;
    hashtags?: string[];
    status?: CarouselProjectStatus;
    metadata?: any;
    approvalStatus?: ApprovalStatus;
    approvedBy?: string;
    approvedAt?: Date;
    rejectionReason?: string;
  }) {
    return this.carouselProjectRepository.update(id, orgId, data);
  }

  async updateStatus(id: string, orgId: string, status: CarouselProjectStatus) {
    return this.carouselProjectRepository.updateStatus(id, orgId, status);
  }

  async countByBrandAndStatus(orgId: string, brandProfileId: string, status: CarouselProjectStatus) {
    return this.carouselProjectRepository.countByBrandAndStatus(orgId, brandProfileId, status);
  }
}
