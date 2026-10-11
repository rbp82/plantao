/* Leitura do ticket do gasômetro: texto do OCR → campos nas unidades do app.
   Seção 17 de ../tests/tests.js (valores conferidos à mão contra tickets reais) + casos de borda.
   parse() e vote() são puros; read()/docScan() precisam de canvas e só são checados quanto à exportação. */
import { describe, it, expect } from 'vitest';
import { parse, vote, read, docScan, type ParseResult, type OcrLine } from './scan';

const val = (r: ParseResult, f: string) => r.items.find((x) => x.fid === f)?.v;
const on = (r: ParseResult, f: string) => r.items.find((x) => x.fid === f)?.sure;
const note = (r: ParseResult, f: string) => r.items.find((x) => x.fid === f)?.note;

/* Radiometer ABL90 em português (ticket real de 03/10/2026, sem identificação) */
const ABL = [
  'RADIOMETER SÉRIE ABL90',
  'ABL90 ABL 90 UTI ADULTO I393-090R0415N0 01:05 3/10/2026',
  'REL. DO PACIENTE Seringa - S 65uL Amostra # 31447',
  'Tipo de amostra Arterial', 'T 37,0 °C',
  '↓ pH 7,273 [ 7,370 - 7,450 ]',
  '↓ pCO₂ 18,6 mmHg [ 35,0 - 46,0 ]',
  '↑ pO₂ 234,5 mmHg [ 70,0 - 100,0 ]',
  'ABEc -16,6 mmol/L',
  'cHCO₃⁻(P)c 8,6 mmol/L',
  'ctCO₂(B)c 8,5 mmol/L',
  '↓ sO₂ 95,8 % [ 96,0 - ]',
  '↑ FMetHb 2,2 % [ - 1,5 ]', 'FCOHb 0,0 %',
  '↑ cNa⁺ 149 meq/L [ 135 - 145 ]',
  'cK⁺ 3,3 meq/L',
  'cCa²⁺ 1,32 mmol/L [ 1,15 - 1,35 ]',
  '↑ cCl⁻ 118 meq/L [ 95 - 105 ]',
  'cGlu 88 mg/dL [ 70 - 115 ]',
  '↑ cLac 60 mg/dL [ 5 - 20 ]',
  'Hctc 23,4 %', 'ctHb 7,6 g/dL', 'ctBil 5,8 mg/dL',
  'Lote Cart. Soluções: RF-04', 'Impresso 01:06:41 3/10/2026', 'Cass. série #: 2720-295',
].join('\n');

describe('ABL90 em português (ticket real)', () => {
  const abl = parse(ABL);
  it('pH 7,273 (vírgula decimal, seta ↓)', () => expect(val(abl, 'ph')).toBe(7.273));
  it('PaCO₂ 18,6', () => expect(val(abl, 'paco2')).toBe(18.6));
  it('PaO₂ 234,5', () => expect(val(abl, 'pao2')).toBe(234.5));
  it('HCO₃ 8,6 (cHCO₃⁻(P), não o ctCO₂ 8,5)', () => expect(val(abl, 'hco3')).toBe(8.6));
  it('SaO₂ 95,8 (não FMetHb/FCOHb)', () => expect(val(abl, 'sao2')).toBe(95.8));
  it('Na 149 · K 3,3 · Cl 118', () => expect([val(abl, 'na'), val(abl, 'k'), val(abl, 'cl')].join(' ')).toBe('149 3.3 118'));
  it('Ca iônico 1,32', () => expect(val(abl, 'ica')).toBe(1.32));
  it('glicose 88 mg/dL', () => expect(val(abl, 'glic')).toBe(88));
  it('lactato 60 mg/dL → 6,66 mmol/L', () => expect(val(abl, 'lac')).toBe(6.66));
  it('Hb 7,6 (não Hct 23,4)', () => expect(val(abl, 'hb')).toBe(7.6));
  it('ABE lido (−16,6) mas vem desmarcado (o app usa SBE)', () => expect(`${val(abl, 'be')} ${on(abl, 'be')}`).toBe('-16.6 false'));
  it('amostra arterial detectada', () => expect(abl.sample).toBe('art'));
  it('nenhum campo a mais (bilirrubina, cabeçalho, data)', () => {
    expect(abl.items.map((x) => x.fid).join(',')).toBe('ph,paco2,pao2,hco3,be,sao2,na,k,cl,ica,glic,lac,hb');
  });
  it('ticket real fecha (Henderson-Hasselbalch): pH, PaCO₂ e HCO₃ seguem marcados', () => {
    expect(['ph', 'paco2', 'hco3'].map((f) => on(abl, f)).join(' ')).toBe('true true true');
  });
  it('unidades lidas e texto cru preservados nos itens', () => {
    const lac = abl.items.find((x) => x.fid === 'lac');
    expect(lac).toMatchObject({ raw: '60', unit: 'mg/dL', note: 'mg/dL → mmol/L', sure: true });
    expect(abl.items.find((x) => x.fid === 'be')?.unit).toBe('mmol/L');
    expect(abl.kpa).toBe(false);
  });
});

