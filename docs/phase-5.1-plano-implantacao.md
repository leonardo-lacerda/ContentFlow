# Plano de Implementação — Fase 5.1: Métricas Normalizadas de Carrossel

**Status:** Planejamento  
**Data:** 2026-06-28  
**Autor:** Planner Agent (Hermes)

---

## 1. Visão Geral dos Objetivos

A Fase 5.1 tem quatro objetivos centrais (conforme `docs/plano-implementacao-tryholo-contentflow.md` linhas 1529–1561):

1. **Vincular Posts publicados a CarouselProject** — adicionar `carouselProjectId` ao model `Post` e preencher durante a publicação.
2. **Coletar métricas por plataforma** — criar um serviço de coleta que consulta APIs de social providers (Instagram, LinkedIn, etc.) via `SocialProvider.postAnalytics()`.
3. **Normalizar métricas em score comparável** — desenvolver lógica de normalização que converte métricas brutas (likes, comentários, impressões, etc.) em um score 0–100 comparável entre plataformas.
4. **Mostrar performance por marca, template, tema e canal** — construir dashboard e endpoints de agregação.

### Critérios de Aceitação (do doc)
- Um carrossel publicado mostra performance dentro do ContentFlow.
- É possível ver quais templates e temas performam melhor.
- Dados brutos e normalizados ficam separados.
- Teste com métricas mockadas, plataforma sem métrica, e atualização periódica.
- Falha de uma plataforma NÃO quebra o dashboard inteiro.

---

## 2. Arquivos a Criar

### 2.1 Prisma Schema & Migration

| Arquivo | Ação |
|---------|------|
| `libraries/nestjs-libraries/src/database/prisma/schema.prisma` | **Modificar** — adicionar campo `carouselProjectId` ao model `Post` e criar model `CarouselPerformance` |
| `libraries/nestjs-libraries/src/database/prisma/migrations/20260628_XXXXXX_add_carousel_performance/` | **Criar** — migration SQL |

### 2.2 Backend — Repository

| Arquivo | Ação |
|---------|------|
| `libraries/nestjs-libraries/src/database/prisma/carousel-performance/carousel-performance.repository.ts` | **Criar** |

### 2.3 Backend — Service

| Arquivo | Ação |
|---------|------|
| `libraries/nestjs-libraries/src/database/prisma/carousel-performance/carousel-performance.service.ts` | **Criar** |
| `libraries/nestjs-libraries/src/database/prisma/carousel-performance/metrics-normalizer.service.ts` | **Criar** |
| `libraries/nestjs-libraries/src/database/prisma/carousel-performance/metrics-collector.service.ts` | **Criar** |

### 2.4 Backend — Controller

| Arquivo | Ação |
|---------|------|
| `apps/backend/src/api/routes/carousel-performance.controller.ts` | **Criar** |

### 2.5 Backend — DTOs

| Arquivo | Ação |
|---------|------|
| `libraries/nestjs-libraries/src/dtos/carousel-performance/create-carousel-performance.dto.ts` | **Criar** |
| `libraries/nestjs-libraries/src/dtos/carousel-performance/get-carousel-performance.dto.ts` | **Criar** |

### 2.6 Backend — Module Registration

| Arquivo | Ação |
|---------|------|
| `apps/backend/src/api/api.module.ts` | **Modificar** — registrar controller, service e repository |

### 2.7 Backend — Modificação em Post Publishing

| Arquivo | Ação |
|---------|------|
| `libraries/nestjs-libraries/src/database/prisma/posts/posts.service.ts` | **Modificar** — ao publicar, preencher `carouselProjectId` se disponível |

### 2.8 Frontend — Dashboard Page

| Arquivo | Ação |
|---------|------|
| `apps/frontend/src/app/(app)/(site)/carousel-performance/page.tsx` | **Criar** |
| `apps/frontend/src/components/carousel-performance/carousel.performance.dashboard.tsx` | **Criar** |
| `apps/frontend/src/components/carousel-performance/performance.card.tsx` | **Criar** |
| `apps/frontend/src/components/carousel-performance/metrics.table.tsx` | **Criar** |
| `apps/frontend/src/components/carousel-performance/normalization.legend.tsx` | **Criar** |

---

## 3. Schema Prisma — Modelo CarouselPerformance

### 3.1 Campo no model `Post` (adição)

