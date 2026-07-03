export interface CarouselPerformance {
  id: string;
  carouselProjectId: string;
  postId?: string;
  organizationId: string;
  brandProfileId: string;
  platform: string;
  impressions: number;
  reach: number;
  saves: number;
  shares: number;
  comments: number;
  clicks: number;
  likes: number;
  engagementRate: number;
  reachRate: number;
  normalizedScore: number;
  rawMetrics?: any;
  periodStart?: string;
  periodEnd?: string;
  collectedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformAggregation {
  platform: string;
  _avg: {
    engagementRate: number | null;
    reachRate: number | null;
    normalizedScore: number | null;
  };
  _sum: {
    impressions: number | null;
    reach: number | null;
    saves: number | null;
    shares: number | null;
    comments: number | null;
    clicks: number | null;
    likes: number | null;
  };
  _count: number;
}

export interface TemplateAggregation {
  template: string | null;
  avgEngagementRate: number | null;
  avgNormalizedScore: number | null;
  totalImpressions: number | null;
  totalReach: number | null;
  totalSaves: number | null;
  totalShares: number | null;
  totalComments: number | null;
  totalClicks: number | null;
  totalLikes: number | null;
  recordCount: number;
}

export interface ThemeAggregation {
  theme: string | null;
  avgEngagementRate: number | null;
  avgNormalizedScore: number | null;
  totalImpressions: number | null;
  totalReach: number | null;
  recordCount: number;
}

export interface BrandAggregation {
  brandProfileId: string;
  _avg: {
    engagementRate: number | null;
    reachRate: number | null;
    normalizedScore: number | null;
  };
  _sum: {
    impressions: number | null;
    reach: number | null;
    saves: number | null;
    shares: number | null;
    comments: number | null;
    clicks: number | null;
    likes: number | null;
  };
  _count: number;
}

export interface TrendData {
  date: string;
  avgEngagementRate: number | null;
  avgNormalizedScore: number | null;
  totalImpressions: number | null;
  totalReach: number | null;
  recordCount: number;
}

export interface DashboardData {
  byPlatform: PlatformAggregation[];
  byTemplate: TemplateAggregation[];
  byTheme: ThemeAggregation[];
  topPerformers: (CarouselPerformance & {
    carouselProject?: {
      id: string;
      title: string;
      metadata?: any;
    };
  })[];
  brandAggregated: BrandAggregation | null;
  trend: TrendData[] | null;
}
