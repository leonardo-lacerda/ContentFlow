# Integração Stripe

## Produtos e preços

Planos mensais e pacotes de recarga são persistidos em `BillingPlan` e `BillingPrice`. O serviço cria ou reutiliza preços Stripe e grava metadata com plano, versão, tipo de cobrança e organização.

## Endpoints

- `GET /billing/v2/plans`
- `POST /billing/v2/checkout`
- `POST /billing/v2/topups/checkout`
- `POST /billing/v2/change-plan`
- `POST /billing/v2/cancel`
- `GET /billing/v2/portal`
- `GET /billing/v2/invoices`

## Webhooks

O evento é salvo antes do processamento e o `event.id` é único. São tratados checkout, assinatura criada/atualizada/removida, invoice paga/falha, refund e dispute. Eventos duplicados retornam sem repetir concessão.

## Segurança operacional

Configure `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, URLs de retorno e `BILLING_CREDITS_V2=true`. Nunca conceda créditos a partir do redirect do checkout; somente a partir de confirmação de pagamento.
