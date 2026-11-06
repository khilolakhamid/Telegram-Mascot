#!/usr/bin/env node
/**
 * Builds screen/dist/preview.html — one self-contained page with the iPhone preview:
 * the Figma screen and the animated dog from ../mascot (its sources are bundled unchanged).
 *
 *   node screen/tools/build-preview.mjs
 *
 * Needs Node 18+ and TypeScript (used only to compile JSX/TSX): `npm i -g typescript` or a local install.
 * Imports resolve like Vite: extensionless paths, folder index files and `file.svg?raw` text imports.
 * React 18.3.1 is loaded from cdnjs by the page. Options:
 *   --react-bundle <file.js>   inline a prebuilt script that sets window.React / window.ReactDOM
 *                              instead of the CDN tags (offline preview)
 *   --out <file.html>          output path (default screen/dist/preview.html)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const SCREEN = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(SCREEN, '..');
const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const OUT = resolve(opt('--out') || resolve(SCREEN, 'dist/preview.html'));

function loadTypeScript() {
  const req = createRequire(import.meta.url);
  try { return req('typescript'); } catch {}
  const globalRoot = execSync('npm root -g').toString().trim();
  return req(resolve(globalRoot, 'typescript'));
}
const ts = loadTypeScript();

// Packages provided by the page as globals
const EXTERNALS = {
  react: 'window.React',
  'react-dom': 'window.ReactDOM',
  'react-dom/client': 'window.ReactDOM'
};

const modules = new Map(); // id -> code

// Vite-style resolution: extensionless paths, folder index files, `?raw` text imports
const EXTENSIONS = ['', '.tsx', '.ts', '.jsx', '.js', '.json', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
function resolveFile(base) {
  for (const ext of EXTENSIONS) {
    const f = base + ext;
    if (existsSync(f) && statSync(f).isFile()) return f;
  }
  return null;
}

function addModule(file, raw = false) {
  const id = relative(ROOT, file).split('\\').join('/') + (raw ? '?raw' : '');
  if (modules.has(id)) return id;
  modules.set(id, null);
  const src = readFileSync(file, 'utf8');
  let code;
  if (raw) {
    code = `module.exports = ${JSON.stringify(src)};`;
  } else if (extname(file) === '.json') {
    code = `module.exports = ${src.trim()};`;
  } else {
    code = ts.transpileModule(src, {
      fileName: file,
      compilerOptions: {
        target: ts.ScriptTarget.ES2019,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,           // React.createElement; React is a page global
        esModuleInterop: true,
        resolveJsonModule: true
      }
    }).outputText;
  }
  code = code.replace(/require\("([^"]+)"\)/g, (m, spec) => {
    if (EXTERNALS[spec]) return EXTERNALS[spec];
    const [path, query] = spec.split('?');
    const target = resolveFile(resolve(dirname(file), path));
    if (!target) throw new Error(`Cannot resolve ${spec} from ${file}`);
    return `__require(${JSON.stringify(addModule(target, query === 'raw'))})`;
  });
  modules.set(id, code);
  return id;
}

const entry = addModule(resolve(SCREEN, 'main.jsx'));
const bundle = `(function () {
var React = window.React;
var __defs = {
${[...modules].map(([id, code]) => `${JSON.stringify(id)}: function (module, exports) {\n${code}\n}`).join(',\n')}
};
var __cache = {};
function __require(id) {
  if (__cache[id]) return __cache[id].exports;
  var module = __cache[id] = { exports: {} };
  __defs[id](module, module.exports);
  return module.exports;
}
__require(${JSON.stringify(entry)});
})();`;

const reactBundle = opt('--react-bundle');
const reactTags = reactBundle
  ? `<script>${readFileSync(reactBundle, 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`
  : `<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>`;

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Профиль Chloe</title>
<style>
${readFileSync(resolve(SCREEN, 'styles.css'), 'utf8')}
</style>
</head>
<body>
<div id="root"></div>
${reactTags}
<script>
${bundle.replace(/<\/script/gi, '<\\/script')}
</script>
</body>
</html>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
console.log(`preview: ${relative(process.cwd(), OUT)} (${modules.size} modules, ${(html.length / 1024).toFixed(0)} KB)`);
