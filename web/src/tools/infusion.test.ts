import { describe, it, expect } from 'vitest';
import { C } from '@/lib/calc';
import { computeInfusion, concOf, type Drug } from './infusion';
import { DVA } from './hemo/dva.calc';

const by = (id: string) => DVA.find((d) => d.id === id)!;
const conc = (d: Drug) => concOf(d.amt!, d.amtU, d.vol!);
const run = (d: Drug, mode: 'dose' | 'rate', input: number, peso = 70) => {
  const r = computeInfusion(d, mode, input, conc(d), peso);
  if ('missing' in r) throw new Error('missing ' + r.missing);
  return r;
};

describe('motor de infusões — dose = conc × vazão ÷ 60 ÷ peso', () => {
  it('nora 16 mg/250 mL, 10 mL/h, 70 kg = 0,15238 mcg/kg/min e 10,67 mcg/min', () => {
    const r = run(by('nor'), 'dose', 10);
    expect(r.dose).toBeCloseTo(0.152381, 5);
    expect(r.alt[0]).toBe('10,7 mcg/min');
    expect(r.tag.cls).toBe('ok');
  });
  it('reverso: nora 0,1 mcg/kg/min, 70 kg → 6,5625 mL/h', () => {
    expect(run(by('nor'), 'rate', 0.1).mlh).toBeCloseTo(6.5625, 6);
  });
  it('vasopressina 0,4 UI/mL × 6 mL/h = 0,04 UI/min — exatamente no limite = na faixa', () => {
    const r = run(by('vaso'), 'dose', 6);
    expect(r.dose).toBeCloseTo(0.04, 9);
    expect(r.tag.cls).toBe('ok');
  });
  it('dopamina: 2,00 mcg/kg/min = β1; 1,9 = dopaminérgica; 12 = efeito α', () => {
    expect(run(by('dopa'), 'dose', 10.5).tag.txt).toContain('β1');
    expect(run(by('dopa'), 'dose', 10).tag.txt).toContain('dopaminérgica');
    expect(run(by('dopa'), 'dose', 63).tag.txt).toContain('efeito α');
  });
  it('nitroglicerina independe do peso: 6 mL/h = 10 mcg/min; 250 mcg/min acima de 200', () => {
    expect(run(by('ntg'), 'dose', 6).dose).toBeCloseTo(10, 9);
    expect(run(by('ntg'), 'dose', 150).tag.txt).toContain('Acima de 200');
  });
  it('nitroprussiato 3 mcg/kg/min dispara alerta de cianeto', () => {
    expect(run(by('nitro'), 'dose', 63).alerts.some(([, h]) => h.includes('cianeto'))).toBe(true);
  });
  it('sem peso em dose/kg → missing peso; peso implausível não é usado', () => {
    const r = computeInfusion(by('nor'), 'dose', 10, conc(by('nor')), NaN);
    expect('missing' in r && r.missing).toBe('peso');
  });
  it('nora > 1 mcg/kg/min gera alerta de vasopressina', () => {
    const r = run(by('nor'), 'rate', 1.5);
    expect(r.alerts.length).toBe(1);
  });
  it('leitura pt-BR: "1.000" = 1000, "7.25" = 7,25, "1,2,3" inválido', () => {
    expect(C.num('1.000')).toBe(1000);
    expect(C.num('7.25')).toBe(7.25);
    expect(Number.isNaN(C.num('1,2,3'))).toBe(true);
  });
});
