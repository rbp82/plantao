/* ATB empírico por foco — tabela do app anterior. Lógica pura. */
import type { Cls } from '@/lib/calc';

export type Tag = 'P' | 'A' | 'X';
export const TAG: Record<Tag, { cls: Cls; label: string }> = {
  P: { cls: 'ok', label: '1ª escolha' },
  A: { cls: 'warn', label: 'Alternativa' },
  X: { cls: 'info', label: 'Associar' },
};
export type FocoRow = [string, string, Tag];
export const FOCO: Record<string, [string, FocoRow[]]> = {
  pul: ['Pulmonar (PAC / PAH)', [
    ['PAC leve-moderada', 'Amoxicilina-clavulanato', 'P'],
    ['PAC moderada-grave', 'Piperacilina-tazobactam + azitromicina', 'P'],
    ['PAC com risco de Pseudomonas', 'Piperacilina-tazobactam ou cefepime', 'P'],
    ['PAH / PAVM precoce', 'Ceftriaxona ou ampicilina-sulbactam', 'P'],
    ['PAH / PAVM tardia', 'Piperacilina-tazobactam + amicacina ± vancomicina', 'P'],
    ['Risco de MDR', 'Meropenem', 'A'],
  ]],
  uri: ['Urinário', [
    ['ITU grave sem cateter', 'Ceftriaxona 2 g IV 1×/dia', 'P'],
    ['Com cateter / suspeita de ESBL', 'Ertapenem 1 g IV 1×/dia', 'P'],
    ['Sem MDR local', 'Ciprofloxacino 400 mg IV 12/12 h', 'A'],
    ['Enterococo suspeito', 'Ampicilina 2 g IV 4/4 h', 'X'],
  ]],
  abd: ['Abdominal', [
    ['Peritonite comunitária', 'Piperacilina-tazobactam 4,5 g IV 6/6 h', 'P'],
    ['Peritonite hospitalar / pós-op.', 'Meropenem 1 g IV 8/8 h', 'P'],
    ['Colangite', 'Ceftriaxona + metronidazol', 'P'],
    ['Candidemia suspeita', 'Fluconazol ou equinocandina', 'X'],
  ]],
  pele: ['Pele e partes moles', [
    ['Celulite grave / erisipela', 'Oxacilina 2 g IV 4/4 h', 'P'],
    ['MRSA suspeito', 'Vancomicina 15–20 mg/kg IV 12/12 h', 'P'],
    ['Fasciíte necrosante', 'Piperacilina-tazobactam + clindamicina + vancomicina', 'P'],
    ['MRSA — alternativa', 'Linezolida 600 mg IV 12/12 h', 'A'],
  ]],
  snc: ['SNC — meningite bacteriana', [
    ['Comunitária, imunocompetente', 'Ceftriaxona 2 g IV 12/12 h + dexametasona 0,15 mg/kg 6/6 h', 'P'],
    ['> 50 anos ou imunossuprimido', 'Ampicilina 2 g IV 4/4 h (Listeria)', 'X'],
    ['Nosocomial / pós-neurocirurgia', 'Meropenem + vancomicina', 'P'],
  ]],
  eco: ['Endocardite', [
    ['Valva nativa — S. aureus', 'Oxacilina 2 g IV 4/4 h', 'P'],
    ['MRSA, valva nativa', 'Vancomicina', 'P'],
    ['Valva protética (estafilococo)', 'Vancomicina + rifampicina + gentamicina', 'P'],
    ['Streptococcus sensível à penicilina', 'Penicilina G cristalina ou ceftriaxona (± gentamicina)', 'P'],
    ['Enterococcus', 'Ampicilina + gentamicina ou ampicilina + ceftriaxona', 'P'],
  ]],
  desc: ['Foco desconhecido', [
    ['Comunitário, imunocompetente', 'Piperacilina-tazobactam 4,5 g IV 6/6 h', 'P'],
    ['Hospitalar / UTI (> 48 h)', 'Meropenem 1 g IV 8/8 h', 'P'],
    ['Risco de MRSA (cateter, diálise, pele)', 'Vancomicina 15–20 mg/kg IV 12/12 h', 'X'],
    ['Risco fúngico (transplante, ATB prolongado)', 'Micafungina 100 mg/dia', 'X'],
  ]],
};

export interface FocoModel { label: string; rows: FocoRow[]; summary: string }
export function computeFoco(k: string | null): FocoModel | null {
  if (!k || !FOCO[k]) return null;
  const [label, rows] = FOCO[k];
  return { label, rows, summary: `${label}: ` + rows.map(([s, a]) => `${s} → ${a}`).join('; ') + '.' };
}
