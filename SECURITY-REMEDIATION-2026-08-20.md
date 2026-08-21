# Security remediation — 2026-08-20

Implementação direta de todas as correções identificadas em `SECURITY-AUDIT-2026-08-20.md`.
Este documento registra o que foi de fato alterado no código, testado e validado — não
repete a análise da auditoria, que continua em `SECURITY-AUDIT-2026-08-20.md`.

## Achado adicional (fora do escopo original da auditoria)

Durante a caça a bypasses do fix do SSRF de carrossel (N-2), o mesmo padrão — buscar uma
URL de mídia do post no servidor sem nenhuma validação — apareceu em **8 provedores de
rede social**: `bluesky`, `discord`, `dribbble`, `pinterest`, `reddit`, `skool`, `vk` e
`youtube` (12 pontos de chamada). Qualquer usuário autenticado, via a tool de chat
`integrationSchedulePostTool` (`attachments: string[]`, sem restrição de origem) ou via a
API pública, podia anexar uma URL apontando para `169.254.169.254`, um endereço interno da
rede Docker, ou qualquer host arbitrário, e o provedor buscaria essa URL no momento de
publicar o post. Corrigido com o mesmo padrão usado no resto do código (`isSafePublicHttpsUrl`
+ `ssrfSafeDispatcher`), centralizado em um helper único.

## Aplicado no código

- **SSRF em mídia de carrossel (N-2) e no publish de posts (achado adicional acima).**
  `libraries/nestjs-libraries/src/database/prisma/media/media.service.ts`
  (`uploadCarouselImage`, `setCarouselLogo`) e os 8 provedores sociais agora validam a URL
  com `isSafePublicHttpsUrl` e buscam via `ssrfSafeDispatcher` (com bloqueio de redirect e
  limite de tamanho/tempo) antes de confiar em qualquer conteúdo remoto; URLs que já apontam
  para o próprio storage do app (`FRONTEND_URL`/`MAIN_URL`) continuam sendo buscadas
  diretamente, preservando o dev local. Novo helper compartilhado:
  `libraries/nestjs-libraries/src/upload/bounded-fetch.ts` (limite de tamanho/tempo genérico)
  e `libraries/nestjs-libraries/src/upload/safe-media-fetch.ts` (política de confiança
  própria-origem vs. pública).
- **Ferramenta de agendamento/publicação do agente de IA sem gate de confirmação (N-3).**
  `libraries/nestjs-libraries/src/chat/tools/integration.schedule.post.ts` agora exige
  confirmação de duas etapas (`ToolConfirmationService`) para `type: 'schedule'`/`'now'`,
  igual às demais ferramentas que gastam crédito ou publicam. `draft` continua isento.
- **Conteúdo de anexos/links sem blindagem contra prompt injection (N-3).**
  `libraries/nestjs-libraries/src/chat/load.tools.service.ts` — `studioAttachments` agora
  tem a mesma instrução explícita de "isto é dado, não instrução" que já existia para
  `brandContext`, deixando claro que esse conteúdo nunca pode substituir a confirmação do
  usuário nem satisfazer `confirmed=true`.
- **Sessão não revogada em troca de senha (N-4).**
  `libraries/nestjs-libraries/src/database/prisma/users/users.repository.ts`
  (`updatePassword`) e `apps/backend/src/api/routes/admin/admin-users-organizations.controller.ts`
  (`forcePasswordReset`) agora incrementam `authSessionVersion` na mesma escrita que troca a
  senha.
- **Confusão de tipo de token em endpoint não autenticado (N-5).**
  `libraries/helpers/src/auth/auth.service.ts` — `verifyJWT` ganhou a opção
  `rejectInternalTypes`, que recusa qualquer token cujo `typ` seja um dos tipos internos do
  app (`session`, `payment`, `org-invite`, etc.). Aplicado nos três endpoints de
  `apps/backend/src/api/routes/enterprise.controller.ts`, que não passam por
  `AuthMiddleware`.
- **Rate limit só por IP em registro/recuperação de senha (N-6).**
  `libraries/nestjs-libraries/src/throttler/throttler.provider.ts` — `/auth/register` e
  `/auth/forgot` ganharam bucket por e-mail no Redis, mesmo padrão já existente em
  `/auth/login`.
