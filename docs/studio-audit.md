# Auditoria do Studio — Diagnóstico de Causa Raiz

> Auditoria técnica da feature **Studio** (chat criativo / CopilotKit) do ContentFlow.
> Data: 2026-08-15. Escopo: exclusivamente o Studio e as dependências diretas que causam seus comportamentos.
> Natureza original: **diagnóstico**. Atualizado no mesmo dia com um ciclo de correções — ver
> **§5 Status de execução** para o que foi corrigido, o que foi investigado e documentado (mas não
> implementado, por depender de decisão do usuário ou de teste ao vivo que este ambiente não permite), e
> o que seguiu pendente.

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
- **Status (2026-08-15):** ✅ **Corrigido.** Não usei `toolCallId` diretamente (o `render` do
  `useCopilotAction` não expõe essa informação — confirmado no tipo `ActionRenderProps` do CopilotKit);
  em vez disso, `ContentPresentationAction` agora usa `useId()` do React como identidade estável por
  instância de render (cada tool call ocupa uma posição fixa própria na lista de mensagens do
  CopilotKit, então isso funciona como equivalente prático). `claimArtifactCard` foi reescrito para que
  a transferência de posse seja **de mão única**: um render estruturado pode tomar posse de um dono
  `text:` (fallback obsoleto), mas nunca de outro dono `structured:` — o que impedia o mecanismo de
  suprimir uma duplicata genuína. 9 testes novos cobrem exatamente esse mecanismo. Ver commit
  `fix(studio): stop duplicate ideas/carousel cards from rendering`.

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
- **Status (2026-08-15):** 🟡 **Código morto removido (parcial).** `extractPlainIdeasArtifact` (que
  tinha o `return` seguido de ~14 linhas inalcançáveis) e `extractLooseIdeasArtifact` — nenhuma das duas
  chamada em lugar nenhum — foram removidas, caindo de 7 para 5 parsers. A consolidação para 1 parser
  único continua pendente e depende de A3 (só faz sentido reduzir agressivamente os fallbacks depois que
  o tool-calling estiver mais confiável — do contrário, um fallback removido cedo demais pode deixar
  casos reais sem card nenhum).

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
- **Investigação (2026-08-15) — não implementado, decisão do usuário necessária:**
  - Confirmado por código: `AgentExecutionOptions` do Mastra (`node_modules/@mastra/core/dist/agent/agent.types.d.ts:425`)
    expõe um campo `toolChoice?: ToolChoice<any>`, e o shim OpenAI-compatible usado pelo kie.ai
    (`copilot.controller.ts:69-96`) repassa `tool_choice` no corpo da requisição de chat completions
    (o campo existe no SDK `openai` que o shim usa por baixo — `node_modules/openai/resources/chat/completions/completions.d.ts:1461`).
    Ou seja, a **capacidade técnica de forçar tool-calling existe** na pilha atual.
  - **Por que não apliquei:** forçar `toolChoice` teria que ser **condicional por turno** — só nos
    turnos em que uma tool_call é realmente obrigatória (ex.: apresentar ideias/carrossel), nunca nos
    turnos conversacionais (responder uma pergunta, o resumo de uma frase após o card). O ponto de
    integração atual (`defaultOptions` no `new Agent({...})`, o mesmo campo usado pelo fix de `maxSteps`
    do item C2) só permite configurar um valor **fixo para todo run**, não por turno. Aplicar
    `toolChoice: 'required'` global quebraria qualquer resposta puramente conversacional. Uma
    implementação correta exigiria um hook por-requisição (no mesmo padrão do `RequestContext` já usado
    para `ui`/`organization`/`studioAttachments`) que decida dinamicamente, a partir do conteúdo da
    mensagem (ex.: presença de `[--contentflow-intent--]`), se aquele turno específico deve forçar uma
    tool_call — trabalho de integração real, não uma linha de config, e cujo efeito só é verificável
    rodando contra o kie.ai de verdade.
  - **Recomendação concreta para decisão do usuário:** não recomendo trocar de modelo sem antes tentar
    a via mais barata — o `toolChoice` condicional acima — porque é reversível, não muda custo/latência
    de forma perceptível, e ataca exatamente o sintoma (o modelo às vezes não chama a tool). Trocar de
    modelo é a opção de maior risco/custo e só faria sentido se o `toolChoice` condicional, testado ao
    vivo, não resolver o suficiente.
  - **Atualização (2026-08-15, ao implementar C4):** a recomendação (a) — "isolar o prompt do Studio num
    agente dedicado" — teve sua **infraestrutura implementada**, como pré-requisito para dividir
    `creativeEngineTool` sem quebrar o MCP público (ver C4 abaixo): existe agora um agente Mastra separado
    (`'contentflow-studio'`) só para o chat do Studio. O que **não** foi feito é a parte de "enxuto" — o
    texto do prompt continua idêntico ao do agente original (mesmas ~45 regras, incluindo agendamento e
    integrações que talvez nem sejam necessárias no fluxo de criação de conteúdo). Ter dois agentes
    separados agora torna essa redução **segura de tentar depois**: qualquer ajuste no prompt do
    `'contentflow-studio'` não afeta mais o `'contentflow'` usado pelo MCP.

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
- **Status (2026-08-15):** 🟡 **Infraestrutura aditiva implementada; migração de dados e ligação do
  frontend deliberadamente não feitas.**
  - **O que foi feito:** `CarouselProject.id` foi adotado como identificador canônico, de forma
    **puramente aditiva**: `StudioCarouselImage` ganhou uma coluna `carouselProjectId` opcional
    (migration `20260815140000_add_carousel_project_link`), com índice único
    `(organizationId, carouselProjectId, slideId)` — nulo é tratado como distinto pelo Postgres, então
    não colide com as linhas existentes (todas sem esse campo). `cardKey` continua obrigatório e
    inalterado; nenhuma linha existente foi tocada ou migrada. `saveStudioCarouselImages` e
    `getStudioCarouselImages` (em `creative-engine.service.ts`) e os endpoints
    `POST`/`GET /creative/studio-carousel/images` agora aceitam `carouselProjectId` opcionalmente — a
    busca passou a checar `cardKey` OU `carouselProjectId`, o que quer que o chamador tenha.
  - **Por que não migrei os dados existentes:** confirmei antes de escrever qualquer SQL que um backfill
    automatizado é genuinamente arriscado aqui — recomputar o `cardKey` de um `CarouselProject` já salvo
    exige reproduzir exatamente o hash original das headlines, que só é estável se a copy nunca foi
    editada depois de salva; qualquer edição quebra o casamento silenciosamente. Migração de dados de
    produção sem forma de validar contra o banco real a partir deste ambiente (sem acesso SSH agora — ver
    memória do projeto) não é algo pra fazer sem supervisão explícita, então não escrevi esse UPDATE.
  - **Por que não liguei o frontend:** ao investigar, descobri que **não existe hoje nenhum botão** no
    card do carrossel que salve como `CarouselProject` — o salvamento (`contentStudioTool save-carousel`)
    só acontece via texto livre no chat, e o resultado não volta pro componente React que renderizou o
    card original (ele fica só na resposta do agente). Fazer o frontend usar `carouselProjectId`
    automaticamente exigiria construir esse mecanismo de retorno (ouvir por um resultado de save
    referenciando o mesmo card na stream de mensagens) — um trabalho de frontend separado, maior que
    "adicionar um campo", e que não estava no escopo original do B1.
  - **O que isso significa na prática:** a base está pronta e seguinda (nenhum risco pra dados
    existentes), mas o benefício real do B1 — carrosséis salvos não perderem mais o vínculo com suas
    imagens — só se realiza depois desse trabalho de frontend adicional. Até lá, o comportamento é
    idêntico ao de antes desta mudança.
  - **Próximos passos, em ordem:** (1) frontend: capturar o `carouselProjectId` quando `save-carousel`
    retornar e persisti-lo no estado do card; (2) frontend: enviar `carouselProjectId` junto de `cardKey`
    nas chamadas de salvar/carregar imagens; (3) só então avaliar se vale a pena um backfill dos dados
    antigos, com uma query de diagnóstico rodada em produção primeiro para dimensionar o volume.

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
- **Status (2026-08-15):** ✅ **Corrigido.** `StudioChat` agora lê `threadId` de `useCopilotContext()`
  (o CopilotKit já atribui um UUID real no mount, mesmo em `/studio/new` — `props.threadId || randomUUID()`,
  confirmado no código-fonte do `@copilotkit/react-core`) e faz `router.replace('/studio/{id}')` assim
  que a primeira mensagem está em voo, sem criar entrada nova no histórico. A idempotência de
  `rebuildMessages` no reload é resolvida transitivamente pela correção do A1: a deduplicação acontece
  na renderização, então uma duplicata que porventura já esteja persistida também é suprimida ao
  recarregar — não foi necessária lógica adicional de colapso no próprio `rebuildMessages`.

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
- **Status (2026-08-15):** ✅ **Corrigido no que é seguro sem depender do modelo ao vivo.** O prompt do
  Studio (`load.tools.service.ts`) foi atualizado para parar de instruir o agente a chamar
  `creativeEngineTool operation=generate-carousel` para um carrossel já apresentado via
  `contentPresentationTool` — o botão "Gerar Imagens" da UI é agora descrito como o único caminho de
  geração para esse caso, com a operação preservada só como fallback explícito para pedidos em texto
  livre sobre um carrossel que nunca virou card. Isso resolve a ambiguidade do ponto de vista das
  **instruções** ao modelo. O código de geração em si (o serviço `CreativeEngineService`, usado por
  ambos os caminhos) não foi alterado — nem precisava, já que a idempotência por hash de conteúdo já
  protege contra cobrança dupla mesmo se os dois caminhos disparassem juntos.

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
- **Status (2026-08-15):** ✅ **Corrigido.** `copilot.controller.ts` agora deriva a chave de um hash
  sha256 do corpo real da requisição, com um bucket de 30s. Um retry genuíno (corpo idêntico) reusa a
  mesma reserva; uma mensagem realmente nova (corpo diferente) sempre gera uma reserva nova.

