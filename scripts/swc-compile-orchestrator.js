// Mirrors scripts/swc-compile-backend.js (the script the real production
// deploy uses for the backend, and which never had this problem because it
// bypasses .swcrc entirely): a plain `nest build` for apps/orchestrator uses
// @nestjs/cli's SWC builder, which merges a hardcoded `jsc.baseUrl: './'`
// default with whatever .swcrc it finds - and both nest-cli's own lookup
// (relative to process.cwd()) and @swc/core's own separate cascading .swcrc
// discovery are involved, so pointing .swcrc at a correct absolute path
// wasn't enough to stop the Rust panic ("base_dir(`./`) must be absolute").
// Compiling by hand here with swcrc/configFile disabled sidesteps that
// machinery altogether instead of fighting it.
const swc = require('@swc/core');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const distRoot = path.join(root, 'apps/orchestrator/dist');

const sources = [
  { src: 'apps/orchestrator/src', out: 'apps/orchestrator/dist/apps/orchestrator/src' },
  {
    src: 'libraries/nestjs-libraries/src',
    out: 'apps/orchestrator/dist/libraries/nestjs-libraries/src',
  },
  { src: 'libraries/helpers/src', out: 'apps/orchestrator/dist/libraries/helpers/src' },
];

const aliasRoots = {
  '@gitroom/nestjs-libraries': path.join(
    distRoot,
    'libraries/nestjs-libraries/src'
  ),
  '@gitroom/helpers': path.join(distRoot, 'libraries/helpers/src'),
  '@gitroom/orchestrator': path.join(distRoot, 'apps/orchestrator/src'),
};

// Same aliases, but pointing at the sources. Whether `@gitroom/x/y` is a module
// or a directory with an index has to be decided from the source tree: the dist
// tree is still being written, so a package compiled before its dependency
// would resolve every directory import to a non-existent `<dir>.js`.
const aliasSourceRoots = {
  '@gitroom/nestjs-libraries': path.join(root, 'libraries/nestjs-libraries/src'),
  '@gitroom/helpers': path.join(root, 'libraries/helpers/src'),
  '@gitroom/orchestrator': path.join(root, 'apps/orchestrator/src'),
};

const isSourceFile = (base) =>
  ['.ts', '.tsx'].some((ext) => fs.existsSync(base + ext));

const hasSourceIndex = (dir) =>
  fs.existsSync(dir) &&
  fs.statSync(dir).isDirectory() &&
  ['index.ts', 'index.tsx'].some((name) => fs.existsSync(path.join(dir, name)));

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (
      /\.(ts|tsx)$/.test(ent.name) &&
      !ent.name.endsWith('.d.ts') &&
      !ent.name.includes('.spec.') &&
      !ent.name.includes('.test.')
    )
      acc.push(p);
  }
  return acc;
}

function rewriteRequires(code, fileOut) {
  return code.replace(
    /require\((['"])(@gitroom\/[^'"]+)\1\)/g,
    (m, q, req) => {
      for (const [a, rootDir] of Object.entries(aliasRoots)) {
        if (req === a || req.startsWith(a + '/')) {
          const rest = req === a ? '' : req.slice(a.length + 1);
          const segments = rest ? rest.split('/') : [];
          const target = segments.length
            ? path.join(rootDir, ...segments)
            : rootDir;
          const sourceTarget = segments.length
            ? path.join(aliasSourceRoots[a], ...segments)
            : aliasSourceRoots[a];
          // Bare alias and directory imports resolve to the directory's index.
          let cand = target + '.js';
          if (!isSourceFile(sourceTarget) && hasSourceIndex(sourceTarget)) {
            cand = path.join(target, 'index.js');
          }
          let rel = path
            .relative(path.dirname(fileOut), cand)
            .split(path.sep)
            .join('/');
          if (!rel.startsWith('.')) rel = './' + rel;
          return 'require(' + q + rel + q + ')';
        }
      }
      return m;
    }
  );
}

/**
 * SWC emits live export getters which break Nest circular DI graphs
 * (TDZ: Cannot access 'X' before initialization). Convert to tsc-style
 * `exports.X = void 0` + trailing `exports.X = X`.
 */
function fixExportGetters(code) {
  const names = [];
  const getterRe =
    /Object\.defineProperty\(exports,\s*["']([^"']+)["'],\s*\{\s*enumerable:\s*true,\s*get:\s*function\(\)\s*\{\s*return\s+([A-Za-z0-9_$]+);\s*\}\s*\}\);/g;

  let next = code.replace(getterRe, (_m, exportName, localName) => {
    names.push([exportName, localName]);
    return 'exports.' + exportName + ' = void 0;';
  });

  if (!names.length) return code;

  // Also handle multi-line getter form
  const multiRe =
    /Object\.defineProperty\(exports,\s*["']([^"']+)["'],\s*\{\s*\n\s*enumerable:\s*true,\s*\n\s*get:\s*function\(\)\s*\{\s*\n\s*return\s+([A-Za-z0-9_$]+);\s*\n\s*\}\s*\n\s*\}\);/g;
  next = next.replace(multiRe, (_m, exportName, localName) => {
    if (!names.find((n) => n[0] === exportName)) {
      names.push([exportName, localName]);
    }
    return 'exports.' + exportName + ' = void 0;';
  });

  const assigns = names
    .map(([exportName, localName]) => 'exports.' + exportName + ' = ' + localName + ';')
    .join('\n');
  return next + '\n' + assigns + '\n';
}

let ok = 0;
let fail = 0;
const failures = [];
for (const { src, out } of sources) {
  const absSrc = path.join(root, src);
  const absOut = path.join(root, out);
  const files = walk(absSrc);
  for (const file of files) {
    const rel = path.relative(absSrc, file);
    const outFile = path.join(absOut, rel.replace(/\.tsx?$/, '.js'));
    try {
      const input = fs.readFileSync(file, 'utf8');
      const { code } = swc.transformSync(input, {
        filename: file,
        swcrc: false,
        configFile: false,
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: file.endsWith('.tsx'),
            decorators: true,
          },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: 'es2021',
          keepClassNames: true,
        },
        module: { type: 'commonjs' },
        sourceMaps: false,
      });
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      const fixed = fixExportGetters(rewriteRequires(code, outFile));
      fs.writeFileSync(outFile, fixed);
      ok++;
    } catch (e) {
      fail++;
      if (failures.length < 20) {
        failures.push(rel + ': ' + String(e.message).split('\n')[0]);
      }
    }
  }
}
console.log(JSON.stringify({ ok, fail, failures }, null, 2));
if (fail > 0) process.exit(1);
