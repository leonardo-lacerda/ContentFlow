# Integração Kie.ai

O ContentFlow usa um provider `kie` compatível com o Creative Engine. A chave Kie fica apenas no backend e os outputs externos são importados pelo `CreativeOutputStorageService`.

## Variáveis mínimas

```env
KIEAI_API_KEY="..."
CREATIVE_KIE_ENABLED="true"
CREATIVE_KIE_BASE_URL="https://api.kie.ai"
CREATIVE_KIE_IMAGE_MODEL="gpt-image-2"
CREATIVE_KIE_VIDEO_MODEL="veo3_fast"
CREATIVE_KIE_BROLL_MODEL="veo3_fast"
CREATIVE_KIE_TTS_MODEL="elevenlabs/text-to-speech-multilingual-v2"
CREATIVE_KIE_TALKING_ACTOR_MODEL="kling/ai-avatar-standard"
CREATIVE_KIE_LIP_SYNC_MODEL="kling/ai-avatar-standard"
```

Deixe `CREATIVE_*_PROVIDER` vazio para seleção automática. Com uma chave Kie válida, imagem, vídeo, B-roll, TTS, talking actor e lip-sync preferem Kie. A tradução permanece no OpenAI direto enquanto um modelo Kie equivalente for validado.

## Modelos e capacidades

| Capacidade | Modelo padrão | Endpoint lógico |
|---|---|---|
| Imagem | `gpt-image/1.5-text-to-image` | `jobs/createTask`, ou endpoint GPT Image configurável |
| Vídeo | `veo3_fast` | `veo/generate` |
| B-roll | `veo3_fast` | `veo/generate` |
| Voz | `elevenlabs/text-to-speech-multilingual-v2` | `jobs/createTask` |
| Talking actor | `kling/ai-avatar-standard` | `jobs/createTask` |
| Lip-sync | `kling/ai-avatar-standard` | `jobs/createTask` |
| Vídeo alternativo | `seedance-2.5` | `jobs/createTask` |

Para o endpoint técnico legado de imagem, configure:

```env
CREATIVE_KIE_IMAGE_ENDPOINT="/api/v1/gpt4o-image/generate"
```

O cliente adapta o payload e consulta `/api/v1/gpt4o-image/record-info`. Para endpoints novos, o padrão é `/api/v1/jobs/createTask`.

## Polling e callback

O provider cria tarefas e aguarda um output terminal com polling seguro. Os limites são controlados por:

```env
CREATIVE_KIE_REQUEST_TIMEOUT_MS="120000"
CREATIVE_KIE_POLL_INTERVAL_MS="5000"
CREATIVE_KIE_MAX_POLL_ATTEMPTS="180"
```

Opcionalmente, configure `CREATIVE_KIE_CALLBACK_URL` apontando para:

```text
POST /creative/providers/kie/callback
```

O endpoint pode ser protegido com `CREATIVE_KIE_WEBHOOK_SECRET`. O polling continua sendo a fonte de verdade e o callback é idempotentemente aceito para evitar retries da Kie.

## Fallbacks

- Sem `KIEAI_API_KEY`, o sistema mantém os providers diretos atuais.
- Tradução continua usando OpenAI por padrão.
- Actor replacement continua usando endpoint HTTP configurável.
- O fallback Veo de talking actor não é anunciado como lip-sync.
- Falhas Kie são registradas pelo job e seguem a política de retry/refund existente.

## Créditos

Os créditos Kie não são usados diretamente como créditos ContentFlow. O quote usa `CREATIVE_KIE_*_CREDITS` quando configurado e, caso contrário, os valores padrão do Creative Engine. O ledger reserva, liquida ou reembolsa créditos independentemente da conta Kie.

## Protecoes financeiras

O Creative Engine aplica pisos de credito por capacidade:

- video e B-roll: 800 creditos por bloco de ate 10 segundos;
- imagem: 25 creditos por geracao, cobrindo resolucao premium e uma regeneracao;
- talking actor/lip-sync: 325 creditos por bloco de 15 segundos;
- texto para fala: 12 creditos por bloco de 30 segundos;
- actor replacement: 1.300 creditos, somente com preco configurado;
- Sora e modelos sem preco confirmado: bloqueados ate existir preco ao vivo.

Uma variavel `CREATIVE_KIE_*_CREDITS` menor que esses pisos nao reduz a cobranca.
O override inseguro so e aceito quando `CREATIVE_ALLOW_UNSAFE_PRICING=true`, o
que nao deve ser usado em producao. O plano tambem aplica limite mensal as
geracoes criativas de imagem e video quando o `PlanLimitsService` esta disponivel.

## Testes

Os testes do provider estão em:

- `libraries/nestjs-libraries/src/creative-engine/providers/kie/kie-api.client.spec.ts`
- `libraries/nestjs-libraries/src/creative-engine/providers/kie/kie-creative.provider.spec.ts`

Para validar sem consumir Kie, use mocks de `fetch`. Para validação real, execute uma imagem, um vídeo vertical, um TTS e um avatar em staging antes de habilitar produção.
