/* Lidocaína antiarrítmica — bolus por peso e infusão de manutenção (lógica pura). */
import { C, type Cls } from '@/lib/calc';
import type { Drug } from '@/tools/infusion';

export const LIDO: Drug = {
  id: 'lido', name: 'Infusão de manutenção', sub: 'Iniciar logo após o bolus', amt: 2000, amtU: 'mg', vol: 500,
  dose: 'mg/min', range: [1, 4], alt: ['mcg/kg/min'],
  note: 'Nível sérico alvo 1,5–5 mcg/mL. Em ICC ou hepatopatia, preferir ≤ 1 mg/min.',
  alerts: (d) => (d > 4 ? [['crit', 'Acima de 4 mg/min — risco de toxicidade (zumbido, parestesia, convulsão, BAV, hipotensão).']] : []),
};

export type LidoCtx = 'arrest' | 'stable' | 'infusion';
export const LIDO_CTX: { value: LidoCtx; label: string; small?: string }[] = [
  { value: 'arrest', label: 'PCR', small: 'FV/TV sem pulso refratária' },
  { value: 'stable', label: 'TV monomórfica estável', small: 'FE preservada' },
  { value: 'infusion', label: 'Manutenção', small: 'pós-reversão' },
];
export const LIDO_CTX_NOTE: Record<LidoCtx, [Cls, string]> = {
  arrest: ['crit', 'Bolus rápido IV/IO após o 3º choque (FV/TV persistente). Considerar infusão após o RCE.'],
  stable: ['info', 'Bolus de 1 mg/kg em TV monomórfica estável, seguido de 1–4 mg/min.'],
  infusion: ['warn', 'Manutenção: em ICC/hepatopatia preferir ≤ 1 mg/min e dosar nível sérico.'],
};

export interface LidoBolus { b1: string; b2: string; max: string; summary: string }
/* null quando não há peso válido */
export function computeLidoBolus(peso: number): LidoBolus | null {
  if (!(peso > 0)) return null;
  const r = (a: number, b: number) => `${C.fmtN(Math.round(peso * a))}–${C.fmtN(Math.round(peso * b))}`;
  const b1 = r(1, 1.5), b2 = r(0.5, 0.75), max = C.fmt(peso * 3, 0);
  return { b1, b2, max, summary: `Lidocaína (${C.fmtN(peso)} kg): bolus ${b1} mg IV; repetir ${b2} mg a cada 5–10 min; máx. ${max} mg; manutenção 1–4 mg/min.` };
}
