# Auditoria clínica 2026-10 — 3. Drogas vasoativas, sedação/analgesia, escalas, opioides e lidocaína

Data: 11/10/2026 · Escopo: `web/src/tools/hemo/dva.calc.ts`, `dva.tsx`; `web/src/tools/sed/sedacao.calc.ts`, `sedacao.tsx`, `rass.*`, `bps.*`, `opioide.*`, `lidocaina.*`, `delirium.tsx`; `web/src/tools/infusion.ts`; `web/src/lib/core/infMath.ts`. Contexto: `AUDITORIA.md` §2–6 e `PESQUISA-ACLS.md`.

**Método.** Cada número do código foi transcrito e comparado com a fonte primária: bula FDA no DailyMed (lida pela URL `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=…`, marcada **[reg.]** = fonte regulatória, não indexada no PubMed), diretriz ou artigo original. Todas as referências de literatura foram conferidas no PubMed (metadados por PMID; texto completo quando disponível no PMC: CDC 2022, MENDS2, SSC 2021). Nenhum PMID foi citado sem verificação; PMIDs lembrados de memória que se mostraram errados (3) foram descartados e resolvidos por busca de citação.

**Legenda.** CONFERE = número igual à fonte · DIVERGE = diferente da fonte primária · SEM FONTE PRIMÁRIA = valor de uso consagrado sem fonte primária que o fixe · INST. = escolha entre fontes aceitáveis (decisão institucional, não alterada).

**Resumo.** 0 divergências inequívocas de número contra a fonte primária. 1 alteração de comportamento (alerta adicional de vasopressina na noradrenalina a partir de 0,25 mcg/kg/min, SSC 2021) + rodapés `<Ref>` com citação completa em todas as 7 ferramentas. 9 decisões institucionais registradas, 6 itens em aberto. `tsc` e `vitest` verdes (7 arquivos, 74 testes).

---

## 3.1 Drogas vasoativas (`dva.calc.ts`)

Fontes primárias: bulas FDA/DailyMed **[reg.]**; SSC 2021 — Evans L et al. Crit Care Med 2021;49:e1063–e1143, PMID 34605781, DOI 10.1097/CCM.0000000000005337 (texto completo lido na versão Intensive Care Med, PMID 34599691, PMC8486643).

