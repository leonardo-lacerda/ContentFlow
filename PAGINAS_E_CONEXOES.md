# Páginas e conexões do ContentFlow

Este documento explica o contexto das principais páginas do projeto e como elas se conectam entre frontend, backend, banco de dados, integrações externas e jobs assíncronos.

## Visão geral do projeto

O ContentFlow é baseado no ContentFlow: uma plataforma para conectar canais sociais, criar posts, agendar publicações, guardar mídias, acompanhar analytics e automatizar ações com IA e integrações.

A aplicação é organizada como um monorepo PNPM:

- `apps/frontend`: interface web em Next.js/React. As rotas ficam em `apps/frontend/src/app` e os componentes em `apps/frontend/src/components`.
- `apps/backend`: API NestJS. Os controllers ficam em `apps/backend/src/api/routes`.
- `apps/orchestrator`: worker Temporal para jobs de background, principalmente publicação agendada, refresh, streaks, e-mails e auto-post.
- `libraries`: serviços, DTOs, Prisma, integrações sociais, upload, billing, IA, webhooks e helpers compartilhados.

Fluxo principal:

```text
Página Next.js
  -> componentes React
  -> useFetch/internalFetch
  -> controller NestJS
  -> service/repository em libraries
  -> Prisma/PostgreSQL, Redis, storage, Stripe, IA ou APIs sociais
  -> quando precisa publicar/agendar: Temporal orchestrator
```

## Conexão comum entre as páginas

A maioria das páginas autenticadas usa o layout principal em `apps/frontend/src/components/new-layout/layout.component.tsx`. Esse layout carrega `/user/self`, injeta o usuário no contexto, ativa o menu lateral, notificações, seletor de organização, idioma, tema, billing e Copilot.

O menu lateral principal aponta para:

- `/launches` ou Calendar
- `/agents`
- `/analytics`
- `/media`
- `/plugs`
- `/third-party`
- `/billing`
- `/settings`

No backend, os controllers autenticados passam pelo `AuthMiddleware` e pelo `PoliciesGuard`, então as chamadas sempre carregam usuário, organização e permissões antes de chegar aos serviços.

## `/launches` — calendário, canais e criação de posts

Página: `apps/frontend/src/app/(app)/(site)/launches/page.tsx`  
Componente principal: `apps/frontend/src/components/launches/launches.component.tsx`

Esta é a página central do produto. Ela mostra o calendário de publicações, canais conectados, filtros, criação/edição de posts, seleção de mídia, IA para geração de conteúdo e configuração por rede social.

Conexões principais:

- Lista canais em `/integrations/list`.
- Lê posts em `/posts`, `/posts/list`, `/posts/group/:group` e `/posts/:id`.
- Cria posts em `POST /posts`.
- Atualiza data/agendamento em `PUT /posts/:id/date`.
- Remove grupos de posts em `DELETE /posts/:group`.
- Usa tags em `/posts/tags`.
- Usa mídia da biblioteca em `/media`.
- Usa IA de texto em `/posts/generator` e `/posts/generator/draft`.
- Usa IA de imagem/vídeo em `/media/generate-image`, `/media/generate-video` e endpoints relacionados.

Como conecta com o backend:

- `PostsController` recebe as ações de calendário e delega para `PostsService` em `libraries/nestjs-libraries/src/database/prisma/posts`.
- `IntegrationsController` fornece os canais conectados e suas configurações.
- `MediaController` fornece upload, listagem e metadados de mídia.
- `AgentGraphService` ajuda na geração de posts por IA.

Como conecta com jobs:

Quando um post é criado/agendado, o serviço de posts registra ou atualiza workflows Temporal. O worker em `apps/orchestrator` executa `postWorkflowV102`, espera a data de publicação, chama a integração social correta, publica o conteúdo, atualiza estado/URL final, envia notificações e dispara webhooks.

Modelos Prisma mais relacionados:

- `Post`
- `Integration`
- `Media`
- `Tags`
- `Organization`
- `Notifications`
- `Webhooks`

## `/agents` e `/agents/[id]` — assistente de IA por canais

Páginas:

- `apps/frontend/src/app/(app)/(site)/agents/page.tsx`
- `apps/frontend/src/app/(app)/(site)/agents/[id]/page.tsx`

