# User flows do Creative Engine

## Primeiro render

`Projeto → asset → direitos → brief → script → ator/voz → quote → geração → job → preflight → revisão → publicação/export`.

## Falhas

- **Sem provider:** quote retorna incapacidade antes da reserva.
- **Sem créditos:** quote mantém o projeto intacto e não cria cobrança.
- **Provider timeout/5xx:** job falha, provenance registra erro e reserva é reembolsada.
- **Direito expirado/revogado:** novo job é rejeitado; outputs existentes entram em revisão/takedown.
- **Cancelamento:** job terminal não é reembolsado novamente; job reservado libera a reserva uma única vez.

## Variações

Selecionar atores, vozes, idiomas e formatos; limitar `maxItems`; cotar a matriz; executar fan-out com chave derivada por item; permitir cancelamento individual pelo job.

## Publicação

Selecionar variante pronta, canal conectado, tipo (`draft`, `schedule`, `now`) e data. O sistema cria mídia compatível com o ContentFlow, registra a publicação e permite repetição idempotente.