| Item | Valor no app | Fonte (citação + PMID/DOI/DailyMed) | Resultado | Ação |
|---|---|---|---|---|
| Noradrenalina — faixa | 0,01–3 mcg/kg/min; alt. mcg/min | Bula Levophed (Hospira) [reg.] setid 2c7dd2b0-cc10-4db6-bf56-6eb154ebeb10: inicial 8–12 mcg/min, manutenção 2–4 mcg/min; **não traz dose/kg nem máximo**. Alta dose definida como > 1 mcg/kg/min: Auchet T et al. Ann Intensive Care 2017;7:43, PMID 28425079, DOI 10.1186/s13613-017-0261-x. | SEM FONTE PRIMÁRIA para 0,01 e 3 (faixa de uso corrente) | Mantido; citado no `<Ref>` |
| Noradrenalina — alerta | antes: só `warn` > 1 mcg/kg/min ("associar vasopressina") | SSC 2021, rec. 38 (fraca, evidência moderada): associar vasopressina em vez de escalar a nora; "in our practice… 0.25–0.5 μg/kg/min" (texto completo conferido). | **DIVERGE em conduta** — o aviso de vasopressina só aparecia acima de 1, 2–4× acima do gatilho da SSC; inconsistente com a ferramenta de sepse do app (AUDITORIA §7) | **Corrigido:** `info` a partir de 0,25 (SSC 2021) + `warn` > 1 (alta dose). Teste atualizado |
| Nora concentrada | 20 mg/100 mL travada, acesso central | Diluição institucional | INST. | Mantido |
| Vasopressina — faixa | 0,01–0,04 UI/min | Bula Vasostrict (Par) [reg.] setid b1147beb-743e-4c62-8927-91192447f8b8: choque séptico inicia 0,01 UI/min, +0,005 a cada 10–15 min, dados até 0,07 UI/min. SSC 2021: dose fixa habitual 0,03 UI/min, ensaios até 0,06. VASST (Russell JA et al. N Engl J Med 2008;358:877–87, PMID 18305265): 0,01–0,03. | INST. — o teto 0,04 é mais conservador que bula (0,07) e ensaios (0,06); limite inferior CONFERE | Mantido; registrado |
| Dobutamina | 2–20 mcg/kg/min | Bula dobutamina em glicose (Baxter) [reg.] setid 6b17b98b-e06d-42ed-925f-69aa2699dead: "usually 2–20 mcg/kg/min"; raramente até 40. | CONFERE | — |
| Dopamina — bandas | < 2 dopaminérgica · 2–10 β1 · 10–20 β1 + α · > 20 α predominante | Bula dopamina em glicose (Baxter) [reg.] setid cb97d4a0-89ed-407c-a763-209386b6f75c, Clinical Pharmacology: 0,5–2 vasodilatação dopaminérgica; 2–10 β1; 10–20 "some effect on alpha"; > 20 "alpha predominates". **Bula Hospira** [reg.] setid 08f23f6e-150d-45ea-098e-f2edf64c21a1 usa outros cortes: < 5 D1/D2; 5–10 β1; > 10 α1. | CONFERE com Baxter; INST. entre duas bulas FDA discordantes | Mantido (Baxter, já escolhido na AUDITORIA §2) |
| Dopamina — nota renal | "Dose baixa não tem efeito protetor renal comprovado" | Bellomo R et al. Lancet 2000;356:2139–43, PMID 11191541, DOI 10.1016/s0140-6736(00)03495-4 (ANZICS, 328 pts, dopamina 2 mcg/kg/min sem proteção renal). | CONFERE | Citado no `<Ref>` |
| Nitroprussiato — faixa | 0,3–10 mcg/kg/min; máximo 10 por < 10 min | Bula nitroprussiato (Mylan) [reg.] setid 6fbfb86c-da8d-4741-b1e0-7000e2bbad5f: iniciar 0,3; máximo recomendado 10 mcg/kg/min; "infusion at the maximum dose rate should never last more than 10 minutes" (boxed warning). | CONFERE | — |
| Nitroprussiato — cianeto | alerta > 2 mcg/kg/min | Mesma bula: "rates above 2 mcg/kg/min generate cyanide ion". | CONFERE | — |
| Nitroprussiato — renal | TFG < 30: média < 3 mcg/kg/min; anúrico 1 | Mesma bula (tiocianato): infusão prolongada não mais rápida que 3 mcg/kg/min com função renal normal; anúrico 1 mcg/kg/min. | CONFERE (a bula fala em função renal normal para o limite de 3; o app aplica a TFG < 30 — mais conservador) | Mantido |
| Nitroglicerina — início/titulação | 5 mcg/min; +5 a cada 3–5 min; sem resposta em 20, passos de 10–20 | Bula NTG em glicose (Baxter) [reg.] setid 457a026c-ebce-4701-9deb-2d7652759a99: idem, literalmente. | CONFERE | — |
| Nitroglicerina — faixa "habitual 5–200" / sem máximo | > 200 = "sem máximo em bula; reavaliar" | Bula: não define máximo ("one or even two orders of magnitude higher"). O corte 200 não consta na bula. | SEM FONTE PRIMÁRIA para 200 (uso corrente) | Mantido (sinalizado como habitual, não como limite) |
| Milrinona | 0,375–0,75 mcg/kg/min; reduzir na disfunção renal | Bula milrinona em glicose (Baxter) [reg.] setid 8fd0f93a-6150-4020-b7ee-4b95b520f6ce: mínimo 0,375, padrão 0,5, máximo 0,75; ≤ 1,13 mg/kg/dia; tabela por ClCr (5 → 0,20 … 50 → 0,43). | CONFERE | — |
| Diluições-padrão (nora 16 mg/250, vaso 100 UI/250, dobuta 250/250, dopa 200/250, nipride 50/250, NTG 25/250, milrinona 20/250) | — | Padrão da farmácia; sem fonte externa aplicável | INST. (AUDITORIA [V]3) | Mantido; editável no aparelho |

Publicações 2020–2026 consultadas (PubMed): SSC 2021 (acima); estudos de "high-dose norepinephrine" 2022–2026 (PMIDs 36619630, 40981486, 41065297, 42277846) usam a nora alta como critério de inclusão, sem redefinir faixa de dose — não alteram os números do app.

---

## 3.2 Sedação e analgesia contínua (`sedacao.calc.ts`)

Fontes primárias: SCCM PAD 2013 — Barr J et al. Crit Care Med 2013;41:263–306, PMID 23269131, DOI 10.1097/CCM.0b013e3182783b72 (tabelas 3 e 6; o texto completo não está no PMC — conferência das tabelas conforme AUDITORIA §3, não repetida aqui); SCCM PADIS 2018 — Devlin JW et al. Crit Care Med 2018;46:e825–e873, PMID 30113379, DOI 10.1097/CCM.0000000000003299 (não traz tabela de doses; mantém a conduta: analgesia primeiro, sedação leve, propofol/dexmedetomidina em vez de benzodiazepínico); bulas FDA/DailyMed [reg.].

