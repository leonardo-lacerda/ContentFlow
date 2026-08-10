# Fase 9 — Qualidade, segurança e operação

## Objetivo da fase

Garantir que a simplicidade da interface não esconda riscos técnicos,
financeiros, legais ou operacionais.

## F9.1 — Segurança de aplicação

### Validar

- autenticação;
- autorização;
- isolamento por organização;
- rate limit;
- limites de contexto;
- prompt injection;
- SSRF;
- MIME real;
- antivírus;
- URLs assinadas;
- secrets em logs;
- abuso de tools.

### Entregue quando

- testes negativos não acessarem dados de outra organização;
- conteúdo de anexo não alterar as regras do agente;
- arquivos e URLs perigosos forem rejeitados.

## F9.2 — Segurança de conteúdo

### Entregáveis

- moderação de entrada;
- moderação de saída;
- detecção de impersonificação;
- consentimento para ator e voz;
- fluxo de denúncia;
- takedown;
- bloqueio de claims proibidos.

### Entregue quando

- casos proibidos forem bloqueados antes de gastar créditos;
- outputs sinalizados entrarem em revisão humana.

## F9.3 — Avaliação de IA

### Dataset mínimo

- 100 pedidos de ideias;
- 100 pedidos de copy;
- 100 carrosséis;
- 100 vídeos;
- 50 pedidos ambíguos;
- 50 revisões;
- 50 pedidos de publicação;
- 50 tentativas de abuso.

### Métricas

- intenção correta;
- schema válido;
- tool correta;
- perguntas necessárias;
- aderência ao Brand DNA;
- qualidade do CTA;
- preservação de versão;
- bloqueio de ações indevidas.

### Entregue quando

- os casos críticos passarem 100%;
- o conjunto geral atingir o threshold aprovado pelo produto;
- regressões forem detectadas automaticamente no CI.

## F9.4 — Qualidade de mídia

Avaliar por capability:

- sucesso;
- falha;
- retry;
- p50 e p95 de latência;
- custo;
- fidelidade do produto;
- naturalidade;
- sincronização;
- legenda;
- aderência à marca;
- aprovação humana.

### Entregue quando

- cada provider tiver contrato, fallback, health check e score de qualidade;
- outputs ruins não forem publicados automaticamente.

## F9.5 — Observabilidade

### Entregáveis

- logs estruturados;
- correlation ID;
- trace de mensagem até provider;
- painel de jobs;
- painel de custo;
- painel de erros;
- alertas;
- runbook;
- replay idempotente.

### Entregue quando

- uma falha puder ser investigada sem consultar manualmente vários serviços;
- jobs presos forem detectados e recuperados.

## F9.6 — Performance

### Metas iniciais

- primeira resposta textual percebida em até 3 segundos em p95;
- plano inicial em até 15 segundos em p95;
- interface responsiva durante jobs;
- atualização de progresso sem polling excessivo;
- nenhum job de mídia bloquear a requisição HTTP.

### Entregue quando

- as metas forem medidas em staging com carga representativa;
- degradação de provider não derrubar o chat inteiro.

## Gate da Fase 9

Segurança, qualidade, performance, observabilidade e operação estão cobertas por
testes automatizados, métricas e runbooks antes do beta externo.
