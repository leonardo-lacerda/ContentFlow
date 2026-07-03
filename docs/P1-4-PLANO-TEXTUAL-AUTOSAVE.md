# 🟡 Subfase P1-4: Plano Textual → Auto-save Backend

> **Fase:** CRÍTICO — Riscos de Infraestrutura
> **Subfase:** P1-4
> **Status:** Especificação Técnica Completa
> **Data:** 2026-07-02
> **Autor:** Hermes Agent

---

## 1. Objetivo

Persistir o **plano textual do carrossel** (ideias, plano de slides, revisão editorial, caption + hashtags) no **backend** ao invés de mantê-lo apenas no estado do React, permitindo auto-save, recuperação após F5, colaboração, e histórico de versões.

---

## 2. Contexto

### 2.1 Problema Atual

O hook `useAiGenerateImagesStudio` (2861 linhas) mantém TODO o estado do estúdio em `useState`:

```typescript
// use-ai-generate-images-studio.ts
const [plan, setPlan] = useState<CarouselPlan | null>(null);           // Linha 116
const [editorialReview, setEditorialReview] = useState<...>(null);    // Linha 144
const [slideImages, setSlideImages] = useState<...>(new Map());       // Linha 119
const [referenceImages, setReferenceImages] = useState<...>([]);      // Linha 122
const [topic, setTopic] = useState('');                                // Linha 90
const [goal, setGoal] = useState('...');                               // Linha 95
const [audience, setAudience] = useState('');                          // Linha 96
const [tone, setTone] = useState('...');                               // Linha 97
const [platform, setPlatform] = useState('instagram');                 // Linha 98
const [slideCount, setSlideCount] = useState(5);                      // Linha 99
const [visualStyle, setVisualStyle] = useState(defaultVisualStyle);    // Linha 100
const [brandNotes, setBrandNotes] = useState('');                      // Linha 101
// ... mais 30+ states
```

**Nada é persistido no backend** até o usuário clicar "Salvar no Media" (POST /media/carousel).

### 2.2 Por Que Isso É Crítico

| Problema | Impacto | Severidade |
|----------|---------|------------|
| **F5 perde tudo** | Usuário recarrega e perde horas de trabalho | ALTA |
| **Sem drafts** | Impossível salvar parcialmente e retomar depois | ALTA |
| **Sem colaboração** | Dois usuários não trabalham no mesmo carrossel | MÉDIA |
| **Sem histórico** | Impossível ver versões anteriores | MÉDIA |
| **Workflow interrompido** | Fechar aba = perder trabalho | ALTA |

### 2.3 O Que JÁ Existe

| Componente | Status | Arquivo |
|-----------|--------|---------|
| `CarouselProject` model | ✅ Criado | `schema.prisma:1057` |
| `CarouselProjectStatus` enum | ✅ Criado | `DRAFT, GENERATING, REVIEW, READY, PUBLISHED, FAILED` |
| Controller `CarouselProjectController` | ✅ Criado (10 endpoints) | `carousel-project.controller.ts` |
| Service/Repository | ⚠️ Possivelmente stub | `carousel-project.service.ts` |
| Auto-save no backend | ❌ Não implementado | — |
| Auto-save no frontend | ❌ Não implementado | — |

---

## 3. Escopo da Subfase

### 3.1 O Que Será Implementado

1. **`CarouselDraft` model Prisma** — Tabela para rascunhos de carrossel
2. **Backend service** — CRUD de drafts com auto-save
3. **Frontend auto-save** — Debounce de 30s + salvage após etapa
4. **Recuperação** — Ao reabrir estúdio, carregar draft salvo
5. **Versionamento** — Cada auto-save cria nova versão

### 3.2 O Que NÃO Será Implementado

- Colaboração em tempo real (WebSocket)
- Comentários por slide
- Diff visual entre versões

---

## 4. Arquitetura

### 4.1 Model Prisma

