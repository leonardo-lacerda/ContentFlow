# Recargas e expiração

## Pacotes

| Código | Preço | Créditos | Validade |
|---|---:|---:|---:|
| 500 | R$ 29 | 500 | 90 dias |
| 2.000 | R$ 99 | 2.000 | 90 dias |
| 5.000 | R$ 229 | 5.000 | 90 dias |
| 10.000 | R$ 399 | 10.000 | 90 dias |

Cada compra cria um lote `TOPUP`, não altera o plano e não renova automaticamente. O job de reconciliação chama a expiração de lotes vencidos e grava `EXPIRATION` no ledger.

Reembolso de recarga deve verificar o saldo ainda disponível. Chargeback bloqueia a conta e registra dívida financeira.