```prisma
// Adicionar ao model Post (linha ~411, após releaseURL):
carouselProjectId  String?

// Adicionar relation:
carouselProject  CarouselProject?  @relation(fields: [carouselProjectId], references: [id])

// Adicionar ao final do model Post (antes dos @@index):
@@index([carouselProjectId])
```

### 3.2 Campo no model `CarouselProject` (adição de relation)

```prisma
// Adicionar ao model CarouselProject (após editorialSlots):
posts  Post[]
performances  CarouselPerformance[]
```

### 3.3 Novo model `CarouselPerformance`

```prisma
enum MetricsCollectionStatus {
  PENDING
  COLLECTED
  NORMALIZED
  FAILED
  STALE
}

model CarouselPerformance {
  id                 String                   @id @default(uuid())
  carouselProjectId  String
  postId             String?                  // Post que gerou esta métrica (pode ter vários posts por projeto)
  integrationId      String                   // Qual canal/social foi publicado
  provider           String                   // instagram, linkedin, tiktok, etc.

  // --- Métricas brutas (raw) ---
  impressions        Int                      @default(0)
  reach              Int                      @default(0)
  likes              Int                      @default(0)
  comments           Int                      @default(0)
  shares             Int                      @default(0)
  saves              Int                      @default(0)
  clicks             Int                      @default(0)
  videoViews         Int                      @default(0)
  profileVisits      Int                      @default(0)
  followCount        Int                      @default(0)  // follows gerados
  rawMetrics         Json?                    // Métricas adicionais específicas da plataforma

  // --- Métricas normalizadas ---
  normalizedScore    Float?                   // Score 0-100, calculado pela normalização
  normalizedBreakdown Json?                   // { engagement: 85, reach: 72, virality: 60 }
  scoreVersion       String?                  // Versão da fórmula de normalização usada

  // --- Metadados do carrossel (denormalizado para queries rápidas) ---
  brandProfileId     String?
  templateKey        String?                  // Identificador do template usado (do metadata do CarouselProject)
  themeTag           String?                  // Tema/pillar do conteúdo
  slideCount         Int?                     // Número de slides do carrossel
  captionLength      Int?                     // Tamanho da caption em caracteres
  hashtagCount       Int?                     // Quantidade de hashtags

  // --- Controle de coleta ---
  collectionStatus   MetricsCollectionStatus  @default(PENDING)
  collectedAt        DateTime?
  normalizedAt       DateTime?
  lastRefreshAt      DateTime?
  nextRefreshAt      DateTime?
  collectionError    String?

  // --- Timestamps ---
  publishedAt        DateTime?                // Data/hora da publicação
  createdAt          DateTime                 @default(now())
  updatedAt          DateTime                 @updatedAt

  // --- Relations ---
  carouselProject    CarouselProject          @relation(fields: [carouselProjectId], references: [id])
  post               Post?                    @relation(fields: [postId], references: [id])
  integration        Integration              @relation(fields: [integrationId], references: [id])
  brandProfile       BrandProfile?            @relation(fields: [brandProfileId], references: [id])

  @@unique([postId, integrationId])           // Um post por integração
  @@index([carouselProjectId])
  @@index([postId])
  @@index([integrationId])
  @@index([provider])
  @@index([brandProfileId])
  @@index([collectionStatus])
  @@index([normalizedScore])
  @@index([templateKey])
  @@index([themeTag])
  @@index([publishedAt])
  @@index([carouselProjectId, provider])
  @@index([brandProfileId, normalizedScore])
}
```

### 3.4 Relations a adicionar em models existentes

```prisma
// model CarouselProject — adicionar:
posts       Post[]
performances CarouselPerformance[]

// model Post — adicionar:
carouselProjectId  String?
carouselProject    CarouselProject?  @relation(fields: [carouselProjectId], references: [id])

// model Integration — adicionar:
performances CarouselPerformance[]

// model BrandProfile — adicionar:
performances CarouselPerformance[]
```

---

## 4. Repository — Interface e Métodos

**Arquivo:** `libraries/nestjs-libraries/src/database/prisma/carousel-performance/carousel-performance.repository.ts`

### Métodos:

