# 🟡 Subfase P1-5: CarouselProject como Entidade

> **Fase:** CRÍTICO — Riscos de Infraestrutura
> **Subfase:** P1-5
> **Status:** Especificação Técnica Completa
> **Data:** 2026-07-02
> **Autor:** Hermes Agent

---

## 1. Objetivo

Transformar carrosséis de slides de **mídia individual com metadados no campo `alt`** para uma **entidade `CarouselProject` própria** no banco de dados, com status editorial, vínculo com BrandProfile/ContentIdea, e script de migração dos dados legados.

---

## 2. Contexto

### 2.1 Problema Atual

Carrosséis são salvos via `POST /media/carousel` onde:
1. Cada slide vira um registro de mídia individual
2. Metadados do projeto são armazenados no campo `alt` com prefixo `__CONTENTFLOW_CAROUSEL_PROJECT__:`
3. A função `parseCarouselProjectMetadata()` faz parse desse campo

```typescript
// media.repository.ts linha 6
const CAROUSEL_PROJECT_PREFIX = '__CONTENTFLOW_CAROUSEL_PROJECT__:';

// media.repository.ts linha 8
function parseCarouselProjectMetadata(alt?: string | null) {
  if (!alt?.startsWith(CAROUSEL_PROJECT_PREFIX)) return null;
  const json = alt.slice(CAROUSEL_PROJECT_PREFIX.length);
  return JSON.parse(json);
}
```

### 2.2 Por Que Isso É Crítico

| Problema | Impacto | Severidade |
|----------|---------|------------|
| **Vínculo frágil** | Slides são mídia individual, não entidade | ALTA |
| **Sem status editorial** | Não há draft/review/approved/published | ALTA |
| **Sem vínculo com marca** | Não sabe qual BrandProfile gerou | ALTA |
| **Sem vínculo com ideia** | Não sabe qual ContentIdea originou | MÉDIA |
| **Query ineficiente** | Listar carrosséis exige scan de toda mídia | MÉDIA |
| **Sem revisões** | Não há versionamento | MÉDIA |

### 2.3 Model CarouselProject (Já Existente)

```prisma
model CarouselProject {
  id             String   @id @default(uuid())
  organizationId String
  brandProfileId String?
  contentIdeaId  String?
  title          String?
  caption        String?
  hashtags       String?
  status         CarouselProjectStatus @default(DRAFT)
  approvalStatus ApprovalStatus @default(NONE)
  slides         Json?    // Array de slides
  metadata       Json?    // Dados extras
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  organization   Organization @relation(...)
  brandProfile   BrandProfile? @relation(...)
  contentIdea    ContentIdea? @relation(...)
  editorialSlots EditorialSlot[]
  performances   CarouselPerformance[]
  posts          Post[]
  
  @@index([organizationId])
  @@index([brandProfileId])
  @@index([contentIdeaId])
  @@index([status])
}
```

**Enums:**
```prisma
enum CarouselProjectStatus {
  DRAFT
  GENERATING
  REVIEW
  READY
  PUBLISHED
  FAILED
}

enum ApprovalStatus {
  NONE
  PENDING
  APPROVED
  REJECTED
}
```

---

## 3. Escopo da Subfase

### 3.1 O Que Será Implementado

1. **CarouselProjectService completo** — CRUD com status workflow
2. **CarouselProjectRepository** — Queries Prisma
3. **Script de migração** — Popular CarouselProject a partir de mídia legada
4. **Dual-write** — Salvar em AMBOS (CarouselProject + mídia) durante transição
5. **Endpoints** — CRUD completo para frontend

### 3.2 O Que NÃO Será Implementado

- Editor visual de slides (já existe no estúdio)
- Export PNG/PDF (será Fase 3.3)
- Vínculo com Post (será Fase 5.1)

---

## 4. Arquitetura

### 4.1 Fluxo de Migração

```
1. Script de migração roda
   │
2. Para cada registro de mídia com prefixo __CONTENTFLOW_CAROUSEL_PROJECT__:
   ├── Parse metadados do campo alt
   ├── Criar CarouselProject com dados do projeto
   ├── Criar slides como JSON no campo slides
   └── Vincular mídia existente (mediaId no metadata)
   │
3. Resultado: CarouselProject com slides[] e link para mídia
```

### 4.2 Fluxo de Dual-Write

```
1. Usuário salva carrossel no estúdio
   │
2. Frontend envia POST /media/carousel (formato antigo)
   │
3. Backend:
   ├── Salva mídia (formato antigo) → compatibilidade
   ├── Cria/Atualiza CarouselProject → nova entidade
   └── Retorna ambos os IDs
   │
4. Frontend pode usar qualquer um dos IDs
```

---

## 5. Implementação Detalhada

### 5.1 Arquivos a Criar

