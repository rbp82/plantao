# Auditoria clínica 2026-10 — parte 2: hemodinâmica, perfusão, débito, fluido-responsividade, mecânica ventilatória e função renal

Data: 11/10/2026 · Escopo: motor `web/src/lib/engine.ts` (funções `derive`, `perf`, `hemo`, `fluid`, `vent`, `renal` e objeto `REF`), `web/src/lib/core/renal.ts` e as calculadoras `web/src/tools/delta/*` (fluidos, gap de CO₂, débito, ventilação). Contexto: `AUDITORIA.md` §12–13 e `PESQUISA.md`.

Método: cada fórmula/limiar foi transcrito do código número a número e comparado com a fonte primária localizada no PubMed (ferramenta `pubmed` do plugin bio-research; PMIDs e DOIs conferidos nos metadados; quando o resumo não trazia o número, buscou-se o texto completo no PMC ou o artigo foi marcado como "não lido na íntegra"). Legenda: **CONFERE** = número a número igual à fonte · **DIVERGE** = diferente da fonte primária (corrigido) · **SEM FONTE PRIMÁRIA** = fórmula/limiar de livro-texto ou fisiologia, sem artigo original único · **[DI]** = decisão institucional (escolha entre fontes aceitáveis; não alterado).

Resultado em uma linha: 1 divergência inequívoca corrigida (Fick estimado em mulheres), 1 ajuste de borda (FeUreia = 35 %), 0 fórmulas restantes divergentes; 11 limiares classificados como decisão institucional; referências completas com PMID acrescentadas a todos os itens em `REF`, `renal.ts`, `delta.calc.ts` e rodapés `<Ref>` nas quatro telas.

## 1. Mecânica ventilatória e oxigenação (tela "Mecânica ventilatória")

| Item | Fórmula / limiar no app | Fonte (citação + PMID/DOI) | Resultado | Ação |
|---|---|---|---|---|
| `pbw` peso predito | H: 50 + 0,91 × (altura cm − 152,4); M: 45,5 + 0,91 × (altura − 152,4); nota Vt 6 e 8 mL/kg | ARDS Network (Brower RG et al.), NEJM 2000;342:1301; PMID 10793162; DOI 10.1056/NEJM200005043421801 | CONFERE (fórmula do protocolo ARDSNet; Vt inicial 6 mL/kg PBW) | PMID em REF |
| `vtkg` Vt/PBW | Vt/PBW; ok ≤ 6,5 · warn > 6,5 · crit > 8 mL/kg | ARDSNet 2000 (idem) | CONFERE para 6 e 8; o alerta intermediário 6,5 é [DI] | anotado em REF |
| `dp` driving pressure | Pplatô − PEEP; warn > 15 · crit ≥ 18 cmH₂O | Amato MBP et al., NEJM 2015;372:747; PMID 25693014; DOI 10.1056/NEJMsa1410639 | CONFERE (ΔP associado a mortalidade; +1 DP ≈ 7 cmH₂O → RR 1,41; 15 cmH₂O é o corte usado na literatura derivada). Crítico 18 = [DI] | PMID em REF |
| `cst` complacência estática | Vt / (Pplatô − PEEP); omitido se ΔP ≤ 0; warn < 30 mL/cmH₂O | Fisiologia; corte 30: Monnet X et al., Crit Care Med 2012;40:152; PMID 21926581 (Cst ≤ 30 reduz acurácia da VPP) | SEM FONTE PRIMÁRIA (fórmula clássica) / corte 30 CONFERE com Monnet 2012 | fonte em REF |
| `raw` resistência | (Ppico − Pplatô) / (fluxo L/min ÷ 60); warn > 15 cmH₂O/L/s | Fisiologia (fluxo quadrado, VCV) | SEM FONTE PRIMÁRIA (fórmula correta; corte de livro-texto) | anotado |
| `vr` ventilatory ratio | (VE L/min × 1000 × PaCO₂) / (PBW × 100 × 37,5); VE = Vt × FR/1000 se não informado; warn > 2 | Sinha P et al., Br J Anaesth 2009;102:692; PMID 19346233; Sinha P et al., AJRCCM 2019;199:333; PMID 30211618 ("[VE (mL/min) × PaCO₂]/(PBW × 100 × 37,5)") | CONFERE (fórmula idêntica à do resumo de 2019). Corte 2 = [DI] (associação contínua com mortalidade) | PMIDs em REF |
| `mp` mechanical power | 0,098 × FR × Vt(L) × (Ppico − ΔP/2); warn > 17 J/min | Gattinoni L et al., Intensive Care Med 2016;42:1567; PMID 27620287 (forma simplificada para VCV); Serpa Neto A et al., ICM 2018;44:1914; PMID 30291378 ("aumento consistente do risco com MP > 17,0 J/min") | CONFERE | PMIDs em REF |
| `rox` índice ROX (preset CNAF) | (SpO₂/FiO₂)/FR; ok ≥ 4,88; crit < 3,85; notas 2,85 (2 h) e 3,85 (12 h); 3,47 (6 h) só no texto | Roca O et al., AJRCCM 2019;199:1368; PMID 30576221 (≥ 4,88 em 2/6/12 h; < 2,85, < 3,47, < 3,85 em 2, 6 e 12 h) | CONFERE | PMID em REF |

