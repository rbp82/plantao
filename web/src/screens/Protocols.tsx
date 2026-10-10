/* Protocolos: lista por categoria (busca) e leitura do Markdown vindo do repositório do app no GitHub. */
import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button, SearchField, Skeleton, toast } from '@heroui/react';
import { ListView } from '@heroui-pro/react';
import { BookOpenText, ChevronRight, CloudOff, ExternalLink, FilePlus2, RefreshCw, SearchX } from 'lucide-react';
import { C } from '@/lib/calc';
import { TopBar, Page } from '@/components/Shell';
import { Empty } from '@/components/ui';
import { editUrl, loadDoc, loadIndex, newUrl, prefetchAll, type ProtocolIndex, type ProtocolMeta, type ProtocolDoc } from '@/lib/protocols';

const byCat = (items: ProtocolMeta[]) => {
  const m = new Map<string, ProtocolMeta[]>();
  items.slice().sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'pt-BR')).forEach((i) => { const l = m.get(i.category) || []; l.push(i); m.set(i.category, l); });
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
};

export function Protocols({ query }: { query: URLSearchParams }) {
  const [idx, setIdx] = useState<ProtocolIndex | null>(null);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(query.get('q') || '');
  useEffect(() => { document.title = 'Protocolos — Plantão'; }, []);
  async function load(force = false) {
    setLoading(true);
    const r = await loadIndex(force);
    setIdx(r.index); setOffline(r.offline); setLoading(false);
    if (r.index && !r.offline) prefetchAll(r.index);
    if (force) toast(r.offline ? 'Sem rede — mostrando a cópia guardada' : 'Protocolos atualizados');
  }
  useEffect(() => { load(); }, []);
  const items = useMemo(() => {
    const all = idx?.items || [];
    const words = C.norm(q).split(/\s+/).filter(Boolean);
    return words.length ? all.filter((i) => words.every((w) => C.norm(i.title + ' ' + i.category + ' ' + (i.summary || '')).includes(w))) : all;
  }, [idx, q]);
  return (
    <>
      <TopBar kicker="Do repositório da instituição" title="Protocolos" right={<Button variant="ghost" isIconOnly aria-label="Atualizar" className="size-11 rounded-xl" onPress={() => load(true)}><RefreshCw className={`size-5 ${loading ? 'animate-spin' : ''}`} /></Button>} />
      <Page>
        <SearchField value={q} onChange={setQ} aria-label="Buscar protocolo" fullWidth>
          <SearchField.Group className="h-12 rounded-2xl"><SearchField.SearchIcon /><SearchField.Input placeholder="Buscar protocolo…" className="text-[16px]" /><SearchField.ClearButton /></SearchField.Group>
        </SearchField>
        {offline && <div className="mt-3 flex items-center gap-2 rounded-xl bg-warning-soft px-3.5 py-2.5 text-[13.5px] font-medium text-warning-soft-foreground"><CloudOff className="size-4 shrink-0" />Sem internet — mostrando a cópia guardada neste aparelho.</div>}
        {loading && !idx && <div className="mt-4 flex flex-col gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>}
        {idx && !items.length && (q
          ? <Empty icon={<SearchX />} title={`Nada para “${q}”`}>Tente outro termo ou limpe a busca.</Empty>
          : <Empty icon={<BookOpenText />} title="Ainda não há protocolos publicados">Crie o primeiro arquivo .md na pasta protocolos/ do repositório.</Empty>)}
        {!loading && !idx && <Empty icon={<CloudOff />} title="Sem acesso aos protocolos">Conecte-se à internet uma vez para guardá-los no aparelho.</Empty>}
        {byCat(items).map(([cat, list]) => (
          <section key={cat} className="mt-5">
            <div className="mb-2 font-mono text-[11.5px] text-muted">{cat}</div>
            <ListView aria-label={`Protocolos — ${cat}`} variant="primary">
              {list.map((p) => (
                <ListView.Item key={p.path} id={p.slug} href={`#/protocolo?id=${encodeURIComponent(p.slug)}`} textValue={p.title} className="min-h-15 px-3.5 py-2.5">
                  <ListView.ItemContent>
                    <span className="min-w-0 flex-1">
                      <ListView.Title className="block whitespace-normal text-[15.5px] font-semibold leading-tight">{p.title}</ListView.Title>
                      {(p.summary || p.updated) && <ListView.Description className="block text-[13px]">{p.summary || ''}{p.summary && p.updated ? ' · ' : ''}{p.updated ? `atualizado ${p.updated}` : ''}</ListView.Description>}
                    </span>
                  </ListView.ItemContent>
                  <ListView.ItemAction><ChevronRight className="size-5 text-muted" /></ListView.ItemAction>
                </ListView.Item>
              ))}
            </ListView>
          </section>
        ))}
        <a href={newUrl()} target="_blank" rel="noopener" className="mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-muted px-4 py-3 text-[14px] text-foreground/80">
          <FilePlus2 className="size-5 shrink-0" /><span className="flex-1">Novo protocolo: crie um arquivo <code className="font-mono">.md</code> na pasta <code className="font-mono">protocolos/</code> do repositório. Subpasta = categoria.</span><ExternalLink className="size-4 shrink-0 text-muted" />
        </a>
      </Page>
    </>
  );
}

export function ProtocolView({ slug }: { slug: string }) {
  const [doc, setDoc] = useState<ProtocolDoc | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'offline'>('loading');
  useEffect(() => {
    let alive = true;
    (async () => {
      const { index } = await loadIndex();
      const meta = index?.items.find((i) => i.slug === slug);
      if (!meta) { if (alive) setState('missing'); return; }
      const r = await loadDoc(meta);
      if (!alive) return;
      if (r.doc) { setDoc(r.doc); setState('ok'); document.title = `${r.doc.meta.title} — Protocolos`; } else setState('offline');
    })();
    return () => { alive = false; };
  }, [slug]);
  return (
    <>
      <TopBar kicker={doc?.meta.category || 'Protocolo'} title={doc?.meta.title || 'Protocolo'} right={doc && <Button variant="ghost" isIconOnly aria-label="Editar no GitHub" className="size-11 rounded-xl" onPress={() => window.open(editUrl(doc.meta.path), '_blank', 'noopener')}><ExternalLink className="size-5" /></Button>} />
      <Page>
        {state === 'loading' && <div className="flex flex-col gap-3"><Skeleton className="h-8 w-2/3 rounded-lg" /><Skeleton className="h-4 w-full rounded" /><Skeleton className="h-4 w-5/6 rounded" /><Skeleton className="h-40 w-full rounded-2xl" /></div>}
        {state === 'missing' && <Empty icon={<SearchX />} title="Protocolo não encontrado">Volte à lista e atualize.</Empty>}
        {state === 'offline' && <Empty icon={<CloudOff />} title="Ainda não guardado no aparelho">Conecte-se à internet e abra de novo.</Empty>}
        {doc && (
          <article className="md">
            {(doc.meta.updated || doc.meta.author) && <p className="mb-4 font-mono text-xs text-muted">{[doc.meta.updated && `atualizado ${doc.meta.updated}`, doc.meta.author].filter(Boolean).join(' · ')}</p>}
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ href, children }) => <a href={href} target={href?.startsWith('#') ? undefined : '_blank'} rel="noopener">{children}</a> }}>{doc.body}</ReactMarkdown>
          </article>
        )}
      </Page>
    </>
  );
}
