/* RASS — Richmond Agitation-Sedation Scale (ver rass.calc.ts). */
import { useEffect, useState } from 'react';
import { ChoiceList, Note, Verdict } from '@/components/ui';
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