## 2. Hemodinâmica e débito (tela "Débito cardíaco e resistências")

| Item | Fórmula / limiar no app | Fonte | Resultado | Ação |
|---|---|---|---|---|
| `pam` | (PAS + 2 × PAD)/3 ou valor do monitor; alvo 65 (ou PAM alvo da ficha); crit < alvo − 5 | Evans L et al. (SSC 2021), Intensive Care Med 2021;47:1181; PMID 34599691 | CONFERE (alvo inicial 65 mmHg) | PMID em REF |
| `si` índice de choque | FC/PAS; warn > 0,9 · crit ≥ 1,3 | Allgöwer M & Burri C, Dtsch Med Wochenschr 1967;92:1947; PMID 5299769; Rady MY et al., Ann Emerg Med 1994;24:685; PMID 8092595 (normal 0,5–0,7; > 0,9 associado a gravidade) | CONFERE para 0,9; crítico 1,3 = [DI] (sem fonte primária) | PMIDs em REF |
| `cao2` / `cvo2` | 1,34 × Hb × Sat + 0,0031 × PO₂ (PO₂ opcional); crit < 12, warn < 16 mL/dL | Fisiologia clássica | SEM FONTE PRIMÁRIA; coeficiente 1,34 (vs 1,36/1,39) = [DI] | anotado em REF |
| `avdo2` | CaO₂ − CvO₂; warn > 5,5 mL/dL | Fisiologia | SEM FONTE PRIMÁRIA | anotado |
| `teo2` extração | (CaO₂ − CvO₂)/CaO₂ × 100 (ou pelas saturações sem Hb); warn > 30, crit > 40 % | Fisiologia | SEM FONTE PRIMÁRIA | anotado |
| `asc` | DuBois 0,007184 × peso^0,425 × altura^0,725 | Du Bois D & Du Bois EF, Arch Intern Med 1916;17:863 (reimpressão Nutrition 1989;5:303; PMID 2520314) | CONFERE | PMID em REF |
| `dcvti` | VS = π × (Ø/2)² × VTI; DC = VS × FC/1000; VTI < 15 cm = baixo; IC 2,5–4,0 | Fórmula clássica (ASE); Blanco P, Ultrasound J 2020;12:21; PMID 32318842 | CONFERE (fórmula); cortes de VTI = [DI] | PMID em REF |
| `dcfick` Fick estimado | VO₂ = ASC × (138,1 − 11,49·ln(idade) + 0,378·FC); **mulher no app: 138,1 − 17,04 − 11,49·ln(idade) + 0,378·FC**; DC = VO₂/((CaO₂ − CvO₂) × 10) | LaFarge CG & Miettinen OS, Cardiovasc Res 1970;4:23; PMID 5416840; DOI 10.1093/cvr/4.1.23 (sem resumo no PubMed); fórmula transcrita em Reiter T et al., Herz 2023;49:50; PMID 37439804 (PMC10830659, tabela 1): mulher = BSA × (138,1 − **17,04 × ln(idade)** + 0,378 × FC); erro vs termodiluição: Palanques-Tost E et al., JACC Adv 2025;4:101663; PMID 40286350 (MAPE 30 %, R² −1,5); Narang N et al., Circulation 2014;129:203; PMID 24077170 | **DIVERGE** (o 17,04 é o coeficiente de ln(idade) na mulher, não uma constante subtraída) | **CORRIGIDO** no motor, em REF e no teste |
| `ci` | DC/ASC; crit < 2,2 · warn < 2,5 ou > 4,5 | Fisiologia (Forrester) | SEM FONTE PRIMÁRIA | anotado |
| `do2` / `vo2` | DO₂ = DC × CaO₂ × 10 (DO₂I /ASC; crit < 400, warn < 500); VO₂ = DC × (CaO₂ − CvO₂) × 10 (VO₂I 110–160); omitidos se DC vier do Fick estimado | Fisiologia | SEM FONTE PRIMÁRIA | anotado |
| `rvs` | 80 × (PAM − PVC)/DC; normal 800–1200; warn < 700 ou > 1400 | Fisiologia | SEM FONTE PRIMÁRIA; sinalização 700/1400 = [DI] | anotado |
| `rvp` | 80 × (PAPm − POAP)/DC; warn > 250 dyn·s·cm⁻⁵; nota em UW (÷ 80), > 2 UW = HP | Humbert M et al. (ESC/ERS 2022), Eur Heart J 2022;43:3618; PMID 36017548 | CONFERE (> 2 UW na definição hemodinâmica 2022) | PMID em REF |
| `cpo` | PAM × DC / 451 W; crit < 0,6 | Fincke R et al. (SHOCK registry), JACC 2004;44:340; PMID 15261929 ("CPO (W) = PAM × DC/451") | CONFERE (fórmula). Corte 0,6 W: o resumo não fixa valor; uso clínico corrente = [DI] | anotado em REF |

