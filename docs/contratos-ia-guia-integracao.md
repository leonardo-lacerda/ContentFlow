# Guia de Integração — Contratos de IA com Validação Zod

## Visão Geral

Este guia documenta como usar os schemas Zod para validar respostas de IA no backend. O sistema garante que as respostas das LLMs sigam contratos tipados, com fallback automático quando a validação falha.

---

## 1. Arquitetura

```
ai-response-validator.ts          ← Validador central (ponto de entrada)
├── schemas/
│   ├── index.ts                  ← Registry + re-exports
│   ├── brand-dna-extraction.schema.ts
│   ├── carousel-idea.schema.ts
│   ├── carousel-plan.schema.ts
│   ├── editorial-review.schema.ts
│   ├── caption-package.schema.ts
│   └── template-recommendation.schema.ts
```

---

## 2. Como Importar o Validador

No seu service, importe as duas funções principais:

```typescript
import {
  validateAiResponse,
  buildAiMetadata,
} from '@gitroom/nestjs-libraries/ai-generate/ai-response-validator';
```

> **Nota:** Ajuste o path de import conforme a estrutura do seu módulo. O arquivo `ai-response-validator.ts` exporta `validateAiResponse`, `buildAiMetadata`, `getPromptVersion` e o tipo `ValidationResult`.

---

## 3. Como Validar Respostas

### 3.1. Fluxo básico

```typescript
const content = data.choices?.[0]?.message?.content;

// Valida contra o schema, com 1 tentativa de reparo
const validation = validateAiResponse('carousel-plan', content, 1);

if (!validation.success) {
  Logger.warn(
    `Validation failed: ${validation.errors?.issues?.length || 0} issues`,
    'AiGenerateService'
  );
}

// Fallback: usa o dado validado ou faz parse manual
const parsed = validation.success && validation.data
  ? validation.data
  : parseJsonPayload(content);
```

### 3.2. Tipos de schema disponíveis

| Schema Key              | Descrição                          |
|-------------------------|------------------------------------|
| `brand-dna-extraction`  | Extração de DNA de marca           |
| `carousel-idea`         | Ideias de carrossel                |
| `carousel-plan`         | Plano completo de carrossel        |
| `editorial-review`      | Revisão editorial                  |
| `caption-package`       | Legenda + hashtags                 |

### 3.3. Com tipagem genérica

```typescript
interface MyCaption {
  caption: string;
  hashtags: string[];
}

const validation = validateAiResponse<MyCaption>('caption-package', content, 1);

if (validation.success && validation.data) {
  const { caption, hashtags } = validation.data;
  // Dados validados e tipados
}
```

---

## 4. Como o Fallback Funciona

O `validateAiResponse` tem três camadas de fallback:

