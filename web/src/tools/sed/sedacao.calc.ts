/* Sedação e analgesia contínua — listas de drogas (lógica pura, testada).
   Faixas de sedativos e opioides: SCCM PAD 2013 (Barr J et al. Crit Care Med 2013;41:263),
   tabela 3 (opioides) e tabela 6 (sedativos). */
import type { Drug } from '@/tools/infusion';

export type SedCat = 'sed' | 'opi' | 'bnm';
export const SED_CATS: { value: SedCat; label: string }[] = [
  { value: 'sed', label: 'Sedativos' },
  { value: 'opi', label: 'Opioides' },
  { value: 'bnm', label: 'BNM' },
];

export const SED: Drug[] = [
  {
    id: 'prop', name: 'Propofol', sub: 'Emulsão 10 mg/mL', amt: 1000, amtU: 'mg', vol: 100,
    dose: 'mcg/kg/min', alt: ['mg/kg/h', 'mg/h'],
    /* PAD 2013: manutenção 5–50 mcg/kg/min; PRIS com > 4 mg/kg/h (≈ 66,7 mcg/kg/min) por > 48 h */
    band: (d) => {
      d = Math.round(d * 1e9) / 1e9;
      return d < 5 ? { cls: 'warn', txt: 'Abaixo da faixa (5–50)' }
        : d <= 50 ? { cls: 'ok', txt: 'Na faixa (5–50)' }
        : d * 0.06 <= 4 ? { cls: 'warn', txt: 'Acima da faixa do PAD (5–50)' }
        : { cls: 'crit', txt: 'Acima de 4 mg/kg/h' };
    },
    note: 'Manutenção 5–50 mcg/kg/min (0,3–3 mg/kg/h).',
    alerts: (d) => (d * 0.06 > 4 ? [['crit', '<b>Risco de PRIS</b> acima de 4 mg/kg/h por mais de 48 h — monitorar triglicérides, CPK, lactato e acidose metabólica.']] : []),
  },
  {
    id: 'mid', name: 'Midazolam', sub: 'Benzodiazepínico', amt: 200, amtU: 'mg', vol: 200,
    dose: 'mg/kg/h', range: [0.02, 0.1], alt: ['mg/h'],
    note: 'Manutenção 0,02–0,1 mg/kg/h. Evitar como 1ª linha: delirium e acúmulo em disfunção renal/hepática.',
  },
  {
    id: 'dex', name: 'Dexmedetomidina', sub: 'Agonista α2 central', amt: 400, amtU: 'mcg', vol: 100,
    dose: 'mcg/kg/h', alt: ['mcg/h'],
    /* PAD 2013: 0,2–0,7 mcg/kg/h; até 1,5 conforme tolerância */
    band: (d) => {
      d = Math.round(d * 1e9) / 1e9;
      return d < 0.2 ? { cls: 'warn', txt: 'Abaixo da faixa (0,2–0,7)' }
        : d <= 0.7 ? { cls: 'ok', txt: 'Na faixa (0,2–0,7)' }
        : d <= 1.5 ? { cls: 'warn', txt: 'Acima de 0,7 (descrito até 1,5)' }
        : { cls: 'crit', txt: 'Acima de 1,5 mcg/kg/h' };
    },
    note: 'Manutenção 0,2–0,7 mcg/kg/h (até 1,5 conforme tolerância). Não deprime o drive respiratório. Monitorar bradicardia e hipotensão.',
  },
  {
    id: 'ket', name: 'Cetamina', sub: 'Antagonista NMDA', amt: 50, amtU: 'mg', vol: 100,
    dose: 'mg/kg/h', alt: ['mg/h'],
    band: (d) => {
      d = Math.round(d * 1e9) / 1e9;
      return d < 0.1 ? { cls: 'warn', txt: 'Abaixo da faixa analgésica (0,1)' }
        : d <= 0.5 ? { cls: 'ok', txt: 'Faixa analgésica (0,1–0,5)' }
        : d <= 2 ? { cls: 'info', txt: 'Faixa sedativa (0,5–2)' }
        : { cls: 'crit', txt: 'Acima de 2 mg/kg/h' };
    },
    note: 'Faixas usuais (não constam no PAD 2013). Broncodilatadora; preserva o drive respiratório.',
  },
];

