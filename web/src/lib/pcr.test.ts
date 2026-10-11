/* 16. PCR guiada — algoritmo AHA 2025 caixa a caixa, temporizadores e relatório
   (portado de tests/tests.js, seção 16; Part 9, Figure 2; PESQUISA-ACLS.md). Valores esperados conferidos à mão. */
import { describe, it, expect } from 'vitest';
import { derive, guide, report, outcomeTxt, mmss, REF, HT, RITMO, PROTO, CITATIONS, isBusy, active, type PcrCase, type PcrEvent, type PcrEventType, type PcrInput } from './pcr';

const T0 = Date.UTC(2026, 9, 3, 12, 0, 0);
const at = (min: number) => T0 + min * 60000;

/* a bateria antiga monta um caso e vai acrescentando eventos; aqui o mesmo roteiro, em ordem */
function scenario() {
  const pc: PcrCase = { id: 't', start: T0, energia: 200, hts: {}, end: null, patientName: 'Leito 07', patientId: null, weight: null, events: [{ t: at(0), type: 'inicio', label: 'Início da RCP' }] };
  const ev = (min: number, type: PcrEventType, extra: Partial<PcrEvent> = {}) => pc.events.push({ t: at(min), type, label: type, ...extra });
  const gg = (min: number) => guide(pc, at(min));
  const gtxt = (min: number) => { const g = gg(min); return [g.now.txt, g.now.sub].concat(g.todo.map((x) => x.txt)).join(' | '); };
  return { pc, ev, gg, gtxt };
}

