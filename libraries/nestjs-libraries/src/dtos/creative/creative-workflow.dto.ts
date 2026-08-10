import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class CreativeWorkflowNodeDto {
  @IsString()
  @MaxLength(80)
  nodeKey!: string;

  @IsString()
  @MaxLength(80)
  type!: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  position?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  inputSchema?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  outputSchema?: Record<string, unknown>;
}

export class CreativeWorkflowEdgeDto {
  @IsString()
  sourceNode!: string;

  @IsString()
  targetNode!: string;
}

export class CreateCreativeWorkflowDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreativeWorkflowNodeDto)
  nodes!: CreativeWorkflowNodeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreativeWorkflowEdgeDto)
  edges!: CreativeWorkflowEdgeDto[];

  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE'])
  status?: 'DRAFT' | 'ACTIVE';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  version?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  maxCredits?: number;
}

export class CreativeWorkflowQuoteDto {
  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsString()
  script?: string;
}

export class RunCreativeWorkflowDto {
  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class CreativeDuplicateWorkflowDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  version?: number;
}
