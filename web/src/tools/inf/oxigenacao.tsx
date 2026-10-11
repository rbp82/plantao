/* Oxigenação e transporte de O₂: P/F, extração, SvO₂, DO₂, VO₂. */
import { useEffect, useState } from 'react';
import { Grid, Note, NumField, Readout, Readouts, Ref, Section, Steps } from '@/components/ui';
import { registerTool, type ToolProps } from '@/tools/registry';
import { computeOxigenacao, type Out } from './oxigenacao.calc';
import { val } from './shared';

const L = { pa: [10, 700], fi: [0.21, 100], sa: [10, 100], sv: [5, 100], hb: [1, 25], dc: [0.5, 25] } as const;

const R = ({ label, o, note, className }: { label: string; o: Out | null; note?: string; className?: string }) => (
  <Readout className={className} label={label} value={o?.value} unit={o?.unit || undefined} cls={o?.cls} status={o?.status || undefined} note={note || undefined} />
);

function OxigenacaoTool({ api }: ToolProps) {
  const [pa, setPa] = useState('');
  const [fi, setFi] = useState('');
  const [sa, setSa] = useState('');
  const [sv, setSv] = useState('');
  const [hb, setHb] = useState('');
  const [dc, setDc] = useState('');
  const m = computeOxigenacao({ pa: val(pa, [...L.pa]), fi: val(fi, [...L.fi]), sa: val(sa, [...L.sa]), sv: val(sv, [...L.sv]), hb: val(hb, [...L.hb]), dc: val(dc, [...L.dc]) });
  useEffect(() => { api.setSummary(m.summary); });
  return (
    <div className="flex flex-col gap-3">
      <Section>
        <Grid>
          <NumField label="PaO₂" unit="mmHg" placeholder="85" lim={[...L.pa]} value={pa} onChange={setPa} />
          <NumField label="FiO₂" unit="%" placeholder="40" hint="aceita 40 ou 0,4" lim={[...L.fi]} value={fi} onChange={setFi} />
          <NumField label="SaO₂" unit="%" placeholder="96" lim={[...L.sa]} value={sa} onChange={setSa} />
          <NumField label="SvO₂ / ScvO₂" unit="%" placeholder="65" lim={[...L.sv]} value={sv} onChange={setSv} />
          <NumField label="Hemoglobina" unit="g/dL" placeholder="10" lim={[...L.hb]} value={hb} onChange={setHb} />
          <NumField label="Débito cardíaco" unit="L/min" placeholder="4,5" lim={[...L.dc]} value={dc} onChange={setDc} />
        </Grid>
      </Section>
      <Readouts>
        <R label="PaO₂/FiO₂" o={m.pf} />
        <R label="Extração O₂" o={m.te} note={m.teNote} />
        <R label="SvO₂ / ScvO₂" o={m.sv} note={m.svNote} />
        <R label="DO₂ estimada" o={m.do2} note={m.do2Note} />
        <R label="VO₂ estimado" o={m.vo2} note={m.vo2Note} className="col-span-full" />
      </Readouts>
      {m.alert && <Note cls="crit">Extração {'>'} 50% com SvO₂ baixa — hipoperfusão grave. Otimizar DC, corrigir anemia, considerar inotrópico.</Note>}
      <Section title="Leitura rápida">
        <Steps items={[
          ['crit', <><b>Extração {'>'} 50%:</b> hipoperfusão grave — aumentar oferta (Hb, DC, SaO₂) ou reduzir consumo.</>],
          ['warn', <><b>SvO₂ {'<'} 65%:</b> extração aumentada → baixo débito ou anemia grave.</>],
          ['warn', <><b>SvO₂ {'>'} 80%:</b> shunt ou bloqueio mitocondrial (sepse avançada).</>],
          ['info', <><b>P/F</b> (Berlim, com PEEP ≥ 5): 201–300 leve · 101–200 moderada · ≤ 100 grave.</>],
          ['', <><b>Meta Hb</b> {'>'} 7 g/dL; no choque com baixo DC ou isquemia, considerar 8–9.</>],
        ]} />
      </Section>
      <Ref>Fontes: Berlim — ARDS Definition Task Force, JAMA 2012;307:2526 (PMID 22797452): leve 200 {'<'} P/F ≤ 300, moderada 100 {'<'} P/F ≤ 200, grave ≤ 100, com PEEP/CPAP ≥ 5. A definição global de 2023/2024 (Matthay MA et al. Am J Respir Crit Care Med 2024;209:37, PMID 37487152; ESICM 2023, Grasselli G et al., PMID 37326646) aceita SpO₂/FiO₂ ≤ 315 (SpO₂ ≤ 97%) e cateter nasal de alto fluxo ≥ 30 L/min — não implementada nesta ferramenta. ScvO₂ ≥ 70% como meta: Rivers E et al. NEJM 2001;345:1368 (PMID 11794169). Hb-alvo 7 g/dL (estratégia restritiva; exceções: isquemia miocárdica, hipoxemia grave, hemorragia aguda): SSC 2021 (PMID 34605781). DO₂ = DC × (1,34 × Hb × SaO₂ + 0,003 × PaO₂) × 10, SvO₂ 65–75% e extração 20–30%: fisiologia padrão, sem fonte primária única.</Ref>
    </div>
  );
}

registerTool({
  id: 'oxigenacao', group: 'resp', tile: 'DO₂',
  title: 'Oxigenação e transporte de O₂',
  sub: 'P/F, extração de O₂, SvO₂, DO₂, VO₂',
  keywords: ['pao2/fio2', 'p/f', 'relacao pf', 'horowitz', 'sdra', 'svo2', 'scvo2', 'teo2', 'extracao', 'do2', 'vo2', 'oferta de oxigenio', 'debito cardiaco'],
  Component: OxigenacaoTool,
});
