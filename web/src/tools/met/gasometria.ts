/* Entrada na lista de calculadoras: a gasometria é a tela completa do quadro de leitos (#/gaso). Mesmos textos e palavras-chave do beds.js. */
import { registerTool } from '@/tools/registry';

registerTool({
  id: 'gasometria', group: 'met', tile: 'pH', href: '#/gaso?novo=1',
  title: 'Gasometria completa',
  sub: 'Ácido-base (Boston + Stewart), oxigenação, perfusão, fluidos, ventilação, renal',
  keywords: ['acido-base', 'acidose', 'alcalose', 'winter', 'anion gap', 'gap anionico', 'bicarbonato', 'pco2', 'lactato', 'base excess', 'davenport', 'gaso', 'stewart', 'sig', 'delta delta', 'gap co2', 'scvo2', 'sdra', 'kdigo', 'tendencia', 'leito'],
});
