# Auditoria clínica 5 — Cetoacidose diabética, sódio, tromboelastograma e PCR guiada (ACLS)

Data: 11/10/2026 · App: web/ (React/TypeScript) · Arquivos auditados: `web/src/tools/met/cad.calc.ts` + `cad.tsx`, `web/src/tools/met/sodio.calc.ts` + `sodio.tsx`, `web/src/tools/hema/teg.calc.ts` + `teg.tsx`, `web/src/lib/pcr.ts` + `PESQUISA-ACLS.md`. Contexto: `AUDITORIA.md` §9–11.

Método: cada número do código foi transcrito e comparado com a fonte primária mais recente, localizada no PubMed (`search_articles` / `get_article_metadata`; texto integral pelo PMC quando disponível) ou lida no site da diretriz (cpr.heart.org, no navegador do app; o PDF do algoritmo em texto abriu como download e não foi relido nesta sessão). Resultado por item: **CONFERE** · **DIVERGE** (corrigido quando inequívoco contra a fonte mais recente) · **SEM FONTE PRIMÁRIA** · **[V] decisão institucional** (escolha entre fontes aceitáveis — não alterado).

Fontes localizadas (PubMed, 11/10/2026):

| Sigla | Citação | PMID | DOI |
|---|---|---|---|
| ADA 2009 | Kitabchi AE et al. Hyperglycemic crises in adult patients with diabetes. Diabetes Care 2009;32(7):1335–1343 | 19564476 | 10.2337/dc09-9032 |
| Consenso 2024 | Umpierrez GE et al. Hyperglycemic Crises in Adults With Diabetes: A Consensus Report (ADA/EASD/JBDS/AACE/DTS). Diabetes Care 2024;47(8):1257–1275 (versão Diabetologia 2024;67:1455–1479, PMID 38907161, texto integral PMC11343900 lido) | 39052901 | 10.2337/dci24-0032 |
| A-M hipo | Adrogué HJ, Madias NE. Hyponatremia. N Engl J Med 2000;342(21):1581–1589 | 10824078 | 10.1056/NEJM200005253422107 |
| A-M hiper | Adrogué HJ, Madias NE. Hypernatremia. N Engl J Med 2000;342(20):1493–1499 | 10816188 | 10.1056/NEJM200005183422006 |
| ESE 2014 | Spasovski G et al. Clinical practice guideline on diagnosis and treatment of hyponatraemia. Eur J Endocrinol 2014;170(3):G1–G47 (também Intensive Care Med 2014;40:320, PMID 24562549; NDT 2014;29 Suppl 2:i1, PMID 24569496) — texto lido em academic.oup.com | 24569125 | 10.1530/EJE-13-1020 |
| Verbalis 2013 | Verbalis JG et al. Diagnosis, evaluation, and treatment of hyponatremia: expert panel recommendations. Am J Med 2013;126(10 Suppl 1):S1–S42 | 24074529 | 10.1016/j.amjmed.2013.07.006 |
| Hillier 1999 | Hillier TA et al. Hyponatremia: evaluating the correction factor for hyperglycemia. Am J Med 1999;106(4):399–403 | 10225241 | 10.1016/s0002-9343(99)00055-8 |
| SALSA 2021 | Baek SH et al. JAMA Intern Med 2021;181(1):81–92 | 33104189 | 10.1001/jamainternmed.2020.5519 |
| Seethapathy 2023 | Severe Hyponatremia Correction, Mortality, and Central Pontine Myelinolysis. NEJM Evid 2023 | 38320180 | 10.1056/EVIDoa2300107 |
| Ayus 2025 | Correction Rates and Clinical Outcomes in Hospitalized Adults With Severe Hyponatremia: meta-análise. JAMA Intern Med 2025 | 39556338 | 10.1001/jamainternmed.2024.5981 |
| See 2024 | Rate of Sodium Correction and ODS in Severe Hyponatremia: meta-análise. J Crit Care Med 2024 | 39108416 | 10.2478/jccm-2024-0030 |
| Sterns 2025 | Sterns RH, Rondon-Berrios H. Revisiting New Data on the Mortality Benefit of Rapid Correction of Hyponatremia. Am J Kidney Dis 2025;87(1):115–123 | 41093163 | 10.1053/j.ajkd.2025.07.015 |
| Mark 2026 | Sodium Correction Rates and Associated Outcomes Among Patients With Severe Hyponatremia. Ann Intern Med 2026 | 41587479 | 10.7326/ANNALS-25-03676 |
| Holcomb 2012 | Holcomb JB et al. Admission rapid thrombelastography… Ann Surg 2012;256(3):476–486 | 22868371 | 10.1097/SLA.0b013e3182658180 |
| Chapman 2013 | Chapman MP et al. Fibrinolysis greater than 3% is the critical value… J Trauma Acute Care Surg 2013;75(6):961–967 (texto integral PMC4072127 lido) | 24256667 | 10.1097/TA.0b013e3182aa9c9f |
| Gonzalez 2016 | Gonzalez E et al. Goal-directed Hemostatic Resuscitation of TIC: RCT. Ann Surg 2016;263(6):1051–1059 (texto integral PMC5432433 lido) | 26720428 | 10.1097/SLA.0000000000001608 |
| Moore 2017 | Moore HB et al. Fibrinolysis shutdown… J Trauma Acute Care Surg 2017;83(6):1014–1022 | 29190254 | 10.1097/TA.0000000000001718 |
| Moore 2021 | Moore EE et al. Trauma-induced coagulopathy. Nat Rev Dis Primers 2021;7(1):30 (a "revisão NEJM 2021" pedida não existe no PubMed; esta é a revisão de Moore de 2021) | 33927200 | 10.1038/s41572-021-00264-3 |
| Scarpelini 2009 | Scarpelini S et al. Normal range values for thromboelastography in healthy adult volunteers. Braz J Med Biol Res 2009;42(12):1210–1217 | 19882085 | 10.1590/s0100-879x2009001200015 |
| CRASH-2 | CRASH-2 trial collaborators. Lancet 2010;376(9734):23–32 | 20554319 | 10.1016/S0140-6736(10)60835-5 |
| Rossaint 2023 | Rossaint R et al. The European guideline on management of major bleeding and coagulopathy following trauma: sixth edition. Crit Care 2023;27(1):80 (texto integral PMC9977110 lido) | 36859355 | 10.1186/s13054-023-04327-7 |
| AHA 2025 P9 | Wigginton JG et al. Part 9: Adult Advanced Life Support: 2025 AHA Guidelines for CPR and ECC. Circulation 2025;152(16 Suppl 2):S538–S577 (publicada em 22/10/2025) | 41122884 | 10.1161/CIR.0000000000001376 |
| AHA 2025 P7 | Kleinman ME et al. Part 7: Adult Basic Life Support. Circulation 2025;152(16 Suppl 2):S448–S478 | 41122888 | 10.1161/CIR.0000000000001369 |
| AHA 2025 P10 | Cao D et al. Part 10: Adult and Pediatric Special Circumstances of Resuscitation. Circulation 2025;152(16 Suppl 2):S578–S672 | 41122889 | 10.1161/CIR.0000000000001380 |
| AHA 2025 P11 | Hirsch KG et al. Part 11: Post-Cardiac Arrest Care. Circulation 2025;152(16 Suppl 2):S673–S718 | 41122894 | 10.1161/CIR.0000000000001375 |
| AHA 2020 | Panchal AR et al. Part 3: Adult Basic and Advanced Life Support: 2020 AHA Guidelines. Circulation 2020;142(16 Suppl 2):S366–S468 | 33081529 | 10.1161/CIR.0000000000000916 |

