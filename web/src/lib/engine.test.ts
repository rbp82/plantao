/* Motor de gasometria/hemodinâmica (engine.ts) — porte das seções 4, 13 e 14 (lógica pura) de ../tests/tests.js.
   Valores esperados calculados à mão a partir das fórmulas publicadas (citadas em cada grupo); não alterar. */
import { describe, expect, it } from 'vitest';
import { engine, gasF, type GasInputs, type GasItem, type GasResult } from './engine';

const GCFG = { agRef: 12, patm: 760, lacUnit: 'mmol' };
const G = (r: GasInputs): GasResult => engine.compute(r, GCFG, {});
const gfind = (res: GasResult, id: string): GasItem => Object.values(res.ch).flat().find((i) => i.id === id) || ({ id, l: '' } as GasItem);
const num = (it: GasItem): number => (typeof it.v === 'number' ? it.v : NaN);
const dxText = (res: GasResult) => res.dx.map((x) => x.t).join(' | ');
const ab = (ph: number, pc: number, hc: number) => {
  const res = G({ ph, paco2: pc, hco3: hc });
  const txt = dxText(res);
  return { primary: res.main?.t ?? '', comp: txt.toLowerCase(), consistent: !/inconsistentes/.test(txt), phHH: res.d.phHH as number };
};

describe('4. Gasometria — Winter, compensações, Henderson-Hasselbalch, ânion gap', () => {
  it('pH 7,25 / PaCO₂ 30 / HCO₃ 13 = acidose metabólica; Winter 25,5–29,5 → acidose respiratória associada; H-H consistente', () => {
    const g = ab(7.25, 30, 13);
    expect(g.primary).toContain('Acidose metabólica');
    expect(g.comp).toContain('acidose respiratória associada');
    expect(g.consistent).toBe(true);
  });
  it('acidose respiratória: parcial, aguda, compensada (pH normal), crônica e mista', () => {
    expect(ab(7.30, 60, 28.5).comp).toContain('compensação parcial');
    expect(ab(7.27, 60, 26).comp).toContain('aguda');
    expect(ab(7.37, 60, 31).primary).toContain('pH normal');
    expect(ab(7.32, 60, 31).comp).toContain('crônica');
    expect(ab(7.25, 60, 22).primary).toContain('Distúrbio misto');
  });
  it('alcalose respiratória: HCO₃ 17,5 entre agudo (20) e crônico (14) = parcial; HCO₃ 20 = aguda', () => {
    expect(ab(7.56, 20, 17.5).comp).toContain('compensação parcial');
    expect(ab(7.62, 20, 20).comp).toContain('alcalose respiratória aguda');
  });
  it('alcalose metabólica (Berend 2014): 0,7 × (34 − 24) + 40 = 47 ± 2', () => {
    expect(ab(7.50, 45, 34).comp).toContain('adequada');
    expect(num(gfind(G({ ph: 7.5, paco2: 45, hco3: 34 }), 'malk'))).toBeCloseTo(47, 3);
    expect(ab(7.55, 42, 34).comp).toContain('alcalose respiratória associada');
  });
  it('Henderson-Hasselbalch: pH 7,40 com PaCO₂ 40 e HCO₃ 15 é inconsistente; 6,1 + log10(15/1,2) = 7,197', () => {
    const g = ab(7.40, 40, 15);
    expect(g.consistent).toBe(false);
    expect(g.phHH).toBeCloseTo(7.197, 3);
    expect(dxText(G({ ph: 7.40, paco2: 40, hco3: 15 }))).toContain('inconsistentes');
  });
  it('AG 140 − 111 = 29; corrigido 29 + 2,5 = 31,5; Δ/Δ = (31,5 − 12) / (24 − 11) = 1,5 → AG alto pura', () => {
    const gr = G({ ph: 7.25, paco2: 26, hco3: 11, na: 140, cl: 100, alb: 3 });
    expect(num(gfind(gr, 'agc'))).toBeCloseTo(31.5, 3);
    expect(num(gfind(gr, 'dr'))).toBeCloseTo(1.5, 3);
    expect(gfind(gr, 'dr').n).toContain('AG alto pura');
  });
  it('P/F 60 / 0,4 = 150 (moderada); FiO₂ como fração dá o mesmo; FiO₂ 10 inválida não calcula', () => {
    const gr = G({ pao2: 60, fio2: 40, paco2: 40 });
    expect(num(gfind(gr, 'pf'))).toBeCloseTo(150, 3);
    expect(gfind(gr, 'pf').n).toContain('moderada');
    expect(num(gfind(G({ pao2: 60, fio2: 0.4 }), 'pf'))).toBeCloseTo(150, 3);
    expect(!!gfind(G({ pao2: 60, fio2: 10 }), 'pf').miss).toBe(true);
  });
});

