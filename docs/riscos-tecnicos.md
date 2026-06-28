# Documento de Riscos Técnicos — Fluxo de Carrossel

> **Projeto:** ContentFlow
> **Gerado em:** 2026-06-28
> **Baseado em:** `docs/auditoria-arquitetura-atual.md`, ADR-001, análise de código-fonte
> **Escopo:** Fluxo completo de geração de carrosséis (AI Carousel Studio)

---

## Resumo Executivo

| Prioridade | Risco | Severidade | Probabilidade |
|-----------|-------|-----------|--------------|
| P1 | CompanyProfile em JSON no Organization.description | ALTA | Alta |
| P2 | Jobs de imagem em memória (Map) | ALTA | Alta |
| P3 | Custos em memória (Map) | ALTA | Alta |
| P4 | Prompt injection vindo de sites | ALTA | Média |
| P5 | SSRF ao analisar URLs de site | ALTA | Média |
| P6 | Dados de marca enviados a providers de IA | ALTA | Alta |
| P7 | Excesso de custo por geração automática | MÉDIA | Alta |
| P8 | Plano textual só no estado React | MÉDIA | Alta |
| P9 | Sem tabela de CarouselProject | MÉDIA | Alta |
| P10 | Sem vínculo Brand DNA → carrossel | MÉDIA | Alta |
| P11 | Sem versionamento de prompts/schemas de IA | MÉDIA | Alta |
| P12 | Dois controllers fazem geração de imagem | BAIXA | Alta |
| P13 | Dados de uma marca vazarem para outra | MÉDIA | Baixa |

---

## Risco 1 — CompanyProfile em JSON no Organization.description

### Descrição
Os dados de perfil de marca/empresa (CompanyProfile) são armazenados como um blob JSON serializado no campo `description` (tipo String) da tabela `Organization` do Prisma. Dois formatos coexistem (v1 legado `company_profile_v1` e v2 `company_profiles_v2`). A leitura é feita via `JSON.parse()` e a escrita via `JSON.stringify()` dentro de `OrganizationService`.

### Severidade
**ALTA**

### Impacto no Produto
- **Sem índices:** Não é possível consultar marcas por nome, indústria, público-alvo ou qualquer campo sem fazer scan completo na tabela.
- **Sem integridade referencial:** Não há FK, constraints ou validação em nível de banco.
- **Tamanho ilimitado:** Um único campo armazena arrays de marcas, assets de identidade visual (data URLs base64 de até 450KB cada), paletas, logos, fontes, inspirações e ideias — podendo facilmente exceder limites práticos de colunas TEXT no PostgreSQL.
- **Concorrência problemática:** Duas requisições simultâneas podem ler, modificar e escrever o JSON, causando perda de dados (lost update) — não há bloqueio ou optimistic locking.
- **Migração complexa:** A coexistência de dois formatos (v1 e v2) com parse condicional adiciona dívida técnica e fragilidade.

### Probabilidade
**Alta** — Já ocorre em produção. Qualquer restart/queda durante escrita pode corromper o blob.

### Mitigação Proposta
1. **Criar tabelas Prisma dedicadas:** `BrandProfile`, `BrandDnaSnapshot`, `BrandAsset` (conforme ADR-001).
2. **Script de migração:** Extrair JSON existente e popular novas tabelas com fallback para leitura legado por 30 dias.
3. **Adapter de compatibilidade:** Ler do novo schema, com fallback silencioso para o formato antigo.
4. **Optimistic locking:** Usar `updatedAt` ou campo `version` para evitar lost updates durante a migração.

### Prioridade
**1** (Crítico — bloqueia roadmap de multi-brand)

---

## Risco 2 — Jobs de Imagem em Memória (Map)

### Descrição
Os jobs de geração de imagens do carrossel são armazenados em um `Map<string, CarouselImageJob>` estático no módulo `AiGenerateService` (linha 79: `const carouselImageJobs = new Map<string, CarouselImageJob>()`). O job é iniciado com `this.runCarouselImageJob(job)` via `void` (fire-and-forget) e o resultado fica acessível por polling via `GET /ai-generate/carousel-image-jobs/:id`.

### Severidade
**ALTA**

