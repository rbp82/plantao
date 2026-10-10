/* ATB empírico por foco: pulmonar, urinário, abdominal, pele, SNC, endocardite, desconhecido. */
import { useEffect, useRef, useState } from 'react';
import { Note, Pill, Section } from '@/components/ui';
import { registerTool, type ToolProps } from '@/tools/registry';
import { computeFoco, FOCO, TAG } from './atb-foco.calc';
import { PickGrid } from './shared';

function AtbFocoTool({ api }: ToolProps) {
  const [k, setK] = useState<string | null>(null);
  const m = computeFoco(k);
  const out = useRef<HTMLDivElement>(null);
  useEffect(() => { api.setSummary(m ? m.summary : ''); });
  useEffect(() => { if (k && out.current) out.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [k]);
  return (
    <div className="flex flex-col gap-3">
      <Section>
        <PickGrid label="Foco suspeito" value={k} onChange={setK} options={Object.entries(FOCO).map(([v, [l]]) => ({ value: v, label: l }))} />
      </Section>
      <div ref={out} className="scroll-mt-16">
        {m && (
          <Section title={m.label}>
            <div className="flex flex-col divide-y divide-separator">
              {m.rows.map(([s, a, t], i) => (
                <div key={i} className="grid grid-cols-[40%_1fr] gap-3 py-2.5 text-[14.5px] leading-snug first:pt-0 last:pb-0">
                  <span className="text-foreground/75">{s}</span>
                  <span className="flex flex-col items-start gap-1"><b className="font-semibold">{a}</b><Pill cls={TAG[t].cls}>{TAG[t].label}</Pill></span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
      <Note cls="info">Reavaliar em 48–72 h com culturas e descalonar assim que possível (SSC). Ajustar à microbiologia local e à função renal (ver “Ajuste renal de ATB”).</Note>
    </div>
  );
}

registerTool({
  id: 'atb-foco', group: 'inf', tile: 'ATB',
  title: 'ATB empírico por foco',
  sub: 'Pulmonar, urinário, abdominal, pele, SNC…',
  keywords: ['antibiotico', 'empirico', 'pneumonia', 'pac', 'pavm', 'itu', 'meningite', 'endocardite', 'peritonite', 'celulite', 'fasciite', 'colangite', 'foco'],
  Component: AtbFocoTool,
});
