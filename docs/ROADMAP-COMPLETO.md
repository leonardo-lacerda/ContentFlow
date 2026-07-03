# 🗺️ Roadmap Completo — ContentFlow

> **Gerado em:** 2026-07-02
> **Status:** Análise completa do codebase + documentação
> **Objetivo:** Mapear TUDO que pode ser desenvolvido no projeto

---

## 📊 Status Atual do Projeto

| Info | Detalhe |
|------|---------|
| **Versão** | v1.47.0 |
| **Fase do plano** | 4.2/4.3 (auto-generation + approval workflow) recém-mergiada |
| **Schema Prisma** | 47 models + 10 enums + 8 models Mastra (ignorados) |
| **Backend** | NestJS com ~15 controllers, `AiGenerateService` 1699 linhas |
| **Frontend** | Next.js App Router com 40+ componentes, hook principal 2655 linhas |
| **Orchestrator** | NestJS + Temporal (jobs de longa duração) |
| **Monorepo** | pnpm workspaces (apps/*, libraries/*) |

### Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14+ (App Router), React, SWR, Zustand |
| Backend | NestJS (TypeScript) |
| Database | Prisma + PostgreSQL |
| Cache | Redis |
| Jobs | Temporal.io |
| Storage | UploadFactory (S3/R2) |
| IA | OpenAI (texto + imagem), ia_generate (proxy custom) |
| Analytics | PostHog + Plausible |
| Validação | Zod schemas + class-validator |
| i18n | Custom translation service |

### Estrutura do Repositório

```
apps/
├── backend/          # NestJS API principal
├── frontend/         # Next.js App Router
├── orchestrator/     # Temporal workers
├── commands/         # CLI commands NestJS
├── extension/        # Chrome extension
└── sdk/              # TypeScript SDK (@contentflow/node)
libraries/
├── nestjs-libraries/ # Services, repositories, schemas, DTOS
└── react-shared-libraries/ # Componentes React compartilhados
docs/                 # Documentação do projeto
landing/              # Landing page
scripts/              # Scripts de setup/deploy
dynamicconfig/        # Configuração Temporal
```

---

## 🔴 CRÍTICO — Riscos de Infraestrutura (P1)

> Itens que bloqueiam ou fragilizam todo o resto do roadmap.

### P1-1: Jobs de Imagem em Memória (Map) ✅ ESPECIFICADO
- **Arquivo:** `ai-generate.service.ts` linha 79
- **Problema:** `const carouselImageJobs = new Map<string, CarouselImageJob>()`
- **Impacto:** Perdidos em restart, sem retry, sem observabilidade, sem isolamento por org
- **TTL:** 6 horas (env `AI_GENERATE_JOB_TTL_MS`)
- **Mitigação:** Criar `GenerationJob` Prisma + mover para Temporal
- **Esforço:** ~3 semanas
- **Especificação:** `docs/P1-1-JOBS-EM-MEMORIA.md` (46KB, completa)

### P1-2: Custos em Memória (Map) ✅ ESPECIFICADO
- **Arquivo:** `ai-generate.service.ts` linha 80
- **Problema:** `const costLedger = new Map<string, AiGenerateCostLedgerEntry[]>()`
- **Impacto:** Impossível faturar, auditar, limitar por plano. Dados fragmentados em multi-instance
- **Mitigação:** Criar tabela `GenerationCost` + dashboard de custos
- **Esforço:** ~2 semanas
- **Especificação:** `docs/P1-2-CUSTOS-EM-MEMORIA.md` (28KB, completa)

### P1-3: CompanyProfile em JSON no Organization.description ✅ ESPECIFICADO
- **Arquivo:** `organization.service.ts`, `organization.repository.ts`
- **Problema:** Dados de marca como JSON serializado em campo String
- **Formatos:** v1 (`company_profile_v1`) + v2 (`company_profiles_v2`) coexistindo
- **Impacto:** Sem índices, sem isolamento multi-brand, sem versionamento, lost updates
- **Mitigação:** Criar `BrandProfile`, `BrandDnaSnapshot`, `BrandAsset` como models Prisma
- **Esforço:** ~3 semanas
- **Especificação:** `docs/P1-3-COMPANY-PROFILE-MIGRATION.md` (42KB, completa)

### P1-4: Plano Textual Só no Estado React ✅ ESPECIFICADO
- **Arquivo:** `use-ai-generate-images-studio.ts` (2655 linhas)
- **Problema:** Ideias, plano, revisão, caption vivem apenas no useState
- **Impacto:** F5 perde tudo, sem drafts, sem colaboração, sem histórico
- **Mitigação:** Auto-save no backend + tabela `CarouselDraft`
- **Esforço:** ~2 semanas
- **Especificação:** `docs/P1-4-PLANO-TEXTUAL-AUTOSAVE.md` (20KB, completa)

### P1-5: Sem Tabela CarouselProject ✅ ESPECIFICADO
- **Arquivo:** `media.repository.ts` (função `parseCarouselProjectMetadata`)
- **Problema:** Slides como mídia individual com metadados no campo `alt` com prefixo `__CONTENTFLOW_CAROUSEL_PROJECT__:` |
- **Impacto:** Sem status editorial, sem revisões, sem vínculo com marca/ideia/post |
- **Mitigação:** Criar `CarouselProject` + `CarouselSlide` + script de migração |
- **Esforço:** ~2 semanas
- **Especificação:** `docs/P1-5-CAROUSEL-PROJECT-ENTITY.md` (14KB, completa)

### P1-6: Prompt Injection ✅ ESPECIFICADO
- **Problema:** Conteúdo extraído de sites pode conter instruções maliciosas para a LLM
- **Mitigação:** Sanitizar texto, separar prompt do sistema e conteúdo externo
- **Esforço:** ~1 semana
- **Especificação:** `docs/P1-6-PROMPT-INJECTION.md` (12KB, completa)

### P1-7: SSRF ao Analisar URLs ✅ ESPECIFICADO
- **Problema:** `ExtractContentService` aceita qualquer URL sem validação de rede
- **Mitigação:** Bloquear localhost, IPs privados, protocolos não-HTTP, redirects suspeitos
- **Esforço:** ~1 semana
- **Especificação:** `docs/P1-7-SSRF-PROTECTION.md` (15KB, completa)

---

## 🟡 FASE 1 — Fundação Escalável (~5-6 semanas)

### 1.1 Brand DNA como Entidade Própria
- [ ] Criar models Prisma: `BrandProfile`, `BrandDnaSnapshot`, `BrandAsset`
- [ ] Migration SQL + adapter de compatibilidade com CompanyProfile legado
- [ ] Repository + Service para BrandProfile (CRUD, snapshots, versionamento)
- [ ] Multi-brand real por organização (seletor de marca)
- [ ] Soft delete + histórico de snapshots
- [ ] Indices: `organizationId`, `brandProfileId`, `status`, `createdAt`, `deletedAt`
- [ ] Optimistic locking via `updatedAt` para evitar lost updates

### 1.2 Pipeline de Extração por URL
- [ ] Normalizar e validar URL (bloquear SSRF, IPs privados, protocolos inseguros)
- [ ] Extração textual robusta com timeout e limite de tamanho/páginas
- [ ] Extração de assets: OG image, logo, favicon, imagens de produto
- [ ] Extração visual: paleta de cores dominantes, estilo, tipografia
- [ ] Sintetização de Brand DNA via LLM com confidence score por campo
- [ ] UI de revisão humana antes de salvar (campos editáveis)
- [ ] Cache de extração de URL

### 1.3 Brand DNA Editor
- [ ] Tela `/brands` com lista de marcas
- [ ] Formulário editável: voz, público, produtos, diferenciais, CTA, termos proibidos
- [ ] Estados: `draft` → `analyzing` → `needs_review` → `active` → `failed`
- [ ] Autosave com debounce
- [ ] Histórico de snapshots com "restaurar versão"
- [ ] Auditoria de quem alterou campos críticos

### 1.4 Jobs Persistentes
- [ ] Criar model `GenerationJob` no Prisma
- [ ] Estados: `queued` → `running` → `waiting_provider` → `completed` / `failed` / `cancelled` / `partial`
- [ ] Mover jobs longos para Temporal (`apps/orchestrator`)
- [ ] Persistir estado por slide, retry, cancelamento
- [ ] Notificação ao usuário quando lote estiver pronto
- [ ] Dead-letter queue para jobs que falham repetidamente
- [ ] Circuit breaker por provider de IA
- [ ] Limite de concorrência por organização
- [ ] Idempotency key por job

### 1.5 Persistência de Custos
- [ ] Criar model `GenerationCost` com FK para Organization + GenerationJob
- [ ] Dashboard de custos por org, período e tipo (texto vs imagem)
- [ ] Limites de uso por plano (soft limit R$50, hard limit R$100)
- [ ] Webhook de billing para sistema externo

---

## 🟡 FASE 2 — MVP Holo-like (~4-5 semanas)

### 2.1 Onboarding "Site → Primeiro Carrossel"
- [ ] Wizard multi-step recuperável (persistir progresso)
- [ ] Fluxo: nome marca → URL → Brand DNA → revisão → 10 ideias → swipe → carrossel → salvar/agendar
- [ ] Fallback manual se URL falhar
- [ ] Eventos analíticos por etapa
- [ ] Não exigir canal social conectado para gerar primeiro carrossel
- [ ] CTA final para salvar, editar ou agendar

### 2.2 Content Swipe
- [ ] Nova rota `/content-swipe` ou `/ideas`
- [ ] Cards: título, hook, objetivo, angulo, template, canal, score
- [ ] Ações: aprovar, descartar, salvar para depois, variações, criar carrossel
- [ ] Estados: `new` → `approved` → `rejected` → `saved` → `used` → `archived`
- [ ] Deduplicação por título/embedding/hash semântico
- [ ] UI mobile com gestos + desktop com atalhos
- [ ] Controle de custo (não gerar infinitamente)
- [ ] Motivo de rejeição registrado

### 2.3 CarouselProject como Entidade
- [ ] Criar model `CarouselProject` com vínculo para `BrandProfile`, `ContentIdea`, `Post`
- [ ] Criar model `CarouselSlide` com FK para CarouselProject
- [ ] Script de migração dos dados legados (campo `alt` da mídia)
- [ ] Status editorial: `draft` → `in_review` → `approved` → `published`
- [ ] Botão "Salvar no Media" + "Criar draft/agendar" direto para `/launches`
- [ ] Regenerar apenas um slide sem refazer tudo

### 2.4 Auto-save no Backend
- [ ] Endpoint `PUT /ai-generate/carousel-draft/:id`
- [ ] Tabela `CarouselDraft` com status `draft`/`completed`
- [ ] Auto-save no frontend a cada 30s ou após etapa concluída
- [ ] Rascunhos recuperáveis ao reabrir o estúdio

---

## 🟢 FASE 3 — Qualidade Superior (~4-5 semanas)

### 3.1 Template Engine por Nicho
- [ ] Transformar 8 templates hardcoded em 16+ dados versionados
- [ ] Cada template: estrutura narrativa, slide rules, densidade texto, direção visual, CTA, checks editoriais
- [ ] Backend serve templates (endpoint `/carousel-templates`)
- [ ] Recomendador baseado em Brand DNA, nicho, objetivo e plataforma
- [ ] Tracking de uso por template (medir performance)
- [ ] Feature flags para testar templates

**16 Templates planejados:**
| # | ID | Categoria | Objetivo |
|---|-----|-----------|----------|
| 1 | `educational` | Educacional | Educar e engajar |
| 2 | `storytelling` | Storytelling | Aquecer audiência |
| 3 | `list` | Lista | Educar e engajar |
| 4 | `myths` | Mitos e verdades | Gerar autoridade |
| 5 | `before-after` | Antes/depois | Vender oferta |
| 6 | `case` | Case | Gerar autoridade |
| 7 | `offer` | Oferta | Vender oferta |
| 8 | `authority` | Autoridade | Gerar autoridade |
| 9 | `faq` | FAQ | Educar e engajar |
| 10 | `comparison` | Comparação | Gerar autoridade |
| 11 | `testimonial` | Depoimento/prova | Vender oferta |
| 12 | `statistics` | Estatísticas | Gerar autoridade |
| 13 | `problem-solution` | Problema-solução | Vender oferta |
| 14 | `us-vs-them` | Us vs Them | Gerar autoridade |
| 15 | `best-sellers` | Best-sellers | Vender oferta |
| 16 | `negative-hook` | Negative hook | Capturar leads |

### 3.2 Sistema de Qualidade Editorial
- [ ] Review prompt enriquecido com `editorialChecks` do template + `forbiddenTerms`
- [ ] Corrigir schema Zod `editorial-review.schema.ts` (mismatch com formato do prompt)
- [ ] Gate de score: bloquear geração de imagens se score < threshold configurável
- [ ] Persistir review como artefato JSON no carousel project
- [ ] UI de issues agrupadas por slide e severidade (warning vs blocker)
- [ ] Auto-fix com diff visual para aprovação humana
- [ ] Separar warnings de blockers
- [ ] Não sobrescrever edições do usuário sem confirmação

### 3.3 Editor Visual Mais Forte
- [ ] Editar slide por slide com preview responsivo
- [ ] Regenerar imagem de slide único
- [ ] Alterar headline, body, CTA, alt text
- [ ] Reordenar, duplicar, remover slides
- [ ] Aplicar paleta/logo da marca
- [ ] Exportar PNG/PDF
- [ ] Undo/redo ou histórico mínimo
- [ ] Validar tamanho e contraste
- [ ] Preservar accessibility alt text

### 3.4 Biblioteca de Referências Visuais
- [ ] Referências globais curadas + da marca + aprovadas pelo usuário
- [ ] Tags por nicho, estilo, campanha e objetivo
- [ ] Seletor de referências no gerador
- [ ] Uso controlado em prompts (direção visual, não clone)
- [ ] Fonte e licença quando aplicável
- [ ] Não copiar imagem de terceiros como output final

---

## 🔵 FASE 4 — Automação e Calendário (~4-5 semanas)

### 4.1 Content Calendar Automático
- [ ] Configuração editorial por marca (frequência, canais, objetivos, pilares)
- [ ] Gerador de calendário para 30/60/90 dias
- [ ] Drafts revisáveis no calendário
- [ ] Evitar repetição por embedding/hash
- [ ] Respeitar timezone e blackout dates
- [ ] Revisão em lote (aprovar/rejeitar múltiplos)

### 4.2 Auto-generation Recorrente
- [ ] Worker Temporal recorrente por marca
- [ ] Opt-in explícito + custo estimado antes de ativar
- [ ] Janela noturna configurável
- [ ] Notificação "novos carrosseis prontos"
- [ ] Regras por plano (limite de gerações)
- [ ] Pausar automaticamente em falhas repetidas
- [ ] Histórico de execuções

### 4.3 Workflow de Aprovação
- [ ] Status de aprovação em CarouselProject/Post
- [ ] Comentários por slide ou projeto
- [ ] Notificação para aprovadores
- [ ] Bloqueio de publicação se workflow exigir aprovação
- [ ] Usar sistema de comments/teams/roles existente

---

## 🟣 FASE 5 — Analytics e Loop de Melhoria (~3-4 semanas)

### 5.1 Métricas Normalizadas de Carrossel
- [ ] Vincular Post publicado a CarouselProject (`carouselProjectId` no Post)
- [ ] Model `CarouselPerformance` com métricas brutas + normalizadas
- [ ] Coletar métricas por plataforma via APIs de social providers
- [ ] Normalizar em score 0-100 comparável entre plataformas
- [ ] Dashboard por marca, template, tema e canal
- [ ] Dados brutos e normalizados separados
- [ ] Jobs de coleta/refresh periódico

**Métricas prioritárias:**
- Saves, Shares, Comments, Engagement Rate
- Clicks, Reach, Impressions, Follower Growth

### 5.2 Recomendações Baseadas em Performance
- [ ] "Mais carrosseis como este"
- [ ] "Gerar variações do melhor hook"
- [ ] "Templates que mais funcionam para esta marca"
- [ ] "Temas saturados/repetidos"
- [ ] "Melhores horários e canais"
- [ ] Heuristicas simples e explicáveis
- [ ] Só usar dados da própria organização/marca

### 5.3 Biblioteca de Aprendizados da Marca
- [ ] Registrar hooks vencedores, CTAs, temas, style rules
- [ ] Status: `suggested` → `approved` → `rejected` → `applied`
- [ ] Aprovar antes de incorporar ao Brand DNA
- [ ] Versionar aprendizados + permitir desfazer
- [ ] Não atualizar Brand DNA automaticamente sem revisão

---

## 🟠 FASE 6 — Expansão de Formatos (~6-8 semanas)

### 6.1 Social Post Generator
- **Doc:** `docs/6.7.1-social-post-generator-plan.md`
- [ ] Extensão no model `Post`: `contentIdeaId` + `socialPostMetadata` (Json)
- [ ] Schema Zod `SocialPostBatchSchema` com constraints por plataforma
- [ ] Serviço `SocialPostGenerateService`
- [ ] DTO: `GenerateSocialPostsDto`
- [ ] Controller: `social-posts.controller.ts`

**Constraints por plataforma:**
| Platform | Max Chars | Hashtag Limit | Tone |
|----------|-----------|---------------|------|
| Instagram | 2.200 | 30 | Conversacional, emoji-rich |
| LinkedIn | 3.000 | 5 | Professional, thought-leadership |
| TikTok | 2.200 | 5-8 | Casual, trend-aware |
| X/Twitter | 280 | 3-5 | Concise, punchy |
| Threads | 500 | 3-5 | Conversacional, authentic |
| Facebook | 63.206 | 1-3 | Friendly, story-driven |

**Frontend:** Página `/social-posts` com cards por plataforma

### 6.2 Ads Generator (Static + Carousel)
- **Doc:** `docs/6.7.2-ads-generator-plan.md`
- [ ] Novo model `AdCreative` (STATIC | CAROUSEL)
- [ ] Enums: `AdObjective`, `AdPlatform`, `AdCreativeType`
- [ ] Templates: problema/solução, oferta, prova, comparação, depoimento
- [ ] Platform-aware (Meta Facebook/Instagram, LinkedIn)
- [ ] Ad policy compliance checks (`policyWarnings`, `claimsFlags`)
- [ ] Frontend: editor de ads com preview por plataforma
- [ ] Schema Zod `AdCreativeSchema`

### 6.3 Email/Newsletter Generator
- **Doc:** `docs/6.7.3-email-generator-plan.md`
- [ ] Novo model `EmailCampaign` (NEWSLETTER | WELCOME_SEQUENCE | PROMOTIONAL)
- [ ] HTML portável com inline styles (Gmail, Outlook, Apple Mail)
- [ ] Blocos: text, heading, image, button, divider, spacer, social, carousel
- [ ] Preview em iframe com content-editable overlay
- [ ] Export HTML limpo
- [ ] Welcome sequence: `sequenceIndex`, `sequenceTotal`, `sequenceDelayDays`

### 6.4 Video Generator (Short-form)
- **Doc:** `docs/6.7.4-video-generator-plan.md`
- [ ] Novo model `ShortVideoProject`
- [ ] Enums: `ShortVideoFormat` (REELS, TIKTOK, SHORTS, STORIES, CUSTOM), `ShortVideoStatus`
- [ ] Script/storyboard a partir de carrossel aprovado
- [ ] Cenas com: duration, headline, body, voiceoverText, imageUrl, transition, textOverlays, motionNotes
- [ ] Transições: cut, crossfade, slide-left/right, zoom-in/out
- [ ] Motion simples primeiro: Ken Burns, crossfade, text overlays
- [ ] Integração com `VideoManager` existente (image-text-slides, veo3)
- [ ] Custo transparente antes de renderizar
- [ ] Script first, video optional

---

## ⚪ FASE 7 — Growth, Pricing e Comercial (~3-4 semanas)

### 7.1 Landing Page Orientada a Carrosseis
- [ ] Hero com demo real do gerador de carrossel
- [ ] Headline: "Gere carrosseis prontos para postar em minutos"
- [ ] Secão "URL → Brand DNA → carrossel"
- [ ] Comparação: ContentFlow vs Canva vs ChatGPT vs Holo
- [ ] Exemplos reais de carrosseis gerados
- [ ] Mural de depoimentos (prova social verdadeira)
- [ ] FAQ
- [ ] CTA para criar primeiro carrossel
- [ ] Teste desktop/mobile + Lighthouse

### 7.2 Pricing
- [ ] Planos com limites reais: marcas, carrosseis/mês, jobs simultâneos, membros, canais
- [ ] Backend impede ultrapassar limite (não só UI)
- [ ] Mensagens de upgrade contextuais
- [ ] Monitor de abuso/custo
- [ ] Garantia 14 dias (alternativa a free trial)
- [ ] Não prometer "unlimited" sem controle de custo

### 7.3 Programa de Afiliados
- [ ] Comissão recorrente (50% por 12 meses como referência Holo)
- [ ] Tracking por link/cupom
- [ ] Dashboard ou relatório
- [ ] Política anti-abuso (proibido brand bidding)
- [ ] Materiais para creators
- [ ] Só escalar depois de medir CAC, refund, churn e margem

### 7.4 SEO Programático
- [ ] Clusters de conteúdo: "gerador de carrossel", "como fazer carrossel no Instagram", "carrossel para [nicho]"
- [ ] Templates de página com exemplos reais
- [ ] Estrutura de internal linking
- [ ] Tracking de conversão para onboarding
- [ ] Evitar conteúdo programático raso

---

## ⚫ FASE 8 — Plataforma e Ecossistema (~4-6 semanas)

### 8.1 API Pública de Carrosseis
- [ ] Endpoints: criar BrandProfile, extrair DNA, gerar ideias, criar CarouselProject, exportar assets
- [ ] Webhooks de job completed/failed
- [ ] Idempotency keys obrigatórias em criação de jobs
- [ ] Rate limits por org e por app
- [ ] Documentação OpenAPI
- [ ] Reaproveitar API keys/OAuth existentes

### 8.2 Marketplace de Templates
- [ ] Templates oficiais + de creators/agências
- [ ] Instalação por organização
- [ ] Review e curadoria
- [ ] Versionamento + performance tracking
- [ ] Separar template de prompt secreto
- [ ] Medir performance e abuso

### 8.3 Apps e Integrações
- [ ] Make/Zapier/n8n connectors
- [ ] Import de artigo/link para carrossel
- [ ] Export para Canva/Figma (se fizer sentido comercial)
- [ ] Webhooks e docs de integração

---

## 🔧 BACKLOG TÉCNICO

### Segurança
- [ ] SSRF protection completo na extração de URLs
- [ ] Prompt injection protection em conteúdo de sites
- [ ] Criptografia de tokens em repouso
- [ ] LGPD compliance (dados sensíveis de marca)
- [ ] Rate limiting por endpoint
- [ ] Logs sem secrets, tokens ou prompts sensíveis

### Performance
- [ ] Cache de extração de URL
- [ ] Reuso de BrandDNA aprovado
- [ ] Lazy loading de assets pesados
- [ ] Otimização de queries Prisma (N+1)
- [ ] Circuit breaker por provider de IA

### Qualidade / Testes
- [ ] Unit tests: normalização de URL, sanitização, schemas Zod, dedupe, máquina de estados
- [ ] Integration tests: criar marca, rodar Brand DNA, gerar ideias, aprovar, criar projeto
- [ ] E2E: onboarding URL → primeiro carrossel, Content Swipe, regenerar slide, salvar e agendar
- [ ] Evals de IA: dataset de marcas por nicho, consistência de tom, hooks, termos proibidos
- [ ] CI/CD com lint, test, build, deploy

### Observabilidade
- [ ] 49 eventos PostHog no funil (definidos em `docs/metricas-sucesso.md`)
- [ ] Dashboard de métricas de custo e performance
- [ ] Alertas de circuit breaker por provider
- [ ] Logs estruturados sem secrets

### Refactors de Código
- [ ] `useAiGenerateImagesStudio` (2655 linhas) → dividir em hooks menores
- [ ] `CompanyOnboardingComponent` (1509 linhas) → decompor em steps
- [ ] `MediaBox` (1194 linhas) → decompor
- [ ] `Calendar` (1304 linhas) → decompor
- [ ] Provider abstraction para IA (fácil troca de OpenAI)
- [ ] Feature flags por plano
- [ ] Remover console.logs de debug

### Documentação
- [ ] Atualizar README com stack e comandos atuais
- [ ] Documentar API pública com OpenAPI/Swagger
- [ ] Guia de contribuição atualizado
- [ ] ADRs complementares para decisões pendentes

---

## 📐 Decisões de Arquitetura (ADR-001)

1. **Novas tabelas Prisma, não adapter** — `BrandProfile`, `BrandDnaSnapshot`, `BrandAsset` próprios
2. **Persistência de jobs e custos** — `GenerationJob` Prisma + Temporal
3. **CarouselProject como entidade própria** — vínculo com BrandProfile, ContentIdea, Post
4. **Adapter de compatibilidade** — Ler formato legado por 30 dias após migração
5. **Frontend: evoluir, não rewrite** — Reaproveitar studio atual, adicionar `brandProfileId`

---

## 📏 Métricas de Sucesso (Definidas)

### Funil Principal
```
Signup → Onboarding Brand → URL Analisada → Brand DNA Aprovado →
Ideia Aprovada → Carrossel Gerado → Carrossel Salvo → Post Agendado → Post Publicado
```

### KPIs Principais
| Métrica | Alvo |
|---------|------|
| Tempo até primeiro carrossel | < 10 min (P50), < 30 min (P95) |
| % completam Brand DNA | > 60% |
| Taxa de aprovação no swipe | > 40% |
| % carrosséis → post | > 30% |
| Custo médio por carrossel | < $0.50 |
| P95 plano textual | < 10s |
| P95 imagem/slide | < 15s |
| Taxa de erro por provider | < 5% |

---

## 🔄 Ordem Recomendada de Implementação

1. ~~Estabilizar contratos e persistência de jobs~~ (Fase 0 - docs criados)
2. **BrandProfile/BrandDNA persistente** (Fase 1)
3. **Brand DNA extraction por URL** (Fase 1)
4. **Content Swipe persistente** (Fase 2)
5. **Conectar ideia ao AI carousel studio** (Fase 2)
6. **Persistir CarouselProject** (Fase 2)
7. **Mover gerações longas para Temporal** (Fase 1)
8. **Expandir templates e review editorial** (Fase 3)
9. **Calendário automático e geração em lote** (Fase 4)
10. **Analytics de carrossel e loop de melhoria** (Fase 5)
11. **Landing, pricing, SEO e afiliados** (Fase 7)
12. **Expandir para ads, posts, emails e videos** (Fase 6)

---

## 📚 Documentos de Referência

| Documento | Caminho | Conteúdo |
|-----------|---------|----------|
| Plano Principal | `docs/plano-implementacao-tryholo-contentflow.md` | 2280 linhas, 8 fases completas |
| Auditoria Arquitetura | `docs/auditoria-arquitetura-atual.md` | Fluxo ponta a ponta, 8 riscos |
| Auditoria Schema | `docs/auditoria-schema.md` | 47 models, 10 enums, relações |
| Auditoria Endpoints | `docs/auditoria-endpoints.md` | Todos os endpoints mapeados |
| Auditoria Frontend | `docs/auditoria-frontend.md` | Todas as rotas e componentes |
| ADR-001 | `docs/adr-001-decisoes-arquitetura.md` | 5 decisões arquiteturais |
| Riscos Técnicos | `docs/riscos-tecnicos.md` | 13 riscos documentados |
| Métricas | `docs/metricas-sucesso.md` | 49 eventos, KPIs, funil |
| Contratos IA | `docs/contratos-ia-guia-integracao.md` | Guia de uso dos schemas Zod |
| Prompts Registry | `docs/prompts-registry.md` | 7 prompts documentados |
| Diagrama Fluxo | `docs/diagrama-fluxo-atual.md` | Mermaid do fluxo atual |
| Estudo Holo | `docs/estudo-tryholo.md` | Análise completa do concorrente |
| Social Posts Plan | `docs/6.7.1-social-post-generator-plan.md` | Plano Fase 6.7.1 |
| Ads Plan | `docs/6.7.2-ads-generator-plan.md` | Plano Fase 6.7.2 |
| Email Plan | `docs/6.7.3-email-generator-plan.md` | Plano Fase 6.7.3 |
| Video Plan | `docs/6.7.4-video-generator-plan.md` | Plano Fase 6.7.4 |
| Template Engine | `docs/plans/PLANO-SUBFASE-3.1-TEMPLATE-ENGINE-POR-NICHO.md` | Subfase 3.1 |
| Qualidade Editorial | `docs/plans/PLANO-SUBFASE-3.2-SISTEMA-QUALIDADE-EDITORIAL.md` | Subfase 3.2 |
| Deploy | `docs/DEPLOY.md` | Guia de deploy |
| Produção | `docs/PRODUCAO_ATUAL.md` | Estado atual em produção |
| Páginas e Conexões | `docs/PAGINAS_E_CONEXOES.md` | Mapeamento de páginas |

---

## 📊 Resumo de Esforço

| Fase | Subfases | Features | Esforço Estimado |
|------|----------|----------|-----------------|
| **Crítico (P1)** | 7 | 7 | ~12 semanas |
| **Fase 1** | 5 | ~20+ endpoints | ~5-6 semanas |
| **Fase 2** | 4 | ~15+ endpoints/UI | ~4-5 semanas |
| **Fase 3** | 4 | 16 templates, editor | ~4-5 semanas |
| **Fase 4** | 3 | Temporal workflows | ~4-5 semanas |
| **Fase 5** | 3 | Analytics completo | ~3-4 semanas |
| **Fase 6** | 4 | 4 geradores novos | ~6-8 semanas |
| **Fase 7** | 4 | Landing, pricing, SEO | ~3-4 semanas |
| **Fase 8** | 3 | API pública, marketplace | ~4-6 semanas |
| **Backlog** | ~30+ | Infra, testes, docs | Contínuo |
| **TOTAL** | **~37 subfases** | **100+ features** | **~45-55 semanas** |

---

## 🔍 AUDITORIA COMPLETA DO CODEBASE (2026-07-02)

> Análise automatizada por 6 subagents paralelos. Leitura de todos os 21 docs, schema Prisma
> inteiro (1642 linhas), todos os controllers (46), todas as rotas do frontend (~30),
> varredura de TODOs/FIXMEs/HACKs, e análise de dependências/configs.

### ✅ O Que JÁ FOI Implementado (Schema + Controllers)

Muitos dos models e controllers planejados no roadmap **já existem no codebase**:

| Feature | Schema Prisma | Controller | Frontend |
|---------|:---:|:---:|:---:|
| BrandProfile + BrandDnaSnapshot + BrandAsset | ✅ | ✅ (15 endpoints) | ✅ `/brands` |
| ContentIdea | ✅ | ✅ (8 endpoints) | ✅ `/content-swipe` |
| CarouselProject | ✅ | ✅ (10 endpoints) | ✅ integrado no studio |
| GenerationJob | ✅ | ✅ (5 endpoints) | ✅ `/jobs` |
| EditorialPlan + EditorialSlot | ✅ | ✅ (11 endpoints) | ✅ `/editorial` |
| CarouselPerformance | ✅ | ✅ (8 endpoints) | ✅ `/analytics/carousel` |
| BrandLearning | ✅ | ✅ (6 endpoints) | ✅ integrado |
| AdCreative | ✅ | ✅ (1 endpoint) | ✅ `/social-posts/ad-creatives` |
| EmailCampaign | ✅ | ✅ (2 endpoints) | ✅ `/social-posts/email-campaigns` |
| ShortVideoProject | ✅ | ✅ (1 endpoint) | ✅ `/social-posts/video-scripts` |
| Social Posts | ✅ (via Post ext.) | ✅ (3 endpoints) | ✅ `/social-posts` |
| MarketplaceTemplate + TemplateInstallation | ✅ | ✅ (10 endpoints) | ✅ `/template-marketplace` |
| Affiliate + Referral | ✅ | ✅ (4 endpoints) | ✅ `/affiliates` |
| Webhook + WebhookDelivery | ✅ | ✅ (5 endpoints) | ✅ integrado |
| ArticleImport | — | ✅ (2 endpoints) | ✅ integrado |
| PlanLimits | — | ✅ (1 endpoint) | ✅ integrado |
| Public Carousels API | — | ✅ (12 endpoints) | — |

**Total: 52 models Prisma, 30 enums, ~220+ endpoints, 46 controllers**

### ❌ O Que AINDA FALTA Implementar

| Feature | Status | O que falta |
|---------|--------|-------------|
| **Services/Repositories** | ⚠️ Parcial | Controllers existem mas muitos services são stubs ou incompletos |
| **Frontend completo** | ⚠️ Parcial | Pages criadas mas componentes podem estar em bruto |
| **Jobs em memória → Prisma** | ❌ Não migrado | `carouselImageJobs` e `costLedger` ainda são Maps |
| **CompanyProfile → BrandProfile migration** | ❌ Não migrado | Coexistência legado/novo não ativada |
| **Temporal workflows novos** | ⚠️ Parcial | Workflows de publicação existem, mas não de Brand DNA/ideias/carrossel |
| **Testes automatizados** | ❌ Mínimo | `pnpm test` existe mas cobertura baixa |
| **LGPD compliance** | ❌ Não implementado | Sem criptografia em repouso, sem DPA |
| **SSRF protection** | ❌ Não implementado | `ExtractContentService` aceita qualquer URL |
| **Prompt injection protection** | ❌ Não implementado | Conteúdo de sites vai direto para prompts |
| **49 eventos PostHog** | ❌ Não implementados | Documentados mas não disparados |
| **Circuit breaker por provider** | ❌ Não implementado | Sem fallback automático |
| **Cache de extração de URL** | ❌ Não implementado | Re-extrai sempre |
| **Evals de IA** | ❌ Não implementado | Sem dataset de teste |
| **E2E tests** | ❌ Não implementado | Sem Playwright/Cypress |
| **Landing page nova** | ⚠️ Parcial | Landing existe mas não reposicionada para carrosséis |
| **Pricing com limites reais** | ⚠️ Parcial | PlanLimits endpoint existe mas limites podem não estar enforcement |

### 🐛 Problemas de Configuração Encontrados

| # | Problema | Severidade | Arquivo |
|---|---------|------------|---------|
| 1 | **Node.js inconsistente**: engines ≥22.12.0, volta 20.17.0, @types/node 18 | 🔴 Alta | `package.json` |
| 2 | **Nome legado "gitroom"**: package.json, tsconfig paths, CI, stale.yml | 🟡 Média | Vários |
| 3 | **Credenciais hardcoded no docker-compose**: POSTGRES_PASSWORD: contentflow-password | 🔴 Alta | `docker-compose.yaml` |
| 4 | **Sem health check no container principal** | 🔴 Alta | `docker-compose.yaml` |
| 5 | **docker-compose.dev.yaml desatualizado** (auto-declara) | 🟡 Média | `docker-compose.dev.yaml` |
| 6 | **Dependabot incompleto**: só npm, falta Docker + GitHub Actions | 🟡 Média | `.github/dependabot.yml` |
| 7 | **CI sem testes**: build.yml não roda testes | 🟡 Média | `.github/workflows/build.yml` |
| 8 | **ESLint workflow referencia quebrada**: procura `.eslintrc.json` em apps/ | 🟡 Média | `.github/workflows/eslint.yml` |
| 9 | **Deploy usa tag `latest`**: sem versionamento para rollback | 🟡 Média | `deploy-digitalocean.yml` |
| 10 | **sonar-project.properties** referencia `gitroomhq_contentflow-app` | 🟢 Baixa | `sonar-project.properties` |

### 🧹 Console.log Debug Leftovers (~70 ocorrências)

| Prioridade | Arquivos | Ação |
|------------|---------|------|
| 🔴 Crítico | `posts.service.ts`, `resend.provider.ts`, `bluesky.provider.ts` — `console.log(e)` em catch | Migrar para logger NestJS |
| 🔴 Alto | `pick.platform.component.tsx`, `new.uploader.tsx`, `render.preview.date.tsx` — logs genéricos | Remover |
| 🔴 Alto | `public.integrations.controller.ts` — `console.log(JSON.stringify(body))` | Vazamento de dados |
| 🟡 Médio | 50+ ocorrências em providers sociais, upload, email, stripe | Migrar para logger |
| 🟢 Baixa | `main.ts` do orchestrator/commands — logs de startup | Manter ou migrar |

### 📐 Frontend — Mapeamento Completo

| Categoria | Quantidade |
|-----------|-----------|
| Rotas de página | ~30 rotas |
| Layouts | 7 layouts de grupo + 3 aninhados |
| Componentes | ~200+ arquivos .tsx |
| Stores Zustand | 1 (`useLaunchStore`) |
| Hooks customizados | ~20 hooks SWR + 2 hooks de UI |
| Contexts React | 6 contextos |
| Modais | 10 modais |
| Provedores sociais | 25+ plataformas |
| Páginas SEO | 6 clusters |

**Hook principal**: `useAiGenerateImagesStudio` — **2861 linhas** (era 2655, cresceu)

### 🔧 Orchestrator — Workflows Temporal

| Workflow | Função |
|----------|--------|
| `PostWorkflowV1` / `V2` | Publicação de posts |
| `AutopostWorkflow` | Automação de posts |
| `DigestEmailWorkflow` | Email digest |
| `MissingPostWorkflow` | Posts faltantes |
| `SendEmailWorkflow` | Envio de email |
| `RefreshTokenWorkflow` | Renovação de token |
| `StreakWorkflow` | Streak de consistência |

**Activities**: PostActivity, AutopostService, EmailActivity, IntegrationsActivity

### 📋 Schema Prisma — Estatísticas Finais

| Métrica | Quantidade |
|---------|-----------|
| Models | 52 |
| Enums | 30 |
| Relações | 150+ |
| Indexes | 200+ |
| Unique constraints | 15+ |
| Migrations (Jun/2026) | 11 |
| Tamanho do schema | 1642 linhas / 48KB |

### 🔐 Middlewares e Guards

| Componente | Tipo | Função |
|-----------|------|--------|
| `AuthMiddleware` | Middleware | JWT auth via header/cookie |
| `PublicAuthMiddleware` | Middleware | API Key + OAuth auth |
| `IdempotencyMiddleware` | Middleware | Dedupe via Redis (24h TTL) |
| `PoliciesGuard` | Guard global | Permissões por seção |
| `ThrottlerBehindProxyGuard` | Guard global | Rate limiting (30 req/h) |

**Seções de permissão**: ADMIN, TEAM_MEMBERS, CHANNEL, POSTS_PER_MONTH, WEBHOOKS, AI