describe('13. Motor — Stewart, oxigenação, perfusão, débito, fluidos, ventilação, renal', () => {
  it('Stewart: SIDa = Na + K + 2·Ca + 2·Mg − Cl − lactato (Ca/Mg assumidos); BE parcionado Na−Cl = 138 − 112 − 38 = −12', () => {
    const e = G({ ph: 7.30, hco3: 18, paco2: 38, na: 138, k: 4, cl: 112, alb: 2.5, lac: 1.5 });
    expect(num(gfind(e, 'sida'))).toBeCloseTo(138 + 4 + 2 * 1.15 + (2 * 2) / 2.43 - 112 - 1.5, 3);
    expect(gfind(e, 'bepart').n).toContain('Na-Cl −12,0');
  });
  it('oxigenação: P/F 160 intubado PEEP 8 → SDRA moderada; A-a em ar ambiente = 9,73; ROX (92/50)/28 = 6,57', () => {
    const e = G({ pao2: 80, fio2: 50, paco2: 40, sup: 'VM', peep: 8 });
    expect(dxText(e)).toContain('SDRA moderada');
    expect(num(gfind(G({ pao2: 90, fio2: 21, paco2: 40, age: 40 }), 'aa'))).toBeCloseTo(9.73, 2);
    expect(num(gfind(G({ sup: 'CNAF', spo2: 92, fio2: 50, fr: 28 }), 'rox'))).toBeCloseTo(6.571, 2);
  });
  it('ventilação: PBW homem 175 cm = 70,57; ΔP 26 − 10 = 16; Cst 420/16 = 26,25; MP 0,098 × 22 × 0,42 × (32 − 8) = 21,73', () => {
    const e = G({ height: 175, sex: 'M', vt: 420, pplat: 26, peep: 10, fr: 22, ppico: 32, paco2: 50 });
    expect(e.d.pbw).toBeCloseTo(70.566, 3);
    expect(num(gfind(e, 'dp'))).toBeCloseTo(16, 3);
    expect(num(gfind(e, 'cst'))).toBeCloseTo(26.25, 3);
    expect(num(gfind(e, 'mp'))).toBeCloseTo(21.732, 2);
  });
  it('débito e perfusão: DC por VTI 5,03; CaO₂ 13,41; gap 8; RVS 955; ScvO₂ 65 % alerta', () => {
    const e = G({ dvsve: 2.0, vti: 20, fc: 80, height: 170, weight: 70, pam: 70, pvc: 10, hb: 10, sao2: 98, pao2: 90, svo2: 65, pvco2: 52, paco2: 44 });
    expect(e.d.dcVti).toBeCloseTo(5.0265, 3);
    expect(e.d.cao2).toBeCloseTo(13.411, 3);
    expect(num(gfind(e, 'gap'))).toBeCloseTo(8, 3);
    expect(Math.abs(num(gfind(e, 'rvs')) - 954.93)).toBeLessThanOrEqual(0.5);
    expect(dxText(e)).toContain('ScvO2 65');
  });
  it('Fick estimado (LaFarge): VO₂/(Ca−vO₂ × 10), rotulado como só tendência', () => {
    const e = G({ height: 170, weight: 70, age: 60, sex: 'M', fc: 90, hb: 12, sao2: 97, svo2: 70 });
    const asc = 0.007184 * Math.pow(70, 0.425) * Math.pow(170, 0.725);
    expect(e.d.dcFick).toBeCloseTo((asc * (138.1 - 11.49 * Math.log(60) + 0.378 * 90)) / (1.34 * 12 * 0.27 * 10), 3);
    expect(gfind(e, 'dcfick').n).toContain('só tendência');
  });
  it('Fick estimado (LaFarge) em mulher: coeficiente de ln(idade) é 17,04 (não constante) — LaFarge & Miettinen 1970, PMID 5416840; Reiter, Herz 2023, PMID 37439804', () => {
    // mulher 60 a, FC 90, ASC(70 kg/170 cm): VO2/ASC = 138,1 − 17,04 × ln(60) + 0,378 × 90 = 102,35 mL/min/m²
    // (a versão anterior do app subtraía 17,04 como constante e dava 108,04 → DC 5,6 % maior)
    const e = G({ height: 170, weight: 70, age: 60, sex: 'F', fc: 90, hb: 12, sao2: 97, svo2: 70 });
    const asc = 0.007184 * Math.pow(70, 0.425) * Math.pow(170, 0.725);
    const vo2m2 = 138.1 - 17.04 * Math.log(60) + 0.378 * 90;
    expect(vo2m2).toBeCloseTo(102.35, 2);
    expect(e.d.vo2est).toBeCloseTo(asc * vo2m2, 3);
    expect(e.d.dcFick).toBeCloseTo((asc * vo2m2) / (1.34 * 12 * 0.27 * 10), 3);
  });
  it('FeUreia: 35 % ainda é pré-renal (Carvounis 2002, PMID 12427149: FeUr ≤ 35 %); FeNa 0,5 % pré-renal (Espinel 1976, PMID 947239)', () => {
    // FeUr = (uUr × Cr) / (ureia × uCr) × 100 = (350 × 2) / (100 × 20) × 100 = 35
    expect(gfind(G({ uUr: 350, cr: 2, ureia: 100, uCr: 20 }), 'feur').n).toBe('pré-renal provável');
    expect(gfind(G({ uUr: 360, cr: 2, ureia: 100, uCr: 20 }), 'feur').n).toBe('renal provável');
    // FeNa = (uNa × Cr) / (Na × uCr) × 100 = (10 × 2) / (140 × 28,57) × 100 = 0,5
    expect(num(gfind(G({ uNa: 10, cr: 2, na: 140, uCr: 28.57 }), 'fena'))).toBeCloseTo(0.5, 2);
    expect(gfind(G({ uNa: 10, cr: 2, na: 140, uCr: 28.57 }), 'fena').n).toBe('pré-renal provável');
  });
  it('fluido-responsividade: VPP, PLR, EEO+EIO, tidal volume challenge', () => {
    expect(gfind(G({ ftest: 'vpp', ppv: 16, chkVc: true, chkSinus: true, chkTorax: true, vt: 600, height: 175, sex: 'M', fc: 100, fr: 18 }), 'fr_vpp').l).toBe('Responsivo');
    expect(gfind(G({ ftest: 'vpp', ppv: 16, chkVc: true, chkSinus: true, chkTorax: true, vt: 420, height: 175, sex: 'M' }), 'fr_vpp').n).toContain('tidal volume challenge');
    expect(gfind(G({ ftest: 'vpp', ppv: 11, chkVc: true, chkSinus: true, chkTorax: true, chkVt8: true }), 'fr_vpp').l).toBe('Zona cinzenta');
    expect(gfind(G({ ftest: 'plr', fBase: 15, fPost: 17 }), 'fr_plr').l).toBe('Responsivo');
    expect(gfind(G({ ftest: 'eeo', fMet: 'vti', fBase: 20, fPost: 21.4, fEio: 18.6 }), 'fr_eeo').l).toBe('Responsivo');
    expect(gfind(G({ ftest: 'vtc', ppv6: 6, ppv8: 10.5 }), 'fr_vtc').l).toBe('Responsivo');
  });
  it('renal: CKD-EPI 2021 (Cr 1,0, 60 a, H) = 86,16; KDIGO Cr 2,4/1,0 + diurese 0,36 mL/kg/h em 12 h → estágio 2', () => {
    // 142 × (1/0,9)^−1,2 × 0,9938^60 = 86,16 (Inker, NEJM 2021) — mesmo valor de renal.ckdepi(60, 1.0, 'M')
    expect(num(gfind(G({ cr: 1.0, age: 60, sex: 'M' }), 'ckd'))).toBeCloseTo(86.163, 2);
    expect(gfind(G({ cr: 2.4, crBase: 1.0, diu: 300, diuH: 12, weight: 70 }), 'kdigo').v).toBe('Estágio 2');
  });
  it('clearance de lactato 4 → 3 = 25 % (registro anterior pelo contexto)', () => {
    expect(num(gfind(engine.compute({ lac: 3 }, GCFG, { prev: { lac: 4 }, ts: 7200000, prevTs: 0 }), 'laccl'))).toBeCloseTo(25, 3);
  });
  it('PAM 70 com PAM alvo 80 da ficha → alerta pelo alvo individual', () => {
    expect(dxText(G({ pam: 70, pamAlvo: 80 }))).toContain('alvo 80');
  });
  it('com todos os campos: toda referência existe e nenhum resultado é NaN', () => {
    const allRefs = Object.values(G({ sex: 'F', age: 72, height: 160, weight: 65, ph: 7.28, paco2: 48, pao2: 70, hco3: 22, sao2: 92, na: 150, k: 6.3, cl: 110, glic: 420, lac: 4.5, hb: 8, fio2: 70, alb: 2.2, ureia: 120, cr: 2.8, osmMed: 340, pvco2: 56, svo2: 62, pas: 85, pad: 45, fc: 118, pvc: 14, tec: 4.2, dvsve: 1.9, vti: 13, papm: 35, poap: 18, sup: 'VM', spo2: 93, fr: 26, vt: 380, peep: 12, pplat: 29, ppico: 36, paw: 18, fluxo: 50, crBase: 0.9, uNa: 12, uCr: 80, uUr: 400, ftest: 'vvs', svv: 14 }).ch).flat();
    expect(allRefs.filter((i) => i.ref && !engine.REF[i.ref]).map((i) => i.ref).join(',') || 'ok').toBe('ok');
    expect(allRefs.some((i) => typeof i.v === 'number' && !Number.isFinite(i.v))).toBe(false);
  });
});

