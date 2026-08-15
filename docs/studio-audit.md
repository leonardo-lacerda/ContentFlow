# Auditoria do Studio — Diagnóstico de Causa Raiz

> Auditoria técnica da feature **Studio** (chat criativo / CopilotKit) do ContentFlow.
> Data: 2026-08-15. Escopo: exclusivamente o Studio e as dependências diretas que causam seus comportamentos.
> Natureza: **diagnóstico** — nenhuma alteração de código foi feita ao produzir este documento.

---

## 1. Resumo geral da saúde

O Studio **funciona no caminho feliz, mas é arquiteturalmente frágil**. A causa da maioria dos bugs
recorrentes não são os bugs em si — é que o Studio foi construído sobre **três premissas instáveis**
que geram sintomas infinitos:

1. **O modelo de IA não chama ferramentas de forma confiável.** O Studio usa **kie.ai `gpt-5-2`**
   através de um *shim* de compatibilidade OpenAI (`apps/backend/src/api/routes/copilot.controller.ts:77-96`),
   guiado por um prompt de **~45 regras** (`libraries/nestjs-libraries/src/chat/load.tools.service.ts:72-146`).
   Quando o modelo *não* emite o tool call estruturado (frequente), ele despeja o conteúdo em prosa/JSON no texto.

2. **Para compensar (1), acumularam-se camadas de "resgate" no frontend** — **7+ parsers de texto**
   que tentam reconstruir os cards a partir da prosa. Cada correção anterior adicionou mais um parser
   em vez de resolver a raiz.

3. **O conteúdo do Studio vive em 4 sistemas de persistência que não conversam entre si.**

**Por que correções anteriores não "pegaram":** elas trataram sintomas (mais um parser, mais um dedup,
mais timeout) enquanto a raiz — modelo não-confiável + caminhos de renderização/persistência competindo —
continuou intacta, gerando novos sintomas a cada ajuste.

**Veredito:** saúde **média-baixa**. Não precisa de reescrita total, mas precisa de **consolidação
arquitetural** em 3 pontos (renderização, modelo, persistência), não de mais remendos.

---

## 2. Problemas encontrados (por cluster de causa raiz)

### 🔴 CLUSTER A — Renderização de conteúdo (a raiz dos sintomas visíveis)

---

#### A1 — Cards duplicados — 🔴 CRÍTICA

- **Problema:** Vários painéis idênticos de "4 Ideias Prontas" (ou carrossel) aparecem na tela.
- **Localização:** `apps/frontend/src/components/agents/content-presentation-action.tsx:29-36` +
  o registro de dedup em `apps/frontend/src/components/agents/content-presentation-payload.ts:50-62`.
- **Causa raiz:** Existem **três caminhos de renderização** do mesmo card: (a) o `render` do
  `contentPresentationTool` ao vivo, (b) o parser de texto no `StudioAssistantMessage`, (c) a
  re-hidratação no reload (`rebuildMessages`). O mecanismo de dedup (`claimArtifactCard`) foi desenhado
  **só para suprimir o parser de texto** — o caminho estruturado chama `claimArtifactCard(..., takeOver=true)`
  e **ignora o valor de retorno**, renderizando sempre. Resultado: se o modelo emitir o
  `contentPresentationTool` **duas vezes** (ex.: repete as ideias ao processar o `transform-carousel`),
  os dois renderizam, sem nenhuma proteção.
- **Sintoma:** Painéis idênticos empilhados, ao vivo e persistindo no reload.
- **Impacto:** Confusão total de UX; o usuário não sabe qual card é "o real"; cliques podem ir para
  instâncias diferentes.
- **Relação:** Consequência direta de **A2/A3** (modelo repete conteúdo) e de **B2** (duplicatas são
  persistidas na memória Mastra e reaparecem no reload).
- **Por que correções anteriores falharam:** O dedup só cobre "texto vs estruturado", nunca
  "estruturado vs estruturado". Adicionar dedup por assinatura não resolve porque a assinatura é baseada
  nos títulos (`carousel:<headlines>`), e o caminho estruturado ignora o resultado do claim de qualquer forma.
