/* Estado de sessão da gasometria (como o S de beds.js): registro avulso ainda não salvo e contexto aberto,
   para limpar registros vazios ao sair e para a ficha "Admitir e salvar a gasometria". */
import { cleanupEmpty, type BedPatient, type GasRecord } from '@/lib/beds';

export const S: { quick: GasRecord | null; ctx: { p: BedPatient | null; rec: GasRecord } | null; scanWant: 'art' | 'ven' | null } = { quick: null, ctx: null, scanWant: null };

/* sair da gasometria sem digitar nada não deixa registro vazio */
export function cleanup(keep: GasRecord | null) {
  const c = S.ctx;
  if (c && c.p && c.rec !== keep) cleanupEmpty(c.p, c.rec);
  if (!keep) S.ctx = null;
}
if (typeof window !== 'undefined') window.addEventListener('hashchange', () => { if (!/^#\/gaso/.test(location.hash)) cleanup(null); });
