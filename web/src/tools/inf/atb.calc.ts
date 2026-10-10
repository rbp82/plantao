/* Ajuste renal de antimicrobianos — Cockcroft-Gault, CKD-EPI 2021, estadiamento KDIGO e dose por droga.
   Tabelas copiadas do app anterior (auditadas; fonte: bula FDA/DailyMed salvo indicação). Lógica pura. */
import { C, fmt, fmtN, type Cls } from '@/lib/calc';

export const CLS: Record<string, [string, string[]]> = {
  betalact: ['Betalactâmicos', ['Ampicilina-sulbactam', 'Piperacilina-tazobactam', 'Ceftriaxona', 'Cefepime', 'Ceftazidima', 'Ceftazidima-avibactam', 'Meropenem', 'Ertapenem', 'Imipenem']],
  amino: ['Aminoglicosídeos', ['Amicacina', 'Gentamicina']],
  glico: ['Glicopeptídeos', ['Vancomicina', 'Teicoplanina']],
  quino: ['Quinolonas', ['Ciprofloxacino', 'Levofloxacino']],
  fungi: ['Antifúngicos', ['Fluconazol', 'Voriconazol IV', 'Micafungina', 'Anfotericina B lipossomal']],
  outros: ['Outros', ['Metronidazol', 'SMX-TMP', 'Polimixina B', 'Colistina', 'Linezolida', 'Daptomicina']],
};
/* Dose habitual (função renal normal) — base das tabelas abaixo */
export const NORMAL: Record<string, string> = {
  'Ampicilina-sulbactam': '1,5–3 g IV 6/6 h', 'Piperacilina-tazobactam': '4,5 g IV 6/6 h (esquema de pneumonia hospitalar)', 'Ceftriaxona': '1–2 g IV 12–24 h',
  'Cefepime': '2 g IV 8/8 h', 'Ceftazidima': '1–2 g IV 8/8 h', 'Meropenem': '1–2 g IV 8/8 h', 'Ertapenem': '1 g IV 24 h',
  'Imipenem': '500 mg IV 6/6 h (ClCr ≥ 90)', 'Amicacina': '15 mg/kg IV 24 h (intervalo estendido)', 'Gentamicina': '7 mg/kg IV 24 h (Hartford)',
  'Vancomicina': 'Ataque 20–35 mg/kg; 15–20 mg/kg IV 8–12 h guiada por AUC', 'Teicoplanina': '400 mg IV 24 h após ataque (400 mg 12/12 h × 3)',
  'Ciprofloxacino': '400 mg IV 8–12 h', 'Levofloxacino': '500–750 mg IV 24 h', 'Fluconazol': '400–800 mg IV/VO 24 h',
  'Voriconazol IV': '6 mg/kg IV 12/12 h × 2 → 4 mg/kg IV 12/12 h', 'Micafungina': '100 mg IV 24 h (candidemia) · 150 mg (esofágica)',
  'Anfotericina B lipossomal': '3–5 mg/kg IV 24 h', 'Metronidazol': '500 mg IV/VO 8/8 h', 'SMX-TMP': 'TMP 5 mg/kg/dia em 6/6–8/8 h',
  'Polimixina B': '1,25–1,5 mg/kg IV 12/12 h (ataque 2–2,5 mg/kg)', 'Colistina': 'Ataque 300 mg CBA (≈ 9 MUI); 360 mg CBA/dia com ClCr ≥ 90',
  'Linezolida': '600 mg IV/VO 12/12 h', 'Daptomicina': '6–10 mg/kg IV 24 h', 'Ceftazidima-avibactam': '2,5 g IV 8/8 h, infusão em 2 h',
};

/* Colistimetato — consenso internacional (Tsuji BT et al. Pharmacotherapy 2019;39:10), tabela 2:
   dose diária em mg de colistina base atividade (CBA) por ClCr, dividida 12/12 h. 1 MUI ≈ 33 mg CBA. */
