# Producao atual - ContentFlow

Ultima verificacao: 2026-06-24

Este arquivo registra o estado conhecido da producao/teste em DigitalOcean para facilitar a recriacao em outro Droplet. Nao salve tokens, chaves SSH, senhas, `.env` real ou credenciais neste arquivo.

## Resumo

- O sistema esta em teste de producao, ainda sem usuarios reais.
- Provedor atual: DigitalOcean.
- Droplet atual: `contentflow-prod`.
- Branch de deploy: `main`.
- Deploy automatizado: `.github/workflows/deploy-digitalocean.yml`.
- Diretorio esperado no servidor: `/opt/contentflow`.
- Runtime de deploy: Docker Compose com `docker-compose.yaml`, `docker-compose.production.yaml` e `docker-compose.proxy.yaml`.

## Droplet atual

| Campo | Valor |
|---|---|
| Nome | `contentflow-prod` |
| ID | `578709894` |
| Status em 2026-06-24 | `active` |
| Regiao | `nyc3` |
| Imagem | `ubuntu-22-04-x64` |
| Plano | `s-2vcpu-4gb` |
| Preco do plano | US$24/mes |
| vCPU | 2 |
| RAM | 4096 MB |
| Disco | 80 GB |
| IPv4 publico | `165.227.127.192` |
| IPv4 privado | `10.108.0.2` |
| Tags | nenhuma |

Observacao: desligar/pausar o Droplet nao para a cobranca. Para parar a cobranca do Droplet, ele precisa ser destruido. Se quiser manter uma copia antes de destruir, crie snapshot ou faca backup externo, lembrando que snapshot tambem gera custo de armazenamento.

## Custo e downsizing

O menor plano disponivel em `nyc3` no momento da verificacao era:

| Plano | RAM | vCPU | Disco | Preco |
|---|---:|---:|---:|---:|
| `s-1vcpu-512mb-10gb` | 512 MB | 1 | 10 GB | US$4/mes |

O Droplet atual tem 80 GB de disco. A DigitalOcean nao permite reduzir diretamente um Droplet para plano com disco menor. Para usar um plano mais barato, crie um Droplet novo menor e migre a aplicacao/dados.

Planos baratos observados em `nyc3`:

| Plano | RAM | vCPU | Disco | Preco |
|---|---:|---:|---:|---:|
| `s-1vcpu-512mb-10gb` | 512 MB | 1 | 10 GB | US$4/mes |
| `s-1vcpu-1gb` | 1024 MB | 1 | 25 GB | US$6/mes |
| `s-1vcpu-2gb` | 2048 MB | 1 | 50 GB | US$12/mes |
| `s-2vcpu-2gb` | 2048 MB | 2 | 60 GB | US$18/mes |
| `s-2vcpu-4gb` | 4096 MB | 2 | 80 GB | US$24/mes |

Para esta stack, o plano de US$4/mes pode ficar instavel por causa de Docker, backend, Postgres, Redis e servicos auxiliares. O menor plano realmente viavel deve ser validado com uso real de RAM e disco.

## Recursos DigitalOcean associados

Verificacao feita por API em 2026-06-24:

- Volumes: nenhum volume encontrado.
- Floating IPs / Reserved IPs: nenhum encontrado.
- Firewalls encontrados, mas sem Droplets anexados:
  - `spyfunels-prod-fw`
  - `lastreia-prod-firewall`
- Dominio gerenciado na DigitalOcean: `gymfy.space`.

## DNS observado

Registros principais em `gymfy.space`:

| Tipo | Nome | Valor | TTL |
|---|---|---|---:|
| A | `@` | `76.76.21.21` | 300 |
| CNAME | `www` | `cname.vercel-dns.com` | 300 |
| A | `api` | `162.243.173.173` | 300 |

Atencao: o registro `api.gymfy.space` aponta para `162.243.173.173`, mas o Droplet `contentflow-prod` verificado esta em `165.227.127.192`. Antes de excluir qualquer Droplet, confirme qual IP esta realmente servindo a API em producao.

## Secrets e variaveis que precisam existir fora do repo

GitHub Actions, em `Settings > Secrets and variables > Actions`:

- `DO_HOST`: IP do Droplet que recebera o deploy.
- `DO_USERNAME`: usuario SSH, normalmente `root`.
- `DO_SSH_KEY`: chave privada SSH.
- `DO_PORT`: porta SSH, normalmente `22`.
- `DO_APP_DIR`: normalmente `/opt/contentflow`.

No novo Droplet, em `/opt/contentflow/.env`, manter as variaveis de producao exigidas pela aplicacao. Use `docs/DEPLOY.md` como guia e nunca commite o `.env` real.

## Como recriar em outro Droplet

1. Criar um novo Droplet Ubuntu 22.04+ na DigitalOcean.
2. Escolher o menor plano que aguente a stack. Para teste barato, comecar por `s-1vcpu-1gb` ou `s-1vcpu-2gb` tende a ser mais seguro que 512 MB.
3. Instalar Docker e Docker Compose plugin:

```bash
sudo apt update
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
docker compose version
```

4. Criar o diretorio da aplicacao:

```bash
mkdir -p /opt/contentflow
cd /opt/contentflow
```

5. Criar `/opt/contentflow/.env` com os valores reais de producao.
6. Atualizar os secrets do GitHub para apontar para o novo Droplet, principalmente `DO_HOST`.
7. Rodar o workflow `Deploy to DigitalOcean` manualmente ou fazer push na `main`.
8. Conferir no servidor:

```bash
cd /opt/contentflow
docker compose -f docker-compose.yaml -f docker-compose.production.yaml -f docker-compose.proxy.yaml ps
```

9. Atualizar DNS do `api` para o IP do novo Droplet, se a API for servida por ele.
10. Testar frontend, API e login.
11. Somente depois de testar, destruir o Droplet antigo para parar a cobranca.

## Checklist antes de destruir o Droplet antigo

- Confirmar que nao existem usuarios/dados importantes no banco local.
- Confirmar se ha uploads locais que precisam ser copiados.
- Confirmar que o DNS da API aponta para o servidor certo.
- Confirmar que o novo deploy sobe com sucesso via GitHub Actions.
- Confirmar que o login e endpoints principais funcionam.
- Criar snapshot apenas se quiser uma copia recuperavel, aceitando o custo do snapshot.
- Destruir o Droplet antigo na DigitalOcean para encerrar a cobranca do Droplet.
