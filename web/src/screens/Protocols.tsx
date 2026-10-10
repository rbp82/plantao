/* Protocolos: lista por categoria (busca no título, resumo e texto) e leitura do Markdown publicado junto com o app. */
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Button, SearchField, Skeleton, toast } from '@heroui/react';
import { ListView } from '@/components/pro';
import { BookOpenText, ChevronRight, CloudOff, ExternalLink, FilePlus2, RefreshCw, SearchX } from 'lucide-react';
import { C } from '@/lib/calc';
import { TopBar, Page } from '@/components/Shell';
import { Empty } from '@/components/ui';
import { cachedBody, editUrl, loadDoc, loadIndex, newUrl, prefetchAll, type ProtocolIndex, type ProtocolMeta, type ProtocolDoc } from '@/lib/protocols';

const ProtocolBody = lazy(() => import('./ProtocolBody'));

/* o service worker devolve a cópia local sem rede; aqui só avisamos que ela pode estar desatualizada */
function useOnline() {
  const [on, setOn] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const up = () => setOn(navigator.onLine);
    window.addEventListener('online', up); window.addEventListener('offline', up);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', up); };
  }, []);
  return on;
}

const byCat = (items: { meta: ProtocolMeta; hit?: string }[]) => {
  const m = new Map<string, { meta: ProtocolMeta; hit?: string }[]>();
  items.slice().sort((a, b) => a.meta.order - b.meta.order || a.meta.title.localeCompare(b.meta.title, 'pt-BR'))
    .forEach((i) => { const l = m.get(i.meta.category) || []; l.push(i); m.set(i.meta.category, l); });
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
};

