/* 9. TEG (portado de tests/tests.js) + ordem da conduta e regra K prolongado → fibrinogênio */
import { describe, it, expect } from 'vitest';
import '@/lib/calc';
import { computeTeg, curve, DEFAULTS, dev, parseValues, PRESETS, status, tegText, type Key, type TegValues } from './teg.calc';

const run = (over: Partial<TegValues> = {}) => computeTeg({ ...DEFAULTS, ...over });
const txt = (over: Partial<TegValues> = {}) => tegText(run(over));
const preset = (name: string) => computeTeg(PRESETS.find((p) => p.name === name)!.v);
const texts = (over: Partial<Record<Key, string>> = {}): Record<Key, string> => ({ R: '6', K: '2', A: '63', MA: '60', LY: '1', ...over });

describe('9. TEG', () => {
  it('TEG: K 5 isolado → repor fibrinogênio', () => expect(txt({ K: 5 })).toContain('Repor fibrinogênio'));
  it('TEG: LY30 8% → ácido tranexâmico', () => expect(txt({ K: 2, LY: 8 })).toContain('tranexâmico'));
});

describe('TEG — regra K prolongado → fibrinogênio', () => {
  it('K > 3 com ângulo normal conta como hipofibrinogenemia e explica pelo K', () => {
    const m = run({ K: 5 });
    expect(m.s.K).toBe('high');
    expect(m.s.A).toBe('normal');
    expect(m.ab).toEqual(['hipofibrinogenemia']);
    const c = m.cand.find((x) => x.t === 'Repor fibrinogênio')!;
    expect(c.d.startsWith('K prolongado sugere')).toBe(true);
    expect(c.u).toBeCloseTo(1, 9); // dev(5, 1, 3) = (5 − 3) / 2
    expect(c.dose).toContain('Crioprecipitado');
  });
  it('ângulo baixo e K prolongado juntos: "Ângulo α reduzido e K prolongado"', () => {
    const c = preset('Hipofibrinogenemia').cand.find((x) => x.t === 'Repor fibrinogênio')!;
    expect(c.d.startsWith('Ângulo α reduzido e K prolongado')).toBe(true);
  });
  it('ângulo baixo com K normal explica pelo ângulo', () => {
    const c = run({ A: 45 }).cand.find((x) => x.t === 'Repor fibrinogênio')!;
    expect(c.d.startsWith('Ângulo α reduzido sugere')).toBe(true);
  });
  it('K 3,0 (limite) e K 0,9 (curto) não indicam fibrinogênio', () => {
    expect(run({ K: 3 }).cand.some((x) => x.t === 'Repor fibrinogênio')).toBe(false);
    expect(run({ K: 0.9 }).cand.some((x) => x.t === 'Repor fibrinogênio')).toBe(false);
    expect(run({ K: 0.9 }).interp[1].head).toBe('K curto:');
  });
});

