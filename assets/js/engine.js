/* Motor de cálculo de gasometria, hemodinâmica, perfusão, fluidos, ventilação e função renal.
   Funções puras, sem DOM. Origem: Delta UTI (pesquisa adversarial documentada em PESQUISA.md),
   com a lógica ácido-base alinhada às correções auditadas do Plantão (AUDITORIA.md §8). */
(function () {
  'use strict';
  const C = window.Calc;
  // Fórmulas e cortes documentados em PESQUISA.md. v=true => verificado na pesquisa adversarial.

  const H = (x) => x !== undefined && x !== null && x !== '' && Number.isFinite(+x);

  function fmt(v, dec = 0) {
    if (v == null || !Number.isFinite(v)) return '--';
    const s = (Math.round(v * 10 ** dec) / 10 ** dec).toFixed(dec);
    return s.replace('.', ',').replace(/^-/, '−');
  }

  // ---------------------------------------------------------------- referências
  const REF = {
    primary: { t: 'Distúrbio primário (Boston)', f: 'pH < 7,35 acidemia · pH > 7,45 alcalemia\nPrimário: componente que se desvia de PaCO2 40 / HCO3 24 na direção do pH', c: 'Os dois componentes na direção do pH = distúrbio misto. pH normal com PaCO2/HCO3 alterados = compensação completa ou distúrbios que se anulam.', s: 'Abordagem fisiológica; AUDITORIA.md §8' },
    winter: { t: 'Compensação — acidose metabólica (Winter)', f: 'PaCO2 esperada = 1,5 × HCO3 + 8 ± 2', c: 'PaCO2 acima: acidose respiratória associada · abaixo: alcalose respiratória associada.', s: 'Albert, Dell & Winter 1967' },
    malk: { t: 'Compensação — alcalose metabólica', f: 'PaCO2 esperada = 0,7 × (HCO3 − 24) + 40 ± 2', c: 'Compensação raramente leva PaCO2 > 55 mmHg.', s: 'Berend K et al., NEJM 2014;371:1434' },
    racomp: { t: 'Compensação — acidose respiratória', f: 'Aguda: HCO3 sobe 1 por 10 mmHg de PaCO2\nCrônica: HCO3 sobe 3,5 por 10 mmHg', c: 'Abaixo do agudo (− 1,5): acidose metabólica associada · até o agudo (+ 1,5): aguda · crônico ± 2: crônica · acima do crônico (+ 2): alcalose metabólica associada · entre os dois: compensação parcial.', s: 'Regras de Boston; AUDITORIA.md §8' },
    ralkcomp: { t: 'Compensação — alcalose respiratória', f: 'Aguda: HCO3 cai 2 por 10 mmHg de PaCO2\nCrônica: HCO3 cai 5 por 10 mmHg', c: 'Acima do agudo (+ 1,5): alcalose metabólica associada · crônico ± 2,5: crônica · abaixo do crônico: acidose metabólica associada · entre os dois: compensação parcial.', s: 'Regras de Boston; AUDITORIA.md §8' },
    hh: { t: 'Consistência Henderson-Hasselbalch', f: 'pH calculado = 6,1 + log10(HCO3 / (0,03 × PaCO2))', c: 'Diferença > 0,05 do pH medido sugere erro de digitação ou de coleta.', s: 'Henderson-Hasselbalch' },
    ag: { t: 'Ânion gap', f: 'AG = Na − (Cl + HCO3)', c: 'Referência ajustável (padrão 12 ± 4 mEq/L, sem K). Depende do analisador.', s: 'Kraut & Madias' },
    agc: { t: 'AG corrigido pela albumina', f: 'AGc = AG + 2,5 × (4 − albumina g/dL)', c: 'Hipoalbuminemia mascara AG elevado. Usar AGc em pacientes críticos.', s: 'Figge 1998' },
    dr: { t: 'Delta ratio (delta-delta)', f: 'ΔAG / ΔHCO3 = (AGc − 12) / (24 − HCO3)', c: '< 0,4: acidose hiperclorêmica (AG normal)\n0,4–0,8: AG alto + hiperclorêmica\n0,8–2,0: AG alto pura\n> 2,0: AG alto + alcalose metabólica (ou acidose resp. crônica)', s: 'Wrenn 1990; LITFL' },
    sbe: { t: 'Base excess padrão (calculado)', f: 'SBE = 0,9287 × [HCO3 − 24,4 + 14,83 × (pH − 7,40)]', c: 'Normal −2 a +2 mmol/L.', s: 'Van Slyke / CLSI' },
    sida: { t: 'SID aparente (Stewart)', f: 'SIDa = Na + K + 2·Ca²⁺ + 2·Mg − Cl − lactato  (mEq/L)', c: 'Normal ≈ 40–42 mEq/L. Ca ionizado e Mg assumidos (1,15 mmol/L; 2,0 mg/dL) se ausentes.', s: 'Stewart 1983; Kellum' },
    side: { t: 'SID efetivo (Figge)', f: 'SIDe = HCO3 + Alb(g/L)·(0,123·pH − 0,631) + Fosfato(mmol/L)·(0,309·pH − 0,469)', c: 'Representa os tampões (Atot). Fosfato assumido 3,5 mg/dL se ausente.', s: 'Figge-Fencl' },
    sig: { t: 'Strong ion gap', f: 'SIG = SIDa − SIDe', c: 'Normal < 2 mEq/L. Elevado: ânions não medidos (cetoácidos, toxinas, uremia).', s: 'Kellum 1995' },
    bepart: { t: 'BE parcionado (Story/Gilfix)', f: 'BE(Na−Cl) = Na − Cl − 38\nBE(Alb) = 0,25 × (42 − Alb g/L)\nBE(Lac) = 1 − lactato\nBE(não medidos) = SBE − soma', c: 'Negativo = acidificante. Ferramenta de raciocínio: BJA 2026 mostra que o parcionamento simplificado diverge in vivo.', s: 'Story, BJA 2004; Gilfix 1993' },
    osm: { t: 'Osmolaridade calculada', f: '2 × Na + glicose/18 + ureia/6', c: 'Normal 275–295 mOsm/L.', s: 'Clássica (ureia em mg/dL)' },
    osmgap: { t: 'Gap osmolar', f: 'Osm medida − Osm calculada', c: '> 10 mOsm: considerar metanol, etilenoglicol, etanol, manitol.', s: 'Kraut 2008' },
    nacorr: { t: 'Na corrigido pela glicemia', f: 'Katz: Na + 1,6 × (glic − 100)/100\nHillier: Na + 2,4 × (glic − 100)/100', c: 'Hillier mais acurado com glicemia > 400 mg/dL.', s: 'Katz 1973; Hillier 1999' },
    fwd: { t: 'Déficit de água livre', f: 'ACT × (Na/140 − 1)\nACT = peso × 0,6 (H) · 0,5 (M ou H ≥ 65a) · 0,45 (M ≥ 65a)', c: 'Corrigir Na ≤ 8–10 mEq/L em 24 h.', s: 'Adrogué-Madias' },
    pf: { t: 'Relação P/F', f: 'PaO2 / FiO2', c: 'SDRA (intubado, PEEP ≥ 5): leve 200–300 · moderada 100–200 · grave ≤ 100.', s: 'Definição global de SDRA 2024 (Matthay, AJRCCM)' },
    sf: { t: 'Relação S/F', f: 'SpO2 / FiO2 (válida se SpO2 ≤ 97 %)', c: 'SDRA: ≤ 315. Intubado: leve 235–315 · moderada 148–235 · grave ≤ 148.', s: 'Definição global de SDRA 2024' },
    aa: { t: 'Gradiente alvéolo-arterial', f: 'PAO2 = FiO2 × (Patm − 47) − PaCO2 / 0,8\nA-a = PAO2 − PaO2', c: 'Esperado ≈ idade/4 + 4 (em ar ambiente). Patm ajustável (altitude).', s: 'Equação do gás alveolar' },
    oi: { t: 'Índice de oxigenação', f: 'IO = FiO2 × Paw × 100 / PaO2\nOSI = FiO2 × Paw × 100 / SpO2', c: 'IO > 16 ≈ hipoxemia grave; > 25–40 considerar ECMO (centros variam).', s: 'Pediatria/adultos — PALICC; ELSO' },
    ards: { t: 'Critério de oxigenação de SDRA', f: 'Intubado: P/F ≤ 300 ou S/F ≤ 315 com PEEP ≥ 5\nNão intubado: CNAF ≥ 30 L/min ou VNI PEEP ≥ 5 com P/F ≤ 300 / S/F ≤ 315', c: 'Exige também infiltrado bilateral, início ≤ 1 semana e não explicado só por IC/hipervolemia.', s: 'Matthay et al., AJRCCM 2024;209:37' },
    rox: { t: 'Índice ROX', f: 'ROX = (SpO2 / FiO2) / FR', c: '≥ 4,88 (2, 6 ou 12 h): menor risco de intubação\n< 2,85 (2 h), < 3,47 (6 h), < 3,85 (12 h): alto risco de falha.', s: 'Roca et al., AJRCCM 2019 (CNAF)' },
    pbw: { t: 'Peso predito (ARDSNet)', f: 'Homem: 50 + 0,91 × (altura cm − 152,4)\nMulher: 45,5 + 0,91 × (altura cm − 152,4)', c: 'Vt protetor 6 mL/kg PBW (4–8).', s: 'ARDSNet 2000' },
    vtkg: { t: 'Vt por peso predito', f: 'Vt (mL) / PBW (kg)', c: '≤ 6–8 mL/kg. > 8 mL/kg: risco de VILI.', s: 'ARDSNet 2000' },
    dp: { t: 'Driving pressure', f: 'ΔP = Pplatô − PEEP', c: '< 15 cmH2O associado a menor mortalidade na SDRA.', s: 'Amato et al., NEJM 2015' },
    cst: { t: 'Complacência estática', f: 'Cst = Vt / (Pplatô − PEEP)', c: 'Normal em VM ≈ 50–100 mL/cmH2O; < 30–40 sugere pulmão rígido/pequeno.', s: 'Mecânica respiratória' },
    raw: { t: 'Resistência de via aérea', f: 'Rva = (Ppico − Pplatô) / fluxo (L/s)', c: 'Em VCV com fluxo quadrado. Normal < 10–15 cmH2O/L/s.', s: 'Mecânica respiratória' },
    vr: { t: 'Ventilatory ratio', f: 'VR = (VE mL/min × PaCO2) / (PBW × 100 × 37,5)', c: '≈ 1 normal; > 2 espaço morto alto, associado a mortalidade.', s: 'Sinha et al., AJRCCM 2009/2019' },
    mp: { t: 'Mechanical power (simplificado)', f: 'MP = 0,098 × FR × Vt(L) × (Ppico − ΔP/2)  J/min', c: '> 17 J/min associado a maior mortalidade (associação, não alvo).', s: 'Gattinoni 2016; Serpa Neto 2018' },
    pam: { t: 'Pressão arterial média', f: 'PAM = (PAS + 2 × PAD) / 3 (ou valor do monitor)', c: 'Alvo inicial 65 mmHg no choque séptico (SSC 2021, forte/moderada). Individualizar em hipertensos crônicos — a PAM alvo da ficha do paciente substitui o 65.', s: 'SSC 2021 (Evans, ICM); SEPSISPAM; 65 trial', v: true },
    si: { t: 'Índice de choque', f: 'IC = FC / PAS', c: '> 0,9–1,0 sugere choque oculto/maior mortalidade.', s: 'Allgöwer 1967' },
    cao2: { t: 'Conteúdo arterial de O2', f: 'CaO2 = 1,34 × Hb × SaO2 + 0,0031 × PaO2', c: 'Normal ≈ 16–22 mL/dL.', s: 'Fisiologia' },
    avdo2: { t: 'Diferença arteriovenosa de O2', f: 'Ca−vO2 = CaO2 − CvO2', c: 'Normal ≈ 3–5 mL/dL. Aumentada: oferta/fluxo insuficiente.', s: 'Fisiologia' },
    teo2: { t: 'Taxa de extração de O2', f: 'TEO2 = (CaO2 − CvO2) / CaO2', c: 'Normal 20–30 %. > 30–40 %: oferta inadequada para a demanda.', s: 'Fisiologia' },
    svo2: { t: 'Saturação venosa central', f: 'ScvO2 medida em gasometria de CVC (cava superior)', c: '≥ 70 % (SvO2 mista ≥ 65 %). Baixa: ↓DO2 (DC, Hb, SaO2) ou ↑VO2. Normal não exclui hipoperfusão.', s: 'Rivers 2001; ESICM 2025 (medir de forma seriada)', v: true },
    gap: { t: 'Gap venoarterial de CO2', f: 'Pv−aCO2 = PvCO2 − PaCO2 (amostras simultâneas)', c: '≥ 6 mmHg: fluxo (DC) provavelmente insuficiente para o metabolismo. Persistir ≥ 6 com ScvO2 ≥ 70 %: RR de morte em 28 d ≈ 2,2–2,4.', s: 'Ospina-Tascón, Crit Care 2013;17:R294; ESICM 2025', v: true },
    gapratio: { t: 'Razão Pv−aCO2 / Ca−vO2', f: 'ΔPCO2 / (CaO2 − CvO2)', c: '> 1,4 mmHg·dL/mL: sugere metabolismo anaeróbio (substituto do quociente respiratório). Evidência observacional, não é alvo terapêutico.', s: 'Mekontso-Dessap 2002; Ospina-Tascón 2015', v: true },
    lac: { t: 'Lactato', f: 'mmol/L (mg/dL ÷ 9,01)', c: '> 2: hiperlactatemia · ≥ 4: grave. Choque séptico: lactato > 2 apesar de vasopressor (Sepsis-3).', s: 'Sepsis-3; SSC 2021' },
    laccl: { t: 'Clearance de lactato', f: '(Lac anterior − Lac atual) / Lac anterior × 100', c: 'Guiar ressuscitação pela queda do lactato quando elevado (SSC 2021, fraca/baixa). Referência histórica: ≥ 10 % em 2 h; ≥ 20 % a cada 2 h (Jansen 2010).', s: 'SSC 2021; SSC 2026 mantém (sem perseguir normalização)', v: true },
    tec: { t: 'Tempo de enchimento capilar', f: 'Pressão firme 10 s no leito ungueal do indicador; cronometrar retorno da cor', c: '> 3 s: alterado. Adjuvante à avaliação de perfusão (SSC 2021/2026; ANDROMEDA-SHOCK-2, 2025).', s: 'Hernández, JAMA 2019; ANDROMEDA-SHOCK-2', v: true },
    asc: { t: 'Área de superfície corporal', f: 'DuBois: 0,007184 × peso^0,425 × altura^0,725', c: 'Usada para índices (IC, DO2I, RVSI).', s: 'DuBois 1916' },
    dcvti: { t: 'Débito cardíaco por VTI (eco)', f: 'VS = π × (dVSVE/2)² × VTI\nDC = VS × FC / 1000', c: 'VTI VSVE normal 18–22 cm; < 15 cm: baixo débito. IC normal 2,5–4,0 L/min/m². Erro do diâmetro entra ao quadrado — use o mesmo diâmetro nas medidas seriadas.', s: 'ASE; Blanco 2020' },
    dcfick: { t: 'DC por Fick estimado', f: 'VO2 (LaFarge) = ASC × (138,1 − 11,49·ln(idade) + 0,378·FC)  [mulher: −17,04]\nDC = VO2 / ((CaO2 − CvO2) × 10)', c: 'ERRO ESPERADO 25–45 % vs termodiluição (R² negativo). Use só para tendência. Com ScvO2 no lugar de SvO2 o erro aumenta.', s: 'Palanques-Tost, JACC Adv 2025; Herz 2023 (PMC10830659)', v: true },
    ci: { t: 'Índice cardíaco', f: 'IC = DC / ASC', c: 'Normal 2,5–4,0 L/min/m². < 2,2 com hipoperfusão: baixo débito.', s: 'Fisiologia' },
    do2: { t: 'Oferta de O2', f: 'DO2 = DC × CaO2 × 10\nDO2I = DO2 / ASC', c: 'DO2I ≈ 500–600 mL/min/m².', s: 'Fisiologia' },
    vo2: { t: 'Consumo de O2', f: 'VO2 = DC × (CaO2 − CvO2) × 10', c: 'VO2I ≈ 110–160 mL/min/m².', s: 'Fisiologia' },
    rvs: { t: 'Resistência vascular sistêmica', f: 'RVS = 80 × (PAM − PVC) / DC', c: 'Normal 800–1200 dyn·s·cm⁻⁵ (RVSI 1970–2390).', s: 'Fisiologia' },
    rvp: { t: 'Resistência vascular pulmonar', f: 'RVP = 80 × (PAPm − POAP) / DC', c: '< 250 dyn·s·cm⁻⁵ (> 2 UW = HP pré-capilar, ESC 2022).', s: 'ESC/ERS 2022' },
    cpo: { t: 'Potência cardíaca (CPO)', f: 'CPO = PAM × DC / 451  (W)', c: '< 0,6 W: preditor forte de mortalidade no choque cardiogênico.', s: 'Fincke, JACC 2004' },
    vpp: { t: 'Variação de pressão de pulso', f: 'VPP = (PPmáx − PPmín) / [(PPmáx + PPmín)/2] × 100', c: '> 13 %: responsivo · 9–13 %: zona cinzenta · < 9 %: não responsivo.\nVálida só com: VM controlada sem esforço, ritmo sinusal, Vt ≥ 8 mL/kg PBW, tórax fechado, FC/FR > 3,6, complacência não muito baixa. O corte de 15 % foi REFUTADO na verificação.', s: 'Monnet, Shi & Teboul, Ann Intensive Care 2022; Cannesson 2011 (zona cinzenta)', v: true },
    vvs: { t: 'Variação de volume sistólico', f: 'VVS do monitor de contorno de pulso', c: '> 12 %: responsivo · 10–12 %: zona cinzenta. Mesmas condições da VPP. AUROC agrupada 0,90.', s: 'Alvarado Sánchez, Ann Intensive Care 2021', v: true },
    plr: { t: 'Elevação passiva de pernas (PLR)', f: 'Δ = (pico − basal) / basal × 100, medido no DC ou VTI (não na pressão)', c: '≥ 10 %: responsivo. Partir de 45° semi-sentado; medir em 30–90 s. Hipovolemia marcada: > 32 % (HEMOPRED).', s: 'Monnet 2022; ESICM 2025 (forte, alta certeza); Joseph, ICM 2024', v: true },
    eeo: { t: 'Oclusão expiratória final (EEO)', f: 'Pausa expiratória 15 s.\nMonitor contínuo: ΔDC\nEco: |ΔVTI EEO| + |ΔVTI EIO|', c: 'Monitor contínuo: ≥ 5 % responsivo.\nEco (EEO + oclusão inspiratória 15 s): soma ≥ 13 %.\nInviável se o paciente interrompe a pausa.', s: 'Monnet 2022; Jozwiak 2017; ESICM 2025 (forte, moderada)', v: true },
    mfc: { t: 'Mini fluid challenge', f: '100–150 mL de cristaloide em 1–2 min; Δ = (pós − basal)/basal', c: 'Contorno de pulso: ΔDC ≥ 5 %. VTI: ≥ 10 % (mínima variação detectável do eco ≈ 12 %).', s: 'Monnet 2022; Muller 2011', v: true },
    vci: { t: 'Variação da veia cava inferior', f: 'VM: distensibilidade = (máx − mín) / mín\nRespiração espontânea: colapsabilidade = (máx − mín) / máx', c: 'VM (Vt ≥ 8, sem esforço): > 18 % responsivo.\nEspontânea: acurácia baixa; ≥ 40 % sugere, mas não exclui.', s: 'Barbier 2004; AUROC agrupada 0,86 (Alvarado Sánchez 2021)' },
    vtc: { t: 'Tidal volume challenge', f: 'VPP com Vt 6 → 8 mL/kg PBW por 1 min', c: 'ΔVPP ≥ 3,5 pontos: responsivo (AUROC agrupada 0,92).', s: 'Myatra, Crit Care Med 2017; Alvarado Sánchez 2021', v: true },
    ckd: { t: 'eTFG CKD-EPI 2021', f: '142 × min(Cr/κ,1)^α × max(Cr/κ,1)^−1,200 × 0,9938^idade × 1,012 [M]\nκ 0,7 (M) / 0,9 (H); α −0,241 (M) / −0,302 (H)', c: 'Sem coeficiente de raça. NÃO válido em IRA / creatinina instável.', s: 'Inker, NEJM 2021' },
    cg: { t: 'Clearance de creatinina (Cockcroft-Gault)', f: '(140 − idade) × peso / (72 × Cr) × 0,85 [M]', c: 'Usado para ajuste de doses de várias drogas. Não válido em IRA.', s: 'Cockcroft-Gault 1976' },
    kdigo: { t: 'Estágio KDIGO de lesão renal aguda', f: 'Cr / Cr basal: 1,5–1,9 (1) · 2,0–2,9 (2) · ≥ 3 ou Cr ≥ 4 (3)\nDiurese: < 0,5 mL/kg/h 6–12 h (1) · ≥ 12 h (2) · < 0,3 ≥ 24 h ou anúria ≥ 12 h (3)', c: 'Também estágio 1: aumento ≥ 0,3 mg/dL em 48 h.', s: 'KDIGO 2012' },
    fena: { t: 'Fração de excreção de sódio', f: 'FeNa = (UNa × PCr) / (PNa × UCr) × 100', c: '< 1 %: pré-renal · > 2 %: NTA. Não interpretável com diurético.', s: 'Clássica' },
    feur: { t: 'Fração de excreção de ureia', f: 'FeUr = (UUr × PCr) / (PUr × UCr) × 100', c: '< 35 %: pré-renal (útil sob diurético).', s: 'Carvounis 2002' },
  };

  // ---------------------------------------------------------------- utilidades
  const r1 = (x) => Math.round(x * 10) / 10;

  function derive(r, S = {}) {
    const d = {};
    // FiO2 em % (21–100) ou fração (0,21–1); fora disso é inválida (AUDITORIA §8)
    const fi = H(r.fio2) ? C.fio2(+r.fio2) : NaN;
    d.fio2 = Number.isFinite(fi) ? fi * 100 : (!H(r.fio2) && r.sup === 'AA' ? 21 : null);
    d.F = d.fio2 != null ? d.fio2 / 100 : null;
    d.pam = H(r.pam) ? +r.pam : (H(r.pas) && H(r.pad) ? (+r.pas + 2 * r.pad) / 3 : null);
    d.asc = H(r.height) && H(r.weight) ? 0.007184 * Math.pow(+r.weight, 0.425) * Math.pow(+r.height, 0.725) : null;
    d.pbw = H(r.height) && r.sex ? (r.sex === 'F' ? 45.5 : 50) + 0.91 * (+r.height - 152.4) : null;
    d.lac = H(r.lac) ? +r.lac : null;
    d.ve = H(r.ve) ? +r.ve : (H(r.vt) && H(r.fr) ? (+r.vt * +r.fr) / 1000 : null);
    d.dp = H(r.pplat) && H(r.peep) ? +r.pplat - +r.peep : null;
    // conteúdos de O2
    if (H(r.hb) && H(r.sao2)) d.cao2 = 1.34 * r.hb * (r.sao2 / 100) + (H(r.pao2) ? 0.0031 * r.pao2 : 0);
    if (H(r.hb) && H(r.svo2)) d.cvo2 = 1.34 * r.hb * (r.svo2 / 100) + (H(r.pvo2) ? 0.0031 * r.pvo2 : 0);
    if (d.cao2 != null && d.cvo2 != null) d.avdo2 = d.cao2 - d.cvo2;
    // débito cardíaco: medido > VTI > Fick estimado
    if (H(r.dvsve) && H(r.vti)) {
      d.vs = Math.PI * (r.dvsve / 2) ** 2 * r.vti;
      if (H(r.fc)) d.dcVti = (d.vs * r.fc) / 1000;
    }
    if (d.asc != null && H(r.age) && H(r.fc) && r.sex && d.avdo2 > 0) {
      const k = 138.1 - (r.sex === 'F' ? 17.04 : 0) - 11.49 * Math.log(+r.age) + 0.378 * r.fc;
      d.vo2est = d.asc * k;
      d.dcFick = d.vo2est / (d.avdo2 * 10);
    }
    if (H(r.dcMed)) { d.dc = +r.dcMed; d.dcSrc = 'medido'; }
    else if (d.dcVti != null) { d.dc = d.dcVti; d.dcSrc = 'VTI'; }
    else if (d.dcFick != null) { d.dc = d.dcFick; d.dcSrc = 'Fick est.'; }
    else d.dc = null;
    // AG
    if (H(r.na) && H(r.cl) && H(r.hco3)) {
      d.ag = r.na - r.cl - r.hco3;
      if (H(r.alb)) d.agc = d.ag + 2.5 * (4 - r.alb);
    }
    d.agU = d.agc ?? d.ag ?? null;
    d.sbe = H(r.be) ? +r.be : (H(r.ph) && H(r.hco3) ? 0.9287 * (r.hco3 - 24.4 + 14.83 * (r.ph - 7.4)) : null);
    if (H(r.pao2) && d.F) d.pf = r.pao2 / d.F;
    if (H(r.spo2) && d.F && r.spo2 <= 97) d.sf = r.spo2 / d.F;
    if (H(r.pvco2) && H(r.paco2)) d.gap = r.pvco2 - r.paco2;
    return d;
  }

  // Requisitos virtuais -> campos reais faltantes
  function miss(r, d, keys) {
    const m = [];
    const add = (k) => { if (!m.includes(k)) m.push(k); };
    for (const k of keys) {
      switch (k) {
        case 'fio2': if (d.fio2 == null) add('fio2'); break;
        case 'pam': if (d.pam == null) add('pam'); break;
        case 'asc': if (!H(r.height)) add('height'); if (!H(r.weight)) add('weight'); break;
        case 'pbw': if (!H(r.height)) add('height'); if (!r.sex) add('sex'); break;
        case 'sex': if (!r.sex) add('sex'); break;
        case 'dc': if (d.dc == null) { if (!H(r.vti)) add('vti'); if (!H(r.dvsve)) add('dvsve'); if (!H(r.fc)) add('fc'); } break;
        case 'cao2': if (!H(r.hb)) add('hb'); if (!H(r.sao2)) add('sao2'); break;
        case 'cvo2': if (!H(r.hb)) add('hb'); if (!H(r.svo2)) add('svo2'); break;
        case 've': if (d.ve == null) { if (!H(r.vt)) add('vt'); if (!H(r.fr)) add('fr'); } break;
        case 'dp': if (!H(r.pplat)) add('pplat'); if (!H(r.peep)) add('peep'); break;
        default: if (!H(r[k])) add(k);
      }
    }
    return m;
  }

  // ---------------------------------------------------------------- canais
  // item: { id, l, v, u, dec, fl: 'ok'|'warn'|'crit'|null, n: nota, ref, miss:[campos], txt: bool }
  function mk(list, r, d, o) {
    const m = miss(r, d, o.req || []);
    if (m.length) { list.push({ id: o.id, l: o.l, miss: m, ref: o.ref }); return; }
    const res = o.fn();
    if (res == null) return;
    list.push({ id: o.id, l: o.l, u: o.u || '', dec: o.dec ?? 0, ref: o.ref, ...res });
  }
  const flag = (x, lo, hi, critLo = -Infinity, critHi = Infinity) =>
    x < critLo || x > critHi ? 'crit' : x < lo || x > hi ? 'warn' : 'ok';

  // ---------- ácido-base (Boston + Stewart)
  function acidBase(r, d, S, dx) {
    const it = [];
    const ok = H(r.ph) && H(r.paco2) && H(r.hco3);
    const agRef = S.agRef ?? 12;
    const agHigh = d.agU != null && d.agU > agRef + 4;

    if (!ok) {
      it.push({ id: 'primary', l: 'Distúrbio primário', miss: miss(r, d, ['ph', 'paco2', 'hco3']), ref: 'primary' });
    } else {
      const ph = +r.ph, pc = +r.paco2, hc = +r.hco3;
      // consistência interna (Henderson-Hasselbalch): pH = 6,1 + log10(HCO3 / (0,03 × PaCO2)); tolera ± 0,05
      const phHH = 6.1 + Math.log10(hc / (0.03 * pc));
      d.phHH = phHH;
      if (Math.abs(phHH - ph) > 0.05) dx.push({ t: `Valores inconsistentes: PaCO2 e HCO3 dariam pH ${fmt(phHH, 2)} (medido ${fmt(ph, 2)}) — conferir digitação e coleta`, s: 'crit', ch: 'ab' });

      const acidemia = ph < 7.35, alkalemia = ph > 7.45;
      const lowH = hc < 22, highH = hc > 26, highC = pc > 45, lowC = pc < 35;
      const alt = lowH || highH || lowC || highC;
      // classificação (AUDITORIA §8): o componente que se desvia de 40/24 na direção do pH é o primário;
      // os dois na direção do pH = distúrbio misto
      let p, lab;
      if (acidemia || alkalemia) {
        const resp = acidemia ? pc - 40 : 40 - pc, met = acidemia ? 24 - hc : hc - 24;
        if (resp > 0 && met > 0) p = acidemia ? 'MIXA' : 'MIXK';
        else if (resp > 0) p = acidemia ? 'RA' : 'RK';
        else if (met > 0) p = acidemia ? 'MA' : 'MK';
        else p = 'ODD';
      } else p = 'N';
      // pH normal com componentes alterados: avalia a compensação do lado em que o pH está
      let pn = null;
      if (p === 'N') { if (highC && highH) pn = ph < 7.4 ? 'RA' : 'MK'; else if (lowC && lowH) pn = ph < 7.4 ? 'MA' : 'RK'; }
      const q = pn || p;
      const sevPH = ph < 7.2 || ph > 7.55 ? 'crit' : acidemia || alkalemia ? 'warn' : 'ok';
      const comp = [];
      let expTxt = null;
      let hRef = 24; // HCO3 basal p/ delta ratio: com distúrbio respiratório primário, usa o esperado agudo
      const pcoTxt = (e) => `faixa ${fmt(e - 2, 1)}–${fmt(e + 2, 1)} · medida ${fmt(pc, 1)}`;

      if (q === 'MA') {
        lab = 'Acidose metabólica';
        const e = 1.5 * hc + 8;
        expTxt = `Winter: PaCO2 esperada ${fmt(e - 2, 1)}–${fmt(e + 2, 1)}`;
        it.push({ id: 'winter', l: 'PaCO2 esperada (Winter)', v: e, dec: 1, u: 'mmHg', n: pcoTxt(e), ref: 'winter', fl: pc > e + 2 || pc < e - 2 ? 'warn' : 'ok' });
        if (pc > e + 2) comp.push({ t: 'PaCO2 acima do esperado — acidose respiratória associada', s: 'crit' });
        else if (pc < e - 2) comp.push({ t: 'PaCO2 abaixo do esperado — alcalose respiratória associada', s: 'warn' });
        else comp.push({ t: 'Compensação respiratória adequada', s: 'ok' });
      } else if (q === 'MK') {
        lab = 'Alcalose metabólica';
        const e = 0.7 * (hc - 24) + 40; // Berend, NEJM 2014
        expTxt = `PaCO2 esperada ${fmt(e - 2, 1)}–${fmt(e + 2, 1)}`;
        it.push({ id: 'malk', l: 'PaCO2 esperada', v: e, dec: 1, u: 'mmHg', n: pcoTxt(e), ref: 'malk', fl: pc > e + 2 || pc < e - 2 ? 'warn' : 'ok' });
        if (pc > e + 2) comp.push({ t: 'PaCO2 acima do esperado — acidose respiratória associada', s: 'warn' });
        else if (pc < e - 2) comp.push({ t: 'PaCO2 abaixo do esperado — alcalose respiratória associada', s: 'warn' });
        else comp.push({ t: 'Compensação respiratória adequada', s: 'ok' });
      } else if (q === 'RA') {
        const a = 24 + (pc - 40) / 10, c = 24 + (3.5 * (pc - 40)) / 10;
        hRef = a;
        expTxt = `HCO3 esperado: agudo ≈ ${fmt(a, 1)} · crônico ≈ ${fmt(c, 1)}`;
        let k;
        if (hc < a - 1.5) k = ['HCO3 abaixo do esperado para a forma aguda — acidose metabólica associada', 'crit', ''];
        else if (hc <= a + 1.5) k = ['Acidose respiratória aguda (compensação renal ainda não instalada)', 'ok', ' aguda'];
        else if (Math.abs(hc - c) <= 2) k = ['Acidose respiratória crônica, compensação renal adequada', 'ok', ' crônica'];
        else if (hc > c + 2) k = ['HCO3 acima do esperado — alcalose metabólica associada', 'warn', ''];
        else k = ['HCO3 entre o agudo e o crônico — compensação parcial (subaguda ou crônica agudizada)', 'warn', ' — compensação parcial'];
        lab = 'Acidose respiratória' + k[2];
        comp.push({ t: k[0], s: k[1] });
        it.push({ id: 'racomp', l: 'HCO3 esperado', v: a, dec: 1, u: 'mEq/L', n: `agudo ${fmt(a, 1)} · crônico ${fmt(c, 1)} · medido ${fmt(hc, 1)}`, ref: 'racomp', fl: k[1] === 'ok' ? 'ok' : 'warn' });
      } else if (q === 'RK') {
        const a = 24 - (2 * (40 - pc)) / 10, c = 24 - (5 * (40 - pc)) / 10;
        hRef = a;
        expTxt = `HCO3 esperado: agudo ≈ ${fmt(a, 1)} · crônico ≈ ${fmt(c, 1)}`;
        let k;
        if (hc > a + 1.5) k = ['HCO3 acima do esperado para a forma aguda — alcalose metabólica associada', 'warn', ''];
        else if (hc >= a - 1.5) k = ['Alcalose respiratória aguda', 'ok', ' aguda'];
        else if (Math.abs(hc - c) <= 2.5) k = ['Alcalose respiratória crônica, compensação renal adequada', 'ok', ' crônica'];
        else if (hc < c - 2.5) k = ['HCO3 abaixo do esperado — acidose metabólica associada', 'warn', ''];
        else k = ['HCO3 entre o agudo e o crônico — compensação parcial (subaguda)', 'warn', ' — compensação parcial'];
        lab = 'Alcalose respiratória' + k[2];
        comp.push({ t: k[0], s: k[1] });
        it.push({ id: 'ralkcomp', l: 'HCO3 esperado', v: a, dec: 1, u: 'mEq/L', n: `agudo ${fmt(a, 1)} · crônico ${fmt(c, 1)} · medido ${fmt(hc, 1)}`, ref: 'ralkcomp', fl: k[1] === 'ok' ? 'ok' : 'warn' });
      } else if (q === 'MIXA') lab = 'Distúrbio misto: acidose respiratória + metabólica';
      else if (q === 'MIXK') lab = 'Distúrbio misto: alcalose respiratória + metabólica';
      else if (q === 'ODD') lab = 'Padrão atípico — reavaliar amostra e valores';
      if (p === 'N') {
        lab = alt ? 'pH normal com PaCO2/HCO3 alterados' : agHigh ? 'pH normal com AG elevado' : 'Equilíbrio ácido-base normal';
        const nm = { RA: 'acidose respiratória', MK: 'alcalose metabólica', MA: 'acidose metabólica', RK: 'alcalose respiratória' }[pn];
        if (alt) comp.unshift({ t: nm ? `Padrão de ${nm} compensada ou distúrbio misto que se anula — correlacionar com clínica e BE` : 'Distúrbio misto com efeitos que se anulam — correlacionar com clínica e BE', s: 'warn' });
      }

      const prefix = acidemia ? 'Acidemia' : alkalemia ? 'Alcalemia' : 'pH normal';
      it.unshift({ id: 'primary', l: 'Distúrbio primário', v: lab, txt: true, n: `${prefix} · pH ${fmt(ph, 2)}${expTxt ? ' · ' + expTxt : ''}`, ref: 'primary', fl: sevPH });
      const clean = p === 'N' && !agHigh && !alt;
      dx.unshift({ t: lab, s: clean ? 'ok' : sevPH === 'ok' ? 'warn' : sevPH, ch: 'ab', main: true });
      comp.forEach((c) => dx.push({ ...c, ch: 'ab' }));
      if (Array.isArray(r.com) && r.com.includes('DPOC') && (p === 'RA' || p === 'MIXA')) dx.push({ t: 'DPOC: comparar com a PaCO2/HCO3 basais do paciente (retentor crônico?)', s: 'ok', ch: 'ab' });

      // AG e delta-delta
      if (d.agU != null) {
        const isMA = p === 'MA' || p === 'MIXA' || (lowH && !alkalemia);
        if (agHigh) {
          const assoc = isMA ? '' : ' associada (oculta)';
          dx.push({ t: `Acidose metabólica AG elevado${assoc} — AG${d.agc != null ? 'c' : ''} ${fmt(d.agU, 1)}`, s: 'crit', ch: 'ab' });
          if (hc < hRef - 0.5) {
            const dr = (d.agU - agRef) / (hRef - hc);
            let n, s = 'ok';
            if (dr < 0.4) { n = 'Predomina acidose hiperclorêmica'; s = 'warn'; }
            else if (dr < 0.8) { n = 'AG alto + acidose hiperclorêmica'; s = 'warn'; }
            else if (dr <= 2) n = 'Acidose AG alto pura';
            else { n = 'AG alto + alcalose metabólica (ou acidose resp. crônica)'; s = 'warn'; }
            it.push({ id: 'dr', l: 'Delta ratio', v: dr, dec: 2, n: n + (hRef !== 24 ? ` · HCO3 basal ${fmt(hRef, 1)} (compensação resp.)` : ''), ref: 'dr', fl: s });
            if (s !== 'ok') dx.push({ t: `Δ/Δ ${fmt(dr, 2)}: ${n}`, s: 'warn', ch: 'ab' });
          } else {
            it.push({ id: 'dr', l: 'Delta ratio', v: '—', txt: true, n: `HCO3 ≥ ${fmt(hRef, 0)} com AG alto: alcalose metabólica coexistente`, ref: 'dr', fl: 'warn' });
          }
          if (d.lac != null) {
            const dag = d.agU - agRef;
            const share = Math.min(100, (d.lac / dag) * 100);
            dx.push({ t: `Lactato explica ~${fmt(share)} % do ΔAG (${fmt(dag, 1)})${share < 60 ? ' → buscar outros ânions (cetose, uremia, tóxicos)' : ''}`, s: share < 60 ? 'warn' : 'ok', ch: 'ab' });
          }
        } else if (isMA && hc < 22) {
          dx.push({ t: 'Acidose metabólica com AG normal (hiperclorêmica)', s: 'warn', ch: 'ab' });
        }
      }
    }

    mk(it, r, d, { id: 'ag', l: 'Ânion gap', u: 'mEq/L', dec: 1, ref: 'ag', req: ['na', 'cl', 'hco3'], fn: () => ({ v: d.ag, fl: d.ag > agRef + 4 ? 'warn' : 'ok', n: d.agc == null ? 'sem correção p/ albumina' : '' }) });
    mk(it, r, d, { id: 'agc', l: 'AG corrigido (albumina)', u: 'mEq/L', dec: 1, ref: 'agc', req: ['na', 'cl', 'hco3', 'alb'], fn: () => ({ v: d.agc, fl: d.agc > agRef + 4 ? (d.agc > agRef + 12 ? 'crit' : 'warn') : 'ok', n: `ref ${agRef} ± 4` }) });
    if (!H(r.be)) mk(it, r, d, { id: 'sbe', l: 'BE padrão (calc.)', u: 'mmol/L', dec: 1, ref: 'sbe', req: ['ph', 'hco3'], fn: () => ({ v: d.sbe, fl: flag(d.sbe, -2, 2, -10, 10) }) });
    mk(it, r, d, {
      id: 'hh', l: 'Consistência H-H', ref: 'hh', req: ['ph', 'paco2', 'hco3'],
      fn: () => {
        const hh = 6.1 + Math.log10(r.hco3 / (0.03 * r.paco2)), bad = Math.abs(hh - r.ph) > 0.05;
        return { v: hh, dec: 2, u: 'pH calc.', fl: bad ? 'crit' : 'ok', n: bad ? `inconsistente com o pH medido (${fmt(+r.ph, 2)})` : 'coerente com o pH medido' };
      },
    });

    // Stewart
    const st = [];
    mk(st, r, d, {
      id: 'sida', l: 'SID aparente', u: 'mEq/L', dec: 1, ref: 'sida', req: ['na', 'k', 'cl'],
      fn: () => {
        const ca = H(r.ica) ? +r.ica : 1.15, mg = H(r.mg) ? +r.mg : 2.0;
        d.sida = +r.na + +r.k + 2 * ca + (2 * mg) / 2.43 - r.cl - (d.lac ?? 1);
        const as = [!H(r.ica) && 'Ca', !H(r.mg) && 'Mg', d.lac == null && 'lactato'].filter(Boolean);
        return { v: d.sida, fl: flag(d.sida, 38, 44, 30, 50), n: as.length ? `${as.join(', ')} assumido(s)` : '' };
      },
    });
    mk(st, r, d, {
      id: 'side', l: 'SID efetivo', u: 'mEq/L', dec: 1, ref: 'side', req: ['ph', 'hco3', 'alb'],
      fn: () => {
        const albL = r.alb * 10, ph = +r.ph, phos = (H(r.phos) ? +r.phos : 3.5) / 3.1;
        d.side = +r.hco3 + albL * (0.123 * ph - 0.631) + phos * (0.309 * ph - 0.469);
        return { v: d.side, fl: null, n: H(r.phos) ? '' : 'fosfato assumido' };
      },
    });
    if (d.sida != null && d.side != null) {
      const sig = d.sida - d.side;
      st.push({ id: 'sig', l: 'Strong ion gap', v: sig, dec: 1, u: 'mEq/L', ref: 'sig', fl: sig > 2 ? (sig > 8 ? 'crit' : 'warn') : 'ok', n: sig > 2 ? 'ânions não medidos' : '' });
    } else st.push({ id: 'sig', l: 'Strong ion gap', ref: 'sig', miss: miss(r, d, ['na', 'k', 'cl', 'ph', 'hco3', 'alb']) });
    mk(st, r, d, {
      id: 'bepart', l: 'BE parcionado', ref: 'bepart', req: ['na', 'cl', 'alb', 'ph', 'hco3'],
      fn: () => {
        const naCl = r.na - r.cl - 38, alb = 0.25 * (42 - r.alb * 10), lac = d.lac != null ? 1 - d.lac : 0;
        const um = d.sbe - (naCl + alb + lac);
        d.bep = { naCl, alb, lac, um };
        const s = (x) => (x > 0 ? '+' : '') + fmt(x, 1);
        return { v: um, dec: 1, u: 'mEq/L', fl: um < -5 ? 'crit' : um < -2 ? 'warn' : 'ok', n: `não medidos · Na-Cl ${s(naCl)} · Alb ${s(alb)} · Lac ${s(lac)} · SBE ${s(d.sbe)}` };
      },
    });
    if (d.bep) {
      if (d.bep.naCl < -3) dx.push({ t: `Efeito Na-Cl ${fmt(d.bep.naCl, 1)}: componente hiperclorêmico (SID baixo)`, s: 'warn', ch: 'ab' });
      if (d.bep.alb > 3) dx.push({ t: `Hipoalbuminemia alcaliniza ${fmt(d.bep.alb, 1)} mEq — pode mascarar acidose`, s: 'ok', ch: 'ab' });
    }
    return { it, st };
  }

  // ---------- oxigenação
  function oxy(r, d, S, dx) {
    const it = [];
    const patm = S.patm || 760;
    const intub = r.sup === 'VM';
    mk(it, r, d, {
      id: 'pf', l: 'P/F', u: 'mmHg', ref: 'pf', req: ['pao2', 'fio2'],
      fn: () => {
        const pf = d.pf;
        let n = '', fl = pf < 100 ? 'crit' : pf <= 300 ? 'warn' : 'ok';
        if (pf <= 300) n = pf <= 100 ? 'grave (se SDRA)' : pf <= 200 ? 'moderada (se SDRA)' : 'leve (se SDRA)';
        return { v: pf, fl, n };
      },
    });
    mk(it, r, d, {
      id: 'sf', l: 'S/F', ref: 'sf', req: ['spo2', 'fio2'],
      fn: () => {
        if (r.spo2 > 97) return { v: '—', txt: true, n: 'SpO2 > 97 %: S/F não válida', fl: null };
        const sf = d.sf;
        const n = sf <= 315 ? (intub ? (sf <= 148 ? 'grave' : sf <= 235 ? 'moderada' : 'leve') + ' (se SDRA)' : 'critério SDRA ≤ 315') : '';
        return { v: sf, fl: sf <= 148 ? 'crit' : sf <= 315 ? 'warn' : 'ok', n };
      },
    });
    mk(it, r, d, {
      id: 'aa', l: 'Gradiente A-a', u: 'mmHg', ref: 'aa', req: ['pao2', 'paco2', 'fio2'],
      fn: () => {
        const PA = d.F * (patm - 47) - r.paco2 / 0.8;
        const aa = PA - r.pao2;
        const exp = H(r.age) ? r.age / 4 + 4 : null;
        d.PAO2 = PA;
        return { v: aa, fl: exp != null && d.fio2 <= 21.5 ? (aa > exp + 5 ? 'warn' : 'ok') : aa > 50 ? 'warn' : 'ok', n: `PAO2 ${fmt(PA)} · a/A ${fmt(r.pao2 / PA, 2)}${exp != null ? ` · esperado ≈ ${fmt(exp)} (ar amb.)` : ''}` };
      },
    });
    mk(it, r, d, {
      id: 'oi', l: 'Índice de oxigenação', dec: 1, ref: 'oi', req: ['paw', 'fio2', 'pao2'],
      fn: () => { const oi = (d.F * r.paw * 100) / r.pao2; return { v: oi, fl: oi > 25 ? 'crit' : oi > 16 ? 'warn' : 'ok', n: H(r.spo2) && r.spo2 <= 97 ? `OSI ${fmt((d.F * r.paw * 100) / r.spo2, 1)}` : '' }; },
    });
    if (r.sup === 'CNAF' || r.sup === 'VNI' || r.sup === 'O2') {
      mk(it, r, d, {
        id: 'rox', l: 'ROX', dec: 2, ref: 'rox', req: ['spo2', 'fio2', 'fr'],
        fn: () => { const rox = r.spo2 / d.fio2 * 100 / r.fr; return { v: rox, fl: rox >= 4.88 ? 'ok' : rox < 3.85 ? 'crit' : 'warn', n: rox >= 4.88 ? 'menor risco de intubação' : rox < 2.85 ? 'alto risco (corte de 2 h)' : rox < 3.85 ? 'alto risco (corte de 12 h)' : 'zona intermediária — reavaliar' + (r.sup !== 'CNAF' ? ' · validado em CNAF' : '') }; },
      });
    }
    // SDRA
    const pfv = d.pf, sfv = d.sf;
    const meets = (pfv != null && pfv <= 300) || (pfv == null && sfv != null && sfv <= 315);
    if (meets) {
      if (intub && (!H(r.peep) || r.peep >= 5)) {
        const sev = pfv != null ? (pfv <= 100 ? 'grave' : pfv <= 200 ? 'moderada' : 'leve') : sfv <= 148 ? 'grave' : sfv <= 235 ? 'moderada' : 'leve';
        dx.push({ t: `Critério de oxigenação de SDRA ${sev} (exige imagem bilateral e contexto)`, s: sev === 'leve' ? 'warn' : 'crit', ch: 'o2' });
      } else if ((r.sup === 'CNAF' || r.sup === 'VNI')) {
        dx.push({ t: 'Critério de oxigenação de SDRA não intubada (CNAF ≥ 30 L/min ou VNI PEEP ≥ 5)', s: 'warn', ch: 'o2' });
      } else if (pfv != null) dx.push({ t: `Hipoxemia: P/F ${fmt(pfv)}`, s: pfv < 200 ? 'crit' : 'warn', ch: 'o2' });
    }
    return { it };
  }

  // ---------- perfusão / transporte de O2
  function perf(r, d, S, dx, ctx) {
    const it = [];
    mk(it, r, d, { id: 'lac', l: 'Lactato', u: 'mmol/L', dec: 1, ref: 'lac', req: ['lac'], fn: () => ({ v: d.lac, fl: d.lac >= 4 ? 'crit' : d.lac > 2 ? 'warn' : 'ok', n: d.lac >= 4 ? 'hiperlactatemia grave' : d.lac > 2 ? 'hiperlactatemia' : '' }) });
    // clearance: campo manual ou registro anterior
    let lp = null, lh = null, src = '';
    if (H(r.lacPrev)) { lp = +r.lacPrev; lh = H(r.lacPrevH) ? +r.lacPrevH : null; src = 'informado'; }
    else if (ctx.prev && H(ctx.prev.lac) && ctx.ts != null && ctx.prevTs != null) { lp = +ctx.prev.lac; lh = (ctx.ts - ctx.prevTs) / 36e5; src = 'registro anterior'; }
    if (lp != null && d.lac != null && lp > 0) {
      const cl = ((lp - d.lac) / lp) * 100;
      const per2 = lh ? cl / lh * 2 : null;
      it.push({ id: 'laccl', l: 'Clearance de lactato', v: cl, dec: 0, u: '%', ref: 'laccl', fl: lp > 2 ? (cl >= 10 ? 'ok' : cl < 0 ? 'crit' : 'warn') : 'ok', n: `${fmt(lp, 1)} → ${fmt(d.lac, 1)}${lh ? ` em ${fmt(lh, 1)} h` : ''} (${src})` });
      if (lp > 2 && cl < 10) dx.push({ t: `Lactato ${cl < 0 ? 'subindo' : 'sem queda adequada'} (${fmt(cl)} %)`, s: cl < 0 ? 'crit' : 'warn', ch: 'perf' });
    } else if (d.lac != null && d.lac > 2) it.push({ id: 'laccl', l: 'Clearance de lactato', ref: 'laccl', miss: ['lacPrev'] });
    mk(it, r, d, { id: 'tec', l: 'Enchimento capilar', u: 's', dec: 1, ref: 'tec', req: ['tec'], fn: () => ({ v: +r.tec, fl: r.tec > 3 ? 'warn' : 'ok', n: r.tec > 3 ? 'alterado (> 3 s)' : 'normal' }) });
    mk(it, r, d, { id: 'svo2', l: 'ScvO2', u: '%', ref: 'svo2', req: ['svo2'], fn: () => ({ v: +r.svo2, fl: r.svo2 < 60 ? 'crit' : r.svo2 < 70 ? 'warn' : r.svo2 > 85 ? 'warn' : 'ok', n: r.svo2 > 85 ? 'muito alta: shunt / extração prejudicada?' : r.svo2 < 70 ? 'baixa: ↓DO2 ou ↑VO2' : '' }) });
    mk(it, r, d, { id: 'gap', l: 'Gap de CO2 (Pv−aCO2)', u: 'mmHg', dec: 1, ref: 'gap', req: ['pvco2', 'paco2'], fn: () => ({ v: d.gap, fl: d.gap >= 6 ? 'warn' : 'ok', n: d.gap >= 6 ? 'fluxo provavelmente insuficiente' : 'adequado' }) });
    mk(it, r, d, { id: 'cao2', l: 'CaO2', u: 'mL/dL', dec: 1, ref: 'cao2', req: ['cao2'], fn: () => ({ v: d.cao2, fl: d.cao2 < 12 ? 'crit' : d.cao2 < 16 ? 'warn' : 'ok', n: H(r.pao2) ? '' : 'sem O2 dissolvido' }) });
    mk(it, r, d, { id: 'avdo2', l: 'Ca−vO2', u: 'mL/dL', dec: 1, ref: 'avdo2', req: ['cao2', 'cvo2'], fn: () => ({ v: d.avdo2, fl: d.avdo2 > 5.5 ? 'warn' : 'ok', n: `CvO2 ${fmt(d.cvo2, 1)}` }) });
    mk(it, r, d, {
      id: 'teo2', l: 'Extração de O2', u: '%', ref: 'teo2', req: ['sao2', 'svo2'],
      fn: () => { const e = d.cao2 && d.cvo2 != null ? (d.avdo2 / d.cao2) * 100 : ((r.sao2 - r.svo2) / r.sao2) * 100; return { v: e, fl: e > 40 ? 'crit' : e > 30 ? 'warn' : 'ok', n: H(r.hb) ? '' : 'pelas saturações' }; },
    });
    mk(it, r, d, { id: 'gapratio', l: 'Pv−aCO2 / Ca−vO2', u: '', dec: 2, ref: 'gapratio', req: ['pvco2', 'paco2', 'cao2', 'cvo2'], fn: () => { const x = d.gap / d.avdo2; d.gr = x; return { v: x, fl: x > 1.4 ? 'warn' : 'ok', n: x > 1.4 ? 'sugere metabolismo anaeróbio' : '' }; } });

    // síntese de perfusão (Gavelli/Teboul/Monnet; Ospina-Tascón)
    const L = d.lac, sv = H(r.svo2) ? +r.svo2 : null, g = d.gap;
    const cirr = Array.isArray(r.com) && r.com.includes('Cirrose');
    if (L != null && L > 2) dx.push({ t: `Lactato ${fmt(L, 1)} mmol/L${L >= 4 ? ' (≥ 4: grave)' : ''}${cirr ? ' · cirrose reduz a depuração' : ''}`, s: L >= 4 ? 'crit' : 'warn', ch: 'perf' });
    if (sv != null && sv < 70) dx.push({ t: `ScvO2 ${fmt(sv)} %: oferta de O2 baixa para a demanda → avaliar DC, Hb, SaO2, consumo`, s: sv < 60 ? 'crit' : 'warn', ch: 'perf' });
    if (sv != null && sv >= 70 && g != null && g >= 6) dx.push({ t: `ScvO2 normal com gap ${fmt(g, 1)} mmHg: fluxo provavelmente insuficiente (pior prognóstico se persistir)`, s: 'warn', ch: 'perf' });
    if (L != null && L > 2 && g != null && g < 6 && (d.gr == null || d.gr <= 1.4)) dx.push({ t: 'Lactato alto com gap normal: considerar causas não hipóxicas (adrenérgica, hepática, tóxica)', s: 'warn', ch: 'perf' });
    if (L != null && L > 2 && d.gr != null && d.gr > 1.4) dx.push({ t: 'Lactato alto + razão > 1,4: metabolismo anaeróbio provável — aumentar DO2 pode ajudar', s: 'crit', ch: 'perf' });
    if (H(r.tec) && r.tec > 3) dx.push({ t: `TEC ${fmt(+r.tec, 1)} s: perfusão periférica alterada`, s: 'warn', ch: 'perf' });
    return { it };
  }

  // ---------- hemodinâmica / débito
  function hemo(r, d, S, dx) {
    const it = [];
    const alvo = H(r.pamAlvo) ? +r.pamAlvo : 65;
    const com = Array.isArray(r.com) ? r.com : [];
    mk(it, r, d, { id: 'pam', l: 'PAM', u: 'mmHg', ref: 'pam', req: ['pam'], fn: () => ({ v: d.pam, fl: d.pam < alvo - 5 ? 'crit' : d.pam < alvo ? 'warn' : 'ok', n: `${H(r.pam) ? 'monitor' : 'calculada'} · alvo ${alvo}${com.includes('HAS') && !H(r.pamAlvo) ? ' · HAS: considerar alvo individualizado' : ''}` }) });
    mk(it, r, d, { id: 'si', l: 'Índice de choque', dec: 2, ref: 'si', req: ['fc', 'pas'], fn: () => { const x = r.fc / r.pas; return { v: x, fl: x >= 1.3 ? 'crit' : x > 0.9 ? 'warn' : 'ok', n: `FC/PAM ${d.pam ? fmt(r.fc / d.pam, 2) : '--'}` }; } });
    mk(it, r, d, {
      id: 'dcvti', l: 'DC (VTI)', u: 'L/min', dec: 2, ref: 'dcvti', req: ['dvsve', 'vti', 'fc'],
      fn: () => ({ v: d.dcVti, fl: r.vti < 15 ? 'warn' : 'ok', n: `VS ${fmt(d.vs)} mL${d.asc ? ` · VSi ${fmt(d.vs / d.asc)} mL/m²` : ''} · VTI ${fmt(+r.vti, 1)} cm${r.vti < 15 ? ' (baixo)' : ''}` }),
    });
    if (d.dcFick != null) it.push({ id: 'dcfick', l: 'DC (Fick estimado)', v: d.dcFick, dec: 2, u: 'L/min', ref: 'dcfick', fl: 'warn', n: `VO2 est. ${fmt(d.vo2est)} mL/min · erro 25–45 %: só tendência` });
    else it.push({ id: 'dcfick', l: 'DC (Fick estimado)', ref: 'dcfick', miss: miss(r, d, ['asc', 'age', 'fc', 'sex', 'cao2', 'cvo2']) });
    mk(it, r, d, { id: 'ci', l: `Índice cardíaco${d.dcSrc ? ' · ' + d.dcSrc : ''}`, u: 'L/min/m²', dec: 2, ref: 'ci', req: ['dc', 'asc'], fn: () => { const ci = d.dc / d.asc; d.ci = ci; return { v: ci, fl: ci < 2.2 ? 'crit' : ci < 2.5 ? 'warn' : ci > 4.5 ? 'warn' : 'ok', n: `DC ${fmt(d.dc, 2)} L/min · ASC ${fmt(d.asc, 2)} m²` }; } });
    if (d.dcSrc !== 'Fick est.') {
      mk(it, r, d, { id: 'do2', l: 'DO2I', u: 'mL/min/m²', ref: 'do2', req: ['dc', 'asc', 'cao2'], fn: () => { const x = (d.dc * d.cao2 * 10) / d.asc; return { v: x, fl: x < 400 ? 'crit' : x < 500 ? 'warn' : 'ok', n: `DO2 ${fmt(d.dc * d.cao2 * 10)} mL/min` }; } });
      mk(it, r, d, { id: 'vo2', l: 'VO2I', u: 'mL/min/m²', ref: 'vo2', req: ['dc', 'asc', 'cao2', 'cvo2'], fn: () => { const x = (d.dc * d.avdo2 * 10) / d.asc; return { v: x, fl: flag(x, 110, 160), n: `VO2 ${fmt(d.dc * d.avdo2 * 10)} mL/min` }; } });
    }
    mk(it, r, d, { id: 'rvs', l: 'RVS', u: 'dyn·s·cm⁻⁵', ref: 'rvs', req: ['pam', 'pvc', 'dc'], fn: () => { const x = (80 * (d.pam - r.pvc)) / d.dc; return { v: x, fl: x < 700 ? 'warn' : x > 1400 ? 'warn' : 'ok', n: `${x < 800 ? 'baixa (vasoplegia?)' : x > 1200 ? 'alta (vasoconstrição)' : 'normal'}${d.asc ? ` · RVSI ${fmt(x * d.asc)}` : ''}` }; } });
    mk(it, r, d, { id: 'rvp', l: 'RVP', u: 'dyn·s·cm⁻⁵', ref: 'rvp', req: ['papm', 'poap', 'dc'], fn: () => { const x = (80 * (r.papm - r.poap)) / d.dc; return { v: x, fl: x > 250 ? 'warn' : 'ok', n: `${fmt(x / 80, 1)} UW` }; } });
    mk(it, r, d, { id: 'cpo', l: 'Potência cardíaca', u: 'W', dec: 2, ref: 'cpo', req: ['pam', 'dc'], fn: () => { const x = (d.pam * d.dc) / 451; return { v: x, fl: x < 0.6 ? 'crit' : 'ok', n: x < 0.6 ? 'baixa — prognóstico ruim no choque cardiogênico' : '' }; } });
    if (d.pam != null && d.pam < alvo) dx.push({ t: `PAM ${fmt(d.pam)} mmHg (< alvo ${alvo})`, s: d.pam < alvo - 5 ? 'crit' : 'warn', ch: 'hemo' });
    if (d.ci != null && d.ci < 2.2) dx.push({ t: `IC ${fmt(d.ci, 2)} (${d.dcSrc}): baixo débito${d.dcSrc === 'Fick est.' ? ' — estimativa grosseira' : ''}`, s: 'crit', ch: 'hemo' });
    return { it };
  }

  // ---------- fluido-responsividade
  function fluid(r, d, S, dx) {
    const it = [];
    const t = r.ftest;
    if (!t) return { it };
    const pct = (a, b) => ((b - a) / a) * 100;
    const verdict = (res, s, n, ref, v, dec = 0, u = '%') => {
      it.push({ id: 'fr_' + t, l: res, v, dec, u, ref, fl: s, n, verdict: true });
      dx.push({ t: `Fluido: ${res}${Number.isFinite(v) ? ` (${fmt(v, dec)}${u})` : ''}`, s: s === 'ok' ? 'ok' : 'warn', ch: 'fluid' });
    };
    if (t === 'vpp' || t === 'vvs') {
      let v = t === 'vpp' ? (H(r.ppv) ? +r.ppv : H(r.ppMax) && H(r.ppMin) ? ((r.ppMax - r.ppMin) / ((+r.ppMax + +r.ppMin) / 2)) * 100 : null) : H(r.svv) ? +r.svv : null;
      if (v == null) { it.push({ id: 'fr_' + t, l: t === 'vpp' ? 'VPP' : 'VVS', ref: t, miss: t === 'vpp' ? ['ppv'] : ['svv'] }); return { it }; }
      const inval = [];
      if (r.chkVc !== true) inval.push('VM controlada sem esforço');
      if (r.chkSinus !== true) inval.push('ritmo sinusal');
      if (r.chkTorax !== true) inval.push('tórax fechado');
      if (H(r.vt) && d.pbw) { if (r.vt / d.pbw < 8) inval.push(`Vt ${fmt(r.vt / d.pbw, 1)} mL/kg (< 8)`); }
      else if (r.chkVt8 !== true) inval.push('Vt ≥ 8 mL/kg');
      if (H(r.fc) && H(r.fr) && r.fc / r.fr <= 3.6) inval.push(`FC/FR ${fmt(r.fc / r.fr, 1)} (≤ 3,6)`);
      const cst = H(r.vt) && d.dp ? r.vt / d.dp : null;
      const hiT = t === 'vpp' ? 13 : 12, loT = t === 'vpp' ? 9 : 10;
      if (inval.length) {
        const lowVtOnly = inval.length === 1 && /Vt/.test(inval[0]);
        verdict('Não interpretável', 'warn', `Falta: ${inval.join(' · ')}${lowVtOnly ? ' → usar tidal volume challenge' : ' → preferir PLR / EEO'}`, t, v, 1);
      } else if (v > hiT) verdict('Responsivo', 'ok', `${t.toUpperCase()} > ${hiT} %${cst && cst < 30 ? ' · complacência baixa reduz acurácia' : ''}`, t, v, 1);
      else if (v >= loT) verdict('Zona cinzenta', 'warn', `${loT}–${hiT} %: confirmar com PLR/EEO/VtC`, t, v, 1);
      else verdict('Não responsivo', 'ok', `< ${loT} %${cst && cst < 30 ? ' · complacência baixa: falso-negativo possível' : ''}`, t, v, 1);
    } else if (t === 'plr' || t === 'mfc' || (t === 'eeo' && r.fMet !== 'vti')) {
      if (!H(r.fBase) || !H(r.fPost)) { it.push({ id: 'fr_' + t, l: 'Δ do teste', ref: t, miss: miss(r, d, ['fBase', 'fPost']) }); return { it }; }
      const v = pct(+r.fBase, +r.fPost);
      const cut = t === 'plr' ? 10 : t === 'eeo' ? 5 : r.fMet === 'vti' ? 10 : 5;
      const lbl = t === 'plr' ? 'PLR' : t === 'eeo' ? 'EEO' : 'Mini-bolus';
      verdict(v >= cut ? 'Responsivo' : 'Não responsivo', 'ok', `${lbl}: Δ ${fmt(v, 1)} % (corte ≥ ${cut} %)${t === 'plr' && v > 32 ? ' · hipovolemia marcada' : ''}`, t, v, 1);
    } else if (t === 'eeo') {
      if (!H(r.fBase) || !H(r.fPost) || !H(r.fEio)) { it.push({ id: 'fr_eeo', l: 'EEO + EIO', ref: 'eeo', miss: miss(r, d, ['fBase', 'fPost', 'fEio']) }); return { it }; }
      const a = Math.abs(pct(+r.fBase, +r.fPost)), b = Math.abs(pct(+r.fBase, +r.fEio));
      verdict(a + b >= 13 ? 'Responsivo' : 'Não responsivo', 'ok', `|ΔEEO| ${fmt(a, 1)} + |ΔEIO| ${fmt(b, 1)} = ${fmt(a + b, 1)} % (corte ≥ 13 %)`, 'eeo', a + b, 1);
    } else if (t === 'vci') {
      if (!H(r.vciMax) || !H(r.vciMin)) { it.push({ id: 'fr_vci', l: 'VCI', ref: 'vci', miss: miss(r, d, ['vciMax', 'vciMin']) }); return { it }; }
      if (r.sup === 'VM') {
        const v = ((r.vciMax - r.vciMin) / r.vciMin) * 100;
        verdict(v > 18 ? 'Responsivo' : 'Não responsivo', 'ok', `Distensibilidade ${fmt(v, 1)} % (VM; corte > 18 %). Exige Vt ≥ 8 e sem esforço.`, 'vci', v, 1);
      } else {
        const v = ((r.vciMax - r.vciMin) / r.vciMax) * 100;
        verdict(v >= 40 ? 'Sugere responsivo' : 'Indeterminado', 'warn', `Colapsabilidade ${fmt(v, 1)} % (espontânea; baixa acurácia)`, 'vci', v, 1);
      }
    } else if (t === 'vtc') {
      if (!H(r.ppv6) || !H(r.ppv8)) { it.push({ id: 'fr_vtc', l: 'VtC', ref: 'vtc', miss: miss(r, d, ['ppv6', 'ppv8']) }); return { it }; }
      const v = r.ppv8 - r.ppv6;
      verdict(v >= 3.5 ? 'Responsivo' : 'Não responsivo', 'ok', `ΔVPP ${fmt(v, 1)} pontos (corte ≥ 3,5)`, 'vtc', v, 1, ' pts');
    }
    return { it };
  }

  // ---------- ventilação
  function vent(r, d, S, dx) {
    const it = [];
    mk(it, r, d, { id: 'pbw', l: 'Peso predito', u: 'kg', dec: 1, ref: 'pbw', req: ['pbw'], fn: () => ({ v: d.pbw, fl: null, n: `Vt 6 mL/kg = ${fmt(d.pbw * 6)} mL · 8 mL/kg = ${fmt(d.pbw * 8)} mL` }) });
    mk(it, r, d, { id: 'vtkg', l: 'Vt / PBW', u: 'mL/kg', dec: 1, ref: 'vtkg', req: ['vt', 'pbw'], fn: () => { const x = r.vt / d.pbw; return { v: x, fl: x > 8 ? 'crit' : x > 6.5 ? 'warn' : 'ok' }; } });
    mk(it, r, d, { id: 'dp', l: 'Driving pressure', u: 'cmH2O', ref: 'dp', req: ['dp'], fn: () => ({ v: d.dp, fl: d.dp > 15 ? (d.dp >= 18 ? 'crit' : 'warn') : 'ok' }) });
    mk(it, r, d, { id: 'cst', l: 'Complacência estática', u: 'mL/cmH2O', ref: 'cst', req: ['vt', 'dp'], fn: () => { if (d.dp <= 0) return null; const x = r.vt / d.dp; return { v: x, fl: x < 30 ? 'warn' : 'ok' }; } });
    mk(it, r, d, { id: 'raw', l: 'Resistência', u: 'cmH2O/L/s', dec: 1, ref: 'raw', req: ['ppico', 'pplat', 'fluxo'], fn: () => { const x = (r.ppico - r.pplat) / (r.fluxo / 60); return { v: x, fl: x > 15 ? 'warn' : 'ok' }; } });
    mk(it, r, d, { id: 'vr', l: 'Ventilatory ratio', dec: 2, ref: 'vr', req: ['ve', 'paco2', 'pbw'], fn: () => { const x = (d.ve * 1000 * r.paco2) / (d.pbw * 100 * 37.5); return { v: x, fl: x > 2 ? 'warn' : 'ok', n: `VE ${fmt(d.ve, 1)} L/min` }; } });
    mk(it, r, d, { id: 'mp', l: 'Mechanical power', u: 'J/min', dec: 1, ref: 'mp', req: ['fr', 'vt', 'ppico', 'dp'], fn: () => { const x = 0.098 * r.fr * (r.vt / 1000) * (r.ppico - d.dp / 2); return { v: x, fl: x > 17 ? 'warn' : 'ok' }; } });
    if (d.dp != null && d.dp > 15) dx.push({ t: `Driving pressure ${fmt(d.dp)} cmH2O (> 15)`, s: 'warn', ch: 'vent' });
    if (H(r.vt) && d.pbw && r.vt / d.pbw > 8) dx.push({ t: `Vt ${fmt(r.vt / d.pbw, 1)} mL/kg PBW (> 8)`, s: 'crit', ch: 'vent' });
    return { it };
  }

  // ---------- renal / eletrólitos
  function renal(r, d, S, dx) {
    const it = [];
    mk(it, r, d, {
      id: 'ckd', l: 'eTFG CKD-EPI 2021', u: 'mL/min/1,73m²', ref: 'ckd', req: ['cr', 'age', 'sex'],
      fn: () => {
        const f = r.sex === 'F', k = f ? 0.7 : 0.9, a = f ? -0.241 : -0.302, x = r.cr / k;
        const g = 142 * Math.pow(Math.min(x, 1), a) * Math.pow(Math.max(x, 1), -1.2) * Math.pow(0.9938, r.age) * (f ? 1.012 : 1);
        const drc = Array.isArray(r.com) && (r.com.includes('DRC') || r.com.includes('DRC-D'));
        return { v: g, fl: g < 30 ? 'crit' : g < 60 ? 'warn' : 'ok', n: `não válido em IRA${drc ? ' · DRC prévia' : ''}` };
      },
    });
    mk(it, r, d, { id: 'cg', l: 'ClCr Cockcroft-Gault', u: 'mL/min', ref: 'cg', req: ['cr', 'age', 'weight', 'sex'], fn: () => { const x = ((140 - r.age) * r.weight) / (72 * r.cr) * (r.sex === 'F' ? 0.85 : 1); return { v: x, fl: x < 30 ? 'crit' : x < 60 ? 'warn' : 'ok', n: 'peso real' }; } });
    // KDIGO
    let stCr = null, stUo = null, uo = null;
    if (H(r.cr) && H(r.crBase) && r.crBase > 0) { const q = r.cr / r.crBase; stCr = q >= 3 || r.cr >= 4 ? 3 : q >= 2 ? 2 : q >= 1.5 || r.cr - r.crBase >= 0.3 ? 1 : 0; }
    if (H(r.diu) && H(r.diuH) && H(r.weight) && r.diuH > 0) {
      uo = r.diu / r.diuH / r.weight;
      stUo = (uo < 0.3 && r.diuH >= 24) || (r.diu == 0 && r.diuH >= 12) ? 3 : uo < 0.5 && r.diuH >= 12 ? 2 : uo < 0.5 && r.diuH >= 6 ? 1 : 0;
    }
    if (stCr != null || stUo != null) {
      const st = Math.max(stCr ?? 0, stUo ?? 0);
      it.push({ id: 'kdigo', l: 'KDIGO', v: st ? `Estágio ${st}` : 'Sem critério', txt: true, ref: 'kdigo', fl: st >= 2 ? 'crit' : st === 1 ? 'warn' : 'ok', n: [stCr != null && `Cr ${fmt(r.cr / r.crBase, 1)}× basal`, uo != null && `diurese ${fmt(uo, 2)} mL/kg/h em ${fmt(+r.diuH)} h`].filter(Boolean).join(' · ') });
      if (st) dx.push({ t: `LRA KDIGO estágio ${st}`, s: st >= 2 ? 'crit' : 'warn', ch: 'renal' });
    } else it.push({ id: 'kdigo', l: 'KDIGO', ref: 'kdigo', miss: miss(r, d, ['cr', 'crBase']) });
    mk(it, r, d, { id: 'fena', l: 'FeNa', u: '%', dec: 2, ref: 'fena', req: ['uNa', 'cr', 'na', 'uCr'], fn: () => { const x = (r.uNa * r.cr) / (r.na * r.uCr) * 100; return { v: x, fl: null, n: x < 1 ? 'pré-renal provável' : x > 2 ? 'renal (NTA) provável' : 'indeterminado' }; } });
    mk(it, r, d, { id: 'feur', l: 'FeUreia', u: '%', dec: 1, ref: 'feur', req: ['uUr', 'cr', 'ureia', 'uCr'], fn: () => { const x = (r.uUr * r.cr) / (r.ureia * r.uCr) * 100; return { v: x, fl: null, n: x < 35 ? 'pré-renal provável' : 'renal provável' }; } });
    mk(it, r, d, { id: 'osm', l: 'Osmolaridade calc.', u: 'mOsm/L', ref: 'osm', req: ['na', 'glic', 'ureia'], fn: () => { const x = 2 * r.na + r.glic / 18 + r.ureia / 6; d.osm = x; return { v: x, fl: flag(x, 275, 295, 260, 320) }; } });
    mk(it, r, d, { id: 'osmgap', l: 'Gap osmolar', u: 'mOsm', ref: 'osmgap', req: ['osmMed', 'na', 'glic', 'ureia'], fn: () => { const x = r.osmMed - (2 * r.na + r.glic / 18 + r.ureia / 6); return { v: x, fl: x > 10 ? 'crit' : 'ok', n: x > 10 ? 'álcoois tóxicos? manitol?' : '' }; } });
    if (H(r.na) && H(r.glic) && r.glic > 150) {
      const k = +r.na + 1.6 * (r.glic - 100) / 100, h = +r.na + 2.4 * (r.glic - 100) / 100;
      it.push({ id: 'nacorr', l: 'Na corrigido (glicemia)', v: h, dec: 0, u: 'mEq/L', ref: 'nacorr', fl: flag(h, 135, 145, 125, 155), n: `Hillier ${fmt(h)} · Katz ${fmt(k)}` });
    }
    if (H(r.na) && r.na > 145) {
      mk(it, r, d, { id: 'fwd', l: 'Déficit de água livre', u: 'L', dec: 1, ref: 'fwd', req: ['weight', 'age', 'sex'], fn: () => { const old = r.age >= 65, f = r.sex === 'F'; const k = f ? (old ? 0.45 : 0.5) : old ? 0.5 : 0.6; return { v: r.weight * k * (r.na / 140 - 1), fl: 'warn', n: `ACT ${fmt(r.weight * k, 1)} L · corrigir ≤ 10 mEq/L/24 h` }; } });
    }
    if (H(r.k) && (r.k >= 6 || r.k < 3)) dx.push({ t: `K ${fmt(+r.k, 1)} mEq/L`, s: r.k >= 6.5 || r.k < 2.5 ? 'crit' : 'warn', ch: 'renal' });
    if (H(r.na) && (r.na < 130 || r.na > 150)) dx.push({ t: `Na ${fmt(+r.na)} mEq/L`, s: r.na < 120 || r.na > 160 ? 'crit' : 'warn', ch: 'renal' });
    if (it.find((x) => x.id === 'osmgap' && x.v > 10)) dx.push({ t: 'Gap osmolar > 10: investigar álcoois tóxicos', s: 'crit', ch: 'renal' });
    return { it };
  }

  // ---------------------------------------------------------------- API
  const CHANNELS = [
    { id: 'ab', t: 'Ácido-base' },
    { id: 'st', t: 'Stewart' },
    { id: 'o2', t: 'Oxigenação' },
    { id: 'perf', t: 'Perfusão · O2 tecidual' },
    { id: 'fluid', t: 'Fluido-responsividade' },
    { id: 'hemo', t: 'Hemodinâmica · débito' },
    { id: 'vent', t: 'Mecânica ventilatória' },
    { id: 'renal', t: 'Renal · eletrólitos' },
  ];

  function compute(r, S = {}, ctx = {}) {
    const d = derive(r, S);
    const dx = [];
    const ab = acidBase(r, d, S, dx);
    const ch = {
      ab: ab.it, st: ab.st,
      o2: oxy(r, d, S, dx).it,
      perf: perf(r, d, S, dx, ctx).it,
      fluid: fluid(r, d, S, dx).it,
      hemo: hemo(r, d, S, dx).it,
      vent: vent(r, d, S, dx).it,
      renal: renal(r, d, S, dx).it,
    };
    const rank = { crit: 3, warn: 2, ok: 1 };
    let worst = null;
    for (const x of dx) if (!worst || rank[x.s] > rank[worst]) worst = x.s;
    // valores-chave para quadro de leitos / tendências
    const key = {
      ph: H(r.ph) ? +r.ph : null, paco2: H(r.paco2) ? +r.paco2 : null, hco3: H(r.hco3) ? +r.hco3 : null,
      be: d.sbe, lac: d.lac, agc: d.agU, pf: d.pf ?? null, sf: d.sf ?? null, gap: d.gap ?? null,
      svo2: H(r.svo2) ? +r.svo2 : null, ci: d.ci ?? null, dp: d.dp, pam: d.pam,
      na: H(r.na) ? +r.na : null, k: H(r.k) ? +r.k : null, cr: H(r.cr) ? +r.cr : null, hb: H(r.hb) ? +r.hb : null,
    };
    return { d, dx, ch, worst, key, main: dx.find((x) => x.main) || null };
  }

  // ================================================================ campos
  // Definição dos campos de entrada.
  // l: rótulo · u: unidade · n: faixa normal [lo, hi] · p: faixa plausível · neg: aceita negativo · mask: entrada inteligente
  const F = {
    // paciente (gravados no cadastro do paciente)
    sex: { l: 'Sexo', type: 'enum', opts: [['M', 'Masc'], ['F', 'Fem']], demo: true },
    age: { l: 'Idade', u: 'anos', p: C.LIM.idade, demo: true },
    height: { l: 'Altura', u: 'cm', p: C.LIM.altura, demo: true },
    weight: { l: 'Peso', u: 'kg', p: C.LIM.peso, demo: true },

    // gasometria arterial (ordem do laudo do gasômetro)
    ph: { l: 'pH', u: '', n: [7.35, 7.45], p: [6.6, 7.9], mask: 'ph' },
    paco2: { l: 'PaCO2', u: 'mmHg', n: [35, 45], p: [10, 150] },
    pao2: { l: 'PaO2', u: 'mmHg', n: [80, 100], p: [20, 650] },
    hco3: { l: 'HCO3', u: 'mEq/L', n: [22, 26], p: [2, 60] },
    be: { l: 'BE', u: 'mmol/L', n: [-2, 2], p: [-35, 35], neg: true },
    sao2: { l: 'SaO2', u: '%', n: [94, 100], p: [30, 100] },
    na: { l: 'Na', u: 'mEq/L', n: [135, 145], p: [100, 190] },
    k: { l: 'K', u: 'mEq/L', n: [3.5, 5.0], p: [1, 10] },
    cl: { l: 'Cl', u: 'mEq/L', n: [98, 107], p: [60, 150] },
    ica: { l: 'Ca ion.', u: 'mmol/L', n: [1.12, 1.32], p: [0.4, 2.5] },
    glic: { l: 'Glicose', u: 'mg/dL', n: [70, 180], p: [10, 2000] },
    lac: { l: 'Lactato', u: 'mmol/L', n: [0.5, 2], p: [0.1, 30], lacUnit: true },
    hb: { l: 'Hb', u: 'g/dL', n: [12, 16], p: [2, 25] },
    fio2: { l: 'FiO2', u: '%', p: [21, 100] },

    // bioquímica
    alb: { l: 'Albumina', u: 'g/dL', n: [3.5, 5], p: [0.5, 7] },
    ureia: { l: 'Ureia', u: 'mg/dL', n: [15, 45], p: [2, 600] },
    cr: { l: 'Creatinina', u: 'mg/dL', n: [0.6, 1.2], p: [0.1, 25] },
    mg: { l: 'Mg', u: 'mg/dL', n: [1.7, 2.4], p: [0.3, 10] },
    phos: { l: 'Fósforo', u: 'mg/dL', n: [2.5, 4.5], p: [0.3, 20] },
    osmMed: { l: 'Osm medida', u: 'mOsm/kg', n: [275, 295], p: [200, 450] },

    // venosa central
    pvco2: { l: 'PvCO2', u: 'mmHg', n: [41, 51], p: [10, 160] },
    svo2: { l: 'ScvO2', u: '%', n: [70, 85], p: [5, 100] },
    pvo2: { l: 'PvO2', u: 'mmHg', n: [35, 45], p: [5, 200] },

    // hemodinâmica e perfusão
    pas: { l: 'PAS', u: 'mmHg', n: [90, 140], p: [30, 280] },
    pad: { l: 'PAD', u: 'mmHg', n: [50, 90], p: [10, 180] },
    pam: { l: 'PAM', u: 'mmHg', n: [65, 100], p: [20, 200] },
    fc: { l: 'FC', u: 'bpm', n: [60, 100], p: [20, 250] },
    pvc: { l: 'PVC', u: 'mmHg', n: [2, 8], p: [-5, 40], neg: true },
    tec: { l: 'TEC', u: 's', n: [0, 3], p: [0, 15] },
    lacPrev: { l: 'Lactato prévio', u: 'mmol/L', p: [0.1, 30], lacUnit: true },
    lacPrevH: { l: 'Há quanto', u: 'h', p: [0.1, 72] },

    // débito
    dvsve: { l: 'Ø VSVE', u: 'cm', n: [1.8, 2.4], p: [1.2, 3.5] },
    vti: { l: 'VTI VSVE', u: 'cm', n: [18, 22], p: [3, 45] },
    dcMed: { l: 'DC medido', u: 'L/min', n: [4, 8], p: [0.5, 20] },
    papm: { l: 'PAPm', u: 'mmHg', n: [10, 20], p: [5, 90] },
    poap: { l: 'POAP', u: 'mmHg', n: [6, 12], p: [1, 50] },

    // suporte ventilatório
    sup: { l: 'Suporte', type: 'enum', opts: [['AA', 'Ar amb.'], ['O2', 'O2'], ['CNAF', 'CNAF'], ['VNI', 'VNI'], ['VM', 'VM']] },
    spo2: { l: 'SpO2', u: '%', n: [92, 98], p: [40, 100] },
    fr: { l: 'FR', u: 'irpm', n: [12, 20], p: [4, 70] },
    vt: { l: 'Vt', u: 'mL', p: [100, 1500] },
    peep: { l: 'PEEP', u: 'cmH2O', p: [0, 30] },
    pplat: { l: 'Pplatô', u: 'cmH2O', n: [0, 30], p: [5, 60] },
    ppico: { l: 'Ppico', u: 'cmH2O', p: [5, 80] },
    paw: { l: 'Paw média', u: 'cmH2O', p: [2, 45] },
    fluxo: { l: 'Fluxo', u: 'L/min', p: [10, 120] },
    ve: { l: 'VE', u: 'L/min', p: [1, 40] },

    // renal
    crBase: { l: 'Cr basal', u: 'mg/dL', p: [0.1, 15], demo: true },
    pamAlvo: { l: 'PAM alvo', u: 'mmHg', p: [50, 110], demo: true },
    diu: { l: 'Diurese', u: 'mL', p: [0, 15000] },
    diuH: { l: 'Período', u: 'h', p: [1, 48] },
    uNa: { l: 'Na urinário', u: 'mEq/L', p: [1, 300] },
    uCr: { l: 'Cr urinária', u: 'mg/dL', p: [1, 500] },
    uUr: { l: 'Ureia urinária', u: 'mg/dL', p: [10, 5000] },

    // fluido-responsividade
    ftest: { l: 'Teste', type: 'enum', opts: [['vpp', 'VPP'], ['vvs', 'VVS'], ['plr', 'PLR'], ['eeo', 'EEO'], ['mfc', 'Mini-bolus'], ['vci', 'VCI'], ['vtc', 'VtC']] },
    fMet: { l: 'Medida', type: 'enum', opts: [['mon', 'Monitor DC'], ['vti', 'VTI eco']] },
    ppv: { l: 'VPP', u: '%', p: [0, 60] },
    ppMax: { l: 'PP máx', u: 'mmHg', p: [5, 200] },
    ppMin: { l: 'PP mín', u: 'mmHg', p: [5, 200] },
    svv: { l: 'VVS', u: '%', p: [0, 60] },
    fBase: { l: 'Basal', u: '', p: [0.1, 100] },
    fPost: { l: 'Durante', u: '', p: [0.1, 100] },
    fEio: { l: 'Pós-EIO', u: '', p: [0.1, 100] },
    vciMax: { l: 'VCI máx', u: 'cm', p: [0.2, 4] },
    vciMin: { l: 'VCI mín', u: 'cm', p: [0.1, 4] },
    ppv6: { l: 'VPP Vt 6', u: '%', p: [0, 60] },
    ppv8: { l: 'VPP Vt 8', u: '%', p: [0, 60] },
    chkVc: { l: 'VM controlada, sem esforço', type: 'bool' },
    chkSinus: { l: 'Ritmo sinusal', type: 'bool' },
    chkTorax: { l: 'Tórax fechado', type: 'bool' },
    chkVt8: { l: 'Vt ≥ 8 mL/kg', type: 'bool' },
  };

  const GROUPS = [
    { id: 'pac', t: 'Paciente', ch: 'base', f: ['sex', 'age', 'height', 'weight'] },
    { id: 'gaso', t: 'Gasometria arterial', ch: 'ab', f: ['ph', 'paco2', 'pao2', 'hco3', 'be', 'sao2', 'na', 'k', 'cl', 'ica', 'glic', 'lac', 'hb', 'fio2'], open: true },
    { id: 'bio', t: 'Bioquímica', ch: 'renal', f: ['alb', 'ureia', 'cr', 'mg', 'phos', 'osmMed'] },
    { id: 'ven', t: 'Gasometria venosa central', ch: 'perf', f: ['pvco2', 'svo2', 'pvo2'] },
    { id: 'hemo', t: 'Hemodinâmica · perfusão', ch: 'hemo', f: ['pas', 'pad', 'pam', 'fc', 'pvc', 'tec', 'pamAlvo', 'lacPrev', 'lacPrevH'] },
    { id: 'dc', t: 'Débito cardíaco', ch: 'hemo', f: ['dvsve', 'vti', 'dcMed', 'papm', 'poap'] },
    { id: 'vent', t: 'Suporte ventilatório', ch: 'vent', f: ['sup', 'spo2', 'fr', 'vt', 'peep', 'pplat', 'ppico', 'paw', 'fluxo', 've'] },
    { id: 'fluid', t: 'Fluido-responsividade', ch: 'fluid', f: ['ftest'], dyn: true },
    { id: 'ren', t: 'Função renal', ch: 'renal', f: ['crBase', 'diu', 'diuH', 'uNa', 'uCr', 'uUr'] },
  ];

  // campos do teste de fluido conforme o teste escolhido
  function fluidFields(r) {
    const t = r.ftest;
    const checks = ['chkVc', 'chkSinus', 'chkTorax', 'chkVt8'];
    switch (t) {
      case 'vpp': return ['ppv', 'ppMax', 'ppMin', ...checks];
      case 'vvs': return ['svv', ...checks];
      case 'plr': return ['fBase', 'fPost'];
      case 'eeo': return r.fMet === 'vti' ? ['fMet', 'fBase', 'fPost', 'fEio'] : ['fMet', 'fBase', 'fPost'];
      case 'mfc': return ['fMet', 'fBase', 'fPost'];
      case 'vci': return ['vciMax', 'vciMin'];
      case 'vtc': return ['ppv6', 'ppv8'];
      default: return [];
    }
  }

  function fluidLabel(id, r) {
    const t = r.ftest, m = r.fMet === 'vti' ? 'VTI' : 'DC';
    const u = r.fMet === 'vti' ? 'cm' : 'L/min';
    if (t === 'plr') return { fBase: ['DC ou VTI basal', ''], fPost: ['Pico na PLR', ''] }[id];
    if (t === 'eeo') return { fBase: [`${m} basal`, u], fPost: [`${m} na EEO`, u], fEio: ['VTI na EIO', 'cm'] }[id];
    if (t === 'mfc') return { fBase: [`${m} basal`, u], fPost: [`${m} pós-bolus`, u] }[id];
    return null;
  }

  // ficha do paciente
  const DEMO = Object.keys(F).filter((k) => F[k].demo);
  const COM = [['HAS', 'HAS'], ['DM', 'DM'], ['DRC', 'DRC'], ['DRC-D', 'DRC dialítica'], ['DPOC', 'DPOC'], ['ICC', 'ICC'], ['DAC', 'DAC'], ['Cirrose', 'Cirrose'], ['Neo', 'Neoplasia'], ['Imuno', 'Imunossupr.'], ['Obes', 'Obesidade'], ['AVC', 'AVC prévio']];
  const DEV = [['CVC', 'CVC'], ['PAI', 'PAI'], ['TOT', 'TOT'], ['TQT', 'TQT'], ['SVD', 'SVD'], ['HD', 'Hemodiálise'], ['Dreno', 'Dreno'], ['PICCO', 'PiCCO/Swan'], ['ECMO', 'ECMO'], ['BIA', 'BIA']];
  const ISO = [['', 'Sem'], ['contato', 'Contato'], ['goticula', 'Gotícula'], ['aerossol', 'Aerossol']];

  // séries exibidas na tendência: [chave em compute().key, rótulo, decimais, canal, faixa normal]
  const TREND = [
    ['ph', 'pH', 2, 'ab', [7.35, 7.45]],
    ['paco2', 'PaCO2', 0, 'ab', [35, 45]],
    ['hco3', 'HCO3', 0, 'ab', [22, 26]],
    ['be', 'BE', 1, 'ab', [-2, 2]],
    ['agc', 'AG', 1, 'ab', [8, 16]],
    ['lac', 'Lactato', 1, 'perf', [0.5, 2]],
    ['pf', 'P/F', 0, 'o2', [300, 500]],
    ['gap', 'Gap CO2', 1, 'perf', [0, 6]],
    ['svo2', 'ScvO2', 0, 'perf', [70, 85]],
    ['pam', 'PAM', 0, 'hemo', [65, 100]],
    ['ci', 'IC', 2, 'hemo', [2.5, 4]],
    ['dp', 'ΔP', 0, 'vent', [0, 15]],
    ['na', 'Na', 0, 'renal', [135, 145]],
    ['k', 'K', 1, 'renal', [3.5, 5]],
    ['cr', 'Cr', 2, 'renal', [0.6, 1.2]],
    ['hb', 'Hb', 1, 'renal', [7, 16]],
  ];

  C.engine = { compute, derive, REF, CHANNELS, fmt, H };
  C.gasF = { F, GROUPS, fluidFields, fluidLabel, TREND, DEMO, COM, DEV, ISO };
})();