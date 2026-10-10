/* RASS — Richmond Agitation-Sedation Scale (lógica pura).
   Descritores de Sessler CN et al. Am J Respir Crit Care Med 2002;166:1338. */
import type { Cls } from '@/lib/calc';

export interface RassRow {
  score: number;
  cls: Cls;
  title: string;
  desc: string;
  verdict: string;
  action: string;
}

export const RASS: RassRow[] = [
  { score: 4, cls: 'crit', title: 'Combativo', desc: 'Abertamente combativo, violento; perigo imediato para a equipe', verdict: 'Combativo — risco imediato', action: 'Sedação urgente e investigar a causa. Considerar bolus de midazolam ou propofol.' },
  { score: 3, cls: 'crit', title: 'Muito agitado', desc: 'Puxa ou remove tubos e cateteres; agressivo', verdict: 'Muito agitado — risco de autoextubação', action: 'Ajustar sedação. Verificar dor, delirium, retenção urinária.' },
  { score: 2, cls: 'warn', title: 'Agitado', desc: 'Movimentos frequentes sem propósito; briga com o ventilador', verdict: 'Agitado', action: 'Titular sedativo até a meta. Tratar dor. Considerar dexmedetomidina.' },
  { score: 1, cls: 'warn', title: 'Inquieto', desc: 'Ansioso, mas movimentos não agressivos nem vigorosos', verdict: 'Inquieto / ansioso', action: 'Analgesia adequada antes de escalar sedação. Avaliar o gatilho.' },
  { score: 0, cls: 'ok', title: 'Alerta e calmo', desc: 'Alerta e calmo', verdict: 'Alerta e calmo', action: 'Manter. Despertar diário (SAT). Fisioterapia motora.' },
  { score: -1, cls: 'ok', title: 'Sonolento', desc: 'Não totalmente alerta; desperta à voz com abertura ocular e contato visual ≥ 10 s', verdict: 'Sonolento — sedação leve (meta)', action: 'Dentro da meta de sedação leve. Avaliar redução da sedação.' },
  { score: -2, cls: 'ok', title: 'Sedação leve', desc: 'Desperta brevemente à voz, com contato visual < 10 s', verdict: 'Sedação leve (meta)', action: 'Dentro da meta de sedação leve. Manter SAT diário.' },
  { score: -3, cls: 'violet', title: 'Sedação moderada', desc: 'Movimento ou abertura ocular à voz, sem contato visual', verdict: 'Sedação moderada — acima da meta', action: 'Justificar a indicação. Despertar diário. Risco de delirium.' },
  { score: -4, cls: 'violet', title: 'Sedação profunda', desc: 'Sem resposta à voz; movimento ou abertura ocular ao estímulo físico', verdict: 'Sedação profunda — evitar sem indicação', action: 'Indicações: BNM, HIC, hipotermia, SDRA grave. Reavaliar diariamente.' },
  { score: -5, cls: 'crit', title: 'Não desperta', desc: 'Sem resposta à voz nem ao estímulo físico', verdict: 'Não desperta — sedação máxima', action: 'Indicação restrita. Confirmar necessidade e excluir causa neurológica.' },
];

/* "+4", "0", "−3" (sinal de menos tipográfico, como no app anterior) */
export const sgn = (n: number) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');

export const rassRow = (score: number | string | null) => (score === null ? null : RASS.find((r) => String(r.score) === String(score)) || null);

/* classe do veredito: o roxo (violet) vira info na manchete, como no app anterior */
export const rassVerdictCls = (r: RassRow): Cls => (r.cls === 'violet' ? 'info' : r.cls);

export const rassSummary = (r: RassRow | null) => (r ? `RASS ${sgn(r.score)} (${r.title.toLowerCase()}).` : '');
