import { describe, it, expect } from 'vitest';
import '@/lib/calc';
import { computeOxigenacao } from './oxigenacao.calc';

const E = { pa: NaN, fi: NaN, sa: NaN, sv: NaN, hb: NaN, dc: NaN };

describe('oxigenação e transporte de O₂', () => {
  it('P/F 85 / 0,4 = 212,5 → SDRA leve (Berlim 201–300); FiO₂ aceita 40 ou 0,4', () => {
    const a = computeOxigenacao({ ...E, pa: 85, fi: 40 });
    expect(a.pfV).toBeCloseTo(212.5, 6);
    expect(a.pf).toMatchObject({ value: '213', cls: 'warn', status: 'Faixa de SDRA leve (201–300)' });
    expect(computeOxigenacao({ ...E, pa: 85, fi: 0.4 }).pfV).toBeCloseTo(212.5, 6);
  });
  it('Berlim: 301 sem critério · 300 leve · 200 moderada · 100 grave', () => {
    expect(computeOxigenacao({ ...E, pa: 301, fi: 1 }).pf?.cls).toBe('ok');
    expect(computeOxigenacao({ ...E, pa: 300, fi: 1 }).pf?.status).toContain('leve');
    expect(computeOxigenacao({ ...E, pa: 200, fi: 1 }).pf?.status).toContain('moderada');
    expect(computeOxigenacao({ ...E, pa: 100, fi: 1 }).pf?.status).toContain('grave');
  });
  it('FiO₂ inválida (0,1 ou 15) não calcula P/F', () => {
    expect(computeOxigenacao({ ...E, pa: 85, fi: 0.1 }).pf).toBeNull();
    expect(computeOxigenacao({ ...E, pa: 85, fi: 15 }).pf).toBeNull();
  });
  it('TEO₂ = (SaO₂ − SvO₂) / SaO₂: 96/65 = 32,3% (aumentada); 96/72 = 25% (normal); 96/40 = 58% (choque)', () => {
    const t = computeOxigenacao({ ...E, sa: 96, sv: 65 });
    expect(t.teV).toBeCloseTo(32.2917, 3);
    expect(t.te).toMatchObject({ value: '32', unit: '%', cls: 'warn', status: 'Aumentada — hipoperfusão' });
    expect(computeOxigenacao({ ...E, sa: 96, sv: 72 }).te).toMatchObject({ value: '25', cls: 'ok', status: 'Normal' });
    expect(computeOxigenacao({ ...E, sa: 96, sv: 40 }).te).toMatchObject({ cls: 'crit', status: 'Muito alta — choque' });
    expect(computeOxigenacao({ ...E, sa: 96 }).teNote).toBe('SaO₂ + SvO₂');
  });
  it('SvO₂ < 65 baixa · 65–80 normal · > 80 alta', () => {
    expect(computeOxigenacao({ ...E, sv: 64 }).sv).toMatchObject({ cls: 'crit', status: 'Baixa — baixo DC ou anemia' });
    expect(computeOxigenacao({ ...E, sv: 65 }).sv?.cls).toBe('ok');
    expect(computeOxigenacao({ ...E, sv: 80 }).sv?.cls).toBe('ok');
    expect(computeOxigenacao({ ...E, sv: 81 }).sv).toMatchObject({ cls: 'warn', status: 'Alta — shunt / disfunção mitocondrial' });
  });
  it('DO₂ = DC × (Hb × 1,34 × SaO₂ + 0,003 × PaO₂) × 10: 4,5 L/min, Hb 10, SaO₂ 96%, PaO₂ 85 = 590 mL/min', () => {
    const m = computeOxigenacao({ ...E, pa: 85, sa: 96, hb: 10, dc: 4.5 });
    // 4,5 × (10 × 1,34 × 0,96 + 0,003 × 85) × 10 = 4,5 × 13,119 × 10 = 590,355
    expect(m.do2V).toBeCloseTo(590.355, 3);
    expect(m.do2).toMatchObject({ value: '590', unit: 'mL/min', cls: 'info' });
    expect(m.vo2).toBeNull(); expect(m.vo2Note).toBe('DO₂ × extração');
  });
  it('VO₂ = DO₂ × TEO₂: 590,355 × 32,29% = 190,6 mL/min', () => {
    const m = computeOxigenacao({ pa: 85, fi: 40, sa: 96, sv: 65, hb: 10, dc: 4.5 });
    expect(m.vo2V).toBeCloseTo(190.635, 2);
    expect(m.vo2).toMatchObject({ value: '191', status: 'DO₂ × extração' });
    expect(m.summary).toBe('P/F 213 (faixa de sdra leve (201–300)); TEO₂ 32%; SvO₂ 65%; DO₂ 590 mL/min; VO₂ 191 mL/min.');
  });
  it('alerta: extração > 50% com SvO₂ < 65', () => {
    expect(computeOxigenacao({ ...E, sa: 96, sv: 40 }).alert).toBe(true);
    expect(computeOxigenacao({ ...E, sa: 96, sv: 65 }).alert).toBe(false);
    expect(computeOxigenacao(E).summary).toBe('');
  });
});
