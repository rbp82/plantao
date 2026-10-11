/* Gasometria completa (rota gaso?id=&rec=&novo=1; aceita p=/r= dos links antigos): entrada por grupos (um aberto por vez),
   resultado ao vivo com severidades e notas, comparação com o registro anterior, unidade do lactato, horário, excluir,
   salvar avulsa num leito e leitura por foto (GasoScan). O teclado próprio do original virou campo nativo decimal. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button, Input, Label, TextField, toast } from '@heroui/react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';
import { useStoreVersion } from '@/lib/store';
import { navigate } from '@/lib/router';
import { TopBar, Page } from '@/components/Shell';
import { fieldError, Pill, SegField, Steps, Verdict } from '@/components/ui';
import {
  adoptAvulso, ageSex, ago, bedSort, calc, CHC, dt, dUti, E, F, filled, fluidHint, fmt, G, gasCfg, getV, groupFields, groupOfField, H, hasAlergia, inFlag, isEmpty, isLac, keyDisp, limOf, merged, MON,
  newRecord, normOf, numTxt, outOf, P, parseField, phMask, prevItemValues, prevOf, prevV, rawOf, recs, removeRecord, restDx, setGasCfg, setV, toDisp, unitOf, vtKg,
  type BedPatient, type ChItem, type GasInput, type GasInputs, type GasRecord, type GasResult, type GroupDef, type Sample,
} from '@/lib/beds';
import { BottomSheet, DavenportMap, sevCls } from './parts';
import { GasoScan } from './GasoScan';
import { S, cleanup } from './session';

/* registro que a rota pede: novo (criado e gravado no paciente, ou avulso em S.quick) ou existente */
function resolve(q: URLSearchParams): { p: BedPatient | null; rec: GasRecord } | { redirect: string } {
  const novo = !!q.get('novo');
  const pid = q.get('id') || q.get('p');
  let p: BedPatient | null = novo ? P.active() : pid ? P.get(pid) : null;
  if (p && p.archived && novo) p = null;
  const rid = q.get('rec') || q.get('r');
  if (novo || !rid || rid === 'novo') {
    const rec = newRecord();
    if (p) { p.records = recs(p); p.records.push(rec); P.touch(p); } else S.quick = rec;
    return { redirect: `#/gaso?id=${p ? p.id : ''}&rec=${rec.id}` };
  }
  const rec = p ? recs(p).find((r) => r.id === rid) : S.quick && S.quick.id === rid ? S.quick : null;
  if (rec) return { p, rec };
  if (p) return { redirect: '#/paciente?id=' + p.id };
  const fresh = newRecord(); S.quick = fresh;
  return { redirect: `#/gaso?id=&rec=${fresh.id}` };
}

export function Gaso({ query }: { query: URLSearchParams }) {
  useStoreVersion();
  const [, tick] = useState(0);
  const r = resolve(query);
  useEffect(() => { if ('redirect' in r) navigate(r.redirect, true); }, [r]); // eslint-disable-line react-hooks/exhaustive-deps
  if ('redirect' in r) return null;
  return <GasoScreen key={r.rec.id} p={r.p} rec={r.rec} refresh={() => tick((x) => x + 1)} />;
}

type Tab = 'in' | 'out';

