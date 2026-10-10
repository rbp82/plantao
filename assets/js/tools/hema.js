/* Tromboelastograma (TEG) */
(function () {
  'use strict';
  const C = window.Calc;

  const P = [
    ['R', 'R', 'min', 1, 20, 0.1, 6, [5, 10], 'Iniciação · fatores'],
    ['K', 'K', 'min', 0.5, 10, 0.1, 2, [1, 3], 'Cinética até 20 mm'],
    ['A', 'Ângulo α', '°', 10, 80, 1, 63, [53, 72], 'Velocidade · fibrinogênio'],
    ['MA', 'MA', 'mm', 20, 90, 1, 60, [50, 70], 'Força · plaquetas'],
    ['LY', 'LY30', '%', 0, 30, 0.5, 1, [0, 3], 'Fibrinólise'],
  ];
  const PRESETS = [
    ['Normal', { R: 6, K: 2, A: 63, MA: 60, LY: 1 }],
    ['Déficit de fatores', { R: 14, K: 3, A: 55, MA: 58, LY: 1 }],
    ['Hipofibrinogenemia', { R: 6, K: 5, A: 38, MA: 45, LY: 1 }],
    ['Disfunção plaquetária', { R: 6, K: 3, A: 55, MA: 38, LY: 1 }],
    ['Hiperfibrinólise', { R: 6, K: 2, A: 60, MA: 55, LY: 15 }],
    ['Hipercoagulável', { R: 3.5, K: 1, A: 74, MA: 78, LY: 0.5 }],
  ];
  const status = (v, [lo, hi]) => (v < lo ? 'low' : v > hi ? 'high' : 'normal');
  const dev = (v, lo, hi) => (v < lo ? (lo - v) / (hi - lo) : v > hi ? (v - hi) / (hi - lo) : 0);

  function curve(v) {
    const W = 340, H = 180, L = 30, R = 8, mid = H / 2;
    const total = v.R + v.K + 30;
    const xs = (W - L - R) / total, ys = (H * 0.42) / 80;
    const ma = Math.max(v.MA, 21);
    const b = -Math.log(1 - 20 / ma) / v.K;
    const maT = v.R + v.K * 6;
    const lr = -Math.log(1 - Math.min(v.LY, 95) / 100) / 30;
    const amp = (t) => t <= v.R ? 0 : t <= maT ? Math.min(ma * (1 - Math.exp(-b * (t - v.R))), ma) : ma * Math.exp(-lr * (t - maT));
    let top = '', bot = '';
    for (let i = 0; i <= 160; i++) {
      const t = i / 160 * total, a = amp(t), x = (L + t * xs).toFixed(1);
      top += `${i ? 'L' : 'M'}${x},${(mid - a * ys).toFixed(1)}`;
      bot = `L${x},${(mid + a * ys).toFixed(1)}` + bot;
    }
    const mk = (t, c, l) => { const x = L + t * xs; return `<line x1="${x}" y1="10" x2="${x}" y2="${H - 8}" stroke="${c}" stroke-dasharray="3 3"/><text x="${x + 3}" y="18" fill="${c}">${l}</text>`; };
    let grid = '';
    for (let mm = 20; mm <= 60; mm += 20) grid += `<line x1="${L}" x2="${W - R}" y1="${mid - mm * ys}" y2="${mid - mm * ys}" stroke="var(--line)" stroke-dasharray="2 4"/><line x1="${L}" x2="${W - R}" y1="${mid + mm * ys}" y2="${mid + mm * ys}" stroke="var(--line)" stroke-dasharray="2 4"/><text x="2" y="${mid - mm * ys + 3}">${mm}</text>`;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Traçado simulado do TEG">
      <g font-family="IBM Plex Mono, monospace" font-size="9" fill="var(--ink-3)">${grid}</g>
      <line x1="${L}" x2="${W - R}" y1="${mid}" y2="${mid}" stroke="var(--line)"/>
      <path d="${top}${bot}Z" fill="color-mix(in srgb, var(--g-hema) 30%, transparent)" stroke="var(--g-hema)" stroke-width="1.4"/>
      <g font-family="IBM Plex Mono, monospace" font-size="10">${mk(v.R, 'var(--ink-3)', 'R')}${mk(v.R + v.K, 'var(--info)', 'K')}${mk(maT, 'var(--warn)', 'MA')}</g>
    </svg>`;
  }

  C.register({
    id: 'teg', group: 'hema', tile: 'TEG',
    title: 'Tromboelastograma',
    sub: 'Interpretação e hemocomponente por parâmetro',
    keywords: ['teg', 'rotem', 'viscoelastico', 'coagulopatia', 'sangramento', 'plasma', 'crioprecipitado', 'fibrinogenio', 'plaquetas', 'acido tranexamico', 'hiperfibrinolise', 'transfusao'],
    render(body, api, root) {
      const pre = C.uid('pre');
      body.innerHTML = `
        <section class="card">
          ${C.lbl('Padrões de exemplo')}
          <div class="chips">${PRESETS.map(([n], i) => { const id = C.uid('p'); return `<input type="radio" name="${pre}" id="${id}" value="${i}"><label for="${id}">${n}</label>`; }).join('')}</div>
        </section>
        <section class="card">
          ${P.map(([k, l, u, mn, mx, st, def, ref, hint]) => `<div class="rng-row">
            <div class="rng-h"><b>${l} <span style="font-weight:400;color:var(--ink-3);font-size:13px">· ${hint}</span></b><span>ref ${String(ref[0]).replace('.', ',')}–${ref[1]} ${u}</span></div>
            <div class="rng"><input type="range" id="tr${k}" min="${mn}" max="${mx}" step="${st}" value="${def}" aria-label="${l}">
            <span class="fld-box"><input type="text" inputmode="decimal" id="tn${k}" value="${String(def).replace('.', ',')}" aria-label="${l} (${u})" autocomplete="off"></span></div>
          </div>`).join('')}
        </section>
        <div id="tOut"></div>
        <p class="ref">Referências para ativação por caolim (TEG®). LY30 &gt; 3% como limiar de hiperfibrinólise segue a literatura de trauma (Chapman 2013); a faixa do fabricante vai até 8%. Valores variam com reagente, dispositivo (TEG × ROTEM) e laboratório. Correlacionar com sangramento clínico e contexto (trauma, hepatopatia, CEC, sepse).</p>
      `;
      /* o campo numérico manda (aceita valores fora do alcance do slider) */
      const get = () => {
        const o = {};
        P.forEach(([k, , , mn, , , def]) => {
          const n = C.num(body.querySelector('#tn' + k).value);
          o[k] = Number.isFinite(n) ? Math.max(n, k === 'K' ? 0.1 : mn === 0 ? 0 : 0.1) : C.num(body.querySelector('#tr' + k).value) || def;
        });
        return o;
      };
      let txt = '';
      function calc() {
        const v = get();
        const s = { R: status(v.R, [5, 10]), K: status(v.K, [1, 3]), A: status(v.A, [53, 72]), MA: status(v.MA, [50, 70]), LY: v.LY > 3 ? 'high' : 'normal' };
        const ab = [];
        if (s.R === 'high') ab.push('déficit de fatores');
        if (s.A === 'low' || s.K === 'high') ab.push('hipofibrinogenemia');
        if (s.MA === 'low') ab.push('disfunção plaquetária');
        if (s.LY === 'high') ab.push('hiperfibrinólise');
        const hyper = (s.R === 'low' || s.MA === 'high' || s.A === 'high') && s.LY !== 'high';
        let verdict;
        if (ab.length) verdict = C.verdict('crit', 'Padrão global', 'Hipocoagulabilidade', 'Compatível com ' + ab.join(', ') + '. Repor o componente do parâmetro mais alterado.');
        else if (hyper) verdict = C.verdict('warn', 'Padrão global', 'Hipercoagulabilidade', 'R curto e/ou ângulo/MA aumentados, sem hiperfibrinólise. Avaliar risco tromboembólico.');
        else verdict = C.verdict('ok', 'Padrão global', 'Dentro da normalidade', 'Todos os parâmetros nas faixas de referência.');

        const cand = [];
        if (v.LY > 3) cand.push({ u: dev(v.LY, 0, 3) * 1.4 + 1, t: 'Ácido tranexâmico', d: 'LY30 elevado = hiperfibrinólise. Com sangramento ativo/trauma é prioridade: os hemocomponentes são degradados enquanto ela persiste.', dose: 'TXA 1 g IV em 10 min → 1 g IV em 8 h' });
        else if (v.LY < 0.5) cand.push({ u: 0.3, t: 'Fibrinólise “shutdown” — não tratar empiricamente', d: 'LY30 muito baixo (trauma grave, sepse) não indica antifibrinolítico. Monitorar risco trombótico.' });
        if (s.A === 'low' || s.K === 'high') cand.push({ u: Math.max(dev(v.A, 53, 72), dev(v.K, 1, 3)), t: 'Repor fibrinogênio', d: `${s.A === 'low' ? 'Ângulo α reduzido' : 'K prolongado'}${s.A === 'low' && s.K === 'high' ? ' e K prolongado' : ''} sugere hipofibrinogenemia funcional. Corrigir antes ou junto das plaquetas.`, dose: 'Crioprecipitado ~1 U/10 kg ou concentrado de fibrinogênio 3–4 g · meta &gt; 150–200 mg/dL' });
        if (s.MA === 'low') cand.push({ u: dev(v.MA, 50, 70) + 0.15, t: 'Transfundir plaquetas', d: 'MA reduzida reflete sobretudo disfunção/deficiência plaquetária (~80% da força do coágulo). Checar antiagregantes.', dose: '1 aférese ou 4–6 U randômicas · meta &gt; 50.000 (&gt; 100.000 em SNC)' });
        if (s.R === 'high') cand.push({ u: dev(v.R, 5, 10), t: 'Plasma fresco congelado', d: 'R prolongado = déficit de fatores. Excluir heparina residual (TEG com heparinase, sobretudo pós-CEC).', dose: 'PFC 10–15 mL/kg · CCP se reversão de anticoagulante' });
        if (hyper) cand.push({ u: Math.max(dev(v.R, 5, 10), dev(v.A, 53, 72), dev(v.MA, 50, 70)) * 0.6, t: 'Sem indicação de hemocomponente', d: 'Padrão pró-coagulante. Considerar profilaxia de TEV conforme o contexto.' });
        cand.sort((a, b) => b.u - a.u);
        const steps = cand.length
          ? cand.map((c, i) => [c.u < 0.35 ? 'ok' : i === 0 ? 'crit' : i === 1 ? 'warn' : 'info', `<b>${i + 1}. ${c.t}</b><br>${c.d}${c.dose ? `<br><span class="dose">${c.dose}</span>` : ''}`])
          : [['ok', '<b>Sem indicação de intervenção hemostática.</b>']];

        const interp = [];
        interp.push(s.R === 'high' ? ['warn', '<b>R prolongado:</b> déficit de fatores (iniciação). Excluir heparina.'] : s.R === 'low' ? ['info', '<b>R curto:</b> hipercoagulabilidade na geração de trombina.'] : ['ok', '<b>R normal:</b> iniciação preservada.']);
        interp.push(s.K === 'high' ? ['warn', '<b>K prolongado:</b> formação lenta do coágulo — hipofibrinogenemia (± plaquetas).'] : s.K === 'low' ? ['info', '<b>K curto:</b> cinética acelerada.'] : ['ok', '<b>K normal.</b>']);
        interp.push(s.A === 'low' ? ['warn', '<b>α reduzido:</b> hipofibrinogenemia ou polimerização de fibrina deficiente.'] : s.A === 'high' ? ['info', '<b>α aumentado:</b> cinética acelerada — hiperfibrinogenemia/pró-coagulante.'] : ['ok', '<b>α normal:</b> contribuição do fibrinogênio preservada.']);
        interp.push(s.MA === 'low' ? ['warn', '<b>MA reduzida:</b> disfunção/deficiência plaquetária ± fibrinogênio.'] : s.MA === 'high' ? ['info', '<b>MA aumentada:</b> hipercoagulabilidade plaquetária.'] : ['ok', '<b>MA normal:</b> força do coágulo preservada.']);
        interp.push(s.LY === 'high' ? ['crit', '<b>LY30 elevado:</b> hiperfibrinólise.'] : v.LY < 0.5 ? ['info', '<b>LY30 muito baixo:</b> possível shutdown fibrinolítico.'] : ['ok', '<b>LY30 normal:</b> sem hiperativação fibrinolítica.']);

        body.querySelector('#tOut').innerHTML = verdict +
          C.card('Conduta sugerida', C.steps(steps) + `<p class="fld-h" style="margin-top:10px">Ordem por grau de desvio. Não tratar número isolado sem sangramento. Repetir TEG após cada intervenção.</p>`) +
          C.card('Traçado simulado', curve(v)) +
          C.card('Por parâmetro', C.steps(interp));
        const fmtP = ([k, l, u]) => `${l} ${C.fmt(v[k], k === 'A' || k === 'MA' ? 0 : 1)}${u === '°' ? '°' : ' ' + u}`;
        txt = `TEG: ${P.map(fmtP).join(', ')}. ${ab.length ? 'Hipocoagulabilidade (' + ab.join(', ') + ')' : hyper ? 'Hipercoagulabilidade' : 'Normal'}. Conduta: ${cand.length ? cand.map((c) => c.t).join(' → ') : 'sem intervenção hemostática'}.`;
      }
      root.addEventListener('input', (e) => {
        const id = e.target.id || '';
        if (id.startsWith('tr')) body.querySelector('#tn' + id.slice(2)).value = String(e.target.value).replace('.', ',');
        if (id.startsWith('tn')) { const n = C.num(e.target.value); if (Number.isFinite(n)) body.querySelector('#tr' + id.slice(2)).value = n; }
        if (id.startsWith('tr') || id.startsWith('tn')) body.querySelectorAll(`input[name="${pre}"]`).forEach((r) => (r.checked = false));
        calc();
      });
      root.addEventListener('change', (e) => {
        if (e.target.name !== pre) return;
        const p = PRESETS[+e.target.value][1];
        P.forEach(([k]) => { body.querySelector('#tr' + k).value = p[k]; body.querySelector('#tn' + k).value = String(p[k]).replace('.', ','); });
        calc();
      });
      calc();
      api.summary = () => txt;
    },
  });
})();
