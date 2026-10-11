# Auditoria clínica — 4. Sepse e infecção

Data: 11/10/2026 · Escopo: `web/src/tools/inf/` — sepse, SOFA, bundle da 1ª hora, metas de perfusão, oxigenação/transporte de O₂, ATB empírico por foco e ajuste renal de antimicrobianos. Contexto: `AUDITORIA.md` (seções 7, 8, 12 e itens [V]).

Método: cada critério, limiar e dose foi transcrito do código e comparado número a número com a fonte primária. Artigos localizados no PubMed (metadados/PMID/DOI confirmados; texto integral via PMC quando disponível). Bulas consultadas no DailyMed (API `spls.json` + página `drugInfo.cfm`; setId e data de revisão registrados) — marcadas como **fonte regulatória**. Documentos do ILAS lidos a partir dos PDFs oficiais (ilas.org.br). Resultado: **CONFERE** / **DIVERGE** / **SEM FONTE PRIMÁRIA** / **decisão institucional**.

Verificação automática após as alterações: `tsc --noEmit` sem erros; `vitest run src/tools/inf` — ver seção 9.

## 1. Fontes primárias confirmadas (PubMed)

| Ref. | Citação | PMID | DOI |
|---|---|---|---|
| Sepsis-3 | Singer M et al. JAMA 2016;315:801 | 26903338 | 10.1001/jama.2016.0287 (PMC4968574, texto integral lido) |
| qSOFA (derivação) | Seymour CW et al. JAMA 2016;315:762 | 26903335 | 10.1001/jama.2016.0288 |
| SIRS | Bone RC et al. ACCP/SCCM, Chest 1992;101:1644 | 1303622 | 10.1378/chest.101.6.1644 |
| SOFA | Vincent JL et al. Intensive Care Med 1996;22:707 | 8844239 | 10.1007/BF01709751 |
| Mortalidade por SOFA | Ferreira FL et al. JAMA 2001;286:1754 | 11594901 | 10.1001/jama.286.14.1754 |
| SSC 2021 | Evans L et al. Crit Care Med 2021;49:e1063 / Intensive Care Med 2021;47:1181 | 34605781 / 34599691 | 10.1097/CCM.0000000000005337 (PMC8486643, texto integral lido) |
| Hour-1 bundle | Levy MM, Evans LE, Rhodes A. Intensive Care Med 2018;44:925 / Crit Care Med 2018;46:997 | 29675566 / 29767636 | 10.1007/s00134-018-5085-0 |
| ANDROMEDA-SHOCK | Hernández G et al. JAMA 2019;321:654 | 30772908 | 10.1001/jama.2019.0071 |
| SEPSISPAM | Asfar P et al. NEJM 2014;370:1583 | 24635770 | 10.1056/NEJMoa1312173 |
| Clearance de lactato | Jones AE et al. JAMA 2010;303:739 | 20179283 | 10.1001/jama.2010.158 |
| ScvO₂ ≥ 70% | Rivers E et al. NEJM 2001;345:1368 | 11794169 | 10.1056/NEJMoa010307 |
| Berlim | ARDS Definition Task Force, JAMA 2012;307:2526 | 22797452 | 10.1001/jama.2012.5669 |
| Definição global SDRA | Matthay MA et al. AJRCCM 2024;209:37 | 37487152 | 10.1164/rccm.202303-0558WS |
| ESICM SDRA 2023 | Grasselli G et al. Intensive Care Med 2023;49:727 | 37326646 | 10.1007/s00134-023-07050-7 |
| PAC | Metlay JP et al. ATS/IDSA, AJRCCM 2019;200:e45 | 31573350 | 10.1164/rccm.201908-1581ST (PMC6812437, texto lido) |
| PAH/PAV | Kalil AC et al. IDSA/ATS, CID 2016;63:e61 | 27418577 | 10.1093/cid/ciw353 (PMC4981759) |
| PAH/PAV Europa | Torres A et al. ERS/ESICM/ESCMID/ALAT, Eur Respir J 2017;50:1700582 | 28890434 | 10.1183/13993003.00582-2017 |
| ITU | Gupta K et al. IDSA/ESCMID, CID 2011;52:e103 | 21292654 | 10.1093/cid/ciq257 |
| Resistência | Tamma PD et al. IDSA AMR Guidance 2023 / 2024 / 2026 | 37463564 / 39108079 / 42570093 | 10.1093/cid/ciad428 · ciae403 · ciag481 |
| Abdome | Mazuski JE et al. SIS, Surg Infect 2017;18:1 | 28085573 | 10.1089/sur.2016.261 |
| Colangite | Gomi H et al. Tokyo Guidelines 2018, J Hepatobiliary Pancreat Sci 2018;25:3 | 29090866 | 10.1002/jhbp.518 |
| Candidíase | Pappas PG et al. IDSA, CID 2016;62:e1 | 26679628 | 10.1093/cid/civ933 (PMC4725385) |
| Pele | Stevens DL et al. IDSA, CID 2014;59:e10 | 24973422 | 10.1093/cid/ciu444 |
| Meningite | Tunkel AR et al. IDSA, CID 2004;39:1267 · 2017 (ventriculite) | 15494903 · 28203777 | 10.1086/425368 · 10.1093/cid/ciw861 |
| Endocardite | Baddour LM et al. AHA, Circulation 2015;132:1435 | 26373316 | 10.1161/CIR.0000000000000296 |
| Neutropenia febril | Freifeld AG et al. IDSA, CID 2011;52:e56 | 21258094 | 10.1093/cid/cir073 |
| MRSA | Liu C et al. IDSA, CID 2011;52:e18 | 21208910 | 10.1093/cid/ciq146 |
| Vancomicina | Rybak MJ et al. ASHP/IDSA/PIDS/SIDP, AJHP 2020;77:835 | 32191793 | 10.1093/ajhp/zxaa036 |
| Polimixinas | Tsuji BT et al. Pharmacotherapy 2019;39:10 | 30710469 | 10.1002/phar.2209 (PMC7437259, texto lido) |
| Colistina (algoritmo) | Nation RL et al. CID 2017;64:565 | 28011614 | 10.1093/cid/ciw839 (PMC5850520) |
| Hartford | Nicolau DP et al. AAC 1995;39:650 | 7793867 | 10.1128/AAC.39.3.650 (PMC162599) |
| Revisões qSOFA 2020–2022 | Waligora G et al. J Emerg Med 2020 · Ruan H et al. 2022 · Wang C et al. PLoS One 2022 | 32829969 · 35572161 · 35427367 | 10.1016/j.jemermed.2020.06.043 · 10.1155/2022/1802707 · 10.1371/journal.pone.0266755 |