export const COLISTIN: [number, number, number][] = [[90, 360, 10.9], [80, 340, 10.3], [70, 300, 9.0], [60, 275, 8.35], [50, 245, 7.4], [40, 220, 6.65], [30, 195, 5.9], [20, 175, 5.3], [10, 160, 4.85], [5, 145, 4.4], [0, 130, 3.95]];
export const colistin = (cl: number): string => {
  const [, mg, miu] = COLISTIN.find(([m]) => cl >= m) || COLISTIN[COLISTIN.length - 1];
  return `${mg} mg CBA/dia (${fmtN(miu)} MUI/dia) em 2 doses: ${fmtN(mg / 2)} mg CBA (${fmtN(Math.round(miu / 2 * 100) / 100)} MUI) 12/12 h. Ataque 300 mg CBA (≈ 9 MUI) em 0,5–1 h; 1ª manutenção 12–24 h depois. Hemodiálise intermitente: 130 mg CBA/dia + 40 mg (sessão de 3 h) ou 50 mg (4 h) com a dose pós-diálise. Hemodiálise contínua: 440 mg CBA/dia.`;
};

export type Op = '>' | '≥';
export type Sev = 'ok' | 'leve' | 'mod' | 'grave' | 'evitar' | 'monit';
/* Faixas por ClCr. Cada faixa: [operador, limite, dose, classe, rótulo]
   '>' = estritamente maior · '≥' = maior ou igual. Fonte: bula FDA (DailyMed) salvo indicação. */