## 3. Perfusão tecidual (tela "Gap de CO₂ e perfusão tecidual")

| Item | Fórmula / limiar no app | Fonte | Resultado | Ação |
|---|---|---|---|---|
| `svo2` | ScvO₂ medida; crit < 60 · warn < 70 ou > 85 % | Rivers E et al., NEJM 2001;345:1368; PMID 11794169 (alvo ≥ 70 %); ESICM 2025 (Monnet X et al.), Intensive Care Med 2025;51:1971; PMID 41236566 (medida seriada, boa prática) | CONFERE para 70; 60 e 85 = [DI] | PMIDs em REF |
| `gap` Pv−aCO₂ | PvCO₂ − PaCO₂; warn ≥ 6 mmHg; síntese "ScvO₂ ≥ 70 com gap ≥ 6" | Ospina-Tascón GA et al., Crit Care 2013;17:R294; PMID 24330804 ("Pv-aCO₂ ≥ 6 mmHg considerado alto"); Vallée F et al., Intensive Care Med 2008;34:2218; PMID 18607565 (corte 6 mmHg com ScvO₂ > 70 %) | CONFERE | PMIDs em REF |
| `gapratio` | ΔPCO₂/(CaO₂ − CvO₂); warn > 1,4 | Mekontso-Dessap A et al., Intensive Care Med 2002;28:272; PMID 11904655 (corte 1,4; PPV 86 %, NPV 80 %); Ospina-Tascón GA et al., ICM 2015;41:796; PMID 25792204 (usou > 1,0) | CONFERE com Mekontso-Dessap; escolha de 1,4 em vez de 1,0 = [DI] | PMIDs em REF |
| `lac` | mmol/L; warn > 2 · crit ≥ 4; choque séptico > 2 com vasopressor | Singer M et al. (Sepsis-3), JAMA 2016;315:801; PMID 26903338 ("lactato > 2 mmol/L"); corte 4 (Rivers 2001, critério de inclusão) | CONFERE para 2; 4 = [DI] | PMIDs em REF |
| `laccl` clearance | (prévio − atual)/prévio × 100; ok ≥ 10 % se prévio > 2; crit se subiu | Nguyen HB et al., Crit Care Med 2004;32:1637; PMID 15286537 (clearance ≥ 10 % em 6 h); Jansen TC et al., AJRCCM 2010;182:752; PMID 20463176 (meta ≥ 20 %/2 h); Evans L (SSC 2021); PMID 34599691 | CONFERE (10 % = Nguyen; 20 %/2 h citado no texto) | PMIDs em REF |
| `tec` | > 3 s alterado | Hernández G, JAMA 2019 (ANDROMEDA-SHOCK) — fora do escopo desta parte | — | — |

