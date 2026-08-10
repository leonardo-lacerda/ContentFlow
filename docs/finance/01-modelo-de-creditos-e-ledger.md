# Modelo de créditos e ledger

## Entidades

- `CreditAccount`: conta, status e dívida.
- `CreditLot`: lote com origem, saldo, validade e compra/ciclo associado.
- `CreditAllocation`: vínculo entre uma reserva e os lotes usados.
- `CreditReservation`: reserva idempotente de uma geração.
- `CreditTransaction`: lançamento imutável do ledger.

## Tipos de lançamento

`GRANT`, `RESERVATION`, `CONSUMPTION`, `RELEASE`, `REFUND`, `EXPIRATION`, `TOPUP`, `MIGRATION`, `ADMIN_ADJUSTMENT` e `CHARGEBACK_DEBT`.

## Regras

1. O lote com vencimento mais próximo é consumido primeiro.
2. O lote mensal expira no fim do ciclo.
3. Recarga expira 90 dias depois da compra.
4. Reserva é idempotente por `idempotencyKey`.
5. Saldo insuficiente retorna erro de pagamento (`402`).
6. Conta bloqueada não pode iniciar novas gerações.

O serviço principal é `CreditAccountingService` e o serviço criativo legado usa uma fachada compatível para preservar as chamadas existentes.
