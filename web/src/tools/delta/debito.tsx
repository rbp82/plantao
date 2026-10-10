/* Débito cardíaco e resistências — seções sobre o canal 'hemo' do motor (delta.js).
   Usa o peso da faixa do paciente (ASC → índice cardíaco, DO₂I, VO₂I, RVSI). */
import { registerTool, type ToolProps } from '@/tools/registry';
import { DEBITO } from './delta.calc';
import { SectionTool } from './SectionTool';

function DebitoTool({ api, peso }: ToolProps) {
  return <SectionTool def={DEBITO} api={api} peso={peso} weight />;
}

registerTool({
  id: 'debito', group: 'hemo', tile: 'DC', weight: true,
  title: 'Débito cardíaco e resistências',
  sub: 'VTI da VSVE, Fick estimado, DO₂/VO₂, RVS/RVP, potência cardíaca',
  keywords: ['debito', 'dc', 'indice cardiaco', 'vti', 'vsve', 'eco', 'fick', 'do2', 'vo2', 'rvs', 'rvp', 'resistencia vascular', 'potencia cardiaca', 'cpo', 'choque cardiogenico'],
  Component: DebitoTool,
});