describe('OCR ruidoso (setas viram letras, subscritos viram vírgula, 0↔O)', () => {
  const noisy = parse(['4 pH 7,273 [ 7,370 - 7,450 ]', 't pCO, 18,6 mmHg [ 35,0 - 46,0 ]', 't p0, 234.5 mmHg', 'cHCO;-(P)c 8 ,6 mmoV/L', '| s0, 95,8 %', 't cNa* 149 meq/L', 'cK* 3,3 meq/L', 'cCa?* 1,32 mmol/L', 't cCI 118 meq/L', 't cLac 60 mg/dL [ 5 - 20 ]', 'ctHb 7,6 g/dL'].join('\n'));
  it('pH, PaCO₂, PaO₂, HCO₃', () => expect([val(noisy, 'ph'), val(noisy, 'paco2'), val(noisy, 'pao2'), val(noisy, 'hco3')].join(' ')).toBe('7.273 18.6 234.5 8.6'));
  it('SaO₂, Na, K, Ca, Cl', () => expect([val(noisy, 'sao2'), val(noisy, 'na'), val(noisy, 'k'), val(noisy, 'ica'), val(noisy, 'cl')].join(' ')).toBe('95.8 149 3.3 1.32 118'));
  it('lactato convertido e Hb', () => expect([val(noisy, 'lac'), val(noisy, 'hb')].join(' ')).toBe('6.66 7.6'));
});

describe('outros formatos', () => {
  const kpa = parse('Sample type: Venous\npH 7.35\npCO2 6.0 kPa\npO2 5.3 kPa\ncHCO3-(P,st)c 22.1 mmol/L\ncHCO3-(P)c 24.0 mmol/L\ncBase(Ecf)c -1.2 mmol/L\npH(T) 7.31\ncCa2+(7.4)c 1.10 mmol/L\ncCa2+ 1.16 mmol/L\ncGlu 6.0 mmol/L\nctHb 140 g/L\nFO2(I) 40.0 %\npO2(A-a)e 120 mmHg');
  it('kPa → mmHg (PCO₂ 6,0 kPa = 45,0)', () => expect(val(kpa, 'paco2')).toBe(45));
  it('amostra venosa detectada', () => expect(kpa.sample).toBe('ven'));
  it('HCO₃ padrão (P,st) é ignorado; fica o real 24,0', () => expect(val(kpa, 'hco3')).toBe(24));
  it('cBase(Ecf) = SBE, marcado', () => expect(`${val(kpa, 'be')} ${on(kpa, 'be')}`).toBe('-1.2 true'));
  it('pH(T) não substitui o pH a 37 °C', () => expect(val(kpa, 'ph')).toBe(7.35));
  it('Ca²⁺ normalizado (7,4) é ignorado', () => expect(val(kpa, 'ica')).toBe(1.16));
  it('glicose 6,0 mmol/L → 108 mg/dL', () => expect(val(kpa, 'glic')).toBe(108));
  it('Hb 140 g/L → 14 g/dL', () => expect(val(kpa, 'hb')).toBe(14));
  it('FO2(I) do Radiometer = FiO₂', () => expect(val(kpa, 'fio2')).toBe(40));
  it('PO₂(A-a) não vira PaO₂', () => expect(val(kpa, 'pao2')).toBe(39.8));

  const gem = parse('pH 7.12 L\nPCO2 61 H mmHg\nHCO3- 19.4\nBEecf -10.5\nNa+ 131   K+ 6.8\nLac 1.9 mmol/L\nFIO2 0.5\nSO2 88 %\nGlu 412');
  it('duas colunas na mesma linha (Na e K)', () => expect(`${val(gem, 'na')} ${val(gem, 'k')}`).toBe('131 6.8'));
  it('BEecf = SBE', () => expect(val(gem, 'be')).toBe(-10.5));
  it('FiO₂ em fração 0,5 → 50 %', () => expect(val(gem, 'fio2')).toBe(50));
  it('sem amostra informada → indefinida', () => expect(gem.sample).toBeNull());

  it('fora da faixa plausível vem desmarcado', () => {
    const absurd = parse('pH 72.7\nK+ 0.2');
    expect(`${on(absurd, 'ph')} ${on(absurd, 'k')}`).toBe('false false');
    expect(note(absurd, 'k')).toBe('fora da faixa plausível: confira');
  });
});