function GasoScreen({ p, rec, refresh }: { p: BedPatient | null; rec: GasRecord; refresh: () => void }) {
  const [tab, setTab] = useState<Tab>('in');
  const [openG, setOpenG] = useState<string>('gaso');
  const [edit, setEdit] = useState<string | null>(null);
  const [acc, setAcc] = useState<string | null>(null);
  const [dxAll, setDxAll] = useState(false);
  const [sheet, setSheet] = useState<'ts' | 'save' | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [tsVal, setTsVal] = useState('');
  useEffect(() => {
    if (S.ctx && S.ctx.rec !== rec) cleanup(rec);
    S.ctx = { p, rec };
    if (p && !p.archived && (!P.active() || P.active()!.id !== p.id)) P.setActive(p.id);
  }, [p, rec]);
  useEffect(() => { document.title = 'Gasometria — Plantão'; }, []);

  const res = calc(p, rec);
  const cur = (fid: string) => getV(p, rec, fid);
  const set = (fid: string, v: GasInput | undefined) => { setV(p, rec, fid, v); refresh(); };
  const prev = prevOf(p, rec);
  const alerts = res.dx.filter((x) => x.s !== 'ok').length;
  const mg = merged(p, rec);

  function applyScan(vals: { fid: string; v: number }[], smp: Sample) {
    vals.forEach((x) => setV(p, rec, x.fid, x.v));
    rec.via = 'foto';
    if (p) P.touch(p);
    setOpenG(smp === 'ven' ? 'ven' : 'gaso'); setEdit(null); setTab('in'); refresh();
    window.scrollTo(0, 0);
  }
  /* "próximo" percorre os campos numéricos visíveis; no fim do grupo abre o grupo seguinte */
  function move(fid: string, dir: 1 | -1) {
    const g = G.GROUPS.find((x) => x.id === openG);
    const list = g ? groupFields(g, mg).filter((f) => !F[f].type) : [];
    const i = list.indexOf(fid), nx = list[i + dir];
    if (nx) return setEdit(nx);
    if (dir > 0 && g) {
      for (let j = G.GROUPS.indexOf(g) + 1; j < G.GROUPS.length; j++) {
        const gg = G.GROUPS[j];
        const first = groupFields(gg, mg).find((f) => !F[f].type);
        if (!first || gg.id === 'fluid') continue;
        setOpenG(gg.id); setEdit(first); return;
      }
    }
    setEdit(null);
  }
  /* "também calcula com": vai ao campo que falta */
  function goto(fid: string) {
    const g = groupOfField(fid, mg);
    if (g) setOpenG(g.id);
    setTab('in');
    setEdit(F[fid] && !F[fid].type ? fid : null);
    window.scrollTo(0, 0);
  }
  const saveTs = () => { const ts = new Date(tsVal).getTime(); if (Number.isFinite(ts)) { rec.ts = ts; P.touch(p); } setSheet(null); refresh(); };
  const openTs = () => { const d = new Date(rec.ts); setTsVal(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)); setSheet('ts'); };
  const saveTo = (dest: BedPatient) => {
    adoptAvulso(dest);
    dest.records = recs(dest); dest.records.push(rec); S.quick = null; S.ctx = null;
    P.touch(dest); P.setActive(dest.id);
    toast(`Salvo em ${P.name(dest)}`);
    navigate(`#/gaso?id=${dest.id}&rec=${rec.id}`);
  };

  const kicker = p ? [P.name(p), dUti(p) ? 'D' + dUti(p) : '', prev ? 'ant. ' + ago(prev.ts) : ''].filter(Boolean).join(' · ') : 'Avulso · não salvo';
  return (
    <>
      <TopBar kicker={<>{kicker}{hasAlergia(p) && <> · <b className="text-danger">alergia</b></>}</>} title="Gasometria"
        right={p ? <Button variant="secondary" size="sm" className="h-11 gap-1.5 rounded-xl px-3" onPress={openTs}><Clock className="size-4" /><span className="num text-[13px]">{dt(rec.ts)}</span></Button>
          : <Button variant="secondary" size="sm" className="h-11 rounded-xl px-3" onPress={() => { if (isEmpty(rec)) return toast('Nada para salvar ainda'); setSheet('save'); }}>Salvar no leito</Button>} />
      <Page className="pt-0">
        <Monitor res={res} p={p} alerts={alerts} tab={tab} setTab={(t) => { setTab(t); setEdit(null); window.scrollTo(0, 0); }} />
        {tab === 'in'
          ? <Entry p={p} rec={rec} mg={mg} cur={cur} set={set} openG={openG} setOpenG={(g) => { setOpenG(g); setEdit(null); }} edit={edit} setEdit={setEdit} move={move} applyScan={applyScan} onDelete={() => { removeRecord(p!, rec); S.ctx = null; toast('Registro excluído'); navigate('#/paciente?id=' + p!.id); }} />
          : <Output res={res} p={p} rec={rec} acc={acc} setAcc={setAcc} dxAll={dxAll} setDxAll={setDxAll} goto={goto} openRef={setRef} />}
      </Page>
      <RefSheet id={ref} onClose={() => setRef(null)} />
      <BottomSheet open={sheet === 'ts'} onClose={() => setSheet(null)} label="Horário da coleta" title="Horário da coleta">
        <TextField value={tsVal} onChange={setTsVal} fullWidth><Label className="text-[13.5px] font-medium">Coleta</Label><Input type="datetime-local" className="h-13 text-[17px]" /></TextField>
        <Button fullWidth className="mt-3 h-12" onPress={saveTs}>Salvar</Button>
      </BottomSheet>
      <BottomSheet open={sheet === 'save'} onClose={() => setSheet(null)} label="Salvar em qual paciente?" title="Salvar em qual paciente?">
        <div className="flex flex-col divide-y divide-separator">
          {P.list().filter((x) => !x.archived).sort(bedSort).map((x) => (
            <button key={x.id} type="button" onClick={() => saveTo(x)} className="flex min-h-14 w-full items-center gap-3 py-2 text-left"><span className="min-w-0 flex-1"><b className="block text-[15.5px] font-semibold">{P.name(x)}</b><span className="block text-[13px] text-muted">{ageSex(x) || 'sem dados'}</span></span><ChevronRight className="size-5 text-muted" /></button>
          ))}
        </div>
        <Button fullWidth className="mt-3 h-12" onPress={() => { setSheet(null); navigate('#/ficha?de=gaso'); }}><Plus className="size-5" /> Admitir novo paciente</Button>
      </BottomSheet>
    </>
  );
}