| Item | Valor no app | Fonte | Resultado | Ação |
|---|---|---|---|---|
| Propofol — manutenção | 5–50 mcg/kg/min (0,3–3 mg/kg/h); 10 mg/mL | Bula Diprivan (Fresenius) [reg.] setid e3105799-a4b6-f3f4-e6e2-b2b29bbdb538 §2.6: iniciar 5 mcg/kg/min, incrementos 5–10, "5 mcg/kg/min to 50 mcg/kg/min (0.3 to 3 mg/kg/hour)"; PAD 2013 tab. 6 idem. | CONFERE | — |
| Propofol — teto/PRIS | banda `crit` > 4 mg/kg/h; alerta "PRIS acima de 4 mg/kg/h por > 48 h" | Bula Diprivan §2.6: "should not exceed 4 mg/kg/hour unless the benefits outweigh the risks"; §5.9 (PRIS): fator de risco "> 5 mg/kg/hour for > 48 hours". Cremer OL et al. Lancet 2001;357:117–8, PMID 11197401 (OR 1,93 por mg/kg/h acima de 5). Krajčová A et al. Crit Care 2015;19:398, PMID 26558513, DOI 10.1186/s13054-015-1112-5: PRIS ocorre também < 4 mg/kg/h. Hemphill S et al. Br J Anaesth 2019;122:448–59, PMID 30857601. | INST. — o corte 4 mg/kg/h é o teto posológico da bula; o limiar de PRIS da bula é 5. O app é mais conservador e a literatura (Krajčová) sustenta que não há limiar seguro. | Mantido; fontes no `<Ref>`. Sugestão (não aplicada): texto do alerta poderia dizer "teto da bula 4 mg/kg/h; PRIS descrita com > 5 mg/kg/h por > 48 h e com doses menores" |
| Midazolam | 0,02–0,1 mg/kg/h; 1 mg/mL | Bula midazolam em NaCl (Fresenius) [reg.] setid c8f51630-e776-4bc6-ba4d-b714e8c3b8f2: "0.02 mg/kg/hr to 0.10 mg/kg/hr (1 mg/hr to 7 mg/hr)"; PAD 2013 idem. | CONFERE | — |
| Dexmedetomidina — faixa | 0,2–0,7 mcg/kg/h (ok); 0,7–1,5 `warn` "descrito até 1,5"; > 1,5 `crit` | Bula Precedex (Hospira) [reg.] setid 92b7ddaa-e45a-4b64-a802-bb5df8771dd6: ataque 1 mcg/kg/10 min, manutenção 0,2–0,7 mcg/kg/h, ≤ 24 h; 1,5 só na dose pediátrica procedural. Até 1,5 mcg/kg/h em UTI adulto: SPICE III — Shehabi Y et al. N Engl J Med 2019;380:2506–17, PMID 31112380, DOI 10.1056/NEJMoa1904710; MENDS2 — Hughes CG et al. N Engl J Med 2021;384:1424–36, PMID 33528922, DOI 10.1056/NEJMoa2024922 (texto completo: protocolo 0,15–1,5 mcg/kg/h; FDA IND para > 24 h e até 1,5). | CONFERE (faixa de bula = ok; 0,7–1,5 sinalizado como fora de bula, sustentado por 2 RCT ≥ 2019) | — |
| Dexmedetomidina — nota | "Não deprime o drive respiratório; monitorar bradicardia e hipotensão" | Bula Precedex §5 (bradicardia, hipotensão). | CONFERE | — |
| Cetamina | analgésica 0,1–0,5 mg/kg/h; sedativa 0,5–2; > 2 `crit`; nota "não constam no PAD 2013" | Sem bula FDA para infusão em UTI. PAD 2013 tab. 3 (analgésicos) — segundo minha leitura anterior, inclui cetamina (ataque 0,1–0,5 mg/kg; 0,05–0,4 mg/kg/h); **não pude confirmar no texto** (não disponível no PMC). | SEM FONTE PRIMÁRIA (faixas de uso corrente) | Mantido; **item em aberto 1** (verificar a tabela 3 do PAD 2013 e corrigir a nota se a cetamina constar) |
| Fentanil | 0,7–10 mcg/kg/h; bolus 0,35–0,5 mcg/kg a cada 0,5–1 h | PAD 2013 tab. 3 (AUDITORIA §3). Bula de fentanil não traz posologia de infusão em UTI. | CONFERE (PAD) | — |
| Morfina | 2–30 mg/h; bolus 2–4 mg a cada 1–2 h; sem peso | PAD 2013 tab. 3 (AUDITORIA §3). | CONFERE (PAD) | — |
| Sufentanil | 0,1–0,5 mcg/kg/h; "5–10× fentanil"; "não consta no PAD" | Sem bula FDA para UTI; não consta no PAD 2013/PADIS 2018. Potência vs. fentanil: 7,5× em infusão (Reynolds L et al. Pain 2004;110:182–8, PMID 15275766), 5,9× peridural (Capogna G et al. Anesth Analg 2003;96:1178, PMID 12651680), 1:5 em PCA IV (Oh SK et al. Int J Med Sci 2019;16:1439, PMID 31673234). | SEM FONTE PRIMÁRIA para a faixa; nota "5–10×" CONFERE com a literatura | Mantido |
| Remifentanil | 0,5–15 mcg/kg/h (0,0083–0,25 mcg/kg/min); ataque opcional 1,5 mcg/kg | PAD 2013 tab. 3 (AUDITORIA §3). | CONFERE (PAD) | — |
| Rocurônio | infusão 0,3–0,6 mg/kg/h (= 5–10 mcg/kg/min); intubação 0,6–1,2 mg/kg | Bula rocurônio (Baxter) [reg.] setid a18fce42-0f3d-4354-845e-57c37ac3a147: intubação 0,6 (0,45–1,2 em SRI); infusão inicial 10–12 mcg/kg/min, ensaios 4–16 mcg/kg/min (= 0,24–0,96 mg/kg/h); sem posologia de UTI. SCCM 2016 — Murray MJ et al. Crit Care Med 2016;44:2079–2103, PMID 27755068 — titular pelo TOF, sem faixa numérica. | INST. — dentro da faixa dos ensaios da bula; intubação CONFERE | Mantido |
| Cisatracúrio | 0,5–10 mcg/kg/min | Bula cisatracúrio (Hospira) [reg.] setid 67908e20-044d-454d-9c51-bf106e817bd0 §2.5 (UTI): inicial 3 mcg/kg/min, faixa 0,5–10,2. | CONFERE (10 vs 10,2 — arredondamento) | — |
| Vecurônio | 0,05–0,1 mg/kg/h (= 0,8–1,7 mcg/kg/min); sem diluição padrão | Bula vecurônio (Sun) [reg.] setid a14da3ee-a731-4282-be9d-407473517470: infusão 1 mcg/kg/min, média 0,8–1,2 (= 0,048–0,072 mg/kg/h); UTI "not studied sufficiently". SCCM 2002 — Murray MJ et al. Crit Care Med 2002;30:142–56, PMID 11902255 (faixa de UTI 0,8–1,7 mcg/kg/min, conforme AUDITORIA [V]2). | INST. — teto 0,1 mg/kg/h acima da média da bula (anestesia), igual à diretriz SCCM 2002 | Mantido; titular pelo TOF |
| Notas de categoria (PRIS; analgesia primeiro; BNM com RASS −4/−5 e TOF 1–2/4) | — | PADIS 2018 (analgesia primeiro, sedação leve); Murray 2016 (sedação profunda antes do BNM; TOF como parte de avaliação clínica). | CONFERE | — |