```typescript
@Injectable()
export class CarouselPerformanceRepository {
  constructor(private prisma: PrismaService) {}

  // CRUD básico
  findById(id: string): Promise<CarouselPerformance | null>
  
  findByProject(carouselProjectId: string): Promise<CarouselPerformance[]>
  
  findByOrganization(orgId: string, filters?: {
    brandProfileId?: string;
    provider?: string;
    templateKey?: string;
    themeTag?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<CarouselPerformance[]>

  findByPost(postId: string): Promise<CarouselPerformance | null>

  upsert(data: {
    postId: string;
    integrationId: string;
    provider: string;
    carouselProjectId: string;
    brandProfileId?: string;
    templateKey?: string;
    themeTag?: string;
    slideCount?: number;
    captionLength?: number;
    hashtagCount?: number;
    publishedAt?: Date;
  }): Promise<CarouselPerformance>

  updateRawMetrics(id: string, metrics: {
    impressions?: number;
    reach?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    clicks?: number;
    videoViews?: number;
    profileVisits?: number;
    followCount?: number;
    rawMetrics?: any;
  }): Promise<CarouselPerformance>

  updateNormalizedScore(id: string, data: {
    normalizedScore: number;
    normalizedBreakdown: any;
    scoreVersion: string;
    normalizedAt: Date;
  }): Promise<CarouselPerformance>

  updateCollectionStatus(id: string, status: MetricsCollectionStatus, error?: string): Promise<void>

  // Métodos de agregação (queries com GROUP BY para dashboard)
  aggregateByProject(carouselProjectId: string): Promise<{
    totalImpressions: number;
    totalReach: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    avgNormalizedScore: number;
    postCount: number;
  }>

  aggregateByBrand(orgId: string, brandProfileId: string): Promise<{
    brandProfileId: string;
    totalImpressions: number;
    totalReach: number;
    totalLikes: number;
    avgNormalizedScore: number;
    carouselCount: number;
    bestPerformingTemplate: string | null;
    bestPerformingTheme: string | null;
  }>

  aggregateByTemplate(orgId: string): Promise<Array<{
    templateKey: string;
    carouselCount: number;
    avgNormalizedScore: number;
    avgLikes: number;
    avgShares: number;
  }>>

  aggregateByTheme(orgId: string): Promise<Array<{
    themeTag: string;
    carouselCount: number;
    avgNormalizedScore: number;
    avgLikes: number;
    avgShares: number;
  }>>

  aggregateByProvider(orgId: string): Promise<Array<{
    provider: string;
    carouselCount: number;
    avgNormalizedScore: number;
    avgLikes: number;
    avgShares: number;
  }>>

  // Top performers
  getTopPerformers(orgId: string, limit?: number): Promise<CarouselPerformance[]>

  // Métricas para coleta (posts publicados sem métricas ou que precisam refresh)
  findPendingCollection(limit?: number): Promise<CarouselPerformance[]>
  
  findNeedingRefresh(limit?: number): Promise<CarouselPerformance[]>

  // Time series (para gráficos)
  getPerformanceTimeSeries(orgId: string, filters?: {
    brandProfileId?: string;
    provider?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<Array<{
    date: string;
    avgScore: number;
    totalLikes: number;
    totalImpressions: number;
  }>>
}
```

---

## 5. Services

### 5.1 CarouselPerformanceService

**Arquivo:** `libraries/nestjs-libraries/src/database/prisma/carousel-performance/carousel-performance.service.ts`

```typescript
@Injectable()
export class CarouselPerformanceService {
  constructor(
    private carouselPerformanceRepository: CarouselPerformanceRepository,
    private metricsNormalizer: MetricsNormalizerService,
    private metricsCollector: MetricsCollectorService,
  ) {}

  // Chamado quando um Post é publicado — cria registro de performance
  async registerPublishedPost(data: {
    postId: string;
    integrationId: string;
    carouselProjectId?: string;
  }): Promise<CarouselPerformance>

  // Obtém performance bruta + normalizada de um projeto
  async getProjectPerformance(carouselProjectId: string): Promise<{
    raw: CarouselPerformance[];
    aggregated: any;
  }>

  // Dashboard: métricas agregadas por marca
  async getBrandPerformance(orgId: string, brandProfileId: string): Promise<any>

  // Dashboard: ranking de templates
  async getTemplateRanking(orgId: string): Promise<any>

  // Dashboard: ranking de temas
  async getThemeRanking(orgId: string): Promise<any>

  // Dashboard: ranking por canal/plataforma
  async getChannelRanking(orgId: string): Promise<any>

  // Dashboard: top performers
  async getTopPerformers(orgId: string, limit?: number): Promise<any>

  // Dashboard: time series para gráficos
  async getPerformanceTimeSeries(orgId: string, filters?: any): Promise<any>

  // Dashboard: visão geral (KPIs)
  async getDashboardOverview(orgId: string): Promise<{
    totalCarouselPublished: number;
    avgNormalizedScore: number;
    totalImpressions: number;
    totalReach: number;
    totalEngagement: number;
    topTemplate: string | null;
    topTheme: string | null;
    topProvider: string | null;
    periodComparison: { current: number; previous: number; change: number };
  }>

  // Coleta e normalização — chamado pelo job
  async collectAndNormalize(id: string): Promise<void>
}
```

