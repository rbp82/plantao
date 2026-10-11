# Auditoria 6c — Revisão cruzada com guias hospitalares: eletrólitos, insulina e condutas metabólicas

Data: 11/10/2026 · App: `web/src/tools/met/sodio.calc.ts` + `sodio.tsx`, `web/src/tools/met/cad.calc.ts` + `cad.tsx`; protocolo de exemplo `protocolos/metabolico/hipercalemia.md`. Complementa [5-cad-sodio-teg-acls.md](5-cad-sodio-teg-acls.md) (fontes primárias) — aqui só preparo, concentração, velocidade, via e alertas de segurança.

## Método

Fontes: monografias públicas baixadas em texto limpo em 11/10/2026 (sem acesso à internet durante a revisão):

| Guia | Monografia | Atualizada em |
|---|---|---|
| HSL — Guia Farmacêutico do Hospital Sírio-Libanês | Cloreto de sódio (**só a apresentação nasal** Rinosoro 0,9 %/3 %) | 27/02/2017 |
| HSL | Cloreto de potássio – KCl injetável 19,1 % (inclui "Tratamento de hipercalemia") | 16/04/2026 |
| HSL | Bicarbonato de sódio 8,4 % | 25/07/2018 |
| HSL | Insulina regular humana | 27/01/2026 |
| HSL | Gluconato de cálcio 10 % | 02/09/2025 |
| HIAE — Manual Farmacêutico do Hospital Israelita Albert Einstein | Cloreto de sódio: 0,9 % (Id 224, 24/12/2025), **20 % injetável (Id 225, 24/08/2024)**, nasal (Id 226), 20 % oral (Id 1052) | ver Id |
| HIAE | Cloreto de potássio 19,1 % injetável (Id 220, 24/08/2024); xarope, drágea, cápsula, envelope HD | 24/08/2024 |
| HIAE | Bicarbonato de sódio 8,4 % (Id 114, 25/06/2021); pó (Id 115); cardioplégica (Id 116) | 25/06/2021 |
| HIAE | Insulina humana regular (Id 461, 16/02/2026); glargina, NPH, lispro, degludeca, glulisina | 16/02/2026 |
| HIAE | Gluconato de cálcio | **não baixada** (a lista do manual tem "GLICONATO DE CÁLCIO", Id 405, mas a monografia não estava no conjunto) |
| ambos | Glicose, desmopressina, salbutamol | **não baixadas** (HIAE lista Ids 403/404/406, 252/253/931, 703; HSL não baixado) |

Para cada item do app transcreveu-se o valor, comparou-se com os dois guias e classificou-se: **CONFERE** · **DIVERGE DO APP** · **APP MAIS RESTRITIVO** · **INFORMAÇÃO AUSENTE NO APP** · **GUIAS DIVERGEM ENTRE SI** · **AUSENTE NOS GUIAS** (dado que o guia não traz) · **NÃO COMPARADO** (monografia não disponível).

Regras aplicadas: nenhuma fórmula ou dose das fontes primárias (ESE 2014/Verbalis 2013; consenso ADA/EASD 2024) foi alterada; o teto institucional de correção do Na⁺ (10 mEq/L/24 h, 8 em alto risco) não mudou. Limites de **preparo e segurança** (concentração máxima, velocidade máxima, "sempre diluído", via central acima de X, incompatibilidade) foram acrescentados como nota `warn` quando (a) os dois guias concordam, ou (b) um guia fixa o limite e o outro é omisso — nunca para afrouxar; cada nota cita guia + data na tela e em comentário no código, e tem teste. Onde os guias divergem entre si, a tela mostra os dois valores rotulados e remete à padronização da farmácia. Itens de dose em que um guia diverge da fonte primária (insulina 0,14 U/kg/h no HSL) foram registrados, não adotados.

## Tabela por item

### Sódio — NaCl 3 % e desmopressina (`sodio.calc.ts`)

