/* Plantão — PCR guiada (ACLS adulto): regras, estado derivado dos eventos, orientação caixa a caixa e relatório.
   Porte fiel de ../assets/js/pcr.js (lógica pura; a tela fica em src/screens/pcr/).
   O estado fica no cofre a cada evento ('pcrAtiva'); PCRs encerradas vão para 'pcrHist' (mesmas chaves e mesmo
   formato de registro do app anterior — relatórios gravados em aparelhos reais precisam continuar abrindo).
   Cronômetros calculados pelo relógio (Date.now), não por contagem de intervalos. */
import { store } from './core/vault';
import { fmt } from './core/num';

/* ---------------- regras: AHA 2025, Part 9 (Adult ALS), Figure 2 — ver PESQUISA-ACLS.md ----------------
   O guia segue as caixas do algoritmo oficial; nenhum intervalo foi inventado.
   Cada orientação aponta para uma referência (REF) com o trecho literal da diretriz. */
export const PROTO = {
  cicloMs: 120000,              // "CPR 2 minutes" entre checagens de ritmo
  epiMinMs: 3 * 60000,          // "Epinephrine … 1 milligram every 3 to 5 minutes"
  epiMaxMs: 5 * 60000,
  etco2Baixo: 10,               // "< 10 mm Hg … poor outcomes … ideally 20"
  etco2Salto: 10,               // "sudden increase greater than 10 mmHg may indicate ROSC"
  terminoMs: 20 * 60000,        // "after 20 minutes of ALS resuscitation" (intubado)
  lido1: [1, 1.5] as [number, number], lido2: [0.5, 0.75] as [number, number],
};

export const U = {
  ALG: 'https://cpr.heart.org/-/media/CPR-Files/CPR-Guidelines-Files/2025-Accessible/Algorithm-ACLS-CA-LngDscrp-250725-Ed.pdf',
  FIG: 'https://cpr.heart.org/-/media/CPR-Files/CPR-Guidelines-Files/2025-Algorithms/Algorithm-ACLS-CA-250527.pdf',
  ALS: 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-advanced-life-support',
  BLS: 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support',
  POST: 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/post-cardiac-arrest-care',
  SPEC: 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-and-pediatric-special-circumstances-of-resuscitation',
} as const;

