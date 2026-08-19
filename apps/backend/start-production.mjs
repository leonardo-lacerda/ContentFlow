import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';
import { validateRuntimeEnv } from '../../scripts/validate-runtime-env.mjs';

const packageDirectory = dirname(fileURLToPath(import.meta.url));
const configuredEnvFile = process.env.CONTENTFLOW_ENV_FILE;
const candidates = [
  configuredEnvFile,
  '/opt/contentflow/.env',
  resolve(packageDirectory, '../../.env'),
  resolve(process.cwd(), '.env'),
].filter((candidate) => Boolean(candidate));

const envFile = candidates.find((candidate) => existsSync(candidate));
const loadedFiles = envFile ? [envFile] : [];
if (envFile) dotenv.config({ path: envFile, override: true });

if (!loadedFiles.length) {
  console.warn('[ContentFlow] nenhum arquivo .env foi encontrado; usando apenas variáveis do processo.');
}

const validation = validateRuntimeEnv({ production: true });
if (!validation.ok) {
  console.error('[ContentFlow] backend environment is invalid:');
  for (const issue of validation.issues) console.error(`- ${issue}`);
  process.exit(1);
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
