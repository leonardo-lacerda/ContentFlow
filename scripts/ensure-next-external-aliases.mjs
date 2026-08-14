import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const nextServerDir = path.join(rootDir, 'apps', 'frontend', '.next', 'server');
const nodeModulesDir = path.join(rootDir, 'node_modules');

const aliases = new Set();
const requirePattern = /require\(["']([^"']+)["']\)/g;

function collectFiles(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(entryPath);
    else if (entry.isFile() && entry.name.endsWith('.js')) {
      const source = fs.readFileSync(entryPath, 'utf8');
      for (const match of source.matchAll(requirePattern)) {
        const moduleName = match[1];
        const suffix = moduleName.match(/^(.*)-([a-z0-9]{8,})$/i);
        if (suffix) aliases.add(moduleName);
      }
    }
  }
}

collectFiles(nextServerDir);

for (const alias of aliases) {
  const basePackage = alias.replace(/-[a-z0-9]{8,}$/i, '');
  const target = path.join(nodeModulesDir, basePackage);
  const link = path.join(nodeModulesDir, alias);

  if (!fs.existsSync(target)) continue;

  // Production deploys hardlink-copy node_modules from the previously
  // running release (scripts/deploy/selective-production.sh), which carries
  // over any symlink this script already created there — including ones
  // whose absolute path points into that OLDER release directory. Leaving
  // it in place either throws EEXIST on recreation (observed crashing a
  // real deploy) or, worse, silently keeps working only until that older
  // release is cleaned up. Removing first makes every alias point at this
  // release's own node_modules and makes the step safely re-runnable.
  fs.rmSync(link, { force: true, recursive: true });

  // Junctions work on Windows without requiring developer mode; directories
  // are the native equivalent on Linux production hosts.
  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(target, link, linkType);
  console.log(`[next-alias] ${alias} -> ${basePackage}`);
}

console.log(`[next-alias] verified ${aliases.size} external aliases`);
