/* 5. Cetoacidose diabética — consenso ADA/EASD/JBDS/AACE/DTS 2024 (Umpierrez, Diabetes Care 2024;47:1257, PMID 39052901).
   Portado de tests/tests.js (ADA 2009) e atualizado na auditoria de 10/2026; valores esperados conferidos à mão. */
import { describe, it, expect } from 'vitest';
import '@/lib/calc';
import { cadText, computeCad, CAD_GL_DEXTROSE, CAD_GL_EUGLICEMICA, CAD_K_ALTO, CAD_K_BAIXO, CAD_PH_BIC, type CadInputs } from './cad.calc';

const base: CadInputs = { peso: 70, gl: 450, ph: 7.28, hc: 16, k: 4.2, na: 132, vol: 'leve', via: 'iv', diu: 'sim', oral: 'nao' };
const txt = (over: Partial<CadInputs> = {}) => cadText(computeCad({ ...base, ...over }));

describe('5. Cetoacidose diabética — consenso 2024', () => {
  it('limiares exportados seguem o consenso 2024: K 3,5 / 5,0 · bicarbonato pH < 7,0 · glicose 250 · euglicêmica < 200', () => {
    expect(CAD_K_BAIXO).toBe(3.5); expect(CAD_K_ALTO).toBe(5.0); expect(CAD_PH_BIC).toBe(7.0); expect(CAD_GL_DEXTROSE).toBe(250); expect(CAD_GL_EUGLICEMICA).toBe(200);
  });
  it('pH 7,28 + HCO₃ 16 = CAD leve', () => expect(txt()).toContain('CAD leve'));
  it('Na corrigido (1,6/100 mg/dL) = 137,6', () => expect(txt()).toContain('137,6')); // 132 + 1,6 × 3,5
  it('Infusão fixa 0,1 U/kg/h = 7,0 U/h; bolus 0,1 U/kg só se atraso no acesso', () => {
    expect(txt()).toContain('Infusão 7,0 U/h');
    expect(txt()).toContain('Bolus 7,0 U (0,1 U/kg) IV ou IM só se houver atraso no acesso venoso');
  });
  it('Primeiras 2–4 h: SF 0,9% ou balanceado 500–1000 mL/h para todos', () => expect(txt()).toContain('Primeiras 2–4 h: SF 0,9% ou cristaloide balanceado 500–1000 mL/h'));
  it('Glicemia não cai 10% (ADA 2009) → bolus 0,14 U/kg = 9,8 U', () => expect(txt()).toContain('9,8 U'));
  it('Glicemia < 250 → glicose 5–10% e insulina 0,05 U/kg/h = 3,5 U/h', () => expect(txt()).toContain('reduzir para 0,05 U/kg/h EV (3,5 U/h)'));
  it('pH 7,28 + HCO₃ 12 = moderada (vale o pior)', () => expect(txt({ hc: 12 })).toContain('CAD moderada'));
  it('pH 6,95 = grave', () => expect(txt({ hc: 12, ph: 6.95 })).toContain('CAD grave'));
  it('pH 6,95 e 6,85 → bicarbonato a considerar (pH < 7,0); pH 7,00 → não indicado', () => {
    expect(txt({ hc: 12, ph: 6.95 })).toContain('Considerar (pH');
    expect(txt({ hc: 12, ph: 6.85 })).toContain('100 mmol de NaHCO₃ 8,4%');
    expect(txt({ hc: 9, ph: 7.0 })).toContain('não indicado');
  });
  it('pH 7,35 + HCO₃ 22 = sem critério de CAD', () => expect(txt({ ph: 7.35, hc: 22 })).toContain('Sem critério gasométrico'));
  it('K 3,1 → segurar insulina, repor 10 mmol/h', () => expect(txt({ ph: 7.2, hc: 12, k: 3.1 })).toContain('Repor 10 mmol K⁺/h EV até K⁺ > 3,5'));
  it('K 3,4 segura a insulina; K 3,5 não', () => {
    expect(txt({ k: 3.4 })).toContain('Insulina suspensa');
    expect(txt({ k: 3.5 })).not.toContain('Insulina suspensa');
  });
  it('K 4,9 → repõe 20–30 mmol/L; K 5,0 e 5,2 → não repor', () => {
    expect(txt({ ph: 7.2, hc: 12, k: 4.9 })).toContain('20–30 mmol de K⁺ em cada litro');
    expect(txt({ ph: 7.2, hc: 12, k: 5.0 })).toContain('não repor');
    expect(txt({ ph: 7.2, hc: 12, k: 5.2 })).toContain('não repor');
  });
  it('Choque cardiogênico → sem SF 1 L/h de manutenção, monitorização', () => expect(txt({ ph: 7.2, hc: 12, k: 5.3, vol: 'choque' })).toContain('Choque cardiogênico'));
});

