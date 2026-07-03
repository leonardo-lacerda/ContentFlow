# 🔴 Subfase P1-2: Custos em Memória (Map) → GenerationCost

> **Fase:** CRÍTICO — Riscos de Infraestrutura
> **Subfase:** P1-2
> **Status:** Especificação Técnica Completa
> **Data:** 2026-07-02
> **Autor:** Hermes Agent
> **Depende de:** P1-1 (GenerationJob já persistente)

---

## 1. Objetivo

Migrar o histórico de custos de geração de IA de **armazenamento volátil em memória** (`Map<string, AiGenerateCostLedgerEntry[]>`) para **persistência em banco de dados** (novo model `GenerationCost` Prisma), com dashboard de custos, limites por plano e webhook de billing.

---

## 2. Contexto

### 2.1 Problema Atual

O arquivo `ai-generate.service.ts` contém:

```typescript
// Linha 55-62: Tipo da entrada
type AiGenerateCostLedgerEntry = {
  id: string;
  orgId: string;
  type: 'text' | 'image' | 'estimate';
  label: string;
  createdAt: string;
  cost: CostEstimate;
};

// Linha 84: Map volátil
const costLedger = new Map<string, AiGenerateCostLedgerEntry[]>();
```

O método `recordCost()` (linha 413):
```typescript
private recordCost(orgId, type, label, cost) {
  const current = costLedger.get(orgId) || [];
  costLedger.set(orgId, [
    { id: makeLedgerId(), orgId, type, label, cost, createdAt: new Date().toISOString() },
    ...current,
  ].slice(0, 200)); // Limitado a 200 entradas por org
}
```

O método `getCostHistory()` (linha 440):
```typescript
getCostHistory(orgId: string) {
  const entries = (costLedger.get(orgId) || []).filter(e => e.type !== 'estimate');
  const totals = entries.reduce((acc, entry) => ({
    usd: acc.usd + entry.cost.usd,
    brl: acc.brl + entry.cost.brl,
    tokens: acc.tokens + entry.cost.tokens.totalTokens,
  }), { usd: 0, brl: 0, tokens: 0 });
  return { entries, totals };
}
```

### 2.2 Por Que Isso É Crítico

| Problema | Impacto | Severidade |
|----------|---------|------------|
| **Perda total em restart** | Todo o histórico de gastos desaparece | ALTA |
| **Sem auditoria** | Impossível auditar gastos passados | ALTA |
| **Sem billing** | Impossível implementar limites por plano | ALTA |
| **Sem isolamento multi-instance** | Cada instância tem seu próprio Map | ALTA |
| **Limite artificial de 200** | Entradas além de 200 são descartadas | MÉDIA |
| **Sem granularidade** | Não separa custo por provider, modelo ou operação | MÉDIA |

### 2.3 Tipo `CostEstimate` (Já Existente)

```typescript
type CostEstimate = {
  usd: number;           // Custo em USD
  brl: number;           // Custo em BRL
  usdToBrl: number;      // Taxa de câmbio usada
  ratesUsdPer1M: {       // Preços por 1M tokens
    textInput: number;
    textInputCached: number;
    imageInput: number;
    imageInputCached: number;
    imageOutput: number;
  };
  tokens: NormalizedUsage; // Tokens utilizados
};

type NormalizedUsage = {
  textInputTokens: number;
  textInputCachedTokens: number;
  imageInputTokens: number;
  imageInputCachedTokens: number;
  imageOutputTokens: number;
  totalTokens: number;
};
```

### 2.4 Onde `recordCost` É Chamado

| Local | Tipo | Contexto |
|-------|------|----------|
| `generateCarouselIdeas()` ~linha 819 | `text` | Geração de ideias |
| `generateCarouselPlan()` ~linha 846 | `text` | Geração de plano |
| `generateCarouselCaption()` ~linha 1055 | `text` | Geração de caption |
| `fixCarouselWithEditorialReview()` ~linha 1360 | `text` | Correção editorial |
| `generateImage()` ~linha 1733 | `image` | Geração de imagem |
| `estimateCarouselCosts()` | `estimate` | Estimativa (não persistida) |

