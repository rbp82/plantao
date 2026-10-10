import { describe, it, expect } from 'vitest';
import { C, fmt } from '@/lib/calc';
import { atbDose, CLS, computeAtb, computeRenal, DB, NORMAL, stage } from './atb.calc';

const D = (n: string, cl: number) => atbDose(n, cl).dose;
const PT = { age: 65, cr: 1.4, wt: 70, ht: 170, sex: 'M' as const };

describe('ajuste renal — tela (grupo 10)', () => {
  it('Tela: Cockcroft-Gault 49,1 mL/min', () => {
    const r = computeRenal(PT);
    expect(fmt(r.cg, 1)).toBe('49,1');
    expect(r.w.label).toContain('peso ideal 65,9 kg');
    expect(r.sCg).toEqual(['warn', 'G3a · leve-moderada']);
  });
  it('Tela: CKD-EPI 55,8', () => {
    const r = computeRenal(PT);
    expect(fmt(r.ckd, 1)).toBe('55,8');
    expect(r.sCk).toEqual(['warn', 'G3a · leve-moderada']);
    expect(r.diverg).toBe('');
  });
  it('Tela: meropenem com ClCr 49,1 → 12/12 h', () => {
    const m = computeAtb({ ...PT, basis: 'cg', selected: ['Meropenem'] });
    expect(m.state).toBe('ok');
    expect(m.cards[0].dose).toContain('1–2 g IV 12/12 h');
    expect(m.cards[0]).toMatchObject({ name: 'Meropenem', cls: 'warn', badge: 'Ajuste leve', normal: '1–2 g IV 8/8 h' });
  });
  it('resumo com função renal e doses (base Cockcroft-Gault)', () => {
    const m = computeAtb({ ...PT, basis: 'cg', selected: ['Meropenem', 'Vancomicina'] });
    expect(m.summary).toBe('Função renal (65 anos, masc., 70 kg, Cr 1,40): Cockcroft-Gault 49,1 mL/min (peso ideal 65,9 kg); CKD-EPI 2021 55,8 mL/min/1,73m². Ajuste por Cockcroft-Gault:\nMeropenem: 1–2 g IV 12/12 h (dose plena)\nVancomicina: Ataque 20–35 mg/kg; 15 mg/kg IV 12–24 h, ajustada por AUC/nível.');
  });
  it('cartões seguem a ordem das classes, não a ordem de seleção', () => {
    const m = computeAtb({ ...PT, basis: 'cg', selected: ['Vancomicina', 'Cefepime'] });
    expect(m.cards.map((c) => c.name)).toEqual(['Cefepime', 'Vancomicina']);
  });
  it('base CKD-EPI usa 55,8 → meropenem 8/8 h; sem peso cai para CKD-EPI (CG indisponível)', () => {
    const ckd = computeAtb({ ...PT, basis: 'ckd', selected: ['Meropenem'] });
    expect(ckd.basisLbl).toBe('CKD-EPI');
    expect(ckd.cards[0].dose).toBe('1–2 g IV 8/8 h');
    const semPeso = computeAtb({ ...PT, wt: NaN, basis: 'cg', selected: ['Meropenem'] });
    expect(Number.isNaN(semPeso.cg)).toBe(true);
    expect(semPeso.basisLbl).toBe('CKD-EPI (CG indisponível)');
    expect(semPeso.summary).toContain('Cockcroft-Gault — mL/min');
  });
  it('sem seleção: estado none; sem dados: missing', () => {
    expect(computeAtb({ ...PT, basis: 'cg', selected: [] })).toMatchObject({ state: 'none', summary: '' });
    expect(computeAtb({ age: NaN, cr: NaN, wt: NaN, ht: NaN, sex: '', basis: 'cg', selected: ['Meropenem'] })).toMatchObject({ state: 'missing', summary: '' });
  });
  it('divergência > 20 mL/min entre as fórmulas gera nota', () => {
    // obeso: CG com peso ajustado sobe muito em relação ao CKD-EPI
    const r = computeRenal({ age: 50, cr: 1, wt: 130, ht: 180, sex: 'M' });
    expect(r.cg).toBeCloseTo(121.24, 1);
    expect(r.diverg).toContain('Divergência de');
  });
  it('estadiamento KDIGO', () => {
    expect(stage(90)).toEqual(['ok', 'G1 · normal']);
    expect(stage(60)).toEqual(['ok', 'G2 · redução leve']);
    expect(stage(45)).toEqual(['warn', 'G3a · leve-moderada']);
    expect(stage(30)).toEqual(['warn', 'G3b · moderada']);
    expect(stage(15)).toEqual(['crit', 'G4 · grave']);
    expect(stage(14.9)).toEqual(['crit', 'G5 · falência renal']);
    expect(stage(NaN)).toEqual(['', '—']);
  });
  it('a tabela cobre todas as drogas das classes, com dose habitual', () => {
    Object.values(CLS).forEach(([, ds]) => ds.forEach((d) => { expect(DB[d]).toBeDefined(); expect(NORMAL[d]).toBeTruthy(); }));
    Object.keys(DB).forEach((d) => expect(DB[d][DB[d].length - 1][1]).toBe(0));
  });
});