Componentes principais:

- `apps/frontend/src/components/agents/agent.tsx`
- `apps/frontend/src/components/agents/agent.chat.tsx`

A área de Agents permite selecionar canais conectados e conversar com um agente que entende o contexto da organização e dos canais escolhidos.

Conexões principais:

- Lista canais em `/integrations/list`.
- Lista conversas em `/copilot/list`.
- Carrega mensagens de uma thread em `/copilot/:thread/list`.
- Envia mensagens para o agente em `/copilot/agent`.
- O layout global também usa `/copilot/chat` para o CopilotKit geral.

Como conecta com o backend:

- `CopilotController` usa `MastraService`, `MastraAgent` e `CopilotRuntime`.
- O backend injeta no contexto do agente a organização, os canais selecionados e o modo UI.
- A memória das conversas é gerida pelo agente/Mastra, filtrada por `organization.id`.

Modelos e serviços relacionados:

- `Organization`
- `Integration`
- `MastraService`
- `ChatModule`
- ferramentas em `libraries/nestjs-libraries/src/chat/tools`

## `/analytics` — métricas por canal

Página: `apps/frontend/src/app/(app)/(site)/analytics/page.tsx`  
Componente principal: `apps/frontend/src/components/platform-analytics/platform.analytics.tsx`

Mostra analytics dos canais sociais conectados. A tela primeiro lista integrações suportadas e depois carrega métricas por período.

Conexões principais:

- Lista canais em `/integrations/list`.
- Busca métricas em `/analytics/:integration`.
- Pode buscar métricas por post em `/analytics/post/:postId`.

Como conecta com o backend:

- `AnalyticsController` recebe o canal/post.
- O backend usa a integração social correspondente para chamar APIs externas quando necessário.
- Os dados são mostrados em componentes de renderização específicos da plataforma.

Canais destacados no frontend:

- Facebook
- Instagram
- LinkedIn Page
- TikTok
- YouTube
- Google Business Profile
- Pinterest
- Threads
- X

Modelos e serviços relacionados:

- `Integration`
- `Post`
- providers sociais em `libraries/nestjs-libraries/src/integrations/social`

## `/media` — biblioteca de mídia

Página: `apps/frontend/src/app/(app)/(site)/media/page.tsx`  
Componentes principais:

- `apps/frontend/src/components/media/media.component.tsx`
- `apps/frontend/src/components/media/new.uploader.tsx`

A biblioteca centraliza imagens e vídeos usados nos posts. Também é reaproveitada dentro do editor de posts, configurações de perfil e geração por IA.

Conexões principais:

- Lista mídia em `GET /media`.
- Remove mídia em `DELETE /media/:id`.
- Faz upload simples em `POST /media/upload-simple`.
- Faz upload server-side em `POST /media/upload-server`.
- Salva metadados em `POST /media/information`.
- Gera imagem em `POST /media/generate-image` e `POST /media/generate-image-with-prompt`.
- Gera vídeo em `POST /media/generate-video`.
- Usa opções/funções de vídeo em `/media/video-options` e `/media/video/function`.

Como conecta com storage:

- `MediaController` usa `UploadFactory` para escolher o storage.
- Pode salvar arquivos em storage local ou bucket configurado.
- O resultado salvo vira registro `Media` no banco.

Modelos e serviços relacionados:

- `Media`
- `MediaService`
- `UploadFactory`
- providers de vídeo/terceiros quando aplicável

## `/plugs` — automações por canal

Página: `apps/frontend/src/app/(app)/(site)/plugs/page.tsx`  
Componente principal: `apps/frontend/src/components/plugs/plugs.tsx`

Plugs são ações/automations ligadas a canais sociais. A tela lista apenas integrações que possuem plugs disponíveis.

Conexões principais:

- Lista canais em `/integrations/list`.
- Lista plugs disponíveis em `/integrations/plug/list`.
- Usa detalhes do provider selecionado para renderizar opções do plug.

Como conecta com publicação:

- Plugs podem ser internos ou globais.
- No workflow de publicação, após publicar o post, o orchestrator carrega plugs internos e globais da integração e processa ações adicionais.
- Exemplos de uso: repost, ações condicionais ou tarefas derivadas da publicação principal.

