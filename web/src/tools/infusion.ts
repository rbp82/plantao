/* Infusão contínua: dose ↔ vazão. Lógica pura (testada); o cartão React só exibe. */
import { C, r9, type Cls, type RangeTag } from '@/lib/calc';

export interface Drug {
  id: string;
  name: string;
  sub?: string;
  amt?: number;        /* quantidade padrão na solução */
  amtU: 'mg' | 'mcg' | 'g' | 'UI';
  vol?: number;        /* mL */
  ph?: string;
  dose: string;        /* unidade de dose: 'mcg/kg/min', 'mg/h', 'UI/min'… */
  range?: [number, number];
  band?: (dose: number) => RangeTag;
  alt?: string[];
  note?: string;
  locked?: boolean;
  alerts?: (dose: number, ctx: { mlh: number; peso: number; conc: number }) => [Cls, string][];
}
export type Mode = 'dose' | 'rate';

export const parseUnit = (u: string) => { const p = u.split('/'); return { n: p[0], kg: p.length === 3, t: p[p.length - 1] }; };
/* concentração em unidade-base/mL (mcg/mL ou UI/mL) */
export const concOf = (amt: number, amtU: string, vol: number) => (Number.isFinite(amt) && Number.isFinite(vol) && vol > 0 ? (amt * C.infMath.BASE[amtU]) / vol : NaN);
export const concLabel = (conc: number, amtU: string) =>
  amtU === 'UI' ? `${C.fmtN(conc)} UI/mL` : conc >= 1000 ? `${C.fmtN(conc / 1000)} mg/mL` : `${C.fmtN(conc)} mcg/mL`;

export interface InfResult {
  dose: number;       /* na unidade d.dose */
  mlh: number;
  basePerMin: number;
  tag: RangeTag;
  alt: string[];      /* "10,7 mcg/min" */
  alerts: [Cls, string][];
}
/* input = mL/h (modo 'dose') ou dose (modo 'rate'); NaN se faltar dado */
export function computeInfusion(d: Drug, mode: Mode, input: number, conc: number, peso: number): InfResult | { missing: 'conc' | 'input' | 'peso' } {
  if (!Number.isFinite(conc)) return { missing: 'conc' };
  if (!Number.isFinite(input) || input <= 0) return { missing: 'input' };
  const needsKg = parseUnit(d.dose).kg;
  const altUnits = (d.alt || []).filter((u) => !parseUnit(u).kg || peso > 0);
  if (needsKg && !(peso > 0)) return { missing: 'peso' };
  let dose: number, mlh: number, basePerMin: number;
  if (mode === 'dose') { mlh = input; basePerMin = (conc * mlh) / 60; dose = C.infMath.toUnit(basePerMin, d.dose, peso); }
  else { dose = input; basePerMin = C.infMath.fromUnit(dose, d.dose, peso); mlh = (basePerMin * 60) / conc; }
  const tag = d.band ? d.band(r9(dose)) : d.range ? C.rangeTag(dose, d.range[0], d.range[1]) : { cls: 'info' as Cls, txt: '' };
  return { dose, mlh, basePerMin, tag, alt: altUnits.map((u) => `${C.fmtDose(C.infMath.toUnit(basePerMin, u, peso))} ${u}`), alerts: d.alerts ? d.alerts(r9(dose), { mlh, peso, conc }) : [] };
}
