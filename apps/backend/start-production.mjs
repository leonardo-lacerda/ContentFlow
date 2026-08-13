import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';

const packageDirectory = dirname(fileURLToPath(import.meta.url));
const configuredEnvFile = process.env.CONTENTFLOW_ENV_FILE;
const candidates = [
  configuredEnvFile,
  process.env.NODE_ENV === 'production' ? '/opt/contentflow/.env' : undefined,
  resolve(packageDirectory, '../../.env'),
  resolve(process.cwd(), '.env'),
].filter((candidate) => Boolean(candidate));

const loadedFiles = [];
for (const candidate of candidates) {
  if (!existsSync(candidate)) continue;
  dotenv.config({ path: candidate, override: false });
  loadedFiles.push(candidate);
}

if (!loadedFiles.length) {
  console.warn('[ContentFlow] nenhum arquivo .env foi encontrado; usando apenas variáveis do processo.');
}

const entrypoint = resolve(packageDirectory, 'dist/apps/backend/src/main.js');
const child = spawn(process.execPath, ['--experimental-require-module', entrypoint], {
  cwd: packageDirectory,
  env: process.env,
  stdio: 'inherit',
});

const forwardSignal = (signal) => child.kill(signal);
process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
