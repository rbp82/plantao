/* Gap de CO₂ e perfusão tecidual — seções sobre o canal 'perf' do motor (delta.js). */
import { registerTool, type ToolProps } from '@/tools/registry';
import { GAP_CO2 } from './delta.calc';
import { SectionTool } from './SectionTool';

function GapCo2Tool({ api, peso }: ToolProps) {
  return <SectionTool def={GAP_CO2} api={api} peso={peso} />;
}

registerTool({
  id: 'gap-co2', group: 'hemo', tile: 'CO₂',
  title: 'Gap de CO₂ e perfusão tecidual',
  sub: 'Pv-aCO₂, ScvO₂, razão ΔPCO₂/Ca-vO₂, extração de O₂',
  keywords: ['gap co2', 'pvaco2', 'pv-aco2', 'delta pco2', 'scvo2', 'svo2', 'saturacao venosa', 'extracao', 'teo2', 'cao2', 'perfusao', 'metabolismo anaerobio'],
  Component: GapCo2Tool,
});