### 5.2 MetricsNormalizerService

**Arquivo:** `libraries/nestjs-libraries/src/database/prisma/carousel-performance/metrics-normalizer.service.ts`

**Responsabilidade:** Converter métricas brutas em score normalizado 0–100.

```typescript
@Injectable()
export class MetricsNormalizerService {

  // Score normalizado com base em dados históricos da organização
  calculateNormalizedScore(metrics: {
    impressions: number;
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    clicks: number;
    videoViews: number;
    followCount: number;
  }, context: {
    provider: string;        // plataforma
    orgId: string;           // para pegar benchmarks da org
    slideCount?: number;     // carrosséis com mais slides podem ter reach diferente
  }): {
    score: number;           // 0-100
    breakdown: {
      engagement: number;    // 0-100
      reach: number;         // 0-100
      virality: number;      // 0-100
      conversion: number;    // 0-100
    }
    version: string;
  }

  // Busca benchmarks históricos da organização
  private async getOrgBenchmarks(orgId: string, provider: string): Promise<{
    avgLikes: number;
    avgComments: number;
    avgShares: number;
    avgImpressions: number;
    avgReach: number;
    p75Likes: number;
    p75Comments: number;
    p75Shares: number;
    p75Impressions: number;
  }>

  // Normaliza valor individual com min/max da organização
  private normalizeValue(value: number, p75: number): number
}
```

#### Fórmula de Normalização (v1)

```
Score = (0.40 × Engagement) + (0.25 × Reach) + (0.20 × Virality) + (0.15 × Conversion)

Onde:
  Engagement = (likes×1 + comments×3 + saves×5 + shares×4) / (impressions × weightMultiplier)
  Reach      = reach / impressions  (ou normalizado contra p75 da org)
  Virality   = shares / (likes + comments)  (proporção de compartilhamento)
  Conversion = clicks / impressions  (ou follows/likes para profile visit ratio)

Cada componente é normalizado para 0-100 usando o percentil 75 (p75) da organização como referência:
  normalizedValue = min(100, (actual / p75) × 75)
```

**Nota:** A fórmula é versionada (`scoreVersion: 'v1'`). Mudanças futuras na fórmula criam nova versão, mantendo histórico.

### 5.3 MetricsCollectorService

**Arquivo:** `libraries/nestjs-libraries/src/database/prisma/carousel-performance/metrics-collector.service.ts`

**Responsabilidade:** Buscar métricas das APIs de social providers e atualizar o registro.

```typescript
@Injectable()
export class MetricsCollectorService {
  constructor(
    private integrationManager: IntegrationManager,
    private refreshIntegrationService: RefreshIntegrationService,
    private integrationRepository: IntegrationRepository,
  ) {}

  // Coleta métricas de um registro de performance específico
  async collectMetrics(performance: CarouselPerformance & {
    post: { releaseId: string | null; integration: Integration };
  }): Promise<boolean>

  // Coleta em lote — busca todos os registros pendentes ou que precisam refresh
  async collectBatch(limit?: number): Promise<{
    collected: number;
    failed: number;
    errors: string[];
  }>

  // Mapeia AnalyticsData[] do provider para campos brutos do CarouselPerformance
  private mapAnalyticsToMetrics(analyticsData: AnalyticsData[]): {
    impressions: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
    saves: number;
    videoViews: number;
    // ... etc
  }
}
```

**Chave:** Este serviço reutiliza `SocialProvider.postAnalytics()` que já existe nos providers (Instagram, LinkedIn, Facebook, etc.), conforme interface `ISocialMediaIntegration`.

---

## 6. Controller — Endpoints

**Arquivo:** `apps/backend/src/api/routes/carousel-performance.controller.ts`