/* trecho do texto em volta da primeira palavra encontrada (para mostrar por que o protocolo apareceu na busca) */
function snippet(body: string, words: string[]): string | undefined {
  const plain = body.replace(/[#>*_`|\-]+/g, ' ').replace(/\s+/g, ' ');
  const norm = C.norm(plain);
  const i = Math.min(...words.map((w) => norm.indexOf(w)).filter((x) => x >= 0));
  if (!Number.isFinite(i)) return undefined;
  const start = Math.max(0, i - 40);
  return (start ? '…' : '') + plain.slice(start, i + 80).trim() + '…';
}

export function Protocols({ query }: { query: URLSearchParams }) {
  const [idx, setIdx] = useState<ProtocolIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [, tick] = useState(0);
  const [q, setQ] = useState(query.get('q') || '');
  const online = useOnline();
  useEffect(() => { document.title = 'Protocolos — Plantão'; }, []);
  async function load(force = false) {
    setLoading(true);
    const index = await loadIndex(force);
    setIdx(index); setLoading(false);
    if (index) prefetchAll(index, () => tick((x) => x + 1));
    if (force) toast(index ? 'Protocolos atualizados' : 'Não foi possível atualizar');
  }
  useEffect(() => { load(); }, []);
  const words = useMemo(() => C.norm(q).split(/\s+/).filter(Boolean), [q]);
  const items = useMemo(() => {
    const all = idx?.items || [];
    if (!words.length) return all.map((meta) => ({ meta }));
    return all.flatMap((meta) => {
      const head = C.norm(meta.title + ' ' + meta.category + ' ' + (meta.summary || ''));
      if (words.every((w) => head.includes(w))) return [{ meta }];
      const body = cachedBody(meta);
      if (body && words.every((w) => head.includes(w) || C.norm(body).includes(w))) return [{ meta, hit: snippet(body, words) }];
      return [];
    });
  }, [idx, words, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <TopBar kicker="Do repositório da instituição" title="Protocolos" right={<Button variant="ghost" isIconOnly aria-label="Atualizar" className="size-11 rounded-xl" onPress={() => load(true)}><RefreshCw className={`size-5 ${loading ? 'animate-spin' : ''}`} /></Button>} />
      <Page>
        <SearchField value={q} onChange={setQ} aria-label="Buscar protocolo" fullWidth>
          <SearchField.Group className="h-12 rounded-2xl"><SearchField.SearchIcon /><SearchField.Input placeholder="Buscar protocolo ou termo…" className="text-[16px]" /><SearchField.ClearButton /></SearchField.Group>
        </SearchField>
        {!online && idx && <div className="mt-3 flex items-center gap-2 rounded-xl bg-warning-soft px-3.5 py-2.5 text-[13.5px] font-medium text-warning-soft-foreground"><CloudOff className="size-4 shrink-0" />Sem internet — mostrando a cópia guardada neste aparelho.</div>}
        {loading && !idx && <div className="mt-4 flex flex-col gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>}
        {idx && !items.length && (q
          ? <Empty icon={<SearchX />} title={`Nada para “${q}”`}>Tente outro termo ou limpe a busca.</Empty>
          : <Empty icon={<BookOpenText />} title="Ainda não há protocolos publicados">Crie o primeiro arquivo .md na pasta protocolos/ do repositório.</Empty>)}
        {!loading && !idx && <Empty icon={<CloudOff />} title="Sem acesso aos protocolos">Conecte-se à internet uma vez para guardá-los no aparelho.</Empty>}
        {byCat(items).map(([cat, list]) => (
          <section key={cat} className="mt-5">
            <div className="mb-2 font-mono text-[11.5px] text-muted">{cat}</div>
            <ListView aria-label={`Protocolos — ${cat}`} variant="primary">
              {list.map(({ meta: p, hit }) => (
                <ListView.Item key={p.file} id={p.slug} href={`#/protocolo?id=${encodeURIComponent(p.slug)}`} textValue={p.title} className="min-h-15 px-3.5 py-2.5">
                  <ListView.ItemContent>
                    <span className="min-w-0 flex-1">
                      <ListView.Title className="block whitespace-normal text-[15.5px] font-semibold leading-tight">{p.title}</ListView.Title>
                      {hit
                        ? <ListView.Description className="block text-[13px] italic">{hit}</ListView.Description>
                        : (p.summary || p.updated) && <ListView.Description className="block text-[13px]">{p.summary || ''}{p.summary && p.updated ? ' · ' : ''}{p.updated ? `atualizado ${p.updated}` : ''}</ListView.Description>}
                    </span>
                  </ListView.ItemContent>
                  <ListView.ItemAction><ChevronRight className="size-5 text-muted" /></ListView.ItemAction>
                </ListView.Item>
              ))}
            </ListView>
          </section>
        ))}
        <a href={newUrl()} target="_blank" rel="noopener" className="mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-muted px-4 py-3 text-[14px] text-foreground/80">
          <FilePlus2 className="size-5 shrink-0" /><span className="flex-1">Novo protocolo: crie um arquivo <code className="font-mono">.md</code> na pasta <code className="font-mono">protocolos/</code> do repositório (subpasta = categoria). Publicado em 1–2 min.</span><ExternalLink className="size-4 shrink-0 text-muted" />
        </a>
        {idx?.generatedAt && <p className="mt-3 px-1 font-mono text-[11px] text-muted">lista publicada em {new Date(idx.generatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>}
      </Page>
    </>
  );
}

export function ProtocolView({ slug }: { slug: string }) {
  const [doc, setDoc] = useState<ProtocolDoc | null>(null);
  const [slugs, setSlugs] = useState<Set<string>>(new Set());
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'offline'>('loading');
  useEffect(() => {
    let alive = true;
    (async () => {
      let index = await loadIndex();
      let meta = index?.items.find((i) => i.slug === slug);
      /* link para um protocolo recém-publicado: tenta a lista nova antes de dizer que não existe */
      if (!meta) { index = await loadIndex(true); meta = index?.items.find((i) => i.slug === slug); }
      if (!alive) return;
      if (!meta) { setState(index ? 'missing' : 'offline'); return; }
      setSlugs(new Set(index!.items.map((i) => i.slug)));
      const d = await loadDoc(meta);
      if (!alive) return;
      if (d) { setDoc(d); setState('ok'); document.title = `${d.meta.title} — Protocolos`; } else setState('offline');
    })();
    return () => { alive = false; };
  }, [slug]);
  const skeleton = <div className="flex flex-col gap-3"><Skeleton className="h-8 w-2/3 rounded-lg" /><Skeleton className="h-4 w-full rounded" /><Skeleton className="h-4 w-5/6 rounded" /><Skeleton className="h-40 w-full rounded-2xl" /></div>;
  return (
    <>
      <TopBar kicker={doc?.meta.category || 'Protocolo'} title={doc?.meta.title || 'Protocolo'} right={doc && <Button variant="ghost" isIconOnly aria-label="Editar no GitHub" className="size-11 rounded-xl" onPress={() => window.open(editUrl(doc.meta.file), '_blank', 'noopener')}><ExternalLink className="size-5" /></Button>} />
      <Page>
        {state === 'loading' && skeleton}
        {state === 'missing' && <Empty icon={<SearchX />} title="Protocolo não encontrado">Volte à lista e atualize.</Empty>}
        {state === 'offline' && <Empty icon={<CloudOff />} title="Ainda não guardado no aparelho">Conecte-se à internet e abra de novo.</Empty>}
        {doc && (
          <article className="md">
            {(doc.meta.updated || doc.meta.author) && <p className="mb-4 font-mono text-xs text-muted">{[doc.meta.updated && `atualizado ${doc.meta.updated}`, doc.meta.author].filter(Boolean).join(' · ')}</p>}
            <Suspense fallback={skeleton}><ProtocolBody body={doc.body} file={doc.meta.file} knownSlugs={slugs} /></Suspense>
          </article>
        )}
      </Page>
    </>
  );
}
