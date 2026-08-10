# Fase 4 — Sistema de artefatos e versões

## Objetivo da fase

Fazer com que o resultado da conversa seja um objeto editável, versionado e
reutilizável, e não apenas uma resposta textual.

## F4.1 — Contrato comum

Todo artefato deverá conter:

- `id`;
- `organizationId`;
- `conversationId`;
- `projectId` opcional;
- `type`;
- `status`;
- `schemaVersion`;
- `version`;
- `content` tipado;
- `sourceMessageId`;
- `parentArtifactId`;
- `createdBy`;
- `createdAt`;
- `updatedAt`.

### Entregue quando

- o contrato comum estiver validado no backend e frontend;
- artefatos inválidos forem rejeitados com erro legível.

## F4.2 — Estados

```text
DRAFT -> PLANNED -> AWAITING_CONFIRMATION -> RUNNING -> READY
                         |                    |
                         v                    v
                      CANCELLED             FAILED -> RETRYABLE
```

### Entregue quando

- transições inválidas forem bloqueadas;
- cada estado possuir ação e mensagem correspondente.

## F4.3 — Versionamento

### Regras

- nunca sobrescrever versão pronta;
- toda revisão registra mensagem de origem;
- alterações pequenas podem gerar patch;
- alterações grandes geram nova geração;
- versões podem ser comparadas;
- o usuário pode restaurar uma versão anterior.

### Entregue quando

- “volte para a versão anterior” funcionar;
- uma revisão não alterar outputs já publicados.

## F4.4 — Renderizadores

Renderizadores previstos:

- `IdeaListArtifact`;
- `BriefArtifact`;
- `ScriptArtifact`;
- `StoryboardArtifact`;
- `CarouselArtifact`;
- `ImageArtifact`;
- `VideoArtifact`;
- `CaptionPackageArtifact`;
- `PublishPlanArtifact`.

### Entregue quando

- cada tipo tiver estado vazio, carregando, sucesso e erro;
- o painel direito renderizar artefatos sem conhecer detalhes da tool.

## F4.5 — Ações universais

- editar;
- pedir revisão;
- gerar;
- regenerar;
- criar variação;
- duplicar;
- exportar;
- publicar;
- agendar;
- compartilhar;
- restaurar versão.

### Entregue quando

- a ação correta aparecer conforme o estado e o tipo do artefato;
- ações proibidas forem ocultadas e também bloqueadas no backend.

## F4.6 — Provenance

Registrar:

- modelo;
- provider;
- prompt compilado;
- hash dos inputs;
- assets usados;
- custo;
- job;
- usuário;
- data;
- versão de prompt;
- resultado de avaliação.

### Entregue quando

- qualquer output puder ser rastreado até a mensagem, inputs e execução que o produziram.

## Gate da Fase 4

Uma mensagem cria um artefato tipado, que pode ser revisado, versionado,
regenerado e rastreado sem perder o histórico.
