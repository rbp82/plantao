/* PCR guiada (ACLS adulto): tela própria em src/screens/pcr/ — aqui só o registro para a busca e a tela inicial. */
import { registerTool } from '../registry';

registerTool({
  id: 'acls', group: 'emerg', tile: 'PCR', href: '#/pcr',
  title: 'PCR guiada (ACLS)',
  sub: 'Algoritmo AHA 2025, cronômetros, registro e relatório',
  keywords: ['pcr', 'parada', 'acls', 'rcp', 'reanimacao', 'fv', 'tv sem pulso', 'aesp', 'assistolia', 'adrenalina', 'epinefrina', 'amiodarona', 'choque', 'desfibrilacao', 'codigo azul', 'rce', 'rosc'],
});