describe('TEG — ordem da conduta por grau de desvio', () => {
  it('LY 8 + K 5 + R 14 + MA 38: TXA → fibrinogênio → PFC → plaquetas, com cores crit/warn/info/info', () => {
    const m = run({ LY: 8, K: 5, R: 14, MA: 38 });
    // u: TXA (5/3 × 1,4 + 1 = 3,33) · fibrinogênio 1,0 · PFC (4/5 = 0,8) · plaquetas (12/20 + 0,15 = 0,75)
    expect(m.cand.map((c) => c.t)).toEqual(['Ácido tranexâmico', 'Repor fibrinogênio', 'Plasma fresco congelado', 'Transfundir plaquetas']);
    expect(m.cand.map((c) => +c.u.toFixed(4))).toEqual([3.3333, 1, 0.8, 0.75]);
    expect(m.steps.map((s) => s.cls)).toEqual(['crit', 'warn', 'info', 'info']);
    expect(m.steps.map((s) => s.n)).toEqual([1, 2, 3, 4]);
    expect(m.ab).toEqual(['déficit de fatores', 'hipofibrinogenemia', 'disfunção plaquetária', 'hiperfibrinólise']);
    expect(m.summary).toContain('Conduta: Ácido tranexâmico → Repor fibrinogênio → Plasma fresco congelado → Transfundir plaquetas.');
  });
  it('plaquetas muito baixas passam na frente do PFC discreto', () => {
    const m = run({ R: 11, MA: 30 }); // PFC 0,2 · plaquetas 1,15
    expect(m.cand.map((c) => c.t)).toEqual(['Transfundir plaquetas', 'Plasma fresco congelado']);
    expect(m.steps[0].cls).toBe('crit');
    expect(m.steps[1].cls).toBe('ok'); // u 0,2 < 0,35
  });
  it('hiperfibrinólise isolada: TXA em primeiro e único, LY30 elevado em vermelho', () => {
    const m = preset('Hiperfibrinólise');
    expect(m.verdict.title).toBe('Hipocoagulabilidade');
    expect(m.cand.map((c) => c.t)).toEqual(['Ácido tranexâmico']);
    expect(m.cand[0].dose).toBe('TXA 1 g IV em 10 min → 1 g IV em 8 h');
    expect(m.interp[4].cls).toBe('crit');
  });
  it('hipercoagulável: sem hemocomponente (passo ok), veredito de atenção', () => {
    const m = preset('Hipercoagulável');
    expect(m.hyper).toBe(true);
    expect(m.verdict).toMatchObject({ cls: 'warn', title: 'Hipercoagulabilidade' });
    expect(m.cand.map((c) => c.t)).toEqual(['Sem indicação de hemocomponente']);
    expect(m.steps[0].cls).toBe('ok'); // 0,4 × 0,6 = 0,24
    expect(m.summary).toContain('Hipercoagulabilidade. Conduta: Sem indicação de hemocomponente.');
  });
  it('hiperfibrinólise anula o rótulo de hipercoagulabilidade', () => {
    const m = run({ R: 3, LY: 10 });
    expect(m.hyper).toBe(false);
    expect(m.verdict.title).toBe('Hipocoagulabilidade');
  });
  it('LY30 < 0,5 → shutdown (não tratar), passo verde', () => {
    const m = run({ LY: 0.2 });
    expect(m.cand[0].t).toContain('shutdown');
    expect(m.steps[0].cls).toBe('ok');
    expect(m.interp[4].head).toBe('LY30 muito baixo:');
    expect(run({ LY: 0.5 }).cand).toEqual([]);
  });
  it('normal: sem conduta, resumo completo', () => {
    const m = preset('Normal');
    expect(m.verdict).toMatchObject({ cls: 'ok', title: 'Dentro da normalidade' });
    expect(m.cand).toEqual([]);
    expect(m.steps).toEqual([]);
    expect(m.interp.every((x) => x.cls === 'ok')).toBe(true);
    expect(tegText(m)).toContain('Sem indicação de intervenção hemostática.');
    expect(m.summary).toBe('TEG: R 6,0 min, K 2,0 min, Ângulo α 63°, MA 60 mm, LY30 1,0 %. Normal. Conduta: sem intervenção hemostática.');
  });
  it('déficit de fatores (preset): PFC em primeiro, R prolongado na interpretação', () => {
    const m = preset('Déficit de fatores');
    expect(m.cand[0].t).toBe('Plasma fresco congelado');
    expect(m.cand[0].u).toBeCloseTo(0.8, 9);
    expect(m.interp[0]).toMatchObject({ cls: 'warn', head: 'R prolongado:' });
    expect(m.summary).toContain('Hipocoagulabilidade (déficit de fatores)');
  });
});

describe('TEG — leitura dos campos e traçado', () => {
  it('status e dev', () => {
    expect(status(4.9, [5, 10])).toBe('low'); expect(status(10, [5, 10])).toBe('normal'); expect(status(10.1, [5, 10])).toBe('high');
    expect(dev(14, 5, 10)).toBeCloseTo(0.8, 9); expect(dev(3, 5, 10)).toBeCloseTo(0.4, 9); expect(dev(7, 5, 10)).toBe(0);
  });
  it('campo vazio ou ilegível → padrão; vírgula decimal; pisos (K ≥ 0,1, LY ≥ 0, demais ≥ 0,1)', () => {
    expect(parseValues(texts({ R: '', A: 'abc' }))).toMatchObject({ R: 6, A: 63 });
    expect(parseValues(texts({ R: '7,5' })).R).toBe(7.5);
    expect(parseValues(texts({ K: '0', LY: '-2', R: '0', MA: '0' }))).toMatchObject({ K: 0.1, LY: 0, R: 0.1, MA: 0.1 });
    expect(parseValues(texts({ R: '35' })).R).toBe(35); // fora do alcance do slider, mas aceito
  });
  it('traçado: marcadores R, K e MA nas posições do tempo', () => {
    const c = curve(DEFAULTS);
    const xs = (340 - 30 - 8) / (6 + 2 + 30);
    expect(c.markers.map((m) => m.label)).toEqual(['R', 'K', 'MA']);
    expect(c.markers[0].x).toBeCloseTo(30 + 6 * xs, 9);
    expect(c.markers[1].x).toBeCloseTo(30 + 8 * xs, 9);
    expect(c.markers[2].x).toBeCloseTo(30 + 18 * xs, 9);
    expect(c.path.startsWith('M30.0,90.0')).toBe(true);
    expect(c.path.endsWith('Z')).toBe(true);
    expect(c.grid.map((g) => g.label)).toEqual(['20', '40', '60']);
  });
  it('traçado não quebra com MA ≤ 20 (piso 21) nem LY ≥ 95', () => {
    expect(() => curve({ ...DEFAULTS, MA: 15, LY: 100 })).not.toThrow();
    expect(curve({ ...DEFAULTS, MA: 15, LY: 100 }).path.includes('NaN')).toBe(false);
  });
});
