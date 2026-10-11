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
  'Anfotericina B lipossomal': '3–5 mg/kg IV 24 h', 'Metronidazol': '500 mg IV/VO 8/8 h', 'SMX-TMP': 'TMP 8–10 mg/kg/dia IV em 6/6–12/12 h (PCP: 15–20 mg/kg/dia)', /* auditoria 10/2026: bula IV (Teva, rev. 4/2025); o app trazia 5 mg/kg/dia, abaixo da faixa da bula */
  'Polimixina B': '1,25–1,5 mg/kg IV 12/12 h (ataque 2–2,5 mg/kg)', 'Colistina': 'Ataque 300 mg CBA (≈ 9 MUI); 360 mg CBA/dia com ClCr ≥ 90',
  'Linezolida': '600 mg IV/VO 12/12 h', 'Daptomicina': '6–10 mg/kg IV 24 h', 'Ceftazidima-avibactam': '2,5 g IV 8/8 h, infusão em 2 h',
};

/* Colistimetato — consenso internacional (Tsuji BT et al. Pharmacotherapy 2019;39:10; PMID 30710469; PMC7437259), tabela 2, derivada de
   Nation RL et al. Clin Infect Dis 2017;64:565 (PMID 28011614): dose diária em mg de colistina base atividade (CBA) por ClCr, dividida 12/12 h.
   1 MUI ≈ 33 mg CBA. Conferida linha a linha na auditoria 10/2026 (≥ 90: 360 · 80–89: 340 · 70–79: 300 · 60–69: 275 · 50–59: 245 · 40–49: 220 ·
   30–39: 195 · 20–29: 175 · 10–19: 160 · 5–9: 145 · < 5: 130 mg CBA/dia). Ataque 300 mg CBA em 0,5–1 h; HD: 130 mg/dia + 40 mg (3 h) ou 50 mg (4 h); CRRT 440 mg/dia. */
export const COLISTIN: [number, number, number][] = [[90, 360, 10.9], [80, 340, 10.3], [70, 300, 9.0], [60, 275, 8.35], [50, 245, 7.4], [40, 220, 6.65], [30, 195, 5.9], [20, 175, 5.3], [10, 160, 4.85], [5, 145, 4.4], [0, 130, 3.95]];
export const colistin = (cl: number): string => {
  const [, mg, miu] = COLISTIN.find(([m]) => cl >= m) || COLISTIN[COLISTIN.length - 1];
  return `${mg} mg CBA/dia (${fmtN(miu)} MUI/dia) em 2 doses: ${fmtN(mg / 2)} mg CBA (${fmtN(Math.round(miu / 2 * 100) / 100)} MUI) 12/12 h. Ataque 300 mg CBA (≈ 9 MUI) em 0,5–1 h; 1ª manutenção 12–24 h depois. Hemodiálise intermitente: 130 mg CBA/dia + 40 mg (sessão de 3 h) ou 50 mg (4 h) com a dose pós-diálise. Hemodiálise contínua: 440 mg CBA/dia.`;
};

/* Vancomicina — segurança de infusão acrescentada na conferência com os guias (10/2026): Guia HSL (07/03/2025) ≤ 15 mg/min, 1 g em 60 min, 5 mg/mL (máx. 10), em bomba;
   Manual HIAE (09/06/2018) "infusão rápida (< 60 min) pode resultar em reação grave"; bula (Hospira, rev. 10/2021): ≥ 60 min e ≤ 10 mg/min, o que for mais longo; 5 mg/mL (10 mg/mL com restrição hídrica) */
const VANCO_INF = ' Infundir em ≥ 60 min e ≤ 10 mg/min (1 g em 1 h, 2 g em 2 h), diluída a 5 mg/mL (máx. 10 mg/mL), em bomba: infusão rápida causa síndrome do homem vermelho e hipotensão.';

export type Op = '>' | '≥';
export type Sev = 'ok' | 'leve' | 'mod' | 'grave' | 'evitar' | 'monit';
/* Faixas por ClCr. Cada faixa: [operador, limite, dose, classe, rótulo]
   '>' = estritamente maior · '≥' = maior ou igual. Fonte: bula FDA (DailyMed) salvo indicação. */