/* 14. Calculadoras novas: na bateria antiga todas as asserções montam telas (mount) — cobertas pelos testes React
   em src/tools/delta. Aqui ficam os mesmos cenários chamando o motor direto. */
describe('14. Calculadoras novas — cenários pelo motor', () => {
  it('fluidos: PLR +13 % → Responsivo; VPP sem as condições marcadas → não interpretável', () => {
    expect(gfind(G({ ftest: 'plr', fBase: 15, fPost: 17 }), 'fr_plr').l).toBe('Responsivo');
    expect(gfind(G({ ftest: 'vpp', ppv: 16 }), 'fr_vpp').l).toBe('Não interpretável');
  });
  it('gap de CO₂ 8 mmHg com ScvO₂ normal → fluxo provavelmente insuficiente', () => {
    const e = G({ paco2: 40, pvco2: 48, svo2: 74 });
    expect(engine.fmt(num(gfind(e, 'gap')), 1)).toBe('8,0');
    expect(dxText(e)).toContain('fluxo provavelmente insuficiente');
  });
  it('débito por VTI = 5,03 L/min; ventilação: PBW 70,6 e driving pressure 18 → alerta', () => {
    expect(engine.fmt(num(gfind(G({ dvsve: 2, vti: 20, fc: 80 }), 'dcvti')), 2)).toBe('5,03');
    const v = G({ sex: 'M', height: 175, vt: 420, peep: 10, pplat: 28 });
    expect(engine.fmt(num(gfind(v, 'pbw')), 1)).toBe('70,6');
    expect(dxText(v)).toContain('Driving pressure 18');
  });
});

