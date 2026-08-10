#!/usr/bin/env node
/**
 * Inicia o ContentFlow fora do Docker, usando apenas containers de infra.
 *
 * Modo dev (hot-reload):  pnpm start:local
 * Modo prod (redeploy):   pnpm start:local:prod
 */
import { spawnSync, spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import http from 'http';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROD = process.argv.includes('--prod') || process.argv.includes('-p');
const ENV_PATH = path.join(ROOT, '.env');

// Credenciais reais do postgres local (docker-compose.dev.yaml + volume existente)
const LOCAL_DB_URL  = 'postgresql://contentflow-local:contentflow-local-pwd@localhost:5433/contentflow-db-local';
const LOCAL_REDIS   = 'redis://localhost:6380';

// Portas (o .env aponta tudo para 4007, que no Docker era o nginx)
const PROXY_PORT   = 4007;
const BACKEND_PORT = Number(process.env.CONTENTFLOW_BACKEND_PORT || process.env.PORT || 3000);
const FRONT_PORT   = 4200;

// ─── Cores ───────────────────────────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  yellow:  '\x1b[33m',
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  magenta: '\x1b[35m',
  red:     '\x1b[31m',
};

function log(msg, color = C.yellow) {
  console.log(`\n${color}${msg}${C.reset}`);
}

// ─── Env patcheado para processos do app ─────────────────────────────────────
// Os apps lêem o .env via dotenv-cli, que NÃO sobrescreve variáveis já presentes
// no process.env. Então o que injetamos aqui tem precedência sobre o .env.
const PATCHED_ENV = {
  ...process.env,
  DATABASE_URL: LOCAL_DB_URL,
  REDIS_URL:    LOCAL_REDIS,
  // O backend depende do TemporalService via DI (não dá pra desligar).
  // O container temporal publica a 7233 no host, então apontamos pra localhost.
  TEMPORAL_ADDRESS: 'localhost:7233',
  DISABLE_TEMPORAL: 'false',
};

// ─── Prisma swap ─────────────────────────────────────────────────────────────
// Prisma 6 usa dotenv com override:true — ignora env herdado e lê direto o .env.
// Solução: trocar o .env temporariamente e restaurar no exit.
let originalEnv = null;
function patchEnvForPrisma() {
  if (!existsSync(ENV_PATH)) return;
  originalEnv = readFileSync(ENV_PATH, 'utf-8');
  const patched = originalEnv
    .replace(/^DATABASE_URL=.*/m, `DATABASE_URL="${LOCAL_DB_URL}"`)
    .replace(/^REDIS_URL=.*/m,    `REDIS_URL="${LOCAL_REDIS}"`);
  writeFileSync(ENV_PATH, patched, 'utf-8');
}

function restoreEnv() {
  if (originalEnv !== null) {
    try { writeFileSync(ENV_PATH, originalEnv, 'utf-8'); } catch {}
    originalEnv = null;
  }
}

