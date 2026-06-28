# Plano de desenvolvimento: Holo-like para ContentFlow

Data: 2026-06-28

Objetivo: transformar o ContentFlow em um SaaS equivalente ou superior ao Holo AI, mas com foco claro em ser o melhor gerador, editor, aprovador, agendador e otimizador de carrosseis para redes sociais.

## 1. Leitura estrategica

O Holo AI vence por reduzir o tempo entre "tenho um site" e "tenho pecas de marketing prontas". O diferencial principal nao e apenas gerar conteudo com IA; e criar um perfil persistente de marca, usar esse perfil em todo output e entregar varias ideias em um fluxo simples de aprovacao.

Para o ContentFlow, a oportunidade e melhor: o produto ja tem calendario, midia, organizacoes, times, permissoes, integracoes sociais, publicacao agendada, analytics e workers Temporal. A copia pura do Holo seria pequena demais. O caminho certo e transformar o ContentFlow em uma plataforma de carrosseis de ponta a ponta:

1. O usuario informa site, Instagram/LinkedIn ou materiais de marca.
2. O sistema cria um Brand DNA persistente.
3. A IA gera ideias, roteiros, slides, imagens, captions e hashtags alinhados a essa marca.
4. O usuario aprova ou descarta ideias no Content Swipe.
5. O sistema gera carrosseis completos em background.
6. O usuario edita, aprova em equipe, agenda e publica nos canais ja conectados.
7. O analytics retroalimenta novas sugestoes.

## 2. Estado atual observado no ContentFlow

### 2.1 Bases ja existentes

- Monorepo PNPM com `apps/frontend`, `apps/backend`, `apps/orchestrator` e `libraries`.
- Frontend em Next.js/React, backend em NestJS, banco via Prisma/PostgreSQL e jobs com Temporal.
- Calendario e criacao de posts em `/launches`.
- Biblioteca de midia em `/media`.
- Analytics por canal em `/analytics`.
- Times, permissoes e configuracoes em `/settings`.
- Billing em `/billing`.
- AI carousel studio em `/ai-generate-images`.
- Endpoints de IA em `/ai-generate/*`.
- Endpoints de perfis de empresa/marca em `/settings/company-profiles`.
- Salvamento de carrossel na biblioteca de midia via `/media/carousel`.
- Estrutura de CompanyProfile com campos de marca: site, industria, publico, produtos, diferenciais, tom de voz, resumo, identidade visual, cores, fontes, CTA, termos proibidos, preferencias, logos, paletas, regras de estilo, biblioteca de inspiracoes e ideias.

### 2.2 Lacunas principais

- O Brand DNA ainda parece viver dentro de `Organization.description` como JSON, o que e util para MVP, mas fragil para escala, busca, auditoria, limites, permissoes e historico.
- A extracao por URL existe para resumo textual, mas precisa virar pipeline completo de Brand DNA: texto, metadados, cores, logo, imagens, screenshots, fontes percebidas, produtos, provas sociais, ofertas e publico.
- A identidade visual atual depende de imagens enviadas pelo usuario; falta extracao automatica de assets do site.
- Jobs de imagem e historico de custo parecem usar memoria em processo; em producao isso deve ir para banco/Redis/Temporal.
- Falta Content Swipe como superficie dedicada para aprovar/recusar ideias.
- Falta geracao automatica recorrente baseada em calendario, frequencia, canais e objetivos.
- Falta analytics especifico de carrossel retroalimentando geracao.
- Falta onboarding de "URL -> Brand DNA -> primeiro carrossel".
- Falta separacao robusta entre Brand, Brand DNA, assets, templates, campanhas, ideias, projetos de carrossel e posts publicados.

## 3. Capacidade alvo

### Capability

Um founder, criador, social media ou agencia consegue conectar uma marca ao ContentFlow, gerar automaticamente carrosseis profissionais alinhados ao Brand DNA, aprovar ideias em uma interface rapida, editar os slides, agendar a publicacao e aprender com a performance para melhorar os proximos carrosseis.

### Regras e invariantes

- Cada output gerado deve estar associado a uma marca selecionada.
- Nenhum conteudo deve ser publicado automaticamente sem configuracao explicita de auto-geracao e auto-agendamento.
- Brand DNA e dados de clientes nao devem ser usados para treinar modelos globais.
- O usuario deve conseguir revisar e sobrescrever qualquer inferencia feita pela IA.
- Todo job de geracao caro ou demorado deve ser persistente, reexecutavel e observavel.
- A geracao deve respeitar limites de plano, custo, rate limit, organizacao e permissoes.
- O sistema deve preservar a vantagem nativa do ContentFlow: gerar, aprovar, agendar, publicar e medir.

### Nao objetivos

- Nao transformar o ContentFlow em um clone generico de "AI marketing suite" antes de dominar carrosseis.
- Nao publicar conteudo sem aprovacao, exceto em automacoes explicitamente configuradas.
- Nao depender de scraping agressivo de redes sociais.
- Nao criar engine de design completamente isolada se o studio atual puder ser evoluido.
- Nao misturar permanentemente dados estruturados de marca dentro de campos genericos como `Organization.description`.

## 4. Arquitetura recomendada

### 4.1 Dominios novos ou formalizados

1. BrandProfile
   - Representa uma marca dentro de uma organizacao.
   - Substitui gradualmente CompanyProfile em JSON.
   - Suporta multi-brand para agencias.

2. BrandDNA
   - Snapshot versionado da analise da marca.
   - Contem tom de voz, publico, dores, beneficios, provas, ofertas, palavras proibidas, CTA padrao, pilares, gatilhos de compra e direcao visual.

3. BrandAsset
   - Logos, imagens, screenshots, paletas, fontes, referencias visuais, exemplos aprovados.

4. ContentIdea
   - Ideias geradas ou importadas.
   - Estados: `new`, `approved`, `rejected`, `archived`, `used`.

5. CarouselProject
   - Plano de carrossel, slides, caption, hashtags, prompt visual, imagens geradas, status editorial e vinculo com posts.

6. GenerationJob
   - Registro persistente de jobs: Brand DNA extraction, idea generation, carousel plan, image generation, caption generation, bulk generation.

7. CarouselPerformance
   - Metricas normalizadas por carrossel publicado: impressions, reach, saves, shares, comments, clicks, engagement rate, platform-specific metrics.

### 4.2 Principio de implementacao

Comecar reaproveitando os endpoints e componentes atuais, mas criar uma camada de dominio limpa por tras:

- Manter compatibilidade com `/settings/company-profiles` no curto prazo.
- Introduzir modelos Prisma novos para o caminho escalavel.
- Criar adaptadores que convertam CompanyProfile legado para BrandProfile/BrandDNA.
- Migrar gradualmente o AI carousel studio para usar `brandProfileId`.
- Persistir jobs e resultados antes de criar automacoes em massa.

## 5. Plano por fases

## Fase 0 - Preparacao, produto e contratos

Objetivo: alinhar escopo, reduzir retrabalho e criar contratos claros antes de mexer em varias partes do monorepo.

### 0.1 Auditoria tecnica do fluxo atual

Entregas:

- Mapear todos os endpoints usados por `/ai-generate-images`.
- Documentar payloads atuais de carousel plan, carousel ideas, captions, review, fix, image jobs e save carousel.
- Identificar onde CompanyProfile e salvo, lido e renderizado.
- Identificar limites atuais de IA, creditos, billing e permissoes.
- Confirmar como carrosseis salvos em `/media/carousel` viram posts em `/launches`.

Boas praticas:

- Criar ADR curto para decisoes principais.
- Evitar refatoracao ampla antes de congelar contratos.
- Usar testes de caracterizacao nos servicos atuais antes de alterar comportamento.

### 0.2 Definicao de metricas de sucesso

Metricas de produto:

- Tempo ate primeiro carrossel gerado.
- Percentual de usuarios que completam Brand DNA.
- Taxa de ideias aprovadas no swipe.
- Percentual de carrosseis gerados que sao editados, salvos e agendados.
- Custo medio por carrossel gerado.
- Tempo medio de job completo.
- Taxa de falha por provider de IA.
- Performance por template, nicho e canal.

Metricas tecnicas:

- P95 de criacao de plano textual.
- P95 de geracao por slide.
- Erros por modelo/provider.
- Reprocessamentos por job.
- Uso de tokens e custo por organizacao.
- Fila Temporal/Redis: backlog, retries, dead letters.

### 0.3 Contratos de IA

Entregas:

- Schemas JSON versionados para:
  - BrandDNA extraction.
  - CarouselIdea.
  - CarouselPlan.
  - EditorialReview.
  - CaptionPackage.
  - TemplateRecommendation.
- Validacao server-side com DTOs e schemas.
- Fallback para respostas malformadas.

Boas praticas:

- Nunca confiar em JSON livre do modelo sem validacao.
- Versionar prompts e schemas juntos.
- Salvar `model`, `promptVersion`, `schemaVersion`, `usage` e `costEstimate`.

