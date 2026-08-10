# ContentFlow — Sistema de cobrança v2

Data de implementação: 10/08/2026

## Decisões comerciais

- Gateway inicial: Stripe.
- Periodicidade: mensal.
- Créditos mensais: expiram ao final do ciclo; não acumulam.
- Recargas: pacotes fixos, sem renovação automática, validade de 90 dias.
- Upgrade: imediato, com prorrata no Stripe.
- Downgrade: agendado para o próximo ciclo.
- Falha de pagamento: bloqueia novas gerações imediatamente.

## Catálogo inicial

| Plano | Preço | Créditos |
|---|---:|---:|
| Free | R$ 0 | 200 |
| Starter | R$ 49 | 1.000 |
| Creator | R$ 99 | 2.500 |
| Pro | R$ 199 | 6.000 |
| Studio | R$ 399 | 16.000 |
| Agency | R$ 899 | 40.000 |

Recargas: 500/R$29, 2.000/R$99, 5.000/R$229 e 10.000/R$399.

## Fonte da verdade

O saldo comercial é formado por `CreditLot`, `CreditAllocation`, `CreditReservation` e `CreditTransaction`. A tabela legada `CreativeCreditLedgerEntry` é somente fonte de migração e compatibilidade.

Todas as gerações passam por cotação, reserva e liquidação. Jobs concluídos consomem créditos; jobs falhos liberam ou reembolsam a reserva.

## Endpoints v2

- `GET /billing/v2/plans`
- `GET /billing/v2/account`
- `GET /billing/v2/credits`
- `GET /billing/v2/invoices`
- `POST /billing/v2/checkout`
- `POST /billing/v2/topups/checkout`
- `POST /billing/v2/change-plan`
- `POST /billing/v2/cancel`
- `GET /billing/v2/portal`
- `GET /billing/v2/pricing`
- `POST /billing/v2/quote`

## Segurança operacional

- Créditos só são concedidos após pagamento confirmado.
- Webhooks Stripe são idempotentes por `event.id`.
- O cliente não escolhe a quantidade cobrada.
- Modelo sem preço catalogado deve ser bloqueado.
- Reservas vencidas são reconciliadas e devolvidas.
- O custo de provedor é separado do crédito comercial.