## 4. Fluido-responsividade (tela "Fluido-responsividade")

| Item | Fórmula / limiar no app | Fonte | Resultado | Ação |
|---|---|---|---|---|
| `vpp` | (PPmáx − PPmín)/[(PPmáx + PPmín)/2] × 100; responsivo > 13 · zona cinzenta 9–13 · não responsivo < 9 %; inválida sem VM controlada, ritmo sinusal, tórax fechado, Vt ≥ 8 mL/kg PBW; FC/FR ≤ 3,6 invalida; Cst < 30 reduz acurácia | Michard F et al., AJRCCM 2000;162:134; PMID 10903232 (fórmula idêntica; corte 13 %: S 94 %, E 96 %); Cannesson M et al., Anesthesiology 2011;115:231; PMID 21705869 (zona cinzenta 9–13 %); De Backer D et al., Anesthesiology 2009;110:1092; PMID 19352152 (VPP desprezível com FC/FR < 3,6); Monnet X, CCM 2012;40:152; PMID 21926581 (Cst 30); Monnet X, Shi R & Teboul JL, Ann Intensive Care 2022;12:46; PMID 35633423 | CONFERE | PMIDs em REF |
| `vvs` | VVS do monitor; responsivo > 12 · zona cinzenta 10–12 %; mesmas condições | Marik PE et al., Crit Care Med 2009;37:2642; PMID 19602972 (limiar médio 11,6 ± 1,9 %); Alvarado Sánchez JI et al., Ann Intensive Care 2021;11:28; PMID 33555488 (AUROC 0,90) | CONFERE (arredondamento do limiar agrupado); 10–12 = [DI] | PMIDs em REF |
| `plr` | Δ = (pico − basal)/basal × 100 no DC/VTI; responsivo ≥ 10 %; > 32 % "hipovolemia marcada" | Monnet X et al., Intensive Care Med 2016;42:1935; PMID 26825952 (melhor limiar ≥ 10 ± 2 %); Joseph A et al. (HEMOPRED), ICM 2024;50:1850; PMID 39254736 (hipovolemia = ΔVTI > 32 % na PLR, associada a mortalidade); ESICM 2025; PMID 41236566 | CONFERE | PMIDs em REF |
| `eeo` | pausa 15 s; monitor: Δ ≥ 5 %; eco: \|ΔEEO\| + \|ΔEIO\| ≥ 13 % | Monnet X et al., Crit Care Med 2009;37:951; PMID 19237902 (IC ≥ 5 %: S 91 %, E 100 %); Jozwiak M et al., Crit Care Med 2017;45:e1131; PMID 28857907 (soma ≥ 13 %; EEO isolada 5 %) | CONFERE | PMIDs em REF |
| `mfc` mini-bolus | 100–150 mL em 1–2 min; monitor ≥ 5 %; VTI ≥ 10 % | Muller L et al., Anesthesiology 2011;115:541; PMID 21792056 (ΔVTI ≥ 10 % após 100 mL/1 min); 5 % no contorno de pulso: revisão Monnet 2022; PMID 35633423 (Smorenberg, J Clin Anesth 2018, PMID 29367093: > 5,0 % após 150 mL) | CONFERE (VTI); 5 % = corte de revisão, [DI] | PMIDs em REF |
| `vci` | VM: (máx − mín)/mín > 18 %; espontânea: (máx − mín)/máx ≥ 40 % "sugere" | Barbier C et al., Intensive Care Med 2004;30:1740; PMID 15034650 (dIVC = (Dmáx − Dmín)/Dmín; corte 18 %: S 90 %, E 90 %); Muller L et al., Crit Care 2012;16:R188; PMID 23043910 (cIVC = (Dmáx − Dmín)/Dmáx; corte 40 %); Airapetian N et al., Crit Care 2015;19:400; PMID 26563768 (> 42 %) | CONFERE (18 % e 40 %); 40 vs 42 = [DI] | PMIDs em REF |
| `vtc` | ΔVPP (Vt 6 → 8 mL/kg, 1 min) ≥ 3,5 pontos | Myatra SN et al., Crit Care Med 2017;45:415; PMID 27922879 (melhor corte 3,5 % para VPP; 2,5 % para VVS) | CONFERE | PMIDs em REF |

