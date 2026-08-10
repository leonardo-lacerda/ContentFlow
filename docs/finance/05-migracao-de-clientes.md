# Migração de clientes

## Mapeamento

| Legado | Novo |
|---|---|
| FREE | Free |
| STANDARD | Creator |
| PRO | Pro |
| TEAM | Studio |
| ULTIMATE | Agency |

## Procedimento

1. Exportar clientes, plano, ciclo, saldo e pagamentos.
2. Simular preço e créditos do novo catálogo.
3. Preservar saldo positivo em um lote `MIGRATION`.
4. Desativar concessões antigas.
5. Aplicar o novo plano na próxima renovação.
6. Enviar comunicação e registrar a versão da migração.

O bootstrap evita duplicar concessões de usuários que já possuem histórico legado. A variável `CREATIVE_INITIAL_CREDITS` não é mais a fonte comercial; o Free concede 200 créditos pelo catálogo.
