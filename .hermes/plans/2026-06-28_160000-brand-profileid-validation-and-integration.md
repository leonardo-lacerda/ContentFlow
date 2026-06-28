# Validação brandProfileId + Integração AI Generate

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Adicionar validação de ownership de brandProfileId em todos os controllers de geração e integrar brandProfileId nos endpoints de AI Generate.

**Architecture:** Criar um helper `validateBrandOwnership` centralizado no BrandProfileService (já existe mas não é chamado) e injetá-lo nos controllers que aceitam brandProfileId. Para AI Generate, adicionar brandProfileId como campo opcional nos DTOs e propagar no service.

**Tech Stack:** NestJS, Prisma, class-validator, TypeScript

---

## Fase 1: Validação de ownership do brandProfileId

### Task 1.1: Criar DTOs validados para ContentIdea e CarouselProject

**Objective:** Criar DTOs com class-validator para os campos que aceitam brandProfileId

**Files:**
- Create: `./libraries/nestjs-libraries/src/dtos/content-ideas/create-content-idea.dto.ts`
- Create: `./libraries/nestjs-libraries/src/dtos/content-ideas/create-carousel-project.dto.ts`
- Create: `./libraries/nestjs-libraries/src/dtos/generation-jobs/create-generation-job.dto.ts`

**Step 1: Create CreateContentIdeaDto**

```typescript
// ./libraries/nestjs-libraries/src/dtos/content-ideas/create-content-idea.dto.ts
import { IsString, IsOptional, IsNumber, MinLength, MaxLength, Min, Max } from 'class-validator';

export class CreateContentIdeaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  brandProfileId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  hook!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  goal!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  angle!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  templateSuggestion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  platformSuggestion?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;
}
```

**Step 2: Create CreateCarouselProjectDto**

```typescript
// ./libraries/nestjs-libraries/src/dtos/content-ideas/create-carousel-project.dto.ts
import { IsString, IsOptional, IsArray, IsObject, MinLength, MaxLength } from 'class-validator';

export class CreateCarouselProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  brandProfileId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  contentIdeaId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title!: string;

  @IsObject()
  slides!: any;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  caption?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: any;
}
```

**Step 3: Create CreateGenerationJobDto**

```typescript
// ./libraries/nestjs-libraries/src/dtos/generation-jobs/create-generation-job.dto.ts
import { IsString, IsOptional, IsNumber, IsIn, MinLength, MaxLength, Min } from 'class-validator';

export class CreateGenerationJobDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  brandProfileId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  carouselProjectId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  provider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  promptVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  schemaVersion?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costEstimate?: number;
}
```

### Task 1.2: Adicionar validação de ownership nos controllers

**Objective:** Chamar `validateOwnership` antes de criar registros com brandProfileId

**Files:**
- Modify: `./apps/backend/src/api/routes/content-ideas.controller.ts`
- Modify: `./apps/backend/src/api/routes/carousel-projects.controller.ts`
- Modify: `./apps/backend/src/api/routes/generation-jobs.controller.ts`

**Step 1: Inject BrandProfileService into ContentIdeaController**

Modify `content-ideas.controller.ts`:
- Import `BrandProfileService`
- Add to constructor: `private brandProfileService: BrandProfileService`
- In `createIdea`: call `await this.brandProfileService.validateOwnership(org.id, body.brandProfileId)` before creating
- Use `CreateContentIdeaDto` instead of inline type

**Step 2: Inject BrandProfileService into CarouselProjectController**

Modify `carousel-projects.controller.ts`:
- Import `BrandProfileService`
- Add to constructor: `private brandProfileService: BrandProfileService`
- In `createProject`: call `await this.brandProfileService.validateOwnership(org.id, body.brandProfileId)` before creating
- In `createFromIdea`: the brandProfileId comes from the idea (already validated), no additional check needed
- Use `CreateCarouselProjectDto` instead of inline type

**Step 3: Inject BrandProfileService into GenerationJobController**

Modify `generation-jobs.controller.ts`:
- Import `BrandProfileService`
- Add to constructor: `private brandProfileService: BrandProfileService`
- In `createJob`: if `body.brandProfileId` is provided, call `await this.brandProfileService.validateOwnership(org.id, body.brandProfileId)` before creating
- Use `CreateGenerationJobDto` instead of inline type