export type Band = [Op, number, string | ((cl: number) => string), Sev, string];
export const DB: Record<string, Band[]> = {
  'Ampicilina-sulbactam': [ /* bula Unasyn, tabela 3 */
    ['≥', 30, '1,5–3 g IV 6/6–8/8 h', 'ok', 'Sem ajuste'],
    ['≥', 15, '1,5–3 g IV 12/12 h', 'leve', 'Ajuste leve'],
    ['≥', 5, '1,5–3 g IV 24/24 h', 'mod', 'Ajuste moderado'],
    ['≥', 0, 'ClCr < 5: sem recomendação na bula — discutir com a farmácia clínica. Hemodiálise: dar após a sessão.', 'grave', 'Sem dado em bula']],
  'Piperacilina-tazobactam': [ /* bula Zosyn, pneumonia hospitalar */
    ['>', 40, '4,5 g IV 6/6 h', 'ok', 'Sem ajuste'],
    ['≥', 20, '3,375 g IV 6/6 h', 'leve', 'Ajuste leve'],
    ['≥', 0, '2,25 g IV 6/6 h. Hemodiálise ou DP: 2,25 g IV 8/8 h + 0,75 g após cada hemodiálise.', 'grave', 'Ajuste grave']],
  'Ceftriaxona': [
    ['≥', 0, '1–2 g IV 12–24 h — sem ajuste renal. Com disfunção hepática e renal graves associadas: máx. 2 g/dia. Não é removida por diálise.', 'ok', 'Sem ajuste']],
  'Cefepime': [ /* bula Maxipime, coluna 2 g 8/8 h */
    ['>', 60, '2 g IV 8/8 h', 'ok', 'Sem ajuste'],
    ['≥', 30, '2 g IV 12/12 h', 'leve', 'Ajuste leve'],
    ['≥', 11, '2 g IV 24/24 h. Sem ajuste há risco de neurotoxicidade (encefalopatia, estado de mal não convulsivo).', 'mod', 'Ajuste moderado'],
    ['≥', 0, '1 g IV 24/24 h. Hemodiálise: 1 g 24/24 h, após a sessão. DP: 2 g 48/48 h. Risco de neurotoxicidade.', 'grave', 'Ajuste grave']],
  'Ceftazidima': [ /* bula Fortaz: tabela para 1 g; infecção grave (6 g/dia) → dose unitária +50% */
    ['>', 50, '1–2 g IV 8/8 h', 'ok', 'Sem ajuste'],
    ['>', 30, '1 g IV 12/12 h · infecção grave: 1,5 g 12/12 h', 'leve', 'Ajuste leve'],
    ['>', 15, '1 g IV 24/24 h · infecção grave: 1,5 g 24/24 h', 'mod', 'Ajuste moderado'],
    ['>', 5, '500 mg IV 24/24 h · infecção grave: 750 mg 24/24 h', 'grave', 'Ajuste grave'],
    ['≥', 0, '500 mg IV 48/48 h · infecção grave: 750 mg 48/48 h. Hemodiálise: 1 g de ataque e 1 g após cada sessão. DP: 1 g de ataque, depois 500 mg 24/24 h.', 'grave', 'Ajuste grave']],
  'Ceftazidima-avibactam': [ /* bula Avycaz; infusões em 2 h */
    ['>', 50, '2,5 g IV 8/8 h', 'ok', 'Sem ajuste'],
    ['>', 30, '1,25 g IV 8/8 h', 'leve', 'Ajuste leve'],
    ['>', 15, '0,94 g IV 12/12 h', 'mod', 'Ajuste moderado'],
    ['>', 5, '0,94 g IV 24/24 h', 'grave', 'Ajuste grave'],
    ['≥', 0, '0,94 g IV 48/48 h. Em hemodiálise, dar após a sessão.', 'grave', 'Ajuste grave']],
  'Meropenem': [ /* bula Merrem */
    ['>', 50, '1–2 g IV 8/8 h', 'ok', 'Sem ajuste'],
    ['≥', 26, '1–2 g IV 12/12 h (dose plena)', 'leve', 'Ajuste leve'],
    ['≥', 10, '0,5–1 g IV 12/12 h (metade da dose)', 'mod', 'Ajuste moderado'],
    ['≥', 0, '0,5–1 g IV 24/24 h (metade da dose). Diálise: a bula não tem dados suficientes — dar após a sessão.', 'grave', 'Ajuste grave']],
  'Ertapenem': [ /* bula Invanz */
    ['>', 30, '1 g IV 24 h', 'ok', 'Sem ajuste'],
    ['≥', 0, '500 mg IV 24 h. Hemodiálise: se a dose foi dada até 6 h antes da sessão, suplemento de 150 mg após.', 'mod', 'Ajuste moderado']],
  'Imipenem': [ /* bula Primaxin 2022, tabela 3, esquema 500 mg 6/6 h */
    ['≥', 90, '500 mg IV 6/6 h', 'ok', 'Sem ajuste'],
    ['≥', 60, '400 mg IV 6/6 h', 'leve', 'Ajuste leve'],
    ['≥', 30, '300 mg IV 6/6 h', 'mod', 'Ajuste moderado'],
    ['≥', 15, '200 mg IV 6/6 h', 'grave', 'Ajuste grave'],
    ['≥', 0, 'Não usar, a menos que a hemodiálise seja iniciada em até 48 h (risco de convulsão). Em hemodiálise: 200 mg 6/6 h, após a sessão.', 'evitar', 'Evitar']],
  'Amicacina': [ /* intervalos do nomograma de Hartford extrapolados para 15 mg/kg */
    ['≥', 60, '15 mg/kg IV 24/24 h. Vale < 5 mcg/mL.', 'ok', 'Sem ajuste'],
    ['≥', 40, '15 mg/kg IV 36/36 h. Nível sérico obrigatório.', 'leve', 'Intervalo 36 h'],
    ['≥', 20, '15 mg/kg IV 48/48 h. Nível sérico obrigatório.', 'mod', 'Intervalo 48 h'],
    ['≥', 0, 'Intervalo estendido não se aplica com ClCr < 20: dose convencional guiada por nível sérico. Hemodiálise: dar após a sessão.', 'grave', 'Guiar por nível']],
  'Gentamicina': [ /* Hartford: Nicolau DP et al. AAC 1995;39:650 */
    ['≥', 60, '7 mg/kg IV 24/24 h. Vale < 1 mcg/mL.', 'ok', 'Sem ajuste'],
    ['≥', 40, '7 mg/kg IV 36/36 h. Nível sérico obrigatório.', 'leve', 'Intervalo 36 h'],
    ['≥', 20, '7 mg/kg IV 48/48 h. Nível sérico obrigatório.', 'mod', 'Intervalo 48 h'],
    ['≥', 0, 'Hartford não se aplica com ClCr < 20: dose convencional guiada por nível sérico. Hemodiálise: dar após a sessão.', 'grave', 'Guiar por nível']],
  'Vancomicina': [ /* ASHP/IDSA 2020 — faixas de partida, individualizar por AUC */
    ['≥', 50, 'Ataque 20–35 mg/kg (peso real, máx. 3 g); 15–20 mg/kg IV 8–12 h, ajustada por AUC 400–600 mg·h/L (MIC 1).', 'monit', 'Guiar por AUC'],
    ['≥', 30, 'Ataque 20–35 mg/kg; 15 mg/kg IV 12–24 h, ajustada por AUC/nível.', 'leve', 'Ajuste + nível'],
    ['≥', 15, 'Ataque 20–35 mg/kg; 15 mg/kg IV 24–48 h, com nível antes das doses.', 'mod', 'Ajuste moderado'],
    ['≥', 0, 'Ataque 20–35 mg/kg; manutenção guiada exclusivamente por nível sérico. Hemodiálise: dose após a sessão.', 'grave', 'Ajuste grave']],
  'Teicoplanina': [ /* SPC Targocid (UK), seção 4.2 */
    ['>', 80, '400 mg IV 24 h após ataque (400 mg 12/12 h × 3)', 'ok', 'Sem ajuste'],
    ['≥', 30, 'Sem ajuste até o 4º dia; depois, metade da manutenção: 400 mg 48/48 h ou 200 mg 24/24 h.', 'leve', 'Ajuste leve'],
    ['≥', 0, 'Sem ajuste até o 4º dia; depois, 1/3 da manutenção: 400 mg 72/72 h ou ~133 mg 24/24 h. Hemodiálise: igual (não é removida).', 'mod', 'Ajuste moderado']],
  'Ciprofloxacino': [ /* bula cipro IV */
    ['>', 30, '400 mg IV 8–12 h', 'ok', 'Sem ajuste'],
    ['≥', 5, '200–400 mg IV 18–24 h. Hemodiálise/DP removem < 10%: dar após a sessão.', 'leve', 'Ajuste leve'],
    ['≥', 0, 'ClCr < 5: sem recomendação na bula — discutir com a farmácia clínica.', 'grave', 'Sem dado em bula']],
  'Levofloxacino': [ /* bula levofloxacino IV */
    ['≥', 50, '500–750 mg IV 24 h', 'ok', 'Sem ajuste'],
    ['≥', 20, 'Esquema 750 mg: 750 mg 48/48 h · esquema 500 mg: 500 mg de ataque → 250 mg 24/24 h', 'leve', 'Ajuste leve'],
    ['≥', 10, 'Esquema 750 mg: 750 mg → 500 mg 48/48 h · esquema 500 mg: 500 mg → 250 mg 48/48 h', 'mod', 'Ajuste moderado'],
    ['≥', 0, 'ClCr < 10 sem diálise: sem dado na bula. Hemodiálise/DP: 750 mg → 500 mg 48/48 h (ou 500 → 250 mg 48/48 h), sem suplemento após a sessão.', 'mod', 'Ajuste moderado']],
  'Fluconazol': [
    ['>', 50, 'Dose plena (400–800 mg 24 h)', 'ok', 'Sem ajuste'],
    ['≥', 0, 'Ataque com dose plena; depois 50% da dose. Hemodiálise: 100% da dose após cada sessão; dose reduzida nos dias sem diálise.', 'leve', 'Reduzir 50%']],
  'Voriconazol IV': [
    ['≥', 50, '6 mg/kg IV 12/12 h × 2 → 4 mg/kg 12/12 h. Nível 1–5,5 mcg/mL.', 'ok', 'Sem ajuste'],
    ['≥', 0, 'Veículo SBECD acumula com ClCr < 50: preferir a via oral, salvo benefício que justifique IV (monitorar creatinina).', 'evitar', 'Preferir VO']],
  'Micafungina': [['≥', 0, '100 mg IV 24 h (candidemia) · 150 mg (esofágica). Sem ajuste em qualquer grau de DRC.', 'ok', 'Sem ajuste']],
  'Anfotericina B lipossomal': [['≥', 0, '3–5 mg/kg IV 24 h, sem ajuste de dose. Nefrotóxica — creatinina, K e Mg diários.', 'monit', 'Monitorar rim']],
  'Metronidazol': [['≥', 0, '500 mg IV/VO 8/8 h — sem ajuste pela bula. Hemodiálise: dar após a sessão. Em DRC grave os metabólitos acumulam: vigiar neurotoxicidade.', 'ok', 'Sem ajuste']],
  'SMX-TMP': [ /* bula Bactrim */
    ['>', 30, 'Dose habitual', 'ok', 'Sem ajuste'],
    ['≥', 15, '50% da dose habitual. Monitorar K⁺ e hemograma.', 'leve', 'Reduzir 50%'],
    ['≥', 0, 'Uso não recomendado pela bula. Se imprescindível, decidir com farmácia clínica/nefrologia e monitorar K⁺ e hemograma.', 'evitar', 'Não recomendado']],
  'Polimixina B': [['≥', 0, 'Sem ajuste renal: 1,25–1,5 mg/kg IV 12/12 h, ataque 2–2,5 mg/kg. Nefrotóxica — creatinina diária. Não é removida por diálise.', 'monit', 'Monitorar rim']],
  'Colistina': [['≥', 0, colistin, 'monit', 'Dose por ClCr']],
  'Linezolida': [['≥', 0, '600 mg IV/VO 12/12 h — sem ajuste. Em DRC grave e uso > 14 dias: vigiar plaquetopenia e anemia.', 'ok', 'Sem ajuste']],
  'Daptomicina': [ /* bula Cubicin RF */
    ['≥', 30, '6–10 mg/kg IV 24 h', 'ok', 'Sem ajuste'],
    ['≥', 0, 'Mesma dose por kg (4–6 mg/kg) a cada 48 h. Hemodiálise/DP: após a sessão nos dias de diálise.', 'mod', 'Ajuste moderado']],
};
export const CMAP: Record<Sev, Cls> = { ok: 'ok', leve: 'warn', mod: 'warn', grave: 'crit', evitar: 'violet', monit: 'info' };