Documentos ILAS (texto extraído dos PDFs oficiais): *Protocolo clínico — Atendimento ao paciente adulto com sepse/choque séptico*, rev. ago/2018 (ilas.org.br/wp-content/uploads/2022/02/protocolo-de-tratamento.pdf); *Protocolo gerenciado de sepse — Ficha de triagem*, atualizada jul/2021 (…/proposta-de-ficha-de-triagem-baseada-em-dois-criterio-de-sirs.pdf). SPC Targocid 200 mg (UK, emc produto 2926), rev. 11/12/2025.

Não localizados nesta busca: bula FDA de polimixina B injetável (API DailyMed retorna só tópicos/combinações); texto integral de Baddour 2015 (HTTP 403) e dos valores por faixa da Figura 1 de Ferreira 2001 (JAMA, acesso restrito — só o texto do artigo).

## 2. Triagem de sepse (`sepse.calc.ts` / `sepse.tsx`)

| Item | Valor no app | Fonte | Resultado | Ação |
|---|---|---|---|---|
| qSOFA — FR | ≥ 22 irpm | Singer 2016 (PMID 26903338), texto: "respiratory rate 22/min or greater" | CONFERE | — |
| qSOFA — consciência | Glasgow < 15 | Singer 2016: derivação com GCS ≤ 13, task force adotou "any GCS < 15"; SSC 2021 (PMID 34605781) repete GCS < 15 | CONFERE | — |
| qSOFA — PAS | ≤ 100 mmHg | Singer 2016: "systolic blood pressure of 100 mm Hg or less" | CONFERE | — |
| qSOFA ≥ 2 = alto risco; 0 = "baixo risco imediato" | — | Singer 2016 e SSC 2021 rec. 3: qSOFA prediz desfecho, não deve ser triagem isolada (sensibilidade baixa; revisões 2020–2022, PMID 32829969/35572161/35427367) | CONFERE com ressalva | Ref no rodapé avisa que qSOFA baixo não exclui sepse |
| SIRS — temperatura | > 37,8 °C ou < 35 °C | ILAS, Ficha de triagem jul/2021: "Hipertermia > 37,8º C ou hipotermia < 35º C"; Protocolo ILAS 2018: central > 38,3 ou < 36 "OU equivalente axilar"; Bone 1992: > 38 / < 36 (central) | CONFERE (ILAS, axilar) | — |
| SIRS — FC | > 90 bpm | Bone 1992; ILAS 2018/2021 | CONFERE | — |
| SIRS — FR / PaCO₂ | > 20 irpm ou PaCO₂ < 32 mmHg | Bone 1992; ILAS 2018 ("> 20 rpm, ou PaCO2 < 32 mmHg") | CONFERE | — |
| SIRS — leucócitos | > 12.000, < 4.000 ou > 10% bastões | Bone 1992; ILAS 2021 ("desvio esquerdo > 10%") | CONFERE | — |
| Disfunção — hipotensão | PAS < 90 ou PAM < 65 ou queda PAS > 40 | ILAS 2018/2021 (idêntico) | CONFERE | — |
| Disfunção — respiratória | SpO₂ < 90% necessitando O₂ ou P/F < 300 | ILAS: "PaO2/FiO2 < 300 ou necessidade de O2 para manter SpO2 > 90%" | CONFERE | — |
| Disfunção — renal | Cr > 2 mg/dL ou diurese < 0,5 mL/kg/h | ILAS 2021: "Creatinina > 2,0 mg/dL ou diurese menor que 0,5 mL/Kg/h nas últimas 2 horas" | CONFERE | — |
| Disfunção — bilirrubina | > 2 mg/dL | ILAS 2021 | CONFERE | — |
| Disfunção — plaquetas | < 100.000/mm³ | ILAS 2021 (2018 acrescenta queda de 50% em 3 dias) | CONFERE | — |
| Disfunção — lactato | acima do valor de referência | ILAS 2018/2021 | CONFERE | — |
| Disfunção — coagulopatia | INR > 1,5 ou TTPA > 60 s | ILAS 2021 | CONFERE | — |
| Choque séptico | vasopressor para PAM ≥ 65 + lactato > 2 mmol/L após volume | Singer 2016: "vasopressor requirement to maintain MAP ≥ 65 and serum lactate > 2 mmol/L in the absence of hypovolemia" | CONFERE (limiar estrito > 2 testado) | — |
| Lactato ≥ 4 → 30 mL/kg mesmo sem hipotensão | ≥ 4 mmol/L | Hour-1 bundle 2018 (PMID 29675566): 30 mL/kg "for hypotension or lactate ≥ 4" | CONFERE | — |
| Hiperlactatemia → repetir em 2–4 h | 2–4 h | ILAS 2018 §4.1: "dentro de 2 a 4 horas após o início da ressuscitação" | CONFERE | — |

Observação: o ILAS 2018 mantém a definição de choque da SSC 2012 (hipotensão refratária a volume, independente do lactato); o app usa Sepsis-3, como declarado na tela. Registrado, sem alteração.

## 3. SOFA (`sofa.calc.ts` / `sofa.tsx`)

