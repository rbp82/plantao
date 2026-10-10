import { describe, it, expect } from 'vitest';
import '@/lib/calc';
import { BUNDLE, computeBundle } from './bundle.calc';

const none = () => BUNDLE.map(() => false);

describe('bundle da 1ª hora (grupo 7 — bundle)', () => {
  it('Bundle: 70 kg × 30 mL/kg = 2.100 mL', () => {
    const m = computeBundle({ peso: 70, lac: NaN, done: none() });
    expect(m.vol).toContain('2.100');
    expect(m.volNote).toBe('70 kg × 30 mL/kg · em até 3 h');
    expect(m.summary).toContain('Volume 30 mL/kg = 2100 mL.');
  });
  it('sem peso: sem volume, pede o peso no topo', () => {
    const m = computeBundle({ peso: NaN, lac: NaN, done: none() });
    expect(m.vol).toBeNull();
    expect(m.volNote).toBe('Informe o peso no topo');
    expect(m.summary).not.toContain('Volume');
  });
  it('lactato ≥ 4 → crit (30 mL/kg independentemente da PA); > 2 → warn (repetir); 2 → sem nota', () => {
    expect(computeBundle({ peso: 70, lac: 4, done: none() }).lacNote?.cls).toBe('crit');
    expect(computeBundle({ peso: 70, lac: 2.1, done: none() }).lacNote).toMatchObject({ cls: 'warn' });
    expect(computeBundle({ peso: 70, lac: 2, done: none() }).lacNote).toBeNull();
  });
  it('contagem, barra e pendências', () => {
    const d = none(); d[0] = true; d[2] = true;
    const m = computeBundle({ peso: 80, lac: 3.2, done: d });
    expect(m.done).toBe(2); expect(m.count).toBe('2/6'); expect(m.barCls).toBe('crit');
    expect(m.pend).toEqual(['hemoculturas antes do antibiótico', 'cristaloide 30 mL/kg'.toLowerCase(), 'vasopressor se hipotensão persistente', 'repetir lactato em 2–4 h']);
    expect(m.summary).toBe('Bundle sepse 1ª h: 2/6 concluídos; pendente: hemoculturas antes do antibiótico; cristaloide 30 ml/kg; vasopressor se hipotensão persistente; repetir lactato em 2–4 h. Volume 30 mL/kg = 2400 mL. Lactato inicial 3,2 mmol/L.');
    expect(computeBundle({ peso: 80, lac: NaN, done: [true, true, true, false, false, false] }).barCls).toBe('warn');
    const all = computeBundle({ peso: NaN, lac: NaN, done: BUNDLE.map(() => true) });
    expect(all.count).toBe('Completo'); expect(all.barCls).toBe('ok'); expect(all.pct).toBe(100);
    expect(all.summary).toBe('Bundle sepse 1ª h: 6/6 concluídos.');
  });
});