| Item | Plantão | HSL | Einstein | Resultado | Ação |
|---|---|---|---|---|---|
| Concentração do NaCl 3 % | 513 mEq/L (30 g/L ÷ 58,44) | monografia injetável inexistente (só nasal) | NaCl 20 % = 3,42 mEq/mL (= 200 mg/mL ÷ 58,44 ✓, mesma aritmética) | CONFERE (aritmética coerente com o HIAE); HSL AUSENTE | — |
| Preparo do NaCl 3 % a partir do 20 % + SF/água | não constava | não traz | não traz (só "obrigatório diluir antes da administração") | INFORMAÇÃO AUSENTE NO APP **e** AUSENTE NOS GUIAS | nota de preparo: ampola 10 mL = 34,2 mEq; alta vigilância; diluição obrigatória; "conforme a padronização da farmácia" (HIAE 24/08/2024). Receita não inventada — ver Lacunas |
| Alertas do hipertônico | nenhum | — | MAVi; "administrar lentamente para evitar transvasamento da veia"; CI: ICC, IR grave, anúria, edema; monitorar Na⁺, K⁺, HCO₃⁻ | INFORMAÇÃO AUSENTE NO APP | nota `warn` (alta vigilância, veia calibrosa, evitar extravasamento) só quando NaCl 3 % é indicado |
| Bolus 150 mL em 20 min, até 3×, meta +5 | ESE 2014 | não traz | não traz (dose "de acordo com a necessidade") | AUSENTE NOS GUIAS | mantido (fonte primária) |
| Velocidade de manutenção (mL/h) e teto 10/8 mEq/L/24 h | balanço de massa; decisão institucional | não traz | não traz | AUSENTE NOS GUIAS | mantido |
| Desmopressina 2–4 µg IV (supercorreção); 1–4 µg IV/SC (DI central) | Verbalis 2013 / sem fonte primária | monografia não baixada | monografia não baixada (Ids 252/253/931) | NÃO COMPARADO | — (lacuna) |

### Cetoacidose diabética — cloreto de potássio (`cad.calc.ts`, bloco Potássio)

| Item | Plantão | HSL (16/04/2026) | Einstein (24/08/2024) | Resultado | Ação |
|---|---|---|---|---|---|
| Apresentação | não constava | KCl 19,1 % = 2,56 mEq/mL (ampola 10 mL); bolsas prontas 25,6 mEq/500 mL, 25,6 mEq/100 mL e 51,2 mEq/120 mL (CVC/PICC) | KCl 19,1 % (2,56 mEq/mL) ampola 10 mL; MAVi | INFORMAÇÃO AUSENTE NO APP | nota: 2,56 mEq/mL; ampola = 25,6 mEq; 20–30 mmol ≈ 8–12 mL por litro |
| Diluição obrigatória / bolus | não constava | "SOMENTE DEVE SER ADMINISTRADO APÓS DILUIÇÃO"; diluir em SF, SG 5 % ou RL (evitar SG 5 % na hipocalemia grave) | assistolia/FV "com administração rápida" | INFORMAÇÃO AUSENTE NO APP (guias concordam) | nota "sempre diluído, nunca em bolus" |
| Concentração máxima periférica | não constava | 10 mEq/100 mL (padrão HSL 25,6 mEq/500 mL) | não fixa ("concentração apropriada") | INFORMAÇÃO AUSENTE NO APP (HSL; HIAE omisso) | nota: periférico ≤ 10 mEq/100 mL |
| Concentração máxima central | não constava | 20–40 mEq/100 mL | não fixa | idem | nota: acima do limite periférico só por acesso central |
| Velocidade máxima | 10 mmol/h (K < 3,5) · 20–30 mmol/L a 500–1000 mL/h (= 10–30 mmol/h) | periférico 10 mEq/h; central 40 mEq/h | urgência até 20 mEq/h (sem distinguir via) | GUIAS DIVERGEM ENTRE SI (40 vs 20 mEq/h); 10 mmol/h do consenso CONFERE nos dois; 20–30 mmol/L a 1 L/h pode passar de 10 mEq/h | nota: > 10 mEq/h só por via central com monitor contínuo; "HSL até 40 mEq/h; HIAE até 20 mEq/h" |
| Monitorização | K⁺ 2 h após a insulina e a cada 4 h (consenso 2024); diurese ≥ 50 mL/h | monitorização cardíaca (pediatria explícita); função renal; digitalizados | eletrólitos, função renal, **monitorização cardíaca**, local de infusão | CONFERE + INFORMAÇÃO AUSENTE (monitor) | nota inclui monitorização cardíaca contínua |
| Vesicante / flebite | não constava | "Medicamento vesicante"; diretriz irritante/vesicante | flebite, ardor, trombose no local | INFORMAÇÃO AUSENTE NO APP (guias concordam) | nota "vesicante" |
| Insuficiência renal | repor só com diurese ≥ 50 mL/h | "utilizar com cautela" | "contraindicado em insuficiência renal" | APP coerente (gate de diurese) | — |
| Quanto sobe o K⁺ | não constava | 20 mEq → +0,25 mEq/L | não traz | AUSENTE NO APP (um guia) | não adicionado (regra de dose, não de segurança) |
| Dose de hipocalemia grave | 10 mmol/h até > 3,5 (consenso 2024) | só pediatria (0,5–0,75 mEq/kg em 1–2 h) | 10–15 mEq 3–4×/dia; urgência 400 mEq/dia | não comparável (indicação diferente) | mantido |

