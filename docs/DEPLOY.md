# Deploy de Produção — ContentFlow

Arquitetura escolhida:

- **Frontend** → **Vercel** (`app.seudominio.com`), HTTPS automático.
- **Backend + Orchestrator + Postgres + Redis + Temporal** → **DigitalOcean Droplet** (`api.seudominio.com`), via `docker-compose.yaml` + Caddy (TLS).
- **Auth cross-subdomínio**: o cookie é setado em `.seudominio.com` (`SameSite=None; Secure`), então **app** e **api** precisam estar em **HTTPS sob o mesmo domínio raiz**.

> Substitua `seudominio.com` pelo seu domínio em todos os passos.

---

## 0. Pré-requisitos

- Um domínio (ex.: `seudominio.com`) com acesso ao DNS.
- Conta na **Vercel** e na **DigitalOcean**.
- `doctl` autenticado localmente (opcional, p/ criar o Droplet por CLI).

---

## 1. DNS

Crie dois registros:

| Tipo | Nome  | Valor                  |
|------|-------|------------------------|
| A    | `api` | IP do Droplet          |
| CNAME| `app` | `cname.vercel-dns.com` |

(o valor exato do `app` é mostrado pela Vercel ao adicionar o domínio ao projeto)

---

## 2. Backend no Droplet (DigitalOcean)

### 2.1. Criar o Droplet
- Ubuntu 22.04+, mínimo **4 GB RAM** (o Temporal+Elasticsearch são pesados; 8 GB recomendado).
- Instale Docker + Docker Compose plugin.
- Abra as portas **80** e **443** no firewall.

### 2.2. Preparar a app
```bash
mkdir -p /opt/contentflow && cd /opt/contentflow
# (o deploy via GitHub Actions copia o repositório para cá)
```

Crie o `.env` de produção no Droplet a partir do template:
```bash
# copie .env.production.example -> .env e preencha os valores
cp .env.production.example .env && nano .env
```
Pontos críticos no `.env`:
- `FRONTEND_URL=https://app.seudominio.com`
- `MAIN_URL=https://app.seudominio.com`
- `API_DOMAIN=api.seudominio.com`
- `JWT_SECRET` forte (`openssl rand -hex 32`)
- **não** setar `NOT_SECURED`

### 2.3. Secrets do GitHub (deploy via Actions)
O workflow `.github/workflows/deploy-digitalocean.yml` já existe e dispara em `push` na `main`. Adicione em **GitHub → Settings → Secrets and variables → Actions**:

| Secret         | Valor                                  |
|----------------|----------------------------------------|
| `DO_HOST`      | IP do Droplet                          |
| `DO_USERNAME`  | usuário SSH (ex.: `root`)              |
| `DO_SSH_KEY`   | chave **privada** SSH                   |
| `DO_PORT`      | `22` (opcional)                        |
| `DO_APP_DIR`   | `/opt/contentflow`                     |

### 2.4. TLS (Caddy)
O deploy padrão sobe só o `docker-compose.yaml`. Para HTTPS no `api.*`, suba também o proxy:
```bash
cd /opt/contentflow
docker compose -f docker-compose.yaml -f docker-compose.proxy.yaml up -d
```
O Caddy emite o certificado Let's Encrypt automaticamente para `API_DOMAIN`.

> Dica: edite a etapa "Deploy with Docker Compose" do workflow para incluir
> `-f docker-compose.proxy.yaml` e automatizar o proxy junto.

---

## 3. Frontend na Vercel

### 3.1. Criar o projeto
- Importe o repo `leonardo-lacerda/ContentFlow` na Vercel.
- **Root Directory**: `apps/frontend` (o `apps/frontend/vercel.json` cuida do install/build no monorepo pnpm).
- Adicione o domínio `app.seudominio.com` ao projeto.

### 3.2. Variáveis de ambiente (Vercel → Project → Settings → Environment Variables)
| Variável                              | Valor                              |
|---------------------------------------|------------------------------------|
| `NEXT_PUBLIC_BACKEND_URL`             | `https://api.seudominio.com/api`   |
| `NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY` | `/uploads`                         |
| `STORAGE_PROVIDER`                    | `local`                            |
| `IS_GENERAL`                          | `true`                             |
| `NEXT_PUBLIC_DISCORD_SUPPORT`         | (opcional)                         |
| `NEXT_PUBLIC_POLOTNO`                 | (opcional)                         |

### 3.3. Secrets do GitHub (deploy via Actions)
O workflow `.github/workflows/deploy-vercel.yml` dispara em `push` na `main` (mudanças no frontend). Pegue os IDs com:
```bash
npm i -g vercel
vercel login
vercel link   # dentro do repo; gera .vercel/project.json com orgId e projectId
```
Adicione em **GitHub → Settings → Secrets**:

| Secret              | Onde obter                                  |
|---------------------|---------------------------------------------|
| `VERCEL_TOKEN`      | Vercel → Account Settings → Tokens          |
| `VERCEL_ORG_ID`     | `.vercel/project.json` (`orgId`)            |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` (`projectId`)        |

---

## 4. Disparar e verificar

- **Automático**: qualquer `push` na `main` dispara os dois workflows.
- **Manual**: GitHub → Actions → selecione o workflow → **Run workflow**.

Checagens:
```bash
# backend (deve responder via HTTPS)
curl https://api.seudominio.com/api/auth/can-register
# frontend
curl -I https://app.seudominio.com
```
Login: abra `https://app.seudominio.com` e faça login — o cookie é gravado em `.seudominio.com` e enviado para `api.seudominio.com`.

---

## 5. Gotchas

- **HTTPS é obrigatório** nos dois lados: o cookie usa `Secure; SameSite=None`. Sem TLS, o login não persiste.
- **Mesmo domínio raiz**: `app.*` e `api.*` precisam compartilhar `seudominio.com` (o cookie é `.seudominio.com`).
- **CORS**: o backend libera `FRONTEND_URL`/`MAIN_URL`. Garanta que apontem para `https://app.seudominio.com`.
- **Memória do Droplet**: Temporal + Elasticsearch consomem bastante; use 8 GB se possível.
- **Os tokens/secrets não estão no repo** — você precisa adicioná-los no GitHub e nas plataformas (eu não tenho acesso às suas contas).