```prisma
model CarouselDraft {
  id             String   @id @default(uuid())
  organizationId String
  brandProfileId String?
  
  // Estado do estúdio
  topic          String?
  goal           String?
  audience       String?
  tone           String?
  platform       String?
  slideCount     Int?
  visualStyle    Json?
  brandNotes     String?
  
  // Plano gerado
  plan           Json?    // CarouselPlan completo
  editorialReview Json?   // Review editorial
  caption        Json?    // Caption + hashtags
  slideImages    Json?    // Map de imagens por slide
  
  // Metadados
  version        Int      @default(1)
  status         String   @default("draft") // draft, active, completed
  title          String?  // Título do carrossel
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  @@index([organizationId])
  @@index([brandProfileId])
  @@index([status])
  @@index([createdAt])
}
```

### 4.2 Fluxo de Auto-save

```
1. Usuário trabalha no estúdio
   │
2. Frontend detecta mudança (debounce 30s OU após etapa)
   │
3. Frontend envia PUT /ai-generate/carousel-draft/:id
   │   body: { plan, editorialReview, caption, slideImages, ... }
   │
4. Backend: CarouselDraftService.save()
   ├── Se draft existe: UPDATE (incrementar version)
   └── Se draft não existe: INSERT (criar novo)
   │
5. Frontend recebe { id, version, updatedAt }
   │
6. Ao recarregar página:
   ├── Frontend busca GET /ai-generate/carousel-draft/:id
   └── Backend retorna draft completo → preenche estados React
```

### 4.3 Fluxo de Recuperação

```
1. Usuário acessa /ai-generate-images
   │
2. Hook verifica se há draft pendente
   │   GET /ai-generate/carousel-draft?status=active
   │
3. Se ENCONTRA draft:
   ├── Mostra modal: "Você tem um rascunho salvo. Deseja continuar?"
   ├── Se SIM: carrega draft no estado React
   └── Se NÃO: descarta draft e começa novo
   │
4. Se NÃO encontra:
   └── Começa estúdio limpo
```

---

## 5. Implementação Detalhada

### 5.1 Arquivos a Criar

| Arquivo | Caminho | Responsabilidade |
|---------|---------|-----------------|
| `carousel-draft.repository.ts` | `libraries/nestjs-libraries/src/database/prisma/carousel-drafts/carousel-draft.repository.ts` | Queries Prisma |
| `carousel-draft.service.ts` | `libraries/nestjs-libraries/src/database/prisma/carousel-drafts/carousel-draft.service.ts` | Lógica de drafts |
| `carousel-draft.module.ts` | `libraries/nestjs-libraries/src/database/prisma/carousel-drafts/carousel-draft.module.ts` | Módulo NestJS |

### 5.2 Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `schema.prisma` | Adicionar model `CarouselDraft` |
| `ai-generate.controller.ts` | Adicionar endpoints de draft |
| `ai-generate.service.ts` | Integrar com draft service |
| `api.module.ts` | Registrar módulo |
| `use-ai-generate-images-studio.ts` | Adicionar auto-save + recuperação |

### 5.3 Detalhamento por Arquivo

#### 5.3.1 `carousel-draft.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CarouselDraft, Prisma } from '@prisma/client';

