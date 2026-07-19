# Deploy em Produção — Vultr (ContentFlow)

Guia completo para qualquer IA ou humano fazer deploy do ContentFlow no Vultr.

---

## 1. Visão Geral da Arquitetura

O ContentFlow roda em modo **hybrid** no Vultr:

```
Internet :4007
    │
    ▼
┌─────────────────────────────────────────────┐
│  nginx (host, :4007)                        │
│    /api/*  → proxy_pass → backend :3000     │
│    /uploads/* → alias → /opt/contentflow/…  │
│    /*       → proxy_pass → frontend :4200   │
└─────────────────────────────────────────────┘
    │                    │
    ▼                    ▼
┌──────────┐    ┌──────────────┐
│  PM2     │    │  PM2         │
│  backend │    │  frontend    │
│  (NestJS)│    │  (Next.js)   │
│  :3000   │    │  :4200       │
└──────────┘    └──────────────┘
    │                    │
    ▼                    ▼
┌──────────────────────────────────────────┐
│  Docker (host)                           │
│  ├── contentflow-postgres → :5433→:5432  │
│  └── contentflow-redis    → :6380→:6379  │
└──────────────────────────────────────────┘
```

- **Backend/Frontend:** rodando nativamente no host via PM2
- **PostgreSQL e Redis:** rodando em containers Docker
- **Temporal / Orchestrator:** desabilitado (`DISABLE_TEMPORAL=true`)
- **nginx:** reverse proxy na porta 4007

---

## 2. Informações do Servidor

| Campo | Valor |
|-------|-------|
| **Provider** | Vultr |
| **Região** | São Paulo (sao) |
| **Plano** | vc2-2c-4gb (2 vCPU / 4GB RAM / 80GB SSD) |
| **Custo** | ~$30/mês |
| **OS** | Ubuntu 24.04 LTS |
| **IP** | `216.238.121.214` |
| **User** | `root` |
| **SSH Key** | `credentials/contentflow-vultr` (ed25519) |
| **App URL** | `http://216.238.121.214:4007` |

### Comando SSH

```bash
ssh -i credentials/contentflow-vultr root@216.238.121.214
```

> ⚠️ No Windows, a chave SSH precisa ter permissões restritas:
> ```powershell
> icacls "credentials\contentflow-vultr" /inheritance:r /grant:r "Usuario:F"
> ```

---

## 3. Stack do Servidor

| Componente | Versão | Detalhes |
|------------|--------|----------|
| Node.js | 22.23.1 | via nvm ou instalação direta |
| pnpm | 10.6.1 | `npm i -g pnpm@10.6.1` |
| PM2 | 7.0.3 | `npm i -g pm2` |
| Docker | latest | `curl -fsSL https://get.docker.com \| sh` |
| Docker Compose | 2.40.3 | vem com Docker |
| nginx | 1.24 | `apt install nginx` |
| Prisma | 6.5.0 | via pnpm dlx (não global) |
| PostgreSQL | 16-alpine | Docker container |
| Redis | 7-alpine | Docker container |

---

## 4. Estrutura de Diretórios no Servidor

```
/opt/contentflow/                 # Código-fonte (git ou copiado)
├── apps/
│   ├── backend/                  # NestJS (source → dist via SWC)
│   │   ├── src/                  # Código TypeScript
│   │   ├── dist/                 # Build output
│   │   │   ├── apps/backend/src/main.js   # ← Entry point (swc-compile)
│   │   │   └── libraries/       # Libs compiladas pelo swc-compile
│   │   ├── nest-cli.json
│   │   └── package.json
│   └── frontend/                 # Next.js
│       ├── src/                  # Código TypeScript/React
│       ├── .next/                # Build output do next build
│       └── package.json
├── libraries/
│   └── nestjs-libraries/src/     # Bibliotecas compartilhadas
├── scripts/
│   └── swc-compile-backend.js   # ← CRÍTICO: build custom do backend
├── var/docker/
│   ├── nginx.conf                # nginx para Docker mode
│   └── start-vultr.sh           # Startup script Docker mode
├── ecosystem.config.js           # ← PM2 config (ver seção 7)
├── docker-compose.deps.yaml      # PostgreSQL + Redis
├── .env                          # Variáveis de ambiente
├── start-backend.js              # Wrapper para PM2 (alternativo)
├── .swcrc                        # Config do SWC
├── uploads/                      # Uploads de usuários
└── node_modules/
```

---