### Impacto no Produto
- **Perda total em restart/deploy:** Todos os jobs em andamento são perdidos sem nenhum aviso ao usuário.
- **Sem fila de mensageria:** Concorrência gerenciada manualmente com workers paralelos (até 4), sem backpressure, sem priorização.
- **Sem retry automático:** Se um slide falha, a falha é registrada mas o job como um todo não é retentado.
- **Sem observabilidade:** Operadores e dashboard não veem jobs em andamento, taxa de falha ou tempo médio.
- **Sem isolamento por organização:** Uma única org com muitos slides pode consumir toda a capacidade de processamento (concorrência global de até 4 workers).
- **TTL arbitrário:** Jobs são deletados após 6 horas (`process.env.AI_GENERATE_JOB_TTL_MS || 1000 * 60 * 60 * 6`) sem possibilidade de recuperação.

### Probabilidade
**Alta** — Qualquer deploy, restart de processo ou crash no backend perde jobs ativos.

### Mitigação Proposta
1. **Persistir jobs no banco:** Criar modelo Prisma `GenerationJob` com status, progresso, erros e resultados parciais.
2. **Usar Temporal.io:** O projeto já tem dependências do Temporal; migrar execução de jobs longos para workflows Temporal com retry automático.
3. **Implementar fila com backpressure:** Redis Bull/BullMQ ou fila nativa do Temporal.
4. **Dashboard de observabilidade:** Endpoint para listar jobs ativos por org, com métricas de sucesso/falha.

### Prioridade
**2** (Urgente — perda de jobs causa frustração imediata)

---

## Risco 3 — Custos em Memória (Map)

### Descrição
O histórico de custos de geração de IA é armazenado em um `Map<string, AiGenerateCostLedgerEntry[]>` estático no `AiGenerateService` (linha 80: `const costLedger = new Map<string, AiGenerateCostLedgerEntry[]>()`). Cada entrada é limitada a 200 registros por org.

### Severidade
**ALTA**

### Impacto no Produto
- **Perda total em restart:** Todo o histórico de gastos desaparece, impossibilitando faturamento e auditoria.
- **Sem auditoria:** Não é possível auditar gastos passados, provar consumo para clientes enterprise ou detectar anomalias.
- **Sem billing baseado em plano:** Impossível implementar limites de uso por plano (soft limit de R$50, hard limit de R$100 são verificados apenas no Map volátil).
- **Dados inconsistentes:** Se múltiplas instâncias do backend estiverem rodando (horizontal scaling), cada uma tem seu próprio Map — os dados de custo ficam fragmentados e inconsistentes entre instâncias.

### Probabilidade
**Alta** — Restarts/deploys acontecem regularmente em desenvolvimento e produção.

### Mitigação Proposta
1. **Persistir custos em banco:** Criar tabela `GenerationCost` no Prisma com FK para `Organization` e `GenerationJob`.
2. **Webhook de billing:** Enviar eventos de custo para sistema de billing externo (Stripe, etc.) em tempo real.
3. **Dashboard de custos:** Interface para visualizar gastos por org, período e tipo (texto vs imagem).

### Prioridade
**2** (Urgente — inviabiliza monetização e planos)

---

## Risco 4 — Plano Textual Só no Estado React

### Descrição
Todo o plano textual do carrossel (ideias, plano de slides, revisão editorial, caption + hashtags) existe apenas no estado do React (`useAiGenerateImagesStudio` hook, ~2655 linhas). Nada é persistido no backend até o usuário salvar manualmente via `POST /media/carousel`. Os endpoints de geração (`/carousel-ideas`, `/carousel-plan`, `/carousel-review`, `/carousel-caption`) retornam os dados mas não os armazenam.

### Severidade
**MÉDIA**

### Impacto no Produto
- **Perda ao recarregar página:** Se o usuário der F5 ou navegar para outra rota, todo o plano é perdido.
- **Sem rascunhos:** Não é possível salvar rascunhos parciais e retomar depois.
- **Workflow interrompido:** Se o usuário fecha o navegador acidentalmente, horas de trabalho com IA são perdidas.
- **Sem colaboração:** Dois usuários não podem trabalhar no mesmo carrossel simultaneamente.
- **Sem histórico:** Impossível ver versões anteriores do mesmo plano.

