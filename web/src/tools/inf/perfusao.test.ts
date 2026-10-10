import { describe, it, expect } from 'vitest';
import '@/lib/calc';
import { computePerfusao } from './perfusao.calc';

const E = { pam: NaN, lac: NaN, lac0: NaN, diu: NaN, peso: NaN };

describe('metas de perfusão — clearance de lactato e diurese por kg', () => {
  it('clearance de lactato (4,1 → 2,8) = 31,7% — adequado (≥ 10%)', () => {
    const m = computePerfusao({ ...E, lac: 2.8, lac0: 4.1 });
    expect(m.clPct).toBeCloseTo(31.707, 2);
    expect(m.cl).toMatchObject({ value: '32', unit: '%', cls: 'ok', status: 'Adequado (≥ 10%)' });
  });
  it('clearance exatamente 10% é adequado; 9% é inadequado; lactato que sobe é negativo', () => {
    expect(computePerfusao({ ...E, lac: 4.5, lac0: 5 }).cl?.cls).toBe('ok');
    expect(computePerfusao({ ...E, lac: 4.55, lac0: 5 }).cl?.cls).toBe('crit');
    const up = computePerfusao({ ...E, lac: 5, lac0: 4 });
    expect(up.clPct).toBeCloseTo(-25, 6); expect(up.cl?.cls).toBe('crit');
  });
  it('clearance precisa de atual + anterior (anterior > 0)', () => {
    expect(computePerfusao({ ...E, lac: 2.8 }).cl).toBeNull();
    expect(computePerfusao({ ...E, lac: 2.8 }).clNote).toBe('atual + anterior');
  });
  it('diurese 35 mL/h / 70 kg = 0,50 mL/kg/h — adequada (≥ 0,5); 30 mL/h = 0,43 — oligúria', () => {
    const ok = computePerfusao({ ...E, diu: 35, peso: 70 });
    expect(ok.diuKg).toBeCloseTo(0.5, 9);
    expect(ok.diu).toMatchObject({ value: '0,50', unit: 'mL/kg/h', cls: 'ok', status: 'Adequada (≥ 0,5)' });
    const ol = computePerfusao({ ...E, diu: 30, peso: 70 });
    expect(ol.diuKg).toBeCloseTo(0.428571, 5);
    expect(ol.diu).toMatchObject({ value: '0,43', cls: 'crit', status: 'Oligúria' });
  });
  it('diurese sem peso pede o peso', () => {
    const m = computePerfusao({ ...E, diu: 35 });
    expect(m.diu).toBeNull(); expect(m.diuNote).toBe('informe o peso');
    expect(computePerfusao(E).diuNote).toBe('');
  });
  it('PAM < 65 baixa; 65–80 adequada; > 80 elevada', () => {
    expect(computePerfusao({ ...E, pam: 64 }).pam).toMatchObject({ cls: 'crit', status: 'Baixa — vasopressor' });
    expect(computePerfusao({ ...E, pam: 65 }).pam).toMatchObject({ cls: 'ok', status: 'Adequada' });
    expect(computePerfusao({ ...E, pam: 80 }).pam?.cls).toBe('ok');
    expect(computePerfusao({ ...E, pam: 81 }).pam).toMatchObject({ cls: 'warn', status: 'Elevada — reavaliar' });
  });
  it('lactato > 2 = hiperlactatemia; alerta com PAM < 65 e lactato > 2', () => {
    expect(computePerfusao({ ...E, lac: 2 }).lac).toMatchObject({ cls: 'ok', status: 'Normal' });
    expect(computePerfusao({ ...E, lac: 2.1 }).lac).toMatchObject({ cls: 'crit', status: 'Hiperlactatemia' });
    expect(computePerfusao({ ...E, pam: 60, lac: 2.5 }).alert).toBe(true);
    expect(computePerfusao({ ...E, pam: 65, lac: 2.5 }).alert).toBe(false);
  });
  it('resumo', () => {
    const m = computePerfusao({ pam: 62, lac: 2.8, lac0: 4.1, diu: 35, peso: 70 });
    expect(m.summary).toBe('Perfusão: PAM 62 mmHg, lactato 2,8, clearance de lactato 32%, diurese 0,50 mL/kg/h.');
    expect(computePerfusao(E).summary).toBe('');
  });
});
