# Fase 10 — MVP, beta e lançamento

## Objetivo da fase

Liberar o Chat Studio em etapas reversíveis, sem quebrar o Creative Engine nem
os fluxos atuais de publicação.

## F10.1 — MVP interno

### Escopo

- conversas persistentes;
- streaming;
- ideias;
- copy;
- roteiro;
- carrossel;
- imagem;
- artefatos e versões;
- Brand DNA básico;
- quote e créditos;
- exportação.

### Entregue quando

- a equipe interna conseguir criar conteúdo real sem usar o wizard antigo;
- os principais casos de erro tiverem recuperação;
- não houver perda de projeto ou artefato.

## F10.2 — Beta fechado

### Público

- criadores;
- profissionais de marketing;
- pequenas agências;
- usuários com produtos e Brand DNA configurados.

### Instrumentar

- sucesso por intenção;
- abandono;
- tempo até artefato;
- revisões;
- custo;
- publicação;
- feedback qualitativo.

### Entregue quando

- usuários concluírem criação sem treinamento individual;
- bugs críticos estiverem resolvidos;
- os thresholds de qualidade forem atingidos.

## F10.3 — Vídeo em beta controlado

### Escopo

- plano de vídeo;
- roteiro;
- storyboard;
- atores e vozes aprovados;
- render assíncrono;
- preview;
- refinamento;
- exportação.

### Entregue quando

- o pipeline apresentar taxa de sucesso e custo aceitáveis;
- falhas não gerarem cobrança indevida;
- outputs passarem preflight.

## F10.4 — Migração de rotas

### Estratégia

- `/creative` abre o Chat Studio;
- `/creative/advanced` mantém o laboratório;
- links antigos continuam válidos;
- projetos existentes aparecem no histórico;
- feature flag permite rollback;
- usuários podem retornar ao fluxo anterior durante o beta.

### Entregue quando

- nenhum link existente produzir 404;
- nenhum projeto antigo desaparecer;
- rollback puder ser feito sem migração destrutiva.

## F10.5 — Lançamento geral

### Checklist

- documentação de ajuda;
- onboarding;
- limites e créditos visíveis;
- suporte treinado;
- alertas ativos;
- runbook publicado;
- privacy e termos atualizados;
- plano de rollback testado.

### Entregue quando

- a funcionalidade puder ser habilitada para todos com monitoramento e suporte.

## Gate da Fase 10

O produto está em produção, com rollout gradual, métricas, suporte, rollback e
continuidade dos fluxos existentes.