## Fase 1 - Fundacao escalavel de Brand DNA

Objetivo: transformar a feature mais importante do Holo em uma fundacao propria do ContentFlow.

### 1.1 Modelagem de dados

Criar modelos Prisma recomendados:

```prisma
model BrandProfile {
  id             String   @id @default(uuid())
  organizationId String
  name           String
  website        String?
  industry       String?
  status         BrandProfileStatus @default(DRAFT)
  selected       Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
}

model BrandDnaSnapshot {
  id             String   @id @default(uuid())
  brandProfileId String
  version        Int
  sourceType     String
  sourceUrl      String?
  summary        Json
  voice          Json
  audience       Json
  offer          Json
  visual         Json
  constraints    Json
  confidence     Json?
  promptVersion  String
  model          String
  createdAt      DateTime @default(now())
}

model BrandAsset {
  id             String   @id @default(uuid())
  brandProfileId String
  mediaId        String?
  type           String
  sourceUrl      String?
  metadata       Json?
  approved       Boolean  @default(false)
  createdAt      DateTime @default(now())
  deletedAt      DateTime?
}
```

Decisao importante:

- No MVP, pode manter leitura/escrita em CompanyProfile para velocidade.
- Para escala, criar tabelas proprias e migrar dados. Guardar tudo em `Organization.description` nao e suficiente para multi-brand serio.

### 1.2 Pipeline de extracao por URL

Fluxo:

1. Usuario informa site.
2. Backend normaliza URL e valida seguranca.
3. ExtractContentService extrai texto.
4. Um crawler leve coleta metadados, Open Graph, favicon, imagens principais, links internos essenciais e possiveis logos.
5. Uma captura visual opcional gera screenshot da home e secoes importantes.
6. Um extrator visual detecta paleta, contraste, estilo, possivel tipografia e assets.
7. LLM sintetiza BrandDNA estruturado.
8. Usuario revisa e aprova.

Subfases:

- 1.2.1 URL textual: usar extracao existente e melhorar robustez.
- 1.2.2 Assets: coletar OG image, logo, favicon, imagens de produto e screenshots.
- 1.2.3 Paleta: extrair cores dominantes e sugerir paletas com uso.
- 1.2.4 Voice: sintetizar tom, publico, dores, beneficios, objeções e CTAs.
- 1.2.5 Review UI: mostrar inferencias editaveis antes de salvar.

Boas praticas:

- Bloquear SSRF: rejeitar localhost, redes privadas, IPs internos e protocolos nao HTTP/HTTPS.
- Definir timeout curto, limite de tamanho e limite de paginas por dominio.
- Registrar fonte de cada inferencia.
- Permitir reprocessamento manual.
- Marcar campos com confidence score.

### 1.3 Brand DNA editor

Superficie:

- Dentro de Settings ou uma nova rota `/brands`.
- Lista de marcas.
- Marca selecionada.
- Botao "Analisar site".
- Campos editaveis: tom, publico, produtos, diferenciais, CTA, termos proibidos, preferencias, paletas, logos, regras "fazer/evitar", referencias visuais.

Estados:

- `draft`: criado manualmente, incompleto.
- `analyzing`: job em andamento.
- `needs_review`: IA terminou, usuario precisa aprovar.
- `active`: pronto para geracao.
- `failed`: falha na analise.

Boas praticas:

- Autosave com debounce.
- Historico de snapshots.
- Botao "restaurar versao".
- Auditoria de quem alterou campos criticos.

### 1.4 Multi-brand real

Objetivo: atender agencias sem gambiarra.

Entregas:

- Uma organizacao pode ter varias marcas.
- Cada post, carrossel, ideia e asset deve poder referenciar `brandProfileId`.
- O seletor de organizacao continua existindo; dentro da organizacao entra seletor de marca.
- Permissoes futuras podem limitar membros por marca.

Regras:

- Excluir marca deve ser soft delete.
- Nao remover historico de carrosseis associados.
- Uma marca ativa deve ser obrigatoria para gerar carrossel com Brand DNA.

## Fase 2 - MVP competitivo: URL -> ideias -> swipe -> carrossel

Objetivo: entregar uma experiencia equivalente ao Holo, mas focada em carrosseis.

### 2.1 Onboarding "site para primeiro carrossel"

Fluxo:

1. Usuario cria conta.
2. Informa nome da marca e site.
3. Sistema roda Brand DNA.
4. Tela mostra resumo e identidade visual inferidos.
5. Usuario ajusta e aprova.
6. Sistema gera 10 ideias de carrossel.
7. Usuario aprova uma no swipe.
8. Sistema gera o primeiro carrossel completo.
9. Usuario salva no Media ou agenda em `/launches`.

Entregas:

- Wizard de onboarding.
- Indicador de progresso por etapa.
- Fallback manual se site falhar.
- Primeiro carrossel gerado sem exigir conhecimento tecnico.

Boas praticas:

- Cada etapa deve ser recuperavel se o usuario fechar a aba.
- Jobs devem ser idempotentes.
- Eventos analiticos por etapa.

### 2.2 Content Swipe

Superficie:

- Nova rota sugerida: `/ideas` ou `/content-swipe`.
- Cards de ideias com titulo, hook, objetivo, angulo, template sugerido, canal e score.
- Acoes: aprovar, descartar, salvar para depois, gerar variações, criar carrossel.

Estados de ideia:

- `new`
- `approved`
- `rejected`
- `saved`
- `used`
- `archived`

Entregas:

- Endpoint para listar ideias por marca.
- Endpoint para gerar lote de ideias.
- Endpoint para atualizar estado da ideia.
- Persistencia de feedback para treinar recomendacao interna.
- Atalhos de teclado no desktop e gestos no mobile.

Boas praticas:

- Nao gerar infinitamente sem limite de custo.
- Deduplicar ideias por titulo, angulo e embedding/hash semantico.
- Guardar motivo de rejeicao quando possivel.
- Nao bloquear o usuario enquanto novas ideias carregam.

### 2.3 Geracao de carrossel a partir de ideia aprovada

Fluxo:

1. Ideia aprovada.
2. Usuario escolhe template, objetivo, canal, idioma e quantidade de slides.
3. Backend cria CarouselProject.
4. IA gera plano textual.
5. Review editorial automatico valida clareza, tamanho, claims e CTA.
6. Sistema gera imagens dos slides em job persistente.
7. Usuario edita, salva ou agenda.

Entregas:

- `CarouselProject` persistente.
- Vinculo com `ContentIdea`.
- Reaproveitamento do studio atual.
- Exportacao para Media.
- Botao "Criar post/agendar" direto para `/launches`.

Boas praticas:

- Separar plano textual de renderizacao visual.
- Permitir regenerar apenas um slide.
- Guardar prompts por slide.
- Evitar que alteracoes no Brand DNA quebrem projetos antigos: usar snapshot versionado.

### 2.4 Jobs persistentes para geracao

Problema atual:

- Jobs em memoria sao bons para prototipo, mas somem em restart, nao escalam horizontalmente e dificultam observabilidade.

Entregas:

- Criar `GenerationJob`.
- Mover geracao longa para Temporal no `apps/orchestrator`.
- Persistir estado por slide.
- Suportar retry por slide.
- Suportar cancelamento.
- Notificar usuario quando o lote estiver pronto.

Estados:

- `queued`
- `running`
- `waiting_provider`
- `completed`
- `failed`
- `cancelled`
- `partial`

Boas praticas:

- Idempotency key por job.
- Backoff exponencial em falhas transientes.
- Circuit breaker por provider de IA.
- Limite de concorrencia por organizacao.
- Dead-letter para jobs que falham repetidamente.

## Fase 3 - Qualidade superior de carrossel

Objetivo: vencer o Holo onde ele e generico: carrosseis visualmente bons, editaveis e prontos para publicar.

### 3.1 Template engine por nicho

Categorias iniciais:

- Educacional
- Storytelling
- Lista
- Mitos e verdades
- Antes/depois
- Case
- Oferta
- Autoridade
- FAQ
- Comparacao
- Depoimento/prova
- Estatisticas
- Problem-solution
- Us vs Them
- Best-sellers
- Negative hook

Entregas:

- Expandir `carouselTemplates`.
- Adicionar recomendador de templates baseado em Brand DNA, nicho, objetivo e plataforma.
- Cada template deve ter:
  - Estrutura narrativa.
  - Regras de slide.
  - Densidade de texto.
  - Direcao visual.
  - CTA recomendado.
  - Checks editoriais.

Boas praticas:

- Tratar templates como dados versionados, nao hardcode eterno no componente.
- Permitir feature flags para testar templates.
- Medir performance por template.

### 3.2 Sistema de qualidade editorial

Checks automaticos:

- Hook forte e claro.
- Uma ideia por slide.
- Texto legivel em mobile.
- CTA coerente.
- Sem promessas absolutas.
- Sem claims sensiveis sem suporte.
- Tamanho adequado por slide.
- Coerencia com tom de voz.
- Termos proibidos da marca.
- Idioma correto.

Entregas:

- Score editorial.
- Botao "corrigir automaticamente".
- Lista de issues por slide.
- Bloqueios opcionais antes de publicar se score for baixo.

Boas praticas:

- Separar warnings de blockers.
- Guardar review como artefato.
- Nao sobrescrever edicoes do usuario sem diff/confirmacao.

### 3.3 Editor visual mais forte

Entregas:

- Edicao por slide com preview rapido.
- Regenerar imagem de slide unico.
- Alterar headline, corpo, CTA e alt text.
- Aplicar paleta/logo da marca.
- Reordenar slides.
- Duplicar/remover slide.
- Exportar PNG/PDF.
- Criar post com carrossel.

Boas praticas:

- Modelo de dados imutavel por revisao.
- Undo/redo no frontend.
- Validar tamanho e contraste.
- Preservar accessibility alt text.
- Testar responsividade mobile/desktop.

### 3.4 Biblioteca de referencias visuais

Entregas:

- Referencias globais curadas.
- Referencias da marca.
- Referencias aprovadas pelo usuario.
- Tags por nicho, estilo, campanha e objetivo.
- Uso controlado nas geracoes.

Boas praticas:

- Evitar copiar imagem de terceiros como output final.
- Usar referencias como direcao visual, nao como clone.
- Registrar fonte/licenca quando aplicavel.

## Fase 4 - Geracao automatica e calendario inteligente

Objetivo: entregar o "works while you sleep" do Holo com a vantagem do calendario nativo do ContentFlow.

### 4.1 Content Calendar automatico

Fluxo:

1. Usuario escolhe marca.
2. Define frequencia: ex. 3 carrosseis por semana.
3. Define canais e horarios.
4. Define pilares e objetivos.
5. Sistema gera ideias para 30/60/90 dias.
6. Usuario aprova lote.
7. Sistema gera carrosseis em background.
8. Carrosseis entram como drafts no calendario.

Entregas:

- Configuracao de plano editorial por marca.
- Gerador de calendario.
- Estados de aprovacao por item.
- Envio para `/launches`.

Boas praticas:

- Comecar com drafts, nao publicacao automatica.
- Evitar repeticao por embedding/hash.
- Respeitar datas especiais e timezone.
- Permitir blackout dates.

### 4.2 Auto-generation recorrente

Entregas:

- Worker Temporal recorrente.
- Politica de limite de custo.
- Janela de geracao noturna configuravel.
- Notificacao "novos carrosseis prontos".
- Regras por plano.

Boas praticas:

- Requer opt-in explicito.
- Mostrar custo estimado antes de ativar.
- Pausar automaticamente em falhas repetidas.
- Criar logs claros para suporte.

### 4.3 Workflow de aprovacao

Aproveitar vantagem atual do ContentFlow:

- Comentarios.
- Times.
- Roles.
- Drafts.
- Aprovar antes de publicar.

Entregas:

- Status de aprovacao em CarouselProject/Post.
- Comentarios por slide ou projeto.
- Notificacao para aprovadores.
- Bloqueio de publicacao se workflow exigir aprovacao.

Boas praticas:

- Nao duplicar sistema de comentarios se o Post ja oferece base reaproveitavel.
- Definir ownership claro: CarouselProject antes de virar Post; Post depois de agendado.

## Fase 5 - Analytics e loop de melhoria

Objetivo: usar performance real para melhorar proximas geracoes.

### 5.1 Metricas normalizadas de carrossel

Entregas:

- Associar posts publicados a CarouselProject.
- Coletar metricas por plataforma.
- Normalizar metricas em score comparavel.
- Criar painel por marca/template/campanha.

Metricas prioritarias:

- Saves
- Shares
- Comments
- Engagement rate
- Clicks
- Reach
- Impressions
- Follower growth quando disponivel

Boas praticas:

- Guardar metricas brutas e normalizadas.
- Separar limitacoes por plataforma.
- Nao comparar plataformas sem normalizacao.

### 5.2 Recomendacoes baseadas em performance

Entregas:

- "Mais carrosseis como este".
- "Gerar variações do melhor hook".
- "Templates que mais funcionam para esta marca".
- "Temas saturados/repetidos".
- "Melhores horarios e canais".

Boas praticas:

- Comecar com heuristicas simples e explicaveis.
- So usar dados da propria organizacao/marca.
- Permitir opt-in futuro para benchmarks agregados e anonimizados.

### 5.3 Biblioteca de aprendizados da marca

Entregas:

- Registrar hooks vencedores.
- Registrar CTAs vencedores.
- Registrar temas com melhor performance.
- Registrar style rules aprendidas.
- Permitir aprovar aprendizado antes de incorporar ao Brand DNA.

Boas praticas:

- Nao atualizar Brand DNA automaticamente sem revisao.
- Versionar aprendizados.
- Permitir desfazer.

## Fase 6 - Expansao de formatos

Objetivo: copiar os formatos do Holo apenas depois que carrossel estiver forte.

### 6.1 Posts sociais

Entregas:

- Gerar post unico por plataforma.
- Adaptar tom, tamanho e hashtags.
- Criar variações por canal.
- Reaproveitar Brand DNA e analytics.

### 6.2 Ads estaticos e carrossel de ads

Entregas:

- Templates de ad: problema/solucao, prova, oferta, comparacao, testimonial.
- Exportacoes por formato.
- Preparacao para Meta/LinkedIn.

Boas praticas:

- Diferenciar organic content de paid creative.
- Incluir warnings para claims e politicas de anuncios.

### 6.3 Emails/newsletters

Entregas:

- Newsletter baseada em carrossel.
- Sequencia de boas-vindas.
- Campanha promocional.
- Export HTML.

### 6.4 Videos curtos

Entregas:

- Transformar carrossel em roteiro de Reels/TikTok.
- Gerar slides animados ou video simples.
- Integrar provider de video ja existente quando aplicavel.

Boas praticas:

- Tratar video como fase posterior por custo, tempo e maturidade.
- Comecar com motion simples antes de UGC/influencer synthetic.

## Fase 7 - Growth, pricing e comercial

Objetivo: capturar a estrategia comercial do Holo sem sacrificar produto.

### 7.1 Landing page orientada a carrosseis

Entregas:

- Hero com demo real do gerador de carrossel.
- Headline focada: "Gere carrosseis prontos para postar em minutos".
- Secao "URL -> Brand DNA -> carrossel".
- Comparacao ContentFlow vs Canva vs ChatGPT vs Holo.
- Exemplos reais de carrosseis.
- Mural de depoimentos.
- FAQ.
- CTA para criar primeiro carrossel.

Boas praticas:

- Mostrar produto real, nao mock abstrato.
- Usar prova social somente quando verdadeira.
- Evitar claims sem base.

### 7.2 Pricing

Hipotese inicial:

- Planos com mesmo core feature-set e limites por volume.
- Garantia de 14 dias pode substituir free trial se custo de IA for alto.
- Limites por:
  - marcas ativas
  - carrosseis gerados por mes
  - jobs simultaneos
  - membros
  - canais conectados
  - analytics historico

Boas praticas:

- Nao prometer "unlimited" antes de ter controle de custo robusto.
- Mostrar custo/limite de IA com clareza.
- Criar protecao contra abuso.

### 7.3 Afiliados

Entregas:

- Programa de afiliados depois de onboarding e ativacao estarem bons.
- Tracking por link/cupom.
- Materiais para creators.
- Politica contra brand bidding.

Boas praticas:

- So escalar afiliados depois de medir CAC, refund, churn e margem.
- Evitar comissao agressiva antes de margem clara.

### 7.4 SEO programatico

Clusters:

- "gerador de carrossel"
- "como fazer carrossel no Instagram"
- "carrossel para [nicho]"
- "ideias de carrossel para [profissao]"
- "ContentFlow vs Canva"
- "alternativas ao Canva para carrossel"
- "carrossel LinkedIn"

Boas praticas:

- Criar paginas com exemplos reais.
- Evitar conteudo programatico raso.
- Usar templates e outputs do proprio produto como prova.

## Fase 8 - Plataforma e ecossistema

Objetivo: transformar a feature em plataforma defensavel.

### 8.1 API publica de carrosseis

Entregas:

- Endpoint para criar BrandProfile.
- Endpoint para iniciar Brand DNA extraction.
- Endpoint para gerar ideias.
- Endpoint para criar CarouselProject.
- Endpoint para exportar assets.
- Webhooks de job completed/failed.

Boas praticas:

- OAuth/API keys ja existentes devem ser reaproveitados.
- Idempotency keys obrigatorias em criacao de jobs.
- Rate limits por org e por app.
- Documentacao OpenAPI.