## 5. Função renal (`engine.ts` renal + `core/renal.ts`)

| Item | Fórmula / limiar no app | Fonte | Resultado | Ação |
|---|---|---|---|---|
| `ckd` CKD-EPI 2021 (engine e renal.ts) | 142 × min(Cr/κ,1)^α × max(Cr/κ,1)^−1,2 × 0,9938^idade × 1,012 [M]; κ 0,7 (M)/0,9 (H); α −0,241 (M)/−0,302 (H); crit < 30, warn < 60 | Inker LA et al., NEJM 2021;385:1737; PMID 34554658; DOI 10.1056/NEJMoa2102953 (coeficientes conferidos na equação publicada pela NKF; o texto do artigo remete à tabela S) | CONFERE | PMID em REF e renal.ts |
| `cg` Cockcroft-Gault (engine: peso real; renal.ts: peso ideal/ajustado) | (140 − idade) × peso / (72 × Cr) × 0,85 [M] | Cockcroft DW & Gault MH, Nephron 1976;16:31; PMID 1244564; DOI 10.1159/000180580 ("15 % less in females") | CONFERE | PMID em REF e renal.ts |
| `ibw` Devine (renal.ts) | 50 (H)/45,5 (M) + 2,3 × (altura − 152,4)/2,54 | Devine BJ, Drug Intell Clin Pharm 1974;8:650 (não indexado no PubMed); Pai MP & Paloucek FP, Ann Pharmacother 2000;34:1066; PMID 10981254 | CONFERE | citação em renal.ts |
| `cgWeight` peso ajustado (renal.ts) | real se ≤ ideal; ideal até 130 % do ideal; ideal + 0,4 × excesso acima | Winter MA et al., Pharmacotherapy 2012;32:604; PMID 22576791 (ABW 0,4 menos viesado em sobrepeso/obesos); Brown DL, Ann Pharmacother 2013;47:1039; PMID 23757387; Emanuel NA, Clin Transplant 2023;37:e15059; PMID 37395991 (sugere 120 %) | CONFERE (fator 0,4); limiar 130 % = [DI] | citação em renal.ts |
| `kdigo` | Cr/basal: ≥ 1,5 ou +0,3 → 1; ≥ 2 → 2; ≥ 3 ou Cr ≥ 4 → 3. Diurese: < 0,5 mL/kg/h por 6–12 h → 1; ≥ 12 h → 2; < 0,3 ≥ 24 h ou anúria ≥ 12 h → 3 | KDIGO 2012 (Kidney Int Suppl 2012;2:1); resumo Kellum JA & Lameire N, Crit Care 2013;17:204; PMID 23394211 (tabela 1 lida no PMC4057151) | CONFERE. Limitação: o app não confere a janela de 48 h do +0,3 mg/dL nem o critério de TRS | anotado em REF |
| `fena` | (UNa × PCr)/(PNa × UCr) × 100; < 1 % pré-renal · > 2 % NTA | Espinel CH, JAMA 1976;236:579; PMID 947239 (pré-renal < 1; NTA > 3 no artigo original) | CONFERE para 1 %; > 2 % = [DI] (uso corrente) | PMID em REF |
| `feur` | (UUr × PCr)/(PUr × UCr) × 100; **app: < 35 %** pré-renal | Carvounis CP et al., Kidney Int 2002;62:2223; PMID 12427149 ("Low FEUN (≤ 35 %)") | DIVERGE na borda (35 % exato) | **CORRIGIDO** para ≤ 35 %; teste acrescentado |

