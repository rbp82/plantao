/* Plantão — leitura por foto do ticket do gasômetro.
   OCR no próprio aparelho (Tesseract, arquivos em assets/ocr): a foto não sai do celular e não é guardada.
   parse() é puro (texto → valores nas unidades do app) e é testado em tests.js; read() faz câmera → OCR → parse.
   Nada é lançado sem conferência: quem aplica os valores é a tela da gasometria (beds.js). */
(function () {
  'use strict';
  const C = window.Calc;
  const F = C.gasF.F;
  const me = document.currentScript;
  const BASE = me && me.dataset.ocr != null ? me.dataset.ocr : 'assets/ocr/';
  const KPA = 7.50062;

  /* ================================================================ texto → valores */
  /* rótulo (já sem espaços, acentos, sinais e parênteses) → campo do app.
     Tolerante aos erros típicos do OCR em papel térmico: 0↔O, subscrito ₂ perdido ou lido como "z". */
  const SPEC = [
    ['ph', /^ph$/],
    ['paco2', /^pa?co[2z]?$/],
    ['pao2', /^pa?o[2z]?$/],
    ['hco3', /^c?hco[3s]?(act|a)?c?$|^bicarbonato?$/],
    ['be', /^[as]?be(c|ecf|b|bc|act)?$|^cbasec?$|^baseexcess$|^excessodebases?$/],
    ['sao2', /^sa?o[2z]?%?$|^o2sat$/],
    ['na', /^c?nat?$|^sodio$/],
    ['k', /^c?kt?$|^potassio$/],
    ['cl', /^c?c[l1i]{1,2}$|^cloreto$/],
    ['ica', /^c?ca[2z]?t?c?$|^ica$|^caion$/],
    ['glic', /^c?gl[uy]c?$|^glicose$|^glucose$/],
    ['lac', /^c?[l1i]?lac$|^lactato$|^lactate$/],
    ['hb', /^c?t?hb$|^hgb$|^hemoglobina$/],
    ['fio2', /^f[i1l]o[2z]?%?$|^fo2$/],
  ];
  const UNIT_HEAD = /^(?:mmhg|kpa|mmo[l1iv]\/?[l1i]|meq\/?[l1i]|mg\/?d[l1i]|g\/?d[l1i]|g\/[l1i]|%)+/;

  function norm(s) {
    return String(s || '')
      .replace(/[₂²]/g, '2').replace(/[₃³]/g, '3').replace(/⁺/g, '+').replace(/[⁻−–—]/g, '-')
      /* 7,273 · 7 ,273 → 7.273 — mas não "p0, 234" (subscrito ₂ lido como 0 e vírgula) */
      .replace(/(^|[^\w.,])(\d{1,4})\s?[.,]\s?(\d)/g, '$1$2.$3');
  }

  /* números "soltos": não fazem parte de um rótulo (pCO2, Ca2+, ABL90) nem de faixas de referência ([7.37 …], (7.4)) */
  function nums(s) {
    const out = [], re = /(-\s?)?\d{1,4}(?:\.\d{1,4})?/g;
    let m;
    const glued = (i) => /[\w.,(\[\/]/.test(s[i - 1] || ' ');
    while ((m = re.exec(s))) {
      let i = m.index, txt = m[0];
      const j = i + txt.length;
      if (m[1] && glued(i)) { i += m[1].length; txt = txt.slice(m[1].length); } /* "cCl- 118": o hífen é do rótulo */
      if (glued(i) || /[\d.)\]]/.test(s[j] || ' ')) continue;
      out.push({ i, j, txt });
    }
    return out;
  }

  function label(head) {
    /* setas ↑↓ do ticket viram um caractere solto no OCR ("t", "4", "|"); o K é o único rótulo de uma letra */
    let h = head.trim().replace(/^(?:[^\sk]\s+)+/i, '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const quals = [];
    h = h.replace(/\(([^)]*)\)/g, (_, q) => { quals.push(q.replace(/\s/g, '')); return ''; });
    const b = h.replace(/[^a-z0-9\/%]/g, '').replace(/0/g, 'o').replace(UNIT_HEAD, '');
    const q = quals.join(',');
    const sp = SPEC.find(([, re]) => re.test(b));
    if (!sp) return null;
    const fid = sp[0];
    let prio = 2, kind = '';
    if (fid === 'ph' || fid === 'paco2' || fid === 'pao2') {
      if (/[-\/]|^a$/.test(q)) return null; /* pO2(A-a), pO2(a/A) */
      if (/(^|,)t(,|$)/.test(q)) prio = 1; /* corrigido pela temperatura do paciente: só se não houver o de 37 °C */
    }
    if (fid === 'hco3' && /st/.test(q)) return null; /* bicarbonato padrão não é o HCO3 real */
    if (fid === 'ica' && /7\.?4/.test(q)) return null; /* Ca iônico normalizado para pH 7,4 */
    if (fid === 'fio2' && b === 'fo2' && !/i/.test(q)) return null; /* FO2(I) do Radiometer; FO2Hb não */
    if (fid === 'be') {
      const t = b + '(' + q + ')';
      if (/ecf|^sbe/.test(t)) { kind = 'sbe'; prio = 3; }
      else if (/^abe|^beb|\(b\)|act/.test(t)) { kind = 'abe'; prio = 2; }
      else { kind = 'be'; prio = 1; }
    }
    return { fid, prio, kind };
  }

  function unit(t) {
    t = t.toLowerCase().replace(/\s/g, '');
    if (/kpa/.test(t)) return 'kPa';
    if (/mmhg/.test(t)) return 'mmHg';
    if (/mg\/?d[l1i]/.test(t)) return 'mg/dL';
    if (/g\/?d[l1i]/.test(t)) return 'g/dL';
    if (/mmo[l1iv]/.test(t)) return 'mmol/L';
    if (/meq/.test(t)) return 'mEq/L';
    if (/g\/[l1i]/.test(t)) return 'g/L';
    if (/%/.test(t)) return '%';
    return '';
  }

  const rnd = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
  /* converte para a unidade do app; "sure" falso = vem desmarcado na conferência */
  function conv(fid, v, u, kind, kpaDoc, noDot) {
    let note = '', sure = true;
    switch (fid) {
      case 'paco2': case 'pao2':
        if (u === 'kPa' || (!u && kpaDoc)) { v = rnd(v * KPA, 1); note = 'kPa → mmHg'; }
        break;
      case 'lac':
        if (u === 'mg/dL') { v = rnd(v / 9.01, 2); note = 'mg/dL → mmol/L'; }
        else if (!u && v > 25) { v = rnd(v / 9.01, 2); note = 'unidade não lida: assumido mg/dL'; sure = false; }
        break;
      case 'glic':
        if (u === 'mmol/L') { v = rnd(v * 18.016, 0); note = 'mmol/L → mg/dL'; }
        else if (!u && v < 35) { note = 'unidade não lida: confira'; sure = false; }
        break;
      case 'hb':
        if (u === 'g/L') { v = rnd(v / 10, 1); note = 'g/L → g/dL'; }
        else if (u === 'mmol/L') { v = rnd(v * 1.611, 1); note = 'mmol/L → g/dL'; }
        break;
      case 'ica':
        if (u === 'mg/dL') { v = rnd(v / 4.008, 2); note = 'mg/dL → mmol/L: confira se é o iônico'; sure = false; }
        break;
      case 'fio2': case 'sao2':
        if (v > 0 && v <= 1) v = rnd(v * 100, 1);
        break;
    }
    const p = F[fid] && F[fid].p;
    const out = (x) => p && (x < p[0] || x > p[1]);
    if (out(v)) {
      /* vírgula apagada no papel térmico ("186" por 18,6). Só uma posição plausível: repõe e avisa.
         Duas posições plausíveis ("2345": 234,5 ou 23,45): sugere a primeira, desmarcada. */
      const fix = noDot && !note ? [10, 100].map((k) => rnd(v / k, 3)).filter((x) => !out(x)) : [];
      const t = fix.length ? String(fix[0]).replace('.', ',') : '';
      if (fix.length === 1) { v = fix[0]; note = `vírgula ilegível na foto: lido ${t}`; }
      else if (fix.length > 1) { v = fix[0]; note = `vírgula ilegível na foto: entendido como ${t}, confira`; sure = false; }
      else { note = 'fora da faixa plausível: confira'; sure = false; }
    }
    if (fid === 'be' && kind === 'abe') { note = 'ABE (sangue total). O app usa SBE: deixando vazio, ele calcula pelo pH e HCO₃' + (note ? ' · ' + note : ''); sure = false; }
    return { v, note, sure };
  }

  /* lines: texto (uma linha por \n) ou [{text, words?, bbox?}] do OCR */
  function parse(lines) {
    if (typeof lines === 'string') lines = lines.split(/\r?\n/).map((text) => ({ text }));
    const all = lines.map((l) => l.text || '').join('\n').toLowerCase();
    const kpaDoc = /kpa/.test(all) && !/mmhg/.test(all);
    const mv = /ven(os|ous)/.exec(all), ma = /arteri/.exec(all);
    const sample = mv && (!ma || mv.index < ma.index) ? 'ven' : ma ? 'art' : null;
    const best = {};
    lines.forEach((ln, li) => {
      const s = norm(ln.text);
      const ns = nums(s);
      let from = 0;
      ns.forEach((n, k) => {
        const head = s.slice(from, n.i);
        const tail = s.slice(n.j, k + 1 < ns.length ? ns[k + 1].i : s.length);
        from = n.j;
        const lab = label(head);
        if (!lab) return;
        const raw = n.txt.replace(/\s/g, '');
        const u = unit(tail);
        const c = conv(lab.fid, parseFloat(raw), u, lab.kind, kpaDoc, !raw.includes('.'));
        /* confiança do OCR na palavra do valor (só quando vem do Tesseract) */
        const wd = (ln.words || []).find((x) => norm(x.text).includes(raw.replace('-', '')));
        if (wd && wd.conf != null && wd.conf < 70 && c.sure) { c.sure = false; c.note = 'leitura incerta: confira'; }
        const it = { fid: lab.fid, v: c.v, raw, unit: u, note: c.note, sure: c.sure, kind: lab.kind, prio: lab.prio, line: li };
        const cur = best[lab.fid];
        if (!cur || it.prio > cur.prio) best[lab.fid] = it;
      });
    });
    const order = Object.keys(F);
    const items = Object.values(best).sort((a, b) => order.indexOf(a.fid) - order.indexOf(b.fid));
    return { items, sample, kpa: kpaDoc };
  }

  /* ================================================================ foto → texto (Tesseract local) */
  let wkP = null, onp = null, idleT = null;
  function loadScript(src) {
    return new Promise((ok, no) => {
      if (window.Tesseract) return ok();
      const s = document.createElement('script');
      s.src = src;
      s.onload = ok;
      s.onerror = () => no(new Error('offline'));
      document.head.appendChild(s);
    });
  }
  function worker() {
    clearTimeout(idleT);
    if (!wkP) {
      const base = new URL(BASE || './', location.href).href;
      wkP = loadScript(base + 'tesseract.min.js')
        .then(() => window.Tesseract.createWorker('eng', 1, {
          workerPath: base + 'worker.min.js', corePath: base, langPath: base.replace(/\/$/, ''),
          workerBlobURL: false, cacheMethod: 'none', logger: (m) => onp && onp(m),
        }))
        .then(async (w) => { await w.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' }); return w; });
      wkP.catch(() => { wkP = null; });
    }
    return wkP;
  }
  /* libera a memória (~100 MB) depois de um tempo sem uso */
  function release() {
    clearTimeout(idleT);
    idleT = setTimeout(() => { const p = wkP; wkP = null; if (p) p.then((w) => w.terminate()).catch(() => {}); }, 90000);
  }

  async function bitmap(file) {
    if (window.createImageBitmap) { try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* abaixo */ } }
    return new Promise((ok, no) => {
      const u = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => { URL.revokeObjectURL(u); ok(im); };
      im.onerror = () => { URL.revokeObjectURL(u); no(new Error('imagem')); };
      im.src = u;
    });
  }

  /* foto girada num canvas com o lado maior ≤ max */
  function draw(src, rot, max) {
    const w0 = src.width, h0 = src.height;
    const sc = Math.min(1, max / Math.max(w0, h0));
    const sw = Math.round(w0 * sc), sh = Math.round(h0 * sc);
    const side = rot % 180 !== 0;
    const cv = document.createElement('canvas');
    cv.width = side ? sh : sw; cv.height = side ? sw : sh;
    const x = cv.getContext('2d');
    x.translate(cv.width / 2, cv.height / 2);
    x.rotate((rot * Math.PI) / 180);
    x.drawImage(src, -sw / 2, -sh / 2, sw, sh);
    return cv;
  }
  /* trecho [x0, y0, x1, y1] de um canvas, redimensionado por z */
  function region(cv, r, z) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round((r[2] - r[0]) * z)); c.height = Math.max(1, Math.round((r[3] - r[1]) * z));
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(cv, r[0], r[1], r[2] - r[0], r[3] - r[1], 0, 0, c.width, c.height);
    return c;
  }

  /* tons de cinza + limiar adaptativo (Bradley–Roth): resiste a sombra e iluminação desigual do papel térmico */
  function binarize(cv) {
    const w = cv.width, h = cv.height, n = w * h;
    const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
    const g = new Uint8ClampedArray(n);
    for (let i = 0; i < n; i++) g[i] = (d[i * 4] * 299 + d[i * 4 + 1] * 587 + d[i * 4 + 2] * 114) / 1000;
    const I = new Uint32Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0;
      for (let xx = 0; xx < w; xx++) { row += g[y * w + xx]; I[(y + 1) * (w + 1) + xx + 1] = I[y * (w + 1) + xx + 1] + row; }
    }
    const r = Math.max(12, Math.round(Math.max(w, h) / 60)), T = 0.15;
    const bc = document.createElement('canvas');
    bc.width = w; bc.height = h;
    const bx = bc.getContext('2d');
    const out = bx.createImageData(w, h), od = out.data;
    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - r), y1 = Math.min(h - 1, y + r);
      for (let xx = 0; xx < w; xx++) {
        const x0 = Math.max(0, xx - r), x1 = Math.min(w - 1, xx + r);
        const cnt = (x1 - x0 + 1) * (y1 - y0 + 1);
        const sum = I[(y1 + 1) * (w + 1) + x1 + 1] - I[y0 * (w + 1) + x1 + 1] - I[(y1 + 1) * (w + 1) + x0] + I[y0 * (w + 1) + x0];
        const v = g[y * w + xx] * cnt <= sum * (1 - T) ? 0 : 255;
        const o = (y * w + xx) * 4;
        od[o] = od[o + 1] = od[o + 2] = v; od[o + 3] = 255;
      }
    }
    bx.putImageData(out, 0, 0);
    return bc;
  }

  function linesOf(data) {
    const L = [];
    (data.blocks || []).forEach((b) => (b.paragraphs || []).forEach((p) => (p.lines || []).forEach((l) => L.push({ text: l.text, bbox: l.bbox, words: (l.words || []).map((w) => ({ text: w.text, bbox: w.bbox, conf: w.confidence })) }))));
    if (!L.length && data.text) data.text.split('\n').forEach((text) => L.push({ text }));
    return L;
  }

  /* recorte da linha da foto até o valor lido — o médico confere contra a imagem, não contra o OCR */
  function cropper(cv, lines) {
    return function (it) {
      const ln = lines[it.line];
      if (!ln || !ln.bbox) return '';
      const key = it.raw.replace('-', '');
      const w = (ln.words || []).find((x) => norm(x.text).includes(key));
      const b = ln.bbox, hh = b.y1 - b.y0, pad = Math.round(hh * 0.35);
      const x0 = Math.max(0, b.x0 - pad), y0 = Math.max(0, b.y0 - pad);
      const x1 = Math.min(cv.width, (w ? w.bbox.x1 : b.x1) + pad * 2), y1 = Math.min(cv.height, b.y1 + pad);
      const c = document.createElement('canvas');
      const sc = Math.min(1, 44 / (y1 - y0));
      c.width = Math.max(1, Math.round((x1 - x0) * sc)); c.height = Math.max(1, Math.round((y1 - y0) * sc));
      c.getContext('2d').drawImage(cv, x0, y0, x1 - x0, y1 - y0, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.85);
    };
  }

  /* foto → {items, sample, kpa, text, crop(item)}.
     1ª leitura na foto inteira (reduzida) acha onde estão os resultados; a 2ª relê só esse bloco, ampliado a partir
     da foto em resolução cheia — é o que recupera vírgulas e dígitos finos do papel térmico. */
  async function read(file, opt) {
    opt = opt || {};
    onp = opt.onProgress || null;
    const say = (status) => onp && onp({ status, progress: 0 });
    try {
      const img = await bitmap(file);
      const full = draw(img, opt.rot || 0, 4000);
      if (img.close) img.close();
      const k = Math.min(1, 2400 / Math.max(full.width, full.height));
      const small = k < 1 ? region(full, [0, 0, full.width, full.height], k) : full;
      const w = await worker();
      const run = async (cv, bin) => {
        const { data } = await w.recognize(bin ? binarize(cv) : cv, {}, { text: true, blocks: true });
        const lines = linesOf(data), r = parse(lines), crop = cropper(cv, lines);
        r.items.forEach((it) => { it.img = crop(it); });
        r.lines = lines;
        return r;
      };
      let res = await run(small, true);
      if (res.items.length < 3) {
        say('second pass');
        const r2 = await run(small, false);
        if (r2.items.length > res.items.length) res = r2;
      }
      const hits = res.items.map((it) => res.lines[it.line]).filter((l) => l && l.bbox);
      if (hits.length >= 3) {
        const hs = hits.map((l) => l.bbox.y1 - l.bbox.y0).sort((a, b) => a - b);
        const lh = hs[hs.length >> 1] / k; /* altura da linha na foto cheia */
        const pad = lh * 2.5;
        const r = [
          Math.max(0, Math.min(...hits.map((l) => l.bbox.x0)) / k - pad), Math.max(0, Math.min(...hits.map((l) => l.bbox.y0)) / k - pad),
          Math.min(full.width, Math.max(...hits.map((l) => l.bbox.x1)) / k + pad), Math.min(full.height, Math.max(...hits.map((l) => l.bbox.y1)) / k + pad),
        ];
        const z = Math.min(3, 46 / lh, 2600 / (r[2] - r[0]), 4200 / (r[3] - r[1]));
        if (z > 1.15 || k < 0.9) {
          say('zoom');
          const zr = await run(region(full, r, z), true);
          const got = new Set(zr.items.map((it) => it.fid));
          const order = Object.keys(F);
          zr.items = zr.items.concat(res.items.filter((it) => !got.has(it.fid))).sort((a, b) => order.indexOf(a.fid) - order.indexOf(b.fid));
          zr.sample = zr.sample || res.sample;
          zr.lines = zr.lines.concat([{ text: '— foto inteira —' }], res.lines);
          res = zr;
        }
      }
      res.text = res.lines.map((l) => l.text.replace(/\n$/, '')).join('\n');
      res.crop = (it) => it.img || '';
      return res;
    } finally {
      onp = null;
      release();
    }
  }

  C.scan = { parse, read };
})();