/* referência: t = título; q = trecho literal (inglês); c = classe/nível; u = fonte; n = nota do app */
export interface PcrRef { t: string; q: string; c?: string; u: string; n?: string }
export const REF: Record<string, PcrRef> = {
  box1: { t: 'Caixa 1 — início', q: 'Start CPR • Begin bag-mask ventilation and give oxygen • Attach monitor/defibrillator. Is rhythm shockable?', u: U.ALG },
  box3: { t: 'Caixas 3, 5 e 7 — choque', q: 'Deliver shock.', u: U.ALG },
  box4: { t: 'Caixa 4', q: 'CPR 2 minutes • IV/IO access. Is rhythm shockable?', u: U.ALG },
  box6: { t: 'Caixa 6', q: 'CPR 2 minutes • Epinephrine every 3 to 5 minutes. • Consider advanced airway, capnography. Is rhythm shockable?', u: U.ALG },
  box8: { t: 'Caixa 8', q: 'CPR 2 minutes • Amiodarone or lidocaine. • Treat reversible causes.', u: U.ALG, n: 'A versão em texto não descreve a saída da caixa 8; na figura oficial (Figure 2), a seta volta ao losango "Rhythm shockable?" → caixa 5 → caixa 6 → caixa 7 → caixa 8.' },
  box9: { t: 'Caixa 9 — assistolia/AESP', q: 'Asystole/PEA. Give Epinephrine ASAP.', u: U.ALG },
  box10: { t: 'Caixa 10', q: 'CPR 2 minutes • IV/IO access. • Epinephrine every 3 to 5 minutes. • Consider advanced airway, capnography. Is rhythm shockable?', u: U.ALG },
  box11: { t: 'Caixa 11', q: 'CPR 2 minutes. • Treat reversible causes. Is rhythm shockable?', u: U.ALG },
  box12: { t: 'Caixa 12', q: 'If no signs of return of spontaneous circulation (ROSC), go to Box 10 • If ROSC, go to post–cardiac arrest care • Consider appropriateness of continued resuscitation', u: U.ALG },
  epi: { t: 'Adrenalina', q: 'Epinephrine IV/IO dose: 1 milligram every 3 to 5 minutes. — Operationally, administering epinephrine every second cycle of CPR, after the initial dose, meets this recommendation.', c: 'Barra lateral do algoritmo; Part 9 §10', u: U.ALG },
  amio: { t: 'Amiodarona / lidocaína', q: 'Amiodarone IV/IO dose: First dose: 300 milligram bolus. Second dose: 150 milligram. or Lidocaine IV/IO dose: First dose: 1 to 1.5 milligrams per kilogram. Second dose: 0.5 to 0.75 milligrams per kilogram.', c: 'Barra lateral do algoritmo; recomendação 2b, B-R', u: U.ALG, n: 'O momento da 2ª dose não é fixado em texto. O app sugere a 2ª dose na 2ª passagem pela caixa 8 (ciclo após o 5º choque), conforme o fluxo da figura oficial. Não há dose máxima de lidocaína nos textos AHA 2025.' },
  energia: { t: 'Energia do choque', q: 'Biphasic: Manufacturer recommendation (eg, initial dose of 120 to 200 Joules); if unknown, use maximum available. Second and subsequent doses should be equivalent, and higher doses may be considered. • Monophasic: 360 Joules', u: U.ALG },
  rcp: { t: 'RCP de alta qualidade', q: 'Push hard (at least 2 inches [5 cm]). • Push fast (100 to 120 per minute) and allow complete chest recoil. • Minimize interruptions in compressions. • Avoid excessive ventilation. • Change compressor every 2 minutes, or sooner if fatigued. • If no advanced airway, use 30 to 2 compression-ventilation ratio. • If advanced airway in place, give 1 breath every 6 seconds (10 breaths per minute) with continuous chest compressions. • Continuous waveform capnography - If ETCO2 is low or decreasing, reassess CPR quality.', u: U.ALG },
  troca: { t: 'Troca do compressor', q: 'it is reasonable to switch chest compressors approximately every 2 min (or after about 5 cycles of compressions and ventilation at a ratio of 30:2).', c: '2a, B-R', u: U.BLS },
  pulso: { t: 'Checagem de pulso', q: 'minimize the time taken to check for a pulse (no more than 10 s)', c: '1, C-LD', u: U.BLS },
  acesso: { t: 'Acesso vascular', q: 'Attempting IV access first … IO access if IV attempts are unsuccessful or not feasible.', c: 'IV: 1, A · IO: 2a, A', u: U.ALS },
  etco2: { t: 'Capnografia (ETCO₂)', q: 'An ETCO2 less than 10 mm Hg is generally associated with poor outcomes, whereas values above 10 mm Hg, and ideally above 20 mm Hg, are associated with increased rates of ROSC.', c: 'Part 9 §12', u: U.ALS },
  rce: { t: 'ETCO₂ e RCE', q: 'An abrupt increase in end-tidal CO2 may be used to detect ROSC … Data suggests that a sudden increase greater than 10 mmHg may indicate ROSC, although ROSC can still occur with ETCO2 increases of less than 10 mmHg.', c: '2b, B-NR', u: U.ALS },
  termino: { t: 'ETCO₂ e término dos esforços', q: 'In intubated adult patients, failure to achieve an end-tidal CO2 of greater than 10 mm Hg by waveform capnography after 20 minutes of ALS resuscitation may be considered as a component of a multimodal approach to decide when to end resuscitative efforts. — In nonintubated adult patients, a specific end-tidal CO2 cutoff value at any time during CPR should not be used as an indication to end resuscitative efforts.', c: '2b, C-LD · não intubado: 3 (dano), C-EO', u: U.ALS },
  ht: { t: 'Causas reversíveis', q: 'Hypovolemia, Hypoxia, Hydrogen ion (acidosis), Hypo-/hyperkalemia, Hypothermia, Tension pneumothorax, Tamponade (cardiac), Toxins, Thrombosis (pulmonary), Thrombosis (coronary)', u: U.ALG },
  post: { t: 'Cuidados pós-parada', q: 'minimum MAP of at least 65 mm Hg (1, B-R) · oxygen saturation of 90% to 98% (PaO2, 60–105 mm Hg) (2a, B-R) · PaCO2 … generally 35–45 mm Hg (1, B-R) · temperature between 32 °C and 37.5 °C (1, B-R) … for at least 36 hours (2a, B-R) · 12-lead ECG as soon as feasible (1, B-NR) · avoid glucose < 70 and > 180 mg/dL (2b, B-NR) · multimodal prognostic assessments at a minimum of 72 h after normothermia and discontinuation of sedatives (2a, B-NR)', u: U.POST },
  hiperk: { t: 'Hipercalemia (Table 3)', q: 'Adults | Standard dose | D50W or glucose 50%: 50 g IV bolus | 10 Units regular insulin | Administer insulin IV over 15–30 minutes. — The effectiveness of IV calcium administration … is not well established. (2b, C-LD) — sodium bicarbonate (2b, C-EO); insulin and glucose (2b, C-EO).', u: U.SPEC, n: 'Doses de cálcio e de bicarbonato para hipercalemia não constam na diretriz.' },
  tox: { t: 'Antídotos (Table 4)', q: 'Sodium bicarbonate | Sodium channel blockers, Cocaine, Local anesthetics | 50–150 mEq | 1–3 mEq/kg — Calcium chloride | β-blockers, CCBs | 2000 mg, 20 mL 100 mg/mL — Calcium gluconate | β-blockers, CCBs | 6000 mg, 60 mL 100 mg/mL — Naloxone | Opioids | 0.2–2 mg IV/IO/IM, 2–4 mg intranasal, repeat every 2–3 min as needed', u: U.SPEC },
  rotina: { t: 'Não usar de rotina', q: 'routine administration of sodium bicarbonate / calcium / magnesium is not recommended (3: No benefit, B-R) · vasopressin alone or in combination with epinephrine offers no advantage (3: No benefit, B-R) · high-dose epinephrine is not recommended (3: No benefit, B-R)', u: U.ALS },
  torsades: { t: 'Torsades de pointes', q: 'Magnesium may be considered for treatment of adults with recurrences of polymorphic ventricular tachycardia associated with a long QT interval (torsades de pointes).', c: '2b, C-LD', u: U.ALS, n: 'Dose não especificada na AHA 2025.' },
  dsed: { t: 'Troca de vetor / desfibrilação dupla sequencial', q: 'The usefulness of … double sequential defibrillation / vector change … for persistent VF/pVT after 3 or more consecutive shocks has not been established.', c: '2b, B-R', u: U.ALS },
  opioide: { t: 'Opioide', q: 'opioid antagonist administration may be reasonable for adults in cardiac arrest with suspected opioid overdose, provided that opioid antagonist (eg, naloxone) administration does not interfere with the delivery of standard resuscitation', c: '2b, B-NR', u: U.SPEC },
  tep: { t: 'TEP', q: 'Confirmed PE: thrombolysis, surgical or percutaneous embolectomy are reasonable (2a, B-NR); suspected PE: thrombolysis may be considered (2b, B-NR).', u: U.SPEC },
  mec: { t: 'Compressor mecânico', q: 'Routine use is not recommended (3: No benefit, B-R); may be considered in settings where delivery of high-quality manual compressions may be challenging or dangerous (2b, C-LD).', u: U.ALS },
  especiais: { t: 'Situações especiais', q: 'Pregnancy: manual left uterine displacement (1); resuscitative delivery within 5 minutes (1, B-NR). Hypothermia: defer further shocks and epinephrine until core temperature ≥ 30 °C (2b). PE: see thrombolysis recommendations.', u: U.SPEC },
};