### 8.2 Marketplace de templates

Entregas:

- Templates oficiais.
- Templates por nicho.
- Templates de creators/agencias.
- Instalacao por organizacao.
- Review e curadoria.

Boas praticas:

- Templates devem ser dados versionados.
- Separar template de prompt secreto.
- Medir performance e abuso.

### 8.3 Apps e integracoes

Entregas:

- Integração Make/Zapier/n8n para gerar carrosseis.
- Importacao de artigo/link para carrossel.
- Export para Canva/Figma apenas se fizer sentido comercial.

## 6. Plano operacional detalhado por fase

Esta secao transforma o plano em um guia de execucao. A leitura correta de cada subfase e:

- Fazer: trabalho concreto que precisa ser implementado, pesquisado ou decidido.
- Entregaveis: artefatos, telas, endpoints, modelos, jobs, metricas ou documentos que devem existir ao final.
- Considerar feito quando: criterio objetivo para encerrar a subfase sem deixar pontas soltas.
- Validacao minima: testes, checagens manuais ou evidencias que precisam provar que a entrega funciona.
- Nao aceitar se: sinais de que a subfase parece pronta, mas ainda nao esta madura para seguir.

### 6.0 Definition of Done global

Toda entrega deste roadmap deve obedecer a estes criterios antes de ser considerada pronta:

- Escopo implementado sem depender de estado temporario em memoria quando a feature precisa sobreviver a restart, deploy ou escala horizontal.
- Dados sempre filtrados por `organizationId` e, quando aplicavel, `brandProfileId`.
- Endpoints autenticados com validacao de DTO/schema, permissoes e tratamento de erro consistente.
- UI com estados de loading, vazio, sucesso, erro, retry e permissao negada.
- Jobs longos com persistencia de status, retry, cancelamento ou forma clara de recuperacao.
- Custos de IA registrados por job, modelo e organizacao.
- Logs sem secrets, tokens, prompts sensiveis completos ou dados desnecessarios.
- Testes cobrindo o caminho feliz e pelo menos os principais erros esperados.
- Build e testes principais passando.
- Rollback ou caminho de recuperacao definido para migrations, jobs e dados de marca.
- Documentacao atualizada no proprio plano ou em ADRs complementares.

### 6.1 Fase 0 - Preparacao, produto e contratos

#### 6.1.1 Auditoria tecnica do fluxo atual

Fazer:

- Percorrer a tela `/ai-generate-images` do frontend e listar todas as chamadas API que ela faz.
- Mapear cada endpoint para controller, service, DTO, modelo Prisma ou storage usado.
- Documentar como um carrossel nasce hoje: formulario, prompt, plano, imagem, salvamento em Media e possivel uso em `/launches`.
- Mapear quais partes ja sao persistentes e quais ainda vivem em memoria.
- Identificar onde CompanyProfile e lido, salvo, editado e convertido em prompt.
- Mapear dependencias de env vars de IA, storage e billing.

Entregaveis:

- Documento curto de arquitetura atual com fluxo ponta a ponta.
- Lista de endpoints atuais com payload de entrada, saida, erros e dono tecnico.
- Lista de riscos atuais: jobs em memoria, JSON em `Organization.description`, ausencia de dedupe, ausencia de status persistente, limites de custo.
- Diagrama simples do fluxo atual.

Considerar feito quando:

- Qualquer pessoa do time consegue explicar onde mexer para alterar Brand Kit, ideias, plano, imagens e salvamento.
- Nao existem "caixas pretas" no fluxo de carrossel atual.
- Cada endpoint usado pela UI tem payload e comportamento documentados.

Validacao minima:

- Rodar a aplicacao localmente ou revisar chamadas reais da UI.
- Conferir controllers e services correspondentes.
- Conferir schema Prisma e repositories envolvidos.

Nao aceitar se:

- O documento so repetir o README sem detalhar fluxo real.
- Nao houver clareza sobre onde os dados sao persistidos.
- Nao houver lista explicita de riscos tecnicos.

#### 6.1.2 Definicao de metricas de sucesso

Fazer:

- Definir eventos de produto para onboarding, Brand DNA, swipe, geracao, edicao, salvamento e agendamento.
- Definir metricas de custo e performance para IA.
- Definir funil principal: visita/cadastro -> URL analisada -> Brand DNA aprovado -> ideia aprovada -> carrossel gerado -> carrossel salvo -> post agendado.
- Definir paineis minimos para operador e produto.

Entregaveis:

- Especificacao de eventos com nome, propriedades obrigatorias e origem.
- Lista de KPIs de ativacao, qualidade, custo e retencao.
- Plano de dashboard inicial.

Considerar feito quando:

- Cada fase critica tem pelo menos um evento mensuravel.
- O time consegue responder quanto custa gerar um carrossel e onde usuarios abandonam o fluxo.
- As propriedades incluem `organizationId`, `brandProfileId`, `jobId`, `templateId`, `provider`, `model` e status quando aplicavel.

Validacao minima:

- Eventos testados em ambiente local/staging.
- Pelo menos um dashboard ou query documentada para acompanhar ativacao e custo.

Nao aceitar se:

- As metricas forem somente vanity metrics.
- Nao houver medicao de custo.
- Nao houver evento de falha ou abandono.

#### 6.1.3 Contratos de IA

Fazer:

- Criar schemas versionados para respostas de IA.
- Definir prompts com versao, objetivo, inputs aceitos e formato de saida.
- Implementar validacao server-side para toda resposta antes de salvar ou mostrar ao usuario.
- Criar fallback para resposta invalida: retry com prompt de correcao, erro amigavel ou resultado parcial.

Entregaveis:

- `BrandDNAExtractionSchema`.
- `CarouselIdeaSchema`.
- `CarouselPlanSchema`.
- `EditorialReviewSchema`.
- `CaptionPackageSchema`.
- `TemplateRecommendationSchema`.
- Registro de `promptVersion`, `schemaVersion`, `model`, `provider`, `usage` e custo.

Considerar feito quando:

- Nenhuma resposta de IA entra no banco sem validacao.
- Cada payload rejeitado gera erro compreensivel e log tecnico suficiente.
- E possivel comparar performance entre versoes de prompt.

Validacao minima:

- Testes unitarios com JSON valido, JSON incompleto e JSON malformado.
- Testes com resposta contendo texto extra antes/depois do JSON.
- Testes com campos muito longos e conteudo vazio.

Nao aceitar se:

- O backend apenas fizer `JSON.parse` sem schema.
- O frontend precisar adivinhar formato de resposta.
- Nao houver versao de prompt.

### 6.2 Fase 1 - Fundacao escalavel de Brand DNA

#### 6.2.1 Modelagem de dados

Fazer:

- Decidir se o MVP comeca com adapter sobre CompanyProfile ou com novas tabelas Prisma.
- Se usar adapter, criar uma interface de dominio que esconda `Organization.description` do resto do codigo.
- Se criar tabelas novas, implementar migrations para BrandProfile, BrandDnaSnapshot, BrandAsset e relacoes basicas.
- Definir indices para leitura por organizacao, marca, status e data.
- Definir soft delete e historico de snapshots.

Entregaveis:

- Modelo de dados final aprovado.
- Migration Prisma.
- Repository/service para BrandProfile.
- Adapter de compatibilidade com CompanyProfile legado.
- Script ou rotina de migracao se necessario.

Considerar feito quando:

- Uma organizacao consegue ter varias marcas sem sobrescrever dados.
- Uma marca consegue ter multiplos snapshots de DNA.
- O sistema sabe qual marca esta selecionada.
- Dados antigos de CompanyProfile continuam legiveis.

Validacao minima:

- Teste criando, editando, selecionando e removendo marca.
- Teste com organizacao sem perfil legado.
- Teste com organizacao que ja possui CompanyProfile salvo.
- Teste de isolamento entre organizacoes.

Nao aceitar se:

- Novas features continuarem acessando `Organization.description` diretamente.
- Excluir uma marca apagar historico de posts/carrosseis.
- Nao houver indice por `organizationId`.

#### 6.2.2 Pipeline de extracao por URL

Fazer:

- Normalizar e validar URL.
- Bloquear SSRF, IP privado, localhost, protocolos inseguros e redirects suspeitos.
- Extrair texto principal do site com limite de tamanho.
- Extrair metadados: title, description, Open Graph, favicon, imagens principais e possiveis logos.
- Opcionalmente capturar screenshot para analise visual.
- Enviar conteudo sanitizado para IA gerar Brand DNA estruturado.
- Separar inferencias textuais, visuais e comerciais.
- Salvar fontes e confidence score por bloco.

Entregaveis:

- Endpoint para iniciar analise de URL.
- Job persistente de extracao.
- Resultado estruturado de Brand DNA.
- Lista de assets candidatos.
- Tela ou payload de revisao humana.

Considerar feito quando:

