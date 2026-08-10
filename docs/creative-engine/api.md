# API do Creative Engine

Webhooks: `GET /creative/webhooks/deliveries` lista o histórico operacional; `POST /creative/webhooks/deliveries/:deliveryId/replay` cria uma nova entrega, recalcula o HMAC e preserva o payload original, sempre verificando a organização da subscription.

## Autenticação

Para desligamento operacional temporário, defina `CREATIVE_ENGINE_ENABLED=false`; as rotas Creative deixam de ser expostas e a ferramenta MCP recusa novas operações.

Use sessão autenticada nas rotas `/creative/*` ou API key como `Authorization: Bearer <key>` nas rotas `/public/v1/creative/*`. Todas as queries são filtradas por `organizationId`.

## Operação idempotente

Envie `idempotencyKey` em geração, workflow, ferramenta e publicação. Em retry, o servidor retorna o registro original. O cliente deve fazer polling do job e tratar `SUCCEEDED`, `FAILED`, `RETRYABLE` e `CANCELLED`.

## Capacidades centrais

`GET /capabilities`, `GET /health`, `GET /presets`, `POST /projects`, `PATCH /projects/:id`, `POST /projects/:id/scripts`, `GET /projects/:id/scripts`, `POST /projects/:id/scripts/:scriptId/revise`, `POST /projects/:id/quote`, `POST /projects/:id/variants/generate`, `GET /variants/:id/download`, `POST /projects/:id/variants/:variantId/localize`, `POST /projects/:id/presets/:presetId/run`, `GET /jobs/:id`, `POST /jobs/:id/cancel`, `POST /projects/:id/export`.

Catalogo: `GET/POST/PATCH/DELETE /assets`, `GET/POST/PATCH/DELETE /products`, `GET/POST/PATCH/DELETE /actors`, `GET/POST/PATCH/DELETE /voices`. Arquivamento revoga grants relacionados; URLs de entrada aceitam HTTPS publico ou upload do proprio ContentFlow.

Ferramentas: `POST /projects/:id/tools/quote`, `POST /projects/:id/tools/run` para `captions`, `transcribe`, `resize`, `trim`, `merge`, `compose` e `scene-render`. O scene graph aceita de 1 a 60 cenas e impoe limite maximo de 180 segundos.

Workflows: `GET/POST /workflows`, `GET /workflows/:id`, `POST /workflows/:id/duplicate`, `POST /workflows/:id/validate`, `POST /workflows/:id/quote`, `POST /workflows/:id/runs`, `GET /workflows/runs/:id`, `DELETE /workflows/runs/:id`. Um workflow pode declarar `maxCredits`, e cada node pode declarar `inputSchema`/`outputSchema`.

## Qualidade e distribuição

`POST /jobs/:id/evaluate`, `POST /jobs/:id/review`, `GET /reviews`, `POST /projects/:id/variants/:variantId/publish`, `GET /publications` e `GET /metrics`. O review fica associado a organização, projeto, job e variante quando aplicável.

Storage e resiliencia: outputs externos sao importados para storage proprio; cada job expõe tentativas, erro, provider/modelo e custo. Falhas tecnicas entram em `RETRYABLE` até `CREATIVE_MAX_ATTEMPTS`; quota ativa usa `CREATIVE_MAX_ACTIVE_JOBS`.

## Readiness e fallback

`GET /creative/health` agora retorna o roteamento efetivo por capacidade:
provider primario, fallbacks disponiveis e `ready`. Se nenhum provider estiver
configurado, a cotacao/geracao falha de forma acionavel. Quando nenhum provider
foi escolhido explicitamente, uma falha tecnica do primario tenta o proximo
provider compativel; uma escolha explicita continua sendo respeitada e nao e
substituida silenciosamente.

## Exemplo Public API

```bash
curl -X POST "$CONTENTFLOW_URL/public/v1/creative/renders" \
  -H "Authorization: Bearer $CONTENTFLOW_CREATIVE_API_KEY" \
  -H "Idempotency-Key: render-demo-20260809" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"project-id","capability":"video-generation","prompt":"Product demo vertical","aspectRatio":"9:16","durationSec":8}'
```

A resposta retorna o job e o cliente deve consultar o status:

```bash
curl "$CONTENTFLOW_URL/public/v1/creative/renders/JOB_ID" \
  -H "Authorization: Bearer $CONTENTFLOW_CREATIVE_API_KEY"

curl "$CONTENTFLOW_URL/public/v1/creative/renders/JOB_ID/download" \
  -H "Authorization: Bearer $CONTENTFLOW_CREATIVE_API_KEY"
```

Estados esperados: `QUEUED`, `RESERVED`, `RUNNING`, `RETRYABLE`, `SUCCEEDED`, `FAILED` ou `CANCELLED`. Erros de saldo retornam `402`, quota/concorrência `429`, chave reutilizada com payload diferente `409` e autenticação inválida `401`.

A rotação da chave da organização usa a rota administrativa existente `POST /users/api-key/rotate`; após a rotação, a chave anterior deve ser invalidada nos clientes integrados.

Erros devem expor mensagem acionável, nunca segredos; respostas de geração incluem job, custo estimado, provider/modelo e estado.