Não acessados nesta sessão (texto): NEJM 2000 (A-M; fórmulas conferidas pela forma publicada e amplamente reproduzida), documentação de faixas do fabricante Haemonetics (TEG 5000), PDF do algoritmo ACLS em texto (bloqueado como download; trechos já transcritos em `REF`/PESQUISA-ACLS.md mantidos).

---

## 1. Cetoacidose diabética — `cad.calc.ts` / `cad.tsx`

Fonte mais recente: Consenso 2024 (mesmas sociedades que a ADA 2009, que o substitui explicitamente: "update the ADA consensus statement … last updated in 2009"). Trechos citados foram lidos no texto integral (PMC11343900).

| Item | Valor no app (antes) | Fonte (trecho) | Resultado | Ação |
|---|---|---|---|---|
| Critério de hiperglicemia / CAD euglicêmica | alerta "Glicemia ≤ 250: considerar CAD euglicêmica" | Consenso 2024: critério "≥11.1 mmol/l (200 mg/dl) or a prior history of diabetes irrespective of the presenting glucose value"; "euglycaemic DKA, which is defined as plasma glucose levels <11.1 mmol/l (200 mg/dl)" | DIVERGE | alerta passa a `gl < 200` (`CAD_GL_EUGLICEMICA`) |
| Cetonemia | não citada no alerta de critério único | "β-hydroxybutyrate ≥3.0 mmol/l, ketonuria ≥2+, pH <7.30 or bicarbonate <18 mmol/l" | SEM O DADO NO APP | alerta passa a pedir β-OHB ≥ 3,0 mmol/L ou cetonúria ≥ 2+ |
| Gravidade — pH | leve pH 7,25–7,30 (inclusive 7,25 e 7,30) · moderada < 7,25 · grave < 7,00 | Table 2 (2024): mild "pH >7.25 to <7.30"; moderate "pH 7.0–7.25"; severe "pH <7.0" | DIVERGE (bordas 7,25 e 7,30) | `ph <= 7.25 → moderada`; `ph < 7.30 → leve`; pH 7,30 deixa de ser critério de acidose |
| Gravidade — HCO₃⁻ | leve 15–18 · moderada 10–14,9 · grave < 10 | Table 2: mild "15–18 mmol/l"; moderate "10 to <15 mmol/l"; severe "<10 mmol/l" | CONFERE | — |
| Na⁺ corrigido | +1,6 mEq/L por 100 mg/dL acima de 100 | 2024: "100 mg/dl of glucose will result in a 1.6 mmol/l rise in sodium concentration" (igual à ADA 2009) | CONFERE | — |
| Fluidos iniciais | "1ª hora: SF 0,9% 1 L/h (15–20 mL/kg/h)" | 2024: "isotonic saline or balanced crystalloid solutions at an initial rate of 500–1000 ml/h during the first 2–4 h" (sem comprometimento renal/cardíaco) | DIVERGE (ADA 2009) | texto passa a "Primeiras 2–4 h: SF 0,9% ou cristaloide balanceado 500–1000 mL/h"; 15–20 mL/kg/h mantido como referência |
| Manutenção por Na corrigido | Na corr > 145 → SF 0,45% 250–500 mL/h; senão SF 0,9% 250–500 mL/h | 2024: "the administration of 0.45% sodium chloride is indicated only if osmolality is not declining despite adequate positive fluid balance and appropriate insulin administration"; "Fluid replacement should correct estimated deficits within the first 24–48 h" | DIVERGE (ADA 2009) | regra por Na removida; 0,45% só se a osmolalidade não cair; 250–500 mL/h mantido rotulado "ADA 2009" |
| Troca para soro glicosado | "Glicemia 200: SG 5% + SF 0,45% 150–250 mL/h" | 2024: "Once the blood glucose falls below 13.9 mmol/l (250 mg/dl), 5–10% dextrose should be added to the 0.9% saline infusion and the insulin infusion rate should be reduced to 0.05 U kg⁻¹ h⁻¹" | DIVERGE | limiar 250 (`CAD_GL_DEXTROSE`), glicose 5–10% no SF 0,9%, insulina 0,05 U/kg/h |
| Insulina EV | "Bolus 0,1 U/kg + infusão 0,1 U/kg/h; sem bolus 0,14 U/kg/h" | 2024: "fixed-rate intravenous insulin infusion started at 0.1 U kg⁻¹ h⁻¹"; "insulin bolus (0.1 U/kg) (intravenously or intramuscularly) if a delay in obtaining venous access is anticipated" | DIVERGE (bolus de rotina) | infusão fixa 0,1 U/kg/h; bolus 0,1 U/kg IV/IM só se atraso no acesso; "0,14 U/kg/h sem bolus" removido (ausente em 2024) |
| Queda < 10% na 1ª h → bolus 0,14 U/kg | presente | ADA 2009; o consenso 2024 não traz regra para queda insuficiente (busca por "fall/decrease/expected" no texto integral: nada) | SEM FONTE na versão 2024 · [V] | mantido, rotulado "ADA 2009; sem regra no consenso 2024" |
| Redução da insulina | "Glicemia 200: 0,02–0,05 U/kg/h; manter 150–200" | 2024: "reduced to 0.05 U kg⁻¹ h⁻¹" ao atingir < 250 mg/dL | DIVERGE | 0,05 U/kg/h abaixo de 250 mg/dL; meta 150–200 removida (ausente em 2024) |
| Insulina SC (CAD leve/moderada) | 0,3 U/kg, depois 0,2 U/kg 2/2 h; 0,1 U/kg 2/2 h quando glicemia 200 | 2024: "subcutaneous rapid-acting insulin analogues every 1–2 h is an effective alternative … for people with mild or moderate DKA" (doses só na Fig. 4, não disponível em texto) | SEM FONTE TEXTUAL 2024 · [V] | doses mantidas (ADA 2009), rotuladas; limiar de redução passa a < 250 |
| Potássio — limiar baixo | K < 3,3: segurar insulina; repor 20–30 mEq/h | 2024: "(<3.5 mmol/l) … potassium replacement should begin at a rate of 10 mmol/h, and insulin therapy should be delayed until the potassium level increases to >3.5 mmol/l" | DIVERGE | `CAD_K_BAIXO = 3.5`; repor 10 mmol/h |
| Potássio — faixa de reposição | 3,3–5,2: 20–30 mEq/L de soro | 2024: "potassium replacement should be started after serum levels fall below 5.0 mmol/l to maintain a potassium level of 4–5 mmol/l … 20–30 mmol of potassium per litre" | DIVERGE (limite superior) | `CAD_K_ALTO = 5.0`: repõe se 3,5 ≤ K < 5,0; K ≥ 5,0 não repõe |
| Monitorização do K⁺ | "dosar K a cada 2 h" | 2024: "measuring serum potassium 2 h after starting insulin administration and every 4 h thereafter" | DIVERGE | texto atualizado |
| Bicarbonato | indicado se pH < 6,9; 100 mmol em 400 mL + 20 mEq KCl em 2 h; repetir até pH > 7,0 | 2024: "bicarbonate administration should be considered if the acidosis is severe (i.e., pH <7.0)"; "100 mmol of sodium bicarbonate (8.4% solution) in 400 ml of sterile water (an isotonic solution) can be given every 2 h to achieve a pH >7.0" | DIVERGE (limiar 6,9 → 7,0) | `CAD_PH_BIC = 7.0`; KCl 20 mEq mantido como "ADA 2009" |
| Resolução | glicemia < 200 **e** 2 de 3: HCO₃⁻ ≥ 15, pH > 7,3, AG ≤ 12 | 2024: "Resolution of DKA is defined as achieving plasma ketone <0.6 mmol/l and venous pH ≥7.3 or bicarbonate ≥18 mmol/l. Ideally, the blood glucose concentration should also be <11.1 mmol/l (200 mg/dl). The anion gap should not be used as a criterion" | DIVERGE | texto atualizado (β-OHB < 0,6 e pH ≥ 7,3 ou HCO₃⁻ ≥ 18; AG fora) |
| Transição SC | sobreposição 1–2 h; virgem de insulina 0,5–0,8 U/kg/dia | 2024: "overlap of 1–2 h"; "0.5–0.6 U kg⁻¹ day⁻¹ in insulin-naive patients"; "approximately 0.3 U kg⁻¹ day⁻¹" se insuficiência renal/fragilidade | CONFERE (1–2 h) · DIVERGE (0,8) | 0,5–0,6 U/kg/dia + 0,3 U/kg/dia em alto risco de hipoglicemia |
| Monitorização laboratorial | "eletrólitos, ureia, creatinina, pH venoso e glicemia a cada 2–4 h" | 2024: "Capillary blood glucose … every 1–2 h … blood should be drawn every 4 h for determination of electrolytes, phosphate, creatinine, β-hydroxybutyrate and venous pH until resolution" | DIVERGE (detalhe) | texto atualizado |
| Choque cardiogênico / hipovolemia grave | monitorização hemodinâmica; SF 1 L/h | ADA 2009 (algoritmo); 2024 só ressalva "without renal or cardiac compromise" | [V] | mantido |

