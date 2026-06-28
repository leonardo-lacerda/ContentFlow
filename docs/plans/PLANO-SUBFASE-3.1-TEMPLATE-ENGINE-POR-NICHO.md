# Plano de Implementação — Subfase 3.1: Template Engine por Nicho

> **Fase:** 3 — Qualidade Superior de Carrossel  
> **Subfase:** 3.1 — Template Engine por Nicho  
> **Status:** Rascunho para aprovação  
> **Autor:** Hermes Agent (análise automatizada do codebase)

---

## Índice

1. [Resumo Executivo](#1-resumo-executivo)
2. [Estado Atual do Sistema](#2-estado-atual-do-sistema)
3. [Dados do Modelo Expandido](#3-dados-do-modelo-expandido)
4. [Lista Completa de Arquivos](#4-lista-completa-de-arquivos)
5. [Design do Modelo de Dados](#5-design-do-modelo-de-dados)
6. [Alterações Backend](#6-alterações-backend)
7. [Alterações Frontend](#7-alterações-frontend)
8. [Atualização do Direction Compiler](#8-atualização-do-direction-compiler)
9. [Estratégia de Versionamento](#9-estratégia-de-versionamento)
10. [Design de Tracking de Uso](#10-design-de-tracking-de-uso)
11. [Ordem de Implementação Passo a Passo](#11-ordem-de-implementação-passo-a-passo)
12. [Checklist com Critérios de Conclusão](#12-checklist-com-critérios-de-conclusão)
13. [Riscos e Decisões Pendentes](#13-riscos-e-decisões-pendentes)

---

## 1. Resumo Executivo

O sistema atual possui 8 templates hardcoded no frontend como array constante. Cada template tem apenas campos básicos (id, label, goal, tone, slideCount, visualStyle, instruction) sem regras narrativas estruturadas, sem versionamento, sem tracking de uso e sem recomendador inteligente.

A Subfase 3.1 transforma templates em **dados versionados, enriquecidos e servidos pelo backend**, com um recomendador baseado em Brand DNA, nicho, objetivo e plataforma, permitindo expandir de 8 para 16+ templates sem modificar componentes frontend.

### Critérios de conclusão (do plano de fase):
- ✅ O sistema recomenda templates coerentes com a marca e objetivo
- ✅ Adicionar novo template não exige mexer em vários componentes
- ✅ Performance por template pode ser medida
- ❌ Templates NÃO são apenas labels sem regra narrativa
- ❌ NÃO existe versão em cada template
- ❌ NÃO existe medição de uso

---

## 2. Estado Atual do Sistema

### 2.1 Frontend — Templates hardcoded

**Arquivo:** `apps/frontend/src/components/ai-generate/ai-generate-images.constants.ts`

- Array `carouselTemplates` com 8 objetos do tipo `CarouselTemplate`
- Cada template: `{ id, label, goal, tone, slideCount, visualStyle, instruction }`
- Sem regras narrativas, sem slide rules, sem CTA recomendado, sem checks editoriais

**Arquivo:** `apps/frontend/src/components/ai-generate/ai-generate-images.types.ts`

```typescript
type CarouselTemplate = {
  id: string;
  label: string;
  goal: string;
  tone: string;
  slideCount: number;
  visualStyle: string;
  instruction: string;
};
```

### 2.2 Direction Compiler

**Arquivo:** `apps/frontend/src/components/ai-generate/direction-compiler.ts`

- `buildDirectionSpec(strategy, brandKit)` mapeia templateId → DirectionSpec
- Switch/if-else encadeado cobrindo 8 templates
- Novos templates requerem adicionar mais branches

### 2.3 Hook principal

**Arquivo:** `apps/frontend/src/components/ai-generate/use-ai-generate-images-studio.ts`

- Importa `carouselTemplates` diretamente do constants
- `applyTemplate(templateId)` busca no array e seta goal/tone/slideCount/visualStyle
- Não há chamada ao backend para listar ou recomendar templates

### 2.4 Backend

**Arquivo:** `libraries/nestjs-libraries/src/ai-generate/ai-generate.service.ts`

- `generateCarouselPlan()` recebe goal, tone, platform, visualStyle — mas NÃO recebe templateId
- Não há endpoint para listar templates nem recomendar
- Não há tracking de qual template foi usado na geração

**Arquivo:** `libraries/nestjs-libraries/src/dtos/ai-generate/ai-generate-carousel.dto.ts`

- DTO sem campo `templateId`

### 2.5 Schema de Recomendação (existente mas básico)

**Arquivo:** `libraries/nestjs-libraries/src/ai-generate/schemas/template-recommendation.schema.ts`

```typescript
const TemplateRecommendationSchema = z.object({
  templateId: z.string(),
  name: z.string(),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
});
```

---

## 3. Dados do Modelo Expandido

### 3.1 Os 16 Templates Iniciais

| # | id | label | Categoria | Objetivo primário |
|---|---|---|---|---|
| 1 | `educational` | Educacional | Existe | Educar e engajar |
| 2 | `storytelling` | Storytelling | Existe | Aquecer audiência |
| 3 | `list` | Lista | Existe | Educar e engajar |
| 4 | `myths` | Mitos e verdades | Existe | Gerar autoridade |
| 5 | `before-after` | Antes/depois | Existe | Vender oferta |
| 6 | `case` | Case | Existe | Gerar autoridade |
| 7 | `offer` | Oferta | Existe | Vender oferta |
| 8 | `authority` | Autoridade | Existe | Gerar autoridade |
| 9 | `faq` | FAQ | **Novo** | Educar e engajar |
| 10 | `comparison` | Comparação | **Novo** | Gerar autoridade |
| 11 | `testimonial` | Depoimento/prova | **Novo** | Vender oferta |
| 12 | `statistics` | Estatísticas | **Novo** | Gerar autoridade |
| 13 | `problem-solution` | Problema-solução | **Novo** | Vender oferta |
| 14 | `us-vs-them` | Us vs Them | **Novo** | Gerar autoridade |
| 15 | `best-sellers` | Best-sellers | **Novo** | Vender oferta |
| 16 | `negative-hook` | Negative hook | **Novo** | Capturar leads |

### 3.2 Novo Modelo de Dados: `CarouselTemplateDefinition`

Cada template será definido com o seguinte schema expandido:

```typescript
// Versão do schema — incrementar a cada mudança semântica
export const TEMPLATE_SCHEMA_VERSION = '2.0.0';

export type SlideRule = {
  /** Tipo do slide (ex: 'cover', 'content', 'proof', 'cta') */
  type: 'cover' | 'hook' | 'content' | 'proof' | 'transition' | 'cta';
  /** Papel narrativo deste slide na estrutura */
  role: string;
  /** Limite máximo de caracteres para headline neste tipo de slide */
  maxHeadlineChars: number;
  /** Limite máximo de caracteres para body neste tipo de slide */
  maxBodyChars: number;
  /** Indica se este slide deve ter CTA */
  requiresCta: boolean;
};

export type EditorialCheck = {
  /** Identificador único do check */
  id: string;
  /** Descrição da regra editorial */
  description: string;
  /** Severidade quando violada */
  severity: 'info' | 'warning' | 'error';
  /** Verificação: regex ou descrição da regra */
  pattern?: string; // regex como string
  /** Mensagem quando a violação é detectada */
  message: string;
};

export type TemplateNarrativeStructure = {
  /** Nome da estrutura narrativa */
  name: string;
  /** Descrição da estrutura para o prompt da IA */
  description: string;
  /** Sequência esperada de tipos de slide */
  slideSequence: SlideRule[];
  /** Texto de instrução que vai no prompt de geração */
  promptInstruction: string;
};

export type CarouselTemplateDefinition = {
  /** ID único do template (kebab-case) */
  id: string;
  /** Nome para exibição */
  label: string;
  /** Descrição curta do template */
  description: string;
  /** Versão deste template específico */
  version: string;
  /** Se ativo/disponível para uso */
  active: boolean;

  // --- Metadados de categorização ---
  /** Categoria principal do template */
  category: string;
  /** Objetivo primário */
  goal: string;
  /** Tom de voz sugerido */
  tone: string;
  /** Plataformas onde é mais eficaz (todas se vazio) */
  preferredPlatforms: string[];
  /** Nichos onde é mais eficaz (vazio = genérico) */
  preferredNiches: string[];
  /** Faixa de slideCount recomendada */
  recommendedSlideCount: { min: number; max: number; default: number };

  // --- Estrutura narrativa ---
  narrative: TemplateNarrativeStructure;

  // --- Direção visual ---
  /** Estilo visual base */
  visualStyle: string;
  /** Direção de densidade de texto */
  textDensity: 'minimal' | 'light' | 'medium' | 'rich';
  /** Direção visual default para o DirectionSpec */
  defaultDirection: {
    editorial: string;
    hierarchy: string;
    density: string;
    composition: string;
    imagery: string;
    brandIntensity: string;
  };

  // --- CTA ---
  /** CTA recomendado para este template */
  recommendedCta: string;
  /** Variações de CTA */
  ctaVariations: string[];

  // --- Checks editoriais ---
  editorialChecks: EditorialCheck[];

  // --- Instrução para o prompt ---
  /** Instrução principal que entra no system/user prompt da IA */
  instruction: string;
};
```

---

## 4. Lista Completa de Arquivos

### 4.1 Arquivos a Criar (novos)

| # | Caminho | Descrição |
|---|---|---|
| 1 | `libraries/nestjs-libraries/src/ai-generate/templates/template-definitions.ts` | Definição completa dos 16+ templates como dados versionados |
| 2 | `libraries/nestjs-libraries/src/ai-generate/templates/template-registry.ts` | Registry: getTemplate, getAllTemplates, getTemplatesByCategory |
| 3 | `libraries/nestjs-libraries/src/ai-generate/templates/template-recommender.service.ts` | Lógica de recomendação baseada em Brand DNA + nicho + objetivo + plataforma |
| 4 | `libraries/nestjs-libraries/src/ai-generate/templates/template-recommender.spec.ts` | Testes unitários do recomendador |
| 5 | `libraries/nestjs-libraries/src/ai-generate/templates/template-usage-tracker.ts` | Tracking de uso de templates (in-memory com flush periódico) |
| 6 | `libraries/nestjs-libraries/src/ai-generate/templates/template-usage-tracker.spec.ts` | Testes do tracker |
| 7 | `libraries/nestjs-libraries/src/ai-generate/schemas/template-recommendation.schema.ts` | **Substituir** schema existente — expandir campos |
| 8 | `libraries/nestjs-libraries/src/dtos/ai-generate/ai-generate-template-recommend.dto.ts` | DTO para o endpoint de recomendação |
| 9 | `apps/frontend/src/components/ai-generate/template-recommendation-panel.tsx` | Componente UI para mostrar recomendações |
| 10 | `apps/frontend/src/components/ai-generate/template-registry.types.ts` | Types compartilhados frontend para o novo modelo de template |
| 11 | `apps/frontend/src/components/ai-generate/template-registry.ts` | Cache e fetcher de templates no frontend |
| 12 | `apps/frontend/src/components/ai-generate/template-editorial-checks.ts` | Componente de exibição de checks editoriais |

### 4.2 Arquivos a Modificar

| # | Caminho | Mudança |
|---|---|---|
| 1 | `apps/frontend/src/components/ai-generate/ai-generate-images.types.ts` | Expandir tipo `CarouselTemplate` para `CarouselTemplateDefinition` |
| 2 | `apps/frontend/src/components/ai-generate/ai-generate-images.constants.ts` | `carouselTemplates` vira fallback; exportar `TEMPLATE_SCHEMA_VERSION` |
| 3 | `apps/frontend/src/components/ai-generate/direction-compiler.ts` | `buildDirectionSpec` usa `defaultDirection` do template se disponível |
| 4 | `apps/frontend/src/components/ai-generate/direction-compiler.spec.ts` | Adicionar testes para novos templates |
| 5 | `apps/frontend/src/components/ai-generate/use-ai-generate-images-studio.ts` | `applyTemplate` busca do registry; adicionar estado de recomendação |
| 6 | `apps/frontend/src/components/ai-generate/ai-generate-images-planning-form.tsx` | UI: grid de 16+ templates com categorias; painel de recomendação |
| 7 | `apps/frontend/src/components/ai-generate/ai-generate-images.api.ts` | Adicionar endpoints `listTemplates`, `recommendTemplates`, `trackTemplateUsage` |
| 8 | `apps/backend/src/api/routes/ai-generate.controller.ts` | Adicionar 3 endpoints novos |
| 9 | `libraries/nestjs-libraries/src/ai-generate/ai-generate.service.ts` | Usar templateId na geração; registrar uso |
| 10 | `libraries/nestjs-libraries/src/dtos/ai-generate/ai-generate-carousel.dto.ts` | Adicionar campo `templateId` |
| 11 | `apps/backend/src/api/api.module.ts` | Registrar `TemplateRecommenderService` como provider |

---

## 5. Design do Modelo de Dados

### 5.1 Exemplo de Template Completo: `faq`

```typescript
{
  id: 'faq',
  label: 'FAQ',
  description: 'Carrossel de perguntas e respostas que gera autoridade e engajamento através de dúvidas reais do público.',
  version: '2.0.0',
  active: true,

  category: 'faq',
  goal: 'educar e gerar engajamento',
  tone: 'claro, prático e persuasivo',
  preferredPlatforms: ['instagram', 'linkedin'],
  preferredNiches: ['educacao', 'servicos', 'saude', 'consultoria', 'tecnologia'],
  recommendedSlideCount: { min: 4, max: 10, default: 7 },

  narrative: {
    name: 'Pergunta-Resposta Progressiva',
    description: 'Cada slide apresenta uma pergunta real do público seguida de uma resposta direta e prática. Começa com a pergunta mais frequente e vai aprofundando.',
    slideSequence: [
      { type: 'cover', role: 'Abertura com tema e gancho', maxHeadlineChars: 60, maxBodyChars: 30, requiresCta: false },
      { type: 'content', role: 'Pergunta 1 + resposta curta', maxHeadlineChars: 50, maxBodyChars: 120, requiresCta: false },
      { type: 'content', role: 'Pergunta 2 + resposta curta', maxHeadlineChars: 50, maxBodyChars: 120, requiresCta: false },
      { type: 'content', role: 'Pergunta 3 + resposta curta', maxHeadlineChars: 50, maxBodyChars: 120, requiresCta: false },
      { type: 'content', role: 'Pergunta 4 + resposta curta', maxHeadlineChars: 50, maxBodyChars: 120, requiresCta: false },
      { type: 'proof', role: 'Dica bônus ou insight avançado', maxHeadlineChars: 50, maxBodyChars: 100, requiresCta: false },
      { type: 'cta', role: 'Fechamento com CTA de salvamento', maxHeadlineChars: 40, maxBodyChars: 40, requiresCta: true },
    ],
    promptInstruction: 'Estruture como FAQ visual: cada slide com uma pergunta em destaque e resposta curta abaixo. Comece pela dúvida mais comum e progrida para questões mais específicas. Use ícone ou símbolo de interrogação como elemento visual.',
  },

  visualStyle: 'Carrossel de FAQ editorial, ícone de pergunta grande em destaque, resposta em texto menor abaixo, composição limpa e hierarquia clara entre pergunta e resposta.',
  textDensity: 'medium',
  defaultDirection: {
    editorial: 'clean',
    hierarchy: 'text-dominant',
    density: 'medium',
    composition: 'centered',
    imagery: 'icons',
    brandIntensity: 'balanced',
  },

  recommendedCta: 'Salve para consultar quando precisar',
  ctaVariations: [
    'Salve este post para consultar depois',
    'Qual é a sua dúvida? Comente abaixo',
    'Compartilhe com quem precisa ver isso',
    'Salve e envie para um amigo',
  ],

  editorialChecks: [
    { id: 'faq-min-questions', description: 'Deve ter pelo menos 3 perguntas distintas', severity: 'warning', message: 'Menos de 3 perguntas detectadas — considere adicionar mais para enriquecer o conteúdo.' },
    { id: 'faq-balance', description: 'Respostas devem ser mais curtas que as perguntas em destaque', severity: 'info', message: 'O corpo da resposta está mais longo que o esperado — mantenha as respostas concisas.' },
    { id: 'faq-no-jargon', description: 'Evitar jargão técnico sem explicação', severity: 'warning', pattern: '\\b(API|SDK|SaaS|B2B|ROI|KPI)\\b', message: 'Termo técnico detectado — considere explicar ou substituir por linguagem acessível.' },
  ],

  instruction: 'FAQ visual: cada slide apresenta uma pergunta real do público em destaque grande, seguida de resposta curta e direta. Comece pela dúvida mais frequente. Use ícone de interrogação como elemento visual recorrente.',
}
```

### 5.2 Estrutura de `TemplateRegistry`

```typescript
class TemplateRegistry {
  private templates: Map<string, CarouselTemplateDefinition>;
  private version: string;

  constructor(definitions: CarouselTemplateDefinition[]) {
    this.templates = new Map(definitions.map(t => [t.id, t]));
    this.version = TEMPLATE_SCHEMA_VERSION;
  }

  get(id: string): CarouselTemplateDefinition | undefined;
  getAll(): CarouselTemplateDefinition[];
  getActive(): CarouselTemplateDefinition[];
  getByCategory(category: string): CarouselTemplateDefinition[];
  getByGoal(goal: string): CarouselTemplateDefinition[];
  getVersion(): string;
  validate(template: unknown): { valid: boolean; errors: string[] };
}
```

---

## 6. Alterações Backend

### 6.1 Novo Endpoint: `GET /ai-generate/templates`

**Controller:** `apps/backend/src/api/routes/ai-generate.controller.ts`

```typescript
@Get('/templates')
listTemplates(@Query('category') category?: string, @Query('goal') goal?: string) {
  return this._templateRegistry.getActive();
}
```

**Retorno:** Array de `CarouselTemplateDefinition` filtrado por category/goal (opcional).

### 6.2 Novo Endpoint: `POST /ai-generate/templates/recommend`

**Controller:**

```typescript
@Post('/templates/recommend')
recommendTemplate(
  @GetOrgFromRequest() org: Organization,
  @Body() body: AiGenerateTemplateRecommendDto
) {
  return this._templateRecommenderService.recommend(org.id, body);
}
```

**DTO:** `libraries/nestjs-libraries/src/dtos/ai-generate/ai-generate-template-recommend.dto.ts`

```typescript
export class AiGenerateTemplateRecommendDto {
  @IsString() @IsOptional() @MaxLength(240)
  topic?: string;

  @IsString() @IsOptional() @MaxLength(120)
  niche?: string;

  @IsString() @IsOptional() @MaxLength(240)
  goal?: string;

  @IsString() @IsOptional() @MaxLength(80)
  platform?: string;

  @IsString() @IsOptional() @MaxLength(120)
  companyId?: string;  // Para acessar Brand DNA
}
```

**Retorno (schema Zod expandido):**

```typescript
{
  recommendations: Array<{
    templateId: string;
    name: string;
    reason: string;          // "Combinado com seu nicho de educação e objetivo de engajamento"
    confidence: number;      // 0-1
    narrativePreview: string; // Preview da estrutura narrativa
  }>;
  defaultTemplateId: string;  // Melhor recomendação
}
```

### 6.3 Novo Endpoint: `POST /ai-generate/templates/track`

**Controller:**

```typescript
@Post('/templates/track')
trackUsage(
  @GetOrgFromRequest() org: Organization,
  @Body() body: { templateId: string; event: 'select' | 'generate' | 'complete' }
) {
  return this._templateUsageTracker.track(org.id, body);
}
```

### 6.4 Alteração no DTO existente

**Arquivo:** `libraries/nestjs-libraries/src/dtos/ai-generate/ai-generate-carousel.dto.ts`

Adicionar:

```typescript
@IsString()
@IsOptional()
@MaxLength(60)
templateId?: string;
```

### 6.5 Alteração no `AiGenerateService`

**Arquivo:** `libraries/nestjs-libraries/src/ai-generate/ai-generate.service.ts`

Em `generateCarouselPlan()`:

1. Se `body.templateId` estiver presente, buscar o template do registry
2. Enriquecer o prompt com `template.narrative.promptInstruction` e `template.instruction`
3. Usar `template.narrative.slideSequence` como guia para a estrutura dos slides
4. Registrar uso via `templateUsageTracker.track(orgId, { templateId, event: 'generate' })`

### 6.6 Lógica do TemplateRecommender

**Arquivo:** `libraries/nestjs-libraries/src/ai-generate/templates/template-recommender.service.ts`

```typescript
@Injectable()
export class TemplateRecommenderService {
  constructor(private _templateRegistry: TemplateRegistry) {}

  async recommend(orgId: string, params: {
    topic?: string;
    niche?: string;
    goal?: string;
    platform?: string;
    companyId?: string;
  }) {
    // 1. Buscar Brand DNA se companyId fornecido
    // 2. Scoring: cada template recebe pontuação baseada em:
    //    - goal match (peso 0.30)
    //    - platform fit (peso 0.15)
    //    - niche match (peso 0.25)
    //    - topic semantic similarity (peso 0.20) — via keyword matching
    //    - brand DNA compatibility (peso 0.10)
    // 3. Ordenar por score decrescente
    // 4. Retornar top 5 com confidence normalizada
  }
}
```

**Algoritmo de scoring (sem IA, determinístico):**

```typescript
function scoreTemplate(template, params, brandDna?): number {
  let score = 0;

  // Goal match (0.30)
  if (template.goal === params.goal) score += 0.30;
  else if (goalFamilyMatch(template.goal, params.goal)) score += 0.15;

  // Platform fit (0.15)
  if (template.preferredPlatforms.length === 0 || template.preferredPlatforms.includes(params.platform)) {
    score += 0.15;
  } else {
    score += 0.05; // Ainda serve, mas não ideal
  }

  // Niche match (0.25)
  if (template.preferredNiches.includes(params.niche)) {
    score += 0.25;
  } else if (template.preferredNiches.length === 0) {
    score += 0.15; // Template genérico serve para qualquer nicho
  }

  // Topic keywords (0.20) — keyword matching simples
  const topicScore = keywordOverlap(params.topic, template.narrative.description + ' ' + template.instruction);
  score += topicScore * 0.20;

  // Brand DNA (0.10) — bônus se o tom do template casa com o tom da marca
  if (brandDna?.toneOfVoice && toneOverlap(brandDna.toneOfVoice, template.tone)) {
    score += 0.10;
  }

  return Math.min(1, score);
}
```

---

## 7. Alterações Frontend

### 7.1 Novo cache de templates

**Arquivo:** `apps/frontend/src/components/ai-generate/template-registry.ts`

```typescript
let cachedTemplates: CarouselTemplateDefinition[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export async function fetchTemplates(fetcher: AiGenerateFetcher): Promise<CarouselTemplateDefinition[]> {
  if (cachedTemplates && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedTemplates;
  }
  const result = await getJson<{ templates?: CarouselTemplateDefinition[] }>(fetcher, '/ai-generate/templates');
  if (result.ok && result.data?.templates) {
    cachedTemplates = result.data.templates;
    cacheTimestamp = Date.now();
    return cachedTemplates;
  }
  return []; // Fallback para import estático
}

export async function fetchRecommendations(
  fetcher: AiGenerateFetcher,
  params: { topic?: string; niche?: string; goal?: string; platform?: string; companyId?: string }
): Promise<{ recommendations: TemplateRecommendation[]; defaultTemplateId: string } | null> {
  const result = await postJson<{ recommendations?: TemplateRecommendation[]; defaultTemplateId?: string }>(
    fetcher, '/ai-generate/templates/recommend', params
  );
  if (result.ok && result.data) {
    return {
      recommendations: result.data.recommendations || [],
      defaultTemplateId: result.data.defaultTemplateId || 'educational',
    };
  }
  return null;
}

export async function trackTemplateUsage(
  fetcher: AiGenerateFetcher,
  templateId: string,
  event: 'select' | 'generate' | 'complete'
): Promise<void> {
  await postJson(fetcher, '/ai-generate/templates/track', { templateId, event });
}
```

### 7.2 Mudanças no `use-ai-generate-images-studio.ts`

1. **Adicionar estado:** `const [templates, setTemplates] = useState<CarouselTemplateDefinition[]>(carouselTemplates)` (fallback inicial = array antigo)
2. **On mount:** buscar templates do backend via `fetchTemplates(fetch)`
3. **`applyTemplate`:** buscar do `templates` em vez de `carouselTemplates`
4. **Adicionar recomendação:**
   ```typescript
   const [recommendations, setRecommendations] = useState<TemplateRecommendation[]>([]);
   const [loadingRecommendations, setLoadingRecommendations] = useState(false);

   const requestRecommendations = useCallback(async () => {
     setLoadingRecommendations(true);
     const result = await fetchRecommendations(fetch, {
       topic, niche: selectedNiche, goal, platform,
       companyId: selectedCompanyId,
     });
     if (result) setRecommendations(result.recommendations);
     setLoadingRecommendations(false);
   }, [topic, selectedNiche, goal, platform, selectedCompanyId]);
   ```
5. **Tracking:** chamar `trackTemplateUsage` em `applyTemplate` (event: 'select') e no success de `generateCarouselPlan` (event: 'generate')
6. **Expôr:** recommendations, loadingRecommendations, requestRecommendations no return do hook

### 7.3 Mudanças no `ai-generate-images-planning-form.tsx`

1. **Grid de templates:** em vez de `carouselTemplates.map`, usar `templates.map` agrupados por categoria
2. **Adicionar seletor de nicho:** campo `niche` com opções como 'educação', 'saúde', 'tecnologia', 'consultoria', 'e-commerce', 'fitness', 'finanças', 'restaurantes', 'moda', 'geral'
3. **Painel de recomendação:** antes do grid de templates, mostrar "Templates sugeridos para você" com os top 3-5 do recomendador
4. **Badge "Recomendado":** nos templates sugeridos, adicionar badge visual
5. **Tooltip informativo:** ao hover nos templates, mostrar description, slideCount e narrativa resumida

### 7.4 Componente de recomendação

**Arquivo:** `apps/frontend/src/components/ai-generate/template-recommendation-panel.tsx`

```tsx
// Componente que mostra os 3-5 templates recomendados
// com reason e confidence
// Aceita: recommendations[], onSelect(templateId), loading
// Layout: cards horizontais com nome, motivo e barra de confiança
```

### 7.5 Componente de checks editoriais

**Arquivo:** `apps/frontend/src/components/ai-generate/template-editorial-checks.ts`

```tsx
// Mostra os editorialChecks do template selecionado
// Aceita: template: CarouselTemplateDefinition
// Layout: lista de regras com ícone de severidade
// Visível na seção de revisão editorial
```

### 7.6 Expansão do grid de templates na planning form

Mudar de `grid-cols-2 md:grid-cols-4` para layout com categorias:

```tsx
{/* Templates agrupados por categoria */}
{templateCategories.map(category => (
  <div key={category}>
    <h3>{category.label}</h3>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-[8px]">
      {templates.filter(t => t.category === category.id && t.active).map(template => (
        <TemplateCard key={template.id} template={template} />
      ))}
    </div>
  </div>
))}
```

---

## 8. Atualização do Direction Compiler

### 8.1 Mudança em `buildDirectionSpec`

O direction compiler precisa usar o `defaultDirection` do template quando disponível:

```typescript
// ANTES (hardcoded if/else):
if (template === 'storytelling') editorial = 'revista';
else if (template === 'case') editorial = 'corporativo-moderno';
// ...

// DEPOIS (baseado em dados):
const templateDef = getTemplateDefinition(templateId); // busca do registry
if (templateDef?.defaultDirection) {
  return normalizeDirectionSpec({
    editorial: templateDef.defaultDirection.editorial,
    hierarchy: templateDef.defaultDirection.hierarchy,
    density: templateDef.defaultDirection.density,
    composition: templateDef.defaultDirection.composition,
    imagery: templateDef.defaultDirection.imagery,
    brandIntensity: brandKit.hasPalette
      ? templateDef.defaultDirection.brandIntensity
      : 'content-dominant',
  });
}
// Fallback: manter a lógica atual para compatibilidade
```

### 8.2 Manter backward compatibility

A lógica de if/else existente fica como fallback quando o template não é encontrado no registry. Isso garante que, mesmo com templates hardcoded antigos, o sistema funciona.

### 8.3 Novos testes

Adicionar ao `direction-compiler.spec.ts`:

```typescript
it('deriva direção para template faq', () => {
  const spec = buildDirectionSpec({ templateId: 'faq', goal: 'educar e gerar engajamento', platform: 'instagram' });
  expect(spec.editorial).toBe('clean');
  expect(spec.hierarchy).toBe('text-dominant');
});

it('deriva direção para template comparison', () => {
  const spec = buildDirectionSpec({ templateId: 'comparison', goal: 'gerar autoridade', platform: 'linkedin' });
  // ...
});
```

---

## 9. Estratégia de Versionamento

### 9.1 Versionamento em dois níveis

1. **Schema version** (`TEMPLATE_SCHEMA_VERSION = '2.0.0'`): incrementa quando o tipo `CarouselTemplateDefinition` muda estruturalmente
2. **Template version** (campo `version` em cada template): incrementa quando o conteúdo/narrativa de um template específico muda

### 9.2 Regras de versionamento

- **Semver** para ambos: `MAJOR.MINOR.PATCH`
- `MAJOR`: quebra de compatibilidade (remove campo, muda tipo)
- `MINOR`: adiciona campo opcional ou muda comportamento
- `PATCH`: corrige texto, ajusta thresholds, corrige typos

### 9.3 No banco de dados

Como templates são dados imutáveis (não ficam no Prisma), a versão serve para:
1. **Cache invalidation**: frontend compara `schemaVersion` do backend com o que está em cache
2. **Auditoria**: saber qual versão do template foi usada em cada geração
3. **Rollback**: manter versões anteriores em arquivo git

### 9.4 Versionamento via Git

- Template definitions ficam em arquivo TypeScript versionado
- Cada PR que modifica templates tem diff claro
- Não requer migration de banco

---

## 10. Design de Tracking de Uso

### 10.1 Eventos a rastrear

| Evento | Quando | Dados |
|---|---|---|
| `template.loaded` | Frontend carrega lista de templates | schemaVersion, count |
| `template.recommended` | Backend retorna recomendações | topic, niche, goal, platform, top3 templateIds, scores |
| `template.select` | Usuário clica em um template | templateId, wasRecommended, position |
| `template.generate` | Carousel plan gerado com templateId | templateId, slideCount, platform, goal |
| `template.complete` | Usuário finaliza/salva carrossel | templateId, imageCount, durationMs |

### 10.2 Armazenamento

**Opção escolhida: In-memory com agregação (sem Prisma migration)**

```typescript
// template-usage-tracker.ts

type UsageEvent = {
  orgId: string;
  templateId: string;
  event: string;
  timestamp: string;
  metadata: Record<string, unknown>;
};

// Buffer em memória, flush a cada 50 eventos ou 60 segundos
private buffer: UsageEvent[] = [];
private flushInterval: NodeJS.Timeout;

// Agregados em memória (para dashboard rápido)
private aggregated: Map<string, {
  selects: number;
  generates: number;
  completes: number;
  avgSlideCount: number;
}> = new Map();
```

### 10.3 Endpoint de métricas

**Futuro (não nesta subfase):** `GET /ai-generate/templates/metrics`

Retorna: uso por template, taxa de seleção, taxa de conclusão, slides médios.

### 10.4 Métricas visíveis no frontend

- Badge "Mais usado" nos 3 templates mais selecionados
- Tooltip "Usado X vezes este mês" (quando disponível)

---

## 11. Ordem de Implementação Passo a Passo

### Passo 1: Criar o modelo de dados e registry (backend)
**Dependências:** Nenhuma  
**Arquivos:**
- `libraries/nestjs-libraries/src/ai-generate/templates/template-definitions.ts`
- `libraries/nestjs-libraries/src/ai-generate/templates/template-registry.ts`
- `libraries/nestjs-libraries/src/ai-generate/templates/template-recommender.spec.ts` (schema test)

**Critérios:**
- [ ] 16 templates definidos com todos os campos do schema
- [ ] TemplateRegistry funciona: get, getAll, getActive, getByCategory
- [ ] Schema validation funciona para todos os 16 templates
- [ ] Schema version é '2.0.0'

### Passo 2: Criar o recomendador (backend)
**Dependências:** Passo 1  
**Arquivos:**
- `libraries/nestjs-libraries/src/ai-generate/templates/template-recommender.service.ts`
- `libraries/nestjs-libraries/src/ai-generate/templates/template-recommender.spec.ts`
- `libraries/nestjs-libraries/src/ai-generate/schemas/template-recommendation.schema.ts` (expandir)
- `libraries/nestjs-libraries/src/dtos/ai-generate/ai-generate-template-recommend.dto.ts`

**Critérios:**
- [ ] Recomendação retorna top 5 com confidence 0-1
- [ ] Goal match funciona: "vender" → offer, before-after, testimonial, etc.
- [ ] Niche match funciona: "educação" → educational, faq, list
- [ ] Platform fit funciona: linkedin → authority, case, comparison
- [ ] Testes passam para >= 5 cenários diferentes

### Passo 3: Criar endpoints backend
**Dependências:** Passo 1, 2  
**Arquivos:**
- `apps/backend/src/api/routes/ai-generate.controller.ts` (modificar)
- `apps/backend/src/api/api.module.ts` (modificar)

**Critérios:**
- [ ] `GET /ai-generate/templates` retorna array de templates
- [ ] `POST /ai-generate/templates/recommend` retorna recomendações
- [ ] `POST /ai-generate/templates/track` registra evento
- [ ] Todos os endpoints autenticados

### Passo 4: Modificar DTO e service de geração
**Dependências:** Passo 1  
**Arquivos:**
- `libraries/nestjs-libraries/src/dtos/ai-generate/ai-generate-carousel.dto.ts` (modificar)
- `libraries/nestjs-libraries/src/ai-generate/ai-generate.service.ts` (modificar)
- `libraries/nestjs-libraries/src/ai-generate/templates/template-usage-tracker.ts` (criar)
- `libraries/nestjs-libraries/src/ai-generate/templates/template-usage-tracker.spec.ts` (criar)

**Critérios:**
- [ ] DTO aceita `templateId` opcional
- [ ] `generateCarouselPlan` usa `templateId` para enriquecer prompt
- [ ] Uso é registrado no tracker a cada geração
- [ ] Tracker faz flush em background
- [ ] Compatibilidade retro: sem templateId, funciona como antes

### Passo 5: Atualizar Direction Compiler
**Dependências:** Passo 1  
**Arquivos:**
- `apps/frontend/src/components/ai-generate/direction-compiler.ts` (modificar)
- `apps/frontend/src/components/ai-generate/direction-compiler.spec.ts` (modificar)

**Critérios:**
- [ ] `buildDirectionSpec` usa `defaultDirection` do template quando disponível
- [ ] Fallback para lógica antiga funciona
- [ ] Todos os testes existentes continuam passando
- [ ] Novos testes para templates 9-16 passam

### Passo 6: Criar cache e fetcher frontend
**Dependências:** Passo 3  
**Arquivos:**
- `apps/frontend/src/components/ai-generate/template-registry.ts` (criar)
- `apps/frontend/src/components/ai-generate/template-registry.types.ts` (criar)
- `apps/frontend/src/components/ai-generate/ai-generate-images.api.ts` (modificar)

**Critérios:**
- [ ] `fetchTemplates` busca com cache de 5min
- [ ] `fetchRecommendations` funciona
- [ ] `trackTemplateUsage` funciona
- [ ] Fallback para import estático funciona

### Passo 7: Atualizar hook principal
**Dependências:** Passo 5, 6  
**Arquivos:**
- `apps/frontend/src/components/ai-generate/use-ai-generate-images-studio.ts` (modificar)

**Critérios:**
- [ ] Templates são carregados do backend on mount
- [ ] `applyTemplate` busca do registry, não do constants
- [ ] Recomendações são carregadas quando contexto muda
- [ ] Tracking é chamado em select/generate
- [ ] Estado de loading de templates funciona
- [ ] Todas as props do hook existentes continuam funcionando

### Passo 8: Atualizar UI (Planning Form)
**Dependências:** Passo 6, 7  
**Arquivos:**
- `apps/frontend/src/components/ai-generate/ai-generate-images-planning-form.tsx` (modificar)
- `apps/frontend/src/components/ai-generate/template-recommendation-panel.tsx` (criar)
- `apps/frontend/src/components/ai-generate/template-editorial-checks.ts` (criar)

**Critérios:**
- [ ] Grid mostra 16+ templates agrupados por categoria
- [ ] Painel de recomendações aparece antes do grid
- [ ] Badge "Recomendado" nos templates sugeridos
- [ ] Tooltip com descrição ao hover
- [ ] Seletor de nicho funciona
- [ ] Checks editoriais visíveis na seção de revisão
- [ ] Layout responsivo funciona

### Passo 9: Testes de validação final
**Dependências:** Todos anteriores  
**Arquivos:** Todos os `.spec.ts`

**Critérios:**
- [ ] Testes de recomendação para >= 5 nichos diferentes passam
- [ ] Testes de schema dos 16 templates passam
- [ ] Teste criando carrossel com >= 5 templates diferentes funciona
- [ ] Todos os testes existentes continuam passando
- [ ] Build sem erros (`pnpm build`)

---

## 12. Checklist com Critérios de Conclusão

### 12.1 Template Engine

- [ ] 16 templates definidos com schema expandido
- [ ] Cada template tem: estrutura narrativa, regras de slide, densidade de texto, direção visual, CTA recomendado, checks editoriais
- [ ] Templates são dados versionados (version = '2.0.0')
- [ ] TemplateRegistry funciona no backend
- [ ] Adicionar novo template requer apenas adicionar objeto ao array `template-definitions.ts`

### 12.2 Recomendador

- [ ] Endpoint `POST /templates/recommend` funciona
- [ ] Recomendação considera: Brand DNA, nicho, objetivo, plataforma
- [ ] Retorna top 5 com confidence 0-1
- [ ] Pelo menos 5 cenários de teste passam

### 12.3 Backend

- [ ] `GET /templates` retorna templates ativos
- [ ] `POST /templates/track` registra eventos
- [ ] `generateCarouselPlan` aceita e usa templateId
- [ ] Prompt é enriquecido com dados do template
- [ ] Tracking de uso funciona

### 12.4 Frontend

- [ ] Templates são carregados do backend
- [ ] Grid mostra templates agrupados por categoria
- [ ] Painel de recomendações funciona
- [ ] Seletor de nicho adicionado
- [ ] Checks editoriais visíveis
- [ ] Tracking de uso chamado

### 12.5 Direction Compiler

- [ ] Usa defaultDirection do template quando disponível
- [ ] Fallback funciona para templates antigos
- [ ] Novos templates (9-16) têm direção correta

### 12.6 Qualidade

- [ ] Todos os testes existentes passam
- [ ] Build sem erros
- [ ] Compatibilidade retro garantida

---

## 13. Riscos e Decisões Pendentes

### 13.1 Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| **Template loading delay** — frontend pode ficar sem templates se backend demorar | Alto | Fallback para import estático do constants; cache 5min |
| **Breaking change no hook** — `use-ai-generate-images-studio.ts` tem 2655 linhas | Alto | Mudanças mínimas e incrementais; manter interface existente |
| **Direction compiler regressão** — mudar lógica de if/else pode quebrar templates existentes | Alto | Manter fallback; testes existentes como guard rail |
| **16 templates podem overwhelmar o usuário** | Médio | agrupar por categoria; recomendações top-3; lazy load |
| **Performance do recomendador** — scoring determinístico pode ser impreciso | Médio | Scoring ponderado simples; sem IA neste momento; ajustar pesos depois |
| **Cache stale** — frontend com templates desatualizados | Baixo | Schema version check no fetch; TTL 5min |

### 13.2 Decisões Pendentes

1. **Storage de templates**: Atualmente em arquivo TS versionado. Futuro: considerar banco de dados para templates customizáveis por tenant?
   - **Recomendação:** Manter em arquivo TS por enquanto (suficiente para 16-30 templates)
   
2. **Recomendador**: Scoring determinístico vs. IA?
   - **Recomendação:** Scoring determinístico para v1 (rápido, sem custo de API, determinístico). IA apenas se scoring simples não for suficiente.

3. **Tracking storage**: In-memory com flush vs. Prisma?
   - **Recomendação:** In-memory para v1. Migrar para Prisma quando houver necessidade de dashboard de métricas.

4. **Nichos fixos vs. dinâmicos**: Lista fixa de nichos ou derivados do CompanyProfile?
   - **Recomendação:** Lista fixa no v1 (10 opções). Combinar com `industry` do CompanyProfile no futuro.

5. **Template customizável por tenant**: Cada empresa pode criar templates próprios?
   - **Recomendação:** Não nesta subfase. Planejar interface no futuro.

---

## Apêndice A: Template Definitions Completas (16 templates)

> Cada template deve ser escrito com o mesmo nível de detalhe do exemplo `faq` na Seção 5.1. 
> Abaixo estão os campos-chave para cada um dos 8 novos:

### 10. `comparison` (Comparação)
- **narrative.name:** "Comparação Visual Lado a Lado"
- **narrative.slideSequence:** cover → 2-3 comparison slides → proof → cta
- **goal:** gerar autoridade
- **preferredNiches:** tecnologia, software, servicos, consultoria
- **textDensity:** light
- **recommendedCta:** "Veja qual opção faz mais sentido para você"

### 11. `testimonial` (Depoimento/prova)
- **narrative.name:** "Prova Social Progressiva"
- **narrative.slideSequence:** cover → context → 2-3 testimonial slides → result → cta
- **goal:** vender oferta
- **preferredNiches:** saude, fitness, educacao, consultoria, e-commerce
- **textDensity:** light
- **recommendedCta:** "Quer resultados assim? Link na bio"

### 12. `statistics` (Estatísticas)
- **narrative.name:** "Dados que Convertem"
- **narrative.slideSequence:** cover → 3-4 stat slides → insight → cta
- **goal:** gerar autoridade
- **preferredNiches:** financas, tecnologia, saude, marketing
- **textDensity:** minimal (números grandes, texto curto)
- **recommendedCta:** "Fonte e mais dados no link da bio"

### 13. `problem-solution` (Problema-solução)
- **narrative.name:** "Dor → Alívio → Transformação"
- **narrative.slideSequence:** hook(dor) → amplificação → mecanismo → prova → cta
- **goal:** vender oferta
- **preferredNiches:** todos
- **textDensity:** medium
- **recommendedCta:** "Descubra a solução — link na bio"

### 14. `us-vs-them` (Us vs Them)
- **narrative.name:** "O Convencional vs. O que Funciona"
- **narrative.slideSequence:** cover → 2-3 contrast slides → bridge → cta
- **goal:** gerar autoridade
- **preferredNiches:** tecnologia, marketing, consultoria, educacao
- **textDensity:** medium
- **recommendedCta:** "Escolha o caminho que funciona"

### 15. `best-sellers` (Best-sellers)
- **narrative.name:** "Os Mais Vendidos Explicados"
- **narrative.slideSequence:** cover → 2-3 product slides → social proof → cta
- **goal:** vender oferta
- **preferredNiches:** e-commerce, moda, restaurantes, fitness
- **textDensity:** light
- **recommendedCta:** "Confira na bio — frete grátis"

### 16. `negative-hook` (Negative hook)
- **narrative.name:** "O que NÃO Fazer"
- **narrative.slideSequence:** negative_hook → 3-4 mistake slides →正确的 way → cta
- **goal:** capturar leads
- **preferredNiches:** todos
- **textDensity:** medium
- **recommendedCta:** "Pare de cometer esses erros — guia gratuito na bio"

---

## Apêndice B: Mapeamento Goal Family

Para o scoring do recomendador, agrupar goals em famílias:

| Family | Goals incluídos |
|---|---|
| `educate` | "educar e gerar engajamento", "gerar autoridade" |
| `convert` | "vender uma oferta", "capturar leads" |
| `warm` | "aquecer audiência" (storytelling implícito) |

Templates com goal na mesma família recebem score parcial (0.15 em vez de 0.30).

---

*Fim do plano. Este documento serve como guia para o Builder implementar cada arquivo, passo a passo, com critérios claros de conclusão e testes.*