---

## 3.3 Escalas (`rass.calc.ts`, `bps.calc.ts`)

| Item | Valor no app | Fonte | Resultado | Ação |
|---|---|---|---|---|
| RASS — 10 níveis e descritores | +4 combativo … −5 não desperta; −1 contato visual ≥ 10 s; −2 < 10 s; −3 movimento/abertura ocular sem contato visual; −4 resposta só ao estímulo físico; −5 sem resposta | Sessler CN et al. Am J Respir Crit Care Med 2002;166:1338–44, PMID 12421743, DOI 10.1164/rccm.2107138 (tabela 1 da escala). | CONFERE (tradução fiel) | `<Ref>` acrescentado |
| RASS — meta | "sedação leve, RASS −2 a 0; PADIS 2018 aceita até +1" | PADIS 2018 define sedação leve como RASS −2 a +1 (Devlin 2018, PMID 30113379); PAD 2013 recomenda sedação leve sem fixar número. | CONFERE (meta institucional −2 a 0 mais estreita, dentro da diretriz) | — |
| RASS — condutas por nível (SAT diário, dexmedetomidina na agitação, indicações de sedação profunda) | textos | PADIS 2018 (SAT/SBT; dexmedetomidina em agitação que impede extubação); Murray 2016 (BNM). | CONFERE em conteúdo | — |
| BPS — 3 domínios × 4 níveis | face: relaxada / parcialmente tensa (franze a testa) / totalmente tensa (fecha os olhos) / careta; MMSS: sem movimento / parcialmente fletidos / totalmente fletidos com flexão dos dedos / retraídos; VM: tolera / tosse mas tolera / briga / impossível ventilar | Payen JF et al. Crit Care Med 2001;29:2258–63, PMID 11801819, DOI 10.1097/00003246-200112000-00004 (tabela 1). | CONFERE | `<Ref>` acrescentado |
| BPS — corte | > 5 = dor significativa (≤ 5 controlada); ≥ 8 só acrescenta "reavaliar logo após" sem classe própria | PAD 2013 (texto: "BPS > 5 … significant pain"); PADIS 2018 recomenda BPS/CPOT nos incapazes de se comunicar. Payen 2001 não fixa corte (estudo de validação). | CONFERE (corte vem da diretriz, não do artigo original — registrado no `<Ref>`) | — |

