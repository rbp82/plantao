/* Protocolos: cabeçalho, slugs, resolução de links/imagens relativos e o índice gerado no build. */
import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseFrontMatter, firstHeading, slugOf, metaOf, titleFromName } from '../../scripts/frontmatter.mjs';
import { buildIndex, listFiles } from '../../scripts/protocolos.mjs';
import { assetBase, fileUrl, linkedSlug, PROTO_BASE } from './protocols';

describe('cabeçalho (front matter)', () => {
  it('lê chave: valor, ignora aspas e aceita CRLF e BOM', () => {
    const { data, body } = parseFrontMatter('﻿---\r\ntitulo: "Choque séptico"\r\nordem: 2\r\n---\r\n# Título\r\ntexto');
    expect(data).toEqual({ titulo: 'Choque séptico', ordem: '2' });
    expect(body).toBe('# Título\r\ntexto');
  });
  it('sem cabeçalho devolve o texto inteiro', () => {
    expect(parseFrontMatter('# Só título\n')).toEqual({ data: {}, body: '# Só título\n' });
  });
  it('valor com dois-pontos (hora, url) fica inteiro', () => {
    expect(parseFrontMatter('---\nresumo: Meta: PAM ≥ 65 em 1 h\n---\n').data.resumo).toBe('Meta: PAM ≥ 65 em 1 h');
  });
  it('primeiro # do corpo vira título quando não há titulo:', () => {
    expect(firstHeading('texto\n\n# Hipercalemia ##\n## Outro')).toBe('Hipercalemia');
    expect(firstHeading('sem título')).toBeNull();
  });
});

describe('slug e nomes', () => {
  it('slug é estável, minúsculo, sem acento e sem extensão', () => {
    expect(slugOf('sepse/Choque Séptico — 1ª hora.md')).toBe('sepse/choque-septico-1a-hora');
    expect(slugOf('metabolico/hipercalemia.md')).toBe('metabolico/hipercalemia');
  });
  it('nome de arquivo/pasta vira texto legível', () => {
    expect(titleFromName('choque-septico-primeira-hora.md')).toBe('Choque septico primeira hora');
    expect(titleFromName('metabolico')).toBe('Metabolico');
  });
  it('metadados: subpasta = categoria, raiz = Geral, cabeçalho sobrescreve', () => {
    expect(metaOf('sepse/x.md', '# X')).toMatchObject({ title: 'X', category: 'Sepse', order: 999, slug: 'sepse/x' });
    expect(metaOf('solto.md', 'sem titulo')).toMatchObject({ title: 'Solto', category: 'Geral' });
    expect(metaOf('a/b.md', '---\ntitulo: T\ncategoria: C\nordem: 3\nresumo: R\n---\n')).toMatchObject({ title: 'T', category: 'C', order: 3, summary: 'R' });
  });
});

describe('links e imagens relativos', () => {
  it('url do arquivo é codificada por segmento; a base das imagens é a pasta do arquivo', () => {
    expect(fileUrl('sepse/choque séptico.md')).toBe(PROTO_BASE + 'sepse/choque%20s%C3%A9ptico.md');
    expect(assetBase('sepse/choque.md')).toBe(PROTO_BASE + 'sepse/');
    expect(assetBase('solto.md')).toBe(PROTO_BASE);
  });
  it('link para outro .md da pasta vira slug; o resto não', () => {
    expect(linkedSlug(PROTO_BASE + 'metabolico/hipercalemia.md')).toBe('metabolico/hipercalemia');
    expect(linkedSlug(PROTO_BASE + 'metabolico/hipercalemia.md#tratamento')).toBe('metabolico/hipercalemia');
    expect(linkedSlug(PROTO_BASE + 'sepse/fluxo.png')).toBeNull();
    expect(linkedSlug('https://example.org/x.md')).toBeNull();
  });
});

describe('índice gerado no build (scripts/protocolos.mjs)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'protocolos-'));
  mkdirSync(join(dir, 'metabolico'), { recursive: true });
  mkdirSync(join(dir, '_rascunhos'), { recursive: true });
  writeFileSync(join(dir, '_LEIAME.md'), '# ignorado');
  writeFileSync(join(dir, '_rascunhos/x.md'), '# ignorado');
  writeFileSync(join(dir, 'metabolico/hipercalemia.md'), '---\ntitulo: Hipercalemia\ncategoria: Metabólico\nordem: 1\n---\n# H');
  writeFileSync(join(dir, 'metabolico/hiponatremia.md'), '# Hiponatremia');
  writeFileSync(join(dir, 'metabolico/fluxo.png'), 'png');
  writeFileSync(join(dir, 'avulso.md'), '# Avulso');
  const idx = buildIndex(dir);
  const files = listFiles(dir);
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  it('ignora arquivos e pastas iniciados por _ e copia imagens junto', () => {
    expect(files).toEqual(['avulso.md', 'metabolico/fluxo.png', 'metabolico/hipercalemia.md', 'metabolico/hiponatremia.md']);
  });
  it('um .md por item, ordenado por categoria/ordem/título, com sha do conteúdo', () => {
    expect(idx.items.map((i) => [i.slug, i.category, i.title])).toEqual([
      ['avulso', 'Geral', 'Avulso'],
      ['metabolico/hipercalemia', 'Metabólico', 'Hipercalemia'],
      ['metabolico/hiponatremia', 'Metabólico', 'Hiponatremia'],
    ]);
    expect(idx.items.every((i) => /^[0-9a-f]{12}$/.test(i.sha))).toBe(true);
    expect(idx.items.some((i) => '_own' in i)).toBe(false);
  });
  it('categoria com acento declarada em um arquivo vale para os vizinhos da pasta', () => {
    expect(idx.items.find((i) => i.slug === 'metabolico/hiponatremia')?.category).toBe('Metabólico');
  });
});
