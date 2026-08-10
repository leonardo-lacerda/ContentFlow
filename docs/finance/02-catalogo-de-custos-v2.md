# Catálogo de custos v2

O catálogo persistido em `PricingVersion` permite atualizar custos e créditos sem alterar o código. Cada linha possui provedor, modelo, unidade, créditos, custo estimado em USD, validade e status.

## Operações iniciais

- Ideias: 10 créditos por solicitação.
- Copy de carrossel: 20 créditos.
- Roteiro: 25 créditos.
- Imagem básica: 25 créditos.
- Imagem 2K: 50 créditos.
- Imagem 4K/premium: 100 créditos.
- Seedance 2.5 480p: 900 créditos por bloco de 10 segundos.
- Seedance 2.5 720p sem entrada: 2.000 créditos por bloco de 10 segundos.
- Seedance 2.5 720p com mídia de entrada: 2.500 créditos por bloco de 10 segundos.
- Kling 3: 1.000 créditos por bloco de 10 segundos.
- Veo 3.1 1080p: 1.600 créditos por vídeo.
- Veo 3.1 4K: 2.400 créditos por vídeo.
- Avatar/lip sync: 325 créditos por bloco de 15 segundos.
- TTS: 12 créditos por bloco de 30 segundos.
- Tradução: 20 créditos.
- Legendas: 8 créditos.

## Registro de custo real

`ProviderCostRecord` registra provedor, modelo, operação, request id, custo estimado, custo real, câmbio aplicado, custo em BRL e créditos cobrados.

O câmbio padrão é configurável por `BILLING_USD_BRL`, atualmente `5.50`. A página de preços do provedor deve ser revisada sempre que um modelo for ativado ou sofrer alteração de preço.

