import { describe, it, expect } from 'vitest';
import '@/lib/calc';
import { RASS, rassRow, rassSummary, rassVerdictCls, sgn } from './rass.calc';

describe('RASS — classificação', () => {
  it('10 níveis de +4 a −5, em ordem decrescente', () => {
    expect(RASS.map((r) => r.score)).toEqual([4, 3, 2, 1, 0, -1, -2, -3, -4, -5]);
  });
  it('sinal: +4, 0, −3 (menos tipográfico)', () => {
    expect(sgn(4)).toBe('+4');
    expect(sgn(0)).toBe('0');
    expect(sgn(-3)).toBe('−3');
  });
  it('tons: +4/+3 crit, +2/+1 warn, 0/−1/−2 ok (meta), −3/−4 violet, −5 crit', () => {
    const cls = (s: number) => rassRow(s)!.cls;
    expect([cls(4), cls(3)]).toEqual(['crit', 'crit']);
    expect([cls(2), cls(1)]).toEqual(['warn', 'warn']);
    expect([cls(0), cls(-1), cls(-2)]).toEqual(['ok', 'ok', 'ok']);
    expect([cls(-3), cls(-4)]).toEqual(['violet', 'violet']);
    expect(cls(-5)).toBe('crit');
  });
  it('veredito: violet vira info; demais mantêm a classe', () => {
    expect(rassVerdictCls(rassRow(-3)!)).toBe('info');
    expect(rassVerdictCls(rassRow(-4)!)).toBe('info');
    expect(rassVerdictCls(rassRow(4)!)).toBe('crit');
    expect(rassVerdictCls(rassRow(0)!)).toBe('ok');
  });
  it('textos do veredito e da conduta', () => {
    expect(rassRow(-2)!.verdict).toBe('Sedação leve (meta)');
    expect(rassRow(3)!.verdict).toBe('Muito agitado — risco de autoextubação');
    expect(rassRow(-4)!.action).toContain('BNM, HIC, hipotermia, SDRA grave');
    expect(rassRow(-2)!.desc).toBe('Desperta brevemente à voz, com contato visual < 10 s');
  });
  it('busca por string e por número; inválido/nulo → null', () => {
    expect(rassRow('-1')).toBe(rassRow(-1));
    expect(rassRow(null)).toBeNull();
    expect(rassRow(7)).toBeNull();
  });
  it('resumo: "RASS −2 (sedação leve)." e vazio sem escolha', () => {
    expect(rassSummary(rassRow(-2))).toBe('RASS −2 (sedação leve).');
    expect(rassSummary(rassRow(4))).toBe('RASS +4 (combativo).');
    expect(rassSummary(rassRow(0))).toBe('RASS 0 (alerta e calmo).');
    expect(rassSummary(null)).toBe('');
  });
});
