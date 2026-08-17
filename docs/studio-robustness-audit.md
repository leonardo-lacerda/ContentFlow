# Auditoria de Robustez do Studio — por que mudanças causam regressão

> Auditoria **independente**, feita direto do código em 2026-08-16. Escopo: o Studio
> (chat criativo / CopilotKit) e as costuras que fazem "mexer numa coisa quebrar outra".
> Diferente de uma auditoria de bugs: a pergunta aqui não é "que bugs existem", e sim
> **"por que o sistema regride a cada alteração"** — que é um problema de arquitetura de
> testes e de isolamento, não de bugs isolados.

---

## 1. Diagnóstico central

O Studio funciona no caminho feliz. O problema que o usuário relata — *"praticamente toda
vez que fazemos uma alteração, alguma outra parte que antes funcionava deixa de
funcionar"* — **não** é causado pelos bugs em si. É causado por **três ausências
estruturais** que fazem qualquer mudança ser um tiro no escuro:

1. **A parte mais alterada do sistema não tinha rede de testes automatizada nenhuma.**
2. **A costura entre backend e frontend (tool → card) não tinha contrato verificável.**
3. **Uma única falha de render derrubava o estúdio inteiro** (sem isolamento de erro).

Enquanto essas três não forem resolvidas, cada correção pontual continua sendo verificada
só a olho no navegador — e "a olho" não pega regressão em código que você não está olhando
naquele momento. É exatamente esse o mecanismo do "mexeu aqui, quebrou lá".

---

## 2. Achados (com evidência de código)

### 🔴 R1 — Zero rede de testes na área mais frágil (a raiz da regressão) — **CORRIGIDO**

- **Evidência:**
  - `apps/frontend` não tinha runner de teste: sem `jest.config`, sem `vitest.config`,
    sem script `test` no `package.json`.
  - Existiam **5 arquivos `.spec.ts`** dentro de `apps/frontend/src` (parsers de ideias,
    dedup de payload, operações de slide, presets) que **nunca executavam** — confirmei
    rodando: falhavam só de carregar, porque nunca foram ligados a um runner.
  - O `pnpm test` da raiz (o que o CI roda) usa `apps/backend/jest.config.ts`, cujos
    `roots` são só `apps/backend/src` + `libraries`. O frontend está fora do alcance.
  - A própria `apps/frontend/tsconfig.json` **exclui** `src/**/*.spec.ts` — os testes nem
    eram type-checkados.
- **Consequência:** `agent.chat.tsx` (1437 linhas de parsers/dedup/re-hidratação) e
  `content-artifacts.component.tsx` (1071 linhas de cards) só eram validados a olho, no
  navegador. Toda mudança ali era não-verificável de forma automatizada.
- **Correção aplicada:**
  - `vitest` já estava instalado (3.1.4) mas nunca configurado. Criei
    `apps/frontend/vitest.config.ts` (jsdom, plugin-react, resolução de aliases `@gitroom/*`)
    e `vitest.setup.ts`.
  - Adicionei `test`/`test:watch` ao `apps/frontend/package.json` e liguei ao `pnpm test`
    da raiz via `test:backend && test:frontend` — agora o CI roda **os dois**.
  - Os 5 specs órfãos passaram a rodar: **119 testes que estavam mortos agora executam e
    passam.** Um deles (`build-ampliar-url`) tinha um bug de asserção real que só apareceu
    quando o teste finalmente rodou (`decodeURIComponent` não converte `+` em espaço) —
    corrigido.

### 🔴 R2 — Costura tool → card sem contrato verificável — **CORRIGIDO**

- **Evidência:** o backend (`content.presentation.tool.ts`) emite
  `{ result: { type:'IDEAS'|'CAROUSEL_PREVIEW', ideas|slides, ... } }`, **sem** campo
  `operation`. O frontend (`content-presentation-payload.ts → resolveContentPresentation`)
  precisa inferir a operação da presença de `ideas[]`/`slides[]` e desembrulhar 3 formatos
  possíveis de envelope. Não havia **nenhum** teste garantindo que o formato emitido é o
  formato esperado — e a tool do backend não tinha spec nenhuma.
- **Consequência:** classe #1 de regressão silenciosa. Qualquer mudança de shape num lado
  (renomear um campo, mudar o wrapping) passava batida até alguém ver no navegador que o
  card não aparece.
