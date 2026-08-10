# Fase 6 — Pipeline completo de vídeo

## Objetivo da fase

Conectar a conversa ao Creative Engine para criar planos, roteiros, storyboards,
renders, variações e vídeos finais sem expor a complexidade dos providers.

## F6.1 — Plano de vídeo

### Campos

- título;
- objetivo;
- público;
- hook;
- roteiro;
- duração;
- orientação;
- estilo;
- cenas;
- avatar ou formato sem avatar;
- voz;
- legenda;
- CTA;
- assets;
- custo estimado.

### Entregue quando

- o plano puder ser revisado antes da renderização;
- o usuário puder alterar qualquer campo por conversa.

## F6.2 — Roteiro semântico

### Estrutura

- hook;
- problema;
- promessa;
- demonstração;
- prova;
- objeção;
- benefício;
- CTA.

### Entregáveis

- schema versionado;
- editor textual;
- revisão por conversa;
- controle de duração;
- controle de idioma.

### Entregue quando

- o roteiro puder ser gerado, editado e transformado em storyboard.

## F6.3 — Storyboard

Cada cena deve ter:

- duração;
- fala;
- visual;
- câmera;
- enquadramento;
- movimento;
- texto em tela;
- asset de referência;
- trilha ou ambiente;
- transição.

### Entregue quando

- o painel puder mostrar o plano cena a cena;
- uma cena puder ser substituída sem recriar o plano inteiro.

## F6.4 — Atores e vozes

### Entregáveis

- catálogo aprovado;
- preview de voz;
- idioma e sotaque;
- estilo de entrega;
- direitos e consentimento;
- sugestão automática;
- troca por conversa.

### Entregue quando

- somente atores e vozes permitidos aparecerem para geração;
- revogação impedir novos jobs;
- o usuário puder gerar com ou sem avatar.

## F6.5 — Quote, jobs e créditos

### Entregáveis

- quote antes da geração;
- reserva;
- confirmação;
- fila;
- progresso;
- retry;
- cancelamento;
- refund;
- idempotência;
- reconciliação.

### Entregue quando

- uma mesma solicitação não gerar cobrança ou job duplicado;
- falhas técnicas não consumirem créditos definitivamente;
- o usuário puder sair da página e retornar ao job.

## F6.6 — Refinamento conversacional

### Comandos mínimos

- “troque o hook”;
- “deixe mais natural”;
- “use outra voz”;
- “faça uma versão de 15 segundos”;
- “troque a cena 2”;
- “adicione legendas”;
- “faça uma versão horizontal”;
- “crie três variações”.

### Entregue quando

- o sistema detectar se precisa alterar script, cena, áudio, visual ou render;
- a versão anterior continuar disponível;
- o usuário entender o que será regenerado e quanto custará.

## Gate da Fase 6

Um usuário consegue sair de uma frase para um vídeo pronto, revisar o plano,
acompanhar a geração, pedir alterações e receber uma nova versão.