/* ---------- monitor fixo: 6 valores-chave, veredito e abas ---------- */
function Monitor({ res, p, alerts, tab, setTab }: { res: GasResult; p: BedPatient | null; alerts: number; tab: Tab; setTab: (t: Tab) => void }) {
  const main = res.main;
  return (
    <div className="sticky top-14 z-10 -mx-4 bg-background px-4 pb-2 pt-2">
      <div className="grid grid-cols-6 divide-x divide-separator overflow-hidden rounded-xl border border-border bg-surface">
        {MON.map(([k, l, dec, ch, n]) => { const v = keyDisp(k, res.key[k]); return (
          <div key={k} className="min-w-0 py-1.5 pl-2 pr-1"><i className="block font-mono text-[10px] not-italic" style={{ color: CHC[ch] }}>{l}</i><b className={`num block whitespace-nowrap text-[21px] font-semibold leading-tight ${outOf(v, normOf(k, n, p)) ? 'text-warning' : ''}`}>{fmt(v, dec)}</b></div>
        ); })}
      </div>
      <button type="button" onClick={() => setTab('out')} className={`mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl border-l-4 px-3 py-1.5 text-left ${main ? { crit: 'border-danger bg-danger-soft', warn: 'border-warning bg-warning-soft', ok: 'border-success bg-success-soft' }[main.s] : 'border-border bg-surface-secondary'}`}>
        <b className={`flex-1 text-[14.5px] leading-tight ${main ? 'font-semibold' : 'font-medium text-muted'}`}>{main ? main.t : 'Aguardando pH, PaCO₂ e HCO₃'}</b>
        {main && <span className="text-[12.5px] text-muted">{alerts ? `${alerts} achado${alerts > 1 ? 's' : ''}` : 'leitura'} ›</span>}
      </button>
      <SegField className="mt-2" value={tab} onChange={(v) => setTab(v as Tab)} options={[{ value: 'in', label: 'Entrada' }, { value: 'out', label: <>Leitura{alerts ? <em className="ml-1.5 rounded-full bg-warning-soft px-1.5 text-[11.5px] not-italic font-semibold text-warning">{alerts}</em> : null}</> }]} />
    </div>
  );
}