export const HT: [string, string][] = [
  ['hipovolemia', 'Hipovolemia'], ['hipoxia', 'Hipóxia'], ['hidrogenio', 'H⁺ (acidose)'], ['hipohiperk', 'Hipo/hipercalemia'], ['hipotermia', 'Hipotermia'],
  ['pneumotorax', 'Pneumotórax hipertensivo'], ['tamponamento', 'Tamponamento cardíaco'], ['toxinas', 'Toxinas'], ['tep', 'Trombose pulmonar (TEP)'], ['iam', 'Trombose coronária'],
];
export type Rhythm = 'fv' | 'aesp' | 'assist' | 'rce';
export const RITMO: Record<Rhythm, string> = { fv: 'FV/TV sem pulso', aesp: 'AESP', assist: 'Assistolia', rce: 'RCE (pulso presente)' };

/* ---------------- dados (formato idêntico ao do app anterior) ---------------- */
export type PcrEventType = 'inicio' | 'ritmo' | 'choque' | 'epi' | 'amio' | 'lido' | 'acesso' | 'via' | 'etco2' | 'troca' | 'droga' | 'nota' | 'fim';
export type Airway = 'bvm' | 'sga' | 'iot';
export type Access = 'iv' | 'io' | 'cvc';
export type Outcome = 'rce' | 'obito' | 'inter';
export interface PcrEvent {
  t: number;
  type: PcrEventType;
  /* ritmo: Rhythm · choque/etco2/amio/lido: número (lido sem peso: null) · acesso/via/droga: código */
  v?: string | number | null;
  label?: string;
}
export interface PcrCase {
  id: string;
  start: number;
  end: number | null;
  patientId: string | null;
  patientName: string;
  weight: number | null;
  energia: number | null;
  events: PcrEvent[];
  hts: Record<string, boolean>;
  outcome?: Outcome;
}
/* o mínimo que derive/guide precisam (as asserções da bateria antiga montam casos parciais) */
export type PcrInput = Pick<PcrCase, 'start' | 'events'> & Partial<Omit<PcrCase, 'start' | 'events'>>;

