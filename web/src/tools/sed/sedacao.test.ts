import { describe, it, expect } from 'vitest';
import { C } from '@/lib/calc';
import { computeInfusion, concOf, type Drug } from '@/tools/infusion';
import { SED, OPI, BNM, SED_ALL } from './sedacao.calc';

const by = (id: string) => SED_ALL.find((d) => d.id === id)!;
const conc = (d: Drug) => concOf(d.amt!, d.amtU, d.vol!);
const run = (d: Drug, mode: 'dose' | 'rate', input: number, peso = 70) => {
  const r = computeInfusion(d, mode, input, conc(d), peso);
  if ('missing' in r) throw new Error('missing ' + r.missing);
  return r;
};

describe('Sedação — assertions do tests.js (grupo 2b), 70 kg', () => {
  it('propofol 30 mL/h → 71,4 mcg/kg/min', () => {
    const r = run(by('prop'), 'dose', 30);
    expect(C.fmtDose(r.dose)).toBe('71,4');
  });
  it('propofol 4,29 mg/kg/h → alerta PRIS', () => {
    const r = run(by('prop'), 'dose', 30);
    expect(r.alerts.some(([c, h]) => c === 'crit' && h.includes('PRIS'))).toBe(true);
    expect(r.tag.txt).toBe('Acima de 4 mg/kg/h');
  });
  it('propofol 50,0 mcg/kg/min = na faixa (limite 5–50)', () => {
    const r = run(by('prop'), 'dose', 21);
    expect(r.dose).toBeCloseTo(50, 9);
    expect(r.tag.txt).toContain('Na faixa');
    expect(r.alerts.length).toBe(0);
  });
  it('morfina 1 mg/mL, 10 mL/h = 10,0 mg/h na faixa 2–30', () => {
    const r = run(by('mor'), 'dose', 10);
    expect(C.fmtDose(r.dose)).toBe('10,0');
    expect(r.tag.txt).toContain('Na faixa');
  });
  it('remifentanil 0,119 mcg/kg/min (7,14 mcg/kg/h) na faixa PAD', () => {
    const r = run(by('rem'), 'dose', 10);
    expect(r.dose).toBeCloseTo(0.119, 3);
    expect(r.tag.txt).toContain('Na faixa');
    expect(r.alt[0]).toBe('7,14 mcg/kg/h');
  });
  it('fentanil 50 mcg/h = 0,714 mcg/kg/h na faixa (0,7–10)', () => {
    const r = run(by('fen'), 'dose', 1);
    expect(C.fmtDose(r.dose)).toBe('0,714');
    expect(r.tag.txt).toContain('Na faixa');
  });
  it('dexmed 0,857 mcg/kg/h = acima de 0,7', () => {
    const r = run(by('dex'), 'dose', 15);
    expect(C.fmtDose(r.dose)).toBe('0,857');
    expect(r.tag.txt).toContain('Acima de 0,7');
    expect(r.tag.cls).toBe('warn');
  });
});

