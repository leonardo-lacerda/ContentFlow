# Resposta a incidentes

## P0

SSRF, vazamento de mídia/direito ou cobrança duplicada. Desabilitar a capability/provider, bloquear o tenant afetado, preservar evidências, executar reconciliação e notificar o responsável de segurança.

## P1

Provider indisponível, falha massiva ou outputs inválidos. Reduzir concorrência, ativar fallback qualificado, interromper cobrança de outputs rejeitados e acompanhar taxa de recuperação.

## P2

Latência, caption, UX ou qualidade abaixo do esperado. Manter geração se segura, abrir incidente com provider/modelo/job/input hash e comparar com rubric.

## Evidências obrigatórias

`organizationId`, job/workflow/publication ID, provider, modelo, input hash, status, tentativa, custo, reservation ID, timestamps e evento de webhook. Nunca registrar token ou conteúdo sensível sem necessidade.
