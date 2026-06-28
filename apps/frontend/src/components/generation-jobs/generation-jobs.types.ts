export type GenerationJobStatus = 'QUEUED' | 'RUNNING' | 'WAITING_PROVIDER' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type GenerationJobType = 'BRAND_DNA_EXTRACTION' | 'IDEA_GENERATION' | 'CAROUSEL_PLAN' | 'IMAGE_GENERATION' | 'CAPTION_GENERATION' | 'BULK_GENERATION';

export interface GenerationJob {
  id: string;
  organizationId: string;
  brandProfileId?: string;
  carouselProjectId?: string;
  type: GenerationJobType;
  status: GenerationJobStatus;
  progress?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  model?: string;
  provider?: string;
  promptVersion?: string;
  schemaVersion?: string;
  usage?: Record<string, unknown>;
  costEstimate?: number;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}