| Item | Valor no app | Fonte | Resultado | Ação |
|---|---|---|---|---|
| Respiratório | ≥ 400 / 300–399 / 200–299 / 100–199 + VM / < 100 + VM | Vincent 1996 (PMID 8844239), tabela 1 (< 400, < 300, < 200 com suporte, < 100 com suporte) | CONFERE | — |
| Coagulação | ≥ 150 / 100–149 / 50–99 / 20–49 / < 20 (×10³) | Vincent 1996 | CONFERE | — |
| Fígado | < 1,2 / 1,2–1,9 / 2,0–5,9 / 6,0–11,9 / ≥ 12 mg/dL | Vincent 1996 ("> 12,0") | CONFERE (12,0 exato resolvido para 4 pontos; a tabela original deixa lacuna entre 11,9 e > 12) | — |
| Cardiovascular | PAM ≥ 70 / PAM < 70 / dopa ≤ 5 ou dobuta / dopa 5–15 ou nora-adre ≤ 0,1 / dopa > 15 ou nora-adre > 0,1 | Vincent 1996 | CONFERE | — |
| Neurológico | 15 / 13–14 / 10–12 / 6–9 / < 6 | Vincent 1996 | CONFERE | — |
| Renal | < 1,2 / 1,2–1,9 / 2,0–3,4 / 3,5–4,9 ou < 500 mL/d / ≥ 5,0 ou < 200 mL/d | Vincent 1996 ("> 5,0") | CONFERE (mesma lacuna resolvida) | — |
| Δ SOFA ≥ 2 = disfunção orgânica | — | Singer 2016 | CONFERE | — |
| Mortalidade 0–1: 0% · 2–3: 6,4% · 4–5: 20,2% · 6–7: 21,5% · 8–9: 33,3% · 10–11: 50% · ≥ 12: 95,2% | SOFA inicial, 352 pacientes | Ferreira 2001 (PMID 11594901): texto confirma 352 pacientes, "initial SOFA up to 9 predicted a mortality of less than 33%", "> 11 predicted 95%"; valores por faixa estão na Figura 1 (imagem, não acessível) | CONFERE parcialmente — ressalva de `AUDITORIA.md` §7 mantida | Sem alteração; rodapé já cita a fonte |

## 4. Bundle da 1ª hora (`bundle.calc.ts` / `bundle.tsx`)

| Item | Valor no app | Fonte | Resultado | Ação |
|---|---|---|---|---|
| Medir lactato; > 2 ressuscitação; ≥ 4 fluido mesmo sem hipotensão | > 2 / ≥ 4 mmol/L | Hour-1 bundle 2018 (PMID 29675566); ILAS 2018 | CONFERE | — |
| Hemoculturas antes do ATB, ≥ 2 pares, sem atrasar o ATB | 2 pares | Hour-1 bundle 2018; ILAS 2018 ("duas hemoculturas de sítios distintos") | CONFERE | — |
| ATB de amplo espectro na 1ª hora | 1 h | SSC 2021 rec. 12 (choque/sepse provável: imediato, ≤ 1 h; sepse possível sem choque: ≤ 3 h) ; ILAS 2018 | CONFERE | — |
| Cristaloide 30 mL/kg se hipotensão ou lactato ≥ 4, em até 3 h | 30 mL/kg · 3 h | SSC 2021 rec. 5 ("at least 30 mL/kg … within the first 3 h", sugestão fraca); Hour-1 bundle 2018 | CONFERE | — |
| Vasopressor se hipotensão persistente; PAM ≥ 65; periférico aceitável; nora 1ª escolha | — | SSC 2021 rec. 9, 37 e 44 | CONFERE | — |
| Repetir lactato em 2–4 h; meta queda ≥ 10% | 2–4 h · ≥ 10% | ILAS 2018 §4.1 (2–4 h); Jones 2010 (PMID 20179283: clearance ≥ 10% não inferior a ScvO₂ ≥ 70%) | CONFERE | — |
| Reavaliação em 6 h (PAM, diurese, consciência, perfusão periférica, lactato) | 6 h | ILAS 2018 §4.2 "Reavaliação das 6 horas" | CONFERE | — |
| Volume = peso × 30 mL/kg (70 kg → 2.100 mL) | — | aritmética; testada | CONFERE | — |

Rodapé `<Ref>` acrescentado em `bundle.tsx`.

## 5. Metas de perfusão (`perfusao.calc.ts` / `perfusao.tsx`)

| Item | Valor no app | Fonte | Resultado | Ação |
|---|---|---|---|---|
| PAM < 65 = baixa (vasopressor) | 65 mmHg | SSC 2021 rec. 9 (alvo inicial 65, forte, contra alvos maiores); Sepsis-3 | CONFERE | — |
| PAM > 80 = "elevada — reavaliar" | 80 mmHg | SEPSISPAM (PMID 24635770): 80–85 sem ganho de mortalidade, mais FA | CONFERE (limiar de alerta coerente) | — |
| "Considerar PAM 70–80 em HAS prévia ou oligúria refratária" | 70–80 | SSC 2021 recomenda 65 sobre alvos maiores; SEPSISPAM: menos TRS no subgrupo hipertenso crônico, sem efeito em mortalidade | **decisão institucional** (texto preservado; nuance registrada no rodapé) | — |
| Lactato > 2 = hiperlactatemia | > 2 mmol/L | Sepsis-3 | CONFERE | — |
| Clearance de lactato ≥ 10% adequado | 10% | Jones 2010 | CONFERE | — |
| Diurese ≥ 0,5 mL/kg/h adequada; < 0,5 oligúria | 0,5 | ILAS 2018 (oligúria 0,5 mL/kg/h); KDIGO 2012 | CONFERE | — |
| Alerta PAM < 65 + lactato > 2 | — | Sepsis-3 (hipotensão + hiperlactatemia: mortalidade > 40%) | CONFERE | — |
| 1ª linha noradrenalina; acesso periférico aceitável | — | SSC 2021 rec. 37 e 44 | CONFERE | — |
| 2ª linha vasopressina (até 0,03 UI/min) quando nora 0,25–0,5 mcg/kg/min | 0,03 · 0,25–0,5 | SSC 2021 rec. 38 + texto: "vasopressin is usually started when norepinephrine is in the range of 0.25–0.5 μg/kg/min"; VASST 0,01–0,03 U/min | CONFERE | — |
| 3ª linha adrenalina | — | SSC 2021 rec. 39 | CONFERE | — |
| Dopamina não recomendada de rotina; casos selecionados | — | SSC 2021: só se noradrenalina indisponível, atenção a arritmias (SSC 2016 cita bradicardia/baixo risco de taquiarritmia) | CONFERE | — |