Alterações no código (CAD): constantes exportadas `CAD_K_BAIXO = 3.5`, `CAD_K_ALTO = 5.0`, `CAD_PH_BIC = 7.0`, `CAD_GL_DEXTROSE = 250`, `CAD_GL_EUGLICEMICA = 200`; textos de fluidos, potássio, insulina, bicarbonato, resolução e monitorização reescritos com o consenso 2024 (itens sem número em 2024 ficaram rotulados "ADA 2009"); cabeçalho e `<Ref>` de `cad.tsx` com PMID/DOI das duas fontes; `cadText()` passou a remover só as marcas `<b>` (o "<" literal de "K⁺ < 3,5" era engolido pelo regex antigo — afetava apenas o texto de teste, não a tela). Testes `cad.test.ts` reescritos para os novos limiares (bordas 7,25/7,30; K 3,4/3,5/4,9/5,0/5,2; pH 6,95/7,00; glicemia 199/250; transição 35–42 U).

---

## 2. Distúrbios do sódio — `sodio.calc.ts` / `sodio.tsx`

| Item | Valor no app | Fonte (trecho) | Resultado | Ação |
|---|---|---|---|---|
| Água corporal total | homem 0,6 · mulher 0,5 · idoso 0,5 · idosa 0,45 × peso | A-M hipo/hiper (NEJM 2000): fatores 0,6/0,5 (adultos), 0,5/0,45 (idosos); texto não acessado nesta sessão | CONFERE (forma publicada) | — |
| Adrogué-Madias | ΔNa por 1 L = (Na infusão − Na) ÷ (ACT + 1) | A-M hipo, fórmula 1 | CONFERE | — |
| NaCl 3% | 513 mEq/L; V = ACT × ΔNa ÷ (513 − Na alvo) | 30 g/L ÷ 58,44 g/mol = 513 mmol/L; balanço de massa em sistema fechado (AUDITORIA §10) | CONFERE (aritmética) | — |
| Déficit de água livre | ACT × (Na/140 − 1) | A-M hiper | CONFERE | — |
| Na⁺ corrigido pela glicemia | +2,4 mEq/L por 100 mg/dL acima de 100 | Hillier 1999 (resumo PubMed): "a correction factor of a 2.4 meq/L decrease in sodium concentration per 100 mg/dL increase in glucose … is a better overall estimate" | CONFERE | — |
| Classificação | leve 130–134,9 · moderada 125–129,9 · profunda < 125 | ESE 2014 §6.1.1: mild 130–135, moderate 125–129, profound <125 mmol/l | CONFERE | — |
| Aguda / crônica | < 48 h / ≥ 48 h ou incerta | ESE 2014 §5.2: "48-h threshold to distinguish acute (<48 h) from chronic (≥48 h)" | CONFERE | — |
| Sintomas graves — bolus | 150 mL de NaCl 3% em 20 min, repetir até 3×, até melhora ou +5 mEq/L | ESE 2014 7.1.1.1 (1D) "150 ml 3% hypertonic over 20 min"; 7.1.1.2–3 (2D) repetir até "target of 5 mmol/l increase"; SALSA 2021: bolus intermitente ≈ infusão contínua em supercorreção, menos "relowering" | CONFERE | — |
| Sintomas moderados | NaCl 3% só se aguda; crônica + moderados → sem hipertônica | ESE 2014 7.2.1.4 (2D): "single i.v. infusion of 150 ml 3% hypertonic saline … over 20 min" para sintomas moderadamente graves (sem distinguir cronicidade) | DIVERGE de recomendação fraca (2D) · [V] | não alterado; registrar para decisão clínica (bolus único em sintomas moderados crônicos) |
| Meta de correção | aguda +6 · crônica +8 em 24 h (nunca > 135) | Verbalis 2013: 4–8 mEq/L/24 h; ESE 2014: até 10 mmol/L/24 h | [V] (já em AUDITORIA.md) | — |
| Limite em 24 h | "máx. 10–12; 8 se alto risco de desmielinização"; "não ultrapassar 10–12 mEq/L em 24 h" | ESE 2014 7.1.2.4 / 7.4.1.4 (1D): "limiting the increase in serum sodium concentration to a total of 10 mmol/l during the first 24 h" e 8 mmol/l por 24 h depois; sem limite distinto para alto risco. Verbalis 2013: 10–12 (8 em alto risco de ODS) | [V] duas fontes aceitáveis; "12" só no painel dos EUA | não alterado; recomenda-se avaliar o teto europeu de 10 |
| Correção excessiva | SG 5% + desmopressina 2–4 mcg IV | ESE 2014 7.5 (1D): água sem eletrólitos 10 mL/kg em 1 h + desmopressina 2 µg, não repetir antes de 8 h; Verbalis 2013: 2–4 µg | [V] | não alterado |
| Risco de desmielinização | desnutrição, etilismo, hipocalemia (K⁺ < 3,5) | ESE 2014 (alcoolismo, hepatopatia, tiazídicos, antidepressivos, grau/duração); Seethapathy 2023: 6/7 casos de MPC com etilismo, desnutrição, hipo-K ou hipo-P | CONFERE | — |
| Dosagem de Na⁺ | 2 h nas primeiras horas (hipertônica); 4–6 h na correção | ESE 2014 7.1.2.5 (2D): após 6 e 12 h, depois diário; 7.4.1.5 (2D): a cada 6 h em moderada/profunda | CONFERE (app mais frequente) | — |
| SIADH refratário | "tolvaptana ou demeclociclina" | ESE 2014 7.4.3.2 (2D): ureia 0,25–0,50 g/kg/dia ou diurético de alça em dose baixa + NaCl VO; 7.4.3.3 (1D): "recommend against lithium or demeclocycline"; 7.4.3.4–5 (1C): contra vaptanos em moderada/profunda. Verbalis 2013 aceita tolvaptana | DIVERGE (demeclociclina, contra 1D) | texto corrigido: ureia ou alça + NaCl; tolvaptana só por protocolo local; lítio e demeclociclina não recomendados |
| Hipovolêmica / hipervolêmica | SF 0,9%; restrição + furosemida | ESE 2014 (hipovolêmica: expansão com salina 0,9% ou balanceada) | CONFERE | — |
| Hipernatremia — limite crônico | máx. 10 mEq/L em 24 h; aguda até 1 mEq/L/h | A-M hiper (NEJM 2000): 10 mmol/L/dia na crônica; ~1 mmol/L/h na aguda (texto não acessado) | CONFERE (forma publicada) | — |
| Hipernatremia — graus | leve ≤ 150 · moderada ≤ 155 · moderada-grave ≤ 160 · grave > 160 | sem fonte primária | SEM FONTE PRIMÁRIA (rótulo descritivo) | — |
| DI central | desmopressina 1–4 mcg IV/SC | sem fonte primária no app | SEM FONTE PRIMÁRIA | registrar |