- **Correção recomendada:** Deduplicar **por `toolCallId`** na lista de mensagens (uma renderização por
  tool call único), e no reload colapsar tool calls idênticos consecutivos antes de `rebuildMessages`.
  O `claimArtifactCard` deve passar a governar **todos** os caminhos (estruturado inclusive), respeitando o retorno.
- **Risco da correção:** Médio — mexer no dedup pode suprimir um card legítimo se a chave for mal escolhida.
  Precisa de teste com tool calls repetidos e reload.

---

#### A2 — Proliferação de parsers de fallback + código morto — 🟠 ALTA (arquitetural)

- **Problema:** Há **7+ extractors** de texto (`extractSummaryIdeasArtifact`, `extractPlainIdeasArtifact`,
  `extractLooseIdeasArtifact`, `extractLooseIdeasArtifactSafe`, `extractTitleIdeasArtifact`,
  `extractSequenceIdeasArtifact`, `extractStructuredPresentedArtifact`, `extractTransportArtifact`)
  tentando reconstruir cards da prosa.
- **Localização:** `apps/frontend/src/components/agents/agent.chat.tsx:566-929` e
  `apps/frontend/src/components/agents/idea-summary-parser.ts`.
- **Causa raiz:** Cada vez que o modelo produziu prosa em vez de tool call, alguém adicionou um novo parser.
  **Código morto confirmado:** `agent.chat.tsx:691` tem um `return` seguido de ~14 linhas inalcançáveis;
  e `extractPlainIdeasArtifact` **nem é chamado** por `extractPresentedArtifact` (linha 917).
- **Sintoma:** Cards que às vezes aparecem, às vezes não, às vezes duplicados, dependendo de qual parser
  "pega" a prosa. Comportamento não-determinístico.
- **Impacto:** Manutenção quase impossível; cada parser é uma nova fonte de bug e de duplicação (A1).
- **Por que correções anteriores falharam:** São, elas próprias, as correções anteriores. Tratam o sintoma
  (prosa) em vez da raiz (modelo não emite tool).
- **Correção recomendada:** Reduzir para **1 parser de fallback** bem-testado e tornar o tool-calling
  confiável (A3). Remover o código morto.
- **Risco:** Baixo remover código morto; médio consolidar parsers (algum caso raro pode deixar de ser
  resgatado — mitigado por A3).

---

#### A3 — Modelo/provider frágil para tool-calling — 🔴 CRÍTICA (a raiz de A1, A2, A4)

- **Problema:** O agente depende de tool-calling estruturado confiável, mas roda em **kie.ai `gpt-5-2`**
  via um shim que fabrica `openai.beta.chat.completions.stream`
  (`apps/backend/src/api/routes/copilot.controller.ts:82-93`) e `kie.chat(model)`
  (`libraries/nestjs-libraries/src/chat/load.tools.service.ts:15-32`), com um prompt de 45 regras conflitantes.
- **Causa raiz:** Modelo não-OpenAI atrás de camada de compatibilidade, com function-calling menos
  confiável, sobrecarregado por um prompt gigante que mistura regras de Studio, agendamento, integrações e crédito.
- **Sintoma:** Modelo ora emite tool, ora prosa, ora repete o tool — origem de A1/A2/A4.
- **Impacto:** É a **causa raiz upstream** da maior parte dos bugs de conteúdo.
- **Por que correções anteriores falharam:** Ninguém pode consertar no frontend um modelo que não chama
  a ferramenta. Todo esforço foi paliativo.
- **Correção recomendada:** (a) Isolar o prompt do Studio num agente dedicado e enxuto; (b) considerar
  forçar `tool_choice`/structured outputs quando o provider suportar; (c) avaliar um modelo com
  function-calling comprovado para o fluxo Studio. **Precisa de investigação adicional** sobre o que
  kie.ai `gpt-5-2` suporta.
- **Risco:** Alto (troca de modelo afeta custo/latência/qualidade) — exige testes A/B.

