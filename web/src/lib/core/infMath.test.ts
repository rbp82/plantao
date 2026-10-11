/* Seção 2 de ../tests/tests.js: motor de infusões — dose = conc × vazão ÷ 60 ÷ peso.
   Valores esperados calculados à mão — não alterar. */
import { describe, it, expect } from 'vitest';
import { infMath, parseUnit, BASE } from './infMath';

const M = infMath;

describe('2. Motor de infusões — dose = conc × vazão ÷ 60 ÷ peso', () => {
  // nora 16 mg/250 mL = 64 mcg/mL; 10 mL/h → 640 mcg/h → 10,667 mcg/min → /70 = 0,15238
  it('Nora 16 mg/250 mL, 10 mL/h, 70 kg = 0,15238 mcg/kg/min', () => expect(M.toUnit(64 * 10 / 60, 'mcg/kg/min', 70)).toBeCloseTo(0.152381, 5));
  // reverso: 0,1 mcg/kg/min × 70 × 60 / 64 = 6,5625 mL/h
  it('Nora 0,1 mcg/kg/min, 70 kg → 6,5625 mL/h', () => expect(M.fromUnit(0.1, 'mcg/kg/min', 70) * 60 / 64).toBeCloseTo(6.5625, 6));
  // propofol 10 mg/mL, 30 mL/h, 70 kg = 300 mg/h = 4,2857 mg/kg/h = 71,43 mcg/kg/min
  it('Propofol 30 mL/h, 70 kg = 71,43 mcg/kg/min', () => expect(M.toUnit(10000 * 30 / 60, 'mcg/kg/min', 70)).toBeCloseTo(71.428571, 5));
  it('Propofol 30 mL/h, 70 kg = 4,2857 mg/kg/h', () => expect(M.toUnit(10000 * 30 / 60, 'mg/kg/h', 70)).toBeCloseTo(4.285714, 5));
  // vasopressina 0,4 UI/mL × 6 mL/h = 2,4 UI/h = 0,04 UI/min
  it('Vasopressina 100 UI/250 mL, 6 mL/h = 0,04 UI/min', () => expect(M.toUnit(0.4 * 6 / 60, 'UI/min', 70)).toBeCloseTo(0.04, 9));
  // midazolam 1 mg/mL × 10 mL/h = 10 mg/h /70 = 0,142857 mg/kg/h
  it('Midazolam 200 mg/200 mL, 10 mL/h, 70 kg = 0,1429 mg/kg/h', () => expect(M.toUnit(1000 * 10 / 60, 'mg/kg/h', 70)).toBeCloseTo(0.142857, 5));
  // remifentanil 50 mcg/mL × 10 mL/h = 500 mcg/h /70 = 7,1429 mcg/kg/h = 0,11905 mcg/kg/min
  it('Remifentanil 4 mg/80 mL, 10 mL/h, 70 kg = 0,11905 mcg/kg/min', () => expect(M.toUnit(50 * 10 / 60, 'mcg/kg/min', 70)).toBeCloseTo(0.119048, 5));
  it('Dexmed 4 mcg/mL, 10 mL/h, 70 kg = 0,5714 mcg/kg/h', () => expect(M.toUnit(4 * 10 / 60, 'mcg/kg/h', 70)).toBeCloseTo(0.571429, 5));

  describe('bordas', () => {
    it('BASE: mcg 1 · mg 1000 · g 1e6 · UI 1 · mUI 0,001', () => expect(BASE).toEqual({ mcg: 1, mg: 1000, g: 1e6, UI: 1, mUI: 0.001 }));
    it('parseUnit separa massa, por kg e tempo', () => {
      expect(parseUnit('mcg/kg/min')).toEqual({ n: 'mcg', kg: true, t: 'min' });
      expect(parseUnit('mg/h')).toEqual({ n: 'mg', kg: false, t: 'h' });
      expect(parseUnit('UI/min')).toEqual({ n: 'UI', kg: false, t: 'min' });
    });
    it('toUnit e fromUnit são inversas', () => {
      for (const u of ['mcg/kg/min', 'mg/kg/h', 'mg/h', 'mcg/min', 'UI/min', 'UI/h', 'mUI/kg/min', 'g/h']) {
        expect(M.toUnit(M.fromUnit(2.5, u, 80), u, 80)).toBeCloseTo(2.5, 9);
      }
    });
    it('unidade sem peso ignora o peso (NTG 100 mcg/mL × 6 mL/h = 10 mcg/min)', () => {
      expect(M.toUnit(100 * 6 / 60, 'mcg/min', 70)).toBeCloseTo(10, 9);
      expect(M.toUnit(100 * 6 / 60, 'mcg/min', NaN)).toBeCloseTo(10, 9);
    });
    it('unidade por kg sem peso → NaN', () => expect(M.toUnit(10, 'mcg/kg/min', NaN)).toBeNaN());
    it('mg/h: 1000 mcg/min = 60 mg/h', () => expect(M.toUnit(1000, 'mg/h', 70)).toBeCloseTo(60, 9));
    it('mUI/kg/min (ocitocina): 0,001 UI/min em 70 kg = 1 mUI/min → 0,0142857 mUI/kg/min', () => expect(M.toUnit(0.001, 'mUI/kg/min', 70)).toBeCloseTo(0.0142857, 6));
    it('dose zero → vazão zero', () => expect(M.fromUnit(0, 'mcg/kg/min', 70)).toBe(0));
  });
});
