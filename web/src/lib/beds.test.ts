/* 15. Leitos — ficha, registros e integração com as calculadoras (portado de tests/tests.js; valores conferidos à mão) */
import { describe, it, expect, beforeAll } from 'vitest';
import { C } from '@/lib/calc';
import {
  P, demoOf, merged, calc, isEmpty, prevOf, sorted, avulso, setAvulso, gasCfg, setGasCfg, getV, setV, type BedPatient, type GasRecord, type GasResult,
  dt, hm, ago, dUti, unitOf, toDisp, numTxt, keyDisp, normOf, outOf, ageSex, hasAlergia, strip, davenport, bedSort, lastInfo, today, pfCalc, readNum, nextTipo,
  parseField, rawOf, phMask, inFlag, scanTarget, scanDefaults, scanProgress, arrow, delta, restDx, cleanupEmpty, adoptAvulso, vtKg, limOf, extraFilled, mainText,
} from './beds';

const gfind = (res: GasResult, id: string) => Object.values(res.ch).flat().find((i) => i.id === id) || ({} as { v?: unknown });

describe('15. Leitos — ficha, registros e integração com as calculadoras', () => {
  let pl: BedPatient;
  beforeAll(() => {
    C.Vault.temporary();
    C.store.set('patients', []);
    pl = P.add('leito', '07');
    pl.data = { peso: '72,5', idade: '68', sexo: 'M', altura: '172', crBase: '1,1', pamAlvo: '75' };
    pl.ficha = { ini: 'jsm', com: ['DPOC'] };
    P.touch(pl);
  });
  it('Nome com leito + iniciais da ficha', () => expect(P.name(P.get(pl.id))).toBe('Leito 07 · JSM'));
  it('Ficha → motor: peso "72,5" vira 72,5', () => expect(demoOf(P.get(pl.id)).weight).toBe(72.5));
  it('Ficha → motor: PAM alvo e comorbidades', () => { const dm = demoOf(P.get(pl.id)); expect(`${dm.pamAlvo} ${dm.com.join(',')}`).toBe('75 DPOC'); });
  it('Tendência: clearance de lactato pelo registro anterior (4 → 3 em 2 h) = 25 %', () => {
    pl.records = [{ id: 'a', ts: Date.now() - 2 * 3600e3, i: { ph: 7.29, paco2: 60, hco3: 28, lac: 4 } }, { id: 'b', ts: Date.now(), i: { ph: 7.31, paco2: 58, hco3: 28, lac: 3, cr: 2.4 } }];
    P.touch(pl);
    const rb = calc(P.get(pl.id), P.get(pl.id)!.records![1]);
    expect(Math.abs((gfind(rb, 'laccl').v as number) - 25)).toBeLessThan(0.001);
  });
  it('Cr basal da ficha entra no KDIGO (2,4 / 1,1 = 2,2× → estágio 2)', () => {
    const rb = calc(P.get(pl.id), P.get(pl.id)!.records![1]);
    expect(gfind(rb, 'kdigo').v).toBe('Estágio 2');
  });
  it('DPOC da ficha gera nota na acidose respiratória', () => {
    const rb = calc(P.get(pl.id), P.get(pl.id)!.records![1]);
    expect(rb.dx.map((x) => x.t).join(' ')).toContain('DPOC');
  });
});

