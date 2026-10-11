/* Infusões contínuas — aritmética de unidades (portado do núcleo do app anterior, auditado).
   Base interna: mcg/min (massa) ou UI/min (unidades). */

/* fator da unidade de massa/atividade para a base (mcg ou UI) */
export const BASE: Record<string, number> = { mcg: 1, mg: 1000, g: 1e6, UI: 1, mUI: 0.001 };

export interface ParsedUnit { n: string; kg: boolean; t: string }

/* "mcg/kg/min" → { n: 'mcg', kg: true, t: 'min' } */
export function parseUnit(u: string): ParsedUnit {
  const p = u.split('/');
  return { n: p[0], kg: p.length === 3, t: p[p.length - 1] };
}

/* taxa base por minuto (mcg/min ou UI/min) -> unidade */
export function toUnit(basePerMin: number, unit: string, peso: number): number {
  const u = parseUnit(unit);
  let v = basePerMin / BASE[u.n] * (u.t === 'h' ? 60 : 1);
  if (u.kg) v = v / peso;
  return v;
}

/* unidade -> taxa base por minuto */
export function fromUnit(dose: number, unit: string, peso: number): number {
  const u = parseUnit(unit);
  let v = dose * BASE[u.n] / (u.t === 'h' ? 60 : 1);
  if (u.kg) v = v * peso;
  return v;
}

export const infMath = { toUnit, fromUnit, BASE };
export type InfMath = typeof infMath;