/* estadiamento KDIGO pela TFG */
export function stage(t: number): [Cls, string] {
  if (!Number.isFinite(t)) return ['', '—'];
  if (t >= 90) return ['ok', 'G1 · normal'];
  if (t >= 60) return ['ok', 'G2 · redução leve'];
  if (t >= 45) return ['warn', 'G3a · leve-moderada'];
  if (t >= 30) return ['warn', 'G3b · moderada'];
  if (t >= 15) return ['crit', 'G4 · grave'];
  return ['crit', 'G5 · falência renal'];
}
/* cada faixa: [operador, limite, dose, classe, rótulo]; '>' = estritamente maior, '≥' = maior ou igual */
export const pick = (name: string, cl: number): Band => DB[name].find(([op, m]) => (op === '>' ? cl > m : cl >= m)) || DB[name][DB[name].length - 1];
/* dose (texto) para uma droga e um ClCr — usado na tela e nos testes */
export function atbDose(name: string, cl: number): { dose: string; cls: Sev; badge: string } {
  const b = pick(name, cl);
  return { dose: typeof b[2] === 'function' ? b[2](cl) : b[2], cls: b[3], badge: b[4] };
}

/* ---------- função renal do paciente ---------- */
export type Sex = 'M' | 'F' | '';
export interface RenalInputs { age: number; cr: number; wt: number; ht: number; sex: Sex }
export interface RenalModel {
  w: { kg: number; label: string };
  cg: number; ckd: number;
  sCg: [Cls, string]; sCk: [Cls, string];
  /* divergência > 20 mL/min entre as fórmulas (texto da nota) ou '' */
  diverg: string;
}
export function computeRenal({ age, cr, wt, ht, sex }: RenalInputs): RenalModel {
  const w = C.renal.cgWeight(wt, ht, sex || null);
  const cg = C.renal.cockcroft(age, w.kg, cr, sex || null);
  const ckd = C.renal.ckdepi(age, cr, sex || null);
  const diverg = C.ok(cg, ckd) && Math.abs(cg - ckd) > 20
    ? `Divergência de ${fmt(Math.abs(cg - ckd), 0)} mL/min entre as fórmulas. Para dose, prefira Cockcroft-Gault (usada nas bulas); CKD-EPI é melhor para estadiar DRC.` : '';
  return { w, cg, ckd, sCg: stage(cg), sCk: stage(ckd), diverg };
}

