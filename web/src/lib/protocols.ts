/* Protocolos: arquivos Markdown na pasta `protocolos/` do repositório do app no GitHub.
   Quem edita no GitHub publica; o app lista a pasta pela API (uma requisição), baixa o .md
   pelo raw.githubusercontent.com e guarda tudo no Cache Storage para funcionar sem internet.
   Convenções:
   - subpasta = categoria (ex.: protocolos/sepse/choque-septico.md → categoria "Sepse")
   - título = front matter `titulo:` ou primeiro "# Título" ou o nome do arquivo
   - front matter opcional (YAML simples): titulo, categoria, resumo, atualizado, autor, ordem
   - arquivos e pastas iniciados por "_" são ignorados (ex.: _modelo.md) */
export const REPO = { owner: 'rbp82', name: 'plantao', branch: 'main', dir: 'protocolos' };

export interface ProtocolMeta {
  path: string;        /* caminho no repositório */
  slug: string;        /* id estável para a rota */
  title: string;
  category: string;
  summary?: string;
  updated?: string;
  author?: string;
  order: number;
  sha: string;
}
export interface ProtocolIndex { items: ProtocolMeta[]; fetchedAt: number; sha: string }
export interface ProtocolDoc { meta: ProtocolMeta; body: string; fetchedAt: number }

const CACHE = 'plantao-protocolos-v1';
const API = `https://api.github.com/repos/${REPO.owner}/${REPO.name}/git/trees/${REPO.branch}?recursive=1`;
const RAW = (path: string) => `https://raw.githubusercontent.com/${REPO.owner}/${REPO.name}/${REPO.branch}/${path}`;
const INDEX_KEY = 'https://plantao.local/protocolos/index.json';

const title = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\.md$/i, '').replace(/^\w/, (c) => c.toUpperCase());
const slugOf = (path: string) => path.replace(/^protocolos\//, '').replace(/\.md$/i, '').replace(/[^\w/-]+/g, '-').toLowerCase();

async function cacheGet<T>(key: string): Promise<T | null> {
  try { const c = await caches.open(CACHE); const r = await c.match(key); return r ? ((await r.json()) as T) : null; } catch { return null; }
}
async function cachePut(key: string, v: unknown) {
  try { const c = await caches.open(CACHE); await c.put(key, new Response(JSON.stringify(v), { headers: { 'content-type': 'application/json' } })); } catch { /* sem cache */ }
}

/* front matter simples: chave: valor por linha, entre --- */
export function parseFrontMatter(md: string): { data: Record<string, string>; body: string } {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: md };
  const data: Record<string, string> = {};
  m[1].split(/\r?\n/).forEach((line) => {
    const i = line.indexOf(':');
    if (i > 0) data[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  });
  return { data, body: md.slice(m[0].length) };
}
export function firstHeading(md: string): string | null {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

/* lista a pasta no GitHub; devolve o índice da rede ou, sem rede, o do cache */
export async function loadIndex(force = false): Promise<{ index: ProtocolIndex | null; offline: boolean }> {
  const cached = await cacheGet<ProtocolIndex>(INDEX_KEY);
  if (cached && !force && Date.now() - cached.fetchedAt < 10 * 60 * 1000) return { index: cached, offline: false };
  try {
    const r = await fetch(API, { headers: { accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error(String(r.status));
    const tree = (await r.json()) as { sha: string; tree: { path: string; type: string; sha: string }[] };
    const files = tree.tree.filter((t) => t.type === 'blob' && t.path.startsWith(REPO.dir + '/') && /\.md$/i.test(t.path) && !t.path.split('/').some((p) => p.startsWith('_')));
    const prev = new Map((cached?.items || []).map((i) => [i.path, i]));
    const items: ProtocolMeta[] = files.map((f) => {
      const parts = f.path.split('/');
      const file = parts[parts.length - 1];
      const old = prev.get(f.path);
      /* metadados de cabeçalho vêm do próprio .md quando ele é aberto; aqui fica o que dá para saber pela árvore */
      return old && old.sha === f.sha ? old : {
        path: f.path, slug: slugOf(f.path), sha: f.sha,
        title: title(file), category: parts.length > 2 ? title(parts[1]) : 'Geral', order: 999,
      };
    });
    const index: ProtocolIndex = { items, fetchedAt: Date.now(), sha: tree.sha };
    await cachePut(INDEX_KEY, index);
    return { index, offline: false };
  } catch {
    return { index: cached, offline: true };
  }
}

/* carrega um protocolo; atualiza título/categoria/resumo no índice a partir do arquivo */
export async function loadDoc(meta: ProtocolMeta, force = false): Promise<{ doc: ProtocolDoc | null; offline: boolean }> {
  const key = RAW(meta.path) + '?sha=' + meta.sha;
  const cached = await cacheGet<ProtocolDoc>(key);
  if (cached && !force) return { doc: cached, offline: false };
  try {
    const r = await fetch(RAW(meta.path), { cache: 'no-cache' });
    if (!r.ok) throw new Error(String(r.status));
    const md = await r.text();
    const { data, body } = parseFrontMatter(md);
    const m: ProtocolMeta = {
      ...meta,
      title: data.titulo || data.title || firstHeading(body) || meta.title,
      category: data.categoria || data.category || meta.category,
      summary: data.resumo || data.summary || meta.summary,
      updated: data.atualizado || data.updated || meta.updated,
      author: data.autor || data.author || meta.author,
      order: Number(data.ordem || data.order) || meta.order,
    };
    const doc: ProtocolDoc = { meta: m, body, fetchedAt: Date.now() };
    await cachePut(key, doc);
    const idx = await cacheGet<ProtocolIndex>(INDEX_KEY);
    if (idx) { idx.items = idx.items.map((i) => (i.path === m.path ? m : i)); await cachePut(INDEX_KEY, idx); }
    return { doc, offline: false };
  } catch {
    return { doc: cached, offline: true };
  }
}

/* baixa todos os protocolos para uso offline (chamado ao abrir a lista com rede) */
export async function prefetchAll(index: ProtocolIndex) {
  for (const it of index.items) { try { await loadDoc(it); } catch { /* segue */ } }
}
export const editUrl = (path: string) => `https://github.com/${REPO.owner}/${REPO.name}/edit/${REPO.branch}/${path}`;
export const newUrl = () => `https://github.com/${REPO.owner}/${REPO.name}/new/${REPO.branch}/${REPO.dir}`;
