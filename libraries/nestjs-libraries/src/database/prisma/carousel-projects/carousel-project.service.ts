import { Injectable } from '@nestjs/common';
import { CarouselProjectRepository } from './carousel-project.repository';
import { CarouselProjectStatus } from '@prisma/client';

@Injectable()
export class CarouselProjectService {
  constructor(private carouselProjectRepository: CarouselProjectRepository) {}

  async getProjects(orgId: string) {
    return this.carouselProjectRepository.findByOrganization(orgId);
  }

  async getProjectsByBrand(brandProfileId: string, status?: CarouselProjectStatus) {
    return this.carouselProjectRepository.findByBrandProfile(brandProfileId, status);
  }

  async getProject(id: string) {
    return this.carouselProjectRepository.findById(id);
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

  async updateProject(id: string, data: {
    title?: string;
    slides?: any;
    caption?: string;
    hashtags?: string[];
    status?: CarouselProjectStatus;
    metadata?: any;
    approvalStatus?: string;
    approvedBy?: string;
    approvedAt?: Date;
    rejectionReason?: string;
  }) {
    return this.carouselProjectRepository.update(id, data);
  }

  async updateStatus(id: string, status: CarouselProjectStatus) {
    return this.carouselProjectRepository.updateStatus(id, status);
  }

  async countByBrandAndStatus(brandProfileId: string, status: CarouselProjectStatus) {
    return this.carouselProjectRepository.countByBrandAndStatus(brandProfileId, status);
  }
}