- **Correção aplicada:** teste de contrato nos **dois lados**, apontando um para o outro:
  - `content.presentation.tool.spec.ts` (backend, 7 testes) — trava o envelope emitido.
  - `content-presentation-contract.spec.ts` (frontend, 4 testes) — alimenta o resolver com
    o **exato** envelope do backend e valida a resolução, incluindo `inProgress → null` e
    envelope malformado → `null` (nunca um card quebrado).
  - Se qualquer lado divergir, um dos dois specs quebra. É essa a rede que faltava.

### 🔴 R3 — Sem isolamento de erro: um card ruim derrubava tudo — **CORRIGIDO**

- **Evidência:** havia **um único** error boundary (`AgentChatErrorBoundary`,
  `agent.chat.tsx:446`), envolvendo o chat **inteiro**. Qualquer exceção ao renderizar um
  card malformado (um shape que os parsers de texto não previram, um campo nulo que o card
  assumia presente) caía nesse boundary e **substituía o estúdio inteiro** — ainda por cima
  com uma mensagem enganosa ("o provedor de IA não está configurado", que não tem nada a
  ver com um crash de render), forçando reload.
- **Consequência:** este é o motivo estrutural de "uma mudança num card quebrar tudo". Sem
  contenção de raio de explosão, o pior caso de qualquer card é sempre o estúdio em branco.
- **Correção aplicada:**
  - Novo `CardErrorBoundary` (`card-error-boundary.tsx`), com 4 testes
    (`card-error-boundary.spec.tsx`) provando que um card que quebra vira um aviso inline
    enquanto o card vizinho continua renderizando.
  - Aplicado nos **dois** caminhos de render de card (estruturado em
    `content-presentation-action.tsx`; fallback de texto em `agent.chat.tsx`) e por
    mensagem no `StudioAssistantMessageWithAction`.
  - Corrigida a cópia enganosa do boundary global (que agora é só o último recurso).

---

## 3. Achados estruturais restantes (recomendações, não corrigidos nesta rodada)

Estes são reais e alimentam a fragilidade, mas exigem verificação ao vivo ou refatoração
maior — documento para não virar remendo às cegas:

### 🟠 R4 — Comportamento crítico codificado em prompt de prosa (~45 regras) — **PARCIAL (2026-08-17)**

- **Decisão importante antes de mexer:** o histórico (`git log 883aa08`) mostra que a
  classificação de intenção (saudação vs. pedido de conteúdo, etc.) **já foi feita em
  código** (regex/keywords) e foi **deliberadamente revertida** por ser pior — "me da 2
  ideias" batia só por acaso, "me de 2 ideias"/"2 ideias"/"quero ideias" caíam em prosa
  comum. Reintroduzir classificação por regex seria repetir esse erro já corrigido. Por
  isso, a classificação de linguagem natural (é uma saudação? é um pedido de ideias vs.
  criação?) permanece no modelo — não é candidata a extração para código.
- **O que É genuinamente mecânico e foi extraído:**
  1. **Limite de 10 ideias** — o prompt já dizia "cap anything above 10 at 10", mas isso
     era só confiança em prosa; o modelo pode simplesmente não seguir (como já aconteceu
     com duplicação de cards, ver A1/C2 na auditoria antiga). Agora `content.presentation.tool.ts`
     corta o array para 10 itens no código, incondicionalmente. 2 testes novos (limite e
     boundary exato).
  2. **Blocos de marcador `[--nome--]...[--nome--]`** (`content-action`, `creation-options`,
     `contentflow-intent`, `integrations`) — a limpeza desses blocos para exibição estava
     duplicada como regex ad-hoc, sem teste, em dois lugares (`StudioAssistantMessage` e
     `Message`/user-message). Consolidado num único módulo testado,
     `studio-marker-blocks.ts` (`stripStudioMarkerBlocks`), 6 testes novos.
- **Investigado e explicitamente NÃO implementado — o achado mais valioso desta rodada:**
  cliques de botão no card (`transform-carousel`, `approve-carousel-copy`, etc.) viram
  **texto** (`ACTION: X.\nPAYLOAD: {...}`) que o **modelo** tem que reparsear da mensagem —
  mesmo já existindo `action`/`payload` estruturados no frontend, e mesmo já existindo o
  mecanismo `RequestContext` usado para `brandContext`/`studioAttachments`/`organization`.
  Investiguei mover isso para `RequestContext` (determinístico, sem depender do modelo
  reparsear texto) e decidi **não implementar às cegas**: toda leitura existente de
  `req.body` em `copilot.controller.ts` (ex.: a cadeia de fallback
  `req.body?.threadId || req.body?.thread?.id || req.body?.variables?.threadId`) já lida com
  **múltiplos formatos possíveis em cascata**, sinal de que ninguém validou o shape exato do
  GraphQL do CopilotKit com tráfego real. Construir lógica nova sobre um caminho não
  verificado repetiria exatamente o padrão "às vezes funciona, às vezes não" que essa
  rodada inteira existe para eliminar. **Recomendação para o futuro:** validar o shape real
  de `req.body.variables` com uma request autenticada de verdade (ou logging temporário em
  produção) antes de implementar o parse determinístico do clique.
