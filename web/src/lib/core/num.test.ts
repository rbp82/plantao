/* Seções 1 (leitura de números) e 4b (Berlim e FiO₂) de ../tests/tests.js, mais casos de borda.
   Valores esperados conferidos à mão — não alterar. */
import { describe, it, expect } from 'vitest';
import { num, ok, fmt, fmtDose, fmtN, norm, esc, LIM, rangeTag, rangeLbl, berlin, fio2 } from './num';

describe('1. Leitura de números digitados (padrão brasileiro)', () => {
  it('"1,5" → 1,5', () => expect(num('1,5')).toBe(1.5));
  it('"7.25" → 7,25 (ponto decimal)', () => expect(num('7.25')).toBe(7.25));
  it('"0.125" → 0,125', () => expect(num('0.125')).toBe(0.125));
  it('"1.000" → 1000 (milhar)', () => expect(num('1.000')).toBe(1000));
  it('"2.500" → 2500 (milhar)', () => expect(num('2.500')).toBe(2500));
  it('"1.000,5" → 1000,5', () => expect(num('1.000,5')).toBe(1000.5));
  it('"12.5" → 12,5', () => expect(num('12.5')).toBe(12.5));
  it('"-3" → −3', () => expect(num('-3')).toBe(-3));
  it('"1,2,3" → inválido', () => expect(num('1,2,3')).toBeNaN());
  it('"abc" → inválido', () => expect(num('abc')).toBeNaN());
  it('"" → vazio', () => expect(num('')).toBeNaN());
  it('"7,2a" → inválido', () => expect(num('7,2a')).toBeNaN());

  describe('bordas', () => {
    it('null/undefined → NaN', () => { expect(num(null)).toBeNaN(); expect(num(undefined)).toBeNaN(); });
    it('número finito passa; Infinity/NaN → NaN', () => { expect(num(3.5)).toBe(3.5); expect(num(Infinity)).toBeNaN(); expect(num(NaN)).toBeNaN(); });
    it('espaços e espaços internos são ignorados', () => { expect(num(' 70 ')).toBe(70); expect(num('1 000')).toBe(1000); });
    it('"1.234.567" → 1234567 (milhares encadeados)', () => expect(num('1.234.567')).toBe(1234567));
    it('"1.234.567,89" → 1234567,89', () => expect(num('1.234.567,89')).toBe(1234567.89));
    it('"1.2.3" → inválido (não é milhar)', () => expect(num('1.2.3')).toBeNaN());
    it('"0.500" → 0,5 (zero à esquerda não é milhar)', () => expect(num('0.500')).toBe(0.5));
    it('"1.00,5" → inválido (milhar mal formado com vírgula)', () => expect(num('1.00,5')).toBeNaN());
    it('",5" → 0,5 e "-,5" → −0,5', () => { expect(num(',5')).toBe(0.5); expect(num('-,5')).toBe(-0.5); });
    it('"5," → 5', () => expect(num('5,')).toBe(5));
    it('"--3", "+3" e "3-" → inválido', () => { expect(num('--3')).toBeNaN(); expect(num('+3')).toBeNaN(); expect(num('3-')).toBeNaN(); });
    it('"1e3" → inválido (sem notação científica)', () => expect(num('1e3')).toBeNaN());
  });
});

describe('ok / fmt / fmtDose / fmtN', () => {
  it('ok exige todos finitos', () => { expect(ok(1, 2, 0)).toBe(true); expect(ok(1, NaN)).toBe(false); expect(ok(Infinity)).toBe(false); expect(ok()).toBe(true); });
  it('fmt pt-BR com casas fixas', () => { expect(fmt(1234.5)).toBe('1.234,5'); expect(fmt(2, 0)).toBe('2'); expect(fmt(0.04, 3)).toBe('0,040'); expect(fmt(NaN)).toBe('—'); });
  it('fmtDose: casas adaptativas', () => {
    expect(fmtDose(150)).toBe('150');
    expect(fmtDose(10.66)).toBe('10,7');
    expect(fmtDose(4.2857)).toBe('4,29');
    expect(fmtDose(0.15238)).toBe('0,152');
    expect(fmtDose(0.004)).toBe('0,0040');
    expect(fmtDose(-12.34)).toBe('-12,3');
    expect(fmtDose(NaN)).toBe('—');
  });
  it('fmtN sem zeros à direita (até 3 casas)', () => { expect(fmtN(16)).toBe('16'); expect(fmtN(0.5)).toBe('0,5'); expect(fmtN(1.23456)).toBe('1,235'); expect(fmtN(1000)).toBe('1.000'); expect(fmtN(NaN)).toBe('—'); });
});

