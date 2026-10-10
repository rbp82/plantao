/* 6. Sódio — balanço de massa e Adrogué-Madias (portado de tests/tests.js; valores esperados conferidos à mão) */
import { describe, it, expect } from 'vitest';
import '@/lib/calc';
import { adrogue, computeSodio, sodioText, vol3, volFree, volHalf, waterDeficit, type SodioInputs } from './sodio.calc';

const near = (got: number, exp: number, tol: number) => { expect(Number.isFinite(got)).toBe(true); expect(Math.abs(got - exp)).toBeLessThanOrEqual(tol); };
const base: SodioInputs = { na: 118, gl: NaN, peso: 70, sx: 'm', tempo: 'cronica', sint: 'leve', vol: 'eu' };
const run = (over: Partial<SodioInputs> = {}) => computeSodio({ ...base, ...over });
const txt = (over: Partial<SodioInputs> = {}) => sodioText(run(over));

describe('6. Sódio — balanço de massa e Adrogué-Madias', () => {
  it('NaCl 3% de 118 → 126 com ACT 42 L = 868,2 mL', () => near(vol3(42, 118, 126), 868.217, 0.01)); // 42 × 8 / (513 − 126) × 1000
  it('Adrogué: 1 L de 3% com Na 118, ACT 42 = +9,19', () => near(adrogue(513, 118, 42), 9.186, 0.001));
  it('Déficit de água livre ACT 42, Na 162 = 6,6 L', () => near(waterDeficit(42, 162), 6.6, 1e-9));
  it('SG 5% de 162 → 152, ACT 42 = 2,763 L', () => near(volFree(42, 162, 152), 2.7632, 0.0001));
  it('SF 0,45% de 162 → 152, ACT 42 = 5,6 L', () => near(volHalf(42, 162, 152), 5.6, 1e-9));
  it('Na 118 = hiponatremia profunda (< 125)', () => expect(txt({ sint: 'grave' })).toContain('profunda'));
  it('Manutenção 3% = 868 mL/24 h → 36 mL/h', () => expect(txt({ sint: 'grave' })).toContain('36'));
  it('Na 162: SG 5% 2,8 L em 24 h', () => expect(txt({ na: 162, sint: 'grave' })).toContain('2,8 L'));
  it('Na 162: SF 0,45% 5,6 L em 24 h', () => expect(txt({ na: 162, sint: 'grave' })).toContain('5,6 L'));
  it('Na 130 com glicemia 600 → corrigido 142 = normal', () => expect(txt({ na: 130, gl: 600, sint: 'grave' })).toContain('Normal')); // 130 + 2,4 × 5 = 142
});