- **Prompt em si:** não foi reduzido/reescrito (a parte "enxugar as ~45 regras" da
  recomendação original) — mudar o texto do prompt só é verificável rodando ao vivo contra
  o modelo, fora do que dá para validar com testes automatizados nesta sessão.
- Suítes completas verdes após a mudança: backend 55/312 (2 testes novos), frontend 9/156
  (6 testes novos).

### 🟠 R5 — 5 parsers de texto de fallback legados em `agent.chat.tsx` — **CORRIGIDO (2026-08-17)**

- **Achado adicional durante a correção, mais grave que "parsers redundantes":** só
  `extractSummaryIdeasArtifact` marcava `renderFromText: true` — e só essa flag faz
  `StudioAssistantMessage` renderizar um card de fallback. Os outros 4 parsers
  (`extractStructuredPresentedArtifact`, `extractLooseIdeasArtifactSafe`,
  `extractTitleIdeasArtifact`, `extractSequenceIdeasArtifact`) só limpavam o texto bruto
  exibido — nunca produziam um card visível. Confirmado via `git log -S` que a flag foi
  introduzida num commit que criou `extractSummaryIdeasArtifact` especificamente para
  "restaurar" os cards, e nunca foi retroaplicada aos 4 parsers pré-existentes. Resultado em
  produção: sempre que o modelo despejava ideias/carrossel num desses 4 formatos, o texto
  bruto era removido da tela e **nenhum card aparecia** — perda silenciosa de conteúdo já
  gerado.
- **Segundo achado:** o helper `readField` (triplicado nos 3 parsers de prosa) interpolava
  labels alternativos (`'gancho|hook'`, `'chamada para acao|cta'`) sem agrupá-los:
  `` `${labels}[^:]*: *(.+)` `` vira `gancho|hook[^:]*: *(.+)` — por precedência do `|`, isso
  é `(gancho)` OU `(hook[^:]*: *(.+))`. Como o rótulo em português (`gancho:`) é o comum, a
  extração sempre caía no ramo sem grupo de captura, retornando vazio e caindo no valor
  default genérico. CTA tinha o mesmo problema com `chamada para acao|cta`.
- **Correção aplicada:**
  - Extraídas as 5 funções (mais o parser de JSON balanceado duplicado dentro de
    `extractStructuredPresentedArtifact`) para um novo módulo testável,
    `fallback-artifact-parser.ts`. As 3 heurísticas de prosa quase-idênticas
    (`extractLooseIdeasArtifactSafe`/`extractTitleIdeasArtifact`/`extractSequenceIdeasArtifact`)
    viraram 3 estratégias internas de uma única função pública `extractProseIdeasArtifact`,
    compartilhando `readField`/`cleanIdeaLine` (antes triplicados), na mesma ordem de
    precedência original.
  - `renderFromText: true` agora é aplicado uniformemente em todo `extractPresentedArtifact`
    — qualquer parse bem-sucedido de qualquer estratégia agora efetivamente renderiza um
    card, fechando o vazamento de conteúdo.
  - Corrigido o bug de agrupamento do `readField` (`(?:${labels})[^:]*: *(.+)`).
  - **23 testes de caracterização** novos (`fallback-artifact-parser.spec.ts`), incluindo um
    teste que documenta explicitamente uma falha pré-existente e não corrigida (títulos em
    negrito misturam a estratégia "sequence" com o conteúdo da ideia anterior) — capturada
    como comportamento conhecido, não silenciosamente confiável.
  - `extractSummaryIdeasArtifact` (`idea-summary-parser.ts`) mantido como estava — já tinha
    testes próprios e escopo bem definido.
  - Suítes completas verdes após a mudança: backend 55/310, frontend 8/150.

### 🟠 R6 — Persistência fragmentada em 4 silos sem id canônico — **PARCIAL (2026-08-17)**