---

#### C2 — Sem `maxSteps`/`stopWhen` explícito no agente — 🟡 MÉDIA

- **Problema:** O `Agent` Mastra é criado sem limite explícito de passos/loop
  (`libraries/nestjs-libraries/src/chat/load.tools.service.ts:62-160`).
- **Causa raiz:** Configuração default do loop de tools.
- **Sintoma:** O modelo pode re-emitir tools em múltiplos passos → alimenta A1 (duplicação).
- **Correção recomendada:** Definir `maxSteps`/`stopWhen` e regras claras de término por fluxo.
- **Risco:** Baixo-médio.
- **Status (2026-08-15):** ✅ **Corrigido.** `defaultOptions: { maxSteps: 8 }` no `new Agent({...})`.
  Nenhum fluxo legítimo do prompt precisa de mais que um punhado de tool calls por turno; 8 cobre esses
  casos com folga enquanto limita um loop descontrolado.

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
- **Status (2026-08-15):** 🟡 **Comportamento observável corrigido via A1; a estrutura em si permanece.**
  A correção do A1 trocou a semântica de posse (`ownerId` agora identifica a instância de render real via
  `useId()`, não mais derivado do conteúdo) — isso elimina o sintoma prático de duplicação que o C3
  descreve. O `Map` global ainda existe e ainda é resetado só na troca de thread; uma migração para
  estado por-thread genuíno (ex.: via contexto React escopado por thread, em vez de um Map de módulo)
  continua sendo a correção estrutural mais robusta a longo prazo, mas deixou de ser urgente — o `Map`
  global não é mais a fonte de nenhum bug observável conhecido depois do A1.

