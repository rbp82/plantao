import { describe, it, expect } from 'vitest';
import '@/lib/calc';
import { computeFoco, FOCO, TAG } from './atb-foco.calc';

describe('ATB empírico por foco', () => {
  it('sete focos, cada linha com rótulo válido', () => {
    expect(Object.keys(FOCO)).toEqual(['pul', 'uri', 'abd', 'pele', 'snc', 'eco', 'desc']);
    Object.values(FOCO).forEach(([, rows]) => rows.forEach(([, , t]) => expect(TAG[t]).toBeDefined()));
  });
  it('urinário: ceftriaxona 1ª escolha; ciprofloxacino alternativa; ampicilina associar', () => {
    const m = computeFoco('uri')!;
    expect(m.label).toBe('Urinário');
    expect(m.rows[0]).toEqual(['ITU grave sem cateter', 'Ceftriaxona 2 g IV 1×/dia', 'P']);
    expect(TAG[m.rows[2][2]].label).toBe('Alternativa');
    expect(TAG[m.rows[3][2]].label).toBe('Associar');
  });
  it('resumo com “>” legível (SNC)', () => {
    const m = computeFoco('snc')!;
    expect(m.summary).toBe('SNC — meningite bacteriana: Comunitária, imunocompetente → Ceftriaxona 2 g IV 12/12 h + dexametasona 0,15 mg/kg 6/6 h; > 50 anos ou imunossuprimido → Ampicilina 2 g IV 4/4 h (Listeria); Nosocomial / pós-neurocirurgia → Meropenem + vancomicina.');
  });
  it('sem foco escolhido não há resumo', () => {
    expect(computeFoco(null)).toBeNull();
    expect(computeFoco('x')).toBeNull();
  });
});