## 3.4 Equivalência de opioides (`opioide.calc.ts`)

Fonte para fatores orais: CDC 2022 — Dowell D et al. MMWR Recomm Rep 2022;71(RR-3):1–95, PMID 36327391, DOI 10.15585/mmwr.rr7103a1. Tabela de fatores MME lida no texto completo (cdc.gov/mmwr): codeína 0,15 · fentanil transdérmico 2,4/mcg/h · hidrocodona 1 · hidromorfona 5 · metadona 4,7 · morfina 1 · oxicodona 1,5 · oximorfona 3 · tapentadol 0,4 · tramadol 0,2. A tabela **não inclui fentanil IV, sufentanil, remifentanil nem a razão morfina VO:IV**; a nota do CDC diz que os fatores não devem ser usados para converter entre opioides — o app já avisa "reduzir 25–50%".

| Item | Valor no app | Fonte | Resultado | Ação |
|---|---|---|---|---|
| Codeína VO → morfina VO | × 0,15 | CDC 2022 tabela MME: 0,15 | CONFERE | `<Ref>` |
| Tramadol VO → morfina VO | × 0,2 | CDC 2022: 0,2 | CONFERE | — |
| Morfina VO : IV | 3 : 1 | PAD 2013 tab. 3 (morfina IV 10 mg ≈ VO 30 mg, uso consagrado); não consta no CDC 2022. | SEM FONTE PRIMÁRIA única (consenso) | Mantido |
| Fentanil IV ↔ morfina IV | 100 mcg ≈ 10 mg (1:100) | PAD 2013 tab. 3 (equianalgesia fentanil 100× morfina); tabelas equianalgésicas variam 1:100 a 1:150 (o app avisa "10–15 mcg"). | SEM FONTE PRIMÁRIA única; INST. (AUDITORIA §5 já escolheu 1:100) | Mantido |
| Sufentanil IV | 10× fentanil (1 mcg ≈ 1 mg morfina IV) | Reynolds 2004 (PMID 15275766): 7,5× em infusão contínua; Oh 2019: 5×; Capogna 2003: 5,9×. O app informa "5–10× o fentanil". | INST. — 10× é o extremo superior; o estudo de infusão sugere 7,5× (1 mcg sufentanil ≈ 7,5 mcg fentanil ≈ 0,75 mg morfina IV); com 10× o app **subestima** a dose equivalente de sufentanil ao converter *para* ele (conservador) e **superestima** ao converter *dele* para outros opioides (dose 33% maior que por 7,5×) | Mantido como decisão institucional; **item em aberto 2** — avaliar adotar 7,5× (Reynolds 2004) ou exibir intervalo |
| Remifentanil IV | ≈ fentanil, mcg a mcg | Uso consagrado; sem fonte primária de equianalgesia em UTI. | SEM FONTE PRIMÁRIA | Mantido |
| Tetos exibidos | tramadol 400 mg/dia; codeína 360 mg/dia | Bulas (Ultram: 400 mg/dia; codeína: 360 mg/dia) [reg.] | CONFERE (reg.) | — |
| Oxicodona, metadona, hidromorfona, fentanil transdérmico | **não existem no app** | CDC 2022: 1,5 · 4,7 · 5 · 2,4/mcg/h | — | **Item em aberto 3** (se forem acrescentados, usar os fatores acima; metadona só com cautela — nota do CDC) |

