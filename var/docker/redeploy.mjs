#!/usr/bin/env node
import { spawnSync, spawn } from 'child_process';
import { existsSync } from 'fs';

const IMAGE = 'localhost/contentflow';
const CONTAINER = 'contentflow';
const ENV_FILE = process.env.ENV_FILE || '';

function run(cmd, args, { ignoreError = false } = {}) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (!ignoreError && result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('==> [1/4] Parando e removendo container existente...');
run('docker', ['rm', '-f', CONTAINER], { ignoreError: true });

console.log('\n==> [2/4] Removendo imagem antiga...');
run('docker', ['rmi', IMAGE], { ignoreError: true });

console.log('\n==> [3/4] Buildando nova imagem...');
run('docker', ['build', '-t', IMAGE, '-f', 'Dockerfile.dev', '.']);

console.log('\n==> [4/4] Criando e iniciando container...');

// Resolve os IPs dos containers de infra para mapear os hostnames legados do .env
function getContainerIP(name) {
  const result = spawnSync('docker', ['inspect', name, '--format', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'], { shell: true, encoding: 'utf-8' });
  return result.stdout.trim();
}

const pgIP = getContainerIP('contentflow-postgres');
const redisIP = getContainerIP('contentflow-redis');

const dockerArgs = [
  'run', '-d',
  '--name', CONTAINER,
  '--network', 'contentflow_contentflow-network',
  '-p', '5000:5000',
  '-p', '3000:3000',
  '-p', '4200:4200',
];

if (pgIP) dockerArgs.push('--add-host', `postiz-postgres:${pgIP}`);
if (redisIP) dockerArgs.push('--add-host', `postiz-redis:${redisIP}`);

if (ENV_FILE && existsSync(ENV_FILE)) {
  dockerArgs.push('--env-file', ENV_FILE);
}

dockerArgs.push(IMAGE);
run('docker', dockerArgs);

console.log(`\nContainer '${CONTAINER}' rodando. Logs:\n`);
spawn('docker', ['logs', '-f', CONTAINER], { stdio: 'inherit', shell: true });
