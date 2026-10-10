/* Protocolos: arquivos Markdown da pasta `protocolos/` do repositório, publicados junto com o app.
   O build (scripts/postbuild.mjs) copia a pasta para `protocolos/` dentro do site e gera `protocolos/index.json`
   com título, categoria, resumo etc. lidos do cabeçalho de cada arquivo; em desenvolvimento o Vite serve a pasta
   direto (scripts/protocolos.mjs). Tudo vem da mesma origem do app — sem a API do GitHub nem limite de requisições —
   e o service worker guarda esses arquivos para uso offline (rede primeiro; cópia local quando não há rede).
   Publicar/editar um protocolo = editar o .md no GitHub: o push dispara o build e o site é atualizado em 1–2 min.
   Convenções (protocolos/_LEIAME.md): subpasta = categoria; cabeçalho opcional titulo/categoria/resumo/atualizado/autor/ordem;
   arquivos e pastas iniciados por "_" são ignorados; imagens ficam ao lado do .md e são referenciadas por caminho relativo. */
import { parseFrontMatter, slugOf } from '../../scripts/frontmatter.mjs';

export const REPO = { owner: 'rbp82', name: 'plantao', branch: 'main', dir: 'protocolos' };
/* raiz dos protocolos dentro do site (termina em "/") */
export const PROTO_BASE = import.meta.env.BASE_URL + 'protocolos/';

export interface ProtocolMeta {
  file: string;        /* caminho dentro de protocolos/ (ex.: sepse/choque-septico.md) */
  slug: string;        /* id estável para a rota (#/protocolo?id=slug) */
  title: string;
  category: string;
  summary?: string;
  updated?: string;
  author?: string;
  order: number;
  sha: string;         /* impressão do conteúdo: muda quando o arquivo muda */
}
export interface ProtocolIndex { items: ProtocolMeta[]; generatedAt: string }
export interface ProtocolDoc { meta: ProtocolMeta; body: string }

/* url do arquivo publicado e da pasta em que ele está (para imagens e links relativos) */
export const fileUrl = (file: string) => PROTO_BASE + file.split('/').map(encodeURIComponent).join('/');
export const assetBase = (file: string) => { const i = file.lastIndexOf('/'); return PROTO_BASE + (i < 0 ? '' : file.slice(0, i + 1)); };
/* href de um link relativo dentro de um protocolo → slug do protocolo apontado (ou null se não for um .md da pasta) */
export function linkedSlug(href: string): string | null {
  if (!href.startsWith(PROTO_BASE) || !/\.md(#.*)?$/i.test(href)) return null;
  try { return slugOf(decodeURIComponent(href.slice(PROTO_BASE.length).replace(/#.*$/, ''))); } catch { return null; }
}

/* ---------- índice ---------- */
let mem: { index: ProtocolIndex; at: number } | null = null;
const FRESH = 60 * 1000; /* reaproveita o índice em memória por 1 min entre telas */

/* lê o índice; `force` ignora a cópia em memória e pede à rede (o service worker devolve a cópia local sem rede) */
export async function loadIndex(force = false): Promise<ProtocolIndex | null> {
  if (mem && !force && Date.now() - mem.at < FRESH) return mem.index;
  try {
    const r = await fetch(PROTO_BASE + 'index.json', { cache: force ? 'reload' : 'no-cache' });
    if (!r.ok) throw new Error(String(r.status));
    const index = (await r.json()) as ProtocolIndex;
    if (!Array.isArray(index.items)) throw new Error('índice inválido');
    mem = { index, at: Date.now() };
    return index;
  } catch {
    return mem?.index ?? null;
  }
}

/* ---------- documentos ---------- */
const docs = new Map<string, ProtocolDoc>(); /* chave: slug + sha */

export async function loadDoc(meta: ProtocolMeta): Promise<ProtocolDoc | null> {
  const key = meta.slug + '@' + meta.sha;
  const hit = docs.get(key);
  if (hit) return hit;
  try {
    const r = await fetch(fileUrl(meta.file), { cache: 'no-cache' });
    if (!r.ok) throw new Error(String(r.status));
    const { body } = parseFrontMatter(await r.text());
    const doc: ProtocolDoc = { meta, body };
    docs.set(key, doc);
    return doc;
  } catch {
    return null;
  }
}

/* corpo já carregado (para a busca no texto), sem ir à rede */
export const cachedBody = (meta: ProtocolMeta) => docs.get(meta.slug + '@' + meta.sha)?.body;

/* carrega todos os corpos (busca no texto completo); chama `onEach` conforme chegam */
export async function prefetchAll(index: ProtocolIndex, onEach?: () => void) {
  for (const it of index.items) {
    if (cachedBody(it) !== undefined) continue;
    await loadDoc(it);
    onEach?.();
  }
}

/* ---------- edição no GitHub ---------- */
export const editUrl = (file: string) => `https://github.com/${REPO.owner}/${REPO.name}/edit/${REPO.branch}/${REPO.dir}/${file}`;
export const newUrl = () => `https://github.com/${REPO.owner}/${REPO.name}/new/${REPO.branch}/${REPO.dir}`;

/* cache do mecanismo anterior (API do GitHub): não é mais usado */
if (typeof caches !== 'undefined') caches.delete('plantao-protocolos-v1').catch(() => {});
