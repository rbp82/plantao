/* Metas de perfusão — PAM, lactato, clearance de lactato, diurese por kg. Lógica pura. */
import { C, fmt, type Cls } from '@/lib/calc';

export interface PerfInputs { pam: number; lac: number; lac0: number; diu: number; peso: number }
export interface Out { value: string; unit: string; cls: Cls; status: string }
export interface PerfModel {
  pam: Out | null;
  lac: Out | null;
  cl: Out | null; clNote: string;
  diu: Out | null; diuNote: string;
  /* valores numéricos (para testes) */
  clPct: number; diuKg: number;
  alert: boolean;
  summary: string;
}

export function computePerfusao({ pam, lac, lac0, diu, peso: p }: PerfInputs): PerfModel {
  const parts: string[] = [];
  let oPam: Out | null = null, oLac: Out | null = null, oCl: Out | null = null, oDiu: Out | null = null;
  if (Number.isFinite(pam)) {
    const [c, s]: [Cls, string] = pam < 65 ? ['crit', 'Baixa — vasopressor'] : pam > 80 ? ['warn', 'Elevada — reavaliar'] : ['ok', 'Adequada'];
    oPam = { value: fmt(pam, 0), unit: 'mmHg', cls: c, status: s }; parts.push(`PAM ${pam} mmHg`);
  }
  if (Number.isFinite(lac)) {
    oLac = { value: fmt(lac, 1), unit: 'mmol/L', cls: lac > 2 ? 'crit' : 'ok', status: lac > 2 ? 'Hiperlactatemia' : 'Normal' }; parts.push(`lactato ${fmt(lac, 1)}`);
  }
  let clPct = NaN;
  if (C.ok(lac, lac0) && lac0 > 0) {
    clPct = (lac0 - lac) / lac0 * 100;
    oCl = { value: fmt(clPct, 0), unit: '%', cls: clPct >= 10 ? 'ok' : 'crit', status: clPct >= 10 ? 'Adequado (≥ 10%)' : 'Inadequado — reavaliar' }; parts.push(`clearance de lactato ${fmt(clPct, 0)}%`);
  }
  let diuKg = NaN;
  if (Number.isFinite(diu) && p > 0) {
    diuKg = diu / p;
    oDiu = { value: fmt(diuKg, 2), unit: 'mL/kg/h', cls: diuKg >= 0.5 ? 'ok' : 'crit', status: diuKg >= 0.5 ? 'Adequada (≥ 0,5)' : 'Oligúria' }; parts.push(`diurese ${fmt(diuKg, 2)} mL/kg/h`);
  }
  return {
    pam: oPam, lac: oLac,
    cl: oCl, clNote: oCl ? '' : 'atual + anterior',
    diu: oDiu, diuNote: oDiu ? '' : Number.isFinite(diu) ? 'informe o peso' : '',
    clPct, diuKg,
    alert: pam < 65 && lac > 2,
    summary: parts.length ? 'Perfusão: ' + parts.join(', ') + '.' : '',
  };
}