Rodapé `<Ref>` acrescentado em `perfusao.tsx`. TRC (ANDROMEDA-SHOCK, PMID 30772908; SSC 2021 rec. 8 como adjunto) não é calculado pela ferramenta — item em aberto (seção 8).

## 6. Oxigenação e transporte de O₂ (`oxigenacao.calc.ts` / `oxigenacao.tsx`)

| Item | Valor no app | Fonte | Resultado | Ação |
|---|---|---|---|---|
| P/F > 300 sem critério · 201–300 leve · 101–200 moderada · ≤ 100 grave (PEEP ≥ 5) | `C.berlin` | Berlim 2012 (PMID 22797452), abstract: leve 200 < P/F ≤ 300; moderada 100 < P/F ≤ 200; grave ≤ 100 | CONFERE (limites exatos 300/200/100 testados) | — |
| FiO₂ aceita 0,21–1 ou 21–100% | `C.fio2` | plausibilidade (AUDITORIA §8) | CONFERE | — |
| S/F e CNAF (definição global 2023/2024) | não implementado | Matthay 2024 (PMID 37487152): S/F ≤ 315 se SpO₂ ≤ 97%; CNAF ≥ 30 L/min; ESICM 2023 (PMID 37326646) | SEM IMPLEMENTAÇÃO | Item em aberto; rodapé informa |
| Extração de O₂ normal ≤ 30%; 31–50 aumentada; > 50 choque | 30 / 50% | fisiologia (SEM FONTE PRIMÁRIA ÚNICA) | sem divergência conhecida | — |
| SvO₂ 65–75% normal; ScvO₂ ≥ 70% meta | 65 / 80 / 70% | Rivers 2001 (PMID 11794169): meta ScvO₂ ≥ 70%; faixa de SvO₂ é fisiologia padrão | CONFERE | — |
| DO₂ = DC × (1,34 × Hb × SaO₂ + 0,003 × PaO₂) × 10 | 1,34 · 0,003 | fórmula clássica (constantes 1,34–1,39 na literatura); testado 590 mL/min | CONFERE | — |
| VO₂ = DO₂ × extração | — | definição | CONFERE | — |
| Meta Hb > 7 g/dL; 8–9 em baixo DC/isquemia | 7 · 8–9 | SSC 2021: gatilho restritivo 70 g/L; exceções isquemia miocárdica, hipoxemia grave, hemorragia aguda (TRISS, TRICC) | CONFERE; "8–9" é **decisão institucional** | — |

Rodapé `<Ref>` acrescentado em `oxigenacao.tsx`. Nota: a ferramenta está registrada no grupo `resp` (não `inf`), mas vive em `tools/inf/`.

## 7. ATB empírico por foco (`atb-foco.calc.ts` / `atb-foco.tsx`)

Esquemas empíricos são escolha de protocolo (CCIH): **nenhuma linha foi alterada**. Abaixo, a comparação com a diretriz de referência.

