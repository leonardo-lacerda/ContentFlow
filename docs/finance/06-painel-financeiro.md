# Painel financeiro

## Usuário

A tela `/billing` mostra plano atual, saldo, uso, faturas, recargas, próxima renovação, cancelamento, portal Stripe e compra de créditos.

## Administrador

Os endpoints protegidos por superadmin permitem consultar resumo, catálogo de custos e realizar ajuste manual de créditos. Todo ajuste exige organização, quantidade e motivo, e grava `FinancialAdjustment` e `ADMIN_ADJUSTMENT`.

## Indicadores

Receita recorrente, receita de recargas, custo Kie, custo por operação, créditos emitidos/consumidos/expirados, margem, falhas, chargebacks, reservas presas e custo médio por cliente.
