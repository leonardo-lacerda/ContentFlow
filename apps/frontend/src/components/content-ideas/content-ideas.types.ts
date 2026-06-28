export type ContentIdeaStatus = 'NEW' | 'APPROVED' | 'REJECTED' | 'SAVED' | 'USED' | 'ARCHIVED';

export type ApprovalStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ContentIdea {
  id: string;
  organizationId: string;
  brandProfileId: string;
  title: string;
  hook: string;
  goal: string;
  angle: string;
  templateSuggestion?: string;
  platformSuggestion?: string;
  score?: number;
  status: ContentIdeaStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type CarouselProjectStatus = 'DRAFT' | 'GENERATING' | 'REVIEW' | 'READY' | 'PUBLISHED' | 'FAILED';

export interface CarouselSlide {
  headline: string;
  body: string;
  cta?: string;
  imageUrl?: string;
  altText?: string;
}

export interface CarouselProject {
  id: string;
  organizationId: string;
  brandProfileId: string;
  contentIdeaId?: string;
  title: string;
  caption?: string;
  hashtags: string[];
  status: CarouselProjectStatus;
  slides: CarouselSlide[];
  metadata?: Record<string, unknown>;
  approvalStatus?: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}