- Usuario informa uma URL e recebe um Brand DNA revisavel.
- Falhas de extracao nao quebram o onboarding; existe caminho manual.
- O sistema mostra quais informacoes foram inferidas e quais precisam revisao.
- Assets extraidos podem ser aprovados ou descartados.

Validacao minima:

- Testar com site simples, site pesado, URL invalida, URL com redirect, site sem metadados e site que bloqueia crawler.
- Testar bloqueio de `localhost`, `127.0.0.1`, redes privadas e protocolos nao permitidos.
- Testar timeout e limite de tamanho.

Nao aceitar se:

- A IA receber HTML bruto gigante sem sanitizacao.
- O usuario nao puder corrigir inferencias.
- Falha de screenshot impedir extracao textual.

#### 6.2.3 Brand DNA editor

Fazer:

- Criar tela de edicao da marca com campos organizados por negocio, voz, audiencia, oferta, visual e restricoes.
- Permitir aprovar/rejeitar assets sugeridos.
- Permitir criar paletas, fontes, logos, regras de estilo e termos proibidos.
- Mostrar status da marca e ultima analise.
- Salvar alteracoes de forma segura e recuperavel.

Entregaveis:

- Tela `/brands` ou secao equivalente em Settings.
- Formulario de Brand DNA editavel.
- Lista de snapshots ou pelo menos historico basico.
- Estados `draft`, `analyzing`, `needs_review`, `active`, `failed`.

Considerar feito quando:

- Usuario consegue criar uma marca manualmente.
- Usuario consegue analisar site, revisar resultado e ativar marca.
- Usuario consegue editar dados depois da analise.
- Gerador de carrossel usa a marca ativa.

Validacao minima:

- Teste mobile e desktop.
- Teste de autosave ou salvamento explicito.
- Teste de erro de permissao para usuario sem acesso admin quando aplicavel.

Nao aceitar se:

- A tela salvar campos silenciosamente sem feedback.
- O usuario nao souber se a marca esta pronta para gerar.
- A edicao quebrar compatibilidade com o studio atual.

#### 6.2.4 Multi-brand real

Fazer:

- Criar seletor de marca dentro da organizacao.
- Associar ideias, carrosseis, assets e jobs a uma marca.
- Garantir que trocar de marca muda contexto do gerador, swipe e calendario.
- Definir limites por plano para quantidade de marcas.

Entregaveis:

- Multi-brand funcional por organizacao.
- `brandProfileId` nos principais fluxos novos.
- UI para criar, selecionar, renomear, arquivar e excluir marca.
- Regras de plano e permissao.

Considerar feito quando:

- Agencia consegue manter duas marcas com Brand DNA, assets, ideias e carrosseis separados.
- Gerar conteudo para uma marca nao usa dados de outra.
- Marca arquivada nao aparece por padrao, mas historico continua acessivel.

Validacao minima:

- Teste criando duas marcas e gerando ideias diferentes.
- Teste de isolamento em endpoints.
- Teste de limite de marcas por plano.

Nao aceitar se:

- `brandProfileId` for opcional em fluxos onde deveria ser obrigatorio.
- A troca de marca for apenas visual e nao alterar contexto real.
- Excluir marca remover midias/posts antigos.

### 6.3 Fase 2 - MVP competitivo: URL -> ideias -> swipe -> carrossel

#### 6.3.1 Onboarding "site para primeiro carrossel"

Fazer:

- Criar wizard de onboarding com etapas recuperaveis.
- Pedir nome da marca e URL.
- Rodar Brand DNA extraction.
- Mostrar resumo, paleta, voz e publico para revisao.
- Gerar ideias iniciais.
- Levar usuario para aprovar uma ideia e gerar o primeiro carrossel.

Entregaveis:

- Fluxo guiado para usuario novo.
- Persistencia do progresso do onboarding.
- Fallback manual se URL falhar.
- CTA final para salvar, editar ou agendar primeiro carrossel.

Considerar feito quando:

- Um usuario novo consegue sair de uma URL para um carrossel salvo sem precisar configurar tudo manualmente.
- Se o usuario fechar a aba, consegue continuar de onde parou.
- O onboarding nao exige canal social conectado para gerar o primeiro carrossel, mas orienta o agendamento depois.

Validacao minima:

- E2E com cadastro novo.
- E2E com falha de URL.
- E2E com usuario retornando depois de abandonar etapa intermediaria.

Nao aceitar se:

- O primeiro valor entregue for apenas uma tela de configuracao.
- A falha de IA obrigar o usuario a recomecar.
- O usuario nao entender qual e o proximo passo.

#### 6.3.2 Content Swipe

Fazer:

- Criar experiencia de swipe para ideias de carrossel.
- Gerar lote inicial de ideias por marca.
- Permitir aprovar, descartar, salvar para depois, regenerar variações e criar carrossel.
- Persistir estado e feedback de cada ideia.
- Deduplicar ideias repetidas.

Entregaveis:

- Rota `/content-swipe` ou `/ideas`.
- Endpoints de listar, gerar e atualizar estado de ideias.
- UI mobile com gesto e desktop com botoes/atalhos.
- Estados vazios e loading infinito controlado.

Considerar feito quando:

- Ideias aprovadas aparecem como prontas para gerar carrossel.
- Ideias recusadas nao voltam no feed normal.
- O sistema consegue explicar por que uma ideia foi sugerida: objetivo, angulo, template e relacao com Brand DNA.

Validacao minima:

- Teste de aprovar/rejeitar/salvar.
- Teste de feed sem ideias.
- Teste de geracao de novo lote.
- Teste de dedupe basico.

Nao aceitar se:

- Swipe for apenas animacao visual sem persistencia.
- Ideias nao tiverem vinculo com marca.
- Nao houver controle de custo para geracao infinita.

#### 6.3.3 Geracao de carrossel a partir de ideia aprovada

Fazer:

- Criar CarouselProject a partir de uma ContentIdea aprovada.
- Passar Brand DNA, template, objetivo, idioma e plataforma para o gerador.
- Gerar plano textual primeiro.
- Rodar review editorial antes ou depois da geracao visual.
- Gerar imagens por slide.
- Permitir edicao e regeneracao parcial.
- Salvar resultado na biblioteca de midia.

Entregaveis:

- Modelo ou payload persistente de CarouselProject.
- Vinculo `contentIdeaId`.
- Reuso do AI carousel studio.
- Botao "Salvar no Media".
- Botao "Criar draft/agendar".

Considerar feito quando:

- Uma ideia aprovada vira carrossel completo com slides, caption, hashtags, alt text e imagens.
- Usuario consegue editar antes de salvar.
- O projeto pode ser reaberto depois.
- O carrossel salvo aparece em `/media` com metadata.

Validacao minima:

- Teste gerando plano.
- Teste gerando imagens.
- Teste salvando em Media.
- Teste reabrindo projeto salvo.
- Teste regenerando um unico slide.

Nao aceitar se:

- O projeto existir apenas no estado do React.
- Perder edicoes ao atualizar pagina.
- Nao houver vinculo com Brand DNA usado na geracao.

#### 6.3.4 Jobs persistentes para geracao

Fazer:

- Criar persistencia para jobs de texto, imagem e lote.
- Mover tarefas demoradas para Temporal ou fila equivalente.
- Salvar status geral e por slide.
- Permitir retry, cancelamento e resultado parcial.
- Notificar usuario quando terminar.

Entregaveis:

- Modelo `GenerationJob`.
- Workflow no orchestrator.
- Endpoint para consultar status.
- UI de progresso.
- Logs e historico de custo por job.

Considerar feito quando:

- Restart do backend nao perde job em andamento.
- Usuario pode sair da pagina e voltar para ver status.
- Falha em um slide nao inutiliza todo o carrossel sem opcao de retry.
- Operador consegue diagnosticar falhas.

Validacao minima:

- Teste simulando falha de provider.
- Teste de retry.
- Teste de cancelamento.
- Teste de restart ou troca de processo quando possivel.

Nao aceitar se:

- Jobs continuarem somente em `Map` em memoria.
- Nao houver status persistente.
- Nao houver limite de concorrencia.

### 6.4 Fase 3 - Qualidade superior de carrossel

#### 6.4.1 Template engine por nicho

Fazer:

- Tirar templates principais de hardcode fragil e transformar em dados versionados.
- Expandir categorias de carrossel.
- Definir estrutura narrativa por template.
- Criar recomendador baseado em nicho, objetivo, plataforma e Brand DNA.
- Medir uso e performance por template.

Entregaveis:

- Catalogo versionado de templates.
- Campos: nome, objetivo, nichos, estrutura de slides, prompt, regras editoriais, visual style, limites.
- Endpoint ou config carregavel pelo frontend.
- TemplateRecommendation integrado ao gerador.

Considerar feito quando:

- O sistema recomenda templates coerentes com a marca e objetivo.
- Adicionar novo template nao exige mexer em varios componentes.
- Performance por template pode ser medida.

