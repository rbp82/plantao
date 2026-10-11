/* Equivalência de opioides (ver opioide.calc.ts). */
import { useEffect, useState } from 'react';
import { Empty, KV, Note, NumField, PickGrid, Ref, Section } from '@/components/ui';
import { fmtDose, num } from '@/lib/calc';
import { registerTool, type ToolProps } from '@/tools/registry';
import { EQ, computeOpioid, eqSource } from './opioide.calc';

function OpioideTool({ api }: ToolProps) {
  const [key, setKey] = useState<string | null>(null);
  const [dose, setDose] = useState('');
  const src = eqSource(key);
  const r = computeOpioid(key, num(dose));
  useEffect(() => { api.setSummary(r ? r.summary : ''); });
  return (
    <>
      <Section>
        <PickGrid label="Opioide em uso" value={key} onChange={setKey} options={EQ.map((e) => ({ value: e.key, label: e.name, small: e.unit }))} />
        <div className="mt-3.5"><NumField label="Dose atual" unit={src ? src.unit : '—'} value={dose} onChange={setDose} lim={[0, 100000]} /></div>
      </Section>
      <Section className="mt-3" title={r ? r.title : undefined}>
        {r
          ? <KV rows={r.rows.map((row) => [
              <>{row.name}{row.extra && <><br /><small className="text-muted">{row.extra}</small></>}</>,
              <><b className="text-xl">{fmtDose(row.v)}</b> <small className="font-normal text-muted">{row.unit}</small></>,
            ])} />
          : <Empty>Escolha o opioide e digite a dose.</Empty>}
      </Section>
      <Note cls="warn">Estimativas. Ao trocar de opioide, <b>reduzir 25–50%</b> (tolerância cruzada incompleta) e titular. Considerar função renal/hepática e tempo de uso.</Note>
      <Section className="mt-3" title="Potências relativas" aux="≈ morfina IV 1 mg">
        <KV rows={[
          ['Morfina VO', '3 mg'],
          ['Fentanil IV', '10 mcg'],
          ['Sufentanil IV', '1 mcg'],
          ['Remifentanil IV', '≈ fentanil, mcg a mcg'],
          ['Tramadol VO', '15 mg (fator 0,2 sobre morfina VO)'],
          ['Codeína VO', '20 mg (fator 0,15 sobre morfina VO)'],
        ]} />
        <p className="mt-2.5 text-xs text-muted">Tabelas equianalgésicas variam (fentanil 10–15 mcg; sufentanil 5–10× o fentanil). Fatores de tramadol e codeína: CDC 2022.</p>
      </Section>
      <Ref>Fatores MME (codeína 0,15; tramadol 0,2; morfina 1): Dowell D et al. CDC Clinical Practice Guideline for Prescribing Opioids for Pain — United States, 2022. MMWR Recomm Rep 2022;71(RR-3):1–95 (PMID 36327391; DOI 10.15585/mmwr.rr7103a1) — a tabela do CDC não inclui fentanil nem sufentanil IV. Morfina VO:IV 3:1, fentanil IV 100 mcg ≈ morfina IV 10 mg e faixas de infusão: Barr J et al. SCCM PAD 2013. Crit Care Med 2013;41:263–306 (PMID 23269131). Sufentanil ≈ 7,5× o fentanil em infusão contínua (adotado 10×, limite superior da faixa 5–10×): Reynolds L et al. Pain 2004;110:182–8 (PMID 15275766; DOI 10.1016/j.pain.2004.03.024). Estimativas sem desconto de tolerância cruzada.</Ref>
    </>
  );
}

registerTool({
  id: 'opioide', group: 'sed', tile: 'EQV',
  title: 'Equivalência de opioides',
  sub: 'Conversão entre fentanil, morfina, sufenta, tramadol',
  keywords: ['conversao', 'rotacao', 'fentanil', 'morfina', 'sufentanil', 'remifentanil', 'tramadol', 'codeina', 'opioide', 'potencia'],
  Component: OpioideTool,
});