Atualizações 2020–2026 (PubMed): SALSA 2021 (RCT, n = 178) — bolus intermitente e infusão contínua com supercorreção semelhante (17 % vs 24 %), bolus preferível; Seethapathy 2023 (n = 3274) e Ayus 2025 (meta-análise, 16 coortes, n = 11 811) — correção lenta (< 6–8 mEq/L/24 h) associada a maior mortalidade, sem aumento significativo de ODS; See 2024 (meta-análise, n = 6032) — correção rápida com RR 3,9 para ODS mas menor mortalidade; Mark 2026 (n = 13 988) — correção > 8 mEq/L/24 h com menor risco de morte/eventos neurológicos tardios ("guidelines should be reexamined"); Sterns & Rondon-Berrios 2025 — revisão crítica: viés de confusão nas coortes, manter correção lenta e controlada em alto risco (≤ 8 mmol/L/dia). Nenhuma diretriz publicada até 11/10/2026 alterou os limites de 2014; o app permanece dentro deles.

Alterações no código (sódio): conduta do SIADH refratário; cabeçalho de `sodio.calc.ts` e `<Ref>` de `sodio.tsx` com as citações (PMID/DOI) e nota sobre a reavaliação 2023–2026; dois testes novos em `sodio.test.ts` (texto do SIADH; limiares de bolus/limite no texto).