### Probabilidade
**Alta** — Ocorre toda vez que um usuário recarrega a página ou navega para fora do estúdio.

### Mitigação Proposta
1. **Auto-save no backend:** Criar endpoint `PUT /ai-generate/carousel-draft/:id` que persiste o plano como rascunho.
2. **Tabela `CarouselDraft`:** Modelo Prisma com status `draft`/`completed` e dados do plano em JSON (ou colunas normalizadas).
3. **Intervalo de auto-save no frontend:** Salvar a cada 30 segundos ou após cada etapa concluída.

### Prioridade
**3** (Importante — UX e retenção de usuários)

---

## Risco 5 — Sem Tabela de CarouselProject

### Descrição
Não existe uma entidade `CarouselProject` no banco de dados. Os carrosséis são salvos via `POST /media/carousel` onde cada slide vira um registro de mídia individual, e os metadados do projeto são armazenados textualmente no campo `alt` da mídia com prefixo `__CONTENTFLOW_CAROUSEL_PROJECT__:`.

### Severidade
**MÉDIA**

### Impacto no Produto
- **Vínculo frágil entre slides:** A associação entre slides de um mesmo carrossel é puramente textual (parse do `alt` no `MediaRepository` — função `parseCarouselProjectMetadata`).
- **Sem status editorial:** Não há campo para status (rascunho, revisão, aprovado, publicado).
- **Sem revisões:** Não há versionamento ou histórico de edições.
- **Sem vínculo com outros modelos:** Não há FK para `ContentIdea`, `BrandProfile` ou `Post`.
- **Query ineficiente:** Listar todos os carrosséis de uma org exige scan de todos os registros de mídia e parse do campo `alt`.

### Probabilidade
**Alta** — Já afeta todos os carrosséis existentes.

### Mitigação Proposta
1. **Criar modelo Prisma `CarouselProject`:** Com campos: id, organizationId, title, status, createdAt, updatedAt, brandProfileId (nullable).
2. **Criar modelo `CarouselSlide`:** Com FK para CarouselProject, índice, headline, body, cta, imagePrompt, imageUrl, mediaId.
3. **Script de migração:** Extrair metadados do campo `alt` e popular novas tabelas.
4. **Manter compatibilidade:** Ler do campo `alt` como fallback durante período de transição.

### Prioridade
**3** (Importante — necessário para Fases 2-5 do roadmap)

---

## Risco 6 — Sem Vínculo Brand DNA → Carrossel

### Descrição
Atualmente não há qualquer vínculo persistente entre a marca selecionada (CompanyProfile/BrandProfile) e o carrossel gerado. O `companyContext` é enviado como string no corpo da requisição, mas após a geração não fica registrado qual marca foi usada. O estado React armazena o contexto temporariamente, mas não persiste a relação.

### Severidade
**MÉDIA**

### Impacto no Produto
- **Sem analytics por marca:** Impossível medir quantos carrosséis foram gerados para cada marca.
- **Sem consistência:** O usuário pode gerar um carrossel para uma marca, mudar a marca, e o carrossel salvo não sabe qual marca gerou.
- **Sem reuso de brand DNA:** O sistema não pode sugerir automaticamente o brand DNA correto ao reabrir um carrossel.
- **Sem governança:** Auditoria de "qual conteúdo foi criado para qual marca" é impossível.

### Probabilidade
**Alta** — Ocorre em 100% das gerações atuais.

### Mitigação Proposta
1. **Adicionar `brandProfileId` ao `CarouselProject`:** FK para a tabela BrandProfile.
2. **Incluir brandProfileId no DTO de geração:** Associar o carrossel à marca no momento da criação.
3. **Snapshot do Brand DNA:** Salvar um snapshot do DNA da marca usado naquele momento (para reprodutibilidade).

### Prioridade
**3** (Importante — governança e analytics)

---

## Risco 7 — Dois Controllers Fazem Geração de Imagem

### Descrição
A geração de imagens é realizada por dois controllers diferentes:
1. **`AiGenerateController`** (`POST /ai-generate/images`) — via `AiGenerateService.generateImage()`, usado para geração individual e como parte dos jobs de carrossel.
2. **`MediaController`** (`POST /media/generate-image` e `POST /media/generate-image-with-prompt`) — via `MediaService.generateImage()`, que chama `OpenaiService.generatePromptForPicture()` antes e depois faz upload.