/* ---------- doses para as drogas selecionadas ---------- */
export interface AtbInputs extends RenalInputs { basis: 'cg' | 'ckd'; selected: string[] }
export interface DoseCard { name: string; dose: string; cls: Cls; badge: string; normal: string }
export interface AtbModel extends RenalModel {
  /* ClCr usado para as doses (NaN quando faltam dados) */
  cl: number; basisLbl: string;
  cards: DoseCard[];
  /* estado da área de resultados */
  state: 'none' | 'missing' | 'ok';
  summary: string;
}
export function computeAtb(i: AtbInputs): AtbModel {
  const r = computeRenal(i);
  const useCkd = i.basis === 'ckd';
  let cl = useCkd ? r.ckd : r.cg; let basisLbl = useCkd ? 'CKD-EPI' : 'Cockcroft-Gault';
  if (!Number.isFinite(cl) && Number.isFinite(r.ckd)) { cl = r.ckd; basisLbl = 'CKD-EPI (CG indisponível)'; }
  const sel = new Set(i.selected);
  if (!sel.size) return { ...r, cl, basisLbl, cards: [], state: 'none', summary: '' };
  if (!Number.isFinite(cl)) return { ...r, cl, basisLbl, cards: [], state: 'missing', summary: '' };
  const cards: DoseCard[] = [];
  const lines: string[] = [];
  Object.values(CLS).forEach(([, ds]) => ds.filter((d) => sel.has(d)).forEach((d) => {
    const { dose, cls, badge } = atbDose(d, cl);
    cards.push({ name: d, dose, cls: CMAP[cls], badge, normal: NORMAL[d] });
    lines.push(`${d}: ${dose}`);
  }));
  const { age, sex, wt, cr } = i;
  const pt = [Number.isFinite(age) && `${age} anos`, sex && (sex === 'M' ? 'masc.' : 'fem.'), Number.isFinite(wt) && `${wt} kg`, Number.isFinite(cr) && `Cr ${fmt(cr, 2)}`].filter(Boolean).join(', ');
  const summary = `Função renal (${pt}): Cockcroft-Gault ${Number.isFinite(r.cg) ? fmt(r.cg, 1) : '—'} mL/min (${r.w.label}); CKD-EPI 2021 ${Number.isFinite(r.ckd) ? fmt(r.ckd, 1) : '—'} mL/min/1,73m². Ajuste por ${basisLbl}:\n` + lines.join('\n');
  return { ...r, cl, basisLbl, cards, state: 'ok', summary };
}