## 3.5 Lidocaína (`lidocaina.calc.ts`)

| Item | Valor no app | Fonte | Resultado | Ação |
|---|---|---|---|---|
| Bolus PCR 1ª dose | 1–1,5 mg/kg | AHA 2025 Part 9 — Wigginton JG et al. Circulation 2025;152(Suppl 2), PMID 41122884, DOI 10.1161/CIR.0000000000001376; AHA 2020 Part 3 — Panchal AR et al. Circulation 2020;142(Suppl 2):S366–S468, PMID 33081529; bula lidocaína em glicose (Baxter) [reg.] setid f21512ea-c7c3-4766-b976-b2c0b5616bf0: "1.0 to 1.5 mg/kg". | CONFERE | `<Ref>` |
| 2ª dose | 0,5–0,75 mg/kg | AHA 2020/2025 (PESQUISA-ACLS.md). | CONFERE | — |
| Intervalo 5–10 min; máximo 3 mg/kg | "a cada 5–10 min; máx. 3 mg/kg" | AHA 2010 — Neumar RW et al. Circulation 2010;122(Suppl 3):S729–S767, PMID 20956224 (0,5–0,75 mg/kg a cada 5–10 min, máximo 3 mg/kg). **Não constam** em AHA 2020/2025 (PESQUISA-ACLS.md) nem na bula (sem teto). | SEM FONTE PRIMÁRIA ATUAL (fonte histórica AHA 2010) | Mantido como limite de segurança; declarado no `<Ref>` |
| Momento na PCR | após o 3º choque (epinefrina após o 2º) | AHA 2020/2025 algoritmo (caixa 8) — PESQUISA-ACLS.md. | CONFERE | — |
| Infusão | 1–4 mg/min; 2 g/500 mL; alt. mcg/kg/min; > 4 `crit` | Bula Baxter: "1 to 4 mg/min (0.020 to 0.050 mg/kg/min)"; ACC/AHA/HRS 2017 — Al-Khatib SM et al. J Am Coll Cardiol 2018;72:e91–e220, PMID 29097296. | CONFERE | — |
| Nível sérico | alvo 1,5–5 mcg/mL; tóxico > 5–6 | Bula Baxter: toxicidade do SNC com níveis > 6 mcg/mL; não define alvo. | Parcial — tóxico CONFERE; alvo SEM FONTE PRIMÁRIA atual | Mantido |
| ICC/hepatopatia/idoso ≤ 1 mg/min (~50%) | — | Bula: reduzir ~50% após 24 h; menor taxa em hepatopatia e TFG < 30; idoso "low end". ICC não citada nesta bula. | Parcial (INST.) | Mantido |
| "Atraso > 15 min entre bolus e infusão → repetir 0,5 mg/kg" | — | Bula Baxter (seção pediátrica): repetir o bolus se a infusão não começar em 15 min. | Parcial — princípio CONFERE; a dose de 0,5 mg/kg é extrapolação | Mantido; **item em aberto 4** |
| TV monomórfica estável: bolus 1 mg/kg → 1–4 mg/min | — | Al-Khatib 2017 (lidocaína como alternativa; a tabela de fármacos do documento não foi acessível no PMC). | SEM FONTE PRIMÁRIA verificada para "1 mg/kg" (literatura usa 1–1,5) | Mantido; **item em aberto 5** |
| Amiodarona ou lidocaína na FV/TV refratária | nota | AHA 2018 focused update — Panchal AR et al. Circulation 2018;138:e740–e749, PMID 30571262, DOI 10.1161/CIR.0000000000000613. | CONFERE | `<Ref>` |

## 3.6 Delirium — antipsicóticos (`delirium.tsx`)

Observação: a ferramenta é uma referência estática de haloperidol/quetiapina; **não contém o CAM-ICU** (apenas a citação de Ely 2001 foi acrescentada no rodapé como fonte diagnóstica).