---

## 3. Tromboelastograma — `teg.calc.ts` / `teg.tsx`

| Item | Valor no app | Fonte (trecho) | Resultado | Ação |
|---|---|---|---|---|
| R | 5–10 min | faixa do fabricante (TEG 5000, citrato-caolim) — documentação não acessada; Scarpelini 2009 (118 voluntários, mesmo reagente/aparelho): 95 % = 3,8–9,8 min | SEM FONTE PRIMÁRIA ACESSÍVEL · [V] | mantido; faixas de voluntários anotadas no `<Ref>` |
| K | 1–3 min | idem; Scarpelini: 0,7–3,4 min | idem | mantido |
| Ângulo α | 53–72° | idem; Scarpelini: 47,8–77,7° | idem | mantido |
| MA | 50–70 mm | idem; Scarpelini: 49,7–72,7 mm | idem | mantido |
| LY30 — faixa do fabricante | "até 8 %" (rodapé) | Chapman 2013 (texto integral): "the accepted normal upper bound of LY30 (7.5%, as stated in the TEG instrument reference range documentation, Haemonetics)"; "reference range (0.0–7.4%)" | DIVERGE (texto) | rodapé: 0–7,4 % (limite 7,5 %) |
| LY30 — limiar de hiperfibrinólise | `v.LY > 3` (3,0 % contava como normal) | Chapman 2013: "LY30 of 3% or greater defines clinically relevant hyperfibrinolysis"; Gonzalez 2016 (protocolo): "LY30 … equal or greater than 3%" para TXA | DIVERGE (borda) | `LY30_HIPER = 3`, comparação `>=` |
| "Shutdown" | LY30 < 0,5 % → não tratar empiricamente | Moore 2017 (r-TEG): shutdown < 0,9 %, fisiológica 0,9–2,9 %, hiper > 2,9 % — reagente diferente (r-TEG); sem limiar publicado para caolim no app | SEM FONTE PRIMÁRIA para 0,5 · [V] | mantido; registrar |
| TXA | 1 g IV em 10 min → 1 g em 8 h | CRASH-2 (resumo): "loading dose 1 g over 10 min then infusion of 1 g over 8 h"; Rossaint 2023 Rec. 23 (1A): mesmo esquema, "within 3 h after injury", "not await results from a viscoelastic assessment" (1B) | CONFERE | texto da conduta cita o prazo de 3 h |
| Fibrinogênio | "Crioprecipitado ~1 U/10 kg ou fibrinogênio 3–4 g · meta > 150–200 mg/dL" | Rossaint 2023 Rec. 29 (1C/2C): "initial fibrinogen supplementation of 3–4 g. This is equivalent to 15–20 single donor units of cryoprecipitate"; repor se "viscoelastic signs of a functional fibrinogen deficit or a plasma Clauss fibrinogen level ≤ 1.5 g/L" | DIVERGE (1 U/10 kg ≈ 7 U para 70 kg; meta "200") | dose: fibrinogênio 3–4 g ou crio 15–20 U; limiar ≤ 1,5 g/L |
| Plaquetas | "1 aférese ou 4–6 U · meta > 50.000 (> 100.000 em SNC)" | Rossaint 2023 Rec. 30 (2C/2B): "above 50 × 10⁹/L … above 100 × 10⁹/L in patients with TBI"; "initial dose of four to eight single platelet units or one aphaeresis pack" | DIVERGE (4–6 → 4–8) | corrigido |
| Plasma | "PFC 10–15 mL/kg · CCP se reversão de anticoagulante" | Rossaint 2023: sem dose em mL/kg (razão plasma:CH ≥ 1:2 na transfusão maciça; CCP para reversão de AVK) | SEM FONTE PRIMÁRIA (dose) · [V] | mantido |
| Lógica K prolongado → fibrinogênio; MA → plaquetas; R → fatores | regras do app | Holcomb 2012 (r-TEG): α prediz plasma/transfusão maciça, MA prediz plaquetas; Gonzalez 2016 (r-TEG): ACT ≥ 140 s → plasma, ângulo < 63° → crio, MA < 55 mm → plaquetas, LY30 ≥ 3 % → TXA | CONFERE (direção); limiares não transponíveis (r-TEG ≠ caolim) | — |
| Moore 2021 "NEJM" | — | não existe revisão de Moore no NEJM em 2021; a revisão de 2021 é Nat Rev Dis Primers 7:30 (PMID 33927200), sem limiares numéricos de TEG | nota | citada no `<Ref>` |