describe('ajuste renal — limites das faixas (grupo 10)', () => {
  /* limites conferidos nas bulas FDA/SPC: '>' estrito vs '≥' */
  it('Meropenem ClCr 50,1 → 8/8 h', () => expect(D('Meropenem', 50.1)).toContain('8/8 h'));
  it('Meropenem ClCr 50 → 12/12 h (bula: 26–50)', () => expect(D('Meropenem', 50)).toContain('1–2 g IV 12/12 h'));
  it('Meropenem ClCr 25,9 → metade da dose 12/12 h', () => expect(D('Meropenem', 25.9)).toContain('0,5–1 g IV 12/12 h'));
  it('Meropenem ClCr 9,9 → metade da dose 24/24 h', () => expect(D('Meropenem', 9.9)).toContain('0,5–1 g IV 24/24 h'));
  it('Cefepime ClCr 60,1 → 2 g 8/8 h', () => expect(D('Cefepime', 60.1)).toContain('2 g IV 8/8 h'));
  it('Cefepime ClCr 60 → 2 g 12/12 h (bula: 30–60)', () => expect(D('Cefepime', 60)).toContain('2 g IV 12/12 h'));
  it('Cefepime ClCr 29,9 → 2 g 24/24 h', () => expect(D('Cefepime', 29.9)).toContain('2 g IV 24/24 h'));
  it('Cefepime ClCr 10,9 → 1 g 24/24 h', () => expect(D('Cefepime', 10.9)).toContain('1 g IV 24/24 h'));
  it('Ceftazidima-avibactam ClCr 50,1 → 2,5 g', () => expect(D('Ceftazidima-avibactam', 50.1)).toContain('2,5 g IV 8/8 h'));
  it('Ceftazidima-avibactam ClCr 50 → 1,25 g 8/8 h (bula: 31–50)', () => expect(D('Ceftazidima-avibactam', 50)).toContain('1,25 g IV 8/8 h'));
  it('Ceftazidima-avibactam ClCr 30 → 0,94 g 12/12 h (bula: 16–30)', () => expect(D('Ceftazidima-avibactam', 30)).toContain('0,94 g IV 12/12 h'));
  it('Ceftazidima-avibactam ClCr 15 → 0,94 g 24/24 h', () => expect(D('Ceftazidima-avibactam', 15)).toContain('0,94 g IV 24/24 h'));
  it('Ceftazidima-avibactam ClCr 5 → 0,94 g 48/48 h', () => expect(D('Ceftazidima-avibactam', 5)).toContain('0,94 g IV 48/48 h'));
  it('Ceftazidima ClCr 31 → 1 g 12/12 h', () => expect(D('Ceftazidima', 31)).toContain('1 g IV 12/12 h'));
  it('Ceftazidima ClCr 30 → 1 g 24/24 h', () => expect(D('Ceftazidima', 30)).toContain('1 g IV 24/24 h'));
  it('Ceftazidima ClCr 5 → 500 mg 48/48 h', () => expect(D('Ceftazidima', 5)).toContain('500 mg IV 48/48 h'));
  it('Ertapenem ClCr 30 → 500 mg (bula: ≤ 30)', () => expect(D('Ertapenem', 30)).toContain('500 mg'));
  it('Ertapenem ClCr 30,1 → 1 g', () => expect(D('Ertapenem', 30.1)).toContain('1 g IV 24 h'));
  it('Imipenem ClCr 90 → 500 mg 6/6 h', () => expect(D('Imipenem', 90)).toContain('500 mg IV 6/6 h'));
  it('Imipenem ClCr 89,9 → 400 mg 6/6 h', () => expect(D('Imipenem', 89.9)).toContain('400 mg'));
  it('Imipenem ClCr 59,9 → 300 mg 6/6 h', () => expect(D('Imipenem', 59.9)).toContain('300 mg'));
  it('Imipenem ClCr 29,9 → 200 mg 6/6 h', () => expect(D('Imipenem', 29.9)).toContain('200 mg'));
  it('Imipenem ClCr 14,9 → não usar (salvo HD em 48 h)', () => expect(D('Imipenem', 14.9)).toContain('Não usar'));
  it('Pip-tazo ClCr 40,1 → 4,5 g 6/6 h', () => expect(D('Piperacilina-tazobactam', 40.1)).toContain('4,5 g IV 6/6 h'));
  it('Pip-tazo ClCr 40 → 3,375 g 6/6 h (bula: 20–40)', () => expect(D('Piperacilina-tazobactam', 40)).toContain('3,375 g'));
  it('Pip-tazo ClCr 19,9 → 2,25 g 6/6 h + 0,75 g pós-HD', () => expect(D('Piperacilina-tazobactam', 19.9)).toContain('0,75 g após cada hemodiálise'));
  it('Amp-sulbactam ClCr 14,9 → 24/24 h', () => expect(D('Ampicilina-sulbactam', 14.9)).toContain('24/24 h'));
  it('Amp-sulbactam ClCr 4 → sem recomendação em bula', () => expect(D('Ampicilina-sulbactam', 4)).toContain('sem recomendação'));
  it('Teicoplanina ClCr 80 → metade (SPC: 30–80)', () => expect(D('Teicoplanina', 80)).toContain('metade'));
  it('Teicoplanina ClCr 80,1 → sem ajuste', () => expect(D('Teicoplanina', 80.1)).toContain('400 mg IV 24 h'));
  it('Teicoplanina ClCr 29,9 → 1/3', () => expect(D('Teicoplanina', 29.9)).toContain('1/3'));
  it('Gentamicina ClCr 60 → 24/24 h (Hartford)', () => expect(D('Gentamicina', 60)).toContain('7 mg/kg IV 24/24 h'));
  it('Gentamicina ClCr 59,9 → 36/36 h', () => expect(D('Gentamicina', 59.9)).toContain('36/36 h'));
  it('Gentamicina ClCr 39,9 → 48/48 h', () => expect(D('Gentamicina', 39.9)).toContain('48/48 h'));
  it('Gentamicina ClCr 19,9 → Hartford não se aplica', () => expect(D('Gentamicina', 19.9)).toContain('não se aplica'));
  it('Fluconazol ClCr 50 → 50% (bula: ≤ 50)', () => expect(D('Fluconazol', 50)).toContain('50%'));
  it('Fluconazol ClCr 50,1 → dose plena', () => expect(D('Fluconazol', 50.1)).toContain('Dose plena'));
  it('SMX-TMP ClCr 30 → 50% (bula: 15–30)', () => expect(D('SMX-TMP', 30)).toContain('50%'));
  it('SMX-TMP ClCr 14,9 → não recomendado', () => expect(D('SMX-TMP', 14.9)).toContain('não recomendado'));
  it('Ciprofloxacino ClCr 30 → 200–400 mg 18–24 h', () => expect(D('Ciprofloxacino', 30)).toContain('18–24 h'));
  it('Ciprofloxacino ClCr 30,1 → 400 mg 8–12 h', () => expect(D('Ciprofloxacino', 30.1)).toContain('400 mg IV 8–12 h'));
  it('Levofloxacino ClCr 19,9 → 750 → 500 mg 48/48 h', () => expect(D('Levofloxacino', 19.9)).toContain('750 mg → 500 mg 48/48 h'));
  it('Daptomicina ClCr 29,9 → a cada 48 h', () => expect(D('Daptomicina', 29.9)).toContain('48 h'));
  it('Colistina ClCr 95 → 360 mg CBA/dia', () => expect(D('Colistina', 95)).toContain('360 mg CBA/dia'));
  it('Colistina ClCr 75 → 300 mg CBA/dia, 150 mg 12/12 h', () => expect(D('Colistina', 75)).toContain('150 mg CBA'));
  it('Colistina ClCr 55 → 245 mg CBA/dia', () => expect(D('Colistina', 55)).toContain('245 mg CBA/dia'));
  it('Colistina ClCr 4 → 130 mg CBA/dia', () => expect(D('Colistina', 4)).toContain('130 mg CBA/dia'));
  it('Colistina: MUI por dose arredondado a 2 casas (ClCr 75: 9 MUI/dia → 4,5 MUI 12/12 h)', () => {
    expect(D('Colistina', 75)).toContain('300 mg CBA/dia (9 MUI/dia) em 2 doses: 150 mg CBA (4,5 MUI) 12/12 h');
    expect(D('Colistina', 60)).toContain('275 mg CBA/dia (8,35 MUI/dia) em 2 doses: 137,5 mg CBA (4,18 MUI) 12/12 h');
  });
  it('atbDose devolve classe e rótulo; última faixa é o fallback (ClCr 0)', () => {
    expect(atbDose('Imipenem', 14.9)).toMatchObject({ cls: 'evitar', badge: 'Evitar' });
    expect(atbDose('Vancomicina', 50)).toMatchObject({ cls: 'monit', badge: 'Guiar por AUC' });
    expect(atbDose('Ceftriaxona', 0).badge).toBe('Sem ajuste');
    expect(atbDose('Meropenem', 0).badge).toBe('Ajuste grave');
  });
  it('motor renal do núcleo continua disponível (C.renal)', () => {
    expect(C.renal.cockcroft(65, 65.937, 1.4, 'M')).toBeCloseTo(49.06, 2);
  });
});
