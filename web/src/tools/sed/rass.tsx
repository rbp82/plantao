/* RASS — Richmond Agitation-Sedation Scale (ver rass.calc.ts). */
import { useEffect, useState } from 'react';
import { ChoiceList, Note, Ref, Verdict } from '@/components/ui';
import { registerTool, type ToolProps } from '@/tools/registry';
import { RASS, rassRow, rassSummary, rassVerdictCls, sgn } from './rass.calc';

function RassTool({ api }: ToolProps) {
  const [val, setVal] = useState<string | null>(null);
  const r = rassRow(val);
  useEffect(() => { api.setSummary(rassSummary(r)); });
  return (
    <>
      {r
        ? <Verdict cls={rassVerdictCls(r)} kicker={'RASS ' + sgn(r.score)} title={r.verdict} desc={r.action} />
        : <Verdict cls="idle" kicker="RASS" title="Toque no nível atual" desc="Meta habitual: sedação leve (RASS −2 a 0)." />}
      <div className="mt-3">
        <ChoiceList
          label="Nível"
          value={val}
          onChange={(v) => { setVal(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          options={RASS.map((x) => ({ value: String(x.score), lead: sgn(x.score), tone: x.cls, label: x.title, sub: x.desc }))}
        />
      </div>
      <Note cls="info"><b>Meta SCCM PAD/PADIS:</b> sedação leve (RASS −2 a 0; o PADIS 2018 aceita até +1) e BPS ≤ 5, salvo indicação de sedação profunda. Avaliar diariamente despertar (SAT) e respiração espontânea (SBT).</Note>
      <Ref>Escala e descritores: Sessler CN et al. The Richmond Agitation-Sedation Scale: validity and reliability in adult intensive care unit patients. Am J Respir Crit Care Med 2002;166:1338–44 (PMID 12421743; DOI 10.1164/rccm.2107138). Meta de sedação leve (RASS −2 a +1) e SAT/SBT: Devlin JW et al. SCCM PADIS 2018. Crit Care Med 2018;46:e825–e873 (PMID 30113379; DOI 10.1097/CCM.0000000000003299); Barr J et al. SCCM PAD 2013. Crit Care Med 2013;41:263–306 (PMID 23269131).</Ref>
    </>
  );
}

registerTool({
  id: 'rass', group: 'sed', tile: 'RASS',
  title: 'RASS',
  sub: 'Richmond Agitation-Sedation Scale',
  keywords: ['richmond', 'agitacao', 'sedacao', 'escala', 'despertar'],
  Component: RassTool,
});
