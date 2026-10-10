/* Sepse e infecção: triagem, SOFA, bundle, perfusão, oxigenação, ATB por foco, ajuste renal */
(function () {
  'use strict';
  const C = window.Calc;

  /* ================= triagem de sepse ================= */
  C.register({
    id: 'sepse', group: 'inf', tile: 'qS',
    title: 'Triagem de sepse',
    sub: 'qSOFA, SIRS + disfunção (ILAS), choque séptico',
    keywords: ['qsofa', 'sirs', 'ilas', 'sepse', 'choque septico', 'protocolo', 'disfuncao organica', 'lactato'],
    render(body, api, root) {
      body.innerHTML = `
        ${C.card('qSOFA', `<div class="checks">
            ${C.check({ id: 'q1', label: 'FR ≥ 22 irpm' })}
            ${C.check({ id: 'q2', label: 'Alteração do nível de consciência', sub: 'Glasgow &lt; 15' })}
            ${C.check({ id: 'q3', label: 'PAS ≤ 100 mmHg' })}
          </div><div id="qOut" style="margin-top:12px"></div>`, 'infecção suspeita + ≥ 2 = alto risco')}
        ${C.card('SIRS e disfunção orgânica', `
          ${C.lbl('SIRS — 2 ou mais')}
          <div class="checks">
            ${C.check({ id: 's1', label: 'Temperatura &gt; 37,8 °C ou &lt; 35 °C' })}
            ${C.check({ id: 's2', label: 'FC &gt; 90 bpm' })}
            ${C.check({ id: 's3', label: 'FR &gt; 20 irpm ou PaCO₂ &lt; 32 mmHg' })}
            ${C.check({ id: 's4', label: 'Leucócitos &gt; 12.000, &lt; 4.000 ou &gt; 10% bastões' })}
          </div>
          ${C.lbl('Disfunção orgânica — qualquer uma, com suspeita de infecção, abre o protocolo', 'sub-lbl')}
          <div class="checks">
            ${C.check({ id: 'd1', label: 'Hipotensão', sub: 'PAS &lt; 90 ou PAM &lt; 65 mmHg, ou queda da PAS &gt; 40 mmHg' })}
            ${C.check({ id: 'd2', label: 'Rebaixamento do nível de consciência' })}
            ${C.check({ id: 'd3', label: 'Disfunção respiratória', sub: 'SpO₂ &lt; 90% necessitando O₂ ou PaO₂/FiO₂ &lt; 300' })}
            ${C.check({ id: 'd4', label: 'Oligúria ou creatinina &gt; 2 mg/dL', sub: 'diurese &lt; 0,5 mL/kg/h' })}
            ${C.check({ id: 'd5', label: 'Bilirrubina &gt; 2 mg/dL' })}
            ${C.check({ id: 'd6', label: 'Plaquetas &lt; 100.000/mm³' })}
            ${C.check({ id: 'd7', label: 'Lactato acima do valor de referência' })}
            ${C.check({ id: 'd8', label: 'Coagulopatia', sub: 'INR &gt; 1,5 ou TTPA &gt; 60 s' })}
          </div>
          <div id="sOut"></div>`, 'ILAS')}
        ${C.card('Choque séptico', `
          <div class="grid">
            ${C.field({ id: 'lac', label: 'Lactato', unit: 'mmol/L', ph: '3,2', lim: [0.1, 30] })}
            ${C.field({ id: 'pam', label: 'PAM após volume', unit: 'mmHg', ph: '58', lim: [10, 200] })}
          </div>
          <div class="checks" style="margin-top:12px">${C.check({ id: 'vp', label: 'Precisa de vasopressor para PAM ≥ 65' })}</div>
          <div id="cOut"></div>`, 'Sepsis-3: vasopressor + lactato &gt; 2')}
      `;
      let sumTxt = '';
      function calc() {
        const q = ['q1', 'q2', 'q3'].filter((id) => C.checked(body, id)).length;
        body.querySelector('#qOut').innerHTML = q >= 2
          ? C.verdict('crit', `qSOFA ${q}/3`, 'Alto risco', 'Iniciar protocolo de sepse.')
          : q === 1 ? C.verdict('warn', 'qSOFA 1/3', 'Atenção', 'Monitorar e reavaliar.')
          : C.verdict('idle', 'qSOFA 0/3', 'Baixo risco imediato', '');
        const s = ['s1', 's2', 's3', 's4'].filter((id) => C.checked(body, id)).length;
        const d = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'].filter((id) => C.checked(body, id)).length;
        let sh = '';
        if (d >= 1) sh = C.note('crit', `<b>${d} disfunção${d > 1 ? 'ões' : ''} orgânica${d > 1 ? 's' : ''}</b> — abrir protocolo de sepse imediatamente.`);
        else if (s >= 2) sh = C.note('warn', `<b>SIRS ${s}/4</b> — suspeita de sepse. Avaliar disfunção orgânica e abrir protocolo.`);
        else if (s === 1) sh = C.note('info', '1 critério de SIRS. Monitorar e reavaliar.');
        body.querySelector('#sOut').innerHTML = sh;
        const lac = C.val(body, 'lac'), pam = C.val(body, 'pam'), vp = C.checked(body, 'vp');
        const lacHi = lac > 2; /* Sepsis-3: lactato > 2 mmol/L */
        let ch = '';
        if (vp && lacHi) ch = C.note('crit', '<b>Choque séptico</b> (Sepsis-3) — vasopressor para PAM ≥ 65 + lactato &gt; 2 mmol/L após volume adequado.');
        else if (pam < 65 && lacHi) ch = C.note('crit', 'Hipotensão + lactato &gt; 2 mmol/L. Se persistir após volume e exigir vasopressor, configura choque séptico.');
        else if (lac >= 4) ch = C.note('warn', '<b>Lactato ≥ 4 mmol/L</b> — 30 mL/kg de cristaloide mesmo sem hipotensão.');
        else if (lacHi) ch = C.note('warn', `Hiperlactatemia (${C.fmt(lac, 1)} mmol/L) — ressuscitação ativa. Repetir lactato em 2–4 h.`);
        body.querySelector('#cOut').innerHTML = ch;
        const parts = [`qSOFA ${q}/3`, `SIRS ${s}/4`, `${d} disfunção(ões) orgânica(s)`];
        if (Number.isFinite(lac)) parts.push(`lactato ${C.fmt(lac, 1)} mmol/L`);
        if (Number.isFinite(pam)) parts.push(`PAM ${pam} mmHg`);
        if (vp) parts.push('em uso de vasopressor');
        sumTxt = 'Triagem de sepse: ' + parts.join(', ') + '.';
      }
      root.addEventListener('input', calc);
      root.addEventListener('change', calc);
      api.summary = () => sumTxt;
    },
  });

  /* ================= SOFA ================= */
  const SOFA = [
    ['resp', 'Respiratório', 'PaO₂/FiO₂', ['≥ 400', '300–399', '200–299', '100–199 + VM', '&lt; 100 + VM']],
    ['coag', 'Coagulação', 'Plaquetas ×10³/mm³', ['≥ 150', '100–149', '50–99', '20–49', '&lt; 20']],
    ['fig', 'Fígado', 'Bilirrubina mg/dL', ['&lt; 1,2', '1,2–1,9', '2,0–5,9', '6,0–11,9', '≥ 12']],
    ['cv', 'Cardiovascular', 'PAM / vasopressor (mcg/kg/min)', ['PAM ≥ 70', 'PAM &lt; 70', 'Dopa ≤ 5 ou dobuta', 'Dopa 5–15 ou nora/adre ≤ 0,1', 'Dopa &gt; 15 ou nora/adre &gt; 0,1']],
    ['snc', 'Neurológico', 'Glasgow', ['15', '13–14', '10–12', '6–9', '&lt; 6']],
    ['ren', 'Renal', 'Creatinina mg/dL ou diurese', ['&lt; 1,2', '1,2–1,9', '2,0–3,4', '3,5–4,9 ou &lt; 500 mL/d', '≥ 5,0 ou &lt; 200 mL/d']],
  ];
  C.register({
    id: 'sofa', group: 'inf', tile: 'SOFA',
    title: 'SOFA',
    sub: 'Disfunção orgânica e mortalidade estimada',
    keywords: ['sequential organ failure', 'disfuncao organica', 'mortalidade', 'sepse', 'escore'],
    render(body, api, root) {
      const names = {};
      body.innerHTML = `
        <div id="sofaOut"></div>
        ${SOFA.map(([k, sys, par, opts]) => {
          names[k] = C.uid('sf');
          return `<section class="card" style="padding:14px"><div class="card-h" style="margin-bottom:10px"><h2>${sys}</h2><span class="aux">${par}</span></div>
            ${k === 'cv' || k === 'ren'
              ? C.seg({ name: names[k], value: 0, cls: 'stack', options: opts.map((o, i) => [i, `<span style="flex:1">${o}</span><b class="num" style="margin-left:8px">${i}</b>`]) })
              : C.seg({ name: names[k], value: 0, cls: 'wrap3', options: opts.map((o, i) => [i, o, `${i} pt`]) })}</section>`;
        }).join('')}
        <p class="ref">Δ SOFA ≥ 2 em relação ao basal define disfunção orgânica (Sepsis-3). Itens não avaliados ficam em 0. Respiratório: 3 ou 4 pontos exigem suporte ventilatório; P/F &lt; 200 sem suporte pontua 2. Mortalidade observada por faixa de SOFA na admissão (Ferreira, JAMA 2001: 0–1, 2–3, 4–5, 6–7, 8–9, 10–11, ≥ 12); é dado de coorte, não previsão individual.</p>
      `;
      let total = 0;
      function calc() {
        total = SOFA.reduce((a, [k]) => a + +(C.radioVal(body, names[k]) || 0), 0);
        /* mortalidade observada pelo SOFA da admissão — Ferreira FL et al. JAMA 2001;286:1754 (352 pacientes, UTI clínico-cirúrgica) */
        const [cls, t] = total <= 1 ? ['ok', 'Mortalidade observada 0%'] : total <= 3 ? ['ok', 'Mortalidade observada 6,4%'] : total <= 5 ? ['warn', 'Mortalidade observada 20,2%'] : total <= 7 ? ['warn', 'Mortalidade observada 21,5%'] : total <= 9 ? ['crit', 'Mortalidade observada 33,3%'] : total <= 11 ? ['crit', 'Mortalidade observada 50,0%'] : ['crit', 'Mortalidade observada 95,2%'];
        body.querySelector('#sofaOut').innerHTML = `<div class="verdict ${cls}" style="position:sticky;top:calc(var(--bar-h) + var(--safe-t));z-index:5"><div class="v-k">SOFA total</div><div class="v-t num">${total} <span style="font-size:16px;opacity:.7">/ 24</span></div><div class="v-d">${t}</div><div class="progress"><i style="width:${total / 24 * 100}%;background:currentColor"></i></div></div>`;
      }
      root.addEventListener('change', calc);
      calc();
      api.summary = () => {
        const parts = SOFA.map(([k, sys]) => `${sys.slice(0, 4).toLowerCase()} ${C.radioVal(body, names[k]) || 0}`);
        return `SOFA ${total} (${parts.join(', ')}).`;
      };
    },
  });

  /* ================= bundle 1ª hora ================= */
  const BUNDLE = [
    ['Medir lactato', 'Se &gt; 2 mmol/L: ressuscitação ativa. Se ≥ 4: fluido mesmo sem hipotensão.'],
    ['Hemoculturas antes do antibiótico', 'Mínimo 2 pares. Não atrasar o antibiótico pela coleta.'],
    ['Antibiótico de amplo espectro', 'Dentro da 1ª hora. Ver “ATB empírico por foco”.'],
    ['Cristaloide 30 mL/kg', 'Se hipotensão ou lactato ≥ 4. Completar em até 3 h.'],
    ['Vasopressor se hipotensão persistente', 'Meta PAM ≥ 65. Pode iniciar em acesso periférico. 1ª escolha: noradrenalina.'],
    ['Repetir lactato em 2–4 h', 'Se lactato inicial &gt; 2. Meta: queda ≥ 10%.'],
  ];
  C.register({
    id: 'bundle', group: 'inf', tile: '1h', weight: true,
    title: 'Bundle da 1ª hora',
    sub: 'Checklist SSC/ILAS e volume de 30 mL/kg',
    keywords: ['surviving sepsis', 'ssc', 'ilas', 'hemocultura', 'cristaloide', '30 ml/kg', 'ressuscitacao volemica', 'checklist'],
    render(body, api, root) {
      body.innerHTML = `
        <div class="outs" style="margin-bottom:12px">
          ${C.out({ id: 'bVol', label: 'Cristaloide 30 mL/kg', cls: 'span2', note: 'Informe o peso no topo' })}
        </div>
        ${C.card('', `${C.field({ id: 'bLac', label: 'Lactato inicial', unit: 'mmol/L', ph: '3,2', opt: true, lim: [0.1, 30] })}<div id="bLacOut"></div>`)}
        <section class="card">
          <div class="card-h"><h2>Checklist</h2><span class="aux num" id="bCount">0/6</span></div>
          <div class="checks">${BUNDLE.map(([t, s], i) => C.check({ id: 'b' + i, label: `${i + 1}. ${t}`, sub: s })).join('')}</div>
          <div class="progress"><i id="bBar" style="width:0"></i></div>
        </section>
        ${C.note('warn', '<b>Reavaliação em 6 h</b> (hiperlactatemia ou hipotensão): PAM, diurese, nível de consciência, perfusão periférica e lactato.')}
      `;
      let txt = '';
      function calc() {
        const p = C.peso(root);
        if (p > 0) C.setOut(body, 'bVol', C.fmt(Math.round(p * 30), 0), 'mL', 'info', `${C.fmt(p, 0)} kg × 30 mL/kg · em até 3 h`, '');
        else C.setOut(body, 'bVol', null, '', '', '', 'Informe o peso no topo');
        const lac = C.val(body, 'bLac');
        body.querySelector('#bLacOut').innerHTML = lac >= 4 ? C.note('crit', 'Lactato ≥ 4: iniciar 30 mL/kg independentemente da PA.') : lac > 2 ? C.note('warn', 'Lactato &gt; 2: repetir em 2–4 h (meta queda ≥ 10%).') : '';
        const done = BUNDLE.filter((_, i) => C.checked(body, 'b' + i)).length;
        body.querySelector('#bCount').textContent = done === 6 ? 'Completo' : `${done}/6`;
        const bar = body.querySelector('#bBar');
        bar.style.width = (done / 6 * 100) + '%';
        bar.style.background = done === 6 ? 'var(--ok)' : done >= 3 ? 'var(--warn)' : 'var(--crit)';
        const pend = BUNDLE.filter((_, i) => !C.checked(body, 'b' + i)).map(([t]) => t.toLowerCase());
        txt = `Bundle sepse 1ª h: ${done}/6 concluídos${pend.length ? '; pendente: ' + pend.join('; ') : ''}.${p > 0 ? ` Volume 30 mL/kg = ${Math.round(p * 30)} mL.` : ''}${Number.isFinite(lac) ? ` Lactato inicial ${C.fmt(lac, 1)} mmol/L.` : ''}`;
      }
      root.addEventListener('input', calc);
      root.addEventListener('change', calc);
      api.summary = () => txt;
    },
  });

  /* ================= perfusão / metas hemodinâmicas ================= */
  C.register({
    id: 'perfusao', group: 'inf', tile: 'PAM', weight: true,
    title: 'Metas de perfusão',
    sub: 'PAM, clearance de lactato, diurese, vasopressores',
    keywords: ['clearance de lactato', 'diurese', 'pam', 'pressao arterial media', 'hemodinamica', 'vasopressor', 'choque', 'oliguria'],
    render(body, api, root) {
      body.innerHTML = `
        <section class="card"><div class="grid">
          ${C.field({ id: 'hPam', label: 'PAM', unit: 'mmHg', ph: '62', lim: [10, 200] })}
          ${C.field({ id: 'hDiu', label: 'Diurese', unit: 'mL/h', ph: '35', lim: [0, 2000] })}
          ${C.field({ id: 'hLac', label: 'Lactato atual', unit: 'mmol/L', ph: '2,8', lim: [0.1, 30] })}
          ${C.field({ id: 'hLac0', label: 'Lactato anterior', unit: 'mmol/L', ph: '4,1', lim: [0.1, 30] })}
        </div></section>
        <div class="outs">
          ${C.out({ id: 'oPam', label: 'PAM', sm: true })}
          ${C.out({ id: 'oLac', label: 'Lactato', sm: true })}
          ${C.out({ id: 'oCl', label: 'Clearance lactato', sm: true })}
          ${C.out({ id: 'oDiu', label: 'Diurese', sm: true })}
        </div>
        <div id="hAlert"></div>
        <div style="height:12px"></div>
        ${C.card('Estratégia vasopressora', C.steps([
          ['crit', '<b>1ª linha:</b> noradrenalina — iniciar cedo; acesso periférico aceitável até o central.'],
          ['warn', '<b>2ª linha:</b> associar vasopressina (até 0,03 UI/min) quando a nora atinge 0,25–0,5 mcg/kg/min.'],
          ['warn', '<b>3ª linha:</b> adrenalina se PAM inadequada com nora + vasopressina.'],
          ['', '<b>Dopamina:</b> não recomendada de rotina; só em casos selecionados (bradicardia, baixo risco de taquiarritmia).'],
          ['ok', '<b>Meta PAM ≥ 65 mmHg</b> — considerar 70–80 em HAS prévia ou oligúria refratária.'],
        ]), 'SSC')}
      `;
      let txt = '';
      function calc() {
        const pam = C.val(body, 'hPam'), lac = C.val(body, 'hLac'), lac0 = C.val(body, 'hLac0'), diu = C.val(body, 'hDiu'), p = C.peso(root);
        const parts = [];
        if (Number.isFinite(pam)) {
          const [c, s] = pam < 65 ? ['crit', 'Baixa — vasopressor'] : pam > 80 ? ['warn', 'Elevada — reavaliar'] : ['ok', 'Adequada'];
          C.setOut(body, 'oPam', C.fmt(pam, 0), 'mmHg', c, s); parts.push(`PAM ${pam} mmHg`);
        } else C.setOut(body, 'oPam', null);
        if (Number.isFinite(lac)) {
          C.setOut(body, 'oLac', C.fmt(lac, 1), 'mmol/L', lac > 2 ? 'crit' : 'ok', lac > 2 ? 'Hiperlactatemia' : 'Normal'); parts.push(`lactato ${C.fmt(lac, 1)}`);
        } else C.setOut(body, 'oLac', null);
        if (C.ok(lac, lac0) && lac0 > 0) {
          const cl = (lac0 - lac) / lac0 * 100;
          C.setOut(body, 'oCl', C.fmt(cl, 0), '%', cl >= 10 ? 'ok' : 'crit', cl >= 10 ? 'Adequado (≥ 10%)' : 'Inadequado — reavaliar'); parts.push(`clearance de lactato ${C.fmt(cl, 0)}%`);
        } else C.setOut(body, 'oCl', null, '', '', '', 'atual + anterior');
        if (Number.isFinite(diu) && p > 0) {
          const dk = diu / p;
          C.setOut(body, 'oDiu', C.fmt(dk, 2), 'mL/kg/h', dk >= 0.5 ? 'ok' : 'crit', dk >= 0.5 ? 'Adequada (≥ 0,5)' : 'Oligúria'); parts.push(`diurese ${C.fmt(dk, 2)} mL/kg/h`);
        } else C.setOut(body, 'oDiu', null, '', '', '', Number.isFinite(diu) ? 'informe o peso' : '');
        body.querySelector('#hAlert').innerHTML = pam < 65 && lac > 2 ? C.note('crit', 'PAM &lt; 65 com lactato &gt; 2 — vasopressor e reavaliação volêmica urgente.') : '';
        txt = parts.length ? 'Perfusão: ' + parts.join(', ') + '.' : '';
      }
      root.addEventListener('input', calc);
      api.summary = () => txt;
    },
  });

  /* ================= oxigenação ================= */
  C.register({
    id: 'oxigenacao', group: 'resp', tile: 'DO₂',
    title: 'Oxigenação e transporte de O₂',
    sub: 'P/F, extração de O₂, SvO₂, DO₂, VO₂',
    keywords: ['pao2/fio2', 'p/f', 'relacao pf', 'horowitz', 'sdra', 'svo2', 'scvo2', 'teo2', 'extracao', 'do2', 'vo2', 'oferta de oxigenio', 'debito cardiaco'],
    render(body, api, root) {
      body.innerHTML = `
        <section class="card"><div class="grid">
          ${C.field({ id: 'oPa', label: 'PaO₂', unit: 'mmHg', ph: '85', lim: [10, 700] })}
          ${C.field({ id: 'oFi', label: 'FiO₂', unit: '%', ph: '40', hint: 'aceita 40 ou 0,4', lim: [0.21, 100] })}
          ${C.field({ id: 'oSa', label: 'SaO₂', unit: '%', ph: '96', lim: [10, 100] })}
          ${C.field({ id: 'oSv', label: 'SvO₂ / ScvO₂', unit: '%', ph: '65', lim: [5, 100] })}
          ${C.field({ id: 'oHb', label: 'Hemoglobina', unit: 'g/dL', ph: '10', lim: [1, 25] })}
          ${C.field({ id: 'oDc', label: 'Débito cardíaco', unit: 'L/min', ph: '4,5', lim: [0.5, 25] })}
        </div></section>
        <div class="outs">
          ${C.out({ id: 'rPf', label: 'PaO₂/FiO₂', sm: true })}
          ${C.out({ id: 'rTe', label: 'Extração O₂', sm: true, note: 'normal 20–30%' })}
          ${C.out({ id: 'rSv', label: 'SvO₂ / ScvO₂', sm: true, note: 'SvO₂ 65–75% · ScvO₂ ≥ 70%' })}
          ${C.out({ id: 'rDo', label: 'DO₂ estimada', sm: true })}
          ${C.out({ id: 'rVo', label: 'VO₂ estimado', sm: true, cls: 'span2' })}
        </div>
        <div id="oAlert"></div>
        <div style="height:12px"></div>
        ${C.card('Leitura rápida', C.steps([
          ['crit', '<b>Extração &gt; 50%:</b> hipoperfusão grave — aumentar oferta (Hb, DC, SaO₂) ou reduzir consumo.'],
          ['warn', '<b>SvO₂ &lt; 65%:</b> extração aumentada → baixo débito ou anemia grave.'],
          ['warn', '<b>SvO₂ &gt; 80%:</b> shunt ou bloqueio mitocondrial (sepse avançada).'],
          ['info', '<b>P/F</b> (Berlim, com PEEP ≥ 5): 201–300 leve · 101–200 moderada · ≤ 100 grave.'],
          ['', '<b>Meta Hb</b> &gt; 7 g/dL; no choque com baixo DC ou isquemia, considerar 8–9.'],
        ]))}
      `;
      let txt = '';
      function calc() {
        const pa = C.val(body, 'oPa'), sa = C.val(body, 'oSa'), sv = C.val(body, 'oSv'), hb = C.val(body, 'oHb'), dc = C.val(body, 'oDc');
        const fi = C.fio2(C.val(body, 'oFi'));
        const parts = [];
        const pf = C.ok(pa, fi) && fi > 0 ? pa / fi : NaN;
        if (Number.isFinite(pf)) {
          const [c, s] = C.berlin(pf);
          C.setOut(body, 'rPf', C.fmt(pf, 0), '', c, s); parts.push(`P/F ${C.fmt(pf, 0)} (${s.toLowerCase()})`);
        } else C.setOut(body, 'rPf', null);
        const te = C.ok(sa, sv) && sa > 0 ? (sa - sv) / sa * 100 : NaN;
        if (Number.isFinite(te)) {
          const [c, s] = te <= 30 ? ['ok', 'Normal'] : te <= 50 ? ['warn', 'Aumentada — hipoperfusão'] : ['crit', 'Muito alta — choque'];
          C.setOut(body, 'rTe', C.fmt(te, 0), '%', c, s); parts.push(`TEO₂ ${C.fmt(te, 0)}%`);
        } else C.setOut(body, 'rTe', null, '', '', '', 'SaO₂ + SvO₂');
        if (Number.isFinite(sv)) {
          const [c, s] = sv < 65 ? ['crit', 'Baixa — baixo DC ou anemia'] : sv > 80 ? ['warn', 'Alta — shunt / disfunção mitocondrial'] : ['ok', 'Normal'];
          C.setOut(body, 'rSv', C.fmt(sv, 0), '%', c, s); parts.push(`SvO₂ ${C.fmt(sv, 0)}%`);
        } else C.setOut(body, 'rSv', null, '', '', '', 'SvO₂ 65–75% · ScvO₂ ≥ 70%');
        const do2 = C.ok(dc, hb, sa, pa) ? dc * (hb * 1.34 * (sa / 100) + 0.003 * pa) * 10 : NaN;
        if (Number.isFinite(do2)) { C.setOut(body, 'rDo', C.fmt(do2, 0), 'mL/min', 'info', ''); parts.push(`DO₂ ${C.fmt(do2, 0)} mL/min`); }
        else C.setOut(body, 'rDo', null, '', '', '', 'DC, Hb, SaO₂, PaO₂');
        const vo2 = C.ok(do2, te) ? do2 * te / 100 : NaN;
        if (Number.isFinite(vo2)) { C.setOut(body, 'rVo', C.fmt(vo2, 0), 'mL/min', 'info', 'DO₂ × extração'); parts.push(`VO₂ ${C.fmt(vo2, 0)} mL/min`); }
        else C.setOut(body, 'rVo', null, '', '', '', 'DO₂ × extração');
        body.querySelector('#oAlert').innerHTML = te > 50 && sv < 65 ? C.note('crit', 'Extração &gt; 50% com SvO₂ baixa — hipoperfusão grave. Otimizar DC, corrigir anemia, considerar inotrópico.') : '';
        txt = parts.length ? parts.join('; ') + '.' : '';
      }
      root.addEventListener('input', calc);
      api.summary = () => txt;
    },
  });

  /* ================= ATB empírico por foco ================= */
  const P = '<span class="pill ok">1ª escolha</span>', A = '<span class="pill warn">Alternativa</span>', X = '<span class="pill info">Associar</span>';
  const FOCO = {
    pul: ['Pulmonar (PAC / PAH)', [
      ['PAC leve-moderada', 'Amoxicilina-clavulanato', P],
      ['PAC moderada-grave', 'Piperacilina-tazobactam + azitromicina', P],
      ['PAC com risco de Pseudomonas', 'Piperacilina-tazobactam ou cefepime', P],
      ['PAH / PAVM precoce', 'Ceftriaxona ou ampicilina-sulbactam', P],
      ['PAH / PAVM tardia', 'Piperacilina-tazobactam + amicacina ± vancomicina', P],
      ['Risco de MDR', 'Meropenem', A],
    ]],
    uri: ['Urinário', [
      ['ITU grave sem cateter', 'Ceftriaxona 2 g IV 1×/dia', P],
      ['Com cateter / suspeita de ESBL', 'Ertapenem 1 g IV 1×/dia', P],
      ['Sem MDR local', 'Ciprofloxacino 400 mg IV 12/12 h', A],
      ['Enterococo suspeito', 'Ampicilina 2 g IV 4/4 h', X],
    ]],
    abd: ['Abdominal', [
      ['Peritonite comunitária', 'Piperacilina-tazobactam 4,5 g IV 6/6 h', P],
      ['Peritonite hospitalar / pós-op.', 'Meropenem 1 g IV 8/8 h', P],
      ['Colangite', 'Ceftriaxona + metronidazol', P],
      ['Candidemia suspeita', 'Fluconazol ou equinocandina', X],
    ]],
    pele: ['Pele e partes moles', [
      ['Celulite grave / erisipela', 'Oxacilina 2 g IV 4/4 h', P],
      ['MRSA suspeito', 'Vancomicina 15–20 mg/kg IV 12/12 h', P],
      ['Fasciíte necrosante', 'Piperacilina-tazobactam + clindamicina + vancomicina', P],
      ['MRSA — alternativa', 'Linezolida 600 mg IV 12/12 h', A],
    ]],
    snc: ['SNC — meningite bacteriana', [
      ['Comunitária, imunocompetente', 'Ceftriaxona 2 g IV 12/12 h + dexametasona 0,15 mg/kg 6/6 h', P],
      ['&gt; 50 anos ou imunossuprimido', 'Ampicilina 2 g IV 4/4 h (Listeria)', X],
      ['Nosocomial / pós-neurocirurgia', 'Meropenem + vancomicina', P],
    ]],
    eco: ['Endocardite', [
      ['Valva nativa — S. aureus', 'Oxacilina 2 g IV 4/4 h', P],
      ['MRSA, valva nativa', 'Vancomicina', P],
      ['Valva protética (estafilococo)', 'Vancomicina + rifampicina + gentamicina', P],
      ['Streptococcus sensível à penicilina', 'Penicilina G cristalina ou ceftriaxona (± gentamicina)', P],
      ['Enterococcus', 'Ampicilina + gentamicina ou ampicilina + ceftriaxona', P],
    ]],
    desc: ['Foco desconhecido', [
      ['Comunitário, imunocompetente', 'Piperacilina-tazobactam 4,5 g IV 6/6 h', P],
      ['Hospitalar / UTI (&gt; 48 h)', 'Meropenem 1 g IV 8/8 h', P],
      ['Risco de MRSA (cateter, diálise, pele)', 'Vancomicina 15–20 mg/kg IV 12/12 h', X],
      ['Risco fúngico (transplante, ATB prolongado)', 'Micafungina 100 mg/dia', X],
    ]],
  };
  C.register({
    id: 'atb-foco', group: 'inf', tile: 'ATB',
    title: 'ATB empírico por foco',
    sub: 'Pulmonar, urinário, abdominal, pele, SNC…',
    keywords: ['antibiotico', 'empirico', 'pneumonia', 'pac', 'pavm', 'itu', 'meningite', 'endocardite', 'peritonite', 'celulite', 'fasciite', 'colangite', 'foco'],
    render(body, api, root) {
      const name = C.uid('foco');
      body.innerHTML = `
        <section class="card">${C.seg({ name, label: 'Foco suspeito', cls: 'wrap2', options: Object.entries(FOCO).map(([k, [l]]) => [k, l]) })}</section>
        <div id="abxOut"></div>
        ${C.note('info', 'Reavaliar em 48–72 h com culturas e descalonar assim que possível (SSC). Ajustar à microbiologia local e à função renal (ver “Ajuste renal de ATB”).')}
      `;
      let txt = '';
      root.addEventListener('change', () => {
        const k = C.radioVal(body, name); if (!k) return;
        const [l, rows] = FOCO[k];
        body.querySelector('#abxOut').innerHTML = `<section class="card"><div class="card-h"><h2>${l}</h2></div>
          <table class="tbl"><tbody>${rows.map(([s, a, t]) => `<tr><td style="width:40%">${s}</td><td><b style="font-weight:600;color:var(--ink)">${a}</b><div style="margin-top:4px">${t}</div></td></tr>`).join('')}</tbody></table></section>`;
        txt = `${l}: ` + rows.map(([s, a]) => `${s.replace(/&gt;/g, '>')} → ${a}`).join('; ') + '.';
        body.querySelector('#abxOut').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      api.summary = () => txt;
    },
  });

  /* ================= ajuste renal de antimicrobianos ================= */
  const CLS = {
    betalact: ['Betalactâmicos', ['Ampicilina-sulbactam', 'Piperacilina-tazobactam', 'Ceftriaxona', 'Cefepime', 'Ceftazidima', 'Ceftazidima-avibactam', 'Meropenem', 'Ertapenem', 'Imipenem']],
    amino: ['Aminoglicosídeos', ['Amicacina', 'Gentamicina']],
    glico: ['Glicopeptídeos', ['Vancomicina', 'Teicoplanina']],
    quino: ['Quinolonas', ['Ciprofloxacino', 'Levofloxacino']],
    fungi: ['Antifúngicos', ['Fluconazol', 'Voriconazol IV', 'Micafungina', 'Anfotericina B lipossomal']],
    outros: ['Outros', ['Metronidazol', 'SMX-TMP', 'Polimixina B', 'Colistina', 'Linezolida', 'Daptomicina']],
  };
  /* Dose habitual (função renal normal) — base das tabelas abaixo */
  const NORMAL = {
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
  const COLISTIN = [[90, 360, 10.9], [80, 340, 10.3], [70, 300, 9.0], [60, 275, 8.35], [50, 245, 7.4], [40, 220, 6.65], [30, 195, 5.9], [20, 175, 5.3], [10, 160, 4.85], [5, 145, 4.4], [0, 130, 3.95]];
  const colistin = (cl) => {
    const [, mg, miu] = COLISTIN.find(([m]) => cl >= m);
    return `${mg} mg CBA/dia (${C.fmtN(miu)} MUI/dia) em 2 doses: ${C.fmtN(mg / 2)} mg CBA (${C.fmtN(Math.round(miu / 2 * 100) / 100)} MUI) 12/12 h. Ataque 300 mg CBA (≈ 9 MUI) em 0,5–1 h; 1ª manutenção 12–24 h depois. Hemodiálise intermitente: 130 mg CBA/dia + 40 mg (sessão de 3 h) ou 50 mg (4 h) com a dose pós-diálise. Hemodiálise contínua: 440 mg CBA/dia.`;
  };

  /* Faixas por ClCr. Cada faixa: [operador, limite, dose, classe, rótulo]
     '>' = estritamente maior · '≥' = maior ou igual. Fonte: bula FDA (DailyMed) salvo indicação. */
  const DB = {
    'Ampicilina-sulbactam': [ /* bula Unasyn, tabela 3 */
      ['≥', 30, '1,5–3 g IV 6/6–8/8 h', 'ok', 'Sem ajuste'],
      ['≥', 15, '1,5–3 g IV 12/12 h', 'leve', 'Ajuste leve'],
      ['≥', 5, '1,5–3 g IV 24/24 h', 'mod', 'Ajuste moderado'],
      ['≥', 0, 'ClCr &lt; 5: sem recomendação na bula — discutir com a farmácia clínica. Hemodiálise: dar após a sessão.', 'grave', 'Sem dado em bula']],
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
      ['≥', 60, '15 mg/kg IV 24/24 h. Vale &lt; 5 mcg/mL.', 'ok', 'Sem ajuste'],
      ['≥', 40, '15 mg/kg IV 36/36 h. Nível sérico obrigatório.', 'leve', 'Intervalo 36 h'],
      ['≥', 20, '15 mg/kg IV 48/48 h. Nível sérico obrigatório.', 'mod', 'Intervalo 48 h'],
      ['≥', 0, 'Intervalo estendido não se aplica com ClCr &lt; 20: dose convencional guiada por nível sérico. Hemodiálise: dar após a sessão.', 'grave', 'Guiar por nível']],
    'Gentamicina': [ /* Hartford: Nicolau DP et al. AAC 1995;39:650 */
      ['≥', 60, '7 mg/kg IV 24/24 h. Vale &lt; 1 mcg/mL.', 'ok', 'Sem ajuste'],
      ['≥', 40, '7 mg/kg IV 36/36 h. Nível sérico obrigatório.', 'leve', 'Intervalo 36 h'],
      ['≥', 20, '7 mg/kg IV 48/48 h. Nível sérico obrigatório.', 'mod', 'Intervalo 48 h'],
      ['≥', 0, 'Hartford não se aplica com ClCr &lt; 20: dose convencional guiada por nível sérico. Hemodiálise: dar após a sessão.', 'grave', 'Guiar por nível']],
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
      ['≥', 5, '200–400 mg IV 18–24 h. Hemodiálise/DP removem &lt; 10%: dar após a sessão.', 'leve', 'Ajuste leve'],
      ['≥', 0, 'ClCr &lt; 5: sem recomendação na bula — discutir com a farmácia clínica.', 'grave', 'Sem dado em bula']],
    'Levofloxacino': [ /* bula levofloxacino IV */
      ['≥', 50, '500–750 mg IV 24 h', 'ok', 'Sem ajuste'],
      ['≥', 20, 'Esquema 750 mg: 750 mg 48/48 h · esquema 500 mg: 500 mg de ataque → 250 mg 24/24 h', 'leve', 'Ajuste leve'],
      ['≥', 10, 'Esquema 750 mg: 750 mg → 500 mg 48/48 h · esquema 500 mg: 500 mg → 250 mg 48/48 h', 'mod', 'Ajuste moderado'],
      ['≥', 0, 'ClCr &lt; 10 sem diálise: sem dado na bula. Hemodiálise/DP: 750 mg → 500 mg 48/48 h (ou 500 → 250 mg 48/48 h), sem suplemento após a sessão.', 'mod', 'Ajuste moderado']],
    'Fluconazol': [
      ['>', 50, 'Dose plena (400–800 mg 24 h)', 'ok', 'Sem ajuste'],
      ['≥', 0, 'Ataque com dose plena; depois 50% da dose. Hemodiálise: 100% da dose após cada sessão; dose reduzida nos dias sem diálise.', 'leve', 'Reduzir 50%']],
    'Voriconazol IV': [
      ['≥', 50, '6 mg/kg IV 12/12 h × 2 → 4 mg/kg 12/12 h. Nível 1–5,5 mcg/mL.', 'ok', 'Sem ajuste'],
      ['≥', 0, 'Veículo SBECD acumula com ClCr &lt; 50: preferir a via oral, salvo benefício que justifique IV (monitorar creatinina).', 'evitar', 'Preferir VO']],
    'Micafungina': [['≥', 0, '100 mg IV 24 h (candidemia) · 150 mg (esofágica). Sem ajuste em qualquer grau de DRC.', 'ok', 'Sem ajuste']],
    'Anfotericina B lipossomal': [['≥', 0, '3–5 mg/kg IV 24 h, sem ajuste de dose. Nefrotóxica — creatinina, K e Mg diários.', 'monit', 'Monitorar rim']],
    'Metronidazol': [['≥', 0, '500 mg IV/VO 8/8 h — sem ajuste pela bula. Hemodiálise: dar após a sessão. Em DRC grave os metabólitos acumulam: vigiar neurotoxicidade.', 'ok', 'Sem ajuste']],
    'SMX-TMP': [ /* bula Bactrim */
      ['>', 30, 'Dose habitual', 'ok', 'Sem ajuste'],
      ['≥', 15, '50% da dose habitual. Monitorar K⁺ e hemograma.', 'leve', 'Reduzir 50%'],
      ['≥', 0, 'Uso não recomendado pela bula. Se imprescindível, decidir com farmácia clínica/nefrologia e monitorar K⁺ e hemograma.', 'evitar', 'Não recomendado']],
    'Polimixina B': [['≥', 0, 'Sem ajuste renal: 1,25–1,5 mg/kg IV 12/12 h, ataque 2–2,5 mg/kg. Nefrotóxica — creatinina diária. Não é removida por diálise.', 'monit', 'Monitorar rim']],
    'Colistina': [['≥', 0, colistin, 'monit', 'Dose por ClCr']],
    'Linezolida': [['≥', 0, '600 mg IV/VO 12/12 h — sem ajuste. Em DRC grave e uso &gt; 14 dias: vigiar plaquetopenia e anemia.', 'ok', 'Sem ajuste']],
    'Daptomicina': [ /* bula Cubicin RF */
      ['≥', 30, '6–10 mg/kg IV 24 h', 'ok', 'Sem ajuste'],
      ['≥', 0, 'Mesma dose por kg (4–6 mg/kg) a cada 48 h. Hemodiálise/DP: após a sessão nos dias de diálise.', 'mod', 'Ajuste moderado']],
  };
  const CMAP = { ok: 'ok', leve: 'warn', mod: 'warn', grave: 'crit', evitar: 'violet', monit: 'info' };
  function stage(t) {
    if (!Number.isFinite(t)) return ['', '—'];
    if (t >= 90) return ['ok', 'G1 · normal'];
    if (t >= 60) return ['ok', 'G2 · redução leve'];
    if (t >= 45) return ['warn', 'G3a · leve-moderada'];
    if (t >= 30) return ['warn', 'G3b · moderada'];
    if (t >= 15) return ['crit', 'G4 · grave'];
    return ['crit', 'G5 · falência renal'];
  }
  /* cada faixa: [operador, limite, dose, classe, rótulo]; '>' = estritamente maior, '≥' = maior ou igual */
  const pick = (name, cl) => DB[name].find(([op, m]) => (op === '>' ? cl > m : cl >= m)) || DB[name][DB[name].length - 1];
  /* dose (texto) para uma droga e um ClCr — usado na tela e nos testes */
  C.atbDose = (name, cl) => { const b = pick(name, cl); return { dose: typeof b[2] === 'function' ? b[2](cl) : b[2], cls: b[3], badge: b[4] }; };
  const selected = new Set();

  C.register({
    id: 'atb', group: 'inf', tile: 'ClCr',
    title: 'Ajuste renal de ATB',
    sub: 'Cockcroft-Gault, CKD-EPI 2021 e dose por droga',
    keywords: ['clearance', 'creatinina', 'tfg', 'cockcroft', 'ckd-epi', 'funcao renal', 'antibiotico', ...Object.keys(DB), 'pipetazo', 'tazocin', 'vanco', 'mero', 'polimixina', 'hemodialise'],
    render(body, api, root) {
      const sexName = C.uid('sx'), basis = C.uid('bs');
      body.innerHTML = `
        <section class="card">
          <div class="grid">
            ${C.field({ id: 'aId', label: 'Idade', unit: 'anos', ph: '65', p: 'idade' })}
            ${C.field({ id: 'aCr', label: 'Creatinina', unit: 'mg/dL', ph: '1,4', p: 'cr' })}
            ${C.field({ id: 'aPe', label: 'Peso', unit: 'kg', ph: '70', p: 'peso' })}
            ${C.field({ id: 'aAl', label: 'Altura', unit: 'cm', ph: '170', p: 'altura', opt: true })}
            <div class="span2">${C.seg({ name: sexName, label: 'Sexo biológico', cls: 'cols', p: 'sexo', options: [['M', 'Masculino'], ['F', 'Feminino']] })}</div>
          </div>
        </section>
        <div class="outs" style="margin-bottom:8px">
          ${C.out({ id: 'oCg', label: 'Cockcroft-Gault', sm: true })}
          ${C.out({ id: 'oCkd', label: 'CKD-EPI 2021', sm: true })}
        </div>
        <div id="aWarn"></div>
        <div style="margin:12px 0 4px">${C.seg({ name: basis, label: 'Ajustar doses por', cls: 'cols', value: 'cg', options: [['cg', 'Cockcroft-Gault', 'padrão das bulas'], ['ckd', 'CKD-EPI']] })}</div>
        <section class="card" style="margin-top:12px">
          <div class="card-h"><h2>Antimicrobianos</h2><button type="button" class="btn sm" id="aClr" hidden>Limpar</button></div>
          ${Object.entries(CLS).map(([k, [l, ds]]) => `<div class="drug-group">${C.lbl(l, 'sub-lbl')}<div class="chips">${ds.map((d) => { const id = C.uid('d'); return `<input type="checkbox" id="${id}" data-drug="${C.esc(d)}" ${selected.has(d) ? 'checked' : ''}><label for="${id}">${d}</label>`; }).join('')}</div></div>`).join('')}
        </section>
        <div id="aRes"></div>
        <button type="button" class="fab" id="aFab" hidden></button>
        <p class="ref">Fontes: bulas FDA (DailyMed) de cada droga; teicoplanina: SPC Targocid (UK); gentamicina: nomograma de Hartford (Nicolau 1995); vancomicina: ASHP/IDSA 2020; colistina: consenso internacional 2019 (Tsuji). O consenso da colistina calcula o ClCr com peso ajustado. Drogas nefrotóxicas exigem controle laboratorial seriado; validar com a farmácia clínica.</p>
      `;
      let txt = '';
      function calc() {
        const age = C.val(body, 'aId'), cr = C.val(body, 'aCr'), wt = C.val(body, 'aPe'), ht = C.val(body, 'aAl');
        const sex = C.radioVal(body, sexName);
        const w = C.renal.cgWeight(wt, ht, sex);
        const cg = C.renal.cockcroft(age, w.kg, cr, sex);
        const ckd = C.renal.ckdepi(age, cr, sex);
        const sCg = stage(cg), sCk = stage(ckd);
        C.setOut(body, 'oCg', Number.isFinite(cg) ? C.fmt(cg, 1) : null, 'mL/min', sCg[0], sCg[1], Number.isFinite(cg) ? w.label : '');
        C.setOut(body, 'oCkd', Number.isFinite(ckd) ? C.fmt(ckd, 1) : null, 'mL/min/1,73m²', sCk[0], sCk[1], Number.isFinite(ckd) ? 'estadiamento KDIGO' : '');
        if (!Number.isFinite(cg)) body.querySelector('#oCg .o-n').textContent = 'idade, peso, sexo, Cr';
        if (!Number.isFinite(ckd)) body.querySelector('#oCkd .o-n').textContent = 'idade, sexo, Cr';
        body.querySelector('#aWarn').innerHTML = C.ok(cg, ckd) && Math.abs(cg - ckd) > 20
          ? C.note('info', `Divergência de ${C.fmt(Math.abs(cg - ckd), 0)} mL/min entre as fórmulas. Para dose, prefira Cockcroft-Gault (usada nas bulas); CKD-EPI é melhor para estadiar DRC.`) : '';

        const useCkd = C.radioVal(body, basis) === 'ckd';
        let cl = useCkd ? ckd : cg; let basisLbl = useCkd ? 'CKD-EPI' : 'Cockcroft-Gault';
        if (!Number.isFinite(cl) && Number.isFinite(ckd)) { cl = ckd; basisLbl = 'CKD-EPI (CG indisponível)'; }
        body.querySelector('#aClr').hidden = selected.size === 0;
        const out = body.querySelector('#aRes');
        if (!selected.size) { out.innerHTML = '<div class="empty">Selecione os antimicrobianos acima.</div>'; txt = ''; return; }
        if (!Number.isFinite(cl)) { out.innerHTML = C.note('warn', 'Preencha idade, sexo e creatinina (e peso para Cockcroft-Gault) para ver as doses.'); txt = ''; return; }
        let html = C.lbl(`Doses para ClCr ${C.fmt(cl, 1)} mL/min · ${basisLbl}`, 'sub-lbl');
        const lines = [];
        Object.values(CLS).forEach(([, ds]) => ds.filter((d) => selected.has(d)).forEach((d) => {
          const band = pick(d, cl);
          const dose = typeof band[2] === 'function' ? band[2](cl) : band[2], c = band[3], badge = band[4];
          const cls = CMAP[c];
          html += `<section class="card rx ${cls}"><div class="rx-h"><b>${d}</b><span class="pill ${cls}">${badge}</span></div>
            <div class="rx-d">${dose}</div><div class="rx-n">Dose habitual: <s>${NORMAL[d]}</s></div></section>`;
          lines.push(`${d}: ${dose.replace(/&lt;/g, '<').replace(/&gt;/g, '>')}`);
        }));
        out.innerHTML = html;
        const pt = [Number.isFinite(age) && `${age} anos`, sex && (sex === 'M' ? 'masc.' : 'fem.'), Number.isFinite(wt) && `${wt} kg`, Number.isFinite(cr) && `Cr ${C.fmt(cr, 2)}`].filter(Boolean).join(', ');
        txt = `Função renal (${pt}): Cockcroft-Gault ${Number.isFinite(cg) ? C.fmt(cg, 1) : '—'} mL/min (${w.label}); CKD-EPI 2021 ${Number.isFinite(ckd) ? C.fmt(ckd, 1) : '—'} mL/min/1,73m². Ajuste por ${basisLbl}:\n` + lines.join('\n');
      }
      root.addEventListener('input', calc);
      root.addEventListener('change', (e) => {
        if (e.target.dataset && e.target.dataset.drug) { e.target.checked ? selected.add(e.target.dataset.drug) : selected.delete(e.target.dataset.drug); }
        calc();
      });
      body.querySelector('#aClr').addEventListener('click', () => { selected.clear(); body.querySelectorAll('[data-drug]').forEach((i) => (i.checked = false)); calc(); });
      /* atalho flutuante para as doses quando estão abaixo da tela */
      const fab = body.querySelector('#aFab'), res = body.querySelector('#aRes');
      let resVisible = false;
      const syncFab = () => {
        fab.hidden = resVisible || selected.size === 0;
        fab.innerHTML = `Ver ${selected.size} dose${selected.size > 1 ? 's' : ''} ${C.icon.chev.replace('class="chev"', '')}`;
      };
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(([en]) => { resVisible = en.isIntersecting || en.boundingClientRect.top < 0; syncFab(); });
        io.observe(res);
        window.addEventListener('hashchange', () => io.disconnect(), { once: true });
      }
      root.addEventListener('change', syncFab);
      fab.addEventListener('click', () => res.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      api.summary = () => txt;
    },
  });
})();
