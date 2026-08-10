# Sistema de créditos, custos e cobranças — ContentFlow

**Data do documento:** 10/08/2026  
**Status:** auditoria da implementação atual  
**Escopo:** créditos criativos, geração de imagens/vídeos, custos de IA, planos e cobrança recorrente.

> Este documento descreve o que está configurado no código nesta data. Valores de provedores podem mudar. O custo real da Kie.ai só deve ser considerado confirmado depois de preencher os custos oficiais por modelo e validar uma cobrança real na conta Kie.

## 1. Resumo executivo

O ContentFlow possui uma **carteira interna de créditos criativos**, mas ainda não possui um sistema completo de monetização baseado em créditos.

### Implementado

- Ledger de créditos por organização.
- Concessão inicial configurável.
- Reserva de créditos antes de iniciar uma geração.
- Liquidação pelo valor efetivamente consumido.
- Estorno automático quando a geração falha ou é cancelada.
- Idempotência para evitar dupla cobrança.
- Reconciliação de reservas presas em jobs encerrados.
- Limites mensais de imagens e vídeos por plano.
- Pisos de proteção financeira para evitar vender uma geração abaixo do custo mínimo definido.
- Assinaturas e checkout básicos via Stripe e Cakto.

### Ainda não implementado de forma completa

- Concessão automática de créditos conforme o plano comprado.
- Renovação mensal automática do saldo de créditos.
- Pacotes de créditos adicionais.
- Política de rollover ou expiração.
- Ajuste de créditos em upgrade e downgrade.
- Integração do pagamento confirmado com o ledger criativo.
- Congelamento completo de créditos em inadimplência.
- Relatório de margem real por modelo, cliente e geração.
- Preço de Kie.ai preenchido e validado por modelo.

O modelo comercial recomendado desta auditoria está definido nas seções 5, 8 e 9, mas ainda precisa ser aplicado ao código, ao checkout e aos webhooks.

Portanto, atualmente existe um **sistema de consumo e controle de créditos**, mas a camada de **venda, renovação e concessão recorrente de créditos ainda está incompleta**.

## 2. Conceitos: token, crédito e moeda

Esses três conceitos não são equivalentes:

| Conceito | Uso atual |
|---|---|
| Token | Unidade técnica usada para estimar custo de modelos de texto e imagem no fluxo legado. |
| Crédito ContentFlow | Unidade comercial interna usada para limitar e cobrar gerações criativas. |
| Dólar/real | Moeda usada para custo do provedor, cobrança da assinatura e análise de margem. |

### Situação atual

- **Não existe cobrança direta do cliente por token.**
- **Não existe atualmente um preço comercial oficial por crédito ContentFlow.**
- O cliente possui limites de funcionalidades por plano e pode receber uma concessão inicial de créditos.
- A variável `CREATIVE_INITIAL_CREDITS` está configurada como `1000` nos exemplos de ambiente.
- Esse valor de 1.000 créditos é uma concessão inicial por organização, não uma renovação mensal por plano.

## 3. Valor técnico por token configurado no sistema

O estimador legado de custos usa as seguintes taxas padrão, quando não existe uma variável de ambiente substituindo-as:

| Tipo de token | Custo estimado do provedor | Custo por token em USD | Custo por token em BRL* |
|---|---:|---:|---:|
| Texto de entrada | US$ 5,00 / 1 milhão | US$ 0,000005 | R$ 0,0000275 |
| Texto de entrada em cache | US$ 1,25 / 1 milhão | US$ 0,00000125 | R$ 0,000006875 |
| Imagem de entrada | US$ 8,00 / 1 milhão | US$ 0,000008 | R$ 0,000044 |
| Imagem de entrada em cache | US$ 2,00 / 1 milhão | US$ 0,000002 | R$ 0,000011 |
| Imagem de saída | US$ 30,00 / 1 milhão | US$ 0,00003 | R$ 0,000165 |

\* Conversão padrão do código: **US$ 1 = R$ 5,50**, pela variável `AI_GENERATE_USD_TO_BRL`.

### Fórmula utilizada

```text
custo_usd =
  (tokens_texto_entrada / 1.000.000 × 5,00) +
  (tokens_texto_cache / 1.000.000 × 1,25) +
  (tokens_imagem_entrada / 1.000.000 × 8,00) +
  (tokens_imagem_cache / 1.000.000 × 2,00) +
  (tokens_imagem_saida / 1.000.000 × 30,00)

custo_brl = custo_usd × 5,50
```

### Importante sobre esses valores