describe('casos de borda', () => {
  it('H: vazio, nulo, texto e NaN não contam; números e textos numéricos contam', () => {
    expect(engine.H('')).toBe(false);
    expect(engine.H(null)).toBe(false);
    expect(engine.H(undefined)).toBe(false);
    expect(engine.H('abc')).toBe(false);
    expect(engine.H(NaN)).toBe(false);
    expect(engine.H(0)).toBe(true);
    expect(engine.H('7.4')).toBe(true);
  });
  it('fmt: vírgula decimal, sinal de menos tipográfico, "--" para ausente', () => {
    expect(engine.fmt(1.25, 1)).toBe('1,3');
    expect(engine.fmt(-12, 1)).toBe('−12,0');
    expect(engine.fmt(null)).toBe('--');
    expect(engine.fmt(NaN, 2)).toBe('--');
    expect(engine.fmt(954.93)).toBe('955');
  });
  it('sem nenhum campo: só itens "faltam", nenhum diagnóstico, worst e main nulos, key toda nula', () => {
    const e = G({});
    expect(e.dx).toEqual([]);
    expect(e.worst).toBeNull();
    expect(e.main).toBeNull();
    expect(Object.values(e.ch).flat().every((i) => Array.isArray(i.miss) && i.miss.length > 0)).toBe(true);
    expect(gfind(e, 'primary').miss).toEqual(['ph', 'paco2', 'hco3']);
    expect(Object.values(e.key).every((v) => v === null)).toBe(true);
    expect(Object.keys(e.ch)).toEqual(engine.CHANNELS.map((c) => c.id));
  });
  it('campos vazios ("") e texto não numérico contam como ausentes; textos numéricos são lidos', () => {
    const vazio = G({ ph: '', paco2: '', hco3: 'x' });
    expect(gfind(vazio, 'primary').miss).toEqual(['ph', 'paco2', 'hco3']);
    const txt = G({ ph: '7.25', paco2: '30', hco3: '13' });
    expect(txt.main?.t).toContain('Acidose metabólica');
    expect(txt.key.ph).toBe(7.25);
  });
  it('FiO₂: ar ambiente sem FiO₂ assume 21 %; FiO₂ fora de 21–100 / 0,21–1 é inválida', () => {
    expect(G({ sup: 'AA' }).d.fio2).toBe(21);
    expect(G({ sup: 'VM' }).d.fio2).toBeNull();
    expect(G({ fio2: 0.1 }).d.fio2).toBeNull();
    expect(G({ fio2: 120 }).d.fio2).toBeNull();
    expect(G({ fio2: 1 }).d.fio2).toBe(100);
    expect(num(gfind(G({ sup: 'AA', pao2: 95 }), 'pf'))).toBeCloseTo(452.38, 2);
  });
  it('gasometria normal → "Equilíbrio ácido-base normal" com severidade ok', () => {
    const e = G({ ph: 7.40, paco2: 40, hco3: 24 });
    expect(e.main?.t).toBe('Equilíbrio ácido-base normal');
    expect(e.main?.s).toBe('ok');
    expect(e.worst).toBe('ok');
    expect(gfind(e, 'hh').n).toBe('coerente com o pH medido');
  });
  it('pH < 7,2 é crítico; o pior achado manda em worst', () => {
    const e = G({ ph: 7.10, paco2: 30, hco3: 9 });
    expect(gfind(e, 'primary').fl).toBe('crit');
    expect(e.worst).toBe('crit');
  });
  it('delta ratio com HCO₃ alto e AG alto: alcalose metabólica coexistente (texto, sem número)', () => {
    const e = G({ ph: 7.45, paco2: 46, hco3: 30, na: 145, cl: 90 });
    const dr = gfind(e, 'dr');
    expect(dr.txt).toBe(true);
    expect(dr.n).toContain('alcalose metabólica coexistente');
  });
  it('S/F com SpO₂ > 97 % não é válida; ROX só em CNAF/VNI/O2', () => {
    const sf = gfind(G({ spo2: 99, fio2: 40 }), 'sf');
    expect(sf.txt).toBe(true);
    expect(sf.n).toContain('não válida');
    expect(Object.values(G({ sup: 'VM', spo2: 92, fio2: 50, fr: 28 }).ch).flat().some((i) => i.id === 'rox')).toBe(false);
    expect(Object.values(G({ sup: 'VNI', spo2: 92, fio2: 50, fr: 28 }).ch).flat().some((i) => i.id === 'rox')).toBe(true);
  });
  it('complacência com ΔP ≤ 0 é omitida; driving pressure ≥ 18 é crítica', () => {
    const e = G({ vt: 400, pplat: 10, peep: 12 });
    expect(Object.values(e.ch).flat().some((i) => i.id === 'cst')).toBe(false);
    expect(gfind(G({ pplat: 30, peep: 10 }), 'dp').fl).toBe('crit');
  });
  it('KDIGO: anúria 12 h → estágio 3; sem critério quando Cr igual à basal', () => {
    expect(gfind(G({ diu: 0, diuH: 12, weight: 70 }), 'kdigo').v).toBe('Estágio 3');
    expect(gfind(G({ cr: 1.0, crBase: 1.0 }), 'kdigo').v).toBe('Sem critério');
    expect(gfind(G({ cr: 1.0 }), 'kdigo').miss).toEqual(['crBase']);
  });
  it('débito: medido prevalece sobre VTI e Fick', () => {
    const e = G({ dcMed: 4.2, dvsve: 2.0, vti: 20, fc: 80 });
    expect(e.d.dc).toBe(4.2);
    expect(e.d.dcSrc).toBe('medido');
    expect(e.d.dcVti).toBeCloseTo(5.0265, 3);
  });
  it('clearance de lactato: lactato prévio informado, sem registro anterior; lactato > 2 sem prévio pede lacPrev', () => {
    const e = G({ lac: 2, lacPrev: 4, lacPrevH: 2 });
    expect(num(gfind(e, 'laccl'))).toBeCloseTo(50, 3);
    expect(gfind(e, 'laccl').n).toContain('informado');
    expect(gfind(G({ lac: 3 }), 'laccl').miss).toEqual(['lacPrev']);
  });
  it('fluido: teste sem dados pede os campos; VCI em VM usa distensibilidade, espontânea colapsabilidade', () => {
    expect(gfind(G({ ftest: 'vpp' }), 'fr_vpp').miss).toEqual(['ppv']);
    expect(gfind(G({ ftest: 'plr' }), 'fr_plr').miss).toEqual(['fBase', 'fPost']);
    expect(gfind(G({ ftest: 'vci', vciMax: 2.4, vciMin: 2.0, sup: 'VM' }), 'fr_vci').l).toBe('Responsivo');
    expect(gfind(G({ ftest: 'vci', vciMax: 2.4, vciMin: 2.0 }), 'fr_vci').l).toBe('Indeterminado');
    expect(G({}).ch.fluid).toEqual([]);
  });
  it('gasF: ordem dos campos do laudo, grupos, DEMO e campos dinâmicos de fluido', () => {
    expect(Object.keys(gasF.F).slice(4, 18)).toEqual(['ph', 'paco2', 'pao2', 'hco3', 'be', 'sao2', 'na', 'k', 'cl', 'ica', 'glic', 'lac', 'hb', 'fio2']);
    expect(gasF.F.age.p).toEqual([18, 120]);
    expect(gasF.DEMO).toEqual(['sex', 'age', 'height', 'weight', 'crBase', 'pamAlvo']);
    expect(gasF.GROUPS.map((g) => g.id)).toEqual(['pac', 'gaso', 'bio', 'ven', 'hemo', 'dc', 'vent', 'fluid', 'ren']);
    expect(gasF.GROUPS.flatMap((g) => g.f).every((f) => f in gasF.F)).toBe(true);
    expect(gasF.fluidFields({ ftest: 'eeo', fMet: 'vti' })).toEqual(['fMet', 'fBase', 'fPost', 'fEio']);
    expect(gasF.fluidFields({ ftest: 'eeo' })).toEqual(['fMet', 'fBase', 'fPost']);
    expect(gasF.fluidFields({})).toEqual([]);
    expect(gasF.fluidLabel('fBase', { ftest: 'eeo', fMet: 'vti' })).toEqual(['VTI basal', 'cm']);
    expect(gasF.fluidLabel('fPost', { ftest: 'mfc' })).toEqual(['DC pós-bolus', 'L/min']);
    expect(gasF.fluidLabel('fBase', { ftest: 'vpp' })).toBeNull();
    expect(gasF.fluidLabel('ppv', { ftest: 'plr' })).toBeUndefined();
    expect(gasF.TREND.map((t) => t[0]).every((k) => k in G({}).key)).toBe(true);
    expect(engine.CHANNELS.map((c) => c.id)).toEqual(['ab', 'st', 'o2', 'perf', 'fluid', 'hemo', 'vent', 'renal']);
  });
});