---

## 3. Escopo da Subfase

### 3.1 O Que Será Implementado

1. **Novo model Prisma `GenerationCost`** — Tabela dedicada para custos
2. **Repository + Service** — CRUD de custos no Prisma
3. **Substituir Map** — `recordCost()` grava no banco ao invés de Map
4. **Dashboard de custos** — Endpoint para visualizar gastos por período
5. **Limites por plano** — Soft limit (warning) e hard limit (bloqueio)
6. **Webhook de billing** — Evento quando custo atinge threshold
7. **Cleanup automático** — Deletar registros antigos (> 90 dias)

### 3.2 O Que NÃO Será Implementado

- Dashboard visual de custos (será Fase 5)
- Integração com Stripe para billing real
- Custo por slide individual (será granularity futura)

---

## 4. Arquitetura

### 4.1 Novo Model Prisma

```prisma
model GenerationCost {
  id             String   @id @default(uuid())
  organizationId String
  generationJobId String?  // FK para GenerationJob (opcional para custos avulsos)
  type           String   // 'text' | 'image' | 'estimate' | 'brand_dna' | 'video'
  label          String   // Descrição da operação
  model          String?  // Modelo de IA usado (ex: gpt-4.1-mini)
  provider       String?  // Provider (ex: openai_official, ia_generate)
  
  // Custos
  costUsd        Float    @default(0)
  costBrl        Float    @default(0)
  usdToBrl       Float    @default(5.5)
  
  // Tokens
  textInputTokens      Int @default(0)
  textInputCachedTokens Int @default(0)
  imageInputTokens     Int @default(0)
  imageInputCachedTokens Int @default(0)
  imageOutputTokens    Int @default(0)
  totalTokens          Int @default(0)
  
  // Metadados
  metadata       Json?    // Dados extras flexíveis
  createdAt      DateTime @default(now())
  
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  @@index([organizationId])
  @@index([createdAt])
  @@index([organizationId, createdAt])
  @@index([type])
  @@index([generationJobId])
}
```

### 4.2 Alteração no Model Organization

Adicionar relação:

```prisma
model Organization {
  // ... campos existentes ...
  generationCosts GenerationCost[]
}
```

### 4.3 Fluxo de Execução

```
1. Service de IA chama recordCost()
   ├── Antes: gravava no Map volátil
   └── Agora: grava no Prisma (GenerationCost)
   
2. Frontend consulta GET /ai-generate/cost-history
   ├── Antes: lia do Map (máx 200 entradas)
   └── Agora: lê do Prisma (ilimitado, paginado)
   
3. Dashboard de custos
   ├── GET /ai-generate/costs/dashboard → aggregated data
   ├── GET /ai-generate/costs/by-period → por dia/semana/mês
   └── GET /ai-generate/costs/by-type → por text/image
   
4. Limites por plano
   ├── Antes de gerar: verificar custo acumulado no mês
   ├── Se > soft limit: retornar warning mas permitir
   └── Se > hard limit: retornar 403 com mensagem de upgrade
   
5. Webhook de billing
   ├── Quando custo mensal atinge 80% do limite: evento 'cost_threshold_warning'
   └── Quando custo mensal atinge 100%: evento 'cost_threshold_exceeded'
```

---

## 5. Implementação Detalhada

### 5.1 Arquivos a Criar

| Arquivo | Caminho | Responsabilidade |
|---------|---------|-----------------|
| `generation-cost.repository.ts` | `libraries/nestjs-libraries/src/database/prisma/generation-costs/generation-cost.repository.ts` | Queries Prisma |
| `generation-cost.service.ts` | `libraries/nestjs-libraries/src/database/prisma/generation-costs/generation-cost.service.ts` | Lógica de custos |
| `generation-cost.module.ts` | `libraries/nestjs-libraries/src/database/prisma/generation-costs/generation-cost.module.ts` | Módulo NestJS |
| `cost-limits.service.ts` | `libraries/nestjs-libraries/src/ai-generate/cost-limits.service.ts` | Limites por plano |