Essas taxas são **estimativas internas configuráveis**. Elas não comprovam o preço real pago à Kie.ai. O código registra estimativas de custo e tokens, mas o custo real deve ser reconciliado com o extrato do provedor.

## 4. Custo Kie.ai e Seedance 2.5

O provedor principal é a Kie.ai. As variáveis de custo por modelo ainda estão vazias nos arquivos `.env.example` e `.env.production.example`, mas a página do Seedance 2.5 da Kie informa a regra de cobrança usada nesta simulação:

- 1 dólar = 200 créditos Kie;
- 1 crédito Kie = US$ 0,005;
- 480p: 17 créditos/s com vídeo de entrada ou 28 créditos/s sem vídeo de entrada;
- 720p: 38 créditos/s com vídeo de entrada ou 63 créditos/s sem vídeo de entrada;
- top-ups de alto volume podem incluir aproximadamente 10% de bônus;
- a fórmula com vídeo de entrada soma a duração do vídeo de entrada à duração gerada.

Fonte de referência: <https://kie.ai/seedance-2-5>.

### Conversão para reais

Para proteger a margem, esta auditoria usa **US$ 1 = R$ 5,50**, mesmo que o câmbio de mercado possa ficar abaixo ou acima disso.

| Seedance 2.5 | Custo Kie em créditos | Custo em USD | Custo em BRL |
|---|---:|---:|---:|
| 480p, sem vídeo de entrada, 10s | 280 | US$ 1,40 | R$ 7,70 |
| 480p, com vídeo de entrada, 10s de saída | 170 + entrada | US$ 0,85 + entrada | R$ 4,68 + entrada |
| 720p, sem vídeo de entrada, 10s | 630 | US$ 3,15 | R$ 17,33 |
| 720p, sem vídeo de entrada, 30s | 1.890 | US$ 9,45 | R$ 51,98 |
| 720p, com 10s de vídeo de entrada e 10s de saída | 760 | US$ 3,80 | R$ 20,90 |
| 720p, com 30s de vídeo de entrada e 30s de saída | 2.280 | US$ 11,40 | R$ 62,70 |

O material comercial da página menciona saída nativa em 4K, mas a tabela de cobrança consultada informa tarifas para 480p e 720p. O preço 4K deve ser obtido por quote real da Kie antes de ser liberado sem restrição.

### Variáveis de ambiente que precisam ser preenchidas

```env
CREATIVE_KIE_IMAGE_CREDITS=""
CREATIVE_KIE_VIDEO_CREDITS=""
CREATIVE_KIE_VIDEO_COST_USD=""
CREATIVE_KIE_VIDEO_COST_PER_SECOND_USD=""
CREATIVE_KIE_BROLL_CREDITS=""
CREATIVE_KIE_TTS_CREDITS=""
CREATIVE_KIE_TALKING_ACTOR_CREDITS=""
CREATIVE_KIE_LIP_SYNC_CREDITS=""
```

Os créditos Kie e os créditos ContentFlow não devem ser misturados. O primeiro é o saldo da nossa conta de provedor; o segundo é a unidade comercial que o cliente compra.

## 5. Créditos ContentFlow cobrados do usuário

Os créditos ContentFlow são uma unidade comercial própria. A cobrança deve variar por modelo, resolução, duração e referências; cobrar o mesmo valor para todos os modelos destruiria a margem.

| Capacidade | Cobrança recomendada |
|---|---:|
| Imagem básica 1K | 25 créditos |
| Imagem 2K | 50 créditos |
| Imagem 4K/premium | 100 créditos |
| Seedance 2.5 480p, 10s | 900 créditos |
| Seedance 2.5 720p, 10s, sem vídeo de entrada | 2.000 créditos |
| Seedance 2.5 720p, 30s, sem vídeo de entrada | 6.000 créditos |
| Seedance 2.5 720p com 10s de vídeo de entrada | 2.500 créditos |
| Seedance 2.5 720p com 30s de vídeo de entrada | 7.500 créditos |
| Seedance 2.0, 10s | 800 créditos |
| Kling 3, 10s | 1.000 créditos |
| Veo 3.1, 1080p | 1.600 créditos |
| Veo 3.1, 4K | 2.400 créditos, sujeito a quote |
| Talking actor/lip-sync, 15s | 325 créditos, sujeito a custo validado |
| Texto para fala, 30s | 12 créditos, sujeito a custo validado |
| Tradução | 20 créditos |
| Actor replacement | 1.300 créditos, sujeito a custo validado |
| Upscale de vídeo, 10s | 120 créditos |
| Captions | 8 créditos |