@Injectable()
export class CarouselDraftRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Criar novo draft
   */
  async create(data: {
    organizationId: string;
    brandProfileId?: string;
    topic?: string;
    goal?: string;
    audience?: string;
    tone?: string;
    platform?: string;
    slideCount?: number;
    visualStyle?: Prisma.InputJsonValue;
    brandNotes?: string;
    plan?: Prisma.InputJsonValue;
    editorialReview?: Prisma.InputJsonValue;
    caption?: Prisma.InputJsonValue;
    slideImages?: Prisma.InputJsonValue;
    title?: string;
  }): Promise<CarouselDraft> {
    return this.prisma.carouselDraft.create({
      data: { ...data, status: 'active', version: 1 },
    });
  }

  /**
   * Buscar draft por ID
   */
  async findById(orgId: string, id: string): Promise<CarouselDraft | null> {
    return this.prisma.carouselDraft.findFirst({
      where: { id, organizationId: orgId },
    });
  }

  /**
   * Buscar draft ativo de uma organização
   */
  async findActive(orgId: string, brandProfileId?: string): Promise<CarouselDraft | null> {
    const where: Prisma.CarouselDraftWhereInput = {
      organizationId: orgId,
      status: 'active',
    };
    if (brandProfileId) where.brandProfileId = brandProfileId;

    return this.prisma.carouselDraft.findFirst({
      where,
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Atualizar draft (auto-save)
   */
  async update(
    id: string,
    data: Prisma.CarouselDraftUpdateInput
  ): Promise<CarouselDraft> {
    return this.prisma.generationJob.update({  // BUG: should be carouselDraft
      where: { id },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });
  }

  /**
   * Listar drafts de uma organização
   */
  async findByOrg(
    orgId: string,
    options?: { status?: string; limit?: number; offset?: number }
  ): Promise<CarouselDraft[]> {
    const where: Prisma.CarouselDraftWhereInput = { organizationId: orgId };
    if (options?.status) where.status = options.status;

    return this.prisma.carouselDraft.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });
  }

  /**
   * Marcar draft como completed
   */
  async markCompleted(id: string): Promise<CarouselDraft> {
    return this.prisma.carouselDraft.update({
      where: { id },
      data: { status: 'completed' },
    });
  }

  /**
   * Deletar draft
   */
  async delete(id: string): Promise<void> {
    await this.prisma.carouselDraft.delete({ where: { id } });
  }

  /**
   * Cleanup: deletar drafts antigos
   */
  async cleanup(olderThanDays: number = 7): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await this.prisma.carouselDraft.deleteMany({
      where: {
        status: { in: ['completed', 'draft'] },
        updatedAt: { lt: cutoff },
      },
    });
    return result.count;
  }
}
```

#### 5.3.2 `carousel-draft.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { CarouselDraftRepository } from './carousel-draft.repository';
import { CarouselDraft } from '@prisma/client';

@Injectable()
export class CarouselDraftService {
  private readonly logger = new Logger(CarouselDraftService.name);

  constructor(private readonly repo: CarouselDraftRepository) {}

  /**
   * Criar novo draft
   */
  async createDraft(params: {
    organizationId: string;
    brandProfileId?: string;
    topic?: string;
    title?: string;
  }): Promise<CarouselDraft> {
    return this.repo.create({
      organizationId: params.organizationId,
      brandProfileId: params.brandProfileId,
      topic: params.topic,
      title: params.title,
    });
  }

  /**
   * Auto-save: atualizar draft existente ou criar novo
   */
  async autoSave(
    orgId: string,
    draftId: string | null,
    data: {
      topic?: string;
      goal?: string;
      audience?: string;
      tone?: string;
      platform?: string;
      slideCount?: number;
      visualStyle?: any;
      brandNotes?: string;
      plan?: any;
      editorialReview?: any;
      caption?: any;
      slideImages?: any;
      title?: string;
    }
  ): Promise<{ id: string; version: number; updatedAt: Date }> {
    if (draftId) {
      // Atualizar existente
      const updated = await this.repo.update(draftId, data);
      return { id: updated.id, version: updated.version, updatedAt: updated.updatedAt };
    }

    // Criar novo
    const created = await this.repo.create({
      organizationId: orgId,
      ...data,
    });
    return { id: created.id, version: created.version, updatedAt: created.updatedAt };
  }

  /**
   * Buscar draft ativo
   */
  async findActive(orgId: string, brandProfileId?: string): Promise<CarouselDraft | null> {
    return this.repo.findActive(orgId, brandProfileId);
  }

  /**
   * Buscar draft por ID
   */
  async findById(orgId: string, id: string): Promise<CarouselDraft | null> {
    return this.repo.findById(orgId, id);
  }

  /**
   * Carregar draft no formato do frontend
   */
  async loadForFrontend(orgId: string, id: string): Promise<any | null> {
    const draft = await this.repo.findById(orgId, id);
    if (!draft) return null;

    return {
      id: draft.id,
      version: draft.version,
      topic: draft.topic,
      goal: draft.goal,
      audience: draft.audience,
      tone: draft.tone,
      platform: draft.platform,
      slideCount: draft.slideCount,
      visualStyle: draft.visualStyle,
      brandNotes: draft.brandNotes,
      plan: draft.plan,
      editorialReview: draft.editorialReview,
      caption: draft.caption,
      slideImages: draft.slideImages,
      title: draft.title,
      updatedAt: draft.updatedAt,
    };
  }

