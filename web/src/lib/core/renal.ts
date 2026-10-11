/* Função renal — funções puras (portado do núcleo do app anterior, auditado; cobertas por testes). */
import { fmt, fmtN, ok } from './num';

export type Sex = 'M' | 'F';

export interface CgWeight { kg: number; label: string }

/* peso ideal de Devine: 50 (H) / 45,5 (M) + 2,3 kg por polegada acima de 152,4 cm (5 pés).
   Devine BJ, Drug Intell Clin Pharm 1974;8:650 (não indexado no PubMed); origem e equações revistas em
   Pai MP & Paloucek FP, Ann Pharmacother 2000;34:1066; PMID 10981254. Auditoria 2026-10: CONFERE. */
export const ibw = (sex: string | null | undefined, ht: number): number => (sex === 'M' ? 50 : 45.5) + 2.3 * ((ht - 152.4) / 2.54);

/* peso para Cockcroft-Gault: real se ≤ ideal; ideal se até 130% do ideal; ajustado (ideal + 0,4 × excesso) acima disso.
   Fator 0,4: Winter MA et al., Pharmacotherapy 2012;32:604; PMID 22576791 (ABW0,4 menos viesado em sobrepeso/obesos);
   revisão Brown DL et al., Ann Pharmacother 2013;47:1039; PMID 23757387. O limiar de 130 % do ideal é decisão
   institucional (Winter 2012 usa classes de IMC; Emanuel NA, Clin Transplant 2023, PMID 37395991, sugere 120 %). */
export function cgWeight(wt: number, ht: number, sex: string | null | undefined): CgWeight {
  if (!Number.isFinite(wt)) return { kg: NaN, label: '' };
  if (!(ht > 0) || !sex) return { kg: wt, label: 'peso real — informe a altura para usar peso ideal/ajustado' };
  const ideal = ibw(sex, ht);
  if (wt <= ideal) return { kg: wt, label: `peso real ${fmtN(Math.round(wt * 10) / 10)} kg (≤ ideal)` };
  if (wt <= 1.3 * ideal) return { kg: ideal, label: `peso ideal ${fmt(ideal, 1)} kg` };
  const adj = ideal + 0.4 * (wt - ideal);
  return { kg: adj, label: `peso ajustado ${fmt(adj, 1)} kg (real > 130% do ideal)` };
}

/* Cockcroft DW, Gault MH. Nephron 1976;16:31; PMID 1244564 — ClCr = (140 − idade) × peso / (72 × Cr); × 0,85 em mulheres ("15% less in females"). Auditoria 2026-10: CONFERE. */
export function cockcroft(age: number, kg: number, cr: number, sex: string | null | undefined): number {
  if (!ok(age, kg, cr) || !sex || cr <= 0) return NaN;
  return Math.max(((140 - age) * kg) / (72 * cr) * (sex === 'F' ? 0.85 : 1), 0);
}

/* CKD-EPI 2021 sem raça — Inker LA et al. NEJM 2021;385:1737; PMID 34554658 (DOI 10.1056/NEJMoa2102953).
   142 × min(Cr/κ, 1)^α × max(Cr/κ, 1)^−1,200 × 0,9938^idade × 1,012 [mulher]; κ 0,7 (M) / 0,9 (H); α −0,241 (M) / −0,302 (H).
   Auditoria 2026-10: CONFERE (coeficientes conferidos com a equação publicada pela NKF). Não válido em IRA. */
export function ckdepi(age: number, cr: number, sex: string | null | undefined): number {
  if (!ok(age, cr) || !sex || cr <= 0) return NaN;
  const k = sex === 'F' ? 0.7 : 0.9, a = sex === 'F' ? -0.241 : -0.302, r = cr / k;
  return 142 * Math.pow(Math.min(r, 1), a) * Math.pow(Math.max(r, 1), -1.2) * Math.pow(0.9938, age) * (sex === 'F' ? 1.012 : 1);
}

export const renal = { ibw, cgWeight, cockcroft, ckdepi };
export type Renal = typeof renal;