| Arquivo | Caminho |
|---------|---------|
| `carousel-project.repository.ts` | `libraries/nestjs-libraries/src/database/prisma/carousel-projects/carousel-project.repository.ts` |
| `carousel-project.service.ts` | `libraries/nestjs-libraries/src/database/prisma/carousel-projects/carousel-project.service.ts` |
| `carousel-project.module.ts` | `libraries/nestjs-libraries/src/database/prisma/carousel-projects/carousel-project.module.ts` |
| `migrate-carousel-projects.ts` | `scripts/migrate-carousel-projects.ts` |

### 5.2 Detalhamento por Arquivo

#### 5.2.1 `carousel-project.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CarouselProject, Prisma } from '@prisma/client';

@Injectable()
export class CarouselProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    organizationId: string;
    brandProfileId?: string;
    contentIdeaId?: string;
    title?: string;
    caption?: string;
    hashtags?: string[];
    slides?: Prisma.InputJsonValue;
    metadata?: Prisma.InputJsonValue;
  }): Promise<CarouselProject> {
    return this.prisma.carouselProject.create({
      data: {
        ...data,
        hashtags: data.hashtags?.join(','),
        status: 'DRAFT',
        approvalStatus: 'NONE',
      },
    });
  }

  async findById(orgId: string, id: string): Promise<CarouselProject | null> {
    return this.prisma.carouselProject.findFirst({
      where: { id, organizationId: orgId },
    });
  }

  async findByOrg(orgId: string, options?: {
    status?: string;
    brandProfileId?: string;
    limit?: number;
    offset?: number;
  }): Promise<CarouselProject[]> {
    const where: Prisma.CarouselProjectWhereInput = { organizationId: orgId };
    if (options?.status) where.status = options.status as any;
    if (options?.brandProfileId) where.brandProfileId = options.brandProfileId;

    return this.prisma.carouselProject.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });
  }

  async update(id: string, data: Prisma.CarouselProjectUpdateInput): Promise<CarouselProject> {
    return this.prisma.carouselProject.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: string): Promise<CarouselProject> {
    return this.prisma.carouselProject.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async requestApproval(id: string): Promise<CarouselProject> {
    return this.prisma.carouselProject.update({
      where: { id },
      data: { approvalStatus: 'PENDING', status: 'REVIEW' },
    });
  }

  async approve(id: string, approvedById: string): Promise<CarouselProject> {
    return this.prisma.carouselProject.update({
      where: { id },
      data: { approvalStatus: 'APPROVED', status: 'READY' },
    });
  }

  async reject(id: string, reason?: string): Promise<CarouselProject> {
    return this.prisma.carouselProject.update({
      where: { id },
      data: {
        approvalStatus: 'REJECTED',
        status: 'DRAFT',
        metadata: { rejectionReason: reason },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.carouselProject.delete({ where: { id } });
  }
}
```

#### 5.2.2 `carousel-project.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { CarouselProjectRepository } from './carousel-project.repository';
import { CarouselProject } from '@prisma/client';

@Injectable()
export class CarouselProjectService {
  private readonly logger = new Logger(CarouselProjectService.name);

  constructor(private readonly repo: CarouselProjectRepository) {}

  async create(params: {
    organizationId: string;
    brandProfileId?: string;
    contentIdeaId?: string;
    title?: string;
    caption?: string;
    hashtags?: string[];
    slides?: any[];
    metadata?: any;
  }): Promise<CarouselProject> {
    return this.repo.create(params);
  }

  async createFromIdea(
    orgId: string,
    ideaId: string,
    data: { title?: string; slides?: any[]; caption?: string; hashtags?: string[] }
  ): Promise<CarouselProject> {
    // TODO: buscar ContentIdea para obter brandProfileId
    return this.repo.create({
      organizationId: orgId,
      contentIdeaId: ideaId,
      ...data,
    });
  }

  async findById(orgId: string, id: string): Promise<CarouselProject | null> {
    return this.repo.findById(orgId, id);
  }

  async findByOrg(orgId: string, options?: any): Promise<CarouselProject[]> {
    return this.repo.findByOrg(orgId, options);
  }

  async update(orgId: string, id: string, data: any): Promise<CarouselProject> {
    const project = await this.repo.findById(orgId, id);
    if (!project) throw new Error('CarouselProject not found');
    return this.repo.update(id, data);
  }

  async updateStatus(orgId: string, id: string, status: string): Promise<CarouselProject> {
    const project = await this.repo.findById(orgId, id);
    if (!project) throw new Error('CarouselProject not found');
    return this.repo.updateStatus(id, status);
  }

  async requestApproval(orgId: string, id: string): Promise<CarouselProject> {
    const project = await this.repo.findById(orgId, id);
    if (!project) throw new Error('CarouselProject not found');
    return this.repo.requestApproval(id);
  }

  async approve(orgId: string, id: string, approvedById: string): Promise<CarouselProject> {
    const project = await this.repo.findById(orgId, id);
    if (!project) throw new Error('CarouselProject not found');
    return this.repo.approve(id, approvedById);
  }

  async reject(orgId: string, id: string, reason?: string): Promise<CarouselProject> {
    const project = await this.repo.findById(orgId, id);
    if (!project) throw new Error('CarouselProject not found');
    return this.repo.reject(id, reason);
  }

  async delete(orgId: string, id: string): Promise<void> {
    const project = await this.repo.findById(orgId, id);
    if (!project) throw new Error('CarouselProject not found');
    await this.repo.delete(id);
  }
}
```

### 5.3 Script de Migração

```typescript
#!/usr/bin/env npx ts-node
/**
 * Migração: Mídia legada → CarouselProject
 * 
 * Uso: npx ts-node scripts/migrate-carousel-projects.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PREFIX = '__CONTENTFLOW_CAROUSEL_PROJECT__:';

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('=== CarouselProject Migration ===');
  console.log(`Dry run: ${dryRun}`);

  // Buscar mídias com prefixo de carrossel
  const media = await prisma.media.findMany({
    where: {
      alt: { startsWith: PREFIX },
    },
    select: { id: true, alt: true, organizationId: true, name: true },
  });

  console.log(`Found ${media.length} carousel media items`);

  // Agrupar por projeto (baseado no nome ou metadata)
  const projects = new Map<string, any[]>();
  for (const item of media) {
    const metadata = JSON.parse(item.alt!.slice(PREFIX.length));
    const projectKey = metadata.projectId || item.name || 'unknown';
    if (!projects.has(projectKey)) projects.set(projectKey, []);
    projects.get(projectKey)!.push({ ...item, metadata });
  }

  console.log(`Found ${projects.size} unique projects`);

  let created = 0;
  for (const [key, items] of projects) {
    try {
      if (dryRun) {
        console.log(`[DRY RUN] Would create project "${key}" with ${items.length} slides`);
        created++;
        continue;
      }

      const first = items[0];
      const project = await prisma.carouselProject.create({
        data: {
          organizationId: first.organizationId,
          title: first.metadata?.title || key,
          status: 'PUBLISHED', // Dados legados já foram publicados
          slides: items.map((item) => ({
            index: item.metadata?.slideIndex || 0,
            mediaId: item.id,
            headline: item.metadata?.headline || '',
            body: item.metadata?.body || '',
            imageUrl: item.name,
          })),
        },
      });

      console.log(`✓ Created CarouselProject ${project.id} for "${key}"`);
      created++;
    } catch (error) {
      console.error(`✗ Error for "${key}": ${error}`);
    }
  }

  console.log(`\nMigration complete: ${created} projects created`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

---

## 6. Critérios de Aceite

- [ ] `CarouselProjectService.create()` cria no Prisma
- [ ] `CarouselProjectService.findById()` busca com validação de org
- [ ] `CarouselProjectService.updateStatus()` atualiza status
- [ ] `CarouselProjectService.requestApproval()` muda para PENDING
- [ ] `CarouselProjectService.approve()` muda para APPROVED/READY
- [ ] `CarouselProjectService.reject()` muda para REJECTED/DRAFT
- [ ] Script de migração cria CarouselProject a partir de mídia legada
- [ ] Script de migração é idempotente
- [ ] Dual-write: salvar em ambos durante transição

---

## 7. Checklist de Implementação

### Schema
- [ ] Verificar que CarouselProject já existe no Prisma

### Backend
- [ ] Criar repository, service, module
- [ ] Adicionar endpoints no controller
- [ ] Registrar módulo

### Migração
- [ ] Criar script de migração
- [ ] Testar --dry-run
- [ ] Rodar em staging

### Testes
- [ ] Unit: CRUD completo
- [ ] Unit: workflow de status
- [ ] Integração: migração

---

## 8. Decisões de Projeto

| Decisão | Opção Escolhida | Justificativa |
|---------|----------------|---------------|
| **Slides** | JSON no campo slides | Flexível, não exige tabela separada |
| **Status** | Enum com 6 estados | Cobertura completa do workflow |
| **Migração** | Script idempotente | Seguro para rodar múltiplas vezes |
| **Dual-write** | Ativo durante 30 dias | Permite rollback |

---

## 9. Próximas Subfases Dependentes

- **Fase 2.2**: Content Swipe (cria CarouselProject a partir de ideia)
- **Fase 2.3**: Editor visual (usa CarouselProject como base)
- **Fase 4.3**: Workflow de aprovação (usa approvalStatus)
- **Fase 5.1**: Analytics (usa CarouselPerformance vinculado)
