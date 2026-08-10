# 13 - Mapa de arquivos e ownership

Este mapa distingue o que ja existe do que permanece como alvo das proximas
fases. O codigo implementado deve manter o escopo por organizacao e reutilizar
os modulos existentes.

## Documentacao

```text
docs/chat-studio/
|- README.md
|- 00-overview.md
|- 01-phase-0-discovery.md
|- 02-phase-1-ux.md
|- 03-phase-2-conversation-foundation.md
|- 04-phase-3-ai-orchestration.md
|- 05-phase-4-artifacts.md
|- 06-phase-5-content-capabilities.md
|- 07-phase-6-video-pipeline.md
|- 08-phase-7-brand-resources.md
|- 09-phase-8-publishing.md
|- 10-phase-9-quality-security.md
|- 11-phase-10-rollout.md
|- 12-definition-of-done.md
|- 13-file-map.md
|- 14-test-matrix.md
|- 15-sequencing.md
`- 16-implementation-status.md
```

## Frontend implementado

```text
apps/frontend/src/components/chat-studio/chat-studio.page.tsx
apps/frontend/src/components/agents/agent.chat.tsx
apps/frontend/src/components/agents/agent.input.tsx
apps/frontend/src/app/(app)/(site)/studio/page.tsx
apps/frontend/src/app/(app)/(site)/studio/[id]/page.tsx
```

Responsabilidades: layout do Chat Studio, conversas, painel de artefatos,
estado de jobs, prompt inicial, anexos de midia existentes, cancelamento da
resposta e aviso de falha do provedor.

## Backend implementado

```text
apps/backend/src/api/routes/copilot.controller.ts
apps/backend/src/api/routes/studio.controller.ts
apps/backend/src/api/api.module.ts
libraries/nestjs-libraries/src/chat/studio/studio-artifact.service.ts
libraries/nestjs-libraries/src/chat/studio/studio-artifact.service.spec.ts
libraries/nestjs-libraries/src/chat/tools/content.studio.tool.ts
libraries/nestjs-libraries/src/chat/tools/studio.artifact.tool.ts
libraries/nestjs-libraries/src/chat/tools/creative.engine.tool.ts
libraries/nestjs-libraries/src/chat/load.tools.service.ts
libraries/nestjs-libraries/src/chat/tools/tool.list.ts
```

Responsabilidades: memoria do Mastra, tools do chat, persistencia de artefatos,
versionamento, eventos, anexos, autorizacao e delegacao ao Creative Engine.

## Banco de dados implementado

```text
libraries/nestjs-libraries/src/database/prisma/schema.prisma
libraries/nestjs-libraries/src/database/prisma/migrations/20260809170000_add_chat_studio_artifacts/migration.sql
```

Modelos adicionados:

- `StudioArtifact`;
- `StudioArtifactVersion`;
- `StudioArtifactEvent`;
- `StudioAttachment`.

## Modulos existentes reutilizados

```text
libraries/nestjs-libraries/src/creative-engine/
libraries/nestjs-libraries/src/database/prisma/short-video/
libraries/nestjs-libraries/src/database/prisma/brands/
libraries/nestjs-libraries/src/database/prisma/content-ideas/
libraries/nestjs-libraries/src/database/prisma/carousel-projects/
```

Esses modulos cobrem jobs, providers, direitos, exportacao, publicacao,
avaliacao, creditos, Brand DNA, ideias e carrosseis.

## Alvos ainda nao materializados

```text
libraries/nestjs-libraries/src/chat/studio/intent-router.ts
libraries/nestjs-libraries/src/chat/studio/creative-planner.ts
libraries/nestjs-libraries/src/chat/studio/context-builder.ts
libraries/nestjs-libraries/src/chat/studio/memory.service.ts
apps/frontend/src/components/chat-studio/approval-dialog.tsx
apps/frontend/src/components/chat-studio/credit-confirmation.tsx
```

Antes de criar esses arquivos, verificar se a capacidade ja esta coberta por
CopilotKit, Mastra ou Creative Engine para evitar duplicacao de ownership.