---

#### C4 — `creativeEngineTool`: multiplexador de 40 operações — 🟡 MÉDIA

- **Problema:** Uma única tool expõe **40 operações**
  (`libraries/nestjs-libraries/src/chat/tools/creative.engine.tool.ts:28-69`).
- **Causa raiz:** Superfície gigante numa tool só, difícil de o modelo acertar e de validar.
- **Sintoma:** O modelo escolhe operação/parâmetros errados; contribui para A3.
- **Correção recomendada:** Quebrar em tools menores e específicas para os fluxos do Studio.
- **Risco:** Médio.
- **Status (2026-08-15):** ✅ **Implementado, combinado com A3.** Descoberta crítica durante a
  investigação: `creativeEngineTool` é **exposta publicamente via MCP**
  (`docs/creative-engine/mcp.md`, confirmado em `start.mcp.ts:37` — `agent.listTools()`) para clientes
  externos autenticados por API key/OAuth. Como um `Agent` do Mastra tem um único mapa de `tools`
  compartilhado entre o runtime do chat e a exportação MCP, uma divisão simples da tool quebraria essa
  API pública. A correção implementada foi maior que o C4 original: criei um **segundo agente Mastra**
  dedicado (`'contentflow-studio'`), com o mesmo prompt e as mesmas capacidades do agente original, mas
  com `creativeEngineTool` substituída pelas 6 tools menores desenhadas abaixo. O agente `'contentflow'`
  original permanece **100% intacto** e é o único exposto via MCP.
  - **Arquitetura:** `libraries/nestjs-libraries/src/chat/tools/tool.list.ts` agora exporta `toolList`
    (original, MCP), `studioToolList` (novo, chat) e `allToolProviders` (união, para o DI do NestJS).
    `LoadToolsService` ganhou `studioAgent()` além de `agent()`, ambos chamando um `buildAgent()` privado
    compartilhado (mesmo prompt, mesmo modelo, mesmo `maxSteps`). `MastraService` registra os dois
    agentes na mesma instância `Mastra`. O frontend (`agent.chat.tsx`) passou a usar
    `agent="contentflow-studio"` no `<CopilotKit>`.
  - **Continuidade de conversas:** confirmado no schema do `@mastra/pg` que a tabela `mastra_threads` não
    tem coluna de agente — é uma migração zero-risco no sentido de que **nenhum dado de conversa é
    tocado**; threads existentes continuam visíveis normalmente.
  - **6 tools criadas** (`libraries/nestjs-libraries/src/chat/tools/creative-{catalog,project,generation,job,publish,workflow}.tool.ts`),
    preservando a lógica de cada operação 1:1 do arquivo original:
    1. `creativeCatalogTool` — leitura: `capabilities`, `presets`, `projects`, `project`, `assets`,
       `products`, `actors`, `voices`, `jobs`, `job`, `credits`, `metrics`, `publications`, `workflows`,
       `workflow`, `workflow-run`
    2. `creativeProjectTool` — `create-project`, `create-script`, `revise-script`
    3. `creativeGenerationTool` — `generate-image`, `generate-carousel`, `generate`, `generate-matrix`,
       `localize`, `run-preset`, `run-tool`, `quote-tool`, `quote`, `quote-matrix`
    4. `creativeJobTool` — `cancel-job`, `evaluate`, `review`
    5. `creativePublishTool` — `publish`, `export-project`, `download`
    6. `creativeWorkflowTool` — `create-workflow`, `validate-workflow`, `quote-workflow`, `run-workflow`,
       `cancel-workflow-run`
  - **Rede de segurança criada:** `creative.engine.tool.ts` tinha zero testes; as 6 tools novas ganharam
    **44 testes** cobrindo validação de campo obrigatório, o gate de confirmação por operação, e o
    dispatch correto pro service — incluindo um teste específico de fidelidade (`generate-carousel`
    preservando o campo `brief`, que eu mesmo esqueci na primeira versão e o teste pegou).
  - **Prompt:** as ~4 menções a `creativeEngineTool` por nome no texto compartilhado do prompt foram
    generalizadas (ex.: "use the Creative Engine generation tools" em vez do nome de uma tool específica),
    já que o texto agora serve os dois agentes e a tool antiga não existe mais no agente do Studio.
  - **O que ficou de fora, de propósito:** não "enxuguei" o prompt em si (a parte de A3 sobre reduzir as
    ~45 regras) — mantive o texto idêntico entre os dois agentes. Reduzir/reescrever o prompt é uma
    mudança de comportamento que só é verificável ao vivo contra o kie.ai, e ainda não foi feita.

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

