/* Pós-build: deixa dist/ pronto para o GitHub Pages (raiz do repositório rbp82/plantao).
   1. gera dist/sw.js com a lista de arquivos a pré-cachear (nomes com hash) e uma versão derivada do conteúdo;
   2. copia o app legado (../index.html, ../sw.js, ../manifest.webmanifest, ../assets/**) "plano" em dist/legado/,
      do mesmo jeito que build-deploy.ps1 fazia para a raiz;
   3. publica ../protocolos/ em dist/protocolos/ com index.json gerado (scripts/protocolos.mjs) — entra no pré-cache;
   4. cria .nojekyll.
   Uso: node scripts/postbuild.mjs (chamado por `npm run build`). */
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publish as publishProtocolos } from './protocolos.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, '..');
const root = resolve(web, '..');
const dist = join(web, 'dist');
if (!existsSync(join(dist, 'index.html'))) throw new Error('dist/index.html não existe — rode `vite build` antes');

/* ---------- 2. legado ---------- */
const legado = join(dist, 'legado');
rmSync(legado, { recursive: true, force: true });
mkdirSync(legado, { recursive: true });
const flat = (t) => t.replace(/assets\/(css|js\/tools|js|icons|ocr)\//g, '');
for (const f of ['index.html', 'manifest.webmanifest', 'sw.js']) {
  writeFileSync(join(legado, f), flat(readFileSync(join(root, f), 'utf8')));
}
const walk = (dir, out = []) => { for (const n of readdirSync(dir)) { const p = join(dir, n); statSync(p).isDirectory() ? walk(p, out) : out.push(p); } return out; };
for (const p of walk(join(root, 'assets'))) cpSync(p, join(legado, relative(dirname(p), p)));
/* confere que tudo citado no index.html e no SHELL do sw.js do legado existe */
const refs = (readFileSync(join(legado, 'index.html'), 'utf8') + readFileSync(join(legado, 'sw.js'), 'utf8'))
  .matchAll(/(?:src|href)="([^"#:]+)"|'([\w.-]+\.(?:js|css|png|svg|webmanifest|html))'/g);
const missing = [...refs].map((m) => m[1] || m[2]).filter((n) => n && !existsSync(join(legado, n)));
if (missing.length) throw new Error('legado: arquivos citados e ausentes: ' + missing.join(', '));

/* ---------- 3. protocolos ---------- */
const protocolos = publishProtocolos(join(root, 'protocolos'), join(dist, 'protocolos'));

/* ---------- 1. service worker ---------- */
const files = walk(dist)
  .map((p) => relative(dist, p).split('\\').join('/'))
  .filter((p) => !p.startsWith('legado/') && !p.startsWith('.vite/') && p !== 'sw.js' && p !== '.nojekyll');
const precache = ['./', ...files.filter((p) => p !== 'index.html')];
const hash = createHash('sha256');
for (const p of files) hash.update(p).update(readFileSync(join(dist, p)));
/* versão = package.json + impressão do conteúdo: muda sozinha a cada build diferente */
const pkg = JSON.parse(readFileSync(join(web, 'package.json'), 'utf8'));
const version = `${pkg.version}-${hash.digest('hex').slice(0, 10)}`;
const sw = readFileSync(join(here, 'sw.template.js'), 'utf8')
  .replace('__VERSION__', version)
  .replace('__PRECACHE__', JSON.stringify(precache, null, 2));
writeFileSync(join(dist, 'sw.js'), sw);

/* ---------- 3. Pages ---------- */
writeFileSync(join(dist, '.nojekyll'), '');
rmSync(join(dist, '.vite'), { recursive: true, force: true });

const size = (p) => statSync(p).size;
const total = walk(dist).reduce((s, p) => s + size(p), 0);
console.log(`dist/ pronto: ${files.length} arquivos no pré-cache (incl. ${protocolos.length} de protocolos/), legado em dist/legado/ (${walk(legado).length} arquivos), ${(total / 1048576).toFixed(1)} MB no total — sw ${version}`);