### Cetoacidose diabética — bicarbonato de sódio 8,4 % (bloco Bicarbonato)

| Item | Plantão | HSL (25/07/2018) | Einstein (25/06/2021) | Resultado | Ação |
|---|---|---|---|---|---|
| Concentração | "100 mmol de NaHCO₃ 8,4 %" (sem mL) | 8,4 % = 1 mEq/mL (ampola 10 mL, frasco 250 mL) | 8,4 % = 1 mEq/mL (ampola 10 mL, frasco 250 mL) | CONFERE; mL AUSENTE NO APP | nota: 1 mEq/mL → 100 mmol = 100 mL |
| Indicação (pH < 7,0) e dose 100 mmol/400 mL a cada 2 h | consenso 2024 | acidose metabólica 2–5 mEq/kg em 4–8 h | fórmula 0,5 × peso × (24 − HCO₃⁻), metade inicial | não comparável (fórmulas gerais de acidose; nenhum guia trata de CAD) | mantido (fonte primária) |
| Diluição | 400 mL de água ("isotônico") | diluir em SF/SG 5 %; "concentração sugerida 15 mg/mL (isotônica)"; puro só em PCR | — (PCR por hipercalemia 50 mEq em 5 min) | CONFERE em diluir; **100 mL + 400 mL = 200 mEq/L (1,68 %) não é isotônico** (1,4 % = 167 mEq/L) — imprecisão herdada da ADA 2009/2024 | nota: 500 mL de água = 1,4 % (isotônico) como alternativa |
| Velocidade | "a cada 2 h" (sem tempo de infusão) | infusão 2–8 h; **máx. 1 mEq/kg/h**; EV direto lento 1 mEq/mL (adultos) | evitar 10 mL/min em < 2 anos | INFORMAÇÃO AUSENTE NO APP (HSL; HIAE omisso em adultos) | nota: infundir em ≥ max(2 h; 100 ÷ peso) h — p. ex. ≥ 2,5 h com 40 kg |
| Via periférica | não constava | vesicante; adulto em AVP só até 10 mL de 8,4 % por 50 mL de diluente (≈ 167 mEq/L); pediatria por CVC | extravasamento → celulite, úlcera, necrose | INFORMAÇÃO AUSENTE NO APP (guias concordam no risco); solução do consenso = 12,5 mL/50 mL → **excede o limite periférico do HSL** | nota: preferir acesso central ou 500 mL de água |
| Incompatibilidade | não constava | não traz | "evite catecolaminas no mesmo cateter — inativação" | INFORMAÇÃO AUSENTE NO APP (HIAE; HSL omisso) | nota: não infundir na mesma via de catecolaminas |
| Hipocalemia pelo bicarbonato | "dosar K⁺ a cada 2 h"; ADA 2009 + 20 mEq KCl | não traz | não traz | AUSENTE NOS GUIAS | mantido |