describe('Leitos — dados do paciente e registros (bordas)', () => {
  const p = (over: Partial<BedPatient> = {}): BedPatient => ({ id: 'x', tipo: 'leito', label: '3', data: {}, created: 0, updated: 0, ...over });
  it('demoOf ignora sexo inválido, texto não numérico e campos vazios', () => {
    const d = demoOf(p({ data: { sexo: 'X', idade: 'abc', peso: '', altura: '160' } }));
    expect(d.sex).toBeUndefined(); expect(d.age).toBeUndefined(); expect(d.weight).toBeUndefined(); expect(d.height).toBe(160); expect(d.com).toEqual([]);
  });
  it('demoOf sem paciente lê o avulso dentro de 12 h e ignora o vencido', () => {
    C.store.set('patient', { v: { peso: '80' }, t: Date.now() });
    expect(demoOf(null).weight).toBe(80);
    C.store.set('patient', { v: { peso: '80' }, t: Date.now() - 13 * 3600e3 });
    expect(demoOf(null).weight).toBeUndefined();
    expect(avulso()).toEqual({});
  });
  it('setAvulso grava, apaga com vazio e renova o carimbo de 12 h', () => {
    C.store.del('patient');
    setAvulso('peso', '70'); setAvulso('idade', '40');
    expect(avulso()).toEqual({ peso: '70', idade: '40' });
    setAvulso('idade', '');
    expect(avulso()).toEqual({ peso: '70' });
    expect(C.store.get<{ t: number }>('patient', { t: 0 }).t).toBeGreaterThan(Date.now() - 1000);
  });
  it('merged: dados do paciente têm precedência sobre o registro', () => {
    const rec: GasRecord = { id: 'r', ts: 1, i: { ph: 7.4, weight: 50 } };
    const m = merged(p({ data: { peso: '70', sexo: 'F' } }), rec);
    expect(m.ph).toBe(7.4); expect(m.weight).toBe(70); expect(m.sex).toBe('F');
  });
  it('isEmpty ignora só o teste de fluido e a medida', () => {
    expect(isEmpty({ id: 'a', ts: 1, i: {} })).toBe(true);
    expect(isEmpty({ id: 'a', ts: 1, i: { ftest: 'plr', fMet: 'vti' } })).toBe(true);
    expect(isEmpty({ id: 'a', ts: 1, i: { ph: '' } })).toBe(true);
    expect(isEmpty({ id: 'a', ts: 1, i: { ph: 7.2 } })).toBe(false);
    expect(isEmpty({ id: 'a', ts: 1, i: { chkVc: false } })).toBe(false);
  });
  it('prevOf: o anterior não vazio mais recente, nunca um posterior; sem paciente → null', () => {
    const recs: GasRecord[] = [{ id: 'c', ts: 300, i: { ph: 7.3 } }, { id: 'a', ts: 100, i: { ph: 7.1 } }, { id: 'e', ts: 150, i: {} }, { id: 'b', ts: 200, i: { lac: 2 } }];
    const pt = p({ records: recs });
    expect(sorted(pt).map((r) => r.id)).toEqual(['a', 'e', 'b', 'c']);
    expect(prevOf(pt, recs[0])!.id).toBe('b');
    expect(prevOf(pt, recs[1])).toBeNull();
    expect(prevOf(null, recs[0])).toBeNull();
  });
  it('getV/setV: demográficos vão para p.data como texto pt-BR; os demais para rec.i; vazio apaga', () => {
    const pt = p({ data: {} });
    const rec: GasRecord = { id: 'r', ts: 1, i: {} };
    setV(pt, rec, 'weight', 72.5);
    expect(pt.data.peso).toBe('72,5'); expect(getV(pt, rec, 'weight')).toBe(72.5);
    setV(pt, rec, 'sex', 'F'); expect(pt.data.sexo).toBe('F'); expect(getV(pt, rec, 'sex')).toBe('F');
    setV(pt, rec, 'sex', ''); expect(pt.data.sexo).toBeUndefined();
    setV(pt, rec, 'ph', 7.31); expect(rec.i.ph).toBe(7.31);
    setV(pt, rec, 'ph', undefined); expect('ph' in rec.i).toBe(false);
    expect(getV(pt, rec, 'sex')).toBeUndefined();
  });
  it('setV: a creatinina do registro mais recente vira a Cr atual do paciente, um registro antigo não', () => {
    const old: GasRecord = { id: 'o', ts: 100, i: {} }, nw: GasRecord = { id: 'n', ts: 200, i: { cr: 1.8 } };
    const pt = p({ data: {}, records: [old, nw] });
    setV(pt, old, 'cr', 0.9);
    expect(pt.data.cr).toBeUndefined();
    setV(pt, nw, 'cr', 2.1);
    expect(pt.data.cr).toBe('2,1');
  });
  it('setV sem paciente grava o demográfico no avulso', () => {
    C.store.del('patient');
    setV(null, { id: 'r', ts: 1, i: {} }, 'age', 61);
    expect(avulso().idade).toBe('61');
  });
  it('cleanupEmpty remove só o registro vazio que ainda está na lista', () => {
    const e: GasRecord = { id: 'e', ts: 1, i: {} }, f: GasRecord = { id: 'f', ts: 2, i: { ph: 7.4 } };
    const pt = p({ records: [e, f] });
    cleanupEmpty(pt, f); expect(pt.records!.length).toBe(2);
    cleanupEmpty(pt, e); expect(pt.records!.map((r) => r.id)).toEqual(['f']);
  });
  it('adoptAvulso completa só o que o paciente não tem', () => {
    C.store.set('patient', { v: { peso: '80', idade: '50' }, t: Date.now() });
    const dest = p({ data: { peso: '70' } });
    adoptAvulso(dest);
    expect(dest.data).toEqual({ peso: '70', idade: '50' });
  });
  it('gasCfg: padrão mmol/760/12; setGasCfg mescla', () => {
    C.store.del('gasCfg');
    expect(gasCfg()).toEqual({ lacUnit: 'mmol', patm: 760, agRef: 12 });
    setGasCfg({ lacUnit: 'mgdl' });
    expect(gasCfg()).toEqual({ lacUnit: 'mgdl', patm: 760, agRef: 12 });
    C.store.del('gasCfg');
  });
  it('calc com paciente sem registros anteriores: sem clearance; lactato 4 vira achado', () => {
    const rec: GasRecord = { id: 'r', ts: Date.now(), i: { ph: 7.3, paco2: 40, hco3: 19, lac: 4 } };
    const res = calc(p({ records: [rec] }), rec);
    expect(gfind(res, 'laccl').v).toBeUndefined();
    expect(res.key.lac).toBe(4);
    expect(res.worst).not.toBeNull();
  });
  it('lastInfo ignora registros vazios e dá o anterior calculado', () => {
    const pt = p({ records: [{ id: 'a', ts: 1, i: { ph: 7.2, paco2: 50, hco3: 20 } }, { id: 'v', ts: 3, i: {} }, { id: 'b', ts: 2, i: { ph: 7.3, paco2: 45, hco3: 22 } }] });
    const li = lastInfo(pt);
    expect(li.last!.id).toBe('b'); expect(li.rs.length).toBe(2); expect(li.res!.key.ph).toBe(7.3); expect(li.prev!.key.ph).toBe(7.2);
    expect(mainText(li.res)).toBe(li.res!.main!.t);
    expect(mainText(null)).toBe('sem achados');
  });
});

