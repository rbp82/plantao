/* Mecânica ventilatória — seções sobre o canal 'vent' do motor (delta.js). */
import { registerTool, type ToolProps } from '@/tools/registry';
import { VENTILACAO } from './delta.calc';
import { SectionTool } from './SectionTool';

function VentilacaoTool({ api, peso }: ToolProps) {
  return <SectionTool def={VENTILACAO} api={api} peso={peso} />;
}

registerTool({
  id: 'ventilacao', group: 'resp', tile: 'VM',
  title: 'Mecânica ventilatória',
  sub: 'Peso predito, Vt/kg, driving pressure, complacência, VR, mechanical power, ROX',
  keywords: ['ventilacao', 'vm', 'peso predito', 'pbw', 'ardsnet', 'volume corrente', 'driving pressure', 'complacencia', 'plato', 'resistencia', 'ventilatory ratio', 'mechanical power', 'rox', 'cnaf', 'alto fluxo', 'sdra'],
  Component: VentilacaoTool,
});
