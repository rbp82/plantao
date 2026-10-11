/* Bundle da 1ª hora: checklist SSC/ILAS e volume de 30 mL/kg. */
import { useEffect, useState } from 'react';
import { CheckGroup, CheckRow, Note, NumField, Readout, Readouts, Ref, Section } from '@/components/ui';
import { registerTool, type ToolProps } from '@/tools/registry';
import { BUNDLE, computeBundle } from './bundle.calc';
import { val } from './shared';

const LIM_LAC: [number, number] = [0.1, 30];
const BAR: Record<string, string> = { ok: 'bg-success', warn: 'bg-warning', crit: 'bg-danger' };

function BundleTool({ api, peso }: ToolProps) {
  const [lac, setLac] = useState('');
  const [done, setDone] = useState<boolean[]>(BUNDLE.map(() => false));
  const m = computeBundle({ peso, lac: val(lac, LIM_LAC), done });
  useEffect(() => { api.setSummary(m.summary); });
  return (
    <div className="flex flex-col gap-3">
      <Readouts><Readout className="col-span-full" label="Cristaloide 30 mL/kg" value={m.vol} unit="mL" cls="info" note={m.volNote} /></Readouts>
      <Section>
        <NumField label="Lactato inicial" unit="mmol/L" placeholder="3,2" optional lim={LIM_LAC} value={lac} onChange={setLac} />
        {m.lacNote && <Note cls={m.lacNote.cls}>{m.lacNote.t}</Note>}
      </Section>
      <Section title="Checklist" aux={<span className="num">{m.count}</span>}>
        <CheckGroup>
          {BUNDLE.map(([t, s], i) => <CheckRow key={i} checked={done[i]} onChange={(v) => { const n = done.slice(); n[i] = v; setDone(n); }} label={`${i + 1}. ${t}`} sub={s} />)}
        </CheckGroup>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-foreground/10"><i className={`block h-full transition-[width] ${BAR[m.barCls]}`} style={{ width: `${m.pct}%` }} /></div>
      </Section>
      <Note cls="warn"><b>Reavaliação em 6 h</b> (hiperlactatemia ou hipotensão): PAM, diurese, nível de consciência, perfusão periférica e lactato.</Note>
      <Ref>Fontes: SSC Hour-1 bundle — Levy MM, Evans LE, Rhodes A. Intensive Care Med 2018;44:925 (PMID 29675566): lactato (repetir se {'>'} 2), hemoculturas antes do antibiótico, antibiótico de amplo espectro, 30 mL/kg se hipotensão ou lactato ≥ 4, vasopressor para PAM ≥ 65. SSC 2021 — Evans L et al. Crit Care Med 2021;49:e1063 (PMID 34605781): ≥ 30 mL/kg nas primeiras 3 h, antibiótico em até 1 h no choque/sepse provável, noradrenalina 1ª linha, início em acesso periférico aceitável. ILAS, Protocolo clínico adulto (rev. ago/2018): 2º lactato em 2–4 h e reavaliação das 6 h. Clearance de lactato ≥ 10%: Jones AE et al. JAMA 2010;303:739 (PMID 20179283).</Ref>
    </div>
  );
}

registerTool({
  id: 'bundle', group: 'inf', tile: '1h', weight: true,
  title: 'Bundle da 1ª hora',
  sub: 'Checklist SSC/ILAS e volume de 30 mL/kg',
  keywords: ['surviving sepsis', 'ssc', 'ilas', 'hemocultura', 'cristaloide', '30 ml/kg', 'ressuscitacao volemica', 'checklist'],
  Component: BundleTool,
});
