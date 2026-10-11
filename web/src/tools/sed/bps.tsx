/* BPS — Behavioral Pain Scale (ver bps.calc.ts). */
import { useEffect, useState } from 'react';
import { ChoiceList, Ref, Section, Verdict } from '@/components/ui';
import { registerTool, type ToolProps } from '@/tools/registry';
import { BPS, bpsSummary, computeBps } from './bps.calc';

function BpsTool({ api }: ToolProps) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const res = computeBps(BPS.map((d) => (vals[d.key] ? Number(vals[d.key]) : null)));
  useEffect(() => { api.setSummary(bpsSummary(res)); });
  const pick = (key: string, v: string) => {
    const next = { ...vals, [key]: v };
    setVals(next);
    if (BPS.every((d) => next[d.key])) window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <>
      <Verdict cls={res.cls} kicker={res.kicker} title={res.title} desc={res.desc} />
      <Section className="mt-3">
        <div className="flex flex-col gap-4">
          {BPS.map((d, i) => (
            <ChoiceList
              key={d.key}
              label={`${i + 1}. ${d.title}`}
              value={vals[d.key] || null}
              onChange={(v) => pick(d.key, v)}
              options={d.options.map((o, j) => ({ value: String(j + 1), lead: j + 1, label: o }))}
            />
          ))}
        </div>
      </Section>
      <Ref>Escala e descritores: Payen JF et al. Assessing pain in critically ill sedated patients by using a behavioral pain scale. Crit Care Med 2001;29:2258–63 (PMID 11801819; DOI 10.1097/00003246-200112000-00004). Ponto de corte BPS &gt; 5 = dor significativa e recomendação de uso em pacientes incapazes de se comunicar: Barr J et al. SCCM PAD 2013. Crit Care Med 2013;41:263–306 (PMID 23269131); Devlin JW et al. SCCM PADIS 2018. Crit Care Med 2018;46:e825–e873 (PMID 30113379).</Ref>
    </>
  );
}

registerTool({
  id: 'bps', group: 'sed', tile: 'BPS',
  title: 'BPS — dor no paciente em VM',
  sub: 'Behavioral Pain Scale · não comunicativo',
  keywords: ['behavioral pain scale', 'dor', 'analgesia', 'ventilacao mecanica', 'escala'],
  Component: BpsTool,
});