Ambos têm lógica similar de chamada a providers de IA e persistência, mas seguem caminhos diferentes.

### Severidade
**BAIXA**

### Impacto no Produto
- **Duplicação de lógica:** Manutenção de dois fluxos de geração de imagem aumenta custo de mudanças.
- **Inconsistência potencial:** Um fluxo pode ter tratamento de erro ou validação diferente do outro.
- **Confusão de providers:** `MediaController` usa apenas OpenAI (via `openai.service`), enquanto `AiGenerateController` usa `ia_generate` e `openai_official`.

### Probabilidade
**Alta** — Duplicação já existe e continuará divergindo.

### Mitigação Proposta
1. **Unificar geração de imagem:** `AiGenerateService.generateImage()` deve ser o único ponto de entrada.
2. **MediaController passa a delegar:** `MediaService.generateImage()` deve chamar `AiGenerateService` internamente.
3. **Deprecar endpoints duplicados:** Marcar `POST /media/generate-image` como deprecated e migrar frontend.

### Prioridade
**5** (Baixa — não afeta usuários diretamente)

---

## Risco 8 — Sem Versionamento de Prompts/Schemas de IA

### Descrição
Não há versionamento dos prompts de sistema, templates de resposta (system prompts) ou dos schemas JSON que a IA deve retornar. Os prompts estão hardcoded nas funções do `AiGenerateService.ts` e `OrganizationService.ts`. Quando um prompt é alterado, não há registro de qual versão gerou qual resultado.

### Severidade
**MÉDIA**

### Impacto no Produto
- **Impossível comparar versões:** Se um prompt for alterado, não é possível comparar a qualidade das respostas antes e depois.
- **Regression tracking:** Se uma alteração no prompt piora a qualidade, não há como reverter facilmente.
- **Debug difícil:** Não é possível saber qual prompt exato gerou um resultado problemático.
- **Auditoria zero:** Mudanças em prompts não são auditáveis.

### Probabilidade
**Alta** — Prompts mudam com frequência durante otimização.

### Mitigação Proposta
1. **Sistema de templates versionados:** Armazenar prompts em arquivos Markdown ou YAML com hash de conteúdo.
2. **Registrar versão do prompt nos resultados:** Incluir `promptVersion` ou hash na resposta da IA.
3. **Pipeline de avaliação:** CI que gera saídas de teste para comparar versões de prompt.
4. **Feature flags para prompts:** Poder alternar entre versões de prompt via configuração.

### Prioridade
**4** (Média — essencial para qualidade em escala)

---

## Risco 9 — SSRF ao Analisar URLs de Site

### Descrição
O serviço `ExtractContentService.extractContent(url)` faz um `fetch(url)` direto sem qualquer validação de segurança. A URL é fornecida pelo usuário via:

```typescript
// extract.content.service.ts linha 18
const load = await (await fetch(url)).text();
```

Isso é chamado em dois lugares:
1. **`OrganizationService.generateCompanySummary()`** — ao extrair conteúdo do site da empresa (linha 649).
2. **`AiGenerateService.generateCarouselPlan()`** — ao extrair conteúdo de URL fonte para repurpose (linha 822).