### Cetoacidose diabética — insulina regular EV (bloco Insulina)

| Item | Plantão | HSL (27/01/2026) | Einstein (16/02/2026) | Resultado | Ação |
|---|---|---|---|---|---|
| Dose na CAD (adulto) | 0,1 U/kg/h fixa; bolus 0,1 U/kg só se atraso no acesso; 0,05 U/kg/h abaixo de 250 mg/dL (consenso 2024) | "Infusão inicial de 0,14 U/kg/h; … ajustar para 0,02–0,05 U/kg/h; manter glicemia 150–200" (= ADA 2009 sem bolus); pediatria 0,1 U/kg/h, SG 5 % entre 250–300 | não traz dose de CAD ("dose individualizada") | **DIVERGE DO APP** (HSL repete a ADA 2009, substituída pelo consenso 2024 — PMID 39052901) | mantido o consenso 2024; registrado na tela ("não adotado") |
| Preparo — concentração | não constava | "diluir cada 100 UI em 100 mL de SF 0,9 %"; **concentração máxima 1 U/mL** | "diluir em solução fisiológica e administrar em bomba de infusão" (sem concentração) | INFORMAÇÃO AUSENTE NO APP (HSL fixa; HIAE compatível) | nota: 100 U/100 mL SF = 1 U/mL; U/h = mL/h (mostra X mL/h) |
| Preparo — adsorção ao plástico | não constava | "sem PVC (equipo e soro)" | "equipo convencional (com PVC), desprezar 20 mL da solução para saturar o equipo", purgar pela bomba | **GUIAS DIVERGEM ENTRE SI** (estratégias diferentes para o mesmo problema) | nota mostra as duas e remete à padronização da farmácia |
| Preparo — dupla checagem / alta vigilância | não constava | "ALTA VIGILÂNCIA" | MAVi; "preparada por 2 profissionais" | INFORMAÇÃO AUSENTE NO APP (guias concordam) | nota "alta vigilância, dupla checagem" |
| Estabilidade da solução | não constava | não traz (frasco em uso 28 dias) | 24 h após o preparo | INFORMAÇÃO AUSENTE NO APP (HIAE; HSL omisso) | nota "estável por 24 h" |
| Hipocalemia como contraindicação | K⁺ < 3,5 → insulina suspensa (consenso 2024) | contraindicação só "hipoglicemia, hipersensibilidade" | contraindicação só hipoglicemia/hipersensibilidade | APP MAIS RESTRITIVO (fonte primária); AUSENTE NOS GUIAS | mantido |
| Hipoglicemia | não trata (fora do escopo da calculadora) | < 70 mg/dL: G50 % 40 mL EV; glucagon 1 mg IM sem acesso; 15 g CHO acordado | monitorar glicemia capilar | AUSENTE NO APP (conduta de protocolo, não de cálculo) | não adicionado — ver Lacunas |
| Insulina SC em CAD leve/moderada | análogo rápido 0,3 → 0,2 U/kg (ADA 2009) | — | lispro: intervalo mínimo 2 h entre doses SC; regular: 4 h | compatível (app usa 2/2 h com análogo) | — |
| Glicose 5–10 % no SF ao atingir < 250 mg/dL | consenso 2024 | monografia de glicose não baixada | idem (Ids 403/404/406 não baixados) | NÃO COMPARADO | — |

### Protocolo de exemplo — hipercalemia (`protocolos/metabolico/hipercalemia.md`)