process.on('exit', restoreEnv);
process.on('SIGINT', () => {
  restoreEnv();
  for (const p of procs) { try { p.kill(); } catch {} }
  process.exit(0);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function run(cmd, args, { ignoreError = false, env = PATCHED_ENV } = {}) {
  console.log(`${C.yellow}$ ${cmd} ${args.join(' ')}${C.reset}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true, cwd: ROOT, env });
  if (!ignoreError && result.status !== 0) {
    restoreEnv();
    console.error(`${C.red}Falhou com código ${result.status}${C.reset}`);
    process.exit(result.status ?? 1);
  }
}

function startProcess(cmd, args, label, color) {
  const proc = spawn(cmd, args, { shell: true, cwd: ROOT, env: PATCHED_ENV });
  const prefix = `${color}[${label}]${C.reset} `;
  proc.stdout.on('data', d => process.stdout.write(prefix + d.toString().replace(/\n(?!$)/g, `\n${prefix}`)));
  proc.stderr.on('data', d => process.stderr.write(prefix + d.toString().replace(/\n(?!$)/g, `\n${prefix}`)));
  proc.on('exit', code => log(`[${label}] encerrado (code ${code})`, color));
  return proc;
}

// Espera uma porta TCP aceitar conexão (até timeoutMs)
function waitForPort(port, timeoutMs = 120000, label = `localhost:${port}`) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const tryConnect = () => {
      const sock = net.connect(port, 'localhost');
      sock.once('connect', () => { sock.destroy(); resolve(true); });
      sock.once('error', () => {
        sock.destroy();
        if (Date.now() > deadline) { log(`Timeout esperando ${label}`, C.red); resolve(false); }
        else setTimeout(tryConnect, 2000);
      });
    };
    tryConnect();
  });
}

// ─── 1. Infra ─────────────────────────────────────────────────────────────────
log('==> [1/4] Subindo infra Docker (postgres, redis, temporal)...');
run('docker', [
  'compose', '-f', 'docker-compose.dev.yaml',
  'up', '-d', '--wait',
  'contentflow-postgres',
  'contentflow-redis',
], { env: process.env });

// Temporal stack (sem --wait: não tem healthcheck; esperamos a porta 7233 abrir)
run('docker', [
  'compose', '-f', 'docker-compose.dev.yaml',
  'up', '-d',
  'temporal-postgresql',
  'temporal-elasticsearch',
  'temporal',
], { env: process.env });
log('Aguardando Temporal (localhost:7233) ficar pronto...');
await waitForPort(7233, 180000, 'Temporal 7233');

// ─── 2. DB schema ─────────────────────────────────────────────────────────────
log('==> [2/4] Sincronizando schema do banco...');
patchEnvForPrisma();
run('pnpm', ['prisma-db-push'], { env: process.env });
restoreEnv();

// ─── 3. Apps ──────────────────────────────────────────────────────────────────
const procs = [];

if (PROD) {
  log('==> [3/4] Buildando e iniciando em modo produção...');
  run('pnpm', ['build']);
  procs.push(startProcess('pnpm', ['start:prod:backend'],      'backend',      C.cyan));
  procs.push(startProcess('pnpm', ['start:prod:orchestrator'], 'orchestrator', C.magenta));
  procs.push(startProcess('pnpm', ['start:prod:frontend'],     'frontend',     C.green));
} else {
  log('==> [3/4] Iniciando em modo desenvolvimento (hot-reload)...');
  procs.push(startProcess('pnpm', ['dev-backend'],      'backend',      C.cyan));
  procs.push(startProcess('pnpm', ['dev:orchestrator'], 'orchestrator', C.magenta));
}

// ─── 4. Reverse-proxy na 4007 (substitui o nginx do Docker) ────────────────────
// O frontend foi buildado com NEXT_PUBLIC_BACKEND_URL=http://localhost:4007/api e os
// cookies têm domain=localhost. Replicamos o nginx num único origin (4007):
//   /api/* -> backend:3000 (remove o prefixo /api)
//   /*     -> frontend:4200
function pickTarget(url) {
  if (url === '/api' || url.startsWith('/api/')) {
    return { port: BACKEND_PORT, path: url.replace(/^\/api/, '') || '/' };
  }
  return { port: FRONT_PORT, path: url };
}

const proxy = http.createServer((req, res) => {
  const { port, path: targetPath } = pickTarget(req.url);
  const proxyReq = http.request(
    { host: 'localhost', port, method: req.method, path: targetPath,
      headers: { ...req.headers, host: `localhost:${port}` } },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on('error', (e) => { res.writeHead(502); res.end(`Proxy: ${e.message}`); });
  req.pipe(proxyReq);
});

// WebSocket / HMR
proxy.on('upgrade', (req, socket, head) => {
  const { port, path: targetPath } = pickTarget(req.url);
  const upstream = net.connect(port, 'localhost', () => {
    upstream.write(
      `${req.method} ${targetPath} HTTP/1.1\r\n` +
      Object.entries({ ...req.headers, host: `localhost:${port}` })
        .map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n\r\n'
    );
    if (head?.length) upstream.write(head);
    socket.pipe(upstream);
    upstream.pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

proxy.listen(PROXY_PORT, () => {
  log('Serviços rodando. Ctrl+C para encerrar.', C.green);
  log(`  App (use este):  http://localhost:${PROXY_PORT}`, C.green);
  log(`  Frontend direto: http://localhost:${FRONT_PORT}`, C.green);
  log(`  Backend direto:  http://localhost:${BACKEND_PORT}`, C.green);
});