### Regra de proteção

O custo 4K do Seedance 2.5 não deve ser estimado como se fosse 720p. Até a Kie retornar um preço verificável, a aplicação deve mostrar um quote antes da confirmação ou bloquear a opção 4K.

Esses valores são créditos ContentFlow. Eles não são créditos Kie e não representam diretamente tokens.

## 6. O que é possível criar com 1.800 créditos

Considerando exclusivamente os pisos atuais, sem misturar funcionalidades:

| Cenário | Conta | Resultado máximo | Saldo restante |
|---|---:|---:|---:|
| Imagens básicas 1K | 1.800 ÷ 25 | 72 imagens | 0 |
| Imagens premium 4K | 1.800 ÷ 100 | 18 imagens | 0 |
| Seedance 2.0 de 10s | 1.800 ÷ 800 | 2 vídeos | 200 |
| Seedance 2.5 480p de 10s | 1.800 ÷ 900 | 2 vídeos | 0 |
| Seedance 2.5 720p de 10s | 1.800 ÷ 2.000 | 0 vídeos | 1.800 |
| Talking actor de 15s | 1.800 ÷ 325 | 5 vídeos | 175 |
| TTS de 30s | 1.800 ÷ 12 | 150 blocos | 0 |
| Traduções | 1.800 ÷ 20 | 90 operações | 0 |
| Upscale de 10s | 1.800 ÷ 120 | 15 operações | 0 |

Esses números são capacidade teórica. Uma geração real pode consumir mais créditos conforme duração, resolução, modelo e quantidade de tentativas.

## 7. Referência de planos semelhantes aos valores informados da Arcads

Os valores abaixo são uma referência fornecida para análise comercial. Eles **não estão configurados como planos ContentFlow**:

| Plano de referência | Preço mensal | Créditos mensais | Preço implícito por crédito |
|---|---:|---:|---:|
| Lite | US$ 29 | 1.800 | US$ 0,016111 |
| Starter | US$ 77 | 8.000 | US$ 0,009625 |
| Creator | US$ 154 | 16.000 | US$ 0,009625 |
| Pro | US$ 385 | 48.000 | US$ 0,008021 |

O preço implícito é apenas uma divisão comercial:

```text
preço por crédito = mensalidade ÷ créditos mensais
```

### Capacidade teórica por plano de referência

| Plano | Imagens de 25 créditos | Vídeos de 10s | Talking actor de 15s | TTS de 30s | Actor replacement |
|---|---:|---:|---:|---:|---:|
| Lite — 1.800 | 72 | 2 + 200 créditos | 5 + 175 créditos | 150 | 1 + 500 créditos |
| Starter — 8.000 | 320 | 10 | 24 + 200 créditos | 666 + 8 créditos | 6 + 200 créditos |
| Creator — 16.000 | 640 | 20 | 49 + 75 créditos | 1.333 + 4 créditos | 12 + 400 créditos |
| Pro — 48.000 | 1.920 | 60 | 147 + 225 créditos | 4.000 | 36 + 1.200 créditos |

Essa tabela não representa uma promessa comercial. Ela serve para validar se a quantidade de créditos ofertada é compatível com o custo real dos modelos.

## 8. Planos comerciais recomendados

Esta é a tabela recomendada para o lançamento do modelo de créditos em reais. Os créditos são mensais, não são ilimitados e devem ser consumidos conforme a tabela de capacidades da seção 5.

| Plano | Preço mensal | Créditos/mês | Preço implícito por crédito |
|---|---:|---:|---:|
| Free | R$ 0 | 200 | — |
| Starter | R$ 49 | 1.000 | R$ 0,0490 |
| Creator | R$ 99 | 2.500 | R$ 0,0396 |
| Pro | R$ 199 | 6.000 | R$ 0,0332 |
| Studio | R$ 399 | 16.000 | R$ 0,0249 |
| Agency | R$ 899 | 40.000 | R$ 0,0225 |

### Capacidade de uso sugerida

| Plano | Exemplo de cesta mensal |
|---|---|
| Free | 8 imagens básicas; sem Seedance 2.5 720p |
| Starter | 4 imagens básicas + 1 Seedance 2.5 480p de 10s |
| Creator | 20 imagens básicas + 1 Seedance 2.5 720p de 10s |
| Pro | 80 imagens básicas + 1 Seedance 2.5 720p de 20s |
| Studio | 120 imagens básicas + 2 Seedance 2.5 720p de 30s |
| Agency | 300 imagens básicas + 4 Seedance 2.5 720p de 30s |