export const active = () => store.get<PcrCase | null>('pcrAtiva', null);
export const saveActive = (c: PcrCase) => store.set('pcrAtiva', c);
export const hist = () => store.get<PcrCase[]>('pcrHist', []);
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const mmss = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
export const hm = (ts: number) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const hms = (ts: number) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
export const fmtN = (n: number, d = 0) => fmt(n, d);
export const dec = (x: number) => String(x).replace('.', ',');
/* o App não bloqueia por inatividade durante a PCR */
export const isBusy = () => !!active();

/* Estado derivado dos eventos, reproduzindo as setas do algoritmo (função pura, coberta por testes).
   box = caixa de RCP em que a equipe está (4, 6, 8, 10, 11) ou 1 (início) / 'rce'.
   awaitShock = ritmo chocável identificado e choque ainda não registrado (vai para a caixa 3, 5 ou 7). */
export type Box = number | 'rce';
export interface Derived {
  shocks: number;
  epi: number[];
  amio: number;
  lido: number;
  rhythm: Rhythm | null;
  firstRhythm: Rhythm | null;
  access: string | null;
  airway: string | null;
  etco2: { v: number; t: number } | null;
  etco2Prev: { v: number; t: number } | null;
  lastCheck: number;
  compressor: number;
  rearrests: number;
  box: Box;
  shockBox: number | null;
  awaitShock: boolean;
  pass8: number;
  /* caixa 9 (assistolia/AESP de entrada): adrenalina o mais rápido possível */
  box9: boolean;
  shockable: boolean;
  inArrest: boolean;
  sinceEpi: number | null;
  cycleLeft: number;
  elapsed: number;
}
export function derive(c: PcrInput, now: number): Derived {
  const s: Derived = {
    shocks: 0, epi: [], amio: 0, lido: 0, rhythm: null, firstRhythm: null, access: null, airway: null, etco2: null, etco2Prev: null,
    lastCheck: c.start, compressor: c.start, rearrests: 0, box: 1, shockBox: null, awaitShock: false, pass8: 0, box9: false,
    shockable: false, inArrest: true, sinceEpi: null, cycleLeft: 0, elapsed: 0,
  };
  const afterShockBox: Record<number, number> = { 3: 4, 5: 6, 7: 8 };
  const nextShockFrom = (b: Box) => (b === 1 ? 3 : b === 4 ? 5 : b === 6 ? 7 : 5); /* 8 → losango → 5; 10/11/12 → "Go to 5" */
  for (const e of c.events) {
    if (e.type === 'ritmo') {
      s.lastCheck = e.t;
      const v = e.v as Rhythm;
      if (v === 'rce') { s.rhythm = 'rce'; s.box = 'rce'; s.awaitShock = false; continue; }
      if (s.box === 'rce') { s.rearrests++; s.box = 1; } /* nova parada após RCE: recomeça pela caixa 1 */
      s.rhythm = v;
      if (!s.firstRhythm) s.firstRhythm = v;
      if (v === 'fv') { s.shockBox = nextShockFrom(s.box); s.awaitShock = true; }
      else { s.awaitShock = false; s.box = s.box === 10 ? 11 : 10; s.box9 = s.box === 10 && !s.epi.length; } /* 1→9/10; 4,6,8→12→10; 10→11; 11→12→10 */
    }
    if (e.type === 'choque') {
      if (!s.awaitShock) s.shockBox = nextShockFrom(s.box === 'rce' ? 1 : s.box);
      s.shocks++; s.box = afterShockBox[s.shockBox as number]; s.awaitShock = false; s.lastCheck = Math.max(s.lastCheck, e.t);
      if (s.box === 8) s.pass8++;
      if (!s.rhythm) { s.rhythm = 'fv'; s.firstRhythm = s.firstRhythm || 'fv'; }
    }
    if (e.type === 'epi') s.epi.push(e.t);
    if (e.type === 'amio') s.amio++;
    if (e.type === 'lido') s.lido++;
    if (e.type === 'acesso') s.access = e.v as string;
    if (e.type === 'via') s.airway = e.v as string;
    if (e.type === 'etco2') { s.etco2Prev = s.etco2; s.etco2 = { v: e.v as number, t: e.t }; }
    if (e.type === 'troca') s.compressor = e.t;
  }
  s.shockable = s.rhythm === 'fv';
  s.inArrest = s.rhythm !== 'rce';
  const lastEpi = s.epi[s.epi.length - 1];
  s.sinceEpi = lastEpi ? now - lastEpi : null;
  s.cycleLeft = PROTO.cicloMs - (now - s.lastCheck);
  s.elapsed = (c.end || now) - c.start;
  return s;
}

