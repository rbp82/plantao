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
    ['hco3', /^[ce]?h[cg]o[3sgz]?(act|a)?[ce]?$|^bicarbonato?$/],
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
    /* parêntese que o OCR não fechou ("HCO, "(Plc"): o resto vira qualificador */
    h = h.replace(/[({\[](.*)$/, (_, q) => { quals.push(q.replace(/\s/g, '')); return ''; });
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
      /* vírgula não lida nem na imagem ("186" por 18,6): sugere a posição plausível, sempre desmarcado —
         um dígito trocado pelo OCR ("8658" por 95,8) também cai aqui e não pode entrar sem conferência */
      const fix = noDot && !note ? [10, 100].map((k) => rnd(v / k, 3)).filter((x) => !out(x)) : [];
      if (fix.length) { v = fix[0]; note = `vírgula não lida: entendido como ${String(fix[0]).replace('.', ',')}, confira`; }
      else note = 'fora da faixa plausível: confira';
      sure = false;
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
    return { items: consistency(items), sample, kpa: kpaDoc };
  }

  /* O gasômetro calcula o HCO3 a partir de pH e PCO2, então os três têm de fechar entre si (mesma regra do motor:
     pH calc = 6,1 + log10(HCO3 / (0,03 × PaCO2)), tolerância ± 0,05). E o sinal do BE tem de bater com o SBE
     de Van Slyke. Se não fecha, algum dígito ou sinal foi mal lido: os envolvidos vêm desmarcados. */
  function consistency(items) {
    const g = (f) => items.find((x) => x.fid === f);
    const flag = (it, note) => { if (it) { it.sure = false; it.note = it.note ? `${note} · ${it.note}` : note; } };
    const ph = g('ph'), pc = g('paco2'), hc = g('hco3'), be = g('be');
    if (ph && pc && hc && pc.v > 0 && hc.v > 0 && Math.abs(6.1 + Math.log10(hc.v / (0.03 * pc.v)) - ph.v) > 0.05) {
      [ph, pc, hc].forEach((it) => flag(it, 'pH, PaCO₂ e HCO₃ não fecham (Henderson-Hasselbalch)'));
    }
    if (be && ph && hc) {
      const sbe = 0.9287 * (hc.v - 24.4 + 14.83 * (ph.v - 7.4));
      if (Math.abs(sbe) >= 3 && Math.sign(sbe) !== Math.sign(be.v)) flag(be, 'sinal do BE não confere com pH e HCO₃');
    }
    return items;
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

  /* trecho r (em coordenadas da imagem girada por −ang em torno do centro), redimensionado por z; fora da foto = branco */
  function regionRot(cv, r, z, ang) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round((r[2] - r[0]) * z)); c.height = Math.max(1, Math.round((r[3] - r[1]) * z));
    const x = c.getContext('2d');
    x.fillStyle = '#fff';
    x.fillRect(0, 0, c.width, c.height);
    x.imageSmoothingQuality = 'high';
    x.scale(z, z);
    x.translate(-r[0], -r[1]);
    x.translate(cv.width / 2, cv.height / 2);
    x.rotate(-ang);
    x.translate(-cv.width / 2, -cv.height / 2);
    x.drawImage(cv, 0, 0);
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

  /* ================================================================ "modo digitalizar"
     O mesmo que a câmera do celular faz ao digitalizar um documento: acha o papel, corta o fundo, corrige perspectiva
     e inclinação, aplana a iluminação (sombra e papel amarelado viram branco) e reforça contraste e nitidez. */
  function grayOf(cv) {
    const w = cv.width, h = cv.height, n = w * h;
    const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
    const g = new Uint8ClampedArray(n);
    for (let i = 0; i < n; i++) g[i] = (d[i * 4] * 299 + d[i * 4 + 1] * 587 + d[i * 4 + 2] * 114) / 1000;
    return g;
  }
  /* máximo/mínimo numa janela (2r+1)², separável */
  function rank(a, w, h, r, max) {
    const t = new Uint8ClampedArray(a.length), o = new Uint8ClampedArray(a.length);
    const pick = max ? (m, v) => (v > m ? v : m) : (m, v) => (v < m ? v : m);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let m = a[y * w + x];
      for (let k = Math.max(0, x - r), e = Math.min(w - 1, x + r); k <= e; k++) m = pick(m, a[y * w + k]);
      t[y * w + x] = m;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let m = t[y * w + x];
      for (let k = Math.max(0, y - r), e = Math.min(h - 1, y + r); k <= e; k++) m = pick(m, t[k * w + x]);
      o[y * w + x] = m;
    }
    return o;
  }
  function otsu(a, from) {
    const hist = new Float64Array(256);
    let n = 0;
    for (let i = 0; i < a.length; i++) if (a[i] >= from) { hist[a[i]]++; n++; }
    if (!n) return 255;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sB = 0, wB = 0, best = -1, th = from;
    for (let t = from; t < 256; t++) {
      wB += hist[t]; if (!wB) continue;
      const wF = n - wB; if (!wF) break;
      sB += t * hist[t];
      const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF);
      if (v > best) { best = v; th = t; }
    }
    return th;
  }
  /* maior região clara que não seja o próprio fundo; devolve os 4 cantos [tl, tr, br, bl] */
  function blob(m, w, h, th) {
    const seen = new Uint8Array(w * h), q = new Int32Array(w * h);
    let best = null;
    for (let s = 0; s < w * h; s++) {
      if (seen[s] || m[s] <= th) continue;
      let qh = 0, qt = 0, cnt = 0, edges = 0;
      const c = { tl: [0, 0, Infinity], br: [0, 0, -Infinity], tr: [0, 0, -Infinity], bl: [0, 0, Infinity] };
      seen[s] = 1; q[qt++] = s;
      while (qh < qt) {
        const i = q[qh++], x = i % w, y = (i / w) | 0;
        cnt++;
        if (x === 0) edges |= 1; if (x === w - 1) edges |= 2; if (y === 0) edges |= 4; if (y === h - 1) edges |= 8;
        const a = x + y, b = x - y;
        if (a < c.tl[2]) c.tl = [x, y, a]; if (a > c.br[2]) c.br = [x, y, a];
        if (b > c.tr[2]) c.tr = [x, y, b]; if (b < c.bl[2]) c.bl = [x, y, b];
        if (x > 0 && !seen[i - 1] && m[i - 1] > th) { seen[i - 1] = 1; q[qt++] = i - 1; }
        if (x < w - 1 && !seen[i + 1] && m[i + 1] > th) { seen[i + 1] = 1; q[qt++] = i + 1; }
        if (y > 0 && !seen[i - w] && m[i - w] > th) { seen[i - w] = 1; q[qt++] = i - w; }
        if (y < h - 1 && !seen[i + w] && m[i + w] > th) { seen[i + w] = 1; q[qt++] = i + w; }
      }
      const sides = (edges & 1) + ((edges >> 1) & 1) + ((edges >> 2) & 1) + ((edges >> 3) & 1);
      if (sides >= 3) continue; /* encosta em 3 ou 4 bordas: é o fundo (ou a foto já é um scan) */
      if (!best || cnt > best.cnt) best = { cnt, quad: [c.tl, c.tr, c.br, c.bl].map((p) => [p[0], p[1]]) };
    }
    return best;
  }
  function findPaper(raw) {
    const s = Math.min(1, 640 / Math.max(raw.width, raw.height));
    const sm = region(raw, [0, 0, raw.width, raw.height], s);
    const w = sm.width, h = sm.height, n = w * h;
    const d = sm.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
    const p = new Uint8ClampedArray(n);
    for (let i = 0; i < n; i++) {
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      p[i] = (r * 299 + g * 587 + b * 114) / 1000 - 1.5 * (Math.max(r, g, b) - Math.min(r, g, b)); /* papel: claro e sem cor */
    }
    const rr = Math.max(3, Math.round(Math.max(w, h) / 110));
    const c = rank(rank(p, w, h, rr, true), w, h, rr, false); /* fechamento: o texto some de dentro do papel */
    /* papel sobre fundo escuro: 1º limiar; sobre mesa clara: o 2º separa papel de mesa.
       Um recorte errado corta resultados, então só vale se for um retângulo plausível e bem destacado do fundo. */
    const t1 = otsu(c, 0);
    for (const th of [t1, otsu(c, t1 + 1)]) {
      const b = blob(c, w, h, th);
      if (b && b.cnt > 0.12 * n && b.cnt < 0.95 * n && quadOk(b.quad) && contrast(c, w, h, b.quad) >= 35) return b.quad.map(([x, y]) => [x / s, y / s]);
    }
    return null;
  }
  /* ângulos internos perto de 90° e lados opostos parecidos */
  function quadOk(q) {
    for (let i = 0; i < 4; i++) {
      const a = q[(i + 3) % 4], b = q[i], c = q[(i + 1) % 4];
      const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]];
      const cos = (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2) || 1);
      if (Math.abs(cos) > 0.34) return false; /* fora de 70°–110° */
    }
    const r1 = dist(q[0], q[1]) / dist(q[3], q[2]), r2 = dist(q[0], q[3]) / dist(q[1], q[2]);
    return r1 > 0.8 && r1 < 1.25 && r2 > 0.8 && r2 < 1.25;
  }
  /* diferença de claridade entre uma faixa logo dentro e logo fora da borda do papel */
  function contrast(c, w, h, q) {
    const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
    let din = 0, dout = 0, nin = 0, nout = 0;
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4];
      for (let t = 0.1; t <= 0.9; t += 0.05) {
        const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
        const dx = cx - x, dy = cy - y, L = Math.hypot(dx, dy) || 1, off = Math.max(3, Math.min(w, h) * 0.02);
        const xi = Math.round(x + (dx / L) * off), yi = Math.round(y + (dy / L) * off);
        const xo = Math.round(x - (dx / L) * off), yo = Math.round(y - (dy / L) * off);
        if (xi >= 0 && yi >= 0 && xi < w && yi < h) { din += c[yi * w + xi]; nin++; }
        if (xo >= 0 && yo >= 0 && xo < w && yo < h) { dout += c[yo * w + xo]; nout++; }
      }
    }
    return nin && nout ? din / nin - dout / nout : 0;
  }
  /* resolve A·x = B (8×8, eliminação de Gauss com pivô) */
  function solve(A, B) {
    const n = B.length;
    for (let i = 0; i < n; i++) {
      let mx = i;
      for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[mx][i])) mx = r;
      [A[i], A[mx]] = [A[mx], A[i]]; [B[i], B[mx]] = [B[mx], B[i]];
      for (let r = i + 1; r < n; r++) {
        const f = A[r][i] / A[i][i];
        for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
        B[r] -= f * B[i];
      }
    }
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) { let s = B[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; }
    return x;
  }
  /* homografia que leva o retângulo de saída (dst) para o quadrilátero da foto (src) */
  function homography(src, dst) {
    const A = [], B = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = dst[i], [u, v] = src[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); B.push(v);
    }
    return solve(A, B);
  }
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  /* aplana a iluminação (divide pelo "fundo" estimado), estica o contraste e aplica nitidez */
  function enhance(g, w, h, o) {
    o = Object.assign({ gamma: 1.25, sharp: 0.7 }, o);
    const B = Math.max(24, Math.round(Math.max(w, h) / 45));
    const bw = Math.ceil(w / B), bh = Math.ceil(h / B);
    let bg = new Float32Array(bw * bh);
    for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
      let m = 0;
      for (let y = by * B, ye = Math.min(h, y + B); y < ye; y += 2) for (let x = bx * B, xe = Math.min(w, x + B); x < xe; x += 2) if (g[y * w + x] > m) m = g[y * w + x];
      bg[by * bw + bx] = Math.max(40, m);
    }
    for (let pass = 0; pass < 2; pass++) {
      const t = new Float32Array(bg.length);
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        let s = 0, c = 0;
        for (let yy = Math.max(0, y - 1); yy <= Math.min(bh - 1, y + 1); yy++) for (let xx = Math.max(0, x - 1); xx <= Math.min(bw - 1, x + 1); xx++) { s += bg[yy * bw + xx]; c++; }
        t[y * bw + x] = s / c;
      }
      bg = t;
    }
    const n = new Uint8ClampedArray(w * h), hist = new Uint32Array(256);
    for (let y = 0; y < h; y++) {
      const fy = Math.min(bh - 1.001, Math.max(0, y / B - 0.5)), y0 = fy | 0, ty = fy - y0;
      for (let x = 0; x < w; x++) {
        const fx = Math.min(bw - 1.001, Math.max(0, x / B - 0.5)), x0 = fx | 0, tx = fx - x0;
        const i0 = y0 * bw + x0, y1 = Math.min(bh - 1, y0 + 1) * bw, x1 = Math.min(bw - 1, x0 + 1);
        const b = (bg[i0] * (1 - tx) + bg[y0 * bw + x1] * tx) * (1 - ty) + (bg[y1 + x0] * (1 - tx) + bg[y1 + x1] * tx) * ty;
        const v = (g[y * w + x] * 255) / b;
        n[y * w + x] = v;
        hist[n[y * w + x]]++;
      }
    }
    let lo = 0;
    for (let acc = 0; lo < 200 && (acc += hist[lo]) < w * h * 0.01; lo++);
    const hi = 232;
    const lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) { const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo))); lut[v] = 255 * Math.pow(t, o.gamma); }
    for (let i = 0; i < n.length; i++) n[i] = lut[n[i]];
    /* nitidez (máscara de desfoque 3×3) */
    const out = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) { out[i] = n[i]; continue; }
      const bl = (n[i - w - 1] + n[i - w] + n[i - w + 1] + n[i - 1] + n[i] + n[i + 1] + n[i + w - 1] + n[i + w] + n[i + w + 1]) / 9;
      out[i] = n[i] + o.sharp * (n[i] - bl);
    }
    return out;
  }
  /* tratamento "scan" de um trecho já no tamanho em que será lido (ampliar antes, tratar depois) */
  function clean(cv, o) { return toCanvas(enhance(grayOf(cv), cv.width, cv.height, o), cv.width, cv.height); }
  function toCanvas(g, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d'), im = x.createImageData(w, h), d = im.data;
    for (let i = 0; i < g.length; i++) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = g[i]; d[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0);
    return c;
  }
  /* foto crua → papel recortado e com perspectiva corrigida (em cinza); sem papel nítido, devolve a própria foto.
     O tratamento de luz/contraste/nitidez vem depois, em cada trecho já ampliado (clean). */
  function docScan(raw, warp) {
    const quad = warp !== false ? findPaper(raw) : null;
    if (!quad) return { cv: raw, found: false, quad: null };
    const rw = raw.width, rh = raw.height;
    const [tl, tr, br, bl] = quad;
    const ow = Math.max(dist(tl, tr), dist(bl, br)), oh = Math.max(dist(tl, bl), dist(tr, br));
    const z = Math.min(3, 1700 / ow, 5200 / oh);
    const W = Math.round(ow * z), H = Math.round(oh * z);
    const M = homography(quad, [[0, 0], [W - 1, 0], [W - 1, H - 1], [0, H - 1]]);
    const src = grayOf(raw);
    const g = new Uint8ClampedArray(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const zz = M[6] * x + M[7] * y + 1;
      const u = Math.min(rw - 1.001, Math.max(0, (M[0] * x + M[1] * y + M[2]) / zz));
      const v = Math.min(rh - 1.001, Math.max(0, (M[3] * x + M[4] * y + M[5]) / zz));
      const x0 = u | 0, y0 = v | 0, fx = u - x0, fy = v - y0, i = y0 * rw + x0;
      g[y * W + x] = (src[i] * (1 - fx) + src[i + 1] * fx) * (1 - fy) + (src[i + rw] * (1 - fx) + src[i + rw + 1] * fx) * fy;
    }
    return { cv: toCanvas(g, W, H), found: true, quad };
  }

  /* Vírgula decimal que o OCR não transcreve (no papel térmico ela é um pingo miúdo junto aos dígitos).
     Dentro da palavra, separa as manchas de tinta: dígitos são as manchas altas; uma mancha pequena na metade de baixo,
     encostando na linha de base e ENTRE dois dígitos, é a vírgula. Achando exatamente uma, insere o separador no texto. */
  function commas(lines, cv) {
    const W = cv.width, H = cv.height;
    const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
    const med = (a) => a.slice().sort((p, q) => p - q)[a.length >> 1];
    lines.forEach((ln) => (ln.words || []).forEach((wd) => {
      if (!/^-?\d{2,5}$/.test(wd.text) || !wd.bbox) return;
      const nd = wd.text.replace('-', '').length;
      const b = wd.bbox, ht0 = b.y1 - b.y0;
      if (ht0 < 8) return;
      const x0 = Math.max(0, b.x0 - 2), x1 = Math.min(W - 1, b.x1 + 2), y0 = Math.max(0, b.y0 - 2), y1 = Math.min(H - 1, Math.round(b.y1 + ht0 * 0.3));
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      const lab = new Int32Array(w * h), q = new Int32Array(w * h), comps = [];
      for (let s = 0; s < w * h; s++) {
        if (lab[s] || d[((y0 + ((s / w) | 0)) * W + x0 + (s % w)) * 4] >= 110) continue;
        const c = { x0: Infinity, x1: -1, y0: Infinity, y1: -1, n: 0 };
        let qh = 0, qt = 0;
        lab[s] = comps.length + 1; q[qt++] = s;
        while (qh < qt) {
          const i = q[qh++], x = i % w, y = (i / w) | 0;
          c.n++; if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
          for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
            if (j < 0 || lab[j] || d[((y0 + ((j / w) | 0)) * W + x0 + (j % w)) * 4] >= 110) continue;
            lab[j] = lab[s]; q[qt++] = j;
          }
        }
        comps.push(c);
      }
      const tall = comps.filter((c) => c.y1 - c.y0 >= ht0 * 0.55).sort((p, r) => p.x0 - r.x0);
      if (tall.length !== nd) return; /* dígito partido ou colado: não arrisca */
      const ht = med(tall.map((c) => c.y1 - c.y0)), top = med(tall.map((c) => c.y0)), base = med(tall.map((c) => c.y1));
      const marks = comps.filter((c) => {
        const ch = c.y1 - c.y0 + 1, cw = c.x1 - c.x0 + 1, cx = (c.x0 + c.x1) / 2;
        return c.n >= 4 && ch >= ht * 0.12 && ch <= ht * 0.5 && cw <= ht * 0.4 && c.y0 >= top + ht * 0.45 && c.y1 >= base - ht * 0.1 &&
          tall.some((t, i) => i < tall.length - 1 && cx > t.x1 - 1 && cx < tall[i + 1].x0 + 1);
      });
      if (marks.length !== 1) return;
      const cx = (marks[0].x0 + marks[0].x1) / 2;
      const at = tall.filter((t) => (t.x0 + t.x1) / 2 < cx).length;
      const neg = wd.text.startsWith('-') ? 1 : 0;
      const fixed = wd.text.slice(0, neg + at) + '.' + wd.text.slice(neg + at);
      ln.text = ln.text.replace(wd.text, fixed);
      wd.text = fixed;
    }));
    return lines;
  }

  function linesOf(data) {
    const L = [];
    (data.blocks || []).forEach((b) => (b.paragraphs || []).forEach((p) => (p.lines || []).forEach((l) => L.push({ text: l.text, bbox: l.bbox, baseline: l.baseline, words: (l.words || []).map((w) => ({ text: w.text, bbox: w.bbox, conf: w.confidence, symbols: (w.symbols || []).map((y) => ({ text: y.text, bbox: y.bbox })) })) }))));
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
      const raw = draw(img, opt.rot || 0, 4000);
      if (img.close) img.close();
      say('scan');
      await new Promise((r) => setTimeout(r, 30)); /* deixa a tela mostrar o progresso */
      const doc = docScan(raw);
      const w = await worker();
      const run = async (cv, bin) => {
        const img = bin ? binarize(cv) : cv;
        const { data } = await w.recognize(img, {}, { text: true, blocks: true });
        const lines = commas(linesOf(data), img), r = parse(lines), crop = cropper(cv, lines);
        r.items.forEach((it) => { it.img = crop(it); });
        r.lines = lines;
        return r;
      };
      /* papel recortado e tratado; se render pouco, a foto inteira tratada; por último a foto como veio */
      let res = await pipeline(doc.cv, run, say, true);
      if (res.items.length < 3 && doc.found) { const r2 = await pipeline(raw, run, say, true); if (r2.items.length > res.items.length) res = r2; }
      if (res.items.length < 3) { const r3 = await pipeline(raw, run, say, false); if (r3.items.length > res.items.length) res = r3; }
      res.items = consistency(res.items.map((it) => Object.assign({}, it))); /* de novo, depois de juntar as leituras */
      res.text = res.lines.map((l) => l.text.replace(/\n$/, '')).join('\n');
      res.crop = (it) => it.img || '';
      res.paper = doc.found;
      res.preview = clean(region(doc.cv, [0, 0, doc.cv.width, doc.cv.height], Math.min(1, 520 / doc.cv.width))).toDataURL('image/jpeg', 0.7);
      return res;
    } finally {
      onp = null;
      release();
    }
  }

  /* 1ª leitura (reduzida) acha o bloco de resultados; a 2ª relê esse bloco ampliado */
  async function pipeline(full, run, say, cl) {
    const prep = (cv) => (cl ? clean(cv) : cv);
    const k = Math.min(1, 2400 / Math.max(full.width, full.height));
    const small = prep(k < 1 ? region(full, [0, 0, full.width, full.height], k) : full);
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
      /* inclinação do texto pelas linhas de base: o bloco é endireitado antes de reler */
      const angs = res.lines.filter((l) => l.baseline && l.baseline.x1 - l.baseline.x0 > small.width * 0.2)
        .map((l) => Math.atan2(l.baseline.y1 - l.baseline.y0, l.baseline.x1 - l.baseline.x0)).sort((a, b) => a - b);
      const med = angs.length >= 3 ? angs[angs.length >> 1] : 0;
      const ang = Math.abs(med) > 0.006 && Math.abs(med) < 0.35 ? med : 0;
      const cx = full.width / 2, cy = full.height / 2, co = Math.cos(-ang), si = Math.sin(-ang);
      const pts = hits.flatMap((l) => [[l.bbox.x0, l.bbox.y0], [l.bbox.x1, l.bbox.y0], [l.bbox.x1, l.bbox.y1], [l.bbox.x0, l.bbox.y1]])
        .map(([x, y]) => { const dx = x / k - cx, dy = y / k - cy; return [cx + dx * co - dy * si, cy + dx * si + dy * co]; });
      const r = [
        Math.min(...pts.map((p) => p[0])) - pad, Math.min(...pts.map((p) => p[1])) - pad,
        Math.max(...pts.map((p) => p[0])) + pad, Math.max(...pts.map((p) => p[1])) + pad,
      ];
      const z = Math.min(3.2, 56 / lh, 2600 / (r[2] - r[0]), 4200 / (r[3] - r[1]));
      { /* sempre relê o bloco: além de ampliar, é o que dá as leituras independentes para a votação */
        say('zoom');
        const block = regionRot(full, r, z, ang);
        const za = await run(block, true);
        const reads = [za];
        if (cl) { say('zoom'); reads.push(await run(clean(block), true)); }
        reads.push(res);
        const zr = vote(reads);
        zr.lines = za.lines.concat([{ text: '— foto inteira —' }], res.lines);
        res = zr;
      }
    }
    return res;
  }

  /* Votação entre leituras independentes (bloco ampliado, bloco tratado, foto inteira).
     Marcado só se ao menos duas concordam e nenhuma discorda — um 9 lido como 8 numa leitura não passa sozinho. */
  function vote(rs) {
    const order = Object.keys(F), fids = [];
    rs.forEach((r) => r.items.forEach((it) => { if (!fids.includes(it.fid)) fids.push(it.fid); }));
    const items = fids.map((fid) => {
      const got = rs.map((r) => r.items.find((x) => x.fid === fid)).filter(Boolean);
      const vals = [];
      got.forEach((it) => { const v = vals.find((x) => Math.abs(x.v - it.v) < 1e-9); if (v) v.n.push(it); else vals.push({ v: it.v, n: [it] }); });
      vals.sort((p, q) => q.n.length - p.n.length || (q.n.some((x) => x.raw.includes('.')) ? 1 : 0) - (p.n.some((x) => x.raw.includes('.')) ? 1 : 0));
      const win = vals[0], it = Object.assign({}, win.n.find((x) => x.sure) || win.n[0]);
      const fmt = (v) => String(v).replace('.', ',');
      if (vals.length > 1) { it.sure = false; it.note = `leituras diferentes (${vals.map((x) => fmt(x.v)).join(' × ')}): confira`; }
      else if (win.n.length < 2 && it.sure) { it.sure = false; it.note = 'lido uma vez só: confira'; }
      return it;
    }).sort((a, b) => order.indexOf(a.fid) - order.indexOf(b.fid));
    return Object.assign({}, rs[0], { items, sample: rs.map((r) => r.sample).find(Boolean) || null });
  }

  C.scan = { parse, read, docScan, vote };})();
