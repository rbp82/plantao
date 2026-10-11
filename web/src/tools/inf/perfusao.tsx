/* Metas de perfusão: PAM, clearance de lactato, diurese, estratégia vasopressora (SSC). */
import { useEffect, useState } from 'react';
import { Grid, Note, NumField, Readout, Readouts, Ref, Section, Steps } from '@/components/ui';
import { registerTool, type ToolProps } from '@/tools/registry';
import { computePerfusao, type Out } from './perfusao.calc';
import { val } from './shared';

const LIM_PAM: [number, number] = [10, 200];
const LIM_DIU: [number, number] = [0, 2000];
const LIM_LAC: [number, number] = [0.1, 30];

const R = ({ label, o, note }: { label: string; o: Out | null; note?: string }) => <Readout label={label} value={o?.value} unit={o?.unit} cls={o?.cls} status={o?.status} note={note || undefined} />;

function PerfusaoTool({ api, peso }: ToolProps) {
  const [pam, setPam] = useState('');
  const [diu, setDiu] = useState('');
  const [lac, setLac] = useState('');
  const [lac0, setLac0] = useState('');
  const m = computePerfusao({ pam: val(pam, LIM_PAM), lac: val(lac, LIM_LAC), lac0: val(lac0, LIM_LAC), diu: val(diu, LIM_DIU), peso });
  useEffect(() => { api.setSummary(m.summary); });
  return (
    <div className="flex flex-col gap-3">
      <Section>
        <Grid>
          <NumField label="PAM" unit="mmHg" placeholder="62" lim={LIM_PAM} value={pam} onChange={setPam} />
          <NumField label="Diurese" unit="mL/h" placeholder="35" lim={LIM_DIU} value={diu} onChange={setDiu} />
          <NumField label="Lactato atual" unit="mmol/L" placeholder="2,8" lim={LIM_LAC} value={lac} onChange={setLac} />
          <NumField label="Lactato anterior" unit="mmol/L" placeholder="4,1" lim={LIM_LAC} value={lac0} onChange={setLac0} />
        </Grid>
      </Section>
      <Readouts>
        <R label="PAM" o={m.pam} />
        <R label="Lactato" o={m.lac} />
        <R label="Clearance lactato" o={m.cl} note={m.clNote} />
        <R label="Diurese" o={m.diu} note={m.diuNote} />
      </Readouts>
      {m.alert && <Note cls="crit">PAM {'<'} 65 com lactato {'>'} 2 — vasopressor e reavaliação volêmica urgente.</Note>}
      <Section title="Estratégia vasopressora" aux="SSC">
        <Steps items={[
          ['crit', <><b>1ª linha:</b> noradrenalina — iniciar cedo; acesso periférico aceitável até o central.</>],
          ['warn', <><b>2ª linha:</b> associar vasopressina (até 0,03 UI/min) quando a nora atinge 0,25–0,5 mcg/kg/min.</>],
          ['warn', <><b>3ª linha:</b> adrenalina se PAM inadequada com nora + vasopressina.</>],
          ['', <><b>Dopamina:</b> não recomendada de rotina; só em casos selecionados (bradicardia, baixo risco de taquiarritmia).</>],
          ['ok', <><b>Meta PAM ≥ 65 mmHg</b> — considerar 70–80 em HAS prévia ou oligúria refratária.</>],
        ]} />
      </Section>
      <Ref>Fontes: SSC 2021 — Evans L et al. Crit Care Med 2021;49:e1063 (PMID 34605781): PAM-alvo inicial 65 mmHg (recomendação forte contra alvos mais altos), noradrenalina 1ª linha, vasopressina associada quando a nora está em ~0,25–0,5 mcg/kg/min (VASST: 0,01–0,03 UI/min), adrenalina se PAM inadequada com ambas; dopamina só na indisponibilidade de noradrenalina, com atenção a arritmias. SEPSISPAM — Asfar P et al. NEJM 2014;370:1583 (PMID 24635770): PAM 80–85 não reduziu mortalidade; menos terapia renal substitutiva em hipertensos crônicos (base da nota “70–80 em HAS prévia”, decisão institucional). Lactato {'>'} 2 mmol/L: Sepsis-3 (PMID 26903338). Clearance de lactato ≥ 10%: Jones AE et al. JAMA 2010;303:739 (PMID 20179283). Oligúria {'<'} 0,5 mL/kg/h: ILAS 2018 / KDIGO.</Ref>
    </div>
  );
}

registerTool({
  id: 'perfusao', group: 'inf', tile: 'PAM', weight: true,
  title: 'Metas de perfusão',
  sub: 'PAM, clearance de lactato, diurese, vasopressores',
  keywords: ['clearance de lactato', 'diurese', 'pam', 'pressao arterial media', 'hemodinamica', 'vasopressor', 'choque', 'oliguria'],
  Component: PerfusaoTool,
});