/* Auditoria clínica 2026-10, parte 1 (docs/auditoria-2026-10/1-gasometria-oxigenacao.md): limites conferidos número a número
   contra a fonte primária localizada no PubMed. Valores esperados calculados à mão — não alterar sem nova fonte. */
describe('auditoria 2026-10 — gasometria, ácido-base, oxigenação e SDRA', () => {
  it('P/F exatamente 100 é SDRA grave (≤ 100, inclusivo) — Berlim, Ranieri JAMA 2012 PMID 22797452; Matthay AJRCCM 2024 PMID 37487152', () => {
    const e = G({ pao2: 50, fio2: 50, sup: 'VM', peep: 8 });
    expect(num(gfind(e, 'pf'))).toBeCloseTo(100, 6);
    expect(gfind(e, 'pf').fl).toBe('crit');
    expect(gfind(e, 'pf').n).toContain('grave');
    expect(dxText(e)).toContain('SDRA grave');
    expect(gfind(G({ pao2: 50.25, fio2: 50 }), 'pf').n).toContain('moderada'); // 100,5
    expect(gfind(G({ pao2: 75, fio2: 25 }), 'pf').n).toContain('leve'); // 300
    expect(gfind(G({ pao2: 75.25, fio2: 25 }), 'pf').fl).toBe('ok'); // 301
  });
  it('S/F (Rice, Chest 2007 PMID 17573487; Matthay 2024 PMID 37487152): ≤ 148 grave · ≤ 235 moderada · ≤ 315 leve · 316 sem critério', () => {
    const sf = (spo2: number, fio2: number) => gfind(G({ spo2, fio2, sup: 'VM', peep: 8 }), 'sf');
    expect(num(sf(74, 50))).toBeCloseTo(148, 6);
    expect(sf(74, 50).fl).toBe('crit');
    expect(sf(74, 50).n).toContain('grave');
    expect(dxText(G({ spo2: 74, fio2: 50, sup: 'VM', peep: 8 }))).toContain('SDRA grave');
    expect(sf(58.75, 25).n).toContain('moderada'); // 235
    expect(num(sf(78.75, 25))).toBeCloseTo(315, 6);
    expect(sf(78.75, 25).fl).toBe('warn');
    expect(sf(78.75, 25).n).toContain('leve');
    expect(sf(79, 25).fl).toBe('ok'); // 316
  });
  it('índice de oxigenação: IO 16 já é grave (PALICC-2, Emeriaud PCCM 2023 PMID 36661420: IO ≥ 16); 15,8 não; > 25 crit é decisão institucional', () => {
    // IO = FiO2 × Paw × 100 / PaO2 = 0,8 × 20 × 100 / 100 = 16
    const e = G({ paw: 20, fio2: 80, pao2: 100 });
    expect(num(gfind(e, 'oi'))).toBeCloseTo(16, 6);
    expect(gfind(e, 'oi').fl).toBe('warn');
    expect(gfind(G({ paw: 20, fio2: 80, pao2: 101 }), 'oi').fl).toBe('ok');
    expect(gfind(G({ paw: 20, fio2: 100, pao2: 75 }), 'oi').fl).toBe('crit'); // 26,7
  });
  it('Winter (Albert, Dell & Winters 1967, PMID 6016545; Berend 2014 tab. 1): HCO₃ 13 → 27,5 ± 2; PaCO₂ 30 fica fora da faixa', () => {
    expect(num(gfind(G({ ph: 7.25, paco2: 28, hco3: 13 }), 'winter'))).toBeCloseTo(27.5, 6);
    expect(gfind(G({ ph: 7.25, paco2: 28, hco3: 13 }), 'winter').fl).toBe('ok');
    expect(gfind(G({ ph: 7.25, paco2: 30, hco3: 13 }), 'winter').fl).toBe('warn');
  });
  it('compensações respiratórias: acidose aguda 1/10 e crônica 4/10 (Berend NEJM 2014, PMID 25295502: 4–5; González/Adrogué/Madias 2018, PMID 30197983: 0,476/mmHg); alcalose 2/10 e 5/10 (Krapf 1991, PMID 1902283)', () => {
    const ra = gfind(G({ ph: 7.32, paco2: 60, hco3: 31 }), 'racomp');
    expect(num(ra)).toBeCloseTo(26, 6);
    expect(ra.n).toContain('crônico 32,0'); /* 24 + 4 × 20/10 */
    const rk = gfind(G({ ph: 7.62, paco2: 20, hco3: 20 }), 'ralkcomp');
    expect(num(rk)).toBeCloseTo(20, 6);
    expect(rk.n).toContain('crônico 14,0');
  });
  it('SBE (Van Slyke, Siggaard-Andersen 1977, PMID 13478, Hb 3,1 mmol/L): pH 7,30 / HCO₃ 18 → 0,9287 × (18 − 24,4 + 14,83 × (−0,10)) = −7,32', () => {
    expect(G({ ph: 7.30, hco3: 18, paco2: 38 }).d.sbe).toBeCloseTo(-7.321, 2);
  });
  it('AG corrigido (Figge 1998, PMID 9824071: +2,5 por g/dL de albumina abaixo de 4,0): AG 20 com Alb 2,0 → 25', () => {
    const e = G({ na: 140, cl: 100, hco3: 20, alb: 2.0 });
    expect(e.d.ag).toBeCloseTo(20, 6);
    expect(e.d.agc).toBeCloseTo(25, 6);
  });
  it('Stewart: SIDe (Figge 1992, PMID 1431499) e BE parcionado (Story 2004, PMID 14665553: Na − Cl − 38; 0,25 × (42 − Alb g/L))', () => {
    const e = G({ ph: 7.40, hco3: 24, paco2: 40, na: 140, k: 4, cl: 100, alb: 4.2, phos: 3.1, lac: 1 });
    // SIDe = 24 + 42 × (0,123 × 7,4 − 0,631) + 1,0 × (0,309 × 7,4 − 0,469) = 37,54
    expect(e.d.side).toBeCloseTo(24 + 42 * (0.123 * 7.4 - 0.631) + (0.309 * 7.4 - 0.469), 6);
    expect(e.d.bep?.naCl).toBeCloseTo(2, 6);
    expect(e.d.bep?.alb).toBeCloseTo(0, 6);
    expect(e.d.bep?.lac).toBeCloseTo(0, 6);
  });
  it('osmolaridade (Worthley 1987, PMID 3605570; Berend 2014, PMID 25295502): 2 × 140 + 90/18 + 30/6 = 290; gap 15 alerta, gap 10 não', () => {
    const e = G({ na: 140, glic: 90, ureia: 30, osmMed: 305 });
    expect(num(gfind(e, 'osm'))).toBeCloseTo(290, 6);
    expect(num(gfind(e, 'osmgap'))).toBeCloseTo(15, 6);
    expect(gfind(e, 'osmgap').fl).toBe('crit');
    expect(gfind(G({ na: 140, glic: 90, ureia: 30, osmMed: 300 }), 'osmgap').fl).toBe('ok');
  });
  it('Na corrigido (Katz 1973, PMID 4763428: 1,6; Hillier 1999, PMID 10225241: 2,4): Na 130 / glicemia 500 → Hillier 139,6 · Katz 136,4', () => {
    const nc = gfind(G({ na: 130, glic: 500 }), 'nacorr');
    expect(num(nc)).toBeCloseTo(139.6, 6);
    expect(nc.n).toContain('Hillier 140');
    expect(nc.n).toContain('Katz 136');
  });
  it('déficit de água livre (Adrogué & Madias, NEJM 2000, PMID 10816188): homem 40 a, 70 kg, Na 160 → 42 × (160/140 − 1) = 6,0 L; mulher ≥ 65 a usa 0,45', () => {
    expect(num(gfind(G({ na: 160, weight: 70, age: 40, sex: 'M' }), 'fwd'))).toBeCloseTo(6, 3);
    expect(num(gfind(G({ na: 160, weight: 70, age: 70, sex: 'F' }), 'fwd'))).toBeCloseTo(70 * 0.45 * (160 / 140 - 1), 6);
  });
  it('ROX (Roca, AJRCCM 2019, PMID 30576221): 5 → menor risco; 4 → zona intermediária; 3 → alto risco (corte de 12 h, 3,85)', () => {
    const rox = (spo2: number, fio2: number, fr: number) => gfind(G({ sup: 'CNAF', spo2, fio2, fr }), 'rox');
    expect(num(rox(90, 60, 30))).toBeCloseTo(5, 6);
    expect(rox(90, 60, 30).fl).toBe('ok');
    expect(rox(90, 75, 30).fl).toBe('warn');
    expect(rox(90, 100, 30).fl).toBe('crit');
    expect(rox(90, 100, 30).n).toContain('alto risco');
  });
  it('SDRA não intubada (Matthay 2024): CNAF com P/F ≤ 300 aciona o critério não intubado', () => {
    expect(dxText(G({ sup: 'CNAF', pao2: 60, fio2: 40 }))).toContain('não intubada');
  });
  it('REF: todo item auditado nesta parte tem PMID gravado na fonte', () => {
    const ids = ['primary', 'winter', 'malk', 'racomp', 'ralkcomp', 'hh', 'ag', 'agc', 'dr', 'sbe', 'sida', 'side', 'sig', 'bepart', 'osm', 'osmgap', 'nacorr', 'fwd', 'pf', 'sf', 'aa', 'oi', 'ards', 'rox'];
    expect(ids.filter((id) => !/PMID \d{5,8}/.test(engine.REF[id].s)).join(',') || 'ok').toBe('ok');
  });
});