describe('vírgula apagada no papel térmico (visto na foto real do ABL90)', () => {
  const lost = parse('pCO, 186 mmHg\npO, 2345 mmHg\ncK* 33 megl\nctHb 76 gdl\nt cClI 118 meg\nt clLac 60 mg/dl');
  it('"186" mmHg → 18,6 sugerido, mas desmarcado (pode ser dígito trocado)', () => expect(`${val(lost, 'paco2')} ${on(lost, 'paco2')}`).toBe('18.6 false'));
  it('"2345" mmHg → 234,5 sugerido, desmarcado (23,45 também seria plausível)', () => expect(`${val(lost, 'pao2')} ${on(lost, 'pao2')}`).toBe('234.5 false'));
  it('"33" K → 3,3 · "76" Hb → 7,6', () => expect(`${val(lost, 'k')} ${val(lost, 'hb')}`).toBe('3.3 7.6'));
  it('rótulos deformados: cClI → Cl, clLac → Lac', () => expect(`${val(lost, 'cl')} ${val(lost, 'lac')}`).toBe('118 6.66'));
  it('a nota diz o que foi entendido, em português', () => expect(note(lost, 'paco2')).toBe('vírgula não lida: entendido como 18,6, confira'));
});

describe('bicarbonato com o rótulo deformado pelo OCR (visto na foto real)', () => {
  it('HCO₃ com parêntese aberto ("HCO, "(Plc")', () => expect(val(parse('HCO, "(Plc       8.6 mmol.\n¢HCO,;"(P)¢ 8.6 mmoll'), 'hco3')).toBe(8.6));
  it('HCO₃ com subscrito lido como vírgula ("cHCOs", "HC03")', () => {
    expect(`${val(parse('cHCOs 24.1'), 'hco3')} ${val(parse('HC03 22'), 'hco3')}`).toBe('24.1 22');
  });
  it('ctCO₂ continua não sendo HCO₃', () => expect(val(parse('ctCO,(B)¢ 8.5 mmol'), 'hco3')).toBeUndefined());
});

describe('tipo de amostra', () => {
  it('"Tipo de amostra Venosa" → amostra venosa', () => expect(parse('Tipo de amostra Venosa\npH 7.21\npCO2 52.0 mmHg').sample).toBe('ven'));
  it('quando os dois aparecem, vale o que vem primeiro', () => {
    expect(parse('Arterial\n(ref. venous)\npH 7.40').sample).toBe('art');
    expect(parse('Venous\n(ref. arterial)\npH 7.40').sample).toBe('ven');
  });
});

describe('coerência interna do ticket', () => {
  it('pH 7,213 com PaCO₂ 18,6 e HCO₃ 8,6 não fecha (HH): os três desmarcados', () => {
    const bad = parse('pH 7.213\npCO2 18.6 mmHg\ncHCO3-(P)c 8.6 mmol/L');
    expect(['ph', 'paco2', 'hco3'].map((f) => on(bad, f)).join(' ')).toBe('false false false');
    expect(note(bad, 'ph')).toBe('pH, PaCO₂ e HCO₃ não fecham (Henderson-Hasselbalch)');
  });
  it('SBE +16,6 com pH 7,27 e HCO₃ 8,6: sinal perdido → desmarcado', () => {
    const sgn = parse('pH 7.273\npCO2 18.6 mmHg\ncHCO3-(P)c 8.6\ncBase(Ecf)c 16.6');
    expect(on(sgn, 'be')).toBe(false);
    expect(note(sgn, 'be')).toBe('sinal do BE não confere com pH e HCO₃');
  });
  it('a nota de coerência vem antes de uma nota anterior, separada por " · "', () => {
    const r = parse('pH 7.213\npCO2 2.5 kPa\ncHCO3-(P)c 8.6 mmol/L');
    expect(note(r, 'paco2')).toBe('pH, PaCO₂ e HCO₃ não fecham (Henderson-Hasselbalch) · kPa → mmHg');
  });
});