---

#### A4 — Encoding/mojibake (UTF-8 duplo) — 🟡 MÉDIA — **investigado em 2026-08-15, parcialmente corrigido**

- **Problema original:** Parsers cheios de reparos como `.replace(/Ã§/g,'c')`, `.replace(/Ã£/g,'a')`
  (`apps/frontend/src/components/agents/agent.chat.tsx`, dentro de `extractLooseIdeasArtifactSafe`,
  `extractTitleIdeasArtifact` e `extractSequenceIdeasArtifact`).
- **Descoberta concreta (verificável, sem depender do modelo ao vivo):** esses reparos eram
  **código morto — nunca executavam uma única vez**. A linha anterior fazia
  `.normalize('NFD').replace(/[̀-ͯ]/g, '')` antes do reparo de mojibake. Decompor um "Ã"
  precomposto (U+00C3) via NFD o separa em "A" + til combinante — que a etapa de strip já remove.
  Ou seja, quando o `.replace(/Ã./g, 'a')` rodava, **nunca existia mais nenhum "Ã" pra ele encontrar**.
  Uma correção que nunca corrigiu nada — pior que não ter correção, porque dava falsa confiança de que
  o mojibake estava tratado.
- **Correção aplicada:** removido o código morto (`.replace(/Ã./g, 'a')`) nas três funções — mudança
  segura, comprovável por semântica Unicode pura, sem dependência de comportamento do modelo.
- **Achado adicional, mais profundo (não corrigido ainda):** essas mesmas três funções extraem o
  **valor** de cada campo (hook, ângulo, objetivo, CTA) a partir do texto **já sem acentos**
  (`normalized`, a string pós-NFD-strip), não do texto original (`source`). Isso significa que,
  mesmo com input **perfeitamente bem codificado**, essas funções de fallback já removiam acentos de
  todo o conteúdo exibido ao usuário (ex.: "humanização" virava "humanizacao") — um bug real e ativo,
  independente da questão do mojibake.
- **Por que não foi corrigido nesta rodada:** o `readField` usa a posição do match dentro do texto
  normalizado para fatiar o campo; migrar a extração para ler do `source` original exige realinhar os
  offsets nas três funções e não há nenhum teste cobrindo essas três funções especificamente
  (`idea-summary-parser.spec.ts` cobre só `extractSummaryIdeasArtifact`, uma quarta função). Um erro de
  offset poderia trocar "sem acento" por "sem card nenhum" — uma regressão pior que a atual. Precisa de
  testes dedicados antes de mexer.
- **Causa raiz de origem (ainda não confirmada):** de onde vem o mojibake em primeiro lugar (kie.ai?
  o shim OpenAI-compatible? o runtime do CopilotKit?) continua sem confirmação — não há acesso a logs
  de produção nem forma de inspecionar os bytes brutos da resposta do provider a partir deste ambiente.
- **Correção recomendada (restante):** (1) mover a extração de valor para ler do `source` original nas
  três funções, com testes dedicados primeiro; (2) rastrear a origem do mojibake em produção (logar a
  resposta bruta do provider antes de qualquer processamento) para decidir se cabe corrigir na fonte.
- **Risco:** Baixo para o que falta (é um refactor mecânico, mas precisa de testes antes).

---

### 🟠 CLUSTER B — Estado & Persistência

---

#### B1 — Persistência fragmentada em 4 domínios não-sincronizados — 🟠 ALTA

- **Problema:** O mesmo carrossel existe (parcialmente) em 4 lugares que não se conhecem:
  1. **Memória Mastra (PostgresStore, mesmo `DATABASE_URL`)** — mensagens e tool calls do chat
     (`libraries/nestjs-libraries/src/chat/mastra.store.ts`); é a fonte da re-hidratação.
  2. **`StudioArtifact`** (Prisma) — drafts duráveis via `studioArtifactTool`.
  3. **`ContentIdea` / `CarouselProject`** (Prisma) — via `contentStudioTool` save-idea/save-carousel
     (`libraries/nestjs-libraries/src/chat/tools/content.studio.tool.ts`).
  4. **`CreativeJob` + media library + `StudioCarouselImage`** — imagens geradas.