| Linha | Valor no app | Fonte | Resultado |
|---|---|---|---|
| PAC leve-moderada → amoxicilina-clavulanato | — | Metlay 2019 (PMID 31573350): ambulatorial com comorbidade = amox-clav **+ macrolídeo/doxiciclina**; internado não grave = betalactâmico + macrolídeo | **decisão institucional** (falta o macrolídeo em relação à diretriz) |
| PAC moderada-grave → pip-tazo + azitromicina | — | Metlay 2019: amp-sulbactam 1,5–3 g 6/6 h, ceftriaxona 1–2 g/d ou cefotaxima + azitro; pip-tazo 4,5 g 6/6 h só com fator de risco para Pseudomonas | **decisão institucional** (já item [V]1 da AUDITORIA.md) |
| PAC com risco de Pseudomonas → pip-tazo ou cefepime | — | Metlay 2019: pip-tazo 4,5 g 6/6 h, cefepime 2 g 8/8 h, ceftazidima, aztreonam, meropenem, imipenem | CONFERE |
| PAH/PAVM precoce → ceftriaxona ou amp-sulbactam | — | Kalil 2016 (PMID 27418577) não usa precoce/tardia: HAP sem alto risco = agente anti-MSSA **e** antipseudomonas (pip-tazo, cefepime, levofloxacino, carbapenem); esquema estreito deriva da ATS 2005 / Torres 2017 (PMID 28890434) para baixo risco | **decisão institucional** |
| PAH/PAVM tardia → pip-tazo + amicacina ± vancomicina | — | Kalil 2016: 2 antipseudomonas de classes distintas se fator de risco MDR ou resistência > 10%; evitar aminoglicosídeo se houver alternativa; vanco 15 mg/kg 8–12 h (ataque 25–30) se risco MRSA; amicacina 15–20 mg/kg/d | CONFERE (com ressalva ao aminoglicosídeo) |
| Risco de MDR → meropenem (alternativa) | — | Kalil 2016 (tabela 3: meropenem 1 g 8/8 h) | CONFERE |
| ITU grave sem cateter → ceftriaxona 2 g 1×/dia | 2 g | Gupta 2011 (PMID 21292654): internado = cefalosporina de espectro estendido IV (dose não fixada; 1 g aparece só como dose única inicial ambulatorial) | **decisão institucional** (dose 2 g dentro da bula, máx. 4 g/d) |
| Cateter / ESBL → ertapenem 1 g 1×/dia | 1 g | IDSA AMR 2026 (PMID 42570093): fora do trato urinário carbapenem preferido, **mero/imipenem sobre ertapenem no paciente crítico ou hipoalbuminêmico**; cUTI: SMX-TMP ou FQ preferidos, carbapenem se não puder usá-los | **decisão institucional** — ressalva para o paciente de UTI |
| Sem MDR → ciprofloxacino 400 mg 12/12 h | — | bula cipro IV (cUTI 400 mg 12/12 h); Gupta 2011 | CONFERE |
| Enterococo → ampicilina 2 g 4/4 h | — | dose padrão (AHA 2015 endocardite: 2 g 4/4 h) | CONFERE |
| Peritonite comunitária → pip-tazo 4,5 g 6/6 h; hospitalar → meropenem 1 g 8/8 h | — | Mazuski 2017 (PMID 28085573; texto não acessado nesta busca); doses = bula | CONFERE pela bula; esquema institucional |
| Colangite → ceftriaxona + metronidazol | — | Tokyo 2018 (PMID 29090866; só metadados) | institucional, sem divergência conhecida |
| Candidemia suspeita → "fluconazol ou equinocandina" | — | Pappas 2016 (PMID 26679628), rec. 1 e 29: **equinocandina é a terapia inicial** (forte, alta qualidade); fluconazol 800→400 mg é alternativa em paciente selecionado não crítico | **decisão institucional** — recomendo inverter a ordem ("equinocandina; fluconazol se não crítico") |
| Celulite grave / erisipela → oxacilina 2 g 4/4 h | 2 g 4/4 h | Stevens 2014 (PMID 24973422), tabela 4: nafcilina/oxacilina 1–2 g 4/4 h; para celulite **grave** não purulenta a diretriz sugere vancomicina + pip-tazo | dose CONFERE; escolha do agente = **decisão institucional** |
| MRSA suspeito → vancomicina 15–20 mg/kg 12/12 h | — | Stevens 2014: 30 mg/kg/dia em 2 doses; Rybak 2020: 15–20 mg/kg 8–12 h por AUC | CONFERE |
| Fasciíte necrosante → pip-tazo + clindamicina + vancomicina | — | Stevens 2014: vanco ou linezolida + pip-tazo/carbapenem/ceftriaxona+metronidazol; clindamicina para estreptococo/clostrídio | CONFERE |
| MRSA alternativa → linezolida 600 mg 12/12 h | — | Stevens 2014; bula Zyvox | CONFERE |
| Meningite comunitária → ceftriaxona 2 g 12/12 h + dexametasona 0,15 mg/kg 6/6 h | — | Tunkel 2004 (PMID 15494903): dexa 0,15 mg/kg 6/6 h por 2–4 d, 10–20 min antes ou junto da 1ª dose (texto lido); ceftriaxona 2 g 12/12 h e ampicilina 2 g 4/4 h estão nas tabelas 4/6 (imagem; não relidas). Nos EUA a diretriz associa vancomicina empírica (pneumococo resistente) | CONFERE (dexa); vanco empírica = **decisão institucional** |
| > 50 anos / imunossuprimido → ampicilina 2 g 4/4 h (Listeria) | — | Tunkel 2004, tabela 4 | CONFERE (conferido em 03/10/2026) |
| Nosocomial / pós-neurocirurgia → meropenem + vancomicina | — | Tunkel 2017 (PMID 28203777): vancomicina + betalactâmico antipseudomonas (cefepime, ceftazidima ou meropenem) | CONFERE |
| Endocardite (5 linhas) | oxacilina 2 g 4/4 h; vanco; vanco + rifampicina + gentamicina; penicilina G ou ceftriaxona ± gentamicina; ampicilina + gentamicina ou + ceftriaxona | Baddour 2015 (PMID 26373316) — metadados confirmados; texto integral indisponível nesta sessão (HTTP 403); regimes conferidos em 03/10/2026 ([V]1) | CONFERE (auditoria anterior) |
| Foco desconhecido → pip-tazo / meropenem / vanco / micafungina 100 mg | — | doses = bulas; micafungina 100 mg = Pappas 2016 e bula | CONFERE pela bula; esquema institucional |
| Neutropenia febril | **ausente** | Freifeld 2011 (PMID 21258094): monoterapia com betalactâmico antipseudomonas (cefepime, pip-tazo, carbapenem) | SEM IMPLEMENTAÇÃO — item em aberto |

Rodapé `<Ref>` acrescentado em `atb-foco.tsx` com todas as diretrizes acima.

## 8. Ajuste renal de antimicrobianos (`atb.calc.ts` / `atb.tsx`) — fonte regulatória DailyMed

Bulas lidas na página `drugInfo.cfm?setid=…` (setId e data de revisão também anotados em comentário ao lado de cada droga no código).