describe('Sódio — modelo e bordas', () => {
  it('faltando peso e Na → aguardando', () => {
    const m = computeSodio({ ...base, na: NaN, peso: NaN });
    expect(m.kind).toBe('idle');
    if (m.kind === 'idle') expect(m.missing).toEqual(['peso', 'Na⁺']);
    expect(m.summary).toBe('');
  });
  it('ACT por fator: homem 42 L, mulher 35 L, idoso 35 L, idosa 31,5 L', () => {
    const t = (sx: SodioInputs['sx']) => { const m = run({ sx }); return m.kind === 'idle' ? NaN : m.tbw; };
    expect(t('m')).toBeCloseTo(42, 9); expect(t('f')).toBeCloseTo(35, 9); expect(t('i')).toBeCloseTo(35, 9); expect(t('if')).toBeCloseTo(31.5, 9);
  });
  it('hiponatremia crônica 118: meta 126 em 24 h, 868 mL de NaCl 3%, +9,2 por litro', () => {
    const m = run({ sint: 'grave' });
    expect(m.kind).toBe('hipo');
    if (m.kind !== 'hipo') return;
    expect(m.grau).toBe('profunda');
    expect(m.alvo).toBe(126);
    near(m.v3, 868.217, 0.01);
    near(m.dL, 9.186, 0.001);
    expect(m.usa3).toBe(true);
    expect(m.verdict.cls).toBe('crit');
    expect(m.conduta[0][1]).toContain('NaCl 3% indicado');
    expect(m.readouts.some((r) => r.label.startsWith('NaCl 3%') && r.value === '36')).toBe(true);
  });
  it('aguda: meta +6; crônica: meta +8, nunca acima de 135', () => {
    const a = run({ tempo: 'aguda' }), c = run({ na: 130 });
    expect(a.kind === 'hipo' && a.alvo).toBe(124);
    expect(c.kind === 'hipo' && c.alvo).toBe(135);
  });
  it('NaCl 3% só com sintomas graves ou moderados + aguda', () => {
    const mc = run({ sint: 'moderado' });
    expect(mc.kind === 'hipo' && mc.usa3).toBe(false);
    const ma = run({ sint: 'moderado', tempo: 'aguda' });
    expect(ma.kind === 'hipo' && ma.usa3).toBe(true);
    expect(txt({ sint: 'leve' })).not.toContain('NaCl 3% indicado');
  });
  it('graus: 124,9 profunda · 125 moderada · 130 leve · 134,9 leve', () => {
    const g = (na: number) => { const m = run({ na }); return m.kind === 'hipo' ? m.grau : m.kind; };
    expect(g(124.9)).toBe('profunda'); expect(g(125)).toBe('moderada'); expect(g(130)).toBe('leve'); expect(g(134.9)).toBe('leve'); expect(g(135)).toBe('normal');
  });
  it('conduta por volemia sem NaCl 3%', () => {
    expect(txt({ vol: 'hipo' })).toContain('SF 0,9% para restaurar a volemia');
    expect(txt({ vol: 'eu' })).toContain('Restrição hídrica: 500–800 mL/dia');
    expect(txt({ vol: 'hiper' })).toContain('Furosemida');
  });
  it('hipernatremia 162 crônica: déficit 6,6 L, meta 152 (−10), SG 5% 2,76 L (115 mL/h), SF 0,45% 5,6 L (233 mL/h)', () => {
    const m = run({ na: 162 });
    expect(m.kind).toBe('hiper');
    if (m.kind !== 'hiper') return;
    expect(m.grau).toBe('grave');
    near(m.def, 6.6, 1e-9); expect(m.maxC).toBe(10); expect(m.alvo).toBe(152);
    near(m.sg5, 2.7632, 0.0001); near(m.s045, 5.6, 1e-9);
    expect(m.readouts[2].value).toBe('115'); expect(m.readouts[3].value).toBe('233');
    expect(m.verdict.cls).toBe('crit');
  });
  it('hipernatremia aguda corrige todo o excesso; graus 148 leve · 152 moderada · 157 moderada-grave', () => {
    const a = run({ na: 162, tempo: 'aguda' });
    expect(a.kind === 'hiper' && a.alvo).toBe(145);
    const g = (na: number) => { const m = run({ na }); return m.kind === 'hiper' ? m.grau : m.kind; };
    expect(g(148)).toBe('leve'); expect(g(152)).toBe('moderada'); expect(g(157)).toBe('moderada-grave'); expect(g(145)).toBe('normal');
    const l = run({ na: 148 });
    expect(l.kind === 'hiper' && l.verdict.cls).toBe('warn');
  });
  it('glicemia ≤ 100 não corrige; > 100 corrige e marca no resumo', () => {
    const s = run({ gl: 100 });
    expect(s.kind === 'hipo' ? s.corr : 'errado').toBeNull();
    const m = run({ gl: 400 });
    expect(m.kind === 'hipo' && m.nae).toBeCloseTo(125.2, 9);
    expect(m.summary).toContain('corrigido pela glicemia');
  });
  it('resumos para prontuário', () => {
    expect(run({ sint: 'grave' }).summary).toBe('Hiponatremia profunda (Na 118,0 mEq/L), crônica/indeterminada, euvolêmica, sintomas graves. ACT 42,0 L. Meta Na 126,0 mEq/L em 24 h (Δ máx. 10–12). NaCl 3%: bolus 150 mL em 20 min (até 3×); se necessário, ~36 mL/h (868 mL em 24 h). Na a cada 4–6 h.');
    expect(run({ na: 162 }).summary).toBe('Hipernatremia grave (Na 162,0 mEq/L), crônica/indeterminada. ACT 42,0 L. Déficit de água livre 6,6 L. Para Na 152,0 em 24 h: SG 5% 2,8 L (~115 mL/h) ou SF 0,45% 5,6 L (~233 mL/h), + perdas em curso. Na a cada 4–6 h.');
    expect(run({ na: 140 }).summary).toBe('Na 140,0 mEq/L — normal.');
  });
});
