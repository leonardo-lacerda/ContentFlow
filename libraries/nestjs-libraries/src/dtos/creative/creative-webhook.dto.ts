import { IsArray, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateCreativeWebhookDto {
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];
}
