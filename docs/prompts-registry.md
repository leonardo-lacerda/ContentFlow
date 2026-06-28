# ContentFlow — Registry de Prompts de IA

> **Última atualização:** 28/06/2026  
> **Fonte principal:** `libraries/nestjs-libraries/src/ai-generate/ai-generate.service.ts`  
> **Fontes auxiliares:** `libraries/nestjs-libraries/src/database/prisma/organizations/organization.service.ts`  
> **Schemas Zod:** `libraries/nestjs-libraries/src/ai-generate/schemas/`

---

## Índice

1. [carousel-ideas](#1-carousel-ideas)
2. [carousel-plan](#2-carousel-plan)
3. [carousel-caption](#3-carousel-caption)
4. [carousel-review](#4-carousel-review)
5. [carousel-fix](#5-carousel-fix)
6. [generate-summary (CompanyProfile)](#6-generate-summary-companyprofile)
7. [generate-visual-identity](#7-generate-visual-identity)

---

## 1. carousel-ideas

### Identificação

| Campo | Valor |
|---|---|
| **Nome** | `carousel-ideas` |
| **Versão atual** | `1.0.0` |
| **Arquivo** | `ai-generate.service.ts` — método `generateCarouselIdeas()` (linha ~493) |
| **Schema Zod** | `schemas/carousel-idea.schema.ts` — `CarouselIdeaSchema` |
| **Endpoint** | `POST /v1/chat/completions` (OpenAI) |

### Objetivo

Gerar ideias de carrossel para redes sociais a partir do contexto da empresa e um hint opcional de tema. Evita repetir ideias já geradas anteriormente.

### Inputs (AiGenerateCarouselIdeasDto)

| Parâmetro | Tipo | Tamanho | Obrigatório | Descrição |
|---|---|---|---|---|
| `companyContext` | `string` | max 5000 | ❌ | Contexto da empresa |
| `topicHint` | `string` | min 3, max 240 | ❌ | Hint opcional de tema |
| `language` | `string` | max 80 | ❌ | Idioma (default: `pt-BR`) |
| `textModel` | `string` | max 128 | ❌ | Modelo override |
| `existingTitles` | `string[]` | max 120 itens | ❌ | Títulos já gerados para evitar repetição |

### Output esperado

```json
{
  "ideas": [
    {
      "title": "tema curto do carrossel",
      "hook": "frase gancho para abrir o post",
      "goal": "objetivo do post (educar, autoridade, conversao, etc)",
      "angle": "angulo editorial em 1 frase"
    }
  ]
}
```

> **Nota:** O prompt pede 8–12 ideias. O código limita a 12 e filera duplicatas por `existingTitles`.

### Configuração do Modelo

| Parâmetro | Valor |
|---|---|
| **Modelo padrão** | `gpt-4.1-mini` |
| **Override via env** | `AI_GENERATE_OPENAI_TEXT_MODEL` |
| **Override via DTO** | `body.textModel` |
| **Temperatura** | `0.9` |
| **response_format** | `json_object` |
| **Timeout** | `AI_GENERATE_TIMEOUT_MS` (default 120s) |

### System Prompt

```
Voce e estrategista de conteudo para redes sociais. Gere ideias de carrossel
acionaveis, sem promessas exageradas. Responda apenas JSON valido.
```

### User Prompt (template)

```
Com base no contexto abaixo, gere ideias de posts em portugues do Brasil para
carrossel.

Contexto da empresa:
{companyContext || 'Sem contexto detalhado'}

Hint opcional de tema:
{topicHint || 'Sem hint'}

{avoidanceInstruction (se houver existingTitles)}

Retorne EXATAMENTE:
{
  "ideas": [
    {
      "title": "tema curto do carrossel",
      "hook": "frase gancho para abrir o post",
      "goal": "objetivo do post (educar, autoridade, conversao, etc)",
      "angle": "angulo editorial em 1 frase"
    }
  ]
}

Gere entre 8 e 12 ideias, com variedade de formatos (educacional, storytelling,
lista, mitos e verdades, case, antes/depois, oferta, autoridade).
```

### Schema de Validação (Zod)

**Arquivo:** `schemas/carousel-idea.schema.ts`

```typescript
const IdeaSchema = z.object({
  title: z.string(),
  hook: z.string(),
  goal: z.string(),
  angle: z.string(),
  templateSuggestion: z.string().optional(),
  platformSuggestion: z.string().optional(),
  score: z.number().min(0).max(10).optional(),
});

export const CarouselIdeaSchema = z.object({
  ideas: z.array(IdeaSchema).min(1),
});
```

> **⚠️ Divergência:** O schema Zod inclui campos adicionais (`templateSuggestion`, `platformSuggestion`, `score`) que **não** estão no prompt atual. O código extrai manualmente apenas `title`, `hook`, `goal`, `angle` — não usa o schema Zod para validar a resposta.

### Histórico de versões

| Versão | Data | Mudanças |
|---|---|---|
| `1.0.0` | — | Versão inicial. Prompt com `companyContext`, `topicHint`, `existingTitles`. Geração de 8–12 ideias com deduplicação. |

---

## 2. carousel-plan

### Identificação

| Campo | Valor |
|---|---|
| **Nome** | `carousel-plan` |
| **Versão atual** | `1.0.0` |
| **Arquivo** | `ai-generate.service.ts` — método `generateCarouselPlan()` (linha ~810) |
| **Schema Zod** | `schemas/carousel-plan.schema.ts` — `CarouselPlanSchema` |
| **Endpoint** | `POST /v1/chat/completions` (OpenAI) |

### Objetivo

Criar um plano completo de carrossel com N slides, incluindo copy visual para dentro das imagens, prompts de geração de imagem e metadados (legenda, hashtags, guia visual). Suporta "repurpose" a partir de URL ou texto colado.

### Inputs (AiGenerateCarouselDto)

| Parâmetro | Tipo | Tamanho | Obrigatório | Descrição |
|---|---|---|---|---|
| `topic` | `string` | min 3, max 240 | ❌* | Tema do carrossel |
| `sourceUrl` | `string` | max 500 | ❌ | URL para extrair conteúdo (repurpose) |
| `sourceText` | `string` | max 20000 | ❌ | Texto colado para repurpose |
| `goal` | `string` | max 240 | ❌ | Objetivo do post |
| `audience` | `string` | max 240 | ❌ | Público-alvo |
| `tone` | `string` | max 120 | ❌ | Tom de voz |
| `platform` | `string` | max 80 | ❌ | Rede social (default: `instagram`) |
| `slideCount` | `number` | 2–10 | ❌ | Número de slides (default: 5) |
| `visualStyle` | `string` | max 400 | ❌ | Direção visual |
| `brandNotes` | `string` | max 5000 | ❌ | Notas de marca |
| `language` | `string` | max 80 | ❌ | Idioma (default: `pt-BR`) |
| `textModel` | `string` | max 128 | ❌ | Modelo override |

> * `topic` OU `sourceUrl`/`sourceText` são obrigatórios (validação no backend).

### Output esperado

```json
{
  "title": "titulo do post",
  "platform": "instagram",
  "language": "pt-BR",
  "caption": "legenda curta para acompanhar o post fora da imagem",
  "hashtags": ["#tag"],
  "imageStyleGuide": "guia visual consistente para todas as imagens",
  "slides": [
    {
      "index": 1,
      "headline": "frase principal curta GRANDE dentro da imagem",
      "body": "texto de apoio curto dentro da imagem",
      "cta": "micro chamada visual opcional",
      "imagePrompt": "descricao visual do fundo, objeto, layout",
      "altText": "descricao acessivel da imagem"
    }
  ]
}
```

### Configuração do Modelo

| Parâmetro | Valor |
|---|---|
| **Modelo padrão** | `gpt-4.1-mini` |
| **Temperatura** | `0.7` |
| **response_format** | `json_object` |
| **Timeout** | 120s |

### System Prompt

```
Voce e um diretor de arte e copywriter senior para carrosseis de redes sociais.
Gere copy curta para ser renderizada dentro das imagens, alem de prompts visuais
com layout editorial. Responda somente JSON valido, sem markdown.
```

### User Prompt (template simplificado)

```
Crie um plano completo de carrossel com exatamente {slideCount} slides.

Briefing:
{JSON.stringify(brief)}

{sourceContent
  ? `CONTEUDO DE ORIGEM (transforme ISTO em carrossel; extraia os pontos
     principais, resuma e adapte para slides curtos e impactantes...):
     """{sourceContent}"""`
  : ''}

Formato obrigatorio do JSON:
{
  "title": "titulo do post",
  "platform": "instagram",
  "language": "pt-BR",
  "caption": "legenda curta para acompanhar o post fora da imagem",
  "hashtags": ["#tag"],
  "imageStyleGuide": "guia visual consistente...",
  "slides": [
    {
      "index": 1,
      "headline": "frase principal curta que deve aparecer GRANDE dentro da imagem",
      "body": "texto de apoio curto que tambem deve aparecer dentro da imagem",
      "cta": "micro chamada visual opcional para aparecer no slide",
      "imagePrompt": "descricao visual do fundo, objeto/personagem/metafora, layout...",
      "altText": "descricao acessivel da imagem"
    }
  ]
}

Regras: headline e body sao copy visual para dentro do criativo...
```

> O `brief` é um objeto construído internamente com: `topic`, `goal`, `audience`, `tone`, `platform`, `slideCount`, `visualStyle`, `brandNotes`, `language`.

### Schema de Validação (Zod)

**Arquivo:** `schemas/carousel-plan.schema.ts`

```typescript
const SlideSchema = z.object({
  index: z.number().int().min(0),
  headline: z.string(),
  body: z.string(),
  cta: z.string().optional(),
  imagePrompt: z.string().optional(),
  altText: z.string().optional(),
});

export const CarouselPlanSchema = z.object({
  title: z.string(),
  platform: z.string(),
  language: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()).default([]),
  imageStyleGuide: z.string().optional(),
  slides: z.array(SlideSchema).min(1),
});
```

> **Uso no código:** A resposta é normalizada por `normalizeCarouselPlan()` que faz parsing manual, **não** usa o schema Zod. O schema existe como referência/documentação.

### Histórico de versões

| Versão | Data | Mudanças |
|---|---|---|
| `1.0.0` | — | Versão inicial. Briefing com topic/goal/audience/tone/platform/visualStyle/brandNotes/language. Suporte a repurpose via sourceUrl/sourceText. |

---

## 3. carousel-caption

### Identificação

| Campo | Valor |
|---|---|
| **Nome** | `carousel-caption` |
| **Versão atual** | `1.0.0` |
| **Arquivo** | `ai-generate.service.ts` — método `generateCarouselCaption()` (linha ~653) |
| **Schema Zod** | `schemas/caption-package.schema.ts` — `CaptionPackageSchema` |
| **Endpoint** | `POST /v1/chat/completions` (OpenAI) |

### Objetivo

Gerar a legenda (texto que vai FORA da imagem) e hashtags para acompanhar um carrossel já criado, adaptadas à rede social escolhida.

### Inputs (AiGenerateCaptionDto)

| Parâmetro | Tipo | Tamanho | Obrigatório | Descrição |
|---|---|---|---|---|
| `title` | `string` | max 240 | ❌ | Título do carrossel |
| `slides` | `Array<{headline?, body?}>` | — | ❌ | Conteúdo dos slides (headline/body) |
| `platform` | `string` | max 80 | ❌ | Rede social (default: `instagram`) |
| `tone` | `string` | max 120 | ❌ | Tom de voz (default: `claro, prático e persuasivo`) |
| `language` | `string` | max 80 | ❌ | Idioma (default: `pt-BR`) |
| `companyContext` | `string` | max 5000 | ❌ | Contexto da empresa |
| `forbiddenTerms` | `string` | max 240 | ❌ | Termos/claims proibidos |
| `defaultCta` | `string` | max 120 | ❌ | CTA preferido |
| `textModel` | `string` | max 128 | ❌ | Modelo override |

### Output esperado

```json
{
  "caption": "legenda pronta para publicar, com quebras de linha",
  "hashtags": ["#exemplo"]
}
```

### Configuração do Modelo

| Parâmetro | Valor |
|---|---|
| **Modelo padrão** | `gpt-4.1-mini` |
| **Temperatura** | `0.8` |
| **response_format** | `json_object` |
| **Timeout** | 120s |

### System Prompt

```
Voce e copywriter senior de redes sociais. Escreva a legenda (texto que vai FORA
da imagem) e hashtags para acompanhar um carrossel. Responda apenas JSON valido.
```

### User Prompt (template)

```
Escreva a legenda e as hashtags para acompanhar este carrossel na rede indicada.

Rede: {platform}
Diretrizes da rede: {platformGuide}
Tom de voz: {tone || 'claro, prático e persuasivo'}
Idioma: {language || 'pt-BR'}
{defaultCta ? `CTA preferido: ${defaultCta}` : ''}
{forbiddenTerms ? `Evite estes termos/claims: ${forbiddenTerms}` : ''}
{companyContext ? `Contexto da empresa:\n${companyContext.slice(0, 2000)}` : ''}

Titulo do carrossel: {title}
Conteudo dos slides:
{slidesText || '(sem detalhe de slides)'}

Retorne EXATAMENTE:
{
  "caption": "legenda pronta para publicar, com quebras de linha quando fizer sentido",
  "hashtags": ["#exemplo"]
}
```

Onde `platformGuide` é selecionado conforme a plataforma:

| Plataforma | Guia |
|---|---|
| `instagram` | Tom leve e próximo, gancho forte na primeira linha, quebras de linha curtas, emojis com moderação, CTA convidando a salvar/comentar. 5 a 12 hashtags. |
| `linkedin` | Tom profissional e de autoridade, parágrafos curtos, poucos ou nenhum emoji, foco em insight/valor. Máx 3 a 5 hashtags. |
| `tiktok` | Tom direto, jovem e dinâmico, frase curta de impacto, 1 ou 2 emojis, CTA rápido. 3 a 6 hashtags. |

### Schema de Validação (Zod)

**Arquivo:** `schemas/caption-package.schema.ts`

```typescript
export const CaptionPackageSchema = z.object({
  caption: z.string().min(1),
  hashtags: z.array(z.string()).default([]),
  platform: z.string(),
});
```

> **Uso no código:** A resposta é parseada manualmente (extrai `caption` e `hashtags`), **não** usa o schema Zod. O campo `platform` no schema não é retornado pelo prompt.

### Histórico de versões

| Versão | Data | Mudanças |
|---|---|---|
| `1.0.0` | — | Versão inicial. Guias específicos por plataforma (instagram/linkedin/tiktok). Suporte a CTA preferido, termos proibidos e contexto da empresa. |

---

## 4. carousel-review

### Identificação

| Campo | Valor |
|---|---|
| **Nome** | `carousel-review` |
| **Versão atual** | `1.0.0` |
| **Arquivo** | `ai-generate.service.ts` — método `reviewCarousel()` (linha ~975) |
| **Schema Zod** | `schemas/editorial-review.schema.ts` — `EditorialReviewSchema` |
| **Endpoint** | `POST /v1/chat/completions` (OpenAI) |

### Objetivo

Revisão editorial de um carrossel antes da geração final de imagens. Avalia legibilidade, clareza, promessas exageradas, consistência com marca e qualidade visual.

### Inputs

| Parâmetro | Tipo | Tamanho | Obrigatório | Descrição |
|---|---|---|---|---|
| `reviewPayload` | `string` | max 16000 | ❌* | JSON do carrossel a revisar |
| `textModel` | `string` | max 128 | ❌ | Modelo override |

> * Se `reviewPayload` não for fornecido, usa `JSON.stringify(body)`.

### Output esperado

```json
{
  "score": 0,
  "verdict": "resumo curto do nivel editorial",
  "issues": [
    {
      "slide": 1,
      "severity": "low|medium|high",
      "issue": "problema",
      "suggestion": "correcao objetiva"
    }
  ],
  "strengths": ["ponto forte"]
}
```

### Configuração do Modelo

| Parâmetro | Valor |
|---|---|
| **Modelo padrão** | `gpt-4.1-mini` |
| **Temperatura** | `0.2` (baixa para consistência) |
| **response_format** | `json_object` |
| **Timeout** | 120s |

### System Prompt

```
Voce e editor senior de carrosseis e diretor de arte. Avalie legibilidade,
clareza, promessa exagerada, consistencia com marca, funcao de cada slide e
qualidade visual. Responda somente JSON valido.
```

### User Prompt (template)

```
Revise este carrossel antes da geracao final de imagens.

Payload:
{payload.slice(0, 16000)}

Retorne exatamente:
{
  "score": 0,
  "verdict": "resumo curto do nivel editorial",
  "issues": [
    {"slide": 1, "severity": "low|medium|high", "issue": "problema", "suggestion": "correcao objetiva"}
  ],
  "strengths": ["ponto forte"]
}

Se estiver bom, issues pode ser vazio. Use pt-BR.
```

### Schema de Validação (Zod)

**Arquivo:** `schemas/editorial-review.schema.ts`

```typescript
const IssueTypeEnum = z.enum(['warning', 'blocker']);

const IssueSchema = z.object({
  type: IssueTypeEnum,
  slideIndex: z.number().int().min(0).optional(),
  field: z.string(),
  message: z.string(),
  suggestion: z.string().optional(),
});

export const EditorialReviewSchema = z.object({
  score: z.number().min(0).max(100).int(),
  issues: z.array(IssueSchema).default([]),
  summary: z.string(),
  canBeFixed: z.boolean(),
});
```

> **⚠️ Divergência significativa:** O prompt pede `verdict`, `issues[{slide, severity, issue, suggestion}]` e `strengths`. O schema Zod espera `summary`, `issues[{type, slideIndex, field, message, suggestion}]` e `canBeFixed`. O código retorna o parse JSON bruto sem usar o schema Zod — portanto, o formato real segue o **prompt**, não o schema.

### Histórico de versões

| Versão | Data | Mudanças |
|---|---|---|
| `1.0.0` | — | Versão inicial. Score, issues por slide com severidade, sugestões. |

---

## 5. carousel-fix

### Identificação

| Campo | Valor |
|---|---|
| **Nome** | `carousel-fix` |
| **Versão atual** | `1.0.0` |
| **Arquivo** | `ai-generate.service.ts` — método `fixCarouselWithEditorialReview()` (linha ~1049) |
| **Schema Zod** | `schemas/carousel-plan.schema.ts` — `CarouselPlanSchema` (+ campo extra `fixSummary`) |
| **Endpoint** | `POST /v1/chat/completions` (OpenAI) |

### Objetivo

Corrigir um carrossel com base em uma revisão editorial já realizada. Mantém a estratégia, ordem dos slides e identidade de marca, mas resolve problemas de clareza, legibilidade, promessas exageradas, CTA fraco e direção visual.

### Inputs

| Parâmetro | Tipo | Tamanho | Obrigatório | Descrição |
|---|---|---|---|---|
| `reviewPayload` | `string` | max 18000 | ❌* | Carrossel + revisão a corrigir |
| `slideCount` | `number` | 2–10 | ❌ | Número de slides a manter |
| `textModel` | `string` | max 128 | ❌ | Modelo override |

> * Se `reviewPayload` não for fornecido, usa `JSON.stringify(body)`.

### Output esperado

```json
{
  "title": "titulo",
  "platform": "instagram",
  "language": "pt-BR",
  "caption": "legenda",
  "hashtags": ["#tag"],
  "imageStyleGuide": "guia visual revisado",
  "slides": [
    {
      "index": 1,
      "headline": "curta",
      "body": "curto",
      "cta": "curto",
      "imagePrompt": "visual legivel",
      "altText": "alt"
    }
  ],
  "fixSummary": ["correcao feita"]
}
```

### Configuração do Modelo

| Parâmetro | Valor |
|---|---|
| **Modelo padrão** | `gpt-4.1-mini` |
| **Temperatura** | `0.35` (baixa para correções precisas) |
| **response_format** | `json_object` |
| **Timeout** | 120s |

### System Prompt

```
Voce e editor senior de carrosseis e diretor de arte. Corrija copy visual e
prompts mantendo estrategia, ordem dos slides e identidade de marca. Responda
somente JSON valido.
```

### User Prompt (template)

```
Corrija este carrossel com base na revisão editorial. Mantenha exatamente
{slideCount} slides. Preserve o tema, mas resolva problemas de clareza,
legibilidade, promessa exagerada, CTA fraco e direção visual confusa.

Payload:
{payload.slice(0, 18000)}

Retorne exatamente o mesmo formato de plano:
{
  "title": "titulo",
  "platform": "instagram",
  "language": "pt-BR",
  "caption": "legenda",
  "hashtags": ["#tag"],
  "imageStyleGuide": "guia visual revisado",
  "slides": [
    {"index": 1, "headline": "curta", "body": "curto", "cta": "curto", "imagePrompt": "visual legivel", "altText": "alt"}
  ],
  "fixSummary": ["correcao feita"]
}

Regras: headline maximo 78 caracteres, body idealmente abaixo de 140 caracteres,
texto dentro da imagem precisa ser legivel no celular, sem claims absolutos, sem
inventar dados. Use pt-BR.
```

### Schema de Validação (Zod)

Reusa o `CarouselPlanSchema` (mesmo do carousel-plan), com extração adicional de `fixSummary` (não presente no schema, extraído manualmente).

### Histórico de versões

| Versão | Data | Mudanças |
|---|---|---|
| `1.0.0` | — | Versão inicial. Corrige carrossel baseado em revisão, adiciona `fixSummary`. |

---

## 6. generate-summary (CompanyProfile)

### Identificação

| Campo | Valor |
|---|---|
| **Nome** | `generate-summary` |
| **Versão atual** | `1.0.0` |
| **Arquivo** | `organization.service.ts` — método `generateCompanySummary()` (linha ~631) |
| **Schema Zod** | N/A (parsing manual). Schema relacionado: `schemas/brand-dna-extraction.schema.ts` (não utilizado diretamente) |
| **Endpoint** | `POST /v1/chat/completions` (OpenAI) |

### Objetivo

Gerar um resumo empresarial (CompanyProfile) a partir de dados estruturados do perfil + texto extraído do site da empresa. Também gera pilares de conteúdo e ideias de post.

### Inputs (CompanyProfileSummaryDto)

| Parâmetro | Tipo | Tamanho | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | `string` | max 80 | ❌ | ID do perfil (para atualização) |
| `companyName` | `string` | max 120 | ❌ | Nome da empresa |
| `website` | `string` | max 300 | ✅ | URL do site (extrai conteúdo) |
| `industry` | `string` | max 160 | ❌ | Indústria |
| `targetAudience` | `string` | max 240 | ❌ | Público-alvo |
| `productsOrServices` | `string` | max 500 | ❌ | Produtos/serviços |
| `differentials` | `string` | max 500 | ❌ | Diferenciais |
| `toneOfVoice` | `string` | max 180 | ❌ | Tom de voz |
| `summary` | `string` | max 4000 | ❌ | Resumo existente (merge) |
| `visualIdentitySummary` | `string` | max 4000 | ❌ | Identidade visual |
| `brandColors` | `string` | max 240 | ❌ | Cores da marca |
| `brandFonts` | `string` | max 240 | ❌ | Fontes da marca |
| `defaultCta` | `string` | max 240 | ❌ | CTA padrão |
| `forbiddenTerms` | `string` | max 500 | ❌ | Termos proibidos |
| `contentPreferences` | `string` | max 1000 | ❌ | Preferências de conteúdo |
| `visualIdentityAssets` | `array` | — | ❌ | Assets visuais |
| `brandPalettes` | `array` | — | ❌ | Paletas de cores |
| `brandFontPresets` | `array` | — | ❌ | Presets de fontes |

### Output esperado

```json
{
  "summary": "resumo em portugues (entre 120 e 280 palavras) explicando o negocio, publico, dores e proposta de valor",
  "contentPillars": ["pilar 1", "pilar 2", "pilar 3", "pilar 4"],
  "postIdeas": ["ideia 1", "ideia 2", "ideia 3", "ideia 4", "ideia 5", "ideia 6", "ideia 7", "ideia 8"]
}
```

### Configuração do Modelo

| Parâmetro | Valor |
|---|---|
| **Modelo padrão** | `gpt-4.1-mini` |
| **Temperatura** | `0.4` (baixa para factualidade) |
| **response_format** | `json_object` |
| **Timeout** | 120s |

### System Prompt

```
Voce e estrategista de marketing B2B/B2C. Gere um resumo empresarial claro,
factual e util para criacao de posts em redes sociais. Retorne apenas JSON
valido.
```

### User Prompt (template)

```
Analise os dados da empresa e o texto do site.

Dados estruturados:
{JSON.stringify(baseProfile)}

Texto do site (pode estar truncado):
{websiteText.slice(0, 12000)}

Retorne exatamente este JSON:
{
  "summary": "resumo em portugues (entre 120 e 280 palavras) explicando o negocio, publico, dores e proposta de valor",
  "contentPillars": ["pilar 1", "pilar 2", "pilar 3", "pilar 4"],
  "postIdeas": ["ideia 1 de post carrossel", "ideia 2", "ideia 3", "ideia 4", "ideia 5", "ideia 6", "ideia 7", "ideia 8"]
}

Regras: sem exageros, sem promessas absolutas, linguagem natural pt-BR, ideias
objetivas e acionaveis. Se houver Brand Kit, identidade visual, termos proibidos
ou preferencias de conteudo, preserve esse contexto no resumo e nas ideias.
```

### Schema de Validação (Zod)

Não há validação Zod para este prompt no código atual. O parsing é manual (`JSON.parse`). O schema `BrandDnaExtractionSchema` existe em `schemas/brand-dna-extraction.schema.ts` com estrutura diferente (mais detalhada), mas **não é utilizado** neste fluxo.

### Histórico de versões

| Versão | Data | Mudanças |
|---|---|---|
| `1.0.0` | — | Versão inicial. Extrai conteúdo do site, mescla com dados do perfil, gera resumo + pilares + ideias. |

---

## 7. generate-visual-identity

### Identificação

| Campo | Valor |
|---|---|
| **Nome** | `generate-visual-identity` |
| **Versão atual** | `1.0.0` |
| **Arquivo** | `organization.service.ts` — método `generateCompanyVisualIdentity()` (linha ~705) |
| **Schema Zod** | N/A (retorno textual) |
| **Endpoint** | `POST /v1/responses` (OpenAI Responses API — **não** chat completions) |

### Objetivo

Analisar imagens de identidade visual da empresa (logotipos, paletas, assets) e gerar um guia textual descritivo para uso na criação de posts e carrosséis.

### Inputs

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` (no DTO) | `string` | ❌ | ID do perfil |
| `visualIdentityAssets` | `Array<{name, type, dataUrl, description}>` | ✅ (mín 1) | Imagens da identidade visual (data URLs) |
| `textModel` | N/A | — | Usa env `AI_GENERATE_OPENAI_REFERENCE_DESCRIPTION_MODEL` |

### Output esperado

Texto livre em português (até 4000 caracteres, solicitado com max 1800), sem JSON. Guia prático com:
- Paleta de cores
- Tipografia percebida
- Composição
- Estilo fotográfico/ilustrativo
- Uso de logo
- Textura e atmosfera
- Hierarquia visual
- Elementos recorrentes
- O que manter e o que evitar

### Configuração do Modelo

| Parâmetro | Valor |
|---|---|
| **Modelo primário** | `gpt-image-1.5` (env: `AI_GENERATE_OPENAI_REFERENCE_DESCRIPTION_MODEL`) |
| **Modelo fallback** | `gpt-4.1-mini` (env: `AI_GENERATE_OPENAI_REFERENCE_DESCRIPTION_FALLBACK_MODEL`) |
| **Temperatura** | Default do modelo (não especificada) |
| **max_output_tokens** | `700` |
| **Endpoint** | `/v1/responses` (OpenAI Responses API — multimodal) |
| **Timeout** | 120s |

### Prompt (User message — sem system prompt separado)

```
Analise estas imagens enviadas como identidade visual de uma empresa. Retorne em
português um guia prático, sem JSON, com no máximo 1800 caracteres. Foque em:
paleta de cores, tipografia percebida, composição, estilo fotográfico/ilustrativo,
uso de logo, textura, atmosfera, hierarquia visual, elementos recorrentes, o que
manter e o que evitar. Não copie marcas de terceiros; transforme em direção
visual reutilizável para posts e carrosséis.
```

As imagens (até 6) são anexadas como `input_image` no array `content`.

### Schema de Validação (Zod)

N/A — o retorno é texto livre, validado apenas por `slice(0, 4000)`.

### Fallback

Se o modelo primário falhar, tenta o `fallbackModel`. Se ambos falharem, lança `HttpException`.

### Histórico de versões

| Versão | Data | Mudanças |
|---|---|---|
| `1.0.0` | — | Versão inicial. Usa Responses API (multimodal). Suporte a fallback de modelo. Até 6 imagens por chamada. |

---

## Relação Schemas Zod × Prompts

| Schema | Versão | Usado por | Status |
|---|---|---|---|
| `carousel-idea.schema.ts` | `1.0.0` | carousel-ideas | ⚠️ Schema tem campos extras (`templateSuggestion`, `platformSuggestion`, `score`) não usados no prompt |
| `carousel-plan.schema.ts` | `1.0.0` | carousel-plan, carousel-fix | ✅ Compatível (carousel-fix adiciona `fixSummary` extra) |
| `caption-package.schema.ts` | `1.0.0` | carousel-caption | ⚠️ Schema tem `platform` não retornado pelo prompt |
| `editorial-review.schema.ts` | `1.0.0` | carousel-review | ❌ Schema diverge do formato do prompt (`summary` vs `verdict`, `type` vs `severity`, etc.) |
| `brand-dna-extraction.schema.ts` | `1.0.0` | generate-summary | ❌ Schema não é usado no fluxo; prompt retorna formato diferente |
| `template-recommendation.schema.ts` | `1.0.0` | N/A | Schema registrado mas sem prompt correspondente no service |

> **Nenhum prompt usa os schemas Zod para validação da resposta.** Todos fazem parsing manual com `parseJsonPayload()` + extração de campos. Os schemas existem como documentação/registro e para uso futuro.

---

## Glossário de Variáveis de Ambiente

| Variável | Default | Usado em |
|---|---|---|
| `AI_GENERATE_OPENAI_API_KEY` | — | Todos |
| `AI_GENERATE_OPENAI_BASE_URL` | `https://api.openai.com` | Todos |
| `AI_GENERATE_OPENAI_TEXT_MODEL` | `gpt-4.1-mini` | carousel-ideas, carousel-plan, carousel-caption, carousel-review, carousel-fix, generate-summary |
| `AI_GENERATE_TIMEOUT_MS` | `120000` | Todos |
| `AI_GENERATE_OPENAI_REFERENCE_DESCRIPTION_MODEL` | `gpt-image-1.5` | generate-visual-identity |
| `AI_GENERATE_OPENAI_REFERENCE_DESCRIPTION_FALLBACK_MODEL` | `gpt-4.1-mini` | generate-visual-identity |
| `AI_GENERATE_USD_TO_BRL` | `5.5` | Custo |
| `AI_GENERATE_PRICE_*` | Vários | Custo |