/* Próximo passo, caixa a caixa: { now: {txt, sub, sev, ref, act?, box}, todo: [{txt, sev, ref, act?}], s } (função pura, coberta por testes) */
export type Sev = 'ok' | 'warn' | 'crit' | 'info';
export type Act = 'choque' | 'epi' | 'aa' | 'acesso' | 'via' | 'ht' | 'etco2' | 'troca';
export interface GuideNow { box?: Box | null; txt: string; sub: string; sev: Sev; ref: string; act?: Act; check?: boolean }
export interface GuideTodo { txt: string; sev: Sev; ref: string; act?: Act }
export interface Guide { now: GuideNow; todo: GuideTodo[]; s: Derived }
export function guide(c: PcrInput, now: number): Guide {
  const s = derive(c, now);
  const todo: GuideTodo[] = [];
  const energia = c.energia ? `${c.energia} J` : 'energia do fabricante';
  if (s.box === 'rce') return { now: { txt: 'RCE: cuidados pós-parada', sub: 'Checklist abaixo. Se o pulso for perdido, registre o ritmo: o algoritmo recomeça.', sev: 'ok', ref: 'post' }, todo, s };
  let main: GuideNow;
  if (!s.rhythm) {
    main = { box: 1, txt: 'Iniciar RCP · BVM com O₂ · monitor/desfibrilador', sub: 'Compressões ≥ 5 cm, 100–120/min, retorno total, mínimo de interrupções; 30:2 sem via aérea avançada. Depois, checar o ritmo.', sev: 'crit', ref: 'box1' };
  } else if (s.awaitShock) {
    main = { box: s.shockBox, txt: `Choque (${energia}) e retomar a RCP imediatamente`, sub: 'Bifásico: recomendação do fabricante (ex.: 120–200 J); se desconhecida, a máxima disponível. Choques seguintes: equivalentes ou maiores. Monofásico: 360 J.', sev: 'crit', ref: 'energia', act: 'choque' };
  } else if (s.cycleLeft <= 0) {
    main = { box: s.box, txt: 'Checar ritmo e pulso (até 10 s)', sub: 'Registre o ritmo encontrado. Ritmo organizado: checar pulso.', sev: 'crit', ref: 'pulso', check: true };
  } else {
    const B: Record<number, string> = {
      4: 'RCP 2 min · acesso IV/IO',
      6: 'RCP 2 min · adrenalina a cada 3–5 min',
      8: 'RCP 2 min · amiodarona ou lidocaína',
      10: s.box9 ? 'Adrenalina o mais rápido possível · RCP 2 min' : 'RCP 2 min · acesso IV/IO · adrenalina a cada 3–5 min',
      11: 'RCP 2 min · tratar causas reversíveis',
    };
    /* subtítulo: lembrete da barra lateral "High-Quality CPR" do algoritmo */
    const rcp = (s.airway === 'iot' || s.airway === 'sga') ? '1 ventilação a cada 6 s com compressões contínuas' : '30:2 sem via aérea avançada';
    main = { box: s.box, txt: B[s.box as number], sub: `Compressões ≥ 5 cm, 100–120/min, retorno total, mínimo de interrupções; ${rcp}; trocar o compressor a cada 2 min.`, sev: 'warn', ref: s.box9 ? 'box9' : 'box' + s.box };
  }
  const box = s.box;
  /* adrenalina: caixas 6, 9 e 10 (≈ a cada 2 ciclos) */
  if ((box === 6 || box === 10) && !s.awaitShock) {
    if (!s.epi.length) todo.push({ txt: box === 10 ? 'Adrenalina 1 mg IV/IO o mais rápido possível' : 'Adrenalina 1 mg IV/IO', sev: 'crit', act: 'epi', ref: box === 10 ? 'box9' : 'epi' });
    else if ((s.sinceEpi as number) >= PROTO.epiMinMs) todo.push({ txt: `Adrenalina 1 mg — última há ${mmss(s.sinceEpi as number)} (a cada 3–5 min)`, sev: (s.sinceEpi as number) >= PROTO.epiMaxMs ? 'crit' : 'warn', act: 'epi', ref: 'epi' });
  }
  /* antiarrítmico: caixa 8 (1ª passagem: 1ª dose; 2ª passagem: 2ª dose) */
  if (box === 8 && !s.awaitShock) {
    const doses = s.amio + s.lido;
    if (doses === 0) todo.push({ txt: 'Amiodarona 300 mg IV/IO ou lidocaína 1–1,5 mg/kg', sev: 'crit', act: 'aa', ref: 'amio' });
    else if (doses === 1 && s.pass8 >= 2) todo.push({ txt: s.lido ? 'Lidocaína 0,5–0,75 mg/kg IV/IO (2ª dose)' : 'Amiodarona 150 mg IV/IO (2ª dose)', sev: 'warn', act: 'aa', ref: 'amio' });
  }
  if ((box === 4 || box === 10) && !s.access) todo.push({ txt: 'Acesso IV (IO se o IV falhar)', sev: 'warn', act: 'acesso', ref: 'acesso' });
  if ((box === 6 || box === 10) && !s.airway) todo.push({ txt: 'Considerar via aérea avançada e capnografia', sev: 'info', act: 'via', ref: box === 6 ? 'box6' : 'box10' });
  if ((box === 8 || box === 11) && !Object.values(c.hts || {}).some(Boolean)) todo.push({ txt: 'Tratar causas reversíveis (5 H e 5 T)', sev: 'info', act: 'ht', ref: 'ht' });
  if (s.airway === 'iot' || s.airway === 'sga') { if (!s.etco2) todo.push({ txt: 'Capnografia contínua: registrar ETCO₂', sev: 'info', act: 'etco2', ref: 'etco2' }); }
  if (s.etco2 && s.etco2Prev && s.etco2.v - s.etco2Prev.v > PROTO.etco2Salto) todo.push({ txt: `ETCO₂ subiu de ${s.etco2Prev.v} para ${s.etco2.v} mmHg (> 10): pode indicar RCE`, sev: 'warn', ref: 'rce' });
  if (s.etco2 && s.etco2.v < PROTO.etco2Baixo) {
    todo.push({ txt: `ETCO₂ ${s.etco2.v} mmHg (< 10): reavaliar a qualidade da RCP (mirar ≥ 10, idealmente ≥ 20)`, sev: 'warn', ref: 'etco2' });
    if (s.elapsed >= PROTO.terminoMs && s.airway === 'iot') todo.push({ txt: 'ETCO₂ ≤ 10 após 20 min, intubado: pode compor uma decisão multimodal de encerrar', sev: 'info', ref: 'termino' });
  }
  if (s.cycleLeft > 0 && s.cycleLeft <= 15000 && now - s.compressor >= PROTO.cicloMs - 15000) todo.push({ txt: 'Trocar o compressor na checagem de ritmo', sev: 'info', act: 'troca', ref: 'troca' });
  return { now: main, todo, s };
}

