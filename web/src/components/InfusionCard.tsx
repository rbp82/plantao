/* Cartão de droga em infusão contínua: diluição editável (salva no cofre), vazão ↔ dose. */
import { useState } from 'react';
import { Button, Card } from '@heroui/react';
import { Segment } from '@/components/pro';
import { Lock, Pencil } from 'lucide-react';
import { C, num } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { NumField, Readout, Note } from '@/components/ui';
import { computeInfusion, concLabel, concOf, type Drug, type Mode } from '@/tools/infusion';

export interface InfState { in: string }
export function InfusionCard({ d, mode, peso, input, onInput }: { d: Drug; mode: Mode; peso: number; input: string; onInput: (v: string) => void }) {
  const [dil, setDil] = useStore<{ amt: string; vol: string } | null>('dil:' + d.id, null);
  const [edit, setEdit] = useState(d.amt === undefined);
  const amtS = d.locked || !dil ? (d.amt !== undefined ? String(d.amt) : '') : dil.amt;
  const volS = d.locked || !dil ? (d.vol !== undefined ? String(d.vol) : '') : dil.vol;
  const amt = num(amtS), vol = num(volS);
  const conc = concOf(amt, d.amtU, vol);
  const res = computeInfusion(d, mode, num(input), conc, peso);
  const ok = !('missing' in res);
  const setDilution = (a: string, v: string) => { if (a === String(d.amt) && v === String(d.vol)) setDil(null); else setDil({ amt: a, vol: v }); };

  return (
    <Card className="w-full gap-0 p-3.5">
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1"><b className="block text-[16.5px] font-semibold leading-tight">{d.name}</b>{d.sub && <span className="block text-[13px] text-muted">{d.sub}</span>}</div>
        <Button variant={d.locked ? 'secondary' : 'outline'} size="sm" isDisabled={d.locked} onPress={() => setEdit((e) => !e)} aria-label="Diluição"
          className={`h-9 shrink-0 gap-1.5 font-mono text-xs ${d.locked ? 'text-danger' : 'border-dashed'}`}>
          {d.locked ? <Lock className="size-3.5" /> : <Pencil className="size-3.5" />}
          {Number.isFinite(amt) && Number.isFinite(vol) ? `${C.fmtN(amt)} ${d.amtU} / ${C.fmtN(vol)} mL` : 'definir diluição'}
        </Button>
      </div>
      {edit && !d.locked && (
        <div className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <NumField label={d.amtU + ' na solução'} unit={d.amtU} value={amtS} onChange={(v) => setDilution(v, volS)} placeholder={d.ph} lim={[0.001, 1e6]} />
          <NumField label="Volume total" unit="mL" value={volS} onChange={(v) => setDilution(amtS, v)} lim={[1, 2000]} />
          {d.amt !== undefined ? <Button variant="secondary" size="sm" className="h-13" onPress={() => setDil(null)}>Padrão</Button> : <span />}
        </div>
      )}
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-2.5">
        <NumField label={mode === 'dose' ? 'Vazão na bomba' : 'Dose desejada'} unit={mode === 'dose' ? 'mL/h' : d.dose} value={input} onChange={onInput} lim={[0, 100000]} placeholder="—" />
        <Readout label={mode === 'dose' ? 'Dose' : 'Programar bomba'}
          value={ok ? (mode === 'dose' ? C.fmtDose(res.dose) : C.fmt(res.mlh, res.mlh >= 100 ? 0 : 1)) : null}
          unit={mode === 'dose' ? d.dose : 'mL/h'} cls={ok ? res.tag.cls : undefined} status={ok ? res.tag.txt : undefined}
          note={ok ? res.alt.join(' · ') : 'missing' in res && res.missing === 'peso' ? 'Informe o peso' : undefined} />
      </div>
      <div className="mt-2.5 text-[12.5px] text-muted">{Number.isFinite(conc) ? <>Concentração <b className="num text-foreground/80">{concLabel(conc, d.amtU)}</b></> : <span className="text-warning">Defina a diluição (toque no rótulo tracejado)</span>}</div>
      {d.note && <div className="mt-1 text-[12.5px] leading-snug text-muted">{d.note}</div>}
      {ok && res.alerts.map(([c, h], i) => <Note key={i} cls={c}><span dangerouslySetInnerHTML={{ __html: h }} /></Note>)}
    </Card>
  );
}

/* seletor de sentido do cálculo */
export function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <Segment selectedKey={mode} onSelectionChange={(k) => onChange(k as Mode)} className="mb-3 w-full" aria-label="Sentido do cálculo">
      <Segment.Item id="dose" className="min-h-11 flex-1">mL/h → dose</Segment.Item>
      <Segment.Item id="rate" className="min-h-11 flex-1">Dose → mL/h</Segment.Item>
    </Segment>
  );
}

/* conjunto de cartões com um seletor de sentido (mL/h → dose · dose → mL/h) e resumo */
export function useInfusionSet(key: string, drugs: Drug[], peso: number) {
  const [mode, setMode] = useStore<Mode>(key + 'Mode', 'dose');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const setInput = (id: string, v: string) => setInputs((s) => ({ ...s, [id]: v }));
  const switchMode = (m: Mode) => { setMode(m); setInputs({}); };
  const summary = () => {
    const lines: string[] = [];
    drugs.forEach((d) => {
      const dil = C.store.get<{ amt: string; vol: string } | null>('dil:' + d.id, null);
      const amt = num(d.locked || !dil ? String(d.amt ?? '') : dil.amt), vol = num(d.locked || !dil ? String(d.vol ?? '') : dil.vol);
      const r = computeInfusion(d, mode, num(inputs[d.id] || ''), concOf(amt, d.amtU, vol), peso);
      if ('missing' in r) return;
      const dilTxt = `${C.fmtN(amt)} ${d.amtU} / ${C.fmtN(vol)} mL`;
      lines.push(mode === 'dose' ? `${d.name} (${dilTxt}): ${inputs[d.id]} mL/h = ${C.fmtDose(r.dose)} ${d.dose}` : `${d.name} (${dilTxt}): ${inputs[d.id]} ${d.dose} = ${C.fmt(r.mlh, 1)} mL/h`);
    });
    return lines.length ? (peso > 0 ? `Peso ${C.fmtN(peso)} kg\n` : '') + lines.join('\n') : '';
  };
  return { mode, switchMode, inputs, setInput, summary };
}