## 6. Correções feitas (antes → depois, fonte)

1. **Fick estimado em mulheres** — `web/src/lib/engine.ts`, `derive()`.
   Antes: `k = 138.1 − (sexo F ? 17.04 : 0) − 11.49·ln(idade) + 0.378·FC` (subtraía 17,04 como constante e mantinha 11,49 em ln(idade)).
   Depois: `k = 138.1 − (sexo F ? 17.04 : 11.49)·ln(idade) + 0.378·FC`.
   Fonte: LaFarge CG & Miettinen OS, Cardiovasc Res 1970;4:23 (PMID 5416840; DOI 10.1093/cvr/4.1.23), fórmula transcrita na tabela 1 de Reiter T et al., Herz 2023;49:50 (PMID 37439804; PMC10830659): mulheres = BSA × (138,1 − 17,04 × ln(idade) + 0,378 × FC).
   Impacto: mulher de 60 anos, FC 90 → VO₂/ASC 108,0 (antes) vs 102,4 mL/min/m² (correto); DC estimado 5,6 % maior do que devia; o desvio cresce com a idade (aos 80 anos, ~9 %). O item já era rotulado "só tendência", mas a fórmula precisa estar certa. Texto de `REF.dcfick.f` corrigido ("[mulher: 138,1 − 17,04·ln(idade) + 0,378·FC]"); teste novo em `engine.test.ts` ("Fick estimado (LaFarge) em mulher…").
2. **FeUreia na borda** — `engine.ts`, `renal()`: `x < 35` → `x <= 35` para "pré-renal provável"; `REF.feur.c` "< 35 %" → "≤ 35 %". Fonte: Carvounis CP et al., Kidney Int 2002;62:2223 (PMID 12427149): "Low FEUN (≤ 35 %)". Teste novo em `engine.test.ts` (FeUr = 35 → pré-renal; 36 → renal) e FeNa 0,5 % (Espinel 1976, PMID 947239).

Nenhuma outra fórmula ou corte foi alterado. `tsc --noEmit` sem erros; `vitest run src/lib/engine src/lib/core src/tools/delta`: 7 arquivos, 187 testes verdes (11/10/2026).

## 7. Referências acrescentadas ao código

- `engine.ts` `REF`: campo `s` (fonte) de pbw, vtkg, dp, cst, raw, vr, mp, rox, pam, si, cao2, avdo2, teo2, svo2, gap, gapratio, lac, laccl, asc, dcvti, dcfick, ci, do2, vo2, rvs, rvp, cpo, vpp, vvs, plr, eeo, mfc, vci, vtc, ckd, cg, kdigo, fena, feur passou a trazer autor, periódico, ano, volume/página e PMID (formato "Amato MBP et al., NEJM 2015;372:747; PMID 25693014"). Nos itens em que o corte é decisão institucional, o campo `c` agora diz isso ("decisão institucional").
- `core/renal.ts`: comentários com Devine 1974/Pai 2000 (PMID 10981254), Winter 2012 (PMID 22576791), Brown 2013 (PMID 23757387), Emanuel 2023 (PMID 37395991), Cockcroft 1976 (PMID 1244564), Inker 2021 (PMID 34554658).
- `tools/delta/delta.calc.ts`: bloco de fontes por ferramenta; novo campo `footer` em `ToolDef` (GAP_CO2, DEBITO, VENTILACAO) e constante `FLUID_FOOTER`.
- Telas: `SectionTool.tsx` renderiza `<Ref>{def.footer}</Ref>` (vale para gap-co2, debito e ventilacao); `fluidos.tsx` renderiza `<Ref>{FLUID_FOOTER}</Ref>`. O cartão recolhível "Fórmulas, cortes e fontes" (que lê `REF`) continua e agora exibe os PMIDs.

