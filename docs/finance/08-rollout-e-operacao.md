# Rollout e operação

## Etapas

1. Shadow mode: calcular sem bloquear.
2. Piloto interno.
3. Novos clientes no v2.
4. Migração na renovação.
5. Remoção gradual das regras legadas.

## Rollback

Desligar `BILLING_CREDITS_V2`, interromper novas concessões v2 e manter todas as transações. Não apagar ledger, reservas, invoices ou eventos. Reprocessar webhooks somente por idempotency key.

## Alertas mínimos

Provedor sem custo, margem negativa, crescimento anormal, webhook pendente, reserva presa, falha de pagamento, chargeback e divergência entre invoice e lote concedido.
