# 🔴 Subfase P1-1: Jobs de Imagem em Memória → Prisma + Temporal

> **Fase:** CRÍTICO — Riscos de Infraestrutura
> **Subfase:** P1-1
> **Status:** Especificação Técnica Completa
> **Data:** 2026-07-02
> **Autor:** Hermes Agent

---

## 1. Objetivo

Migrar o sistema de jobs de geração de imagens de carrossel de **armazenamento volátil em memória** (`Map<string, CarouselImageJob>`) para **persistência em banco de dados** (`GenerationJob` Prisma) com **execução via Temporal** (`apps/orchestrator`), adicionando retry automático, dead-letter queue, circuit breaker, limite de concorrência por organização, idempotência e notificação ao usuário.

---

## 2. Contexto

### 2.1 Problema Atual

O arquivo `libraries/nestjs-libraries/src/ai-generate/ai-generate.service.ts` contém:

```typescript
// Linha 83
const carouselImageJobs = new Map<string, CarouselImageJob>();

// Linha 84
const costLedger = new Map<string, AiGenerateCostLedgerEntry[]>();
```

O método `startCarouselImageJob()` (linha 1364):
1. Cria um objeto `CarouselImageJob` em memória
2. Armazena no `Map` com chave de ID
3. Dispara `void this.runCarouselImageJob(job)` (fire-and-forget)
4. Retorna status imediatamente ao frontend
5. Frontend faz polling via `GET /ai-generate/carousel-image-jobs/:id`
6. Após 6 horas (TTL configurável), o job é deletado do Map via `setTimeout`

O método `runCarouselImageJob()` (linha 1439):
1. Cria um pool de workers (2-4 concorrentes, configurável via `AI_GENERATE_JOB_CONCURRENCY`)
2. Para cada slide, chama `this.generateImage(orgId, slide.request)`
3. Registra sucesso/erro por slide
4. Ao finalizar, marca job como `completed` ou `failed`
5. Agenda deleção após TTL

### 2.2 Por Que Isso É Crítico

| Problema | Impacto | Severidade |
|----------|---------|------------|
| **Perda em restart/deploy** | Todos os jobs em andamento são perdidos sem aviso | ALTA |
| **Sem retry** | Falha de provider = slide perdido permanentemente | ALTA |
| **Sem observabilidade** | Operador não vê jobs ativos, taxa de falha ou tempo médio | ALTA |
| **Sem isolamento por org** | Uma org pode consumir toda a capacidade (concorrência global 2-4) | ALTA |
| **Sem dead-letter** | Jobs que falham repetidamente ficam em estado inconsistente | MÉDIA |
| **Sem circuit breaker** | Provider com problema continua recebendo chamadas | MÉDIA |
| **Sem idempotência** | Reenvio duplicado cria jobs duplicados | MÉDIA |
| **TTL arbitrário** | Jobs deletados após 6h sem possibilidade de recuperação | MÉDIA |

### 2.3 Estado Atual do Model Prisma

O model `GenerationJob` **já existe** no schema Prisma (linha 1157):

```prisma
model GenerationJob {
  id             String               @id @default(uuid())
  organizationId String
  brandProfileId String?
  carouselProjectId String?
  type           GenerationJobType
  status         GenerationJobStatus  @default(QUEUED)
  progress       Json?
  result         Json?
  error          String?
  model          String?
  provider       String?
  promptVersion  String?
  schemaVersion  String?
  usage          Json?
  costEstimate   Float?
  idempotencyKey String?              @unique
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt
  startedAt      DateTime?
  completedAt    DateTime?
  organization   Organization         @relation(...)

  @@index([organizationId])
  @@index([status])
  @@index([type])
  @@index([carouselProjectId])
  @@index([idempotencyKey])
}
```

**Enums já existentes:**

```prisma
enum GenerationJobStatus {
  QUEUED
  RUNNING
  WAITING_PROVIDER
  COMPLETED
  FAILED
  CANCELLED
  PARTIAL
}

enum GenerationJobType {
  BRAND_DNA_EXTRACTION
  IDEA_GENERATION
  CAROUSEL_PLAN
  IMAGE_GENERATION        // ← Este é o tipo para jobs de imagem
  CAPTION_GENERATION
  BULK_GENERATION
  SOCIAL_POST_GENERATION
  AD_CREATIVE_GENERATION
  EMAIL_GENERATION
  VIDEO_GENERATION
  VIDEO_SCRIPT
}
```

### 2.4 O Que JÁ Existe

| Componente | Status | Arquivo |
|-----------|--------|---------|
| Model Prisma `GenerationJob` | ✅ Criado | `schema.prisma:1157` |
| Enum `GenerationJobStatus` | ✅ Criado | `schema.prisma:1133` |
| Enum `GenerationJobType` | ✅ Criado | `schema.prisma:1143` |
| Controller `GenerationJobController` | ✅ Criado (5 endpoints) | `generation-job.controller.ts` |
| Service `GenerationJobService` | ⚠️ Possivelmente stub | `generation-job.service.ts` |
| Migrations | ✅ Criadas | `20260628150000` |
| Jobs em memória (Map) | ❌ Ainda em uso | `ai-generate.service.ts:83` |
| Temporal workflows para imagem | ❌ Não implementado | `apps/orchestrator/` |
| Retry automático | ❌ Não implementado | — |
| Dead-letter queue | ❌ Não implementado | — |
| Circuit breaker | ❌ Não implementado | — |
| Concorrência por org | ❌ Não implementado | — |
| Idempotência | ❌ Não implementada | — |
| Notificação ao usuário | ❌ Não implementada | — |