describe('CAD — modelo e bordas', () => {
  it('faltando peso e pH → aguardando com a lista dos campos', () => {
    const m = computeCad({ ...base, peso: NaN, ph: NaN });
    expect(m.kind).toBe('idle');
    if (m.kind === 'idle') expect(m.missing).toEqual(['peso', 'pH']);
    expect(m.summary).toBe('');
  });
  it('limites de gravidade (Table 2, 2024): pH 7,30 e HCO₃ 18 ainda são leve (pelo HCO₃); pH 7,31 e HCO₃ 18,1 não são CAD', () => {
    expect(txt({ ph: 7.3, hc: 18 })).toContain('CAD leve');
    expect(computeCad({ ...base, ph: 7.31, hc: 18.1 }).kind).toBe('none');
  });
  it('pH 7,30 não é critério de acidose (< 7,30): com HCO₃ 16 fica leve só pelo HCO₃ e avisa', () => {
    const t = txt({ ph: 7.3, hc: 16 });
    expect(t).toContain('CAD leve');
    expect(t).toContain('Só um dos critérios gasométricos');
  });
  it('pH 7,25 = leve (Kitabchi 2009 Tab. 1 e Umpierrez 2024 Tab. 2: leve 7,25–7,30; moderada 7,00 a < 7,25); pH 7,26 = leve; HCO₃ < 10 isolado = grave; pH 7,24 = moderada', () => {
    expect(txt({ ph: 7.25 })).toContain('CAD leve');
    expect(txt({ ph: 7.26 })).toContain('CAD leve');
    expect(txt({ hc: 9.9 })).toContain('CAD grave');
    expect(txt({ ph: 7.24 })).toContain('CAD moderada');
  });
  it('só um critério alterado → nota para confirmar cetonemia (β-hidroxibutirato ≥ 3,0)', () => {
    expect(txt({ ph: 7.28, hc: 22 })).toContain('β-hidroxibutirato ≥ 3,0 mmol/L');
    expect(txt()).not.toContain('Só um dos critérios gasométricos');
  });
  it('K < 3,5 suspende a insulina e não mostra o esquema de infusão', () => {
    const t = txt({ k: 3.1 });
    expect(t).toContain('Insulina suspensa');
    expect(t).not.toContain('Infusão 7,0 U/h');
  });
  it('via SC: 0,3 U/kg = 21,0 U, depois 0,2 U/kg = 14,0 U', () => {
    const t = txt({ via: 'sc' });
    expect(t).toContain('21,0 U');
    expect(t).toContain('14,0 U');
    expect(t).toContain('reavaliar via e dose');
  });
  it('manutenção: SF 0,45% só se a osmolalidade não cair; Na corrigido aparece no veredito (145 + 5,6 = 150,6)', () => {
    expect(txt({ na: 145 })).toContain('Na corrigido 150,6');
    expect(txt({ na: 145 })).toContain('SF 0,45% só se a osmolalidade não cair');
    expect(txt()).toContain('SF 0,45% só se a osmolalidade não cair');
  });
  it('diurese incerta → aguardar diurese antes do K⁺', () => expect(txt({ diu: 'nao' })).toContain('Aguardar diurese ≥ 50 mL/h'));
  it('fase resolvida → transição basal-bolus com 35–42 U/dia (0,5–0,6 U/kg) e 21 U se frágil', () => {
    const t = txt({ oral: 'sim' });
    expect(t).toContain('Transição');
    expect(t).toContain('35–42 U/dia');
    expect(t).toContain('≈ 21 U) se doença renal ou fragilidade');
  });
  it('glicemia < 200 → alerta de CAD euglicêmica; 250 não', () => {
    expect(txt({ gl: 199 })).toContain('euglicêmica');
    expect(txt({ gl: 250 })).not.toContain('euglicêmica');
  });
  it('resolução pelo consenso 2024: β-OHB < 0,6 e pH ≥ 7,3 ou HCO₃ ≥ 18; ânion gap fora', () => {
    expect(txt()).toContain('β-hidroxibutirato < 0,6 mmol/L');
    expect(txt()).toContain('Não usar o ânion gap como critério de resolução');
  });
  it('conferência com os guias HSL (KCl 16/04/2026; NaHCO₃ 25/07/2018; insulina 27/01/2026) e HIAE (KCl 24/08/2024; NaHCO₃ 25/06/2021; insulina 16/02/2026): preparo 1 U/mL, limites do KCl e do bicarbonato', () => {
    const t = txt();
    expect(t).toContain('Infusão 7,0 U/h');
    expect(t).toContain('a 1 U/mL, 7,0 mL/h');
    expect(t).toContain('100 U em 100 mL de SF 0,9% (1 U/mL');
    expect(t).toContain('sempre diluído, nunca em bolus');
    expect(t).toContain('≤ 10 mEq/100 mL e ≤ 10 mEq/h');
    expect(t).toContain('2,56 mEq/mL');
    expect(txt({ k: 5.2 })).not.toContain('2,56 mEq/mL');             /* K ≥ 5,0: não repõe → sem nota de KCl */
    expect(txt({ k: 3.1 })).toContain('2,56 mEq/mL');                 /* 10 mmol/h ainda é KCl diluído */
    expect(txt({ k: 3.1 })).not.toContain('1 U/mL');                  /* insulina suspensa → sem nota de preparo */
    expect(txt({ via: 'sc' })).not.toContain('1 U/mL');
    expect(txt()).not.toContain('catecolaminas');                     /* pH 7,28: sem bicarbonato */
    const b = txt({ hc: 9, ph: 6.9 });
    expect(b).toContain('8,4% = 1 mEq/mL');
    expect(b).toContain('Infundir em ≥ 2,0 h');                       /* 70 kg: 100 ÷ 70 = 1,4 h < 2 h */
    expect(b).toContain('máx. 1 mEq/kg/h');
    expect(b).toContain('catecolaminas');
    expect(txt({ hc: 9, ph: 6.9, peso: 40 })).toContain('Infundir em ≥ 2,5 h'); /* 40 kg: 100 ÷ 40 = 2,5 h */
    expect(computeCad(base).summary).not.toContain('1 U/mL');         /* resumo de prontuário inalterado */
  });
  it('resumo para prontuário', () => {
    expect(computeCad(base).summary).toBe('CAD leve (glicemia 450, pH 7,28, HCO₃ 16,0, K 4,2, Na 132 / corrigido 137,6). Peso 70 kg. Hidratação: SF 0,9% ou balanceado 500–1000 mL/h nas primeiras 2–4 h, depois corrigir o déficit em 24–48 h guiado por PA, FC, balanço e Na (SF 0,45% só se a osmolalidade não cair). K: 20–30 mmol/L de soro. Insulina: insulina regular EV 7,0 U/h (bolus 7,0 U se atraso no acesso). Bicarbonato: não indicado.');
    expect(computeCad({ ...base, ph: 6.85, k: 3.1, diu: 'nao', vol: 'choque' }).summary).toContain('K: repor 10 mmol/h, insulina suspensa (aguardar diurese). Insulina: insulina suspensa (K < 3,5). Bicarbonato: considerar (100 mmol a cada 2 h até pH > 7,0).');
    expect(computeCad({ ...base, ph: 7.35, hc: 22 }).summary).toBe('Sem critério gasométrico de CAD (glicemia 450, pH 7,35, HCO₃ 22,0).');
  });
});