- **Causa raiz:** Cada funcionalidade nasceu com seu próprio armazenamento e chave (thread id vs artifact id
  vs carousel project id vs `cardKey` hash). Não há um identificador canônico do "carrossel".
- **Sintoma:** Imagens somem ao voltar (corrigido parcialmente em 2026-08-15), "salvar" cria um objeto
  desconectado do card do chat, listagens divergem.
- **Impacto:** Dados perdidos/inconsistentes; a mesma peça aparece diferente em telas diferentes.
- **Relação:** É a raiz de vários "sintomas de persistência", incluindo o problema de imagens sumindo.
- **Por que correções anteriores falharam:** Cada correção adicionou **mais um** armazenamento (a
  `StudioCarouselImage` criada em 2026-08-15 é, honestamente, mais um remendo nesse mesmo padrão).
- **Correção recomendada:** Definir um **identificador canônico de carrossel** (ex.: `CarouselProject.id`)
  e fazer chat, imagens e artifacts referenciarem ele. Investigação adicional necessária para desenhar a
  migração sem quebrar threads existentes.
- **Risco:** Alto (mexe em dados de produção) — exige migração cuidadosa.

---

#### B2 — Ciclo de vida de thread: `new` nunca vira id na URL — 🟠 ALTA

- **Problema:** Em `/studio/new`, o CopilotKit gera um threadId interno
  (`apps/frontend/src/components/agents/agent.chat.tsx:401`), mas a **URL permanece `/studio/new`**
  durante toda a sessão — não há navegação para `/studio/{novoId}` após a 1ª mensagem
  (`apps/frontend/src/components/chat-studio/chat-studio.page.tsx:188-191`).
- **Causa raiz:** Descompasso entre o threadId do CopilotKit/Mastra e o roteamento do Next.
- **Sintoma:** Reload em conversa nova perde o contexto da URL; duplicatas geradas ao vivo (A1) ficam
  **persistidas na memória Mastra** e **reaparecem no reload** via `rebuildMessages`.
- **Impacto:** "Os erros voltam a aparecer".
- **Correção recomendada:** Capturar o threadId real após a 1ª resposta e fazer
  `router.replace('/studio/{id}')`; garantir `rebuildMessages` idempotente (colapsar tool calls repetidos).
- **Risco:** Médio.

---

#### B3 — Geração em caminho duplo (agente vs frontend direto) — 🟡 MÉDIA-ALTA

- **Problema:** As imagens do carrossel são geradas por **dois caminhos concorrentes**: o
  `creativeEngineTool` do agente (`libraries/nestjs-libraries/src/chat/tools/creative.engine.tool.ts`)
  **e** uma chamada direta do frontend a `/creative/carousel/generate-images`
  (`apps/frontend/src/components/agents/content-artifacts.component.tsx:627`) — este último introduzido
  justamente porque "o agente falhava em encadear a geração".
- **Causa raiz:** O caminho direto foi criado para contornar A3 (modelo não-confiável).
- **Sintoma:** Duas fontes de verdade para o estado de geração; o card e o agente podem divergir sobre o
  que foi gerado.
- **Impacto:** Estado inconsistente; a idempotência do servidor salva de cobrança dupla, mas a UI pode confundir.
- **Correção recomendada:** Padronizar num único caminho (o direto é mais confiável) e fazer o agente
  apenas **refletir** o resultado, não gerar.
- **Risco:** Médio.

---

### 🟠 CLUSTER C — Confiabilidade, custo e concorrência

---

#### C1 — Idempotência de crédito por `Date.now()` — 🟠 ALTA (financeiro)

- **Problema:** A reserva de crédito do chat usa fallback `chat:${org}:${thread}:${Date.now()}` quando não
  há header `idempotency-key` (`apps/backend/src/api/routes/copilot.controller.ts:195`).