---

## 3. Escopo da Subfase

### 3.1 O Que Será Implementado

1. **Persistência do job no banco** — Criar/atualizar `GenerationJob` via Prisma ao invés de Map
2. **Execução via Temporal** — Mover `runCarouselImageJob` para workflow Temporal no orchestrator
3. **Retry automático** — Retry com backoff exponencial por slide (max 3 tentativas)
4. **Dead-letter queue** — Jobs que falham 3+ vezes vão para DLQ com alerta
5. **Circuit breaker** — Pausar chamadas a provider com taxa de falha > 50% nos últimos 5 min
6. **Concorrência por organização** — Max 2 jobs simultâneos por org (configurável)
7. **Idempotência** — Idempotency key para prevenir jobs duplicados
8. **Notificação** — Evento quando job completa ou falha (para frontend via polling ou WebSocket futuro)
9. **Cleanup automático** — Deletar jobs completos/falhos após 7 dias (configurável)

### 3.2 O Que NÃO Será Implementado Nesta Subfase

- Dashboard de observabilidade de jobs (será Fase 5)
- Dashboard de custos (será P1-2)
- migração do `costLedger` (será P1-2)
- WebSocket para notificações em tempo real (pode ser feito depois)
- Dashboard de métricas por provider (será Fase 5)

---

## 4. Arquitetura

### 4.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                      │
│                                                              │
│  useAiGenerateImagesStudio                                   │
│    ├── POST /ai-generate/carousel-image-jobs → criar job     │
│    └── GET  /ai-generate/carousel-image-jobs/:id → polling   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────────┐
│                    BACKEND (NestJS)                           │
│                                                              │
│  AiGenerateController                                        │
│    ├── startCarouselImageJob() → GenerationJobService        │
│    └── getCarouselImageJob()   → GenerationJobService        │
│                                                              │
│  AiGenerateService                                           │
│    ├── startCarouselImageJob() → criar job no Prisma         │
│    ├── getCarouselImageJob()   → ler job do Prisma           │
│    └── generateImage()         → chamar provider de IA       │
│                                                              │
│  GenerationJobService (NOVO)                                 │
│    ├── create()         → INSERT no Prisma                   │
│    ├── update()         → UPDATE no Prisma                   │
│    ├── findById()       → SELECT no Prisma                   │
│    ├── findByOrg()      → SELECT por organizationId          │
│    ├── markRunning()    → status=RUNNING, startedAt=now      │
│    ├── markCompleted()  → status=COMPLETED, completedAt=now  │
│    ├── markFailed()     → status=FAILED, error= msg          │
│    ├── markCancelled()  → status=CANCELLED                   │
│    ├── countActive()    → COUNT WHERE status IN (QUEUED,RUNNING) │
│    └── moveToDlq()      → status=FAILED + log de DLQ        │
│                                                              │
│  CircuitBreakerService (NOVO)                                │
│    ├── canExecute(provider) → verificar se provider está OK  │
│    ├── recordSuccess(provider) → resetar contador de falhas  │
│    └── recordFailure(provider) → incrementar contador        │
│                                                              │
│  ConcurrencyGuard (NOVO)                                     │
│    └── canStartJob(orgId) → COUNT jobs ativos < max          │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │   Temporal (orchestrator) │
              │                          │
              │  CarouselImageWorkflow    │
              │    ├── activity: generateSlideImage()           │
              │    ├── activity: updateJobProgress()            │
              │    ├── activity: notifyJobComplete()            │
              │    └── retry policy: max 3, backoff exponencial │
              │                          │
              │  Workflow: 1 job = 1 instância do workflow      │
              │  Activities: 1 slide = 1 chamada de activity    │
              └────────────┬─────────────┘
                           │
              ┌────────────▼─────────────┐
              │    Providers de IA        │
              │    ├── ia_generate        │
              │    └── openai_official    │
              └──────────────────────────┘
```

### 4.2 Fluxo de Execução

```
1. Frontend envia POST /ai-generate/carousel-image-jobs
   ├── body: { slides: [{ slideIndex: 1, request: { prompt: "...", ... } }, ...] }
   │
2. Backend: AiGenerateService.startCarouselImageJob()
   ├── Valida slides (min 1, max 20)
   ├── Verifica idempotencyKey (se fornecida)
   ├── Verifica concorrência por org (ConcurrentJobGuard)
   ├── Cria GenerationJob no Prisma (status: QUEUED)
   ├── Dispara Temporal workflow (CarouselImageWorkflow)
   └── Retorna { id, status, total, ... }
   
3. Temporal: CarouselImageWorkflow.execute(jobId)
   ├── activity: updateJobProgress(jobId, 'RUNNING')
   ├── Para cada slide (com concorrência controlada):
   │   ├── activity: generateSlideImage(orgId, slideRequest)
   │   │   ├── Verifica CircuitBreaker para o provider
   │   │   ├── Chama provider de IA
   │   │   ├── Registra custo no GenerationCost
   │   │   ├── Em caso de SUCESSO:
   │   │   │   ├── activity: updateSlideProgress(jobId, slideIndex, 'completed', result)
   │   │   │   └── CircuitBreaker.recordSuccess(provider)
   │   │   └── Em caso de FALHA:
   │   │       ├── Retry policy: max 3, backoff exponencial (1s, 4s, 16s)
   │   │       ├── Se esgotou retries:
   │   │       │   ├── activity: updateSlideProgress(jobId, slideIndex, 'failed', error)
   │   │       │   └── CircuitBreaker.recordFailure(provider)
   │   │       └── Se tem retries: retry com backoff
   │   │
   ├── Após todos os slides:
   │   ├── Se todos OK: activity: updateJobProgress(jobId, 'COMPLETED')
   │   ├── Se alguns falharam: activity: updateJobProgress(jobId, 'PARTIAL')
   │   ├── Se todos falharam: activity: updateJobProgress(jobId, 'FAILED')
   │   └── activity: notifyJobComplete(jobId)
   │