1. **Reparo automático de JSON** — Remove markdown fences (```json), extrai conteúdo entre `{` e `}` se o parse direto falhar.
2. **Reparo baseado em erros do schema** — Se `maxRetries > 0` e a validação falhar, tenta preencher campos obrigatórios ausentes (ex: `slides` vazio vira array com 1 slide default, `title` vazio vira `'Carrossel'`).
3. **Fallback manual** — Se `validation.success === false`, o código deve usar `parseJsonPayload(content)` como fallback final.

```typescript
// Exemplo completo com fallback
const validation = validateAiResponse('carousel-plan', content, 1);

const safeData = validation.success && validation.data
  ? validation.data
  : parseJsonPayload(content);
```

---

## 5. Como Adicionar buildAiMetadata ao Resultado

Sempre que possível, inclua metadados de rastreamento no retorno:

```typescript
const result = {
  ...plan,
  provider: 'openai_official',
  model: resolvedModel,
  usage: data.usage,
  cost_estimate: estimateCostInUsdAndBrl(data.usage),
  ...buildAiMetadata('carousel-plan', resolvedModel, 'openai_official'),
};
```

O `buildAiMetadata` retorna:

```typescript
{
  model: string;
  provider: string;
  promptVersion: string;    // Versão do prompt (ex: "1.0.0")
  schemaVersion: string;    // Versão do schema Zod (ex: "1.0.0")
  usage?: Record<string, unknown>;
  costEstimate?: unknown;
}
```

---

## 6. Como Versionar Prompts

### 6.1. Schema version

Cada schema tem uma constante `VERSION` no seu arquivo `.schema.ts`. Atualize quando o schema Zod mudar (novos campos, tipos alterados).

### 6.2. Prompt version

A função `getPromptVersion(schemaType)` em `ai-response-validator.ts` mapeia cada schema type para uma versão de prompt. Atualize manualmente quando o prompt do sistema/user mudar:

```typescript
export function getPromptVersion(schemaType: SchemaType): string {
  const promptVersions: Record<SchemaType, string> = {
    'brand-dna-extraction': '1.0.0',
    'carousel-idea': '1.0.0',
    'carousel-plan': '1.0.0',
    'editorial-review': '1.0.0',
    'caption-package': '1.0.0',
  };
  return promptVersions[schemaType] || '0.0.0';
}
```

**Boas práticas:**
- Bump `promptVersion` quando mudar o texto do prompt (system + user messages).
- Bump `VERSION` no schema quando mudar a estrutura esperada do JSON.
- Ambos aparecem em `buildAiMetadata`, permitindo rastrear qual versão gerou cada resposta.

---

## 7. Exemplo de Código Completo

```typescript
import { Logger } from '@nestjs/common';
import {
  validateAiResponse,
  buildAiMetadata,
} from './ai-response-validator';

// ... dentro do método do service

const content = data.choices?.[0]?.message?.content;
if (!content) {
  throw new HttpException('No content returned', HttpStatus.BAD_GATEWAY);
}

// 1. Validar com Zod (1 retry de reparo)
const validation = validateAiResponse('carousel-plan', content, 1);

// 2. Logar falhas (não quebra o fluxo)
if (!validation.success) {
  Logger.warn(
    `Validation failed: ${validation.errors?.issues?.length || 0} issues`,
    'AiGenerateService'
  );
}

// 3. Usar dado validado ou fallback
const parsed = validation.success && validation.data
  ? validation.data as Record<string, unknown>
  : parseJsonPayload(content);

// 4. Normalizar e montar resultado
const plan = normalizeCarouselPlan(parsed, body, slideCount);

const result = {
  ...plan,
  provider: 'openai_official',
  model: resolvedModel,
  usage: data.usage,
  cost_estimate: estimateCostInUsdAndBrl(data.usage),
  ...buildAiMetadata('carousel-plan', resolvedModel, 'openai_official'),
};

return result;
```

---

## 8. Adicionando um Novo Schema

1. Crie o arquivo em `libraries/nestjs-libraries/src/ai-generate/schemas/meu-novo.schema.ts`:

```typescript
import { z } from 'zod';

export const VERSION = '1.0.0';

export const MeuNovoSchema = z.object({
  campo1: z.string(),
  campo2: z.array(z.string()),
});

export type MeuNovo = z.infer<typeof MeuNovoSchema>;

export function validate(data: unknown) {
  const result = MeuNovoSchema.safeParse(data);
  return {
    success: result.success,
    data: result.success ? result.data : null,
    errors: result.success ? null : result.error,
  };
}

export function parse(data: unknown): MeuNovo {
  return MeuNovoSchema.parse(data);
}
```

2. Registre no `schemas/index.ts` (import + export + registry entry).
3. Adicione no `ai-response-validator.ts` (mapeie no `SCHEMA_VALIDATORS`, `SCHEMA_VERSIONS` e no tipo `SchemaType`).
4. Adicione a prompt version em `getPromptVersion()`.

---

## 9. Resumo dos Métodos que Já Usam Validação Zod

| Método                          | Schema Key           | Retry | buildAiMetadata |
|--------------------------------|----------------------|-------|-----------------|
| `generateCarouselIdeas()`      | `carousel-idea`      | 1     | ❌ (não incluso) |
| `generateCarouselCaption()`    | `caption-package`    | 1     | ✅              |
| `generateCarouselPlan()`       | `carousel-plan`      | 1     | ✅              |
| `reviewCarousel()`             | `editorial-review`   | 1     | ✅              |
| `fixCarouselWithEditorialReview()` | `carousel-plan`  | 1     | ✅              |

> **Nota:** `generateCarouselIdeas()` ainda não inclui `buildAiMetadata` no retorno — pendente para futura atualização.

---

## 10. Troubleshooting

**Problema:** A validação sempre falha mesmo com JSON válido.
**Causa provável:** O schema Zod espera campos que a LLM não está gerando (ex: `imagePrompt` vs `image_prompt`).
**Solução:** Verifique o schema e o prompt — ambos precisam concordar nos nomes dos campos.

**Problema:** O fallback `parseJsonPayload` também falha.
**Causa provável:** A LLM retornou texto não-JSON (markdown, explicação extra).
**Solução:** Aumente `maxRetries` ou melhore o system prompt para forçar `response_format: { type: 'json_object' }`.

**Problema:** Quero desabilitar a validação temporariamente.
**Solução:** Passe `maxRetries = 0` e ignore `validation.success` — use sempre `parseJsonPayload` como fallback.