## 5. Status de execução (2026-08-15)

Depois do diagnóstico, todos os itens de **"Corrigir primeiro"** e **"Corrigir em seguida"** foram
trabalhados no mesmo dia, cada um em commit próprio. Numa segunda rodada, a pedido explícito do usuário,
C4 e B1 também foram implementados (parcialmente, no caso do B1). Resultado final:

| Item | O que era | Status | Commit |
|---|---|---|---|
| A1 | Cards duplicados | ✅ Corrigido | `fix(studio): stop duplicate ideas/carousel cards from rendering` |
| A2 | Parsers mortos/duplicados | 🟡 Parcial — 2 de 7 parsers mortos removidos; consolidação total depende de A3 | (mesmo commit do A1) |
| C1 | Idempotência de crédito por `Date.now()` | ✅ Corrigido | `fix(studio): stop chat credit reservations from double-charging on retry` |
| B2 | Thread `new` nunca vira id na URL | ✅ Corrigido | `fix(studio): sync a new conversation's URL to its real thread id` |
| B3 | Geração em caminho duplo | ✅ Corrigido (nas instruções do modelo) | `fix(studio): stop instructing the agent to duplicate carousel image generation` |
| C2 | Sem `maxSteps`/`stopWhen` | ✅ Corrigido | `fix(studio): cap the agent's tool-call loop at 8 steps per run` |
| A4 | Mojibake/encoding | 🟡 Parcial — reparo morto removido; extração de valor sem acento é um achado novo, documentado, não corrigido | `fix(studio): remove a mojibake repair that never once fired` |
| C3 | Dedup por Map global | 🟡 Sintoma resolvido via A1; estrutura em si não migrada | — (efeito colateral do commit de A1) |
| A3 | Modelo/provider frágil | 🟡 Parcial — agente dedicado implementado (infra de C4); prompt não foi enxugado; `toolChoice` condicional documentado, não implementado | (mesmo commit do C4) |
| C4 | `creativeEngineTool` com 40 operações | ✅ Corrigido — 6 tools novas + agente dedicado `'contentflow-studio'`, MCP intacto, 44 testes novos | `fix(studio): split creativeEngineTool into a dedicated Studio agent` |
| B1 | Persistência fragmentada em 4 silos | 🟡 Parcial — schema+API aditivos prontos; ligação do frontend e migração de dados existentes não feitas | `fix(studio): add an optional CarouselProject link to StudioCarouselImage` |

**Legenda:** ✅ corrigido e commitado · 🟡 corrigido parcialmente (o que era seguro) · 🔵 investigado e
documentado, aguardando decisão do usuário antes de qualquer código.

**Por que A4/C3/A3/B1 ficaram parciais mesmo depois da segunda rodada:** cada um tem uma parte
genuinamente segura (código, verificável por type-check/teste) e uma parte que só é verificável **rodando
contra produção** (comportamento real do modelo) ou que **exige trabalho adicional fora do escopo
original** (o mecanismo de retorno do save no frontend, pro B1). A parte segura foi entregue; a parte que
dependia de teste ao vivo ou de escopo maior ficou documentada como próximo passo, em vez de arriscada às
cegas.

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