4. Frontend: polling GET /ai-generate/carousel-image-jobs/:id
   ├── Retorna status atual do job com progresso por slide
   └── Quando status = COMPLETED/PARTIAL/FAILED → mostrar resultado
```

---

## 5. Implementação Detalhada

### 5.1 Arquivos a Criar

| Arquivo | Caminho | Responsabilidade |
|---------|---------|-----------------|
| `generation-job.service.ts` | `libraries/nestjs-libraries/src/database/prisma/generation-jobs/generation-job.service.ts` | CRUD de jobs no Prisma |
| `generation-job.repository.ts` | `libraries/nestjs-libraries/src/database/prisma/generation-jobs/generation-job.repository.ts` | Queries Prisma |
| `generation-job.module.ts` | `libraries/nestjs-libraries/src/database/prisma/generation-jobs/generation-job.module.ts` | Módulo NestJS |
| `circuit-breaker.service.ts` | `libraries/nestjs-libraries/src/ai-generate/circuit-breaker.service.ts` | Circuit breaker em memória |
| `concurrency.guard.ts` | `apps/backend/src/api/guards/concurrency.guard.ts` | Guard de concorrência por org |
| `carousel-image.workflow.ts` | `apps/orchestrator/src/workflows/carousel-image.workflow.ts` | Workflow Temporal |
| `carousel-image.activities.ts` | `apps/orchestrator/src/activities/carousel-image.activities.ts` | Activities Temporal |

### 5.2 Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `ai-generate.service.ts` | Substituir Map por GenerationJobService, integrar Temporal |
| `ai-generate.controller.ts` | Adicionar guard de concorrência, usar service persistente |
| `api.module.ts` | Registrar GenerationJobModule, CircuitBreakerService |
| `orchestrator/src/app.module.ts` | Registrar CarouselImageWorkflow |

### 5.3 Detalhamento por Arquivo

#### 5.3.1 `generation-job.repository.ts`

```typescript
// Caminho: libraries/nestjs-libraries/src/database/prisma/generation-jobs/generation-job.repository.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GenerationJob, GenerationJobStatus, Prisma } from '@prisma/client';

@Injectable()
export class GenerationJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Criar novo job de geração
   */
  async create(data: {
    organizationId: string;
    brandProfileId?: string;
    carouselProjectId?: string;
    type: string; // GenerationJobType
    idempotencyKey?: string;
    model?: string;
    provider?: string;
    costEstimate?: number;
    progress?: Prisma.InputJsonValue;
  }): Promise<GenerationJob> {
    return this.prisma.generationJob.create({
      data: {
        organizationId: data.organizationId,
        brandProfileId: data.brandProfileId,
        carouselProjectId: data.carouselProjectId,
        type: data.type as any,
        status: 'QUEUED',
        idempotencyKey: data.idempotencyKey,
        model: data.model,
        provider: data.provider,
        costEstimate: data.costEstimate,
        progress: data.progress,
      },
    });
  }

  /**
   * Buscar job por ID (com verificação de organização)
   */
  async findById(orgId: string, id: string): Promise<GenerationJob | null> {
    return this.prisma.generationJob.findFirst({
      where: { id, organizationId: orgId },
    });
  }

  /**
   * Buscar job por idempotency key
   */
  async findByIdempotencyKey(key: string): Promise<GenerationJob | null> {
    return this.prisma.generationJob.findUnique({
      where: { idempotencyKey: key },
    });
  }

  /**
   * Atualizar status do job
   */
  async updateStatus(
    id: string,
    status: GenerationJobStatus,
    extra?: {
      error?: string;
      result?: Prisma.InputJsonValue;
      startedAt?: Date;
      completedAt?: Date;
    }
  ): Promise<GenerationJob> {
    const data: Prisma.GenerationJobUpdateInput = { status };
    if (extra?.error !== undefined) data.error = extra.error;
    if (extra?.result !== undefined) data.result = extra.result;
    if (extra?.startedAt) data.startedAt = extra.startedAt;
    if (extra?.completedAt) data.completedAt = extra.completedAt;

    return this.prisma.generationJob.update({
      where: { id },
      data,
    });
  }

  /**
   * Atualizar progresso do job (progress JSON)
   */
  async updateProgress(
    id: string,
    progress: Prisma.InputJsonValue
  ): Promise<GenerationJob> {
    return this.prisma.generationJob.update({
      where: { id },
      data: { progress },
    });
  }

  /**
   * Contar jobs ativos de uma organização
   */
  async countActiveByOrg(orgId: string): Promise<number> {
    return this.prisma.generationJob.count({
      where: {
        organizationId: orgId,
        status: { in: ['QUEUED', 'RUNNING', 'WAITING_PROVIDER'] },
      },
    });
  }

  /**
   * Listar jobs de uma organização (paginado)
   */
  async findByOrg(
    orgId: string,
    options?: {
      status?: GenerationJobStatus;
      type?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<GenerationJob[]> {
    const where: Prisma.GenerationJobWhereInput = {
      organizationId: orgId,
    };
    if (options?.status) where.status = options.status;
    if (options?.type) where.type = options.type as any;

    return this.prisma.generationJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });
  }

  /**
   * Cleanup: deletar jobs antigos (> dias configurável)
   */
  async cleanupOldJobs(olderThanDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await this.prisma.generationJob.deleteMany({
      where: {
        status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
        completedAt: { lt: cutoff },
      },
    });
    return result.count;
  }
}
```

#### 5.3.2 `generation-job.service.ts`

```typescript
// Caminho: libraries/nestjs-libraries/src/database/prisma/generation-jobs/generation-job.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { GenerationJobRepository } from './generation-job.repository';
import { GenerationJob, GenerationJobStatus } from '@prisma/client';

