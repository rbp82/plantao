/* Porta o grupo 14 de ../tests/tests.js ("Calculadoras novas — fluido-responsividade, gap de CO₂, débito, ventilação")
   contra o motor C.engine através de runSection/runFluid, mais casos de borda das telas. */
import { describe, it, expect } from 'vitest';
import '@/lib/calc';
import { DEBITO, GAP_CO2, REF, VENTILACAO, defRefs, lbl, readNum, runFluid, runSection, testLabel, type OutItem } from './delta.calc';

const find = (items: OutItem[], id: string) => items.find((x) => x.id === id);

describe('14. fluido-responsividade (runFluid)', () => {
  it('PLR +13 % → Responsivo', () => {
    const m = runFluid({ ftest: 'plr', fBase: 15, fPost: 17 });
    expect(m.title).toBe('Responsivo');
    expect(m.cls).toBe('ok');
    expect(m.it?.v).toBeCloseTo(13.3333, 3);
    expect(m.kicker).toBe('PLR · 13,3%');
    expect(m.txt).toBe('Fluido-responsividade (PLR): Responsivo (13,3%). PLR: Δ 13,3 % (corte ≥ 10 %)');
  });
  it('VPP sem as condições marcadas → não interpretável', () => {
    const m = runFluid({ ftest: 'vpp', ppv: 16, chkVc: false, chkSinus: false, chkTorax: false, chkVt8: false });
    expect(m.title).toBe('Não interpretável');
    expect(m.cls).toBe('warn');
    expect(m.desc).toContain('Falta: VM controlada sem esforço · ritmo sinusal · tórax fechado · Vt ≥ 8 mL/kg → preferir PLR / EEO');
  });
  it('VPP com condições: 16 → responsivo; 11 → zona cinzenta; 5 → não responsivo (info)', () => {
    const chk = { chkVc: true, chkSinus: true, chkTorax: true, chkVt8: true };
    expect(runFluid({ ftest: 'vpp', ppv: 16, ...chk }).title).toBe('Responsivo');
    expect(runFluid({ ftest: 'vpp', ppv: 11, ...chk }).title).toBe('Zona cinzenta');
    const m = runFluid({ ftest: 'vpp', ppv: 5, ...chk });
    expect(m.title).toBe('Não responsivo');
    expect(m.cls).toBe('info');
  });
  it('VPP por PPmáx/PPmín: (60 − 50) / 55 = 18,2 %', () => {
    const m = runFluid({ ftest: 'vpp', ppMax: 60, ppMin: 50, chkVc: true, chkSinus: true, chkTorax: true, chkVt8: true });
    expect(m.it?.v).toBeCloseTo(18.1818, 3);
    expect(m.title).toBe('Responsivo');
  });
  it('VPP com Vt, altura e sexo: Vt 6 mL/kg invalida só pelo Vt → sugere tidal volume challenge', () => {
    const m = runFluid({ ftest: 'vpp', ppv: 16, chkVc: true, chkSinus: true, chkTorax: true, sex: 'M', height: 175, vt: 420 });
    expect(m.title).toBe('Não interpretável');
    expect(m.desc).toContain('Vt 6,0 mL/kg (< 8) → usar tidal volume challenge');
  });
  it('VPP com FC/FR ≤ 3,6 invalida', () => {
    const m = runFluid({ ftest: 'vpp', ppv: 16, chkVc: true, chkSinus: true, chkTorax: true, chkVt8: true, fc: 70, fr: 20 });
    expect(m.desc).toContain('FC/FR 3,5 (≤ 3,6)');
  });
  it('sem medidas → aguardando, listando o que falta', () => {
    const m = runFluid({ ftest: 'plr' });
    expect(m.cls).toBe('idle');
    expect(m.kicker).toBe('Aguardando');
    expect(m.desc).toBe('Faltam: Basal, Durante');
    expect(m.txt).toBe('');
  });
  it('sem teste escolhido → aguardando sem lista', () => {
    const m = runFluid({});
    expect(m.cls).toBe('idle');
    expect(m.desc).toBe('');
  });
  it('campos visíveis seguem o teste (fluidFields): EEO com VTI inclui Pós-EIO', () => {
    expect([...runFluid({ ftest: 'eeo', fMet: 'mon' }).show]).toEqual(['fMet', 'fBase', 'fPost']);
    expect([...runFluid({ ftest: 'eeo', fMet: 'vti' }).show]).toEqual(['fMet', 'fBase', 'fPost', 'fEio']);
    expect([...runFluid({ ftest: 'vpp' }).show]).toEqual(['ppv', 'ppMax', 'ppMin', 'chkVc', 'chkSinus', 'chkTorax', 'chkVt8']);
  });
  it('EEO monitor: Δ 6 % ≥ 5 → responsivo; EEO eco: |ΔEEO| + |ΔEIO| 10 + 4 = 14 ≥ 13', () => {
    expect(runFluid({ ftest: 'eeo', fMet: 'mon', fBase: 5, fPost: 5.3 }).title).toBe('Responsivo');
    const m = runFluid({ ftest: 'eeo', fMet: 'vti', fBase: 20, fPost: 22, fEio: 19.2 });
    expect(m.title).toBe('Responsivo');
    expect(m.desc).toBe('|ΔEEO| 10,0 + |ΔEIO| 4,0 = 14,0 % (corte ≥ 13 %)');
  });
  it('mini-bolus: monitor corte 5 %, VTI corte 10 %', () => {
    expect(runFluid({ ftest: 'mfc', fMet: 'mon', fBase: 5, fPost: 5.3 }).title).toBe('Responsivo');
    expect(runFluid({ ftest: 'mfc', fMet: 'vti', fBase: 20, fPost: 21.2 }).title).toBe('Não responsivo');
  });
  it('VCI assume VM: distensibilidade (2,4 − 1,8)/1,8 = 33,3 % > 18 → responsivo', () => {
    const m = runFluid({ ftest: 'vci', vciMax: 2.4, vciMin: 1.8 });
    expect(m.title).toBe('Responsivo');
    expect(m.it?.v).toBeCloseTo(33.3333, 3);
    expect(m.desc).toContain('Distensibilidade 33,3 % (VM; corte > 18 %)');
  });
  it('VtC: ΔVPP 12 − 8 = 4 pontos ≥ 3,5 → responsivo, unidade " pts"', () => {
    const m = runFluid({ ftest: 'vtc', ppv6: 8, ppv8: 12 });
    expect(m.title).toBe('Responsivo');
    expect(m.kicker).toBe('VtC · 4,0 pts');
    expect(runFluid({ ftest: 'vtc', ppv6: 8, ppv8: 11 }).title).toBe('Não responsivo');
  });
  it('rótulo do teste vem de F.ftest.opts', () => {
    expect(testLabel('mfc')).toBe('Mini-bolus');
    expect(testLabel('plr')).toBe('PLR');
  });
});

