/* Paciente (rota paciente?id=): resumo da ficha, última gasometria, tendência por parâmetro, registros, PCRs; nova gasometria, editar ficha, alta, excluir. */
import { useEffect, useState } from 'react';
import { Button, toast } from '@heroui/react';
import { ChevronRight, LayoutGrid, Pencil, Plus, TriangleAlert } from 'lucide-react';
import { useStoreVersion } from '@/lib/store';
import { navigate } from '@/lib/router';
import { TopBar, Page } from '@/components/Shell';
import { KV, Note, Pill, Section, Verdict } from '@/components/ui';
import { ageSex, ago, calc, delta, dt, dUti, fmt, G, hasAlergia, hm, isoLabel, keyDisp, labelsOf, lastInfo, mainText, normOf, outOf, P, type BedPatient, type GasRecord, type GasResult } from '@/lib/beds';
import { C } from '@/lib/calc';
import { ArmedButton, chStyle, SEV_BORDER, Sparkline, sevCls } from './parts';

/* o que está aberto/ampliado em cada paciente sobrevive à navegação, como no app anterior */
const more = new Map<string, Record<string, boolean>>();
const moreOf = (id: string) => { let m = more.get(id); if (!m) { m = {}; more.set(id, m); } return m; };

interface PcrCase { id: string; start: number; end: number | null; outcome?: 'rce' | 'obito' | 'inter' }
const OUTCOME: Record<string, string> = { rce: 'RCE', obito: 'Óbito', inter: 'Interrompida' };