## 5. Variáveis de Ambiente (`.env`)

Arquivo em `/opt/contentflow/.env`:

```env
# URLs
MAIN_URL=http://216.238.121.214:4007
FRONTEND_URL=http://216.238.121.214:4007
NEXT_PUBLIC_BACKEND_URL=http://216.238.121.214:4007/api
BACKEND_INTERNAL_URL=http://127.0.0.1:3000

# Segurança
JWT_SECRET=<gerar com: openssl rand -hex 32>

# Banco de dados
DATABASE_URL=postgresql://contentflow-user:contentflow-password@127.0.0.1:5433/contentflow-db
REDIS_URL=redis://127.0.0.1:6380

# App
DISABLE_TEMPORAL=true
IS_GENERAL=true
DISABLE_REGISTRATION=false
STORAGE_PROVIDER=local
UPLOAD_DIRECTORY=/opt/contentflow/uploads
NEXT_PUBLIC_UPLOAD_DIRECTORY=/uploads
API_LIMIT=30

# IA
OPENAI_API_KEY=sk-...
AI_GENERATE_BASE_URL=http://127.0.0.1:3000
AI_GENERATE_API_KEY=contentflow-ai-key
AI_GENERATE_OPENAI_API_KEY=sk-...
AI_GENERATE_OPENAI_BASE_URL=https://api.openai.com
AI_GENERATE_OPENAI_IMAGE_MODEL=gpt-image-2

# Build
NX_ADD_PLUGINS=false
NODE_ENV=production
NEXT_PUBLIC_VERSION=1.47.0
PORT=3000
NOT_SECURED=true
```

> ⚠️ **Os ports do banco são 5433 e 6380 no host** (mapeados dos containers 5432 e 6379).

---

## 6. Docker Compose (Banco de Dados)

Arquivo: `/opt/contentflow/docker-compose.deps.yaml`

```yaml
services:
  contentflow-postgres:
    image: postgres:16-alpine
    container_name: contentflow-postgres
    restart: always
    environment:
      POSTGRES_USER: contentflow-user
      POSTGRES_PASSWORD: contentflow-password
      POSTGRES_DB: contentflow-db
    ports:
      - "5433:5432"
    volumes:
      - postgres-volume:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U contentflow-user -d contentflow-db"]
      interval: 10s
      timeout: 5s
      retries: 10

  contentflow-redis:
    image: redis:7-alpine
    container_name: contentflow-redis
    restart: always
    command: redis-server --appendonly yes
    ports:
      - "6380:6379"
    volumes:
      - contentflow-redis-data:/data

volumes:
  postgres-volume:
  contentflow-redis-data:
```

### Comandos Docker

```bash
# Subir banco e redis
docker compose -f docker-compose.deps.yaml up -d

# Status
docker ps

# Logs
docker logs contentflow-postgres --tail 50
docker logs contentflow-redis --tail 50

# Restart
docker compose -f docker-compose.deps.yaml restart
```

---

## 7. PM2 — `ecosystem.config.js`

**Este é o arquivo mais crítico para o deploy.** Ele define como o PM2 inicia backend e frontend.

```javascript
module.exports = {
  apps: [
    {
      name: 'contentflow-backend',
      script: 'node',
      args: '--experimental-require-module /opt/contentflow/apps/backend/dist/apps/backend/src/main.js',
      cwd: '/opt/contentflow',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://contentflow-user:contentflow-password@127.0.0.1:5433/contentflow-db',
        REDIS_URL: 'redis://127.0.0.1:6380',
        JWT_SECRET: '...',
        MAIN_URL: 'http://216.238.121.214:4007',
        FRONTEND_URL: 'http://216.238.121.214:4007',
        NEXT_PUBLIC_BACKEND_URL: 'http://216.238.121.214:4007/api',
        BACKEND_INTERNAL_URL: 'http://localhost:3000',
        DISABLE_TEMPORAL: 'true',
        IS_GENERAL: 'true',
        STORAGE_PROVIDER: 'local',
        UPLOAD_DIRECTORY: '/opt/contentflow/uploads',
        NEXT_PUBLIC_UPLOAD_DIRECTORY: '/uploads',
        API_LIMIT: '30',
        OPENAI_API_KEY: '...',
        AI_GENERATE_BASE_URL: 'http://127.0.0.1:3000',
        AI_GENERATE_API_KEY: 'contentflow-ai-key',
        AI_GENERATE_OPENAI_API_KEY: '...',
        AI_GENERATE_OPENAI_BASE_URL: 'https://api.openai.com',
        AI_GENERATE_OPENAI_IMAGE_MODEL: 'gpt-image-2',
        NX_ADD_PLUGINS: 'false',
        PORT: '3000',
        NOT_SECURED: 'true',
      },
      max_memory_restart: '1G',  // ← Backend usa ~500-600MB
    },
    {
      name: 'contentflow-frontend',
      script: 'pnpm',
      args: 'start:prod:frontend',
      cwd: '/opt/contentflow',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_BACKEND_URL: 'http://216.238.121.214:4007/api',
      },
      max_memory_restart: '400M',
    },
  ],
};
```

