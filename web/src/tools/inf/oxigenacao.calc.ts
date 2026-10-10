/* Oxigenação e transporte de O₂ — P/F (Berlim), extração, SvO₂, DO₂, VO₂. Lógica pura. */
import { C, fmt, type Cls } from '@/lib/calc';

export interface OxiInputs { pa: number; fi: number; sa: number; sv: number; hb: number; dc: number }
export interface Out { value: string; unit: string; cls: Cls; status: string }
export interface OxiModel {
  pf: Out | null; te: Out | null; teNote: string; sv: Out | null; svNote: string;
  do2: Out | null; do2Note: string; vo2: Out | null; vo2Note: string;
  /* valores numéricos (para testes) */
  pfV: number; teV: number; do2V: number; vo2V: number;
  alert: boolean;
  summary: string;
}

/* `fi` como digitada (40 ou 0,4) — convertida por C.fio2 */
export function computeOxigenacao({ pa, fi: fiRaw, sa, sv, hb, dc }: OxiInputs): OxiModel {
  const fi = C.fio2(fiRaw);
  const parts: string[] = [];
  let oPf: Out | null = null, oTe: Out | null = null, oSv: Out | null = null, oDo: Out | null = null, oVo: Out | null = null;
  const pf = C.ok(pa, fi) && fi > 0 ? pa / fi : NaN;
  if (Number.isFinite(pf)) {
    const [c, s] = C.berlin(pf);
    oPf = { value: fmt(pf, 0), unit: '', cls: c, status: s }; parts.push(`P/F ${fmt(pf, 0)} (${s.toLowerCase()})`);
  }
  const te = C.ok(sa, sv) && sa > 0 ? (sa - sv) / sa * 100 : NaN;
  if (Number.isFinite(te)) {
    const [c, s]: [Cls, string] = te <= 30 ? ['ok', 'Normal'] : te <= 50 ? ['warn', 'Aumentada — hipoperfusão'] : ['crit', 'Muito alta — choque'];
    oTe = { value: fmt(te, 0), unit: '%', cls: c, status: s }; parts.push(`TEO₂ ${fmt(te, 0)}%`);
  }
  if (Number.isFinite(sv)) {
    const [c, s]: [Cls, string] = sv < 65 ? ['crit', 'Baixa — baixo DC ou anemia'] : sv > 80 ? ['warn', 'Alta — shunt / disfunção mitocondrial'] : ['ok', 'Normal'];
    oSv = { value: fmt(sv, 0), unit: '%', cls: c, status: s }; parts.push(`SvO₂ ${fmt(sv, 0)}%`);
  }
  const do2 = C.ok(dc, hb, sa, pa) ? dc * (hb * 1.34 * (sa / 100) + 0.003 * pa) * 10 : NaN;
  if (Number.isFinite(do2)) { oDo = { value: fmt(do2, 0), unit: 'mL/min', cls: 'info', status: '' }; parts.push(`DO₂ ${fmt(do2, 0)} mL/min`); }
  const vo2 = C.ok(do2, te) ? do2 * te / 100 : NaN;
  if (Number.isFinite(vo2)) { oVo = { value: fmt(vo2, 0), unit: 'mL/min', cls: 'info', status: 'DO₂ × extração' }; parts.push(`VO₂ ${fmt(vo2, 0)} mL/min`); }
  return {
    pf: oPf,
    te: oTe, teNote: oTe ? 'normal 20–30%' : 'SaO₂ + SvO₂',
    sv: oSv, svNote: 'SvO₂ 65–75% · ScvO₂ ≥ 70%',
    do2: oDo, do2Note: oDo ? '' : 'DC, Hb, SaO₂, PaO₂',
    vo2: oVo, vo2Note: oVo ? '' : 'DO₂ × extração',
    pfV: pf, teV: te, do2V: do2, vo2V: vo2,
    alert: te > 50 && sv < 65,
    summary: parts.length ? parts.join('; ') + '.' : '',
  };
}