### 5.2 Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `schema.prisma` | Adicionar model `GenerationCost` + relation em Organization |
| `ai-generate.service.ts` | Substituir Map por GenerationCostService |
| `ai-generate.controller.ts` | Adicionar endpoints de dashboard |
| `api.module.ts` | Registrar GenerationCostModule |

### 5.3 Detalhamento por Arquivo

#### 5.3.1 `generation-cost.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, GenerationCost } from '@prisma/client';

@Injectable()
export class GenerationCostRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registrar custo de uma operação de IA
   */
  async create(data: {
    organizationId: string;
    generationJobId?: string;
    type: string;
    label: string;
    model?: string;
    provider?: string;
    costUsd: number;
    costBrl: number;
    usdToBrl?: number;
    textInputTokens?: number;
    textInputCachedTokens?: number;
    imageInputTokens?: number;
    imageInputCachedTokens?: number;
    imageOutputTokens?: number;
    totalTokens?: number;
    metadata?: Prisma.InputJsonValue;
  }): Promise<GenerationCost> {
    return this.prisma.generationCost.create({
      data: {
        organizationId: data.organizationId,
        generationJobId: data.generationJobId,
        type: data.type,
        label: data.label,
        model: data.model,
        provider: data.provider,
        costUsd: data.costUsd,
        costBrl: data.costBrl,
        usdToBrl: data.usdToBrl ?? 5.5,
        textInputTokens: data.textInputTokens ?? 0,
        textInputCachedTokens: data.textInputCachedTokens ?? 0,
        imageInputTokens: data.imageInputTokens ?? 0,
        imageInputCachedTokens: data.imageInputCachedTokens ?? 0,
        imageOutputTokens: data.imageOutputTokens ?? 0,
        totalTokens: data.totalTokens ?? 0,
        metadata: data.metadata,
      },
    });
  }

  /**
   * Histórico de custos de uma organização (paginado)
   */
  async findByOrg(
    orgId: string,
    options?: {
      type?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<GenerationCost[]> {
    const where: Prisma.GenerationCostWhereInput = {
      organizationId: orgId,
    };

    if (options?.type) where.type = options.type;
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    return this.prisma.generationCost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 100,
      skip: options?.offset ?? 0,
    });
  }

  /**
   * Totais de custo por organização no período
   */
  async getTotalsByOrg(
    orgId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalUsd: number;
    totalBrl: number;
    totalTokens: number;
    byType: Record<string, { usd: number; brl: number; count: number }>;
    byProvider: Record<string, { usd: number; brl: number; count: number }>;
    byModel: Record<string, { usd: number; brl: number; count: number }>;
  }> {
    const costs = await this.prisma.generationCost.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    let totalUsd = 0;
    let totalBrl = 0;
    let totalTokens = 0;
    const byType: Record<string, { usd: number; brl: number; count: number }> = {};
    const byProvider: Record<string, { usd: number; brl: number; count: number }> = {};
    const byModel: Record<string, { usd: number; brl: number; count: number }> = {};

    for (const cost of costs) {
      totalUsd += cost.costUsd;
      totalBrl += cost.costBrl;
      totalTokens += cost.totalTokens;

      // Por tipo
      if (!byType[cost.type]) byType[cost.type] = { usd: 0, brl: 0, count: 0 };
      byType[cost.type].usd += cost.costUsd;
      byType[cost.type].brl += cost.costBrl;
      byType[cost.type].count++;

      // Por provider
      const provider = cost.provider || 'unknown';
      if (!byProvider[provider]) byProvider[provider] = { usd: 0, brl: 0, count: 0 };
      byProvider[provider].usd += cost.costUsd;
      byProvider[provider].brl += cost.costBrl;
      byProvider[provider].count++;

      // Por modelo
      const model = cost.model || 'unknown';
      if (!byModel[model]) byModel[model] = { usd: 0, brl: 0, count: 0 };
      byModel[model].usd += cost.costUsd;
      byModel[model].brl += cost.costBrl;
      byModel[model].count++;
    }

    return {
      totalUsd: Number(totalUsd.toFixed(6)),
      totalBrl: Number(totalBrl.toFixed(6)),
      totalTokens,
      byType,
      byProvider,
      byModel,
    };
  }

  /**
   * Custo acumulado no mês atual
   */
  async getCurrentMonthTotal(orgId: string): Promise<{ usd: number; brl: number }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const result = await this.prisma.generationCost.aggregate({
      where: {
        organizationId: orgId,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: {
        costUsd: true,
        costBrl: true,
      },
    });

    return {
      usd: Number((result._sum.costUsd || 0).toFixed(6)),
      brl: Number((result._sum.costBrl || 0).toFixed(6)),
    };
  }

  /**
   * Dashboard: custo por dia nos últimos N dias
   */
  async getDailyCosts(
    orgId: string,
    days: number = 30
  ): Promise<Array<{ date: string; usd: number; brl: number; count: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const costs = await this.prisma.generationCost.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Agrupar por dia
    const dailyMap = new Map<string, { usd: number; brl: number; count: number }>();
    
    for (const cost of costs) {
      const dateKey = cost.createdAt.toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { usd: 0, brl: 0, count: 0 });
      }
      const day = dailyMap.get(dateKey)!;
      day.usd += cost.costUsd;
      day.brl += cost.costBrl;
      day.count++;
    }

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      usd: Number(data.usd.toFixed(6)),
      brl: Number(data.brl.toFixed(6)),
      count: data.count,
    }));
  }

  /**
   * Cleanup: deletar registros antigos
   */
  async cleanup(olderThanDays: number = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await this.prisma.generationCost.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return result.count;
  }
}
```

#### 5.3.2 `generation-cost.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { GenerationCostRepository } from './generation-cost.repository';
import { CostEstimate } from '../ai-generate/ai-generate.service';

