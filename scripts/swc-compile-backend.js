const swc = require('@swc/core');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const distRoot = path.join(root, 'apps/backend/dist');

const sources = [
  { src: 'apps/backend/src', out: 'apps/backend/dist/apps/backend/src' },
  {
    src: 'libraries/nestjs-libraries/src',
    out: 'apps/backend/dist/libraries/nestjs-libraries/src',
  },
  { src: 'libraries/helpers/src', out: 'apps/backend/dist/libraries/helpers/src' },
];

const aliasRoots = {
  '@gitroom/nestjs-libraries': path.join(
    distRoot,
    'libraries/nestjs-libraries/src'
  ),
  '@gitroom/helpers': path.join(distRoot, 'libraries/helpers/src'),
  '@gitroom/backend': path.join(distRoot, 'apps/backend/src'),
};

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
          let target = rest
            ? path.join(rootDir, ...rest.split('/'))
            : rootDir;
          let cand = target + '.js';
          if (!fs.existsSync(cand)) {
            const idx = path.join(target, 'index.js');
            if (fs.existsSync(idx)) cand = idx;
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
