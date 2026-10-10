/* Plantão — Leitos, ficha do paciente e gasometria completa com tendência.
   Usa o motor C.engine (engine.js) e os pacientes do núcleo (C.Patients): o que é digitado aqui
   (peso, idade, sexo, altura, creatinina) alimenta também as demais calculadoras.
   Princípio de interface: uma coisa aberta por vez; resumo primeiro, detalhe sob demanda. */
(function () {
  'use strict';
  const C = window.Calc;
  const { $, $$, esc, store } = C;
  const I = C.icon;
  const P = C.Patients;
  const E = C.engine, G = C.gasF, F = G.F;
  const fmt = E.fmt, H = E.H;

  C.gasCfg = () => Object.assign({ lacUnit: 'mmol', patm: 760, agRef: 12 }, store.get('gasCfg', {}) || {});
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ================================================================ dados */
  /* campos do motor ↔ dados do paciente compartilhados com as calculadoras */
  const MAPK = { sex: 'sexo', age: 'idade', height: 'altura', weight: 'peso', crBase: 'crBase', pamAlvo: 'pamAlvo' };
  const PT_TTL = 12 * 3600 * 1000;
  const toStr = (v) => String(Math.round(v * 1000) / 1000).replace('.', ',');
  /* avulso: o mesmo registro de 12 h usado pelas calculadoras quando não há paciente ativo */
  function avulso() { const d = store.get('patient', null); return d && d.t && Date.now() - d.t <= PT_TTL ? d.v || {} : {}; }
  function setAvulso(k, v) { const cur = { ...avulso() }; if (v === '' || v == null) delete cur[k]; else cur[k] = v; store.set('patient', { v: cur, t: Date.now() }); }

  function demoOf(p) {
    const d = p ? p.data || {} : avulso();
    const o = {};
    for (const k in MAPK) {
      const v = d[MAPK[k]];
      if (v === undefined || v === null || v === '') continue;
      if (k === 'sex') { if (v === 'M' || v === 'F') o.sex = v; } else { const n = C.num(v); if (Number.isFinite(n)) o[k] = n; }
    }
    o.com = (p && p.ficha && p.ficha.com) || [];
    return o;
  }
  const merged = (p, rec) => Object.assign({}, rec.i, demoOf(p));
  const recs = (p) => (p && p.records) || [];
  const sorted = (p) => recs(p).slice().sort((a, b) => a.ts - b.ts);
  const isEmpty = (rec) => !Object.keys(rec.i).some((k) => rec.i[k] !== undefined && rec.i[k] !== '' && k !== 'ftest' && k !== 'fMet');
  const prevOf = (p, rec) => (p ? sorted(p).filter((r) => r.ts < rec.ts && !isEmpty(r)).pop() || null : null);
  function calc(p, rec) {
    const pr = prevOf(p, rec);
    return E.compute(merged(p, rec), C.gasCfg(), { ts: rec.ts, prev: pr ? merged(p, pr) : null, prevTs: pr ? pr.ts : null });
  }
  C.beds = { demoOf, merged, calc };

  /* ================================================================ formatação */
  const pad2 = (n) => String(n).padStart(2, '0');
  const dt = (ts) => { const d = new Date(ts); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
  const hm = (ts) => { const d = new Date(ts); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
  function ago(ts) {
    const m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return 'agora';
    if (m < 60) return `há ${m} min`;
    if (m < 48 * 60) return `há ${Math.round(m / 60)} h`;
    return `há ${Math.round(m / 1440)} d`;
  }
  function dUti(p) {
    const a = p && p.ficha && p.ficha.adm;
    if (!a) return null;
    const [y, m, d] = a.split('-').map(Number);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.floor((t - new Date(y, m - 1, d)) / 864e5) + 1; /* dia da admissão = D1 */
  }
  const isLac = (fid) => F[fid] && F[fid].lacUnit && C.gasCfg().lacUnit === 'mgdl';
  const unitOf = (fid) => (isLac(fid) ? 'mg/dL' : (F[fid] && F[fid].u) || '');
  const toDisp = (fid, v) => (isLac(fid) ? v * 9.01 : v);
  const numTxt = (x) => String(Math.round(x * 1000) / 1000).replace('.', ',').replace(/^-/, '−');
  const keyDisp = (k, v) => (k === 'lac' && C.gasCfg().lacUnit === 'mgdl' && v != null ? v * 9.01 : v);
  const normOf = (k, n, p) => (k === 'lac' && C.gasCfg().lacUnit === 'mgdl' ? [n[0] * 9.01, n[1] * 9.01] : k === 'pam' && p && p.data && C.num(p.data.pamAlvo) > 0 ? [C.num(p.data.pamAlvo), 100] : n);
  const outOf = (v, n) => v != null && (v < n[0] || v > n[1]);
  const ageSex = (p) => { const d = (p && p.data) || {}; return [d.idade && d.idade + ' a', d.sexo, d.peso && d.peso + ' kg'].filter(Boolean).join(' · '); };
  const hasAlergia = (p) => p && p.ficha && p.ficha.alerg && !/^nega/i.test(p.ficha.alerg.trim());
  const SEVCLS = { crit: 'crit', warn: 'warn', ok: 'ok' };
  const CHC = { ab: 'var(--g-met)', st: 'var(--g-met)', o2: 'var(--info)', perf: 'var(--g-inf)', fluid: 'var(--g-hemo)', hemo: 'var(--g-hemo)', vent: 'var(--g-resp)', renal: 'var(--violet)', base: 'var(--ink-3)' };

  /* traçado de tendência com faixa normal; pontos como segmentos de comprimento zero (não distorcem) */
  function strip(pts, normal, big) {
    const Pp = pts.filter((p) => p.v != null && Number.isFinite(p.v));
    if (!Pp.length) return '';
    const w = big ? 320 : 240, h = big ? 110 : 40;
    const vs = Pp.map((p) => p.v);
    let lo = Math.min(...vs, normal[0]), hi = Math.max(...vs, normal[1]);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) { lo = Math.min(...vs); hi = Math.max(...vs); }
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
    const t0 = Pp[0].t, t1 = Pp[Pp.length - 1].t;
    const px = (t) => (Pp.length === 1 ? w - 8 : 8 + ((t - t0) / (t1 - t0 || 1)) * (w - 16));
    const py = (v) => h - 4 - ((v - lo) / (hi - lo)) * (h - 8);
    const nTop = py(Math.min(normal[1], hi)), nBot = py(Math.max(normal[0], lo));
    const band = nBot > nTop ? `<rect x="0" width="${w}" y="${nTop}" height="${nBot - nTop}" class="sp-band"/>` : '';
    const d = Pp.map((p, i) => `${i ? 'L' : 'M'}${px(p.t).toFixed(1)},${py(p.v).toFixed(1)}`).join('');
    const dots = Pp.map((p, i) => `<path d="M${px(p.t).toFixed(1)},${py(p.v).toFixed(1)}h0" stroke-width="${i === Pp.length - 1 ? (big ? 9 : 7) : big ? 5 : 4}" class="sp-dot${i === Pp.length - 1 ? ' last' : ''}${outOf(p.v, normal) ? ' out' : ''}"/>`).join('');
    return `<svg class="sp${big ? ' big' : ''}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${band}<path d="${d}" class="sp-line"/>${dots}</svg>`;
  }

  /* mapa de Davenport (pH × HCO3) — do Plantão original */
  function davenport(ph, hco3) {
    const W = 340, Hh = 220, L = 36, R = 10, T = 12, B = 30;
    const x = (v) => L + (Math.max(7, Math.min(7.8, v)) - 7) / 0.8 * (W - L - R);
    const y = (v) => Hh - B - Math.max(0, Math.min(44, v)) / 44 * (Hh - T - B);
    const mx = x(7.4), my = y(24);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Mapa ácido-base: pH ${fmt(ph, 2)}, HCO3 ${fmt(hco3, 1)}">
      <rect x="${L}" y="${T}" width="${mx - L}" height="${my - T}" fill="var(--crit-wash)"/>
      <rect x="${mx}" y="${T}" width="${W - R - mx}" height="${my - T}" fill="var(--info-wash)"/>
      <rect x="${L}" y="${my}" width="${mx - L}" height="${Hh - B - my}" fill="var(--warn-wash)"/>
      <rect x="${mx}" y="${my}" width="${W - R - mx}" height="${Hh - B - my}" fill="var(--ok-wash)"/>
      <g font-family="IBM Plex Mono, monospace" font-size="9" fill="var(--ink-3)">
        <text x="${L + 5}" y="${T + 12}">acid. resp.</text><text x="${W - R - 5}" y="${T + 12}" text-anchor="end">alc. metab.</text>
        <text x="${L + 5}" y="${Hh - B - 6}">acid. metab.</text><text x="${W - R - 5}" y="${Hh - B - 6}" text-anchor="end">alc. resp.</text>`;
    for (let v = 7.0; v <= 7.81; v += 0.2) s += `<text x="${x(v)}" y="${Hh - B + 14}" text-anchor="middle">${v.toFixed(1).replace('.', ',')}</text>`;
    for (let v = 0; v <= 44; v += 11) s += `<text x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
    s += `<text x="${(L + W - R) / 2}" y="${Hh - 3}" text-anchor="middle">pH</text></g>
      <line x1="${L}" y1="${my}" x2="${W - R}" y2="${my}" stroke="var(--ink-3)" stroke-dasharray="3 3" stroke-width=".8"/>
      <line x1="${mx}" y1="${T}" x2="${mx}" y2="${Hh - B}" stroke="var(--ink-3)" stroke-dasharray="3 3" stroke-width=".8"/>
      <circle cx="${x(ph)}" cy="${y(hco3)}" r="6.5" fill="var(--ink)" stroke="var(--surface)" stroke-width="2"/></svg>`;
    return s;
  }

  /* folha inferior (referência, confirmação, horário) — vive dentro da tela atual */
  function sheet(pg, html) {
    const old = $('.sheet', pg);
    if (old) old.remove();
    const s = document.createElement('div');
    s.className = 'sheet';
    pg.appendChild(s);
    s.innerHTML = `<div class="sh-bg" data-sx></div><div class="sh" role="dialog" aria-modal="true"><button class="icon-btn sh-x" data-sx aria-label="Fechar">${I.x}</button>${html}</div>`;
    s.hidden = false;
    C.navHidden(true);
    s.addEventListener('click', (e) => { if (e.target.closest('[data-sx]')) closeSheet(pg); });
    return s;
  }
  function closeSheet(pg) { const s = $('.sheet', pg); if (s) s.remove(); C.navHidden(!!S.kp); }
  function refSheet(pg, id) {
    const r = E.REF[id];
    if (!r) return;
    sheet(pg, `<div class="ref-sh"><span class="pill ${r.v ? 'ok' : ''}">${r.v ? 'verificado na pesquisa' : 'referência clássica'}</span><h2>${esc(r.t)}</h2><div class="calc-line">${esc(r.f).replace(/\n/g, '<br>')}</div><p>${esc(r.c).replace(/\n/g, '<br>')}</p><p class="ref">${esc(r.s)}</p></div>`);
  }

  /* ================================================================ estado da sessão */
  const S = { ctx: null, kp: null, tab: 'in', openG: null, acc: null, dxAll: false, quick: null, more: {} };

  /* sair da gasometria sem digitar nada não deixa registro vazio */
  function cleanup(keep) {
    const c = S.ctx;
    if (c && c.p && c.rec !== keep && isEmpty(c.rec)) { c.p.records = recs(c.p).filter((r) => r !== c.rec); P.touch(c.p); }
    if (!keep) S.ctx = null;
  }
  window.addEventListener('hashchange', () => { if (!/^#\/gaso/.test(location.hash)) { cleanup(null); S.kp = null; document.body.classList.remove('kp-open'); } });

  /* ================================================================ LEITOS */
  const bedKey = (p) => C.ptBed(p) || C.ptIni(p) || p.label;
  const bedSort = (a, b) => String(bedKey(a)).localeCompare(String(bedKey(b)), 'pt', { numeric: true });
  function lastInfo(p) {
    const rs = sorted(p).filter((r) => !isEmpty(r));
    const last = rs[rs.length - 1];
    return { rs, last, res: last ? calc(p, last) : null, prev: rs.length > 1 ? calc(p, rs[rs.length - 2]) : null };
  }
  function bedTile(p, act) {
    const { last, res, prev } = lastInfo(p);
    const bed = C.ptBed(p), ini = C.ptIni(p);
    const big = bed || ini || p.label;
    const v = (k, l, dec, n) => {
      const x = res && res.key[k];
      if (x == null) return `<span><i>${l}</i>—</span>`;
      const pv = prev && prev.key[k];
      const arr = pv != null && Math.abs(x - pv) >= 0.5 * 10 ** -dec ? (x > pv ? '↑' : '↓') : '';
      const nn = normOf(k, n, p);
      return `<span class="${outOf(keyDisp(k, x), nn) ? 'off' : ''}"><i>${l}</i>${fmt(keyDisp(k, x), dec)}<em>${arr}</em></span>`;
    };
    const iso = p.ficha && p.ficha.iso;
    return `<a class="bed sev-${(res && res.worst) || 'none'}${act ? ' on' : ''}" href="#/paciente?id=${p.id}" data-pick="${p.id}">
      <div class="bed-top"><span class="bed-no${bed ? '' : ' txt'}">${esc(big)}</span>
        <span class="bed-id">${bed && ini ? `<b>${esc(ini)}</b>` : ''}<span>${esc(ageSex(p).split(' · ').slice(0, 2).join(' '))}</span></span></div>
      <div class="bed-tags">${dUti(p) ? `<span class="pill info">D${dUti(p)}</span>` : ''}${iso ? `<span class="pill warn">${esc((G.ISO.find((x) => x[0] === iso) || [])[1] || iso)}</span>` : ''}${hasAlergia(p) ? '<span class="pill crit">alergia</span>' : ''}${act ? '<span class="pill ok">ativo</span>' : ''}</div>
      ${p.ficha && p.ficha.diag ? `<div class="bed-diag">${esc(p.ficha.diag)}</div>` : ''}
      <div class="bed-vals">${v('ph', 'pH', 2, [7.35, 7.45])}${v('lac', 'Lac', 1, [0, 2])}${v('pf', 'P/F', 0, [300, 9999])}</div>
      <div class="bed-foot"><span>${res ? esc((res.main || res.dx[0] || { t: 'sem achados' }).t) : 'sem gasometria'}</span>${last ? `<time>${ago(last.ts)}</time>` : ''}</div>
    </a>`;
  }

  C.routes.leitos = function (q) {
    const volta = q.get('volta');
    const tool = volta && C.tool(volta);
    document.title = 'Leitos — Plantão';
    const list = P.list();
    const act = list.filter((p) => !p.archived).sort(bedSort);
    const arch = list.filter((p) => p.archived).sort(bedSort);
    const a = P.active();
    const av = avulso();
    const pg = C.mount(`
      <header class="bar" id="bar">
        ${tool ? `<a class="icon-btn" href="#/${tool.id}" aria-label="Voltar">${I.back}</a>` : ''}
        <div class="bar-title"><span class="k">${tool ? 'Escolha o paciente para' : 'Lista do plantão'}</span><h1>${tool ? esc(tool.title) : 'Leitos'}</h1></div>
        <a class="icon-btn" href="#/ficha${tool ? '?volta=' + tool.id : ''}" aria-label="Admitir paciente">${I.plus}</a>
      </header>
      <main class="tool">
        ${C.Vault.isTemp() ? '<div class="note warn" style="margin:0 0 12px">Modo temporário: a lista some ao bloquear ou fechar o app.</div>' : ''}
        ${act.length ? `<div class="beds">${act.map((p) => bedTile(p, a && a.id === p.id)).join('')}</div>`
          : `<div class="card flat beds-empty"><b>Nenhum paciente na lista</b><span>Admita um paciente para acompanhar gasometrias, tendências e usar o peso dele em todas as calculadoras.</span></div>`}
        <a class="btn block primary add-bed" href="#/ficha${tool ? '?volta=' + tool.id : ''}">${I.plus} Admitir paciente</a>
        <div class="list avulso"><button type="button" class="pt-pick ${!a ? 'on' : ''}" data-pick="">
          <span class="pt-radio"></span><span class="row-t"><b>Avulso (sem identificação)</b><span>${av && Object.keys(av).length ? esc(C.Patient.summary(av)) + ' · apaga em 12 h' : 'cálculos rápidos; apaga em 12 h'}</span></span></button></div>
        ${arch.length ? `<details class="arch"><summary>Altas e arquivados (${arch.length})</summary><div class="list">${arch.map((p) => `<a class="row" href="#/paciente?id=${p.id}"><span class="row-t"><b>${esc(P.name(p))}</b><span>${recs(p).length} registro(s)</span></span>${I.chev}</a>`).join('')}</div></details>` : ''}
        <p class="ref">Use só iniciais, leito ou atendimento. Dados criptografados neste aparelho. Dê alta (arquive) ou remova os pacientes na passagem do plantão.</p>
      </main>`);
    pg.addEventListener('click', (e) => {
      const t = e.target.closest('[data-pick]');
      if (!t) return;
      const id = t.dataset.pick || null;
      if (tool) { e.preventDefault(); P.setActive(id); location.hash = '#/' + tool.id; return; }
      if (!id) { P.setActive(null); C.toast('Sem paciente: cálculos avulsos'); C.route(); }
    });
  };
  C.routes.leitos.nav = 'leitos';

  /* ================================================================ PACIENTE */
  C.routes.paciente = function (q) {
    const p = P.get(q.get('id'));
    if (!p) { location.replace('#/leitos'); return; }
    if (!p.archived) P.setActive(p.id);
    document.title = P.name(p) + ' — Plantão';
    const { rs, last, res } = lastInfo(p);
    const series = rs.map((r) => ({ r, res: calc(p, r) }));
    const more = S.more[p.id] || (S.more[p.id] = {});
    const rows = G.TREND.map(([k, l, dec, ch, n]) => {
      const pts = series.map((s) => ({ t: s.r.ts, v: keyDisp(k, s.res.key[k]) })).filter((x) => x.v != null);
      if (!pts.length) return null;
      const nn = normOf(k, n, p);
      const lv = pts[pts.length - 1].v, pv = pts.length > 1 ? pts[pts.length - 2].v : null;
      const df = pv != null ? lv - pv : null;
      const big = more['tr_' + k];
      return `<button type="button" class="tr${big ? ' big' : ''}" style="--c:${CHC[ch]}" data-tr="${k}">
        <span class="tr-l">${l}</span><span class="tr-v ${outOf(lv, nn) ? 'off' : ''}">${fmt(lv, dec)}</span>
        <span class="tr-d">${df != null && Math.abs(df) >= 0.5 * 10 ** -dec ? (df > 0 ? '▲' : '▼') + fmt(Math.abs(df), dec) : ''}</span>
        <span class="tr-s">${strip(pts, nn, big)}</span>
        ${big ? `<span class="tr-pts">${pts.slice(-8).reverse().map((x) => `<i>${hm(x.t)} <b>${fmt(x.v, dec)}</b></i>`).join('')}</span>` : ''}</button>`;
    }).filter(Boolean);
    const trShown = more.trAll ? rows : rows.slice(0, 4);
    const hist = series.slice().reverse();
    const histShown = more.hiAll ? hist : hist.slice(0, 3);
    const f = p.ficha || {};
    const lab = (opts, sel) => (sel || []).map((k) => (opts.find((o) => o[0] === k) || [k, k])[1]);
    const findings = res ? res.dx.filter((x) => !x.main && x.s !== 'ok').slice(0, 2) : [];

    const pg = C.mount(`
      <header class="bar" id="bar">
        <a class="icon-btn" href="#/leitos" aria-label="Voltar">${I.back}</a>
        <div class="bar-title"><span class="k">${[dUti(p) && 'D' + dUti(p), ageSex(p)].filter(Boolean).join(' · ') || 'paciente'}</span><h1>${esc(P.name(p))}</h1></div>
        <a class="icon-btn" href="#/ficha?id=${p.id}" aria-label="Editar ficha">${I.edit}</a>
      </header>
      <main class="tool">
        ${p.archived ? `<div class="note warn" style="margin:0 0 12px">Paciente arquivado (alta). <button class="link" data-act="unarch">Reativar</button></div>` : ''}
        <div class="pt-cta">
          <a class="btn primary" href="#/gaso?p=${p.id}&r=novo">${I.plus} Nova gasometria</a>
          <a class="btn" href="#/">${I.grid} Calculadoras</a>
        </div>
        <details class="card fi" ${more.fi ? 'open' : ''} data-more="fi">
          <summary><span class="fi-t"><b>${esc(f.diag || 'Ficha do paciente')}</b><span>${hasAlergia(p) ? `<span class="pill crit">${I.alert} ${esc(f.alerg)}</span>` : f.alerg ? '<span class="pill">nega alergias</span>' : '<span class="pill">alergias não informadas</span>'}</span></span>${I.down}</summary>
          <div class="kv">
            ${f.com && f.com.length ? `<div><span>Comorbidades</span><span>${esc(lab(G.COM, f.com).join(', '))}</span></div>` : ''}
            ${f.dev && f.dev.length ? `<div><span>Dispositivos</span><span>${esc(lab(G.DEV, f.dev).join(', '))}</span></div>` : ''}
            ${f.iso ? `<div><span>Isolamento</span><span>${esc((G.ISO.find((x) => x[0] === f.iso) || [])[1] || '')}</span></div>` : ''}
            ${p.data && p.data.pamAlvo ? `<div><span>PAM alvo</span><span>${esc(p.data.pamAlvo)} mmHg</span></div>` : ''}
            ${p.data && p.data.crBase ? `<div><span>Cr basal</span><span>${esc(p.data.crBase)} mg/dL</span></div>` : ''}
            ${p.data && p.data.cr ? `<div><span>Cr atual</span><span>${esc(p.data.cr)} mg/dL</span></div>` : ''}
            ${f.adm ? `<div><span>Admissão</span><span>${f.adm.split('-').reverse().join('/')}</span></div>` : ''}
          </div>
          ${f.obs ? `<p class="fi-obs">${esc(f.obs)}</p>` : ''}
          <a class="btn sm block" href="#/ficha?id=${p.id}" style="margin-top:10px">${I.edit} Editar ficha</a>
        </details>
        ${last ? `<a class="last-read" href="#/gaso?p=${p.id}&r=${last.id}">
            ${C.verdict(SEVCLS[(res.main || {}).s] || 'idle', `Última gasometria · ${dt(last.ts)} · ${ago(last.ts)}`, esc((res.main || res.dx[0] || { t: 'Sem achados' }).t), findings.map((x) => esc(x.t)).join('<br>'))}</a>`
          : '<div class="card flat beds-empty"><b>Nenhuma gasometria ainda</b><span>Use “Nova gasometria” para começar a tendência deste paciente.</span></div>'}
        ${rows.length ? `<section class="card trends"><div class="card-h"><h2>Tendência</h2><span class="aux">toque para ampliar</span></div>${trShown.join('')}
          ${rows.length > 4 ? `<button type="button" class="link" data-act="trAll">${more.trAll ? 'mostrar menos' : `mostrar todas (${rows.length})`}</button>` : ''}</section>` : ''}
        ${hist.length ? `<section class="card"><div class="card-h"><h2>Registros</h2><span class="aux">${hist.length}</span></div><div class="hist">
          ${histShown.map((s) => `<a class="hi sev-${s.res.worst || 'none'}" href="#/gaso?p=${p.id}&r=${s.r.id}"><time>${dt(s.r.ts)}</time><span>${esc((s.res.main || s.res.dx[0] || { t: 'sem achados' }).t)}</span>${I.chev}</a>`).join('')}</div>
          ${hist.length > 3 ? `<button type="button" class="link" data-act="hiAll">${more.hiAll ? 'mostrar menos' : `ver todos (${hist.length})`}</button>` : ''}</section>` : ''}
        ${(() => {
          const ids = p.pcrs || [];
          const list = (store.get('pcrHist', []) || []).filter((c) => ids.includes(c.id)).reverse();
          return list.length ? `<section class="card"><div class="card-h"><h2>Paradas (PCR)</h2><span class="aux">${list.length}</span></div><div class="hist">${list.map((c) => `<a class="hi sev-${c.outcome === 'rce' ? 'ok' : 'crit'}" href="#/pcr-relatorio?id=${c.id}"><time>${dt(c.start)}</time><span>${{ rce: 'RCE', obito: 'Óbito', inter: 'Interrompida' }[c.outcome] || ''} · ${Math.round((c.end - c.start) / 60000)} min</span>${I.chev}</a>`).join('')}</div></section>` : '';
        })()}
        <div class="pt-foot">
          ${p.archived ? '' : '<button type="button" class="btn" data-act="arch">Alta / arquivar</button>'}
          <button type="button" class="btn danger" data-act="del">Excluir paciente</button>
        </div>
      </main>`);
    pg.addEventListener('toggle', (e) => { if (e.target.dataset && e.target.dataset.more) more[e.target.dataset.more] = e.target.open; }, true);
    pg.addEventListener('click', (e) => {
      const tr = e.target.closest('[data-tr]');
      if (tr) { more['tr_' + tr.dataset.tr] = !more['tr_' + tr.dataset.tr]; return C.route(); }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const a = b.dataset.act;
      if (a === 'trAll' || a === 'hiAll') { more[a] = !more[a]; return C.route(); }
      if (a === 'arch') { p.archived = true; if (P.active() && P.active().id === p.id) P.setActive(null); P.touch(p); C.toast('Paciente arquivado'); location.hash = '#/leitos'; }
      if (a === 'unarch') { p.archived = false; P.touch(p); C.route(); }
      if (a === 'del') {
        if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Toque de novo para excluir tudo'; return; }
        P.remove(p.id); C.toast('Paciente excluído'); location.hash = '#/leitos';
      }
    });
  };
  C.routes.paciente.nav = 'leitos';

  /* ================================================================ FICHA */
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
  const txtField = (id, label, value, o = {}) => `<label class="fld" for="${id}"><span class="fld-l">${label}${o.opt ? ' <span class="opt">(opcional)</span>' : ''}</span>
    <span class="fld-box"><input id="${id}" type="${o.type || 'text'}" ${o.max ? `maxlength="${o.max}"` : ''} autocomplete="off" autocorrect="off" spellcheck="false" ${o.upper ? 'autocapitalize="characters"' : ''} ${o.attrs || ''} placeholder="${esc(o.ph || '')}" value="${esc(value || '')}" class="${o.cls || ''}"></span>${o.hint ? `<span class="fld-h">${o.hint}</span>` : ''}</label>`;

  C.routes.ficha = function (q) {
    const ed = q.get('id') ? P.get(q.get('id')) : null;
    if (q.get('id') && !ed) { location.replace('#/leitos'); return; }
    const deGaso = q.get('de') === 'gaso' && S.quick;
    const volta = q.get('volta');
    const d = ed ? ed.data || {} : deGaso ? avulso() : {};
    const f = (ed && ed.ficha) || { adm: today(), com: [], dev: [], iso: '' };
    const sexName = C.uid('sx'), isoName = C.uid('iso');
    const bed = ed ? C.ptBed(ed) : '', ini = ed ? C.ptIni(ed) : '', atd = ed ? (ed.tipo === 'atd' ? ed.label : f.atd || '') : '';
    const extraFilled = f.diag || f.alerg || f.obs || (f.com && f.com.length) || (f.dev && f.dev.length) || f.iso;
    document.title = (ed ? 'Ficha' : 'Admitir paciente') + ' — Plantão';
    const chips = (name, opts, sel) => `<div class="chips">${opts.map(([k, l]) => { const id = C.uid('ch'); return `<input type="checkbox" id="${id}" name="${name}" value="${k}" ${(sel || []).includes(k) ? 'checked' : ''}><label for="${id}">${l}</label>`; }).join('')}</div>`;
    const back = ed ? '#/paciente?id=' + ed.id : deGaso ? '#/gaso?p=&r=' + S.quick.id : volta ? '#/' + volta : '#/leitos';
    const pg = C.mount(`
      <header class="bar" id="bar">
        <a class="icon-btn" href="${back}" aria-label="Voltar">${I.back}</a>
        <div class="bar-title"><span class="k">${ed ? esc(P.name(ed)) : 'Novo paciente'}</span><h1>${ed ? 'Ficha do paciente' : 'Admitir paciente'}</h1></div>
      </header>
      <main class="tool ficha">
        <section class="card">
          <div class="card-h"><h2>Identificação</h2><span class="aux">ao menos um</span></div>
          <div class="grid">
            ${txtField('fBed', 'Leito', bed, { max: 12, ph: 'ex.: 12', cls: 'big' })}
            ${txtField('fIni', 'Iniciais', ini, { max: 8, ph: 'ex.: JSM', upper: true })}
          </div>
          <div style="height:10px"></div>
          ${txtField('fAtd', 'Nº do atendimento', atd, { max: 24, opt: true, attrs: 'inputmode="numeric"' })}
        </section>
        <section class="card">
          <div class="card-h"><h2>Dados para os cálculos</h2><span class="aux">usados em todas as calculadoras</span></div>
          ${C.seg({ name: sexName, label: 'Sexo', cls: 'cols', value: d.sexo || '', options: [['M', 'Masculino'], ['F', 'Feminino']] })}
          <div class="grid g3" style="margin-top:12px">
            ${C.field({ id: 'fAge', label: 'Idade', unit: 'anos', value: d.idade, lim: C.LIM.idade })}
            ${C.field({ id: 'fHt', label: 'Altura', unit: 'cm', value: d.altura, lim: C.LIM.altura })}
            ${C.field({ id: 'fWt', label: 'Peso', unit: 'kg', value: d.peso, lim: C.LIM.peso })}
          </div>
          <div class="pf-calc" id="pfCalc"></div>
          <div class="grid g3" style="margin-top:12px">
            ${C.field({ id: 'fCr', label: 'Cr atual', unit: 'mg/dL', value: d.cr, lim: C.LIM.cr })}
            ${C.field({ id: 'fCrB', label: 'Cr basal', unit: 'mg/dL', value: d.crBase, lim: C.LIM.cr })}
            ${C.field({ id: 'fPam', label: 'PAM alvo', unit: 'mmHg', value: d.pamAlvo, ph: '65', lim: [50, 110] })}
          </div>
          <p class="fld-h" style="margin:8px 0 0">Cr basal entra no KDIGO; PAM alvo substitui o 65 padrão nos alertas (ex.: hipertenso crônico).</p>
        </section>
        <details class="card more" ${ed && extraFilled ? 'open' : ''}>
          <summary><b>Internação, comorbidades, alergias e dispositivos</b><span class="aux">opcional</span>${I.down}</summary>
          <div class="more-b">
            <div class="grid">
              ${txtField('fAdm', 'Admissão na UTI', f.adm, { type: 'date', attrs: `max="${today()}"` })}
              <div></div>
            </div>
            ${C.seg({ name: isoName, label: 'Isolamento', cls: 'cols', value: f.iso || '', options: G.ISO })}
            ${txtField('fDiag', 'Diagnóstico / motivo da internação', f.diag, { max: 70, ph: 'ex.: choque séptico, foco pulmonar' })}
            <div class="fld"><span class="fld-l">Comorbidades</span>${chips('com', G.COM, f.com)}</div>
            ${txtField('fAlerg', 'Alergias', f.alerg, { max: 80, ph: 'vazio = não informado · escreva NEGA se negar' })}
            <div class="fld"><span class="fld-l">Dispositivos</span>${chips('dev', G.DEV, f.dev)}</div>
            <label class="fld" for="fObs"><span class="fld-l">Observações</span><textarea id="fObs" maxlength="500" rows="3" placeholder="pendências, metas do dia…">${esc(f.obs || '')}</textarea></label>
          </div>
        </details>
        <p class="ref">${I.alert} LGPD: não registre nome, prontuário, CPF nem data de nascimento.</p>
        <div class="lock-msg" id="fMsg" role="alert"></div>
        <div class="save-bar"><button type="button" class="btn primary block" id="fSave">${ed ? 'Salvar ficha' : deGaso ? 'Admitir e salvar a gasometria' : 'Admitir paciente'}</button></div>
      </main>`);
    C.navHidden(true);
    const val = (id) => ($('#' + id, pg).value || '').trim();
    function pfCalc() {
      const h = C.read($('#fHt', pg)), w = C.read($('#fWt', pg)), sex = C.radioVal(pg, sexName);
      const bits = [];
      if (h > 0 && sex) { const pbw = (sex === 'F' ? 45.5 : 50) + 0.91 * (h - 152.4); bits.push(`Peso predito <b>${fmt(pbw, 1)} kg</b>`, `Vt 6 mL/kg <b>${fmt(pbw * 6)} mL</b>`); }
      if (h > 0 && w > 0) bits.push(`ASC <b>${fmt(0.007184 * Math.pow(w, 0.425) * Math.pow(h, 0.725), 2)} m²</b>`, `IMC <b>${fmt(w / (h / 100) ** 2, 1)}</b>`);
      $('#pfCalc', pg).innerHTML = bits.length ? bits.map((b) => `<span>${b}</span>`).join('') : '<span>altura + sexo → peso predito e Vt protetor</span>';
    }
    pfCalc();
    pg.addEventListener('input', (e) => { C.validate(e.target); pfCalc(); });
    pg.addEventListener('change', pfCalc);
    $('#fSave', pg).addEventListener('click', () => {
      const msg = $('#fMsg', pg);
      const b = val('fBed'), i = val('fIni').toUpperCase(), at = val('fAtd');
      if (!b && !i && !at) { msg.textContent = 'Preencha o leito, as iniciais ou o atendimento.'; msg.className = 'lock-msg err'; return; }
      const nums = { idade: 'fAge', altura: 'fHt', peso: 'fWt', cr: 'fCr', crBase: 'fCrB', pamAlvo: 'fPam' };
      for (const k in nums) { const el = $('#' + nums[k], pg); if (el.value.trim() && !Number.isFinite(C.read(el))) { msg.textContent = 'Corrija os campos em vermelho.'; msg.className = 'lock-msg err'; el.focus(); return; } }
      let p = ed;
      if (!p) {
        const tipo = b ? 'leito' : i ? 'ini' : 'atd', label = b || i || at;
        const dup = P.find(tipo, label);
        if (dup && !dup.archived) { msg.textContent = `${P.name(dup)} já está na lista — edite a ficha dele.`; msg.className = 'lock-msg err'; return; }
        p = P.add(tipo, label);
      } else {
        /* troca de identificação principal: mantém o tipo se ainda houver valor; senão cai para o próximo disponível */
        const tipo = ed.tipo === 'leito' && b ? 'leito' : ed.tipo === 'ini' && i ? 'ini' : ed.tipo === 'atd' && at ? 'atd' : b ? 'leito' : i ? 'ini' : 'atd';
        p.tipo = tipo; p.label = tipo === 'leito' ? b : tipo === 'ini' ? i : at;
      }
      p.data = p.data || {};
      for (const k in nums) { const v = val(nums[k]); if (v) p.data[k] = v; else delete p.data[k]; }
      const sex = C.radioVal(pg, sexName);
      if (sex) p.data.sexo = sex; else delete p.data.sexo;
      p.ficha = {
        leito: p.tipo !== 'leito' ? b : '', ini: p.tipo !== 'ini' ? i : '', atd: p.tipo !== 'atd' ? at : '',
        adm: val('fAdm'), iso: C.radioVal(pg, isoName) || '', diag: val('fDiag'), alerg: val('fAlerg'), obs: ($('#fObs', pg).value || '').trim(),
        com: $$('input[name="com"]:checked', pg).map((x) => x.value), dev: $$('input[name="dev"]:checked', pg).map((x) => x.value),
      };
      p.records = p.records || [];
      if (deGaso) {
        const qr = S.quick;
        p.records.push(qr); S.quick = null; S.ctx = null;
        P.touch(p); P.setActive(p.id);
        C.toast(`Gasometria salva em ${P.name(p)}`);
        location.hash = `#/gaso?p=${p.id}&r=${qr.id}`;
        return;
      }
      P.touch(p);
      if (!ed) P.setActive(p.id);
      C.toast(ed ? 'Ficha salva' : `${P.name(p)} admitido e selecionado`);
      location.hash = volta && C.tool(volta) ? '#/' + volta : '#/paciente?id=' + p.id;
    });
  };
  C.routes.ficha.nav = 'leitos';

  /* ================================================================ GASOMETRIA */
  const MON = [['ph', 'pH', 2, 'ab', [7.35, 7.45]], ['paco2', 'PaCO₂', 0, 'ab', [35, 45]], ['hco3', 'HCO₃', 0, 'ab', [22, 26]], ['agc', 'AG', 1, 'ab', [0, 16]], ['lac', 'Lac', 1, 'perf', [0, 2]], ['pf', 'P/F', 0, 'o2', [300, 9999]]];

  function getV(fid) {
    const { p, rec } = S.ctx;
    const f = F[fid];
    if (f && f.demo) {
      const raw = p ? (p.data || {})[MAPK[fid]] : avulso()[MAPK[fid]];
      if (fid === 'sex') return raw === 'M' || raw === 'F' ? raw : undefined;
      const n = C.num(raw);
      return Number.isFinite(n) ? n : undefined;
    }
    return rec.i[fid];
  }
  function setV(fid, v) {
    const { p, rec } = S.ctx;
    const f = F[fid];
    if (f && f.demo) {
      const sv = v === undefined || v === null || v === '' ? '' : fid === 'sex' ? v : toStr(v);
      if (p) { p.data = p.data || {}; if (sv === '') delete p.data[MAPK[fid]]; else p.data[MAPK[fid]] = sv; }
      else setAvulso(MAPK[fid], sv);
    } else {
      if (v === undefined || v === null || v === '') delete rec.i[fid]; else rec.i[fid] = v;
      /* a creatinina mais recente vira a "Cr atual" do paciente (ajuste renal de ATB etc.) */
      if (fid === 'cr' && p && v != null && v !== '' && !sorted(p).some((r) => r.ts > rec.ts && H(r.i.cr))) { p.data = p.data || {}; p.data.cr = toStr(v); }
    }
    if (p) P.touch(p);
  }
  const prevV = (fid) => { const { p, rec } = S.ctx; const pr = prevOf(p, rec); return pr ? merged(p, pr)[fid] : undefined; };
  const groupFields = (g) => (g.dyn ? g.f.concat(G.fluidFields(merged(S.ctx.p, S.ctx.rec))) : g.f);
  function filled(g) {
    const fs = groupFields(g).filter((f) => F[f].type !== 'bool');
    return [fs.filter((f) => getV(f) !== undefined && getV(f) !== '').length, fs.length];
  }
  const openGroup = () => S.openG || 'gaso';

  C.routes.gaso = function (q) {
    let p = null;
    if (q.get('novo')) p = P.active();
    else if (q.get('p')) p = P.get(q.get('p'));
    let rec = null;
    const rid = q.get('r');
    if (q.get('novo') || !rid || rid === 'novo') {
      rec = { id: uid(), ts: Date.now(), i: {} };
      if (p) { p.records = p.records || []; p.records.push(rec); } else S.quick = rec;
      history.replaceState(null, '', `#/gaso?p=${p ? p.id : ''}&r=${rec.id}`);
      S.tab = 'in'; S.openG = null; S.acc = null; S.dxAll = false;
    } else rec = p ? recs(p).find((r) => r.id === rid) : S.quick && S.quick.id === rid ? S.quick : null;
    if (!rec) {
      if (p) { location.replace('#/paciente?id=' + p.id); return; }
      rec = S.quick = { id: uid(), ts: Date.now(), i: {} };
      history.replaceState(null, '', `#/gaso?p=&r=${rec.id}`);
    }
    if (S.ctx && S.ctx.rec !== rec) { cleanup(rec); S.tab = 'in'; S.openG = null; S.acc = null; S.dxAll = false; }
    if (p && !p.archived) P.setActive(p.id);
    S.ctx = { p, rec };
    S.kp = null;
    document.title = 'Gasometria — Plantão';
    const prev = prevOf(p, rec);
    const pg = C.mount(`
      <header class="bar" id="bar">
        <a class="icon-btn" href="${p ? '#/paciente?id=' + p.id : '#/'}" aria-label="Voltar">${I.back}</a>
        <div class="bar-title"><span class="k">${p ? esc(P.name(p)) + (dUti(p) ? ' · D' + dUti(p) : '') + (prev ? ' · ant. ' + ago(prev.ts) : '') : 'Avulso · não salvo'}${hasAlergia(p) ? ' · <b class="al">alergia</b>' : ''}</span><h1>Gasometria</h1></div>
        ${p ? `<button type="button" class="btn sm ts-btn" data-act="ts">${I.clock}<span class="num">${dt(rec.ts)}</span></button>` : '<button type="button" class="btn sm" data-act="savequick">Salvar no leito</button>'}
      </header>
      <div class="gx-top">
        <div class="gx-mon" id="gxMon"></div>
        <button type="button" class="gx-dx" id="gxDx" data-tab="out"></button>
        <div class="gx-tabs" id="gxTabs" role="tablist"></div>
      </div>
      <main class="tool gx" id="gxPane"></main>
      <div class="kp" id="kp" hidden></div>
      <input type="file" accept="image/*" capture="environment" id="scanCamIn" hidden>
      <input type="file" accept="image/*" id="scanPickIn" hidden>`);
    S.pg = pg;
    pg.addEventListener('click', onGasClick);
    $$('#scanCamIn, #scanPickIn', pg).forEach((inp) => inp.addEventListener('change', () => {
      const f = inp.files && inp.files[0];
      inp.value = '';
      if (f) { S.scan = { file: f, rot: 0, want: S.scanWant || null }; scanRun(); }
      S.scanWant = null;
    }));
    live(true);
  };
  C.routes.gaso.nav = 'gaso';

  function live(full) {
    const pg = S.pg, { p, rec } = S.ctx;
    const res = calc(p, rec);
    S.res = res;
    $('#gxMon', pg).innerHTML = MON.map(([k, l, dec, ch, n]) => {
      const v = keyDisp(k, res.key[k]);
      return `<div class="m${outOf(v, normOf(k, n, p)) ? ' off' : ''}" style="--c:${CHC[ch]}"><i>${l}</i><b>${fmt(v, dec)}</b></div>`;
    }).join('');
    const main = res.main;
    const alerts = res.dx.filter((x) => x.s !== 'ok').length;
    const dx = $('#gxDx', pg);
    dx.className = 'gx-dx ' + ((main && SEVCLS[main.s]) || 'idle');
    dx.innerHTML = main ? `<b>${esc(main.t)}</b><span>${alerts ? `${alerts} achado${alerts > 1 ? 's' : ''}` : 'leitura'} ›</span>` : '<b>Aguardando pH, PaCO₂ e HCO₃</b>';
    $('#gxTabs', pg).innerHTML = `<button type="button" role="tab" data-tab="in" class="${S.tab === 'in' ? 'on' : ''}">Entrada</button><button type="button" role="tab" data-tab="out" class="${S.tab === 'out' ? 'on' : ''}">Leitura${alerts ? `<em>${alerts}</em>` : ''}</button>`;
    const pane = $('#gxPane', pg);
    if (S.tab === 'out') pane.innerHTML = outHtml(res);
    else if (full) pane.innerHTML = inHtml();
    else refreshCounts();
  }

  /* ---------- entrada: grupos em acordeão (um aberto por vez) ---------- */
  function inHtml() {
    const r = merged(S.ctx.p, S.ctx.rec);
    const og = openGroup();
    const scan = C.scan ? `<div class="gx-scan"><button type="button" class="btn" data-act="scanCam">${I.camera}Ler ticket do gasômetro</button><button type="button" class="btn" data-act="scanPick" aria-label="Escolher foto ou scan da galeria">${I.image}Galeria</button></div>` : '';
    return scan + G.GROUPS.map((g) => {
      const [n, t] = filled(g);
      const open = og === g.id;
      return `<section class="gx-g${open ? ' open' : ''}" style="--c:${CHC[g.ch]}" data-g="${g.id}">
        <button type="button" class="gx-gh" data-act="grp" data-g="${g.id}" aria-expanded="${open}"><i class="gdot"></i><b>${g.t}</b><em data-cnt="${g.id}">${n ? n + '/' + t : ''}</em>${I.down}</button>
        ${open ? `<div class="gx-ros">${groupFields(g).map((f) => roHtml(f, r)).join('')}</div>${g.id === 'fluid' && r.ftest ? fluidHint(r) : ''}${g.id === 'pac' ? '<p class="fld-h gx-h">Compartilhado com as outras calculadoras e com a ficha.</p>' : ''}` : ''}
      </section>`;
    }).join('') + (S.ctx.p ? '<button type="button" class="link danger gx-del" data-act="delrec">excluir este registro</button>' : '') +
      (S.ctx.rec.via === 'foto' ? '<p class="ref">Valores lançados a partir de foto do ticket: confira com o original.</p>' : '') +
      '<p class="ref">Toque num campo e use o teclado. “Ant.” repete o valor da gasometria anterior; “próximo” segue para o campo e o grupo seguintes.</p>';
  }
  function fluidHint(r) {
    const h = { vpp: 'Só interpretável com todos os itens marcados.', vvs: 'Só interpretável com todos os itens marcados.', plr: 'Partir de 45° semi-sentado; medir DC ou VTI (não PA) em 30–90 s.', eeo: 'Pausa expiratória de 15 s. Com eco, acrescente oclusão inspiratória de 15 s.', mfc: '100–150 mL em 1–2 min.', vci: 'Subxifoide, modo M, 2 cm da junção com o átrio direito.', vtc: 'Vt 6 → 8 mL/kg de peso predito por 1 min; anote a VPP antes e depois.' }[r.ftest];
    return h ? `<p class="fld-h gx-h">${h}</p>` : '';
  }
  function inFlag(fid, v) {
    const f = F[fid];
    if (f.p && (v < f.p[0] || v > f.p[1])) return 'bad';
    if (f.n && (v < f.n[0] || v > f.n[1])) return 'off';
    return '';
  }
  function roHtml(fid, r) {
    const f = F[fid];
    const v = getV(fid);
    if (f.type === 'enum') {
      return `<div class="ro-enum${f.opts.length > 2 ? ' wide' : ''}" data-fe="${fid}"><span class="fld-l">${f.l}</span><div class="seg cols">${f.opts.map(([k, l]) => `<button type="button" data-act="enum" data-f="${fid}" data-v="${k}" class="sg${v === k ? ' on' : ''}">${l}</button>`).join('')}</div></div>`;
    }
    if (f.type === 'bool') {
      let auto = '';
      if (fid === 'chkVt8' && H(r.vt) && r.height && r.sex) auto = ` (${fmt(r.vt / ((r.sex === 'F' ? 45.5 : 50) + 0.91 * (r.height - 152.4)), 1)} mL/kg)`;
      return `<button type="button" class="ro-bool wide${v === true ? ' on' : ''}" data-act="bool" data-f="${fid}"><span class="box">${I.check}</span>${f.l}${auto}</button>`;
    }
    const lab = G.fluidLabel(fid, r);
    const pv = prevV(fid);
    const hv = H(v);
    const u = lab ? lab[1] : unitOf(fid);
    return `<button type="button" class="ro ${hv ? inFlag(fid, +v) : 'empty'}" data-f="${fid}"><span class="ro-t"><span class="ro-l">${lab ? lab[0] : f.l}</span>${u ? `<small>${u}</small>` : ''}</span><span class="ro-b"><span class="ro-v">${hv ? numTxt(toDisp(fid, +v)) : '—'}</span>${H(pv) ? `<span class="ro-p">ant. ${numTxt(toDisp(fid, +pv))}</span>` : ''}</span></button>`;
  }
  function refreshCounts() {
    G.GROUPS.forEach((g) => { const el = $(`[data-cnt="${g.id}"]`, S.pg); if (el) { const [n, t] = filled(g); el.textContent = n ? `${n}/${t}` : ''; } });
  }
  function refreshRo(fid) {
    const el = $(`.ro[data-f="${fid}"], .ro-bool[data-f="${fid}"]`, S.pg);
    if (!el) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = roHtml(fid, merged(S.ctx.p, S.ctx.rec));
    const n = tmp.firstElementChild;
    if (S.kp && S.kp.fid === fid) n.classList.add('act');
    el.replaceWith(n);
  }

  /* ---------- leitura: veredito + 3 achados; canais em acordeão; sem dados escondidos ---------- */
  function outHtml(res) {
    const { p, rec } = S.ctx;
    const pr = prevOf(p, rec);
    const pv = {};
    if (pr) { const r0 = calc(p, pr); Object.values(r0.ch).flat().forEach((it) => { if (typeof it.v === 'number') pv[it.id] = it.v; }); }
    const main = res.main;
    const primary = (res.ch.ab || []).find((i) => i.id === 'primary' && !i.miss);
    let h = '';
    if (main) {
      const compLine = res.dx.find((x) => !x.main && x.ch === 'ab');
      h += C.verdict(SEVCLS[main.s] || 'idle', primary ? esc(primary.n) : 'Ácido-base', esc(main.t), compLine ? esc(compLine.t) : '');
    } else h += C.verdict('idle', 'Aguardando', 'Preencha pH, PaCO₂ e HCO₃', 'Os demais cálculos aparecem conforme você lança os dados.');
    const rank = { crit: 0, warn: 1, ok: 2 };
    const rest = res.dx.filter((x) => !x.main && !(main && x === res.dx.find((y) => !y.main && y.ch === 'ab'))).sort((a, b) => rank[a.s] - rank[b.s]);
    if (rest.length) {
      const shown = S.dxAll ? rest : rest.slice(0, 3);
      h += `<section class="card gx-find"><div class="card-h"><h2>Achados</h2><span class="aux">${rest.length}</span></div>${C.steps(shown.map((x) => [x.s, esc(x.t)]))}
        ${rest.length > 3 ? `<button type="button" class="link" data-act="dxAll">${S.dxAll ? 'mostrar menos' : `ver todos (${rest.length})`}</button>` : ''}</section>`;
    }
    const idle = [];
    let acc = '';
    E.CHANNELS.forEach((c) => {
      const items = res.ch[c.id] || [];
      if (!items.length) return;
      const done = items.filter((i) => !i.miss), miss = items.filter((i) => i.miss);
      if (!done.length) { const need = [...new Set(miss.flatMap((i) => i.miss))]; idle.push({ c, need }); return; }
      const crit = done.filter((i) => i.fl === 'crit').length, warn = done.filter((i) => i.fl === 'warn').length;
      const open = S.acc === c.id;
      acc += `<section class="gx-ch${open ? ' open' : ''}" style="--c:${CHC[c.id]}">
        <button type="button" class="gx-chh" data-act="acc" data-c="${c.id}" aria-expanded="${open}"><i class="gdot"></i><b>${c.t}</b>
          ${crit ? `<span class="pill crit">${crit}</span>` : ''}${warn ? `<span class="pill warn">${warn}</span>` : ''}${!crit && !warn ? '<span class="pill ok">ok</span>' : ''}${I.down}</button>
        ${open ? `<div class="gx-chb"><div class="outs">${done.map((i) => itemHtml(i, pv)).join('')}</div>
          ${miss.length ? `<div class="gx-miss"><span>também calcula com</span>${miss.map((i) => `<button type="button" class="mc" data-goto="${i.miss[0]}"><b>${esc(i.l)}</b> ${esc(i.miss.map((m) => (F[m] || {}).l || m).join(' + '))}</button>`).join('')}</div>` : ''}
          ${c.id === 'ab' && H(rec.i.ph) && H(rec.i.hco3) ? `<details class="dav"><summary>Mapa ácido-base (Davenport)</summary>${davenport(+rec.i.ph, +rec.i.hco3)}</details>` : ''}</div>` : ''}
      </section>`;
    });
    if (acc) h += `<div class="gx-acc">${acc}</div>`;
    if (idle.length) h += `<details class="card gx-idle"><summary><b>Outros cálculos disponíveis</b><span class="aux">${idle.length}</span>${I.down}</summary><div class="list">${idle.map(({ c, need }) => `<button type="button" class="row" data-goto="${need[0]}"><span class="tile" style="--gc:${CHC[c.id]}">${esc(c.t.slice(0, 2))}</span><span class="row-t"><b>${c.t}</b><span>${esc(need.slice(0, 4).map((m) => (F[m] || {}).l || m).join(' · '))}${need.length > 4 ? ' …' : ''}</span></span>${I.chev}</button>`).join('')}</div></details>`;
    return h + '<p class="ref">Toque num resultado para ver fórmula, corte e fonte. Ferramenta de apoio à decisão: não substitui o julgamento clínico.</p>';
  }
  function itemHtml(i, pv) {
    const isN = typeof i.v === 'number';
    let dl = '';
    if (isN && pv[i.id] != null) {
      const df = i.v - pv[i.id];
      if (Math.abs(df) >= 0.5 * 10 ** -(i.dec || 0)) dl = `<span class="gx-d">${df > 0 ? '▲' : '▼'}${fmt(Math.abs(df), i.dec)}</span>`;
    }
    const cls = i.fl === 'crit' ? 'crit' : i.fl === 'warn' ? 'warn' : '';
    if (i.verdict) return `<button type="button" class="out span2 gx-it ${i.fl === 'warn' ? 'warn' : 'ok'}" data-ref="${i.ref || ''}"><div class="o-l">Teste de fluido</div><div class="o-v sm">${esc(i.l)}${isN ? ` <span class="u">${fmt(i.v, i.dec)}${esc(i.u || '')}</span>` : ''}</div><div class="o-n">${esc(i.n || '')}</div></button>`;
    return `<button type="button" class="out gx-it ${cls}${i.txt ? ' span2' : ''}" data-ref="${i.ref || ''}"><div class="o-l">${esc(i.l)}</div><div class="o-v ${i.txt ? 'txt' : 'sm'}">${isN ? fmt(i.v, i.dec) : esc(i.v)}${isN && i.u ? `<span class="u">${esc(i.u)}</span>` : ''}</div>${i.n ? `<div class="o-n">${esc(i.n)}</div>` : ''}${dl}</button>`;
  }

  /* ---------- teclado numérico próprio (o do celular cobre metade da tela) ---------- */
  function openKp(fid) {
    const f = F[fid];
    if (!f || f.type) return;
    const v = getV(fid);
    S.kp = { fid, raw: H(v) ? String(Math.round(toDisp(fid, +v) * 1000) / 1000) : '', fresh: true };
    $$('.ro.act', S.pg).forEach((e) => e.classList.remove('act'));
    const el = $(`.ro[data-f="${fid}"]`, S.pg);
    if (el) el.classList.add('act');
    document.body.classList.add('kp-open');
    C.navHidden(true);
    const kp = $('#kp', S.pg);
    kp.hidden = false;
    kpDraw();
    requestAnimationFrame(() => {
      if (!el) return;
      const r = el.getBoundingClientRect(), kh = kp.getBoundingClientRect().height;
      const room = window.innerHeight - kh;
      if (r.bottom > room - 12 || r.top < 190) window.scrollBy({ top: r.top - Math.max(190, (room - r.height) / 2), behavior: 'smooth' });
    });
  }
  function kpDraw() {
    const { fid, raw, fresh } = S.kp;
    const f = F[fid], r = merged(S.ctx.p, S.ctx.rec);
    const lab = G.fluidLabel(fid, r);
    const pv = prevV(fid);
    const n = f.n ? (isLac(fid) ? [f.n[0] * 9.01, f.n[1] * 9.01] : f.n) : null;
    $('#kp', S.pg).innerHTML = `
      <div class="kp-h">
        <button type="button" data-k="prev" class="kp-n" aria-label="Campo anterior">${I.back}</button>
        <div class="kp-i"><b>${lab ? lab[0] : f.l}</b><span>${n ? `ref ${numTxt(n[0])} a ${numTxt(n[1])} ` : ''}${unitOf(fid) || (lab ? lab[1] : '')}</span></div>
        <div class="kp-v${fresh && raw ? ' fresh' : ''}">${raw ? esc(raw.replace('.', ',').replace('-', '−')) : '<span class="ph">—</span>'}<i class="caret"></i></div>
        <button type="button" data-k="close" class="kp-n ok" aria-label="Concluir">${I.check}</button>
      </div>
      <div class="kp-k">
        ${['7', '8', '9'].map((k) => `<button type="button" data-k="${k}">${k}</button>`).join('')}<button type="button" data-k="back" class="soft" aria-label="Apagar">⌫</button>
        ${['4', '5', '6'].map((k) => `<button type="button" data-k="${k}">${k}</button>`).join('')}<button type="button" data-k="ant" class="soft"${H(pv) ? '' : ' disabled'}>Ant.${H(pv) ? `<small>${numTxt(toDisp(fid, +pv))}</small>` : ''}</button>
        ${['1', '2', '3'].map((k) => `<button type="button" data-k="${k}">${k}</button>`).join('')}${f.neg ? '<button type="button" data-k="neg" class="soft">±</button>' : '<button type="button" data-k="clr" class="soft">Limpar</button>'}
        <button type="button" data-k="dot">,</button><button type="button" data-k="0">0</button><button type="button" data-k="next" class="next">próximo ›</button>
      </div>`;
  }
  function kpKey(k) {
    const kp = S.kp;
    if (!kp) return;
    const f = F[kp.fid];
    if (k === 'close') return closeKp();
    if (k === 'next' || k === 'prev') return kpMove(k === 'next' ? 1 : -1);
    if (/^\d$/.test(k)) {
      if (kp.fresh) kp.raw = '';
      kp.fresh = false;
      if (kp.raw.replace(/[-.]/g, '').length >= 6) return;
      kp.raw += k;
      if (f.mask === 'ph' && !kp.raw.includes('.') && kp.raw.length === 1) kp.raw += '.'; /* "722" → 7,22 */
    } else if (k === 'dot') {
      if (kp.fresh) { kp.raw = ''; kp.fresh = false; }
      if (!kp.raw.includes('.')) kp.raw = (kp.raw === '' || kp.raw === '-' ? kp.raw + '0' : kp.raw) + '.';
    } else if (k === 'back') { kp.raw = kp.fresh ? '' : kp.raw.slice(0, -1); kp.fresh = false; }
    else if (k === 'clr') { kp.raw = ''; kp.fresh = false; }
    else if (k === 'neg') { kp.raw = kp.raw.startsWith('-') ? kp.raw.slice(1) : '-' + kp.raw; kp.fresh = false; }
    else if (k === 'ant') { const pv = prevV(kp.fid); if (H(pv)) { kp.raw = String(Math.round(toDisp(kp.fid, +pv) * 1000) / 1000); kp.fresh = false; } }
    commit();
    kpDraw();
    if (f.mask === 'ph' && /^\d\.\d\d$/.test(kp.raw)) setTimeout(() => { if (S.kp && S.kp.fid === kp.fid) kpMove(1); }, 140);
  }
  function commit() {
    const { fid, raw } = S.kp;
    let v = parseFloat(raw);
    if (!Number.isFinite(v)) v = undefined;
    else {
      if (isLac(fid)) v = Math.round((v / 9.01) * 100) / 100;
      if (fid === 'fio2' && v > 0 && v <= 1) v = Math.round(v * 100);
    }
    setV(fid, v);
    refreshRo(fid);
    live(false);
  }
  /* "próximo" percorre os campos visíveis; no fim do grupo abre o grupo seguinte */
  function kpMove(dir) {
    const list = $$('.ro[data-f]', S.pg);
    const i = list.findIndex((e) => e.dataset.f === S.kp.fid);
    const nx = list[i + dir];
    if (nx) return openKp(nx.dataset.f);
    if (dir > 0) {
      const gi = G.GROUPS.findIndex((g) => g.id === openGroup());
      for (let j = gi + 1; j < G.GROUPS.length; j++) {
        const g = G.GROUPS[j];
        const first = groupFields(g).find((f) => !F[f].type);
        if (!first || g.id === 'fluid') continue;
        S.openG = g.id;
        $('#gxPane', S.pg).innerHTML = inHtml();
        $(`.gx-g[data-g="${g.id}"]`, S.pg).scrollIntoView({ block: 'start', behavior: 'smooth' });
        return openKp(first);
      }
    }
    closeKp();
  }
  function closeKp() {
    S.kp = null;
    const kp = S.pg && $('#kp', S.pg);
    if (kp) { kp.hidden = true; kp.innerHTML = ''; }
    document.body.classList.remove('kp-open');
    C.navHidden(false);
    if (S.pg) { $$('.ro.act', S.pg).forEach((e) => e.classList.remove('act')); refreshCounts(); }
  }
  window.addEventListener('keydown', (e) => {
    if (!S.kp || !S.pg || !document.body.contains(S.pg)) return;
    const m = { Backspace: 'back', Enter: 'next', Escape: 'close', '.': 'dot', ',': 'dot', '-': 'neg' };
    let k = /^\d$/.test(e.key) ? e.key : m[e.key];
    if (e.key === 'Tab') k = e.shiftKey ? 'prev' : 'next';
    if (k === 'neg' && !F[S.kp.fid].neg) return;
    if (k) { e.preventDefault(); kpKey(k); }
  });

  /* ---------- cliques da tela de gasometria ---------- */
  function onGasClick(e) {
    const pg = S.pg;
    const t = e.target.closest('[data-k],[data-act],[data-tab],[data-goto],[data-ref],.ro[data-f]');
    if (!t || !pg.contains(t)) return;
    if (t.dataset.k) return kpKey(t.dataset.k);
    const act = t.dataset.act;
    if (act) {
      const { p, rec } = S.ctx;
      switch (act) {
        case 'grp': {
          S.openG = openGroup() === t.dataset.g ? '__none' : t.dataset.g;
          closeKp();
          $('#gxPane', pg).innerHTML = inHtml();
          const el = $(`.gx-g[data-g="${t.dataset.g}"]`, pg);
          if (S.openG === t.dataset.g && el) {
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            const first = $('.ro[data-f].empty', el);
            if (first && !['pac', 'fluid', 'vent'].includes(t.dataset.g)) openKp(first.dataset.f);
          }
          return;
        }
        case 'enum': {
          setV(t.dataset.f, getV(t.dataset.f) === t.dataset.v ? undefined : t.dataset.v);
          closeKp();
          $('#gxPane', pg).innerHTML = inHtml();
          return live(false);
        }
        case 'bool': setV(t.dataset.f, getV(t.dataset.f) !== true); refreshRo(t.dataset.f); return live(false);
        case 'scanNext': S.scanWant = t.dataset.s; closeSheet(pg); $(t.dataset.src === 'pick' ? '#scanPickIn' : '#scanCamIn', pg).click(); return;
        case 'scanCam': case 'scanAgain': closeKp(); $('#scanCamIn', pg).click(); return;
        case 'scanPick': closeKp(); $('#scanPickIn', pg).click(); return;
        case 'scanRot': S.scan.rot = (S.scan.rot + 90) % 360; return scanRun();
        case 'scanTog': S.scan.on[t.dataset.sf] = !S.scan.on[t.dataset.sf]; return scanSheet();
        case 'scanSmp': S.scan.smp = t.dataset.v; scanDefaults(); return scanSheet();
        case 'scanApply': return scanApply();
        case 'acc': S.acc = S.acc === t.dataset.c ? null : t.dataset.c; live(false); return;
        case 'dxAll': S.dxAll = !S.dxAll; return live(false);
        case 'ts': {
          const d = new Date(rec.ts);
          const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          const s = sheet(pg, `<h2>Horário da coleta</h2><label class="fld"><span class="fld-box"><input type="datetime-local" id="tsIn" value="${local}"></span></label><div style="height:12px"></div><button type="button" class="btn primary block" id="tsOk">Salvar</button>`);
          $('#tsOk', s).addEventListener('click', () => { const ts = new Date($('#tsIn', s).value).getTime(); if (Number.isFinite(ts)) { rec.ts = ts; P.touch(p); } closeSheet(pg); C.route(); });
          return;
        }
        case 'delrec': {
          if (!t.dataset.armed) { t.dataset.armed = '1'; t.textContent = 'toque de novo para excluir'; return; }
          p.records = recs(p).filter((r) => r !== rec); S.ctx = null; P.touch(p); C.toast('Registro excluído'); location.hash = '#/paciente?id=' + p.id;
          return;
        }
        case 'savequick': {
          if (isEmpty(rec)) return C.toast('Nada para salvar ainda');
          const list = P.list().filter((x) => !x.archived).sort(bedSort);
          const s = sheet(pg, `<h2>Salvar em qual paciente?</h2><div class="list">${list.map((x) => `<button type="button" class="row" data-to="${x.id}"><span class="row-t"><b>${esc(P.name(x))}</b><span>${esc(ageSex(x) || 'sem dados')}</span></span>${I.chev}</button>`).join('')}</div><div style="height:10px"></div><a class="btn primary block" href="#/ficha?de=gaso">${I.plus} Admitir novo paciente</a>`);
          s.addEventListener('click', (ev) => {
            const b = ev.target.closest('[data-to]');
            if (!b) return;
            const dest = P.get(b.dataset.to);
            const av = avulso();
            dest.data = dest.data || {};
            Object.values(MAPK).forEach((k) => { if (av[k] !== undefined && (dest.data[k] === undefined || dest.data[k] === '')) dest.data[k] = av[k]; });
            dest.records = dest.records || [];
            dest.records.push(rec); S.quick = null; S.ctx = null;
            P.touch(dest); P.setActive(dest.id);
            C.toast(`Salvo em ${P.name(dest)}`);
            location.hash = `#/gaso?p=${dest.id}&r=${rec.id}`;
          });
          return;
        }
      }
      return;
    }
    if (t.dataset.tab) { S.tab = t.dataset.tab; closeKp(); live(true); window.scrollTo(0, 0); return; }
    if (t.dataset.goto) {
      const fid = t.dataset.goto;
      const g = G.GROUPS.find((x) => x.f.includes(fid) || (x.dyn && G.fluidFields(merged(S.ctx.p, S.ctx.rec)).includes(fid)));
      if (g) S.openG = g.id;
      S.tab = 'in';
      live(true);
      if (F[fid] && !F[fid].type) openKp(fid);
      else { const el = $(`[data-fe="${fid}"]`, pg); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      return;
    }
    if (t.dataset.ref !== undefined) return refSheet(pg, t.dataset.ref);
    if (t.dataset.f) openKp(t.dataset.f);
  }

  /* ---------- leitura por foto (scan.js): OCR no aparelho → conferência → lança nos campos ---------- */
  /* amostra venosa: PCO2, PO2 e saturação vão para a gasometria venosa central.
     Eletrólitos, glicose, lactato e Hb valem para as duas amostras: entram se o campo ainda estiver vazio.
     pH, HCO3 e BE venosos não têm campo próprio e não substituem os arteriais: vêm desmarcados. */
  const VEN = { paco2: 'pvco2', pao2: 'pvo2', sao2: 'svo2' };
  const ART_ONLY = ['ph', 'hco3', 'be', 'fio2'];
  const scanTarget = (fid) => (S.scan.smp === 'ven' ? VEN[fid] || fid : fid);
  const venFilled = () => ['pvco2', 'svo2', 'pvo2'].some((f) => H(getV(f)));
  const artFilled = () => ['ph', 'paco2', 'pao2'].some((f) => H(getV(f)));
  const SCAN_MSG = { scan: 'Tratando a foto: recorte, luz e nitidez', 'loading tesseract core': 'Carregando o leitor', 'initializing tesseract': 'Carregando o leitor', 'loading language traineddata': 'Carregando o leitor', 'initializing api': 'Preparando', 'recognizing text': 'Lendo o ticket', 'second pass': 'Tentando de novo com a foto original', zoom: 'Relendo os resultados ampliados' };
  function scanDefaults() {
    S.scan.on = {};
    S.scan.res.items.forEach((it) => {
      S.scan.on[it.fid] = it.sure && (S.scan.smp !== 'ven' || !!VEN[it.fid] || (!ART_ONLY.includes(it.fid) && !H(getV(it.fid))));
    });
  }
  function scanRun() {
    const pg = S.pg, tok = (S.scan.tok = {});
    const s = sheet(pg, `<div class="sc-prog" data-scan><h2>Lendo a foto</h2><b id="scMsg">Preparando</b><div class="sc-bar"><i id="scBar"></i></div>
      <p class="fld-h">A leitura roda no próprio celular: a foto não sai do aparelho e não é guardada. Na primeira vez o leitor (≈ 7 MB) é baixado e fica disponível offline.</p></div>`);
    const onProgress = (m) => {
      if (S.scan.tok !== tok || !s.isConnected) return;
      const msg = SCAN_MSG[m.status];
      if (!msg) return;
      $('#scMsg', s).textContent = msg + (m.status === 'recognizing text' ? ` · ${Math.round((m.progress || 0) * 100)}%` : '');
      $('#scBar', s).style.width = Math.round((m.status === 'recognizing text' ? 0.25 + 0.75 * (m.progress || 0) : 0.2 * (m.progress || 0)) * 100) + '%';
    };
    C.scan.read(S.scan.file, { rot: S.scan.rot, onProgress }).then((res) => {
      if (S.scan.tok !== tok || !$('[data-scan]', pg)) return; /* fechou a folha ou saiu da tela */
      S.scan.res = res;
      S.scan.smp = res.sample || S.scan.want || 'art'; /* o "Tipo de amostra" impresso vale mais que o botão escolhido */
      scanDefaults();
      scanSheet();
    }).catch((err) => {
      if (S.scan.tok !== tok || !$('[data-scan]', pg)) return;
      sheet(pg, `<div data-scan><h2>Não foi possível ler</h2><p class="fld-h">${err && err.message === 'offline' ? 'O leitor ainda não foi baixado neste aparelho. Conecte-se à internet uma vez e tente de novo; depois funciona offline.' : 'A imagem não pôde ser processada. Tente outra foto.'}</p><div style="height:12px"></div><button type="button" class="btn primary block" data-act="scanAgain">${I.camera}Tirar outra foto</button></div>`);
    });
  }
  function scanSheet() {
    const pg = S.pg, sc = S.scan, res = sc.res;
    const n = res.items.filter((it) => sc.on[it.fid]).length;
    const old = $('.sh', pg), top = old ? old.scrollTop : 0;
    const rows = res.items.map((it) => {
      if (it.img === undefined) it.img = res.crop(it);
      const tf = scanTarget(it.fid), cur = getV(tf), img = it.img;
      return `<button type="button" class="sc-r${sc.on[it.fid] ? ' on' : ''}" data-act="scanTog" data-sf="${it.fid}" aria-pressed="${!!sc.on[it.fid]}">
        <span class="box">${I.check}</span>
        <span class="sc-t"><b>${F[tf].l}</b>${img ? `<img alt="trecho da foto" src="${img}">` : `<small>lido: ${esc(it.raw)} ${esc(it.unit)}</small>`}</span>
        <span class="sc-v"><b>${numTxt(toDisp(tf, it.v))}</b><small>${unitOf(tf)}</small>${H(cur) ? `<small class="cur">atual ${numTxt(toDisp(tf, +cur))}</small>` : ''}</span>
        ${it.note || (sc.smp === 'ven' && ART_ONLY.includes(it.fid)) ? `<span class="sc-n">${esc([sc.smp === 'ven' && ART_ONLY.includes(it.fid) ? 'amostra venosa: não substitui o valor arterial' : '', it.note].filter(Boolean).join(' · '))}</span>` : ''}</button>`;
    }).join('');
    const body = res.items.length
      ? `<p class="fld-h">Compare cada valor com o recorte da foto. Só os marcados serão lançados.</p>
        <div class="seg cols sc-smp"><button type="button" class="sg${sc.smp === 'art' ? ' on' : ''}" data-act="scanSmp" data-v="art">Arterial</button><button type="button" class="sg${sc.smp === 'ven' ? ' on' : ''}" data-act="scanSmp" data-v="ven">Venosa central</button></div>
        <div class="sc-list">${rows}</div>
        <button type="button" class="btn primary block" data-act="scanApply"${n ? '' : ' disabled'}>${n ? `Lançar ${n} valor${n > 1 ? 'es' : ''}` : 'Nada marcado'}</button>`
      : `<p class="fld-h">Não encontrei valores de gasometria nesta foto. Ticket plano, sem reflexo, texto na horizontal e ocupando a tela ajudam; o modo "digitalizar documento" da câmera do celular dá o melhor resultado.</p>`;
    sheet(pg, `<div data-scan><h2>Conferir leitura${res.items.length ? (sc.smp === 'ven' ? ' · venosa' : ' · arterial') : ''}</h2>${body}
      <div class="sc-more"><button type="button" class="btn sm" data-act="scanAgain">${I.camera}Outra foto</button><button type="button" class="btn sm" data-act="scanRot">${I.rotate}Girar e reler</button></div>
      <details class="sc-raw"><summary>Foto tratada e texto lido</summary>${res.preview ? `<img alt="foto após o tratamento" src="${res.preview}">` : ''}${res.text ? `<pre>${esc(res.text)}</pre>` : ''}</details></div>`);
    const sh = $('.sh', pg);
    if (sh && top) { sh.style.animation = 'none'; sh.scrollTop = top; }
  }
  function scanApply() {
    const { p, rec } = S.ctx, sc = S.scan;
    const chosen = sc.res.items.filter((it) => sc.on[it.fid]);
    chosen.forEach((it) => setV(scanTarget(it.fid), it.v));
    rec.via = 'foto';
    if (p) P.touch(p);
    const smp = sc.smp;
    S.openG = smp === 'ven' ? 'ven' : 'gaso';
    S.scan = null;
    closeSheet(S.pg);
    S.tab = 'in';
    live(true);
    window.scrollTo(0, 0);
    const msg = `${chosen.length} valor${chosen.length > 1 ? 'es lançados' : ' lançado'} da ${smp === 'ven' ? 'venosa' : 'arterial'}`;
    /* gaso arterial + venosa central costumam vir juntas: oferece a outra, se ainda estiver vazia */
    const other = smp === 'ven' ? (artFilled() ? null : 'art') : (venFilled() ? null : 'ven');
    if (!other) return C.toast(msg);
    sheet(S.pg, `<div data-scan><h2>${msg}</h2><p class="fld-h">Tem também o ticket da ${other === 'ven' ? 'gasometria venosa central' : 'gasometria arterial'}?</p><div style="height:12px"></div>
      <button type="button" class="btn primary block" data-act="scanNext" data-s="${other}" data-src="cam">${I.camera}Fotografar a ${other === 'ven' ? 'venosa' : 'arterial'}</button><div style="height:8px"></div>
      <div class="sc-more"><button type="button" class="btn sm" data-act="scanNext" data-s="${other}" data-src="pick">${I.image}Da galeria</button><button type="button" class="btn sm" data-sx>Agora não</button></div></div>`);
  }

  /* entrada na lista de calculadoras: a gasometria é a tela completa acima */
  C.register({
    id: 'gasometria', group: 'met', tile: 'pH', href: '#/gaso?novo=1',
    title: 'Gasometria completa',
    sub: 'Ácido-base (Boston + Stewart), oxigenação, perfusão, fluidos, ventilação, renal',
    keywords: ['acido-base', 'acidose', 'alcalose', 'winter', 'anion gap', 'gap anionico', 'bicarbonato', 'pco2', 'lactato', 'base excess', 'davenport', 'gaso', 'stewart', 'sig', 'delta delta', 'gap co2', 'scvo2', 'sdra', 'kdigo', 'tendencia', 'leito'],
  });
})();
