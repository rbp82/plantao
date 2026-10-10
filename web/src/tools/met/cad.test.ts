/* 5. Cetoacidose diabética — ADA 2009 (portado de tests/tests.js; valores esperados conferidos à mão) */
import { describe, it, expect } from 'vitest';
import '@/lib/calc';
import { cadText, computeCad, type CadInputs } from './cad.calc';

const base: CadInputs = { peso: 70, gl: 450, ph: 7.28, hc: 16, k: 4.2, na: 132, vol: 'leve', via: 'iv', diu: 'sim', oral: 'nao' };
const txt = (over: Partial<CadInputs> = {}) => cadText(computeCad({ ...base, ...over }));

describe('5. Cetoacidose diabética — ADA 2009', () => {
  it('pH 7,28 + HCO₃ 16 = CAD leve', () => expect(txt()).toContain('CAD leve'));
  it('Na corrigido (1,6/100 mg/dL) = 137,6', () => expect(txt()).toContain('137,6')); // 132 + 1,6 × 3,5
  it('Bolus insulina 0,1 U/kg = 7,0 U', () => expect(txt()).toContain('7,0 U'));
  it('1ª hora SF 0,9% 1 L/h para todos', () => expect(txt()).toContain('1ª hora: SF 0,9% 1 L/h'));
  it('Glicemia não cai 10% → bolus 0,14 U/kg = 9,8 U', () => expect(txt()).toContain('9,8 U'));
  it('pH 7,28 + HCO₃ 12 = moderada (vale o pior)', () => expect(txt({ hc: 12 })).toContain('CAD moderada'));
  it('pH 6,95 = grave', () => expect(txt({ hc: 12, ph: 6.95 })).toContain('CAD grave'));
  it('pH 6,85 → bicarbonato indicado', () => expect(txt({ hc: 12, ph: 6.85 })).toContain('Indicado (pH'));
  it('pH 7,35 + HCO₃ 22 = sem critério de CAD', () => expect(txt({ ph: 7.35, hc: 22 })).toContain('Sem critério gasométrico'));
  it('K 3,1 → segurar insulina, repor 20–30 mEq/h', () => expect(txt({ ph: 7.2, hc: 12, k: 3.1 })).toContain('20–30 mEq K⁺/h'));
  it('K 5,2 → ainda repõe 20–30 mEq/L', () => expect(txt({ ph: 7.2, hc: 12, k: 5.2 })).toContain('20–30 mEq de K⁺ em cada litro'));
  it('K 5,3 → não repor', () => expect(txt({ ph: 7.2, hc: 12, k: 5.3 })).toContain('não repor'));
  it('Choque cardiogênico → sem SF 1 L/h de manutenção, monitorização', () => expect(txt({ ph: 7.2, hc: 12, k: 5.3, vol: 'choque' })).toContain('Choque cardiogênico'));
});

describe('CAD — modelo e bordas', () => {
  it('faltando peso e pH → aguardando com a lista dos campos', () => {
    const m = computeCad({ ...base, peso: NaN, ph: NaN });
    expect(m.kind).toBe('idle');
    if (m.kind === 'idle') expect(m.missing).toEqual(['peso', 'pH']);
    expect(m.summary).toBe('');
  });
  it('limites de gravidade: pH 7,30 e HCO₃ 18 ainda são leve; pH 7,31 e HCO₃ 18,1 não são CAD', () => {
    expect(txt({ ph: 7.3, hc: 18 })).toContain('CAD leve');
    expect(computeCad({ ...base, ph: 7.31, hc: 18.1 }).kind).toBe('none');
  });
  it('HCO₃ < 10 isolado = grave; pH 7,24 = moderada', () => {
    expect(txt({ hc: 9.9 })).toContain('CAD grave');
    expect(txt({ ph: 7.24 })).toContain('CAD moderada');
  });
  it('só um critério alterado → nota para confirmar cetonemia', () => {
    expect(txt({ ph: 7.28, hc: 22 })).toContain('Só um dos critérios gasométricos');
    expect(txt()).not.toContain('Só um dos critérios gasométricos');
  });
  it('K < 3,3 suspende a insulina e não mostra o esquema de bolus', () => {
    const t = txt({ k: 3.1 });
    expect(t).toContain('Insulina suspensa');
    expect(t).not.toContain('Bolus 7,0 U');
  });
  it('via SC: 0,3 U/kg = 21,0 U, depois 0,2 U/kg = 14,0 U', () => {
    const t = txt({ via: 'sc' });
    expect(t).toContain('21,0 U');
    expect(t).toContain('14,0 U');
    expect(t).toContain('reavaliar via e dose');
  });
  it('Na corrigido > 145 → SF 0,45% na manutenção', () => {
    expect(txt({ na: 145 })).toContain('SF 0,45% 250–500 mL/h'); // 145 + 5,6 = 150,6
    expect(txt()).toContain('SF 0,9% 250–500 mL/h');
  });
  it('diurese incerta → aguardar diurese antes do K⁺', () => expect(txt({ diu: 'nao' })).toContain('Aguardar diurese ≥ 50 mL/h'));
  it('fase resolvida → transição basal-bolus com 35–56 U/dia', () => {
    const t = txt({ oral: 'sim' });
    expect(t).toContain('Transição');
    expect(t).toContain('35–56 U/dia');
  });
  it('glicemia ≤ 250 → alerta de CAD euglicêmica', () => expect(txt({ gl: 250 })).toContain('euglicêmica'));
  it('resumo para prontuário', () => {
    expect(computeCad(base).summary).toBe('CAD leve (glicemia 450, pH 7,28, HCO₃ 16,0, K 4,2, Na 132 / corrigido 137,6). Peso 70 kg. Hidratação: SF 0,9% 1 L/h na 1ª hora, depois SF 0,9% 250–500 mL/h. K: 20–30 mEq/L de soro. Insulina: insulina regular EV bolus 7,0 U + 7,0 U/h. Bicarbonato: não indicado.');
    expect(computeCad({ ...base, ph: 6.85, k: 3.1, diu: 'nao', vol: 'choque' }).summary).toContain('K: repor 20–30 mEq/h, insulina suspensa (aguardar diurese). Insulina: insulina suspensa (K < 3,3). Bicarbonato: indicado (100 mmol em 2 h).');
    expect(computeCad({ ...base, ph: 7.35, hc: 22 }).summary).toBe('Sem critério gasométrico de CAD (glicemia 450, pH 7,35, HCO₃ 22,0).');
  });
});