## 8. Decisões institucionais (não alteradas; escolha entre fontes aceitáveis)

| Item | Valor no app | Alternativas na literatura |
|---|---|---|
| Vt/PBW alerta intermediário | warn > 6,5 mL/kg | ARDSNet só define 6 (alvo) e 8 (limite); 6,5 é escolha local |
| Driving pressure crítica | ≥ 18 cmH₂O | Amato 2015 não fixa 18; 15 é o corte usual |
| Ventilatory ratio | warn > 2 | Sinha 2019 mostra associação contínua; 2 é corte de conveniência |
| Índice de choque crítico | ≥ 1,3 | Sem fonte primária; > 0,9 (Rady 1994) conferido |
| Coeficiente de Hüfner | 1,34 mL O₂/g Hb | 1,36 ou 1,39 em outros textos (altera CaO₂ em 1,5–3,7 %) |
| Lactato grave | ≥ 4 mmol/L | Critério de inclusão de Rivers 2001; Sepsis-3 só define > 2 |
| Razão ΔPCO₂/Ca−vO₂ | > 1,4 (Mekontso-Dessap 2002) | Ospina-Tascón 2015 usou > 1,0; Monnet 2013 1,68 |
| CPO | < 0,6 W | Fincke 2004 não fixa 0,6 no resumo; valor de uso corrente (SCAI) |
| VVS | > 12 / zona 10–12 % | Marik 2009: 11,6 ± 1,9 % |
| Mini-bolus no monitor | ≥ 5 % | Revisão Monnet 2022; Smorenberg 2018 > 5,0 % após 150 mL; Biais 2017 ΔVS ≥ 6 % |
| VCI espontânea | ≥ 40 % "sugere" | Muller 2012: > 40 %; Airapetian 2015: > 42 % |
| RVS sinalização | warn < 700 / > 1400 | Faixa normal 800–1200 (texto); margens de sinalização locais |
| Peso ajustado (CG) | acima de 130 % do ideal | Emanuel 2023 sugere 120 %; Winter 2012 usa classes de IMC |
| FeNa NTA | > 2 % | Espinel 1976: > 3 % |

## 9. Itens em aberto

- **LaFarge 1970**: o artigo original não tem resumo no PubMed e o PDF está atrás de paywall (OUP); a fórmula foi conferida pela transcrição em Reiter 2023 (tabela 1, texto completo no PMC). Se a biblioteca tiver acesso, vale checar o original.
- **Inker 2021**: o texto do NEJM no PMC remete os coeficientes à tabela 1/suplemento (não renderizados); os valores foram conferidos na equação publicada pela National Kidney Foundation (kidney.org), idêntica à do app.
- **KDIGO +0,3 mg/dL em 48 h**: o app compara Cr com Cr basal sem conferir o intervalo de 48 h; e não contempla o critério "início de TRS = estágio 3". Sugestão: campo de data da Cr basal ou aviso no texto (já anotado em `REF.kdigo.c`).
- **Cockcroft-Gault no motor** usa peso real (rótulo "peso real"); a tela de ajuste renal usa peso ideal/ajustado (`core/renal.ts`). Coerente com `AUDITORIA.md` §12, mas os dois números podem divergir no obeso — anotado em `REF.cg.c`.
- **ROX em VNI/O₂**: o app calcula com aviso "validado em CNAF"; Roca 2019 só validou em CNAF. Mantido.
- **PESQUISA.md §3** ainda cita alcalose metabólica como "0,7·HCO₃ + 21 ± 2"; o motor usa Berend 2014 (parte 1 da auditoria). Fora do escopo desta parte.
- **TEC > 3 s** (ANDROMEDA-SHOCK) e os itens de oxigenação (P/F, S/F, A-a, IO, SDRA 2024) pertencem à parte 1/3 e não foram reconferidos aqui.