| Item | Valor no app | Fonte | Resultado | Ação |
|---|---|---|---|---|
| Recomendação geral | "PADIS 2018: evidência insuficiente para antipsicótico de rotina; priorizar medidas não farmacológicas" | Devlin JW et al. PADIS 2018, PMID 30113379 (sugere contra haloperidol/antipsicótico atípico de rotina para tratar delirium). RCTs negativos: MIND-USA — Girard TD et al. N Engl J Med 2018;379:2506–16, PMID 30346242, DOI 10.1056/NEJMoa1808217 (haloperidol máx. 20 mg/dia); AID-ICU — Andersen-Ranberg NC et al. N Engl J Med 2022;387:2425–35, PMID 36286254, DOI 10.1056/NEJMoa2211868 (2,5 mg IV 3×/dia + resgate, máx. 20 mg/dia). | CONFERE | `<Ref>` |
| Haloperidol IV agudo | 2,5–5 mg, repetir a cada 20–30 min | Jacobi J et al. SCCM 2002. Crit Care Med 2002;30:119–41, PMID 11902253 (resumo indisponível; posologia da diretriz 2002, não reproduzida no PADIS). AID-ICU usou 2,5 mg/dose. | SEM FONTE PRIMÁRIA atual; coerente com a dose unitária do AID-ICU | Mantido; **item em aberto 6**: o app não exibe teto diário (20 mg/dia nos dois RCT) |
| Haloperidol manutenção VO | 0,5–2 mg 8/8–12/12 h | Uso corrente; sem fonte primária. | SEM FONTE PRIMÁRIA | Mantido |
| Haloperidol infusão | 3–25 mg/h "refratário, com QTc" | Riker RR et al. Crit Care Med 1994;22:433–40, PMID 8124994, DOI 10.1097/00003246-199403000-00013 — série de **8 casos** (3–25 mg/h), com TV e BAV relatados. | CONFERE com a fonte, mas evidência muito fraca | Mantido; nível de evidência declarado no `<Ref>` |
| Contraindicações / monitorização | QTc > 500; Parkinson; Lewy; ECG antes e 1 h após | Bula haloperidol [reg.] (QT/torsades) e PADIS 2018. | CONFERE em conteúdo | — |
| Quetiapina | 12,5–50 mg 12/12 h → até 100–200 mg 12/12 h; sem forma IV | Devlin JW et al. Crit Care Med 2010;38:419–27, PMID 19915454, DOI 10.1097/CCM.0b013e3181b9e302 (50 mg 12/12 h, +50 mg/dia até 200 mg 12/12 h). Meta-análise 2026 (de Oliveira et al. Gen Hosp Psychiatry 2026, PMID 42365709) não altera a posologia. | CONFERE (12,5 mg inicial = ajuste conservador para idoso) | `<Ref>` |

## 3.7 Aritmética de infusão (`infusion.ts`, `infMath.ts`)

| Item | Valor no app | Verificação | Resultado |
|---|---|---|---|
| Base interna | mcg/min (massa) ou UI/min; `BASE = {mcg 1, mg 1000, g 1e6, UI 1, mUI 0,001}` | Conferido à mão: nora 64 mcg/mL × 10 mL/h ÷ 60 ÷ 70 = 0,15238 mcg/kg/min; propofol 10 mg/mL × 30 mL/h = 300 mg/h = 4,286 mg/kg/h = 71,43 mcg/kg/min; vasopressina 0,4 UI/mL × 6 mL/h = 0,04 UI/min. Testes `infMath.test.ts` (16) e `infusion.test.ts` (9) cobrem ida e volta em 8 unidades. | CONFERE |
| `parseUnit` | 3 segmentos = por kg; último segmento = tempo (`min`/`h`) | Unidades usadas no app: mcg/kg/min, mcg/kg/h, mg/kg/h, mg/h, mcg/min, mcg/h, mg/min, UI/min, UI/h. Todas com 2 ou 3 segmentos — sem ambiguidade. | CONFERE |
| Comparação de faixa | arredondamento a 9 casas (`r9`) antes do `band`/`rangeTag` | Evita 0,04 UI/min "acima da faixa" (AUDITORIA §1). Testado. | CONFERE |
| Peso ausente | dose/kg sem peso → `missing: 'peso'`; unidades sem kg ignoram peso | Testado (morfina, NTG, lidocaína). | CONFERE |

---

## Correções aplicadas (antes → depois, fonte)