describe('14. gap de CO₂ e perfusão (runSection GAP_CO2)', () => {
  it('PaCO2 40 · PvCO2 48 · ScvO2 74 → gap 8,0 mmHg', () => {
    const m = runSection(GAP_CO2, { paco2: 40, pvco2: 48, svo2: 74 });
    const gap = find(m.sections[0].got, 'gap')!;
    expect(gap.v).toBeCloseTo(8, 9);
    expect(gap.dec).toBe(1);
    expect(gap.fl).toBe('warn');
    expect(gap.n).toBe('fluxo provavelmente insuficiente');
  });
  it('ScvO₂ normal com gap alto → interpretação de fluxo insuficiente', () => {
    const m = runSection(GAP_CO2, { paco2: 40, pvco2: 48, svo2: 74 });
    expect(m.dx.map((x) => x.t).join(' ')).toContain('fluxo provavelmente insuficiente');
    expect(m.dx.every((x) => x.ch === 'perf')).toBe(true);
  });
  it('resumo para prontuário no formato do antigo', () => {
    const m = runSection(GAP_CO2, { paco2: 40, pvco2: 48, svo2: 74 });
    expect(m.txt).toBe('Perfusão tecidual: Gap de CO2 (Pv−aCO2): 8,0 mmHg (fluxo provavelmente insuficiente); ScvO2: 74 %. ScvO2 normal com gap 8,0 mmHg: fluxo provavelmente insuficiente (pior prognóstico se persistir).');
  });
  it('sem dados: dica dos campos que faltam, prévia "opcional" e resumo vazio', () => {
    const m = runSection(GAP_CO2, {});
    expect(m.sections[0].got).toEqual([]);
    expect(m.sections[0].need).toEqual(['pvco2', 'paco2', 'svo2']);
    expect(m.sections[0].need.map(lbl).join(', ')).toBe('PvCO2, PaCO2, ScvO2');
    expect(m.sections[1].preview).toBe('opcional');
    expect(m.sections[2].preview).toBe('opcional');
    expect(m.txt).toBe('');
    expect(m.dx).toEqual([]);
  });
  it('com resultado parcial a dica some (got não vazio)', () => {
    const m = runSection(GAP_CO2, { svo2: 74 });
    expect(m.sections[0].got.map((x) => x.id)).toEqual(['svo2']);
    expect(m.sections[0].need).toEqual([]);
  });
  it('seção opcional: razão ΔPCO₂/Ca−vO₂ e prévia com os dois primeiros resultados numéricos', () => {
    const m = runSection(GAP_CO2, { paco2: 40, pvco2: 48, svo2: 74, hb: 10, sao2: 98, pao2: 90, pvo2: 40 });
    const cao2 = 1.34 * 10 * 0.98 + 0.0031 * 90, cvo2 = 1.34 * 10 * 0.74 + 0.0031 * 40;
    const ratio = find(m.sections[1].got, 'gapratio')!;
    expect(ratio.v).toBeCloseTo(8 / (cao2 - cvo2), 6);
    expect(ratio.fl).toBe('warn');
    expect(m.sections[1].preview).toBe(`Pv−aCO2 / Ca−vO2 ${(8 / (cao2 - cvo2)).toFixed(2).replace('.', ',')} · Extração de O2 25`);
    expect(m.dx.some((x) => x.t.includes('fluxo provavelmente insuficiente'))).toBe(true);
  });
  it('lactato 4,5 → grave, com interpretação de metabolismo anaeróbio quando razão > 1,4', () => {
    const m = runSection(GAP_CO2, { paco2: 40, pvco2: 48, svo2: 74, hb: 10, sao2: 98, pao2: 90, pvo2: 40, lac: 4.5 });
    const lac = find(m.sections[2].got, 'lac')!;
    expect(lac.fl).toBe('crit');
    expect(m.sections[2].preview).toBe('Lactato 4,5');
    expect(m.dx.some((x) => x.t.includes('metabolismo anaeróbio provável'))).toBe(true);
  });
  it('referências: 7 entradas únicas, gap verificado', () => {
    const refs = defRefs(GAP_CO2);
    expect(refs.length).toBe(7);
    expect(refs[0]).toBe(REF.gap);
    expect(refs[0].v).toBe(true);
  });
});