@Injectable()
export class GenerationJobService {
  private readonly logger = new Logger(GenerationJobService.name);

  constructor(private readonly repo: GenerationJobRepository) {}

  /**
   * Criar job com idempotência
   * Se idempotencyKey já existe, retorna o job existente
   */
  async createJob(params: {
    organizationId: string;
    brandProfileId?: string;
    carouselProjectId?: string;
    type: string;
    idempotencyKey?: string;
    model?: string;
    provider?: string;
    costEstimate?: number;
    progress?: Record<string, unknown>;
  }): Promise<GenerationJob> {
    // Verificar idempotência
    if (params.idempotencyKey) {
      const existing = await this.repo.findByIdempotencyKey(params.idempotencyKey);
      if (existing) {
        this.logger.warn(
          `Job with idempotencyKey ${params.idempotencyKey} already exists, returning existing job`
        );
        return existing;
      }
    }

    return this.repo.create(params);
  }

  /**
   * Marcar job como RUNNING
   */
  async markRunning(id: string): Promise<GenerationJob> {
    return this.repo.updateStatus(id, 'RUNNING', { startedAt: new Date() });
  }

  /**
   * Marcar job como COMPLETED
   */
  async markCompleted(
    id: string,
    result?: Record<string, unknown>
  ): Promise<GenerationJob> {
    return this.repo.updateStatus(id, 'COMPLETED', {
      completedAt: new Date(),
      result: result as any,
    });
  }

  /**
   * Marcar job como FAILED
   */
  async markFailed(id: string, error: string): Promise<GenerationJob> {
    return this.repo.updateStatus(id, 'FAILED', {
      completedAt: new Date(),
      error,
    });
  }

  /**
   * Marcar job como PARTIAL (alguns slides OK, outros falharam)
   */
  async markPartial(
    id: string,
    result?: Record<string, unknown>
  ): Promise<GenerationJob> {
    return this.repo.updateStatus(id, 'PARTIAL', {
      completedAt: new Date(),
      result: result as any,
    });
  }

  /**
   * Marcar job como CANCELLED
   */
  async markCancelled(id: string): Promise<GenerationJob> {
    return this.repo.updateStatus(id, 'CANCELLED', { completedAt: new Date() });
  }

  /**
   * Atualizar progresso do job
   */
  async updateProgress(
    id: string,
    progress: Record<string, unknown>
  ): Promise<GenerationJob> {
    return this.repo.updateProgress(id, progress as any);
  }

  /**
   * Verificar se org pode iniciar novo job
   */
  async canStartJob(
    orgId: string,
    maxConcurrent: number = 2
  ): Promise<{ allowed: boolean; activeCount: number }> {
    const activeCount = await this.repo.countActiveByOrg(orgId);
    return {
      allowed: activeCount < maxConcurrent,
      activeCount,
    };
  }

  /**
   * Buscar job por ID
   */
  async findById(orgId: string, id: string): Promise<GenerationJob | null> {
    return this.repo.findById(orgId, id);
  }

  /**
   * Listar jobs de uma organização
   */
  async findByOrg(
    orgId: string,
    options?: { status?: GenerationJobStatus; type?: string; limit?: number; offset?: number }
  ): Promise<GenerationJob[]> {
    return this.repo.findByOrg(orgId, options);
  }

  /**
   * Cleanup de jobs antigos
   */
  async cleanup(olderThanDays: number = 7): Promise<number> {
    const count = await this.repo.cleanupOldJobs(olderThanDays);
    this.logger.log(`Cleaned up ${count} old generation jobs`);
    return count;
  }
}
```

#### 5.3.3 `circuit-breaker.service.ts`

```typescript
// Caminho: libraries/nestjs-libraries/src/ai-generate/circuit-breaker.service.ts