| Item | Protocolo | HSL | Einstein | Resultado | Ação |
|---|---|---|---|---|---|
| Gluconato de cálcio 10 % — dose | 10–30 mL IV em 5–10 min; repetir em 5 min se ECG persistir | monografia (02/09/2025): hipercalemia grave 1,5–3 g (15–30 mL) em 2–5 min; KCl (16/04/2026): 1 g (10 mL) em 2–3 min, repetir após 5 min se ECG persistir; ≤ 200 mg/min fora da emergência (10 mL em 5 min) | monografia não baixada | CONFERE (dose e repetição); APP MAIS RESTRITIVO na velocidade (5–10 min vs 2–5 min) | mantido |
| Gluconato — via e cuidados | não especifica | veia periférica de grande calibre aceitável; vesicante/irritante; diluir 10 mL em 100 mL fora da emergência; CI: FV, intoxicação digitálica, hipercalcemia; não com ceftriaxona em neonatos | — | INFORMAÇÃO AUSENTE NO PROTOCOLO (um guia) | não alterado (regra: só erros objetivos de dose/velocidade); registrado nas Referências |
| Insulina + glicose | 10 UI IV + glicose 25 g (50 mL a 50 %); glicemia 1/1 h por 4–6 h; se glicemia > 250, insulina sem glicose | KCl: bolus 10 UI + 50 mL G50 % **ou** 10 UI em 500 mL SG 10 % em 60 min; manter SG 10 % 50–75 mL/h contra hipoglicemia. Insulina: solução polarizante 10 UI em SG 10 % 500 mL ou em 100 mL G50 %, em 15–30 min | não traz | CONFERE | mantido; alternativa em SG 10 % citada nas Referências |
| Salbutamol 10–20 mg nebulização | Lindner 2020 | não baixado | não baixado (Id 703) | NÃO COMPARADO | — |
| Bicarbonato de sódio | **50–100 mEq IV "lento" se acidose** | hipercalemia: 50 mEq EV em 5 min | hipercalemia: 50 mEq IV em 5 min; PCR por hipercalemia 50 mEq em 5 min, pode repetir | **DIVERGE DO PROTOCOLO** (teto 100 e "lento" sem apoio nos guias, que concordam em 50 mEq/5 min) | corrigido: "50 mEq (50 mL) IV em 5 min se acidose metabólica; repetir conforme gasometria" |
| Furosemida, resinas, hemodiálise | 40–80 mg IV; conforme disponibilidade; HD | KCl: HD remove 25–50 mEq/h; resina 15 g VO 3×/dia ou 50 g retal (uma dose só não é efetiva) | — | compatível | mantido |

## Correções e acréscimos feitos (antes → depois · guia)