As cestas são exemplos para comunicar valor. O cliente pode combinar imagens, vídeos, carrosséis e outros recursos até o limite do saldo.

### Planos legados atualmente no código

O arquivo `pricing.ts` ainda contém estes planos antigos, baseados em limites separados de funcionalidades:

| Plano legado | Mensalidade | Imagens/mês | Vídeos/mês |
|---|---:|---:|---:|
| FREE | R$ 0 | 10 | 3 |
| STANDARD | R$ 79 | 200 | 40 |
| PRO | R$ 149 | 300 | 60 |
| TEAM | R$ 197 | 100 | 80 |
| ULTIMATE | R$ 497 | 500 | 200 |

Esses planos não devem ser publicados junto com a nova carteira de créditos. O backend precisa migrar para uma única fonte de verdade, evitando cobrar limite de imagem/vídeo e créditos simultaneamente.

## 9. Fórmula correta de margem

A margem deve ser calculada por geração e também por plano:

```text
receita líquida = mensalidade - descontos - taxas de pagamento - impostos

custo variável =
  custo Kie.ai
  + custo de fallback
  + custo de retry
  + storage
  + CDN/egress
  + processamento

margem bruta = receita líquida - custo variável

margem percentual = margem bruta ÷ receita líquida × 100
```

Para créditos:

```text
receita por crédito = créditos vendidos no plano ÷ preço líquido do plano

custo máximo aceitável por crédito =
  receita líquida por crédito × (1 - margem alvo)
```

### Premissas da simulação dos planos

Para comparar os planos, foram usadas estas premissas:

- câmbio de proteção: US$ 1 = R$ 5,50;
- reserva de 10% da mensalidade para taxas, impostos e descontos;
- reserva mensal de infraestrutura e suporte: R$ 2 no Free, R$ 4 no Starter, R$ 6 no Creator, R$ 10 no Pro, R$ 20 no Studio e R$ 40 no Agency;
- custo base misto: R$ 0,0045 por crédito ContentFlow;
- estresse usando Seedance 2.5 720p sem vídeo de entrada: R$ 0,0086625 por crédito ContentFlow;
- cenário extremo: custo Kie duas vezes maior que a referência 720p, incluindo variação cambial, retry ou mudança de preço;
- não inclui marketing, equipe, contabilidade ou custos fixos da empresa.

### Resultado estimado por plano

| Plano | Receita | Lucro base | Lucro com Seedance 720p | Lucro no cenário extremo |
|---|---:|---:|---:|---:|
| Free | R$ 0 | -R$ 2,90 | -R$ 3,73 | -R$ 5,46 |
| Starter | R$ 49 | R$ 35,60 | R$ 31,44 | R$ 22,78 |
| Creator | R$ 99 | R$ 71,85 | R$ 61,44 | R$ 39,79 |
| Pro | R$ 199 | R$ 142,10 | R$ 117,12 | R$ 65,15 |
| Studio | R$ 399 | R$ 267,10 | R$ 200,50 | R$ 61,90 |
| Agency | R$ 899 | R$ 589,10 | R$ 422,60 | R$ 76,10 |

Esses valores são contribuição operacional estimada, não lucro contábil líquido. O plano Free é deliberadamente um subsídio de aquisição. Os planos pagos permanecem positivos mesmo no cenário extremo, desde que a cobrança por modelo da seção 5 seja respeitada.

### Por que o Seedance 2.5 precisa de cobrança própria

Se o Seedance 2.5 720p de 10 segundos consumisse apenas 800 créditos, como o piso antigo de vídeo, o cliente pagaria R$ 0,0332 por crédito no plano Pro enquanto o custo da geração seria R$ 17,33. Isso reduziria artificialmente o custo e poderia gerar prejuízo.

Por isso, a regra correta é:

```text
Seedance 2.5 720p sem vídeo de entrada
63 créditos Kie/s × duração
→ convertido para 2.000 créditos ContentFlow por 10s
```

Não deve existir Seedance 2.5 ilimitado nos planos. A geração deve reservar créditos, mostrar o quote antes de iniciar e estornar automaticamente em caso de falha.

## 10. Cobrança recorrente existente

### Stripe

O código possui:

- criação de cliente;
- criação de checkout de assinatura;
- atualização de assinatura;
- cancelamento;
- consulta de cobranças;
- reembolso de cobranças;
- recebimento de webhook de pagamento.

Porém, o evento de pagamento confirmado atualmente registra a compra para rastreamento e **não concede créditos criativos automaticamente**.

### Cakto

O código possui:

