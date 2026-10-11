/* Seção 3 de ../tests/tests.js: função renal — Devine, Cockcroft-Gault, CKD-EPI 2021.
   Valores esperados calculados à mão a partir das fórmulas publicadas — não alterar. */
import { describe, it, expect } from 'vitest';
import { renal } from './renal';

const R = renal;
const near = (got: number, exp: number, tol: number) => { expect(Number.isFinite(got)).toBe(true); expect(Math.abs(got - exp)).toBeLessThanOrEqual(tol); };

describe('3. Função renal — Devine, Cockcroft-Gault, CKD-EPI 2021', () => {
  // Devine H 170 cm: 50 + 2,3 × (17,6 / 2,54) = 65,937
  it('Peso ideal homem 170 cm = 65,94 kg', () => near(R.ibw('M', 170), 65.937, 0.001));
  it('Peso ideal mulher 160 cm = 52,38 kg', () => near(R.ibw('F', 160), 52.382, 0.001));
  it('Homem 70 kg/170 cm (até 130% do ideal) usa peso ideal', () => near(R.cgWeight(70, 170, 'M').kg, 65.937, 0.001));
  // ideal 74,992; 130 > 1,3 × 74,992 → ajustado = 74,992 + 0,4 × 55,008 = 96,995
  it('Homem 130 kg/180 cm (obeso) usa peso ajustado = 97,0', () => near(R.cgWeight(130, 180, 'M').kg, 96.995, 0.001));
  it('Peso real abaixo do ideal usa peso real', () => expect(R.cgWeight(50, 180, 'M').kg).toBe(50));
  it('Sem altura usa peso real', () => expect(R.cgWeight(90, NaN, 'M').kg).toBe(90));
  // CG: (140 − 65) × 65,937 / (72 × 1,4) = 49,06
  it('CG homem 65 a, 65,94 kg, Cr 1,4 = 49,06', () => near(R.cockcroft(65, 65.937, 1.4, 'M'), 49.06, 0.01));
  // CG mulher: (140 − 80) × 52,382 / (72 × 0,6) × 0,85 = 61,84
  it('CG mulher 80 a, 52,38 kg, Cr 0,6 = 61,84', () => near(R.cockcroft(80, 52.382, 0.6, 'F'), 61.84, 0.01));
  it('CG obeso: 90 × 96,995 / 72 = 121,24', () => near(R.cockcroft(50, 96.995, 1.0, 'M'), 121.24, 0.01));
  // CKD-EPI 2021 homem 65 a, Cr 1,4: 142 × (1,4/0,9)^−1,2 × 0,9938^65 = 55,78
  it('CKD-EPI homem 65 a, Cr 1,4 = 55,78', () => near(R.ckdepi(65, 1.4, 'M'), 55.78, 0.02));
  // mulher 80 a, Cr 0,6: 142 × (0,6/0,7)^−0,241 × 0,9938^80 × 1,012 = 90,68
  it('CKD-EPI mulher 80 a, Cr 0,6 = 90,68', () => near(R.ckdepi(80, 0.6, 'F'), 90.68, 0.02));
  // homem 40 a, Cr 0,9 (r = 1): 142 × 0,9938^40 = 110,73
  it('CKD-EPI homem 40 a, Cr 0,9 = 110,73', () => near(R.ckdepi(40, 0.9, 'M'), 110.73, 0.02));
  it('CG sem sexo = indefinido', () => expect(R.cockcroft(60, 70, 1, '')).toBeNaN());

  describe('bordas', () => {
    it('rótulos do peso de Cockcroft-Gault', () => {
      expect(R.cgWeight(50, 180, 'M').label).toBe('peso real 50 kg (≤ ideal)');
      expect(R.cgWeight(70, 170, 'M').label).toBe('peso ideal 65,9 kg');
      expect(R.cgWeight(130, 180, 'M').label).toBe('peso ajustado 97,0 kg (real > 130% do ideal)');
      expect(R.cgWeight(90, NaN, 'M').label).toBe('peso real — informe a altura para usar peso ideal/ajustado');
      expect(R.cgWeight(90, 180, null).label).toBe('peso real — informe a altura para usar peso ideal/ajustado');
    });
    it('peso ausente → NaN sem rótulo', () => expect(R.cgWeight(NaN, 170, 'M')).toEqual({ kg: NaN, label: '' }));
    it('peso real arredondado a 1 casa no rótulo', () => expect(R.cgWeight(49.96, 180, 'M').label).toBe('peso real 50 kg (≤ ideal)'));
    it('exatamente 130% do ideal ainda usa o ideal', () => { const i = R.ibw('M', 180); near(R.cgWeight(1.3 * i, 180, 'M').kg, i, 1e-9); });
    it('Devine: 152,4 cm = 50 (H) / 45,5 (M); abaixo disso diminui', () => { expect(R.ibw('M', 152.4)).toBe(50); expect(R.ibw('F', 152.4)).toBe(45.5); expect(R.ibw('F', 150)).toBeLessThan(45.5); });
    it('CG: creatinina zero ou negativa → NaN; idade > 140 → 0 (não negativo)', () => {
      expect(R.cockcroft(60, 70, 0, 'M')).toBeNaN();
      expect(R.cockcroft(60, 70, -1, 'M')).toBeNaN();
      expect(R.cockcroft(150, 70, 1, 'M')).toBe(0);
    });
    it('CG: qualquer dado ausente → NaN', () => { expect(R.cockcroft(NaN, 70, 1, 'M')).toBeNaN(); expect(R.cockcroft(60, NaN, 1, 'M')).toBeNaN(); expect(R.cockcroft(60, 70, NaN, 'M')).toBeNaN(); });
    it('CKD-EPI: sem sexo, Cr ≤ 0 ou idade ausente → NaN', () => { expect(R.ckdepi(60, 1, null)).toBeNaN(); expect(R.ckdepi(60, 0, 'M')).toBeNaN(); expect(R.ckdepi(NaN, 1, 'M')).toBeNaN(); });
    it('CKD-EPI: mulher 40 a, Cr 0,7 (r = 1) = 142 × 0,9938^40 × 1,012 = 112,06', () => near(R.ckdepi(40, 0.7, 'F'), 112.06, 0.02));
  });
});
