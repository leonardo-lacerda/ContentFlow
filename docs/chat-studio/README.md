# ContentFlow Chat Studio

Plano mestre para transformar o ContentFlow em um estúdio de criação conversacional.

## Objetivo

O usuário deve conseguir pedir ideias, roteiros, carrosséis, imagens, vídeos,
variações e publicações usando uma conversa natural. A conversa é o ponto de
entrada; o resultado estruturado aparece como um artefato editável ao lado do
chat.

## Como ler

Os documentos estão organizados na ordem recomendada de execução:

| Arquivo | Conteúdo |
|---|---|
| `00-overview.md` | visão, princípios, escopo e decisões-base |
| `01-phase-0-discovery.md` | descoberta, escopo, riscos e contratos de produto |
| `02-phase-1-ux.md` | arquitetura da experiência, layout e usabilidade |
| `03-phase-2-conversation-foundation.md` | conversas, mensagens, streaming e anexos |
| `04-phase-3-ai-orchestration.md` | intenção, planner, memória, permissões e tools |
| `05-phase-4-artifacts.md` | artefatos, schemas, versões e ações |
| `06-phase-5-content-capabilities.md` | ideias, copy, imagens e carrosséis |
| `07-phase-6-video-pipeline.md` | roteiro, storyboard, atores, vozes e render |
| `08-phase-7-brand-resources.md` | Brand DNA, produtos, assets e contexto |
| `09-phase-8-publishing.md` | aprovação, adaptação, exportação e agendamento |
| `10-phase-9-quality-security.md` | segurança, qualidade, avaliação e operação |
| `11-phase-10-rollout.md` | MVP, beta, migração e lançamento |
| `12-definition-of-done.md` | gates de aceite globais e por capacidade |
| `13-file-map.md` | mapa de arquivos novos, alterados e preservados |
| `14-test-matrix.md` | matriz de testes funcionais, IA, mídia e segurança |
| `15-sequencing.md` | dependências, marcos e ordem de execução |

## Decisão de produto

O caminho principal será o Chat Studio. O Creative Engine continua como motor
de geração e o laboratório avançado continua disponível para usuários que
precisarem de controle técnico.

```text
/creative              -> entrada compatível para o Chat Studio
/studio                -> conversa principal
/studio/:conversation  -> conversa + artefato ativo
/studio/resources      -> recursos da marca
/creative/advanced     -> laboratório técnico legado
```

## Regras de segurança do plano

- Nenhuma geração paga sem quote e confirmação quando o custo não for trivial.
- Nenhuma publicação sem confirmação explícita.
- Nenhum ator, voz ou asset sem direitos aprovados.
- Nenhuma mensagem, conversa ou artefato fora da organização do usuário.
- Nenhuma versão anterior é sobrescrita por uma revisão.

## Ponto de partida do repositório

Esta proposta reutiliza o chat existente em
`apps/frontend/src/components/agents/agent.chat.tsx`, o endpoint de Copilot em
`apps/backend/src/api/routes/copilot.controller.ts`, o carregamento de tools em
`libraries/nestjs-libraries/src/chat/load.tools.service.ts` e as capacidades do
Creative Engine documentadas em `docs/creative-engine/`.

## Definição do programa

O programa será considerado completo quando um usuário novo conseguir sair de
uma frase para um artefato pronto para revisão, publicação ou exportação sem
precisar conhecer modelos, providers, schemas ou configurações técnicas.
