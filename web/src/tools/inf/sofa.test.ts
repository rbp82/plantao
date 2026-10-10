import { describe, it, expect } from 'vitest';
import '@/lib/calc';
import { computeSofa, SOFA } from './sofa.calc';

/* ordem: resp, coag, fig, cv, snc, ren */
describe('SOFA (grupo 7) — Ferreira FL et al. JAMA 2001', () => {
  it('SOFA 3+2+2+4+1+1 = 13', () => {
    expect(computeSofa([3, 2, 2, 4, 1, 1]).total).toBe(13);
  });
  it('SOFA 13 → mortalidade observada 95,2% (Ferreira, ≥ 12)', () => {
    expect(computeSofa([3, 2, 2, 4, 1, 1]).txt).toContain('95,2%');
  });
  it('SOFA 8 → 33,3%', () => {
    expect(computeSofa([0, 0, 0, 4, 1, 3]).txt).toContain('33,3%');
  });
  it('SOFA 5 → 20,2%', () => {
    expect(computeSofa([0, 0, 0, 4, 1, 0]).txt).toContain('20,2%');
  });
  it('faixas de mortalidade: 0–1 0% · 2–3 6,4% · 4–5 20,2% · 6–7 21,5% · 8–9 33,3% · 10–11 50,0% · ≥ 12 95,2%', () => {
    const t = (pts: number[]) => computeSofa(pts);
    expect(t([0, 0, 0, 0, 0, 0])).toMatchObject({ total: 0, cls: 'ok', txt: 'Mortalidade observada 0%' });
    expect(t([1, 0, 0, 0, 0, 0])).toMatchObject({ total: 1, cls: 'ok', txt: 'Mortalidade observada 0%' });
    expect(t([1, 1, 0, 0, 0, 0])).toMatchObject({ total: 2, cls: 'ok', txt: 'Mortalidade observada 6,4%' });
    expect(t([1, 1, 1, 0, 0, 0])).toMatchObject({ total: 3, cls: 'ok', txt: 'Mortalidade observada 6,4%' });
    expect(t([1, 1, 1, 1, 0, 0])).toMatchObject({ total: 4, cls: 'warn', txt: 'Mortalidade observada 20,2%' });
    expect(t([2, 2, 2, 0, 0, 0])).toMatchObject({ total: 6, cls: 'warn', txt: 'Mortalidade observada 21,5%' });
    expect(t([2, 2, 2, 1, 0, 0])).toMatchObject({ total: 7, cls: 'warn', txt: 'Mortalidade observada 21,5%' });
    expect(t([3, 3, 3, 0, 0, 0])).toMatchObject({ total: 9, cls: 'crit', txt: 'Mortalidade observada 33,3%' });
    expect(t([3, 3, 3, 1, 0, 0])).toMatchObject({ total: 10, cls: 'crit', txt: 'Mortalidade observada 50,0%' });
    expect(t([3, 3, 3, 2, 0, 0])).toMatchObject({ total: 11, cls: 'crit', txt: 'Mortalidade observada 50,0%' });
    expect(t([4, 4, 4, 0, 0, 0])).toMatchObject({ total: 12, cls: 'crit', txt: 'Mortalidade observada 95,2%' });
    expect(t([4, 4, 4, 4, 4, 4])).toMatchObject({ total: 24, pct: 100 });
  });
  it('itens não avaliados ficam em 0; resumo abrevia cada sistema', () => {
    expect(computeSofa([]).total).toBe(0);
    expect(SOFA.length).toBe(6);
    expect(computeSofa([3, 2, 2, 4, 1, 1]).summary).toBe('SOFA 13 (resp 3, coag 2, fíga 2, card 4, neur 1, rena 1).');
  });
});