/* ---------- entrada: grupos em acordeão (um aberto por vez); campo ativo vira editor nativo decimal ---------- */
interface EntryProps { p: BedPatient | null; rec: GasRecord; mg: GasInputs; cur: (fid: string) => GasInput | undefined; set: (fid: string, v: GasInput | undefined) => void; openG: string; setOpenG: (g: string) => void; edit: string | null; setEdit: (f: string | null) => void; move: (fid: string, dir: 1 | -1) => void; applyScan: (vals: { fid: string; v: number }[], smp: Sample) => void; onDelete: () => void }
function Entry({ p, rec, mg, cur, set, openG, setOpenG, edit, setEdit, move, applyScan, onDelete }: EntryProps) {
  const [armed, setArmed] = useState(false);
  return (
    <>
      <GasoScan cur={cur} apply={applyScan} />
      {G.GROUPS.map((g) => {
        const [n, t] = filled(g, p, rec);
        const open = openG === g.id;
        return (
          <section key={g.id} className="mb-2 overflow-hidden rounded-2xl border border-border bg-surface">
            <button type="button" aria-expanded={open} onClick={() => setOpenG(open ? '__none' : g.id)} className="flex min-h-13 w-full items-center gap-3 px-3.5 text-left">
              <i className="size-2.5 shrink-0 rounded-full" style={{ background: CHC[g.ch] }} /><b className="flex-1 text-[15px] font-semibold">{g.t}</b><em className="font-mono text-[12px] not-italic text-muted">{n ? `${n}/${t}` : ''}</em><ChevronDown className={`size-5 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && <GroupBody g={g} p={p} rec={rec} mg={mg} cur={cur} set={set} edit={edit} setEdit={setEdit} move={move} />}
          </section>
        );
      })}
      {p && <Button variant="ghost" className={`h-11 ${armed ? 'font-bold text-danger' : 'text-danger/80'}`} onPress={() => { if (!armed) return setArmed(true); onDelete(); }}>{armed ? 'toque de novo para excluir' : 'excluir este registro'}</Button>}
      {rec.via === 'foto' && <p className="mx-1 mt-3 text-xs leading-relaxed text-muted">Valores lançados a partir de foto do ticket: confira com o original.</p>}
      <p className="mx-1 mt-3 text-xs leading-relaxed text-muted">Toque num campo e digite. “Ant.” repete o valor da gasometria anterior; “próximo” segue para o campo e o grupo seguintes.</p>
    </>
  );
}

function GroupBody({ g, p, rec, mg, cur, set, edit, setEdit, move }: Omit<EntryProps, 'openG' | 'setOpenG' | 'applyScan' | 'onDelete'> & { g: GroupDef }) {
  const fields = groupFields(g, mg);
  const hint = g.id === 'fluid' && mg.ftest ? fluidHint(mg) : g.id === 'pac' ? 'Compartilhado com as outras calculadoras e com a ficha.' : '';
  return (
    <div className="border-t border-separator px-3 pb-3 pt-3">
      <div className="grid grid-cols-3 gap-2">
        {fields.map((fid) => {
          const f = F[fid], v = cur(fid);
          if (f.type === 'enum') return (
            <div key={fid} className={f.opts!.length > 2 ? 'col-span-full' : 'col-span-2'}>
              <SegField label={f.l} value={typeof v === 'string' ? v : ''} onChange={(k) => set(fid, v === k ? undefined : k)} options={f.opts!.map(([k, l]) => ({ value: k, label: l }))} />
            </div>
          );
          if (f.type === 'bool') {
            const kg = fid === 'chkVt8' ? vtKg(mg) : null;
            return <button key={fid} type="button" role="checkbox" aria-checked={v === true} onClick={() => set(fid, v !== true)} className={`col-span-full flex min-h-12 items-center gap-3 rounded-xl border px-3 text-left text-[14.5px] ${v === true ? 'border-accent bg-accent-soft/60' : 'border-border'}`}>
              <span className={`flex size-6 items-center justify-center rounded-md border-2 ${v === true ? 'border-accent bg-accent text-accent-foreground' : 'border-muted/60'}`}>{v === true && <Check className="size-4" strokeWidth={3} />}</span>{f.l}{kg != null ? ` (${fmt(kg, 1)} mL/kg)` : ''}
            </button>;
          }
          if (edit === fid) return <FieldEditor key={fid} fid={fid} p={p} rec={rec} mg={mg} value={v} set={set} move={move} close={() => setEdit(null)} />;
          const lab = G.fluidLabel(fid, mg), u = lab ? lab[1] : unitOf(fid), hv = H(v), pv = prevV(p, rec, fid);
          const flag = hv ? inFlag(fid, Number(v)) : '';
          return (
            <button key={fid} type="button" onClick={() => setEdit(fid)} className={`flex min-h-14 flex-col justify-between gap-1 rounded-xl border px-2.5 py-2 text-left ${flag === 'bad' ? 'border-danger ring-2 ring-danger/20' : 'border-border'} bg-surface active:bg-surface-secondary`}>
              <span className="flex items-baseline justify-between gap-1"><span className="truncate text-[12.5px] font-medium text-foreground/80">{lab ? lab[0] : f.l}</span>{u && <small className="shrink-0 font-mono text-[10px] text-muted">{u}</small>}</span>
              <span className="flex items-baseline justify-between gap-1"><span className={`num text-[23px] font-medium leading-none ${!hv ? 'text-muted/60' : flag === 'bad' ? 'text-danger' : flag === 'off' ? 'text-warning' : ''}`}>{hv ? numTxt(toDisp(fid, Number(v))) : '—'}</span>{H(pv) && <span className="truncate font-mono text-[10.5px] text-muted">ant. {numTxt(toDisp(fid, Number(pv)))}</span>}</span>
            </button>
          );
        })}
      </div>
      {hint && <p className="mt-2.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/* editor do campo ativo (ocupa a linha): campo nativo decimal, faixa de referência, plausibilidade, "Ant.", ±, limpar, anterior/próximo.
   Grava a cada tecla (resultado ao vivo); o foco é pedido no toque do usuário, não ao abrir a tela. */
function FieldEditor({ fid, p, rec, mg, value, set, move, close }: { fid: string; p: BedPatient | null; rec: GasRecord; mg: GasInputs; value: GasInput | undefined; set: (fid: string, v: GasInput | undefined) => void; move: (fid: string, dir: 1 | -1) => void; close: () => void }) {
  const f = F[fid];
  const [raw, setRaw] = useState(() => rawOf(fid, value));
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { const el = box.current?.querySelector('input'); if (el) { el.focus(); el.select(); } }, [fid]);
  const lab = G.fluidLabel(fid, mg);
  const pv = prevV(p, rec, fid);
  const lim = limOf(fid);
  const n = f.n ? (isLac(fid) ? [f.n[0] * 9.01, f.n[1] * 9.01] : f.n) : null;
  const commit = (t: string) => { const s = phMask(fid, t); setRaw(s); set(fid, parseField(fid, s)); };
  const err = fieldError(raw, lim);
  return (
    <div ref={box} className="col-span-full rounded-xl border border-accent bg-surface p-2.5 ring-2 ring-accent/20">
      <div className="flex items-baseline justify-between gap-2"><b className="text-[15px] font-semibold">{lab ? lab[0] : f.l}</b><span className="font-mono text-[11px] text-muted">{n ? `ref ${numTxt(n[0])} a ${numTxt(n[1])} ` : ''}{unitOf(fid) || (lab ? lab[1] : '')}</span></div>
      <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-2">
        <TextField value={raw} onChange={commit} isInvalid={!!err} fullWidth aria-label={f.l}>
          <Input inputMode="decimal" autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="next" placeholder="—" className="num h-13 font-mono text-[24px] font-medium" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); move(fid, 1); } if (e.key === 'Escape') close(); }} />
        </TextField>
        <Button variant="secondary" isIconOnly aria-label="Concluir" className="size-13 rounded-xl" onPress={close}><Check className="size-5" /></Button>
      </div>
      {err && <p className="mt-1 text-xs font-medium text-danger">{err}</p>}
      {f.lacUnit && <div className="mt-2"><SegField label="Unidade do lactato" value={gasCfg().lacUnit} onChange={(u) => { setGasCfg({ lacUnit: u as 'mmol' | 'mgdl' }); setRaw(rawOf(fid, value)); }} options={[{ value: 'mmol', label: 'mmol/L' }, { value: 'mgdl', label: 'mg/dL' }]} /></div>}
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <Button variant="secondary" size="sm" className="h-11 flex-col gap-0 leading-tight" isDisabled={!H(pv)} onPress={() => commit(rawOf(fid, pv as GasInput))}>Ant.{H(pv) && <small className="font-mono text-[11px] text-muted">{numTxt(toDisp(fid, Number(pv)))}</small>}</Button>
        {f.neg ? <Button variant="secondary" size="sm" className="h-11" onPress={() => commit(raw.startsWith('-') ? raw.slice(1) : '-' + raw)}>±</Button> : <Button variant="secondary" size="sm" className="h-11" onPress={() => commit('')}>Limpar</Button>}
        <Button variant="secondary" size="sm" className="h-11" aria-label="Campo anterior" onPress={() => move(fid, -1)}><ChevronLeft className="size-5" /></Button>
        <Button size="sm" className="h-11" onPress={() => move(fid, 1)}>próximo ›</Button>
      </div>
    </div>
  );
}

/* ---------- leitura: veredito + achados; canais em acordeão; sem dados escondidos ---------- */
interface OutProps { res: GasResult; p: BedPatient | null; rec: GasRecord; acc: string | null; setAcc: (c: string | null) => void; dxAll: boolean; setDxAll: (v: boolean) => void; goto: (fid: string) => void; openRef: (id: string) => void }
function Output({ res, p, rec, acc, setAcc, dxAll, setDxAll, goto, openRef }: OutProps) {
  const pv = prevItemValues(p, rec);
  const main = res.main;
  const primary = (res.ch.ab || []).find((i) => i.id === 'primary' && !i.miss);
  const { compLine, rest } = restDx(res);
  const shown = dxAll ? rest : rest.slice(0, 3);
  const idle: { c: { id: string; t: string }; need: string[] }[] = [];
  const lbl = (m: string) => (F[m] || {}).l || m;
  return (
    <>
      {main ? <Verdict cls={sevCls(main.s)} kicker={primary ? primary.n : 'Ácido-base'} title={main.t} desc={compLine ? compLine.t : undefined} />
        : <Verdict cls="idle" kicker="Aguardando" title="Preencha pH, PaCO₂ e HCO₃" desc="Os demais cálculos aparecem conforme você lança os dados." />}
      {rest.length > 0 && (
        <section className="mt-3 rounded-2xl border border-border bg-surface p-4">
          <div className="mb-2 flex items-baseline gap-2"><h2 className="flex-1 text-[16px] font-semibold tracking-tight">Achados</h2><span className="text-xs text-muted">{rest.length}</span></div>
          <Steps items={shown.map((x) => [x.s, x.t])} />
          {rest.length > 3 && <Button variant="ghost" size="sm" className="mt-1 h-11 text-accent" onPress={() => setDxAll(!dxAll)}>{dxAll ? 'mostrar menos' : `ver todos (${rest.length})`}</Button>}
        </section>
      )}
      <div className="mt-3 flex flex-col gap-2">
        {E.CHANNELS.map((c) => {
          const items = res.ch[c.id] || [];
          if (!items.length) return null;
          const done = items.filter((i) => !i.miss), miss = items.filter((i) => i.miss);
          if (!done.length) { idle.push({ c, need: [...new Set(miss.flatMap((i) => i.miss || []))] }); return null; }
          const crit = done.filter((i) => i.fl === 'crit').length, warn = done.filter((i) => i.fl === 'warn').length;
          const open = acc === c.id;
          return (
            <section key={c.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
              <button type="button" aria-expanded={open} onClick={() => setAcc(open ? null : c.id)} className="flex min-h-13 w-full items-center gap-3 px-3.5 text-left">
                <i className="size-2.5 shrink-0 rounded-full" style={{ background: CHC[c.id] }} /><b className="flex-1 text-[15px] font-semibold">{c.t}</b>
                {crit > 0 && <Pill cls="crit">{crit}</Pill>}{warn > 0 && <Pill cls="warn">{warn}</Pill>}{!crit && !warn && <Pill cls="ok">ok</Pill>}<ChevronDown className={`size-5 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="border-t border-separator px-3 pb-3 pt-3">
                  <div className="grid grid-cols-2 gap-2">{done.map((i) => <ItemBtn key={i.id} i={i} pv={pv} onRef={openRef} />)}</div>
                  {miss.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted"><span>também calcula com</span>{miss.map((i) => <button key={i.id} type="button" onClick={() => goto(i.miss![0])} className="min-h-9 rounded-full border border-dashed border-muted px-2.5 text-left text-[12.5px] text-foreground/80"><b>{i.l}</b> {i.miss!.map(lbl).join(' + ')}</button>)}</div>}
                  {c.id === 'ab' && H(rec.i.ph) && H(rec.i.hco3) && <details className="mt-3"><summary className="min-h-11 cursor-pointer text-[14px] font-medium leading-[44px]">Mapa ácido-base (Davenport)</summary><DavenportMap ph={Number(rec.i.ph)} hco3={Number(rec.i.hco3)} /></details>}
                </div>
              )}
            </section>
          );
        })}
      </div>
      {idle.length > 0 && (
        <details className="mt-3 rounded-2xl border border-border bg-surface">
          <summary className="flex min-h-13 cursor-pointer items-center gap-2 px-4"><b className="flex-1 text-[15px] font-semibold">Outros cálculos disponíveis</b><span className="text-xs text-muted">{idle.length}</span></summary>
          <div className="flex flex-col divide-y divide-separator border-t border-separator">
            {idle.map(({ c, need }) => (
              <button key={c.id} type="button" onClick={() => goto(need[0])} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold" style={{ color: CHC[c.id], background: `color-mix(in oklch, ${CHC[c.id]} 12%, transparent)` }}>{c.t.slice(0, 2)}</span>
                <span className="min-w-0 flex-1"><b className="block text-[15px] font-semibold">{c.t}</b><span className="block text-[13px] text-muted">{need.slice(0, 4).map(lbl).join(' · ')}{need.length > 4 ? ' …' : ''}</span></span><ChevronRight className="size-5 text-muted" />
              </button>
            ))}
          </div>
        </details>
      )}
      <p className="mx-1 mt-4 text-xs leading-relaxed text-muted">Toque num resultado para ver fórmula, corte e fonte. Ferramenta de apoio à decisão: não substitui o julgamento clínico.</p>
    </>
  );
}