describe('votação entre leituras independentes', () => {
  const rA = parse('pH 7.273\nsO2 95.8 %\npCO2 18.6 mmHg\ncK+ 3.3');
  const rB = parse('pH 7.273\nsO2 85.8 %\nNa+ 149\ncK+ 3.3');
  const rC = parse('pH 7.273\nsO2 95.8 %\npCO2 186 mmHg');
  const vt = vote([rA, rB, rC]);
  it('três leituras iguais → marcado', () => expect(`${val(vt, 'ph')} ${on(vt, 'ph')}`).toBe('7.273 true'));
  it('95,8 × 85,8 → vence 95,8, mas desmarcado', () => {
    expect(`${val(vt, 'sao2')} ${on(vt, 'sao2')}`).toBe('95.8 false');
    expect(note(vt, 'sao2')).toBe('leituras diferentes (95,8 × 85,8): confira');
  });
  it('18,6 lido + "186" corrigido para 18,6 → concordam, marcado', () => expect(`${val(vt, 'paco2')} ${on(vt, 'paco2')}`).toBe('18.6 true'));
  it('lido uma vez só (Na) → desmarcado', () => {
    expect(`${val(vt, 'na')} ${on(vt, 'na')}`).toBe('149 false');
    expect(note(vt, 'na')).toBe('lido uma vez só: confira');
  });
  it('duas de três concordam, nenhuma discorda (K) → marcado', () => expect(on(vt, 'k')).toBe(true));
  it('itens saem na ordem dos campos do app, e a amostra é a primeira informada', () => {
    expect(vt.items.map((x) => x.fid)).toEqual(['ph', 'paco2', 'sao2', 'na', 'k']);
    expect(vt.sample).toBeNull();
    expect(vote([parse('pH 7.40'), parse('Arterial\npH 7.40')]).sample).toBe('art');
  });
  it('uma leitura só: tudo desmarcado como "lido uma vez só"', () => {
    const one = vote([parse('pH 7.40\nNa+ 140')]);
    expect(one.items.map((x) => `${x.fid}:${x.sure}`)).toEqual(['ph:false', 'na:false']);
  });
  it('empate em contagem: vence a leitura com vírgula explícita', () => {
    const v = vote([parse('pCO2 186 mmHg'), parse('pCO2 40.0 mmHg')]);
    expect(val(v, 'paco2')).toBe(40);
    expect(on(v, 'paco2')).toBe(false);
  });
  it('a votação não altera as leituras de origem', () => {
    expect(on(rB, 'sao2')).toBe(true);
    expect(on(rB, 'na')).toBe(true);
  });
});