- Memória Mastra, `StudioArtifact`, `ContentIdea`/`CarouselProject`, `StudioCarouselImage`
  não compartilham um identificador único de carrossel. A infraestrutura aditiva (coluna
  `carouselProjectId` em `StudioCarouselImage`, API aceitando o id em ambos os endpoints)
  já existia de uma sessão anterior — ver histórico do B1.
- **Duas frentes investigadas e deliberadamente NÃO implementadas nesta rodada:**
  1. **Backfill dos dados existentes** — recomputar o `cardKey` (hash das headlines) de um
     `CarouselProject` já salvo só é seguro se a copy nunca foi editada depois; validar isso
     exige rodar uma query de diagnóstico contra o banco real primeiro. Sem acesso
     SSH/produção nesta sessão (ver memória do projeto: acesso revogado), continua
     impossível de fazer com segurança.
  2. **Ligar o frontend** — o `save-carousel` (`contentStudioTool`) só é acionado por texto
     livre no chat ("salva esse carrossel"), como uma tool call **desconectada** do
     componente React que renderizou o card original. Fazer o card capturar o
     `carouselProjectId` de volta exigiria escanear o restante da lista de mensagens em
     busca de um resultado de tool call posterior com conteúdo equivalente (mesmo mecanismo
     de assinatura usado no dedup de cards) — infraestrutura nova na área mais frágil do
     sistema. **Verifiquei antes de decidir:** `grep` confirma que `getStudioCarouselImages`/
     `/creative/studio-carousel/images` **não tem nenhum outro consumidor no frontend** além
     do próprio card do carrossel — ou seja, hoje não existe nenhuma tela (biblioteca de
     carrosséis, etc.) que se beneficiaria de já ter o `carouselProjectId` ligado. Implementar
     esse mecanismo agora seria infraestrutura especulativa, arriscada, sem consumidor real.
     Fica documentado como pré-requisito de uma feature futura (ex.: tela "Meus Carrosséis"),
     não como trabalho a fazer isoladamente.
- **O que FOI corrigido, dentro do que é seguro sem acesso a produção/modelo ao vivo:**
  `content.studio.tool.ts` — o ponto central que escreve em 3 dos 4 silos (`ContentIdea`/
  `CarouselProject` via os services, `StudioArtifact` via `persistStudioArtifact`/
  `versionStudioArtifact`, e a metadata da thread Mastra via `linkArtifactToThread`) —
  tinha **zero testes**, o mesmo padrão exato do R2 (`content.presentation.tool.ts` também
  tinha zero testes antes de ser corrigido). **22 testes novos** cobrindo: resolução de
  marca (explícita → selecionada → primeira → erro), a heurística de escala de score
  (0-10 → ×10 vs. já-0-100, caracterizada como está, não alterada — mudar a heurística sem
  saber o que o modelo realmente envia seria um chute), indexação de slides, criação vs.
  versionamento de `StudioArtifact` (por `sourceId` na metadata), e o invariante mais
  importante: a vinculação à thread é *best-effort* e **nunca** pode derrubar um save que já
  teve sucesso — testado explicitamente sem `threadId`, com `mastra` ausente, e com a
  própria consulta da thread lançando erro.
- Suítes completas verdes após a mudança: backend 56/334 (22 testes novos).

---

## 4. O que mudou nesta rodada (resumo)

| Item | Antes | Depois |
|---|---|---|
| Rede de testes frontend | inexistente; 5 specs mortos | vitest ligado ao CI; **127 testes** rodando e verdes |
| Contrato tool → card | nenhum | specs de contrato nos dois lados |
| Isolamento de erro | 1 boundary global (derruba tudo) | boundary por card + por mensagem |
| Cópia de erro enganosa | "provedor não configurado" | mensagem honesta de erro inesperado |
| Parsers de fallback (R5) | 5 funções duplicadas; 4 nunca renderizavam card | 1 módulo testado; bug de perda silenciosa corrigido; 23 testes |
| Limite de ideias / marcadores (R4) | só confiança em prosa; regex duplicada sem teste | limite forçado em código; 1 módulo de stripping testado; 8 testes |
| `content.studio.tool.ts` (R6) | zero testes no ponto central de escrita em 3 silos | 22 testes; invariante "save nunca falha por causa do link à thread" travado |

Baseline final desta rodada: **backend 56 suites / 334 testes, frontend 9 suites / 156 testes**, todos verdes, confirmados no CI (ambiente limpo) a cada push.

**Princípio para daqui pra frente:** toda mudança no pipeline de render/costura agora tem
onde falar "isso quebrou" **antes** do navegador. A robustez real vem de manter e expandir
essa rede — não de mais um parser ou mais um dedup.
