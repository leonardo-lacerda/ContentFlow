# Fase 4 — Geração Automática e Calendário Inteligente

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Entregar geração automática de conteúdo, calendário editorial e workflow de aprovação.

**Architecture:** Novos modelos Prisma (EditorialPlan, EditorialSlot), novos endpoints backend, novas páginas frontend, integração com Temporal para auto-generation.

**Tech Stack:** NestJS, Prisma, Next.js, React, SWR, Temporal

---

## Subfase 4.1 — Content Calendar Automático

### Task 4.1.1: Criar modelo Prisma EditorialPlan

**Objective:** Criar modelo de configuração editorial por marca

**Files:**
- Modify: `./libraries/nestjs-libraries/src/database/prisma/schema.prisma`

**Model:**
```prisma
model EditorialPlan {
  id             String   @id @default(uuid())
  brandProfileId String
  organizationId String
  name           String
  frequencyPerWeek Int    @default(3)
  platforms      String[] @default(["instagram"])
  pillars        String[] @default([])
  objectives     String[] @default([])
  languages      String[] @default(["pt-BR"])
  timezone       String   @default("America/Sao_Paulo")
  blackoutDates  String[] @default([])
  autoGenerate   Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  brandProfile   BrandProfile @relation(fields: [brandProfileId], references: [id])
  slots          EditorialSlot[]
}
```

### Task 4.1.2: Criar modelo Prisma EditorialSlot

**Objective:** Criar modelo de slots do calendário (dias com conteúdo planejado)

**Model:**
```prisma
model EditorialSlot {
  id              String   @id @default(uuid())
  editorialPlanId String
  brandProfileId  String
  organizationId  String
  scheduledDate   DateTime
  pillar          String?
  objective       String?
  platform        String   @default("instagram")
  status          EditorialSlotStatus @default(PLANNED)
  contentIdeaId   String?
  carouselProjectId String?
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  editorialPlan   EditorialPlan @relation(fields: [editorialPlanId], references: [id])
  contentIdea     ContentIdea?  @relation(fields: [contentIdeaId], references: [id])
  carouselProject CarouselProject? @relation(fields: [carouselProjectId], references: [id])
}

enum EditorialSlotStatus {
  PLANNED
  IDEAS_GENERATED
  APPROVED
  REJECTED
  CAROUSEL_CREATED
  SCHEDULED
  PUBLISHED
}
```

### Task 4.1.3: Criar migration e services

**Objective:** Migration Prisma, repository, service e controller

**Files:**
- Create: `./libraries/nestjs-libraries/src/database/prisma/editorial-plans/editorial-plan.repository.ts`
- Create: `./libraries/nestjs-libraries/src/database/prisma/editorial-plans/editorial-plan.service.ts`
- Create: `./apps/backend/src/api/routes/editorial-plans.controller.ts`
- Create: migration SQL

### Task 4.1.4: Criar DTOs

**Objective:** DTOs para CRUD do editorial plan

**Files:**
- Create: `./libraries/nestjs-libraries/src/dtos/editorial-plans/create-editorial-plan.dto.ts`
- Create: `./libraries/nestjs-libraries/src/dtos/editorial-plans/generate-calendar.dto.ts`

### Task 4.1.5: Registrar no Module

**Objective:** Registrar providers e controller nos módulos NestJS

**Files:**
- Modify: `./apps/backend/src/api/api.module.ts`
- Modify: `./libraries/nestjs-libraries/src/database/prisma/database.module.ts`

### Task 4.1.6: Criar frontend service, hooks e types

**Objective:** Service layer e hooks SWR para editorial plans

**Files:**
- Create: `./apps/frontend/src/components/editorial-plans/editorial-plans.service.ts`
- Create: `./apps/frontend/src/components/editorial-plans/editorial-plans.types.ts`
- Create: `./apps/frontend/src/components/editorial-plans/editorial-plans.hooks.ts`

### Task 4.1.7: Criar UI de configuração editorial

**Objective:** Página de configuração do plano editorial por marca

**Files:**
- Create: `./apps/frontend/src/components/editorial-plans/editorial-plan-config.component.tsx`
- Create: `./apps/frontend/src/app/(app)/(site)/editorial/page.tsx`

### Task 4.1.8: Criar geração de calendário

**Objective:** Endpoint e UI para gerar slots do calendário a partir do plano

**Backend:** POST /editorial-plans/:id/generate-calendar
- Gera slots para 30/60/90 dias baseado na frequência
- Respeita blackout dates e timezone
- Não duplica temas (usa content ideas existentes)

**Frontend:** Botão "Gerar Calendário" na página do plano

### Task 4.1.9: Criar visualização do calendário editorial

**Objective:** Timeline/lista dos slots gerados com status

**Files:**
- Create: `./apps/frontend/src/components/editorial-plans/editorial-calendar-view.component.tsx`

### Task 4.1.10: Adicionar link no sidebar

**Objective:** Link "Calendário" no sidebar

**Files:**
- Modify: `./apps/frontend/src/components/layout/top.menu.tsx`

---

## Subfase 4.2 — Auto-Generation Recorrente

### Task 4.2.1: Adicionar config de auto-generation ao EditorialPlan

**Objective:** Campos autoGenerate, generationWindow, maxCostPerMonth no modelo

### Task 4.2.2: Criar endpoint de trigger manual

**Objective:** POST /editorial-plans/:id/run-generation

### Task 4.2.3: Criar UI de configuração de auto-generation

**Objective:** Toggle + config na página do plano editorial

---

## Subfase 4.3 — Workflow de Aprovação

### Task 4.3.1: Adicionar campos de aprovação ao CarouselProject

**Objective:** approvalStatus, approvedBy, approvedAt no modelo

### Task 4.3.2: Criar endpoints de aprovação

**Objective:** POST /carousel-projects/:id/approve, POST /carousel-projects/:id/reject

### Task 4.3.3: Criar UI de aprovação

**Objective:** Botões de aprovar/rejeitar no CarouselProject

### Task 4.3.4: Bloquear publicação sem aprovação

**Objective:** Validar approvalStatus antes de agendar post