1. **`dva.calc.ts` — alerta da noradrenalina.** Antes: um único alerta `warn` acima de 1 mcg/kg/min ("rever estratégia vasopressora ou associar vasopressina"). Depois: alerta `info` a partir de **0,25 mcg/kg/min** ("SSC 2021 sugere associar vasopressina — habitual entre 0,25 e 0,5 — em vez de escalar a dose") mantido o `warn` acima de 1 (agora rotulado "alta dose"). Fonte: Evans L et al. SSC 2021, Crit Care Med 2021;49:e1063, PMID 34605781, rec. 38 e texto ("vasopressin is usually started when the dose of norepinephrine is in the range of 0.25–0.5 μg/kg/min"); alta dose > 1: Auchet 2017, PMID 28425079. Motivo: o aviso de vasopressina surgia 2–4× acima do gatilho da diretriz e contradizia a ferramenta de sepse do próprio app (AUDITORIA §7). Nenhuma faixa numérica de dose foi alterada.
2. **`infusion.test.ts`** — teste "nora > 1 gera alerta" substituído por teste de 3 patamares (0,2 → nenhum; 0,25 → `info`; 1 → 1 alerta; 1,5 → `info` + `warn`).
3. **Rodapés `<Ref>` acrescentados** em `rass.tsx`, `bps.tsx`, `opioide.tsx`, `lidocaina.tsx`, `delirium.tsx` (antes sem citação) e **ampliados** em `dva.tsx` ("bula/UpToDate" → bulas DailyMed nomeadas + SSC 2021 + Bellomo 2000) e `sedacao.tsx` (PAD 2013 com PMID/DOI + PADIS 2018 + bulas + SPICE III/MENDS2 + PRIS + BNM). Nenhum texto clínico ou layout alterado além do rodapé.
4. Comentários de fonte no cabeçalho de `dva.calc.ts`.

## Decisões institucionais (não alteradas)

1. Vasopressina teto 0,04 UI/min (bula até 0,07; SSC fixa 0,03; ensaios até 0,06).
2. Dopamina: bandas da bula Baxter (0,5–2 / 2–10 / 10–20 / > 20) vs. bula Hospira (< 5 / 5–10 / > 10).
3. Noradrenalina 0,01–3 mcg/kg/min e nitroglicerina "habitual até 200 mcg/min": faixas de uso corrente sem fonte primária que as fixe.
4. Propofol: `crit` e alerta de PRIS em 4 mg/kg/h (teto posológico da bula) em vez de 5 mg/kg/h (limiar de PRIS da bula) — mais conservador, sustentado por Krajčová 2015.
5. Dexmedetomidina 0,7–1,5 mcg/kg/h como `warn` "descrito" (fora de bula; SPICE III/MENDS2).
6. BNM: rocurônio 0,3–0,6 mg/kg/h e vecurônio 0,05–0,1 mg/kg/h (SCCM 2002; bula sem posologia de UTI).
7. Sufentanil 10× fentanil (literatura 5–10×; infusão 7,5×).
8. Fentanil IV 1:100 com morfina IV (tabelas 1:100–1:150).
9. Lidocaína: intervalo 5–10 min e máximo 3 mg/kg (AHA 2010, ausentes em 2020/2025) mantidos como limite de segurança; alvo sérico 1,5–5 mcg/mL.

## Itens em aberto

1. Confirmar na tabela 3 do PAD 2013 (texto completo, fora do PMC) se a cetamina consta (ataque 0,1–0,5 mg/kg; 0,05–0,4 mg/kg/h); se sim, corrigir a nota "não constam no PAD 2013" em `sedacao.calc.ts`.
2. Sufentanil: avaliar 7,5× (Reynolds 2004) em vez de 10×, ou exibir intervalo 5–10× no resultado.
3. Opioides ausentes (oxicodona 1,5; metadona 4,7; hidromorfona 5; fentanil transdérmico 2,4/mcg/h — CDC 2022) se a ferramenta for ampliada.
4. Lidocaína "atraso > 15 min → repetir 0,5 mg/kg": a bula fala em repetir o bolus (1 mg/kg, seção pediátrica); fonte da dose de 0,5 mg/kg não localizada.
5. Lidocaína na TV estável "1 mg/kg": conferir a tabela de fármacos do ACC/AHA/HRS 2017 (texto completo não acessível).
6. Delirium: considerar exibir o teto de haloperidol 20 mg/dia (MIND-USA, AID-ICU) e o número de casos (8) por trás da infusão 3–25 mg/h.

## Verificação

- `cmd /c "npx.cmd tsc --noEmit"` → sem erros (exit 0).
- `cmd /c "npx.cmd vitest run src/tools/hemo src/tools/sed src/tools/infusion.test.ts src/lib/core/infMath.test.ts"` → 7 arquivos, **74 testes, todos passando** (vitest 5.0.3).
- Nenhum commit realizado. Arquivos alterados por esta auditoria: `web/src/tools/hemo/dva.calc.ts`, `dva.tsx`, `web/src/tools/infusion.test.ts`, `web/src/tools/sed/sedacao.tsx`, `rass.tsx`, `bps.tsx`, `opioide.tsx`, `lidocaina.tsx`, `delirium.tsx`. (Outros arquivos modificados no `git status` — `renal.ts`, `engine.*`, `delta/*` — pertencem a outras frentes da auditoria.)