describe('casos de borda', () => {
  it('texto vazio → nada lido, amostra indefinida', () => {
    expect(parse('')).toEqual({ items: [], sample: null, kpa: false });
  });
  it('aceita CRLF', () => {
    const r = parse('pH 7.40\r\nNa+ 140\r\n');
    expect([val(r, 'ph'), val(r, 'na')]).toEqual([7.4, 140]);
  });
  it('números colados a rótulos ou dentro de faixas de referência não viram valores', () => {
    expect(parse('ABL90 ABL 90\n[ 7,370 - 7,450 ]\n(7.4)').items).toEqual([]);
  });
  it('documento em kPa sem unidade na linha: converte mesmo assim e sinaliza kpa', () => {
    const r = parse('pO2 12.0 kPa\npCO2 5.3');
    expect(r.kpa).toBe(true);
    expect(val(r, 'paco2')).toBe(39.8);
    expect(note(r, 'paco2')).toBe('kPa → mmHg');
    expect(val(r, 'pao2')).toBe(90);
  });
  it('mmHg presente no documento desliga a suposição de kPa', () => {
    const r = parse('pO2 90 mmHg\npCO2 40\nFO2(I) 21 % kPa');
    expect(r.kpa).toBe(false);
    expect(val(r, 'paco2')).toBe(40);
  });
  it('lactato sem unidade acima de 25: assume mg/dL e desmarca', () => {
    const r = parse('Lac 45');
    expect(val(r, 'lac')).toBe(4.99);
    expect(on(r, 'lac')).toBe(false);
    expect(note(r, 'lac')).toBe('unidade não lida: assumido mg/dL');
  });
  it('glicose sem unidade abaixo de 35: mantém o valor e pede conferência', () => {
    const r = parse('Glu 20');
    expect(val(r, 'glic')).toBe(20);
    expect(on(r, 'glic')).toBe(false);
    expect(note(r, 'glic')).toBe('unidade não lida: confira');
  });
  it('Hb em mmol/L → g/dL', () => expect(val(parse('ctHb 8.7 mmol/L'), 'hb')).toBe(14));
  it('Ca em mg/dL converte, mas vem desmarcado (pode ser o total)', () => {
    const r = parse('Ca++ 4.8 mg/dL');
    expect(val(r, 'ica')).toBe(1.2);
    expect(on(r, 'ica')).toBe(false);
    expect(note(r, 'ica')).toBe('mg/dL → mmol/L: confira se é o iônico');
  });
  it('FO2Hb não é FiO₂; FIO2 em % fica como está', () => {
    expect(val(parse('FO2Hb 98 %'), 'fio2')).toBeUndefined();
    expect(val(parse('FIO2 21 %'), 'fio2')).toBe(21);
  });
  it('SaO₂ em fração → %', () => expect(val(parse('sO2 0.958'), 'sao2')).toBe(95.8));
  it('pO2(a/A) não vira PaO₂', () => expect(val(parse('pO2(a/A) 0.3'), 'pao2')).toBeUndefined());
  it('BE: SBE tem prioridade sobre ABE, que tem prioridade sobre BE sem qualificador', () => {
    expect(val(parse('BE -1\nABE -2\nSBE -4'), 'be')).toBe(-4);
    expect(val(parse('BE -1\nABEc -2'), 'be')).toBe(-2);
    const plain = parse('BE -3.5');
    expect(`${val(plain, 'be')} ${on(plain, 'be')}`).toBe('-3.5 true');
  });
  it('ABE: nota explica que o app usa SBE', () => {
    expect(note(parse('ABEc -16.6 mmol/L'), 'be')).toBe('ABE (sangue total). O app usa SBE: deixando vazio, ele calcula pelo pH e HCO₃');
  });
  it('hífen do rótulo (cCl⁻ 118) não vira sinal negativo', () => expect(val(parse('cCl- 118 meq/L'), 'cl')).toBe(118));
  it('rótulos em português por extenso', () => {
    const r = parse('Sódio 140\nPotássio 4.0\nCloreto 100\nLactato 1.5\nGlicose 90\nHemoglobina 12\nBicarbonato 24\nExcesso de bases -2');
    expect(r.items.map((x) => `${x.fid}=${x.v}`)).toEqual(['hco3=24', 'be=-2', 'na=140', 'k=4', 'cl=100', 'glic=90', 'lac=1.5', 'hb=12']);
  });
  it('primeira ocorrência de um campo vence, salvo prioridade maior', () => {
    expect(val(parse('pH 7.40\npH 7.20'), 'ph')).toBe(7.4);
    expect(val(parse('pH(T) 7.31\npH 7.35'), 'ph')).toBe(7.35);
  });
});

describe('linhas do OCR (com palavras e confiança)', () => {
  const lines = (conf: number): OcrLine[] => [
    { text: 'pH 7.40', bbox: { x0: 0, y0: 0, x1: 100, y1: 20 }, words: [{ text: 'pH', conf: 95 }, { text: '7.40', conf }] },
    { text: 'Na+ 140', words: [{ text: 'Na+', conf: 95 }, { text: '140', conf: 95 }] },
  ];
  it('palavra do valor com confiança < 70 vem desmarcada', () => {
    const r = parse(lines(55));
    expect(on(r, 'ph')).toBe(false);
    expect(note(r, 'ph')).toBe('leitura incerta: confira');
    expect(on(r, 'na')).toBe(true);
  });
  it('confiança ≥ 70 mantém marcado e guarda a linha de origem', () => {
    const r = parse(lines(88));
    expect(on(r, 'ph')).toBe(true);
    expect(r.items.map((x) => x.line)).toEqual([0, 1]);
  });
  it('linha sem texto não quebra', () => {
    expect(parse([{ text: '' }, { text: 'K+ 4.1' }]).items.map((x) => x.v)).toEqual([4.1]);
  });
});

describe('API do módulo', () => {
  it('exporta read e docScan (só rodam no navegador: canvas e Tesseract)', () => {
    expect(typeof read).toBe('function');
    expect(typeof docScan).toBe('function');
  });
});