- **Causa raiz:** `Date.now()` é único a cada chamada → **nenhuma** deduplicação real; um retry/reenvio cobra de novo.
- **Sintoma:** Consumo de crédito inflado silenciosamente (o comentário no código já admite que operações de
  metadata "billed ~3x").
- **Impacto:** Financeiro direto.
- **Correção recomendada:** Chave idempotente derivada do conteúdo da requisição (hash da mensagem + threadId),
  não do relógio.
- **Risco:** Médio — precisa garantir que reenvios legítimos ainda funcionem.

---

#### C2 — Sem `maxSteps`/`stopWhen` explícito no agente — 🟡 MÉDIA

- **Problema:** O `Agent` Mastra é criado sem limite explícito de passos/loop
  (`libraries/nestjs-libraries/src/chat/load.tools.service.ts:62-160`).
- **Causa raiz:** Configuração default do loop de tools.
- **Sintoma:** O modelo pode re-emitir tools em múltiplos passos → alimenta A1 (duplicação).
- **Correção recomendada:** Definir `maxSteps`/`stopWhen` e regras claras de término por fluxo.
- **Risco:** Baixo-médio.

---

#### C3 — Dedup por `Map` global de módulo — 🟡 MÉDIA

- **Problema:** `artifactCardOwners` é um `Map` no escopo do módulo, resetado só na troca de thread
  (`apps/frontend/src/components/agents/content-presentation-payload.ts:15-17`).
- **Causa raiz:** Estado global mutável compartilhado entre renders/threads; sensível a StrictMode/HMR e à
  ordem de renderização.
- **Sintoma:** Dedup não-determinístico; cards suprimidos ou duplicados conforme timing.
- **Correção recomendada:** Migrar a posse para estado por-thread derivado da lista de mensagens (ver A1),
  eliminando o Map global.
- **Risco:** Médio.

---

#### C4 — `creativeEngineTool`: multiplexador de 40 operações — 🟡 MÉDIA

- **Problema:** Uma única tool expõe **40 operações**
  (`libraries/nestjs-libraries/src/chat/tools/creative.engine.tool.ts:28-69`).
- **Causa raiz:** Superfície gigante numa tool só, difícil de o modelo acertar e de validar.
- **Sintoma:** O modelo escolhe operação/parâmetros errados; contribui para A3.
- **Correção recomendada:** Quebrar em tools menores e específicas para os fluxos do Studio.
- **Risco:** Médio.

---

### 🟢 Já corrigidos em 2026-08-15 (exemplos do padrão "band-aid")

- **429 no polling de imagens** — resiliência no polling + limite `creative-read` 120→600/min. ✅
- **Lightbox preso no card** — renderização via portal para `document.body`. ✅
- **Imagens não persistiam** — nova tabela `StudioCarouselImage`. ✅
  (mas ver **B1**: isso é, em si, mais um armazenamento no padrão fragmentado; o `cardKey` por headline
  tem aresta de colisão quando dois carrosséis têm títulos idênticos.)

---

## 3. Causas raiz consolidadas (a "árvore")

```
RAIZ 1: Modelo/provider não emite tool-calls de forma confiável  (A3)
   ├── A2  proliferação de parsers de texto + código morto
   ├── A1  cards duplicados (estruturado + fallback, sem dedup real)
   ├── A4  reparos de encoding/mojibake
   ├── B3  caminho de geração direto criado para contornar o modelo
   └── C4  tool gigante que o modelo erra

RAIZ 2: Ausência de identidade canônica do conteúdo do Studio  (B1)
   ├── B2  thread "new" nunca vira id na URL
   ├── imagens somem / listas divergem
   └── StudioCarouselImage (novo) = mais um silo

RAIZ 3: Estado efêmero global + billing por relógio  (C1, C2, C3)
   └── duplicação persistida, cobrança inflada, dedup não-determinístico
```

**Insight central:** quase tudo que aparece como "bug do Studio" desce para **RAIZ 1 (modelo não-confiável)**
ou **RAIZ 2 (sem identidade canônica)**. Enquanto essas duas não forem endereçadas, cada correção pontual
vira mais um remendo.

