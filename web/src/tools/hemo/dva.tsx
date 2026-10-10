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
      <Ref>Diluições padrão em SF/SG 250 mL (UTI adulto) — toque na diluição para alterar; a alteração fica salva neste aparelho. Faixas de dose conforme bula/UpToDate; titular pela resposta clínica.</Ref>
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
