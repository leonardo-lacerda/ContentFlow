import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Resolve the on-disk root of design-system assets (data/, templates/, reference/).
 * Works in monorepo dev (source) and compiled Nest dist layouts.
 */
export function resolveDesignSystemRoot(): string {
  const candidates = [
    // Sibling of this file when running from source / swc output next to assets
    join(__dirname),
    // When compiled one level deeper
    join(__dirname, '..'),
    // Monorepo cwd (backend/orchestrator started from repo root or apps/backend)
    join(process.cwd(), 'libraries/nestjs-libraries/src/design-system'),
    join(process.cwd(), '../libraries/nestjs-libraries/src/design-system'),
    join(process.cwd(), '../../libraries/nestjs-libraries/src/design-system'),
  ];

  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'data', 'palettes.json'))) {
      return candidate;
    }
  }

  throw new Error(
    'Design system assets not found. Expected data/palettes.json under design-system root.'
  );
}

export function designSystemDataPath(...parts: string[]): string {
  return join(resolveDesignSystemRoot(), 'data', ...parts);
}

export function designSystemTemplatePath(...parts: string[]): string {
  return join(resolveDesignSystemRoot(), 'templates', ...parts);
}
