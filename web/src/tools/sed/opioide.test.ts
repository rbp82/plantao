import { describe, it, expect } from 'vitest';
import { C } from '@/lib/calc';
import { EQ, K, computeOpioid, eqSource } from './opioide.calc';

const row = (key: string, dose: number, name: string) => {
  const r = computeOpioid(key, dose)!;
  return r.rows.find((x) => x.name === name)!;
};
const txt = (key: string, dose: number, name: string) => C.fmtDose(row(key, dose, name).v);

describe('Equivalência de opioides — assertions do tests.js (grupo 8)', () => {
  it('Fentanil 100 mcg/h = morfina IV 10,0 mg/h', () => {
    expect(txt('fen_h', 100, 'Morfina IV')).toBe('10,0');
    expect(computeOpioid('fen_h', 100)!.m).toBeCloseTo(10, 9);
  });
  it('… = morfina VO 720 mg/dia', () => {
    expect(txt('fen_h', 100, 'Morfina VO')).toBe('720');
  });
  it('… = tramadol 3.600 mg/dia (fator CDC 0,2)', () => {
    expect(txt('fen_h', 100, 'Tramadol VO')).toBe('3.600');
  });
  it('Tramadol 400 mg/dia = morfina IV 1,11 mg/h', () => {
    expect(txt('tra_vo', 400, 'Morfina IV')).toBe('1,11');
  });
  it('Codeína 240 mg/dia = morfina VO 36,0 mg/dia', () => {
    expect(txt('cod_vo', 240, 'Morfina VO')).toBe('36,0');
  });
});

describe('Equivalência de opioides — fatores e bordas', () => {
  it('fatores K: fentanil 10, sufentanil 1, VO 3, tramadol 0,2, codeína 0,15', () => {
    expect(K).toEqual({ fen: 10, suf: 1, vo: 3, tra: 0.2, cod: 0.15 });
    expect(EQ.map((e) => e.key)).toEqual(['fen_h', 'fen_min', 'mor_h', 'mor_vo', 'suf_h', 'rem_min', 'tra_vo', 'cod_vo']);
  });
  it('fentanil 100 mcg/h: linhas completas (mg/dia, mcg/min, sufenta, remi, codeína)', () => {
    const r = computeOpioid('fen_h', 100)!;
    expect(r.title).toBe('Equivalente a 100 mcg/h de fentanil iv');
    expect(row('fen_h', 100, 'Morfina IV').extra).toBe('240 mg/dia');
    expect(row('fen_h', 100, 'Fentanil IV').v).toBeCloseTo(100, 9);
    expect(row('fen_h', 100, 'Fentanil IV').extra).toBe('1,67 mcg/min');
    expect(row('fen_h', 100, 'Sufentanil IV').v).toBeCloseTo(10, 9);
    expect(row('fen_h', 100, 'Remifentanil IV').v).toBeCloseTo(100 / 60, 9);
    expect(txt('fen_h', 100, 'Codeína VO')).toBe('4.800');
    expect(r.summary).toBe('100 mcg/h de Fentanil IV ≈ morfina IV 10,0 mg/h ≈ fentanil 100 mcg/h ≈ morfina VO 720 mg/dia (sem desconto de tolerância cruzada).');
  });
  it('ida e volta: cada origem converte para si mesma sem perda', () => {
    const self: Record<string, string> = { fen_h: 'Fentanil IV', mor_h: 'Morfina IV', mor_vo: 'Morfina VO', suf_h: 'Sufentanil IV', rem_min: 'Remifentanil IV', tra_vo: 'Tramadol VO', cod_vo: 'Codeína VO' };
    Object.entries(self).forEach(([k, n]) => expect(row(k, 37, n).v).toBeCloseTo(37, 9));
    /* fentanil em mcg/min: 1 mcg/min = 60 mcg/h = morfina IV 6 mg/h */
    expect(computeOpioid('fen_min', 1)!.m).toBeCloseTo(6, 9);
    expect(row('fen_min', 1, 'Fentanil IV').v).toBeCloseTo(60, 9);
  });
  it('morfina VO 30 mg/dia = morfina IV 10 mg/dia (0,417 mg/h); sufentanil = fentanil ÷ 10; remifentanil = fentanil mcg a mcg', () => {
    expect(computeOpioid('mor_vo', 30)!.m).toBeCloseTo(10 / 24, 9);
    expect(computeOpioid('suf_h', 10)!.m).toBeCloseTo(10, 9);
    expect(computeOpioid('rem_min', 1)!.m).toBeCloseTo(6, 9);
  });
  it('sem opioide, dose zero, negativa ou NaN → null', () => {
    expect(computeOpioid(null, 10)).toBeNull();
    expect(computeOpioid('xyz', 10)).toBeNull();
    expect(computeOpioid('fen_h', 0)).toBeNull();
    expect(computeOpioid('fen_h', -1)).toBeNull();
    expect(computeOpioid('fen_h', NaN)).toBeNull();
    expect(eqSource(null)).toBeNull();
    expect(eqSource('mor_h')!.unit).toBe('mg/h');
  });
});
