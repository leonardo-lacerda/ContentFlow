export type EditorialSlotStatus =
  | 'PLANNED'
  | 'IDEAS_GENERATED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CAROUSEL_CREATED'
  | 'SCHEDULED'
  | 'PUBLISHED';

export interface EditorialPlan {
  id: string;
  brandProfileId: string;
  organizationId: string;
  name: string;
  frequencyPerWeek: number;
  platforms: string[];
  pillars: string[];
  objectives: string[];
  languages: string[];
  timezone: string;
  blackoutDates: string[];
  autoGenerate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EditorialSlot {
  id: string;
  editorialPlanId: string;
  brandProfileId: string;
  organizationId: string;
  scheduledDate: string;
  pillar?: string;
  objective?: string;
  platform: string;
  status: EditorialSlotStatus;
  contentIdeaId?: string;
  carouselProjectId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