import { Injectable, Logger } from '@nestjs/common';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface ProviderState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt: number;
  lastSuccessAt: number;
  openedAt: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);

  // Configurações
  private readonly failureThreshold = 5;      // Falhas para abrir circuito
  private readonly recoveryTimeoutMs = 300_000; // 5 minutos para tentar novamente
  private readonly halfOpenMaxAttempts = 3;    // Tentativas em HALF_OPEN
  private readonly windowMs = 300_000;         // Janela de 5 minutos para contar falhas

  // Estado por provider
  private readonly providers = new Map<string, ProviderState>();

  /**
   * Verificar se o provider pode receber chamadas
   */
  canExecute(provider: string): boolean {
    const state = this.getState(provider);

    switch (state.state) {
      case 'CLOSED':
        return true;

      case 'OPEN': {
        const now = Date.now();
        if (now - state.openedAt >= this.recoveryTimeoutMs) {
          // Transição para HALF_OPEN
          state.state = 'HALF_OPEN';
          state.successCount = 0;
          this.logger.warn(
            `Circuit breaker for ${provider}: OPEN → HALF_OPEN (attempting recovery)`
          );
          return true;
        }
        return false;
      }

      case 'HALF_OPEN':
        return state.successCount < this.halfOpenMaxAttempts;

      default:
        return true;
    }
  }

  /**
   * Registrar sucesso
   */
  recordSuccess(provider: string): void {
    const state = this.getState(provider);

    if (state.state === 'HALF_OPEN') {
      state.successCount++;
      if (state.successCount >= this.halfOpenMaxAttempts) {
        // Recuperado!
        state.state = 'CLOSED';
        state.failureCount = 0;
        state.successCount = 0;
        this.logger.log(
          `Circuit breaker for ${provider}: HALF_OPEN → CLOSED (recovered)`
        );
      }
    } else if (state.state === 'CLOSED') {
      // Resetar contagem de falhas em janela
      const now = Date.now();
      if (now - state.lastFailureAt > this.windowMs) {
        state.failureCount = 0;
      }
    }

    state.lastSuccessAt = Date.now();
  }

  /**
   * Registrar falha
   */
  recordFailure(provider: string): void {
    const state = this.getState(provider);
    const now = Date.now();

    state.failureCount++;
    state.lastFailureAt = now;

    if (state.state === 'HALF_OPEN') {
      // Falhou em HALF_OPEN → voltar para OPEN
      state.state = 'OPEN';
      state.openedAt = now;
      this.logger.warn(
        `Circuit breaker for ${provider}: HALF_OPEN → OPEN (recovery failed)`
      );
    } else if (
      state.state === 'CLOSED' &&
      state.failureCount >= this.failureThreshold
    ) {
      // Muitas falhas → abrir circuito
      state.state = 'OPEN';
      state.openedAt = now;
      this.logger.warn(
        `Circuit breaker for ${provider}: CLOSED → OPEN (${state.failureCount} failures in ${this.windowMs / 1000}s)`
      );
    }
  }

  /**
   * Obter estado de um provider
   */
  getState(provider: string): ProviderState {
    if (!this.providers.has(provider)) {
      this.providers.set(provider, {
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        lastFailureAt: 0,
        lastSuccessAt: 0,
        openedAt: 0,
      });
    }
    return this.providers.get(provider)!;
  }

  /**
   * Reset manual de um provider
   */
  reset(provider: string): void {
    this.providers.delete(provider);
    this.logger.log(`Circuit breaker for ${provider}: reset manually`);
  }
}
```

#### 5.3.4 `carousel-image.workflow.ts` (Temporal)

```typescript
// Caminho: apps/orchestrator/src/workflows/carousel-image.workflow.ts

import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities/carousel-image.activities';

const {
  updateJobProgress,
  generateSlideImage,
  updateSlideResult,
  notifyJobComplete,
  recordCost,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    maximumAttempts: 1, // Retry é gerenciado pelo workflow, não pelo Temporal
  },
});

export interface SlideRequest {
  slideIndex: number;
  request: {
    prompt: string;
    provider?: string;
    model?: string;
    size?: string;
    quality?: string;
    style?: string;
    reference_images?: string[];
    reference_mode?: string;
    persist?: boolean;
  };
}

export interface CarouselImageWorkflowInput {
  jobId: string;
  orgId: string;
  slides: SlideRequest[];
  maxConcurrency: number; // default: 2
}

export interface SlideResult {
  slideIndex: number;
  status: 'completed' | 'failed';
  result?: Record<string, unknown>;
  error?: string;
  attempts: number;
  costEstimate?: number;
}

/**
 * Workflow Temporal para geração de imagens de carrossel
 *
 * Fluxo:
 * 1. Marca job como RUNNING
 * 2. Para cada slide (com concorrência controlada):
 *    a. Gera imagem com retry (max 3 tentativas, backoff exponencial)
 *    b. Registra resultado por slide
 *    c. Registra custo
 * 3. Marca job como COMPLETED/PARTIAL/FAILED
 * 4. Notifica conclusão
 */
export async function carouselImageWorkflow(
  input: CarouselImageWorkflowInput
): Promise<{ jobId: string; status: string; results: SlideResult[] }> {
  const { jobId, orgId, slides, maxConcurrency } = input;

  // 1. Marcar job como RUNNING
  await updateJobProgress(jobId, 'RUNNING');

  const results: SlideResult[] = [];
  const maxRetries = 3;
  const backoffMs = [1000, 4000, 16000]; // 1s, 4s, 16s

  // 2. Processar slides com concorrência controlada
  const queue = [...slides];
  const workers: Promise<void>[] = [];

  for (let w = 0; w < Math.min(maxConcurrency, queue.length); w++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const slide = queue.shift();
          if (!slide) break;

          let lastError: string | undefined;
          let attempts = 0;

          for (let attempt = 0; attempt < maxRetries; attempt++) {
            attempts = attempt + 1;

            try {
              const result = await generateSlideImage(
                orgId,
                slide.slideIndex,
                slide.request
              );

              results.push({
                slideIndex: slide.slideIndex,
                status: 'completed',
                result,
                attempts,
              });

              // Registrar custo
              if (result.costEstimate) {
                await recordCost(jobId, orgId, result.costEstimate, 'image');
              }

              lastError = undefined;
              break; // Sucesso, sair do loop de retry
            } catch (error: any) {
              lastError = error?.message || 'Image generation failed';

              // Se não é o último retry, esperar com backoff
              if (attempt < maxRetries - 1) {
                const delay = backoffMs[attempt] || 16000;
                await new Promise((resolve) => setTimeout(resolve, delay));
              }
            }
          }

          // Se esgotou todos os retries
          if (lastError) {
            results.push({
              slideIndex: slide.slideIndex,
              status: 'failed',
              error: lastError,
              attempts,
            });
          }

          // Atualizar progresso parcial
          const completedCount = results.filter(
            (r) => r.status === 'completed'
          ).length;
          const failedCount = results.filter(
            (r) => r.status === 'failed'
          ).length;

          await updateJobProgress(jobId, 'RUNNING', {
            total: slides.length,
            completed: completedCount,
            failed: failedCount,
            currentSlide: slide.slideIndex,
          });
        }
      })()
    );
  }

  await Promise.all(workers);

  // 3. Determinar status final
  const allFailed = results.every((r) => r.status === 'failed');
  const someFailed = results.some((r) => r.status === 'failed');
  const finalStatus = allFailed ? 'FAILED' : someFailed ? 'PARTIAL' : 'COMPLETED';

  await updateJobProgress(jobId, finalStatus, {
    total: slides.length,
    completed: results.filter((r) => r.status === 'completed').length,
    failed: results.filter((r) => r.status === 'failed').length,
    results,
  });

  // 4. Notificar conclusão
  await notifyJobComplete(jobId, orgId, finalStatus, results);

  return { jobId, status: finalStatus, results };
}
```

#### 5.3.5 `carousel-image.activities.ts` (Temporal)

```typescript
// Caminho: apps/orchestrator/src/activities/carousel-image.activities.ts

