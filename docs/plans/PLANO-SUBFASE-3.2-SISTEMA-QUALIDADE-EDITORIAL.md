# Plano de Implementação — Subfase 3.2: Sistema de Qualidade Editorial

> **Fase:** 3 — Qualidade Superior de Carrossel  
> **Subfase:** 3.2 — Sistema de Qualidade Editorial  
> **Status:** Rascunho para aprovação  
> **Autor:** Hermes Agent (análise automatizada do codebase)

---

## Índice

1. [Resumo Executivo](#1-resumo-executivo)
2. [Estado Atual do Sistema](#2-estado-atual-do-sistema)
3. [Gaps Identificados](#3-gaps-identificados)
4. [Arquitetura da Solução](#4-arquitetura-da-solução)
5. [Alterações Backend](#5-alterações-backend)
6. [Alterações Frontend](#6-alterações-frontend)
7. [Persistência da Revisão](#7-persistência-da-revisão)
8. [Bloqueio por Score](#8-bloqueio-por-score)
9. [Integração com Auto-Fix](#9-integração-com-auto-fix)
10. [Ordem de Implementação Passo a Passo](#10-ordem-de-implementação-passo-a-passo)
11. [Checklist com Critérios de Conclusão](#11-checklist-com-critérios-de-conclusão)
12. [Riscos e Decisões Pendentes](#12-riscos-e-decisões-pendentes)

---

## 1. Resumo Executivo

A Subfase 3.2 transforma o sistema editorial de revisão de carrosseis em um **pipeline de qualidade completo** que:

- **Aplica regras editoriais do template** durante a revisão (atualmente exibidas mas não aplicadas)
- **Enforça termos proibidos** da Brand DNA (campo existe mas não é verificado no conteúdo)
- **Bloqueia geração de imagens** quando o score cai abaixo de um limiar configurável
- **Persiste o resultado da revisão** como artefato JSON no carousel project
- **Melhora a UI de problemas** com agrupamento por slide e severidade, e indicador visual de score
- **Integra auto-fix com revisão humana** (já parcialmente existe — expandir com diff visual)

### Critérios de conclusão (do plano de fase):
- ✅ Regras editoriais do template são aplicadas durante a revisão
- ✅ Termos proibidos da Brand DNA são verificados e geram issues
- ✅ Geração de imagens pode ser bloqueada abaixo de um score mínimo
- ✅ Resultado da revisão é persistido e recuperável
- ✅ UI mostra problemas agrupados por slide com severidade e cor
- ✅ Auto-fix gera diff visual para aprovação humana antes de aplicar

---

## 2. Estado Atual do Sistema

### 2.1 Backend — Revisão Editorial

**Arquivo:** `libraries/nestjs-libraries/src/ai-generate/ai-generate.service.ts`

```typescript
// reviewCarousel() — Linha 1078
async reviewCarousel(orgId: string, body: AiGenerateCarouselDto) {
  // ...
  // Prompt genérico — NÃO inclui checks do template nem forbiddenTerms
  messages: [{
    role: 'system',
    content: 'Você é editor sênior... Avalie legibilidade, clareza, promessa exagerada...',
  }, {
    role: 'user',
    content: `Revise este carrossel...\nPayload:${payload}...`,
  }]
}
```

**Problema:** O prompt de revisão é genérico. Não recebe:
- `editorialChecks` do template selecionado
- `forbiddenTerms` da Brand DNA
- `templateId` para contextualizar a revisão

### 2.2 Schema — Mismatch de Formato

**Arquivo:** `libraries/nestjs-libraries/src/ai-generate/schemas/editorial-review.schema.ts`

```typescript
// Schema Zod espera:
{ type: 'warning'|'blocker', slideIndex: number, field: string, message: string, suggestion?: string }

// Mas o prompt do backend pede:
{ slide: number, severity: 'low'|'medium'|'high', issue: string, suggestion: string }
```

O schema tem `verdict` e `canBeFixed`, mas o prompt retorna `strengths` — e o schema não inclui `strengths`.

### 2.3 Frontend — Checks Locais

**Arquivo:** `apps/frontend/src/components/ai-generate/ai-generate-images.utils.ts`

```typescript
// getEditorialIssues() — Linha 159
export function getEditorialIssues(slides: CarouselSlide[]): EditorialIssue[] {
  return slides.flatMap((slide) => {
    // Apenas 4 verificações hardcoded:
    // 1. headline > 78 chars
    // 2. body > 150 chars
    // 3. imagePrompt vazio
    // 4. claims absolutas (garantido, milagre, 100%, sem esforço, resultado certo)
  });
}
```

**Problema:** Não verifica termos proibidos do Brand DNA. Não usa checks do template.

### 2.4 Frontend — Estado de Revisão

**Arquivo:** `apps/frontend/src/components/ai-generate/use-ai-generate-images-studio.ts`

```typescript
const [editorialReview, setEditorialReview] = useState<EditorialReview | null>(null);
const [autoReviewBeforeImages, setAutoReviewBeforeImages] = useState(true);
const [allowGenerateWithReviewIssues, setAllowGenerateWithReviewIssues] = useState(false);
```

**Problemas:**
- `autoReviewBeforeImages` existe mas NÃO é verificado em `generateCarouselImages()` — a geração sempre prossegue
- `allowGenerateWithReviewIssues` existe mas não é consumido em nenhum gate real
- `editorialReview` é resetado para `null` após fix, sem persistir

### 2.5 Template Editorial Checks — Exibição sem Enforcement

**Arquivo:** `apps/frontend/src/components/ai-generate/template-editorial-checks.tsx`

- Componente renderiza os `editorialChecks` do template como lista visual
- **Não** executa nenhuma verificação contra o conteúdo do plano
- **Não** gera issues quando as regras são violadas

### 2.6 Forbidden Terms — Campo sem Enforcement

**Arquivo:** `apps/frontend/src/components/ai-generate/ai-generate-images-planning-form.tsx`

- Campo de input "Termos proibidos" (linha 733-741) existe no Brand Kit
- Valor é salvo no Company Profile (backend: `forbiddenTerms: string`)
- **Não** é verificado durante geração, revisão ou exportação

---

## 3. Gaps Identificados

| # | Gap | Severidade | Impacto |
|---|-----|-----------|---------|
| G1 | Prompt de revisão não inclui `editorialChecks` do template | Alta | Regras de nicho ignoradas na revisão AI |
| G2 | `forbiddenTerms` não é verificado em nenhum momento | Alta | Marcas usam palavras proibidas sem aviso |
| G3 | Schema Zod tem formato diferente do que o prompt retorna | Média | Validação sempre cai no fallback `parseJsonPayload` |
| G4 | `autoReviewBeforeImages` não bloqueia geração real | Alta | Usuário gera imagens com problemas conhecidos |
| G5 | Review não é persistido como artefato | Média | Revisão é perdida ao navegar entre etapas |
| G6 | UI de issues é lista plana sem agrupamento | Baixa | Difícil identificar quais slides têm problemas |
| G7 | `applyEditorialQuickFixes()` é muito simplista | Média | Só trunca texto, não aplica correções reais |
| G8 | `TemplateEditorialChecks` só exibe, não valida | Média | Checks são informativos mas não阻止 |

---

## 4. Arquitetura da Solução

### 4.1 Visão Geral do Pipeline

```
Plano Gerado → [Local Validation] → [AI Review com Template Checks] → [Score Gate] → Geração de Imagens
                      ↓                        ↓                            ↓
              editorialIssues[]         editorialReview               Block/Allow
              + forbiddenTerms          (persistido)                 (configurável)
              + templateChecks
```

### 4.2 Fluxo Detalhado

1. **Pré-revisão local** (frontend, síncrono):
   - `getEditorialIssues()` é expandida para incluir forbiddenTerms
   - `getEditorialIssues()` é expandida para incluir checks do template selecionado
   - Issues locais são acumuladas em `editorialIssues[]`

2. **Revisão AI** (backend, assíncrona):
   - `reviewCarousel()` recebe agora: `editorialChecks`, `forbiddenTerms`, `templateId`
   - Prompt é enriquecido com as regras específicas do template
   - Response padronizada contra schema corrigido
   - Resultado inclui `templateIssues` (do template) e `brandIssues` (forbiddenTerms)

3. **Gate de Score** (frontend):
   - Se `autoReviewBeforeImages === true` E `editorialReview.score < scoreThreshold`:
     - Mostra modal de bloqueio com score e issues
     - Oferece: "Corrigir com IA", "Aumentar threshold", "Gerar assim mesmo"
   - Se `allowGenerateWithReviewIssues === true`: bypass com warning

4. **Persistência** (backend):
   - Review é salvo como metadado no carousel project
   - Recuperado ao reabrir o projeto

---

## 5. Alterações Backend

### 5.1 Corrigir Schema `editorial-review.schema.ts`

**Arquivo:** `libraries/nestjs-libraries/src/ai-generate/schemas/editorial-review.schema.ts`

**Mudanças:**
- Padronizar o schema para aceitar o formato que o prompt realmente retorna
- Adicionar campo `strengths` ao schema
- Adicionar campo `templateIssues` para issues vindas do template
- Adicionar campo `brandIssues` para forbidden terms violations
- Adicionar campo `templateCheckResults` com resultado de cada check

```typescript
// Schema atualizado
const IssueSchema = z.object({
  type: z.enum(['warning', 'blocker']),
  slideIndex: z.number().int().min(0).optional(),
  slide: z.number().int().min(0).optional(),  // alias para compatibilidade
  field: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high']).optional(),  // formato legado
  issue: z.string().optional(),  // alias para message
  message: z.string(),
  suggestion: z.string().optional(),
});

const TemplateCheckResult = z.object({
  checkId: z.string(),
  passed: z.boolean(),
  message: z.string().optional(),
  matchedSlide: z.number().int().min(0).optional(),
});

export const EditorialReviewSchema = z.object({
  verdict: z.string(),
  score: z.number().min(0).max(100),
  issues: z.array(IssueSchema).default([]),
  strengths: z.array(z.string()).default([]),
  summary: z.string().optional(),
  canBeFixed: z.boolean().default(true),
  templateCheckResults: z.array(TemplateCheckResult).default([]),
  forbiddenTermMatches: z.array(z.object({
    term: z.string(),
    slideIndex: z.number().int().min(0),
    field: z.string(),
  })).default([]),
});
```

### 5.2 Enriquecer Prompt de Revisão

**Arquivo:** `libraries/nestjs-libraries/src/ai-generate/ai-generate.service.ts`

**Mudanças em `reviewCarousel()`:**

```typescript
async reviewCarousel(orgId: string, body: AiGenerateCarouselDto) {
  // ... setup existente ...

  // Extrair dados extras do payload
  const parsedPayload = JSON.parse(payload);
  const editorialChecks = parsedPayload.editorialChecks || [];
  const forbiddenTerms = parsedPayload.forbiddenTerms || '';
  const templateId = parsedPayload.templateId || '';

  // Construir seção de checks do template
  const templateChecksSection = editorialChecks.length > 0
    ? `\n\nREGRAS EDITORIAIS DO TEMPLATE "${templateId}":\n` +
      editorialChecks.map((check: any) =>
        `- [${check.severity}] ${check.description}: ${check.message}${
          check.pattern ? ` (padrão regex: ${check.pattern})` : ''
        }`
      ).join('\n')
    : '';

  // Construir seção de termos proibidos
  const forbiddenSection = forbiddenTerms
    ? `\n\nTERMOS PROIBIDOS PELA MARCA (devem ser denunciados se encontrados):\n${forbiddenTerms}`
    : '';

  const response = await fetch(`${openAiBaseUrl}/v1/chat/completions`, {
    // ... headers existentes ...
    body: JSON.stringify({
      model: resolvedModel,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      user: orgId,
      messages: [
        {
          role: 'system',
          content: 'Você é editor sênior de carrosseis e diretor de arte. Avalie legibilidade, clareza, promessa exagerada, consistência com marca, função de cada slide e qualidade visual. Verifique também as regras editoriais do template e termos proibidos da marca. Responda somente JSON válido.',
        },
        {
          role: 'user',
          content: `Revise este carrossel antes da geração final de imagens.
${templateChecksSection}
${forbiddenSection}

Payload:
${payload.slice(0, 14000)}

Retorne exatamente:
{
  "score": 0-100,
  "verdict": "resumo curto do nível editorial",
  "issues": [
    {
      "slideIndex": 1,
      "field": "headline|body|cta|imagePrompt",
      "message": "problema",
      "suggestion": "correção objetiva",
      "type": "warning|blocker"
    }
  ],
  "strengths": ["ponto forte"],
  "templateCheckResults": [
    {
      "checkId": "id-do-check",
      "passed": true|false,
      "message": "detalhe"
    }
  ],
  "forbiddenTermMatches": [
    {
      "term": "termo proibido encontrado",
      "slideIndex": 1,
      "field": "headline|body"
    }
  ]
}

Se estiver bom, issues pode ser vazio. Use pt-BR.`,
        },
      ],
    }),
  });
  // ... restante existente ...
}
```

### 5.3 Validar Forbidden Terms no Backend (fallback)

**Arquivo:** `libraries/nestjs-libraries/src/ai-generate/ai-generate.service.ts`

Adicionar validação local de forbidden terms como fallback (caso o LLM não detecte):

```typescript
// Após receber a resposta do LLM, validar forbidden terms localmente
function checkForbiddenTerms(
  plan: any,
  forbiddenTerms: string
): Array<{ term: string; slideIndex: number; field: string }> {
  if (!forbiddenTerms) return [];

  const terms = forbiddenTerms
    .split(',')
    .map((t: string) => t.trim().toLowerCase())
    .filter(Boolean);

  const matches: Array<{ term: string; slideIndex: number; field: string }> = [];

  for (const slide of plan.slides || []) {
    const fields = {
      headline: slide.headline || '',
      body: slide.body || '',
      cta: slide.cta || '',
    };

    for (const [field, value] of Object.entries(fields)) {
      const lowerValue = (value as string).toLowerCase();
      for (const term of terms) {
        if (lowerValue.includes(term)) {
          matches.push({ term, slideIndex: slide.index, field });
        }
      }
    }
  }

  return matches;
}

// Adicionar ao resultado do review
const localForbiddenMatches = checkForbiddenTerms(parsedPayload.plan || {}, forbiddenTerms);
// Merge com matches detectados pelo LLM
result.forbiddenTermMatches = [
  ...new Map([
    ...(parsed.forbiddenTermMatches || []),
    ...localForbiddenMatches,
  ].map(m => [`${m.term}-${m.slideIndex}-${m.field}`, m])).values(),
];
```

### 5.4 Validar Template Checks no Backend (fallback)

Adicionar execução local dos regex patterns dos template checks:

```typescript
function runTemplateChecks(
  plan: any,
  editorialChecks: Array<{ id: string; pattern?: string; severity: string; message: string }>
): Array<{ checkId: string; passed: boolean; message?: string; matchedSlide?: number }> {
  return editorialChecks.map(check => {
    if (!check.pattern) {
      // Checks sem pattern são avaliados pelo LLM
      return { checkId: check.id, passed: true, message: 'Requer análise qualitativa' };
    }

    try {
      const regex = new RegExp(check.pattern, 'i');
      for (const slide of plan.slides || []) {
        const text = `${slide.headline || ''} ${slide.body || ''}`;
        if (regex.test(text)) {
          return {
            checkId: check.id,
            passed: false,
            message: check.message,
            matchedSlide: slide.index,
          };
        }
      }
      return { checkId: check.id, passed: true };
    } catch {
      return { checkId: check.id, passed: true, message: 'Regex inválido' };
    }
  });
}
```

### 5.5 Adicionar Campo `templateId` ao DTO

**Arquivo:** `libraries/nestjs-libraries/src/dtos/ai-generate/ai-generate-carousel.dto.ts`

```typescript
// Adicionar ao DTO existente
@IsString()
@IsOptional()
@MaxLength(60)
templateId?: string;
```

---

## 6. Alterações Frontend

### 6.1 Expandir `getEditorialIssues()` com Forbidden Terms

**Arquivo:** `apps/frontend/src/components/ai-generate/ai-generate-images.utils.ts`

```typescript
// Novo tipo
export type EditorialIssue = {
  slide: number;
  label: string;
  tone: 'danger' | 'warning' | 'info';
  source: 'local' | 'template' | 'forbidden';
  checkId?: string;
};

// Função expandida
export function getEditorialIssues(
  slides: CarouselSlide[],
  options: {
    forbiddenTerms?: string;
    templateChecks?: Array<{ id: string; pattern?: string; message: string; severity: string }>;
  } = {}
): EditorialIssue[] {
  const issues: EditorialIssue[] = [];

  for (const slide of slides) {
    // --- Checks existentes (mantidos) ---
    if (slide.headline.trim().length > 78) {
      issues.push({
        slide: slide.index,
        label: 'Headline longa demais para leitura rápida no celular.',
        tone: 'danger',
        source: 'local',
      });
    }

    if (slide.body.trim().length > 150) {
      issues.push({
        slide: slide.index,
        label: 'Texto de apoio pode ficar pequeno dentro da imagem.',
        tone: 'warning',
        source: 'local',
      });
    }

    if (!slide.imagePrompt.trim()) {
      issues.push({
        slide: slide.index,
        label: 'Direção visual vazia.',
        tone: 'danger',
        source: 'local',
      });
    }

    if (/(garantido|milagre|100%|sem esforço|resultado certo)/i.test(
      `${slide.headline} ${slide.body}`
    )) {
      issues.push({
        slide: slide.index,
        label: 'Promessa forte demais; vale revisar para soar mais confiável.',
        tone: 'warning',
        source: 'local',
      });
    }

    // --- NOVO: Forbidden Terms ---
    if (options.forbiddenTerms) {
      const terms = options.forbiddenTerms
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);

      const combinedText = `${slide.headline} ${slide.body} ${slide.cta}`.toLowerCase();

      for (const term of terms) {
        if (combinedText.includes(term)) {
          issues.push({
            slide: slide.index,
            label: `Termo proibido "${term}" encontrado no conteúdo.`,
            tone: 'danger',
            source: 'forbidden',
          });
        }
      }
    }

    // --- NOVO: Template Checks (apenas regex) ---
    if (options.templateChecks) {
      for (const check of options.templateChecks) {
        if (!check.pattern) continue;

        try {
          const regex = new RegExp(check.pattern, 'i');
          const combinedText = `${slide.headline} ${slide.body} ${slide.cta}`;

          if (regex.test(combinedText)) {
            issues.push({
              slide: slide.index,
              label: check.message,
              tone: check.severity === 'error' ? 'danger' : 'warning',
              source: 'template',
              checkId: check.id,
            });
          }
        } catch {
          // Regex inválido — ignorar
        }
      }
    }
  }

  return issues;
}
```

### 6.2 Integrar Forbidden Terms e Template Checks no Hook

**Arquivo:** `apps/frontend/src/components/ai-generate/use-ai-generate-images-studio.ts`

**Mudança na chamada de `getEditorialIssues()`:**

```typescript
// Antes (linha 333):
const editorialIssues = plan ? getEditorialIssues(plan.slides) : [];

// Depois:
const editorialIssues = plan
  ? getEditorialIssues(plan.slides, {
      forbiddenTerms,
      templateChecks: selectedBackendTemplate?.editorialChecks,
    })
  : [];
```

**Adicionar acesso ao template selecionado:**

```typescript
// Adicionar selector para o template ativo
const selectedBackendTemplate = useMemo(() => {
  return backendTemplates.find(t => t.id === selectedTemplate) || null;
}, [backendTemplates, selectedTemplate]);
```

### 6.3 Enriquecer Payload da Revisão com Dados do Template

**Arquivo:** `apps/frontend/src/components/ai-generate/use-ai-generate-images-studio.ts`

**Mudança em `reviewCarouselQuality()`:**

```typescript
const reviewCarouselQuality = async (silent = false) => {
  if (!plan) return null;

  setReviewingEditorial(true);
  if (!silent) setError('');

  try {
    const { ok, data, message } = await aiGenerateImagesApi.reviewCarousel(
      fetch,
      {
        topic: trimmedTopic || plan.title,
        textModel: trimmedTextModel,
        reviewPayload: JSON.stringify({
          companyContext,
          creativeBrief: finalCreativeBrief || computedCreativeBrief,
          plan,
          editorialIssues,
          // NOVOS CAMPOS:
          editorialChecks: selectedBackendTemplate?.editorialChecks || [],
          forbiddenTerms,
          templateId: selectedTemplate,
        }),
      }
    );
    // ... restante existente ...
  }
};
```

### 6.4 Novo Componente: `EditorialIssueBadge` (por slide)

**Novo arquivo:** `apps/frontend/src/components/ai-generate/editorial-issue-badge.tsx`

```tsx
'use client';

import { AlertTriangle, AlertCircle, Ban, Shield } from 'lucide-react';

type IssueSource = 'local' | 'template' | 'forbidden' | 'ai';

type EditorialIssueBadgeProps = {
  issues: Array<{
    label: string;
    tone: 'danger' | 'warning' | 'info';
    source: IssueSource;
  }>;
  className?: string;
};

const sourceConfig: Record<IssueSource, { icon: typeof AlertCircle; colorClass: string; label: string }> = {
  local: { icon: AlertTriangle, colorClass: 'text-amber-500', label: 'Regra local' },
  template: { icon: Shield, colorClass: 'text-blue-500', label: 'Template' },
  forbidden: { icon: Ban, colorClass: 'text-red-500', label: 'Proibido' },
  ai: { icon: AlertCircle, colorClass: 'text-purple-500', label: 'IA' },
};

export function EditorialIssueBadge({ issues, className = '' }: EditorialIssueBadgeProps) {
  if (!issues.length) return null;

  const dangerCount = issues.filter(i => i.tone === 'danger').length;
  const warningCount = issues.filter(i => i.tone === 'warning').length;

  return (
    <div className={`flex items-center gap-[6px] ${className}`}>
      {dangerCount > 0 && (
        <span className="flex items-center gap-[3px] rounded-full bg-red-500/10 px-[6px] py-[2px] text-[10px] font-[700] text-red-500">
          <AlertCircle className="h-[10px] w-[10px]" />
          {dangerCount} erro{dangerCount > 1 ? 's' : ''}
        </span>
      )}
      {warningCount > 0 && (
        <span className="flex items-center gap-[3px] rounded-full bg-amber-500/10 px-[6px] py-[2px] text-[10px] font-[700] text-amber-500">
          <AlertTriangle className="h-[10px] w-[10px]" />
          {warningCount} aviso{warningCount > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
```

### 6.5 Novo Componente: `EditorialReviewPanel` (replaces inline review display)

**Novo arquivo:** `apps/frontend/src/components/ai-generate/editorial-review-panel.tsx`

```tsx
'use client';

import { useState } from 'react';
import {
  AlertTriangle, AlertCircle, Ban, CheckCircle, ChevronDown, ChevronUp,
  Shield, Sparkles, X
} from 'lucide-react';
import type { EditorialReview } from './ai-generate-images.types';

type EditorialReviewPanelProps = {
  review: EditorialReview;
  onFix?: () => void;
  onQuickFix?: () => void;
  correcting?: boolean;
  className?: string;
};

// Agrupar issues por slide
function groupBySlide(issues: EditorialReview['issues']) {
  const grouped = new Map<number, typeof issues>();
  const global: typeof issues = [];

  for (const issue of issues) {
    const slideIndex = issue.slide ?? issue.slideIndex ?? -1;
    if (slideIndex < 0) {
      global.push(issue);
    } else {
      const arr = grouped.get(slideIndex) || [];
      arr.push(issue);
      grouped.set(slideIndex, arr);
    }
  }

  return { grouped, global };
}

// Cor do score
function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-amber-500';
  return 'text-red-500';
}

function scoreBg(score: number) {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

export function EditorialReviewPanel({
  review, onFix, onQuickFix, correcting, className = '',
}: EditorialReviewPanelProps) {
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null);
  const { grouped, global } = groupBySlide(review.issues);

  return (
    <div className={`rounded-[14px] border border-black/10 bg-stone-50 dark:border-white/10 dark:bg-black/20 ${className}`}>
      {/* Header com Score */}
      <div className="flex items-center gap-[12px] p-[14px]">
        <div className="relative h-[48px] w-[48px]">
          <svg className="h-[48px] w-[48px] -rotate-90">
            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor"
              className="text-black/10 dark:text-white/10" strokeWidth="4" />
            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor"
              className={scoreColor(review.score)} strokeWidth="4"
              strokeDasharray={`${(review.score / 100) * 126} 126`} />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-[14px] font-[900] ${scoreColor(review.score)}`}>
            {review.score}
          </span>
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-[800] text-black dark:text-white">
            {review.verdict}
          </div>
          {review.summary && (
            <div className="text-[11px] text-black/50 dark:text-white/50 mt-[2px]">
              {review.summary}
            </div>
          )}
        </div>
      </div>

      {/* Strengths */}
      {review.strengths?.length > 0 && (
        <div className="px-[14px] pb-[8px]">
          <div className="flex flex-wrap gap-[4px]">
            {review.strengths.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-[4px] rounded-full bg-emerald-500/10 px-[8px] py-[2px] text-[10px] font-[600] text-emerald-700 dark:text-emerald-200">
                <CheckCircle className="h-[10px] w-[10px]" />
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Issues agrupados por slide */}
      {review.issues.length > 0 && (
        <div className="border-t border-black/5 dark:border-white/5 px-[14px] pb-[14px] pt-[10px]">
          <div className="text-[11px] font-[700] text-black/40 dark:text-white/40 mb-[8px] uppercase tracking-wider">
            {review.issues.length} problema{review.issues.length > 1 ? 's' : ''} encontrado{review.issues.length > 1 ? 's' : ''}
          </div>

          {/* Issues globais */}
          {global.length > 0 && (
            <div className="space-y-[4px] mb-[8px]">
              {global.map((issue, idx) => (
                <IssueRow key={`global-${idx}`} issue={issue} />
              ))}
            </div>
          )}

          {/* Issues por slide */}
          {Array.from(grouped.entries()).sort(([a], [b]) => a - b).map(([slideIdx, issues]) => (
            <div key={slideIdx} className="mb-[4px]">
              <button
                type="button"
                onClick={() => setExpandedSlide(expandedSlide === slideIdx ? null : slideIdx)}
                className="flex w-full items-center gap-[8px] rounded-[8px] px-[10px] py-[6px] text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
              >
                <span className="text-[12px] font-[700] text-black/70 dark:text-white/70">
                  Slide {slideIdx + 1}
                </span>
                <span className="text-[10px] text-black/40 dark:text-white/40">
                  {issues.length} issue{issues.length > 1 ? 's' : ''}
                </span>
                <span className="ml-auto text-black/30 dark:text-white/30">
                  {expandedSlide === slideIdx ? <ChevronUp className="h-[12px] w-[12px]" /> : <ChevronDown className="h-[12px] w-[12px]" />}
                </span>
              </button>
              {expandedSlide === slideIdx && (
                <div className="space-y-[4px] pl-[18px]">
                  {issues.map((issue, idx) => (
                    <IssueRow key={`slide-${slideIdx}-${idx}`} issue={issue} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-[8px] border-t border-black/5 dark:border-white/5 px-[14px] py-[10px]">
        {onQuickFix && review.issues.length > 0 && (
          <button type="button" onClick={onQuickFix}
            className="rounded-[10px] border border-emerald-500/25 bg-emerald-500/10 px-[14px] py-[8px] text-[12px] font-[800] text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-200">
            <Sparkles className="mr-[4px] inline h-[12px] w-[12px]" />
            Correções rápidas
          </button>
        )}
        {onFix && review.issues.length > 0 && (
          <button type="button" onClick={onFix} disabled={correcting}
            className="rounded-[10px] border border-stone-500/20 bg-stone-500/10 px-[14px] py-[8px] text-[12px] font-[800] text-stone-700 hover:bg-stone-500/15 disabled:opacity-50 dark:text-stone-100">
            {correcting ? 'Corrigindo...' : 'Corrigir com IA'}
          </button>
        )}
      </div>
    </div>
  );
}

function IssueRow({ issue }: { issue: EditorialReview['issues'][number] }) {
  const isBlocker = issue.type === 'blocker' || issue.severity === 'high';
  const isWarning = issue.type === 'warning' || issue.severity === 'medium';

  return (
    <div className="flex items-start gap-[8px] rounded-[8px] bg-white p-[10px] dark:bg-white/5">
      <span className={`mt-[1px] h-[6px] w-[6px] shrink-0 rounded-full ${
        isBlocker ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'
      }`} />
      <div className="min-w-0 flex-1">
        <span className="text-[12px] text-black/70 dark:text-white/75">
          {issue.message || issue.issue}
        </span>
        {issue.suggestion && (
          <span className="ml-[6px] text-[11px] text-black/40 dark:text-white/40">
            → {issue.suggestion}
          </span>
        )}
      </div>
    </div>
  );
}
```

### 6.6 Integrar `EditorialReviewPanel` no Studio

**Arquivo:** `apps/frontend/src/components/ai-generate/ai-generate-images-direction-panel.tsx`

Substituir o bloco inline de exibição de review (linhas 724-751) pela nova `EditorialReviewPanel`:

```tsx
// Antes (bloco inline de ~27 linhas)
{editorialReview && (
  <div className="mt-[12px] rounded-[14px] ...">
    {/* ... renderização manual ... */}
  </div>
)}

// Depois
{editorialReview && (
  <EditorialReviewPanel
    review={editorialReview}
    onFix={fixCarouselWithAi}
    onQuickFix={applyEditorialQuickFixes}
    correcting={correctingEditorial}
    className="mt-[12px]"
  />
)}
```

### 6.7 Adicionar Badge de Issues por Slide no Preview

**Arquivo:** `apps/frontend/src/components/ai-generate/ai-generate-images-slide-preview.tsx` (ou componente equivalente de preview de slide)

```tsx
// No preview de cada slide, adicionar badge de issues:
<EditorialIssueBadge
  issues={editorialIssues.filter(i => i.slide === slide.index)}
  className="absolute top-[4px] right-[4px] z-10"
/>
```

---

## 7. Persistência da Revisão

### 7.1 Estrutura de Dados Persistida

A revisão será salva como parte do metadado do carousel project:

```typescript
// Tipo para o carousel project metadata (já existe parcialmente)
type CarouselProjectMetadata = {
  // ... campos existentes ...
  editorialReview?: {
    score: number;
    verdict: string;
    issues: EditorialReview['issues'];
    strengths: string[];
    templateCheckResults: TemplateCheckResult[];
    forbiddenTermMatches: ForbiddenTermMatch[];
    reviewedAt: string; // ISO timestamp
    model: string;
    templateId?: string;
  };
};
```

### 7.2 Persistência no Frontend (localStorage)

**Arquivo:** `apps/frontend/src/components/ai-generate/use-ai-generate-images-studio.ts`

O review já é serializado no metadata do projeto (linha 1942: `editorialReview`). A mudança é garantir que:

1. O review NÃO é resetado para `null` após fix — em vez disso, o fix atualiza o review com `score: null` e `verdict: "revisão pendente após correção"`
2. Ao reabrir projeto, o review é restaurado do metadata

```typescript
// Em loadProjectIntoStudio():
if (metadata.editorialReview) {
  setEditorialReview(metadata.editorialReview);
}

// Em fixCarouselWithAi(), ao invés de:
setEditorialReview(null);

// Usar:
setEditorialReview({
  ...review,
  score: 0,
  verdict: 'Revisão pendente após correção — execute nova revisão',
  issues: [],
  strengths: [],
});
```

### 7.3 Persistência no Backend (Carousel Project)

**Arquivo:** `libraries/nestjs-libraries/src/database/prisma/media/media.service.ts`

Adicionar campo `editorialReview` ao schema Prisma do CarouselProject (se não existir):

```prisma
model CarouselProject {
  // ... campos existentes ...
  editorialReview Json?   // Resultado da última revisão editorial
}
```

**Endpoint para salvar:**

```typescript
// POST /ai-generate/carousel-projects/:id/editorial-review
async saveEditorialReview(projectId: string, review: EditorialReview) {
  await this.carouselProjectRepository.update(projectId, {
    editorialReview: review,
  });
}
```

---

## 8. Bloqueio por Score

### 8.1 Configuração do Threshold

**Arquivo:** `apps/frontend/src/components/ai-generate/use-ai-generate-images-studio.ts`

```typescript
// Novo estado
const [scoreThreshold, setScoreThreshold] = useState(60); // default: 60/100
const [showBlockModal, setShowBlockModal] = useState(false);
```

### 8.2 Gate em `generateCarouselImages()`

**Arquivo:** `apps/frontend/src/components/ai-generate/use-ai-generate-images-studio.ts`

```typescript
const generateCarouselImages = async () => {
  // ... validações existentes ...

  // NOVO: Gate de score editorial
  if (autoReviewBeforeImages && editorialReview) {
    if (editorialReview.score < scoreThreshold && !allowGenerateWithReviewIssues) {
      setShowBlockModal(true);
      return;
    }
  }

  // Se autoReviewBeforeImages está ativo mas não há review, rodar review primeiro
  if (autoReviewBeforeImages && !editorialReview) {
    const review = await reviewCarouselQuality(true);
    if (review && review.score < scoreThreshold && !allowGenerateWithReviewIssues) {
      setShowBlockModal(true);
      return;
    }
  }

  // ... continuação existente ...
};
```

### 8.3 Componente `EditorialBlockModal`

**Novo arquivo:** `apps/frontend/src/components/ai-generate/editorial-block-modal.tsx`

```tsx
'use client';

import { AlertTriangle, Sparkles, Play } from 'lucide-react';
import type { EditorialReview } from './ai-generate-images.types';

type EditorialBlockModalProps = {
  review: EditorialReview;
  threshold: number;
  onFix: () => void;
  onOverride: () => void;
  onDismiss: () => void;
  correcting?: boolean;
};

export function EditorialBlockModal({
  review, threshold, onFix, onOverride, onDismiss, correcting,
}: EditorialBlockModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-[16px] w-full max-w-[420px] rounded-[18px] border border-black/10 bg-white p-[24px] shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
        {/* Header */}
        <div className="flex items-center gap-[12px] mb-[16px]">
          <div className="flex h-[40px] w-[40px] items-center justify-center rounded-[10px] bg-red-500/10">
            <AlertTriangle className="h-[20px] w-[20px] text-red-500" />
          </div>
          <div>
            <h3 className="text-[16px] font-[800] text-black dark:text-white">
              Qualidade abaixo do mínimo
            </h3>
            <p className="text-[12px] text-black/50 dark:text-white/50">
              Score: {review.score}/100 (mínimo: {threshold})
            </p>
          </div>
        </div>

        {/* Score visual */}
        <div className="h-[6px] w-full rounded-full bg-black/10 dark:bg-white/10 mb-[16px]">
          <div
            className={`h-[6px] rounded-full ${
              review.score >= 80 ? 'bg-emerald-500' : review.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${review.score}%` }}
          />
        </div>

        {/* Issues resumidos */}
        <div className="space-y-[4px] mb-[20px] max-h-[120px] overflow-y-auto">
          {review.issues.slice(0, 5).map((issue, idx) => (
            <div key={idx} className="text-[12px] text-black/60 dark:text-white/60">
              {issue.slide ? `Slide ${issue.slide}: ` : ''}{issue.message || issue.issue}
            </div>
          ))}
          {review.issues.length > 5 && (
            <div className="text-[11px] text-black/40 dark:text-white/40">
              +{review.issues.length - 5} outros problemas
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex flex-col gap-[8px]">
          <button type="button" onClick={onFix} disabled={correcting}
            className="flex items-center justify-center gap-[8px] rounded-[12px] bg-stone-900 px-[16px] py-[12px] text-[13px] font-[800] text-white hover:bg-stone-800 disabled:opacity-50 dark:bg-white dark:text-stone-900">
            <Sparkles className="h-[14px] w-[14px]" />
            {correcting ? 'Corrigindo...' : 'Corrigir com IA e tentar novamente'}
          </button>
          <button type="button" onClick={onOverride}
            className="flex items-center justify-center gap-[8px] rounded-[12px] border border-black/10 px-[16px] py-[12px] text-[13px] font-[700] text-black/60 hover:bg-black/5 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5">
            <Play className="h-[14px] w-[14px]" />
            Gerar mesmo assim (ignorar aviso)
          </button>
          <button type="button" onClick={onDismiss}
            className="text-[12px] text-black/40 hover:text-black/60 dark:text-white/40 dark:hover:text-white/60">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 8.4 Integrar Modal no Studio View

**Arquivo:** `apps/frontend/src/components/ai-generate/ai-generate-images-studio-view.tsx`

```tsx
{/* Bloco editorial review modal */}
{showBlockModal && editorialReview && (
  <EditorialBlockModal
    review={editorialReview}
    threshold={scoreThreshold}
    onFix={() => {
      setShowBlockModal(false);
      fixCarouselWithAi();
    }}
    onOverride={() => {
      setAllowGenerateWithReviewIssues(true);
      setShowBlockModal(false);
      generateCarouselImages();
    }}
    onDismiss={() => setShowBlockModal(false)}
    correcting={correctingEditorial}
  />
)}
```

---

## 9. Integração com Auto-Fix

### 9.1 Melhorar `applyEditorialQuickFixes()`

**Arquivo:** `apps/frontend/src/components/ai-generate/use-ai-generate-images-studio.ts`

Expandir as correções rápidas para incluir:

```typescript
const applyEditorialQuickFixes = () => {
  if (!plan || !editorialReview?.issues?.length) return;

  // ... agrupamento por slide (existente) ...

  setPlan((current) => {
    if (!current) return current;

    return {
      ...current,
      slides: current.slides.map((slide) => {
        const issues = issuesBySlide.get(slide.index);
        if (!issues?.length) return slide;

        let headline = slide.headline;
        let body = slide.body;
        let cta = slide.cta;

        // Correção 1: Truncar headline se muito longa
        if (headline.length > 78) {
          headline = compactText(headline, 78);
        }

        // Correção 2: Truncar body se muito longo
        if (body.length > 150) {
          body = compactText(body, 150);
        }

        // Correção 3: Remover termos proibidos (substituir por sinônimo genérico)
        if (forbiddenTerms) {
          const terms = forbiddenTerms.split(',').map(t => t.trim()).filter(Boolean);
          for (const term of terms) {
            const regex = new RegExp(term, 'gi');
            headline = headline.replace(regex, '[revisar]');
            body = body.replace(regex, '[revisar]');
            cta = cta.replace(regex, '[revisar]');
          }
        }

        // Correção 4: Adicionar nota ao imagePrompt
        const suggestions = issues.map(i => i.suggestion || i.issue || i.message);

        return {
          ...slide,
          headline,
          body,
          cta,
          imagePrompt: compactText(
            [
              slide.imagePrompt,
              `Ajuste editorial: ${suggestions.join('; ')}`,
              'Priorize legibilidade, alto contraste, respiro e função clara.',
            ].join('\n'),
            900
          ),
        };
      }),
    };
  });

  // Resetar imagens afetadas
  setSlideImages({});
  setSavedCarouselCount(0);
  setError('');
};
```

### 9.2 Fluxo de Auto-Fix com Revisão Humana

O fluxo atual já oferece dois caminhos:
1. **Correções rápidas** (`applyEditorialQuickFixes`) — aplicação local imediata
2. **Corrigir com IA** (`fixCarouselWithAi`) — chamada ao backend

**Melhoria:** Após cada correção (rápida ou IA), ofrecer diff visual:

```typescript
// Após applyEditorialQuickFixes ou fixCarouselWithAi:
// Salvar snapshot do "antes" (já existe no slideHistory)
// Mostrar indicador de que houve mudança
setShowDiffAfterFix(true);
```

**Novo componente** `SlideDiffIndicator`:

```tsx
// Indicador discreto mostrando que o slide mudou após fix
function SlideDiffIndicator({ hasChanges }: { hasChanges: boolean }) {
  if (!hasChanges) return null;
  return (
    <span className="absolute top-[4px] left-[4px] z-10 rounded-full bg-blue-500/20 px-[6px] py-[1px] text-[9px] font-[700] text-blue-600 dark:text-blue-300">
      ✓ corrigido
    </span>
  );
}
```

---

## 10. Ordem de Implementação Passo a Passo

### Passo 1: Corrigir Schema e Padronização (Backend)
**Arquivos:** `schemas/editorial-review.schema.ts`, `ai-response-validator.ts`
**Esforço:** ~2h
**Dependências:** Nenhuma

1. Atualizar `EditorialReviewSchema` para incluir `strengths`, `templateCheckResults`, `forbiddenTermMatches`
2. Adicionar aliases de compatibilidade (`slide` ↔ `slideIndex`, `issue` ↔ `message`, `severity` ↔ `type`)
3. Adicionar campos opcionais para não quebrar respostas existentes
4. Testar com payloads antigos (regressão)

### Passo 2: Enriquecer Prompt de Revisão (Backend)
**Arquivo:** `ai-generate.service.ts`
**Esforço:** ~3h
**Dependências:** Passo 1

1. Modificar `reviewCarousel()` para aceitar `editorialChecks`, `forbiddenTerms`, `templateId` do payload
2. Construir seção do prompt com regras do template
3. Construir seção do prompt com termos proibidos
4. Atualizar o template de resposta JSON no prompt
5. Adicionar validação local de forbidden terms como fallback
6. Adicionar execução local de template checks (regex) como fallback
7. Merge dos resultados LLM + fallback

### Passo 3: Expandir `getEditorialIssues()` (Frontend)
**Arquivo:** `ai-generate-images.utils.ts`
**Esforço:** ~2h
**Dependências:** Nenhuma

1. Adicionar parâmetro `options` com `forbiddenTerms` e `templateChecks`
2. Implementar verificação de forbidden terms
3. Implementar execução de regex dos template checks
4. Adicionar campo `source` ao tipo `EditorialIssue`
5. Testar com múltiplos cenários

### Passo 4: Integrar no Hook Principal (Frontend)
**Arquivo:** `use-ai-generate-images-studio.ts`
**Esforço:** ~3h
**Dependências:** Passos 2, 3

1. Adicionar `selectedBackendTemplate` memoizado
2. Atualizar chamada de `getEditorialIssues()` com opções
3. Atualizar payload de `reviewCarouselQuality()` com checks e forbiddenTerms
4. Atualizar `fixCarouselWithAi()` para incluir checks no payload
5. Não resetar `editorialReview` para null após fix

### Passo 5: Componente `EditorialReviewPanel` (Frontend)
**Arquivo:** Novo `editorial-review-panel.tsx`
**Esforço:** ~3h
**Dependências:** Passo 1 (tipo EditorialReview atualizado)

1. Criar componente com score circular, agrupamento por slide
2. Criar subcomponente `IssueRow` com indicador de severidade
3. Integrar ações (quick fix, fix com IA)
4. Substituir bloco inline no `DirectionPanel`

### Passo 6: `EditorialIssueBadge` e Preview (Frontend)
**Arquivos:** Novo `editorial-issue-badge.tsx`, componente de preview
**Esforço:** ~2h
**Dependências:** Passo 3

1. Criar badge discreto com contadores por severidade
2. Integrar no preview de cada slide

### Passo 7: Bloqueio por Score (Frontend)
**Arquivos:** `use-ai-generate-images-studio.ts`, novo `editorial-block-modal.tsx`
**Esforço:** ~3h
**Dependências:** Passos 4, 5

1. Adicionar estados `scoreThreshold` e `showBlockModal`
2. Implementar gate em `generateCarouselImages()`
3. Criar `EditorialBlockModal` com score visual e opções
4. Integrar no studio view

### Passo 8: Persistência da Revisão (Backend + Frontend)
**Arquivos:** `media.service.ts`, Prisma schema, `use-ai-generate-images-studio.ts`
**Esforço:** ~3h
**Dependências:** Passo 1

1. Adicionar campo `editorialReview` ao Prisma schema
2. Criar endpoint `POST /ai-generate/carousel-projects/:id/editorial-review`
3. Garantir que review é serializado no metadata do projeto
4. Garantir que review é restaurado ao reabrir projeto
5. Atualizar `fixCarouselWithAi()` para marcar review como "pendente"

### Passo 9: Melhorar Auto-Fix (Frontend)
**Arquivo:** `use-ai-generate-images-studio.ts`
**Esforço:** ~2h
**Dependências:** Passos 3, 4

1. Expandir `applyEditorialQuickFixes()` com correção de forbidden terms
2. Expandir com correção de template checks
3. Adicionar indicador de diff pós-correção
4. Testar fluxo completo: review → quick fix → re-review

### Passo 10: Testes e QA
**Esforço:** ~3h
**Dependências:** Todos os passos anteriores

1. Teste de regressão: review existente continua funcionando
2. Teste de forbidden terms: termo proibido gera issue
3. Teste de template checks: regex do check gera issue
4. Teste de bloqueio: score baixo impede geração
5. Teste de persistência: review sobrevive reload
6. Teste de UI: issues agrupados por slide, score visual

---

## 11. Checklist com Critérios de Conclusão

### Critérios Obrigatórios

- [ ] **C1:** O prompt de revisão AI inclui `editorialChecks` do template selecionado
- [ ] **C2:** Termos proibidos da Brand DNA são verificados durante a revisão (AI + local)
- [ ] **C3:** Template checks com regex são executados localmente e enviados ao LLM
- [ ] **C4:** Schema Zod padronizado aceita tanto formato antigo quanto novo
- [ ] **C5:** `autoReviewBeforeImages` realmente bloqueia geração quando score < threshold
- [ ] **C6:** Modal de bloqueio oferece: corrigir, ignorar, cancelar
- [ ] **C7:** Review é persistido no metadata do carousel project
- [ ] **C8:** Review é restaurado ao reabrir projeto salvo
- [ ] **C9:** UI mostra issues agrupados por slide com indicador de severidade
- [ ] **C10:** Score é exibido como indicador visual circular (não apenas número)
- [ ] **C11:** `applyEditorialQuickFixes()` remove/substitui termos proibidos
- [ ] **C12:** Badge de issues aparece no preview de cada slide
- [ ] **C13:** Fluxo completo funciona: gerar → review → corrigir → re-review → gerar imagens

### Critérios Desejáveis

- [ ] **D1:** Threshold de score é configurável pelo usuário (default 60)
- [ ] **D2:** Indicador "corrigido" aparece após applyEditorialQuickFixes
- [ ] **D3:** Template checks sem regex são avaliados apenas pelo LLM (sem false positive)
- [ ] **D4:** Forbidden terms suportam variações (case-insensitive, acentos)

---

## 12. Riscos e Decisões Pendentes

### Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|-------------|---------|-----------|
| LLM ignora checks do template no prompt | Média | Alto | Fallback local com regex garante detecção básica |
| Schema update quebra respostas existentes | Baixa | Alto | Aliases de compatibilidade + defaults |
| Score threshold muito alto bloqueia legítimos | Média | Médio | Default conservador (60) + override fácil |
| Forbidden terms com acentos/variantes não detectados | Média | Médio | Normalização Unicode no check local |
| Performance: many template checks × many slides | Baixa | Baixo | Regex checks são síncronos e rápidos |

### Decisões Pendentes

1. **Threshold default:** 60 (conservador) ou 50 (permissivo)? → Recomendação: 60
2. **Persistência:** localStorage apenas ou backend também? → Recomendação: ambos (localStorage para MVP, backend para multi-device)
3. **Quick fix para forbidden terms:** substituir por "[revisar]" ou remover completamente? → Recomendação: "[revisar]" para não perder contexto
4. **Auto-review automático:** rodar review silenciosamente ao gerar plano, ou apenas sob demanda? → Recomendação: sob demanda (economiza tokens)
5. **Score weighting:** checks de template devem pesar mais que checks locais? → Recomendação: sim, checks do template são "blocker" por padrão

---

## Arquivos a Criar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `apps/frontend/src/components/ai-generate/editorial-review-panel.tsx` | Componente | Painel de revisão com score circular e issues agrupados |
| `apps/frontend/src/components/ai-generate/editorial-issue-badge.tsx` | Componente | Badge discreto de issues por slide |
| `apps/frontend/src/components/ai-generate/editorial-block-modal.tsx` | Componente | Modal de bloqueio por score baixo |

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `libraries/nestjs-libraries/src/ai-generate/schemas/editorial-review.schema.ts` | Adicionar `strengths`, `templateCheckResults`, `forbiddenTermMatches`, aliases |
| `libraries/nestjs-libraries/src/ai-generate/ai-generate.service.ts` | Enriquecer prompt, adicionar fallback checks, validação forbidden terms |
| `apps/frontend/src/components/ai-generate/ai-generate-images.utils.ts` | Expandir `getEditorialIssues()` com forbidden terms e template checks |
| `apps/frontend/src/components/ai-generate/use-ai-generate-images-studio.ts` | Integrar checks, gate de score, persistência, selectedBackendTemplate |
| `apps/frontend/src/components/ai-generate/ai-generate-images-direction-panel.tsx` | Substituir review inline por `EditorialReviewPanel` |
| `apps/frontend/src/components/ai-generate/ai-generate-images-studio-view.tsx` | Integrar `EditorialBlockModal` |
| `apps/frontend/src/components/ai-generate/ai-generate-images-planning-form.tsx` | Nenhuma mudança (campo forbiddenTerms já existe) |
| `apps/frontend/src/components/ai-generate/ai-generate-images.types.ts` | Atualizar tipo `EditorialReview` se necessário |
| `apps/frontend/src/components/ai-generate/template-registry.types.ts` | Adicionar campo `pattern` ao tipo de editorialChecks |

---

**Estimativa total de esforço:** ~28 horas de desenvolvimento  
**Sequência recomendada:** Passos 1→3→5→2→4→6→7→8→9→10  
**Entrega esperada:** Sistema editorial completo com enforced checks, forbidden terms, score blocking, e UI melhorada