export type Band = [Op, number, string | ((cl: number) => string), Sev, string];
export const DB: Record<string, Band[]> = {
  /* Fontes conferidas na auditoria 10/2026 (DailyMed = fonte regulatória; setId e data de revisão da bula ao lado de cada droga) */
  'Ampicilina-sulbactam': [ /* bula Unasyn (Roerig/Pfizer), tabela 3 — DailyMed setId 12eeb72a-403d-41be-bae4-4cb930862884, rev. 11/2025: ≥ 30 6–8 h · 15–29 12 h · 5–14 24 h; < 5 e HD sem dado */
    ['≥', 30, '1,5–3 g IV 6/6–8/8 h', 'ok', 'Sem ajuste'],
    ['≥', 15, '1,5–3 g IV 12/12 h', 'leve', 'Ajuste leve'],
    ['≥', 5, '1,5–3 g IV 24/24 h', 'mod', 'Ajuste moderado'],
    ['≥', 0, 'ClCr < 5: sem recomendação na bula — discutir com a farmácia clínica. Hemodiálise: dar após a sessão.', 'grave', 'Sem dado em bula']],
  'Piperacilina-tazobactam': [ /* bula Zosyn (Baxter), tabela 1, coluna pneumonia nosocomial — DailyMed setId 8db6bd91-2106-4bfd-8cc8-38aaf1e18d17, rev. 5/2026 */
    ['>', 40, '4,5 g IV 6/6 h', 'ok', 'Sem ajuste'],
    ['≥', 20, '3,375 g IV 6/6 h', 'leve', 'Ajuste leve'],
    /* auditoria 10/2026: o suplemento de 0,75 g é só pós-hemodiálise; em DP a bula (Zosyn, rev. 5/2026) não dá suplemento */
    ['≥', 0, '2,25 g IV 6/6 h. Hemodiálise: 2,25 g IV 8/8 h + 0,75 g após cada hemodiálise. DP: 2,25 g IV 8/8 h, sem suplemento.', 'grave', 'Ajuste grave']],
  'Ceftriaxona': [ /* bula ceftriaxona (Hikma) — DailyMed setId 8351aa37-552d-471d-b293-c564dcb6ec29, rev. 12/2021: sem ajuste renal; disfunção hepática + renal: máx. 2 g/dia; não removida por HD/DP.
                      Guias 10/2026: máx. 4 g/dia e incompatibilidade com soluções com cálcio constam no Guia HSL (15/01/2026) e no Manual HIAE (03/04/2023); a bula traz os dois itens */
    ['≥', 0, '1–2 g IV 12–24 h — sem ajuste renal. Com disfunção hepática e renal graves associadas: máx. 2 g/dia. Não é removida por diálise. Máx. 4 g/dia. Não misturar nem infundir simultaneamente (via Y) com soluções que contêm cálcio.', 'ok', 'Sem ajuste']],
  'Cefepime': [ /* bula cefepime (Hospira), tabela 2, coluna 2 g 8/8 h — DailyMed setId e80c27e2-164d-4836-ba24-c160d75dc5d3, rev. 11/2024 */
    ['>', 60, '2 g IV 8/8 h', 'ok', 'Sem ajuste'],
    ['≥', 30, '2 g IV 12/12 h', 'leve', 'Ajuste leve'],
    ['≥', 11, '2 g IV 24/24 h. Sem ajuste há risco de neurotoxicidade (encefalopatia, estado de mal não convulsivo).', 'mod', 'Ajuste moderado'],
    /* auditoria 10/2026: a bula (Hospira, rev. 11/2024) prescreve em hemodiálise 1 g no 1º dia e depois 500 mg 24/24 h; 1 g 24/24 h só na neutropenia febril */
    ['≥', 0, '1 g IV 24/24 h. Hemodiálise: 1 g no 1º dia, depois 500 mg 24/24 h (neutropenia febril: 1 g 24/24 h), após a sessão. DP: 2 g 48/48 h. Risco de neurotoxicidade.', 'grave', 'Ajuste grave']],
  'Ceftazidima': [ /* bula Tazicef/Fortaz (Hospira), tabela 4 para 1 g; infecção grave (6 g/dia) → dose unitária +50% — DailyMed setId 40d48c5d-650e-461b-a67b-7e65772d1b92, rev. 1/2026 */
    ['>', 50, '1–2 g IV 8/8 h', 'ok', 'Sem ajuste'],
    ['>', 30, '1 g IV 12/12 h · infecção grave: 1,5 g 12/12 h', 'leve', 'Ajuste leve'],
    ['>', 15, '1 g IV 24/24 h · infecção grave: 1,5 g 24/24 h', 'mod', 'Ajuste moderado'],
    ['>', 5, '500 mg IV 24/24 h · infecção grave: 750 mg 24/24 h', 'grave', 'Ajuste grave'],
    ['≥', 0, '500 mg IV 48/48 h · infecção grave: 750 mg 48/48 h. Hemodiálise: 1 g de ataque e 1 g após cada sessão. DP: 1 g de ataque, depois 500 mg 24/24 h.', 'grave', 'Ajuste grave']],
  'Ceftazidima-avibactam': [ /* bula Avycaz (Allergan), tabela 3; infusões em 2 h — DailyMed setId d9c2803f-dc9c-4b19-b4a3-8303bc8c15fd, rev. 4/2025 */
    ['>', 50, '2,5 g IV 8/8 h', 'ok', 'Sem ajuste'],
    ['>', 30, '1,25 g IV 8/8 h', 'leve', 'Ajuste leve'],
    ['>', 15, '0,94 g IV 12/12 h', 'mod', 'Ajuste moderado'],
    ['>', 5, '0,94 g IV 24/24 h', 'grave', 'Ajuste grave'],
    ['≥', 0, '0,94 g IV 48/48 h. Em hemodiálise, dar após a sessão.', 'grave', 'Ajuste grave']],
  'Meropenem': [ /* bula meropenem (Hikma), tabela 1 — DailyMed setId 8a2a545e-b336-416a-be73-9e0a7ccf6177, rev. 9/2025. Dose adulta em bula: 0,5–1 g 8/8 h; 2 g 8/8 h é extrapolação para SNC (dose máxima dos ensaios) */
    ['>', 50, '1–2 g IV 8/8 h', 'ok', 'Sem ajuste'],
    ['≥', 26, '1–2 g IV 12/12 h (dose plena)', 'leve', 'Ajuste leve'],
    ['≥', 10, '0,5–1 g IV 12/12 h (metade da dose)', 'mod', 'Ajuste moderado'],
    ['≥', 0, '0,5–1 g IV 24/24 h (metade da dose). Diálise: a bula não tem dados suficientes — dar após a sessão.', 'grave', 'Ajuste grave']],
  'Ertapenem': [ /* bula Invanz (MSD) — DailyMed setId 33f3b99b-fa82-42e0-26bf-f49891ae3d22, rev. 2/2026 */
    ['>', 30, '1 g IV 24 h', 'ok', 'Sem ajuste'],
    ['≥', 0, '500 mg IV 24 h. Hemodiálise: se a dose foi dada até 6 h antes da sessão, suplemento de 150 mg após.', 'mod', 'Ajuste moderado']],
  'Imipenem': [ /* bula Primaxin IV (MSD), tabela 3, esquema 500 mg 6/6 h — DailyMed setId f41d8abd-7792-4918-1b93-bd83ea01955e, rev. 5/2022 */
    ['≥', 90, '500 mg IV 6/6 h', 'ok', 'Sem ajuste'],
    ['≥', 60, '400 mg IV 6/6 h', 'leve', 'Ajuste leve'],
    ['≥', 30, '300 mg IV 6/6 h', 'mod', 'Ajuste moderado'],
    ['≥', 15, '200 mg IV 6/6 h', 'grave', 'Ajuste grave'],
    ['≥', 0, 'Não usar, a menos que a hemodiálise seja iniciada em até 48 h (risco de convulsão). Em hemodiálise: 200 mg 6/6 h, após a sessão.', 'evitar', 'Evitar']],
  'Amicacina': [ /* SEM FONTE PRIMÁRIA: intervalos do nomograma de Hartford (gentamicina/tobramicina; Nicolau DP et al. AAC 1995;39:650, PMID 7793867) extrapolados para amicacina 15 mg/kg.
                    A bula (Sagent, DailyMed setId f260ff2a-76a0-4672-9516-91c344b67890, rev. 4/2026) só traz dose convencional (15 mg/kg/dia em 2–3 doses, máx. 1,5 g/dia) com ajuste por nível sérico.
                    Guias 10/2026: o Manual HIAE (17/02/2025, ref. UpToDate) reproduz exatamente estes intervalos para dose alta (15–20 mg/kg: ≥ 60 24 h · 40–59 36 h · 20–39 48 h · < 20 dose única e nível),
                    com cautela se ClCr < 40; o Guia HSL (29/12/2017) usa outra estrutura (≥ 50 sem ajuste; 10–50 a cada 24–72 h por nível; < 10 a cada 48–72 h) */
    ['≥', 60, '15 mg/kg IV 24/24 h. Vale < 5 mcg/mL.', 'ok', 'Sem ajuste'],
    ['≥', 40, '15 mg/kg IV 36/36 h. Nível sérico obrigatório.', 'leve', 'Intervalo 36 h'],
    ['≥', 20, '15 mg/kg IV 48/48 h. Nível sérico obrigatório.', 'mod', 'Intervalo 48 h'],
    ['≥', 0, 'Intervalo estendido não se aplica com ClCr < 20: dose convencional guiada por nível sérico. Hemodiálise: dar após a sessão.', 'grave', 'Guiar por nível']],
  'Gentamicina': [ /* Hartford: Nicolau DP et al. AAC 1995;39:650 (PMID 7793867): 7 mg/kg; ClCr ≥ 60 24 h · 40–59 36 h · 20–39 48 h; < 20 níveis seriados */
    ['≥', 60, '7 mg/kg IV 24/24 h. Vale < 1 mcg/mL.', 'ok', 'Sem ajuste'],
    ['≥', 40, '7 mg/kg IV 36/36 h. Nível sérico obrigatório.', 'leve', 'Intervalo 36 h'],
    ['≥', 20, '7 mg/kg IV 48/48 h. Nível sérico obrigatório.', 'mod', 'Intervalo 48 h'],
    ['≥', 0, 'Hartford não se aplica com ClCr < 20: dose convencional guiada por nível sérico. Hemodiálise: dar após a sessão.', 'grave', 'Guiar por nível']],
  'Vancomicina': [ /* Ataque 20–35 mg/kg (máx. 3 g) e AUC 400–600: Rybak MJ et al. ASHP/IDSA/PIDS/SIDP, Am J Health Syst Pharm 2020;77:835 (PMID 32191793).
                      Os intervalos por faixa de ClCr (12–24 h, 24–48 h) são esquema de partida SEM FONTE PRIMÁRIA ÚNICA (a bula — Hospira, DailyMed setId b01aaa02-8f1d-4b57-96a5-337503428af1, rev. 10/2021 — usa nomograma de Moellering, ~15 × ClCr mg/dia, e dose inicial ≥ 15 mg/kg) */
    ['≥', 50, 'Ataque 20–35 mg/kg (peso real, máx. 3 g); 15–20 mg/kg IV 8–12 h, ajustada por AUC 400–600 mg·h/L (MIC 1).' + VANCO_INF, 'monit', 'Guiar por AUC'],
    ['≥', 30, 'Ataque 20–35 mg/kg; 15 mg/kg IV 12–24 h, ajustada por AUC/nível.' + VANCO_INF, 'leve', 'Ajuste + nível'],
    ['≥', 15, 'Ataque 20–35 mg/kg; 15 mg/kg IV 24–48 h, com nível antes das doses.' + VANCO_INF, 'mod', 'Ajuste moderado'],
    ['≥', 0, 'Ataque 20–35 mg/kg; manutenção guiada exclusivamente por nível sérico. Hemodiálise: dose após a sessão.' + VANCO_INF, 'grave', 'Ajuste grave']],
  'Teicoplanina': [ /* SPC Targocid 200 mg (UK, emc product 2926), seção 4.2, rev. 11/12/2025: ataque 6 mg/kg 12/12 h × 3, manutenção 6 mg/kg/dia (400 mg ≈ 6 mg/kg para ~67 kg);
                       a partir do 4º dia, ClCr 30–80 metade e < 30 ou HD um terço; não removida por HD */
    ['>', 80, '400 mg IV 24 h após ataque (400 mg 12/12 h × 3)', 'ok', 'Sem ajuste'],
    ['≥', 30, 'Sem ajuste até o 4º dia; depois, metade da manutenção: 400 mg 48/48 h ou 200 mg 24/24 h.', 'leve', 'Ajuste leve'],
    ['≥', 0, 'Sem ajuste até o 4º dia; depois, 1/3 da manutenção: 400 mg 72/72 h ou ~133 mg 24/24 h. Hemodiálise: igual (não é removida).', 'mod', 'Ajuste moderado']],
  'Ciprofloxacino': [ /* bula ciprofloxacino IV (Sagent), tabela 4 — DailyMed setId f406e796-17d9-4465-b8a7-00d966a4ba74, rev. 1/2025: > 30 dose usual · 5–29 200–400 mg 18–24 h; HD/DP removem < 10% */
    ['>', 30, '400 mg IV 8–12 h', 'ok', 'Sem ajuste'],
    ['≥', 5, '200–400 mg IV 18–24 h. Hemodiálise/DP removem < 10%: dar após a sessão.', 'leve', 'Ajuste leve'],
    ['≥', 0, 'ClCr < 5: sem recomendação na bula — discutir com a farmácia clínica.', 'grave', 'Sem dado em bula']],
  'Levofloxacino': [ /* bula levofloxacino IV (Hospira), tabela 3 — DailyMed setId 5a1534af-aa1c-4f1d-ba9f-9415b14e1af2, rev. 9/2024 */
    ['≥', 50, '500–750 mg IV 24 h', 'ok', 'Sem ajuste'],
    ['≥', 20, 'Esquema 750 mg: 750 mg 48/48 h · esquema 500 mg: 500 mg de ataque → 250 mg 24/24 h', 'leve', 'Ajuste leve'],
    ['≥', 10, 'Esquema 750 mg: 750 mg → 500 mg 48/48 h · esquema 500 mg: 500 mg → 250 mg 48/48 h', 'mod', 'Ajuste moderado'],
    ['≥', 0, 'ClCr < 10 sem diálise: sem dado na bula. Hemodiálise/DP: 750 mg → 500 mg 48/48 h (ou 500 → 250 mg 48/48 h), sem suplemento após a sessão.', 'mod', 'Ajuste moderado']],
  'Fluconazol': [ /* bula fluconazol IV (Baxter) — DailyMed setId cd24a261-9c15-42b4-8040-89d2dbda174e, rev. 6/2024: > 50 100% · ≤ 50 50% · HD 100% após cada sessão; ataque não reduzido */
    ['>', 50, 'Dose plena (400–800 mg 24 h)', 'ok', 'Sem ajuste'],
    ['≥', 0, 'Ataque com dose plena; depois 50% da dose. Hemodiálise: 100% da dose após cada sessão; dose reduzida nos dias sem diálise.', 'leve', 'Reduzir 50%']],
  'Voriconazol IV': [ /* bula Vfend (Pfizer) — DailyMed setId ce3ef5cf-3087-4d92-9d94-9eb8287228db, rev. 2/2026: 6 mg/kg 12/12 h × 2 → 4 mg/kg 12/12 h; ClCr < 50: acúmulo de SBECD, preferir VO */
    ['≥', 50, '6 mg/kg IV 12/12 h × 2 → 4 mg/kg 12/12 h. Nível 1–5,5 mcg/mL.', 'ok', 'Sem ajuste'],
    ['≥', 0, 'Veículo SBECD acumula com ClCr < 50: preferir a via oral, salvo benefício que justifique IV (monitorar creatinina).', 'evitar', 'Preferir VO']],
  /* bula micafungina (Fresenius Kabi) — DailyMed setId dc5241be-4b85-4f04-8553-9819603373b8, rev. 4/2025: 100 mg candidemia · 150 mg esofágica; sem ajuste renal nem suplemento pós-HD */
  'Micafungina': [['≥', 0, '100 mg IV 24 h (candidemia) · 150 mg (esofágica). Sem ajuste em qualquer grau de DRC.', 'ok', 'Sem ajuste']],
  /* bula AmBisome (Astellas) — DailyMed setId f7be6506-4d20-401e-a0ff-02ad7c33158a, rev. 11/2024: 3–5 mg/kg/dia (infecção fúngica sistêmica); sem recomendação de ajuste renal.
     Guias 10/2026: diluição só em SG 5% (incompatível com SF 0,9%) e infusão em 1–2 h constam no Guia HSL (30/06/2026) e no Manual HIAE (19/06/2024); a bula diz o mesmo (infusão 120 min, 60 min se tolerada) */
  'Anfotericina B lipossomal': [['≥', 0, '3–5 mg/kg IV 24 h, sem ajuste de dose. Nefrotóxica — creatinina, K e Mg diários. Diluir só em SG 5% (incompatível com SF 0,9%; lavar o acesso com SG 5%); infundir em 1–2 h.', 'monit', 'Monitorar rim']],
  /* bula metronidazol IV (Baxter) — DailyMed setId 9d762edb-12ac-429d-b1f0-7af5d3b909d4, rev. 6/2025: 7,5 mg/kg 6/6 h (máx. 4 g/dia), metabólitos acumulam em DRC terminal, HD remove 40–65% (suplementar após a sessão).
     O esquema 500 mg 8/8 h é prática consolidada em infecção intra-abdominal — decisão institucional */
  'Metronidazol': [['≥', 0, '500 mg IV/VO 8/8 h — sem ajuste pela bula. Hemodiálise: dar após a sessão. Em DRC grave os metabólitos acumulam: vigiar neurotoxicidade.', 'ok', 'Sem ajuste']],
  'SMX-TMP': [ /* bula SMX-TMP IV (Teva), tabela 2 — DailyMed setId 640f5b0c-748d-4a68-a1de-59cc3e00ed49, rev. 4/2025: > 30 usual · 15–30 metade · < 15 não recomendado */
    ['>', 30, 'Dose habitual', 'ok', 'Sem ajuste'],
    ['≥', 15, '50% da dose habitual. Monitorar K⁺ e hemograma.', 'leve', 'Reduzir 50%'],
    ['≥', 0, 'Uso não recomendado pela bula. Se imprescindível, decidir com farmácia clínica/nefrologia e monitorar K⁺ e hemograma.', 'evitar', 'Não recomendado']],
  /* Polimixina B: consenso internacional (Tsuji BT et al. Pharmacotherapy 2019;39:10, PMID 30710469): ataque 2–2,5 mg/kg (peso real) em 1 h; 1,25–1,5 mg/kg 12/12 h em 1 h;
     sem ajuste por função renal nem por TRS (a bula FDA antiga recomenda reduzir — o consenso refuta). Bula FDA não localizada na busca DailyMed desta auditoria.
     Guias 10/2026: Guia HSL (27/01/2026) e Manual HIAE (26/03/2026) também não ajustam pela função renal (HIAE: "não adotaremos o ajuste da bula"), mas dosam em UI pela bula
     (15.000–25.000 UI/kg/dia 12/12 h = 0,75–1,25 mg/kg 12/12 h; HSL ataque 25.000 UI/kg, máx. 200 mg/dia; infusão 60–120 min) — a dose do consenso é mantida (decisão registrada) */
  'Polimixina B': [['≥', 0, 'Sem ajuste renal: 1,25–1,5 mg/kg IV 12/12 h, ataque 2–2,5 mg/kg; infundir em 1 h. Nefrotóxica — creatinina diária. Não é removida por diálise. Equivalência: 1 mg = 10.000 UI (a bula e os guias HSL/Einstein dosam 15.000–25.000 UI/kg/dia; HSL máx. 200 mg/dia).', 'monit', 'Monitorar rim']],
  'Colistina': [['≥', 0, colistin, 'monit', 'Dose por ClCr']],
  /* bula Zyvox (Pfizer) — DailyMed setId 6e70e63b-bfd5-478d-a8ee-8ba22c9efabd, rev. 6/2026: 600 mg 12/12 h sem ajuste; metabólitos acumulam em DRC; HD remove ~30% (dar após); plaquetopenia > 2 semanas.
     Guias 10/2026: HD após a sessão (Guia HSL 03/03/2017, ~30% dialisável) e hemograma semanal (Manual HIAE 11/12/2023; HSL: leucograma em risco de mielossupressão) — ambos na bula; o app só os trazia em comentário */
  'Linezolida': [['≥', 0, '600 mg IV/VO 12/12 h — sem ajuste. Hemodiálise: dar após a sessão (remove ~30%). Hemograma semanal; em DRC grave e uso > 14 dias: vigiar plaquetopenia e anemia.', 'ok', 'Sem ajuste']],
  'Daptomicina': [ /* bula Cubicin RF (MSD), tabela 3 — DailyMed setId 0b1a8885-2198-4a0e-8105-0c76c1cba6c2, rev. 3/2025: 4 mg/kg (pele) / 6 mg/kg (bacteremia) 24 h; ClCr < 30, HD e DP: mesma dose 48 h, após a HD.
                      8–10 mg/kg (dose habitual do app) é extrapolação das diretrizes de MRSA (Liu C et al. IDSA 2011, PMID 21208910) */
    /* guias 10/2026: CPK semanal consta no Manual HIAE (19/07/2025) e na bula Cubicin RF (mais frequente com DRC); o Guia HSL (27/02/2017) não traz monitorização */
    ['≥', 30, '6–10 mg/kg IV 24 h. CPK semanal.', 'ok', 'Sem ajuste'],
    ['≥', 0, 'Mesma dose por kg (4–6 mg/kg) a cada 48 h. Hemodiálise/DP: após a sessão nos dias de diálise. CPK semanal ou mais frequente (DRC eleva o risco de miopatia).', 'mod', 'Ajuste moderado']],
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
