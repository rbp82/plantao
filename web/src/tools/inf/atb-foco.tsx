/* ATB empírico por foco: pulmonar, urinário, abdominal, pele, SNC, endocardite, desconhecido. */
import { useEffect, useRef, useState } from 'react';
import { Note, Pill, Ref, Section } from '@/components/ui';
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
      <Ref>Fontes: PAC — Metlay JP et al. ATS/IDSA, Am J Respir Crit Care Med 2019;200:e45 (PMID 31573350); PAH/PAV — Kalil AC et al. IDSA/ATS, Clin Infect Dis 2016;63:e61 (PMID 27418577); ITU — Gupta K et al. IDSA/ESCMID, Clin Infect Dis 2011;52:e103 (PMID 21292654) e IDSA AMR Guidance 2026 (Tamma PD et al., PMID 42570093); abdome — Mazuski JE et al. SIS, Surg Infect 2017;18:1 (PMID 28085573); colangite — Tokyo Guidelines 2018 (Gomi H et al., PMID 29090866); candidemia — Pappas PG et al. IDSA, Clin Infect Dis 2016;62:e1 (PMID 26679628; equinocandina é a terapia inicial recomendada, fluconazol é alternativa em paciente não crítico); pele — Stevens DL et al. IDSA, Clin Infect Dis 2014;59:e10 (PMID 24973422); meningite — Tunkel AR et al. IDSA, Clin Infect Dis 2004;39:1267 (PMID 15494903) e 2017 (PMID 28203777); endocardite — Baddour LM et al. AHA, Circulation 2015;132:1435 (PMID 26373316). Os esquemas empíricos são decisão institucional (CCIH) e devem seguir o antibiograma local. Conferido com o Guia Farmacêutico do Hospital Sírio-Libanês e o Manual Farmacêutico do Hospital Israelita Albert Einstein (monografias públicas, 11/10/2026).</Ref>
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