@Injectable()
export class GenerationCostService {
  private readonly logger = new Logger(GenerationCostService.name);

  constructor(private readonly repo: GenerationCostRepository) {}

  /**
   * Registrar custo de operação de IA
   * Substitui o recordCost() que usava Map
   */
  async recordCost(params: {
    organizationId: string;
    generationJobId?: string;
    type: 'text' | 'image' | 'estimate' | 'brand_dna' | 'video';
    label: string;
    model?: string;
    provider?: string;
    cost: CostEstimate | null | undefined;
  }): Promise<void> {
    if (!params.cost) return;

    try {
      await this.repo.create({
        organizationId: params.organizationId,
        generationJobId: params.generationJobId,
        type: params.type,
        label: params.label,
        model: params.model,
        provider: params.provider,
        costUsd: params.cost.usd,
        costBrl: params.cost.brl,
        usdToBrl: params.cost.usdToBrl,
        textInputTokens: params.cost.tokens.textInputTokens,
        textInputCachedTokens: params.cost.tokens.textInputCachedTokens,
        imageInputTokens: params.cost.tokens.imageInputTokens,
        imageInputCachedTokens: params.cost.tokens.imageInputCachedTokens,
        imageOutputTokens: params.cost.tokens.imageOutputTokens,
        totalTokens: params.cost.tokens.totalTokens,
      });
    } catch (error) {
      // Não falhar a operação principal por erro de persistência de custo
      this.logger.error(
        `Failed to record cost for org ${params.organizationId}: ${error}`
      );
    }
  }

