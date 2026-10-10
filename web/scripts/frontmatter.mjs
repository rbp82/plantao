/* Front matter dos protocolos (YAML simples: `chave: valor` por linha, entre `---`).
   Puro, sem Node nem DOM: usado pelo gerador do índice (scripts/protocolos.mjs) e pelo app (src/lib/protocols.ts). */

/** @returns {{ data: Record<string, string>, body: string }} */
export function parseFrontMatter(md) {
  const m = md.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: md.replace(/^﻿/, '') };
  const data = {};
  m[1].split(/\r?\n/).forEach((line) => {
    const i = line.indexOf(':');
    if (i > 0) data[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  });
  return { data, body: md.slice(m[0].length) };
}

/** primeiro "# Título" do corpo, ou null */
export function firstHeading(md) {
  const m = md.match(/^#\s+(.+?)\s*#*\s*$/m);
  return m ? m[1].trim() : null;
}

/** nome de arquivo/pasta → texto legível ("choque-septico" → "Choque septico") */
export const titleFromName = (s) => {
  const t = s.replace(/\.md$/i, '').replace(/[-_]+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** caminho dentro de protocolos/ → id estável da rota (sem extensão, minúsculas, só [a-z0-9/-]) */
export const slugOf = (file) => file.replace(/\.md$/i, '')
  .normalize('NFKD').replace(/[̀-ͯ]/g, '') /* NFKD: também "ª"→"a", "²"→"2" */
  .toLowerCase().replace(/[^a-z0-9/]+/g, '-').replace(/^-|-$/g, '');

/** metadados de um protocolo a partir do caminho relativo (dentro de protocolos/) e do conteúdo */
export function metaOf(file, md) {
  const { data, body } = parseFrontMatter(md);
  const parts = file.split('/');
  const name = parts[parts.length - 1];
  return {
    file,
    slug: slugOf(file),
    title: data.titulo || data.title || firstHeading(body) || titleFromName(name),
    category: data.categoria || data.category || (parts.length > 1 ? titleFromName(parts[0]) : 'Geral'),
    summary: data.resumo || data.summary || undefined,
    updated: data.atualizado || data.updated || undefined,
    author: data.autor || data.author || undefined,
    order: Number(data.ordem || data.order) || 999,
  };
}
