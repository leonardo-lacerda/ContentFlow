import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';
import { validateRuntimeEnv } from '../../scripts/validate-runtime-env.mjs';

const packageDirectory = dirname(fileURLToPath(import.meta.url));
const candidates = [
  process.env.CONTENTFLOW_ENV_FILE,
  '/opt/contentflow/.env',
  resolve(packageDirectory, '../../.env'),
  resolve(process.cwd(), '.env'),
].filter(Boolean);

const loadedFiles = [];
for (const candidate of candidates) {
  if (!existsSync(candidate)) continue;
  dotenv.config({ path: candidate, override: false });
  loadedFiles.push(candidate);
}

const validation = validateRuntimeEnv({ production: true });
if (!validation.ok) {
  console.error('[ContentFlow] frontend environment is invalid:');
  for (const issue of validation.issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`[ContentFlow] frontend environment loaded from ${loadedFiles.join(', ') || 'process environment'}`);

const nextEntrypoint = resolve(packageDirectory, '../../node_modules/next/dist/bin/next');
const child = spawn(process.execPath, [nextEntrypoint, 'start', '-p', process.env.FRONTEND_PORT || '4200'], {
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