### ⚠️ Pontos de atenção do ecosystem.config.js

1. **`max_memory_restart` do backend deve ser `'1G'`** (não `'200M'` ou `'400M'`). O NestJS com design-system + Playwright consome ~500-600MB. Se o limite for menor, o PM2 mata e reinicia o processo continuamente, gerando 502 Bad Gateway.

2. **O entry point do backend é `apps/backend/dist/apps/backend/src/main.js`** (não `dist/src/main.js`). Isso porque o build custom (`swc-compile-backend.js`) coloca o output em `dist/apps/backend/src/`, não em `dist/src/`.

3. **O flag `--experimental-require-module`** é necessário porque o SWC-compilado mantém requires para arquivos `.ts` das libs (sentry, helpers). O Node 22 precisa desse flag para carregá-los.

4. **As variáveis de ambiente no ecosystem.config.js sobrescrevem o `.env`**. Se você usar `pnpm start:prod:backend` (que roda `dotenv -e ../../.env`), o `.env` é carregado. Mas com `node --experimental-require-module`, o dotenv não é chamado — o PM2 injeta as env vars diretamente.

---

## 8. nginx — Reverse Proxy

Config em `/etc/nginx/sites-enabled/contentflow`:

```nginx
server {
    listen 4007;
    server_name _;
    client_max_body_size 200M;

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3000/;    # Strip /api prefix
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
    }

    location = /api {
        return 301 /api/;
    }

    # Uploads estáticos
    location /uploads/ {
        alias /opt/contentflow/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:4200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Comandos nginx

```bash
# Testar config
nginx -t

# Reload
nginx -s reload

# Restart
systemctl restart nginx