Modelos e serviços relacionados:

- `Plugs`
- `Integration`
- `IntegrationManager`
- `PostActivity`
- workflows Temporal

## `/third-party` — integrações externas de mídia/serviços

Página: `apps/frontend/src/app/(app)/(site)/third-party/page.tsx`  
Componente principal: `apps/frontend/src/components/third-parties/third-party.component.tsx`

Esta página gerencia integrações de terceiros além das redes sociais, como serviços que podem gerar, importar ou enviar mídia.

Conexões principais:

- Lista integrações salvas em `GET /third-party`.
- Lista tipos disponíveis em `GET /third-party/list`.
- Adiciona chave/API key em `POST /third-party/:identifier`.
- Remove integração em `DELETE /third-party/:id`.
- Envia dados para uma integração em `POST /third-party/:id/submit`.
- Chama funções específicas em `POST /third-party/function/:id/:functionName`.
- Importa mídia em `POST /third-party/:id/import`.

Como conecta com mídia:

- O backend valida a API key com o provider de terceiro.
- Quando o provider retorna arquivo ou URLs, `ThirdPartyController` usa storage e salva o resultado como `Media`.
- A mídia importada fica disponível na biblioteca e no editor de posts.

Modelos e serviços relacionados:

- `ThirdParty`
- `Media`
- `ThirdPartyManager`
- providers em `libraries/nestjs-libraries/src/3rdparties`

## `/billing` e `/billing/lifetime` — planos, assinatura e pagamento

Páginas:

- `apps/frontend/src/app/(app)/(site)/billing/page.tsx`
- `apps/frontend/src/app/(app)/(site)/billing/lifetime/page.tsx`

Componentes principais:

- `apps/frontend/src/components/billing/billing.component.tsx`
- `apps/frontend/src/components/billing/main.billing.component.tsx`
- `apps/frontend/src/components/billing/lifetime.deal.tsx`

Gerencia planos, subscription, checkout, trial, portal do Stripe, lifetime deal e pagamento cripto.

Conexões principais:

- Frontend carrega tiers em `/user/subscription/tiers`.
- Frontend carrega assinatura atual em `/user/subscription`.
- Backend de billing expõe `/billing`, `/billing/subscribe`, `/billing/embedded`, `/billing/portal`, `/billing/cancel`, `/billing/prorate`, `/billing/lifetime`, `/billing/crypto` e checks relacionados.

Como conecta com permissões:

- O plano/tier afeta limites e acesso a páginas, como equipe, webhooks, API pública, auto-post, IA, canais e quantidade de posts.
- `PoliciesGuard` valida permissões em endpoints que criam recursos ou usam recursos pagos.

Modelos e serviços relacionados:

- `Subscription`
- `Organization`
- `StripeService`
- `SubscriptionService`
- `Nowpayments`
- `Notifications`

## `/settings` — configurações da organização e do usuário

Página: `apps/frontend/src/app/(app)/(site)/settings/page.tsx`  
Componente principal: `apps/frontend/src/components/layout/settings.component.tsx`

A página de Settings é uma área com abas. As abas aparecem conforme permissões e plano.

Abas principais:

- Global Settings
- Teams
- Webhooks
- Auto Post
- Sets
- Signatures
- Developers/Public API
- Approved Apps

Conexões principais:

- Perfil pessoal: `GET /user/personal` e `POST /user/personal`.
- Times: `/settings/team`.
- Preferência de shortlink: `/settings/shortlink`.
- Webhooks: endpoints de `/webhooks`.
- Auto Post: endpoints de `/autopost`.
- Sets: endpoints de `/sets`.
- Signatures: endpoints de `/signature`.
- Public API/Developers: endpoints de API key e OAuth/public API.
- Approved Apps: endpoints de `/approved-apps`.

Como conecta com o resto do produto:

- Team define membros e papéis da organização.
- Webhooks recebem eventos gerados depois de publicações.
- Auto Post pode criar posts automaticamente conforme configuração.
- Sets e Signatures são usados no editor/calendário para reaproveitar conteúdo/configurações.
- Public API permite automações externas criarem ou consultarem dados.

Modelos relacionados:

