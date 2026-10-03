/* Metabólico: gasometria, cetoacidose diabética, sódio */
(function () {
  'use strict';
  const C = window.Calc;
  const f1 = (n) => C.fmt(n, 1), f2 = (n) => C.fmt(n, 2), f0 = (n) => C.fmt(n, 0);

  /* sódio — balanço de massa em sistema fechado (funções puras, cobertas por testes) */
  C.sodium = {
    /* mL de NaCl 3% (513 mEq/L) para levar Na de na0 a na1 */
    vol3: (tbw, na0, na1) => tbw * (na1 - na0) / (513 - na1) * 1000,
    /* Adrogué-Madias: variação do Na por 1 L de infusão */
    adrogue: (naInf, na, tbw) => (naInf - na) / (tbw + 1),
    /* déficit de água livre (L) até 140 */
    waterDeficit: (tbw, na) => tbw * (na / 140 - 1),
    /* L de água livre (SG 5%) para baixar de na0 a na1 */
    volFree: (tbw, na0, na1) => tbw * (na0 / na1 - 1),
    /* L de SF 0,45% (77 mEq/L) para baixar de na0 a na1 */
    volHalf: (tbw, na0, na1) => tbw * (na0 - na1) / (na1 - 77),
  };

  /* ================= gasometria ================= */
  function acidBase(ph, pco2, hco3, be) {
    let st, stCls;
    if (ph < 7.35) { st = 'Acidemia'; stCls = 'crit'; } else if (ph > 7.45) { st = 'Alcalemia'; stCls = 'crit'; } else { st = 'pH normal'; stCls = 'ok'; }
    let primary = '', comp = '', calc = '';
    if (ph < 7.35 || ph > 7.45) {
      const acid = ph < 7.35;
      const resp = acid ? pco2 - 40 : 40 - pco2;
      const met = acid ? 24 - hco3 : hco3 - 24;
      if (resp > 0 && met <= 0) primary = acid ? 'Acidose respiratória' : 'Alcalose respiratória';
      else if (met > 0 && resp <= 0) primary = acid ? 'Acidose metabólica' : 'Alcalose metabólica';
      else if (resp > 0 && met > 0) primary = acid ? 'Distúrbio misto: acidose respiratória + metabólica' : 'Distúrbio misto: alcalose respiratória + metabólica';
      else primary = 'Padrão atípico — reavaliar amostra e valores';

      if (resp > 0 && met <= 0) {
        /* compensação renal: acidose resp. +1 (aguda) / +3,5 (crônica) mEq/L de HCO₃⁻ por 10 mmHg de PaCO₂;
           alcalose resp. −2 (aguda) / −5 (crônica). Valores entre agudo e crônico = compensação parcial. */
        if (acid) {
          const a = 24 + (pco2 - 40) / 10, c = 24 + 3.5 * (pco2 - 40) / 10;
          calc = `HCO₃⁻ esperado: agudo ≈ ${f1(a)} · crônico ≈ ${f1(c)} mEq/L<br>HCO₃⁻ medido: ${f1(hco3)} mEq/L`;
          comp = hco3 < a - 1.5 ? 'HCO₃⁻ abaixo do esperado para a forma aguda — <b>acidose metabólica associada</b>.'
            : hco3 <= a + 1.5 ? 'Compatível com <b>acidose respiratória aguda</b> (compensação renal ainda não instalada).'
            : Math.abs(hco3 - c) <= 2 ? 'Compatível com <b>acidose respiratória crônica</b>, compensação renal adequada.'
            : hco3 > c + 2 ? 'HCO₃⁻ acima do esperado — <b>alcalose metabólica associada</b>.'
            : 'HCO₃⁻ entre o esperado agudo e o crônico — <b>compensação parcial</b> (subaguda ou crônica agudizada).';
        } else {
          const a = 24 - 2 * (40 - pco2) / 10, c = 24 - 5 * (40 - pco2) / 10;
          calc = `HCO₃⁻ esperado: agudo ≈ ${f1(a)} · crônico ≈ ${f1(c)} mEq/L<br>HCO₃⁻ medido: ${f1(hco3)} mEq/L`;
          comp = hco3 > a + 1.5 ? 'HCO₃⁻ acima do esperado para a forma aguda — <b>alcalose metabólica associada</b>.'
            : hco3 >= a - 1.5 ? 'Compatível com <b>alcalose respiratória aguda</b>.'
            : Math.abs(hco3 - c) <= 2.5 ? 'Compatível com <b>alcalose respiratória crônica</b>, compensação renal adequada.'
            : hco3 < c - 2.5 ? 'HCO₃⁻ abaixo do esperado — <b>acidose metabólica associada</b>.'
            : 'HCO₃⁻ entre o esperado agudo e o crônico — <b>compensação parcial</b> (subaguda).';
        }
      } else if (met > 0 && resp <= 0) {
        if (acid) {
          const e = 1.5 * hco3 + 8;
          calc = `Winter: PaCO₂ esperada = 1,5 × HCO₃⁻ + 8 ± 2<br>Esperada ${f1(e - 2)}–${f1(e + 2)} · medida ${f1(pco2)} mmHg`;
          comp = pco2 >= e - 2 && pco2 <= e + 2 ? 'Compensação respiratória <b>adequada</b>.'
            : pco2 > e + 2 ? 'PaCO₂ acima do esperado — <b>acidose respiratória associada</b>.'
            : 'PaCO₂ abaixo do esperado — <b>alcalose respiratória associada</b>.';
        } else {
          /* Berend K et al. NEJM 2014;371:1434: PaCO₂ = 0,7 × (HCO₃⁻ − 24) + 40 ± 2 */
          const e = 0.7 * (hco3 - 24) + 40;
          calc = `PaCO₂ esperada = 0,7 × (HCO₃⁻ − 24) + 40 ± 2 (raramente &gt; 55)<br>Esperada ${f1(e - 2)}–${f1(e + 2)} · medida ${f1(pco2)} mmHg`;
          comp = pco2 >= e - 2 && pco2 <= e + 2 ? 'Compensação respiratória <b>adequada</b>.'
            : pco2 > e + 2 ? 'PaCO₂ acima do esperado — <b>acidose respiratória associada</b>.'
            : 'PaCO₂ abaixo do esperado — <b>alcalose respiratória associada</b>.';
        }
      }
    } else if (pco2 < 35 || pco2 > 45 || hco3 < 22 || hco3 > 26) {
      primary = 'pH normal com PaCO₂/HCO₃⁻ alterados';
      comp = 'Distúrbio misto com efeitos que se anulam ou compensação completa de distúrbio crônico. Correlacionar com clínica e BE.';
    } else {
      primary = 'Equilíbrio ácido-base normal';
      comp = 'pH, PaCO₂ e HCO₃⁻ dentro da normalidade.';
    }
    let beTxt = '';
    if (Number.isFinite(be)) beTxt = be < -2 ? `BE ${f1(be)}: componente metabólico de <b>acidose</b>.` : be > 2 ? `BE ${f1(be)}: componente metabólico de <b>alcalose</b>.` : `BE ${f1(be)}: sem desvio metabólico relevante.`;
    const vCls = primary.startsWith('Equilíbrio') ? 'ok' : stCls === 'ok' ? 'warn' : 'crit';
    /* consistência interna (Henderson-Hasselbalch): pH = 6,1 + log10(HCO₃⁻ / (0,03 × PaCO₂)) */
    const phHH = 6.1 + Math.log10(hco3 / (0.03 * pco2));
    return { st, stCls, primary, comp, calc, beTxt, vCls, phHH, consistent: Math.abs(phHH - ph) <= 0.05 };
  }
  C.acidBase = acidBase;

  function davenport(ph, hco3) {
    const W = 340, H = 220, L = 36, R = 10, T = 12, B = 30;
    const x = (v) => L + (Math.max(7, Math.min(7.8, v)) - 7) / 0.8 * (W - L - R);
    const y = (v) => H - B - Math.max(0, Math.min(44, v)) / 44 * (H - T - B);
    const mx = x(7.4), my = y(24);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Mapa ácido-base: pH ${f2(ph)}, HCO3 ${f1(hco3)}">
      <rect x="${L}" y="${T}" width="${mx - L}" height="${my - T}" fill="var(--crit-wash)"/>
      <rect x="${mx}" y="${T}" width="${W - R - mx}" height="${my - T}" fill="var(--info-wash)"/>
      <rect x="${L}" y="${my}" width="${mx - L}" height="${H - B - my}" fill="var(--warn-wash)"/>
      <rect x="${mx}" y="${my}" width="${W - R - mx}" height="${H - B - my}" fill="var(--ok-wash)"/>
      <g font-family="IBM Plex Mono, monospace" font-size="9" fill="var(--ink-3)">
        <text x="${L + 5}" y="${T + 12}">acid. resp.</text>
        <text x="${W - R - 5}" y="${T + 12}" text-anchor="end">alc. metab.</text>
        <text x="${L + 5}" y="${H - B - 6}">acid. metab.</text>
        <text x="${W - R - 5}" y="${H - B - 6}" text-anchor="end">alc. resp.</text>`;
    for (let v = 7.0; v <= 7.81; v += 0.2) s += `<text x="${x(v)}" y="${H - B + 14}" text-anchor="middle">${v.toFixed(1).replace('.', ',')}</text>`;
    for (let v = 0; v <= 44; v += 11) s += `<text x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
    s += `<text x="${(L + W - R) / 2}" y="${H - 3}" text-anchor="middle">pH</text></g>
      <line x1="${L}" y1="${my}" x2="${W - R}" y2="${my}" stroke="var(--ink-3)" stroke-dasharray="3 3" stroke-width=".8"/>
      <line x1="${mx}" y1="${T}" x2="${mx}" y2="${H - B}" stroke="var(--ink-3)" stroke-dasharray="3 3" stroke-width=".8"/>
      <circle cx="${x(ph)}" cy="${y(hco3)}" r="6.5" fill="var(--ink)" stroke="var(--surface)" stroke-width="2"/>
    </svg>`;
    return s;
  }

  C.register({
    id: 'gasometria', group: 'met', tile: 'pH',
    title: 'Gasometria arterial',
    sub: 'Distúrbio primário, compensação, ânion gap, P/F',
    keywords: ['acido-base', 'acidose', 'alcalose', 'winter', 'anion gap', 'gap anionico', 'bicarbonato', 'pco2', 'lactato', 'base excess', 'davenport', 'gaso'],
    render(body, api, root) {
      body.innerHTML = `
        <section class="card">
          <div class="grid g3">
            ${C.field({ id: 'gPh', label: 'pH', ph: '7,40', lim: [6.5, 8] })}
            ${C.field({ id: 'gCo', label: 'PaCO₂', unit: 'mmHg', ph: '40', lim: [5, 200] })}
            ${C.field({ id: 'gHc', label: 'HCO₃⁻', unit: 'mEq/L', ph: '24', lim: [1, 80] })}
          </div>
          ${C.lbl('Opcionais', 'sub-lbl')}
          <div class="grid g3">
            ${C.field({ id: 'gBe', label: 'BE', unit: 'mEq/L', ph: '0', lim: [-40, 40] })}
            ${C.field({ id: 'gPo', label: 'PaO₂', unit: 'mmHg', ph: '90', lim: [10, 700] })}
            ${C.field({ id: 'gFi', label: 'FiO₂', unit: '%', ph: '21', lim: [0.21, 100] })}
            ${C.field({ id: 'gLa', label: 'Lactato', unit: 'mmol/L', ph: '1,0', lim: [0.1, 30] })}
            ${C.field({ id: 'gNa', label: 'Na⁺', unit: 'mEq/L', ph: '140', lim: [90, 200] })}
            ${C.field({ id: 'gCl', label: 'Cl⁻', unit: 'mEq/L', ph: '104', lim: [50, 150] })}
            ${C.field({ id: 'gAl', label: 'Albumina', unit: 'g/dL', ph: '4,0', lim: [0.5, 7] })}
          </div>
        </section>
        <div id="gOut"></div>
      `;
      let txt = '';
      function calc() {
        const v = (id) => C.val(body, id);
        const ph = v('gPh'), co = v('gCo'), hc = v('gHc'), be = v('gBe'), po = v('gPo'), la = v('gLa'), na = v('gNa'), cl = v('gCl'), al = v('gAl');
        const fiF = C.fio2(v('gFi')); const fi = fiF * 100;
        const out = body.querySelector('#gOut');
        if (!C.ok(ph, co, hc)) {
          out.innerHTML = C.verdict('idle', 'Aguardando', 'Preencha pH, PaCO₂ e HCO₃⁻', 'A análise atualiza enquanto você digita.');
          txt = ''; return;
        }
        const ab = acidBase(ph, co, hc, be);
        const lines = [`pH ${f2(ph)}, PaCO₂ ${f1(co)}, HCO₃ ${f1(hc)}${Number.isFinite(be) ? `, BE ${f1(be)}` : ''}: ${ab.primary}.`];
        let h = C.verdict(ab.vCls, `${ab.st} · pH ${f2(ph)}`, ab.primary, ab.comp);
        if (!ab.consistent) {
          h += C.note('crit', `<b>Valores internamente inconsistentes:</b> pelo Henderson-Hasselbalch, PaCO₂ ${f1(co)} e HCO₃⁻ ${f1(hc)} dariam pH ${f2(ab.phHH)} (medido ${f2(ph)}). Conferir digitação e coleta antes de interpretar.`);
          lines.push(`ATENÇÃO: valores inconsistentes (pH calculado ${f2(ab.phHH)}).`);
        }
        let detail = '';
        if (ab.calc) detail += `<div class="calc-line">${ab.calc}</div>`;
        if (ab.beTxt) detail += `<p style="margin:8px 0 0;font-size:14.5px">${ab.beTxt}</p>`;
        if (detail) h += C.card('Compensação', detail);

        const outs = [];
        if (Number.isFinite(po)) {
          const cls = po >= 80 ? 'ok' : po >= 60 ? 'warn' : 'crit';
          const s = po >= 80 ? 'Normal' : po >= 60 ? 'Hipoxemia leve' : po >= 40 ? 'Hipoxemia moderada' : 'Hipoxemia grave';
          const amb = Number.isFinite(fiF) && fiF > 0.21 ? `com FiO₂ ${f0(fi)}% — faixas de PaO₂ valem para ar ambiente; usar P/F` : 'faixas para ar ambiente';
          outs.push(`<div class="out ${cls}"><div class="o-l">PaO₂</div><div class="o-v sm">${f0(po)}<span class="u">mmHg</span></div><div class="o-s">${s}</div><div class="o-n">${amb}</div></div>`);
          if (Number.isFinite(fiF)) {
            const pf = po / fiF;
            const [c2, s2] = C.berlin(pf);
            outs.push(`<div class="out ${c2}"><div class="o-l">PaO₂/FiO₂</div><div class="o-v sm">${f0(pf)}</div><div class="o-s">${s2}</div><div class="o-n">Berlim: exige PEEP/CPAP ≥ 5</div></div>`);
            lines.push(`PaO₂ ${f0(po)} mmHg, FiO₂ ${f0(fi)}%, P/F ${f0(pf)} (${s2.toLowerCase()}).`);
          } else lines.push(`PaO₂ ${f0(po)} mmHg (${s.toLowerCase()}).`);
        }
        if (Number.isFinite(la)) {
          const [c, s, n] = la < 2 ? ['ok', 'Normal', 'Sem evidência bioquímica de hipoperfusão.'] : la < 4 ? ['warn', 'Hiperlactatemia leve', 'Hipoperfusão inicial, estresse adrenérgico, β2-agonista ou clearance hepático reduzido. Seriar.'] : ['crit', 'Hiperlactatemia significativa', 'Hipoperfusão relevante; ≥ 4 associa-se a maior mortalidade na sepse.'];
          outs.push(`<div class="out ${c}"><div class="o-l">Lactato</div><div class="o-v sm">${f1(la)}<span class="u">mmol/L</span></div><div class="o-s">${s}</div><div class="o-n">${n}</div></div>`);
          lines.push(`Lactato ${f1(la)} mmol/L.`);
        }
        if (C.ok(na, cl)) {
          const ag = na - (cl + hc);
          const agc = Number.isFinite(al) ? ag + 2.5 * (4 - al) : ag;
          const hi = agc > 12;
          outs.push(`<div class="out ${hi ? 'crit' : 'ok'}"><div class="o-l">Ânion gap${Number.isFinite(al) ? ' corrigido' : ''}</div><div class="o-v sm">${f1(agc)}<span class="u">mEq/L</span></div><div class="o-s">${hi ? 'Elevado (&gt; 12)' : 'Normal (8–12)'}</div><div class="o-n">${Number.isFinite(al) ? `AG bruto ${f1(ag)} + 2,5 × (4 − ${f1(al)})` : 'Na − (Cl + HCO₃)'}</div></div>`);
          detail = hi ? 'Acidose com ânions não mensurados: lactato, cetoácidos, toxinas, uremia.' : 'Se houver acidose metabólica, pensar em causa hiperclorêmica (perda de HCO₃⁻ GI ou renal).';
          /* delta-delta (Berend K et al. NEJM 2014;371:1434): (AG − 12) / (24 − HCO₃⁻) */
          if (hi && hc < 24) {
            const dd = (agc - 12) / (24 - hc);
            detail += ` <b>Δ/Δ = ${f1(dd)}</b>: ` + (dd < 1 ? 'acidose metabólica de ânion gap normal associada.' : dd <= 2 ? 'acidose de ânion gap elevado isolada.' : 'alcalose metabólica (ou acidose respiratória crônica compensada) associada.');
            lines.push(`Δ/Δ ${f1(dd)}.`);
          }
          lines.push(`AG ${Number.isFinite(al) ? 'corrigido ' : ''}${f1(agc)} mEq/L (${hi ? 'elevado' : 'normal'}).`);
          outs.push(`<div class="span2" style="font-size:13.5px;color:var(--ink-2);padding:2px 4px">${detail}</div>`);
        }
        if (outs.length) h += `<div class="outs" style="margin-bottom:12px">${outs.join('')}</div>`;
        h += C.card('Mapa ácido-base', davenport(ph, hc), 'Davenport · pH × HCO₃⁻');
        out.innerHTML = h;
        txt = 'Gasometria: ' + lines.join(' ');
      }
      root.addEventListener('input', calc);
      api.summary = () => txt;
    },
  });

  /* ================= cetoacidose diabética ================= */
  C.register({
    id: 'cad', group: 'met', tile: 'CAD', weight: true,
    title: 'Cetoacidose diabética',
    sub: 'Gravidade, fluidos, potássio, insulina, bicarbonato',
    keywords: ['cad', 'cetoacidose', 'diabetes', 'insulina', 'hiperglicemia', 'potassio', 'bicarbonato', 'ada', 'kitabchi'],
    render(body, api, root) {
      const n = { vol: C.uid('v'), via: C.uid('i'), diu: C.uid('d'), oral: C.uid('o') };
      body.innerHTML = `
        <section class="card">
          <div class="grid g3">
            ${C.field({ id: 'cGl', label: 'Glicemia', unit: 'mg/dL', ph: '450', lim: [20, 3000] })}
            ${C.field({ id: 'cPh', label: 'pH', ph: '7,20', lim: [6.5, 8] })}
            ${C.field({ id: 'cHc', label: 'HCO₃⁻', unit: 'mEq/L', ph: '12', lim: [1, 60] })}
            ${C.field({ id: 'cK', label: 'K⁺', unit: 'mEq/L', ph: '4,2', lim: [1, 10] })}
            ${C.field({ id: 'cNa', label: 'Na⁺', unit: 'mEq/L', ph: '138', lim: [90, 200] })}
          </div>
        </section>
        <section class="card">
          ${C.seg({ name: n.vol, label: 'Estado volêmico (após 1ª hora de SF 0,9%)', cls: 'cols', value: 'leve', options: [['leve', 'Desidratação leve'], ['grave', 'Hipovolemia grave'], ['choque', 'Choque cardiogênico']] })}
          <div style="height:12px"></div>
          ${C.seg({ name: n.via, label: 'Insulina', cls: 'cols', value: 'iv', options: [['iv', 'Endovenosa'], ['sc', 'Subcutânea']] })}
          <div style="height:12px"></div>
          ${C.seg({ name: n.diu, label: 'Diurese ≥ 50 mL/h?', cls: 'cols', value: 'sim', options: [['sim', 'Sim'], ['nao', 'Não / incerta']] })}
          <div style="height:12px"></div>
          ${C.seg({ name: n.oral, label: 'Fase', cls: 'cols', value: 'nao', options: [['nao', 'Em CAD'], ['sim', 'Resolvida, aceita VO']] })}
        </section>
        <div id="cOut"></div>
        <p class="ref">Kitabchi AE et al. Diabetes Care 2009;32:1335 (ADA) · UpToDate.</p>
      `;
      let txt = '';
      function calc() {
        const v = (id) => C.val(body, id);
        const peso = C.peso(root), gl = v('cGl'), ph = v('cPh'), hc = v('cHc'), k = v('cK'), na = v('cNa');
        const vol = C.radioVal(body, n.vol), via = C.radioVal(body, n.via), diu = C.radioVal(body, n.diu), oral = C.radioVal(body, n.oral);
        const out = body.querySelector('#cOut');
        const miss = [[peso, 'peso'], [gl, 'glicemia'], [ph, 'pH'], [hc, 'HCO₃'], [k, 'K⁺'], [na, 'Na⁺']].filter(([x]) => !Number.isFinite(x)).map(([, l]) => l);
        if (miss.length) { out.innerHTML = C.verdict('idle', 'Aguardando', 'Faltam: ' + miss.join(', '), 'A conduta aparece assim que todos os campos forem preenchidos.'); txt = ''; return; }

        /* gravidade (ADA 2009): leve pH 7,25–7,30 e HCO₃⁻ 15–18 · moderada pH 7,00–7,24 e HCO₃⁻ 10–14,9 · grave pH < 7,00 e HCO₃⁻ < 10.
           Com critérios discordantes, vale o mais grave. pH > 7,30 e HCO₃⁻ > 18 = sem critério gasométrico. */
        const sPh = ph < 7.0 ? 3 : ph < 7.25 ? 2 : ph <= 7.30 ? 1 : 0;
        const sHc = hc < 10 ? 3 : hc < 15 ? 2 : hc <= 18 ? 1 : 0;
        const sv = Math.max(sPh, sHc);
        if (sv === 0) {
          out.innerHTML = C.verdict('ok', 'Classificação', 'Sem critério gasométrico de CAD', `pH ${f2(ph)} (&gt; 7,30) e HCO₃⁻ ${f1(hc)} (&gt; 18). Considerar estado hiperglicêmico hiperosmolar ou outra causa.`);
          txt = `Sem critério gasométrico de CAD (glicemia ${f0(gl)}, pH ${f2(ph)}, HCO₃ ${f1(hc)}).`;
          return;
        }
        const sev = ['', 'leve', 'moderada', 'grave'][sv];
        /* Na corrigido (ADA 2009): + 1,6 mEq/L a cada 100 mg/dL de glicose acima de 100 */
        const naC = na + 1.6 * (gl - 100) / 100;
        const r1 = (x) => C.fmt(Math.round(x * 10) / 10, 1);
        let h = C.verdict(sev === 'leve' ? 'warn' : 'crit', 'Classificação', `CAD ${sev}`, `pH ${f2(ph)} · HCO₃⁻ ${f1(hc)} · Na corrigido ${f1(naC)} mEq/L`);

        const alerts = [];
        if (sPh === 0 || sHc === 0) alerts.push(['warn', 'Só um dos critérios gasométricos está alterado — confirmar cetonemia e ânion gap.']);
        if (gl <= 250) alerts.push(['warn', '<b>Glicemia ≤ 250:</b> considerar CAD euglicêmica (iSGLT2, gestação, jejum prolongado).']);
        if (k < 3.3) alerts.push(['crit', '<b>K⁺ &lt; 3,3:</b> não iniciar insulina até corrigir o potássio. Risco de arritmia e PCR.']);
        if (ph < 6.9) alerts.push(['crit', '<b>pH &lt; 6,9:</b> bicarbonato indicado.']);
        if (diu === 'nao') alerts.push(['warn', 'Diurese inadequada: <b>não repor K⁺ EV</b> até diurese ≥ 50 mL/h.']);
        if (sev === 'grave') alerts.push(['crit', '<b>CAD grave:</b> considerar UTI e investigar precipitante (infecção, IAM, pancreatite).']);
        h += alerts.map(([c, t]) => C.note(c, t)).join('');
        h += '<div style="height:12px"></div>';

        const fl = [];
        fl.push(['info', `<b>1ª hora: SF 0,9% 1 L/h</b> (15–20 mL/kg/h ≈ ${f0(peso * 15)}–${f0(peso * 20)} mL/h), na ausência de comprometimento cardíaco.`]);
        if (vol === 'choque') fl.push(['crit', '<b>Choque cardiogênico:</b> monitorização hemodinâmica e vasopressores; volume guiado por avaliação hemodinâmica.']);
        else if (vol === 'grave') fl.push(['info', '<b>Hipovolemia grave:</b> manter SF 0,9% 1 L/h.']);
        else fl.push(['info', naC > 145 ? `Na corrigido ${f1(naC)} (alto): <b>SF 0,45% 250–500 mL/h</b>.` : `Na corrigido ${f1(naC)} (normal ou baixo): <b>SF 0,9% 250–500 mL/h</b>.`]);
        fl.push(['warn', '<b>Glicemia 200 mg/dL:</b> trocar para SG 5% + SF 0,45% 150–250 mL/h.']);
        h += C.card('Fluidos', C.steps(fl));

        /* potássio (ADA 2009): < 3,3 segura insulina e repõe 20–30 mEq/h; 3,3–5,2 repõe 20–30 mEq/L de soro; > 5,2 não repõe */
        const kk = [];
        if (diu === 'nao') kk.push(['crit', '<b>Aguardar diurese ≥ 50 mL/h</b> antes de repor K⁺.']);
        if (k < 3.3) kk.push(['crit', '<b>Segurar a insulina.</b> Repor 20–30 mEq K⁺/h EV até K⁺ &gt; 3,3.']);
        else if (k <= 5.2) kk.push(['info', '<b>20–30 mEq de K⁺ em cada litro</b> de soro para manter K⁺ 4–5.']);
        else kk.push(['warn', 'K⁺ &gt; 5,2: <b>não repor</b>. Dosar K⁺ a cada 2 h.']);
        h += C.card('Potássio', C.steps(kk));

        const ins = [];
        let insTxt = '';
        if (k < 3.3) { ins.push(['crit', '<b>Insulina suspensa</b> até K⁺ &gt; 3,3 mEq/L.']); insTxt = 'insulina suspensa (K < 3,3)'; }
        else if (via === 'iv') {
          ins.push(['info', `<b>Bolus ${r1(peso * 0.1)} U</b> de insulina regular EV (0,1 U/kg).`]);
          ins.push(['info', `<b>Infusão ${r1(peso * 0.1)} U/h</b> (0,1 U/kg/h).`]);
          ins.push(['', `Sem bolus: ${r1(peso * 0.14)} U/h (0,14 U/kg/h).`]);
          insTxt = `insulina regular EV bolus ${r1(peso * 0.1)} U + ${r1(peso * 0.1)} U/h`;
        } else {
          ins.push(['info', `<b>${r1(peso * 0.3)} U</b> de análogo rápido SC agora (0,3 U/kg).`]);
          ins.push(['info', `Após 1 h: <b>${r1(peso * 0.2)} U</b> SC (0,2 U/kg), depois 0,2 U/kg a cada 2 h.`]);
          insTxt = `análogo rápido SC ${r1(peso * 0.3)} U, depois ${r1(peso * 0.2)} U 2/2 h`;
        }
        if (k >= 3.3) {
          ins.push(['warn', via === 'iv'
            ? `<b>Glicemia não caiu ≥ 10% na 1ª hora:</b> bolus EV de 0,14 U/kg (${r1(peso * 0.14)} U) e manter o esquema.`
            : '<b>Glicemia não caiu ≥ 10% na 1ª hora:</b> reavaliar via e dose (considerar insulina EV).']);
          ins.push(['warn', `<b>Glicemia 200 mg/dL:</b> reduzir para 0,02–0,05 U/kg/h EV (${r1(peso * 0.02)}–${r1(peso * 0.05)} U/h) ou 0,1 U/kg SC 2/2 h. Manter 150–200 mg/dL.`]);
        }
        if (oral === 'sim') {
          ins.push(['ok', '<b>Transição:</b> basal-bolus SC; manter a insulina EV por 1–2 h após a 1ª dose SC.']);
          ins.push(['ok', `Virgem de insulina: 0,5–0,8 U/kg/dia (≈ ${f0(peso * 0.5)}–${f0(peso * 0.8)} U/dia, divididas).`]);
        }
        h += C.card('Insulina', C.steps(ins));

        h += C.card('Bicarbonato', C.steps(ph < 6.9 ? [
          ['crit', '<b>Indicado (pH &lt; 6,9).</b>'],
          ['info', '<b>100 mmol de NaHCO₃</b> em 400 mL de água + 20 mEq KCl, em 2 h.'],
          ['warn', 'Repetir a cada 2 h até pH &gt; 7,0. Dosar K⁺ a cada 2 h.'],
        ] : [['ok', 'pH ≥ 6,9 — <b>não indicado</b>.']]));

        h += C.card('Monitorização', C.steps([
          ['info', 'Eletrólitos, ureia, creatinina, pH venoso e glicemia a cada <b>2–4 h</b>.'],
          ['warn', '<b>Precipitante:</b> infecção (hemograma, culturas, RX), IAM (ECG, troponina), pancreatite, abandono de insulina.'],
          k > 5.2 ? ['warn', 'K⁺ &gt; 5,2: dosar a cada 2 h.'] : null,
          ['ok', '<b>Resolução:</b> glicemia &lt; 200 mg/dL <b>e</b> 2 dos 3: HCO₃⁻ ≥ 15, pH venoso &gt; 7,3, ânion gap ≤ 12.'],
          ['', 'HCO₃⁻ pode normalizar antes do pH — guiar pela gasometria venosa.'],
        ]));
        out.innerHTML = h;
        txt = `CAD ${sev} (glicemia ${f0(gl)}, pH ${f2(ph)}, HCO₃ ${f1(hc)}, K ${f1(k)}, Na ${f0(na)} / corrigido ${f1(naC)}). Peso ${C.fmtN(peso)} kg. ` +
          `Hidratação: SF 0,9% 1 L/h na 1ª hora, depois ${vol === 'choque' ? 'guiada por monitorização hemodinâmica (choque cardiogênico)' : vol === 'grave' ? 'SF 0,9% 1 L/h' : (naC > 145 ? 'SF 0,45%' : 'SF 0,9%') + ' 250–500 mL/h'}. ` +
          `K: ${k < 3.3 ? 'repor 20–30 mEq/h, insulina suspensa' : k <= 5.2 ? '20–30 mEq/L de soro' : 'não repor'}${diu === 'nao' ? ' (aguardar diurese)' : ''}. ` +
          `Insulina: ${insTxt}. Bicarbonato: ${ph < 6.9 ? 'indicado (100 mmol em 2 h)' : 'não indicado'}.`;
      }
      root.addEventListener('input', calc);
      root.addEventListener('change', calc);
      api.summary = () => txt;
    },
  });

  /* ================= sódio ================= */
  C.register({
    id: 'sodio', group: 'met', tile: 'Na⁺', weight: true,
    title: 'Distúrbios do sódio',
    sub: 'Hipo e hipernatremia · NaCl 3%, água livre, metas',
    keywords: ['hiponatremia', 'hipernatremia', 'sodio', 'nacl 3%', 'salina hipertonica', 'agua livre', 'deficit de agua', 'mielinolise', 'siadh', 'desmopressina'],
    render(body, api, root) {
      const n = { sx: C.uid('sx'), t: C.uid('t'), s: C.uid('s'), v: C.uid('v') };
      body.innerHTML = `
        <section class="card">
          <div class="grid">
            ${C.field({ id: 'nNa', label: 'Na⁺ sérico', unit: 'mEq/L', ph: '128', lim: [90, 200] })}
            ${C.field({ id: 'nGl', label: 'Glicemia', unit: 'mg/dL', ph: '—', opt: true, lim: [20, 3000] })}
          </div>
          <div style="height:12px"></div>
          ${C.seg({ name: n.sx, label: 'Água corporal total', cls: 'wrap2', value: 'm', options: [['m', 'Homem adulto', '0,6 × peso'], ['f', 'Mulher adulta', '0,5 × peso'], ['i', 'Homem idoso', '0,5 × peso'], ['if', 'Mulher idosa', '0,45 × peso']] })}
          <div style="height:12px"></div>
          ${C.seg({ name: n.t, label: 'Instalação', cls: 'cols', value: 'cronica', options: [['aguda', 'Aguda', '&lt; 48 h'], ['cronica', 'Crônica', '≥ 48 h ou incerta']] })}
          <div style="height:12px"></div>
          ${C.seg({ name: n.s, label: 'Sintomas', cls: 'cols', value: 'leve', options: [['leve', 'Leves', 'ou ausentes'], ['moderado', 'Moderados', 'náusea, confusão'], ['grave', 'Graves', 'convulsão, coma']] })}
          <div style="height:12px"></div>
          ${C.seg({ name: n.v, label: 'Volemia (hiponatremia)', cls: 'cols', value: 'eu', options: [['hipo', 'Hipo'], ['eu', 'Euvolêmico'], ['hiper', 'Hiper']] })}
        </section>
        <div id="nOut"></div>
        <p class="ref">ACT = peso × fator. Volumes por balanço de massa (sistema fechado, sem perdas): NaCl 3% (513 mEq/L) V = ACT × ΔNa ÷ (513 − Na alvo); água livre (SG 5%) V = ACT × (Na/Na alvo − 1); SF 0,45% (77 mEq/L) V = ACT × (Na − Na alvo) ÷ (Na alvo − 77). Adrogué-Madias: ΔNa por litro = (Na infusão − Na) ÷ (ACT + 1). Déficit de água livre = ACT × (Na/140 − 1). Na corrigido pela glicemia: +2,4 mEq/L por 100 mg/dL acima de 100 (Hillier 1999). Perdas urinárias e insensíveis não entram nas fórmulas — dosar Na⁺ seriado.</p>
      `;
      let txt = '';
      function calc() {
        const na = C.val(body, 'nNa'), gl = C.val(body, 'nGl'), peso = C.peso(root);
        const sx = C.radioVal(body, n.sx), tempo = C.radioVal(body, n.t), sint = C.radioVal(body, n.s), vol = C.radioVal(body, n.v);
        const out = body.querySelector('#nOut');
        if (!C.ok(na, peso)) { out.innerHTML = C.verdict('idle', 'Aguardando', `Faltam: ${[!Number.isFinite(peso) && 'peso', !Number.isFinite(na) && 'Na⁺'].filter(Boolean).join(', ')}`, ''); txt = ''; return; }
        const tbw = peso * { m: 0.6, f: 0.5, i: 0.5, if: 0.45 }[sx];
        let nae = na, corr = '';
        if (gl > 100) { nae = na + 2.4 * (gl - 100) / 100; corr = C.note('warn', `<b>Na⁺ corrigido pela glicemia:</b> ${f1(nae)} mEq/L (glicemia ${f0(gl)}).`); }
        const aguda = tempo === 'aguda';
        let h = '';
        if (nae < 135) {
          const alvo = Math.min(nae + (aguda ? 6 : 8), 135);
          const v3 = C.sodium.vol3(tbw, nae, alvo), t3 = v3 / 24;
          const dL = C.sodium.adrogue(513, nae, tbw);
          /* classificação bioquímica — Spasovski G et al. Eur J Endocrinol 2014: leve 130–134,9 · moderada 125–129,9 · profunda < 125 */
          const grau = nae < 125 ? 'profunda' : nae < 130 ? 'moderada' : 'leve';
          const usa3 = sint === 'grave' || (sint === 'moderado' && aguda);
          h += C.verdict(nae < 125 ? 'crit' : 'warn', 'Hiponatremia ' + grau, `Na⁺ ${f1(nae)} mEq/L`, `Meta: ${f1(alvo)} mEq/L em 24 h · ${aguda ? 'aguda: elevar 4–6 mEq/L rapidamente se sintomática' : 'crônica: elevar 4–8 mEq/L em 24 h (máx. 10–12; 8 se alto risco de desmielinização)'}`);
          h += corr;
          h += `<div class="outs" style="margin:12px 0">
            <div class="out"><div class="o-l">Água corporal total</div><div class="o-v sm">${f1(tbw)}<span class="u">L</span></div></div>
            <div class="out"><div class="o-l">1 L de NaCl 3% eleva</div><div class="o-v sm">${f1(dL)}<span class="u">mEq/L</span></div><div class="o-n">Adrogué-Madias</div></div>
            ${usa3 ? `<div class="out crit span2"><div class="o-l">NaCl 3% · manutenção para a meta</div><div class="o-v">${f0(t3)}<span class="u">mL/h</span></div><div class="o-s">${f0(v3)} mL em 24 h → ${f1(alvo)} mEq/L (sem contar perdas)</div></div>` : ''}
          </div>`;
          let st;
          if (usa3) st = [['crit', '<b>NaCl 3% indicado.</b>'], ['crit', '<b>Bolus 150 mL IV em 20 min</b> — repetir até 3× (checando Na⁺ entre os bolus) até melhora ou alta de 5 mEq/L.'], ['info', `Depois, se necessário, ~${f0(t3)} mL/h até a meta.`], ['warn', 'Dosar Na⁺ a cada 2 h nas primeiras horas.']];
          else if (vol === 'hipo') st = [['info', 'SF 0,9% para restaurar a volemia.'], ['', 'Corrigir a causa (vômitos, diarreia, diurético).'], ['warn', 'Sem melhora após expansão → reavaliar etiologia.']];
          else if (vol === 'eu') st = [['info', 'Restrição hídrica: 500–800 mL/dia abaixo da diurese.'], ['', 'Investigar SIADH: TSH, cortisol, osmolalidade urinária.'], ['', 'Refratário: tolvaptana ou demeclociclina.']];
          else st = [['info', 'Restrição hídrica e de sódio.'], ['info', 'Furosemida para balanço negativo.'], ['', 'Tratar a causa (ICC, cirrose, síndrome nefrótica).']];
          h += C.card('Conduta', C.steps(st));
          h += C.card('Mielinólise osmótica', C.steps([
            ['crit', 'Não ultrapassar <b>10–12 mEq/L em 24 h</b> (forma crônica).'],
            ['warn', 'Correção excessiva: SG 5% + desmopressina 2–4 mcg IV.'],
            ['warn', 'Risco maior: desnutrição, etilismo, hipocalemia (K⁺ &lt; 3,5).'],
            ['info', 'Dosar Na⁺ a cada 4–6 h durante a correção.'],
          ]));
          txt = `Hiponatremia ${grau} (Na ${f1(nae)} mEq/L${gl > 100 ? ', corrigido pela glicemia' : ''}), ${aguda ? 'aguda' : 'crônica/indeterminada'}, ${{ hipo: 'hipovolêmica', eu: 'euvolêmica', hiper: 'hipervolêmica' }[vol]}, sintomas ${sint === 'leve' ? 'leves/ausentes' : sint === 'moderado' ? 'moderados' : 'graves'}. ACT ${f1(tbw)} L. Meta Na ${f1(alvo)} mEq/L em 24 h (Δ máx. ${aguda ? '6–8' : '10–12'}). ` +
            (usa3 ? `NaCl 3%: bolus 150 mL em 20 min (até 3×); se necessário, ~${f0(t3)} mL/h (${f0(v3)} mL em 24 h).` : vol === 'hipo' ? 'SF 0,9% para expansão.' : vol === 'eu' ? 'Restrição hídrica.' : 'Restrição hídrica e de sódio + furosemida.') + ' Na a cada 4–6 h.';
        } else if (nae > 145) {
          const delta = nae - 145;
          const def = C.sodium.waterDeficit(tbw, nae);
          const maxC = aguda ? delta : Math.min(10, delta);
          const alvo = nae - maxC;
          const sg5 = C.sodium.volFree(tbw, nae, alvo);            /* L de SG 5% */
          const s045 = C.sodium.volHalf(tbw, nae, alvo);           /* L de SF 0,45% */
          const grau = nae > 160 ? 'grave' : nae > 155 ? 'moderada-grave' : nae > 150 ? 'moderada' : 'leve';
          h += C.verdict(nae > 155 ? 'crit' : 'warn', 'Hipernatremia ' + grau, `Na⁺ ${f1(nae)} mEq/L`, `Meta em 24 h: ${f1(alvo)} mEq/L (−${f1(maxC)})${aguda ? ' · aguda: correção mais rápida é segura (até 1 mEq/L/h)' : ' · crônica: máx. 10 mEq/L em 24 h'}`);
          h += corr;
          h += `<div class="outs" style="margin:12px 0">
            <div class="out"><div class="o-l">Déficit de água livre</div><div class="o-v sm">${f1(def)}<span class="u">L</span></div><div class="o-n">para chegar a 140</div></div>
            <div class="out"><div class="o-l">Água corporal total</div><div class="o-v sm">${f1(tbw)}<span class="u">L</span></div></div>
            <div class="out info span2"><div class="o-l">SG 5% (água livre) para a meta</div><div class="o-v">${f0(sg5 * 1000 / 24)}<span class="u">mL/h</span></div><div class="o-s">${f1(sg5)} L em 24 h + perdas em curso</div></div>
            <div class="out span2"><div class="o-l">Se usar SF 0,45%</div><div class="o-v sm">${f0(s045 * 1000 / 24)}<span class="u">mL/h</span></div><div class="o-n">${f1(s045)} L em 24 h — cerca do dobro do volume</div></div>
          </div>`;
          h += C.card('Conduta', C.steps([
            ['info', 'Via oral/enteral preferencial (água). IV: SG 5%; SF 0,45% exige cerca do dobro do volume.'],
            ['', 'Somar perdas em curso (febre, poliúria, diarreia).'],
            ['warn', 'Dosar Na⁺ a cada 4–6 h e ajustar a vazão.'],
          ]));
          h += C.card('Alertas', C.steps([
            ['crit', 'Correção rápida → edema cerebral, convulsão, herniação.'],
            ['crit', 'Forma crônica: não ultrapassar 10 mEq/L em 24 h.'],
            ['', 'Investigar diabetes insipidus, perdas insensíveis, acesso restrito à água.'],
            ['info', 'DI central confirmado: desmopressina 1–4 mcg IV/SC.'],
          ]));
          txt = `Hipernatremia ${grau} (Na ${f1(nae)} mEq/L), ${aguda ? 'aguda' : 'crônica/indeterminada'}. ACT ${f1(tbw)} L. Déficit de água livre ${f1(def)} L. Para Na ${f1(alvo)} em 24 h: SG 5% ${f1(sg5)} L (~${f0(sg5 * 1000 / 24)} mL/h) ou SF 0,45% ${f1(s045)} L (~${f0(s045 * 1000 / 24)} mL/h), + perdas em curso. Na a cada 4–6 h.`;
        } else {
          h += C.verdict('ok', 'Normal', `Na⁺ ${f1(nae)} mEq/L`, 'Dentro de 135–145 mEq/L. Sem distúrbio do sódio.') + corr;
          txt = `Na ${f1(nae)} mEq/L — normal.`;
        }
        out.innerHTML = h;
      }
      root.addEventListener('input', calc);
      root.addEventListener('change', calc);
      api.summary = () => txt;
    },
  });
})();
