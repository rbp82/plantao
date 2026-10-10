/* Triagem de sepse: qSOFA, SIRS + disfunção (ILAS), choque séptico (Sepsis-3). */
import { useEffect, useState } from 'react';
import { CheckGroup, CheckRow, Grid, Lbl, Note, NumField, Section, Verdict } from '@/components/ui';
import { registerTool, type ToolProps } from '@/tools/registry';
import { computeSepse, DISF, QSOFA, SIRS, type SepseNote } from './sepse.calc';
import { val } from './shared';

const LIM_LAC: [number, number] = [0.1, 30];
const LIM_PAM: [number, number] = [10, 200];

const NoteB = ({ n }: { n: SepseNote | null }) => (n ? <Note cls={n.cls}>{n.b && <b>{n.b}</b>}{n.t}</Note> : null);

function Checks({ items, state, onChange }: { items: { label: string; sub?: string }[]; state: boolean[]; onChange: (s: boolean[]) => void }) {
  return (
    <CheckGroup>
      {items.map((it, i) => <CheckRow key={i} checked={state[i]} onChange={(v) => { const n = state.slice(); n[i] = v; onChange(n); }} label={it.label} sub={it.sub} />)}
    </CheckGroup>
  );
}

function SepseTool({ api }: ToolProps) {
  const [q, setQ] = useState<boolean[]>(QSOFA.map(() => false));
  const [s, setS] = useState<boolean[]>(SIRS.map(() => false));
  const [d, setD] = useState<boolean[]>(DISF.map(() => false));
  const [lac, setLac] = useState('');
  const [pam, setPam] = useState('');
  const [vp, setVp] = useState(false);
  const m = computeSepse({ q, s, d, lac: val(lac, LIM_LAC), pam: val(pam, LIM_PAM), vp });
  useEffect(() => { api.setSummary(m.summary); });
  return (
    <div className="flex flex-col gap-3">
      <Section title="qSOFA" aux="infecção suspeita + ≥ 2 = alto risco">
        <Checks items={QSOFA} state={q} onChange={setQ} />
        <div className="mt-3"><Verdict cls={m.qVerdict.cls} kicker={m.qVerdict.kicker} title={m.qVerdict.title} desc={m.qVerdict.desc || undefined} /></div>
      </Section>
      <Section title="SIRS e disfunção orgânica" aux="ILAS">
        <Lbl>SIRS — 2 ou mais</Lbl>
        <Checks items={SIRS} state={s} onChange={setS} />
        <Lbl className="mt-4">Disfunção orgânica — qualquer uma, com suspeita de infecção, abre o protocolo</Lbl>
        <Checks items={DISF} state={d} onChange={setD} />
        <NoteB n={m.sirs} />
      </Section>
      <Section title="Choque séptico" aux="Sepsis-3: vasopressor + lactato > 2">
        <Grid>
          <NumField label="Lactato" unit="mmol/L" placeholder="3,2" lim={LIM_LAC} value={lac} onChange={setLac} />
          <NumField label="PAM após volume" unit="mmHg" placeholder="58" lim={LIM_PAM} value={pam} onChange={setPam} />
        </Grid>
        <div className="mt-3"><CheckGroup><CheckRow checked={vp} onChange={setVp} label="Precisa de vasopressor para PAM ≥ 65" /></CheckGroup></div>
        <NoteB n={m.choque} />
      </Section>
    </div>
  );
}

registerTool({
  id: 'sepse', group: 'inf', tile: 'qS',
  title: 'Triagem de sepse',
  sub: 'qSOFA, SIRS + disfunção (ILAS), choque séptico',
  keywords: ['qsofa', 'sirs', 'ilas', 'sepse', 'choque septico', 'protocolo', 'disfuncao organica', 'lactato'],
  Component: SepseTool,
});