export function PatientPage({ query }: { query: URLSearchParams }) {
  useStoreVersion();
  const [, tick] = useState(0);
  const id = query.get('id') || '';
  const p: BedPatient | null = P.get(id);
  useEffect(() => { if (!p) navigate('#/leitos', true); else if (!p.archived && (!P.active() || P.active()!.id !== p.id)) P.setActive(p.id); }, [p?.id, p?.archived]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p) return null;
  const m = moreOf(p.id);
  const toggle = (k: string) => { m[k] = !m[k]; tick((x) => x + 1); };
  const { rs, last, res } = lastInfo(p);
  const series = rs.map((r) => ({ r, res: calc(p, r) }));
  const rows = G.TREND.map(([k, l, dec, ch, n]) => {
    const pts = series.map((s) => ({ t: s.r.ts, v: keyDisp(k, s.res.key[k]) })).filter((x): x is { t: number; v: number } => x.v != null);
    if (!pts.length) return null;
    const nn = normOf(k, n, p);
    const lv = pts[pts.length - 1].v, pv = pts.length > 1 ? pts[pts.length - 2].v : null;
    return { k, l, dec, ch, nn, pts, lv, df: delta(lv, pv, dec), big: !!m['tr_' + k] };
  }).filter((x): x is NonNullable<typeof x> => !!x);
  const trShown = m.trAll ? rows : rows.slice(0, 4);
  const hist = series.slice().reverse();
  const histShown = m.hiAll ? hist : hist.slice(0, 3);
  const f = p.ficha || {};
  const findings = res ? res.dx.filter((x) => !x.main && x.s !== 'ok').slice(0, 2) : [];
  const pcrs = (C.store.get<PcrCase[]>('pcrHist', []) || []).filter((c) => (p.pcrs || []).includes(c.id)).reverse();
  const kv: [string, string][] = [];
  if (f.com && f.com.length) kv.push(['Comorbidades', labelsOf(G.COM, f.com).join(', ')]);
  if (f.dev && f.dev.length) kv.push(['Dispositivos', labelsOf(G.DEV, f.dev).join(', ')]);
  if (f.iso) kv.push(['Isolamento', isoLabel(f.iso)]);
  if (p.data && p.data.pamAlvo) kv.push(['PAM alvo', `${p.data.pamAlvo} mmHg`]);
  if (p.data && p.data.crBase) kv.push(['Cr basal', `${p.data.crBase} mg/dL`]);
  if (p.data && p.data.cr) kv.push(['Cr atual', `${p.data.cr} mg/dL`]);
  if (f.adm) kv.push(['Admissão', f.adm.split('-').reverse().join('/')]);
  const gasoHref = (r: GasRecord) => `#/gaso?id=${p.id}&rec=${r.id}`;
  const rowText = (s: { res: GasResult }) => mainText(s.res);

  return (
    <>
      <TopBar kicker={[dUti(p) && 'D' + dUti(p), ageSex(p)].filter(Boolean).join(' · ') || 'paciente'} title={P.name(p)}
        right={<Button variant="ghost" isIconOnly aria-label="Editar ficha" className="size-11 rounded-xl" onPress={() => navigate(`#/ficha?id=${p.id}`)}><Pencil className="size-5" /></Button>} />
      <Page>
        {p.archived && <Note cls="warn">Paciente arquivado (alta). <button type="button" className="font-semibold underline" onClick={() => { p.archived = false; P.touch(p); }}>Reativar</button></Note>}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button size="lg" onPress={() => navigate(`#/gaso?id=${p.id}&novo=1`)}><Plus className="size-5" /> Nova gasometria</Button>
          <Button size="lg" variant="secondary" onPress={() => navigate('#/')}><LayoutGrid className="size-5" /> Calculadoras</Button>
        </div>

        <details className="mt-3 rounded-2xl border border-border bg-surface" open={!!m.fi} onToggle={(e) => { m.fi = (e.currentTarget as HTMLDetailsElement).open; }}>
          <summary className="flex min-h-14 cursor-pointer items-center gap-2 px-4 py-2">
            <span className="min-w-0 flex-1"><b className="block truncate text-[15.5px] font-semibold">{f.diag || 'Ficha do paciente'}</b>
              <span className="mt-1 inline-flex">{hasAlergia(p) ? <Pill cls="crit"><TriangleAlert className="mr-1 inline size-3.5" />{f.alerg}</Pill> : f.alerg ? <Pill cls="">nega alergias</Pill> : <Pill cls="">alergias não informadas</Pill>}</span></span>
            <ChevronRight className="size-5 rotate-90 text-muted" />
          </summary>
          <div className="border-t border-separator px-4 pb-4 pt-3">
            {kv.length > 0 && <KV rows={kv} />}
            {f.obs && <p className="mt-2 whitespace-pre-wrap text-[14.5px] text-foreground/85">{f.obs}</p>}
            <Button variant="secondary" fullWidth className="mt-3" onPress={() => navigate(`#/ficha?id=${p.id}`)}><Pencil className="size-4" /> Editar ficha</Button>
          </div>
        </details>

        {last && res ? (
          <a href={gasoHref(last)} className="mt-3 block">
            <Verdict cls={sevCls(res.main?.s)} kicker={`Última gasometria · ${dt(last.ts)} · ${ago(last.ts)}`} title={mainText(res, 'Sem achados')} desc={findings.length ? findings.map((x, i) => <span key={i} className="block">{x.t}</span>) : undefined} />
          </a>
        ) : (
          <div className="mt-3 flex flex-col items-center gap-1 rounded-2xl border border-dashed border-muted px-4 py-6 text-center"><b className="text-[15.5px]">Nenhuma gasometria ainda</b><span className="text-[14px] text-muted">Use “Nova gasometria” para começar a tendência deste paciente.</span></div>
        )}

        {rows.length > 0 && (
          <Section title="Tendência" aux="toque para ampliar" className="mt-3">
            <div className="flex flex-col divide-y divide-separator">
              {trShown.map((r) => (
                <button key={r.k} type="button" onClick={() => toggle('tr_' + r.k)} aria-expanded={r.big} className={`grid min-h-13 w-full items-center gap-x-2 py-2 text-left ${r.big ? 'grid-cols-[60px_66px_1fr]' : 'grid-cols-[60px_66px_1fr_120px]'}`}>
                  <span className="font-mono text-[11.5px]" style={chStyle(r.ch)}>{r.l}</span>
                  <span className={`num text-right text-[22px] font-semibold ${outOf(r.lv, r.nn) ? 'text-warning' : ''}`}>{fmt(r.lv, r.dec)}</span>
                  <span className="font-mono text-[11.5px] text-muted">{r.df || ''}</span>
                  <span className={`${r.big ? 'col-span-full h-[110px]' : 'h-10'}`}><Sparkline pts={r.pts} normal={r.nn} big={r.big} color={chStyle(r.ch).color} /></span>
                  {r.big && <span className="col-span-full flex flex-wrap gap-x-3 gap-y-1 pb-1 font-mono text-[12px] text-muted">{r.pts.slice(-8).reverse().map((x) => <i key={x.t} className="not-italic">{hm(x.t)} <b className="font-medium text-foreground">{fmt(x.v, r.dec)}</b></i>)}</span>}
                </button>
              ))}
            </div>
            {rows.length > 4 && <Button variant="ghost" size="sm" className="mt-1 h-11 text-accent" onPress={() => toggle('trAll')}>{m.trAll ? 'mostrar menos' : `mostrar todas (${rows.length})`}</Button>}
          </Section>
        )}

        {hist.length > 0 && (
          <Section title="Registros" aux={String(hist.length)} className="mt-3">
            <div className="flex flex-col divide-y divide-separator">
              {histShown.map((s) => (
                <a key={s.r.id} href={gasoHref(s.r)} className={`flex min-h-12 items-center gap-3 border-l-[3px] py-2.5 pl-3 pr-1 ${SEV_BORDER[s.res.worst || 'none']}`}>
                  <time className="shrink-0 font-mono text-[12.5px] text-muted">{dt(s.r.ts)}</time><span className="min-w-0 flex-1 truncate text-[14.5px]">{rowText(s)}</span><ChevronRight className="size-5 text-muted" />
                </a>
              ))}
            </div>
            {hist.length > 3 && <Button variant="ghost" size="sm" className="mt-1 h-11 text-accent" onPress={() => toggle('hiAll')}>{m.hiAll ? 'mostrar menos' : `ver todos (${hist.length})`}</Button>}
          </Section>
        )}

        {pcrs.length > 0 && (
          <Section title="Paradas (PCR)" aux={String(pcrs.length)} className="mt-3">
            <div className="flex flex-col divide-y divide-separator">
              {pcrs.map((c) => (
                <a key={c.id} href={`#/pcr-relatorio?id=${c.id}`} className={`flex min-h-12 items-center gap-3 border-l-[3px] py-2.5 pl-3 pr-1 ${c.outcome === 'rce' ? SEV_BORDER.ok : SEV_BORDER.crit}`}>
                  <time className="shrink-0 font-mono text-[12.5px] text-muted">{dt(c.start)}</time><span className="min-w-0 flex-1 truncate text-[14.5px]">{OUTCOME[c.outcome || ''] || ''} · {Math.round(((c.end || c.start) - c.start) / 60000)} min</span><ChevronRight className="size-5 text-muted" />
                </a>
              ))}
            </div>
          </Section>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          {!p.archived && <Button variant="secondary" className="h-12" onPress={() => { p.archived = true; if (P.active() && P.active()!.id === p.id) P.setActive(null); P.touch(p); toast('Paciente arquivado'); navigate('#/leitos'); }}>Alta / arquivar</Button>}
          <ArmedButton label="Excluir paciente" armedLabel="Toque de novo para excluir tudo" variant="secondary" className={`h-12 ${p.archived ? 'col-span-full' : ''}`} onConfirm={() => { P.remove(p.id); toast('Paciente excluído'); navigate('#/leitos'); }} />
        </div>
      </Page>
    </>
  );
}