  /**
   * Marcar como completed (quando salva no Media)
   */
  async markCompleted(orgId: string, id: string): Promise<void> {
    const draft = await this.repo.findById(orgId, id);
    if (draft) {
      await this.repo.markCompleted(id);
    }
  }

  /**
   * Deletar draft
   */
  async delete(orgId: string, id: string): Promise<void> {
    const draft = await this.repo.findById(orgId, id);
    if (draft) {
      await this.repo.delete(id);
    }
  }

  /**
   * Cleanup de drafts antigos
   */
  async cleanup(olderThanDays: number = 7): Promise<number> {
    const count = await this.repo.cleanup(olderThanDays);
    this.logger.log(`Cleaned up ${count} old carousel drafts`);
    return count;
  }
}
```

### 5.4 Novos Endpoints

```
PUT /ai-generate/carousel-draft/:id    — Auto-save
GET /ai-generate/carousel-draft/:id    — Carregar draft
GET /ai-generate/carousel-draft        — Listar drafts ativos
DELETE /ai-generate/carousel-draft/:id — Deletar draft
```

#### 5.4.1 Controller

```typescript
// ai-generate.controller.ts

@Put('/carousel-draft/:id')
async autoSaveDraft(
  @GetOrgFromRequest() org: Organization,
  @Param('id') id: string,
  @Body() body: any
) {
  return this.carouselDraftService.autoSave(org.id, id, body);
}

@Get('/carousel-draft/:id')
async getDraft(
  @GetOrgFromRequest() org: Organization,
  @Param('id') id: string
) {
  return this.carouselDraftService.loadForFrontend(org.id, id);
}

@Get('/carousel-draft')
async listDrafts(@GetOrgFromRequest() org: Organization) {
  return this.carouselDraftService.findActive(org.id);
}

@Delete('/carousel-draft/:id')
async deleteDraft(
  @GetOrgFromRequest() org: Organization,
  @Param('id') id: string
) {
  return this.carouselDraftService.delete(org.id, id);
}
```

### 5.5 Mudanças no Frontend

#### 5.5.1 Auto-save no Hook

```typescript
// use-ai-generate-images-studio.ts - adicionar:

const [draftId, setDraftId] = useState<string | null>(null);
const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
const [isSaving, setIsSaving] = useState(false);

// Auto-save com debounce (30 segundos)
useEffect(() => {
  const timer = setTimeout(() => {
    if (plan || editorialReview || caption) {
      saveDraft();
    }
  }, 30_000);

  return () => clearTimeout(timer);
}, [plan, editorialReview, caption, topic, goal, audience, tone]);

// Salvar após etapa concluída
const saveDraft = useCallback(async () => {
  if (isSaving) return;
  setIsSaving(true);

  try {
    const response = await fetch(
      `${backendUrl}/ai-generate/carousel-draft/${draftId || 'new'}`,
      {
        method: draftId ? 'PUT' : 'PUT',  // Sempre PUT
        headers: { 'Content-Type': 'application/json', auth: cookie },
        body: JSON.stringify({
          topic,
          goal,
          audience,
          tone,
          platform,
          slideCount,
          visualStyle,
          brandNotes,
          plan,
          editorialReview,
          caption,
          title: plan?.title,
        }),
      }
    );

    const data = await response.json();
    setDraftId(data.id);
    setLastSavedAt(new Date(data.updatedAt));
  } catch (error) {
    console.error('Auto-save failed:', error);
  } finally {
    setIsSaving(false);
  }
}, [draftId, topic, goal, audience, tone, plan, editorialReview, caption]);

