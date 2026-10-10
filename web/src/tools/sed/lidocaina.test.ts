import { describe, it, expect } from 'vitest';
import { C } from '@/lib/calc';
import { computeInfusion, concOf } from '@/tools/infusion';
import { LIDO, LIDO_CTX, LIDO_CTX_NOTE, computeLidoBolus } from './lidocaina.calc';

const conc = concOf(LIDO.amt!, LIDO.amtU, LIDO.vol!);
const run = (mlh: number, peso = 70) => {
  const r = computeInfusion(LIDO, 'dose', mlh, conc, peso);
  if ('missing' in r) throw new Error('missing ' + r.missing);
  return r;
};

describe('Lidocaína — assertions do tests.js (grupo 9)', () => {
  const b = computeLidoBolus(70)!;
  it('70 kg: bolus 70–105 mg', () => { expect(b.b1).toBe('70–105'); });
  it('70 kg: repetir 35–53 mg', () => { expect(b.b2).toBe('35–53'); });
  it('70 kg: máximo 210 mg', () => { expect(b.max).toBe('210'); });
  it('2 g/500 mL a 30 mL/h = 2,00 mg/min', () => {
    const r = run(30);
    expect(C.fmtDose(r.dose)).toBe('2,00');
    expect(r.tag.cls).toBe('ok');
  });
});

describe('Lidocaína — bordas', () => {
  it('resumo para prontuário (70 kg)', () => {
    expect(computeLidoBolus(70)!.summary).toBe('Lidocaína (70 kg): bolus 70–105 mg IV; repetir 35–53 mg a cada 5–10 min; máx. 210 mg; manutenção 1–4 mg/min.');
  });
  it('sem peso (NaN, 0, negativo) → null', () => {
    expect(computeLidoBolus(NaN)).toBeNull();
    expect(computeLidoBolus(0)).toBeNull();
    expect(computeLidoBolus(-5)).toBeNull();
  });
  it('85 kg: bolus 85–128 mg (arredonda 127,5 para cima); máximo 255', () => {
    const b = computeLidoBolus(85)!;
    expect(b.b1).toBe('85–128');
    expect(b.b2).toBe('43–64');
    expect(b.max).toBe('255');
  });
  it('infusão: 4 mg/mL; 15 mL/h = 1 mg/min (limite inferior, na faixa); 75 mL/h = 5 mg/min → crit + alerta de toxicidade', () => {
    expect(conc).toBe(4000);
    expect(run(15).dose).toBeCloseTo(1, 9);
    expect(run(15).tag.cls).toBe('ok');
    const r = run(75);
    expect(r.dose).toBeCloseTo(5, 9);
    expect(r.tag.cls).toBe('crit');
    expect(r.alerts.some(([c, h]) => c === 'crit' && h.includes('toxicidade'))).toBe(true);
    expect(run(60).alerts.length).toBe(0);
  });
  it('infusão independe do peso (mg/min); alternativa mcg/kg/min só com peso', () => {
    const semPeso = computeInfusion(LIDO, 'dose', 30, conc, NaN);
    expect('missing' in semPeso).toBe(false);
    if (!('missing' in semPeso)) expect(semPeso.alt).toEqual([]);
    expect(run(30).alt).toEqual(['28,6 mcg/kg/min']);
  });
  it('contextos: PCR padrão (crit), TV estável (info), manutenção (warn)', () => {
    expect(LIDO_CTX.map((c) => c.value)).toEqual(['arrest', 'stable', 'infusion']);
    expect(LIDO_CTX_NOTE.arrest[0]).toBe('crit');
    expect(LIDO_CTX_NOTE.stable[0]).toBe('info');
    expect(LIDO_CTX_NOTE.infusion[0]).toBe('warn');
    expect(LIDO_CTX_NOTE.arrest[1]).toContain('após o 3º choque');
  });
});