| Arquivo | Antes | Depois | Guia (data) |
|---|---|---|---|
| `sodio.calc.ts` (conduta com NaCl 3 %) | sem informação de preparo | nota `warn`: "Preparo (alta vigilância): NaCl 3 % (513 mEq/L) é preparado a partir de NaCl 20 % (ampola 10 mL = 34,2 mEq; 3,42 mEq/mL), obrigatoriamente diluído, conforme a padronização da farmácia; infundir em veia calibrosa para evitar extravasamento" — só quando a hipertônica é indicada | HIAE Cloreto de sódio 20 % (24/08/2024); HSL sem monografia injetável |
| `sodio.tsx` `<Ref>` | — | "Conferido com o Guia Farmacêutico do Hospital Sírio-Libanês e o Manual Farmacêutico do Hospital Israelita Albert Einstein (monografias públicas, 11/10/2026) …" | ambos |
| `sodio.test.ts` | — | teste: nota de preparo presente com sintomas graves, ausente com leves/moderados crônicos | — |
| `cad.calc.ts` bloco Potássio | 20–30 mmol/L · 10 mmol/h, sem limites de preparo | + nota `warn` (quando há reposição, K⁺ < 5,0): KCl 19,1 % 2,56 mEq/mL, ampola 25,6 mEq, 20–30 mmol ≈ 8–12 mL/L; alta vigilância, vesicante; sempre diluído, nunca em bolus; periférico ≤ 10 mEq/100 mL e ≤ 10 mEq/h; acima só central com monitor contínuo (HSL até 40 mEq/h; HIAE até 20 mEq/h) | HSL KCl (16/04/2026); HIAE KCl (24/08/2024) |
| `cad.calc.ts` bloco Insulina (EV) | "Infusão X U/h … (0,1 U/kg/h, taxa fixa)" | "… taxa fixa) — a 1 U/mL, X mL/h." + nota `warn` de preparo: 100 U em 100 mL SF 0,9 % (1 U/mL, concentração máxima), bomba, dupla checagem, estável 24 h; HSL sem PVC vs HIAE satura o equipo com 20 mL → padronização da farmácia | HSL Insulina regular (27/01/2026); HIAE Insulina regular (16/02/2026) |
| `cad.calc.ts` bloco Bicarbonato (pH < 7,0) | "100 mmol … em 400 mL de água, a cada 2 h" | + nota `warn`: 8,4 % = 1 mEq/mL (100 mmol = 100 mL); infundir em ≥ max(2; 100 ÷ peso) h (HSL 2–8 h, máx. 1 mEq/kg/h); vesicante — periférico ≤ 10 mL/50 mL de diluente, a solução de 400 mL (200 mEq/L) excede um pouco: acesso central ou 500 mL de água (1,4 %, isotônico); não na mesma via de catecolaminas | HSL Bicarbonato (25/07/2018); HIAE Bicarbonato (25/06/2021) |
| `cad.tsx` `<Ref>` | — | linha "Conferido com …" + registro de que o esquema 0,14 U/kg/h do HSL não foi adotado | ambos |
| `cad.test.ts` | — | 1 teste novo (18 asserções): mL/h a 1 U/mL, nota de preparo (ausente com K⁺ < 3,5 e via SC), nota de KCl (ausente com K⁺ ≥ 5,0), nota de bicarbonato com ≥ 2,0 h (70 kg) e ≥ 2,5 h (40 kg), resumo de prontuário inalterado | — |
| `hipercalemia.md` | "Bicarbonato de sódio · 50–100 mEq IV se acidose metabólica · lento / variável" | "Bicarbonato de sódio 8,4 % (1 mEq/mL) · 50 mEq (50 mL) IV em 5 min se acidose metabólica; repetir conforme gasometria"; `atualizado: 2026-10-11`; referências 3 (HSL) e 4 (HIAE) com datas e os números conferidos | HSL Bicarbonato (25/07/2018) e HIAE Bicarbonato (25/06/2021) — concordantes |

Não alterados (dose/fórmula das fontes primárias prevalece): 0,1 U/kg/h e demais limiares do consenso 2024; bolus 150 mL/20 min, metas e teto 10/8 do sódio; gluconato 10–30 mL em 5–10 min do protocolo (mais lento que o HSL — aceitável). Resumos de prontuário (`summary`) não mudaram. Nenhum outro arquivo foi tocado; sem commit.

## Decisões institucionais (registradas, não alteradas — confirmar)

1. **Insulina na CAD: 0,1 U/kg/h (consenso 2024) e não 0,14 U/kg/h sem bolus (Guia HSL 27/01/2026 = ADA 2009).** A fonte primária mais recente prevalece sobre o guia farmacêutico; a tela informa que o esquema do HSL não foi adotado.
2. **Adsorção da insulina ao plástico:** HSL exige soro e equipo sem PVC; HIAE usa equipo convencional e satura com 20 mL. O app mostra as duas opções e remete à padronização da farmácia — a instituição deve escolher uma e, se quiser, a tela pode passar a mostrar só a escolhida.
3. **Velocidade máxima de KCl:** HSL 10 mEq/h periférico / 40 mEq/h central; HIAE até 20 mEq/h. O app adotou o limite comum (≤ 10 mEq/h em veia periférica; acima só central com monitor) e cita os dois tetos. Isso significa que "20–30 mmol/L a 1000 mL/h" do consenso 2024 (até 30 mmol/h) exige acesso central — compatível com o consenso (que não fixa via).
4. **Bicarbonato na CAD:** mantida a solução do consenso (100 mmol em 400 mL de água); a nota indica que ela (200 mEq/L) excede o limite periférico do HSL (≤ 10 mL/50 mL ≈ 167 mEq/L) e oferece a alternativa de 500 mL de água (1,4 %, isotônico) ou acesso central. Decidir se a instituição padroniza 400 ou 500 mL.
5. **Teto de correção do sódio (10 mEq/L/24 h; 8 em alto risco)** e **bolus 150 mL/20 min**: nenhum guia trata — decisão de 11/10/2026 inalterada.
6. **Nota de NaCl 20 % no sódio** baseada só no HIAE (o HSL não publica monografia injetável): acrescentada por ser restritiva (alta vigilância, diluição obrigatória) e não contradizer nada; remover se a instituição preferir apenas itens com dois guias.
7. **Protocolo de hipercalemia:** bicarbonato passou de "50–100 mEq lento" para "50 mEq em 5 min" (os dois guias). Se a diretriz institucional preferir 100 mEq ou infusão lenta, reverter citando a fonte.

