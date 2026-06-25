# Deploy no DigitalOcean com GitHub Actions

Este projeto faz deploy automático para um Droplet da DigitalOcean ao fazer push na branch `main`.

## Produção/teste atual

O estado conhecido da produção/teste atual está documentado em [`PRODUCAO_ATUAL.md`](PRODUCAO_ATUAL.md), incluindo Droplet, IPs, custo, DNS observado e checklist para recriar em outro Droplet antes de excluir o atual.

## Plano recomendado (custo x estabilidade)

Para esse monorepo com frontend + backend + serviços de apoio via Docker Compose:

- Recomendado: `Basic Droplet` com `2 GB RAM / 1 vCPU` (faixa de US$ 12/mês)
- Banco e Redis: prefira serviços gerenciados no futuro para maior estabilidade

Plano muito barato (US$ 4/mês com 512 MB) tende a ficar instável para esta stack.

## 1) Preparar o servidor

No Droplet Ubuntu:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg

# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Docker Compose plugin (normalmente já vem com Docker recente)
docker compose version
```

Crie o diretório do app e configure `.env` de produção:

```bash
mkdir -p /opt/contentflow
cd /opt/contentflow
# criar .env com as variáveis necessárias para docker-compose.yaml
```

## 2) Configurar Secrets no GitHub

Em `Settings > Secrets and variables > Actions`, criar:

- `DO_HOST`: IP do Droplet
- `DO_USERNAME`: usuário SSH (ex: `root`)
- `DO_SSH_KEY`: chave privada SSH usada pelo GitHub Actions
- `DO_PORT`: porta SSH (normalmente `22`)
- `DO_APP_DIR`: diretório de deploy (ex: `/opt/contentflow`)

## 3) Workflow de deploy

Arquivo: `.github/workflows/deploy-digitalocean.yml`

- Dispara em push na `main`
- Copia arquivos para o Droplet
- Executa `docker compose up -d --build`

## 4) Primeiro deploy

Depois de configurar os secrets:

1. Faça push na `main`
2. Acompanhe em `Actions`
3. Valide containers no Droplet:

```bash
cd /opt/contentflow
docker compose ps
```
