/* SOFA — pontuação por sistema e mortalidade observada por faixa (Ferreira FL et al. JAMA 2001;286:1754). Lógica pura. */
import type { Cls } from '@/lib/calc';

export interface SofaSys { k: string; sys: string; par: string; opts: string[]; stack?: boolean }
export const SOFA: SofaSys[] = [
  { k: 'resp', sys: 'Respiratório', par: 'PaO₂/FiO₂', opts: ['≥ 400', '300–399', '200–299', '100–199 + VM', '< 100 + VM'] },
  { k: 'coag', sys: 'Coagulação', par: 'Plaquetas ×10³/mm³', opts: ['≥ 150', '100–149', '50–99', '20–49', '< 20'] },
  { k: 'fig', sys: 'Fígado', par: 'Bilirrubina mg/dL', opts: ['< 1,2', '1,2–1,9', '2,0–5,9', '6,0–11,9', '≥ 12'] },
  { k: 'cv', sys: 'Cardiovascular', par: 'PAM / vasopressor (mcg/kg/min)', opts: ['PAM ≥ 70', 'PAM < 70', 'Dopa ≤ 5 ou dobuta', 'Dopa 5–15 ou nora/adre ≤ 0,1', 'Dopa > 15 ou nora/adre > 0,1'], stack: true },
  { k: 'snc', sys: 'Neurológico', par: 'Glasgow', opts: ['15', '13–14', '10–12', '6–9', '< 6'] },
  { k: 'ren', sys: 'Renal', par: 'Creatinina mg/dL ou diurese', opts: ['< 1,2', '1,2–1,9', '2,0–3,4', '3,5–4,9 ou < 500 mL/d', '≥ 5,0 ou < 200 mL/d'], stack: true },
];

export interface SofaModel { total: number; cls: Cls; txt: string; pct: number; summary: string }

/* pontos na ordem de SOFA (itens não avaliados = 0) */
export function computeSofa(points: number[]): SofaModel {
  const pts = SOFA.map((_, i) => +(points[i] || 0));
  const total = pts.reduce((a, b) => a + b, 0);
  /* mortalidade observada pelo SOFA da admissão — Ferreira FL et al. JAMA 2001;286:1754 (352 pacientes, UTI clínico-cirúrgica) */
  const [cls, txt]: [Cls, string] = total <= 1 ? ['ok', 'Mortalidade observada 0%'] : total <= 3 ? ['ok', 'Mortalidade observada 6,4%'] : total <= 5 ? ['warn', 'Mortalidade observada 20,2%'] : total <= 7 ? ['warn', 'Mortalidade observada 21,5%'] : total <= 9 ? ['crit', 'Mortalidade observada 33,3%'] : total <= 11 ? ['crit', 'Mortalidade observada 50,0%'] : ['crit', 'Mortalidade observada 95,2%'];
  const parts = SOFA.map((s, i) => `${s.sys.slice(0, 4).toLowerCase()} ${pts[i]}`);
  return { total, cls, txt, pct: total / 24 * 100, summary: `SOFA ${total} (${parts.join(', ')}).` };
}
