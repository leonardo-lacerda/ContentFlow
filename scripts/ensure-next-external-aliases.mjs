import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const nextServerDir = path.join(rootDir, 'apps', 'frontend', '.next', 'server');
const nodeModulesDir = path.join(rootDir, 'node_modules');

const aliases = new Set();
const aliasPattern = /(?:require|import)-in-the-middle-[a-z0-9_-]+/g;

function collectFiles(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(entryPath);
    else if (entry.isFile() && entry.name.endsWith('.js')) {
      const source = fs.readFileSync(entryPath, 'utf8');
      for (const alias of source.matchAll(aliasPattern)) aliases.add(alias[0]);
    }
  }
}

collectFiles(nextServerDir);

for (const alias of aliases) {
  const basePackage = alias.startsWith('require-in-the-middle-')
    ? 'require-in-the-middle'
    : 'import-in-the-middle';
  const target = path.join(nodeModulesDir, basePackage);
  const link = path.join(nodeModulesDir, alias);

  if (!fs.existsSync(target)) {
    throw new Error(`Cannot create ${alias}: package ${basePackage} is missing from node_modules`);
  }

  if (fs.existsSync(link)) continue;

  // Junctions work on Windows without requiring developer mode; directories
  // are the native equivalent on Linux production hosts.
  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(target, link, linkType);
  console.log(`[next-alias] ${alias} -> ${basePackage}`);
}

console.log(`[next-alias] verified ${aliases.size} external aliases`);
