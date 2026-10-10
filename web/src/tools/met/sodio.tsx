/* Distúrbios do sódio — hipo e hipernatremia (balanço de massa, Adrogué-Madias). Lógica em sodio.calc.ts. */
import { useEffect, useState } from 'react';
import { Grid, Note, NumField, PickGrid, Readout, Readouts, Ref, Section, SegField, Steps, Verdict } from '@/components/ui';
import { registerTool, type ToolProps } from '@/tools/registry';
import { computeSodio, type Item, type ReadoutM, type Sexo, type Sintomas, type Tempo, type Volemia } from './sodio.calc';
import { readLim, rich, richSteps } from './rich';

const Block = ({ title, items }: { title: string; items: Item[] }) => <Section title={title}><Steps items={richSteps(items)} /></Section>;
const Outs = ({ items }: { items: ReadoutM[] }) => (
  <Readouts>
    {items.map((r, i) => <Readout key={i} label={r.label} value={r.value} unit={r.unit} cls={r.cls} status={r.status} note={r.note} big={r.big} className={r.span2 ? 'col-span-full' : undefined} />)}
  </Readouts>
);

function SodioTool({ api, peso }: ToolProps) {
  const [na, setNa] = useState('');
  const [gl, setGl] = useState('');
  const [sx, setSx] = useState<Sexo>('m');
  const [tempo, setTempo] = useState<Tempo>('cronica');
  const [sint, setSint] = useState<Sintomas>('leve');
  const [vol, setVol] = useState<Volemia>('eu');

  const m = computeSodio({ na: readLim(na, [90, 200]), gl: readLim(gl, [20, 3000]), peso, sx, tempo, sint, vol });
  useEffect(() => { api.setSummary(m.summary); });

  const verdict = m.kind !== 'idle' && <Verdict cls={m.verdict.cls} kicker={m.verdict.kicker} title={m.verdict.title} desc={m.verdict.desc} />;
  const corr = m.kind !== 'idle' && m.corr && <Note cls="warn">{rich(m.corr)}</Note>;

  return (
    <div className="flex flex-col gap-3">
      <Section>
        <Grid>
          <NumField label="Na⁺ sérico" unit="mEq/L" value={na} onChange={setNa} placeholder="128" lim={[90, 200]} />
          <NumField label="Glicemia" unit="mg/dL" value={gl} onChange={setGl} placeholder="—" optional lim={[20, 3000]} />
        </Grid>
        <div className="mt-3 flex flex-col gap-3">
          <PickGrid label="Água corporal total" value={sx} onChange={(v) => setSx(v as Sexo)}
            options={[{ value: 'm', label: 'Homem adulto', small: '0,6 × peso' }, { value: 'f', label: 'Mulher adulta', small: '0,5 × peso' }, { value: 'i', label: 'Homem idoso', small: '0,5 × peso' }, { value: 'if', label: 'Mulher idosa', small: '0,45 × peso' }]} />
          <SegField label="Instalação" value={tempo} onChange={(v) => setTempo(v as Tempo)}
            options={[{ value: 'aguda', label: 'Aguda', small: '< 48 h' }, { value: 'cronica', label: 'Crônica', small: '≥ 48 h ou incerta' }]} />
          <PickGrid label="Sintomas" cols={3} value={sint} onChange={(v) => setSint(v as Sintomas)}
            options={[{ value: 'leve', label: 'Leves', small: 'ou ausentes' }, { value: 'moderado', label: 'Moderados', small: 'náusea, confusão' }, { value: 'grave', label: 'Graves', small: 'convulsão, coma' }]} />
          <SegField label="Volemia (hiponatremia)" value={vol} onChange={(v) => setVol(v as Volemia)}
            options={[{ value: 'hipo', label: 'Hipo' }, { value: 'eu', label: 'Euvolêmico' }, { value: 'hiper', label: 'Hiper' }]} />
        </div>
      </Section>

      {m.kind === 'idle' && <Verdict cls="idle" kicker="Aguardando" title={'Faltam: ' + m.missing.join(', ')} />}
      {m.kind === 'normal' && <div>{verdict}{corr}</div>}
      {m.kind === 'hipo' && (
        <>
          <div>{verdict}{corr}</div>
          <Outs items={m.readouts} />
          <Block title="Conduta" items={m.conduta} />
          <Block title="Mielinólise osmótica" items={m.mielinolise} />
        </>
      )}
      {m.kind === 'hiper' && (
        <>
          <div>{verdict}{corr}</div>
          <Outs items={m.readouts} />
          <Block title="Conduta" items={m.conduta} />
          <Block title="Alertas" items={m.alertas} />
        </>
      )}
      <Ref>ACT = peso × fator. Volumes por balanço de massa (sistema fechado, sem perdas): NaCl 3% (513 mEq/L) V = ACT × ΔNa ÷ (513 − Na alvo); água livre (SG 5%) V = ACT × (Na/Na alvo − 1); SF 0,45% (77 mEq/L) V = ACT × (Na − Na alvo) ÷ (Na alvo − 77). Adrogué-Madias: ΔNa por litro = (Na infusão − Na) ÷ (ACT + 1). Déficit de água livre = ACT × (Na/140 − 1). Na corrigido pela glicemia: +2,4 mEq/L por 100 mg/dL acima de 100 (Hillier 1999). Perdas urinárias e insensíveis não entram nas fórmulas — dosar Na⁺ seriado.</Ref>
    </div>
  );
}

registerTool({
  id: 'sodio', group: 'met', tile: 'Na⁺', weight: true,
  title: 'Distúrbios do sódio',
  sub: 'Hipo e hipernatremia · NaCl 3%, água livre, metas',
  keywords: ['hiponatremia', 'hipernatremia', 'sodio', 'nacl 3%', 'salina hipertonica', 'agua livre', 'deficit de agua', 'mielinolise', 'siadh', 'desmopressina'],
  Component: SodioTool,
});