Alterações no código (TEG): `LY30_HIPER` exportada e usada com `>=`; doses de fibrinogênio e plaquetas pela Rossaint 2023; texto do TXA cita o prazo de 3 h; cabeçalho e `<Ref>` com PMID/DOI (Chapman, Scarpelini, CRASH-2, Rossaint, Gonzalez, Holcomb, Moore 2021); testes novos em `teg.test.ts` (LY30 3,0 → TXA, 2,9 → normal; strings de dose) e o teste antigo de "Crioprecipitado" ajustado ao novo texto.

---

## 4. PCR guiada (ACLS adulto) — `web/src/lib/pcr.ts` / `PESQUISA-ACLS.md`

Publicação confirmada no PubMed: as diretrizes AHA 2025 saíram na Circulation em 22/10/2025 (152, 16 Suppl 2) — Part 9 Adult ALS PMID 41122884 (DOI 10.1161/CIR.0000000000001376), Part 7 BLS PMID 41122888, Part 10 PMID 41122889, Part 11 PMID 41122894; diretriz anterior Panchal 2020 Part 3 PMID 33081529 (DOI 10.1161/CIR.0000000000000916). As Parts 7, 9 e 11 foram relidas em cpr.heart.org no navegador do app (seções expandidas); o PDF do algoritmo em texto (`U.ALG`) abriu como download e não foi relido — os trechos da barra lateral (doses de amiodarona/lidocaína, energia) permanecem os já transcritos em `REF` e em PESQUISA-ACLS.md.