- `User`
- `Organization`
- `UserOrganization`
- `Webhooks`
- `AutoPost`
- `Sets`
- `Signatures`
- `OAuthApp`
- `OAuthAuthorization`

## `/auth`, `/auth/login`, `/auth/activate`, `/auth/forgot` — autenticação

Páginas principais:

- `apps/frontend/src/app/(app)/auth/page.tsx`
- `apps/frontend/src/app/(app)/auth/login/page.tsx`
- `apps/frontend/src/app/(app)/auth/activate/page.tsx`
- `apps/frontend/src/app/(app)/auth/activate/[code]/page.tsx`
- `apps/frontend/src/app/(app)/auth/forgot/page.tsx`
- `apps/frontend/src/app/(app)/auth/forgot/[token]/page.tsx`

Estas páginas cobrem cadastro, login, ativação, recuperação de senha e providers externos.

Conexões principais:

- Verifica se cadastro é permitido em `/auth/can-register`.
- Usa `AuthController` e `AuthService` para login/cadastro/senha.
- Usa providers de autenticação como GitHub, Google, Farcaster, Wallet e OAuth.
- Cria ou vincula `User`, `Organization` e `UserOrganization`.

## `/integrations/social/[provider]` — retorno/continuação de OAuth social

Página: `apps/frontend/src/app/(app)/integrations/social/[provider]/page.tsx`  
Componente principal: `apps/frontend/src/components/launches/continue.integration.tsx`

Esta rota é usada durante a conexão de canais sociais. Ela continua o fluxo de OAuth, refresh ou etapas intermediárias de uma integração.

Conexões principais:

- Começa no calendário ao clicar para adicionar canal.
- O backend cria uma URL OAuth em `GET /integrations/social/:integration`.
- O callback volta para a aplicação e salva/atualiza a integração.
- Dados temporários do fluxo usam Redis com chaves como organização, login, refresh, redirect e onboarding.

Modelos e serviços relacionados:

- `Integration`
- `IntegrationManager`
- providers sociais em `libraries/nestjs-libraries/src/integrations/social`
- Redis

## `/oauth/authorize` — autorização de apps externos

Página: `apps/frontend/src/app/(app)/oauth/authorize/page.tsx`

Esta tela permite que um app externo peça autorização para acessar recursos da organização, semelhante a um fluxo OAuth próprio da plataforma.

Conexões principais:

- Consulta autorização em `GET /oauth/authorize`.
- Confirma autorização em `POST /oauth/authorize`.
- O backend usa controllers de OAuth e entidades de OAuth App/Authorization.

Modelos relacionados:

- `OAuthApp`
- `OAuthAuthorization`
- `Organization`
- `User`

## `/p/[id]` — preview público de post

Página: `apps/frontend/src/app/(app)/(preview)/p/[id]/page.tsx`

Exibe uma versão pública/compartilhável de um post, com conteúdo sanitizado, mídia e comentários.

Conexões principais:

- Carrega dados em `/public/posts/:id` usando `internalFetch` no servidor.
- Usa componentes de preview e comentários.
- É separada do layout autenticado principal.

Modelos relacionados:

- `Post`
- `Media`
- `Comments`

## `/admin/errors` — erros administrativos

Página: `apps/frontend/src/app/(app)/(site)/admin/errors/page.tsx`  
Componente principal: `apps/frontend/src/components/admin/admin-errors.component.tsx`

Área administrativa para visualizar erros por plataforma/canal.

Conexões principais:

- Usa endpoints de `AdminController`, como `/admin/errors` e `/admin/errors/platforms`.
- Exige permissões de admin/super admin.

Modelos relacionados:

- `Errors`
- `User`
- `Organization`
- `Integration`

## Rotas da extensão e providers mobile

Páginas:

- `apps/frontend/src/app/(extension)/modal/[style]/[platform]/page.tsx`
- `apps/frontend/src/app/(provider)/provider/[p]/page.tsx`
- `apps/frontend/src/app/(provider)/provider/add/page.tsx`

Essas rotas servem fluxos fora da navegação principal:

- Modal standalone usado pela extensão/browser extension.
- Bridge de provider para fluxos mobile/in-app.
- Adição rápida de integração por provider.