describe('Leitos — formatação', () => {
  it('dt e hm com zero à esquerda', () => {
    const ts = new Date(2026, 2, 5, 7, 4).getTime();
    expect(dt(ts)).toBe('05/03 07:04'); expect(hm(ts)).toBe('07:04');
  });
  it('ago: agora, minutos, horas até 48 h, depois dias', () => {
    const now = 1e12;
    expect(ago(now - 20e3, now)).toBe('agora');
    expect(ago(now - 5 * 60e3, now)).toBe('há 5 min');
    expect(ago(now - 90 * 60e3, now)).toBe('há 2 h');
    expect(ago(now - 47 * 3600e3, now)).toBe('há 47 h');
    expect(ago(now - 49 * 3600e3, now)).toBe('há 2 d');
  });
  it('dUti: dia da admissão = D1; sem admissão = null', () => {
    const pt: BedPatient = { id: 'x', tipo: 'leito', label: '1', data: {}, created: 0, updated: 0, ficha: { adm: today() } };
    expect(dUti(pt)).toBe(1);
    const d = new Date(); d.setDate(d.getDate() - 3);
    pt.ficha!.adm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(dUti(pt)).toBe(4);
    expect(dUti({ ...pt, ficha: {} })).toBeNull();
    expect(dUti(null)).toBeNull();
  });
  it('today no formato AAAA-MM-DD', () => expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  it('lactato em mg/dL: unidade, exibição ×9,01 e faixa normal convertida', () => {
    C.store.del('gasCfg');
    expect(unitOf('lac')).toBe('mmol/L'); expect(toDisp('lac', 2)).toBe(2); expect(keyDisp('lac', 2)).toBe(2); expect(limOf('lac')).toEqual([0.1, 30]);
    setGasCfg({ lacUnit: 'mgdl' });
    expect(unitOf('lac')).toBe('mg/dL'); expect(toDisp('lac', 2)).toBeCloseTo(18.02); expect(keyDisp('lac', 2)).toBeCloseTo(18.02); expect(keyDisp('lac', null)).toBeNull();
    expect(normOf('lac', [0.5, 2], null)).toEqual([0.5 * 9.01, 2 * 9.01]);
    expect(limOf('lac')).toEqual([0.9, 270.3]);
    expect(unitOf('ph')).toBe(''); expect(toDisp('ph', 7.4)).toBe(7.4); expect(unitOf('zzz')).toBe('');
    C.store.del('gasCfg');
  });
  it('normOf: PAM alvo da ficha substitui o 65', () => {
    const pt: BedPatient = { id: 'x', tipo: 'leito', label: '1', data: { pamAlvo: '75' }, created: 0, updated: 0 };
    expect(normOf('pam', [65, 100], pt)).toEqual([75, 100]);
    expect(normOf('pam', [65, 100], null)).toEqual([65, 100]);
    expect(normOf('ph', [7.35, 7.45], pt)).toEqual([7.35, 7.45]);
  });
  it('outOf, numTxt (vírgula e sinal de menos tipográfico)', () => {
    expect(outOf(7.3, [7.35, 7.45])).toBe(true); expect(outOf(7.4, [7.35, 7.45])).toBe(false); expect(outOf(null, [0, 1])).toBe(false);
    expect(numTxt(-2.5)).toBe('−2,5'); expect(numTxt(7.4)).toBe('7,4'); expect(numTxt(1.23456)).toBe('1,235');
  });
  it('ageSex e alergia (NEGA não conta como alergia)', () => {
    const pt: BedPatient = { id: 'x', tipo: 'leito', label: '1', data: { idade: '68', sexo: 'M', peso: '72,5' }, created: 0, updated: 0, ficha: { alerg: 'Nega' } };
    expect(ageSex(pt)).toBe('68 a · M · 72,5 kg');
    expect(ageSex({ ...pt, data: {} })).toBe('');
    expect(hasAlergia(pt)).toBe(false);
    expect(hasAlergia({ ...pt, ficha: { alerg: 'dipirona' } })).toBe(true);
    expect(hasAlergia({ ...pt, ficha: {} })).toBe(false);
    expect(hasAlergia(null)).toBe(false);
  });
  it('setas de variação respeitam meia unidade da última casa', () => {
    expect(arrow(7.31, 7.29, 2)).toBe('↑'); expect(arrow(7.31, 7.313, 2)).toBe(''); expect(arrow(3, 4, 1)).toBe('↓'); expect(arrow(3, null, 1)).toBe('');
    expect(delta(3, 4, 1)).toBe('▼1,0'); expect(delta(7.31, 7.29, 2)).toBe('▲0,02'); expect(delta(7.31, 7.313, 2)).toBeNull();
  });
  it('bedSort ordena numericamente pelo leito, depois iniciais, depois rótulo', () => {
    const mk = (tipo: 'leito' | 'ini' | 'atd', label: string, ficha?: { leito?: string }): BedPatient => ({ id: label, tipo, label, data: {}, created: 0, updated: 0, ficha });
    const list = [mk('leito', '12'), mk('leito', '2'), mk('ini', 'AB', { leito: '1' }), mk('atd', '999')];
    expect(list.slice().sort(bedSort).map((x) => x.id)).toEqual(['AB', '2', '12', '999']);
  });
});

describe('Leitos — tendência e Davenport (geometria)', () => {
  it('strip: ponto único fica na borda direita; faixa normal desenhada; sem pontos → null', () => {
    expect(strip([], [0, 1])).toBeNull();
    expect(strip([{ t: 1, v: null }], [0, 1])).toBeNull();
    const g = strip([{ t: 1, v: 7.4 }], [7.35, 7.45])!;
    expect(g.w).toBe(240); expect(g.h).toBe(40); expect(g.dots.length).toBe(1); expect(g.dots[0].x).toBe(232); expect(g.dots[0].last).toBe(true); expect(g.dots[0].out).toBe(false); expect(g.band).not.toBeNull();
  });
  it('strip: série plana ganha ±1 de folga; pontos fora da faixa marcados; último ponto maior', () => {
    const g = strip([{ t: 0, v: 5 }, { t: 10, v: 5 }], [5, 5])!;
    expect(g.dots[0].x).toBe(8); expect(g.dots[1].x).toBe(232); expect(g.dots[0].y).toBe(g.dots[1].y);
    const g2 = strip([{ t: 0, v: 7.2 }, { t: 10, v: 7.4 }, { t: 20, v: 7.5 }], [7.35, 7.45], true)!;
    expect(g2.w).toBe(320); expect(g2.h).toBe(110);
    expect(g2.dots.map((d) => d.out)).toEqual([true, false, true]);
    expect(g2.dots.map((d) => d.sw)).toEqual([5, 5, 9]);
    expect(g2.d.startsWith('M8.0,')).toBe(true);
    expect(g2.dots[0].y).toBeGreaterThan(g2.dots[2].y); /* valor maior fica mais alto (y menor) */
  });
  it('davenport: eixos e ponto, com pH e HCO3 limitados ao mapa', () => {
    const g = davenport(7.4, 24);
    expect(g.cx).toBeCloseTo(g.mx); expect(g.cy).toBeCloseTo(g.my);
    expect(g.xTicks.map((t) => t.label)).toEqual(['7,0', '7,2', '7,4', '7,6', '7,8']);
    expect(g.yTicks.map((t) => t.label)).toEqual(['0', '11', '22', '33', '44']);
    expect(g.label).toBe('Mapa ácido-base: pH 7,40, HCO3 24,0');
    const lo = davenport(6.5, -3), hi = davenport(8.2, 90);
    expect(lo.cx).toBeCloseTo(g.L); expect(lo.cy).toBeCloseTo(g.H - g.B); expect(hi.cx).toBeCloseTo(g.W - g.R); expect(hi.cy).toBeCloseTo(g.T);
  });
});

describe('Leitos — ficha (helpers)', () => {
  it('pfCalc: peso predito ARDSNet, Vt 6 mL/kg, ASC DuBois e IMC', () => {
    const bits = pfCalc(172, 72.5, 'M');
    expect(bits.map((b) => b[0])).toEqual(['Peso predito', 'Vt 6 mL/kg', 'ASC', 'IMC']);
    expect(bits[0][1]).toBe('67,8 kg'); /* 50 + 0,91 × 19,6 = 67,836 */
    expect(bits[1][1]).toBe('407 mL');
    expect(bits[2][1]).toBe('1,85 m²'); /* 0,007184 × 72,5^0,425 × 172^0,725 */
    expect(bits[3][1]).toBe('24,5');
    expect(pfCalc(160, 0, 'F')[0][1]).toBe('52,4 kg');
    expect(pfCalc(0, 70, 'M')).toEqual([]);
    expect(pfCalc(170, 70, '').map((b) => b[0])).toEqual(['ASC', 'IMC']);
  });
  it('readNum: vírgula decimal, fora do plausível = NaN', () => {
    expect(readNum('72,5', [20, 350])).toBe(72.5); expect(Number.isNaN(readNum('10', [20, 350]))).toBe(true); expect(Number.isNaN(readNum('abc'))).toBe(true); expect(readNum('1.1')).toBe(1.1);
  });
  it('nextTipo: novo paciente cai em leito > iniciais > atendimento; edição mantém o tipo se ainda houver valor', () => {
    expect(nextTipo(null, '12', 'JS', '')).toBe('leito'); expect(nextTipo(null, '', 'JS', '1')).toBe('ini'); expect(nextTipo(null, '', '', '1')).toBe('atd');
    expect(nextTipo('ini', '12', 'JS', '')).toBe('ini'); expect(nextTipo('ini', '12', '', '')).toBe('leito'); expect(nextTipo('atd', '', 'JS', '')).toBe('ini');
  });
  it('extraFilled detecta qualquer campo opcional preenchido', () => {
    expect(extraFilled({})).toBe(false); expect(extraFilled({ com: [] })).toBe(false); expect(extraFilled({ com: ['HAS'] })).toBe(true); expect(extraFilled({ iso: 'contato' })).toBe(true); expect(extraFilled({ obs: 'x' })).toBe(true);
  });
});

describe('Gasometria — entrada e leitura por foto (helpers)', () => {
  it('parseField: vírgula, lactato mg/dL → mmol/L, FiO2 fração → %', () => {
    C.store.del('gasCfg');
    expect(parseField('ph', '7,31')).toBe(7.31); expect(parseField('be', '−3')).toBe(-3); expect(parseField('ph', '')).toBeUndefined(); expect(parseField('ph', 'x')).toBeUndefined();
    expect(parseField('fio2', '0,4')).toBe(40); expect(parseField('fio2', '1')).toBe(100); expect(parseField('fio2', '40')).toBe(40);
    setGasCfg({ lacUnit: 'mgdl' });
    expect(parseField('lac', '18')).toBe(2); /* 18 / 9,01 = 1,998 → 2,00 */
    expect(rawOf('lac', 2)).toBe('18,02');
    C.store.del('gasCfg');
    expect(rawOf('lac', 2)).toBe('2'); expect(rawOf('ph', undefined)).toBe(''); expect(rawOf('be', -2.5)).toBe('-2,5');
  });
  it('máscara de pH: "7" vira "7," só no primeiro dígito', () => {
    expect(phMask('ph', '7')).toBe('7,'); expect(phMask('ph', '7,2')).toBe('7,2'); expect(phMask('paco2', '7')).toBe('7'); expect(phMask('ph', '')).toBe('');
  });
  it('inFlag: fora do plausível = bad, fora do normal = off', () => {
    expect(inFlag('ph', 6.5)).toBe('bad'); expect(inFlag('ph', 7.2)).toBe('off'); expect(inFlag('ph', 7.4)).toBe(''); expect(inFlag('fio2', 50)).toBe(''); expect(inFlag('fio2', 10)).toBe('bad');
  });
  it('vtKg usa o peso predito pelo sexo e altura', () => {
    expect(vtKg({ vt: 420, height: 172, sex: 'M' })).toBeCloseTo(420 / 67.836, 3);
    expect(vtKg({ vt: 420, height: 172 })).toBeNull();
  });
  it('scanTarget: venosa redireciona PCO2/PO2/SaO2 para os campos venosos', () => {
    expect(scanTarget('paco2', 'ven')).toBe('pvco2'); expect(scanTarget('pao2', 'ven')).toBe('pvo2'); expect(scanTarget('sao2', 'ven')).toBe('svo2');
    expect(scanTarget('lac', 'ven')).toBe('lac'); expect(scanTarget('paco2', 'art')).toBe('paco2');
  });
  it('scanDefaults: só os seguros; na venosa pH/HCO3/BE desmarcados e eletrólitos só se o campo estiver vazio', () => {
    const items = [{ fid: 'ph', sure: true }, { fid: 'paco2', sure: true }, { fid: 'na', sure: true }, { fid: 'k', sure: true }, { fid: 'lac', sure: false }];
    const cur = (fid: string) => (fid === 'na' ? 140 : undefined);
    expect(scanDefaults(items, 'art', cur)).toEqual({ ph: true, paco2: true, na: true, k: true, lac: false });
    expect(scanDefaults(items, 'ven', cur)).toEqual({ ph: false, paco2: true, na: false, k: true, lac: false });
  });
  it('scanProgress: 20 % até começar a ler, depois 25–100 %', () => {
    expect(scanProgress('scan', 0)).toBe(0); expect(scanProgress('loading tesseract core', 0.5)).toBe(10); expect(scanProgress('recognizing text', 0)).toBe(25); expect(scanProgress('recognizing text', 1)).toBe(100);
  });
  it('restDx separa a linha de compensação (ácido-base) e ordena por gravidade', () => {
    const res: GasResult = { d: {}, ch: {}, worst: 'crit', key: {}, main: { t: 'Acidose', s: 'warn', ch: 'ab', main: true }, dx: [{ t: 'Acidose', s: 'warn', ch: 'ab', main: true }, { t: 'compensada', s: 'ok', ch: 'ab' }, { t: 'K 6,5', s: 'crit', ch: 'renal' }, { t: 'lac', s: 'warn', ch: 'perf' }, { t: 'ok', s: 'ok', ch: 'o2' }] };
    const { compLine, rest } = restDx(res);
    expect(compLine!.t).toBe('compensada');
    expect(rest.map((x) => x.t)).toEqual(['K 6,5', 'lac', 'ok']);
    expect(restDx({ ...res, main: null }).compLine).toBeUndefined();
  });
});