describe('16. PCR guiada — algoritmo AHA 2025 caixa a caixa, temporizadores e relatório', () => {
  const { pc, ev, gg, gtxt } = scenario();
  it('Caixa 1: iniciar RCP, BVM com O₂, monitor/desfibrilador', () => expect(gtxt(0.2)).toContain('Iniciar RCP'));
  it('FV identificada → caixa 3 (choque)', () => { ev(0.5, 'ritmo', { v: 'fv' }); expect(gg(0.5).now.box).toBe(3); });
  it('Antes do 1º choque: sem adrenalina', () => expect(gtxt(0.5)).not.toContain('Adrenalina'));
  it('Após o 1º choque → caixa 4', () => { ev(0.6, 'choque', { v: 200 }); expect(derive(pc, at(0.7)).box).toBe(4); });
  it('Caixa 4: RCP 2 min + acesso IV/IO', () => expect(gtxt(0.7)).toContain('acesso IV/IO'));
  it('Acesso: IV primeiro, IO se falhar', () => expect(gtxt(0.7)).toContain('Acesso IV (IO se o IV falhar)'));
  it('Caixa 4: ainda sem adrenalina', () => expect(gtxt(0.7)).not.toContain('Adrenalina 1 mg'));
  it('Ciclo de 2 min conta a partir do choque', () => expect(Math.round(derive(pc, at(1.6)).cycleLeft / 1000)).toBe(60));
  it('Fim do ciclo → checar ritmo e pulso (até 10 s)', () => expect(gtxt(2.7)).toContain('Checar ritmo e pulso'));
  it('FV na 2ª checagem → caixa 5', () => { ev(2.6, 'ritmo', { v: 'fv' }); expect(gg(2.6).now.box).toBe(5); });
  it('Após o 2º choque → caixa 6', () => { ev(2.7, 'choque', { v: 200 }); expect(derive(pc, at(2.8)).box).toBe(6); });
  it('Caixa 6: adrenalina 1 mg', () => expect(gtxt(2.8)).toContain('Adrenalina 1 mg IV/IO'));
  it('Caixa 6: considerar via aérea avançada e capnografia', () => expect(gtxt(2.8)).toContain('via aérea avançada'));
  it('Caixa 6: sem antiarrítmico', () => expect(gtxt(2.8)).not.toContain('Amiodarona'));
  it('Após o 3º choque → caixa 8', () => { ev(3.1, 'epi'); ev(4.7, 'ritmo', { v: 'fv' }); ev(4.8, 'choque', { v: 200 }); expect(derive(pc, at(5)).box).toBe(8); });
  it('Caixa 8: amiodarona 300 mg ou lidocaína 1–1,5 mg/kg', () => expect(gtxt(5)).toContain('Amiodarona 300 mg IV/IO ou lidocaína 1–1,5 mg/kg'));
  it('Caixa 8: tratar causas reversíveis', () => expect(gtxt(5)).toContain('causas reversíveis'));
  it('Caixa 8: adrenalina não é pedida (vem na caixa 6, a cada 2 ciclos)', () => expect(gtxt(6.2)).not.toContain('Adrenalina 1 mg'));
  it('Caixa 8 → losango → caixa 5 → caixa 6 (4º choque)', () => { ev(5, 'amio', { v: 300 }); ev(6.8, 'ritmo', { v: 'fv' }); ev(6.9, 'choque'); expect(derive(pc, at(7)).box).toBe(6); });
  it('Caixa 6 de novo: adrenalina há 3:54 (a cada 3–5 min)', () => expect(gtxt(7)).toContain('última há 03:54'));
  it('Adrenalina há ≥ 5 min: lembrete crítico', () => expect(gg(8.2).todo.find((x) => x.act === 'epi')?.sev).toBe('crit'));
  it('5º choque → 2ª passagem pela caixa 8', () => { ev(8.9, 'ritmo', { v: 'fv' }); ev(9, 'choque'); expect(derive(pc, at(9.1)).pass8).toBe(2); });
  it('2ª passagem pela caixa 8: amiodarona 150 mg (2ª dose)', () => expect(gtxt(9.1)).toContain('Amiodarona 150 mg'));
  it('Depois da 2ª dose: nenhum antiarrítmico adicional', () => { ev(9.2, 'amio', { v: 150 }); expect(gtxt(9.3)).not.toContain('Amiodarona'); });
  it('Não chocável após a caixa 8 → caixa 12 → caixa 10', () => { ev(11, 'ritmo', { v: 'assist' }); expect(derive(pc, at(11.1)).box).toBe(10); });
  it('Assistolia: não sugere choque', () => expect(gtxt(11.1)).not.toContain('Choque'));
  it('Caixa 10: adrenalina pendente (última há 8:00)', () => expect(gtxt(11.1)).toContain('última há 08:00'));
  it('Caixa 10 → caixa 11', () => { ev(11.2, 'epi'); ev(13, 'ritmo', { v: 'assist' }); expect(derive(pc, at(13.1)).box).toBe(11); });
  it('Caixa 11: tratar causas reversíveis', () => expect(gtxt(13.1)).toContain('tratar causas reversíveis'));
  it('Caixa 11: sem adrenalina', () => expect(gtxt(13.1)).not.toContain('Adrenalina 1 mg'));
  it('IOT → capnografia contínua', () => { ev(13.5, 'via', { v: 'iot' }); expect(gtxt(13.6)).toContain('Capnografia contínua'); });
  it('ETCO₂ 8 → reavaliar a qualidade da RCP', () => { ev(14, 'etco2', { v: 8 }); expect(gtxt(14.1)).toContain('reavaliar a qualidade'); });
  it('ETCO₂ sobe > 10 mmHg → pode indicar RCE', () => { ev(14.5, 'etco2', { v: 25 }); expect(gtxt(14.6)).toContain('pode indicar RCE'); });
  it('Caixa 11 → caixa 12 → caixa 10', () => { ev(15, 'ritmo', { v: 'assist' }); expect(derive(pc, at(15.1)).box).toBe(10); });
  it('Caixa 10: adrenalina de novo (a cada 2 ciclos)', () => expect(gtxt(15.1)).toContain('última há 03:54'));
  it('ETCO₂ ≤ 10 após 20 min intubado → componente de decisão multimodal', () => { ev(21, 'etco2', { v: 9 }); expect(gtxt(21.1)).toContain('decisão multimodal'); });
  it('RCE → cuidados pós-parada', () => { ev(22, 'ritmo', { v: 'rce' }); expect(gtxt(22.1)).toContain('pós-parada'); });
  it('Contagem: 5 choques, 2 adrenalinas, 2 amiodaronas', () => { const ds = derive(pc, at(22.5)); expect(`${ds.shocks} ${ds.epi.length} ${ds.amio}`).toBe('5 2 2'); });
  it('Ritmo inicial = FV', () => expect(derive(pc, at(22.5)).firstRhythm).toBe('fv'));
  it('AESP → FV: "Go to 5" → após o choque, caixa 6', () => {
    const pc2: PcrInput = { start: T0, hts: {}, events: [{ t: at(0), type: 'inicio' }, { t: at(0.5), type: 'ritmo', v: 'aesp' }, { t: at(0.6), type: 'epi' }, { t: at(2.6), type: 'ritmo', v: 'fv' }, { t: at(2.7), type: 'choque', v: 200 }] };
    expect(derive(pc2, at(2.8)).box).toBe(6);
  });
  it('Caixa 9: adrenalina o mais rápido possível', () =>
    expect(guide({ start: T0, hts: {}, events: [{ t: at(0), type: 'inicio' }, { t: at(0.5), type: 'ritmo', v: 'assist' }] }, at(0.6)).todo[0].txt).toBe('Adrenalina 1 mg IV/IO o mais rápido possível'));
  it('Sem energia definida, o 1º choque pede a energia do fabricante', () =>
    expect(guide({ start: T0, energia: null, hts: {}, events: [{ t: at(0), type: 'inicio' }, { t: at(0.5), type: 'ritmo', v: 'fv' }] }, at(0.6)).now.txt).toBe('Choque (energia do fabricante) e retomar a RCP imediatamente'));
  it('Toda orientação tem fonte com trecho literal e link', () => {
    const refsUsed = new Set<string>();
    [0.2, 0.7, 2.8, 5, 7, 9.1, 11.1, 13.1, 13.6, 14.1, 14.6, 21.1, 22.1].forEach((m) => { const g = gg(m); if (g.now.ref) refsUsed.add(g.now.ref); g.todo.forEach((t) => t.ref && refsUsed.add(t.ref)); });
    expect(refsUsed.size).toBeGreaterThan(0);
    const bad = [...refsUsed].filter((r) => !(REF[r] && REF[r].q && /^https:\/\/cpr\.heart\.org\//.test(REF[r].u)));
    expect(bad.join(',') || 'ok').toBe('ok');
  });
  describe('relatório', () => {
    const rpt = () => { pc.end = at(23); pc.outcome = 'rce'; pc.hts = { hipoxia: true }; return report(pc).text; };
    it('Relatório: duração 23:00', () => expect(rpt()).toContain('duração 23:00'));
    it('Relatório: choques', () => expect(rpt()).toContain('Choques: 5'));
    it('Relatório: adrenalina com os tempos', () => expect(rpt()).toContain('Adrenalina 1 mg: 2 dose(s) — 03:06, 11:12'));
    it('Relatório: causas consideradas', () => expect(rpt()).toContain('Hipóxia'));
    it('Relatório: desfecho com horário do RCE', () => expect(rpt()).toContain('RCE em 22:00'));
    it('Relatório: linha do tempo', () => expect(rpt()).toContain('22:00 · '));
    it('Relatório: cita a diretriz', () => expect(rpt()).toContain('AHA 2025'));
    it('Relatório: cita a publicação da Part 9 com PMID e DOI', () => expect(rpt()).toContain('Circulation 2025;152(16 Suppl 2):S538–S577; PMID 41122884; doi:10.1161/CIR.0000000000001376'));
  });
});

describe('PCR guiada — publicações das diretrizes (PubMed, 11/10/2026)', () => {
  it('AHA 2025 Part 9 (Wigginton) e 2020 Part 3 (Panchal) com PMID/DOI', () => {
    expect(CITATIONS.part9).toMatchObject({ pmid: '41122884', doi: '10.1161/CIR.0000000000001376' });
    expect(CITATIONS.aha2020).toMatchObject({ pmid: '33081529', doi: '10.1161/CIR.0000000000000916' });
    expect(CITATIONS.part7.pmid).toBe('41122888'); expect(CITATIONS.part10.pmid).toBe('41122889'); expect(CITATIONS.part11.pmid).toBe('41122894');
    Object.values(CITATIONS).forEach((c) => { expect(c.doi).toMatch(/^10\.1161\/CIR\.\d{16}$/); expect(c.pmid).toMatch(/^\d{8}$/); expect(c.j).toMatch(/^Circulation 20(20|25);/); });
  });
  it('doses e tempos do PROTO batem com a Part 9 de 2025: adrenalina 1 mg a cada 3–5 min, ciclo de 2 min, lidocaína 1–1,5 e 0,5–0,75 mg/kg', () => {
    expect(PROTO.epiMinMs / 60000).toBe(3); expect(PROTO.epiMaxMs / 60000).toBe(5); expect(PROTO.cicloMs / 60000).toBe(2);
    expect(PROTO.lido1).toEqual([1, 1.5]); expect(PROTO.lido2).toEqual([0.5, 0.75]);
    expect(REF.epi.q).toContain('1 milligram every 3 to 5 minutes');
    expect(REF.amio.q).toContain('First dose: 300 milligram bolus. Second dose: 150 milligram');
    expect(REF.amio.q).toContain('1 to 1.5 milligrams per kilogram. Second dose: 0.5 to 0.75 milligrams per kilogram');
    expect(REF.energia.q).toContain('120 to 200 Joules'); expect(REF.energia.q).toContain('Monophasic: 360 Joules');
    expect(REF.post.q).toContain('at least 65 mm Hg'); expect(REF.post.q).toContain('90% to 98%'); expect(REF.post.q).toContain('35–45 mm Hg'); expect(REF.post.q).toContain('32 °C and 37.5 °C');
  });
});

describe('PCR guiada — casos de borda', () => {
  const base = (events: PcrEvent[], over: Partial<PcrInput> = {}): PcrInput => ({ start: T0, hts: {}, energia: 200, events: [{ t: at(0), type: 'inicio', label: 'Início da RCP' }, ...events], ...over });

  it('mmss: zero, negativo e horas acumuladas', () => {
    expect(mmss(0)).toBe('00:00');
    expect(mmss(-5000)).toBe('00:00');
    expect(mmss(61000)).toBe('01:01');
    expect(mmss(3600000 + 5000)).toBe('60:05');
  });
  it('toda REF tem título, trecho literal e link em cpr.heart.org', () => {
    Object.values(REF).forEach((r) => { expect(r.t).toBeTruthy(); expect(r.q.length).toBeGreaterThan(10); expect(r.u).toMatch(/^https:\/\/cpr\.heart\.org\//); });
  });
  it('5 H e 5 T, ritmos com rótulo', () => {
    expect(HT).toHaveLength(10);
    expect(HT.map(([k]) => k)).toEqual(['hipovolemia', 'hipoxia', 'hidrogenio', 'hipohiperk', 'hipotermia', 'pneumotorax', 'tamponamento', 'toxinas', 'tep', 'iam']);
    expect(RITMO.fv).toBe('FV/TV sem pulso');
    expect(RITMO.rce).toBe('RCE (pulso presente)');
  });
  it('PROTO: ciclo 2 min, adrenalina 3–5 min, término 20 min', () => {
    expect(PROTO.cicloMs).toBe(120000); expect(PROTO.epiMinMs).toBe(180000); expect(PROTO.epiMaxMs).toBe(300000); expect(PROTO.terminoMs).toBe(1200000);
    expect(PROTO.lido1).toEqual([1, 1.5]); expect(PROTO.lido2).toEqual([0.5, 0.75]);
  });
  it('sem eventos além do início: caixa 1, ciclo conta desde o início', () => {
    const s = derive(base([]), at(0.5));
    expect(s.box).toBe(1); expect(s.rhythm).toBeNull(); expect(s.inArrest).toBe(true); expect(s.shockable).toBe(false);
    expect(s.cycleLeft).toBe(PROTO.cicloMs - 30000); expect(s.elapsed).toBe(30000); expect(s.sinceEpi).toBeNull();
  });
  it('choque sem ritmo registrado: assume FV e segue para a caixa 4', () => {
    const s = derive(base([{ t: at(0.5), type: 'choque', v: 200 }]), at(0.6));
    expect(s.rhythm).toBe('fv'); expect(s.firstRhythm).toBe('fv'); expect(s.shocks).toBe(1); expect(s.box).toBe(4); expect(s.awaitShock).toBe(false);
  });
  it('a checagem de ritmo reinicia o ciclo de 2 min', () => {
    const s = derive(base([{ t: at(2), type: 'ritmo', v: 'aesp' }]), at(2.5));
    expect(s.lastCheck).toBe(at(2)); expect(Math.round(s.cycleLeft / 1000)).toBe(90);
  });
  it('fim do ciclo: a orientação "agora" é checar ritmo, com marcador check', () => {
    const g = guide(base([{ t: at(0.5), type: 'ritmo', v: 'aesp' }]), at(2.6));
    expect(g.now.check).toBe(true); expect(g.now.ref).toBe('pulso'); expect(g.now.box).toBe(10);
  });
  it('RCE e nova parada: conta rearrests e recomeça pela caixa 1 → FV vai à caixa 3', () => {
    const c = base([{ t: at(1), type: 'ritmo', v: 'rce' }, { t: at(4), type: 'ritmo', v: 'fv' }]);
    const s = derive(c, at(4.1));
    expect(s.rearrests).toBe(1); expect(s.shockBox).toBe(3); expect(s.awaitShock).toBe(true); expect(s.inArrest).toBe(true);
    expect(guide(c, at(4.1)).now.act).toBe('choque');
  });
  it('RCE: orientação de pós-parada, sem pendências', () => {
    const g = guide(base([{ t: at(1), type: 'ritmo', v: 'rce' }]), at(1.5));
    expect(g.now.txt).toBe('RCE: cuidados pós-parada'); expect(g.now.sev).toBe('ok'); expect(g.now.ref).toBe('post'); expect(g.todo).toEqual([]);
    expect(g.s.box).toBe('rce'); expect(g.s.inArrest).toBe(false);
  });
  it('choque após RCE sem novo ritmo: recomeça pela caixa 1 → caixa 4', () => {
    const s = derive(base([{ t: at(1), type: 'ritmo', v: 'rce' }, { t: at(3), type: 'choque', v: 200 }]), at(3.1));
    expect(s.box).toBe(4); expect(s.shocks).toBe(1);
  });
  it('AESP de entrada: caixa 9 pede adrenalina o mais rápido possível; após a dose, segue na caixa 10', () => {
    const c = base([{ t: at(0.5), type: 'ritmo', v: 'aesp' }]);
    expect(guide(c, at(0.6)).now.txt).toBe('Adrenalina o mais rápido possível · RCP 2 min');
    expect(guide(c, at(0.6)).now.ref).toBe('box9');
    c.events.push({ t: at(0.7), type: 'epi' });
    expect(guide(c, at(0.8)).todo.find((t) => t.act === 'epi')).toBeUndefined();
    c.events.push({ t: at(2.5), type: 'ritmo', v: 'aesp' });
    expect(derive(c, at(2.6)).box).toBe(11);
    c.events.push({ t: at(4.5), type: 'ritmo', v: 'aesp' });
    const g = guide(c, at(4.6));
    expect(g.now.txt).toBe('RCP 2 min · acesso IV/IO · adrenalina a cada 3–5 min'); expect(g.now.ref).toBe('box10');
    expect(g.todo.find((t) => t.act === 'epi')?.txt).toBe('Adrenalina 1 mg — última há 03:54 (a cada 3–5 min)');
  });
  it('adrenalina há 3–5 min: aviso warn; < 3 min: nada', () => {
    const c = base([{ t: at(0.5), type: 'ritmo', v: 'aesp' }, { t: at(0.6), type: 'epi' }, { t: at(2.5), type: 'ritmo', v: 'aesp' }, { t: at(4.5), type: 'ritmo', v: 'aesp' }]);
    expect(guide(c, at(4.6)).todo.find((t) => t.act === 'epi')?.sev).toBe('warn');
    const c2 = base([{ t: at(0.5), type: 'ritmo', v: 'aesp' }, { t: at(2.4), type: 'epi' }, { t: at(2.5), type: 'ritmo', v: 'aesp' }, { t: at(4.5), type: 'ritmo', v: 'aesp' }]);
    expect(guide(c2, at(4.6)).todo.find((t) => t.act === 'epi')).toBeUndefined();
  });
  it('lidocaína como 1ª dose: 2ª passagem pela caixa 8 sugere lidocaína 0,5–0,75 mg/kg', () => {
    const c = base([
      { t: at(0.5), type: 'ritmo', v: 'fv' }, { t: at(0.6), type: 'choque', v: 200 },
      { t: at(2.6), type: 'ritmo', v: 'fv' }, { t: at(2.7), type: 'choque', v: 200 },
      { t: at(4.7), type: 'ritmo', v: 'fv' }, { t: at(4.8), type: 'choque', v: 200 }, { t: at(5), type: 'lido', v: 100 },
      { t: at(6.8), type: 'ritmo', v: 'fv' }, { t: at(6.9), type: 'choque', v: 200 },
      { t: at(8.9), type: 'ritmo', v: 'fv' }, { t: at(9), type: 'choque', v: 200 },
    ]);
    const g = guide(c, at(9.1));
    expect(g.s.pass8).toBe(2); expect(g.s.lido).toBe(1);
    expect(g.todo.find((t) => t.act === 'aa')?.txt).toBe('Lidocaína 0,5–0,75 mg/kg IV/IO (2ª dose)');
  });
  it('1ª passagem pela caixa 8 com 1 dose dada: não pede a 2ª ainda', () => {
    const c = base([
      { t: at(0.5), type: 'ritmo', v: 'fv' }, { t: at(0.6), type: 'choque', v: 200 },
      { t: at(2.6), type: 'ritmo', v: 'fv' }, { t: at(2.7), type: 'choque', v: 200 },
      { t: at(4.7), type: 'ritmo', v: 'fv' }, { t: at(4.8), type: 'choque', v: 200 }, { t: at(5), type: 'amio', v: 300 },
    ]);
    expect(guide(c, at(5.5)).todo.find((t) => t.act === 'aa')).toBeUndefined();
  });
  it('via aérea avançada muda o lembrete de ventilação; BVM mantém 30:2', () => {
    const c = base([{ t: at(0.5), type: 'ritmo', v: 'aesp' }, { t: at(0.7), type: 'via', v: 'sga' }]);
    expect(guide(c, at(1)).now.sub).toContain('1 ventilação a cada 6 s');
    expect(guide(c, at(1)).todo.find((t) => t.act === 'via')).toBeUndefined();
    const c2 = base([{ t: at(0.5), type: 'ritmo', v: 'aesp' }, { t: at(0.7), type: 'via', v: 'bvm' }]);
    expect(guide(c2, at(1)).now.sub).toContain('30:2');
  });
  it('acesso registrado some da lista da caixa 4', () => {
    const c = base([{ t: at(0.5), type: 'ritmo', v: 'fv' }, { t: at(0.6), type: 'choque', v: 200 }, { t: at(0.8), type: 'acesso', v: 'iv' }]);
    expect(guide(c, at(1)).todo.find((t) => t.act === 'acesso')).toBeUndefined();
    expect(derive(c, at(1)).access).toBe('iv');
  });
  it('H/T marcada: não repete "tratar causas reversíveis" na caixa 11', () => {
    const c = base([{ t: at(0.5), type: 'ritmo', v: 'aesp' }, { t: at(2.5), type: 'ritmo', v: 'aesp' }], { hts: { hipoxia: true } });
    expect(derive(c, at(2.6)).box).toBe(11);
    expect(guide(c, at(2.6)).todo.find((t) => t.act === 'ht')).toBeUndefined();
  });
  it('ETCO₂: salto de exatamente 10 não dispara; < 10 sem IOT não fala em encerrar', () => {
    const c = base([{ t: at(0.5), type: 'ritmo', v: 'aesp' }, { t: at(0.6), type: 'etco2', v: 12 }, { t: at(1), type: 'etco2', v: 22 }]);
    expect(guide(c, at(1.1)).todo.find((t) => t.ref === 'rce')).toBeUndefined();
    const c2 = base([{ t: at(0.5), type: 'ritmo', v: 'aesp' }, { t: at(0.7), type: 'via', v: 'sga' }, { t: at(21), type: 'etco2', v: 8 }]);
    const g = guide(c2, at(21.1));
    expect(g.todo.find((t) => t.ref === 'etco2')?.txt).toContain('ETCO₂ 8 mmHg (< 10)');
    expect(g.todo.find((t) => t.ref === 'termino')).toBeUndefined();
  });
  it('troca do compressor: sugerida nos 15 s finais do ciclo, se não houve troca recente', () => {
    const c = base([{ t: at(0.5), type: 'ritmo', v: 'aesp' }]);
    expect(guide(c, at(2.4)).todo.find((t) => t.act === 'troca')).toBeDefined();
    expect(guide(c, at(2)).todo.find((t) => t.act === 'troca')).toBeUndefined();
    c.events.push({ t: at(2.3), type: 'troca' });
    expect(guide(c, at(2.4)).todo.find((t) => t.act === 'troca')).toBeUndefined();
    expect(derive(c, at(2.4)).compressor).toBe(at(2.3));
  });
  it('energia definida aparece na orientação de choque', () => {
    expect(guide(base([{ t: at(0.5), type: 'ritmo', v: 'fv' }], { energia: 150 }), at(0.6)).now.txt).toBe('Choque (150 J) e retomar a RCP imediatamente');
  });
  it('elapsed usa o fim quando a PCR está encerrada', () => {
    expect(derive(base([], { end: at(10) }), at(30)).elapsed).toBe(10 * 60000);
  });
  it('outcomeTxt', () => {
    expect(outcomeTxt({ outcome: 'rce' })).toBe('RCE'); expect(outcomeTxt({ outcome: 'obito' })).toBe('Óbito');
    expect(outcomeTxt({ outcome: 'inter' })).toBe('Interrompida/transferida'); expect(outcomeTxt({})).toBe('em andamento');
  });
  it('relatório: óbito com horário, antiarrítmicos em ordem, drogas, acesso, via, ETCO₂, anotações, nova parada', () => {
    const c: PcrInput = base([
      { t: at(0.5), type: 'ritmo', v: 'fv', label: 'Ritmo: FV/TV sem pulso' },
      { t: at(0.6), type: 'choque', v: 200, label: 'Choque 200 J (1º)' },
      { t: at(0.8), type: 'acesso', v: 'iv', label: 'Acesso IV' },
      { t: at(1), type: 'via', v: 'iot', label: 'Intubação orotraqueal' },
      { t: at(1.2), type: 'etco2', v: 15, label: 'ETCO₂ 15 mmHg' },
      { t: at(2), type: 'lido', v: 100, label: 'Lidocaína 100–150 mg IV/IO (1ª dose)' },
      { t: at(1.5), type: 'amio', v: 300, label: 'Amiodarona 300 mg IV/IO' },
      { t: at(3), type: 'droga', v: 'bic', label: 'Bicarbonato de sódio IV' },
      { t: at(4), type: 'ritmo', v: 'rce', label: 'RCE — retorno da circulação espontânea' },
      { t: at(6), type: 'ritmo', v: 'assist', label: 'Ritmo: Assistolia' },
      { t: at(7), type: 'nota', label: 'família avisada' },
      { t: at(8), type: 'fim', label: 'Óbito constatado — esforços encerrados' },
    ], { end: at(8), outcome: 'obito', patientName: '', hts: {} });
    const { text, s } = report(c);
    expect(text).toContain('PCR — paciente sem identificação');
    expect(text).toContain('Ritmo inicial: FV/TV sem pulso');
    expect(text).toContain('Choques: 1 — 200 J em 00:36');
    expect(text).toContain('Adrenalina 1 mg: 0 dose(s)');
    expect(text).toContain('Antiarrítmico: Amiodarona 300 mg IV/IO em 01:30; Lidocaína 100–150 mg IV/IO (1ª dose) em 02:00');
    expect(text).toContain('Outras drogas/ações: Bicarbonato de sódio IV em 03:00');
    expect(text).toMatch(/Acesso: Acesso IV em 00:48 \(\d{2}:\d{2}\)/);
    expect(text).toMatch(/Via aérea: Intubação orotraqueal em 01:00 \(\d{2}:\d{2}\)/);
    expect(text).toContain('ETCO₂: 15 mmHg em 01:12');
    expect(text).toContain('Causas reversíveis consideradas: nenhuma registrada');
    expect(text).toMatch(/Desfecho: Óbito — óbito às \d{2}:\d{2}:\d{2} · 1 nova\(s\) parada\(s\) após RCE/);
    expect(text).toContain('Anotações: [07:00] família avisada');
    expect(text).toContain('duração 08:00');
    expect(text.split('\n').filter((l) => / — /.test(l) && /^\d{2}:\d{2} · /.test(l))).toHaveLength(c.events.length);
    expect(s.rearrests).toBe(1); expect(s.shocks).toBe(1);
  });
  it('relatório de PCR interrompida não acrescenta horário de RCE nem de óbito', () => {
    const text = report(base([{ t: at(0.5), type: 'ritmo', v: 'aesp', label: 'Ritmo: AESP' }], { end: at(5), outcome: 'inter' })).text;
    expect(text).toContain('Desfecho: Interrompida/transferida\n');
  });
  it('cofre fechado nos testes: sem PCR ativa, o app não está ocupado', () => {
    expect(active()).toBeNull(); expect(isBusy()).toBe(false);
  });
});