  /**
   * Histórico de custos (compatível com formato antigo)
   */
  async getCostHistory(orgId: string) {
    const entries = await this.repo.findByOrg(orgId, { type: undefined }); // exclui estimate
    const filtered = entries.filter((e) => e.type !== 'estimate');

    const totals = filtered.reduce(
      (acc, entry) => ({
        usd: acc.usd + entry.costUsd,
        brl: acc.brl + entry.costBrl,
        tokens: acc.tokens + entry.totalTokens,
      }),
      { usd: 0, brl: 0, tokens: 0 }
    );

    return {
      entries: filtered.map((e) => ({
        id: e.id,
        orgId: e.organizationId,
        type: e.type,
        label: e.label,
        cost: {
          usd: e.costUsd,
          brl: e.costBrl,
          tokens: { totalTokens: e.totalTokens },
        },
        createdAt: e.createdAt.toISOString(),
      })),
      totals: {
        usd: Number(totals.usd.toFixed(6)),
        brl: Number(totals.brl.toFixed(6)),
        tokens: totals.tokens,
      },
    };
  }

  /**
   * Dashboard de custos
   */
  async getDashboard(orgId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const [monthTotals, weekTotals, dailyCosts, byType, byProvider] =
      await Promise.all([
        this.repo.getTotalsByOrg(orgId, startOfMonth, now),
        this.repo.getTotalsByOrg(orgId, startOfWeek, now),
        this.repo.getDailyCosts(orgId, 30),
        this.repo.getTotalsByOrg(orgId, startOfMonth, now),
        this.repo.getTotalsByOrg(orgId, startOfMonth, now),
      ]);

    return {
      currentMonth: {
        usd: monthTotals.totalUsd,
        brl: monthTotals.totalBrl,
        tokens: monthTotals.totalTokens,
      },
      currentWeek: {
        usd: weekTotals.totalUsd,
        brl: weekTotals.totalBrl,
        tokens: weekTotals.totalTokens,
      },
      daily: dailyCosts,
      byType: monthTotals.byType,
      byProvider: monthTotals.byProvider,
      byModel: monthTotals.byModel,
    };
  }

  /**
   * Verificar limites de custo por plano
   */
  async checkLimits(
    orgId: string,
    plan: string
  ): Promise<{
    allowed: boolean;
    warning: boolean;
    currentUsd: number;
    limitUsd: number;
    message?: string;
  }> {
    const limits = this.getPlanLimits(plan);
    const current = await this.repo.getCurrentMonthTotal(orgId);

    if (current.usd >= limits.hardLimit) {
      return {
        allowed: false,
        warning: false,
        currentUsd: current.usd,
        limitUsd: limits.hardLimit,
        message: `Custo mensal (${current.usd.toFixed(2)} USD) atingiu o limite do plano (${limits.hardLimit} USD). Faça upgrade para continuar.`,
      };
    }

    if (current.usd >= limits.softLimit) {
      return {
        allowed: true,
        warning: true,
        currentUsd: current.usd,
        limitUsd: limits.hardLimit,
        message: `Custo mensal (${current.usd.toFixed(2)} USD) está próximo do limite (${limits.hardLimit} USD).`,
      };
    }

    return {
      allowed: true,
      warning: false,
      currentUsd: current.usd,
      limitUsd: limits.hardLimit,
    };
  }

  /**
   * Limites por plano (configuráveis via env)
   */
  private getPlanLimits(plan: string): { softLimit: number; hardLimit: number } {
    const defaults: Record<string, { softLimit: number; hardLimit: number }> = {
      STANDARD: { softLimit: 10, hardLimit: 20 },
      PRO: { softLimit: 50, hardLimit: 100 },
      TEAM: { softLimit: 100, hardLimit: 200 },
      ULTIMATE: { softLimit: 500, hardLimit: 1000 },
    };

    return defaults[plan] || defaults.STANDARD;
  }

