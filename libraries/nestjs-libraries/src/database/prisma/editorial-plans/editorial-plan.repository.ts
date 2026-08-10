import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { EditorialSlotStatus } from '@prisma/client';

@Injectable()
export class EditorialPlanRepository {
  constructor(private prisma: PrismaService) {}

  findByOrganization(orgId: string) {
    return this.prisma.editorialPlan.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByBrand(brandProfileId: string, orgId: string) {
    return this.prisma.editorialPlan.findMany({
      where: { brandProfileId, organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // orgId is required on every lookup by id: findUnique({ where: { id } }) would
  // happily return another tenant's plan, and passing `organizationId: undefined`
  // to Prisma drops the filter entirely rather than matching nothing.
  findById(id: string, orgId: string) {
    return this.prisma.editorialPlan.findFirst({
      where: { id, organizationId: orgId },
    });
  }

  create(data: {
    organizationId: string;
    brandProfileId: string;
    name: string;
    frequencyPerWeek?: number;
    platforms?: string[];
    pillars?: string[];
    objectives?: string[];
    languages?: string[];
    timezone?: string;
    blackoutDates?: string[];
    autoGenerate?: boolean;
  }) {
    return this.prisma.editorialPlan.create({ data });
  }

  update(id: string, data: Record<string, unknown>) {
    return this.prisma.editorialPlan.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.editorialPlan.delete({ where: { id } });
  }

  // Slots
  findSlotsByPlan(editorialPlanId: string, orgId: string) {
    return this.prisma.editorialSlot.findMany({
      where: { editorialPlanId, organizationId: orgId },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  findSlotsByBrand(brandProfileId: string, orgId: string) {
    return this.prisma.editorialSlot.findMany({
      where: { brandProfileId, organizationId: orgId },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  findSlotById(id: string, orgId: string) {
    return this.prisma.editorialSlot.findFirst({
      where: { id, organizationId: orgId },
    });
  }

  createSlot(data: {
    editorialPlanId: string;
    brandProfileId: string;
    organizationId: string;
    scheduledDate: Date;
    pillar?: string;
    objective?: string;
    platform?: string;
  }) {
    return this.prisma.editorialSlot.create({ data });
  }

  updateSlot(id: string, data: Record<string, unknown>) {
    return this.prisma.editorialSlot.update({ where: { id }, data });
  }

  countSlotsByPlanAndDate(editorialPlanId: string, date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return this.prisma.editorialSlot.count({
      where: {
        editorialPlanId,
        scheduledDate: { gte: start, lte: end },
      },
    });
  }
}
