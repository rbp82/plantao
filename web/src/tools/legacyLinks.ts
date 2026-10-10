/* Telas que ainda vivem no app anterior (fase 2): aparecem na busca e abrem lá, com o mesmo cofre. */
import { LEGACY } from '@/components/Shell';
import { registerTool } from './registry';

registerTool({
  id: 'acls', group: 'emerg', tile: 'PCR', title: 'PCR — ACLS guiado',
  sub: 'Cronômetro, algoritmo AHA 2025 caixa a caixa e relatório',
  keywords: ['pcr', 'parada', 'acls', 'rcp', 'desfibrilacao', 'adrenalina', 'epinefrina', 'amiodarona', 'fv', 'tv sem pulso', 'assistolia', 'aesp', 'rosc', 'rce'],
  href: LEGACY('#/pcr'),
});
registerTool({
  id: 'gasometria', group: 'met', tile: 'pH', title: 'Gasometria completa',
  sub: 'Ácido-base, Stewart, oxigenação, perfusão — com tendência por leito',
  keywords: ['gasometria', 'gaso', 'acido-base', 'acidose', 'alcalose', 'winter', 'anion gap', 'stewart', 'sid', 'lactato', 'p/f', 'sdra', 'tendencia', 'foto', 'ocr'],
  href: LEGACY('#/gaso?novo=1'),
});