```typescript
@ApiTags('Carousel Performance')
@Controller('/carousel-performance')
export class CarouselPerformanceController {
  constructor(
    private carouselPerformanceService: CarouselPerformanceService,
  ) {}

  // === Consultas ===

  /** Performance de um projeto específico */
  @Get('/project/:projectId')
  async getProjectPerformance(
    @GetOrgFromRequest() org: Organization,
    @Param('projectId') projectId: string
  )

  /** Dashboard overview — KPIs agregados */
  @Get('/dashboard/overview')
  async getDashboardOverview(
    @GetOrgFromRequest() org: Organization
  )

  /** Ranking de templates */
  @Get('/dashboard/templates')
  async getTemplateRanking(
    @GetOrgFromRequest() org: Organization
  )

  /** Ranking de temas */
  @Get('/dashboard/themes')
  async getThemeRanking(
    @GetOrgFromRequest() org: Organization
  )

  /** Ranking por canal/plataforma */
  @Get('/dashboard/channels')
  async getChannelRanking(
    @GetOrgFromRequest() org: Organization
  )

  /** Top performers */
  @Get('/dashboard/top-performers')
  async getTopPerformers(
    @GetOrgFromRequest() org: Organization,
    @Query('limit') limit?: string
  )

  /** Time series para gráficos */
  @Get('/dashboard/time-series')
  async getPerformanceTimeSeries(
    @GetOrgFromRequest() org: Organization,
    @Query('brandProfileId') brandProfileId?: string,
    @Query('provider') provider?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  )

  /** Performance por marca */
  @Get('/brand/:brandId')
  async getBrandPerformance(
    @GetOrgFromRequest() org: Organization,
    @Param('brandId') brandId: string
  )

  /** Todas as performances da org (com filtros) */
  @Get('/')
  async getAllPerformances(
    @GetOrgFromRequest() org: Organization,
    @Query('brandProfileId') brandProfileId?: string,
    @Query('provider') provider?: string,
    @Query('templateKey') templateKey?: string,
    @Query('themeTag') themeTag?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  )

  /** Detalhes de uma performance específica */
  @Get('/:id')
  async getPerformanceById(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  )

  // === Ações ===

  /** Forçar coleta de métricas para um registro */
  @Post('/:id/refresh')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async refreshMetrics(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  )

  /** Trigger coleta em lote (admin/job) */
  @Post('/collect-batch')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async collectBatch(
    @GetOrgFromRequest() org: Organization,
    @Body() body?: { limit?: number }
  )
}
```

### Resumo dos Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/carousel-performance/` | Lista performances com filtros |
| GET | `/carousel-performance/:id` | Detalhe de uma performance |
| GET | `/carousel-performance/project/:projectId` | Performance de um projeto |
| GET | `/carousel-performance/brand/:brandId` | Performance por marca |
| GET | `/carousel-performance/dashboard/overview` | KPIs agregados |
| GET | `/carousel-performance/dashboard/templates` | Ranking de templates |
| GET | `/carousel-performance/dashboard/themes` | Ranking de temas |
| GET | `/carousel-performance/dashboard/channels` | Ranking por plataforma |
| GET | `/carousel-performance/dashboard/top-performers` | Top performers |
| GET | `/carousel-performance/dashboard/time-series` | Dados para gráficos |
| POST | `/carousel-performance/:id/refresh` | Forçar refresh de métricas |
| POST | `/carousel-performance/collect-batch` | Coleta em lote |

---

## 7. Módulo NestJS — Registro

**Arquivo:** `apps/backend/src/api/api.module.ts`

### Alterações necessárias:

1. **Importar** os novos controllers e services:
```typescript
import { CarouselPerformanceController } from '@gitroom/backend/api/routes/carousel-performance.controller';
import { CarouselPerformanceService } from '@gitroom/nestjs-libraries/database/prisma/carousel-performance/carousel-performance.service';
import { CarouselPerformanceRepository } from '@gitroom/nestjs-libraries/database/prisma/carousel-performance/carousel-performance.repository';
import { MetricsNormalizerService } from '@gitroom/nestjs-libraries/database/prisma/carousel-performance/metrics-normalizer.service';
import { MetricsCollectorService } from '@gitroom/nestjs-libraries/database/prisma/carousel-performance/metrics-collector.service';
```

2. **Adicionar** ao array `authenticatedController`:
```typescript
CarouselPerformanceController,
```

3. **Adicionar** ao array `providers`:
```typescript
CarouselPerformanceService,
CarouselPerformanceRepository,
MetricsNormalizerService,
MetricsCollectorService,
```

---

## 8. Frontend — Componentes

### 8.1 Page: `/carousel-performance/page.tsx`

Página principal do dashboard. Server component que renderiza o componente client.

