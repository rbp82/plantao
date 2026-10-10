/* Plantão — PCR guiada (ACLS adulto), cronômetros, registro de eventos com um toque e relatório.
   O estado fica no cofre a cada evento: recarregar, bloquear a tela ou trocar de app não perde a PCR.
   Cronômetros calculados pelo relógio (Date.now), não por contagem de intervalos. */
(function () {
  'use strict';
  const C = window.Calc;
  const { $, $$, esc, store } = C;
  const I = C.icon;
  const P = C.Patients;

  /* ---------------- regras: AHA 2025, Part 9 (Adult ALS), Figure 2 — ver PESQUISA-ACLS.md ----------------
     O guia segue as caixas do algoritmo oficial; nenhum intervalo foi inventado.
     Cada orientação aponta para uma referência (REF) com o trecho literal da diretriz. */
  const PROTO = {
    cicloMs: 120000,              // "CPR 2 minutes" entre checagens de ritmo
    epiMinMs: 3 * 60000,          // "Epinephrine … 1 milligram every 3 to 5 minutes"
    epiMaxMs: 5 * 60000,
    etco2Baixo: 10,               // "< 10 mm Hg … poor outcomes … ideally 20"
    etco2Salto: 10,               // "sudden increase greater than 10 mmHg may indicate ROSC"
    terminoMs: 20 * 60000,        // "after 20 minutes of ALS resuscitation" (intubado)
    lido1: [1, 1.5], lido2: [0.5, 0.75],
  };

  const U = {
    ALG: 'https://cpr.heart.org/-/media/CPR-Files/CPR-Guidelines-Files/2025-Accessible/Algorithm-ACLS-CA-LngDscrp-250725-Ed.pdf',
    FIG: 'https://cpr.heart.org/-/media/CPR-Files/CPR-Guidelines-Files/2025-Algorithms/Algorithm-ACLS-CA-250527.pdf',
    ALS: 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-advanced-life-support',
    BLS: 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support',
    POST: 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/post-cardiac-arrest-care',
    SPEC: 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-and-pediatric-special-circumstances-of-resuscitation',
  };
  /* referência: t = título; q = trecho literal (inglês); c = classe/nível; u = fonte; n = nota do app */
  const REF = {
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

  const HT = [
    ['hipovolemia', 'Hipovolemia'], ['hipoxia', 'Hipóxia'], ['hidrogenio', 'H⁺ (acidose)'], ['hipohiperk', 'Hipo/hipercalemia'], ['hipotermia', 'Hipotermia'],
    ['pneumotorax', 'Pneumotórax hipertensivo'], ['tamponamento', 'Tamponamento cardíaco'], ['toxinas', 'Toxinas'], ['tep', 'Trombose pulmonar (TEP)'], ['iam', 'Trombose coronária'],
  ];
  const RITMO = { fv: 'FV/TV sem pulso', aesp: 'AESP', assist: 'Assistolia', rce: 'RCE (pulso presente)' };

  /* ---------------- dados ---------------- */
  const active = () => store.get('pcrAtiva', null);
  const saveActive = (c) => store.set('pcrAtiva', c);
  const hist = () => store.get('pcrHist', []);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const mmss = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const hm = (ts) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const hms = (ts) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fmtN = (n, d = 0) => C.fmt(n, d);
  const dec = (x) => String(x).replace('.', ',');

  /* Estado derivado dos eventos, reproduzindo as setas do algoritmo (função pura, coberta por testes).
     box = caixa de RCP em que a equipe está (4, 6, 8, 10, 11) ou 1 (início) / 'rce'.
     awaitShock = ritmo chocável identificado e choque ainda não registrado (vai para a caixa 3, 5 ou 7). */
  function derive(c, now) {
    const s = { shocks: 0, epi: [], amio: 0, lido: 0, rhythm: null, firstRhythm: null, access: null, airway: null, etco2: null, etco2Prev: null, lastCheck: c.start, compressor: c.start, rearrests: 0, box: 1, shockBox: null, awaitShock: false, pass8: 0 };
    const afterShockBox = { 3: 4, 5: 6, 7: 8 };
    const nextShockFrom = (b) => (b === 1 ? 3 : b === 4 ? 5 : b === 6 ? 7 : 5); /* 8 → losango → 5; 10/11/12 → "Go to 5" */
    for (const e of c.events) {
      if (e.type === 'ritmo') {
        s.lastCheck = e.t;
        if (e.v === 'rce') { s.rhythm = 'rce'; s.box = 'rce'; s.awaitShock = false; continue; }
        if (s.box === 'rce') { s.rearrests++; s.box = 1; } /* nova parada após RCE: recomeça pela caixa 1 */
        s.rhythm = e.v;
        if (!s.firstRhythm) s.firstRhythm = e.v;
        if (e.v === 'fv') { s.shockBox = nextShockFrom(s.box); s.awaitShock = true; }
        else { s.awaitShock = false; s.box = s.box === 10 ? 11 : 10; s.box9 = s.box === 10 && !s.epi.length; } /* 1→9/10; 4,6,8→12→10; 10→11; 11→12→10 */
      }
      if (e.type === 'choque') {
        if (!s.awaitShock) s.shockBox = nextShockFrom(s.box === 'rce' ? 1 : s.box);
        s.shocks++; s.box = afterShockBox[s.shockBox]; s.awaitShock = false; s.lastCheck = Math.max(s.lastCheck, e.t);
        if (s.box === 8) s.pass8++;
        if (!s.rhythm) { s.rhythm = 'fv'; s.firstRhythm = s.firstRhythm || 'fv'; }
      }
      if (e.type === 'epi') s.epi.push(e.t);
      if (e.type === 'amio') s.amio++;
      if (e.type === 'lido') s.lido++;
      if (e.type === 'acesso') s.access = e.v;
      if (e.type === 'via') s.airway = e.v;
      if (e.type === 'etco2') { s.etco2Prev = s.etco2; s.etco2 = { v: e.v, t: e.t }; }
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
  function guide(c, now) {
    const s = derive(c, now);
    const todo = [];
    const energia = c.energia ? `${c.energia} J` : 'energia do fabricante';
    if (s.box === 'rce') return { now: { txt: 'RCE: cuidados pós-parada', sub: 'Checklist abaixo. Se o pulso for perdido, registre o ritmo: o algoritmo recomeça.', sev: 'ok', ref: 'post' }, todo, s };
    let main;
    if (!s.rhythm) {
      main = { box: 1, txt: 'Iniciar RCP · BVM com O₂ · monitor/desfibrilador', sub: 'Compressões ≥ 5 cm, 100–120/min, retorno total, mínimo de interrupções; 30:2 sem via aérea avançada. Depois, checar o ritmo.', sev: 'crit', ref: 'box1' };
    } else if (s.awaitShock) {
      main = { box: s.shockBox, txt: `Choque (${energia}) e retomar a RCP imediatamente`, sub: 'Bifásico: recomendação do fabricante (ex.: 120–200 J); se desconhecida, a máxima disponível. Choques seguintes: equivalentes ou maiores. Monofásico: 360 J.', sev: 'crit', ref: 'energia', act: 'choque' };
    } else if (s.cycleLeft <= 0) {
      main = { box: s.box, txt: 'Checar ritmo e pulso (até 10 s)', sub: 'Registre o ritmo encontrado. Ritmo organizado: checar pulso.', sev: 'crit', ref: 'pulso', check: true };
    } else {
      const B = {
        4: 'RCP 2 min · acesso IV/IO',
        6: 'RCP 2 min · adrenalina a cada 3–5 min',
        8: 'RCP 2 min · amiodarona ou lidocaína',
        10: s.box9 ? 'Adrenalina o mais rápido possível · RCP 2 min' : 'RCP 2 min · acesso IV/IO · adrenalina a cada 3–5 min',
        11: 'RCP 2 min · tratar causas reversíveis',
      }[s.box];
      /* subtítulo: lembrete da barra lateral "High-Quality CPR" do algoritmo */
      const rcp = (s.airway === 'iot' || s.airway === 'sga') ? '1 ventilação a cada 6 s com compressões contínuas' : '30:2 sem via aérea avançada';
      main = { box: s.box, txt: B, sub: `Compressões ≥ 5 cm, 100–120/min, retorno total, mínimo de interrupções; ${rcp}; trocar o compressor a cada 2 min.`, sev: 'warn', ref: s.box9 ? 'box9' : 'box' + s.box };
    }
    const box = s.box;
    /* adrenalina: caixas 6, 9 e 10 (≈ a cada 2 ciclos) */
    if ((box === 6 || box === 10) && !s.awaitShock) {
      if (!s.epi.length) todo.push({ txt: box === 10 ? 'Adrenalina 1 mg IV/IO o mais rápido possível' : 'Adrenalina 1 mg IV/IO', sev: 'crit', act: 'epi', ref: box === 10 ? 'box9' : 'epi' });
      else if (s.sinceEpi >= PROTO.epiMinMs) todo.push({ txt: `Adrenalina 1 mg — última há ${mmss(s.sinceEpi)} (a cada 3–5 min)`, sev: s.sinceEpi >= PROTO.epiMaxMs ? 'crit' : 'warn', act: 'epi', ref: 'epi' });
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
  C.pcr = { derive, guide, PROTO, REF };

  /* ---------------- áudio, vibração, tela acesa ---------------- */
  let ac = null;
  function beep(freq = 880, dur = 0.12, n = 1) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      for (let i = 0; i < n; i++) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.frequency.value = freq; o.connect(g); g.connect(ac.destination);
        const t0 = ac.currentTime + i * (dur + 0.08);
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.start(t0); o.stop(t0 + dur + 0.02);
      }
    } catch (e) { /* sem áudio */ }
  }
  const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* */ } };
  let wake = null;
  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); }
      if (!on && wake) { await wake.release(); wake = null; }
    } catch (e) { wake = null; }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && active()) keepAwake(true); });
  /* não bloquear por inatividade durante uma PCR */
  C.isBusy = () => !!active();

  /* ---------------- tela inicial da PCR / histórico ---------------- */
  C.routes.pcr = function () {
    if (active()) return renderLive();
    const a = P.active();
    const h = hist();
    document.title = 'PCR — Plantão';
    const pg = C.mount(`
      <header class="bar" id="bar"><a class="icon-btn" href="#/" aria-label="Voltar">${I.back}</a>
        <div class="bar-title"><span class="k">ACLS adulto · AHA 2025</span><h1>Parada cardiorrespiratória</h1></div></header>
      <main class="tool pcr-home">
        <button type="button" class="pcr-start" id="pcrGo">${I.heart || ''}<b>Iniciar PCR</b><span>${a ? 'Paciente: ' + esc(P.name(a)) : 'Sem paciente selecionado'} · cronômetro começa agora</span></button>
        <p class="fld-h" style="margin:8px 4px 14px">O app guia o algoritmo, avisa a checagem de ritmo a cada 2 min e as doses de adrenalina, e registra cada ação com um toque para gerar o relatório. A tela fica acesa e o bloqueio automático é suspenso até encerrar.</p>
        ${h.length ? `<section class="card"><div class="card-h"><h2>Relatórios anteriores</h2><span class="aux">${h.length}</span></div><div class="list">${h.slice().reverse().slice(0, 10).map((c) => `<a class="row" href="#/pcr-relatorio?id=${c.id}"><span class="row-t"><b>${esc(c.patientName || 'Sem identificação')} · ${new Date(c.start).toLocaleDateString('pt-BR')} ${hm(c.start)}</b><span>${esc(outcomeTxt(c))} · ${mmss(c.end - c.start)}</span></span>${I.chev}</a>`).join('')}</div></section>` : ''}
        <p class="ref">Apoio à decisão baseado nas diretrizes AHA 2025 (adulto). Não substitui o julgamento da equipe nem os protocolos da instituição.</p>
      </main>`);
    $('#pcrGo', pg).addEventListener('click', () => {
      const p = P.active();
      const now = Date.now();
      const w = p && p.data ? C.num(p.data.peso) : NaN;
      saveActive({ id: uid(), start: now, patientId: p ? p.id : null, patientName: p ? P.name(p) : '', weight: Number.isFinite(w) ? w : null, energia: store.get('pcrEnergia', null), events: [{ t: now, type: 'inicio', label: 'Início da RCP' }], hts: {}, end: null });
      C.Vault.flush && C.Vault.flush().catch(() => {});
      beep(660, 0.1, 2);
      C.route();
    });
  };
  C.routes.pcr.nav = 'calc';

  /* ---------------- PCR em andamento ---------------- */
  let tick = null, lastCycleAlert = null, lastEpiAlert = null, metro = null;
  window.addEventListener('hashchange', () => { if (!/^#\/pcr$/.test(location.hash.split('?')[0])) { clearInterval(tick); tick = null; stopMetro(); document.body.classList.remove('pcr-on'); } });
  function stopMetro() { clearInterval(metro); metro = null; }

  function log(type, extra) {
    const c = active();
    if (!c) return;
    const now = Date.now();
    const e = Object.assign({ t: now, type }, extra);
    c.events.push(e);
    saveActive(c);
    C.Vault.flush && C.Vault.flush().catch(() => {});
    buzz(30);
    C.toast(`${mmss(now - c.start)} · ${e.label} registrado`);
    paint(true);
  }

  function renderLive() {
    const c = active();
    document.title = 'PCR em andamento — Plantão';
    keepAwake(true);
    C.navHidden(true);
    document.body.classList.add('pcr-on');
    const pg = C.mount(`
      <div class="pcr">
        <header class="pcr-top">
          <div class="pcr-clock"><span>Tempo total</span><b id="pcrTotal">00:00</b><small>início ${hm(c.start)}${c.patientName ? ' · ' + esc(c.patientName) : ''}</small></div>
          <div class="pcr-cycle" id="pcrCycle"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="19" class="trk"/><circle cx="22" cy="22" r="19" class="arc" id="pcrArc"/></svg><div><b id="pcrCycleT">2:00</b><span>ritmo</span></div></div>
        </header>
        <div class="pcr-chips" id="pcrChips"></div>
        <main class="pcr-main">
          <section class="pcr-now" id="pcrNow"></section>
          <div class="pcr-todo" id="pcrTodo"></div>
          <details class="card pcr-ht" id="pcrHt"><summary><b>Causas reversíveis — 5 H e 5 T</b><span class="aux" id="pcrHtN"></span>${I.down}</summary>
            <div class="checks">${HT.map(([k, l]) => C.check({ id: 'ht_' + k, label: l, checked: !!(c.hts || {})[k] })).join('')}</div></details>
          <details class="card pcr-ht"><summary><b>Situações especiais</b>${I.down}</summary>${C.steps([
            ['warn', '<b>Gestante:</b> desvio uterino manual para a esquerda (1); parto de ressuscitação em até 5 min (1)'],
            ['warn', '<b>Hipotermia:</b> adiar novos choques e adrenalina até temperatura central ≥ 30 °C (2b)'],
            ['warn', '<b>TEP:</b> confirmada → trombólise ou embolectomia (2a); suspeita → trombólise pode ser considerada (2b)'],
            ['info', '<b>Hipercalemia:</b> cálcio, bicarbonato e insulina + glicose com efetividade não estabelecida (2b); dose da Tabela 3: insulina regular 10 U IV em 15–30 min + glicose 50 g'],
            ['info', '<b>Bloqueadores de canal de sódio (ex.: tricíclicos), cocaína, anestésicos locais:</b> bicarbonato 50–150 mEq IV (dose adulta, Tabela 4)'],
            ['info', '<b>Opioide:</b> naloxona se não atrapalhar a RCP (2b)'],
            ['info', '<b>Torsades com QT longo:</b> magnésio pode ser considerado (2b; dose não especificada na AHA 2025)'],
          ])}<div class="pcr-srcs"><button type="button" class="pcr-src" data-ref="especiais">fonte: gestante, hipotermia</button><button type="button" class="pcr-src" data-ref="hiperk">hipercalemia</button><button type="button" class="pcr-src" data-ref="tox">antídotos</button><button type="button" class="pcr-src" data-ref="torsades">torsades</button><button type="button" class="pcr-src" data-ref="tep">TEP</button></div></details>
          <details class="card pcr-tl"><summary><b>Linha do tempo</b><span class="aux" id="pcrTlN"></span>${I.down}</summary><div id="pcrTl"></div></details>
          <div class="pcr-foot">
            <button type="button" class="btn" id="pcrUndo">Desfazer último</button>
            <button type="button" class="btn" id="pcrMetro" aria-pressed="false">Metrônomo 110</button>
            <button type="button" class="btn danger" id="pcrEnd">Encerrar</button>
          </div>
        </main>
        <!-- base fixa na zona do polegar: o que se usa a cada 2 minutos -->
        <nav class="pcr-dock" aria-label="Registro rápido">
          <div class="pcr-rg" role="group" aria-label="Ritmo na checagem">
            <button type="button" data-r="fv" class="r-fv">FV / TV<small>chocável</small></button>
            <button type="button" data-r="aesp">AESP</button>
            <button type="button" data-r="assist">Assistolia</button>
            <button type="button" data-r="rce" class="r-rce">RCE<small>pulso</small></button>
          </div>
          <div class="pcr-acts">
            <button type="button" data-a="choque" class="a-shock">Choque<small id="pcrJ">${c.energia ? c.energia + ' J' : 'definir J'}</small></button>
            <button type="button" data-a="epi" class="a-epi">Adrenalina<small>1 mg</small></button>
            <button type="button" data-a="aa">Antiarrítm.<small id="pcrAA">amiodarona</small></button>
            <button type="button" data-a="mais">Mais<small>acesso, via aérea…</small></button>
          </div>
        </nav>
      </div>`);

    pg.addEventListener('click', (e) => {
      const src = e.target.closest('[data-ref]');
      if (src) return refSheet(pg, src.dataset.ref);
      const r = e.target.closest('[data-r]');
      if (r) {
        if (r.dataset.r === 'rce') return confirmSheet(pg, 'Confirmar RCE?', 'Pulso central palpável / sinais de circulação. O cronômetro de ciclo para; se a parada voltar, registre o ritmo.', 'Confirmar RCE', () => { log('ritmo', { v: 'rce', label: 'RCE — retorno da circulação espontânea' }); beep(990, 0.1, 3); });
        return log('ritmo', { v: r.dataset.r, label: 'Ritmo: ' + RITMO[r.dataset.r] });
      }
      const a = e.target.closest('[data-a], [data-act]');
      if (!a) return;
      act(pg, a.dataset.a || a.dataset.act);
    });
    pg.addEventListener('change', (e) => {
      if (!e.target.id || !e.target.id.startsWith('ht_')) return;
      const cc = active();
      cc.hts = cc.hts || {};
      cc.hts[e.target.id.slice(3)] = e.target.checked;
      saveActive(cc);
      paint(true);
    });
    $('#pcrUndo', pg).addEventListener('click', () => {
      const cc = active();
      if (cc.events.length <= 1) return C.toast('Nada para desfazer');
      const e = cc.events.pop();
      saveActive(cc);
      C.toast('Desfeito: ' + e.label);
      paint(true);
    });
    $('#pcrMetro', pg).addEventListener('click', (e) => {
      if (metro) { stopMetro(); e.currentTarget.setAttribute('aria-pressed', 'false'); return; }
      metro = setInterval(() => beep(1200, 0.03), 60000 / 110);
      e.currentTarget.setAttribute('aria-pressed', 'true');
    });
    $('#pcrEnd', pg).addEventListener('click', () => endSheet(pg));
    lastCycleAlert = null;
    paint(true);
    clearInterval(tick);
    tick = setInterval(() => paint(false), 250);
  }

  function act(pg, a) {
    const c = active();
    const s = derive(c, Date.now());
    const w = c.weight;
    if (a === 'choque') {
      const doShock = (j) => log('choque', { v: j, label: `Choque ${j} J (${s.shocks + 1}º)` });
      if (c.energia) return doShock(c.energia);
      /* 1º choque: a energia é a do fabricante do aparelho; fica salva para os próximos */
      return energySheet(pg, (j) => doShock(j));
    }
    if (a === 'epi') return log('epi', { label: `Adrenalina 1 mg IV/IO (${s.epi.length + 1}ª dose)` });
    if (a === 'ht') { const d = $('#pcrHt', pg); d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (a === 'troca') return log('troca', { label: 'Troca do compressor' });
    if (a === 'aa') {
      const amioNext = s.amio === 0 ? 300 : 150;
      const lido = s.lido === 0 ? PROTO.lido1 : PROTO.lido2;
      const mgkg = `${dec(lido[0])}–${dec(lido[1])} mg/kg`;
      const lidoMg = w ? `${fmtN(lido[0] * w)}–${fmtN(lido[1] * w)} mg` : mgkg;
      return pick(pg, 'Amiodarona ou lidocaína (barra lateral do algoritmo)', [
        ['amio', `Amiodarona ${amioNext} mg IV/IO`, s.amio === 0 ? '1ª dose: 300 mg em bolus' : s.amio === 1 ? '2ª dose: 150 mg' : 'as 2 doses do algoritmo já foram dadas', s.amio >= 2],
        ['lido', `Lidocaína ${lidoMg} IV/IO`, `${s.lido === 0 ? '1ª dose' : s.lido === 1 ? '2ª dose' : 'as 2 doses do algoritmo já foram dadas'}: ${mgkg}${w ? ' · ' + fmtN(w) + ' kg' : ' — informe o peso no paciente'}`, s.lido >= 2],
      ], (k) => {
        if (k === 'amio') log('amio', { v: amioNext, label: `Amiodarona ${amioNext} mg IV/IO` });
        else log('lido', { v: w ? Math.round(lido[0] * w) : null, label: `Lidocaína ${lidoMg} IV/IO (${s.lido === 0 ? '1ª' : '2ª'} dose)` });
      }, 'amio');
    }
    if (a === 'acesso') return pick(pg, 'Acesso vascular', [['iv', 'Acesso IV', 'tentar primeiro (1, A)'], ['io', 'Acesso intraósseo (IO)', 'se o IV falhar ou não for viável (2a, A)'], ['cvc', 'Acesso venoso central', 'se IV e IO falharem, por profissional treinado (2b)']], (k) => log('acesso', { v: k, label: { iv: 'Acesso IV', io: 'Acesso IO', cvc: 'Acesso venoso central' }[k] }), 'acesso');
    if (a === 'via') return pick(pg, 'Via aérea', [['bvm', 'Bolsa-valva-máscara', '30:2'], ['sga', 'Dispositivo supraglótico', 'depois 1 ventilação a cada 6 s com compressões contínuas'], ['iot', 'Intubação orotraqueal', 'confirmar com capnografia contínua; 1 ventilação a cada 6 s']], (k) => log('via', { v: k, label: { bvm: 'Ventilação com bolsa-valva-máscara', sga: 'Dispositivo supraglótico inserido', iot: 'Intubação orotraqueal' }[k] }), 'rcp');
    if (a === 'etco2') return numberSheet(pg, 'ETCO₂ (capnografia)', 'mmHg', [10, 15, 20, 30, 40], (v) => log('etco2', { v, label: `ETCO₂ ${v} mmHg` }));
    if (a === 'mais') {
      return pick(pg, 'Outras ações e drogas', [
        ['acesso', s.access ? 'Acesso vascular (já registrado)' : 'Acesso vascular', 'IV primeiro; IO se o IV falhar'],
        ['via', s.airway ? 'Via aérea (já registrada)' : 'Via aérea', 'BVM, supraglótico ou IOT'],
        ['etco2', 'Registrar ETCO₂', 'capnografia'],
        ['troca', 'Troca do compressor', 'a cada 2 min'],
        ['energia', c.energia ? `Energia do choque: ${c.energia} J` : 'Energia do choque: não definida', 'conforme o fabricante do desfibrilador'],
        ['dsed', 'Troca de vetor / desfibrilação dupla sequencial', 'FV após ≥ 3 choques — utilidade não estabelecida (2b)'],
        ['bic', 'Bicarbonato de sódio 50–150 mEq IV', 'bloqueador de canal de sódio (ex.: tricíclicos), cocaína ou anestésico local — dose adulta da Tabela 4; sem benefício de rotina'],
        ['ca', 'Cálcio', 'sem benefício de rotina; hipercalemia: efetividade não estabelecida, dose não especificada; BB/BCC: cloreto 10% 20 mL ou gluconato 10% 60 mL (Tabela 4)'],
        ['mg', 'Sulfato de magnésio', 'torsades com QT longo (2b); dose não especificada na AHA 2025'],
        ['insglic', 'Insulina regular 10 U IV (em 15–30 min) + glicose 50 g', 'hipercalemia (Tabela 3); efetividade não estabelecida (2b)'],
        ['nalox', 'Naloxona 0,2–2 mg IV/IO', 'suspeita de opioide, se não atrapalhar a RCP (2b); dose da Tabela 4'],
        ['tromb', 'Trombolítico', 'TEP confirmada (2a) ou suspeita (2b)'],
        ['mec', 'Compressor mecânico', 'só se a RCP manual for difícil ou perigosa (2b)'],
        ['nota', 'Anotação livre', ''],
      ], (k) => {
        const L = { bic: 'Bicarbonato de sódio IV', ca: 'Cálcio IV', mg: 'Sulfato de magnésio IV', insglic: 'Insulina regular 10 U IV + glicose 50 g', nalox: 'Naloxona IV/IO', tromb: 'Trombolítico', mec: 'Compressor mecânico instalado', dsed: 'Troca de vetor / desfibrilação dupla sequencial' };
        if (['etco2', 'troca', 'acesso', 'via'].includes(k)) return act(pg, k);
        if (k === 'energia') return energySheet(pg, () => {});
        if (k === 'nota') return textSheet(pg, (t) => log('nota', { label: t }));
        log('droga', { v: k, label: L[k] });
      });
    }
  }

  function paint(full) {
    const c = active();
    const pg = $('.pcr');
    if (!c || !pg) return;
    const now = Date.now();
    const g = guide(c, now);
    const s = g.s;
    $('#pcrTotal').textContent = mmss(s.elapsed);
    const cyc = $('#pcrCycle');
    const left = s.inArrest && s.rhythm ? s.cycleLeft : null;
    $('#pcrCycleT').textContent = left == null ? (s.rhythm === 'rce' ? 'RCE' : '—') : left > 0 ? mmss(left).replace(/^0/, '') : 'agora';
    const frac = left == null ? 0 : Math.max(0, Math.min(1, left / PROTO.cicloMs));
    $('#pcrArc').style.strokeDashoffset = String(119.4 * (1 - frac));
    cyc.className = 'pcr-cycle' + (left != null && left <= 0 ? ' due' : left != null && left <= 15000 ? ' soon' : '') + (s.rhythm === 'rce' ? ' rce' : '');
    /* alertas sonoros: fim do ciclo (uma vez por ciclo) e adrenalina aos 3 min */
    if (left != null && left <= 0 && lastCycleAlert !== s.lastCheck) { lastCycleAlert = s.lastCheck; beep(880, 0.18, 3); buzz([300, 120, 300]); full = true; }
    const lastEpi = s.epi[s.epi.length - 1];
    if (lastEpi && s.inArrest && s.sinceEpi >= PROTO.epiMinMs && lastEpiAlert !== lastEpi) { lastEpiAlert = lastEpi; beep(520, 0.25, 1); full = true; }
    const chips = [
      s.rhythm ? `<span class="pill ${s.shockable ? 'crit' : s.rhythm === 'rce' ? 'ok' : 'info'}">${RITMO[s.rhythm]}</span>` : '<span class="pill">ritmo não registrado</span>',
      `<span class="pill">${s.shocks} choque${s.shocks === 1 ? '' : 's'}</span>`,
      `<span class="pill ${s.epi.length && s.inArrest && s.sinceEpi >= PROTO.epiMinMs ? 'warn' : ''}">adrenalina ${s.epi.length}× ${lastEpi ? '· há ' + mmss(s.sinceEpi) : ''}</span>`,
      s.amio || s.lido ? `<span class="pill">${s.amio ? 'amiodarona ' + s.amio + '×' : ''}${s.amio && s.lido ? ' · ' : ''}${s.lido ? 'lidocaína ' + s.lido + '×' : ''}</span>` : '',
      s.etco2 ? `<span class="pill ${s.etco2.v < PROTO.etco2Baixo ? 'warn' : ''}">ETCO₂ ${s.etco2.v}</span>` : '',
    ].join('');
    $('#pcrChips').innerHTML = chips;
    if (!full) return;
    const n = g.now;
    $('#pcrNow').className = 'pcr-now ' + n.sev;
    $('#pcrNow').innerHTML = `<div class="pcr-now-h"><span class="pcr-lbl">Agora${n.box ? ' · caixa ' + n.box + ' do algoritmo' : ''}</span>${n.ref ? `<button type="button" class="pcr-src" data-ref="${n.ref}">fonte</button>` : ''}</div><b>${esc(n.txt)}</b><p>${esc(n.sub || '')}</p>${n.act ? `<button type="button" class="btn primary block" data-act="${n.act}">Registrar choque${c.energia ? ' ' + c.energia + ' J' : ''}</button>` : ''}`;
    $('#pcrTodo').innerHTML = g.todo.slice(0, 3).map((t) => `<div class="pcr-t ${t.sev}"><button type="button" class="pcr-tm" ${t.act ? `data-act="${t.act}"` : 'disabled'}>${esc(t.txt)}${t.act ? '<em>registrar</em>' : ''}</button>${t.ref ? `<button type="button" class="pcr-src" data-ref="${t.ref}" aria-label="Fonte">fonte</button>` : ''}</div>`).join('') + (s.rhythm === 'rce' ? postRosc() : '');
    $('#pcrAA').textContent = s.amio === 0 && s.lido === 0 ? 'amiodarona 300' : s.amio === 1 ? 'amiodarona 150' : 'lidocaína';
    const htN = Object.values(c.hts || {}).filter(Boolean).length;
    $('#pcrHtN').textContent = htN ? `${htN} considerada${htN > 1 ? 's' : ''}` : '';
    $('#pcrTlN').textContent = `${c.events.length} eventos`;
    $('#pcrTl').innerHTML = timelineHtml(c, true);
  }

  function postRosc() {
    return `<section class="card pcr-post"><div class="card-h"><h2>Cuidados pós-parada</h2><button type="button" class="pcr-src" data-ref="post">fonte</button></div>${C.steps([
      ['warn', 'PAM ≥ 65 mmHg (1, B-R)'],
      ['warn', 'SpO₂ 90–98 % (PaO₂ 60–105 mmHg) (2a, B-R)'],
      ['warn', 'PaCO₂ 35–45 mmHg (1, B-R)'],
      ['warn', 'ECG de 12 derivações assim que possível (1, B-NR); supra de ST com suspeita de causa cardíaca → coronariografia de emergência (1, B-NR); sem supra, se choque cardiogênico, arritmia ventricular recorrente ou isquemia em curso (2a, B-NR)'],
      ['info', 'Não responde a comando verbal: temperatura entre 32 e 37,5 °C (1, B-R) por pelo menos 36 h (2a, B-R)'],
      ['info', 'TC da cabeça à pelve (2b, B-NR) e ecocardiograma/POCUS (2b, C-LD) podem ser razoáveis'],
      ['info', 'Evitar glicemia < 70 e > 180 mg/dL (2b, B-NR)'],
      ['info', 'Prognóstico multimodal, consolidado ≥ 72 h após normotermia e suspensão de sedativos (2a, B-NR)'],
    ])}</section>`;
  }

  function timelineHtml(c, live) {
    return `<ol class="pcr-tline">${c.events.slice().reverse().map((e) => `<li class="t-${e.type}"><time>${mmss(e.t - c.start)}</time><span>${esc(e.label)}</span><small>${hms(e.t)}</small></li>`).join('')}</ol>`;
  }

  /* ---------------- folhas inferiores ---------------- */
  function sheet(pg, html) {
    const old = $('.sheet', pg); if (old) old.remove();
    const s = document.createElement('div');
    s.className = 'sheet';
    s.innerHTML = `<div class="sh-bg" data-sx></div><div class="sh" role="dialog" aria-modal="true"><button type="button" class="icon-btn sh-x" data-sx aria-label="Fechar">${I.x}</button>${html}</div>`;
    pg.appendChild(s);
    s.addEventListener('click', (e) => { if (e.target.closest('[data-sx]')) s.remove(); });
    return s;
  }
  function pick(pg, title, opts, cb, ref) {
    const s = sheet(pg, `<h2>${esc(title)}</h2><div class="list">${opts.map(([k, l, sub, dis]) => `<button type="button" class="row" data-k="${k}" ${dis ? 'disabled' : ''}><span class="row-t"><b>${esc(l)}</b>${sub ? `<span class="wrap">${esc(sub)}</span>` : ''}</span>${I.chev}</button>`).join('')}</div>${ref ? `<button type="button" class="pcr-src sh-src" data-ref2="${ref}">fonte: ${esc(REF[ref].t)}</button>` : ''}`);
    s.addEventListener('click', (e) => {
      const r = e.target.closest('[data-ref2]');
      if (r) return refSheet(pg, r.dataset.ref2);
      const b = e.target.closest('[data-k]'); if (!b || b.disabled) return; s.remove(); cb(b.dataset.k);
    });
  }
  /* trecho literal da diretriz, classe/nível e link */
  function refSheet(pg, id) {
    const r = REF[id];
    if (!r) return;
    sheet(pg, `<div class="ref-sh"><span class="pill ok">AHA 2025</span><h2>${esc(r.t)}</h2>
      ${r.c ? `<p class="fld-h" style="margin:0 0 8px">Origem e classe: <b>${esc(r.c)}</b></p>` : ''}
      <div class="calc-line"><span class="fld-h">Trecho literal</span><br>“${esc(r.q)}”</div>
      ${r.n ? `<div class="note warn">${esc(r.n)}</div>` : ''}
      <p class="ref"><a href="${r.u}" target="_blank" rel="noopener">${esc(r.u.replace('https://', ''))}</a></p></div>`);
  }
  function energySheet(pg, cb) {
    const c = active();
    const s = sheet(pg, `<h2>Energia do choque</h2>
      <p class="fld-h" style="margin:0 0 12px">“Biphasic: Manufacturer recommendation (eg, initial dose of 120 to 200 Joules); if unknown, use maximum available.” Monofásico: 360 J. A energia escolhida fica salva para os próximos choques e para as próximas PCRs.</p>
      <div class="chips pcr-q">${[120, 150, 200, 360].map((v) => `<button type="button" class="btn${c && c.energia === v ? ' primary' : ''}" data-j="${v}">${v} J</button>`).join('')}</div>
      <div style="height:12px"></div>${C.field({ id: 'pcrJin', label: 'Outra energia (máxima do aparelho, se desconhecida)', unit: 'J' })}
      <div style="height:12px"></div><button type="button" class="btn primary block" id="pcrJok">Usar esta energia</button>`);
    const set = (v) => { const cc = active(); cc.energia = v; saveActive(cc); store.set('pcrEnergia', v); const el = $('#pcrJ', pg); if (el) el.textContent = v + ' J'; s.remove(); C.toast(`Choques em ${v} J`); cb(v); };
    s.addEventListener('click', (e) => {
      const b = e.target.closest('[data-j]');
      if (b) return set(+b.dataset.j);
      if (e.target.closest('#pcrJok')) { const v = C.num($('#pcrJin', s).value); if (Number.isFinite(v) && v > 0 && v <= 400) set(v); }
    });
  }
  function numberSheet(pg, title, unit, quick, cb) {
    const s = sheet(pg, `<h2>${esc(title)}</h2><div class="chips pcr-q">${quick.map((v) => `<button type="button" class="btn" data-v="${v}">${v} ${unit}</button>`).join('')}</div>
      <div style="height:12px"></div>${C.field({ id: 'pcrNum', label: 'Outro valor', unit })}<div style="height:12px"></div><button type="button" class="btn primary block" id="pcrNumOk">Registrar</button>`);
    s.addEventListener('click', (e) => {
      const b = e.target.closest('[data-v]');
      if (b) { s.remove(); return cb(+b.dataset.v); }
      if (e.target.closest('#pcrNumOk')) { const v = C.num($('#pcrNum', s).value); if (Number.isFinite(v) && v >= 0) { s.remove(); cb(v); } }
    });
  }
  function textSheet(pg, cb) {
    const s = sheet(pg, `<h2>Anotação</h2><textarea id="pcrTxt" rows="3" maxlength="200" placeholder="ex.: retorno do pulso femoral, família avisada…"></textarea><div style="height:12px"></div><button type="button" class="btn primary block" id="pcrTxtOk">Registrar</button>`);
    setTimeout(() => $('#pcrTxt', s).focus(), 50);
    $('#pcrTxtOk', s).addEventListener('click', () => { const t = $('#pcrTxt', s).value.trim(); if (t) { s.remove(); cb(t); } });
  }
  function confirmSheet(pg, title, text, ok, cb) {
    const s = sheet(pg, `<h2>${esc(title)}</h2><p style="margin:0 0 16px;color:var(--ink-2)">${esc(text)}</p><div class="grid"><button type="button" class="btn" data-sx>Cancelar</button><button type="button" class="btn primary" id="cfOk">${esc(ok)}</button></div>`);
    $('#cfOk', s).addEventListener('click', () => { s.remove(); cb(); });
  }
  function endSheet(pg) {
    const c = active();
    const s = derive(c, Date.now());
    const opts = [
      ['rce', 'RCE — paciente com circulação espontânea', s.rhythm === 'rce' ? 'RCE já registrado' : 'registra o RCE e encerra'],
      ['obito', 'Óbito — esforços encerrados', 'registra o horário do óbito'],
      ['inter', 'Interrompida / transferida', 'ex.: transferência, ECPR, decisão da família'],
      ['cancel', 'Descartar (registro aberto por engano)', 'não gera relatório'],
    ];
    pick(pg, 'Encerrar a PCR', opts, (k) => {
      if (k === 'cancel') return confirmSheet(pg, 'Descartar esta PCR?', 'Os eventos registrados serão apagados.', 'Descartar', () => { store.del('pcrAtiva'); keepAwake(false); C.toast('PCR descartada'); location.hash = '#/'; });
      const cc = active();
      const now = Date.now();
      if (k === 'rce' && s.rhythm !== 'rce') cc.events.push({ t: now, type: 'ritmo', v: 'rce', label: 'RCE — retorno da circulação espontânea' });
      cc.events.push({ t: now, type: 'fim', label: { rce: 'Encerrada com RCE', obito: 'Óbito constatado — esforços encerrados', inter: 'PCR interrompida / transferida' }[k] });
      cc.end = now; cc.outcome = k;
      const h = hist(); h.push(cc); store.set('pcrHist', h.slice(-30));
      if (cc.patientId) { const p = P.get(cc.patientId); if (p) { p.pcrs = (p.pcrs || []).concat(cc.id); P.touch(p); } }
      store.del('pcrAtiva');
      C.Vault.flush && C.Vault.flush().catch(() => {});
      keepAwake(false); stopMetro();
      location.hash = '#/pcr-relatorio?id=' + cc.id;
    });
  }

  /* ---------------- relatório ---------------- */
  function outcomeTxt(c) { return { rce: 'RCE', obito: 'Óbito', inter: 'Interrompida/transferida' }[c.outcome] || 'em andamento'; }
  function report(c) {
    const s = derive(c, c.end);
    const at = (t) => `${mmss(t - c.start)} (${hm(t)})`;
    const ofType = (ty) => c.events.filter((e) => e.type === ty);
    const L = [];
    L.push(`PCR — ${c.patientName || 'paciente sem identificação'}`);
    L.push(`Início ${new Date(c.start).toLocaleDateString('pt-BR')} ${hms(c.start)} · término ${hms(c.end)} · duração ${mmss(c.end - c.start)}`);
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
    L.push(`Desfecho: ${outcomeTxt(c)}${c.outcome === 'rce' && rce.length ? ` — RCE em ${at(rce[rce.length - 1].t)}` : ''}${c.outcome === 'obito' ? ` — óbito às ${hms(c.end)}` : ''}${s.rearrests ? ` · ${s.rearrests} nova(s) parada(s) após RCE` : ''}`);
    const notes = ofType('nota');
    if (notes.length) L.push(`Anotações: ${notes.map((e) => `[${mmss(e.t - c.start)}] ${e.label}`).join(' ')}`);
    L.push('Conduta guiada pelo algoritmo de PCR em adultos — AHA 2025 (Part 9, Adult Advanced Life Support).');
    L.push('');
    L.push('Linha do tempo (min:s desde o início · horário):');
    c.events.forEach((e) => L.push(`${mmss(e.t - c.start)} · ${hms(e.t)} — ${e.label}`));
    return { text: L.join('\n'), s };
  }
  C.pcr.report = report;

  C.routes['pcr-relatorio'] = function (q) {
    const c = hist().find((x) => x.id === q.get('id'));
    if (!c) { location.replace('#/pcr'); return; }
    const { text, s } = report(c);
    document.title = 'Relatório de PCR — Plantão';
    const pg = C.mount(`
      <header class="bar" id="bar"><a class="icon-btn" href="#/pcr" aria-label="Voltar">${I.back}</a>
        <div class="bar-title"><span class="k">${new Date(c.start).toLocaleDateString('pt-BR')} · ${hm(c.start)}</span><h1>Relatório de PCR</h1></div>
        <button class="icon-btn" id="rpCopy" aria-label="Copiar relatório">${I.copy}</button></header>
      <main class="tool">
        ${C.verdict(c.outcome === 'rce' ? 'ok' : c.outcome === 'obito' ? 'crit' : 'info', `${esc(c.patientName || 'Sem identificação')} · duração ${mmss(c.end - c.start)}`, outcomeTxt(c), `Ritmo inicial: ${s.firstRhythm ? RITMO[s.firstRhythm] : 'não registrado'}`)}
        <div class="outs" style="margin-bottom:12px">
          <div class="out"><div class="o-l">Choques</div><div class="o-v sm">${s.shocks}</div></div>
          <div class="out"><div class="o-l">Adrenalina</div><div class="o-v sm">${s.epi.length}<span class="u">doses</span></div></div>
          <div class="out"><div class="o-l">Antiarrítmico</div><div class="o-v sm">${s.amio + s.lido}<span class="u">doses</span></div></div>
          <div class="out"><div class="o-l">Via aérea</div><div class="o-v sm" style="font-size:20px">${s.airway ? { bvm: 'BVM', sga: 'Supraglótico', iot: 'IOT' }[s.airway] : '—'}</div></div>
        </div>
        <div class="grid" style="margin-bottom:12px">
          <button type="button" class="btn primary" id="rpCopy2">${I.copy} Copiar para o prontuário</button>
          <button type="button" class="btn" id="rpShare">Compartilhar</button>
        </div>
        ${c.patientId ? '' : `<button type="button" class="btn block" id="rpLink" style="margin-bottom:12px">${I.user} Vincular a um paciente da lista</button>`}
        <section class="card"><div class="card-h"><h2>Linha do tempo</h2><span class="aux">${c.events.length} eventos</span></div>${timelineHtml(c)}</section>
        <details class="card"><summary><b>Texto do relatório</b>${I.down}</summary><pre class="pcr-rep">${esc(text)}</pre></details>
        <p class="ref">Revise e complemente antes de anexar ao prontuário. Horários conforme o relógio deste aparelho.</p>
      </main>`);
    const copy = () => C.copy(text);
    $('#rpCopy', pg).addEventListener('click', copy);
    $('#rpCopy2', pg).addEventListener('click', copy);
    const lk = $('#rpLink', pg);
    if (lk) lk.addEventListener('click', () => {
      const list = P.list().filter((x) => !x.archived);
      if (!list.length) return C.toast('Nenhum paciente na lista de leitos');
      pick(pg, 'Vincular a qual paciente?', list.map((x) => [x.id, P.name(x), '']), (id) => {
        const p = P.get(id);
        const h = hist();
        const it = h.find((x) => x.id === c.id);
        it.patientId = p.id; it.patientName = P.name(p);
        if (!it.weight && p.data && Number.isFinite(C.num(p.data.peso))) it.weight = C.num(p.data.peso);
        store.set('pcrHist', h);
        p.pcrs = (p.pcrs || []).concat(c.id); P.touch(p);
        C.toast(`Relatório vinculado a ${P.name(p)}`);
        C.route();
      });
    });
    $('#rpShare', pg).addEventListener('click', async () => {
      if (navigator.share) { try { await navigator.share({ title: 'Relatório de PCR', text }); } catch (e) { /* cancelado */ } }
      else copy();
    });
  };
  C.routes['pcr-relatorio'].nav = 'calc';

  C.register({
    id: 'acls', group: 'emerg', tile: 'PCR', href: '#/pcr',
    title: 'PCR guiada (ACLS)',
    sub: 'Algoritmo AHA 2025, cronômetros, registro e relatório',
    keywords: ['pcr', 'parada', 'acls', 'rcp', 'reanimacao', 'fv', 'tv sem pulso', 'aesp', 'assistolia', 'adrenalina', 'epinefrina', 'amiodarona', 'choque', 'desfibrilacao', 'codigo azul', 'rce', 'rosc'],
  });
})();