  /**
   * Cleanup de registros antigos
   */
  async cleanup(olderThanDays: number = 90): Promise<number> {
    const count = await this.repo.cleanup(olderThanDays);
    this.logger.log(`Cleaned up ${count} old generation cost records`);
    return count;
  }
}
```

#### 5.3.3 `cost-limits.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { GenerationCostService } from '../database/prisma/generation-costs/generation-cost.service';
import { HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class CostLimitsService {
  private readonly logger = new Logger(CostLimitsService.name);

  constructor(private readonly costService: GenerationCostService) {}

  /**
   * Verificar se org pode executar operação de IA
   * Chamado ANTES de cada operação custosa
   */
  async enforceLimits(orgId: string, plan: string): Promise<void> {
    const limits = await this.costService.checkLimits(orgId, plan);

    if (!limits.allowed) {
      this.logger.warn(
        `Cost limit exceeded for org ${orgId}: ${limits.currentUsd}/${limits.limitUsd} USD`
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          message: limits.message,
          currentCost: limits.currentUsd,
          limit: limits.limitUsd,
          upgradeRequired: true,
        },
        HttpStatus.FORBIDDEN
      );
    }

    if (limits.warning) {
      this.logger.warn(
        `Cost threshold warning for org ${orgId}: ${limits.currentUsd}/${limits.limitUsd} USD`
      );
      // Warning é retornado no header, não bloqueia
    }
  }

  /**
   * Obter headers de custo para resposta HTTP
   */
  async getCostHeaders(orgId: string, plan: string): Promise<Record<string, string>> {
    const limits = await this.costService.checkLimits(orgId, plan);
    return {
      'X-Cost-Current': String(limits.currentUsd),
      'X-Cost-Limit': String(limits.limitUsd),
      'X-Cost-Warning': String(limits.warning),
    };
  }
}
```

### 5.4 Mudanças no `ai-generate.service.ts`

Substituir o `recordCost` privado:

```typescript
// ANTES (atual - volátil):
private recordCost(orgId, type, label, cost) {
  const current = costLedger.get(orgId) || [];
  costLedger.set(orgId, [
    { id: makeLedgerId(), orgId, type, label, cost, createdAt: new Date().toISOString() },
    ...current,
  ].slice(0, 200));
}

// DEPOIS (novo - persistente):
private async recordCost(
  orgId: string,
  type: 'text' | 'image' | 'estimate',
  label: string,
  cost: CostEstimate | null | undefined,
  model?: string,
  provider?: string
) {
  await this.generationCostService.recordCost({
    organizationId: orgId,
    type,
    label,
    model,
    provider,
    cost,
  });
}
```

Substituir `getCostHistory`:

```typescript
// ANTES:
getCostHistory(orgId: string) { ... }

// DEPOIS:
async getCostHistory(orgId: string) {
  return this.generationCostService.getCostHistory(orgId);
}
```

**NOTA:** O `recordCost` agora é `async`. Todas as chamadas precisam ser `await`:
```typescript
// ANTES:
this.recordCost(orgId, 'text', `Ideias: ${topic}`, result.cost_estimate);