- checkout por plano;
- validação de webhook;
- ativação da assinatura após pagamento;
- cancelamento;
- sincronização do status da assinatura.

Também é necessário conectar o pagamento confirmado à concessão idempotente de créditos.

## 11. Fluxo financeiro esperado após a conclusão

```text
Cliente escolhe plano
        ↓
Checkout Stripe/Cakto
        ↓
Pagamento confirmado por webhook assinado
        ↓
Evento idempotente de concessão mensal
        ↓
Créditos adicionados ao ledger
        ↓
Cliente solicita uma geração
        ↓
Quote calcula o consumo
        ↓
Créditos são reservados
        ↓
Kie.ai executa a tarefa
        ↓
Sucesso: liquidação pelo consumo real
Falha: estorno da reserva
        ↓
Relatório de custo, receita e margem
```

## 12. Pendências obrigatórias para considerar o sistema completo

### P0 — Integridade financeira

- Cadastrar no backend os preços Kie por modelo e duração, incluindo a regra Seedance 2.5 da seção 4.
- Salvar custo estimado e custo real de cada geração.
- Implementar concessão mensal conforme os planos da seção 8.
- Tornar o webhook de pagamento idempotente.
- Impedir geração quando a assinatura estiver vencida ou inadimplente.
- Garantir que refund de pagamento ajuste os créditos relacionados.

### P1 — Produto comercial

- Aplicar os créditos mensais e preços definidos na seção 8.
- Aplicar a tabela de consumo por modelo definida na seção 5.
- Definir validade, rollover e expiração.
- Criar pacotes de recarga.
- Definir tratamento de upgrade, downgrade e cancelamento.
- Exibir no frontend saldo, reserva, consumo e previsão de término.

### P2 — Controle de margem

- Relatório por provedor e modelo.
- Custo por cliente e por organização.
- Margem por plano.
- Alertas quando o custo médio ultrapassar a margem mínima.
- Limite de gasto diário e mensal por organização.
- Circuit breaker por modelo caro ou com preço desconhecido.

## 13. Decisões recomendadas

1. Não vender “tokens” ao usuário. Usar créditos simples e previsíveis.
2. Não anunciar geração ilimitada.
3. Não ativar modelo cujo custo real não esteja cadastrado.
4. Usar a tabela de cobrança por modelo deste documento; o piso antigo não pode substituir um quote por resolução e duração.
5. Separar claramente no painel:
   - créditos concedidos;
   - créditos comprados;
   - créditos reservados;
   - créditos consumidos;
   - créditos estornados;
   - custo real do provedor.
6. Publicar os planos da seção 8 inicialmente como recomendação de lançamento e recalibrar após 30 dias de dados reais.

## 14. Arquivos relacionados no projeto

- `libraries/nestjs-libraries/src/creative-engine/creative-credit.service.ts`
- `libraries/nestjs-libraries/src/creative-engine/creative-credit-policy.ts`
- `libraries/nestjs-libraries/src/creative-engine/creative-engine.types.ts`
- `libraries/nestjs-libraries/src/creative-engine/creative-engine.service.ts`
- `libraries/nestjs-libraries/src/creative-engine/providers/kie/kie-creative.provider.ts`
- `libraries/nestjs-libraries/src/database/prisma/subscriptions/pricing.ts`
- `libraries/nestjs-libraries/src/database/prisma/subscriptions/plan-limits.service.ts`
- `libraries/nestjs-libraries/src/database/prisma/generation-costs/generation-cost.service.ts`
- `libraries/nestjs-libraries/src/services/stripe.service.ts`
- `libraries/nestjs-libraries/src/services/cakto.service.ts`
- `apps/backend/src/api/routes/stripe.controller.ts`
- `apps/backend/src/api/routes/billing.controller.ts`
- `.env.example`
- `.env.production.example`

## Conclusão

Na data de 10/08/2026, o ContentFlow possui a base técnica para controlar consumo e proteger o caixa. A estrutura comercial recomendada agora está definida, mas ainda não possui uma ligação completa entre **pagamento → concessão de créditos → renovação mensal → custo real Kie.ai → margem**.

O número mais seguro para apresentar hoje é:

```text
Preço cobrado diretamente por token: não existe.
Preço comercial por crédito: definido por plano na seção 8.
Custo técnico do Seedance 2.5: definido pela tabela Kie da seção 4.
Custo real de outros modelos: ainda precisa ser cadastrado e validado.
Margem simulada: positiva nos planos pagos sob as premissas da seção 9.
Margem contábil definitiva: depende de pagamento, impostos, custos fixos e dados reais.
```