| Droga | Faixas no app | Bula / fonte | Resultado | Ação |
|---|---|---|---|---|
| Ampicilina-sulbactam | ≥ 30: 6–8 h · 15–29: 12 h · 5–14: 24 h · < 5: sem dado | Unasyn (Roerig), setId 12eeb72a-403d-41be-bae4-4cb930862884, rev. 11/2025, tabela 3 — idêntico; < 5 e HD não constam | CONFERE | comentário |
| Piperacilina-tazobactam | > 40: 4,5 g 6/6 h · 20–40: 3,375 g 6/6 h · < 20: 2,25 g 6/6 h · HD: 2,25 g 8/8 h + 0,75 g pós-HD | Zosyn (Baxter), setId 8db6bd91-2106-4bfd-8cc8-38aaf1e18d17, rev. 5/2026, tabela 1 (pneumonia nosocomial) — idêntico; CAPD 2,25 g 8/8 h **sem** suplemento | DIVERGE (redação: texto anterior sugeria 0,75 g também em DP) | **corrigido** |
| Ceftriaxona | sem ajuste; hepática + renal: máx. 2 g/d; não dialisável | ceftriaxona (Hikma), setId 8351aa37-552d-471d-b293-c564dcb6ec29, rev. 12/2021 | CONFERE | comentário |
| Cefepime | > 60: 2 g 8/8 h · 30–60: 2 g 12/12 h · 11–29: 2 g 24/24 h · < 11: 1 g 24/24 h · HD: **1 g 24/24 h** · CAPD 2 g 48/48 h | cefepime (Hospira), setId e80c27e2-164d-4836-ba24-c160d75dc5d3, rev. 11/2024, tabela 2: faixas idênticas; HD = "1 g on Day 1 followed by 500 mg every 24 hours … except febrile neutropenia, which is 1 g every 24 hours"; dar após a sessão | **DIVERGE** (dose em HD) | **corrigido** + teste |
| Ceftazidima | > 50: 1–2 g 8/8 h · 31–50: 1 g 12/12 h · 16–30: 1 g 24/24 h · 6–15: 500 mg 24/24 h · ≤ 5: 500 mg 48/48 h (+50% em infecção grave); HD 1 g ataque + 1 g pós-sessão; DP 1 g → 500 mg/d | Tazicef (Hospira), setId 40d48c5d-650e-461b-a67b-7e65772d1b92, rev. 1/2026, tabela 4 — idêntico | CONFERE | comentário |
| Ceftazidima-avibactam | > 50: 2,5 g 8/8 h · 31–50: 1,25 g 8/8 h · 16–30: 0,94 g 12/12 h · 6–15: 0,94 g 24/24 h · ≤ 5: 0,94 g 48/48 h; após HD | Avycaz (Allergan), setId d9c2803f-dc9c-4b19-b4a3-8303bc8c15fd, rev. 4/2025, tabela 3 — idêntico | CONFERE | comentário |
| Meropenem | > 50: dose plena 8/8 h · 26–50: plena 12/12 h · 10–25: metade 12/12 h · < 10: metade 24/24 h; diálise sem dado | meropenem (Hikma), setId 8a2a545e-b336-416a-be73-9e0a7ccf6177, rev. 9/2025, tabela 1 — idêntico. Dose adulta em bula 0,5–1 g 8/8 h; "1–2 g" do app inclui dose de SNC (máxima dos ensaios; Tunkel 2017) | CONFERE (2 g = extrapolação registrada) | comentário |
| Ertapenem | > 30: 1 g/d · ≤ 30: 500 mg/d; HD: +150 mg se dose ≤ 6 h antes | Invanz (MSD), setId 33f3b99b-fa82-42e0-26bf-f49891ae3d22, rev. 2/2026 — idêntico | CONFERE | comentário |
| Imipenem | ≥ 90: 500 mg 6/6 h · 60–89: 400 · 30–59: 300 · 15–29: 200 mg 6/6 h · < 15: não usar salvo HD em 48 h; HD = faixa 15–29, após a sessão | Primaxin IV (MSD), setId f41d8abd-7792-4918-1b93-bd83ea01955e, rev. 5/2022, tabela 3 — idêntico | CONFERE | comentário |
| Gentamicina | 7 mg/kg; ≥ 60: 24 h · 40–59: 36 h · 20–39: 48 h · < 20: nível sérico | Nicolau 1995 (PMID 7793867), abstract: "≥ 60 q24h, 59 to 40 q36h, 39 to 20 q48h" | CONFERE | comentário |
| Amicacina | 15 mg/kg com os intervalos de Hartford; < 20: dose convencional por nível | Hartford é de gentamicina/tobramicina; bula amicacina (Sagent), setId f260ff2a-76a0-4672-9516-91c344b67890, rev. 4/2026: 15 mg/kg/dia em 2–3 doses (máx. 1,5 g/d), ajuste por nível ou intervalo = Cr × 9 | **SEM FONTE PRIMÁRIA** (extrapolação, já sinalizada no código) | comentário explícito; validar com farmácia |
| Vancomicina | ataque 20–35 mg/kg (máx. 3 g); 15–20 mg/kg 8–12 h por AUC 400–600; ≥ 30: 12–24 h · 15–29: 24–48 h · < 15: só por nível | Rybak 2020 (PMID 32191793) para ataque/AUC; bula (Hospira), setId b01aaa02-8f1d-4b57-96a5-337503428af1, rev. 10/2021: nomograma de Moellering (~15 × ClCr mg/dia), dose inicial ≥ 15 mg/kg, anúrico 1 g a cada 7–10 d | ataque/AUC CONFERE; intervalos por faixa **SEM FONTE PRIMÁRIA ÚNICA** (esquema de partida) | comentário |
| Teicoplanina | > 80: 400 mg/d após ataque 400 mg 12/12 h × 3 · 30–80: metade a partir do 4º dia · < 30 e HD: um terço | SPC Targocid (UK, emc 2926), rev. 11/12/2025, §4.2: ataque 6 mg/kg 12/12 h × 3, manutenção 6 mg/kg/d (12 mg/kg em endocardite/osso); 30–80 metade; < 30 e HD um terço; "not removed by haemodialysis" | CONFERE (400 mg ≈ 6 mg/kg para ~67 kg; SPC é por peso) | comentário |
| Ciprofloxacino | > 30: 400 mg 8–12 h · 5–29: 200–400 mg 18–24 h · < 5: sem dado; HD/DP removem < 10% | cipro IV (Sagent), setId f406e796-17d9-4465-b8a7-00d966a4ba74, rev. 1/2025, tabela 4 — idêntico | CONFERE | comentário |
| Levofloxacino | ≥ 50 plena · 20–49: 750 mg 48/48 h ou 500 → 250 mg/d · 10–19: 750 → 500 mg 48/48 h ou 500 → 250 mg 48/48 h · HD/CAPD = 10–19, sem suplemento | levofloxacino IV (Hospira), setId 5a1534af-aa1c-4f1d-ba9f-9415b14e1af2, rev. 9/2024, tabela 3 — idêntico | CONFERE | comentário |
| Fluconazol | > 50 plena · ≤ 50: 50% · HD: 100% após cada sessão; ataque pleno | fluconazol IV (Baxter), setId cd24a261-9c15-42b4-8040-89d2dbda174e, rev. 6/2024 — idêntico | CONFERE | comentário |
| Voriconazol IV | ≥ 50: 6 mg/kg 12/12 h × 2 → 4 mg/kg · < 50: evitar IV (SBECD), preferir VO | Vfend (Pfizer), setId ce3ef5cf-3087-4d92-9d94-9eb8287228db, rev. 2/2026 — idêntico | CONFERE | comentário |
| Micafungina | sem ajuste; 100 mg candidemia · 150 mg esofágica | micafungina (Fresenius), setId dc5241be-4b85-4f04-8553-9819603373b8, rev. 4/2025 — idêntico; sem suplemento pós-HD | CONFERE | comentário |
| Anfotericina B lipossomal | 3–5 mg/kg/d sem ajuste; monitorar rim | AmBisome (Astellas), setId f7be6506-4d20-401e-a0ff-02ad7c33158a, rev. 11/2024: 3–5 mg/kg/d (sistêmica), 6 (criptococo/HIV); sem orientação renal | CONFERE | comentário |
| Metronidazol | 500 mg 8/8 h sem ajuste; HD após a sessão; vigiar neurotoxicidade em DRC grave | metronidazol IV (Baxter), setId 9d762edb-12ac-429d-b1f0-7af5d3b909d4, rev. 6/2025: 7,5 mg/kg 6/6 h (máx. 4 g/d); metabólitos acumulam em DRC terminal; HD remove 40–65%, suplementar após | CONFERE quanto ao ajuste; intervalo 8/8 h = **decisão institucional** (bula 6/6 h) | comentário |
| SMX-TMP (faixas) | > 30 usual · 15–30: 50% · < 15: não recomendado | SMX-TMP IV (Teva), setId 640f5b0c-748d-4a68-a1de-59cc3e00ed49, rev. 4/2025, tabela 2 — idêntico | CONFERE | comentário |
| SMX-TMP (dose habitual) | **TMP 5 mg/kg/dia em 6/6–8/8 h** | mesma bula: ITU grave/shigelose 8–10 mg/kg/d em 2–4 doses; PCP 15–20 mg/kg/d em 3–4 doses | **DIVERGE** (abaixo da faixa da bula IV) | **corrigido** + teste |
| Polimixina B | 1,25–1,5 mg/kg 12/12 h; ataque 2–2,5 mg/kg; sem ajuste renal; não removida por diálise | Tsuji 2019 (PMID 30710469), texto lido: ataque 2–2,5 mg/kg TBW em 1 h; 1,25–1,5 mg/kg 12/12 h em 1 h; "no PK rationale exists for adjusting doses according to renal function"; não ajustar em TRS (CVVHD remove 5–12%). Bula FDA (que recomenda reduzir) não localizada na busca | CONFERE (consenso); bula não localizada | comentário |
| Colistina | tabela por ClCr (360…130 mg CBA/d), ataque 300 mg CBA, HD 130 + 40/50 mg, CRRT 440 mg/d | Tsuji 2019 tabela 2 e Nation 2017 (PMID 28011614): ≥ 90 360 · 80–<90 340 · 70–<80 300 · 60–<70 275 · 50–<60 245 · 40–<50 220 · 30–<40 195 · 20–<30 175 · 10–<20 160 · 5–<10 145 · < 5 130; ataque 300 mg CBA (~9 MUI) em 0,5–1 h, 1ª manutenção 12–24 h; HD 130 mg/d + 40 mg (3 h) ou 50 mg (4 h); CRRT 440 mg/d; 1 MUI ≈ 33 mg CBA | CONFERE (11 faixas, linha a linha) | comentário |
| Linezolida | 600 mg 12/12 h sem ajuste; plaquetopenia > 14 d | Zyvox (Pfizer), setId 6e70e63b-bfd5-478d-a8ee-8ba22c9efabd, rev. 6/2026: sem ajuste; metabólitos acumulam; HD remove ~30% (dar após); plaquetopenia "> 2 semanas" | CONFERE | comentário |
| Daptomicina | ≥ 30: 6–10 mg/kg/d · < 30 (HD/DP): mesma dose 48/48 h, após HD | Cubicin RF (MSD), setId 0b1a8885-2198-4a0e-8105-0c76c1cba6c2, rev. 3/2025, tabela 3: 4 mg/kg (pele) / 6 mg/kg (bacteremia) 24 h → 48 h se < 30 | faixas CONFERE; "6–10 mg/kg" = extrapolação IDSA MRSA 2011 (PMID 21208910) | comentário |
| Estadiamento KDIGO | G1 ≥ 90 · G2 60–89 · G3a 45–59 · G3b 30–44 · G4 15–29 · G5 < 15 | KDIGO 2012 (não buscado nesta auditoria; valores canônicos) | CONFERE | — |