### Task 1.3: Registrar novos DTOs no module

**Objective:** Garantir que os DTOs estejam acessíveis (não precisam de provider pois são apenas classes de validação, mas verificar imports)

**Files:**
- Verify: `./apps/backend/src/api/api.module.ts` (BrandProfileService já está registrado)

---

## Fase 2: brandProfileId nos endpoints de AI Generate

### Task 2.1: Adicionar brandProfileId aos DTOs de AI Generate

**Objective:** Adicionar campo opcional brandProfileId aos DTOs de geração

**Files:**
- Modify: `./libraries/nestjs-libraries/src/dtos/ai-generate/ai-generate-carousel.dto.ts`
- Modify: `./libraries/nestjs-libraries/src/dtos/ai-generate/ai-generate-caption.dto.ts`
- Modify: `./libraries/nestjs-libraries/src/dtos/ai-generate/ai-generate-image.dto.ts`

**Step 1: Add brandProfileId to AiGenerateCarouselDto**

Add field:
```typescript
@IsString()
@IsOptional()
@MaxLength(128)
brandProfileId?: string;
```

**Step 2: Add brandProfileId to AiGenerateCaptionDto**

Add field:
```typescript
@IsString()
@IsOptional()
@MaxLength(128)
brandProfileId?: string;
```

**Step 3: Add brandProfileId to AiGenerateImageDto**

Add field:
```typescript
@IsString()
@IsOptional()
@MaxLength(128)
brandProfileId?: string;
```

### Task 2.2: Validar brandProfileId no AiGenerateController

**Objective:** Validar ownership quando brandProfileId é fornecido nos endpoints de AI Generate

**Files:**
- Modify: `./apps/backend/src/api/routes/ai-generate.controller.ts`

**Step 1: Inject BrandProfileService into AiGenerateController**

- Import `BrandProfileService`
- Add to constructor: `private brandProfileService: BrandProfileService`
- In each endpoint that accepts a body with optional brandProfileId, add validation:
  - `generateCarouselPlan`: if `body.brandProfileId` → validate
  - `generateCarouselIdeas`: if `body.brandProfileId` → validate
  - `generateCarouselCaption`: if `body.brandProfileId` → validate
  - `generateImage`: if `body.brandProfileId` → validate

### Task 2.3: Propagar brandProfileId no AiGenerateService (opcional/futuro)

**Objective:** O service pode receber brandProfileId para lookup de DNA da marca no futuro. Por agora, apenas aceitar e ignorar (o campo existe no DTO para validação e logging).

**Files:**
- No changes needed no AiGenerateService por enquanto - o DTO já aceita o campo, o controller já valida. O service pode ser estendido no futuro para usar o DNA.

---

## Validação Final

### Task 3.1: Verificar que tudo compila

**Objective:** Rodar build do backend para verificar erros de tipagem

**Command:** `cd apps/backend && npx tsc --noEmit` ou `pnpm run build` no backend

### Task 3.2: Commit

```bash
git add -A
git commit -m "feat: brandProfileId validation in generation flows + AI Generate DTOs"
```

---

## Arquivos que vão mudar (resumo)

| Arquivo | Ação |
|---|---|
| `libraries/nestjs-libraries/src/dtos/content-ideas/create-content-idea.dto.ts` | Criar |
| `libraries/nestjs-libraries/src/dtos/content-ideas/create-carousel-project.dto.ts` | Criar |
| `libraries/nestjs-libraries/src/dtos/generation-jobs/create-generation-job.dto.ts` | Criar |
| `apps/backend/src/api/routes/content-ideas.controller.ts` | Modificar |
| `apps/backend/src/api/routes/carousel-projects.controller.ts` | Modificar |
| `apps/backend/src/api/routes/generation-jobs.controller.ts` | Modificar |
| `apps/backend/src/api/routes/ai-generate.controller.ts` | Modificar |
| `libraries/nestjs-libraries/src/dtos/ai-generate/ai-generate-carousel.dto.ts` | Modificar |
| `libraries/nestjs-libraries/src/dtos/ai-generate/ai-generate-caption.dto.ts` | Modificar |
| `libraries/nestjs-libraries/src/dtos/ai-generate/ai-generate-image.dto.ts` | Modificar |
