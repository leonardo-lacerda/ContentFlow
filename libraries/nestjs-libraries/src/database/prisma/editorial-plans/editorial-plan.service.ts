import { Injectable } from '@nestjs/common';
import { EditorialPlanRepository } from './editorial-plan.repository';

@Injectable()
export class EditorialPlanService {
  constructor(private repository: EditorialPlanRepository) {}

  getPlans(orgId: string) {
    return this.repository.findByOrganization(orgId);
  }

  getPlansByBrand(brandProfileId: string) {
    return this.repository.findByBrand(brandProfileId);
  }

  getPlan(id: string) {
    return this.repository.findById(id);
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

  updatePlan(id: string, data: Record<string, unknown>) {
    return this.repository.update(id, data);
  }

  deletePlan(id: string) {
    return this.repository.delete(id);
  }

  getSlots(planId: string) {
    return this.repository.findSlotsByPlan(planId);
  }

  getSlotsByBrand(brandProfileId: string) {
    return this.repository.findSlotsByBrand(brandProfileId);
  }

  getSlot(id: string) {
    return this.repository.findSlotById(id);
  }

  updateSlot(id: string, data: Record<string, unknown>) {
    return this.repository.updateSlot(id, data);
  }

  async generateCalendar(planId: string, days: number = 30) {
    const plan = await this.repository.findById(planId);
    if (!plan) throw new Error('Editorial plan not found');

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
}