describe('14. débito cardíaco (runSection DEBITO)', () => {
  it('Ø VSVE 2 · VTI 20 · FC 80 → DC por VTI = 5,03 L/min', () => {
    const m = runSection(DEBITO, { dvsve: 2, vti: 20, fc: 80 });
    const dc = find(m.sections[1].got, 'dcvti')!;
    expect(dc.v).toBeCloseTo(Math.PI * 1 * 20 * 80 / 1000, 9);
    expect(dc.dec).toBe(2);
    expect(dc.n).toBe('VS 63 mL · VTI 20,0 cm');
    expect(m.txt.startsWith('Débito cardíaco: DC (VTI): 5,03 L/min')).toBe(true);
  });
  it('sem peso/altura o IC não aparece e a dica não cita o peso (fora dos campos da tela)', () => {
    const m = runSection(DEBITO, { dvsve: 2, vti: 20, fc: 80 });
    expect(find(m.sections[1].got, 'ci')).toBeUndefined();
    expect(m.sections[1].need).toEqual([]);
    expect(m.sections[2].need).not.toContain('weight');
    expect(m.sections[2].need).toContain('hb');
  });
  it('com peso (faixa do paciente) e altura: IC = DC / ASC (DuBois)', () => {
    const m = runSection(DEBITO, { sex: 'M', age: 60, height: 175, weight: 80, dvsve: 2, vti: 20, fc: 80 });
    const asc = 0.007184 * Math.pow(80, 0.425) * Math.pow(175, 0.725);
    const ci = find(m.sections[1].got, 'ci')!;
    expect(ci.v).toBeCloseTo((Math.PI * 20 * 80 / 1000) / asc, 6);
    expect(ci.l).toBe('Índice cardíaco · VTI');
    expect(ci.fl).toBe('ok');
  });
  it('VTI < 15 marca baixo débito; IC < 2,2 vira interpretação no canal hemo', () => {
    const m = runSection(DEBITO, { sex: 'M', age: 60, height: 175, weight: 80, dvsve: 2, vti: 12, fc: 70 });
    expect(find(m.sections[1].got, 'dcvti')!.fl).toBe('warn');
    expect(m.dx.some((x) => x.t.startsWith('IC ') && x.t.includes('baixo débito'))).toBe(true);
  });
  it('resistências com DC medido: RVS = 80 × (PAM − PVC) / DC; CPO = PAM × DC / 451', () => {
    const m = runSection(DEBITO, { dcMed: 5, pam: 70, pvc: 10, papm: 25, poap: 12 });
    expect(find(m.sections[3].got, 'rvs')!.v).toBeCloseTo(80 * 60 / 5, 9);
    expect(find(m.sections[3].got, 'rvp')!.v).toBeCloseTo(80 * 13 / 5, 9);
    expect(find(m.sections[3].got, 'cpo')!.v).toBeCloseTo(70 * 5 / 451, 9);
    expect(m.sections[3].preview).toBe('RVS 960 · RVP 208');
  });
});

