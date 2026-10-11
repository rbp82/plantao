/* Pós-build: deixa dist/ pronto para o GitHub Pages (raiz do repositório rbp82/plantao).
   1. publica ../protocolos/ em dist/protocolos/ com index.json gerado (scripts/protocolos.mjs);
   2. gera dist/sw.js com a lista de arquivos a pré-cachear (nomes com hash) e uma versão derivada do conteúdo;
      os arquivos do leitor de foto (dist/ocr/, ≈ 15 MB, vindos de public/ocr/) ficam fora do pré-cache:
      o service worker os guarda no primeiro uso;
   3. cria .nojekyll.
   Uso: node scripts/postbuild.mjs (chamado por `npm run build`). */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publish as publishProtocolos } from './protocolos.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, '..');
const root = resolve(web, '..');
const dist = join(web, 'dist');
if (!existsSync(join(dist, 'index.html'))) throw new Error('dist/index.html não existe — rode `vite build` antes');
const walk = (dir, out = []) => { for (const n of readdirSync(dir)) { const p = join(dir, n); statSync(p).isDirectory() ? walk(p, out) : out.push(p); } return out; };

/* ---------- 1. protocolos ---------- */
const protocolos = publishProtocolos(join(root, 'protocolos'), join(dist, 'protocolos'));

/* ---------- 2. service worker ---------- */
const files = walk(dist)
  .map((p) => relative(dist, p).split('\\').join('/'))
  .filter((p) => !p.startsWith('ocr/') && !p.startsWith('.vite/') && p !== 'sw.js' && p !== '.nojekyll');
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

const ocr = existsSync(join(dist, 'ocr')) ? walk(join(dist, 'ocr')).length : 0;
if (!ocr) throw new Error('dist/ocr/ vazio — os arquivos do Tesseract ficam em public/ocr/');
const total = walk(dist).reduce((s, p) => s + statSync(p).size, 0);
console.log(`dist/ pronto: ${files.length} arquivos no pré-cache (incl. ${protocolos.length} de protocolos/), ${ocr} arquivos do leitor de foto sob demanda, ${(total / 1048576).toFixed(1)} MB no total — sw ${version}`);