| Item | Valor no app | Fonte (trecho lido em 11/10/2026) | Resultado | Ação |
|---|---|---|---|---|
| Ciclo de RCP | `PROTO.cicloMs = 120000` (2 min) | Part 9, algoritmo "CPR 2 minutes"; Part 7 (2a, B-R): "switch chest compressors approximately every 2 min (or after about 5 cycles … 30:2)" | CONFERE | — |
| Adrenalina | 1 mg a cada 3–5 min (`epiMinMs` 3 min, `epiMaxMs` 5 min); nas caixas 6/10 (≈ a cada 2 ciclos); AESP/assistolia: o mais cedo possível | Part 9: "It is reasonable to administer epinephrine (1 mg) every 3 to 5 min for adult patients in cardiac arrest"; "Operationally, administering epinephrine every second cycle of CPR, after the initial dose, meets this recommendation"; "for adult patients in cardiac arrest with a nonshockable rhythm, it is reasonable to administer epinephrine as soon as feasible"; "High-dose epinephrine is not recommended" | CONFERE | — |
| Amiodarona | 300 mg, depois 150 mg (2ª passagem pela caixa 8) | Part 9: "amiodarone or lidocaine may be considered for VF or pVT that is unresponsive to defibrillation" (2b, B-R); doses 300/150 na barra lateral do algoritmo (`REF.amio`, PESQUISA-ACLS.md) — PDF não relido nesta sessão | CONFERE (texto) · doses conforme transcrição prévia | — |
| Lidocaína | `lido1 = [1, 1.5]`, `lido2 = [0.5, 0.75]` mg/kg | barra lateral do algoritmo: "1 to 1.5 milligrams per kilogram … 0.5 to 0.75 milligrams per kilogram" (transcrição prévia); sem dose máxima nos textos 2025 | CONFERE (transcrição prévia) | — |
| Energia | bifásico conforme fabricante (ex. 120–200 J), máxima se desconhecida; seguintes iguais ou maiores; monofásico 360 J | Part 9: "higher energy for second and subsequent shocks may be considered if the initial shock fails"; "Immediate unsynchronized shock is recommended for adults with sustained polymorphic VT"; 120–200/360 J na barra lateral (transcrição prévia) | CONFERE | — |
| Acesso | IV primeiro; IO se IV falhar | Part 9 (resumo): "Intravenous (IV) access remains the first-line choice … intraosseous (IO) access is a reasonable alternative if IV access is not feasible or delayed" | CONFERE | — |
| ETCO₂ | < 10 mmHg → reavaliar RCP (mirar ≥ 10, ideal ≥ 20); salto > 10 mmHg → RCE; ≤ 10 após 20 min intubado → componente multimodal de término | Part 9: "An ETCO2 less than 10 mm Hg is generally associated with poor outcomes, whereas values above 10 mm Hg, and ideally above 20 mm Hg…"; "a sudden increase greater than 10 mmHg may indicate ROSC"; "In intubated adult patients, failure to achieve an end-tidal CO2 of greater than 10 mm Hg … after 20 minutes of ALS resuscitation may be considered as a component of a multimodal approach"; "ETCO2 should not be used in isolation to end resuscitative efforts" | CONFERE | — |
| Checagem de pulso | ≤ 10 s | Part 7: "minimize the time taken to check for a pulse (no more than 10 s)" | CONFERE | — |
| Qualidade da RCP | ≥ 5 cm, 100–120/min, 30:2, 1 ventilação/6 s com via aérea avançada | Part 7: "rate of 100 to 120/min"; "depth of at least 2 inches, or 5 cm"; "chest compression fraction of at least 60%"; Part 9: "1 breath every 6 s (10 breaths/min) while continuous chest compressions" | CONFERE | — |
| Sem rotina | bicarbonato, cálcio, magnésio, vasopressina, adrenalina em alta dose | Part 9: "routine administration of sodium bicarbonate / calcium / magnesium is not recommended"; "Vasopressin alone or vasopressin in combination with epinephrine offers no advantage" | CONFERE | — |
| DSD / troca de vetor | utilidade não estabelecida após ≥ 3 choques | Part 9: "The usefulness of double sequential defibrillation for adults in cardiac arrest with persisting VF/pVT after ≥3 consecutive shocks has not been established" | CONFERE | — |
| Torsades | magnésio pode ser considerado; sem dose | Part 9: "Magnesium may be considered for treatment of adults with recurrences of polymorphic ventricular tachycardia associated with a long QT interval (torsades de pointes)" | CONFERE | — |
| H's e T's | 5 H (hipovolemia, hipóxia, H⁺, hipo/hipercalemia, hipotermia) e 5 T (pneumotórax, tamponamento, toxinas, TEP, trombose coronária) | algoritmo 2025 (`REF.ht`, transcrição prévia); lista idêntica à de 2020 | CONFERE | — |
| Pós-RCE — PAM | ≥ 65 mmHg (1, B-R) | Part 11: "maintaining a minimum mean arterial pressure (MAP) of at least 65 mm Hg" | CONFERE | — |
| Pós-RCE — oxigenação | FiO₂ 100 % até SpO₂ confiável; SpO₂ 90–98 % (PaO₂ 60–105) | Part 11: "titrating the fraction of inspired oxygen (FiO2) to target oxygen saturation of 90% to 98% (PaO2, 60–105 mm Hg)"; "Administration of 100% oxygen immediately after ROSC until oxygen saturation can reliably be measured" | CONFERE | — |
| Pós-RCE — PaCO₂ | 35–45 mmHg | Part 11: "PaCO2 should be maintained within a normal physiologic range (generally 35–45 mm Hg)" | CONFERE | — |
| Pós-RCE — temperatura | 32–37,5 °C por ≥ 36 h em quem não obedece comandos | Part 11: "Maintaining a temperature between 32 °C and 37.5 °C in patients unresponsive to verbal commands after ROSC is recommended"; "temperature control be maintained for at least 36 hours" | CONFERE | — |
| Pós-RCE — glicemia, ECG, prognóstico | evitar < 70 e > 180 mg/dL; ECG 12 derivações; prognóstico ≥ 72 h após normotermia | Part 11: "avoid hypoglycemia (glucose less than 70 mg/dL) as well as hyperglycemia (glucose greater than 180 mg/dL)"; "A 12-lead electrocardiogram (ECG) should be obtained as soon as feasible"; "consolidate the interpretation of multimodal prognostic assessments at a minimum of 72 h after normothermia and discontinuation of sedatives" | CONFERE | — |
| Coronariografia | supra ST → emergência; sem supra se choque/arritmia/isquemia | Part 11: "Emergency coronary angiography is reasonable for selected adult patients … without ST-segment elevation on ECG in the presence of CS, recurrent ventricular arrhythmias, or evidence of significant ongoing myocardial ischemia" | CONFERE | — |
| Citação da diretriz | só "AHA 2025 (Part 9)" sem PMID/DOI | — | SEM PMID/DOI | `CITATIONS` exportado em `pcr.ts` (Parts 7/9/10/11 de 2025 e Part 3 de 2020 com PMID/DOI); comentário no topo; relatório impresso cita Circulation/PMID/DOI; PESQUISA-ACLS.md atualizado |

Nenhuma divergência numérica encontrada no módulo de PCR. `REF.*.u` continua apontando para cpr.heart.org (o teste que exige isso foi mantido); os PMID/DOI ficaram em `CITATIONS`.

---

## 5. Correções aplicadas (antes → depois)