// DEPOIS:
await this.recordCost(orgId, 'text', `Ideias: ${topic}`, result.cost_estimate, model, 'openai_official');
```

---

## 6. Novos Endpoints

### 6.1 Dashboard de Custos

```
GET /ai-generate/costs/dashboard
```

**Response:**
```json
{
  "currentMonth": {
    "usd": 12.45,
    "brl": 68.48,
    "tokens": 1250000
  },
  "currentWeek": {
    "usd": 3.20,
    "brl": 17.60,
    "tokens": 320000
  },
  "daily": [
    { "date": "2026-07-01", "usd": 1.20, "brl": 6.60, "count": 15 },
    { "date": "2026-07-02", "usd": 2.10, "brl": 11.55, "count": 22 }
  ],
  "byType": {
    "text": { "usd": 8.30, "brl": 45.65, "count": 45 },
    "image": { "usd": 4.15, "brl": 22.83, "count": 30 }
  },
  "byProvider": {
    "openai_official": { "usd": 10.20, "brl": 56.10, "count": 50 },
    "ia_generate": { "usd": 2.25, "brl": 12.38, "count": 25 }
  },
  "byModel": {
    "gpt-4.1-mini": { "usd": 5.30, "brl": 29.15, "count": 40 },
    "dall-e-3": { "usd": 4.15, "brl": 22.83, "count": 30 }
  }
}
```

### 6.2 Verificação de Limites

```
GET /ai-generate/costs/limits
```

**Response:**
```json
{
  "allowed": true,
  "warning": false,
  "currentUsd": 12.45,
  "softLimit": 50,
  "hardLimit": 100,
  "plan": "PRO"
}
```

---

## 7. Tratamento de Erros

| Erro | Causa | Ação |
|------|-------|------|
| **DB connection error** | Prisma não conectado | Logar erro, não falhar operação principal |
| **Duplicate key** | Race condition na criação | Retry com nova key |
| **Quota exceeded** | Org atingiu hard limit | Retornar 403 com mensagem de upgrade |
| **Invalid cost data** | CostEstimate null/undefined | Ignorar silenciosamente |

---

## 8. Edge Cases

| Caso | Comportamento Esperado |
|------|----------------------|
| **Duas instâncias gravam custo simultaneamente** | Ambas inserem no Prisma (não há conflito, são inserts independentes) |
| **Restart durante operação** | Custo já gravado no Prisma sobrevive. Se não gravou, é perdido (aceitável para 1 operação) |
| **Org sem subscription** | Usa limites padrão (STANDARD) |
| **Mudança de plano no meio do mês** | Limites atualizados para novo plano |
| **Custo em moeda diferente** | Sempre converte para USD e BRL no momento da gravação |
| **Cleanup roda durante pico** | DELETEMany é batch, não bloqueia reads |

---

## 9. Critérios de Aceite

- [ ] `recordCost()` grava no Prisma (não em Map)
- [ ] `getCostHistory()` lê do Prisma com paginação
- [ ] Dashboard retorna custos por dia, tipo, provider e modelo
- [ ] Limites por plano bloqueiam geração quando excedidos
- [ ] Headers HTTP indicam custo atual e limite
- [ ] Cleanup remove registros > 90 dias
- [ ] Erro de persistência de custo não falha operação principal
- [ ] Teste unitário: GenerationCostService com mock do Prisma
- [ ] Teste unitário: CostLimitsService com diferentes planos
- [ ] Teste de integração: record → query → dashboard

---

## 10. Checklist de Implementação

### Schema
- [ ] Criar migration para `GenerationCost`
- [ ] Adicionar relation em `Organization`

### Backend
- [ ] Criar `generation-cost.repository.ts`
- [ ] Criar `generation-cost.service.ts`
- [ ] Criar `generation-cost.module.ts`
- [ ] Criar `cost-limits.service.ts`
- [ ] Modificar `ai-generate.service.ts`: substituir Map
- [ ] Modificar `ai-generate.controller.ts`: adicionar endpoints de dashboard
- [ ] Modificar `api.module.ts`: registrar módulos

### Testes
- [ ] Unit: recordCost com sucesso
- [ ] Unit: recordCost com cost null (ignorado)
- [ ] Unit: getCostHistory com paginação
- [ ] Unit: checkLimits acima do hard limit
- [ ] Unit: checkLimits acima do soft limit
- [ ] Integration: record → query → dashboard completo

### Deploy
- [ ] Feature flag: `USE_PERSISTENT_COSTS=true` (default: false)
- [ ] Rollback: se flag=false, usar Map antigo
- [ ] Migration reversível

---

## 11. Decisões de Projeto

| Decisão | Opção Escolhida | Justificativa |
|---------|----------------|---------------|
| **Armazenamento** | Prisma (PostgreSQL) | Consistente com GenerationJob, indexado |
| **Granularidade** | Por operação (não por slide) | MVP simples, pode ser expandido |
| **Limites** | Soft + Hard por plano | Flexível, permite warning antes de bloquear |
| **Cleanup** | 90 dias | Tempo suficiente para auditoria |
| **Erro de persistência** | Log + ignora | Nunca falhar operação principal por custo |
| **Async record** | Fire-and-forget com await | Garante persistência sem bloquear UI |

---

## 12. Próximas Subfases Dependentes

- **P1-3**: BrandProfile migration (usará custos para medir impacto)
- **Fase 4**: Auto-generation (usará limites para controlar geração)
- **Fase 5**: Analytics (usará dados de custo para dashboard)
- **Fase 7**: Pricing (usará limites para definir planos)
