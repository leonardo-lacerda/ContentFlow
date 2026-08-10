# 14 — Matriz de testes

## 1. Conversas

| Caso | Resultado esperado |
|---|---|
| criar conversa | conversa persistida na organização correta |
| enviar mensagem | mensagem e resposta persistidas |
| resposta longa | streaming incremental |
| atualizar página | conversa e artefato restaurados |
| reconectar | eventos faltantes recuperados |
| cancelar | execução cancelada sem deixar estado indefinido |
| arquivar | conversa some da lista ativa e continua recuperável |

## 2. Intenção e planner

| Caso | Resultado esperado |
|---|---|
| “me dê ideias” | `generate_ideas` |
| “faça um carrossel” | `create_carousel` |
| “crie vídeo UGC” | `create_video` |
| pedido ambíguo | pergunta curta, sem geração |
| pedido de publicação | plano + confirmação |
| tentativa de escolher provider | IA assume abstração técnica |
| mudança de formato | nova versão do plano |

## 3. Artefatos

| Caso | Resultado esperado |
|---|---|
| criar artefato | schema válido |
| revisar texto | nova versão |
| revisar cena | somente cena afetada muda |
| restaurar versão | versão antiga vira ativa |
| duplicar | novo artefato vinculado ao original |
| schema inválido | erro antes de persistir |
| artefato falho | retry ou mensagem acionável |

## 4. Créditos e jobs

| Caso | Resultado esperado |
|---|---|
| quote | custo exibido antes da cobrança |
| saldo insuficiente | nenhum job criado |
| confirmação | reserva única |
| retry com mesma key | mesmo job e mesma cobrança |
| timeout do provider | estado retryable e refund conforme política |
| cancelamento | reserva liberada uma vez |
| job concluído | output com provenance |

## 5. Assets e direitos

| Caso | Resultado esperado |
|---|---|
| upload válido | preview e checksum |
| MIME falso | upload rejeitado |
| asset de outra organização | acesso negado |
| ator aprovado | aparece para geração |
| ator revogado | novos jobs bloqueados |
| instrução maliciosa no PDF | não altera regras do agente |
| URL privada | rejeitada ou tratada com fluxo seguro |

## 6. Conteúdo

| Caso | Resultado esperado |
|---|---|
| gerar ideias | lista estruturada |
| transformar ideia em carrossel | vínculo entre artefatos |
| gerar imagem | preview e variações |
| gerar carrossel | slides, legenda e alt text |
| regenerar slide | demais slides preservados |
| adaptar para canal | versão compatível sem alterar original |

## 7. Vídeo

| Caso | Resultado esperado |
|---|---|
| prompt de vídeo | plano e storyboard |
| escolher voz | preview e vínculo ao plano |
| gerar | job assíncrono |
| progresso | atualização no chat e artefato |
| trocar hook | nova versão de script/storyboard |
| trocar cena | rerender mínimo possível |
| vídeo pronto | preview, download e provenance |

## 8. Publicação

| Caso | Resultado esperado |
|---|---|
| publicar sem confirmar | bloqueado |
| integração ausente | mensagem acionável |
| adaptar para duas redes | duas versões vinculadas |
| agendar | registro no calendário |
| repetir request | publicação idempotente |
| cancelar | status correto e auditado |

## 9. Segurança

- autorização por organização;
- autorização por recurso;
- prompt injection;
- SSRF;
- upload malicioso;
- exposição de secrets;
- abuso de créditos;
- tool call fora da intenção;
- publicação sem approval;
- retenção e exclusão.

## 10. Qualidade de IA

Cada release deve executar o dataset de avaliação e registrar:

- intenção;
- planner;
- tool escolhida;
- schema;
- pergunta;
- custo;
- segurança;
- aderência ao Brand DNA;
- qualidade do output.

## Critério da matriz

Não há lançamento se algum caso crítico de segurança, cobrança, autorização,
publicação ou perda de versão falhar.