Validacao minima:

- Testes de recomendacao para nichos diferentes.
- Testes de schema dos templates.
- Teste criando carrossel com pelo menos 5 templates diferentes.

Nao aceitar se:

- Templates forem apenas labels sem regra narrativa.
- Nao houver versao.
- Nao houver medicao de uso.

#### 6.4.2 Sistema de qualidade editorial

Fazer:

- Criar score editorial para o plano de carrossel.
- Avaliar hook, clareza, tamanho, CTA, promessas, tom de voz, termos proibidos e idioma.
- Separar problemas bloqueantes de sugestoes.
- Permitir correcao automatica com revisao humana.

Entregaveis:

- EditorialReview persistente.
- Score e lista de issues por slide.
- Botao "Corrigir slides".
- Regras por template e plataforma.

Considerar feito quando:

- Todo carrossel gerado recebe score antes de ser considerado pronto.
- Usuario entende o que precisa ajustar.
- Termos proibidos da marca sao respeitados.
- Claims arriscados sao marcados.

Validacao minima:

- Testes com termos proibidos.
- Testes com texto longo demais.
- Testes com idioma incorreto.
- Testes com promessas absolutas.

Nao aceitar se:

- Review for apenas texto generico da IA.
- Correcao sobrescrever edicoes sem confirmacao.
- Score nao influenciar nenhuma decisao de UI.

#### 6.4.3 Editor visual mais forte

Fazer:

- Permitir editar slide por slide.
- Permitir reordenar, duplicar, remover e regenerar slide.
- Aplicar paleta, logo e regras visuais da marca.
- Exportar PNG/PDF.
- Preparar envio para calendario.

Entregaveis:

- Editor com preview responsivo.
- Controles de copy, imagem, CTA, alt text e estilo.
- Undo/redo ou historico minimo.
- Export completo.

Considerar feito quando:

- Usuario consegue ajustar carrossel sem sair do fluxo.
- Alteracoes persistem.
- Export gera arquivos corretos.
- O post criado a partir do carrossel usa as imagens finais.

Validacao minima:

- E2E editando e salvando.
- Teste mobile e desktop.
- Teste de export PNG/PDF.
- Teste de acessibilidade basica e contraste.

Nao aceitar se:

- Editar um slide exigir regenerar tudo.
- Preview diferir muito do export final.
- Texto quebrar layout em mobile.

#### 6.4.4 Biblioteca de referencias visuais

Fazer:

- Organizar referencias por marca, global, upload e projeto.
- Permitir favoritar, aprovar e categorizar referencias.
- Usar referencias como direcao visual em prompts, sem copiar assets indevidos.
- Guardar fonte e metadados.

Entregaveis:

- Biblioteca de referencias por marca.
- Seletor de referencias no gerador.
- Metadata de origem, categoria e aprovacao.
- Regras de uso em prompt.

Considerar feito quando:

- Usuario consegue escolher referencias aprovadas para influenciar um carrossel.
- A geracao usa referencias sem misturar marcas.
- Referencias podem ser removidas ou desativadas.

Validacao minima:

- Teste selecionando referencias.
- Teste com marca A e marca B.
- Teste removendo referencia usada anteriormente.

Nao aceitar se:

- Referencias globais forem usadas sem consentimento no lugar de assets da marca.
- Nao houver fonte/categoria.
- A UI nao diferenciar referencia de output final.

### 6.5 Fase 4 - Geracao automatica e calendario inteligente

#### 6.5.1 Content Calendar automatico

Fazer:

- Criar configuracao editorial por marca.
- Definir frequencia, canais, objetivos, pilares, horarios, idiomas e restricoes.
- Gerar ideias para 30/60/90 dias.
- Criar drafts revisaveis no calendario.
- Evitar repeticao de tema e formato.

Entregaveis:

- Configuracao de calendario por marca.
- Geracao de plano editorial.
- Drafts no calendario.
- Revisao em lote.

Considerar feito quando:

- Usuario consegue pedir um mes de ideias/carrosseis e revisar antes de publicar.
- Os itens aparecem no calendario com status claro.
- O sistema respeita horarios, timezone e canais escolhidos.

Validacao minima:

- Teste gerando 30 dias.
- Teste com timezone diferente.
- Teste com dias bloqueados.
- Teste de aprovacao/rejeicao em lote.

Nao aceitar se:

- Itens forem publicados automaticamente por padrao.
- Calendario gerar conteudo duplicado demais.
- Nao houver controle de custo antes de gerar lote.

#### 6.5.2 Auto-generation recorrente

Fazer:

- Criar rotina Temporal recorrente por marca.
- Permitir opt-in explicito.
- Definir limites de custo e volume.
- Rodar em janela configuravel.
- Notificar resultados e falhas.

Entregaveis:

- Configuracao de auto-generation.
- Workflow recorrente.
- Historico de execucoes.
- Pausar/retomar automacao.

Considerar feito quando:

- Sistema gera drafts automaticamente dentro das regras configuradas.
- Usuario consegue pausar.
- Falhas repetidas pausam ou alertam.
- Custo estimado e real ficam visiveis.

Validacao minima:

- Teste de execucao recorrente.
- Teste de limite mensal.
- Teste de pausa.
- Teste de falha repetida.

Nao aceitar se:

- Automacao rodar sem opt-in.
- Nao houver limite de custo.
- Nao houver historico de execucao.

#### 6.5.3 Workflow de aprovacao

Fazer:

- Definir estados de aprovacao para CarouselProject e Post.
- Integrar comentarios e roles existentes.
- Permitir solicitar aprovacao para membros.
- Bloquear publicacao quando a organizacao exigir aprovacao.

Entregaveis:

- Status de aprovacao.
- Comentarios por projeto ou slide.
- Notificacoes para aprovadores.
- Regras de bloqueio antes de publicar.

Considerar feito quando:

- Time consegue revisar e aprovar carrossel antes de agendar/publicar.
- Usuario sem permissao nao consegue aprovar quando nao deve.
- Historico de aprovacao fica auditavel.

Validacao minima:

- Teste com usuario admin e usuario normal.
- Teste aprovando/rejeitando.
- Teste tentando publicar sem aprovacao.

Nao aceitar se:

- Workflow existir so visualmente.
- Aprovacao nao for validada no backend.
- Comentarios se perderem ao converter CarouselProject em Post.

### 6.6 Fase 5 - Analytics e loop de melhoria

#### 6.6.1 Metricas normalizadas de carrossel

Fazer:

- Associar Post publicado ao CarouselProject.
- Coletar metricas por plataforma.
- Normalizar metricas em score comparavel.
- Mostrar performance por marca, template, tema e canal.

Entregaveis:

- Modelo ou view de CarouselPerformance.
- Jobs de coleta/refresh.
- Dashboard de carrossel.
- Export ou API interna para recomendacoes.

Considerar feito quando:

- Um carrossel publicado mostra performance dentro do ContentFlow.
- E possivel ver quais templates e temas performam melhor.
- Dados brutos e normalizados ficam separados.

Validacao minima:

- Teste com metricas mockadas.
- Teste com plataforma sem determinada metrica.
- Teste de atualizacao periodica.

Nao aceitar se:

- Analytics misturar plataformas sem normalizacao.
- Nao houver vinculo com template/marca.
- Falha de uma plataforma quebrar o dashboard inteiro.

#### 6.6.2 Recomendacoes baseadas em performance

Fazer:

- Criar heuristicas iniciais de recomendacao.
- Sugerir variacoes de hooks vencedores.
- Sugerir templates e temas com melhor desempenho.
- Alertar sobre repeticao ou saturacao.

Entregaveis:

- Painel de recomendacoes.
- Endpoint de recomendacoes por marca.
- Explicacao simples do motivo de cada recomendacao.

Considerar feito quando:

- Usuario recebe recomendacoes acionaveis com base em dados reais da marca.
- Cada recomendacao tem justificativa.
- Usuario pode gerar ideia/carrossel a partir da recomendacao.

Validacao minima:

- Teste com marca sem dados suficientes.
- Teste com dados suficientes.
- Teste gerando carrossel a partir de recomendacao.

Nao aceitar se:

- Recomendacao for generica e igual para todas as marcas.
- Nao houver fallback para pouco dado.
- Recomendacao usar dados de outra organizacao sem opt-in explicito.

#### 6.6.3 Biblioteca de aprendizados da marca

Fazer:

- Registrar hooks, CTAs, temas e estruturas vencedoras.
- Permitir aprovar aprendizado antes de incorporar ao Brand DNA.
- Versionar aprendizados.
- Permitir desfazer.

Entregaveis:

- Lista de aprendizados por marca.
- Status `suggested`, `approved`, `rejected`, `applied`.
- Integracao com gerador.

Considerar feito quando:

- Aprendizados aprovados passam a influenciar novas geracoes.
- Usuario consegue ver e remover aprendizados.
- O sistema nao altera Brand DNA silenciosamente.