```typescript
// apps/frontend/src/app/(app)/(site)/carousel-performance/page.tsx
export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { CarouselPerformanceDashboard } from '@gitroom/frontend/components/carousel-performance/carousel.performance.dashboard';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'} Carousel Performance`,
  description: '',
};

export default async function CarouselPerformancePage() {
  return <CarouselPerformanceDashboard />;
}
```

### 8.2 Component: `carousel.performance.dashboard.tsx`

Componente principal `'use client'` que:
- Usa `useSWR` + `useFetch` (pattern existente em `platform.analytics.tsx`)
- Busca `/carousel-performance/dashboard/overview`
- Renderiza KPI cards (score médio, total impressões, total engajamento)
- Renderiza tabs: Overview | Templates | Temas | Canais | Top Performers
- Renderiza gráfico de time series (recomenda-se Recharts ou similar já disponível)

### 8.3 Component: `performance.card.tsx`

Card reutilizável para exibir uma performance individual:
- Thumbnail do carrossel (primeiro slide)
- Score normalizado (0-100) com indicador visual (cor: verde/amarelo/vermelho)
- Métricas resumidas: likes, comentários, shares, impressões
- Badge da plataforma (Instagram, LinkedIn, etc.)
- Link para detalhes

### 8.4 Component: `metrics.table.tsx`

Tabela com métricas detalhadas:
- Colunas: Data | Plataforma | Impressões | Likes | Comentários | Shares | Saves | Score
- Sorting por qualquer coluna
- Filtros por data range

### 8.5 Component: `normalization.legend.tsx`

Legenda/explicação do sistema de normalização:
- Como o score é calculado
- Pesos de cada componente
- Referência ao percentil 75

---

## 9. Modificação no Post Publishing

**Arquivo:** `libraries/nestjs-libraries/src/database/prisma/posts/posts.service.ts`

Quando um post é publicado com sucesso (state muda para PUBLICADO ou similar), o sistema deve:

1. Verificar se o post possui `carouselProjectId` (via configuração ou metadados)
2. Se tiver, chamar `CarouselPerformanceService.registerPublishedPost()` para criar o registro de performance
3. Definir `collectionStatus: PENDING` para que o job de coleta pegue posteriormente

**Onde vincular:** O `carouselProjectId` pode ser preenchido de duas formas:
- **Opção A (Recomendada):** Ao criar o Post a partir do fluxo de publicação do CarouselProject, o `carouselProjectId` é passado nos dados do post.
- **Opção B:** Um campo `metadata` no Post armazena `{ carouselProjectId: "..." }` e o sistema extrai disso.

A **Opção A** é mais limpa e segue o padrão já usado por `GenerationJob.carouselProjectId`.

---

## 10. Job de Coleta de Métricas

O projeto já usa **Temporal** para jobs (`nestjs-temporal-core`). Existem duas abordagens:

### Opção A: Cron Job Temporal (Recomendada)
- Criar um workflow Temporal que roda a cada 6 horas
- Busca registros com `collectionStatus IN (PENDING, STALE)` ou `nextRefreshAt <= now()`
- Chama `MetricsCollectorService.collectBatch()`
- Após coleta, chama `MetricsNormalizerService.calculateNormalizedScore()`
- Atualiza `collectionStatus` e timestamps

### Opção B: Trigger manual via controller
- Endpoint `POST /carousel-performance/collect-batch` já definido
- Pode ser chamado por um cron externo ou manualmente

**Recomendação:** Implementar Opção B primeiro (endpoint manual), depois adicionar workflow Temporal na Fase 5.2 ou iteração futura.

---

## 11. Ordem de Execução e Dependências

```
┌─────────────────────────────────────────────────────────┐
│                    FASE 5.1                              │
│                                                          │
│  PASSO 1: Schema Prisma + Migration                     │
│  ├── Adicionar carouselProjectId ao Post                │
│  ├── Criar model CarouselPerformance                    │
│  ├── Adicionar relations em Post, CarouselProject,      │
│  │   Integration, BrandProfile                          │
│  └── Rodar prisma migrate dev                          │
│         │                                               │
│         ▼                                               │
│  PASSO 2: Repository                                    │
│  ├── Criar CarouselPerformanceRepository                │
│  └── Métodos CRUD + agregação                           │
│         │                                               │
│         ▼                                               │
│  PASSO 3: Normalization Service                         │
│  ├── Criar MetricsNormalizerService                     │
│  └── Fórmula v1 de normalização                         │
│         │                                               │
│         ▼                                               │
│  PASSO 4: Collector Service                             │
│  ├── Criar MetricsCollectorService                      │
│  └── Integração com SocialProvider.postAnalytics()      │
│         │                                               │
│         ▼                                               │
│  PASSO 5: Performance Service                           │
│  ├── Criar CarouselPerformanceService                   │
│  └── Orquestra collector + normalizer                   │
│         │                                               │
│         ▼                                               │
│  PASSO 6: Controller                                    │
│  ├── Criar CarouselPerformanceController                │
│  └── Registrar no ApiModule                             │
│         │                                               │
│         ▼                                               │
│  PASSO 7: Vinculação no Post Publishing                 │
│  └── Modificar PostsService para registrar performance  │
│         │                                               │
│         ▼                                               │
│  PASSO 8: Frontend Dashboard                            │
│  ├── Criar page.tsx                                     │
│  ├── Criar componentes (dashboard, cards, tabela)       │
│  └── Integrar com endpoints                             │
│         │                                               │
│         ▼                                               │
│  PASSO 9: Validação                                     │
│  ├── Teste com métricas mockadas                        │
│  ├── Teste com plataforma sem métrica                   │
│  └── Teste de atualização periódica                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Dependências entre Passos

