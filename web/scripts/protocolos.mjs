/* Protocolos: a pasta ../protocolos/ do repositório vira protocolos/ dentro do site publicado,
   com um protocolos/index.json gerado a partir do cabeçalho de cada .md.
   Usado por scripts/postbuild.mjs (build) e por vite.config.ts (servidor de desenvolvimento).
   Regras (iguais às de protocolos/_LEIAME.md): subpasta = categoria; arquivos e pastas iniciados por "_" são ignorados;
   qualquer outro arquivo (imagens) é copiado junto, para ser referenciado com caminho relativo no Markdown. */
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { metaOf, parseFrontMatter } from './frontmatter.mjs';

const ignored = (rel) => rel.split('/').some((p) => p.startsWith('_') || p.startsWith('.'));

/** lista os arquivos (caminhos relativos com "/") da pasta, sem os ignorados */
export function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : out.push(p); } };
  walk(dir);
  return out.map((p) => relative(dir, p).split('\\').join('/')).filter((r) => !ignored(r)).sort();
}

/** índice dos protocolos: um item por .md, com título/categoria/resumo lidos do cabeçalho */
export function buildIndex(dir) {
  const items = listFiles(dir).filter((f) => /\.md$/i.test(f)).map((file) => {
    const md = readFileSync(join(dir, file), 'utf8');
    const sha = createHash('sha1').update(md).digest('hex').slice(0, 12);
    const { data } = parseFrontMatter(md);
    return { ...metaOf(file, md), sha, _own: !!(data.categoria || data.category) };
  });
  /* "categoria:" declarada em um arquivo vale para os vizinhos da mesma pasta que não a declaram
     (assim o nome com acento — "Metabólico" — é escrito uma vez por pasta) */
  const folderOf = (f) => (f.includes('/') ? f.slice(0, f.lastIndexOf('/')) : '');
  const declared = new Map();
  for (const it of items) if (it._own && !declared.has(folderOf(it.file))) declared.set(folderOf(it.file), it.category);
  for (const it of items) { if (!it._own && declared.has(folderOf(it.file))) it.category = declared.get(folderOf(it.file)); delete it._own; }
  items.sort((a, b) => a.category.localeCompare(b.category, 'pt-BR') || a.order - b.order || a.title.localeCompare(b.title, 'pt-BR'));
  return { items, generatedAt: new Date().toISOString() };
}

/** copia a pasta (sem os ignorados) para dest/ e grava dest/index.json; devolve os caminhos relativos gravados */
export function publish(dir, dest) {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  const files = listFiles(dir);
  for (const f of files) cpSync(join(dir, f), join(dest, f));
  writeFileSync(join(dest, 'index.json'), JSON.stringify(buildIndex(dir)));
  return [...files, 'index.json'];
}

const TYPES = { md: 'text/markdown; charset=utf-8', json: 'application/json; charset=utf-8', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', pdf: 'application/pdf', txt: 'text/plain; charset=utf-8' };

/** middleware do Vite (dev): serve <base>protocolos/** direto da pasta do repositório, com index.json gerado a cada pedido */
export function devMiddleware(dir, base) {
  const prefix = base.replace(/\/?$/, '/') + 'protocolos/';
  return (req, res, next) => {
    const url = (req.url || '').split('?')[0];
    if (!url.startsWith(prefix)) return next();
    const rel = decodeURIComponent(url.slice(prefix.length));
    const send = (body, type) => { res.setHeader('content-type', type); res.setHeader('cache-control', 'no-store'); res.end(body); };
    if (rel === 'index.json') return send(JSON.stringify(buildIndex(dir)), TYPES.json);
    if (!rel || rel.includes('..') || ignored(rel)) { res.statusCode = 404; return res.end(); }
    const p = join(dir, rel);
    if (!existsSync(p) || statSync(p).isDirectory()) { res.statusCode = 404; return res.end(); }
    const ext = rel.split('.').pop().toLowerCase();
    send(readFileSync(p), TYPES[ext] || 'application/octet-stream');
  };
}
