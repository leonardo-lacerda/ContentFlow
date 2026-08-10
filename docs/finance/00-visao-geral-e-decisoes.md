# Sistema de créditos, custos e cobrança

**Data:** 2026-08-10  
**Status:** implementação v2 em andamento, com ledger, catálogo, cotação, Stripe e tela de cobrança ativos no código.

## Decisões

- Moeda comercial: BRL.
- Gateway inicial: Stripe.
- Créditos mensais não acumulam e expiram no fim do ciclo.
- Recargas são avulsas e expiram em 90 dias.
- Operações criativas usam cotação, reserva, liquidação, liberação ou reembolso.
- Custos de provedores são versionados no banco, não apenas em `.env`.
- O saldo é reconstruível pelo ledger imutável.

## Catálogo inicial

Free 200 créditos; Starter 1.000; Creator 2.500; Pro 6.000; Studio 16.000; Agency 40.000. Os preços e créditos ficam em `billing-catalog.ts` como seed inicial e podem ser alterados pelo painel administrativo v2.

## Fluxo financeiro

```mermaid
flowchart LR
  A[Pedido de geração] --> B[Cotação]
  B --> C[Reserva de créditos]
  C --> D[Provedor Kie ou outro]
  D -->|sucesso| E[Consumo real]
  D -->|falha ou timeout| F[Liberação ou reembolso]
```

## Pronto quando

Pagamento confirmado concede exatamente um lote; geração paga nunca inicia sem reserva; falhas não deixam reserva presa; margem e custo real podem ser consultados por operação.
