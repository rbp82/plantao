/* Drogas vasoativas (DVA) + noradrenalina concentrada */
(function () {
  'use strict';
  const C = window.Calc;

  const DRUGS = [
    {
      id: 'nor', name: 'Noradrenalina', sub: 'Vasopressor · α1 > β1', amt: 16, amtU: 'mg', vol: 250,
      dose: 'mcg/kg/min', range: [0.01, 3], alt: ['mcg/min'],
      alerts: (d) => d > 1 ? [['warn', 'Dose > 1 mcg/kg/min — rever estratégia vasopressora ou associar vasopressina.']] : [],
    },
    {
      id: 'norc', name: 'Noradrenalina concentrada', sub: 'Diluição travada · acesso central', amt: 20, amtU: 'mg', vol: 100, locked: true,
      dose: 'mcg/kg/min', range: [0.01, 3], alt: ['mcg/min'],
      note: '200 mcg/mL. Confirmar acesso venoso central antes de infundir.',
      alerts: (d) => d > 1 ? [['warn', 'Dose > 1 mcg/kg/min — rever estratégia vasopressora ou associar vasopressina.']] : [],
    },
    {
      id: 'vaso', name: 'Vasopressina', sub: 'Agonista V1 · independe do peso', amt: 100, amtU: 'UI', vol: 250,
      dose: 'UI/min', range: [0.01, 0.04], alt: ['UI/h'],
    },
    {
      id: 'dob', name: 'Dobutamina', sub: 'Inotrópico · β1', amt: 250, amtU: 'mg', vol: 250,
      dose: 'mcg/kg/min', range: [2, 20], alt: ['mcg/min'],
    },
    {
      id: 'dopa', name: 'Dopamina', sub: 'Dopaminérgico · β · α (dose-dependente)', amt: 200, amtU: 'mg', vol: 250,
      dose: 'mcg/kg/min', alt: ['mcg/min'],
      /* bula (Baxter): 0,5–2 dopaminérgica · 2–10 β1 · 10–20 algum efeito α · > 20 α predominante */
      band: (d) => {
        d = Math.round(d * 1e9) / 1e9;
        return d < 2 ? { cls: 'ok', txt: 'Faixa dopaminérgica (0,5–2)' }
          : d <= 10 ? { cls: 'warn', txt: 'Faixa β1 inotrópica (2–10)' }
          : d <= 20 ? { cls: 'crit', txt: 'β1 + efeito α (10–20)' }
          : { cls: 'crit', txt: 'α predominante (> 20)' };
      },
      note: 'Dose baixa não tem efeito protetor renal comprovado.',
    },
    {
      id: 'nitro', name: 'Nitroprussiato', sub: 'Vasodilatador misto', amt: 50, amtU: 'mg', vol: 250,
      dose: 'mcg/kg/min', range: [0.3, 10], alt: ['mcg/min'],
      note: 'Proteger da luz. Máximo 10 mcg/kg/min (no máximo, o tamponamento de cianeto se esgota em menos de 1 h). TFG &lt; 30: média abaixo de 3 mcg/kg/min; anúrico: 1 mcg/kg/min.',
      alerts: (d) => d > 2 ? [['warn', 'Acima de 2 mcg/kg/min há acúmulo de cianeto — usar pelo menor tempo possível, monitorar acidose metabólica.']] : [],
    },
    {
      id: 'ntg', name: 'Nitroglicerina', sub: 'Vasodilatador venoso · independe do peso', amt: 25, amtU: 'mg', vol: 250,
      dose: 'mcg/min', alt: ['mcg/kg/min'],
      /* bula: início 5 mcg/min, sem dose máxima definida; 5–200 é a faixa habitual */
      band: (d) => {
        d = Math.round(d * 1e9) / 1e9;
        return d < 5 ? { cls: 'warn', txt: 'Abaixo da dose inicial (5)' }
          : d <= 200 ? { cls: 'ok', txt: 'Faixa habitual (5–200)' }
          : { cls: 'warn', txt: 'Acima de 200 — sem máximo em bula; reavaliar' };
      },
      note: 'Iniciar 5 mcg/min; aumentar 5 mcg/min a cada 3–5 min; sem resposta em 20, passos de 10–20 mcg/min.',
    },
    {
      id: 'mil', name: 'Milrinona', sub: 'Inodilatador · inibidor PDE3', amt: 20, amtU: 'mg', vol: 250,
      dose: 'mcg/kg/min', range: [0.375, 0.75], alt: ['mcg/min'],
      note: 'Reduzir a dose na disfunção renal (eliminação renal).',
    },
  ];

  C.register({
    id: 'dva', group: 'hemo', tile: 'DVA', weight: true,
    title: 'Drogas vasoativas',
    sub: 'Nora, vasopressina, dobuta, dopa, nitro, milrinona',
    keywords: ['noradrenalina', 'norepinefrina', 'nora', 'concentrada', 'vasopressina', 'dobutamina', 'dopamina', 'nitroprussiato', 'nipride', 'nitroglicerina', 'tridil', 'milrinona', 'vasopressor', 'inotropico', 'bomba', 'ml/h', 'mcg/kg/min', 'choque'],
    render(body, api, root) {
      const modeName = C.uid('mode');
      body.innerHTML = `
        <div class="mode">${C.tabs(modeName, [['dose', 'mL/h → dose'], ['rate', 'Dose → mL/h']], C.store.get('dvaMode', 'dose'))}</div>
        ${DRUGS.map(C.infCard).join('')}
        <p class="ref">Diluições padrão em SF/SG 250 mL (UTI adulto) — toque na diluição para alterar; a alteração fica salva neste aparelho. Faixas de dose conforme bula/UpToDate; titular pela resposta clínica.</p>
      `;
      const getMode = () => C.radioVal(body, modeName);
      const getPeso = () => C.peso(root);
      const calc = C.bindInf(root, DRUGS, getPeso, getMode);
      body.querySelectorAll(`input[name="${modeName}"]`).forEach((r) => r.addEventListener('change', () => {
        C.store.set('dvaMode', getMode());
        body.querySelectorAll('[data-inf] input[id$="_in"]').forEach((i) => (i.value = ''));
        calc();
      }));
      root.addEventListener('input', (e) => { if (!e.target.closest || !e.target.closest('[data-inf]')) calc(); });

      api.summary = () => C.infSummary(body, DRUGS, getMode(), getPeso());
    },
  });
})();
