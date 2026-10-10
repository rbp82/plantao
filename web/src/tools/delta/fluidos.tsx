/* Fluido-responsividade — VPP, VVS, PLR, EEO, mini-bolus, VCI e tidal volume challenge (delta.js).
   Os campos mudam com o teste (C.gasF.fluidFields / fluidLabel); o veredito vem do canal 'fluid' do motor. */
import { useEffect, useId, useState } from 'react';
import { CheckGroup, CheckRow, Grid, Section, SegField, Verdict } from '@/components/ui';
import { registerTool, type ToolProps } from '@/tools/registry';
import { CHK, F, FL, G, HINT, REF, VAL, runFluid, type Inputs } from './delta.calc';
import { Collapsible, EngineField, RefBlock, collectInputs, usePatientInputs, type FieldValue } from './SectionTool';

/* escolha única em linhas de 3 (equivalente ao seg 'wrap3' do antigo) */
function WrapSeg({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <span id={id} className="text-[13.5px] font-medium">{label}</span>
      <div role="radiogroup" aria-labelledby={id} className="grid grid-cols-3 gap-1.5">
        {options.map(([v, l]) => {
          const on = v === value;
          return (
            <button key={v} type="button" role="radio" aria-checked={on} onClick={() => onChange(v)}
              className={`min-h-11 rounded-xl border px-2 text-[14.5px] font-semibold transition-colors ${on ? 'border-accent bg-accent-soft text-accent-soft-foreground' : 'border-border bg-surface active:bg-surface-secondary'}`}>
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const ALL = ['ftest', 'fMet', ...FL, ...CHK, 'sex', 'height', ...VAL] as const;

function FluidosTool({ api }: ToolProps) {
  const pat = usePatientInputs();
  const [local, setLocal] = useState<Record<string, FieldValue>>({ ftest: 'plr', fMet: 'mon' });
  const read = (fid: string): FieldValue => (pat.shared(fid) ? pat.get(fid) : local[fid] ?? (F[fid].type === 'bool' ? false : ''));
  const write = (fid: string, v: FieldValue) => { if (pat.shared(fid)) pat.set(fid, String(v)); else setLocal((o) => ({ ...o, [fid]: v })); };
  const inputs: Inputs = collectInputs(ALL, read);
  const ftest = String(inputs.ftest || '');
  const m = runFluid(inputs);
  useEffect(() => { api.setSummary(m.txt); });
  const isPpv = ftest === 'vpp' || ftest === 'vvs';
  const ref = REF[ftest];
  const labelOf = (fid: string) => G.fluidLabel(fid, inputs) || null;
  return (
    <div className="flex flex-col gap-3">
      <Section>
        <WrapSeg label="Teste" value={ftest} onChange={(v) => write('ftest', v)} options={F.ftest.opts || []} />
        {m.show.has('fMet') && <div className="mt-3"><SegField label="Medida" value={String(read('fMet'))} onChange={(v) => write('fMet', v)} options={(F.fMet.opts || []).map(([v, l]) => ({ value: v, label: l }))} /></div>}
        {HINT[ftest] && <p className="mt-2.5 text-xs leading-snug text-muted">{HINT[ftest]}</p>}
      </Section>
      <Section title="Medidas">
        <Grid>
          {FL.filter((fid) => m.show.has(fid)).map((fid) => {
            const lb = labelOf(fid);
            return <EngineField key={fid} fid={fid} value={read(fid)} onChange={(v) => write(fid, v)} label={lb ? lb[0] : undefined} unit={lb ? lb[1] || undefined : undefined} />;
          })}
        </Grid>
      </Section>
      {isPpv && (
        <Section title="Condições de validade" aux="VPP/VVS">
          <CheckGroup>
            {CHK.map((fid) => <CheckRow key={fid} checked={read(fid) === true} onChange={(v) => write(fid, v)} label={F[fid].l} />)}
          </CheckGroup>
          <Grid className="mt-3">
            <EngineField fid="sex" value={read('sex')} onChange={(v) => write('sex', v)} />
            <EngineField fid="height" value={read('height')} onChange={(v) => write('height', v)} />
            {VAL.map((fid) => <EngineField key={fid} fid={fid} value={read(fid)} onChange={(v) => write(fid, v)} />)}
          </Grid>
          <p className="mt-2 text-xs leading-snug text-muted">Com Vt, altura e sexo o app confere Vt ≥ 8 mL/kg; com FC e FR, a razão FC/FR {'>'} 3,6.</p>
        </Section>
      )}
      <Verdict cls={m.cls} kicker={m.kicker} title={m.title} desc={m.desc || undefined} />
      {ref && <Collapsible title="Fórmulas, cortes e fontes"><RefBlock r={ref} title={false} /></Collapsible>}
    </div>
  );
}

registerTool({
  id: 'fluidos', group: 'hemo', tile: 'ΔVS',
  title: 'Fluido-responsividade',
  sub: 'VPP, VVS, elevação de pernas, oclusão expiratória, mini-bolus, VCI',
  keywords: ['volume', 'fluido', 'responsividade', 'vpp', 'ppv', 'vvs', 'svv', 'plr', 'elevacao passiva', 'pernas', 'eeo', 'oclusao', 'mini bolus', 'veia cava', 'vci', 'tidal volume challenge', 'vti'],
  Component: FluidosTool,
});