Validacao minima:

- Teste aprovando aprendizado.
- Teste rejeitando.
- Teste usando aprendizado em nova geracao.

Nao aceitar se:

- Aprendizados forem aplicados sem revisao.
- Nao houver historico.
- Nao houver explicacao do impacto.

### 6.7 Fase 6 - Expansao de formatos

#### 6.7.1 Posts sociais

Fazer:

- Usar Brand DNA para gerar posts de texto e imagem por plataforma.
- Adaptar tamanho, tom, hashtag e CTA por canal.
- Reaproveitar calendario e workflow de aprovacao.

Entregaveis:

- Gerador de post social.
- Variacoes por canal.
- Criacao de draft em `/launches`.

Considerar feito quando:

- Uma ideia ou carrossel pode virar post adaptado para Instagram, LinkedIn, TikTok ou X conforme canais suportados.
- O output respeita limite e convencao da plataforma.

Validacao minima:

- Teste por plataforma prioritaria.
- Teste com Brand DNA diferente.

Nao aceitar se:

- O mesmo texto for copiado para todos os canais sem adaptacao.

#### 6.7.2 Ads estaticos e carrossel de ads

Fazer:

- Criar templates de anuncios.
- Separar objetivos pagos de objetivos organicos.
- Adicionar checks de claims e politicas.

Entregaveis:

- Gerador de ad static/carousel.
- Templates de oferta, prova, comparacao e testimonial.
- Export por formato.

Considerar feito quando:

- Usuario consegue gerar criativo de anuncio alinhado a marca e objetivo.
- O sistema marca riscos de politica e claims sensiveis.

Validacao minima:

- Teste de cada template de ad.
- Teste com claim arriscado.

Nao aceitar se:

- Ads forem apenas carrosseis organicos renomeados.

#### 6.7.3 Emails/newsletters

Fazer:

- Transformar Brand DNA e conteudos aprovados em email.
- Gerar newsletter, boas-vindas e campanha promocional.
- Exportar HTML limpo.

Entregaveis:

- Gerador de email.
- Preview HTML.
- Export.

Considerar feito quando:

- Email gerado tem assunto, preheader, corpo, CTA e HTML exportavel.
- Usuario consegue editar antes de exportar.

Validacao minima:

- Teste de HTML.
- Teste de tamanho e links.

Nao aceitar se:

- Email depender de layout quebrado ou HTML nao portavel.

#### 6.7.4 Videos curtos

Fazer:

- Converter carrossel em roteiro curto.
- Gerar video simples a partir de slides ou provider de video.
- Comecar com formato controlado antes de UGC/influencer.

Entregaveis:

- Roteiro por cena.
- Export de video ou job de video.
- Reuso de assets do carrossel.

Considerar feito quando:

- Um carrossel aprovado pode virar video curto revisavel.
- O custo e tempo de geracao sao visiveis.

Validacao minima:

- Teste com carrossel de 5-8 slides.
- Teste de falha de provider.

Nao aceitar se:

- Video for caro e opaco sem limite ou status.

### 6.8 Fase 7 - Growth, pricing e comercial

#### 6.8.1 Landing page orientada a carrosseis

Fazer:

- Reposicionar a landing em torno do fluxo real: URL -> Brand DNA -> carrossel -> calendario.
- Mostrar exemplos reais gerados pelo produto.
- Criar comparacao com Canva, ChatGPT, Holo e ferramentas de scheduling.
- Adicionar prova social apenas verdadeira.

Entregaveis:

- Nova landing ou secao principal.
- Demo real.
- FAQ.
- Comparacao.
- CTA para primeiro carrossel.

Considerar feito quando:

- Visitante entende em menos de 10 segundos que ContentFlow gera e agenda carrosseis com Brand DNA.
- CTA leva para onboarding correto.
- Demo representa produto real.

Validacao minima:

- Teste desktop/mobile.
- Lighthouse basico.
- Conferencia de claims.

Nao aceitar se:

- Landing vender features que ainda nao existem.
- Hero usar mock que nao corresponde ao produto.

#### 6.8.2 Pricing

Fazer:

- Definir pacotes com limites tecnicos reais.
- Mapear custo de IA por plano.
- Decidir trial, garantia ou credits.
- Implementar limites no backend, nao apenas UI.

Entregaveis:

- Matriz de planos.
- Policies de limites.
- Mensagens de upgrade.
- Monitor de abuso/custo.

Considerar feito quando:

- Cada plano tem limite claro de marcas, geracoes, jobs, membros e canais.
- O backend impede ultrapassar limite.
- Usuario entende por que precisa upgrade.

Validacao minima:

- Teste de limite por plano.
- Teste de upgrade.
- Teste de custo alto.

Nao aceitar se:

- Pricing prometer unlimited sem protecao.
- Limites existirem so no frontend.

#### 6.8.3 Afiliados

Fazer:

- Definir regras de comissao.
- Escolher ferramenta ou implementar tracking.
- Criar materiais para afiliados.
- Definir politica anti-abuso.

Entregaveis:

- Programa de afiliados.
- Links/cupom.
- Dashboard ou relatorio.
- Politica publica.

Considerar feito quando:

- Um afiliado consegue indicar, conversao e comissao sao rastreadas, e o time consegue auditar.

Validacao minima:

- Teste de clique -> cadastro -> pagamento.
- Teste de reembolso/cancelamento.

Nao aceitar se:

- Nao houver forma confiavel de atribuir receita.

#### 6.8.4 SEO programatico

Fazer:

- Criar clusters de conteudo por nicho, plataforma e comparacao.
- Gerar paginas com exemplos reais.
- Criar estrutura de internal linking.
- Medir conversao para onboarding.

Entregaveis:

- Plano editorial SEO.
- Templates de pagina.
- Primeiras paginas publicadas.
- Tracking de conversao.

Considerar feito quando:

- Paginas tem conteudo util, exemplos reais e CTA para gerar carrossel.
- Search intent esta claro.
- Conversao e medida.

Validacao minima:

- Revisao manual de qualidade.
- Checagem de indexacao tecnica.

Nao aceitar se:

- SEO virar conteudo raso gerado em massa.

### 6.9 Fase 8 - Plataforma e ecossistema

#### 6.9.1 API publica de carrosseis

Fazer:

- Expor APIs para marcas, Brand DNA, ideias, projetos, jobs e export.
- Reaproveitar API keys/OAuth existentes.
- Adicionar idempotency keys e webhooks.
- Documentar OpenAPI.

Entregaveis:

- Endpoints publicos.
- Webhooks de job.
- Docs.
- SDK atualizado quando aplicavel.

Considerar feito quando:

- Um cliente externo consegue criar marca, iniciar Brand DNA, gerar carrossel e receber webhook de conclusao.
- Rate limit e permissoes funcionam.

Validacao minima:

- Teste de API key.
- Teste de idempotencia.
- Teste de webhook.

Nao aceitar se:

- API publica depender de comportamento interno instavel.

#### 6.9.2 Marketplace de templates

Fazer:

- Separar templates oficiais, privados e de creators.
- Criar instalacao por organizacao.
- Criar review/curadoria.
- Medir performance e abuso.

Entregaveis:

- Modelo de Template.
- UI de descoberta/instalacao.
- Processo de aprovacao.
- Versionamento.

Considerar feito quando:

- Usuario consegue instalar template e usa-lo no gerador.
- Alterar template nao quebra projetos antigos.
- Templates ruins podem ser removidos/desativados.

Validacao minima:

- Teste instalando/removendo.
- Teste de versao.
- Teste de permissao.

Nao aceitar se:

- Template marketplace for apenas uma pasta de prompts sem governanca.

#### 6.9.3 Apps e integracoes

Fazer:

- Criar integracoes com Make/Zapier/n8n se houver demanda.
- Permitir importar artigo/link para carrossel.
- Avaliar export para Canva/Figma apenas se reforcar distribuicao.

Entregaveis:

- Conectores ou recipes.
- Webhooks.
- Docs de integracao.
- Exemplos.

Considerar feito quando:

- Usuario consegue automatizar geracao de carrossel fora da UI sem perder controle de marca, custo e aprovacao.

Validacao minima:

- Teste com uma automacao real.
- Teste de erro e retry.

Nao aceitar se:

- Integracao permitir publicar ou gerar alto volume sem limites.

### 6.10 Template de ticket pronto para desenvolvimento

Use este formato para transformar qualquer subfase em tarefas de implementacao:

```md
## Titulo

### Contexto
Explique o problema e a relacao com o roadmap Holo-like.

### Usuario impactado
Founder, creator, social media, agencia, admin ou operador interno.

### Escopo
- O que sera implementado.
- Onde aparece na UI.
- Quais endpoints/modelos/jobs mudam.

### Fora de escopo
- O que explicitamente nao sera feito neste ticket.

### Contrato tecnico
- Inputs.
- Outputs.
- Estados.
- Erros esperados.
- Permissoes.

### Criterios de aceite
- Dado que...
- Quando...
- Entao...

### Testes obrigatorios
- Unit.
- Integration.
- E2E quando aplicavel.
- Evals de IA quando aplicavel.

### Observabilidade
- Eventos.
- Logs.
- Metricas.
- Custo.

### Rollback
- Como desfazer ou desativar com feature flag.
```

