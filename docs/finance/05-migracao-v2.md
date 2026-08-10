# Migração para cobrança v2

## Mapeamento inicial

| Legado | Novo |
|---|---|
| FREE | Free |
| STANDARD | Creator |
| PRO | Pro |
| TEAM | Studio |
| ULTIMATE | Agency |

A migração comercial ocorre na próxima renovação. O saldo legado é convertido uma única vez para um lote `MIGRATION`; nenhum crédito antigo é apagado.

## Checklist de execução

1. Exportar organizações e assinaturas existentes.
2. Simular plano, preço, créditos e impacto de cada organização.
3. Revisar clientes com aumento de preço.
4. Configurar os Price IDs no Stripe.
5. Ativar `BILLING_CREDITS_V2=true` em ambiente de teste.
6. Validar checkout e webhooks com Stripe Test Clocks.
7. Liberar para novos clientes.
8. Migrar clientes existentes conforme o ciclo.
9. Monitorar duplicidade de concessões, reservas presas e margem.
10. Desativar os limites legados somente após reconciliação.

## Rollback

O rollback não remove transações. Ele desativa novas concessões v2, mantém o histórico e reativa a leitura do ledger antigo enquanto os eventos pendentes são reconciliados.

