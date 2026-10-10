/* Ajudantes do grupo met: texto próprio com <b>…</b> → JSX (sem innerHTML) e leitura de campo com limite de plausibilidade
   (como C.read do app anterior: fora do plausível conta como ausente). */
import { Fragment, type ReactNode } from 'react';
import type { Cls } from '@/lib/calc';
import { num } from '@/lib/calc';
import type { Step } from '@/components/ui';

export function rich(s: string): ReactNode {
  return s.split(/(<b>[\s\S]*?<\/b>|<br>)/g).map((p, i) =>
    p === '<br>' ? <br key={i} /> : p.startsWith('<b>') ? <b key={i}>{p.slice(3, -4)}</b> : <Fragment key={i}>{p}</Fragment>);
}
export const richSteps = (items: [Cls, string][]): Step[] => items.map(([c, t]): Step => [c, rich(t)]);

export function readLim(s: string, lim: [number, number]): number {
  const n = num(s);
  return Number.isFinite(n) && n >= lim[0] && n <= lim[1] ? n : NaN;
}
