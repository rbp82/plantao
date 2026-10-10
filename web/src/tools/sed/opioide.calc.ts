/* Equivalência de opioides (lógica pura).
   Denominador comum: morfina IV em mg/h.
   Morfina IV 10 mg = morfina VO 30 mg = fentanil IV 100 mcg = sufentanil IV 10 mcg (10× fentanil) = remifentanil ≈ fentanil.
   Tramadol VO × 0,2 e codeína VO × 0,15 = morfina VO (fatores MME do CDC 2022). */
import { fmtDose } from '@/lib/calc';

export const K = { fen: 10, suf: 1, vo: 3, tra: 0.2, cod: 0.15 };

export interface EqSource { key: string; name: string; unit: string; toMorphine: (d: number) => number }
export const EQ: EqSource[] = [
  { key: 'fen_h', name: 'Fentanil IV', unit: 'mcg/h', toMorphine: (d) => d / K.fen },
  { key: 'fen_min', name: 'Fentanil IV', unit: 'mcg/min', toMorphine: (d) => (d * 60) / K.fen },
  { key: 'mor_h', name: 'Morfina IV', unit: 'mg/h', toMorphine: (d) => d },
  { key: 'mor_vo', name: 'Morfina VO', unit: 'mg/dia', toMorphine: (d) => d / 24 / K.vo },
  { key: 'suf_h', name: 'Sufentanil IV', unit: 'mcg/h', toMorphine: (d) => d / K.suf },
  { key: 'rem_min', name: 'Remifentanil IV', unit: 'mcg/min', toMorphine: (d) => (d * 60) / K.fen },
  { key: 'tra_vo', name: 'Tramadol VO', unit: 'mg/dia', toMorphine: (d) => (d * K.tra) / K.vo / 24 },
  { key: 'cod_vo', name: 'Codeína VO', unit: 'mg/dia', toMorphine: (d) => (d * K.cod) / K.vo / 24 },
];
export const eqSource = (key: string | null) => EQ.find((e) => e.key === key) || null;

export interface EqRow { name: string; v: number; unit: string; extra?: string }
export interface EqResult {
  src: EqSource;
  dose: number;
  m: number;      /* morfina IV mg/h */
  moVO: number;   /* morfina VO mg/dia */
  title: string;
  rows: EqRow[];
  summary: string;
}

export function computeOpioid(key: string | null, dose: number): EqResult | null {
  const e = eqSource(key);
  if (!e || !(dose > 0)) return null;
  const m = e.toMorphine(dose);
  const moVO = m * 24 * K.vo; /* morfina VO mg/dia */
  const rows: EqRow[] = [
    { name: 'Morfina IV', v: m, unit: 'mg/h', extra: `${fmtDose(m * 24)} mg/dia` },
    { name: 'Morfina VO', v: moVO, unit: 'mg/dia' },
    { name: 'Fentanil IV', v: m * K.fen, unit: 'mcg/h', extra: `${fmtDose((m * K.fen) / 60)} mcg/min` },
    { name: 'Sufentanil IV', v: m * K.suf, unit: 'mcg/h' },
    { name: 'Remifentanil IV', v: (m * K.fen) / 60, unit: 'mcg/min' },
    { name: 'Tramadol VO', v: moVO / K.tra, unit: 'mg/dia', extra: 'teto usual 400 mg/dia' },
    { name: 'Codeína VO', v: moVO / K.cod, unit: 'mg/dia', extra: 'teto usual 360 mg/dia' },
  ];
  return {
    src: e, dose, m, moVO, rows,
    title: `Equivalente a ${fmtDose(dose)} ${e.unit} de ${e.name.toLowerCase()}`,
    summary: `${fmtDose(dose)} ${e.unit} de ${e.name} ≈ morfina IV ${fmtDose(m)} mg/h ≈ fentanil ${fmtDose(m * K.fen)} mcg/h ≈ morfina VO ${fmtDose(moVO)} mg/dia (sem desconto de tolerância cruzada).`,
  };
}