| Passo | Depende de | Justificativa |
|-------|------------|---------------|
| 1 (Schema) | Nenhum | Primeiro passo, define a estrutura |
| 2 (Repository) | 1 | Usa os modelos Prisma gerados |
| 3 (Normalizer) | 1 | Precisa do schema para queries de benchmark |
| 4 (Collector) | 1, 2 | Usa repository para persistir + schema para tipos |
| 5 (Service) | 2, 3, 4 | Orquestra repository, normalizer e collector |
| 6 (Controller) | 5 | Usa o service |
| 7 (Post linking) | 5 | Usa o service para registrar performance |
| 8 (Frontend) | 6 | Consome os endpoints |
| 9 (Validação) | 1–8 | Validação final |

---

## 12. Checklist de Implementação

### 12.1 Schema e Migration
- [ ] Adicionar campo `carouselProjectId` ao model `Post`
- [ ] Adicionar relation `Post → CarouselProject` no model `Post`
- [ ] Adicionar relation `Post[]` no model `CarouselProject`
- [ ] Criar model `CarouselPerformance` completo
- [ ] Adicionar relations `CarouselPerformance[]` em `CarouselProject`, `Post`, `Integration`, `BrandProfile`
- [ ] Criar enum `MetricsCollectionStatus`
- [ ] Rodar `npx prisma migrate dev --name add_carousel_performance`
- [ ] Verificar que `npx prisma generate` compila sem erros
- [ ] Verificar que a migration SQL está correta

### 12.2 Repository
- [ ] Criar `carousel-performance.repository.ts`
- [ ] Implementar `findById`, `findByProject`, `findByPost`
- [ ] Implementar `findByOrganization` com filtros
- [ ] Implementar `upsert`
- [ ] Implementar `updateRawMetrics`
- [ ] Implementar `updateNormalizedScore`
- [ ] Implementar `updateCollectionStatus`
- [ ] Implementar `aggregateByProject`
- [ ] Implementar `aggregateByBrand`
- [ ] Implementar `aggregateByTemplate`
- [ ] Implementar `aggregateByTheme`
- [ ] Implementar `aggregateByProvider`
- [ ] Implementar `getTopPerformers`
- [ ] Implementar `findPendingCollection`
- [ ] Implementar `findNeedingRefresh`
- [ ] Implementar `getPerformanceTimeSeries`

### 12.3 MetricsNormalizerService
- [ ] Criar `metrics-normalizer.service.ts`
- [ ] Implementar `calculateNormalizedScore`
- [ ] Implementar `getOrgBenchmarks` (queries de percentil)
- [ ] Implementar `normalizeValue`
- [ ] Definir fórmula v1 com pesos documentados
- [ ] Adicionar versionamento de fórmula

### 12.4 MetricsCollectorService
- [ ] Criar `metrics-collector.service.ts`
- [ ] Implementar `collectMetrics` (usa `SocialProvider.postAnalytics()`)
- [ ] Implementar `collectBatch`
- [ ] Implementar `mapAnalyticsToMetrics`
- [ ] Tratar falha de plataforma isoladamente (não quebra batch)
- [ ] Usar `RefreshIntegrationService` para refresh de tokens

