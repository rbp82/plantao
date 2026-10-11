/* Rotas da PCR guiada: `pcr` (início/histórico ou PCR em andamento) e `pcr-relatorio?id=`. */
import type { ComponentType } from 'react';
import { Pcr } from './Pcr';
import { PcrReport } from './PcrReport';

export const PCR_ROUTES: Record<string, ComponentType<{ query: URLSearchParams }>> = {
  pcr: Pcr,
  'pcr-relatorio': PcrReport,
};
