/* Triagem de sepse — qSOFA, SIRS + disfunção orgânica (ILAS), choque séptico (Sepsis-3). Lógica pura. */
import { fmt, type Cls } from '@/lib/calc';

export const QSOFA: { label: string; sub?: string }[] = [
  { label: 'FR ≥ 22 irpm' },
  { label: 'Alteração do nível de consciência', sub: 'Glasgow < 15' },
  { label: 'PAS ≤ 100 mmHg' },
];
export const SIRS: { label: string; sub?: string }[] = [
  { label: 'Temperatura > 37,8 °C ou < 35 °C' },
  { label: 'FC > 90 bpm' },
  { label: 'FR > 20 irpm ou PaCO₂ < 32 mmHg' },
  { label: 'Leucócitos > 12.000, < 4.000 ou > 10% bastões' },
];
export const DISF: { label: string; sub?: string }[] = [
  { label: 'Hipotensão', sub: 'PAS < 90 ou PAM < 65 mmHg, ou queda da PAS > 40 mmHg' },
  { label: 'Rebaixamento do nível de consciência' },
  { label: 'Disfunção respiratória', sub: 'SpO₂ < 90% necessitando O₂ ou PaO₂/FiO₂ < 300' },
  { label: 'Oligúria ou creatinina > 2 mg/dL', sub: 'diurese < 0,5 mL/kg/h' },
  { label: 'Bilirrubina > 2 mg/dL' },
  { label: 'Plaquetas < 100.000/mm³' },
  { label: 'Lactato acima do valor de referência' },
  { label: 'Coagulopatia', sub: 'INR > 1,5 ou TTPA > 60 s' },
];

export interface SepseInputs { q: boolean[]; s: boolean[]; d: boolean[]; lac: number; pam: number; vp: boolean }
/* nota com trecho em negrito opcional (`b`) seguido do texto `t` */
export interface SepseNote { cls: Cls; b?: string; t: string }
export interface SepseModel {
  q: number; s: number; d: number;
  qVerdict: { cls: Cls | 'idle'; kicker: string; title: string; desc: string };
  sirs: SepseNote | null;
  choque: SepseNote | null;
  summary: string;
}

export function computeSepse({ q: qs, s: ss, d: ds, lac, pam, vp }: SepseInputs): SepseModel {
  const q = qs.filter(Boolean).length;
  const qVerdict: SepseModel['qVerdict'] = q >= 2
    ? { cls: 'crit', kicker: `qSOFA ${q}/3`, title: 'Alto risco', desc: 'Iniciar protocolo de sepse.' }
    : q === 1 ? { cls: 'warn', kicker: 'qSOFA 1/3', title: 'Atenção', desc: 'Monitorar e reavaliar.' }
    : { cls: 'idle', kicker: 'qSOFA 0/3', title: 'Baixo risco imediato', desc: '' };
  const s = ss.filter(Boolean).length;
  const d = ds.filter(Boolean).length;
  let sirs: SepseNote | null = null;
  /* o app anterior concatenava "disfunção" + "ões" (→ "disfunçãoões"); aqui o plural correto */
  if (d >= 1) sirs = { cls: 'crit', b: `${d} ${d > 1 ? 'disfunções orgânicas' : 'disfunção orgânica'}`, t: ' — abrir protocolo de sepse imediatamente.' };
  else if (s >= 2) sirs = { cls: 'warn', b: `SIRS ${s}/4`, t: ' — suspeita de sepse. Avaliar disfunção orgânica e abrir protocolo.' };
  else if (s === 1) sirs = { cls: 'info', t: '1 critério de SIRS. Monitorar e reavaliar.' };
  const lacHi = lac > 2; /* Sepsis-3: lactato > 2 mmol/L */
  let choque: SepseNote | null = null;
  if (vp && lacHi) choque = { cls: 'crit', b: 'Choque séptico', t: ' (Sepsis-3) — vasopressor para PAM ≥ 65 + lactato > 2 mmol/L após volume adequado.' };
  else if (pam < 65 && lacHi) choque = { cls: 'crit', t: 'Hipotensão + lactato > 2 mmol/L. Se persistir após volume e exigir vasopressor, configura choque séptico.' };
  else if (lac >= 4) choque = { cls: 'warn', b: 'Lactato ≥ 4 mmol/L', t: ' — 30 mL/kg de cristaloide mesmo sem hipotensão.' };
  else if (lacHi) choque = { cls: 'warn', t: `Hiperlactatemia (${fmt(lac, 1)} mmol/L) — ressuscitação ativa. Repetir lactato em 2–4 h.` };
  const parts = [`qSOFA ${q}/3`, `SIRS ${s}/4`, `${d} disfunção(ões) orgânica(s)`];
  if (Number.isFinite(lac)) parts.push(`lactato ${fmt(lac, 1)} mmol/L`);
  if (Number.isFinite(pam)) parts.push(`PAM ${pam} mmHg`);
  if (vp) parts.push('em uso de vasopressor');
  return { q, s, d, qVerdict, sirs, choque, summary: 'Triagem de sepse: ' + parts.join(', ') + '.' };
}
/* texto plano de uma nota (para testes e resumo) */
export const noteText = (n: SepseNote | null) => (n ? (n.b || '') + n.t : '');
