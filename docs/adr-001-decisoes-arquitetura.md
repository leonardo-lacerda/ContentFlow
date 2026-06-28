# ADR-001: Decisões de Arquitetura para Carrossel com Brand DNA

Data: 2026-06-28
Status: Aceito
Autor: Hermes Agent

## Contexto

O plano de desenvolvimento Holo-like para ContentFlow identificou que:
1. CompanyProfile é armazenado como JSON em `Organization.description`
2. Jobs de IA vivem em memória (Mapas)
3. Carrosséis não têm tabela própria
4. Não há vínculo entre Brand DNA e conteúdo gerado

## Decisões

### 1. NOVAS TABELAS PRISMA, NÃO ADAPTER

**Decisão:** Criar modelos Prisma próprios (`BrandProfile`, `BrandDnaSnapshot`, `BrandAsset`) em vez de continuar usando adapter sobre `Organization.description`.

**Motivação:**
- `Organization.description` é um campo String genérico sem índices
- Multi-brand real exige isolamento por `organizationId` consultável
- Versionamento de DNA exige snapshots com data e versão
- Permissões futuras por marca exigem registros no banco

**Risco:** Migração de dados legados do formato JSON v2 para as novas tabelas precisa ser suave. Criaremos script de migração e manteremos leitura compatível.

### 2. PERSISTÊNCIA DE JOBS E CUSTOS

**Decisão:** Criar `GenerationJob` como modelo Prisma e mover jobs longos para Temporal no `apps/orchestrator`.

**Motivação:**
- Jobs em `Map` são perdidos em restart
- Sem retry, sem observabilidade, sem limites por org
- Temporal já está no projeto (`@temporalio/*` deps)

**Risco:** Custos de infraestrutura Temporal. Mitigação: começar com jobs no banco + polling simples, migrar para Temporal depois.

### 3. CAROUSELPROJECT COMO ENTIDADE PRÓPRIA

**Decisão:** Criar `CarouselProject` como modelo Prisma com vínculo para `BrandProfile`, `ContentIdea` e `Post`.

**Motivação:**
- Hoje carrosséis são salvos como mídia individual com metadados no `alt`
- Sem status editorial, sem revisões, sem vínculo com marca
- Necessário para Fases 2-5 (swipe, aprovação, analytics)

### 4. ADAPTER DE COMPATIBILIDADE

**Decisão:** Manter leitura do formato legado (`Organization.description` JSON v2) por 30 dias após a migração, com fallback silencioso.

**Motivação:** Usuários existentes não devem perder dados. O adapter converte automaticamente o JSON para os novos modelos.

### 5. FRONTEND: EVOLUIR, NÃO REWRITE

**Decisão:** Reaproveitar o componente `ai-generate-images-studio-view.tsx` e o hook `useAiGenerateImagesStudio`, adicionando `brandProfileId` como parâmetro.

**Motivação:**
- Hook tem 2655 linhas e gerencia todo o estado do estúdio
- Componentes têm lógica de direção visual, templates, galeria
- Rewrite completo atrasaria o MVP desnecessariamente

---

## Consequências

Positivas:
- Dados consultáveis, indexáveis e auditáveis
- Isolamento multi-brand real
- Jobs persistentes e recuperáveis
- Vínculo entre Brand DNA, ideias, carrosséis e posts

Negativas:
- Requer migration de dados existentes
- Aumento temporário na complexidade (coexistência legado + novo)
- Tempo extra de setup inicial

## Alternativas Consideradas

### Adapter puro sobre Organization.description
Rejeitado: resolve o curto prazo mas adiciona dívida técnica. Sem índices, sem isolamento, sem versionamento. Inviável quando multi-brand for realidade.

### Rewrite completo do carrossel studio
Rejeitado: o estúdio atual funciona e é usado. A evolução gradual com `brandProfileId` é mais segura e rápida.

### Usar MongoDB/JSONB para dados flexíveis de Brand DNA
Rejeitado: o campo `Json` do Prisma já suporta dados flexíveis nos snapshots. Não justifica adicionar outro banco.