describe('Sedação — faixas e bordas', () => {
  it('listas: 4 sedativos, 4 opioides, 3 BNM; ids únicos', () => {
    expect(SED.map((d) => d.id)).toEqual(['prop', 'mid', 'dex', 'ket']);
    expect(OPI.map((d) => d.id)).toEqual(['fen', 'mor', 'suf', 'rem']);
    expect(BNM.map((d) => d.id)).toEqual(['roc', 'cis', 'vec']);
    expect(new Set(SED_ALL.map((d) => d.id)).size).toBe(SED_ALL.length);
  });
  it('propofol: 60 mcg/kg/min (3,6 mg/kg/h) = acima do PAD sem PRIS; 4,9 abaixo da faixa', () => {
    const prop = by('prop');
    const r = run(prop, 'rate', 60);
    expect(r.tag.cls).toBe('warn');
    expect(r.tag.txt).toBe('Acima da faixa do PAD (5–50)');
    expect(r.alerts.length).toBe(0);
    expect(run(prop, 'rate', 4.9).tag.txt).toBe('Abaixo da faixa (5–50)');
    expect(run(prop, 'rate', 4.9).alt).toEqual(['0,294 mg/kg/h', '20,6 mg/h']);
  });
  it('midazolam 0,02 e 0,1 mg/kg/h nos limites = na faixa; 0,11 acima', () => {
    const mid = by('mid');
    expect(run(mid, 'rate', 0.02).tag.cls).toBe('ok');
    expect(run(mid, 'rate', 0.1).tag.cls).toBe('ok');
    expect(run(mid, 'rate', 0.11).tag.cls).toBe('crit');
    /* 0,1 mg/kg/h × 70 = 7 mg/h a 1 mg/mL = 7 mL/h */
    expect(run(mid, 'rate', 0.1).mlh).toBeCloseTo(7, 9);
  });
  it('dexmedetomidina: 0,7 na faixa; 1,5 descrito; 1,6 crit; 0,19 abaixo', () => {
    const dex = by('dex');
    expect(run(dex, 'rate', 0.7).tag.cls).toBe('ok');
    expect(run(dex, 'rate', 1.5).tag.txt).toBe('Acima de 0,7 (descrito até 1,5)');
    expect(run(dex, 'rate', 1.6).tag.txt).toBe('Acima de 1,5 mcg/kg/h');
    expect(run(dex, 'rate', 0.19).tag.cls).toBe('warn');
  });
  it('cetamina: 0,3 analgésica; 1 sedativa (info); 2,5 crit; 0,05 abaixo', () => {
    const ket = by('ket');
    expect(run(ket, 'rate', 0.3).tag.txt).toBe('Faixa analgésica (0,1–0,5)');
    expect(run(ket, 'rate', 1).tag).toEqual({ cls: 'info', txt: 'Faixa sedativa (0,5–2)' });
    expect(run(ket, 'rate', 2.5).tag.cls).toBe('crit');
    expect(run(ket, 'rate', 0.05).tag.txt).toBe('Abaixo da faixa analgésica (0,1)');
  });
  it('remifentanil: 15 mcg/kg/h (0,25 mcg/kg/min) = na faixa; 16 mcg/kg/h = crit; 0,4 mcg/kg/h abaixo', () => {
    const rem = by('rem');
    expect(run(rem, 'rate', 0.25).tag.cls).toBe('ok');
    expect(run(rem, 'rate', 16 / 60).tag.txt).toBe('Acima de 15 mcg/kg/h (0,25 mcg/kg/min)');
    expect(run(rem, 'rate', 0.4 / 60).tag.txt).toBe('Abaixo da faixa (0,5–15 mcg/kg/h)');
  });
  it('sufentanil 5 mcg/mL: 7 mL/h = 0,5 mcg/kg/h na faixa; morfina independe do peso', () => {
    expect(run(by('suf'), 'dose', 7).tag.cls).toBe('ok');
    const r = computeInfusion(by('mor'), 'dose', 10, conc(by('mor')), NaN);
    expect('missing' in r).toBe(false);
    if (!('missing' in r)) { expect(r.dose).toBeCloseTo(10, 9); expect(r.alt).toEqual([]); }
  });
  it('BNM: rocurônio 0,45 mg/kg/h na faixa; cisatracúrio 2 mcg/kg/min na faixa; vecurônio sem diluição padrão', () => {
    expect(run(by('roc'), 'rate', 0.45).tag.cls).toBe('ok');
    expect(run(by('cis'), 'rate', 2).tag.cls).toBe('ok');
    /* 2 mcg/kg/min × 70 × 60 / 2000 mcg/mL = 4,2 mL/h */
    expect(run(by('cis'), 'rate', 2).mlh).toBeCloseTo(4.2, 9);
    const vec = by('vec');
    expect(vec.amt).toBeUndefined();
    const r = computeInfusion(vec, 'dose', 10, concOf(NaN, vec.amtU, NaN), 70);
    expect('missing' in r && r.missing).toBe('conc');
    /* com 40 mg/40 mL: 7 mL/h × 1 mg/mL / 70 = 0,1 mg/kg/h (limite) */
    const r2 = computeInfusion(vec, 'dose', 7, concOf(40, 'mg', 40), 70);
    expect(!('missing' in r2) && r2.tag.cls).toBe('ok');
  });
  it('dose por kg sem peso → missing peso', () => {
    const r = computeInfusion(by('prop'), 'dose', 30, conc(by('prop')), NaN);
    expect('missing' in r && r.missing).toBe('peso');
  });
});