Elas ainda reutilizam componentes do frontend e endpoints do backend para autenticação, integração social e criação de posts.

## Como uma publicação se conecta ponta a ponta

1. O usuário entra em `/launches`.
2. A página carrega canais com `/integrations/list`.
3. O usuário cria um post usando o editor, mídia e configurações por canal.
4. O frontend envia para `POST /posts`.
5. `PostsController` chama `PostsService`, que salva `Post`, mídia, tags e estado no banco.
6. Se o post for agendado, o sistema cria/atualiza um workflow Temporal.
7. O orchestrator executa `postWorkflowV102` no horário certo.
8. `PostActivity` busca o post, processa mídia/tags, chama o provider social correto e publica.
9. O resultado atualiza o post com ID/URL externa.
10. O sistema envia notificação, streak, webhooks e plugs relacionados.

## Como uma integração social se conecta ponta a ponta

1. O usuário clica para adicionar canal em `/launches`.
2. O frontend chama `GET /integrations/social/:integration`.
3. O backend usa `IntegrationManager` para encontrar o provider social.
4. O provider gera a URL OAuth e o backend salva estado temporário no Redis.
5. O usuário autoriza no serviço externo.
6. O callback retorna para o app e o backend troca o código por token.
7. O backend salva `Integration` com token criptografado, profile, nome, imagem e configurações.
8. O canal aparece em `/launches`, `/analytics`, `/plugs` e `/agents` conforme suporte.

## Como mídia se conecta ponta a ponta

1. O usuário abre `/media` ou o seletor de mídia dentro do editor.
2. O frontend lista `GET /media`.
3. Uploads usam `/media/upload-simple`, `/media/upload-server` ou multipart via endpoints dinâmicos.
4. `MediaController` envia o arquivo para o storage definido por `UploadFactory`.
5. `MediaService` salva o arquivo no banco como `Media`.
6. Posts referenciam essas mídias por JSON/campos relacionados.
7. Na publicação, `PostActivity` chama `PostsService.updateMedia` para preparar os arquivos para o provider social.

## Como billing e permissões atravessam as páginas

Billing não é só uma página. Ele aparece em várias decisões do produto:

- O layout pode bloquear usuários free ou mostrar onboarding de pagamento.
- Settings mostra/oculta abas conforme `tier`.
- Controllers usam `CheckPolicies` para limitar criação de posts, canais, IA, equipe e outros recursos.
- O backend valida assinatura em jobs antes de publicar quando Stripe está configurado.
- A assinatura vive no modelo `Subscription`, ligado à `Organization`.

## Resumo por área

| Área | Página | Backend principal | Banco/serviços | Conecta com |
| --- | --- | --- | --- | --- |
| Calendário/posts | `/launches` | `PostsController`, `IntegrationsController` | `Post`, `Integration`, Temporal | redes sociais, mídia, webhooks, plugs |
| Agents/IA | `/agents` | `CopilotController` | Mastra, memória, `Integration` | canais selecionados e ferramentas de chat |
| Analytics | `/analytics` | `AnalyticsController` | `Integration`, APIs sociais | métricas externas por plataforma |
| Mídia | `/media` | `MediaController` | `Media`, storage | editor, IA, terceiros |
| Plugs | `/plugs` | `IntegrationsController`, orchestrator | `Plugs`, `Integration` | pós-publicação e automações |
| Terceiros | `/third-party` | `ThirdPartyController` | `ThirdParty`, `Media` | importação/geração externa de mídia |
| Billing | `/billing` | `BillingController`, user subscription endpoints | `Subscription`, Stripe, Nowpayments | permissões e limites |
| Settings | `/settings` | `SettingsController` e controllers auxiliares | `Organization`, `User`, `Webhooks`, `Sets` | times, API, webhooks, auto-post |
| Auth | `/auth/*` | `AuthController` | `User`, `Organization` | sessão e providers externos |
| OAuth apps | `/oauth/authorize` | `OAuthController` | `OAuthApp`, `OAuthAuthorization` | API pública e apps externos |
| Preview público | `/p/[id]` | `PublicController` | `Post`, `Media`, `Comments` | compartilhamento público |
| Admin | `/admin/errors` | `AdminController` | `Errors` | diagnóstico operacional |