function ItemBtn({ i, pv, onRef }: { i: ChItem; pv: Record<string, number>; onRef: (id: string) => void }) {
  const isN = typeof i.v === 'number';
  let dl: string | null = null;
  if (isN && pv[i.id] != null) { const df = (i.v as number) - pv[i.id]; if (Math.abs(df) >= 0.5 * 10 ** -(i.dec || 0)) dl = `${df > 0 ? '▲' : '▼'}${fmt(Math.abs(df), i.dec)}`; }
  const bg = i.fl === 'crit' ? 'bg-danger-soft text-danger-soft-foreground' : i.fl === 'warn' ? 'bg-warning-soft text-warning-soft-foreground' : i.verdict ? 'bg-success-soft text-success-soft-foreground' : 'bg-surface-secondary';
  const wide = i.verdict || i.txt;
  return (
    <button type="button" onClick={() => i.ref && onRef(i.ref)} className={`flex min-h-16 flex-col rounded-xl px-3 py-2.5 text-left ${bg} ${wide ? 'col-span-full' : ''}`}>
      <span className="font-mono text-[11.5px] text-muted">{i.verdict ? 'Teste de fluido' : i.l}</span>
      <span className={`num mt-0.5 leading-tight ${i.verdict || i.txt ? 'text-[17px] font-semibold' : 'text-[24px] font-semibold'}`}>
        {i.verdict ? <>{i.l}{isN && <span className="ml-1 font-mono text-xs font-normal text-muted">{fmt(i.v as number, i.dec)}{i.u || ''}</span>}</> : <>{isN ? fmt(i.v as number, i.dec) : String(i.v ?? '')}{isN && i.u && <span className="ml-1 font-mono text-xs font-normal text-muted">{i.u}</span>}</>}
      </span>
      {i.n && <span className="mt-0.5 text-[12.5px] leading-snug text-foreground/75">{i.n}</span>}
      {dl && <span className="mt-0.5 font-mono text-[11.5px] text-muted">{dl}</span>}
    </button>
  );
}

/* referência do item: fórmula, corte e fonte */
function RefSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const r = id ? E.REF[id] : null;
  return (
    <BottomSheet open={!!r} onClose={onClose} label="Referência" title={r ? r.t : ''}>
      {r && <>
        <Pill cls={r.v ? 'ok' : ''}>{r.v ? 'verificado na pesquisa' : 'referência clássica'}</Pill>
        <div className="my-2 whitespace-pre-line rounded-lg border border-separator bg-surface-secondary px-3 py-2 font-mono text-[12.5px] leading-relaxed text-foreground/80">{r.f}</div>
        <p className="whitespace-pre-line text-[14.5px] leading-relaxed">{r.c}</p>
        <p className="mt-3 text-xs text-muted">{r.s}</p>
      </>}
    </BottomSheet>
  );
}