Não há:
- Validação de que a URL é um site público acessível
- Bloqueio de IPs privados (127.0.0.1, 10.x.x.x, 172.16.x.x, 192.168.x.x)
- Bloqueio de protocolos internos (file://, gopher://, dict://)
- Timeout configurado por chamada individual
- Limite de redirecionamento
- Validação de Content-Type

### Severidade
**ALTA**

### Impacto no Produto
- **Acesso a infraestrutura interna:** Atacante pode fazer o servidor acessar serviços internos (bancos de dados, Redis, APIs internas, cloud metadata endpoints).
- **Exfiltração de dados:** Serviços internos que retornam dados podem ter suas respostas enviadas para a OpenAI e potencialmente exfiltradas.
- **Port scanning:** Atacante pode usar o servidor como proxy para escanear portas internas.
- **Ataque a serviços cloud:** Meta dados da cloud (AWS `169.254.169.254`, GCP `metadata.google.internal`) podem ser acessados.

### Probabilidade
**Média** — Requer atacante conhecer o endpoint de geração de resumo ou plano de carrossel, mas não há autenticação adicional além do token da org.

### Mitigação Proposta
1. **Whitelist de protocolos:** Permitir apenas HTTP e HTTPS.
2. **Bloqueio de IPs privados:** Verificar resolved IP da URL contra ranges privados (RFC 1918, RFC 6598, link-local, loopback).
3. **Bloqueio de cloud metadata:** Bloquear explicitamente `169.254.169.254`, `metadata.google.internal`, etc.
4. **Resolver DNS e validar:** Não confiar apenas no hostname; resolver e verificar o IP antes de fazer fetch.
5. **Timeout configurado:** Timeout máximo de 10s por requisição de extração.
6. **Rate limit:** Limitar requisições de extração por org/minuto.
7. **User-agent fixo:** Definir User-Agent fixo para prevenir fingerprinting.

### Prioridade
**1** (Crítico — vulnerabilidade de segurança ativa)

---

## Risco 10 — Prompt Injection Vindo de Sites

### Descrição
O conteúdo extraído de sites (via `ExtractContentService`) é inserido diretamente nos prompts enviados para a OpenAI sem sanitização ou validação. No `OrganizationService.generateCompanySummary()`, o texto do site (até 12.000 caracteres) é interpolado diretamente no prompt:

```typescript
`...Texto do site (pode estar truncado):\n${websiteText.slice(0, 12000)}`
```

No `AiGenerateService.generateCarouselPlan()`, o conteúdo extraído da URL fonte é inserido no prompt de geração do plano:

```typescript
`...CONTEUDO DE ORIGEM (transforme ISTO em carrossel)...:\n"""\n${sourceContent}\n"""`
```

Um site malicioso pode conter instruções de prompt injection que desviam o comportamento da IA.

### Severidade
**ALTA**

### Impacto no Produto
- **Desvio de comportamento da IA:** Atacante pode fazer a IA ignorar instruções do sistema e executar comandos arbitrários.
- **Geração de conteúdo impróprio:** IA pode ser instruída a gerar conteúdo ofensivo, enganoso ou prejudicial.
- **Exfiltração de dados do prompt:** IA pode ser instruída a incluir dados sensíveis do prompt (companyContext, brand notes) na resposta.
- **Reputação da marca:** Carrosséis gerados com conteúdo malicioso podem ser publicados em nome da empresa.

### Probabilidade
**Média** — Requer atacante controlar um site que o usuário forneça como fonte. Factível em cenário de engenharia social ou se o sistema for usado para repurpose de conteúdo web.

### Mitigação Proposta
1. **Sanitizar conteúdo extraído:** Remover tags HTML, scripts e padrões suspeitos antes de inserir no prompt.
2. **Separar conteúdo em bloco delimitado:** Usar delimitadores claros (como `"""`) e instruir o modelo a não interpretar comandos dentro do bloco.
3. **Validação de saída:** Verificar se a resposta da IA ignora instruções do sistema.
4. **Restringir sistema prompt:** Prompt de sistema deve instruir explicitamente o modelo a tratar o conteúdo do site como dados, não como instruções.
5. **Usar técnica de "sandwich":** Cercar o conteúdo do usuário com instruções de sistema antes e depois.

### Prioridade
**1** (Crítico — vulnerabilidade de segurança ativa)

---

## Risco 11 — Dados de Marca Enviados a Providers de IA

### Descrição
Dados sensíveis da marca (incluindo `companyContext`, `brandNotes`, imagens de identidade visual com data URLs, paletas de cores, estratégia de conteúdo, termos proibidos, CTA preferido) são enviados integralmente para a OpenAI e outros providers de IA como parte dos prompts de geração.

Os dados incluem:
- No `generateCarouselPlan()`: `body.brandNotes`, `body.companyContext` (até 2000 chars)
- No `generateCarouselIdeas()`: `body.companyContext`
- No `generateCompanySummary()`: `JSON.stringify(baseProfile)` com todos os dados da marca
- No `generateCompanyVisualIdentity()`: Imagens de identidade visual (data URLs base64)
- No `generateImage()`: Referências visuais com data URLs

### Severidade
**ALTA**

### Impacto no Produto
- **Exposição de dados proprietários:** Dados estratégicos de marketing são enviados para servidores terceiros (OpenAI).
- **Violação contratual:** Clientes enterprise podem ter cláusulas contratuais que proíbem envio de dados a terceiros.
- **LGPD/GDPR:** Dados da empresa podem conter informações que, combinadas, identificam estratégia de negócio.
- **Sem possibilidade de opt-out:** Todos os fluxos de geração enviam dados da marca sem opção de desabilitar.

### Probabilidade
**Alta** — Ocorre em 100% das requisições de geração que usam contexto de marca.

### Mitigação Proposta
1. **Data Processing Agreement (DPA):** Garantir que o provider de IA tenha DPA assinado.
2. **API com retenção zero:** Usar APIs da OpenAI com `retention_policy` configurado para não armazenar dados.
3. **Opção de anonimização:** Permitir que o usuário opte por enviar apenas um resumo anonimizado (sem dados de marca específicos).
4. **Criptografia em trânsito:** Garantir HTTPS com TLS 1.3.
5. **Auditoria de dados enviados:** Logar quais dados de marca foram enviados para cada provedor.
6. **Self-hosted alternativo:** Para clientes enterprise, suportar modelos locais (Ollama, vLLM) que não enviam dados a terceiros.

### Prioridade
**2** (Urgente — risco legal/contratual)

---

## Risco 12 — Excesso de Custo por Geração Automática

### Descrição
O sistema permite geração automática de carrosséis sem limites claros de custo. Cada geração de carrossel típica envolve:

| Etapa | Chamadas | Custo aproximado (USD) |
|-------|---------|----------------------|
| Ideias | 1 chamada texto (gpt-4.1-mini) | ~$0.002 |
| Plano | 1 chamada texto | ~$0.01 |
| Review | 1 chamada texto | ~$0.005 |
| Caption | 1 chamada texto | ~$0.003 |
| Imagens (5 slides) | 5 chamadas imagem (gpt-image-2) | ~$0.20-0.50 |
| **Total por carrossel** | **9 chamadas** | **~$0.22-0.52** |

Os limites atuais são:
- Soft limit: R$50 (~$9.09 USD)
- Hard limit: R$100 (~$18.18 USD)
- Ambos armazenados apenas em memória (volátil)

Não há:
- Limite de gerações por dia/semana/mês
- Alerta de custo antes de confirmar geração
- Estimativa de custo exibida proativamente ao usuário
- Controle granular (ex: gerar imagens em preview com resolução menor)

### Severidade
**MÉDIA**

### Impacto no Produto
- **Surpresa na fatura:** Usuário pode gerar dezenas de carrosséis e só ver o custo no fim do mês.
- **Abuso não detectado:** Ator malicioso com acesso a uma org pode gerar centenas de carrosséis.
- **Planos inviáveis:** Modelo de negócio baseado em assinatura fixa pode ser inviabilizado por custos variáveis de IA.
- **Churn por custo:** Usuários podem abandonar a plataforma ao receber fatura inesperada.

### Probabilidade
**Alta** — Qualquer usuário pode gerar múltiplos carrosséis em sequência sem barreiras.

### Mitigação Proposta
1. **Exibir estimativa de custo:** Antes de cada geração, mostrar custo estimado com base nos parâmetros (já existe endpoint `/cost-estimate`).
2. **Limites diários/semanais:** Por plano de assinatura (ex: Plano Básico = 5 carrosséis/mês, Pro = 50/mês).
3. **Confirmação explícita:** Para gerações que excedem certo custo, exigir confirmação do usuário.
4. **Persistir limites em banco:** Mover soft/hard limits do Map volátil para a tabela `Organization` ou `Subscription`.
5. **Modo preview:** Gerar imagens em baixa resolução para preview, com opção de regenerar em alta.

### Prioridade
**3** (Importante — sustentabilidade do negócio)

---

## Risco 13 — Dados de uma Marca Vazarem para Outra

### Descrição
Como os dados de múltiplas marcas (CompanyProfiles) são armazenados em um único blob JSON dentro de `Organization.description`, e a separação entre marcas é puramente lógica (via `selectedCompanyId` e array `companies`), existe risco de vazamento cruzado entre marcas da mesma organização.

Cenários de risco:
- **Erro de parse:** Se o JSON for malformado ou corrompido, o parser pode retornar dados errados.
- **Concorrência:** Duas requisições simultâneas (ex: usuário A edita marca X, usuário B edita marca Y) podem causar lost update onde uma marca sobrescreve a outra.
- **Query sem filtro:** Como é um único campo, qualquer query que retorne `Organization.description` retorna todas as marcas.
- **Cache inconsistente:** Se houver cache em nível de ORM, pode servir dados de marca errada.

### Severidade
**MÉDIA**

### Impacto no Produto
- **Vazamento de dados estratégicos:** Cliente de uma marca pode acidentalmente ver dados de outra marca da mesma org.
- **Perda de dados:** Concorrência pode causar sobrescrita não intencional.
- **Violação de confiança:** Marcas dentro de uma agência (org multi-marca) devem ter isolamento total.

### Probabilidade
**Baixa** — Requer condição de corrida específica ou corrupção de dados. Porém, o risco aumenta com o número de marcas por organização e a frequência de edições concorrentes (cenário comum em agências com múltiplos usuários).

### Mitigação Proposta
1. **Tabelas separadas por marca:** `BrandProfile` com FK `organizationId` resolve o isolamento em nível de banco.
2. **Row-Level Security (RLS):** Se o banco suportar (PostgreSQL RLS), aplicar políticas por `brandProfileId`.
3. **Bloqueio otimista:** Usar `updatedAt` ou número de versão para prevenir lost updates durante a migração.
4. **Separação de responsabilidades:** Cada requisição deve especificar `brandProfileId` e o backend validar que a marca pertence à org.
5. **Auditoria de acesso:** Logar todo acesso a dados de marca com `brandProfileId`, `orgId` e `userId`.

### Prioridade
**4** (Média — risco real para agências multi-marca)

---

## Apêndice A — Mapeamento Risco x Código

| Risco | Arquivo(s) | Linha(s) |
|-------|-----------|---------|
| R1 — CompanyProfile JSON | `organization.service.ts` | 14-517, 572-629 |
| R2 — Jobs em Map | `ai-generate.service.ts` | 79, 1138-1259 |
| R3 — Custos em Map | `ai-generate.service.ts` | 80, 408-458 |
| R4 — Plano só no React | `use-ai-generate-images-studio.ts` | Hook completo (~2655 linhas) |
| R5 — Sem CarouselProject | `media.service.ts`, `media.repository.ts` | 17-18, `parseCarouselProjectMetadata()` |
| R6 — Sem vínculo Brand DNA | `ai-generate.service.ts` | 551-555 (companyContext como string) |
| R7 — Dois controllers | `ai-generate.controller.ts:16-22`, `media.controller.ts:52-85` | Ambos geram imagem |
| R8 — Sem versionamento | `ai-generate.service.ts` | System prompts hardcoded (linhas 546-555, 715-733, 893-907) |
| R9 — SSRF | `extract.content.service.ts` | 18 (`fetch(url).text()`) |
| R10 — Prompt injection | `organization.service.ts:661`, `ai-generate.service.ts:905` | Conteúdo interpolado no prompt |
| R11 — Dados a providers | `ai-generate.service.ts`, `organization.service.ts` | Múltiplas funções enviam dados de marca |
| R12 — Excesso de custo | `ai-generate.service.ts` | 455-457 (limites voláteis) |
| R13 — Vazamento entre marcas | `organization.service.ts` | 17-46 (mesmo blob para todas marcas) |

---

## Apêndice B — Matriz de Prioridade vs Roadmap

| Fase do Roadmap | Riscos Bloqueantes |
|----------------|-------------------|
| Fase 1 — Multi-brand + Persistência | R1, R5, R6 (criar tabelas BrandProfile, CarouselProject) |
| Fase 2 — Jobs resilientes | R2, R3 (persistir jobs e custos) |
| Fase 3 — Segurança | R9, R10, R11 (SSRF, prompt injection, dados de marca) |
| Fase 4 — Qualidade IA | R8 (versionamento de prompts) |
| Fase 5 — Monetização | R12 (limites de custo) |
| Contínuo | R4, R7, R13 (auto-save, unificação, isolamento) |
