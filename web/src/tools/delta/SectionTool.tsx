/* Ferramenta genérica por seções sobre o motor C.engine (padrão sectionTool do delta.js).
   Seções obrigatórias abertas; opcionais recolhidas com prévia do resultado no cabeçalho;
   interpretação (achados do canal) e "Fórmulas, cortes e fontes" no rodapé. */
import { useEffect, useState, type ReactNode } from 'react';
import { Card } from '@heroui/react';
import { ChevronDown } from 'lucide-react';
import { CalcLine, CheckGroup, CheckRow, Grid, NumField, Pill, Readout, Readouts, Section, SegField, Span2, Steps } from '@/components/ui';
import { usePatientField } from '@/lib/patients';
import type { ToolApi } from '@/tools/registry';
import { F, PK, fmt, itemCls, lbl, placeholderOf, readNum, defRefs, runSection, type Inputs, type OutItem, type RefEntry, type SectionDef, type SectionOut, type ToolDef } from './delta.calc';

/* ---------- cartão recolhível (fechado por padrão) ---------- */
export function Collapsible({ title, aux, children, defaultOpen }: { title: ReactNode; aux?: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <Card className="w-full gap-0 overflow-hidden p-0">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-h-13 w-full items-center gap-2 px-4 py-3 text-left active:bg-surface-secondary">
        <span className="flex-1 text-[16px] font-semibold tracking-tight">{title}</span>
        {aux && <span className="max-w-[55%] truncate text-xs text-muted">{aux}</span>}
        <ChevronDown className={`size-5 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </Card>
  );
}

/* ---------- referência (fórmula, cortes e fonte) ---------- */
const lines = (s: string) => s.split('\n').map((l, i) => <span key={i}>{i > 0 && <br />}{l}</span>);
export function RefBlock({ r, title }: { r: RefEntry; title?: boolean }) {
  return (
    <div className="border-t border-separator py-3 first:border-t-0 first:pt-0 last:pb-0">
      {title !== false && <div className="flex items-center gap-2 text-[14.5px] font-semibold"><span>{r.t}</span>{r.v && <Pill cls="ok">verificado</Pill>}</div>}
      <CalcLine>{lines(r.f)}</CalcLine>
      <p className="text-[13.5px] leading-snug text-foreground/80">{lines(r.c)}</p>
      <p className="mt-1 text-xs text-muted">{r.s}</p>
    </div>
  );
}
export function RefList({ refs }: { refs: RefEntry[] }) {
  return <div className="flex flex-col">{refs.map((r, i) => <RefBlock key={i} r={r} />)}</div>;
}

/* ---------- campo gerado a partir de C.gasF.F ---------- */
export type FieldValue = string | boolean;
export function EngineField({ fid, value, onChange, label, unit }: { fid: string; value: FieldValue; onChange: (v: FieldValue) => void; label?: string; unit?: string }) {
  const f = F[fid];
  if (fid === 'sex') {
    return <Span2><SegField label="Sexo" value={String(value || '')} onChange={onChange} options={[{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Feminino' }]} /></Span2>;
  }
  if (f.type === 'enum') {
    return <Span2><SegField label={f.l} value={String(value || '')} onChange={onChange} options={(f.opts || []).map(([v, l]) => ({ value: v, label: l }))} /></Span2>;
  }
  if (f.type === 'bool') {
    return <Span2><CheckGroup><CheckRow checked={value === true} onChange={onChange} label={f.l} /></CheckGroup></Span2>;
  }
  const inPat = fid in PK;
  return <NumField label={label ?? f.l} unit={unit ?? f.u} value={typeof value === 'string' ? value : ''} onChange={onChange} lim={f.p} placeholder={inPat ? undefined : placeholderOf(f)} />;
}

/* ---------- resultado de um item do motor ---------- */
export function ItemReadout({ it }: { it: OutItem }) {
  const isN = typeof it.v === 'number';
  return (
    <Readout
      label={it.l}
      value={isN ? fmt(it.v as number, it.dec) : it.v == null ? null : String(it.v)}
      unit={isN ? it.u || undefined : undefined}
      cls={itemCls(it.fl)}
      note={it.n || undefined}
      className={it.txt ? 'col-span-full' : undefined}
    />
  );
}

/* ---------- estado dos campos: locais + compartilhados do paciente ---------- */
export function usePatientInputs() {
  const [sexo, setSexo] = usePatientField('sexo');
  const [idade, setIdade] = usePatientField('idade');
  const [altura, setAltura] = usePatientField('altura');
  const get = (fid: string): string => (fid === 'sex' ? sexo : fid === 'age' ? idade : fid === 'height' ? altura : '');
  const set = (fid: string, v: string) => { if (fid === 'sex') setSexo(v); else if (fid === 'age') setIdade(v); else if (fid === 'height') setAltura(v); };
  const shared = (fid: string) => fid === 'sex' || fid in PK;
  return { get, set, shared };
}
/* texto/checagem dos campos → entradas numéricas do motor (fora do plausível = ausente, como no antigo) */
export function collectInputs(fids: readonly string[], read: (fid: string) => FieldValue): Inputs {
  const r: Inputs = {};
  fids.forEach((fid) => {
    const f = F[fid], v = read(fid);
    if (fid === 'sex' || f.type === 'enum') { if (v) r[fid] = String(v); }
    else if (f.type === 'bool') r[fid] = v === true;
    else { const n = readNum(typeof v === 'string' ? v : '', f.p); if (Number.isFinite(n)) r[fid] = n; }
  });
  return r;
}

function SectionBody({ s, out, read, write }: { s: SectionDef; out: SectionOut; read: (fid: string) => FieldValue; write: (fid: string, v: FieldValue) => void }) {
  return (
    <>
      {s.f.length > 0 && <Grid>{s.f.map((fid) => <EngineField key={fid} fid={fid} value={read(fid)} onChange={(v) => write(fid, v)} />)}</Grid>}
      {out.got.length > 0 && <Readouts className={s.f.length ? 'mt-3' : ''}>{out.got.map((it) => <ItemReadout key={it.id} it={it} />)}</Readouts>}
      {out.need.length > 0 && <p className="mt-2 text-xs text-muted">Para calcular: {out.need.map(lbl).join(', ')}.</p>}
    </>
  );
}

export function SectionTool({ def, api, peso, weight }: { def: ToolDef; api: ToolApi; peso: number; weight?: boolean }) {
  const pat = usePatientInputs();
  const [local, setLocal] = useState<Record<string, FieldValue>>({});
  const fids = def.sections.flatMap((s) => s.f);
  const read = (fid: string): FieldValue => (pat.shared(fid) ? pat.get(fid) : local[fid] ?? (F[fid].type === 'bool' ? false : ''));
  const write = (fid: string, v: FieldValue) => { if (pat.shared(fid)) pat.set(fid, String(v)); else setLocal((o) => ({ ...o, [fid]: v })); };
  const inputs = collectInputs(fids, read);
  if (weight && Number.isFinite(peso)) inputs.weight = peso;
  const model = runSection(def, inputs);
  useEffect(() => { api.setSummary(model.txt); });
  const refs = defRefs(def);
  return (
    <div className="flex flex-col gap-3">
      {def.intro && <p className="mx-1 text-[14px] leading-snug text-muted">{def.intro}</p>}
      {def.sections.map((s, i) => {
        const out = model.sections[i];
        const body = <SectionBody s={s} out={out} read={read} write={write} />;
        return s.opt
          ? <Collapsible key={i} title={s.t} aux={out.preview}>{body}</Collapsible>
          : <Section key={i} title={s.t}>{body}</Section>;
      })}
      {model.dx.length > 0 && <Section title="Interpretação"><Steps items={model.dx.map((x) => [x.s, x.t])} /></Section>}
      {refs.length > 0 && <Collapsible title="Fórmulas, cortes e fontes"><RefList refs={refs} /></Collapsible>}
    </div>
  );
}
