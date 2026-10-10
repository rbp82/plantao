/* Cetoacidose diabética — Kitabchi AE et al. Diabetes Care 2009;32:1335 (ADA) · UpToDate. Lógica em cad.calc.ts. */
import { useEffect, useState } from 'react';
import { ChoiceList, Grid, Note, NumField, Ref, Section, SegField, Steps, Verdict } from '@/components/ui';
import { registerTool, type ToolProps } from '@/tools/registry';
import { computeCad, type Item, type SimNao, type Via, type Volemia } from './cad.calc';
import { readLim, rich, richSteps } from './rich';

const Block = ({ title, items }: { title: string; items: Item[] }) => <Section title={title}><Steps items={richSteps(items)} /></Section>;

function CadTool({ api, peso }: ToolProps) {
  const [gl, setGl] = useState('');
  const [ph, setPh] = useState('');
  const [hc, setHc] = useState('');
  const [k, setK] = useState('');
  const [na, setNa] = useState('');
  const [vol, setVol] = useState<Volemia>('leve');
  const [via, setVia] = useState<Via>('iv');
  const [diu, setDiu] = useState<SimNao>('sim');
  const [oral, setOral] = useState<SimNao>('nao');

  const m = computeCad({ peso, gl: readLim(gl, [20, 3000]), ph: readLim(ph, [6.5, 8]), hc: readLim(hc, [1, 60]), k: readLim(k, [1, 10]), na: readLim(na, [90, 200]), vol, via, diu, oral });
  useEffect(() => { api.setSummary(m.summary); });

  return (
    <div className="flex flex-col gap-3">
      <Section>
        <Grid cols={3}>
          <NumField label="Glicemia" unit="mg/dL" value={gl} onChange={setGl} placeholder="450" lim={[20, 3000]} />
          <NumField label="pH" value={ph} onChange={setPh} placeholder="7,20" lim={[6.5, 8]} />
          <NumField label="HCO₃⁻" unit="mEq/L" value={hc} onChange={setHc} placeholder="12" lim={[1, 60]} />
          <NumField label="K⁺" unit="mEq/L" value={k} onChange={setK} placeholder="4,2" lim={[1, 10]} />
          <NumField label="Na⁺" unit="mEq/L" value={na} onChange={setNa} placeholder="138" lim={[90, 200]} />
        </Grid>
      </Section>
      <Section>
        <div className="flex flex-col gap-3">
          <ChoiceList label="Estado volêmico (após 1ª hora de SF 0,9%)" value={vol} onChange={(v) => setVol(v as Volemia)}
            options={[{ value: 'leve', label: 'Desidratação leve' }, { value: 'grave', label: 'Hipovolemia grave' }, { value: 'choque', label: 'Choque cardiogênico' }]} />
          <SegField label="Insulina" value={via} onChange={(v) => setVia(v as Via)} options={[{ value: 'iv', label: 'Endovenosa' }, { value: 'sc', label: 'Subcutânea' }]} />
          <SegField label="Diurese ≥ 50 mL/h?" value={diu} onChange={(v) => setDiu(v as SimNao)} options={[{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não / incerta' }]} />
          <SegField label="Fase" value={oral} onChange={(v) => setOral(v as SimNao)} options={[{ value: 'nao', label: 'Em CAD' }, { value: 'sim', label: 'Resolvida, aceita VO' }]} />
        </div>
      </Section>

      {m.kind === 'idle' && <Verdict cls="idle" kicker="Aguardando" title={'Faltam: ' + m.missing.join(', ')} desc="A conduta aparece assim que todos os campos forem preenchidos." />}
      {m.kind === 'none' && <Verdict cls={m.verdict.cls} kicker={m.verdict.kicker} title={m.verdict.title} desc={m.verdict.desc} />}
      {m.kind === 'cad' && (
        <>
          <div>
            <Verdict cls={m.verdict.cls} kicker={m.verdict.kicker} title={m.verdict.title} desc={m.verdict.desc} />
            {m.alerts.map(([c, t], i) => <Note key={i} cls={c}>{rich(t)}</Note>)}
          </div>
          <Block title="Fluidos" items={m.fluidos} />
          <Block title="Potássio" items={m.potassio} />
          <Block title="Insulina" items={m.insulina} />
          <Block title="Bicarbonato" items={m.bicarbonato} />
          <Block title="Monitorização" items={m.monitorizacao} />
        </>
      )}
      <Ref>Kitabchi AE et al. Diabetes Care 2009;32:1335 (ADA) · UpToDate.</Ref>
    </div>
  );
}

registerTool({
  id: 'cad', group: 'met', tile: 'CAD', weight: true,
  title: 'Cetoacidose diabética',
  sub: 'Gravidade, fluidos, potássio, insulina, bicarbonato',
  keywords: ['cad', 'cetoacidose', 'diabetes', 'insulina', 'hiperglicemia', 'potassio', 'bicarbonato', 'ada', 'kitabchi'],
  Component: CadTool,
});
