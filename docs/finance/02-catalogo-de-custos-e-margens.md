# Catálogo de custos e margens

O catálogo de operações é mantido por `PricingCatalogService` e versionado em `PricingVersion`.

## Operações contempladas

Ideias, copy, roteiro, chat, imagem, upscale, Seedance 2.5, Kling, Veo, voz, TTS, tradução, legendas e operações premium.

## Formação da cotação

```text
custo do provedor + infraestrutura + armazenamento + processamento
+ retry + fraude + taxas operacionais = custo estimado
```

O número de créditos considera modelo, duração, resolução, entrada e um piso mínimo. A cotação vence em 10 minutos e registra `pricingVersion`, custo estimado em USD/BRL e créditos.

## Seedance inicial

O catálogo diferencia 480p, 720p sem entrada, 720p com entrada e duração de 10/30 segundos. Os valores são referência operacional e devem ser conferidos na Kie antes da ativação de um modelo ou mudança de preço.

## Proteções

Modelo sem custo configurado é bloqueado; custo acima do teto gera alerta; margem abaixo do mínimo pode desativar a operação; custo estimado e custo realizado são armazenados separadamente.
