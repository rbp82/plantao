/* Tela inicial: busca, PCR, paciente ativo, fixadas, recentes e categorias (uma aberta por vez). */
import { useEffect, useMemo, useState } from 'react';
import { Button, SearchField } from '@heroui/react';
import { ItemCard, ListView } from '@/components/pro';
import { ChevronDown, ChevronRight, HeartPulse, LockKeyhole, Moon, Sun, SunMoon, UserRound } from 'lucide-react';
import { C } from '@/lib/calc';
import { useStore, useVaultState, applyTheme, type Theme, bump } from '@/lib/store';
import { useActivePatient, patientSummary } from '@/lib/patients';
import { allTools, GROUPS, GROUP_ORDER, toolHref, type Tool, type Group } from '@/tools/registry';
import { LEGACY } from '@/components/Shell';
import { toast } from '@heroui/react';

export const Tile = ({ t, size = 44 }: { t: Tool; size?: number }) => (
  <span className="flex shrink-0 items-center justify-center rounded-xl border font-semibold tracking-tight"
    style={{ width: size, height: size, fontSize: size * 0.32, color: GROUPS[t.group].color, background: `color-mix(in oklch, ${GROUPS[t.group].color} 12%, transparent)`, borderColor: `color-mix(in oklch, ${GROUPS[t.group].color} 22%, transparent)` }}>{t.tile}</span>
);

/* lista de calculadoras — HeroUI Pro ListView (navegação por teclado e linhas com link) */
function ToolList({ items, label }: { items: { t: Tool; hl?: React.ReactNode }[]; label: string }) {
  return (
    <ListView aria-label={label} variant="secondary">
      {items.map(({ t, hl }) => (
        <ListView.Item key={t.id} id={t.id} href={toolHref(t)} textValue={t.title} className="min-h-16 px-3 py-2.5">
          <ListView.ItemContent className="gap-3.5">
            <Tile t={t} />
            <span className="min-w-0 flex-1">
              <ListView.Title className="block whitespace-normal text-[16px] font-semibold leading-tight">{t.title}</ListView.Title>
              <ListView.Description className="block text-[13.5px]">{hl || t.sub}</ListView.Description>
            </span>
          </ListView.ItemContent>
          <ListView.ItemAction><ChevronRight className="size-5 text-muted" /></ListView.ItemAction>
        </ListView.Item>
      ))}
    </ListView>
  );
}
/* cartão de acesso rápido (fixadas/recentes) — HeroUI Pro ItemCard */
const QCard = ({ t }: { t: Tool }) => (
  <a href={toolHref(t)} className="block rounded-xl active:opacity-80">
    <ItemCard variant="outline" className="min-h-15 gap-2.5 rounded-xl bg-surface px-2.5 py-2.5">
      <ItemCard.Icon className="size-auto rounded-none bg-transparent"><Tile t={t} size={38} /></ItemCard.Icon>
      <ItemCard.Content>
        {/* títulos de uma palavra longa (Tromboelastograma) precisam poder quebrar dentro do cartão */}
        <ItemCard.Title className="w-auto whitespace-normal text-[14px] font-semibold leading-tight [overflow-wrap:anywhere]">{t.title}</ItemCard.Title>
      </ItemCard.Content>
    </ItemCard>
  </a>
);

function search(q: string) {
  const words = C.norm(q).split(/\s+/).filter(Boolean);
  return allTools().map((t) => {
    const hay = C.norm([t.title, t.sub, t.tile, t.keywords.join(' ')].join(' '));
    if (!words.every((w) => hay.includes(w))) return null;
    let score = 0;
    const title = C.norm(t.title + ' ' + t.tile);
    words.forEach((w) => { if (title.includes(w)) score += 3; if (title.startsWith(w)) score += 2; });
    const kw = t.keywords.find((k) => words.some((w) => C.norm(k).includes(w)) && !C.norm(t.title + t.sub).includes(C.norm(k)));
    return { t, score, kw };
  }).filter((x): x is { t: Tool; score: number; kw: string | undefined } => !!x).sort((a, b) => b.score - a.score);
}