import { activity, Logger } from '@temporalio/activity';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const logger = new Logger('CarouselImageActivities');

// Instância compartilhada do Prisma (será injetada via DI no orchestrator)
let prisma: PrismaClient;

export function setPrisma(client: PrismaClient) {
  prisma = client;
}

/**
 * Activity: Atualizar progresso do job
 */
export async function updateJobProgress(
  jobId: string,
  status: string,
  progress?: Record<string, unknown>
): Promise<void> {
  const data: any = { status };
  if (status === 'RUNNING' && !progress) {
    data.startedAt = new Date();
  }
  if (['COMPLETED', 'FAILED', 'PARTIAL', 'CANCELLED'].includes(status)) {
    data.completedAt = new Date();
  }
  if (progress) {
    data.progress = progress;
  }

  await prisma.generationJob.update({
    where: { id: jobId },
    data,
  });

  logger.info(`Job ${jobId} updated to status=${status}`);
}

/**
 * Activity: Gerar imagem para um slide
 */
export async function generateSlideImage(
  orgId: string,
  slideIndex: number,
  request: {
    prompt: string;
    provider?: string;
    model?: string;
    size?: string;
    quality?: string;
    style?: string;
    reference_images?: string[];
    reference_mode?: string;
    persist?: boolean;
  }
): Promise<Record<string, unknown>> {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

  // Chamar o endpoint de geração de imagem do backend
  const response = await axios.post(
    `${backendUrl}/ai-generate/images`,
    {
      prompt: request.prompt,
      provider: request.provider || 'ia_generate',
      model: request.model,
      size: request.size || '1024x1024',
      quality: request.quality || 'standard',
      style: request.style,
      reference_images: request.reference_images,
      reference_mode: request.reference_mode,
      persist: request.persist !== false,
    },
    {
      headers: {
        // Service-to-service auth (ou usar internal API key)
        'x-internal-service': 'temporal-orchestrator',
        'x-organization-id': orgId,
      },
      timeout: 120_000, // 2 minutos
    }
  );

  return response.data;
}

/**
 * Activity: Atualizar resultado de um slide
 */
export async function updateSlideResult(
  jobId: string,
  slideIndex: number,
  status: 'completed' | 'failed',
  result?: Record<string, unknown>,
  error?: string
): Promise<void> {
  const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  const progress = (job.progress as any) || {};
  const slides = progress.slides || [];

  // Atualizar ou adicionar resultado do slide
  const existingIndex = slides.findIndex(
    (s: any) => s.slideIndex === slideIndex
  );
  const slideData = {
    slideIndex,
    status,
    result: result || null,
    error: error || null,
    completedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    slides[existingIndex] = slideData;
  } else {
    slides.push(slideData);
  }

  progress.slides = slides;

  await prisma.generationJob.update({
    where: { id: jobId },
    data: { progress: progress as any },
  });
}

/**
 * Activity: Notificar conclusão do job
 */
export async function notifyJobComplete(
  jobId: string,
  orgId: string,
  status: string,
  results: any[]
): Promise<void> {
  // Registrar no log
  const completed = results.filter((r) => r.status === 'completed').length;
  const failed = results.filter((r) => r.status === 'failed').length;

  logger.info(
    `Job ${jobId} completed: status=${status}, completed=${completed}, failed=${failed}`
  );

  // Futuro: enviar notificação via WebSocket, email, ou push
  // Por enquanto, apenas log
}

/**
 * Activity: Registrar custo
 */
export async function recordCost(
  jobId: string,
  orgId: string,
  costEstimate: number,
  type: string
): Promise<void> {
  // Atualizar costEstimate no job
  const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
  if (job) {
    const currentCost = job.costEstimate || 0;
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { costEstimate: currentCost + costEstimate },
    });
  }

  logger.info(
    `Cost recorded: job=${jobId}, org=${orgId}, type=${type}, cost=${costEstimate}`
  );
}
```

### 5.4 Mudanças no `ai-generate.service.ts`

O método `startCarouselImageJob` deve ser **completamente reescrito**:

```typescript
// ANTES (atual - volátil):
startCarouselImageJob(orgId: string, body: { slides?: [...] }) {
  const id = `carousel_job_${Date.now()}_${Math.random()...}`;
  const job: CarouselImageJob = { id, orgId, ... };
  carouselImageJobs.set(id, job);
  void this.runCarouselImageJob(job);
  return this.publicCarouselImageJob(job);
}