---

## 4. Prioridade e plano de correção

### Corrigir primeiro (param a "sangria" visível, baixo risco)

1. **A1 + C3 juntos** — deduplicar renderização por `toolCallId` e eliminar o `Map` global. Mata a
   duplicação visível. *(1 frente, risco médio, alto impacto)*
2. **A2 (limpeza)** — remover código morto (`agent.chat.tsx:691`, `extractPlainIdeasArtifact`). *(risco baixo)*
3. **C1** — idempotência de crédito por hash de conteúdo. *(risco médio, para a cobrança inflada)*
4. **B2** — `router.replace` para o threadId real + `rebuildMessages` idempotente. *(impede duplicatas de reaparecerem)*

### Corrigir em seguida (ataca as raízes, exige investigação/teste)

5. **A3** — enxugar o prompt do Studio num agente dedicado + forçar tool-calling; avaliar modelo. *(raiz nº 1)*
6. **B3** — unificar o caminho de geração.
7. **C2 / C4** — `maxSteps` + quebrar o `creativeEngineTool`.

### Refatoração estrutural (planejar, não improvisar)

8. **B1** — identidade canônica de carrossel + migração dos 4 silos. *(maior esforço, maior risco, maior payoff de longo prazo)*

### Podem ser resolvidos juntos

- A1 + C3 (mesmo código de dedup)
- A2 limpeza junto de A1
- C2 + C4 (config do agente/tools)
- B1 + B3 (persistência + geração unificadas)

### Precisam de investigação/teste adicional antes de mexer

- **A3:** o que kie.ai `gpt-5-2` realmente suporta (`tool_choice`, structured outputs)? Sem isso, não dá pra
  decidir a estratégia do modelo.
- **A4:** onde exatamente o UTF-8 é duplo-codificado (fetch do provider? runtime?).
- **B1:** mapear todas as leituras/escritas dos 4 silos antes de desenhar a migração.

### Precisam de refatoração (não só fix)

- O pipeline de renderização de artifacts (`apps/frontend/src/components/agents/agent.chat.tsx`, ~1600 linhas
  com 7 parsers).
- A camada de persistência do Studio (B1).

---

## Apêndice — Arquivos-chave do Studio

**Frontend**
- `apps/frontend/src/components/chat-studio/chat-studio.page.tsx` — página/shell, sidebar, threads
- `apps/frontend/src/components/agents/agent.chat.tsx` — orquestração CopilotKit, parsers, re-hidratação
- `apps/frontend/src/components/agents/content-artifacts.component.tsx` — cards de ideias e carrossel
- `apps/frontend/src/components/agents/content-presentation-action.tsx` — ponte tool→card
- `apps/frontend/src/components/agents/content-presentation-payload.ts` — resolução de payload + dedup
- `apps/frontend/src/components/agents/creation-options.component.tsx` — configurador
- `apps/frontend/src/components/agents/idea-summary-parser.ts` — parser de fallback

**Backend**
- `apps/backend/src/api/routes/copilot.controller.ts` — runtime do agente, memória, crédito
- `apps/backend/src/api/routes/studio.controller.ts` — artifacts/attachments
- `libraries/nestjs-libraries/src/chat/load.tools.service.ts` — definição do agente + prompt
- `libraries/nestjs-libraries/src/chat/mastra.store.ts` — store Postgres da memória
- `libraries/nestjs-libraries/src/chat/tools/content.presentation.tool.ts` — tool de apresentação
- `libraries/nestjs-libraries/src/chat/tools/content.studio.tool.ts` — save/list ideias e carrosséis
- `libraries/nestjs-libraries/src/chat/tools/creative.engine.tool.ts` — multiplexador de geração (40 ops)
- `libraries/nestjs-libraries/src/chat/studio/studio-artifact.service.ts` — artifacts duráveis
- `libraries/nestjs-libraries/src/creative-engine/creative-engine.service.ts` — motor de geração
