import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Supported social media platforms.
 */
export enum SocialPlatform {
  INSTAGRAM = 'instagram',
  LINKEDIN = 'linkedin',
  TIKTOK = 'tiktok',
  TWITTER = 'twitter',
  THREADS = 'threads',
  FACEBOOK = 'facebook',
}

/**
 * Supported tones for social post generation.
 */
export enum PostTone {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  HUMOROUS = 'humorous',
  INSPIRATIONAL = 'inspirational',
  EDUCATIONAL = 'educational',
  URGENT = 'urgent',
  PLAYFUL = 'playful',
  AUTHENTIC = 'authentic',
  STORYTELLING = 'storytelling',
}

export class GenerateSocialPostsDto {
  @IsOptional()
  @IsString()
  brandProfileId?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  topic?: string;

  @IsOptional()
  @IsString()
  contentIdeaId?: string;

  @IsOptional()
  @IsString()
  carouselProjectId?: string;

  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  platforms!: string[];

  @IsOptional()
  @IsEnum(PostTone)
  tone?: PostTone;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  additionalContext?: string;
}