### 12.5 CarouselPerformanceService
- [ ] Criar `carousel-performance.service.ts`
- [ ] Implementar `registerPublishedPost`
- [ ] Implementar `getProjectPerformance`
- [ ] Implementar `getBrandPerformance`
- [ ] Implementar `getTemplateRanking`
- [ ] Implementar `getThemeRanking`
- [ ] Implementar `getChannelRanking`
- [ ] Implementar `getTopPerformers`
- [ ] Implementar `getPerformanceTimeSeries`
- [ ] Implementar `getDashboardOverview`
- [ ] Implementar `collectAndNormalize`

### 12.6 Controller
- [ ] Criar `carousel-performance.controller.ts`
- [ ] Implementar GET `/` (listar performances)
- [ ] Implementar GET `/:id` (detalhe)
- [ ] Implementar GET `/project/:projectId`
- [ ] Implementar GET `/brand/:brandId`
- [ ] Implementar GET `/dashboard/overview`
- [ ] Implementar GET `/dashboard/templates`
- [ ] Implementar GET `/dashboard/themes`
- [ ] Implementar GET `/dashboard/channels`
- [ ] Implementar GET `/dashboard/top-performers`
- [ ] Implementar GET `/dashboard/time-series`
- [ ] Implementar POST `/:id/refresh`
- [ ] Implementar POST `/collect-batch`

### 12.7 Registro no Módulo
- [ ] Importar e registrar `CarouselPerformanceController` em `api.module.ts`
- [ ] Registrar `CarouselPerformanceService`, `CarouselPerformanceRepository`, `MetricsNormalizerService`, `MetricsCollectorService` em `providers`
- [ ] Verificar que o backend compila sem erros

### 12.8 Vinculação no Post Publishing
- [ ] Modificar criação de Post para aceitar `carouselProjectId`
- [ ] Chamar `registerPublishedPost` ao publicar com sucesso
- [ ] Garantir que posts sem `carouselProjectId` não são afetados

### 12.9 Frontend
- [ ] Criar `page.tsx` em `/carousel-performance/`
- [ ] Criar `carousel.performance.dashboard.tsx`
- [ ] Criar `performance.card.tsx`
- [ ] Criar `metrics.table.tsx`
- [ ] Criar `normalization.legend.tsx`
- [ ] Integrar com SWR/useFetch para dados
- [ ] Testar navegação entre abas

### 12.10 Validação
- [ ] Teste com métricas mockadas (inserir performance diretamente no DB)
- [ ] Teste com plataforma sem métrica (provider sem `postAnalytics`)
- [ ] Teste de atualização periódica (chamar collect-batch manualmente)
- [ ] Verificar que falha de uma plataforma não quebra o dashboard
- [ ] Verificar que dados brutos e normalizados ficam separados

---

## 13. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Providers sem `postAnalytics()` | Alto | `MetricsCollectorService` verifica se o método existe antes de chamar; retorna `[]` se não existir |
| Rate limits das APIs sociais | Médio | Usar cache Redis (pattern existente em `checkAnalytics`), limitar batch size |
| Dados incompletos de analytics | Médio | Campo `rawMetrics` (Json) aceita dados variados; normalização trata zeros |
| Performance de queries de agregação | Médio | Índices compostos no schema; considerar materialized views se necessário |
| Mudança na fórmula de normalização | Baixo | Versionamento (`scoreVersion`); dados brutos preservados sempre |

---

## 14. Resumo dos Entregáveis

| # | Entregável | Arquivos | Dependências |
|---|-----------|----------|--------------|
| 1 | Schema Prisma + Migration | schema.prisma, migration SQL | Nenhuma |
| 2 | CarouselPerformance Repository | carousel-performance.repository.ts | #1 |
| 3 | MetricsNormalizerService | metrics-normalizer.service.ts | #1 |
| 4 | MetricsCollectorService | metrics-collector.service.ts | #1, #2 |
| 5 | CarouselPerformanceService | carousel-performance.service.ts | #2, #3, #4 |
| 6 | CarouselPerformance Controller | carousel-performance.controller.ts | #5 |
| 7 | Registro no ApiModule | api.module.ts | #6 |
| 8 | Vinculação Post → Performance | posts.service.ts | #5 |
| 9 | Dashboard Frontend | page.tsx + 4 componentes | #6 |
| 10 | Validação | Testes manuais | #1–#9 |

---

*Fim do plano — Fase 5.1: Métricas Normalizadas de Carrossel*