## 7. Roadmap sugerido por entregas

### Marco A - 2 a 3 semanas: base confiavel

- Documentar contratos atuais.
- Criar schemas de IA.
- Criar modelos ou camada inicial de BrandProfile.
- Persistir jobs ou preparar migration para isso.
- Melhorar geracao por URL textual.
- Adicionar eventos analiticos basicos.

Resultado esperado: base pronta para MVP sem depender de estado em memoria.

### Marco B - 3 a 5 semanas: MVP Holo-like de carrossel

- Onboarding por URL.
- Brand DNA v1.
- Multi-brand funcional.
- Content Swipe v1.
- Criar carrossel a partir de ideia aprovada.
- Salvar no Media e enviar para calendario.

Resultado esperado: usuario sai de uma URL para um carrossel pronto e agendavel.

### Marco C - 4 a 6 semanas: qualidade e escala

- Jobs Temporal persistentes.
- Template engine por nicho.
- Review editorial forte.
- Regeneracao por slide.
- Biblioteca de referencias.
- Observabilidade de custo e falhas.

Resultado esperado: carrosseis melhores, com menor falha e custo previsivel.

### Marco D - 4 a 6 semanas: automacao e calendario

- Calendario editorial automatico.
- Geracao em lote.
- Drafts para 30/60/90 dias.
- Notificacoes.
- Workflow de aprovacao.

Resultado esperado: ContentFlow supera Holo ao gerar e colocar o conteudo dentro do fluxo de publicacao.

### Marco E - continuo: analytics e growth

- Analytics especifico de carrossel.
- Recomendacoes baseadas em performance.
- Landing page nova.
- SEO.
- Pricing/limites.
- Afiliados.

Resultado esperado: loop de crescimento e melhoria do produto.

## 8. Backlog tecnico por area

### Backend

- Criar models Prisma para BrandProfile, BrandDnaSnapshot, BrandAsset, ContentIdea, CarouselProject, GenerationJob e CarouselPerformance.
- Criar services de dominio:
  - `BrandProfileService`
  - `BrandDnaService`
  - `ContentIdeaService`
  - `CarouselProjectService`
  - `GenerationJobService`
- Criar controllers:
  - `/brands`
  - `/brands/:id/dna`
  - `/brands/:id/assets`
  - `/content-ideas`
  - `/carousel-projects`
  - `/generation-jobs`
- Manter adaptadores para endpoints legados de company profiles.
- Mover jobs longos para orchestrator/Temporal.
- Adicionar rate limits e policies.

### Frontend

- Criar tela `/brands`.
- Evoluir Settings para linkar Brand Kit.
- Criar onboarding Brand DNA.
- Criar Content Swipe.
- Evoluir `/ai-generate-images` para receber `brandProfileId` e `contentIdeaId`.
- Criar painel de jobs.
- Criar conexao direta "salvar e agendar".
- Criar estados vazios e recuperacao de falhas.

### Orchestrator

- Workflows:
  - `brandDnaExtractionWorkflow`
  - `bulkIdeasWorkflow`
  - `carouselGenerationWorkflow`
  - `carouselImageGenerationWorkflow`
  - `editorialCalendarWorkflow`
- Activities:
  - extrair site
  - analisar marca
  - gerar ideias
  - gerar plano
  - revisar
  - gerar imagens
  - salvar midia
  - criar drafts de posts
  - notificar usuario

### Banco e storage

- Migracoes com indices por `organizationId`, `brandProfileId`, `status`, `createdAt`, `deletedAt`.
- JSON apenas para campos flexiveis; entidades principais em tabelas.
- Storage de assets por marca.
- Soft delete e auditoria.

### IA

- Prompt registry versionado.
- Schemas de resposta.
- Provider abstraction.
- Custo por job.
- Fallback model.
- Cache de extracao de URL.
- Protecao de prompt injection em conteudo de site.

## 9. Seguranca, privacidade e compliance

### Riscos

- SSRF ao analisar URLs.
- Prompt injection vindo de sites.
- Conteudo de marca sendo enviado a providers de IA sem clareza.
- Excesso de custo por geracao automatica.
- Dados de uma marca vazarem para outra.
- Publicacao automatica sem revisao.

### Mitigacoes

- Validar URLs e bloquear IPs privados.
- Limitar paginas, bytes, redirects e tempo.
- Sanitizar texto extraido.
- Separar prompt do sistema e conteudo externo.
- Nao executar instrucoes vindas do site como comandos.
- Scoping obrigatorio por organizationId e brandProfileId.
- Logs sem secrets.
- Criptografar tokens e nao expor URLs internas.
- Opt-in para auto-generation.
- Politica clara: dados nao treinam modelos globais.

## 10. Testes e qualidade

### Unit tests

- Normalizacao de URL.
- Sanitizacao de website text.
- Validacao de schemas IA.
- Dedupe de ideias.
- Maquina de estados de ideias.
- Maquina de estados de jobs.
- Recomendador de templates.
- Calculo de custo.

### Integration tests

- Criar marca.
- Rodar Brand DNA com mock de extracao.
- Gerar ideias.
- Aprovar ideia.
- Criar CarouselProject.
- Gerar plano.
- Salvar carrossel em Media.
- Criar draft em calendario.

### E2E

- Onboarding URL -> primeiro carrossel.
- Content Swipe mobile e desktop.
- Regenerar slide.
- Salvar e agendar.
- Multi-brand: trocar marca e garantir isolamento.

### Evals de IA

- Dataset de marcas por nicho.
- Avaliar consistencia de tom.
- Avaliar qualidade dos hooks.
- Avaliar obediencia a termos proibidos.
- Avaliar JSON valido.
- Avaliar repeticao de ideias.

### Verificacao antes de release

- `pnpm test`
- `pnpm run build`
- Testes E2E principais
- Revisao de custos
- Revisao de logs
- Revisao de permissoes
- Teste de rollback de migration

## 11. Escalabilidade

### Curto prazo

- Persistir jobs.
- Limitar concorrencia por organizacao.
- Usar fila/Temporal para geracoes pesadas.
- Cachear extracao de URL.
- Reusar BrandDNA aprovado.

### Medio prazo

- Separar workers por tipo de carga.
- Adicionar provider fallback.
- Armazenar embeddings/hashes para dedupe.
- Dashboard de custo por org.
- Feature flags por plano.

### Longo prazo

- Template marketplace.
- Benchmarks anonimizados opt-in.
- Model routing por custo/qualidade.
- Renderizacao visual mais deterministica.
- Multi-region/storage strategy se necessario.

## 12. Ordem recomendada de implementacao

1. Estabilizar contratos e persistencia de jobs.
2. Formalizar BrandProfile/BrandDNA ou criar adapter limpo sobre CompanyProfile.
3. Criar Brand DNA extraction por URL com revisao humana.
4. Criar Content Swipe persistente.
5. Conectar ideia aprovada ao AI carousel studio.
6. Persistir CarouselProject e vincular ao Media/Post.
7. Mover geracoes longas para Temporal.
8. Expandir templates e review editorial.
9. Criar calendario automatico e geracao em lote.
10. Criar analytics de carrossel e loop de melhoria.
11. Trabalhar landing, pricing, SEO e afiliados.
12. Expandir para ads, posts, emails e videos.

## 13. Decisoes pendentes

- A marca sera chamada internamente de `CompanyProfile`, `BrandProfile` ou outro nome?
- O MVP deve migrar banco agora ou primeiro usar adapter sobre `Organization.description`?
- Qual limite inicial de geracao por plano?
- O usuario alvo inicial e founder individual, creator, social media ou agencia?
- Quais canais sao prioridade para carrossel: Instagram, LinkedIn, TikTok ou todos?
- Auto-generation deve criar apenas drafts ou tambem agendar automaticamente no primeiro release?
- Qual provider de IA sera padrao para texto e imagem?
- Como sera cobrado custo de imagem: creditos, limites mensais ou assinatura flat?
- Existe necessidade de suporte a PT-BR como idioma principal no lancamento?

## 14. Handoff

Este plano esta pronto para virar roadmap de implementacao. A proxima etapa recomendada e criar uma especificacao tecnica da Fase 1 e Fase 2 com:

- modelos Prisma finais,
- endpoints,
- DTOs,
- workflows Temporal,
- telas,
- eventos analiticos,
- testes,
- criterios de aceite.

Depois disso, a implementacao deve comecar por Brand DNA persistente e jobs confiaveis, porque essas duas bases sustentam todo o restante do produto.
