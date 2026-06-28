import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateBrandDnaSnapshotDto {
  @IsString()
  sourceType!: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsObject()
  summary!: Record<string, any>;

  @IsObject()
  voice!: Record<string, any>;

  @IsObject()
  audience!: Record<string, any>;

  @IsObject()
  offer!: Record<string, any>;

  @IsObject()
  visual!: Record<string, any>;

  @IsObject()
  constraints!: Record<string, any>;
}