describe('14. mecânica ventilatória (runSection VENTILACAO)', () => {
  const base = { sex: 'M', height: 175, vt: 420, peep: 10, pplat: 28 };
  it('homem 175 cm → peso predito 70,6 kg', () => {
    const m = runSection(VENTILACAO, base);
    const pbw = find(m.sections[0].got, 'pbw')!;
    expect(pbw.v).toBeCloseTo(50 + 0.91 * (175 - 152.4), 9);
    expect(pbw.dec).toBe(1);
    expect(pbw.n).toBe('Vt 6 mL/kg = 423 mL · 8 mL/kg = 565 mL');
  });
  it('driving pressure 18 → alerta (> 15)', () => {
    const m = runSection(VENTILACAO, base);
    expect(find(m.sections[1].got, 'dp')!.v).toBe(18);
    expect(find(m.sections[1].got, 'dp')!.fl).toBe('crit');
    expect(m.dx.map((x) => x.t).join(' ')).toContain('Driving pressure 18');
    expect(m.txt).toContain('Driving pressure: 18 cmH2O');
  });
  it('Vt/PBW 6,0 mL/kg ok; complacência 420/18 = 23,3 → baixa', () => {
    const m = runSection(VENTILACAO, base);
    expect(find(m.sections[1].got, 'vtkg')!.fl).toBe('ok');
    expect(find(m.sections[1].got, 'cst')!.v).toBeCloseTo(420 / 18, 9);
    expect(find(m.sections[1].got, 'cst')!.fl).toBe('warn');
  });
  it('Vt 9 mL/kg → crítico com interpretação', () => {
    const m = runSection(VENTILACAO, { ...base, vt: 640 });
    expect(find(m.sections[1].got, 'vtkg')!.fl).toBe('crit');
    expect(m.dx.some((x) => x.t.includes('mL/kg PBW (> 8)'))).toBe(true);
  });
  it('mechanical power e resistência com Ppico/FR/fluxo', () => {
    const m = runSection(VENTILACAO, { ...base, ppico: 36, fr: 20, fluxo: 60 });
    expect(find(m.sections[1].got, 'mp')!.v).toBeCloseTo(0.098 * 20 * 0.42 * (36 - 9), 9);
    expect(find(m.sections[2].got, 'raw')!.v).toBeCloseTo((36 - 28) / 1, 9);
    expect(m.sections[2].preview).toBe('Resistência 8,0');
  });
  it('ventilatory ratio usa VE informado ou Vt × FR', () => {
    const m = runSection(VENTILACAO, { ...base, fr: 20, paco2: 50 });
    const pbw = 50 + 0.91 * (175 - 152.4);
    expect(find(m.sections[3].got, 'vr')!.v).toBeCloseTo((8.4 * 1000 * 50) / (pbw * 100 * 37.5), 6);
  });
  it('ROX (preset CNAF): SpO2 95 · FiO2 50 · FR 20 → 9,5, menor risco', () => {
    const m = runSection(VENTILACAO, { fr: 20, spo2: 95, fio2: 50 });
    const rox = find(m.sections[4].got, 'rox')!;
    expect(rox.v).toBeCloseTo(9.5, 9);
    expect(rox.fl).toBe('ok');
    expect(rox.n).toBe('menor risco de intubação');
  });
  it('sem sexo/altura: dica "Para calcular: Altura, Sexo"', () => {
    const m = runSection(VENTILACAO, {});
    expect(m.sections[0].need.map(lbl).join(', ')).toBe('Altura, Sexo');
    expect(m.txt).toBe('');
  });
});

describe('leitura dos campos (como C.read do antigo)', () => {
  it('parse pt-BR e fora do plausível vira ausente', () => {
    expect(readNum('7,5', [0, 10])).toBe(7.5);
    expect(Number.isNaN(readNum('12', [0, 10]))).toBe(true);
    expect(Number.isNaN(readNum('', [0, 10]))).toBe(true);
    expect(Number.isNaN(readNum('abc'))).toBe(true);
  });
});
