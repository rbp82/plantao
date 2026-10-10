/* Peças compartilhadas do grupo inf: leitura de campo com plausibilidade (como C.read no app anterior).
   A grade de escolha única (PickGrid) passou para o kit (@/components/ui); fica reexportada aqui. */
import { num } from '@/lib/calc';
export { PickGrid, type PickOption } from '@/components/ui';

/* número digitado respeitando os limites de plausibilidade: fora da faixa → NaN (igual a C.read) */
export function val(raw: string, lim?: [number, number]): number {
  const n = num(raw);
  if (!Number.isFinite(n)) return NaN;
  if (lim && (n < lim[0] || n > lim[1])) return NaN;
  return n;
}
