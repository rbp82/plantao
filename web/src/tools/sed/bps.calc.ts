/* BPS — Behavioral Pain Scale (lógica pura). Payen JF et al. Crit Care Med 2001;29:2258. */
import type { Cls } from '@/lib/calc';

export interface BpsDim { key: string; title: string; options: string[] }
export const BPS: BpsDim[] = [
  { key: 'face', title: 'Expressão facial', options: ['Relaxada', 'Parcialmente tensa (ex.: franze a testa)', 'Totalmente tensa (ex.: fecha os olhos)', 'Careta'] },
  { key: 'mmss', title: 'Membros superiores', options: ['Sem movimento', 'Parcialmente fletidos', 'Totalmente fletidos, com flexão dos dedos', 'Retraídos permanentemente'] },
  { key: 'vm', title: 'Adaptação ao ventilador', options: ['Tolera a movimentação', 'Tosse, mas tolera a VM a maior parte do tempo', 'Briga com o ventilador', 'Impossível controlar a ventilação'] },
];

export interface BpsResult {
  total: number | null;
  done: number;
  cls: Cls | 'idle';
  kicker: string;
  title: string;
  desc: string;
}

/* vals: pontuação (1–4) de cada dimensão, na ordem de BPS; null quando não marcada */
export function computeBps(vals: (number | null)[]): BpsResult {
  const done = vals.filter((v) => v !== null).length;
  if (vals.length < BPS.length || vals.some((v) => v === null)) {
    return done === 0
      ? { total: null, done, cls: 'idle', kicker: 'BPS · 3 a 12', title: 'Marque as três dimensões', desc: 'Escore > 5 indica dor significativa.' }
      : { total: null, done, cls: 'idle', kicker: 'BPS', title: `${done} de 3 dimensões`, desc: 'Marque as três para obter o escore.' };
  }
  const total = vals.reduce<number>((a, b) => a + (b as number), 0);
  /* ponto de corte validado (PAD/PADIS): BPS > 5 = dor significativa */
  if (total <= 5) return { total, done, cls: 'ok', kicker: `BPS ${total} / 12`, title: 'Dor controlada', desc: 'BPS ≤ 5. Manter analgesia e reavaliar periodicamente e antes de procedimentos.' };
  return { total, done, cls: 'crit', kicker: `BPS ${total} / 12`, title: 'Dor significativa', desc: `BPS > 5: tratar a dor (bolus de opioide e reavaliar), investigar a causa${total >= 8 ? '. Escore alto — reavaliar logo após a intervenção' : ''}.` };
}

export const bpsSummary = (r: BpsResult) => (r.total ? `BPS ${r.total}/12.` : '');
