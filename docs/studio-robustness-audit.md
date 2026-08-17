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

### 🟠 R4 — Comportamento crítico codificado em prompt de prosa (~45 regras)

- `load.tools.service.ts` define o roteamento de intenção, regras de carrossel, agendamento
  e crédito num único bloco de instruções de ~200 linhas. Decisões de roteamento **não são
  testáveis** — um ajuste de prompt para um fluxo (ex.: ideias) pode mudar silenciosamente
  outro (ex.: saudação vira card). Recomendo extrair a lógica de decisão que puder para
  código testável e reduzir o prompt do agente dedicado `contentflow-studio`.

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

### 🟠 R6 — Persistência fragmentada em 4 silos sem id canônico

- Memória Mastra, `StudioArtifact`, `ContentIdea`/`CarouselProject`, `StudioCarouselImage`
  não compartilham um identificador único de carrossel. Mexe em dados de produção; precisa
  de migração cuidadosa validada contra o banco real. Não fazer às cegas.

---

## 4. O que mudou nesta rodada (resumo)

| Item | Antes | Depois |
|---|---|---|
| Rede de testes frontend | inexistente; 5 specs mortos | vitest ligado ao CI; **127 testes** rodando e verdes |
| Contrato tool → card | nenhum | specs de contrato nos dois lados |
| Isolamento de erro | 1 boundary global (derruba tudo) | boundary por card + por mensagem |
| Cópia de erro enganosa | "provedor não configurado" | mensagem honesta de erro inesperado |

**Princípio para daqui pra frente:** toda mudança no pipeline de render/costura agora tem
onde falar "isso quebrou" **antes** do navegador. A robustez real vem de manter e expandir
essa rede — não de mais um parser ou mais um dedup.