- **Webhook Cakto sem dedupe por event-id (N-7).**
  `libraries/nestjs-libraries/src/services/cakto.service.ts` — `processWebhook` agora
  reivindica o `eventId` atomicamente (`SET ... NX`) antes de processar; uma redelivery do
  mesmo evento retorna `{ ok: true, duplicate: true }` sem tocar a assinatura de novo.
- **`/mcp-studio` — comentário incorreto sobre o padrão de habilitação (N-9).**
  `libraries/nestjs-libraries/src/chat/start.mcp.ts` — comentário corrigido para refletir o
  comportamento real (ligado por padrão em produção, igual ao `/mcp`). `DISABLE_STUDIO_MCP`
  e `ENABLE_STUDIO_MCP_LOCAL` agora documentados em `.env.example`.
- **Containers Docker rodando como root, `/uploads` com `chmod 777` (N-10, N-11).**
  `Dockerfile.backend`, `Dockerfile.dev` e `Dockerfile.vultr` agora criam e usam um usuário
  `www` não privilegiado; `Dockerfile.vultr` não tinha usuário algum antes. Paths de
  pid/log do nginx movidos para `/www` (`var/docker/nginx.conf`,
  `var/docker/nginx.backend.conf`), já que `/var/run` e `/var/log/nginx` são de root por
  padrão na imagem base.
- **Texto de erro desatualizado no frontend de registro (N-13).**
  `apps/frontend/src/components/auth/register.tsx` — mensagem genérica, alinhada com o
  backend (que já não distingue mais "e-mail já existe" de outras falhas).
- **Cobertura limitada do scanner estático de segredos (N-14).**
  `scripts/security-static-check.mjs` — adicionados padrões para chave live da Stripe
  (`sk_live_`), AWS access key id, e connection string com credencial embutida (excluindo
  interpolação `${VAR}` e os poucos arquivos de dev local já conhecidos e triados).

## Verificação realizada

- Suíte de testes completa do backend: **525/525 passando** (80 suites), incluindo 8
  arquivos de teste novos/estendidos cobrindo cada correção acima com o exploit original
  reproduzido e bloqueado.
- Suíte de testes do frontend: **179/179 passando**.
- `tsc --noEmit`: limpo (só um erro pré-existente e não relacionado, já presente antes desta
  sessão).
- `pnpm run build:backend`: 534/534 arquivos, 0 falhas.
- `pnpm run build:frontend`: todas as rotas compiladas, 0 erros.
- `node scripts/security-static-check.mjs` rodado contra o repositório real após a correção:
  0 achados.
- Lint: não executado — não há script de lint funcional na raiz do repo (config do eslint
  quebrada por incompatibilidade de versão, pré-existente e não relacionada a esta sessão).

## Pendências — não corrigido nesta sessão

- **C-1 (crítico) — `JWT_SECRET` de produção histórico ainda recuperável do git.** Exige
  reescrita do histórico (`git filter-repo` + force-push) e rotação coordenada de segredos
  em produção — ambas ações destrutivas/irreversíveis fora do escopo do que esta sessão
  pode executar sem autorização explícita e acesso à produção. **É o único item crítico da
  auditoria que continua, em tese, explorável** (só se o histórico do repositório vazar).
- **Commits pendentes.** As correções do webhook Nowpayments (N-1) e do guard de
  HTTPS/pagamento em produção já existiam prontas e testadas no working tree antes desta
  sessão começar — nenhum commit foi feito nelas nem no restante do trabalho desta sessão,
  seguindo a convenção do projeto (só commitar quando pedido explicitamente).
- **Dockerfiles (N-10) não verificados com build real.** O daemon Docker não estava
  acessível nesta sessão (só o binário CLI). A correção foi feita por análise cuidadosa de
  ownership e dos paths de pid/log do nginx, mas recomenda-se validar com
  `docker build`/`docker compose up` reais antes do próximo deploy.

## Status

**SECURITY REMEDIATION: INCOMPLETE** — único motivo é C-1, que exige decisão e autorização
explícitas do responsável pelo projeto (reescrita de histórico do git + rotação de
segredos em produção), não uma ação que a sessão deva tomar sozinha.
