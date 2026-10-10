import { describe, it, expect } from 'vitest';
import '@/lib/calc';
import { computeSepse, noteText, DISF, QSOFA, SIRS } from './sepse.calc';

const F = (n: number) => Array<boolean>(n).fill(false);
const base = () => ({ q: F(QSOFA.length), s: F(SIRS.length), d: F(DISF.length), lac: NaN, pam: NaN, vp: false });

describe('triagem de sepse (grupo 7 — sepse)', () => {
  it('Lactato 2,0 com vasopressor NÃO é choque séptico (Sepsis-3 exige > 2)', () => {
    const m = computeSepse({ ...base(), lac: 2, vp: true });
    expect(noteText(m.choque)).not.toContain('Choque séptico');
  });
  it('Lactato 2,1 com vasopressor = choque séptico', () => {
    const m = computeSepse({ ...base(), lac: 2.1, vp: true });
    expect(noteText(m.choque)).toContain('Choque séptico');
    expect(m.choque?.cls).toBe('crit');
  });
  it('PAM < 65 + lactato > 2 sem vasopressor: hipotensão + hiperlactatemia (crit)', () => {
    const m = computeSepse({ ...base(), lac: 3, pam: 60 });
    expect(noteText(m.choque)).toContain('Hipotensão + lactato > 2');
    expect(m.choque?.cls).toBe('crit');
  });
  it('lactato ≥ 4 sem hipotensão: 30 mL/kg mesmo sem hipotensão', () => {
    expect(noteText(computeSepse({ ...base(), lac: 4 }).choque)).toContain('Lactato ≥ 4 mmol/L');
  });
  it('hiperlactatemia 2,1–3,9: repetir em 2–4 h; lactato 2 não gera nota', () => {
    expect(noteText(computeSepse({ ...base(), lac: 2.5 }).choque)).toContain('Hiperlactatemia (2,5 mmol/L)');
    expect(computeSepse({ ...base(), lac: 2 }).choque).toBeNull();
  });
  it('qSOFA: 2/3 = alto risco (crit); 1/3 = atenção; 0 = baixo risco', () => {
    expect(computeSepse({ ...base(), q: [true, true, false] }).qVerdict).toMatchObject({ cls: 'crit', kicker: 'qSOFA 2/3', title: 'Alto risco' });
    expect(computeSepse({ ...base(), q: [false, true, false] }).qVerdict).toMatchObject({ cls: 'warn', kicker: 'qSOFA 1/3' });
    expect(computeSepse(base()).qVerdict).toMatchObject({ cls: 'idle', kicker: 'qSOFA 0/3' });
  });
  it('SIRS 2/4 = suspeita (warn); 1 critério = info; qualquer disfunção = abrir protocolo (crit)', () => {
    const s2 = computeSepse({ ...base(), s: [true, true, false, false] });
    expect(s2.sirs?.cls).toBe('warn'); expect(noteText(s2.sirs)).toContain('SIRS 2/4');
    expect(computeSepse({ ...base(), s: [true, false, false, false] }).sirs?.cls).toBe('info');
    const d1 = computeSepse({ ...base(), s: [true, true, true, true], d: [true, ...F(7)] });
    expect(d1.sirs?.cls).toBe('crit'); expect(noteText(d1.sirs)).toContain('1 disfunção orgânica');
    const d2 = computeSepse({ ...base(), d: [true, true, ...F(6)] });
    expect(noteText(d2.sirs)).toContain('2 disfunções orgânicas');
  });
  it('resumo para o prontuário', () => {
    const m = computeSepse({ ...base(), q: [true, true, false], s: [true, false, false, false], lac: 3.2, pam: 58, vp: true });
    expect(m.summary).toBe('Triagem de sepse: qSOFA 2/3, SIRS 1/4, 0 disfunção(ões) orgânica(s), lactato 3,2 mmol/L, PAM 58 mmHg, em uso de vasopressor.');
  });
});