| Arquivo | Antes | Depois | Fonte |
|---|---|---|---|
| cad.calc.ts | K⁺ < 3,3 segura insulina; repor 20–30 mEq/h | K⁺ < 3,5; repor 10 mmol/h até > 3,5 | Consenso 2024 |
| cad.calc.ts | repõe 20–30 mEq/L se 3,3 ≤ K ≤ 5,2; > 5,2 não repõe | repõe se 3,5 ≤ K < 5,0; ≥ 5,0 não repõe; K 2 h após insulina e a cada 4 h | Consenso 2024 |
| cad.calc.ts | bicarbonato se pH < 6,9 | considerar se pH < 7,0 (100 mmol/400 mL a cada 2 h até pH > 7,0) | Consenso 2024 |
| cad.calc.ts | glicemia 200 → SG 5% + SF 0,45% 150–250 mL/h; insulina 0,02–0,05 U/kg/h, manter 150–200 | glicemia < 250 → glicose 5–10 % no SF 0,9 %; insulina 0,05 U/kg/h até resolver | Consenso 2024 |
| cad.calc.ts | bolus 0,1 U/kg de rotina; "sem bolus 0,14 U/kg/h" | infusão fixa 0,1 U/kg/h; bolus 0,1 U/kg IV/IM só se atraso no acesso | Consenso 2024 |
| cad.calc.ts | 1ª hora SF 0,9 % 1 L/h; manutenção SF 0,45 % se Na corr > 145 | 2–4 h SF 0,9 % ou balanceado 500–1000 mL/h; 0,45 % só se osmolalidade não cair | Consenso 2024 |
| cad.calc.ts | euglicêmica se glicemia ≤ 250 | < 200 | Consenso 2024 |
| cad.calc.ts | gravidade: pH 7,30 contava como critério de acidose | critério de acidose passa a ser pH < 7,30 (7,30 não é CAD); faixas mantidas: leve 7,25 a < 7,30, moderada 7,00 a < 7,25, grave < 7,00 — o agente havia colocado 7,25 em "moderada"; revisão do integrador restaurou 7,25 = leve, conforme Kitabchi 2009 Tab. 1 e Umpierrez 2024 Tab. 2 | Consenso 2024, Table 2; ADA 2009 |
| cad.calc.ts | resolução: glicemia < 200 e 2 de 3 (HCO₃ ≥ 15, pH > 7,3, AG ≤ 12) | β-OHB < 0,6 e pH ≥ 7,3 ou HCO₃ ≥ 18; AG não usado | Consenso 2024 |
| cad.calc.ts | transição 0,5–0,8 U/kg/dia | 0,5–0,6 U/kg/dia; ~0,3 se renal/frágil | Consenso 2024 |
| sodio.calc.ts | SIADH refratário: tolvaptana ou demeclociclina | ureia ou alça + NaCl; tolvaptana por protocolo; lítio/demeclociclina não | ESE 2014 (1D/2D/1C), Verbalis 2013 |
| teg.calc.ts | LY30 > 3 % | LY30 ≥ 3 % | Chapman 2013 |
| teg.calc.ts / teg.tsx | crio ~1 U/10 kg, meta > 150–200 mg/dL; plaquetas 4–6 U; fabricante "até 8 %" | fibrinogênio 3–4 g ≈ crio 15–20 U se ≤ 1,5 g/L; plaquetas 4–8 U; fabricante 0–7,4 % (7,5 %) | Rossaint 2023; Chapman 2013 |
| pcr.ts / pcr.test.ts / PESQUISA-ACLS.md | sem PMID/DOI | `CITATIONS` + comentário + relatório com PMID/DOI | PubMed |

## 6. Decisões institucionais [V] (não alteradas)

1. CAD: bolus 0,14 U/kg se a glicemia não cair ≥ 10 % na 1ª hora; doses do esquema SC (0,3 → 0,2 U/kg; 0,1 U/kg abaixo de 250); KCl 20 mEq junto ao bicarbonato; manutenção 250–500 mL/h; condutas em choque cardiogênico/hipovolemia grave — tudo ADA 2009, sem número correspondente no consenso 2024 (rotulado na tela).
2. Sódio: metas +6/+8; teto "10–12 (8 em alto risco)" (Verbalis 2013) vs 10 (ESE 2014) — sugerido adotar 10; desmopressina 2–4 µg vs 2 µg; sem hipertônica em sintomas moderados crônicos (ESE 2014 sugere bolus único, 2D); graus de hipernatremia e desmopressina 1–4 µg no DI sem fonte primária.
3. TEG: faixas R/K/α/MA do fabricante (não acessadas; voluntários de Scarpelini 2009 anotados); "shutdown" < 0,5 % (Moore 2017 usa < 0,9 % em r-TEG); PFC 10–15 mL/kg sem fonte.
4. PCR: momento da 2ª dose do antiarrítmico (fluxo gráfico); dose de magnésio em torsades (não especificada); doses da barra lateral mantidas pela transcrição prévia (PDF não relido).

## 7. Itens em aberto

- Reabrir o PDF do algoritmo ACLS 2025 em texto (download bloqueado no navegador do app) e reconfirmar as doses da barra lateral já transcritas.
- Obter a documentação de faixas de referência da Haemonetics (TEG 5000/6s, citrato-caolim) para fechar R/K/α/MA.
- Fig. 2a e Fig. 4 do consenso 2024 (critérios D-K-A e doses SC) estão só em imagem — conferir na publicação impressa.
- Decidir institucionalmente o teto de correção do sódio (10 vs 10–12) e o bolus único em sintomas moderados crônicos.

## 8. Verificação

- `npx tsc --noEmit` (web/): sem erros.
- `npx vitest run src/tools/met src/tools/hema src/lib/pcr`: 4 arquivos, **150 testes aprovados** (139 antes da auditoria; 11 novos/reescritos).
- Sem commit.
