/* Rota `pcr`: PCR em andamento → tela ao vivo; senão → início com "Iniciar PCR" e relatórios anteriores. */
import { useStore } from '@/lib/store';
import type { PcrCase } from '@/lib/pcr';
import { PcrStart } from './PcrStart';
import { PcrLive } from './PcrLive';

export function Pcr(_props: { query: URLSearchParams }) {
  const [c] = useStore<PcrCase | null>('pcrAtiva', null);
  return c ? <PcrLive c={c} /> : <PcrStart />;
}
