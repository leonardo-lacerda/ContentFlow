// SWC (the Rust compiler nest-cli uses when a .swcrc is present) requires
// jsc.baseUrl to be an absolute path and panics with an unreadable Rust stack
// trace instead of a normal build error when it isn't. Both .swcrc files in
// this repo shipped with a baseUrl hardcoded to one specific machine
// (root .swcrc: a Docker image path "/app"; apps/orchestrator/.swcrc: a
// contributor's old local path) - correct on neither CI runners, the
// production server, nor most contributors' machines, which is why a plain
// `nest build` for backend/orchestrator failed identically everywhere except
// wherever that literal path happened to exist.
//
// Run this once before `nest build` to point baseUrl at wherever the repo
// actually lives right now, so the same .swcrc works on every machine.
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const targets = process.argv.slice(2);
if (!targets.length) {
  console.error('Usage: node scripts/fix-swcrc-baseurl.js <path-to-.swcrc> [...]');
  process.exit(1);
}

for (const target of targets) {
  const swcrcPath = path.resolve(repoRoot, target);
  const raw = fs.readFileSync(swcrcPath, 'utf8');
  const config = JSON.parse(raw);
  if (!config.jsc) config.jsc = {};
  if (config.jsc.baseUrl === repoRoot) continue;
  config.jsc.baseUrl = repoRoot;
  fs.writeFileSync(swcrcPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`[fix-swcrc-baseurl] ${target} -> baseUrl=${repoRoot}`);
}