/* ---------------- relatório ---------------- */
export function outcomeTxt(c: Pick<PcrCase, 'outcome'>): string {
  const T: Record<Outcome, string> = { rce: 'RCE', obito: 'Óbito', inter: 'Interrompida/transferida' };
  return (c.outcome && T[c.outcome]) || 'em andamento';
}
export interface Report { text: string; s: Derived }
export function report(c: PcrInput): Report {
  /* só PCRs encerradas são relatadas; `end` nulo (não deveria ocorrer) é tratado como agora */
  const end = c.end ?? Date.now();
  const s = derive(c, end);
  const at = (t: number) => `${mmss(t - c.start)} (${hm(t)})`;
  const ofType = (ty: PcrEventType) => c.events.filter((e) => e.type === ty);
  const L: string[] = [];
  L.push(`PCR — ${c.patientName || 'paciente sem identificação'}`);
  L.push(`Início ${new Date(c.start).toLocaleDateString('pt-BR')} ${hms(c.start)} · término ${hms(end)} · duração ${mmss(end - c.start)}`);
  L.push(`Ritmo inicial: ${s.firstRhythm ? RITMO[s.firstRhythm] : 'não registrado'}`);
  L.push(`Choques: ${s.shocks}${s.shocks ? ' — ' + ofType('choque').map((e) => `${e.v} J em ${mmss(e.t - c.start)}`).join(', ') : ''}`);
  L.push(`Adrenalina 1 mg: ${s.epi.length} dose(s)${s.epi.length ? ' — ' + s.epi.map((t) => mmss(t - c.start)).join(', ') : ''}`);
  if (s.amio || s.lido) L.push(`Antiarrítmico: ${ofType('amio').concat(ofType('lido')).sort((a, b) => a.t - b.t).map((e) => `${e.label} em ${mmss(e.t - c.start)}`).join('; ')}`);
  const drugs = ofType('droga');
  if (drugs.length) L.push(`Outras drogas/ações: ${drugs.map((e) => `${e.label} em ${mmss(e.t - c.start)}`).join('; ')}`);
  const acc = ofType('acesso'), via = ofType('via'), et = ofType('etco2');
  if (acc.length) L.push(`Acesso: ${acc.map((e) => `${e.label} em ${at(e.t)}`).join('; ')}`);
  if (via.length) L.push(`Via aérea: ${via.map((e) => `${e.label} em ${at(e.t)}`).join('; ')}`);
  if (et.length) L.push(`ETCO₂: ${et.map((e) => `${e.v} mmHg em ${mmss(e.t - c.start)}`).join(', ')}`);
  const ht = HT.filter(([k]) => (c.hts || {})[k]).map(([, l]) => l);
  L.push(`Causas reversíveis consideradas: ${ht.length ? ht.join(', ') : 'nenhuma registrada'}`);
  const rce = c.events.filter((e) => e.type === 'ritmo' && e.v === 'rce');
  L.push(`Desfecho: ${outcomeTxt(c)}${c.outcome === 'rce' && rce.length ? ` — RCE em ${at(rce[rce.length - 1].t)}` : ''}${c.outcome === 'obito' ? ` — óbito às ${hms(end)}` : ''}${s.rearrests ? ` · ${s.rearrests} nova(s) parada(s) após RCE` : ''}`);
  const notes = ofType('nota');
  if (notes.length) L.push(`Anotações: ${notes.map((e) => `[${mmss(e.t - c.start)}] ${e.label}`).join(' ')}`);
  L.push('Conduta guiada pelo algoritmo de PCR em adultos — AHA 2025 (Part 9, Adult Advanced Life Support).');
  L.push('');
  L.push('Linha do tempo (min:s desde o início · horário):');
  c.events.forEach((e) => L.push(`${mmss(e.t - c.start)} · ${hms(e.t)} — ${e.label}`));
  return { text: L.join('\n'), s };
}