# Logs
tail -f /var/log/nginx/error.log
```

---

## 9. Processo de Build

### Backend (SWC custom — OBRIGATÓRIO)

**NÃO use `pnpm run build:backend` (que roda `nest build`)**. O `nest build` padrão só compila o diretório `apps/backend/src/` mas mantém imports relativos para `.ts` das libs. Isso causa `MODULE_NOT_FOUND` em produção.

**Use o script custom:**

```bash
cd /opt/contentflow
rm -rf apps/backend/dist
node scripts/swc-compile-backend.js
```

O `swc-compile-backend.js` faz:
1. Compila `apps/backend/src/` → `apps/backend/dist/apps/backend/src/`
2. Compila `libraries/nestjs-libraries/src/` → `apps/backend/dist/libraries/nestjs-libraries/src/`
3. Compila `libraries/helpers/src/` → `apps/backend/dist/libraries/helpers/src/`
4. Reescreve imports `@gitroom/*` para caminhos relativos `.js`
5. Corrige export getters do SWC para evitar TDZ com DI circular

### Frontend (Next.js padrão)

```bash
cd /opt/contentflow
NODE_OPTIONS="--max-old-space-size=3072" pnpm run build:frontend
```

Ou equivalente:
```bash
cd apps/frontend
next build
```

### Prisma

```bash
# Gerar client
pnpm run prisma-generate

# Sincronizar schema com o banco
pnpm run prisma-db-push
```

---

## 10. Processo de Deploy (Step-by-Step)

### Deploy completo (código novo do git)

```bash
# 1. SSH no servidor
ssh -i credentials/contentflow-vultr root@216.238.121.214

# 2. Backup do .env
cd /opt/contentflow
cp .env .env.bak

# 3. Atualizar código
# Opção A: git pull (se o repo foi clonado com git)
git pull origin main

# Opção B: Upload via SCP (se o código foi copiado sem git)
# Do computador local:
scp -i credentials/contentflow-vultr <arquivo> root@216.238.121.214:/opt/contentflow/
# Ou via tar:
tar czf /tmp/cf.tar.gz --exclude=node_modules --exclude=.next --exclude=.git ...
scp -i credentials/contentflow-vultr /tmp/cf.tar.gz root@216.238.121.214:/opt/
ssh ... "cd /opt/contentflow && tar xzf /opt/cf.tar.gz"

# 4. Restaurar .env
cp .env.bak .env

# 5. Instalar dependências
pnpm install --frozen-lockfile

# 6. Prisma generate + db push
pnpm run prisma-generate
pnpm run prisma-db-push

# 7. Build backend (SWC custom!)
rm -rf apps/backend/dist
node scripts/swc-compile-backend.js

# 8. Build frontend
NODE_OPTIONS="--max-old-space-size=3072" pnpm run build:frontend

# 9. Reiniciar serviços
pm2 delete all
pm2 start ecosystem.config.js
pm2 save

# 10. Verificar
pm2 list
curl -sI http://127.0.0.1:4007/
curl -sI http://127.0.0.1:3000/
```

### Deploy rápido (só mudanças no frontend)

Quando o backend não mudou, é possível pular os passos 5-7:

```bash
# 1-4. Mesmos passos acima
# 5. Apenas build do frontend
NODE_OPTIONS="--max-old-space-size=3072" pnpm run build:frontend

# 6. Restart do frontend
pm2 restart contentflow-frontend
```

### Deploy rápido (só mudanças no backend)

```bash
# 1-4. Mesmos passos acima
# 5. Apenas rebuild do backend
rm -rf apps/backend/dist
node scripts/swc-compile-backend.js

# 6. Restart do backend
pm2 restart contentflow-backend
```

---

## 11. Comandos de Diagnóstico

```bash
# Status dos processos
pm2 list
pm2 status

# Logs em tempo real
pm2 logs contentflow-backend --lines 100
pm2 logs contentflow-frontend --lines 100

# Logs de erro
pm2 logs contentflow-backend --err --lines 50

# Testar endpoints
curl -sI http://127.0.0.1:4007/          # Frontend via nginx
curl -sI http://127.0.0.1:3000/          # Backend direto
curl -s  http://127.0.0.1:4007/api/      # API via nginx

# Memória
pm2 monit

# Docker
docker ps
docker logs contentflow-postgres --tail 20
docker logs contentflow-redis --tail 20

# nginx
nginx -t
tail -f /var/log/nginx/error.log

# Disk
df -h
du -sh /opt/contentflow/node_modules
```

---

## 12. Problemas Conhecidos e Soluções

### 🔴 502 Bad Gateway em todas as rotas `/api/*`

**Causa:** Backend PM2 crashed ou restarting-loop.

**Diagnóstico:**
```bash
pm2 list  # Ver se backend está "errored" ou com muitos restarts
pm2 logs contentflow-backend --err --lines 30
```

**Causas comuns:**
1. **`max_memory_restart` muito baixo** — Backend usa ~500MB. Se o limite for 200M/400M, o PM2 mata o processo. **Solução:** Definir `max_memory_restart: '1G'`.
2. **Build não foi feito com `swc-compile-backend.js`** — O `nest build` deixa imports quebrados para `.ts` das libs. **Solução:** Usar `node scripts/swc-compile-backend.js`.
3. **Entry point errado** — O PM2 procura o `main.js` no path errado. O correto é `apps/backend/dist/apps/backend/src/main.js`. **Solução:** Atualizar `ecosystem.config.js`.

### 🔴 Build do frontend falha com "Invalid UTF-8" no Sass

**Causa:** Arquivo `.scss` com byte `0x97` (Windows-1252 em dash) em vez de UTF-8 `0xE2 0x80 0x94`.

**Diagnóstico:**
```bash
xxd apps/frontend/src/app/ds-tokens.scss | grep '97'
```

**Solução:**
```python
# Rodar no servidor:
python3 -c "
p = '/opt/contentflow/apps/frontend/src/app/ds-tokens.scss'
d = open(p, 'rb').read()
d = d.replace(bytes([0x97]), bytes([0xe2, 0x80, 0x94]))
open(p, 'wb').write(d)
print('OK')
"
```

> **Prevenção:** Sempre editar arquivos `.scss` em UTF-8 puro. No Windows, usar `[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)` ou `New-Object System.Text.UTF8Encoding $false` para evitar BOM.

### 🔴 Build do frontend falha com "expected '{'" no Sass

**Causa:** Variáveis CSS declaradas fora de um seletor (`:root { ... }`).

**Diagnóstico:** Verificar se todas as variáveis estão dentro do bloco `:root { ... }`.

**Solução:** Mover o `}` de fechamento do `:root` para o final do arquivo.

### 🔴 Backend crasha com "Cannot find module" para libs

**Causa:** Build do backend não compilou as libs compartilhadas.

**Diagnóstico:**
```bash
ls apps/backend/dist/libraries/  # Deve existir
cat apps/backend/dist/apps/backend/src/main.js | head -10  # Verificar requires
```

**Solução:** Usar `node scripts/swc-compile-backend.js` em vez de `nest build`.

### 🔴 PM2 "errored" mas o erro antigo ainda aparece nos logs

**Causa:** PM2 acumula logs antigos.

**Solução:**
```bash
pm2 flush
pm2 restart all
```

### 🔴 Frontend não encontra o backend (erro de CORS ou conexão)

**Causa:** `NEXT_PUBLIC_BACKEND_URL` não foi definido no build do frontend. Variáveis `NEXT_PUBLIC_*` são baked durante o `next build`.

**Solução:** Garantir que `NEXT_PUBLIC_BACKEND_URL` esteja no `.env` ANTES do `next build`:
```bash
NEXT_PUBLIC_BACKEND_URL=http://216.238.121.214:4007/api pnpm run build:frontend
```

---

## 13. Persistência

### PM2 persiste ao reboot?

```bash
# Salvar lista de processos
pm2 save

# Configurar startup (roda uma vez)
pm2 startup
# (segue as instruções que ele dá, geralmente é copiar/colar um comando systemd)
```

### Docker persiste ao reboot?

Sim — os containers têm `restart: always` e os volumes são persistentes.

---

## 14. Segurança

- [ ] Gerar `JWT_SECRET` forte: `openssl rand -hex 32`
- [ ] Configurar firewall (UFW): liberar apenas 22, 80, 443, 4007
- [ ] Configurar HTTPS (Caddy ou Certbot + domínio)
- [ ] `.env` não deve estar no git (está no `.gitignore`)
- [ ] SSH key restrita a só o usuário correto
- [ ] Configurar `NOT_SECURED` como vazio quando HTTPS estiver ativo (cookies Secure)

---

## 15. Variáveis que AFETAM o Build

Estas variáveis **precisam estar no `.env` antes do build** (são baked no JS compilado):

| Variável | Afeta |
|----------|-------|
| `NEXT_PUBLIC_BACKEND_URL` | Frontend sabe para onde enviar requests de API |
| `NEXT_PUBLIC_UPLOAD_DIRECTORY` | Caminho de uploads no frontend |
| `NEXT_PUBLIC_VERSION` | Version badge no frontend |

Estas variáveis são **lidas em runtime** (não precisam estar no build):

| Variável | Afeta |
|----------|-------|
| `DATABASE_URL` | Conexão com PostgreSQL |
| `REDIS_URL` | Conexão com Redis |
| `JWT_SECRET` | Tokens de autenticação |
| `OPENAI_API_KEY` | Chave da OpenAI |
| `DISABLE_TEMPORAL` | Desabilita orchestrator |
| `API_LIMIT` | Rate limiting |

---

## 16. Referência Rápida

| Ação | Comando |
|------|---------|
| SSH no servidor | `ssh -i credentials/contentflow-vultr root@216.238.121.214` |
| Ver status | `pm2 list && docker ps` |
| Logs backend | `pm2 logs contentflow-backend --lines 50` |
| Reiniciar tudo | `pm2 restart all` |
| Build backend | `cd /opt/contentflow && rm -rf apps/backend/dist && node scripts/swc-compile-backend.js` |
| Build frontend | `cd /opt/contentflow && NODE_OPTIONS="--max-old-space-size=3072" pnpm run build:frontend` |
| Prisma generate | `cd /opt/contentflow && pnpm run prisma-generate` |
| Prisma db push | `cd /opt/contentflow && pnpm run prisma-db-push` |
| Docker up | `cd /opt/contentflow && docker compose -f docker-compose.deps.yaml up -d` |
| Testar app | `curl -sI http://127.0.0.1:4007/` |
| Testar API | `curl -s http://127.0.0.1:4007/api/` |
| nginx reload | `nginx -s reload` |
| Salvar PM2 | `pm2 save` |

---

*Atualizado em: 2026-07-19*
*Criado a partir de deploys reais com troubleshooting documentado.*