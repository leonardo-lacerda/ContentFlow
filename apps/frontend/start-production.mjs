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

const envFile = candidates.find((candidate) => existsSync(candidate));
const loadedFiles = envFile ? [envFile] : [];
if (envFile) dotenv.config({ path: envFile, override: false });

const validation = validateRuntimeEnv({ production: true });
if (!validation.ok) {
  console.error('[ContentFlow] frontend environment is invalid:');
  for (const issue of validation.issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`[ContentFlow] frontend environment loaded from ${loadedFiles.join(', ') || 'process environment'}`);

const nextEntrypoint = resolve(packageDirectory, '../../node_modules/next/dist/bin/next');
const port = process.env.FRONTEND_PORT || '4200';
const child = spawn(process.execPath, [nextEntrypoint, 'start', '-p', port], {
  cwd: packageDirectory,
  env: process.env,
  stdio: 'inherit',
});

async function waitUntilReady() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Next exited before readiness with code ${child.exitCode}`);
    try {
      const responses = await Promise.all([
        fetch(`http://127.0.0.1:${port}/auth/login`),
        fetch(`http://127.0.0.1:${port}/p/__runtime_check__`),
      ]);
      if (responses.some((response) => response.status >= 500)) {
        throw new Error('Next returned a server error during readiness check');
      }
      console.log(`[ContentFlow] frontend ready on port ${port}`);
      return;
    } catch (error) {
      if (Date.now() >= deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error('Frontend readiness check timed out');
}

waitUntilReady().catch((error) => {
  console.error(`[ContentFlow] frontend readiness failed: ${error.message}`);
  child.kill('SIGTERM');
  process.exit(1);
});

const forwardSignal = (signal) => child.kill(signal);
process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