## 9. Correções aplicadas (antes → depois)

| Arquivo | Item | Antes | Depois | Fonte |
|---|---|---|---|---|
| `atb.calc.ts` DB Cefepime, faixa ClCr < 11 | dose em hemodiálise | "Hemodiálise: 1 g 24/24 h, após a sessão." | "Hemodiálise: 1 g no 1º dia, depois 500 mg 24/24 h (neutropenia febril: 1 g 24/24 h), após a sessão." | bula cefepime Hospira, DailyMed setId e80c27e2-164d-4836-ba24-c160d75dc5d3, rev. 11/2024, tabela 2 e texto |
| `atb.calc.ts` NORMAL SMX-TMP | dose habitual | "TMP 5 mg/kg/dia em 6/6–8/8 h" | "TMP 8–10 mg/kg/dia IV em 6/6–12/12 h (PCP: 15–20 mg/kg/dia)" | bula SMX-TMP IV Teva, DailyMed setId 640f5b0c-748d-4a68-a1de-59cc3e00ed49, rev. 4/2025 |
| `atb.calc.ts` DB Pip-tazo, faixa ClCr < 20 | redação HD/DP | "Hemodiálise ou DP: 2,25 g IV 8/8 h + 0,75 g após cada hemodiálise." | "Hemodiálise: 2,25 g IV 8/8 h + 0,75 g após cada hemodiálise. DP: 2,25 g IV 8/8 h, sem suplemento." | bula Zosyn Baxter, DailyMed setId 8db6bd91-2106-4bfd-8cc8-38aaf1e18d17, rev. 5/2026, tabela 1 |
| `atb.calc.ts` (todas as drogas) | comentário de fonte | genérico ("bula FDA") | setId DailyMed + data de revisão (ou SPC/consenso/PMID) ao lado de cada entrada; amicacina e intervalos da vancomicina marcados "SEM FONTE PRIMÁRIA" | — |
| `atb.test.ts` | novos testes | — | cefepime em HD (500 mg 24/24 h; neutropenia 1 g); pip-tazo DP sem suplemento; NORMAL SMX-TMP 8–10 / 15–20 mg/kg/dia | — |
| `sepse.tsx`, `bundle.tsx`, `perfusao.tsx`, `oxigenacao.tsx`, `atb-foco.tsx` | rodapé `<Ref>` | ausente | citação completa (autor, revista, ano, PMID) e documentos ILAS | — |
| `atb.tsx` | rodapé `<Ref>` | existente | acrescidos Rybak 2020, Tsuji 2019 (polimixina B sem ajuste), Nicolau 1995 com PMID, SPC 12/2025 | — |