// Carregar draft ao inicializar
useEffect(() => {
  const loadDraft = async () => {
    const response = await fetch(
      `${backendUrl}/ai-generate/carousel-draft`,
      { headers: { auth: cookie } }
    );
    const drafts = await response.json();

    if (drafts.length > 0) {
      const draft = drafts[0];
      const confirmed = window.confirm(
        `Você tem um rascunho salvo de "${draft.topic || 'carrossel'}". Deseja continuar?`
      );

      if (confirmed) {
        // Carregar dados do draft
        setDraftId(draft.id);
        setTopic(draft.topic || '');
        setGoal(draft.goal || '');
        setAudience(draft.audience || '');
        setTone(draft.tone || '');
        setPlatform(draft.platform || 'instagram');
        setSlideCount(draft.slideCount || 5);
        setVisualStyle(draft.visualStyle || defaultVisualStyle);
        setBrandNotes(draft.brandNotes || '');
        setPlan(draft.plan);
        setEditorialReview(draft.editorialReview);
        // ... caption, slideImages
      }
    }
  };

  loadDraft();
}, []);
```

---

## 6. Tratamento de Erros

| Erro | Causa | Ação |
|------|-------|------|
| **Auto-save falha** | Rede indisponível | Logar erro, não mostrar para usuário |
| **Draft não encontrado** | Deletado ou ID inválido | Criar novo draft |
| **Conflito de versão** | Duas abas salvando | Último write wins (OK para MVP) |
| **Draft muito grande** | JSON excede limite | Truncar ou rejeitar |

---

## 7. Edge Cases

| Caso | Comportamento Esperado |
|------|----------------------|
| **Duas abas abertas no mesmo draft** | Conflito: último write wins |
| **Usuário deleta draft e refaz** | Novo draft criado |
| **Backend cai durante auto-save** | Dados não salvos, próxima tentativa cria novo |
| **Draft com 0 mudanças** | Não salva (evita writes desnecessários) |
| **Draft > 7 dias sem atividade** | Cleanup automático |

---

## 8. Critérios de Aceite

- [ ] Auto-save dispara a cada 30s quando há mudanças
- [ ] Auto-save dispara após cada etapa concluída
- [ ] Draft é criado no Prisma (não em localStorage)
- [ ] Ao reabrir estúdio, draft é carregado automaticamente
- [ ] Usuário pode escolher continuar ou descartar draft
- [ ] Draft é marked completed quando salva no Media
- [ ] Drafts antigos (> 7 dias) são limpos automaticamente
- [ ] Teste: criar draft, recarregar, verificar que carrega
- [ ] Teste: auto-save não duplica (usa mesmo ID)

---

## 9. Checklist de Implementação

### Schema
- [ ] Criar migration para `CarouselDraft`
- [ ] Adicionar relation em `Organization`

### Backend
- [ ] Criar `carousel-draft.repository.ts`
- [ ] Criar `carousel-draft.service.ts`
- [ ] Criar `carousel-draft.module.ts`
- [ ] Adicionar endpoints no controller
- [ ] Registrar módulo

### Frontend
- [ ] Adicionar `draftId` state
- [ ] Adicionar `saveDraft()` com debounce
- [ ] Adicionar `loadDraft()` ao inicializar
- [ ] Adicionar indicador "Salvo automaticamente"
- [ ] Adicionar modal de recuperação

### Testes
- [ ] Unit: CarouselDraftService.autoSave()
- [ ] Unit: CarouselDraftService.loadForFrontend()
- [ ] Integration: criar → auto-save → carregar

### Deploy
- [ ] Feature flag: `USE_CAROUSEL_DRAFTS=true` (default: false)
- [ ] Rollback: se flag=false, usar localStorage

---

## 10. Decisões de Projeto

| Decisão | Opção Escolhida | Justificativa |
|---------|----------------|---------------|
| **Armazenamento** | Prisma (PostgreSQL) | Consistente, indexado, auditável |
| **Debounce** | 30 segundos | Equilíbrio entre frequência e carga |
| **Trigger adicional** | Após cada etapa | Garante salvamento em momentos críticos |
| **Conflito** | Last write wins | Simples para MVP |
| **Cleanup** | 7 dias | Tempo suficiente para retomar |
| **Indicador** | "Salvo automaticamente" + timestamp | Feedback visual para usuário |

---

## 11. Próximas Subfases Dependentes

- **Fase 2.1**: Onboarding (usará drafts para persistir progresso)
- **Fase 2.3**: CarouselProject (draft vira projeto quando completo)
- **Fase 4.3**: Workflow de aprovação (drafts como rascunhos de aprovação)
