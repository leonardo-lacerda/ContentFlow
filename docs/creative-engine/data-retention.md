# Retenção e exclusão

- Jobs, provenance, ledger e auditoria: retenção padrão de 12 meses, ajustável por contrato.
- Assets, outputs e previews: retenção até exclusão do projeto ou expiração da política do workspace.
- Takedown: cancela jobs ativos, revoga grants, remove URLs de variantes, arquiva registros e marca publicações relacionadas.
- Exclusão física de storage deve ser executada pelo provider de storage com job assíncrono e confirmação; tombstone no banco não é prova de apagamento físico.
- Não enviar consentimento, tokens ou dados de billing em prompts ou logs.
- Solicitações LGPD/GDPR devem localizar organização, projeto, assets, variantes, jobs, provenance, webhooks e exportações.
