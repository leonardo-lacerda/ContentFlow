# Design System — guia do operador

Pipeline estilo xniper-social-studio no ContentFlow:

```
plan de texto → ideate (direction × palette × font)
             → fill HTML template → Playwright PNG → Media
```

## Env

| Variável | Default | Descrição |
|----------|---------|-----------|
| `DESIGN_SYSTEM_ENABLED` | `true` | Liga/desliga o modo |
| `DESIGN_SYSTEM_RENDER_CONCURRENCY` | `1` | Screenshots paralelos |
| `DESIGN_SYSTEM_LAZY_BROWSER` | unset | Se `1`, não abre Chromium no boot |

## Dependências

```bash
pnpm add playwright
pnpm exec playwright install chromium
```

Docker: garantir Chromium deps + `shm_size: '1gb'`.

## Endpoints

- `GET /ai-generate/design-system/catalog`
- `GET /ai-generate/design-system/summary`
- `POST /ai-generate/design-system/ideate`
- `POST /ai-generate/carousel-design-jobs`
- `GET /ai-generate/carousel-design-jobs/:id`

## Atribuição

Assets HTML/JSON derivados de [xniper-social-studio](https://github.com/xniperbuilds/xniper-social-studio) (MIT).  
Ver `libraries/nestjs-libraries/src/design-system/reference/ATTRIBUTION.md`.

## Prisma

Novo enum: `GenerationJobType.DESIGN_SYSTEM_RENDER`

```bash
pnpm prisma-db-push
# ou
pnpm dlx prisma@6.5.0 db push --schema ./libraries/nestjs-libraries/src/database/prisma/schema.prisma
```
