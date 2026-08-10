import { Injectable, NotFoundException } from '@nestjs/common';
import { EditorialPlanRepository } from './editorial-plan.repository';
import { PlanLimitsService } from '../subscriptions/plan-limits.service';

// Fields a client is allowed to set through the generic update endpoints.
// Without this, a `Record<string, unknown>` body reaches Prisma untouched and
// `organizationId` becomes writable — letting a caller move a plan into their
// own org and sidestep every ownership check below.
const UPDATABLE_PLAN_FIELDS = [
  'name',
  'frequencyPerWeek',
  'platforms',
  'pillars',
  'objectives',
  'languages',
  'timezone',
  'blackoutDates',
  'autoGenerate',
  'generationWindow',
  'maxCostPerMonth',
] as const;

const UPDATABLE_SLOT_FIELDS = [
  'scheduledDate',
  'pillar',
  'objective',
  'platform',
  'status',
  'contentIdeaId',
  'carouselProjectId',
  'notes',
] as const;

const pick = (
  data: Record<string, unknown>,
  allowed: readonly string[]
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(data ?? {}).filter(([key]) => allowed.includes(key))
  );

@Injectable()
export class EditorialPlanService {
  constructor(
    private repository: EditorialPlanRepository,
    private planLimitsService: PlanLimitsService,
  ) {}

  private async assertPlan(planId: string, orgId: string) {
    const plan = await this.repository.findById(planId, orgId);
    if (!plan) {
      throw new NotFoundException('Editorial plan not found');
    }
    return plan;
  }

  getPlans(orgId: string) {
    return this.repository.findByOrganization(orgId);
  }

  getPlansByBrand(brandProfileId: string, orgId: string) {
    return this.repository.findByBrand(brandProfileId, orgId);
  }

  getPlan(id: string, orgId: string) {
    return this.assertPlan(id, orgId);
  }

  createPlan(data: {
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
    return this.repository.create(data);
  }

  async updatePlan(id: string, orgId: string, data: Record<string, unknown>) {
    await this.assertPlan(id, orgId);
    return this.repository.update(id, pick(data, UPDATABLE_PLAN_FIELDS));
  }

  async deletePlan(id: string, orgId: string) {
    await this.assertPlan(id, orgId);
    return this.repository.delete(id);
  }

  async getSlots(planId: string, orgId: string) {
    await this.assertPlan(planId, orgId);
    return this.repository.findSlotsByPlan(planId, orgId);
  }

  getSlotsByBrand(brandProfileId: string, orgId: string) {
    return this.repository.findSlotsByBrand(brandProfileId, orgId);
  }

  async getSlot(id: string, orgId: string) {
    const slot = await this.repository.findSlotById(id, orgId);
    if (!slot) {
      throw new NotFoundException('Editorial slot not found');
    }
    return slot;
  }

  async updateSlot(id: string, orgId: string, data: Record<string, unknown>) {
    await this.getSlot(id, orgId);
    return this.repository.updateSlot(id, pick(data, UPDATABLE_SLOT_FIELDS));
  }

  async generateCalendar(planId: string, orgId: string, days: number = 30) {
    const plan = await this.assertPlan(planId, orgId);
    await this.planLimitsService.enforceLimit(plan.organizationId, 'editorial_plan');

    const slots = [];
    const now = new Date();
    const pillars = plan.pillars.length > 0 ? plan.pillars : ['Geral'];
    const objectives = plan.objectives.length > 0 ? plan.objectives : ['Engajamento'];
    const platforms = plan.platforms.length > 0 ? plan.platforms : ['instagram'];

    for (let dayOffset = 1; dayOffset <= days; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() + dayOffset);

      // Skip blackout dates
      const dateStr = date.toISOString().split('T')[0];
      if (plan.blackoutDates.includes(dateStr)) continue;

      // Check day of week (0=Sun, 6=Sat)
      const dayOfWeek = date.getDay();
      // Calculate posts per day based on frequency
      const postsPerDay = Math.ceil(plan.frequencyPerWeek / 5);

      // Skip weekends if frequency <= 5
      if (plan.frequencyPerWeek <= 5 && (dayOfWeek === 0 || dayOfWeek === 6)) continue;

      for (let i = 0; i < postsPerDay; i++) {
        const pillar = pillars[slots.length % pillars.length];
        const objective = objectives[slots.length % objectives.length];
        const platform = platforms[slots.length % platforms.length];

        // Check if slot already exists for this date
        const existingCount = await this.repository.countSlotsByPlanAndDate(planId, date);
        if (existingCount > 0) continue;

        const slot = await this.repository.createSlot({
          editorialPlanId: planId,
          brandProfileId: plan.brandProfileId,
          organizationId: plan.organizationId,
          scheduledDate: date,
          pillar,
          objective,
          platform,
        });
        slots.push(slot);
      }
    }

    return { generated: slots.length, slots };
  }

  async runGeneration(planId: string, orgId: string) {
    const plan = await this.assertPlan(planId, orgId);
    await this.planLimitsService.enforceLimit(plan.organizationId, 'editorial_plan');
    if (!plan.autoGenerate) throw new Error('Auto-generation is not enabled for this plan');

    // Generate calendar for next 30 days if no slots exist
    const existingSlots = await this.repository.findSlotsByPlan(planId, orgId);
    if (existingSlots.length === 0) {
      await this.generateCalendar(planId, orgId, 30);
    }

    // Update lastRunAt and reset consecutive fails
    await this.repository.update(planId, {
      lastRunAt: new Date(),
      consecutiveFails: 0,
    });

    return { success: true, message: 'Generation triggered successfully' };
  }

  async toggleAutoGeneration(planId: string, orgId: string, autoGenerate: boolean) {
    await this.assertPlan(planId, orgId);
    return this.repository.update(planId, { autoGenerate });
  }
}