// DEPOIS (novo - persistente):
async startCarouselImageJob(
  orgId: string,
  body: { slides?: [...] },
  idempotencyKey?: string
) {
  // 1. Validar slides
  const slides = this.normalizeSlides(body.slides);
  if (!slides.length) {
    throw new HttpException('At least one slide required', HttpStatus.BAD_REQUEST);
  }

  // 2. Verificar concorrência por org
  const { allowed, activeCount } = await this.generationJobService.canStartJob(orgId, 2);
  if (!allowed) {
    throw new HttpException(
      `Too many active jobs (${activeCount}/2). Wait for existing jobs to complete.`,
      HttpStatus.TOO_MANY_REQUESTS
    );
  }

  // 3. Criar job no Prisma
  const job = await this.generationJobService.createJob({
    organizationId: orgId,
    type: 'IMAGE_GENERATION',
    idempotencyKey,
    model: slides[0]?.request?.model,
    provider: slides[0]?.request?.provider,
    progress: {
      total: slides.length,
      completed: 0,
      failed: 0,
      slides: slides.map(s => ({
        slideIndex: s.slideIndex,
        status: 'queued',
      })),
    },
  });

  // 4. Disparar workflow Temporal
  await this.temporalClient.workflow.start('carouselImageWorkflow', {
    args: [{
      jobId: job.id,
      orgId,
      slides: slides.map(s => ({
        slideIndex: s.slideIndex,
        request: s.request,
      })),
      maxConcurrency: 2,
    }],
    taskQueue: 'carousel-image-generation',
    workflowId: `carousel-image-${job.id}`,
  });

  // 5. Retornar status
  return {
    id: job.id,
    status: job.status,
    total: slides.length,
    completed: 0,
    failed: 0,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
```

O método `getCarouselImageJob` também muda:

```typescript
// ANTES:
getCarouselImageJob(orgId: string, id: string) {
  const job = carouselImageJobs.get(id);
  if (!job || job.orgId !== orgId) throw ...;
  return this.publicCarouselImageJob(job);
}

// DEPOIS:
async getCarouselImageJob(orgId: string, id: string) {
  const job = await this.generationJobService.findById(orgId, id);
  if (!job) {
    throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
  }

  const progress = (job.progress as any) || {};
  return {
    id: job.id,
    status: job.status,
    total: progress.total || 0,
    completed: progress.completed || 0,
    failed: progress.failed || 0,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    slides: (progress.slides || []).map((s: any) => ({
      slideIndex: s.slideIndex,
      status: s.status,
      result: s.result,
      error: s.error,
      completedAt: s.completedAt,
    })),
  };
}
```

---

## 6. Tratamento de Erros

### 6.1 Erros por Tipo

| Erro | Causa | Ação |
|------|-------|------|
| `TOO_MANY_REQUESTS` | Org já tem 2+ jobs ativos | Retornar 429 com mensagem de espera |
| `BAD_REQUEST` | Nenhum slide com prompt válido | Retornar 400 com descrição |
| `NOT_FOUND` | Job não existe ou não pertence à org | Retornar 404 |
| `PROVIDER_UNAVAILABLE` | Circuit breaker aberto | Retry com backoff, marcar slide como failed após 3 tentativas |
| `PROVIDER_TIMEOUT` | Provider demorou > 2min | Retry com backoff |
| `PROVIDER_RATE_LIMIT` | Provider retornou 429 | Esperar 30s e retry |
| `INVALID_RESPONSE` | Resposta do provider malformada | Retry com prompt corrigido |
| `ORG_QUOTA_EXCEEDED` | Org atingiu limite de geração | Retornar 403 com mensagem de upgrade |

### 6.2 Retry Policy

```
Tentativa 1: imediato
Tentativa 2:等待 1s (backoff exponencial base 4)
Tentativa 3:等待 4s
Tentativa 4:等待 16s (máximo)
```

**Re-triável:** timeout, 5xx, rate limit (429), network error
**Não re-triável:** 400 (bad request), 401 (auth), 403 (forbidden), 404 (not found)

### 6.3 Dead-Live Queue

Jobs que falham após max retries são marcados como `FAILED` com error detalhado.
Não há DLQ separada — o status `FAILED` no `GenerationJob` serve como DLQ.
O operador pode:
1. Listar jobs com status `FAILED`
2. Investigar o erro
3. Re-executar manualmente (criar novo job com mesmos parâmetros)

---

## 7. Edge Cases

| Caso | Comportamento Esperado |
|------|----------------------|
| **Server restart durante job** | Job continua no Prisma com status RUNNING. Temporal retoma automaticamente. Frontend pode consultar status. |
| **Provider cai no meio da geração** | Slide atual falha, retry automático. Próximos slides aguardam circuit breaker. |
| **Org envia job duplicado (mesma idempotencyKey)** | Retorna job existente sem criar novo |
| **Org envia job com 0 slides válidos** | Retorna 400 Bad Request |
| **Org envia job com 20+ slides** | Trunca para 20 slides (limite atual) |
| **Circuit breaker aberto** | Slide falha imediatamente com mensagem "Provider temporarily unavailable" |
| **Tempo de geração > 5min por slide** | Temporal timeout, slide marcado como failed |
| **Frontend para de fazer polling** | Job continua executando. Resultado disponível quando voltar a consultar. |
| **Concorrência: 3º job chegando** | Retorna 429 Too Many Requests |
| **Múltiplas instâncias do backend** | Jobs persistidos no Prisma, compartilhados entre instâncias. Temporal garante execução única. |

---

## 8. Critérios de Aceite

- [ ] Job é criado no Prisma (não em Map) ao chamar `POST /carousel-image-jobs`
- [ ] Job sobrevive a restart do backend
- [ ] Job é executado via Temporal (não via `void this.runCarouselImageJob()`)
- [ ] Retry automático: 3 tentativas por slide com backoff exponencial
- [ ] Circuit breaker: provider com 5+ falhas em 5min fica bloqueado por 5min
- [ ] Concorrência: max 2 jobs simultâneos por org (retorna 429 se exceder)
- [ ] Idempotência: mesma idempotencyKey retorna mesmo job
- [ ] Progresso: `GET /carousel-image-jobs/:id` retorna status atualizado
- [ ] Cleanup: jobs completos/falhos são deletados após 7 dias
- [ ] Logs: cada ação importante é logada com contexto (jobId, orgId, slideIndex)
- [ ] Teste unitário: GenerationJobService com mocks do Prisma
- [ ] Teste unitário: CircuitBreakerService
- [ ] Teste de integração: fluxo completo create → run → complete
- [ ] Rollback: desativar Temporal e voltar para Map com feature flag

---

## 9. Checklist de Implementação

### Preparação
- [ ] Verificar que as migrations do GenerationJob já foram aplicadas
- [ ] Verificar que o orchestrator está rodando e conectado ao Temporal
- [ ] Verificar que a task queue `carousel-image-generation` existe

### Backend
- [ ] Criar `generation-job.repository.ts`
- [ ] Criar `generation-job.service.ts`
- [ ] Criar `generation-job.module.ts`
- [ ] Criar `circuit-breaker.service.ts`
- [ ] Criar `concurrency.guard.ts`
- [ ] Modificar `ai-generate.service.ts`: substituir Map por service
- [ ] Modificar `ai-generate.controller.ts`: adicionar guard
- [ ] Modificar `api.module.ts`: registrar módulos

### Orchestrator
- [ ] Criar `carousel-image.workflow.ts`
- [ ] Criar `carousel-image.activities.ts`
- [ ] Modificar `app.module.ts`: registrar workflow
- [ ] Criar task queue `carousel-image-generation`

### Frontend
- [ ] Verificar que o polling funciona com o novo formato de resposta
- [ ] Adicionar tratamento para status `PARTIAL`
- [ ] Adicionar mensagem de erro para 429 (muitos jobs)

### Testes
- [ ] Unit: `GenerationJobService.createJob()` com idempotência
- [ ] Unit: `GenerationJobService.canStartJob()` com limite
- [ ] Unit: `CircuitBreakerService` estados OPEN/CLOSED/HALF_OPEN
- [ ] Integration: fluxo completo create → temporal → complete
- [ ] Integration: retry em caso de falha de provider
- [ ] Integration: circuit breaker abre após 5 falhas

### Deploy
- [ ] Feature flag: `USE_PERSISTENT_JOBS=true` (default: false)
- [ ] Rollback: se flag=false, usar Map antigo
- [ ] Monitorar: logs de jobs, taxa de falha, tempo médio

---

## 10. Decisões de Projeto

| Decisão | Opção Escolhida | Justificativa |
|---------|----------------|---------------|
| **Armazenamento** | Prisma (PostgreSQL) | Já existe, suporta JSON para progresso, indexado |
| **Execução** | Temporal | Já no projeto, suporta retry, timeout, observabilidade |
| **Retry** | 3 tentativas, backoff [1s, 4s, 16s] | Equilíbrio entre rapidez e sobrecarga |
| **Circuit breaker** | 5 falhas em 5min → OPEN por 5min | Conservador para não bloquear usuários |
| **Concorrência** | Max 2 por org | Equilíbrio entre performance e justiça |
| **Idempotência** | Via idempotencyKey unique no Prisma | Previne jobs duplicados |
| **Cleanup** | 7 dias após conclusão | Tempo suficiente para investigar problemas |
| **Progresso** | JSON no campo `progress` | Flexível, sem necessidade de tabela separada |
| **Notificação** | Log apenas (WebSocket futuro) | MVP simples, pode ser expandido |
| **Feature flag** | `USE_PERSISTENT_JOBS` | Rollback seguro |

---

## 11. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Temporal cai durante job | Baixa | Alto | Jobs persistidos no Prisma, Temporal retoma automaticamente |
| Provider fica instável | Média | Alto | Circuit breaker + retry + dead letter |
| Migração corrompe dados | Baixa | Crítico | Feature flag + rollback para Map |
| Performance de queries | Baixa | Médio | Indexes adequados, cleanup regular |
| Múltiplas instâncias conflitam | Baixa | Médio | Temporal garante execução única por workflowId |

---

## 12. Próximas Subfases Dependentes

Esta subfase é **pré-requisito** para:
- **P1-2**: Persistência de custos (usará o mesmo padrão de Prisma service)
- **P1-4**: Auto-save de drafts (usará GenerationJob para tracking)
- **Fase 2**: Jobs de Brand DNA extraction (usará o mesmo workflow pattern)
- **Fase 4**: Auto-generation recorrente (usará Temporal scheduling)
