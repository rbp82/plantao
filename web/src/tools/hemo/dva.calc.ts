/* Drogas vasoativas — dados e faixas (AUDITORIA.md §2; docs/auditoria-2026-10/3). Sem React.
   Fontes: bulas FDA/DailyMed (nitroprussiato, nitroglicerina, dopamina Baxter, dobutamina, milrinona, vasopressina, noradrenalina);
   SSC 2021 (Evans L et al. Crit Care Med 2021;49:e1063, PMID 34605781): vasopressina associada com noradrenalina 0,25–0,5 mcg/kg/min;
   Auchet T et al. Ann Intensive Care 2017;7:43 (PMID 28425079): alta dose = > 1 mcg/kg/min. */
import type { Cls } from '@/lib/calc';
import type { Drug } from '@/tools/infusion';

const noraAlert = (d: number): [Cls, string][] => [
  /* SSC 2021, recomendação 38 (fraca): associar vasopressina em vez de escalar a nora; na prática 0,25–0,5 mcg/kg/min */
  ...(d >= 0.25 ? [['info', 'Noradrenalina ≥ 0,25 mcg/kg/min — SSC 2021 sugere associar vasopressina (habitual entre 0,25 e 0,5) em vez de escalar a dose.'] as [Cls, string]] : []),
  /* > 1 mcg/kg/min: alta dose (Auchet 2017) — rever estratégia */
  ...(d > 1 ? [['warn', 'Dose &gt; 1 mcg/kg/min (alta dose) — rever estratégia vasopressora, vasopressina e causa do choque.'] as [Cls, string]] : []),
];

export const DVA: Drug[] = [
  { id: 'nor', name: 'Noradrenalina', sub: 'Vasopressor · α1 > β1', amt: 16, amtU: 'mg', vol: 250, dose: 'mcg/kg/min', range: [0.01, 3], alt: ['mcg/min'], alerts: noraAlert },
  { id: 'norc', name: 'Noradrenalina concentrada', sub: 'Diluição travada · acesso central', amt: 20, amtU: 'mg', vol: 100, locked: true, dose: 'mcg/kg/min', range: [0.01, 3], alt: ['mcg/min'], note: '200 mcg/mL. Confirmar acesso venoso central antes de infundir.', alerts: noraAlert },
  { id: 'vaso', name: 'Vasopressina', sub: 'Agonista V1 · independe do peso', amt: 100, amtU: 'UI', vol: 250, dose: 'UI/min', range: [0.01, 0.04], alt: ['UI/h'] },
  { id: 'dob', name: 'Dobutamina', sub: 'Inotrópico · β1', amt: 250, amtU: 'mg', vol: 250, dose: 'mcg/kg/min', range: [2, 20], alt: ['mcg/min'] },
  {
    id: 'dopa', name: 'Dopamina', sub: 'Dopaminérgico · β · α (dose-dependente)', amt: 200, amtU: 'mg', vol: 250, dose: 'mcg/kg/min', alt: ['mcg/min'],
    /* bula (Baxter): 0,5–2 dopaminérgica · 2–10 β1 · 10–20 algum efeito α · > 20 α predominante */
    band: (d) => (d < 2 ? { cls: 'ok', txt: 'Faixa dopaminérgica (0,5–2)' } : d <= 10 ? { cls: 'warn', txt: 'Faixa β1 inotrópica (2–10)' } : d <= 20 ? { cls: 'crit', txt: 'β1 + efeito α (10–20)' } : { cls: 'crit', txt: 'α predominante (> 20)' }),
    note: 'Dose baixa não tem efeito protetor renal comprovado.',
  },
  {
    id: 'nitro', name: 'Nitroprussiato', sub: 'Vasodilatador misto', amt: 50, amtU: 'mg', vol: 250, dose: 'mcg/kg/min', range: [0.3, 10], alt: ['mcg/min'],
    note: 'Proteger da luz. Máximo 10 mcg/kg/min (no máximo, o tamponamento de cianeto se esgota em menos de 1 h). TFG < 30: média abaixo de 3 mcg/kg/min; anúrico: 1 mcg/kg/min.',
    alerts: (d) => (d > 2 ? [['warn', 'Acima de 2 mcg/kg/min há acúmulo de cianeto — usar pelo menor tempo possível, monitorar acidose metabólica.']] : []),
  },
  {
    id: 'ntg', name: 'Nitroglicerina', sub: 'Vasodilatador venoso · independe do peso', amt: 25, amtU: 'mg', vol: 250, dose: 'mcg/min', alt: ['mcg/kg/min'],
    band: (d) => (d < 5 ? { cls: 'warn', txt: 'Abaixo da dose inicial (5)' } : d <= 200 ? { cls: 'ok', txt: 'Faixa habitual (5–200)' } : { cls: 'warn', txt: 'Acima de 200 — sem máximo em bula; reavaliar' }),
    note: 'Iniciar 5 mcg/min; aumentar 5 mcg/min a cada 3–5 min; sem resposta em 20, passos de 10–20 mcg/min.',
  },
  { id: 'mil', name: 'Milrinona', sub: 'Inodilatador · inibidor PDE3', amt: 20, amtU: 'mg', vol: 250, dose: 'mcg/kg/min', range: [0.375, 0.75], alt: ['mcg/min'], note: 'Reduzir a dose na disfunção renal (eliminação renal).' },
];
