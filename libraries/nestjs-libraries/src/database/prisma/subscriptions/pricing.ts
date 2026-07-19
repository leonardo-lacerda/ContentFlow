export interface PricingInnerInterface {
  current: string;
  month_price: number;
  year_price: number;
  channel?: number;
  posts_per_month: number;
  team_members: boolean;
  community_features: boolean;
  featured_by_gitroom: boolean;
  ai: boolean;
  import_from_channels: boolean;
  image_generator?: boolean;
  image_generation_count: number;
  generate_videos: number;
  public_api: boolean;
  webhooks: number;
  autoPost: boolean;
  // Phase 7.2: Brand DNA limits
  brand_profiles: number;
  carousel_generations_per_month: number;
  dna_extractions_per_month: number;
  content_ideas_per_month: number;
  editorial_plans: number;
  team_member_count: number;
  /** Ampliar */
  ad_kits_per_month: number;
  email_campaigns_per_month: number;
  video_scripts_per_month: number;
}
export interface PricingInterface {
  [key: string]: PricingInnerInterface;
}

/**
 * ContentFlow v1+ pricing
 * - FREE (Início)
 * - STANDARD (Profissional R$79)
 * - PRO / TEAM / ULTIMATE: grandfather
 */
export const pricing: PricingInterface = {
  FREE: {
    current: 'FREE',
    month_price: 0,
    year_price: 0,
    channel: 1,
    image_generation_count: 10,
    posts_per_month: 15,
    team_members: false,
    community_features: false,
    featured_by_gitroom: false,
    ai: true,
    import_from_channels: false,
    image_generator: true,
    public_api: false,
    webhooks: 0,
    autoPost: false,
    generate_videos: 3,
    brand_profiles: 3,
    carousel_generations_per_month: 5,
    dna_extractions_per_month: 1,
    content_ideas_per_month: 10,
    editorial_plans: 2,
    team_member_count: 1,
    ad_kits_per_month: 3,
    email_campaigns_per_month: 2,
    video_scripts_per_month: 3,
  },
  STANDARD: {
    current: 'STANDARD',
    month_price: 79,
    year_price: 790,
    channel: 5,
    posts_per_month: 300,
    image_generation_count: 200,
    team_members: false,
    ai: true,
    community_features: false,
    featured_by_gitroom: false,
    import_from_channels: true,
    image_generator: true,
    public_api: false,
    webhooks: 0,
    autoPost: false,
    generate_videos: 40,
    brand_profiles: 10,
    carousel_generations_per_month: 40,
    dna_extractions_per_month: 10,
    content_ideas_per_month: 100,
    editorial_plans: 10,
    team_member_count: 1,
    ad_kits_per_month: 30,
    email_campaigns_per_month: 20,
    video_scripts_per_month: 40,
  },
  TEAM: {
    current: 'TEAM',
    month_price: 197,
    year_price: 1970,
    channel: 10,
    posts_per_month: 100000,
    image_generation_count: 100,
    community_features: true,
    team_members: true,
    featured_by_gitroom: true,
    ai: true,
    import_from_channels: true,
    image_generator: true,
    public_api: false,
    webhooks: 0,
    autoPost: false,
    generate_videos: 80,
    brand_profiles: 20,
    carousel_generations_per_month: 80,
    dna_extractions_per_month: 20,
    content_ideas_per_month: 200,
    editorial_plans: 30,
    team_member_count: 5,
    ad_kits_per_month: 60,
    email_campaigns_per_month: 40,
    video_scripts_per_month: 80,
  },
  PRO: {
    current: 'PRO',
    month_price: 149,
    year_price: 1490,
    channel: 8,
    posts_per_month: 100000,
    image_generation_count: 300,
    community_features: true,
    team_members: false,
    featured_by_gitroom: true,
    ai: true,
    import_from_channels: true,
    image_generator: true,
    public_api: false,
    webhooks: 0,
    autoPost: false,
    generate_videos: 60,
    brand_profiles: 15,
    carousel_generations_per_month: 80,
    dna_extractions_per_month: 20,
    content_ideas_per_month: 200,
    editorial_plans: 20,
    team_member_count: 1,
    ad_kits_per_month: 50,
    email_campaigns_per_month: 30,
    video_scripts_per_month: 60,
  },
  ULTIMATE: {
    current: 'ULTIMATE',
    month_price: 99,
    year_price: 950,
    channel: 100,
    posts_per_month: 1000000,
    image_generation_count: 500,
    community_features: true,
    team_members: true,
    featured_by_gitroom: true,
    ai: true,
    import_from_channels: true,
    image_generator: true,
    public_api: false,
    webhooks: 0,
    autoPost: false,
    generate_videos: 60,
    brand_profiles: 50,
    carousel_generations_per_month: -1,
    dna_extractions_per_month: -1,
    content_ideas_per_month: -1,
    editorial_plans: -1,
    team_member_count: -1,
    ad_kits_per_month: -1,
    email_campaigns_per_month: -1,
    video_scripts_per_month: -1,
  },
};
