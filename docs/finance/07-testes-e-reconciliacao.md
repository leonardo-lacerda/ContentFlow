# Testes e reconciliação

## Testes obrigatórios

- Cotação, arredondamento, validade e multiplicadores.
- Consumo por lote, reserva, liberação, refund e expiração.
- Idempotência e eventos Stripe duplicados ou fora de ordem.
- Upgrade, downgrade, falha de pagamento e chargeback.
- Duas reservas simultâneas para o mesmo saldo.
- Kie concluída, falha, timeout e retry.

## Jobs

Expirar lotes, liberar reservas presas, reconciliar jobs criativos, conferir invoices, importar custo real quando disponível e alertar margem negativa.

## Validação atual

Prisma validate, geração do cliente, build do backend, build do frontend e 18 testes direcionados foram executados com sucesso em 2026-08-10.
