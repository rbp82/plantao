/* Bateria de testes do Plantão.
   Os valores esperados foram calculados à mão a partir das fórmulas publicadas (citadas em cada grupo),
   independentemente do código do app. Rodar abrindo tests/index.html servido por HTTP. */
(function () {
  'use strict';
  const C = window.Calc;
  const rows = [];
  let pass = 0, fail = 0;

  function rec(ok, name, exp, got) {
    ok ? pass++ : fail++;
    rows.push(`<tr><td class="r ${ok ? 'ok' : 'bad'}">${ok ? 'OK' : 'FALHOU'}</td><td>${name}</td><td>${String(exp)}</td><td>${String(got)}</td></tr>`);
  }
  function group(t) { rows.push(`<tr class="g"><td colspan="4">${t}</td></tr>`); }
  function near(name, got, exp, tol = 0.01) {
    const ok = Number.isFinite(got) && Math.abs(got - exp) <= tol;
    rec(ok, name, `${exp} ± ${tol}`, Number.isFinite(got) ? +got.toFixed(6) : got);
  }
  function eq(name, got, exp) { rec(Object.is(got, exp) || got === exp, name, exp, got); }
  function isNaNt(name, got) { rec(Number.isNaN(got), name, 'NaN', got); }
  function has(name, text, needle) { rec(text.includes(needle), name, `contém “${needle}”`, text.replace(/\s+/g, ' ').slice(0, 220)); }
  function hasNot(name, text, needle) { rec(!text.includes(needle), name, `não contém “${needle}”`, text.replace(/\s+/g, ' ').slice(0, 220)); }

  /* monta uma ferramenta real fora da tela e permite simular o usuário */
  function mount(id, keepSession) {
    if (!keepSession) C.Vault.temporary(); /* sessão limpa em memória para cada ferramenta */
    const sb = document.getElementById('sandbox');
    sb.innerHTML = '<main class="tool" id="tool"></main>';
    const root = sb.firstChild;
    const t = C.tool(id);
    root.innerHTML = (t.weight ? C.patientStrip() : '') + '<div id="toolBody"></div>';
    const api = {};
    root.addEventListener('input', (e) => C.validate(e.target));
    t.render(root.querySelector('#toolBody'), api, root);
    C.bindPatient(root);
    root.dispatchEvent(new Event('input', { bubbles: true }));
    const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));
    return {
      root, api,
      set(sel, v) { const el = root.querySelector(sel); if (!el) throw new Error('sem ' + sel); el.value = v; fire(el, 'input'); },
      pick(sel) { const el = root.querySelector(sel); if (!el) throw new Error('sem ' + sel); el.checked = true; fire(el, 'input'); fire(el, 'change'); },
      text(sel) { const el = sel ? root.querySelector(sel) : root; return el ? el.innerText : '(nada)'; },
    };
  }

  try {
    /* ============ 1. leitura de números ============ */
    group('1. Leitura de números digitados (padrão brasileiro)');
    eq('"1,5" → 1,5', C.num('1,5'), 1.5);
    eq('"7.25" → 7,25 (ponto decimal)', C.num('7.25'), 7.25);
    eq('"0.125" → 0,125', C.num('0.125'), 0.125);
    eq('"1.000" → 1000 (milhar)', C.num('1.000'), 1000);
    eq('"2.500" → 2500 (milhar)', C.num('2.500'), 2500);
    eq('"1.000,5" → 1000,5', C.num('1.000,5'), 1000.5);
    eq('"12.5" → 12,5', C.num('12.5'), 12.5);
    eq('"-3" → −3', C.num('-3'), -3);
    isNaNt('"1,2,3" → inválido', C.num('1,2,3'));
    isNaNt('"abc" → inválido', C.num('abc'));
    isNaNt('"" → vazio', C.num(''));
    isNaNt('"7,2a" → inválido', C.num('7,2a'));

    /* ============ 2. infusões ============ */
    group('2. Motor de infusões — dose = conc × vazão ÷ 60 ÷ peso');
    const M = C.infMath;
    // nora 16 mg/250 mL = 64 mcg/mL; 10 mL/h → 640 mcg/h → 10,667 mcg/min → /70 = 0,15238
    near('Nora 16 mg/250 mL, 10 mL/h, 70 kg = 0,15238 mcg/kg/min', M.toUnit(64 * 10 / 60, 'mcg/kg/min', 70), 0.152381, 1e-5);
    // reverso: 0,1 mcg/kg/min × 70 × 60 / 64 = 6,5625 mL/h
    near('Nora 0,1 mcg/kg/min, 70 kg → 6,5625 mL/h', M.fromUnit(0.1, 'mcg/kg/min', 70) * 60 / 64, 6.5625, 1e-6);
    // propofol 10 mg/mL, 30 mL/h, 70 kg = 300 mg/h = 4,2857 mg/kg/h = 71,43 mcg/kg/min
    near('Propofol 30 mL/h, 70 kg = 71,43 mcg/kg/min', M.toUnit(10000 * 30 / 60, 'mcg/kg/min', 70), 71.428571, 1e-5);
    near('Propofol 30 mL/h, 70 kg = 4,2857 mg/kg/h', M.toUnit(10000 * 30 / 60, 'mg/kg/h', 70), 4.285714, 1e-5);
    // vasopressina 0,4 UI/mL × 6 mL/h = 2,4 UI/h = 0,04 UI/min
    near('Vasopressina 100 UI/250 mL, 6 mL/h = 0,04 UI/min', M.toUnit(0.4 * 6 / 60, 'UI/min', 70), 0.04, 1e-9);
    // midazolam 1 mg/mL × 10 mL/h = 10 mg/h /70 = 0,142857 mg/kg/h
    near('Midazolam 200 mg/200 mL, 10 mL/h, 70 kg = 0,1429 mg/kg/h', M.toUnit(1000 * 10 / 60, 'mg/kg/h', 70), 0.142857, 1e-5);
    // remifentanil 50 mcg/mL × 10 mL/h = 500 mcg/h /70 = 7,1429 mcg/kg/h = 0,11905 mcg/kg/min
    near('Remifentanil 4 mg/80 mL, 10 mL/h, 70 kg = 0,11905 mcg/kg/min', M.toUnit(50 * 10 / 60, 'mcg/kg/min', 70), 0.119048, 1e-5);
    near('Dexmed 4 mcg/mL, 10 mL/h, 70 kg = 0,5714 mcg/kg/h', M.toUnit(4 * 10 / 60, 'mcg/kg/h', 70), 0.571429, 1e-5);

    group('2b. Infusões na tela (DVA e sedação) — integração');
    let m = mount('dva');
    m.set('[data-p="peso"]', '70');
    m.set('#nor_in', '10');
    has('DVA: nora 10 mL/h → 0,152', m.text('[data-inf="nor"] [data-res]'), '0,152');
    has('DVA: nora 10 mL/h → 10,7 mcg/min', m.text('[data-inf="nor"] [data-res]'), '10,7 mcg/min');
    has('DVA: nora na faixa', m.text('[data-inf="nor"] [data-res]'), 'Na faixa');
    m.set('#vaso_in', '6');
    has('DVA: vasopressina 0,040 UI/min exatamente no limite = “Na faixa”', m.text('[data-inf="vaso"] [data-res]'), 'Na faixa');
    // dopamina 800 mcg/mL; 3 mcg/kg/min × 70 × 60 / 800 = 15,75 mL/h → exatamente 3 = faixa β1 (3–10)
    // bula: < 2 dopaminérgica; 2 mcg/kg/min × 70 × 60 / 800 = 10,5 mL/h → exatamente 2 = β1
    m.set('#dopa_in', '10,5');
    has('DVA: dopamina 2,00 mcg/kg/min = faixa β1 (2–10)', m.text('[data-inf="dopa"] [data-res]'), 'β1');
    m.set('#dopa_in', '10');
    has('DVA: dopamina 1,90 = faixa dopaminérgica', m.text('[data-inf="dopa"] [data-res]'), 'dopaminérgica');
    m.set('#dopa_in', '63');
    has('DVA: dopamina 12 mcg/kg/min = β1 + efeito α', m.text('[data-inf="dopa"] [data-res]'), 'efeito α');
    // NTG 100 mcg/mL × 6 mL/h = 10 mcg/min (independe do peso)
    m.set('#ntg_in', '6');
    has('DVA: nitroglicerina 6 mL/h = 10,0 mcg/min', m.text('[data-inf="ntg"] [data-res]'), '10,0');
    m.set('#ntg_in', '150');
    has('DVA: nitroglicerina 250 mcg/min = acima de 200 (sem máximo em bula)', m.text('[data-inf="ntg"] [data-res]'), 'Acima de 200');
    // nitroprussiato 200 mcg/mL; 3 mcg/kg/min × 70 × 60 /200 = 63 mL/h → alerta de cianeto (> 2)
    m.set('#nitro_in', '63');
    has('DVA: nitroprussiato 3 mcg/kg/min → alerta de cianeto', m.text('[data-inf="nitro"]'), 'cianeto');
    // modo reverso
    m.pick('.mode input[value="rate"]');
    m.set('#nor_in', '0,1');
    has('DVA reverso: nora 0,1 mcg/kg/min → 6,6 mL/h', m.text('[data-inf="nor"] [data-res]'), '6,6');
    m.set('#dob_in', '5');
    has('DVA reverso: dobutamina 5 mcg/kg/min → 21,0 mL/h', m.text('[data-inf="dob"] [data-res]'), '21,0');
    // peso implausível bloqueia
    m.pick('.mode input[value="dose"]');
    m.set('[data-p="peso"]', '7000');
    m.set('#nor_in', '10');
    has('Peso 7000 kg (implausível) não calcula', m.text('[data-inf="nor"] [data-res]'), 'Informe o peso');
    // milhar com ponto em diluição
    m.set('[data-p="peso"]', '70');
    m.set('#nor_amt', '16');
    m.set('#nor_vol', '250');
    has('Diluição editada mantém cálculo', m.text('[data-inf="nor"] [data-res]'), '0,152');

    m = mount('sedacao');
    m.set('[data-p="peso"]', '70');
    m.set('#prop_in', '30');
    has('Sedação: propofol 30 mL/h → 71,4 mcg/kg/min', m.text('[data-inf="prop"] [data-res]'), '71,4');
    has('Sedação: propofol 4,29 mg/kg/h → alerta PRIS', m.text('[data-inf="prop"]'), 'PRIS');
    m.set('#prop_in', '21');
    has('Sedação: propofol 50,0 mcg/kg/min = na faixa (limite 5–50)', m.text('[data-inf="prop"] [data-res]'), 'Na faixa');
    m.set('#mor_in', '10');
    has('Sedação: morfina 1 mg/mL, 10 mL/h = 10,0 mg/h na faixa 2–30', m.text('[data-inf="mor"] [data-res]'), 'Na faixa');
    m.set('#rem_in', '10');
    has('Sedação: remifentanil 0,119 mcg/kg/min (7,14 mcg/kg/h) na faixa PAD', m.text('[data-inf="rem"] [data-res]'), 'Na faixa');
    m.set('#fen_in', '1');
    has('Sedação: fentanil 50 mcg/h = 0,714 mcg/kg/h na faixa (0,7–10)', m.text('[data-inf="fen"] [data-res]'), 'Na faixa');
    m.set('#dex_in', '15');
    has('Sedação: dexmed 0,857 mcg/kg/h = acima de 0,7', m.text('[data-inf="dex"] [data-res]'), 'Acima de 0,7');

    /* ============ 3. função renal ============ */
    group('3. Função renal — Devine, Cockcroft-Gault, CKD-EPI 2021');
    const R = C.renal;
    // Devine H 170 cm: 50 + 2,3 × (17,6 / 2,54) = 65,937
    near('Peso ideal homem 170 cm = 65,94 kg', R.ibw('M', 170), 65.937, 0.001);
    near('Peso ideal mulher 160 cm = 52,38 kg', R.ibw('F', 160), 52.382, 0.001);
    const w1 = R.cgWeight(70, 170, 'M');
    near('Homem 70 kg/170 cm (até 130% do ideal) usa peso ideal', w1.kg, 65.937, 0.001);
    const w2 = R.cgWeight(130, 180, 'M');
    // ideal 74,992; 130 > 1,3 × 74,992 → ajustado = 74,992 + 0,4 × 55,008 = 96,995
    near('Homem 130 kg/180 cm (obeso) usa peso ajustado = 97,0', w2.kg, 96.995, 0.001);
    const w3 = R.cgWeight(50, 180, 'M');
    eq('Peso real abaixo do ideal usa peso real', w3.kg, 50);
    eq('Sem altura usa peso real', R.cgWeight(90, NaN, 'M').kg, 90);
    // CG: (140 − 65) × 65,937 / (72 × 1,4) = 49,06
    near('CG homem 65 a, 65,94 kg, Cr 1,4 = 49,06', R.cockcroft(65, 65.937, 1.4, 'M'), 49.06, 0.01);
    // CG mulher: (140 − 80) × 52,382 / (72 × 0,6) × 0,85 = 61,84
    near('CG mulher 80 a, 52,38 kg, Cr 0,6 = 61,84', R.cockcroft(80, 52.382, 0.6, 'F'), 61.84, 0.01);
    near('CG obeso: 90 × 96,995 / 72 = 121,24', R.cockcroft(50, 96.995, 1.0, 'M'), 121.24, 0.01);
    // CKD-EPI 2021 homem 65 a, Cr 1,4: 142 × (1,4/0,9)^−1,2 × 0,9938^65 = 55,78
    near('CKD-EPI homem 65 a, Cr 1,4 = 55,78', R.ckdepi(65, 1.4, 'M'), 55.78, 0.02);
    // mulher 80 a, Cr 0,6: 142 × (0,6/0,7)^−0,241 × 0,9938^80 × 1,012 = 90,68
    near('CKD-EPI mulher 80 a, Cr 0,6 = 90,68', R.ckdepi(80, 0.6, 'F'), 90.68, 0.02);
    // homem 40 a, Cr 0,9 (r = 1): 142 × 0,9938^40 = 142 × e^(40 × ln 0,9938) = 142 × 0,77976 = 110,73
    near('CKD-EPI homem 40 a, Cr 0,9 = 110,73', R.ckdepi(40, 0.9, 'M'), 110.73, 0.02);
    isNaNt('CG sem sexo = indefinido', R.cockcroft(60, 70, 1, ''));

    /* ============ 4. gasometria (motor engine.js — mesmos casos auditados da versão anterior) ============ */
    group('4. Gasometria — Winter, compensações, Henderson-Hasselbalch, ânion gap');
    const GCFG = { agRef: 12, patm: 760, lacUnit: 'mmol' };
    const G = (r) => C.engine.compute(r, GCFG, {});
    const gfind = (res, id) => Object.values(res.ch).flat().find((i) => i.id === id) || {};
    const ab = (ph, pc, hc) => {
      const res = G({ ph, paco2: pc, hco3: hc });
      const txt = res.dx.map((x) => x.t).join(' | ');
      return { primary: res.main.t, comp: txt.toLowerCase(), consistent: !/inconsistentes/.test(txt), phHH: res.d.phHH };
    };
    let g = ab(7.25, 30, 13);
    has('pH 7,25 / PaCO₂ 30 / HCO₃ 13 = acidose metabólica', g.primary, 'Acidose metabólica');
    has('Winter 25,5–29,5; PaCO₂ 30 = acidose respiratória associada', g.comp, 'acidose respiratória associada');
    eq('Henderson-Hasselbalch consistente (7,26)', g.consistent, true);
    g = ab(7.30, 60, 28.5);
    has('Acidose resp. com HCO₃ entre agudo (26) e crônico (31) = compensação parcial', g.comp, 'compensação parcial');
    g = ab(7.27, 60, 26);
    has('Acidose resp. HCO₃ 26 = aguda', g.comp, 'aguda');
    g = ab(7.37, 60, 31);
    has('Acidose resp. compensada, pH 7,37: distúrbio compensado', g.primary, 'pH normal');
    g = ab(7.32, 60, 31);
    has('Acidose resp. HCO₃ 31 = crônica', g.comp, 'crônica');
    g = ab(7.25, 60, 22);
    has('Acidose resp. + HCO₃ 22 = misto (respiratória + metabólica)', g.primary, 'Distúrbio misto');
    g = ab(7.56, 20, 17.5);
    has('Alcalose resp. HCO₃ 17,5 entre agudo (20) e crônico (14) = parcial', g.comp, 'compensação parcial');
    g = ab(7.62, 20, 20);
    has('Alcalose resp. HCO₃ 20 = aguda', g.comp, 'alcalose respiratória aguda');
    // alcalose metabólica (Berend 2014): 0,7 × (34 − 24) + 40 = 47 ± 2
    g = ab(7.50, 45, 34);
    has('Alcalose metabólica HCO₃ 34, PaCO₂ 45 = compensação adequada (45–49)', g.comp, 'adequada');
    near('PaCO₂ esperada (Berend) = 47', gfind(G({ ph: 7.5, paco2: 45, hco3: 34 }), 'malk').v, 47, 0.001);
    g = ab(7.55, 42, 34);
    has('Alcalose metabólica HCO₃ 34, PaCO₂ 42 = alcalose respiratória associada', g.comp, 'alcalose respiratória associada');
    g = ab(7.40, 40, 15);
    eq('pH 7,40 com PaCO₂ 40 e HCO₃ 15 = inconsistente', g.consistent, false);
    near('Henderson-Hasselbalch: 6,1 + log10(15/1,2) = 7,197', g.phHH, 7.197, 0.001);

    let gr = G({ ph: 7.25, paco2: 26, hco3: 11, na: 140, cl: 100, alb: 3 });
    // AG 140 − 111 = 29; corrigido 29 + 2,5 = 31,5; Δ/Δ = (31,5 − 12) / (24 − 11) = 1,5
    near('AG corrigido pela albumina = 31,5', gfind(gr, 'agc').v, 31.5, 0.001);
    near('Δ/Δ = 1,5', gfind(gr, 'dr').v, 1.5, 0.001);
    has('Δ/Δ 1,5 → AG elevado isolado', gfind(gr, 'dr').n, 'AG alto pura');
    gr = G({ pao2: 60, fio2: 40, paco2: 40 });
    near('P/F 60 / 0,4 = 150', gfind(gr, 'pf').v, 150, 0.001);
    has('P/F 150 → faixa moderada', gfind(gr, 'pf').n, 'moderada');
    near('FiO₂ digitada como fração 0,4 dá o mesmo P/F 150', gfind(G({ pao2: 60, fio2: 0.4 }), 'pf').v, 150, 0.001);
    eq('FiO₂ 10 (inválida) não calcula P/F', !!gfind(G({ pao2: 60, fio2: 10 }), 'pf').miss, true);
    has('Valores inconsistentes geram alerta', G({ ph: 7.40, paco2: 40, hco3: 15 }).dx.map((x) => x.t).join(' | '), 'inconsistentes');

    group('4b. Berlim e FiO₂');
    has('P/F 300 = leve (≤ 300)', C.berlin(300)[1], 'leve');
    has('P/F 300,1 = sem critério', C.berlin(300.1)[1], 'Sem critério');
    has('P/F 200 = moderada (≤ 200)', C.berlin(200)[1], 'moderada');
    has('P/F 100 = grave (≤ 100)', C.berlin(100)[1], 'grave');
    eq('FiO₂ 21 → 0,21', C.fio2(21), 0.21);
    eq('FiO₂ 0,4 → 0,4', C.fio2(0.4), 0.4);
    eq('FiO₂ 1 → 1,0', C.fio2(1), 1);
    eq('FiO₂ 100 → 1,0', C.fio2(100), 1);
    isNaNt('FiO₂ 10 → inválida', C.fio2(10));
    isNaNt('FiO₂ 0,1 → inválida', C.fio2(0.1));

    /* ============ 5. CAD ============ */
    group('5. Cetoacidose diabética — ADA 2009');
    m = mount('cad');
    m.set('[data-p="peso"]', '70');
    m.set('#cGl', '450'); m.set('#cPh', '7,28'); m.set('#cHc', '16'); m.set('#cK', '4,2'); m.set('#cNa', '132');
    has('pH 7,28 + HCO₃ 16 = CAD leve', m.text('#cOut'), 'CAD leve');
    // Na corrigido = 132 + 1,6 × 3,5 = 137,6
    has('Na corrigido (1,6/100 mg/dL) = 137,6', m.text('#cOut'), '137,6');
    has('Bolus insulina 0,1 U/kg = 7,0 U', m.text('#cOut'), '7,0 U');
    has('1ª hora SF 0,9% 1 L/h para todos', m.text('#cOut'), '1ª hora: SF 0,9% 1 L/h');
    has('Glicemia não cai 10% → bolus 0,14 U/kg = 9,8 U', m.text('#cOut'), '9,8 U');
    m.set('#cHc', '12');
    has('pH 7,28 + HCO₃ 12 = moderada (vale o pior)', m.text('#cOut'), 'CAD moderada');
    m.set('#cPh', '6,95');
    has('pH 6,95 = grave', m.text('#cOut'), 'CAD grave');
    m.set('#cPh', '6,85');
    has('pH 6,85 → bicarbonato indicado', m.text('#cOut'), 'Indicado (pH');
    m.set('#cPh', '7,35'); m.set('#cHc', '22');
    has('pH 7,35 + HCO₃ 22 = sem critério de CAD', m.text('#cOut'), 'Sem critério gasométrico');
    m.set('#cPh', '7,20'); m.set('#cHc', '12'); m.set('#cK', '3,1');
    has('K 3,1 → segurar insulina, repor 20–30 mEq/h', m.text('#cOut'), '20–30 mEq K⁺/h');
    m.set('#cK', '5,2');
    has('K 5,2 → ainda repõe 20–30 mEq/L', m.text('#cOut'), '20–30 mEq de K⁺ em cada litro');
    m.set('#cK', '5,3');
    has('K 5,3 → não repor', m.text('#cOut'), 'não repor');
    m.pick('input[value="choque"]');
    has('Choque cardiogênico → sem SF 1 L/h de manutenção, monitorização', m.text('#cOut'), 'Choque cardiogênico');

    /* ============ 6. sódio ============ */
    group('6. Sódio — balanço de massa e Adrogué-Madias');
    const S = C.sodium;
    // 42 × 8 / (513 − 126) × 1000 = 868,2 mL
    near('NaCl 3% de 118 → 126 com ACT 42 L = 868,2 mL', S.vol3(42, 118, 126), 868.217, 0.01);
    near('Adrogué: 1 L de 3% com Na 118, ACT 42 = +9,19', S.adrogue(513, 118, 42), 9.186, 0.001);
    near('Déficit de água livre ACT 42, Na 162 = 6,6 L', S.waterDeficit(42, 162), 6.6, 1e-9);
    near('SG 5% de 162 → 152, ACT 42 = 2,763 L', S.volFree(42, 162, 152), 2.7632, 0.0001);
    near('SF 0,45% de 162 → 152, ACT 42 = 5,6 L', S.volHalf(42, 162, 152), 5.6, 1e-9);
    m = mount('sodio');
    m.set('[data-p="peso"]', '70');
    m.set('#nNa', '118');
    m.pick('input[value="grave"]');
    has('Na 118 = hiponatremia profunda (< 125)', m.text('#nOut'), 'profunda');
    has('Manutenção 3% = 868 mL/24 h → 36 mL/h', m.text('#nOut'), '36');
    m.set('#nNa', '162');
    has('Na 162: SG 5% 2,8 L em 24 h', m.text('#nOut'), '2,8 L');
    has('Na 162: SF 0,45% 5,6 L em 24 h', m.text('#nOut'), '5,6 L');
    m.set('#nNa', '130'); m.set('#nGl', '600');
    // 130 + 2,4 × 5 = 142 → normal (pseudo-hiponatremia por hiperglicemia)
    has('Na 130 com glicemia 600 → corrigido 142 = normal', m.text('#nOut'), 'Normal');

    /* ============ 7. SOFA, sepse, bundle ============ */
    group('7. SOFA, sepse e bundle');
    m = mount('sofa');
    const sofaPick = (sys, pts) => {
      const cards = Array.from(m.root.querySelectorAll('section.card'));
      const card = cards[['resp', 'coag', 'fig', 'cv', 'snc', 'ren'].indexOf(sys)];
      const el = card.querySelector(`input[value="${pts}"]`); el.checked = true;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    sofaPick('resp', 3); sofaPick('coag', 2); sofaPick('fig', 2); sofaPick('cv', 4); sofaPick('snc', 1); sofaPick('ren', 1);
    has('SOFA 3+2+2+4+1+1 = 13', m.text('#sofaOut'), '13');
    has('SOFA 13 → mortalidade observada 95,2% (Ferreira, ≥ 12)', m.text('#sofaOut'), '95,2%');
    sofaPick('resp', 0); sofaPick('coag', 0); sofaPick('fig', 0); sofaPick('cv', 4); sofaPick('snc', 1); sofaPick('ren', 3);
    has('SOFA 8 → 33,3%', m.text('#sofaOut'), '33,3%');
    sofaPick('ren', 0);
    has('SOFA 5 → 20,2%', m.text('#sofaOut'), '20,2%');
    m = mount('sepse');
    m.set('#lac', '2'); m.pick('#vp');
    hasNot('Lactato 2,0 com vasopressor NÃO é choque séptico (Sepsis-3 exige > 2)', m.text('#cOut'), 'Choque séptico');
    m.set('#lac', '2,1');
    has('Lactato 2,1 com vasopressor = choque séptico', m.text('#cOut'), 'Choque séptico');
    m = mount('bundle');
    m.set('[data-p="peso"]', '70');
    has('Bundle: 70 kg × 30 mL/kg = 2.100 mL', m.text('#bVol'), '2.100');

    /* ============ 8. opioides ============ */
    group('8. Equivalência de opioides');
    m = mount('opioide');
    m.pick('input[value="fen_h"]'); m.set('#eqDose', '100');
    // fentanil 100 mcg/h = morfina IV 10 mg/h = morfina VO 720 mg/dia; tramadol 720/0,2 = 3600
    has('Fentanil 100 mcg/h = morfina IV 10,0 mg/h', m.text('#eqOut'), '10,0');
    has('… = morfina VO 720 mg/dia', m.text('#eqOut'), '720');
    has('… = tramadol 3.600 mg/dia (fator CDC 0,2)', m.text('#eqOut'), '3.600');
    m.pick('input[value="tra_vo"]'); m.set('#eqDose', '400');
    // tramadol 400 × 0,2 = morfina VO 80 → IV 80/3/24 = 1,111 mg/h
    has('Tramadol 400 mg/dia = morfina IV 1,11 mg/h', m.text('#eqOut'), '1,11');
    m.pick('input[value="cod_vo"]'); m.set('#eqDose', '240');
    // codeína 240 × 0,15 = morfina VO 36
    has('Codeína 240 mg/dia = morfina VO 36,0 mg/dia', m.text('#eqOut'), '36,0');

    /* ============ 9. lidocaína, TEG ============ */
    group('9. Lidocaína e TEG');
    m = mount('lidocaina');
    m.set('[data-p="peso"]', '70');
    has('Lidocaína 70 kg: bolus 70–105 mg', m.text('#lb1'), '70–105');
    has('Lidocaína 70 kg: repetir 35–53 mg', m.text('#lb2'), '35–53');
    has('Lidocaína 70 kg: máximo 210 mg', m.text('#lbm'), '210');
    m.set('#lido_in', '30');
    // 4 mg/mL × 30 / 60 = 2 mg/min
    has('Lidocaína 2 g/500 mL a 30 mL/h = 2,00 mg/min', m.text('[data-inf="lido"] [data-res]'), '2,00');
    m = mount('teg');
    m.set('#tnK', '5');
    has('TEG: K 5 isolado → repor fibrinogênio', m.text('#tOut'), 'Repor fibrinogênio');
    m.set('#tnK', '2'); m.set('#tnLY', '8');
    has('TEG: LY30 8% → ácido tranexâmico', m.text('#tOut'), 'tranexâmico');

    /* ============ 10. ajuste renal (faixas) ============ */
    group('10. Ajuste renal — limites das faixas');
    m = mount('atb');
    m.set('#aId', '65'); m.set('#aCr', '1,4'); m.set('#aPe', '70'); m.set('#aAl', '170');
    m.pick('input[data-p="sexo"][value="M"]');
    has('Tela: Cockcroft-Gault 49,1 mL/min', m.text('#oCg'), '49,1');
    has('Tela: CKD-EPI 55,8', m.text('#oCkd'), '55,8');
    /* limites conferidos nas bulas FDA/SPC: '>' estrito vs '≥' */
    const D = (n, cl) => C.atbDose(n, cl).dose;
    has('Meropenem ClCr 50,1 → 8/8 h', D('Meropenem', 50.1), '8/8 h');
    has('Meropenem ClCr 50 → 12/12 h (bula: 26–50)', D('Meropenem', 50), '1–2 g IV 12/12 h');
    has('Meropenem ClCr 25,9 → metade da dose 12/12 h', D('Meropenem', 25.9), '0,5–1 g IV 12/12 h');
    has('Meropenem ClCr 9,9 → metade da dose 24/24 h', D('Meropenem', 9.9), '0,5–1 g IV 24/24 h');
    has('Cefepime ClCr 60,1 → 2 g 8/8 h', D('Cefepime', 60.1), '2 g IV 8/8 h');
    has('Cefepime ClCr 60 → 2 g 12/12 h (bula: 30–60)', D('Cefepime', 60), '2 g IV 12/12 h');
    has('Cefepime ClCr 29,9 → 2 g 24/24 h', D('Cefepime', 29.9), '2 g IV 24/24 h');
    has('Cefepime ClCr 10,9 → 1 g 24/24 h', D('Cefepime', 10.9), '1 g IV 24/24 h');
    has('Ceftazidima-avibactam ClCr 50,1 → 2,5 g', D('Ceftazidima-avibactam', 50.1), '2,5 g IV 8/8 h');
    has('Ceftazidima-avibactam ClCr 50 → 1,25 g 8/8 h (bula: 31–50)', D('Ceftazidima-avibactam', 50), '1,25 g IV 8/8 h');
    has('Ceftazidima-avibactam ClCr 30 → 0,94 g 12/12 h (bula: 16–30)', D('Ceftazidima-avibactam', 30), '0,94 g IV 12/12 h');
    has('Ceftazidima-avibactam ClCr 15 → 0,94 g 24/24 h', D('Ceftazidima-avibactam', 15), '0,94 g IV 24/24 h');
    has('Ceftazidima-avibactam ClCr 5 → 0,94 g 48/48 h', D('Ceftazidima-avibactam', 5), '0,94 g IV 48/48 h');
    has('Ceftazidima ClCr 31 → 1 g 12/12 h', D('Ceftazidima', 31), '1 g IV 12/12 h');
    has('Ceftazidima ClCr 30 → 1 g 24/24 h', D('Ceftazidima', 30), '1 g IV 24/24 h');
    has('Ceftazidima ClCr 5 → 500 mg 48/48 h', D('Ceftazidima', 5), '500 mg IV 48/48 h');
    has('Ertapenem ClCr 30 → 500 mg (bula: ≤ 30)', D('Ertapenem', 30), '500 mg');
    has('Ertapenem ClCr 30,1 → 1 g', D('Ertapenem', 30.1), '1 g IV 24 h');
    has('Imipenem ClCr 90 → 500 mg 6/6 h', D('Imipenem', 90), '500 mg IV 6/6 h');
    has('Imipenem ClCr 89,9 → 400 mg 6/6 h', D('Imipenem', 89.9), '400 mg');
    has('Imipenem ClCr 59,9 → 300 mg 6/6 h', D('Imipenem', 59.9), '300 mg');
    has('Imipenem ClCr 29,9 → 200 mg 6/6 h', D('Imipenem', 29.9), '200 mg');
    has('Imipenem ClCr 14,9 → não usar (salvo HD em 48 h)', D('Imipenem', 14.9), 'Não usar');
    has('Pip-tazo ClCr 40,1 → 4,5 g 6/6 h', D('Piperacilina-tazobactam', 40.1), '4,5 g IV 6/6 h');
    has('Pip-tazo ClCr 40 → 3,375 g 6/6 h (bula: 20–40)', D('Piperacilina-tazobactam', 40), '3,375 g');
    has('Pip-tazo ClCr 19,9 → 2,25 g 6/6 h + 0,75 g pós-HD', D('Piperacilina-tazobactam', 19.9), '0,75 g após cada hemodiálise');
    has('Amp-sulbactam ClCr 14,9 → 24/24 h', D('Ampicilina-sulbactam', 14.9), '24/24 h');
    has('Amp-sulbactam ClCr 4 → sem recomendação em bula', D('Ampicilina-sulbactam', 4), 'sem recomendação');
    has('Teicoplanina ClCr 80 → metade (SPC: 30–80)', D('Teicoplanina', 80), 'metade');
    has('Teicoplanina ClCr 80,1 → sem ajuste', D('Teicoplanina', 80.1), '400 mg IV 24 h');
    has('Teicoplanina ClCr 29,9 → 1/3', D('Teicoplanina', 29.9), '1/3');
    has('Gentamicina ClCr 60 → 24/24 h (Hartford)', D('Gentamicina', 60), '7 mg/kg IV 24/24 h');
    has('Gentamicina ClCr 59,9 → 36/36 h', D('Gentamicina', 59.9), '36/36 h');
    has('Gentamicina ClCr 39,9 → 48/48 h', D('Gentamicina', 39.9), '48/48 h');
    has('Gentamicina ClCr 19,9 → Hartford não se aplica', D('Gentamicina', 19.9), 'não se aplica');
    has('Fluconazol ClCr 50 → 50% (bula: ≤ 50)', D('Fluconazol', 50), '50%');
    has('Fluconazol ClCr 50,1 → dose plena', D('Fluconazol', 50.1), 'Dose plena');
    has('SMX-TMP ClCr 30 → 50% (bula: 15–30)', D('SMX-TMP', 30), '50%');
    has('SMX-TMP ClCr 14,9 → não recomendado', D('SMX-TMP', 14.9), 'não recomendado');
    has('Ciprofloxacino ClCr 30 → 200–400 mg 18–24 h', D('Ciprofloxacino', 30), '18–24 h');
    has('Ciprofloxacino ClCr 30,1 → 400 mg 8–12 h', D('Ciprofloxacino', 30.1), '400 mg IV 8–12 h');
    has('Levofloxacino ClCr 19,9 → 750 → 500 mg 48/48 h', D('Levofloxacino', 19.9), '750 mg → 500 mg 48/48 h');
    has('Daptomicina ClCr 29,9 → a cada 48 h', D('Daptomicina', 29.9), '48 h');
    has('Colistina ClCr 95 → 360 mg CBA/dia', D('Colistina', 95), '360 mg CBA/dia');
    has('Colistina ClCr 75 → 300 mg CBA/dia, 150 mg 12/12 h', D('Colistina', 75), '150 mg CBA');
    has('Colistina ClCr 55 → 245 mg CBA/dia', D('Colistina', 55), '245 mg CBA/dia');
    has('Colistina ClCr 4 → 130 mg CBA/dia', D('Colistina', 4), '130 mg CBA/dia');
    m.pick('[data-drug="Meropenem"]');
    has('Tela: meropenem com ClCr 49,1 → 12/12 h', m.text('#aRes'), '1–2 g IV 12/12 h');

    /* ============ 11. lista de pacientes ============ */
    group('11. Lista de pacientes — dados por paciente ativo');
    C.Vault.temporary();
    const P = C.Patients;
    const p1 = P.add('leito', '12');
    eq('Novo paciente vira o ativo', P.active().id, p1.id);
    eq('Rótulo do leito', P.name(p1), 'Leito 12');
    m = mount('dva', true);
    m.set('[data-p="peso"]', '80');
    eq('Peso digitado é gravado no paciente ativo (Leito 12)', P.get(p1.id).data.peso, '80');
    const p2 = P.add('ini', 'j.s.m.');
    eq('Rótulo de iniciais em maiúsculas', P.name(p2), 'J.S.M.');
    m = mount('dva', true);
    eq('Trocar de paciente troca o peso na tela (novo paciente vazio)', m.root.querySelector('[data-p="peso"]').value, '');
    m.set('[data-p="peso"]', '55');
    P.setActive(p1.id);
    m = mount('dva', true);
    eq('Voltar ao Leito 12 traz 80 kg', m.root.querySelector('[data-p="peso"]').value, '80');
    eq('Paciente duplicado é encontrado (leito " 12 ")', P.find('leito', ' 12 ').id, p1.id);
    const p3 = P.add('atd', '4587123');
    eq('Rótulo de atendimento', P.name(p3), 'Atend. 4587123');
    P.remove(p1.id);
    eq('Remover paciente o tira da lista', P.get(p1.id), null);
    P.setActive(null);
    eq('Sem paciente ativo = avulso', P.name(P.active()), 'Avulso');
    m = mount('dva', true);
    m.set('[data-p="peso"]', '70');
    eq('Avulso guarda o peso separado dos pacientes', C.Patient.get('peso'), '70');
    eq('…sem alterar o paciente J.S.M. (55 kg)', P.get(p2.id).data.peso, '55');

    /* ============ 13. motor de hemodinâmica, perfusão, ventilação e renal (Delta UTI; PESQUISA.md) ============ */
    group('13. Motor — Stewart, oxigenação, perfusão, débito, fluidos, ventilação, renal');
    let e = G({ ph: 7.30, hco3: 18, paco2: 38, na: 138, k: 4, cl: 112, alb: 2.5, lac: 1.5 });
    near('SIDa = Na + K + 2·Ca + 2·Mg − Cl − lactato (Ca/Mg assumidos)', gfind(e, 'sida').v, 138 + 4 + 2 * 1.15 + (2 * 2) / 2.43 - 112 - 1.5, 0.001);
    has('BE parcionado: efeito Na−Cl = 138 − 112 − 38 = −12', gfind(e, 'bepart').n, 'Na-Cl −12,0');
    e = G({ pao2: 80, fio2: 50, paco2: 40, sup: 'VM', peep: 8 });
    has('P/F 160 intubado com PEEP 8 → critério de SDRA moderada (definição global 2024)', e.dx.map((x) => x.t).join(' '), 'SDRA moderada');
    near('Gradiente A-a em ar ambiente: 0,21 × 713 − 40/0,8 − 90 = 9,73', gfind(G({ pao2: 90, fio2: 21, paco2: 40, age: 40 }), 'aa').v, 9.73, 0.01);
    near('ROX = (92/50)/28 = 6,57 (CNAF)', gfind(G({ sup: 'CNAF', spo2: 92, fio2: 50, fr: 28 }), 'rox').v, 6.571, 0.01);
    e = G({ height: 175, sex: 'M', vt: 420, pplat: 26, peep: 10, fr: 22, ppico: 32, paco2: 50 });
    near('Peso predito ARDSNet homem 175 cm = 70,57', e.d.pbw, 70.566, 0.001);
    near('Driving pressure 26 − 10 = 16', gfind(e, 'dp').v, 16, 0.001);
    near('Complacência 420/16 = 26,25', gfind(e, 'cst').v, 26.25, 0.001);
    near('Mechanical power 0,098 × 22 × 0,42 × (32 − 8) = 21,73', gfind(e, 'mp').v, 21.732, 0.01);
    e = G({ dvsve: 2.0, vti: 20, fc: 80, height: 170, weight: 70, pam: 70, pvc: 10, hb: 10, sao2: 98, pao2: 90, svo2: 65, pvco2: 52, paco2: 44 });
    near('DC por VTI: π × 1² × 20 × 80 / 1000 = 5,03', e.d.dcVti, 5.0265, 0.001);
    near('CaO₂ = 1,34 × 10 × 0,98 + 0,0031 × 90 = 13,41', e.d.cao2, 13.411, 0.001);
    near('Gap de CO₂ 52 − 44 = 8', gfind(e, 'gap').v, 8, 0.001);
    near('RVS = 80 × (70 − 10) / 5,03 = 955', gfind(e, 'rvs').v, 954.93, 0.5);
    has('ScvO₂ 65 % gera alerta de oferta baixa', e.dx.map((x) => x.t).join(' '), 'ScvO2 65');
    e = G({ height: 170, weight: 70, age: 60, sex: 'M', fc: 90, hb: 12, sao2: 97, svo2: 70 });
    const asc = 0.007184 * Math.pow(70, 0.425) * Math.pow(170, 0.725);
    near('Fick estimado (LaFarge): VO₂/(Ca−vO₂ × 10)', e.d.dcFick, (asc * (138.1 - 11.49 * Math.log(60) + 0.378 * 90)) / (1.34 * 12 * 0.27 * 10), 0.001);
    has('Fick estimado vem rotulado como só tendência', gfind(e, 'dcfick').n, 'só tendência');
    eq('VPP 16 % com todas as condições → responsivo', gfind(G({ ftest: 'vpp', ppv: 16, chkVc: true, chkSinus: true, chkTorax: true, vt: 600, height: 175, sex: 'M', fc: 100, fr: 18 }), 'fr_vpp').l, 'Responsivo');
    has('VPP com Vt 6 mL/kg → não interpretável, sugere tidal volume challenge', gfind(G({ ftest: 'vpp', ppv: 16, chkVc: true, chkSinus: true, chkTorax: true, vt: 420, height: 175, sex: 'M' }), 'fr_vpp').n, 'tidal volume challenge');
    eq('VPP 11 % válida → zona cinzenta (9–13 %)', gfind(G({ ftest: 'vpp', ppv: 11, chkVc: true, chkSinus: true, chkTorax: true, chkVt8: true }), 'fr_vpp').l, 'Zona cinzenta');
    eq('PLR 15 → 17 (+13 %) → responsivo (≥ 10 %)', gfind(G({ ftest: 'plr', fBase: 15, fPost: 17 }), 'fr_plr').l, 'Responsivo');
    eq('EEO + EIO por eco |+7| + |−7| = 14 % → responsivo (≥ 13 %)', gfind(G({ ftest: 'eeo', fMet: 'vti', fBase: 20, fPost: 21.4, fEio: 18.6 }), 'fr_eeo').l, 'Responsivo');
    eq('Tidal volume challenge ΔVPP 4,5 → responsivo (≥ 3,5)', gfind(G({ ftest: 'vtc', ppv6: 6, ppv8: 10.5 }), 'fr_vtc').l, 'Responsivo');
    near('CKD-EPI 2021 pelo motor = mesmo valor do ajuste renal', gfind(G({ cr: 1.0, age: 60, sex: 'M' }), 'ckd').v, C.renal.ckdepi(60, 1.0, 'M'), 0.001);
    eq('KDIGO: Cr 2,4 / basal 1,0 e diurese 0,36 mL/kg/h em 12 h → estágio 2', gfind(G({ cr: 2.4, crBase: 1.0, diu: 300, diuH: 12, weight: 70 }), 'kdigo').v, 'Estágio 2');
    near('Clearance de lactato 4 → 3 = 25 %', gfind(C.engine.compute({ lac: 3 }, GCFG, { prev: { lac: 4 }, ts: 7200000, prevTs: 0 }), 'laccl').v, 25, 0.001);
    e = G({ pam: 70, pamAlvo: 80 });
    has('PAM 70 com PAM alvo 80 da ficha → alerta pelo alvo individual', e.dx.map((x) => x.t).join(' '), 'alvo 80');
    const allRefs = Object.values(G({ sex: 'F', age: 72, height: 160, weight: 65, ph: 7.28, paco2: 48, pao2: 70, hco3: 22, sao2: 92, na: 150, k: 6.3, cl: 110, glic: 420, lac: 4.5, hb: 8, fio2: 70, alb: 2.2, ureia: 120, cr: 2.8, osmMed: 340, pvco2: 56, svo2: 62, pas: 85, pad: 45, fc: 118, pvc: 14, tec: 4.2, dvsve: 1.9, vti: 13, papm: 35, poap: 18, sup: 'VM', spo2: 93, fr: 26, vt: 380, peep: 12, pplat: 29, ppico: 36, paw: 18, fluxo: 50, crBase: 0.9, uNa: 12, uCr: 80, uUr: 400, ftest: 'vvs', svv: 14 }).ch).flat();
    eq('Todo resultado aponta para uma referência existente', allRefs.filter((i) => i.ref && !C.engine.REF[i.ref]).map((i) => i.ref).join(',') || 'ok', 'ok');
    eq('Nenhum resultado NaN com todos os campos preenchidos', allRefs.some((i) => typeof i.v === 'number' && !Number.isFinite(i.v)), false);

    /* ============ 14. calculadoras novas na tela ============ */
    group('14. Calculadoras novas — fluido-responsividade, gap de CO₂, débito, ventilação');
    m = mount('fluidos');
    m.pick('input[name="fl_ftest"][value="plr"]');
    m.set('#fl_fBase', '15'); m.set('#fl_fPost', '17');
    has('Fluido-responsividade: PLR +13 % → Responsivo', m.text('#flOut'), 'Responsivo');
    m.pick('input[name="fl_ftest"][value="vpp"]');
    m.set('#fl_ppv', '16');
    has('VPP sem as condições marcadas → não interpretável', m.text('#flOut'), 'Não interpretável');
    m = mount('gap-co2');
    m.set('#gapco2_paco2', '40'); m.set('#gapco2_pvco2', '48'); m.set('#gapco2_svo2', '74');
    has('Gap de CO₂ 8 mmHg', m.text(), '8,0');
    has('ScvO₂ normal com gap alto → interpretação de fluxo insuficiente', m.text(), 'fluxo provavelmente insuficiente');
    m = mount('debito');
    m.set('#debito_dvsve', '2'); m.set('#debito_vti', '20'); m.set('#debito_fc', '80');
    has('DC por VTI = 5,03 L/min', m.text(), '5,03');
    m = mount('ventilacao');
    m.pick('input[name="ventilacao_sex"][value="M"]'); m.set('#ventilacao_height', '175');
    m.set('#ventilacao_vt', '420'); m.set('#ventilacao_peep', '10'); m.set('#ventilacao_pplat', '28');
    has('Peso predito 70,6 kg', m.text(), '70,6');
    has('Driving pressure 18 → alerta (> 15)', m.text(), 'Driving pressure 18');

    /* ============ 15. leitos e tendência ============ */
    group('15. Leitos — ficha, registros e integração com as calculadoras');
    C.Vault.temporary();
    const pl = P.add('leito', '07');
    pl.data = { peso: '72,5', idade: '68', sexo: 'M', altura: '172', crBase: '1,1', pamAlvo: '75' };
    pl.ficha = { ini: 'jsm', com: ['DPOC'] };
    P.touch(pl);
    eq('Nome com leito + iniciais da ficha', P.name(P.get(pl.id)), 'Leito 07 · JSM');
    const dm = C.beds.demoOf(P.get(pl.id));
    eq('Ficha → motor: peso "72,5" vira 72,5', dm.weight, 72.5);
    eq('Ficha → motor: PAM alvo e comorbidades', `${dm.pamAlvo} ${dm.com.join(',')}`, '75 DPOC');
    pl.records = [{ id: 'a', ts: Date.now() - 2 * 3600e3, i: { ph: 7.29, paco2: 60, hco3: 28, lac: 4 } }, { id: 'b', ts: Date.now(), i: { ph: 7.31, paco2: 58, hco3: 28, lac: 3, cr: 2.4 } }];
    P.touch(pl);
    const rb = C.beds.calc(P.get(pl.id), P.get(pl.id).records[1]);
    near('Tendência: clearance de lactato pelo registro anterior (4 → 3 em 2 h) = 25 %', gfind(rb, 'laccl').v, 25, 0.001);
    eq('Cr basal da ficha entra no KDIGO (2,4 / 1,1 = 2,2× → estágio 2)', gfind(rb, 'kdigo').v, 'Estágio 2');
    has('DPOC da ficha gera nota na acidose respiratória', rb.dx.map((x) => x.t).join(' '), 'DPOC');

    /* ============ 16. PCR guiada — caixas do algoritmo AHA 2025 (Part 9, Figure 2; PESQUISA-ACLS.md) ============ */
    group('16. PCR guiada — algoritmo AHA 2025 caixa a caixa, temporizadores e relatório');
    const T0 = Date.UTC(2026, 9, 3, 12, 0, 0), at = (min) => T0 + min * 60000;
    const pc = { id: 't', start: T0, energia: 200, hts: {}, end: null, patientName: 'Leito 07', events: [{ t: at(0), type: 'inicio', label: 'Início da RCP' }] };
    const ev = (min, type, extra) => pc.events.push(Object.assign({ t: at(min), type, label: type }, extra));
    const gg = (min) => C.pcr.guide(pc, at(min));
    const gtxt = (min) => { const g = gg(min); return [g.now.txt, g.now.sub].concat(g.todo.map((x) => x.txt)).join(' | '); };
    has('Caixa 1: iniciar RCP, BVM com O₂, monitor/desfibrilador', gtxt(0.2), 'Iniciar RCP');
    ev(0.5, 'ritmo', { v: 'fv' });
    eq('FV identificada → caixa 3 (choque)', gg(0.5).now.box, 3);
    hasNot('Antes do 1º choque: sem adrenalina', gtxt(0.5), 'Adrenalina');
    ev(0.6, 'choque', { v: 200 });
    eq('Após o 1º choque → caixa 4', C.pcr.derive(pc, at(0.7)).box, 4);
    has('Caixa 4: RCP 2 min + acesso IV/IO', gtxt(0.7), 'acesso IV/IO');
    has('Acesso: IV primeiro, IO se falhar', gtxt(0.7), 'Acesso IV (IO se o IV falhar)');
    hasNot('Caixa 4: ainda sem adrenalina', gtxt(0.7), 'Adrenalina 1 mg');
    eq('Ciclo de 2 min conta a partir do choque', Math.round(C.pcr.derive(pc, at(1.6)).cycleLeft / 1000), 60);
    has('Fim do ciclo → checar ritmo e pulso (até 10 s)', gtxt(2.7), 'Checar ritmo e pulso');
    ev(2.6, 'ritmo', { v: 'fv' });
    eq('FV na 2ª checagem → caixa 5', gg(2.6).now.box, 5);
    ev(2.7, 'choque', { v: 200 });
    eq('Após o 2º choque → caixa 6', C.pcr.derive(pc, at(2.8)).box, 6);
    has('Caixa 6: adrenalina 1 mg', gtxt(2.8), 'Adrenalina 1 mg IV/IO');
    has('Caixa 6: considerar via aérea avançada e capnografia', gtxt(2.8), 'via aérea avançada');
    hasNot('Caixa 6: sem antiarrítmico', gtxt(2.8), 'Amiodarona');
    ev(3.1, 'epi'); ev(4.7, 'ritmo', { v: 'fv' }); ev(4.8, 'choque', { v: 200 });
    eq('Após o 3º choque → caixa 8', C.pcr.derive(pc, at(5)).box, 8);
    has('Caixa 8: amiodarona 300 mg ou lidocaína 1–1,5 mg/kg', gtxt(5), 'Amiodarona 300 mg IV/IO ou lidocaína 1–1,5 mg/kg');
    has('Caixa 8: tratar causas reversíveis', gtxt(5), 'causas reversíveis');
    hasNot('Caixa 8: adrenalina não é pedida (vem na caixa 6, a cada 2 ciclos)', gtxt(6.2), 'Adrenalina 1 mg');
    ev(5, 'amio', { v: 300 }); ev(6.8, 'ritmo', { v: 'fv' }); ev(6.9, 'choque');
    eq('Caixa 8 → losango → caixa 5 → caixa 6 (4º choque)', C.pcr.derive(pc, at(7)).box, 6);
    has('Caixa 6 de novo: adrenalina há 3:54 (a cada 3–5 min)', gtxt(7), 'última há 03:54');
    eq('Adrenalina há ≥ 5 min: lembrete crítico', gg(8.2).todo.find((x) => x.act === 'epi').sev, 'crit');
    ev(8.9, 'ritmo', { v: 'fv' }); ev(9, 'choque');
    eq('5º choque → 2ª passagem pela caixa 8', C.pcr.derive(pc, at(9.1)).pass8, 2);
    has('2ª passagem pela caixa 8: amiodarona 150 mg (2ª dose)', gtxt(9.1), 'Amiodarona 150 mg');
    ev(9.2, 'amio', { v: 150 });
    hasNot('Depois da 2ª dose: nenhum antiarrítmico adicional', gtxt(9.3), 'Amiodarona');
    ev(11, 'ritmo', { v: 'assist' });
    eq('Não chocável após a caixa 8 → caixa 12 → caixa 10', C.pcr.derive(pc, at(11.1)).box, 10);
    hasNot('Assistolia: não sugere choque', gtxt(11.1), 'Choque');
    has('Caixa 10: adrenalina pendente (última há 8:00)', gtxt(11.1), 'última há 08:00');
    ev(11.2, 'epi'); ev(13, 'ritmo', { v: 'assist' });
    eq('Caixa 10 → caixa 11', C.pcr.derive(pc, at(13.1)).box, 11);
    has('Caixa 11: tratar causas reversíveis', gtxt(13.1), 'tratar causas reversíveis');
    hasNot('Caixa 11: sem adrenalina', gtxt(13.1), 'Adrenalina 1 mg');
    ev(13.5, 'via', { v: 'iot' });
    has('IOT → capnografia contínua', gtxt(13.6), 'Capnografia contínua');
    ev(14, 'etco2', { v: 8 });
    has('ETCO₂ 8 → reavaliar a qualidade da RCP', gtxt(14.1), 'reavaliar a qualidade');
    ev(14.5, 'etco2', { v: 25 });
    has('ETCO₂ sobe > 10 mmHg → pode indicar RCE', gtxt(14.6), 'pode indicar RCE');
    ev(15, 'ritmo', { v: 'assist' });
    eq('Caixa 11 → caixa 12 → caixa 10', C.pcr.derive(pc, at(15.1)).box, 10);
    has('Caixa 10: adrenalina de novo (a cada 2 ciclos)', gtxt(15.1), 'última há 03:54');
    ev(21, 'etco2', { v: 9 });
    has('ETCO₂ ≤ 10 após 20 min intubado → componente de decisão multimodal', gtxt(21.1), 'decisão multimodal');
    ev(22, 'ritmo', { v: 'rce' });
    has('RCE → cuidados pós-parada', gtxt(22.1), 'pós-parada');
    const ds = C.pcr.derive(pc, at(22.5));
    eq('Contagem: 5 choques, 2 adrenalinas, 2 amiodaronas', `${ds.shocks} ${ds.epi.length} ${ds.amio}`, '5 2 2');
    eq('Ritmo inicial = FV', ds.firstRhythm, 'fv');
    const pc2 = { start: T0, hts: {}, events: [{ t: at(0), type: 'inicio' }, { t: at(0.5), type: 'ritmo', v: 'aesp' }, { t: at(0.6), type: 'epi' }, { t: at(2.6), type: 'ritmo', v: 'fv' }, { t: at(2.7), type: 'choque', v: 200 }] };
    eq('AESP → FV: "Go to 5" → após o choque, caixa 6', C.pcr.derive(pc2, at(2.8)).box, 6);
    eq('Caixa 9: adrenalina o mais rápido possível', C.pcr.guide({ start: T0, hts: {}, events: [{ t: at(0), type: 'inicio' }, { t: at(0.5), type: 'ritmo', v: 'assist' }] }, at(0.6)).todo[0].txt, 'Adrenalina 1 mg IV/IO o mais rápido possível');
    eq('Sem energia definida, o 1º choque pede a energia do fabricante', C.pcr.guide({ start: T0, energia: null, hts: {}, events: [{ t: at(0), type: 'inicio' }, { t: at(0.5), type: 'ritmo', v: 'fv' }] }, at(0.6)).now.txt, 'Choque (energia do fabricante) e retomar a RCP imediatamente');
    const refsUsed = new Set();
    [0.2, 0.7, 2.8, 5, 7, 9.1, 11.1, 13.1, 13.6, 14.1, 14.6, 21.1, 22.1].forEach((m) => { const g = gg(m); if (g.now.ref) refsUsed.add(g.now.ref); g.todo.forEach((t) => t.ref && refsUsed.add(t.ref)); });
    eq('Toda orientação tem fonte com trecho literal e link', [...refsUsed].filter((r) => !(C.pcr.REF[r] && C.pcr.REF[r].q && /^https:\/\/cpr\.heart\.org\//.test(C.pcr.REF[r].u))).join(',') || 'ok', 'ok');
    pc.end = at(23); pc.outcome = 'rce'; pc.hts = { hipoxia: true };
    const rpt = C.pcr.report(pc).text;
    has('Relatório: duração 23:00', rpt, 'duração 23:00');
    has('Relatório: choques', rpt, 'Choques: 5');
    has('Relatório: adrenalina com os tempos', rpt, 'Adrenalina 1 mg: 2 dose(s) — 03:06, 11:12');
    has('Relatório: causas consideradas', rpt, 'Hipóxia');
    has('Relatório: desfecho com horário do RCE', rpt, 'RCE em 22:00');
    has('Relatório: linha do tempo', rpt, '22:00 · ');
    has('Relatório: cita a diretriz', rpt, 'AHA 2025');

    /* ============ 17. leitura por foto: texto do ticket → campos ============ */
    group('17. Leitura do ticket do gasômetro (texto do OCR → campos, unidades do app)');
    const SC = C.scan;
    const val = (r, f) => { const it = r.items.find((x) => x.fid === f); return it ? it.v : undefined; };
    const on = (r, f) => { const it = r.items.find((x) => x.fid === f); return it ? it.sure : undefined; };
    /* Radiometer ABL90 em português (ticket real de 03/10/2026, sem identificação) */
    const abl = SC.parse([
      'RADIOMETER SÉRIE ABL90',
      'ABL90 ABL 90 UTI ADULTO I393-090R0415N0 01:05 3/10/2026',
      'REL. DO PACIENTE Seringa - S 65uL Amostra # 31447',
      'Tipo de amostra Arterial', 'T 37,0 °C',
      '↓ pH 7,273 [ 7,370 - 7,450 ]',
      '↓ pCO₂ 18,6 mmHg [ 35,0 - 46,0 ]',
      '↑ pO₂ 234,5 mmHg [ 70,0 - 100,0 ]',
      'ABEc -16,6 mmol/L',
      'cHCO₃⁻(P)c 8,6 mmol/L',
      'ctCO₂(B)c 8,5 mmol/L',
      '↓ sO₂ 95,8 % [ 96,0 - ]',
      '↑ FMetHb 2,2 % [ - 1,5 ]', 'FCOHb 0,0 %',
      '↑ cNa⁺ 149 meq/L [ 135 - 145 ]',
      'cK⁺ 3,3 meq/L',
      'cCa²⁺ 1,32 mmol/L [ 1,15 - 1,35 ]',
      '↑ cCl⁻ 118 meq/L [ 95 - 105 ]',
      'cGlu 88 mg/dL [ 70 - 115 ]',
      '↑ cLac 60 mg/dL [ 5 - 20 ]',
      'Hctc 23,4 %', 'ctHb 7,6 g/dL', 'ctBil 5,8 mg/dL',
      'Lote Cart. Soluções: RF-04', 'Impresso 01:06:41 3/10/2026', 'Cass. série #: 2720-295',
    ].join('\n'));
    eq('ABL90: pH 7,273 (vírgula decimal, seta ↓)', val(abl, 'ph'), 7.273);
    eq('ABL90: PaCO₂ 18,6', val(abl, 'paco2'), 18.6);
    eq('ABL90: PaO₂ 234,5', val(abl, 'pao2'), 234.5);
    eq('ABL90: HCO₃ 8,6 (cHCO₃⁻(P), não o ctCO₂ 8,5)', val(abl, 'hco3'), 8.6);
    eq('ABL90: SaO₂ 95,8 (não FMetHb/FCOHb)', val(abl, 'sao2'), 95.8);
    eq('ABL90: Na 149 · K 3,3 · Cl 118', [val(abl, 'na'), val(abl, 'k'), val(abl, 'cl')].join(' '), '149 3.3 118');
    eq('ABL90: Ca iônico 1,32', val(abl, 'ica'), 1.32);
    eq('ABL90: glicose 88 mg/dL', val(abl, 'glic'), 88);
    eq('ABL90: lactato 60 mg/dL → 6,66 mmol/L', val(abl, 'lac'), 6.66);
    eq('ABL90: Hb 7,6 (não Hct 23,4)', val(abl, 'hb'), 7.6);
    eq('ABL90: ABE lido (−16,6) mas vem desmarcado (o app usa SBE)', `${val(abl, 'be')} ${on(abl, 'be')}`, '-16.6 false');
    eq('ABL90: amostra arterial detectada', abl.sample, 'art');
    eq('ABL90: nenhum campo a mais (bilirrubina, cabeçalho, data)', abl.items.map((x) => x.fid).join(','), 'ph,paco2,pao2,hco3,be,sao2,na,k,cl,ica,glic,lac,hb');
    /* o mesmo ticket como o OCR costuma devolver: setas viram letras, subscritos viram vírgula, 0↔O */
    const noisy = SC.parse(['4 pH 7,273 [ 7,370 - 7,450 ]', 't pCO, 18,6 mmHg [ 35,0 - 46,0 ]', 't p0, 234.5 mmHg', 'cHCO;-(P)c 8 ,6 mmoV/L', '| s0, 95,8 %', 't cNa* 149 meq/L', 'cK* 3,3 meq/L', 'cCa?* 1,32 mmol/L', 't cCI 118 meq/L', 't cLac 60 mg/dL [ 5 - 20 ]', 'ctHb 7,6 g/dL'].join('\n'));
    eq('OCR ruidoso: pH, PaCO₂, PaO₂, HCO₃', [val(noisy, 'ph'), val(noisy, 'paco2'), val(noisy, 'pao2'), val(noisy, 'hco3')].join(' '), '7.273 18.6 234.5 8.6');
    eq('OCR ruidoso: SaO₂, Na, K, Ca, Cl', [val(noisy, 'sao2'), val(noisy, 'na'), val(noisy, 'k'), val(noisy, 'ica'), val(noisy, 'cl')].join(' '), '95.8 149 3.3 1.32 118');
    eq('OCR ruidoso: lactato convertido e Hb', [val(noisy, 'lac'), val(noisy, 'hb')].join(' '), '6.66 7.6');
    /* outros formatos */
    const kpa = SC.parse('Sample type: Venous\npH 7.35\npCO2 6.0 kPa\npO2 5.3 kPa\ncHCO3-(P,st)c 22.1 mmol/L\ncHCO3-(P)c 24.0 mmol/L\ncBase(Ecf)c -1.2 mmol/L\npH(T) 7.31\ncCa2+(7.4)c 1.10 mmol/L\ncCa2+ 1.16 mmol/L\ncGlu 6.0 mmol/L\nctHb 140 g/L\nFO2(I) 40.0 %\npO2(A-a)e 120 mmHg');
    eq('kPa → mmHg (PCO₂ 6,0 kPa = 45,0)', val(kpa, 'paco2'), 45);
    eq('Amostra venosa detectada', kpa.sample, 'ven');
    eq('HCO₃ padrão (P,st) é ignorado; fica o real 24,0', val(kpa, 'hco3'), 24);
    eq('cBase(Ecf) = SBE, marcado', `${val(kpa, 'be')} ${on(kpa, 'be')}`, '-1.2 true');
    eq('pH(T) não substitui o pH a 37 °C', val(kpa, 'ph'), 7.35);
    eq('Ca²⁺ normalizado (7,4) é ignorado', val(kpa, 'ica'), 1.16);
    eq('Glicose 6,0 mmol/L → 108 mg/dL', val(kpa, 'glic'), 108);
    eq('Hb 140 g/L → 14 g/dL', val(kpa, 'hb'), 14);
    eq('FO2(I) do Radiometer = FiO₂', val(kpa, 'fio2'), 40);
    eq('PO₂(A-a) não vira PaO₂', val(kpa, 'pao2'), 39.8);
    const gem = SC.parse('pH 7.12 L\nPCO2 61 H mmHg\nHCO3- 19.4\nBEecf -10.5\nNa+ 131   K+ 6.8\nLac 1.9 mmol/L\nFIO2 0.5\nSO2 88 %\nGlu 412');
    eq('Duas colunas na mesma linha (Na e K)', `${val(gem, 'na')} ${val(gem, 'k')}`, '131 6.8');
    eq('BEecf = SBE', val(gem, 'be'), -10.5);
    eq('FiO₂ em fração 0,5 → 50 %', val(gem, 'fio2'), 50);
    eq('Sem amostra informada → indefinida', gem.sample, null);
    const absurd = SC.parse('pH 72.7\nK+ 0.2');
    eq('Fora da faixa plausível vem desmarcado', `${on(absurd, 'ph')} ${on(absurd, 'k')}`, 'false false');
    /* vírgula apagada no papel térmico (visto na foto real do ABL90) */
    const lost = SC.parse('pCO, 186 mmHg\npO, 2345 mmHg\ncK* 33 megl\nctHb 76 gdl\nt cClI 118 meg\nt clLac 60 mg/dl');
    eq('"186" mmHg → 18,6 sugerido, mas desmarcado (pode ser dígito trocado)', `${val(lost, 'paco2')} ${on(lost, 'paco2')}`, '18.6 false');
    eq('"2345" mmHg → 234,5 sugerido, desmarcado (23,45 também seria plausível)', `${val(lost, 'pao2')} ${on(lost, 'pao2')}`, '234.5 false');
    eq('"33" K → 3,3 · "76" Hb → 7,6', `${val(lost, 'k')} ${val(lost, 'hb')}`, '3.3 7.6');
    eq('Rótulos deformados: cClI → Cl, clLac → Lac', `${val(lost, 'cl')} ${val(lost, 'lac')}`, '118 6.66');
    /* bicarbonato com o rótulo deformado pelo OCR (visto na foto real) */
    const hc = SC.parse('HCO, "(Plc       8.6 mmol.\n¢HCO,;"(P)¢ 8.6 mmoll');
    eq('HCO₃ com parêntese aberto ("HCO, "(Plc")', val(hc, 'hco3'), 8.6);
    eq('HCO₃ com subscrito lido como vírgula ("cHCOs", "HC03")', `${val(SC.parse('cHCOs 24.1'), 'hco3')} ${val(SC.parse('HC03 22'), 'hco3')}`, '24.1 22');
    eq('ctCO₂ continua não sendo HCO₃', val(SC.parse('ctCO,(B)¢ 8.5 mmol'), 'hco3'), undefined);
    /* ticket venoso do ABL90 */
    eq('"Tipo de amostra Venosa" → amostra venosa', SC.parse('Tipo de amostra Venosa\npH 7.21\npCO2 52.0 mmHg').sample, 'ven');
    /* coerência interna do ticket */
    const bad = SC.parse('pH 7.213\npCO2 18.6 mmHg\ncHCO3-(P)c 8.6 mmol/L');
    eq('pH 7,213 com PaCO₂ 18,6 e HCO₃ 8,6 não fecha (HH): os três desmarcados', ['ph', 'paco2', 'hco3'].map((f) => on(bad, f)).join(' '), 'false false false');
    eq('Ticket real fecha (HH): seguem marcados', ['ph', 'paco2', 'hco3'].map((f) => on(abl, f)).join(' '), 'true true true');
    const sgn = SC.parse('pH 7.273\npCO2 18.6 mmHg\ncHCO3-(P)c 8.6\ncBase(Ecf)c 16.6');
    eq('SBE +16,6 com pH 7,27 e HCO₃ 8,6: sinal perdido → desmarcado', on(sgn, 'be'), false);
    /* votação entre leituras independentes */
    const rA = SC.parse('pH 7.273\nsO2 95.8 %\npCO2 18.6 mmHg\ncK+ 3.3'), rB = SC.parse('pH 7.273\nsO2 85.8 %\nNa+ 149\ncK+ 3.3'), rC = SC.parse('pH 7.273\nsO2 95.8 %\npCO2 186 mmHg');
    const vt = SC.vote([rA, rB, rC]);
    eq('Votação: três leituras iguais → marcado', `${val(vt, 'ph')} ${on(vt, 'ph')}`, '7.273 true');
    eq('Votação: 95,8 × 85,8 → vence 95,8, mas desmarcado', `${val(vt, 'sao2')} ${on(vt, 'sao2')}`, '95.8 false');
    eq('Votação: 18,6 lido + "186" corrigido para 18,6 → concordam, marcado', `${val(vt, 'paco2')} ${on(vt, 'paco2')}`, '18.6 true');
    eq('Votação: lido uma vez só (Na) → desmarcado', `${val(vt, 'na')} ${on(vt, 'na')}`, '149 false');
    eq('Votação: duas de três concordam, nenhuma discorda (K) → marcado', on(vt, 'k'), true);
  } catch (e) {
    rec(false, 'Erro de execução', 'sem erro', e.message + ' ' + (e.stack || '').split('\n')[1]);
  }

  /* ============ 12. criptografia (assíncrono, usa o localStorage real; o original é restaurado ao sair) ============ */
  async function cryptoTests() {
    group('12. Cofre criptografado — AES-256-GCM + PBKDF2');
    const V = C.Vault;
    const raw = () => localStorage.getItem('plantao:vault') || '';
    try {
      V.wipe();
      eq('Sem cofre no início', V.exists(), false);
      localStorage.setItem('plantao:favs', JSON.stringify(['dva']));
      localStorage.setItem('plantao:patient', JSON.stringify({ v: { peso: '77' }, t: Date.now() }));
      await V.create('senha-teste-1');
      eq('Cofre criado e aberto', V.exists() && V.isOpen(), true);
      eq('Dados antigos em texto claro migram para o cofre', JSON.stringify(C.store.get('favs')), '["dva"]');
      eq('…e são apagados do armazenamento aberto', localStorage.getItem('plantao:favs'), null);
      C.Patients.add('leito', 'UTI-07');
      C.Patient.set('peso', '83,5');
      await V.flush();
      const blob = raw();
      eq('Nada legível no disco: identificação do paciente', blob.includes('UTI-07'), false);
      eq('Nada legível no disco: peso', blob.includes('83,5'), false);
      eq('Nada legível no disco: senha', blob.includes('senha-teste-1'), false);
      const v = JSON.parse(blob);
      eq('Parâmetros: PBKDF2-SHA256, 600 000 iterações', `${v.kdf} ${v.iter}`, 'PBKDF2-SHA256 600000');
      eq('Sal de 16 bytes', atob(v.salt).length, 16);
      eq('IV de 12 bytes (AES-GCM)', atob(v.data.iv).length, 12);
      await V.lock();
      eq('Bloqueado: dados inacessíveis', C.store.get('patients', 'nada'), 'nada');
      eq('Senha errada não abre', await V.unlock('senha-errada'), false);
      eq('Senha certa abre', await V.unlock('senha-teste-1'), true);
      eq('Dados íntegros após reabrir', C.Patients.active() && C.Patients.name(C.Patients.active()) + ' ' + C.Patient.get('peso'), 'Leito UTI-07 83,5');
      const iv1 = JSON.parse(raw()).data.iv;
      C.store.set('x', 1); await V.flush();
      eq('IV novo a cada gravação', JSON.parse(raw()).data.iv !== iv1, true);
      eq('Trocar senha exige a senha atual', await V.changePassword('errada', 'nova-senha-2'), false);
      eq('Trocar senha', await V.changePassword('senha-teste-1', 'nova-senha-2'), true);
      await V.lock();
      eq('Senha antiga deixa de funcionar', await V.unlock('senha-teste-1'), false);
      eq('Senha nova funciona e mantém os dados', (await V.unlock('nova-senha-2')) && C.Patient.get('peso'), '83,5');
      await V.lock();
      const t = JSON.parse(raw());
      const ct = atob(t.data.ct).split(''); ct[5] = String.fromCharCode(ct[5].charCodeAt(0) ^ 1); t.data.ct = btoa(ct.join(''));
      localStorage.setItem('plantao:vault', JSON.stringify(t));
      let tampered = 'abriu';
      try { tampered = (await V.unlock('nova-senha-2')) ? 'abriu' : 'recusou'; } catch (e) { tampered = 'recusou'; }
      eq('Dados adulterados são recusados (autenticação GCM)', tampered, 'recusou');
      V.wipe();
      await V.create('senha-teste-3'); await V.lock();
      for (let i = 0; i < 5; i++) await V.unlock('x' + i);
      eq('Após 5 erros: espera obrigatória', V.waitMs() > 25000, true);
      let blocked = false;
      try { await V.unlock('senha-teste-3'); } catch (e) { blocked = e.message === 'espera'; }
      eq('Durante a espera nem a senha certa é testada', blocked, true);
      V.wipe();
      eq('Apagar tudo remove o cofre', V.exists(), false);
    } catch (e) {
      rec(false, 'Erro de execução (cofre)', 'sem erro', e.message);
    }
  }

  cryptoTests().then(() => {
    document.getElementById('out').innerHTML = rows.join('');
    const s = document.getElementById('sum');
    s.className = fail ? 'bad' : 'ok';
    s.textContent = `${pass} testes OK · ${fail} falharam`;
    window.__testResult = { pass, fail };
    document.getElementById('sandbox').innerHTML = '';
  });
})();
