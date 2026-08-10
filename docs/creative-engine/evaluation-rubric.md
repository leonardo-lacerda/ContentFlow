# Rubric de avaliação

## Preflight automático

Verifica estado terminal, URL, provider, modelo e envelope de output. Falhas impedem aprovação técnica.

## Revisão humana

Cada reviewer pode atribuir 0–100 para:

- fidelidade do produto;
- naturalidade/atuação;
- sincronismo voz-lábios;
- precisão de captions;
- clareza do hook e CTA;
- segurança e aderência de marca.

Um output é aprovado quando não há bloqueio de compliance, preflight passa e a média do caso de uso supera 80. O gate de lançamento deve usar amostra mínima de 30 outputs por provider/capability e registrar intervalo de confiança, não apenas média.

Métricas operacionais: sucesso, falha, retry, refund, custo, p50/p95 de latência, aprovação e rejeição por provider/modelo/workspace.
