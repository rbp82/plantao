/* Sedoanalgesia: infusões, RASS, BPS, equivalência opioide, lidocaína, antipsicóticos */
(function () {
  'use strict';
  const C = window.Calc;

  /* ================= infusões =================
     Faixas de sedativos e opioides: SCCM PAD 2013 (Barr J et al. Crit Care Med 2013;41:263),
     tabela 3 (opioides) e tabela 6 (sedativos). */
  const SED = [
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
      alerts: (d) => d * 0.06 > 4 ? [['crit', '<b>Risco de PRIS</b> acima de 4 mg/kg/h por mais de 48 h — monitorar triglicérides, CPK, lactato e acidose metabólica.']] : [],
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
  const OPI = [
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
  const BNM = [
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
  const NOTES = {
    sed: C.note('warn', '<b>PRIS</b> (síndrome de infusão do propofol): risco com dose &gt; 4 mg/kg/h por &gt; 48 h.'),
    opi: C.note('info', '<b>Analgesia primeiro</b> (SCCM PAD): tratar a dor antes de escalar sedação. Reavaliar diariamente e desmamar precocemente.'),
    bnm: C.note('crit', 'BNM exige sedação profunda (RASS −4 a −5) e analgesia adequada. Monitorar TOF — meta 1–2 respostas em 4. Indicações: SDRA grave, HIC, hipotermia terapêutica.') +
      C.note('info', 'Sugamadex reverte rocurônio e vecurônio. Cisatracúrio não necessita reversão farmacológica.'),
  };

  C.register({
    id: 'sedacao', group: 'sed', tile: 'SED', weight: true,
    title: 'Sedação e analgesia contínua',
    sub: 'Propofol, midazolam, dexmed, fentanil, BNM',
    keywords: ['propofol', 'midazolam', 'dormonid', 'dexmedetomidina', 'precedex', 'cetamina', 'ketamina', 'fentanil', 'morfina', 'sufentanil', 'remifentanil', 'rocuronio', 'cisatracurio', 'vecuronio', 'bloqueador neuromuscular', 'bnm', 'pris', 'infusao', 'ml/h', 'sedoanalgesia'],
    render(body, api, root) {
      const tabName = C.uid('cat');
      const modeName = C.uid('mode');
      const cat = C.store.get('sedCat', 'sed');
      body.innerHTML = `
        ${C.tabs(tabName, [['sed', 'Sedativos'], ['opi', 'Opioides'], ['bnm', 'BNM']], cat)}
        <div class="mode">${C.tabs(modeName, [['dose', 'mL/h → dose'], ['rate', 'Dose → mL/h']], C.store.get('sedMode', 'dose'))}</div>
        <div data-cat="sed">${SED.map(C.infCard).join('')}${NOTES.sed}</div>
        <div data-cat="opi">${OPI.map(C.infCard).join('')}${NOTES.opi}</div>
        <div data-cat="bnm">${BNM.map(C.infCard).join('')}${NOTES.bnm}</div>
        <p class="ref">Faixas de sedativos e opioides: SCCM PAD 2013 (Barr J et al. Crit Care Med 2013;41:263). BNM: faixas usuais de bula — titular pelo TOF. Diluições editáveis — a alteração fica salva neste aparelho.</p>
      `;
      const show = () => {
        const c = C.radioVal(body, tabName);
        body.querySelectorAll('[data-cat]').forEach((el) => (el.hidden = el.dataset.cat !== c));
        C.store.set('sedCat', c);
      };
      show();
      body.querySelectorAll(`input[name="${tabName}"]`).forEach((r) => r.addEventListener('change', show));
      const getMode = () => C.radioVal(body, modeName);
      const calc = C.bindInf(root, [...SED, ...OPI, ...BNM], () => C.peso(root), getMode);
      body.querySelectorAll(`input[name="${modeName}"]`).forEach((r) => r.addEventListener('change', () => {
        C.store.set('sedMode', getMode());
        body.querySelectorAll('[data-inf] input[id$="_in"]').forEach((i) => (i.value = ''));
        calc();
      }));
      root.addEventListener('input', (e) => { if (!e.target.closest || !e.target.closest('[data-inf]')) calc(); });
      api.summary = () => C.infSummary(body, [...SED, ...OPI, ...BNM], getMode(), C.peso(root));
    },
  });

  /* ================= RASS ================= */
  const RASS = [
    /* descritores de Sessler CN et al. Am J Respir Crit Care Med 2002;166:1338 */
    [4, 'crit', 'Combativo', 'Abertamente combativo, violento; perigo imediato para a equipe', 'Combativo — risco imediato', 'Sedação urgente e investigar a causa. Considerar bolus de midazolam ou propofol.'],
    [3, 'crit', 'Muito agitado', 'Puxa ou remove tubos e cateteres; agressivo', 'Muito agitado — risco de autoextubação', 'Ajustar sedação. Verificar dor, delirium, retenção urinária.'],
    [2, 'warn', 'Agitado', 'Movimentos frequentes sem propósito; briga com o ventilador', 'Agitado', 'Titular sedativo até a meta. Tratar dor. Considerar dexmedetomidina.'],
    [1, 'warn', 'Inquieto', 'Ansioso, mas movimentos não agressivos nem vigorosos', 'Inquieto / ansioso', 'Analgesia adequada antes de escalar sedação. Avaliar o gatilho.'],
    [0, 'ok', 'Alerta e calmo', 'Alerta e calmo', 'Alerta e calmo', 'Manter. Despertar diário (SAT). Fisioterapia motora.'],
    [-1, 'ok', 'Sonolento', 'Não totalmente alerta; desperta à voz com abertura ocular e contato visual ≥ 10 s', 'Sonolento — sedação leve (meta)', 'Dentro da meta de sedação leve. Avaliar redução da sedação.'],
    [-2, 'ok', 'Sedação leve', 'Desperta brevemente à voz, com contato visual &lt; 10 s', 'Sedação leve (meta)', 'Dentro da meta de sedação leve. Manter SAT diário.'],
    [-3, 'violet', 'Sedação moderada', 'Movimento ou abertura ocular à voz, sem contato visual', 'Sedação moderada — acima da meta', 'Justificar a indicação. Despertar diário. Risco de delirium.'],
    [-4, 'violet', 'Sedação profunda', 'Sem resposta à voz; movimento ou abertura ocular ao estímulo físico', 'Sedação profunda — evitar sem indicação', 'Indicações: BNM, HIC, hipotermia, SDRA grave. Reavaliar diariamente.'],
    [-5, 'crit', 'Não desperta', 'Sem resposta à voz nem ao estímulo físico', 'Não desperta — sedação máxima', 'Indicação restrita. Confirmar necessidade e excluir causa neurológica.'],
  ];
  const sgn = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');

  C.register({
    id: 'rass', group: 'sed', tile: 'RASS',
    title: 'RASS',
    sub: 'Richmond Agitation-Sedation Scale',
    keywords: ['richmond', 'agitacao', 'sedacao', 'escala', 'despertar'],
    render(body, api, root) {
      const name = C.uid('rass');
      body.innerHTML = `
        <div id="rassOut">${C.verdict('idle', 'RASS', 'Toque no nível atual', 'Meta habitual: sedação leve (RASS −2 a 0).')}</div>
        <div class="scale">${RASS.map(([s, c, t, d]) => {
          const id = C.uid('r');
          return `<input type="radio" name="${name}" id="${id}" value="${s}"><label for="${id}"><span class="sc c-${c}">${sgn(s)}</span><span class="st"><b>${t}</b><span>${d}</span></span></label>`;
        }).join('')}</div>
        ${C.note('info', '<b>Meta SCCM PAD/PADIS:</b> sedação leve (RASS −2 a 0; o PADIS 2018 aceita até +1) e BPS ≤ 5, salvo indicação de sedação profunda. Avaliar diariamente despertar (SAT) e respiração espontânea (SBT).')}
      `;
      let cur = null;
      root.addEventListener('change', () => {
        const v = C.radioVal(body, name);
        if (v === null) return;
        const r = RASS.find((x) => String(x[0]) === v);
        cur = r;
        body.querySelector('#rassOut').innerHTML = C.verdict(r[1] === 'violet' ? 'info' : r[1], 'RASS ' + sgn(r[0]), r[4], r[5]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      api.summary = () => (cur ? `RASS ${sgn(cur[0])} (${cur[2].toLowerCase()}).` : '');
    },
  });

  /* ================= BPS ================= */
  const BPS = [
    /* Payen JF et al. Crit Care Med 2001;29:2258 */
    ['face', 'Expressão facial', ['Relaxada', 'Parcialmente tensa (ex.: franze a testa)', 'Totalmente tensa (ex.: fecha os olhos)', 'Careta']],
    ['mmss', 'Membros superiores', ['Sem movimento', 'Parcialmente fletidos', 'Totalmente fletidos, com flexão dos dedos', 'Retraídos permanentemente']],
    ['vm', 'Adaptação ao ventilador', ['Tolera a movimentação', 'Tosse, mas tolera a VM a maior parte do tempo', 'Briga com o ventilador', 'Impossível controlar a ventilação']],
  ];
  C.register({
    id: 'bps', group: 'sed', tile: 'BPS',
    title: 'BPS — dor no paciente em VM',
    sub: 'Behavioral Pain Scale · não comunicativo',
    keywords: ['behavioral pain scale', 'dor', 'analgesia', 'ventilacao mecanica', 'escala'],
    render(body, api, root) {
      const names = {};
      body.innerHTML = `
        <div id="bpsOut">${C.verdict('idle', 'BPS · 3 a 12', 'Marque as três dimensões', 'Escore &gt; 5 indica dor significativa.')}</div>
        <section class="card">${BPS.map(([k, t, opts], i) => {
          names[k] = C.uid('b');
          return `<div ${i ? 'style="margin-top:16px"' : ''}>${C.seg({ name: names[k], label: `${i + 1}. ${t}`, cls: 'stack', options: opts.map((o, j) => [j + 1, `<span style="flex:1">${o}</span><b class="num" style="margin-left:8px">${j + 1}</b>`]) })}</div>`;
        }).join('')}</section>
      `;
      let total = null;
      root.addEventListener('change', () => {
        const vals = BPS.map(([k]) => C.radioVal(body, names[k]));
        const out = body.querySelector('#bpsOut');
        if (vals.some((v) => v === null)) {
          const done = vals.filter((v) => v !== null).length;
          out.innerHTML = C.verdict('idle', 'BPS', `${done} de 3 dimensões`, 'Marque as três para obter o escore.');
          total = null; return;
        }
        total = vals.reduce((a, b) => a + +b, 0);
        /* ponto de corte validado (PAD/PADIS): BPS > 5 = dor significativa */
        if (total <= 5) out.innerHTML = C.verdict('ok', `BPS ${total} / 12`, 'Dor controlada', 'BPS ≤ 5. Manter analgesia e reavaliar periodicamente e antes de procedimentos.');
        else out.innerHTML = C.verdict('crit', `BPS ${total} / 12`, 'Dor significativa', `BPS &gt; 5: tratar a dor (bolus de opioide e reavaliar), investigar a causa${total >= 8 ? '. Escore alto — reavaliar logo após a intervenção' : ''}.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      api.summary = () => (total ? `BPS ${total}/12.` : '');
    },
  });

  /* ================= equivalência opioide ================= */
  /* Denominador comum: morfina IV em mg/h.
     Morfina IV 10 mg = morfina VO 30 mg = fentanil IV 100 mcg = sufentanil IV 10 mcg (10× fentanil) = remifentanil ≈ fentanil.
     Tramadol VO × 0,2 e codeína VO × 0,15 = morfina VO (fatores MME do CDC 2022). */
  const K = { fen: 10, suf: 1, vo: 3, tra: 0.2, cod: 0.15 };
  const EQ = [
    ['fen_h', 'Fentanil IV', 'mcg/h', (d) => d / K.fen],
    ['fen_min', 'Fentanil IV', 'mcg/min', (d) => d * 60 / K.fen],
    ['mor_h', 'Morfina IV', 'mg/h', (d) => d],
    ['mor_vo', 'Morfina VO', 'mg/dia', (d) => d / 24 / K.vo],
    ['suf_h', 'Sufentanil IV', 'mcg/h', (d) => d / K.suf],
    ['rem_min', 'Remifentanil IV', 'mcg/min', (d) => d * 60 / K.fen],
    ['tra_vo', 'Tramadol VO', 'mg/dia', (d) => d * K.tra / K.vo / 24],
    ['cod_vo', 'Codeína VO', 'mg/dia', (d) => d * K.cod / K.vo / 24],
  ];
  C.opioidK = K;
  C.register({
    id: 'opioide', group: 'sed', tile: 'EQV',
    title: 'Equivalência de opioides',
    sub: 'Conversão entre fentanil, morfina, sufenta, tramadol',
    keywords: ['conversao', 'rotacao', 'fentanil', 'morfina', 'sufentanil', 'remifentanil', 'tramadol', 'codeina', 'opioide', 'potencia'],
    render(body, api, root) {
      const name = C.uid('eq');
      body.innerHTML = `
        <section class="card">
          ${C.seg({ name, label: 'Opioide em uso', cls: 'wrap2', options: EQ.map(([k, n, u]) => [k, n, u]) })}
          <div style="margin-top:14px">${C.field({ id: 'eqDose', label: 'Dose atual', unit: '—', ph: '', lim: [0, 100000] })}</div>
        </section>
        <section class="card" id="eqOut"><div class="empty" style="padding:8px">Escolha o opioide e digite a dose.</div></section>
        ${C.note('warn', 'Estimativas. Ao trocar de opioide, <b>reduzir 25–50%</b> (tolerância cruzada incompleta) e titular. Considerar função renal/hepática e tempo de uso.')}
        <section class="card" style="margin-top:12px">
          <div class="card-h"><h2>Potências relativas</h2><span class="aux">≈ morfina IV 1 mg</span></div>
          <div class="kv">
            <div><span>Morfina VO</span><span>3 mg</span></div>
            <div><span>Fentanil IV</span><span>10 mcg</span></div>
            <div><span>Sufentanil IV</span><span>1 mcg</span></div>
            <div><span>Remifentanil IV</span><span>≈ fentanil, mcg a mcg</span></div>
            <div><span>Tramadol VO</span><span>15 mg (fator 0,2 sobre morfina VO)</span></div>
            <div><span>Codeína VO</span><span>20 mg (fator 0,15 sobre morfina VO)</span></div>
          </div>
          <p class="fld-h" style="margin-top:10px">Tabelas equianalgésicas variam (fentanil 10–15 mcg; sufentanil 5–10× o fentanil). Fatores de tramadol e codeína: CDC 2022.</p>
        </section>
      `;
      let last = '';
      root.addEventListener('input', () => {
        const k = C.radioVal(body, name);
        const e = EQ.find((x) => x[0] === k);
        body.querySelector('#eqDose').nextElementSibling.textContent = e ? e[2] : '—';
        const dose = C.val(body, 'eqDose');
        const out = body.querySelector('#eqOut');
        if (!e || !(dose > 0)) { out.innerHTML = '<div class="empty" style="padding:8px">Escolha o opioide e digite a dose.</div>'; last = ''; return; }
        const m = e[3](dose);
        const moVO = m * 24 * K.vo; /* morfina VO mg/dia */
        const rows = [
          ['Morfina IV', m, 'mg/h', `${C.fmtDose(m * 24)} mg/dia`],
          ['Morfina VO', moVO, 'mg/dia'],
          ['Fentanil IV', m * K.fen, 'mcg/h', `${C.fmtDose(m * K.fen / 60)} mcg/min`],
          ['Sufentanil IV', m * K.suf, 'mcg/h'],
          ['Remifentanil IV', m * K.fen / 60, 'mcg/min'],
          ['Tramadol VO', moVO / K.tra, 'mg/dia', 'teto usual 400 mg/dia'],
          ['Codeína VO', moVO / K.cod, 'mg/dia', 'teto usual 360 mg/dia'],
        ];
        out.innerHTML = `<div class="card-h"><h2>Equivalente a ${C.fmtDose(dose)} ${e[2]} de ${e[1].toLowerCase()}</h2></div>
          <table class="tbl"><tbody>${rows.map(([n, v, u, x]) => `<tr><td>${n}${x ? `<br><small style="color:var(--ink-3)">${x}</small>` : ''}</td><td class="r num"><b style="font-family:var(--f-cond);font-size:20px">${C.fmtDose(v)}</b> <small style="color:var(--ink-3)">${u}</small></td></tr>`).join('')}</tbody></table>`;
        last = `${C.fmtDose(dose)} ${e[2]} de ${e[1]} ≈ morfina IV ${C.fmtDose(m)} mg/h ≈ fentanil ${C.fmtDose(m * K.fen)} mcg/h ≈ morfina VO ${C.fmtDose(moVO)} mg/dia (sem desconto de tolerância cruzada).`;
      });
      api.summary = () => last;
    },
  });

  /* ================= lidocaína ================= */
  const LIDO = [{
    id: 'lido', name: 'Infusão de manutenção', sub: 'Iniciar logo após o bolus', amt: 2000, amtU: 'mg', vol: 500,
    dose: 'mg/min', range: [1, 4], alt: ['mcg/kg/min'],
    note: 'Nível sérico alvo 1,5–5 mcg/mL. Em ICC ou hepatopatia, preferir ≤ 1 mg/min.',
    alerts: (d) => d > 4 ? [['crit', 'Acima de 4 mg/min — risco de toxicidade (zumbido, parestesia, convulsão, BAV, hipotensão).']] : [],
  }];
  C.register({
    id: 'lidocaina', group: 'sed', tile: 'LIDO', weight: true,
    title: 'Lidocaína antiarrítmica',
    sub: 'FV/TV refratária · bolus e manutenção',
    keywords: ['lidocaina', 'xylocaina', 'antiarritmico', 'fibrilacao ventricular', 'taquicardia ventricular', 'fv', 'tv', 'acls', 'pcr', 'parada'],
    render(body, api, root) {
      const ctx = C.uid('ctx');
      body.innerHTML = `
        <section class="card">
          ${C.seg({ name: ctx, label: 'Contexto', cls: 'stack', value: 'arrest', options: [['arrest', 'PCR — FV/TV sem pulso refratária'], ['stable', 'TV monomórfica estável, FE preservada'], ['infusion', 'Manutenção pós-reversão']] })}
        </section>
        <section class="card">
          <div class="card-h"><h2>Bolus IV/IO</h2></div>
          <div class="outs">
            ${C.out({ id: 'lb1', label: '1ª dose · 1–1,5 mg/kg', cls: 'span2' })}
            ${C.out({ id: 'lb2', label: 'Repetir · 0,5–0,75 mg/kg', sm: true, note: 'a cada 5–10 min se refratário' })}
            ${C.out({ id: 'lbm', label: 'Máximo · 3 mg/kg', sm: true, note: 'dose cumulativa' })}
          </div>
          <div id="lidoCtxNote"></div>
        </section>
        ${C.infCard(LIDO[0])}
        ${C.card('Protocolo', C.steps([
          ['crit', '<b>FV/TV sem pulso refratária:</b> amiodarona ou lidocaína (AHA 2020/2025), administrada após o 3º choque — a epinefrina entra após o 2º choque.'],
          ['', '<b>Pós-ROSC:</b> iniciar infusão 1–4 mg/min. Se atraso &gt; 15 min entre bolus e infusão, repetir bolus de 0,5 mg/kg.'],
          ['', '<b>TV monomórfica estável:</b> bolus 1 mg/kg → 1–4 mg/min. Alternativa a procainamida/amiodarona (ACC/AHA/HRS 2017).'],
          ['', '<b>Duração:</b> reavaliar em 12–24 h e descontinuar gradualmente.'],
          ['warn', '<b>ICC, hepatopatia ou idoso:</b> reduzir ~50% (≤ 1 mg/min). Nível sérico obrigatório.'],
          ['info', '<b>Monitorar:</b> nível sérico (1,5–5 mcg/mL; tóxico &gt; 5–6), ECG contínuo, sinais de toxicidade.'],
        ]))}
        ${C.note('info', 'Amiodarona é 1ª linha para TV/FV com cardiopatia estrutural. Lidocaína: TV associada a isquemia aguda/pós-IAM ou quando amiodarona indisponível/contraindicada.')}
      `;
      const calcInf = C.bindInf(root, LIDO, () => C.peso(root), () => 'dose');
      let last = '';
      function calc() {
        const p = C.peso(root);
        const r = (a, b) => `${C.fmtN(Math.round(p * a))}–${C.fmtN(Math.round(p * b))}`;
        if (p > 0) {
          C.setOut(body, 'lb1', r(1, 1.5), 'mg', 'info', '');
          C.setOut(body, 'lb2', r(0.5, 0.75), 'mg', '', '');
          C.setOut(body, 'lbm', C.fmt(p * 3, 0), 'mg', 'warn', '');
          last = `Lidocaína (${C.fmtN(p)} kg): bolus ${r(1, 1.5)} mg IV; repetir ${r(0.5, 0.75)} mg a cada 5–10 min; máx. ${C.fmt(p * 3, 0)} mg; manutenção 1–4 mg/min.`;
        } else {
          ['lb1', 'lb2', 'lbm'].forEach((id) => C.setOut(body, id, null));
          body.querySelector('#lb1 .o-n').textContent = 'Informe o peso no topo';
          last = '';
        }
        const c = C.radioVal(body, ctx);
        body.querySelector('#lidoCtxNote').innerHTML =
          c === 'arrest' ? C.note('crit', 'Bolus rápido IV/IO após o 3º choque (FV/TV persistente). Considerar infusão após o RCE.')
          : c === 'stable' ? C.note('info', 'Bolus de 1 mg/kg em TV monomórfica estável, seguido de 1–4 mg/min.')
          : C.note('warn', 'Manutenção: em ICC/hepatopatia preferir ≤ 1 mg/min e dosar nível sérico.');
        calcInf();
      }
      root.addEventListener('input', (e) => { if (!e.target.closest || !e.target.closest('[data-inf]')) calc(); });
      root.addEventListener('change', (e) => { if (e.target.name === ctx) calc(); });
      api.summary = () => last;
    },
  });

  /* ================= antipsicóticos ================= */
  C.register({
    id: 'delirium', group: 'sed', tile: 'DEL',
    title: 'Antipsicóticos no delirium',
    sub: 'Haloperidol e quetiapina · doses',
    keywords: ['haloperidol', 'haldol', 'quetiapina', 'seroquel', 'delirium', 'agitacao', 'antipsicotico', 'qtc'],
    render(body) {
      body.innerHTML = `
        ${C.card('Haloperidol', `<div class="kv">
          <div><span>Delirium agudo (IV)</span><span>2,5–5 mg em bolus<br><small style="font-weight:400;color:var(--ink-3)">repetir a cada 20–30 min</small></span></div>
          <div><span>Manutenção (VO)</span><span>0,5–2 mg 8/8–12/12 h</span></div>
          <div><span>Infusão (refratário)</span><span>3–25 mg/h IV<br><small style="font-weight:400;color:var(--ink-3)">com monitorização de QTc</small></span></div>
        </div>
        ${C.note('crit', '<b>Contraindicações:</b> QTc &gt; 500 ms · Parkinson · demência por corpos de Lewy.')}
        ${C.note('info', '<b>Monitorar:</b> ECG antes e 1 h após (QTc), sintomas extrapiramidais, hipotensão.')}`, 'Delirium hiperativo')}
        ${C.card('Quetiapina', `<div class="kv">
          <div><span>Dose inicial (VO/SNE)</span><span>12,5–50 mg 12/12 h</span></div>
          <div><span>Titulação</span><span>até 100–200 mg 12/12 h</span></div>
          <div><span>Via</span><span>Sem forma IV — usar sonda</span></div>
        </div>
        ${C.note('ok', 'Menos efeito extrapiramidal que haloperidol; efeito sedativo adicional; facilita desmame de benzodiazepínico.')}
        ${C.note('info', '<b>Monitorar:</b> QTc, hipotensão ortostática, sonolência excessiva.')}`, 'Delirium noturno · subagudo')}
        ${C.note('warn', '<b>SCCM PADIS 2018:</b> evidência insuficiente para uso rotineiro de antipsicóticos na prevenção ou tratamento do delirium. Priorizar medidas não farmacológicas (reorientação, mobilização precoce, ciclo sono-vigília, menos benzodiazepínico).')}
        ${C.note('info', '<b>Delirium hipoativo</b> não se trata com sedativo: investigar dor, retenção urinária, constipação, privação de sono, abstinência.')}
      `;
    },
  });
})();
