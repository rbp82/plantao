/* Drogas vasoativas — componente; dados e faixas em dva.calc.ts */
import { useEffect } from 'react';
import { InfusionCard, ModeSwitch, useInfusionSet } from '@/components/InfusionCard';
import { Ref } from '@/components/ui';
import { registerTool, type ToolProps } from '@/tools/registry';
import { DVA } from './dva.calc';

function DvaTool({ api, peso }: ToolProps) {
  const set = useInfusionSet('dva', DVA, peso);
  useEffect(() => { api.setSummary(set.summary()); });
  return (
    <>
      <ModeSwitch mode={set.mode} onChange={set.switchMode} />
      <div className="flex flex-col gap-3">
        {DVA.map((d) => <InfusionCard key={d.id} d={d} mode={set.mode} peso={peso} input={set.inputs[d.id] || ''} onInput={(v) => set.setInput(d.id, v)} />)}
      </div>
      <Ref>Diluições padrão em SF/SG 250 mL (UTI adulto) — toque na diluição para alterar; a alteração fica salva neste aparelho. Faixas de dose conforme bulas FDA/DailyMed (nitroprussiato, nitroglicerina, dopamina — Baxter —, dobutamina, milrinona, vasopressina — Vasostrict) e literatura; titular pela resposta clínica. Vasopressina associada à noradrenalina em 0,25–0,5 mcg/kg/min: Evans L et al. Surviving Sepsis Campaign 2021. Crit Care Med 2021;49:e1063–e1143 (PMID 34605781; DOI 10.1097/CCM.0000000000005337). Dopamina em dose baixa sem proteção renal: Bellomo R et al. Lancet 2000;356:2139–43 (PMID 11191541). Conferido com o Guia Farmacêutico do Hospital Sírio-Libanês e o Manual Farmacêutico do Hospital Israelita Albert Einstein (monografias públicas, 11/10/2026). Divergências: dopamina máximo 50 mcg/kg/min e nitroglicerina máximo 400 mcg/min (ambos os guias — alertas acrescentados); noradrenalina, vasopressina e dopamina vesicantes, acesso central (acrescentado); nitroprussiato máximo 8 mcg/kg/min no HIAE e 10 no HSL/bula (app mantém 10); dobutamina até 40 mcg/kg/min nos guias (app mantém 2–20 da bula); diluições-padrão dos guias — HSL: nora 4 mg/100–250 mL, dobuta 500 mg/250 mL, dopa 250 mg/250 mL, NTG 25–50 mg/500 mL, milrinona 20 mg/100 mL; milrinona sem monografia no HIAE.</Ref>
    </>
  );
}

registerTool({
  id: 'dva', group: 'hemo', tile: 'DVA', weight: true,
  title: 'Drogas vasoativas',
  sub: 'Nora, vasopressina, dobuta, dopa, nitro, milrinona',
  keywords: ['noradrenalina', 'norepinefrina', 'nora', 'concentrada', 'vasopressina', 'dobutamina', 'dopamina', 'nitroprussiato', 'nipride', 'nitroglicerina', 'tridil', 'milrinona', 'vasopressor', 'inotropico', 'bomba', 'ml/h', 'mcg/kg/min', 'choque'],
  Component: DvaTool,
});
