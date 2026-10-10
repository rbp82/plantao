/* BPS — Behavioral Pain Scale (ver bps.calc.ts). */
import { useEffect, useState } from 'react';
import { ChoiceList, Section, Verdict } from '@/components/ui';
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