export function Home() {
  const [q, setQ] = useState('');
  const [theme, setTheme] = useStore<Theme>('theme', 'auto');
  const [favs] = useStore<string[]>('favs', []);
  const [recents] = useStore<string[]>('recents', []);
  const [openGroup, setOpenGroup] = useStore<Group | null>('homeGroup', null);
  const [pcr] = useStore<unknown>('pcrAtiva', null);
  useEffect(() => { document.title = 'Plantão'; }, []);
  const vault = useVaultState();
  const active = useActivePatient();
  const sum = patientSummary();
  const res = useMemo(() => (q.trim() ? search(q) : null), [q]);
  const favTools = favs.map((id) => allTools().find((t) => t.id === id)).filter((t): t is Tool => !!t);
  const recTools = recents.filter((id) => !favs.includes(id)).map((id) => allTools().find((t) => t.id === id)).filter((t): t is Tool => !!t).slice(0, 4);
  const ThemeIcon = theme === 'auto' ? SunMoon : theme === 'dark' ? Moon : Sun;
  const cycleTheme = () => { const nx: Theme = theme === 'auto' ? 'dark' : theme === 'dark' ? 'light' : 'auto'; setTheme(nx); applyTheme(nx); toast({ auto: 'Tema automático', dark: 'Tema escuro', light: 'Tema claro' }[nx]); };

  return (
    <main className="mx-auto w-full max-w-3xl pb-28">
      <header className="safe-top flex items-start gap-1 px-5 pb-2 pt-6">
        <div className="flex-1">
          <h1 className="text-[32px] font-semibold leading-none tracking-tight">Plantão</h1>
          <p className="mt-1.5 text-[14px] text-muted">UTI e emergência</p>
        </div>
        <Button variant="ghost" isIconOnly aria-label="Bloquear agora" className="size-11 rounded-xl" onPress={() => C.Vault.lock().then(() => { bump(); toast('Bloqueado'); })}><LockKeyhole className="size-5" /></Button>
        <Button variant="ghost" isIconOnly aria-label="Tema" className="size-11 rounded-xl" onPress={cycleTheme}><ThemeIcon className="size-5" /></Button>
      </header>

      <div className="sticky top-0 z-10 bg-background/90 px-4 pb-2 pt-2 backdrop-blur-md">
        <SearchField value={q} onChange={setQ} aria-label="Buscar calculadora ou protocolo" fullWidth>
          <SearchField.Group className="h-12 rounded-2xl">
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Buscar: nora, cefepime, SOFA, sódio…" className="text-[16px]" autoCorrect="off" spellCheck={false} enterKeyHint="go" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>

      {vault.temp && <div className="mx-4 mt-1 rounded-xl bg-warning-soft px-3.5 py-2.5 text-[13.5px] font-medium text-warning-soft-foreground">Modo temporário — nada é salvo. Ao bloquear ou fechar, os dados somem.</div>}

      {res ? (
        <section className="px-4 pt-2">
          <div className="mb-2 font-mono text-[11.5px] text-muted">{res.length ? `${res.length} resultado${res.length > 1 ? 's' : ''}` : 'nada encontrado'}</div>
          {res.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              <ToolList label="Resultados da busca" items={res.map((r) => ({ t: r.t, hl: r.kw ? <>contém <mark className="rounded bg-accent-soft px-0.5 text-accent-soft-foreground">{r.kw}</mark></> : undefined }))} />
            </div>
          )}
          {!res.length && <p className="px-2 pt-3 text-[14px] text-muted">Tente outro termo. Os protocolos ficam na aba <a className="text-link underline" href="#/protocolos">Protocolos</a>.</p>}
        </section>
      ) : (
        <>
          <div className="flex flex-col gap-2 px-4 pt-2">
            <a href={LEGACY('#/pcr')} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${pcr ? 'bg-danger text-danger-foreground' : 'bg-danger-soft text-danger-soft-foreground'}`}>
              <HeartPulse className="size-6 shrink-0" />
              <span className="flex-1 leading-tight"><b className="block text-[15.5px] font-semibold">{pcr ? 'PCR em andamento' : 'PCR — ACLS guiado'}</b><small className="text-[13px] opacity-80">{pcr ? 'toque para voltar ao cronômetro' : 'cronômetro, algoritmo e relatório'}</small></span>
              <ChevronRight className="size-5" />
            </a>
            <a href="#/leitos" className="flex items-center gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-accent-soft-foreground">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-accent"><UserRound className="size-5" /></span>
              <span className="min-w-0 flex-1 leading-tight"><b className="block text-[15.5px] font-semibold">{active ? C.Patients.name(active) : 'Sem paciente selecionado'}</b><small className="num block truncate text-[13px] opacity-80">{sum || (active ? 'sem dados ainda' : 'cálculos avulsos · toque para escolher um leito')}</small></span>
              <span className="text-[13.5px] font-semibold">{active ? 'Trocar' : 'Leitos'}</span>
            </a>
          </div>

          {favTools.length > 0 && <section className="px-4 pt-5"><div className="mb-2 font-mono text-[11.5px] text-muted">Fixadas</div><div className="grid grid-cols-2 gap-2">{favTools.map((t) => <QCard key={t.id} t={t} />)}</div></section>}
          {recTools.length > 0 && <section className="px-4 pt-5"><div className="mb-2 font-mono text-[11.5px] text-muted">Recentes</div><div className="grid grid-cols-2 gap-2">{recTools.map((t) => <QCard key={t.id} t={t} />)}</div></section>}

          <section className="px-4 pt-5">
            <div className="mb-2 font-mono text-[11.5px] text-muted">Todas as calculadoras</div>
            <div className="flex flex-col gap-2">
              {GROUP_ORDER.filter((g) => g !== 'emerg').map((g) => {
                const ts = allTools().filter((t) => t.group === g);
                if (!ts.length) return null;
                const open = openGroup === g;
                return (
                  <div key={g} className="overflow-hidden rounded-2xl border border-border bg-surface">
                    <button type="button" aria-expanded={open} onClick={() => setOpenGroup(open ? null : g)} className="flex min-h-14 w-full items-center gap-3 px-3.5 text-left">
                      <i className="size-2.5 rounded-full" style={{ background: GROUPS[g].color }} />
                      <b className="flex-1 text-[15.5px] font-semibold">{GROUPS[g].name}</b>
                      <span className="font-mono text-xs text-muted">{ts.length}</span>
                      <ChevronDown className={`size-5 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && <div className="border-t border-separator"><ToolList label={GROUPS[g].name} items={ts.map((t) => ({ t }))} /></div>}
                  </div>
                );
              })}
            </div>
          </section>
          <p className="px-6 pt-7 text-center text-xs leading-relaxed text-muted">
            <a className="text-foreground/80 underline" href="#/ajustes">Ajustes e segurança</a><br /><br />
            Ferramenta de apoio à decisão. Não substitui o julgamento clínico nem os protocolos da instituição.
          </p>
        </>
      )}
    </main>
  );
}
