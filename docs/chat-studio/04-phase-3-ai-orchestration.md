# Fase 3 — Orquestração de IA

## Objetivo da fase

Transformar mensagens naturais em planos, perguntas, artefatos e execuções
seguras usando a infraestrutura Mastra e as ferramentas existentes.

## F3.1 — Classificador de intenção

### Intenções do MVP

- `generate_ideas`;
- `generate_copy`;
- `create_script`;
- `create_carousel`;
- `create_image`;
- `create_video`;
- `revise_artifact`;
- `create_variant`;
- `repurpose_content`;
- `publish_content`;
- `schedule_content`;
- `list_resources`;
- `check_credits`.

### Entregue quando

- cada intenção tiver schema e examples;
- ambiguidades forem encaminhadas para pergunta curta;
- o classificador não iniciar geração por engano.

## F3.2 — Planner tipado

O planner deverá gerar um objeto validado com:

- intenção;
- objetivo;
- formato;
- canal;
- idioma;
- duração;
- estilo;
- recursos;
- passos;
- perguntas pendentes;
- custo provável;
- necessidade de confirmação.

### Entregue quando

- nenhum plano inválido chegar ao executor;
- o plano puder ser renderizado como artefato de planejamento;
- o plano puder ser atualizado sem perder a conversa.

## F3.3 — Política de perguntas

### Perguntar

- quando faltar produto para uma geração que exige produto;
- quando houver mais de uma interpretação materialmente diferente;
- quando a ação for irreversível;
- quando direitos ou permissões estiverem ausentes.

### Assumir

- formato vertical para conteúdo social;
- idioma da conversa;
- tom da marca;
- duração curta;
- CTA padrão;
- recursos aprovados mais recentes.

### Entregue quando

- perguntas desnecessárias forem evitadas;
- cada pergunta tiver resposta rápida ou opção “decidir por mim”.

## F3.4 — Executor de ferramentas

### Camadas

1. interpretar intenção;
2. criar ou atualizar plano;
3. validar permissões;
4. cotar;
5. solicitar confirmação;
6. executar tool;
7. persistir resultado;
8. atualizar artefato;
9. responder no chat.

### Entregue quando

- tools sejam chamadas somente após autorização;
- cada chamada tenha idempotency key;
- falhas produzam mensagem acionável e estado recuperável.

## F3.5 — Contexto e memória

### Contexto permitido

- Brand DNA;
- recursos da organização;
- artefato atual;
- projeto atual;
- preferências explícitas;
- integrações disponíveis.

### Entregue quando

- o agente consiga usar “minha marca” e “meu produto” corretamente;
- o usuário possa revisar e apagar preferências persistidas.

## F3.6 — Proteções do agente

### Entregáveis

- prompt injection guard;
- lista de tools por intenção;
- limites de chamadas por mensagem;
- validação de argumentos;
- bloqueio de publicação sem confirmação;
- bloqueio de acesso entre organizações;
- timeout e circuit breaker.

### Entregue quando

- instruções presentes em um arquivo ou asset não puderem substituir as regras
  do sistema;
- chamadas não autorizadas forem rejeitadas e auditadas.

## Gate da Fase 3

O agente interpreta uma mensagem, cria um plano tipado, faz somente perguntas
necessárias e executa uma tool permitida com auditoria completa.
