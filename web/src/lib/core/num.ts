/* Plantão — núcleo: utilidades numéricas e de texto (portado do núcleo do app anterior, auditado).
   Funções puras: leitura de números no padrão brasileiro, formatação pt-BR, faixas terapêuticas,
   FiO₂ e faixas de Berlim. Nada de DOM. */

export type Cls = 'ok' | 'warn' | 'crit' | 'info' | 'violet' | '';

export interface RangeTag { cls: Cls; txt: string }

/* converte texto digitado em número, no padrão brasileiro:
   "1,5" → 1,5 · "1.000" → 1000 · "1.000,5" → 1000,5 · "7.25" → 7,25 (ponto como decimal quando não é milhar) */
export function num(v: unknown): number {
  if (v === null || v === undefined) return NaN;
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  let s = String(v).trim().replace(/\s/g, '');
  if (s === '') return NaN;
  const hasDot = s.includes('.'), hasComma = s.includes(',');
  if (hasDot && hasComma) {
    if (!/^-?\d{1,3}(\.\d{3})+,\d+$/.test(s)) return NaN;
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    if ((s.match(/,/g) || []).length > 1) return NaN;
    s = s.replace(',', '.');
  } else if (hasDot) {
    if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    else if ((s.match(/\./g) || []).length > 1) return NaN;
  }
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export const ok = (...xs: number[]): boolean => xs.every((x) => Number.isFinite(x));

export function fmt(n: number, d = 1): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

/* casas decimais adaptativas para doses */
export function fmtDose(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  const d = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : a >= 0.01 ? 3 : 4;
  return fmt(v, d);
}

/* número sem zeros à direita (até 3 casas) */
export const fmtN = (n: number): string => (Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 3 }) : '—');

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: unknown): string => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

/* sem acentos e em minúsculas (busca e comparação) */
export const norm = (s: unknown): string => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* limites de plausibilidade dos dados do paciente (adulto).
   Tuplas mutáveis de propósito: os campos (`NumField lim`) recebem `[number, number]`; `as const` daria `readonly` e quebraria a passagem. */
export type LimKey = 'peso' | 'idade' | 'altura' | 'cr';
export const LIM: Readonly<Record<LimKey, [number, number]>> = { peso: [20, 350], idade: [18, 120], altura: [120, 230], cr: [0.1, 25] };

export const rangeLbl = (lo: number, hi: number, unit?: string): string =>
  `${String(lo).replace('.', ',')}–${String(hi).replace('.', ',')}${unit ? ' ' + unit : ''}`;

/* faixa terapêutica */
export function rangeTag(v: number, lo: number, hi: number): RangeTag {
  const r = rangeLbl(lo, hi);
  v = Math.round(v * 1e9) / 1e9; /* evita 0,04000000001 > 0,04 */
  if (v < lo) return { cls: 'warn', txt: `Abaixo da faixa (${r})` };
  if (v > hi) return { cls: 'crit', txt: `Acima da faixa (${r})` };
  return { cls: 'ok', txt: `Na faixa (${r})` };
}

/* FiO₂ digitada em % (21–100) ou fração (0,21–1) → fração; fora disso NaN */
export const fio2 = (v: number): number => (!Number.isFinite(v) ? NaN : v <= 1 ? (v >= 0.21 ? v : NaN) : v >= 21 && v <= 100 ? v / 100 : NaN);

/* PaO₂/FiO₂ — faixas de Berlim: leve 200 < P/F ≤ 300 · moderada 100 < P/F ≤ 200 · grave ≤ 100
   (ARDS Definition Task Force, Ranieri VM et al., JAMA 2012;307:2526; PMID 22797452; DOI 10.1001/jama.2012.5669;
   mantidas na definição global 2024, Matthay MA et al., AJRCCM 2024;209:37; PMID 37487152) */
export const berlin = (pf: number): [Cls, string] => (pf > 300 ? ['ok', 'Sem critério de SDRA (> 300)']
  : pf > 200 ? ['warn', 'Faixa de SDRA leve (201–300)']
  : pf > 100 ? ['crit', 'Faixa de SDRA moderada (101–200)']
  : ['crit', 'Faixa de SDRA grave (≤ 100)']);