Nenhum número clínico de `sepse`, `sofa`, `bundle`, `perfusao`, `oxigenacao` ou `atb-foco` foi alterado; o texto clínico e o layout foram preservados (só rodapés).

Resultado: `cmd /c "npx.cmd tsc --noEmit"` → sem erros. `cmd /c "npx.cmd vitest run src/tools/inf"` → 8 arquivos, **110 testes aprovados** (107 anteriores + 3 novos).

## 10. Decisões institucionais (não alteradas — validar com CCIH / farmácia clínica)

1. **PAC moderada-grave: pip-tazo + azitromicina** (já [V]1). ATS/IDSA 2019: amp-sulbactam/ceftriaxona/cefotaxima/ceftarolina + azitro; pip-tazo só com fator de risco para Pseudomonas.
2. **PAC leve-moderada: amoxicilina-clavulanato isolada.** ATS/IDSA 2019 associa macrolídeo ou doxiciclina quando há comorbidade; internado não grave = betalactâmico + macrolídeo.
3. **PAH/PAV "precoce": ceftriaxona ou amp-sulbactam.** IDSA/ATS 2016 não distingue precoce/tardia e pede cobertura anti-MSSA + antipseudomonas em toda PAH/PAV (pip-tazo, cefepime, levofloxacino, carbapenem); o esquema estreito segue ATS 2005 / ERS 2017 para baixo risco. Decidir pela epidemiologia local.
4. **ESBL/cateter urinário: ertapenem.** IDSA AMR 2026: no paciente crítico ou hipoalbuminêmico, preferir meropenem/imipenem a ertapenem; em cUTI, SMX-TMP ou FQ são preferidos quando sensíveis.
5. **Candidemia suspeita: "fluconazol ou equinocandina".** IDSA 2016 recomenda equinocandina como terapia inicial (forte, alta qualidade); fluconazol só em paciente selecionado não crítico. Recomendo inverter a ordem na tabela.
6. **Celulite grave/erisipela: oxacilina.** IDSA 2014: celulite grave não purulenta → vancomicina + pip-tazo; oxacilina 1–2 g 4/4 h é dose correta para MSSA.
7. **Meningite comunitária sem vancomicina empírica.** IDSA 2004 associa vancomicina (pneumococo resistente a cefalosporina nos EUA); depende da epidemiologia brasileira.
8. **PAM 70–80 em HAS prévia / oligúria.** SSC 2021 recomenda 65 sobre alvos maiores; SEPSISPAM mostrou só menos TRS em hipertensos crônicos.
9. **Hb 8–9 g/dL no choque com baixo DC/isquemia.** SSC 2021: gatilho 7 g/dL com exceções clínicas (isquemia miocárdica, hipoxemia grave, hemorragia aguda), sem fixar 8–9.
10. **Metronidazol 500 mg 8/8 h** (bula: 7,5 mg/kg 6/6 h); **meropenem até 2 g 8/8 h** (bula adulta 0,5–1 g; 2 g = SNC); **daptomicina 6–10 mg/kg** (bula 4–6; 8–10 = IDSA MRSA 2011); **teicoplanina 400 mg fixa** (SPC: 6 mg/kg).
11. **Amicacina por intervalo estendido 15 mg/kg** (extrapolação de Hartford, sem fonte primária); **intervalos de vancomicina por faixa de ClCr** (esquema de partida; o consenso manda individualizar por AUC/Bayesiano).

## 11. Itens em aberto

1. **Ferreira 2001 — valores por faixa.** O texto do JAMA confirma 352 pacientes, "SOFA inicial até 9 → mortalidade < 33%" e "> 11 → 95%", mas os percentuais 6,4 / 20,2 / 21,5 / 33,3 / 50,0 estão na Figura 1 (imagem), não acessível nesta sessão. Ressalva da AUDITORIA.md §7 permanece; confirmar com o PDF do artigo.
2. **Bula FDA de polimixina B injetável** não localizada via API/busca DailyMed (só produtos tópicos/combinados). A conduta do app segue o consenso Tsuji 2019 (sem ajuste renal), que explicitamente contraria a bula antiga — registrar essa escolha com a farmácia.
3. **Baddour 2015 (endocardite)** — texto integral indisponível (HTTP 403); regimes conferidos na auditoria de 03/10/2026, não relidos agora. **Tunkel 2004** — doses nas tabelas 4/6 (imagem) não relidas; dexametasona confirmada no texto.
4. **Neutropenia febril** não existe em "ATB por foco" (IDSA 2010/2011: cefepime, pip-tazo ou carbapenem em monoterapia). Avaliar inclusão.
5. **Oxigenação**: S/F ≤ 315, CNAF ≥ 30 L/min e metas de SpO₂ (definição global 2023/2024; ESICM 2023) não implementados; a ferramenta só calcula P/F pela definição de Berlim.
6. **Perfusão**: tempo de enchimento capilar (ANDROMEDA-SHOCK; SSC 2021 rec. 8 como adjunto) não é registrado pela ferramenta.
7. **SSC 2021 e qSOFA**: a ferramenta exibe "Baixo risco imediato" com qSOFA 0; rodapé agora adverte, mas pode valer rever o rótulo (decisão de produto).
8. **Diretriz brasileira (ILAS)**: protocolo clínico adulto é de ago/2018 e ficha de triagem de jul/2021; verificar periodicamente novas edições (o Guia de terapia antimicrobiana ILAS 3ª ed. 2024 não foi comparado com a tabela de ATB por foco).
9. **Oxigenação registrada no grupo `resp`** embora o arquivo esteja em `tools/inf/` — só organização.
10. Revisão e assinatura da tabela de ajuste renal pela farmácia clínica antes do uso assistencial (recomendação da AUDITORIA.md mantida).
