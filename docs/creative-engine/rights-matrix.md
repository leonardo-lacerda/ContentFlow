# Matriz de direitos e consentimento

| Recurso | Estado inicial | Pode aparecer no catálogo de geração | Evidência mínima |
|---|---|---|---|
| Asset de produto | `UNKNOWN` | somente `READY + APPROVED` | origem/licença e referência |
| Ator | `PENDING` | somente `APPROVED` | consentimento, escopo e validade |
| Voz | `PENDING` | somente `APPROVED` | consentimento/clonagem e idioma |
| Output gerado | `UNKNOWN` | revisão conforme contrato do provider | provenance e provider |

Transições válidas: `UNKNOWN/PENDING → APPROVED → REVOKED/EXPIRED`. Revogação bloqueia novos jobs, marca publicações relacionadas e inicia o fluxo de takedown. Grants são filtrados por organização, recurso, status e `expiresAt`.

`consentReference` nunca deve ser um segredo bruto. Use ID de contrato, hash ou referência auditável; armazene o documento em sistema apropriado.
