import { describe, it, expect } from 'vitest';
import '@/lib/calc';
import { BPS, bpsSummary, computeBps } from './bps.calc';

describe('BPS — escore e corte > 5', () => {
  it('3 dimensões com 4 opções cada (1–4)', () => {
    expect(BPS.length).toBe(3);
    BPS.forEach((d) => expect(d.options.length).toBe(4));
    expect(BPS[2].options[2]).toBe('Briga com o ventilador');
  });
  it('nada marcado: idle "Marque as três dimensões"', () => {
    const r = computeBps([null, null, null]);
    expect(r.cls).toBe('idle');
    expect(r.total).toBeNull();
    expect(r.kicker).toBe('BPS · 3 a 12');
    expect(r.title).toBe('Marque as três dimensões');
    expect(bpsSummary(r)).toBe('');
  });
  it('parcial: "2 de 3 dimensões"', () => {
    const r = computeBps([1, null, 4]);
    expect(r.cls).toBe('idle');
    expect(r.done).toBe(2);
    expect(r.title).toBe('2 de 3 dimensões');
    expect(bpsSummary(r)).toBe('');
  });
  it('BPS 3 (mínimo) e 5 = dor controlada', () => {
    expect(computeBps([1, 1, 1])).toMatchObject({ total: 3, cls: 'ok', kicker: 'BPS 3 / 12', title: 'Dor controlada' });
    expect(computeBps([2, 2, 1])).toMatchObject({ total: 5, cls: 'ok' });
    expect(bpsSummary(computeBps([1, 1, 1]))).toBe('BPS 3/12.');
  });
  it('BPS 6 = dor significativa (> 5), sem aviso de escore alto', () => {
    const r = computeBps([2, 2, 2]);
    expect(r).toMatchObject({ total: 6, cls: 'crit', kicker: 'BPS 6 / 12', title: 'Dor significativa' });
    expect(r.desc).toBe('BPS > 5: tratar a dor (bolus de opioide e reavaliar), investigar a causa.');
  });
  it('BPS 8 e 12 = escore alto — reavaliar logo após a intervenção', () => {
    expect(computeBps([3, 3, 2]).desc).toContain('Escore alto — reavaliar logo após a intervenção');
    const r = computeBps([4, 4, 4]);
    expect(r.total).toBe(12);
    expect(r.desc).toContain('Escore alto');
    expect(bpsSummary(r)).toBe('BPS 12/12.');
  });
});
