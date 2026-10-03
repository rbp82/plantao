/* Hemodinâmica, perfusão tecidual e ventilação — calculadoras no padrão Plantão sobre o motor C.engine.
   Cada ferramenta abre só a seção principal; as opcionais ficam recolhidas e mostram uma prévia do resultado. */
(function () {
  'use strict';
  const C = window.Calc;
  const { $, $$, esc } = C;
  const E = C.engine, G = C.gasF, F = G.F;
  const fmt = E.fmt;
  const PK = { age: 'idade', sex: 'sexo', height: 'altura', weight: 'peso' };
  const CLS = { crit: 'crit', warn: 'warn', ok: 'ok' };

  function fieldHtml(fid, pre) {
    const f = F[fid], id = pre + fid;
    if (fid === 'sex') return `<div class="span2">${C.seg({ name: id, label: 'Sexo', cls: 'cols', p: 'sexo', options: [['M', 'Masculino'], ['F', 'Feminino']] })}</div>`;
    if (PK[fid]) return C.field({ id, label: f.l, unit: f.u, p: PK[fid] });
    if (f.type === 'enum') return `<div class="span2">${C.seg({ name: id, label: f.l, cls: 'cols', options: f.opts })}</div>`;
    if (f.type === 'bool') return `<div class="span2 checks">${C.check({ id, label: f.l })}</div>`;
    return C.field({ id, label: f.l, unit: f.u, lim: f.p, ph: f.n ? String((f.n[0] + f.n[1]) / 2).replace('.', ',') : '' });
  }
  function readAll(root, fids, pre) {
    const r = {};
    fids.forEach((fid) => {
      const f = F[fid], id = pre + fid;
      if (fid === 'sex' || f.type === 'enum') { const v = C.radioVal(root, id); if (v) r[fid] = v; }
      else if (f.type === 'bool') { const el = root.querySelector('#' + id); if (el) r[fid] = el.checked; }
      else { const v = C.val(root, id); if (Number.isFinite(v)) r[fid] = v; }
    });
    return r;
  }
  function outHtml(it) {
    const isN = typeof it.v === 'number';
    return `<div class="out ${CLS[it.fl] || ''}${it.txt ? ' span2' : ''}"><div class="o-l">${esc(it.l)}</div><div class="o-v sm">${isN ? fmt(it.v, it.dec) : esc(it.v)}${isN && it.u ? `<span class="u">${esc(it.u)}</span>` : ''}</div>${it.n ? `<div class="o-n">${esc(it.n)}</div>` : ''}</div>`;
  }
  const lbl = (fid) => (F[fid] || {}).l || fid;

  /* sections: [{t, f:[campos], o:[ids de resultado], opt:bool}] · dx: canal cujos achados viram a interpretação */
  function sectionTool(def) {
    const pre = def.id.replace(/\W/g, '') + '_';
    const fids = def.sections.flatMap((s) => s.f);
    const outIds = def.sections.flatMap((s) => s.o);
    return function render(body, api, root) {
      body.innerHTML = (def.intro ? `<p class="tool-intro">${def.intro}</p>` : '') + def.sections.map((s, i) => {
        const inner = `${s.f.length ? `<div class="grid">${s.f.map((f) => fieldHtml(f, pre)).join('')}</div>` : ''}<div class="outs sec-out" data-sec="${i}" style="margin-top:${s.f.length ? 12 : 0}px"></div><div class="sec-miss" data-miss="${i}"></div>`;
        return s.opt
          ? `<details class="card sec"><summary><b>${s.t}</b><span class="aux" data-prev="${i}">opcional</span>${C.icon.down}</summary><div class="sec-b">${inner}</div></details>`
          : `<section class="card"><div class="card-h"><h2>${s.t}</h2></div>${inner}</section>`;
      }).join('') + `<div id="${pre}dx"></div>
        <details class="card sec refs"><summary><b>Fórmulas, cortes e fontes</b>${C.icon.down}</summary><div class="sec-b">${[...new Set(outIds.map((id) => def.ref[id] || id))].map((k) => E.REF[k]).filter(Boolean).map((r) => `<div class="ref-i"><b>${esc(r.t)}</b>${r.v ? ' <span class="pill ok">verificado</span>' : ''}<div class="calc-line">${esc(r.f).replace(/\n/g, '<br>')}</div><p>${esc(r.c).replace(/\n/g, '<br>')}</p><p class="ref">${esc(r.s)}</p></div>`).join('')}</div></details>`;
      let txt = '';
      function calc() {
        const r = Object.assign(readAll(root, fids, pre), def.preset || {});
        const res = E.compute(r, C.gasCfg ? C.gasCfg() : {}, {});
        const all = Object.values(res.ch).flat();
        const lines = [];
        def.sections.forEach((s, i) => {
          const got = [], miss = [];
          s.o.forEach((id) => { const it = all.find((x) => x.id === id); if (!it) return; (it.miss ? miss : got).push(it); });
          body.querySelector(`[data-sec="${i}"]`).innerHTML = got.map(outHtml).join('');
          const need = [...new Set(miss.flatMap((m) => m.miss))].filter((m) => fids.includes(m));
          body.querySelector(`[data-miss="${i}"]`).innerHTML = need.length && !got.length && s.o.length ? `<p class="fld-h" style="margin:4px 0 0">Para calcular: ${esc(need.map(lbl).join(', '))}.</p>` : '';
          const pv = body.querySelector(`[data-prev="${i}"]`);
          if (pv) pv.textContent = got.length ? got.filter((g) => typeof g.v === 'number').slice(0, 2).map((g) => `${g.l.split(' (')[0]} ${fmt(g.v, g.dec)}`).join(' · ') || 'calculado' : 'opcional';
          got.forEach((g) => lines.push(`${g.l}: ${typeof g.v === 'number' ? fmt(g.v, g.dec) + (g.u ? ' ' + g.u : '') : g.v}${g.n ? ' (' + g.n + ')' : ''}`));
        });
        const dx = res.dx.filter((x) => !x.main && def.dx.includes(x.ch));
        body.querySelector('#' + pre + 'dx').innerHTML = dx.length ? C.card('Interpretação', C.steps(dx.map((x) => [x.s, esc(x.t)]))) : '';
        txt = lines.length ? `${def.title}: ` + lines.join('; ') + (dx.length ? '. ' + dx.map((x) => x.t).join('; ') : '') + '.' : '';
      }
      root.addEventListener('input', calc);
      root.addEventListener('change', calc);
      api.summary = () => txt;
    };
  }

  /* ================= fluido-responsividade ================= */
  const FL = ['ppv', 'ppMax', 'ppMin', 'svv', 'fBase', 'fPost', 'fEio', 'vciMax', 'vciMin', 'ppv6', 'ppv8'];
  const CHK = ['chkVc', 'chkSinus', 'chkTorax', 'chkVt8'];
  const VAL = ['vt', 'fc', 'fr'];
  C.register({
    id: 'fluidos', group: 'hemo', tile: 'ΔVS',
    title: 'Fluido-responsividade',
    sub: 'VPP, VVS, elevação de pernas, oclusão expiratória, mini-bolus, VCI',
    keywords: ['volume', 'fluido', 'responsividade', 'vpp', 'ppv', 'vvs', 'svv', 'plr', 'elevacao passiva', 'pernas', 'eeo', 'oclusao', 'mini bolus', 'veia cava', 'vci', 'tidal volume challenge', 'vti'],
    render(body, api, root) {
      const pre = 'fl_';
      body.innerHTML = `
        <section class="card">${C.seg({ name: pre + 'ftest', label: 'Teste', cls: 'wrap3', value: 'plr', options: F.ftest.opts })}
          <div class="fl-met">${C.seg({ name: pre + 'fMet', label: 'Medida', cls: 'cols', value: 'mon', options: F.fMet.opts })}</div>
          <p class="fld-h" id="flHint" style="margin:10px 0 0"></p></section>
        <section class="card"><div class="card-h"><h2>Medidas</h2></div><div class="grid">${FL.map((f) => fieldHtml(f, pre)).join('')}</div></section>
        <section class="card fl-val"><div class="card-h"><h2>Condições de validade</h2><span class="aux">VPP/VVS</span></div>
          <div class="checks">${CHK.map((f) => C.check({ id: pre + f, label: F[f].l })).join('')}</div>
          <div class="grid" style="margin-top:12px">${fieldHtml('sex', pre)}${fieldHtml('height', pre)}${VAL.map((f) => fieldHtml(f, pre)).join('')}</div>
          <p class="fld-h" style="margin:8px 0 0">Com Vt, altura e sexo o app confere Vt ≥ 8 mL/kg; com FC e FR, a razão FC/FR &gt; 3,6.</p></section>
        <div id="flOut"></div>
        <details class="card sec refs"><summary><b>Fórmulas, cortes e fontes</b>${C.icon.down}</summary><div class="sec-b" id="flRef"></div></details>`;
      const HINT = { vpp: 'Válida só com VM controlada sem esforço, ritmo sinusal, Vt ≥ 8 mL/kg e tórax fechado.', vvs: 'Do monitor de contorno de pulso; mesmas condições da VPP.', plr: 'Partir de 45° semi-sentado; medir o DC ou o VTI (não a pressão) em 30–90 s.', eeo: 'Pausa expiratória de 15 s. Com eco (VTI), acrescente oclusão inspiratória de 15 s.', mfc: '100–150 mL de cristaloide em 1–2 min.', vci: 'Subxifoide, modo M, 2 cm da junção com o átrio direito. Em VM usa a distensibilidade.', vtc: 'Vt de 6 → 8 mL/kg de peso predito por 1 min; anote a VPP antes e depois.' };
      let txt = '';
      function sync(r) {
        const show = new Set(G.fluidFields(r));
        FL.forEach((f) => { const el = root.querySelector('#' + pre + f); const box = el && el.closest('.fld'); if (box) box.hidden = !show.has(f); const lb = G.fluidLabel(f, r); if (lb && box) { box.querySelector('.fld-l').textContent = lb[0]; const u = box.querySelector('.u'); if (u) u.textContent = lb[1]; } });
        body.querySelector('.fl-met').hidden = !show.has('fMet');
        body.querySelector('.fl-val').hidden = !(r.ftest === 'vpp' || r.ftest === 'vvs');
        body.querySelector('#flHint').textContent = HINT[r.ftest] || '';
        const ref = E.REF[r.ftest];
        body.querySelector('#flRef').innerHTML = ref ? `<div class="calc-line">${esc(ref.f).replace(/\n/g, '<br>')}</div><p>${esc(ref.c).replace(/\n/g, '<br>')}</p><p class="ref">${esc(ref.s)}</p>` : '';
      }
      function calc() {
        const r = readAll(root, ['ftest', 'fMet', ...FL, ...CHK, 'sex', 'height', ...VAL], pre);
        if (r.ftest === 'vci') r.sup = 'VM';
        sync(r);
        const res = E.compute(r, {}, {});
        const it = Object.values(res.ch).flat().find((x) => x.id === 'fr_' + r.ftest);
        const out = body.querySelector('#flOut');
        if (!it || it.miss) {
          out.innerHTML = C.verdict('idle', 'Aguardando', 'Preencha as medidas do teste', it && it.miss ? 'Faltam: ' + esc(it.miss.map(lbl).join(', ')) : '');
          txt = ''; return;
        }
        const cls = it.l === 'Responsivo' ? 'ok' : it.l === 'Não responsivo' ? 'info' : 'warn';
        out.innerHTML = C.verdict(cls, `${F.ftest.opts.find((o) => o[0] === r.ftest)[1]}${typeof it.v === 'number' ? ' · ' + fmt(it.v, it.dec) + (it.u || '') : ''}`, esc(it.l), esc(it.n || ''));
        txt = `Fluido-responsividade (${F.ftest.opts.find((o) => o[0] === r.ftest)[1]}): ${it.l}${typeof it.v === 'number' ? ' (' + fmt(it.v, it.dec) + (it.u || '') + ')' : ''}. ${it.n || ''}`;
      }
      root.addEventListener('input', calc);
      root.addEventListener('change', calc);
      api.summary = () => txt;
    },
  });

  /* ================= perfusão tecidual / gap de CO2 ================= */
  C.register({
    id: 'gap-co2', group: 'hemo', tile: 'CO₂',
    title: 'Gap de CO₂ e perfusão tecidual',
    sub: 'Pv-aCO₂, ScvO₂, razão ΔPCO₂/Ca-vO₂, extração de O₂',
    keywords: ['gap co2', 'pvaco2', 'pv-aco2', 'delta pco2', 'scvo2', 'svo2', 'saturacao venosa', 'extracao', 'teo2', 'cao2', 'perfusao', 'metabolismo anaerobio'],
    render: sectionTool({
      id: 'gap-co2', title: 'Perfusão tecidual', dx: ['perf'],
      intro: 'Amostras arterial e venosa central colhidas juntas.',
      sections: [
        { t: 'Gap venoarterial de CO₂', f: ['paco2', 'pvco2', 'svo2'], o: ['gap', 'svo2'] },
        { t: 'Razão ΔPCO₂/Ca−vO₂ e extração', f: ['hb', 'sao2', 'pao2', 'pvo2'], o: ['gapratio', 'teo2', 'cao2', 'avdo2'], opt: true },
        { t: 'Lactato', f: ['lac'], o: ['lac'], opt: true },
      ],
      ref: {},
    }),
  });

  /* ================= débito cardíaco ================= */
  C.register({
    id: 'debito', group: 'hemo', tile: 'DC', weight: true,
    title: 'Débito cardíaco e resistências',
    sub: 'VTI da VSVE, Fick estimado, DO₂/VO₂, RVS/RVP, potência cardíaca',
    keywords: ['debito', 'dc', 'indice cardiaco', 'vti', 'vsve', 'eco', 'fick', 'do2', 'vo2', 'rvs', 'rvp', 'resistencia vascular', 'potencia cardiaca', 'cpo', 'choque cardiogenico'],
    render: sectionTool({
      id: 'debito', title: 'Débito cardíaco', dx: ['hemo'],
      sections: [
        { t: 'Paciente', f: ['sex', 'age', 'height'], o: [] },
        { t: 'Débito pelo VTI (eco)', f: ['dvsve', 'vti', 'fc'], o: ['dcvti', 'ci'] },
        { t: 'Conteúdo de O₂ e Fick estimado', f: ['hb', 'sao2', 'pao2', 'svo2'], o: ['dcfick', 'do2', 'vo2'], opt: true },
        { t: 'Resistências e potência', f: ['dcMed', 'pam', 'pvc', 'papm', 'poap'], o: ['rvs', 'rvp', 'cpo'], opt: true },
      ],
      ref: {},
    }),
  });

  /* ================= ventilação mecânica ================= */
  C.register({
    id: 'ventilacao', group: 'resp', tile: 'VM',
    title: 'Mecânica ventilatória',
    sub: 'Peso predito, Vt/kg, driving pressure, complacência, VR, mechanical power, ROX',
    keywords: ['ventilacao', 'vm', 'peso predito', 'pbw', 'ardsnet', 'volume corrente', 'driving pressure', 'complacencia', 'plato', 'resistencia', 'ventilatory ratio', 'mechanical power', 'rox', 'cnaf', 'alto fluxo', 'sdra'],
    render: sectionTool({
      id: 'ventilacao', title: 'Mecânica ventilatória', dx: ['vent'],
      sections: [
        { t: 'Paciente', f: ['sex', 'height'], o: ['pbw'] },
        { t: 'Mecânica', f: ['vt', 'peep', 'pplat', 'ppico', 'fr'], o: ['vtkg', 'dp', 'cst', 'mp'] },
        { t: 'Resistência de via aérea', f: ['fluxo'], o: ['raw'], opt: true },
        { t: 'Ventilatory ratio (espaço morto)', f: ['paco2', 've'], o: ['vr'], opt: true },
        { t: 'CNAF — índice ROX', f: ['spo2', 'fio2'], o: ['rox'], opt: true },
      ],
      preset: { sup: 'CNAF' },
      ref: {},
    }),
  });
})();