## Lacunas

- **Receita do NaCl 3 %** não consta em nenhum dos guias nem no app. Aritmética para a farmácia decidir (não está na tela): 150 mL de NaCl 3 % = 77 mEq → 22,5 mL de NaCl 20 % (3,42 mEq/mL) + água para injeção q.s.p. 150 mL; com SF 0,9 % (0,154 mEq/mL) como diluente, 16,5 mL de NaCl 20 % + 133,5 mL de SF. Para 500 mL: 75 mL de 20 % em água, ou 55 mL de 20 % + 445 mL de SF. Padronizar e só então colocar na tela.
- **Monografias não baixadas:** gluconato de cálcio do HIAE (Id 405), glicose (HSL; HIAE Ids 403/404/406), desmopressina (HIAE Ids 252/253/931), salbutamol (HIAE Id 703). Gluconato (protocolo), glicose 5–10 %/50 % (CAD e hipercalemia), desmopressina 2–4 µg e 1–4 µg (sódio) e salbutamol 10–20 mg ficaram sem conferência cruzada.
- **HSL não publica monografia de NaCl injetável** (a página "cloreto-de-sodio" é só o produto nasal, 2017) — verificar se existe outra página (p. ex. "cloreto-de-sodio-injetavel") em consulta futura.
- **Hipoglicemia durante a insulina EV:** os guias trazem conduta (HSL: G50 % 40 mL EV; glucagon 1 mg IM; 15 g de carboidrato); a calculadora de CAD não a inclui por ser conduta de protocolo — candidata a protocolo institucional na aba Protocolos.
- **Gluconato de cálcio no protocolo:** cuidados do HSL (veia calibrosa, vesicante, CI em intoxicação digitálica/FV, diluir fora da emergência, ≤ 200 mg/min) não foram inseridos no texto (só nas Referências), por serem acréscimos e não correções; incluir quando o protocolo oficial substituir o exemplo.
- **"Isotônico" da solução de bicarbonato:** o consenso 2024 e a ADA 2009 chamam 100 mmol/400 mL de isotônica, mas 100 mL + 400 mL = 200 mEq/L (≈ 400 mOsm/L). Registrado; a fórmula não foi alterada.
- Datas antigas: HSL bicarbonato (2018) e NaCl nasal (2017); HIAE bicarbonato (2021). Os limites usados (1 mEq/kg/h; 10 mL/50 mL) vêm da monografia de 2018 — reconferir quando houver atualização.

## Verificação

- `cmd /c "npx.cmd tsc --noEmit"` (web/): sem erros.
- `cmd /c "npx.cmd vitest run src/tools/met"`: 2 arquivos, **53 testes aprovados** (51 antes; 2 novos — `sodio.test.ts` preparo do NaCl 3 %; `cad.test.ts` conferência com os guias, 18 asserções).
- Arquivos alterados: `web/src/tools/met/sodio.calc.ts`, `sodio.tsx`, `sodio.test.ts`, `cad.calc.ts`, `cad.tsx`, `cad.test.ts`, `protocolos/metabolico/hipercalemia.md`, este relatório. Sem commit.
