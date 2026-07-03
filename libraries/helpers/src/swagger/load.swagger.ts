import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export const loadSwagger = (app: INestApplication) => {
  const config = new DocumentBuilder()
    .setTitle('ContentFlow API')
    .setDescription(
      `# ContentFlow API

API pública para geração de carrosséis, posts e conteúdo com IA.

## Autenticação

Use um dos métodos abaixo no header \`Authorization\`:

- **API Key**: \`Authorization: cf_xxxxxxxxxxxx\` (obtida em Settings > API Keys)
- **OAuth Token**: \`Authorization: pos_xxxxxxxxxxxx\` (obtido via fluxo OAuth 2.0)

## Idempotência

Para operações POST/PUT/PATCH, envie o header \`Idempotency-Key\` com um UUID único.
Requisições duplicadas com a mesma chave retornam a resposta cacheada (24h TTL).

## Rate Limits

Os limites seguem o plano de assinatura:
- **FREE**: 5 carrosséis/mês, 1 Brand DNA, 10 ideias
- **STANDARD**: 50 carrosséis/mês, 5 Brand DNAs, 100 ideias
- **PRO**: 500 carrosséis/mês, 30 Brand DNAs, 1000 ideias
- **TEAM**: 200 carrosséis/mês, 15 Brand DNAs, 500 ideias
- **ULTIMATE**: Ilimitado

## Webhooks

Configure webhooks para receber notificações de eventos:
- \`job.completed\` — Job de geração concluído
- \`job.failed\` — Job de geração falhou
- \`idea.approved\` — Ideia aprovada
- \`project.created\` — Projeto de carrossel criado

O payload é assinado com HMAC-SHA256 no header \`X-ContentFlow-Signature\`.
`,
    )
    .setVersion('1.0')
    .setContact('ContentFlow', 'https://contentflow.com', 'api@contentflow.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        description: 'API Key or OAuth token',
      },
      'api-key',
    )
    .addTag('Public API - Carousels', 'Endpoints públicos para marcas, DNA, ideias e carrosséis')
    .addTag('Public API', 'Endpoints de integração (posts, uploads, canais)')
    .addTag('Brands', 'Gerenciamento de Brand Profiles')
    .addTag('Content Ideas', 'Geração e gestão de ideias de conteúdo')
    .addTag('Carousel Projects', 'Projetos de carrossel')
    .addTag('Generation Jobs', 'Jobs de geração de conteúdo')
    .addTag('Template Marketplace', 'Marketplace de templates')
    .addTag('Webhooks', 'Configuração de webhooks')
    .addTag('Article Import', 'Importação de artigos/links para carrossel')
    .addTag('Plan Limits', 'Limites e uso do plano')
    .addTag('Affiliates', 'Programa de afiliados')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'ContentFlow API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    },
  });
};