export const OPI: Drug[] = [
  {
    id: 'fen', name: 'Fentanil', sub: 'Opioide sintético', amt: 5000, amtU: 'mcg', vol: 100,
    dose: 'mcg/kg/h', range: [0.7, 10], alt: ['mcg/h'],
    note: 'Infusão 0,7–10 mcg/kg/h; bolus 0,35–0,5 mcg/kg a cada 0,5–1 h. Meia-vida contexto-dependente.',
  },
  {
    id: 'mor', name: 'Morfina', sub: 'Metabólito ativo M6G · independe do peso', amt: 50, amtU: 'mg', vol: 50,
    dose: 'mg/h', range: [2, 30], alt: ['mg/kg/h'],
    note: 'Infusão 2–30 mg/h; bolus 2–4 mg a cada 1–2 h. Evitar em DRC grave (acúmulo de M6G). Libera histamina.',
  },
  {
    id: 'suf', name: 'Sufentanil', sub: '5–10× mais potente que fentanil', amt: 250, amtU: 'mcg', vol: 50,
    dose: 'mcg/kg/h', range: [0.1, 0.5], alt: ['mcg/h'],
    note: 'Faixa usual de UTI 0,1–0,5 mcg/kg/h (não consta no PAD 2013).',
  },
  {
    id: 'rem', name: 'Remifentanil', sub: 'Meia-vida 3–5 min · independe do rim', amt: 4000, amtU: 'mcg', vol: 80,
    dose: 'mcg/kg/min', alt: ['mcg/kg/h', 'mcg/min'],
    /* PAD 2013: manutenção 0,5–15 mcg/kg/h = 0,0083–0,25 mcg/kg/min */
    band: (d) => {
      const h = Math.round(d * 60 * 1e9) / 1e9;
      return h < 0.5 ? { cls: 'warn', txt: 'Abaixo da faixa (0,5–15 mcg/kg/h)' }
        : h <= 15 ? { cls: 'ok', txt: 'Na faixa (0,5–15 mcg/kg/h)' }
        : { cls: 'crit', txt: 'Acima de 15 mcg/kg/h (0,25 mcg/kg/min)' };
    },
    note: 'Manutenção 0,5–15 mcg/kg/h (0,008–0,25 mcg/kg/min). Ataque opcional 1,5 mcg/kg; bolus rápido pode causar rigidez torácica e bradicardia.',
  },
];

export const BNM: Drug[] = [
  {
    id: 'roc', name: 'Rocurônio', sub: 'BNM não despolarizante', amt: 250, amtU: 'mg', vol: 135,
    dose: 'mg/kg/h', range: [0.3, 0.6], alt: ['mg/h'],
    note: 'Intubação 0,6–1,2 mg/kg em bolus. Reversão: sugamadex.',
  },
  {
    id: 'cis', name: 'Cisatracúrio', sub: 'Eliminação de Hofmann', amt: 200, amtU: 'mg', vol: 100,
    dose: 'mcg/kg/min', range: [0.5, 10], alt: ['mg/h'],
    note: 'Preferido em SDRA grave e em disfunção renal/hepática.',
  },
  {
    id: 'vec', name: 'Vecurônio', sub: 'BNM não despolarizante', amtU: 'mg', ph: '40',
    dose: 'mg/kg/h', range: [0.05, 0.1], alt: ['mg/h'],
    note: 'Acumula em DRC e hepatopatia.',
  },
];

export const SED_BY_CAT: Record<SedCat, Drug[]> = { sed: SED, opi: OPI, bnm: BNM };
export const SED_ALL: Drug[] = [...SED, ...OPI, ...BNM];