describe('norm / esc', () => {
  it('norm tira acentos e põe em minúsculas', () => { expect(norm('Ação É')).toBe('acao e'); expect(norm('J.S.M.')).toBe('j.s.m.'); expect(norm(12)).toBe('12'); });
  it('esc escapa HTML', () => expect(esc(`<b a="1">&'`)).toBe('&lt;b a=&quot;1&quot;&gt;&amp;&#39;'));
});

describe('LIM e faixas', () => {
  it('limites de plausibilidade (adulto)', () => {
    expect(LIM.peso).toEqual([20, 350]);
    expect(LIM.idade).toEqual([18, 120]);
    expect(LIM.altura).toEqual([120, 230]);
    expect(LIM.cr).toEqual([0.1, 25]);
  });
  it('rangeLbl usa vírgula decimal e unidade opcional', () => { expect(rangeLbl(0.01, 3)).toBe('0,01–3'); expect(rangeLbl(2, 30, 'mg/h')).toBe('2–30 mg/h'); });
  it('rangeTag: abaixo / na faixa / acima', () => {
    expect(rangeTag(0.005, 0.01, 3)).toEqual({ cls: 'warn', txt: 'Abaixo da faixa (0,01–3)' });
    expect(rangeTag(1, 0.01, 3)).toEqual({ cls: 'ok', txt: 'Na faixa (0,01–3)' });
    expect(rangeTag(3.5, 0.01, 3)).toEqual({ cls: 'crit', txt: 'Acima da faixa (0,01–3)' });
  });
  it('rangeTag: limites inclusivos e erro de ponto flutuante tolerado (0,04000000001 = na faixa)', () => {
    expect(rangeTag(0.01, 0.01, 0.04).cls).toBe('ok');
    expect(rangeTag(0.04, 0.01, 0.04).cls).toBe('ok');
    expect(rangeTag(0.4 * 6 / 60, 0.01, 0.04).cls).toBe('ok');
    expect(rangeTag(0.04 + 1e-12, 0.01, 0.04).cls).toBe('ok');
    expect(rangeTag(0.04 + 1e-6, 0.01, 0.04).cls).toBe('crit');
  });
});

describe('4b. Berlim e FiO₂', () => {
  it('P/F 300 = leve (≤ 300)', () => expect(berlin(300)[1]).toContain('leve'));
  it('P/F 300,1 = sem critério', () => expect(berlin(300.1)[1]).toContain('Sem critério'));
  it('P/F 200 = moderada (≤ 200)', () => expect(berlin(200)[1]).toContain('moderada'));
  it('P/F 100 = grave (≤ 100)', () => expect(berlin(100)[1]).toContain('grave'));
  it('FiO₂ 21 → 0,21', () => expect(fio2(21)).toBe(0.21));
  it('FiO₂ 0,4 → 0,4', () => expect(fio2(0.4)).toBe(0.4));
  it('FiO₂ 1 → 1,0', () => expect(fio2(1)).toBe(1));
  it('FiO₂ 100 → 1,0', () => expect(fio2(100)).toBe(1));
  it('FiO₂ 10 → inválida', () => expect(fio2(10)).toBeNaN());
  it('FiO₂ 0,1 → inválida', () => expect(fio2(0.1)).toBeNaN());

  describe('bordas', () => {
    it('classes e textos completos de Berlim', () => {
      expect(berlin(301)).toEqual(['ok', 'Sem critério de SDRA (> 300)']);
      expect(berlin(250)).toEqual(['warn', 'Faixa de SDRA leve (201–300)']);
      expect(berlin(150)).toEqual(['crit', 'Faixa de SDRA moderada (101–200)']);
      expect(berlin(50)).toEqual(['crit', 'Faixa de SDRA grave (≤ 100)']);
      expect(berlin(201)[1]).toContain('leve');
      expect(berlin(101)[1]).toContain('moderada');
    });
    it('FiO₂ 0,21 → 0,21 (limite inferior da fração)', () => expect(fio2(0.21)).toBe(0.21));
    it('FiO₂ 60 → 0,6; 101 → inválida; 20,9 → inválida', () => { expect(fio2(60)).toBeCloseTo(0.6, 12); expect(fio2(101)).toBeNaN(); expect(fio2(20.9)).toBeNaN(); });
    it('FiO₂ NaN/negativa → inválida', () => { expect(fio2(NaN)).toBeNaN(); expect(fio2(-0.5)).toBeNaN(); });
  });
});
