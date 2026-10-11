# Auditoria clínica 2026-10 — 6a. Revisão cruzada com os guias farmacêuticos HSL e HIAE: vasoativas, sedação/analgesia, BNM, lidocaína, amiodarona, haloperidol e doses de PCR

Data: 11/10/2026 · Escopo: `web/src/tools/hemo/dva.calc.ts`, `dva.tsx`; `web/src/tools/sed/sedacao.calc.ts`, `sedacao.tsx`, `lidocaina.calc.ts`, `lidocaina.tsx`, `delirium.tsx`; `web/src/lib/pcr.ts`; `web/src/tools/infusion.ts`. Complementa `3-vasoativas-sedacao-opioides.md` (fontes primárias) — aqui a comparação é com dois guias institucionais de referência.

**Fontes.** Guia Farmacêutico do Hospital Sírio-Libanês (HSL, `guiafarmaceutico.hsl.org.br`, monografias públicas; data "Atualizado em" de cada entrada) e Manual Farmacêutico do Hospital Israelita Albert Einstein (HIAE, `aplicacoes.einstein.br/manualfarmaceutico`, API pública; data de atualização de cada entrada). Texto limpo baixado em 11/10/2026 (sem acesso à internet nesta etapa; só os arquivos locais). Os guias são fontes secundárias (compilam bula brasileira, Lexicomp/Micromedex e literatura): **não substituem** a fonte primária já citada no código — servem para detectar lacunas de segurança e divergências de prática.

**Método.** Para cada fármaco, comparação número a número: faixa de dose (inicial, manutenção, máxima) e unidade; diluição-padrão e concentração; concentração máxima; via/acesso (central vs periférico); velocidade/bolus; alertas (extravasamento, incompatibilidades, PRIS, cianeto, taquifilaxia); ajuste renal/hepático. Regra de alteração: (a) os dois guias concordam contra o app **e** a mudança não contradiz a fonte primária citada no código; ou (b) informação de segurança objetiva ausente no app que os dois guias trazem. Diluições-padrão não foram trocadas (escolha institucional; editáveis no aparelho) — só seriam corrigidas se a concentração padrão do app excedesse a concentração máxima dos dois guias (não ocorreu em nenhum caso).

**Legenda.** CONFERE · DIVERGE DO APP (app fora do que os guias dizem) · APP MAIS RESTRITIVO · AUSENTE NO APP (segurança relevante que os dois guias trazem) · GUIAS DIVERGEM (entre si) · 1 GUIA (só um dos guias tem monografia aplicável — não gera alteração).

**Resumo.** 22 fármacos pedidos; 18 com pelo menos uma monografia aplicável (cisatracúrio, lidocaína e amiodarona IV só no HIAE; midazolam IV e cetamina/escetamina e milrinona só no HSL; vecurônio em nenhum). **1 divergência de faixa corrigida** (rocurônio em infusão: teto 0,6 → 0,72 mg/kg/h). **6 informações de segurança acrescentadas** (dopamina máx. 50 mcg/kg/min; nitroglicerina máx. 400 mcg/min; vesicante/acesso central em noradrenalina, vasopressina e dopamina; nitroprussiato só em SG 5%; NTG sem PVC; dexmedetomidina em hepatopatia/> 24 h; fentanil em disfunção renal/hepática; haloperidol IV off label). **Nenhuma concentração-padrão do app excede a concentração máxima dos guias.** 9 itens de decisão institucional, 5 itens sem monografia. `tsc` e `vitest run src/tools/hemo src/tools/sed src/lib/pcr src/tools/infusion.test.ts` verdes (7 arquivos, 140 testes).

---

## 6a.1 Drogas vasoativas (`dva.calc.ts`)

| Item | Plantão | HSL | Einstein (HIAE) | Resultado | Ação |
|---|---|---|---|---|---|
| **Noradrenalina** — faixa | 0,01–3 mcg/kg/min; alt. mcg/min; alerta ≥ 0,25 (vasopressina, SSC 2021) e > 1 (alta dose) | (02/10/2026) Inicial 8–12 mcg/min, manutenção 2–4 mcg/min; pós-PCR 0,1–0,5 mcg/kg/min; choque séptico (estudos) 0,01–3 mcg/kg/min; **máx. 3,3 mcg/kg/min**; doses pela base (ampola 8 mg hemitartarato = 4 mg base) | (23/08/2024) Inicial 8–12 mcg/min; manutenção 2–4 mcg/min; sem dose/kg adulto | CONFERE (HSL 0,01–3 = app; HIAE só mcg/min, dentro da faixa) | — |
| Noradrenalina — diluição/concentração | 16 mg/250 mL = 64 mcg/mL; concentrada 20 mg/100 mL = 200 mcg/mL (travada, central) | 4 mg em 100 ou 250 mL (40 ou 16 mcg/mL); **conc. máx. adulto 0,5 mg/mL**; bomba de infusão; estável 48 h | Sem campo de diluição | CONFERE (64 e 200 mcg/mL < 500) | Diluição mantida (INST.) |
| Noradrenalina — acesso/alertas | Só a concentrada pedia acesso central; sem nota de extravasamento | Vesicante: CVC; não dar bicarbonato/solução alcalina no mesmo acesso (inativação) | Extravasamento → necrose; **fentolamina 5–10 mg em 10–15 mL SF** | AUSENTE NO APP (vesicante/central e antídoto: ambos) · bicarbonato: 1 GUIA | **Corrigido:** nota em `nor` (vesicante, acesso central, fentolamina). Bicarbonato: item de decisão |
| **Vasopressina** — faixa | 0,01–0,04 UI/min | (13/04/2026) Choque séptico 0,01–0,04 U/min por 24–96 h; PCR 40 U bolus (ACLS antigo) | (23/08/2024) Choque séptico 0,01–0,04 U/min por 24–96 h; FV/TV refratária 40 U | CONFERE (0,01–0,04 nos dois). A dose de PCR dos guias é a de diretrizes anteriores a 2015; AHA 2025 (já no `pcr.ts`): "no advantage" | — |
| Vasopressina — diluição/acesso | 100 UI/250 mL = 0,4 UI/mL; sem nota de acesso | Diluir em 100 mL; **conc. máx. 1 U/mL**; veia central ou periférica profunda; vesicante → CVC | Preferir veia central (necrose por extravasamento); vesicante | CONFERE (0,4 < 1 U/mL) · AUSENTE NO APP (vesicante/central: ambos) | **Corrigido:** nota em `vaso` |
| **Dobutamina** — faixa | 2–20 mcg/kg/min | (24/04/2023) Iniciar 2,5; geralmente 2,5–10; até 20; raramente 40; **máx. 40** | (23/08/2024) Usual 2,5–15; **máx. 40** | APP MAIS RESTRITIVO (teto 20 = "usually 2–20" da bula FDA; guias admitem até 40) | Mantido (bula é a fonte primária; > 20 já é `crit`) |
| Dobutamina — diluição/acesso | 250 mg/250 mL = 1.000 mcg/mL | Usuais 500/2.000/4.000 mcg/mL; **máx. 5.000 mcg/mL**; veia calibrosa, bomba; vesicante — AVP só se ≤ 1 mg/mL, acima considerar CVC; incompatível com alcalinos (bicarbonato), bissulfito, etanol e vários Y | Sem campo | CONFERE (1 mg/mL = exatamente o limite do HSL para acesso periférico) · acesso/incompatibilidades: 1 GUIA | Mantido; registrado |
| **Dopamina** — bandas | 0,5–2 dopaminérgica · 2–10 β1 · 10–20 β1+α · > 20 α (bula Baxter); **sem máximo** | (13/05/2026) 1–5 inicial; usual 5–10; até 20–50; > 50 só em insuficiência circulatória muito grave; **máx. 50**; desmame gradual | (23/08/2024) Usual 2–20; **máx. 50**; 1–2 fluxo renal · 2,5–10 débito · > 10 resistência periférica | Bandas CONFERE (cortes semelhantes) · AUSENTE NO APP: dose máxima 50 (ambos) | **Corrigido:** alerta `crit` > 50 mcg/kg/min |
| Dopamina — diluição/acesso | 200 mg/250 mL = 800 mcg/mL; sem nota de acesso | Usual 1.000 mcg/mL; **máx. 3.200 mcg/mL**; veia calibrosa; vesicante — AVP só se ≤ 1,6 mg/mL; inativada por alcalinos | **Máx. 3.200 mcg/mL**; veia de grande calibre (extravasamento → necrose); infundir em veia central | CONFERE (800 < 3.200) · AUSENTE NO APP (veia calibrosa/central: ambos) | **Corrigido:** nota em `dopa` |
| **Nitroprussiato** — faixa | 0,3–10 mcg/kg/min; alerta cianeto > 2; renal (3 / anúrico 1) | (11/02/2017) Inicial 0,3–0,5; usual 3; **máx. 10 mcg/kg/min ou 400 mcg/min**; renal: não exceder 10, limitar (tiocianato); hepático: cautela (cianeto) | (15/12/2023) Inicial 0,3–1; média 3; **máx. 8 mcg/kg/min** (adulto); tiocianato < 50 mg/L; antídoto tiossulfato; cautela renal/hepática/hipotireoidismo; contraindicado com sildenafila/tadalafila | GUIAS DIVERGEM no máximo (10 vs 8); app = bula FDA = HSL | Mantido 10 (fonte primária). PDE5i e tiocianato: 1 GUIA — registrado |
| Nitroprussiato — diluição | 50 mg/250 mL = 200 mcg/mL; nota "proteger da luz"; rodapé genérico "SF/SG" | **SG 5%**, 250–1.000 mL; **máx. 400 mcg/mL** (adulto); proteger da luz | Diluente próprio SG 5%; restrição hídrica: 1 ampola em 125 mL (400 mcg/mL) de **soro glicosado**; bomba | CONFERE (200 < 400) · AUSENTE NO APP: diluente exclusivo SG 5% (ambos + bula) | **Corrigido:** nota "Diluir só em SG 5%" |
| **Nitroglicerina** — titulação | Iniciar 5 mcg/min; +5 a cada 3–5 min; sem resposta em 20, passos de 10–20 | (02/06/2021) Idem, literalmente | (06/08/2024) Usual 5–20; +5–10 a cada 5–10 min | CONFERE (HSL); GUIAS DIVERGEM no passo (HIAE) | Mantido (bula) |
| Nitroglicerina — máximo | > 200: "sem máximo em bula; reavaliar" | **Máx. 400 mcg/min** | **Máx. 400 mcg/min** | AUSENTE NO APP (máximo 400: ambos; não contradiz a bula, que não fixa máximo) | **Corrigido:** banda `warn` 200–400 ("máximo 400") e `crit` > 400 |
| Nitroglicerina — diluição/material | 25 mg/250 mL = 100 mcg/mL | 5 mg/100 mL ou 25–50 mg/500 mL (50–100 mcg/mL) inicial; tabela 100/200/400 mcg/mL; **máx. 400 mcg/mL**; **sistema livre de PVC**; não misturar com outros fármacos; não em bolus | Frascos livres de PVC; sem filtro de linha; não misturar; bomba; **tolerância (alternar uso)** | CONFERE (100 ≤ 400) · AUSENTE NO APP: sem PVC (ambos) · taquifilaxia: 1 GUIA | **Corrigido:** nota "equipo e frasco sem PVC". Tolerância: registrado |
| **Milrinona** | 0,375–0,75 mcg/kg/min; reduzir na disfunção renal; 20 mg/250 mL = 80 mcg/mL | (01/03/2017) Ataque 50 mcg/kg em 10 min; manutenção 0,375–0,750; máx. 1,13 mg/kg/dia; tabela por ClCr (5 → 0,20 … 50 → 0,43); diluição 20 mg/100 mL; **máx. 200 mcg/mL**; não com furosemida/bumetanida na mesma via (precipita); não em bicarbonato | **Sem monografia** | CONFERE (faixa, renal, 80 < 200) · 1 GUIA | Mantido; furosemida/ataque registrados |
| **Adrenalina** (não é fármaco do app de DVA; PCR em `pcr.ts`) | PCR: 1 mg IV/IO a cada 3–5 min | (13/04/2026) PCR 1 mg a cada 3–5 min; choque (off label) 0,1–0,5 mcg/kg/min; **conc. máx. 16 mcg/mL**; vesicante → CVC; fotossensível | (23/08/2024) "Parada cardíaca: 0,1–0,5 mcg/kg/min EV" (dose de infusão, sem o bolus de 1 mg no adulto) | PCR CONFERE (HSL = AHA 2025); HIAE não traz o bolus adulto | — (infusão de adrenalina ausente no app: item de decisão) |

---

## 6a.2 Sedação, analgesia e BNM (`sedacao.calc.ts`)

| Item | Plantão | HSL | Einstein (HIAE) | Resultado | Ação |
|---|---|---|---|---|---|
| **Propofol** — faixa | 5–50 mcg/kg/min (0,3–3 mg/kg/h) ok; 50–66,7 `warn` "acima do PAD"; > 4 mg/kg/h `crit` + alerta PRIS; 10 mg/mL | (24/04/2023) Sedação em UTI **0,3–4,0 mg/kg/h**; "máximo" 6–12 mg/kg/h (anestesia); diluir só em SG 5%, **máx. 2 mg/mL** (2% não dilui); cautela renal/hepática | (17/12/2024) UTI **0,3–4,0 mg/kg/h; máx. 4 mg/kg/h**; "< 4 mg/kg/h por < 48 h minimiza PRIS"; triglicérides basal e em 3–7 dias; 0,1 g lipídio/mL; alergia a ovo/soja/amendoim | CONFERE no teto (4 mg/kg/h = HIAE) e no PRIS; APP MAIS RESTRITIVO entre 3 e 4 mg/kg/h (guias consideram faixa; app sinaliza `warn`, PAD 2013) | Mantido. Triglicérides de rotina: 1 GUIA — registrado |
| **Midazolam** | 0,02–0,1 mg/kg/h; 200 mg/200 mL = 1 mg/mL | **Só monografia oral** (10/05/2017) | (25/11/2025, injetável) UTI: inicial 0,03–0,3 mg/kg em incrementos de 1–2,5 mg; **manutenção 0,03–0,2 mg/kg/h** (idem ≥ 60 anos); criança 0,06–0,12; contraindicado em insuf. hepática grave; apneia do sono | APP MAIS RESTRITIVO (HIAE até 0,2; app = bula FDA/PAD 0,1) · 1 GUIA | Mantido; registrado |
| **Dexmedetomidina** — faixa | 0,2–0,7 ok; 0,7–1,5 `warn` (SPICE III/MENDS2); > 1,5 `crit`; sem ataque | (27/01/2026) Ataque 1 mcg/kg/10 min (dispensável se já sedado ou instável); **manutenção 0,2–0,7**; procedimentos até 1 | (14/01/2025) Ataque 1 mcg/kg/10 min; **0,2–0,7** | CONFERE (0,2–0,7 = bula nos dois). 0,7–1,5 continua assinalado como fora de bula | — |
| Dexmedetomidina — diluição/ajustes | 400 mcg/100 mL = **4 mcg/mL**; nota: bradicardia/hipotensão | 2 mL em 48 mL → **4 mcg/mL** (bolsa pronta 4 mcg/mL); **reduzir em hepatopatia**; renal sem ajuste; **tolerância/taquifilaxia/abstinência > 24 h**; bradicardia/parada sinusal com bolus rápido | Bolsa 4 mcg/mL; **reduzir em insuficiência hepática**; **abstinência nas 24 h após suspensão**; hipertermia; cautela em BAV avançado | CONFERE (4 mcg/mL = padrão dos dois guias) · AUSENTE NO APP: hepatopatia e > 24 h (ambos) | **Corrigido:** nota em `dex` |
| **Cetamina** | Analgésica 0,1–0,5 mg/kg/h; sedativa 0,5–2; > 2 `crit`; 50 mg/100 mL = 0,5 mg/mL | (17/01/2025) Monografia é de **escetamina** (Ketamin NP 50 mg/mL, S(+)); infusão **2–7 mcg/kg/min** (= 0,12–0,42 mg/kg/h) como adjuvante anestésico; diluição 500 mg/500 mL (1 mg/mL) ou 2 mg/mL; **máx. 2 mg/mL**; reduzir em hepatopatia; incompatível com barbitúricos na mesma seringa | **Sem monografia** | 1 GUIA; a faixa do HSL cai dentro da banda analgésica do app; 0,5 mg/mL < 2 mg/mL | Mantido. Decisão: explicitar no app se a dose é de racêmico ou de S(+)-cetamina (a forma disponível no Brasil) |
| **Fentanil** | 0,7–10 mcg/kg/h; bolus 0,35–0,5 mcg/kg a cada 0,5–1 h; 5.000 mcg/100 mL = 50 mcg/mL (= ampola) | (18/01/2022) Só doses anestésicas; **renal: ClCr 10–50 → 75%, < 10 → 50%**; hepático: cautela; diluir em SF/SG | (23/08/2024, Id 345) **UTI ventilado: 0,7–10 mcg/kg/h ou 0,35–1,5 mcg/kg a cada 0,5–1 h**; cautela renal/hepática; 0,1 mg fentanil = 10 mg morfina | Infusão CONFERE (HIAE = PAD); bolus: APP MAIS RESTRITIVO (0,5 vs 1,5; 1 GUIA) · AUSENTE NO APP: renal/hepática (ambos) | **Corrigido:** nota em `fen` |
| **Morfina** | 2–30 mg/h; bolus 2–4 mg a cada 1–2 h; 50 mg/50 mL = 1 mg/mL; "evitar em DRC grave" | (27/01/2026) Críticos: 0,7–10 mg (70 kg) ou 0,01–0,15 mg/kg a cada 1–2 h; **infusão 5–35 mg/h (0,07–0,5 mg/kg/h)**; diluir a **0,1–1 mg/mL**; EV lenta (15 mg em 3 min); renal 75%/50%; cirrose: sedação excessiva | (22/04/2026, injetável) Analgesia 2–10 mg/70 kg IV/SC; máx. 90 mg/dia (intermitente); **contraindicada em insuficiência renal e hepática graves**; sem dose de infusão adulta | Infusão: 1 GUIA (HSL 5–35 sobrepõe 2–30 do PAD); 1 mg/mL = limite superior do HSL; renal CONFERE (ambos restringem) | Mantido; registrado |
| **Sufentanil** | 0,1–0,5 mcg/kg/h; 250 mcg/50 mL = 5 mcg/mL | (21/02/2017) Só anestesia (0,5–5 mcg/kg); pode ir sem diluição (50 mcg/mL); bolus ≥ 2 min | (23/08/2024) Anestesia balanceada: 0,5–1 mcg/kg bolus; **"manutenção 0,1–0,5 mcg/kg/min"** (= 6–30 mcg/kg/h — provável erro de unidade, 60× a faixa usual); injetar em 3–5 min | GUIAS DIVERGEM / sem dose de UTI; 5 mcg/mL ≤ 50 | Mantido; erro provável do HIAE registrado |
| **Remifentanil** | 0,5–15 mcg/kg/h (0,008–0,25 mcg/kg/min); 4.000 mcg/80 mL = 50 mcg/mL | (01/03/2017) Indução 0,5–1 mcg/kg/min; ventilação espontânea 0,04; pós-op 0,1 ± 0,025; **conc. recomendada 50 mcg/mL; máx. 250 mcg/mL**; sem ajuste renal/hepático | (23/08/2024) Indução 0,5–1; manutenção anestésica 0,1–1 mcg/kg/min; espontânea 0,04 | Diluição CONFERE (50 mcg/mL = padrão HSL); faixa: guias só trazem doses anestésicas (acima da UTI) | Mantido |
| **Rocurônio** — infusão | **0,3–0,6 mg/kg/h**; 250 mg/135 mL (1,85 mg/mL); IOT 0,6–1,2 | (30/11/2023) UTI: inicial 0,6–1 mg/kg; **infusão 0,48–0,72 mg/kg/h**; IOT 0,45–0,6; SRI 0,6–1,2; renal/hepática: 0,3–0,4 mg/kg/h; diluição 0,5–2 mg/mL; padrão HSL sem diluição (10 mg/mL) ou 500 mg/100 mL; sugamadex 2/4/16 mg/kg | (13/07/2023) IOT 0,6–1,2 mg/kg; **infusão 10–12 mcg/kg/min** (= 0,6–0,72 mg/kg/h); sem diluição em bolus ou bomba | **DIVERGE DO APP**: teto 0,6 marcava como `crit` a dose inicial usual dos dois guias (0,6–0,72); dentro dos ensaios da bula (4–16 mcg/kg/min) | **Corrigido:** `range` 0,3–0,72; nota com faixas e TOF. 1,85 mg/mL dentro de 0,5–2 (HSL) |
| **Cisatracúrio** | 0,5–10 mcg/kg/min; 200 mg/100 mL = 2 mg/mL | **Sem monografia** | (04/03/2021) IOT 0,15 mg/kg; manutenção 0,03 mg/kg; **infusão 1–4 mcg/kg/min** (anestesia); ampolas 2 mg/mL | 1 GUIA; app = bula FDA §UTI (0,5–10,2); 2 mg/mL = ampola | Mantido; registrado |
| **Vecurônio** | 0,05–0,1 mg/kg/h; sem diluição padrão | **Sem monografia** | **Sem monografia** | SEM MONOGRAFIA | — |
| Notas de categoria | PRIS > 4 mg/kg/h por > 48 h; analgesia primeiro; BNM com RASS −4/−5 e TOF | HIAE: "< 4 mg/kg/h por < 48 h minimiza PRIS" | — | CONFERE | — |

---

## 6a.3 Lidocaína, amiodarona, haloperidol e doses de PCR (`lidocaina.calc.ts`, `delirium.tsx`, `pcr.ts`)

| Item | Plantão | HSL | Einstein (HIAE) | Resultado | Ação |
|---|---|---|---|---|---|
| **Lidocaína** — bolus (PCR/TV) | 1–1,5 mg/kg; repetir 0,5–0,75 mg/kg a cada 5–10 min (AHA 2010); máx. 3 mg/kg | **Sem monografia** | (25/06/2024, Id 493 — 2% isobárica sem conservante, 5 mL) Arritmias ventriculares: **1–1,5 mg/kg EV**, repetir a intervalos de **8–10 min**; **máx. 3 mg/kg**; IM 4 mg/kg | CONFERE (bolus e máximo); intervalo 5–10 vs 8–10 (1 GUIA; AHA 2010 cita 5–10) | Mantido; registrado no `<Ref>` |
| Lidocaína — infusão | 1–4 mg/min; 2 g/500 mL = 4 mg/mL; ICC/hepatopatia ≤ 1 mg/min; alerta > 4 | — | **1–4 mg/min (0,014–0,050 mg/kg/min)** após o bolus; reduzir em idosos, cardiopatas, hepatopatas (Id 491); hepatopatia → níveis tóxicos | CONFERE | — |
| **Amiodarona** — PCR | 300 mg; 2ª dose 150 mg (AHA 2025, `pcr.ts`) | **Só monografia oral** (27/02/2017) | (21/09/2019, injetável) Ataque **5 mg/kg IV 2–3×/dia**; manutenção 10–20 mg/kg/dia (600–800, até 1.200 mg/24 h); sem dose de PCR | SEM MONOGRAFIA aplicável à PCR (5 mg/kg × 60 kg ≈ 300 mg — compatível em magnitude) | Mantido (AHA 2025 é a fonte) |
| **Adrenalina** — PCR | 1 mg IV/IO a cada 3–5 min | 1 mg a cada 3–5 min | Só a infusão 0,1–0,5 mcg/kg/min (rotulada "parada cardíaca") | CONFERE (HSL = AHA); lacuna do HIAE | — |
| **Haloperidol** — dose aguda | 2,5–5 mg IV em bolus, repetir a cada 20–30 min (AID-ICU 2,5 mg 3×/dia; MIND-USA) | (02/09/2021) Psicose EV/IM 2–5 mg a cada 4–8 h (ou a cada hora); **delirium em UTI 0,5–1 mg**, se inadequado repetir a cada 15–30 min; prevenção 0,5 mg + 0,1 mg/h por 12 h; VO máx. 100 mg/dia | (27/07/2024, injetável) **2,5–5 mg IM**, repetir a cada hora se necessário (4–8 h satisfatório); só IM listado | GUIAS DIVERGEM (0,5–1 mg vs 2,5–5 mg); app alinhado ao HIAE e aos ensaios | Mantido; registrado |
| Haloperidol — manutenção VO | 0,5–2 mg 8/8–12/12 h | 0,5–2 mg 2–3×/dia (psicose) | 0,5–2 mg 2–3×/dia; manutenção 1–15 mg/dia | CONFERE | — |
| Haloperidol — infusão | 3–25 mg/h IV (refratário), QTc | **EV off label**: infusão 2–25 mg/h (média 9; **máx. 40 mg/h**); diluir SG 5% 1–3 mg/mL ou SF 0,5–0,75 mg/mL; **ECG contínuo** | Via IV não listada (IM) | CONFERE aprox. (2–25 vs 3–25) · AUSENTE NO APP: via IV off label no Brasil (ambos; HIAE por omissão da via) | **Corrigido:** nota "Via IV é uso off label — ECG contínuo na infusão" |
| Haloperidol — contraindicações | QTc > 500; Parkinson; corpos de Lewy; ECG antes e 1 h após | Monitorização contínua de ECG (eventos em cardiopatas) | Parkinson; demência com corpos de Lewy; coma; PSP; prolongamento QT; ECG no início e periodicamente | CONFERE | — |

---

## 6a.4 Correções feitas (antes → depois; qual guia)

| Arquivo | Item | Antes | Depois | Base |
|---|---|---|---|---|
| `dva.calc.ts` `nor` | nota | (sem nota) | "Vesicante — preferir acesso venoso central. Se extravasar: fentolamina 5–10 mg em 10–15 mL de SF, infiltração local." | HSL nora 02/10/2026 (vesicante, CVC) + HIAE norepinefrina 23/08/2024 (fentolamina) |
| `dva.calc.ts` `vaso` | nota | (sem nota) | "Vesicante — preferir acesso venoso central (necrose por extravasamento)." | HSL vasopressina 13/04/2026 + HIAE vasopressina 23/08/2024 |
| `dva.calc.ts` `dopa` | alerta | (sem máximo) | `crit` > 50 mcg/kg/min "dose máxima (HSL e HIAE)" | HSL dopamina 13/05/2026 + HIAE dopamina 23/08/2024 (máx. 50 nos dois) |
| `dva.calc.ts` `dopa` | nota | "Dose baixa não tem efeito protetor renal comprovado." | + "Vesicante — veia de grande calibre ou acesso central." | HSL + HIAE (extravasamento → necrose) |
| `dva.calc.ts` `nitro` | nota | "Proteger da luz. …" | "Diluir só em SG 5%; proteger da luz. …" | Bula + HSL nitroprussiato 11/02/2017 + HIAE 15/12/2023 (diluente SG 5%) |
| `dva.calc.ts` `ntg` | banda | > 200: `warn` "sem máximo em bula; reavaliar" | 200–400: `warn` "reavaliar; máximo 400 mcg/min (HSL/HIAE)"; > 400: `crit` "Acima de 400 mcg/min — dose máxima (HSL/HIAE)" | HSL NTG 02/06/2021 + HIAE NTG 06/08/2024 (máx. 400 nos dois; bula não fixa máximo — não há contradição) |
| `dva.calc.ts` `ntg` | nota | titulação | + "Equipo e frasco sem PVC (adsorção)." | HSL + HIAE |
| `sedacao.calc.ts` `dex` | nota | bradicardia/hipotensão | + "Reduzir a dose em hepatopatia; uso > 24 h: tolerância e abstinência na retirada." | HSL dexmedetomidina 27/01/2026 + HIAE 14/01/2025 |
| `sedacao.calc.ts` `fen` | nota | infusão/bolus/meia-vida | + "Disfunção renal ou hepática: cautela, reduzir a dose." | HSL fentanila 18/01/2022 (75%/50%) + HIAE fentanila 23/08/2024 (cautela) |
| `sedacao.calc.ts` `roc` | `range` | [0,3, 0,6] mg/kg/h | **[0,3, 0,72]** mg/kg/h; nota com "Infusão em UTI 0,48–0,72 (HSL; HIAE 10–12 mcg/kg/min); disfunção renal/hepática 0,3–0,4; titular pelo TOF" | HSL rocurônio 30/11/2023 (0,48–0,72) + HIAE rocurônio 13/07/2023 (10–12 mcg/kg/min); dentro da bula (4–16 mcg/kg/min) |
| `delirium.tsx` | nota | — | `warn` "Via IV é uso off label (bula brasileira: IM) — HSL e HIAE; em infusão contínua, ECG contínuo (HSL: 2–25 mg/h, média 9, máximo 40 mg/h)." | HSL haloperidol 02/09/2021 + HIAE haloperidol injetável 27/07/2024 |
| `dva.tsx`, `sedacao.tsx`, `lidocaina.tsx`, `delirium.tsx` | `<Ref>` | — | "Conferido com o Guia Farmacêutico do Hospital Sírio-Libanês e o Manual Farmacêutico do Hospital Israelita Albert Einstein (monografias públicas, 11/10/2026)" + divergências em uma linha | — |
| `infusion.test.ts`, `sedacao.test.ts` | testes | — | NTG 400 `warn`/450 `crit`; dopamina 50 sem alerta/51 `crit`; notas de vesicante/SG 5%/PVC; rocurônio 0,72 ok/0,73 crit/0,29 warn; notas dex/fen/roc | — |

Não alterados: `pcr.ts` (adrenalina 1 mg a cada 3–5 min, amiodarona 300/150, lidocaína 1–1,5 e 0,5–0,75 mg/kg — AHA 2025 é a fonte; nenhum guia traz dose de PCR divergente), `lidocaina.calc.ts` (confere com o HIAE), `infusion.ts` (motor), diluições-padrão.

## 6a.5 Diluições-padrão comparadas (app × HSL × HIAE) — não alteradas

| Fármaco | Plantão (padrão, editável) | HSL | HIAE | Conc. máx. (HSL / HIAE) | Situação |
|---|---|---|---|---|---|
| Noradrenalina | 16 mg/250 mL = 64 mcg/mL; concentrada 20 mg/100 mL = 200 mcg/mL | 4 mg/100 ou 250 mL (40 / 16 mcg/mL) | — | 500 mcg/mL / — | OK (ambas abaixo do máximo) |
| Vasopressina | 100 UI/250 mL = 0,4 UI/mL | ? em 100 mL (quantidade não especificada) | — | 1 U/mL / — | OK |
| Dobutamina | 250 mg/250 mL = 1 mg/mL | 500 mg/250 mL (2 mg/mL) usual; também 250/500 e 1.000/250 | — | 5 mg/mL / — | OK; 1 mg/mL é o limite do HSL para acesso periférico |
| Dopamina | 200 mg/250 mL = 0,8 mg/mL | 100 mg/100 mL ou 250 mg/250 mL (1 mg/mL) | — | 3,2 mg/mL / 3,2 mg/mL | OK |
| Nitroprussiato | 50 mg/250 mL = 200 mcg/mL (SG 5%) | 50 mg em 250–1.000 mL SG 5% | 50 mg/125 mL SG 5% se restrição hídrica | 400 / (400 implícito) mcg/mL | OK |
| Nitroglicerina | 25 mg/250 mL = 100 mcg/mL | 25–50 mg/500 mL inicial; 100/200/400 mcg/mL | — | 400 mcg/mL / — | OK |
| Milrinona | 20 mg/250 mL = 80 mcg/mL | 20 mg/100 mL (200 mcg/mL) | — | 200 mcg/mL / — | OK (app mais diluído) |
| Propofol | 10 mg/mL puro | puro (1% ou 2%); se diluído, SG 5% ≤ 2 mg/mL | puro | 2 mg/mL se diluído | OK (sem diluição) |
| Midazolam | 200 mg/200 mL = 1 mg/mL | (oral) | sem campo | — | sem comparador |
| Dexmedetomidina | 400 mcg/100 mL = 4 mcg/mL | 200 mcg/50 mL = 4 mcg/mL; bolsa 4 mcg/mL | bolsa 4 mcg/mL | — | **Igual aos dois guias** |
| Cetamina | 50 mg/100 mL = 0,5 mg/mL | escetamina 500 mg/500 mL (1 mg/mL) ou 2 mg/mL | — | 2 mg/mL / — | OK |
| Fentanil | 5.000 mcg/100 mL = 50 mcg/mL (ampola) | SF/SG, sem concentração fixa | — | — | OK |
| Morfina | 50 mg/50 mL = 1 mg/mL | 0,1–1 mg/mL (PCA 0,1 mg/mL) | — | 1 mg/mL (faixa HSL) / — | OK (no limite superior do HSL) |
| Sufentanil | 250 mcg/50 mL = 5 mcg/mL | sem diluição (50 mcg/mL) ou SF/SG | — | 50 mcg/mL / — | OK |
| Remifentanil | 4.000 mcg/80 mL = 50 mcg/mL | 50 mcg/mL (adulto) | — | 250 mcg/mL / — | **Igual ao HSL** |
| Rocurônio | 250 mg/135 mL = 1,85 mg/mL | 0,5–2 mg/mL; padrão HSL 10 mg/mL puro ou 5 mg/mL | puro | 10 mg/mL (puro) | OK |
| Cisatracúrio | 200 mg/100 mL = 2 mg/mL | — | ampola 2 mg/mL | — | OK |
| Lidocaína | 2 g/500 mL = 4 mg/mL | — | ampola 2% (20 mg/mL) sem conservante | — | sem comparador de infusão |

## 6a.6 Itens de decisão institucional (não alterados)

1. **Dobutamina**: teto 20 mcg/kg/min (bula FDA "usually 2–20") vs 40 nos dois guias — manter 20 ou passar o `crit` para 40? (sugestão: manter 20, com texto "até 40 em raras ocasiões").
2. **Nitroprussiato**: máximo 8 (HIAE) vs 10 (HSL/bula/app). Manter 10. HIAE acrescenta: contraindicado com sildenafila/tadalafila; tiocianato < 50 mg/L; antídoto tiossulfato — só um guia.
3. **Noradrenalina/dopamina/dobutamina e bicarbonato (solução alcalina) no mesmo acesso**: só o HSL traz — não acrescentado pela regra; é fato de bula (inativação). Sugestão: acrescentar como nota de categoria em `dva.tsx`.
4. **Infusão de adrenalina** (0,1–0,5 mcg/kg/min nos dois guias; conc. máx. 16 mcg/mL no HSL; vesicante): não existe no app de DVA — incluir?
5. **Midazolam**: HIAE manutenção 0,03–0,2 mg/kg/h (bula brasileira) vs app 0,02–0,1 (bula FDA/PAD). Manter 0,1 (mais conservador; PADIS desestimula benzodiazepínico).
6. **Propofol**: HIAE recomenda triglicérides basal e em 3–7 dias para toda infusão (app só alerta acima de 4 mg/kg/h).
7. **Cetamina**: a monografia do HSL é de **escetamina** (S(+)), a forma disponível no Brasil, com potência ≈ 2× o racêmico. O app não diz a que forma suas faixas se referem — explicitar.
8. **Haloperidol — dose aguda**: HSL (delirium em UTI) 0,5–1 mg vs HIAE 2,5–5 mg IM vs app 2,5–5 mg IV a cada 20–30 min. Manter (AID-ICU 2,5 mg); considerar dizer "iniciar com a menor dose em idosos".
9. **Vasopressina em PCR (40 U)** consta nos dois guias (ACLS anterior a 2015); o app segue AHA 2025 ("no advantage") — não incluir.

## 6a.7 Itens sem monografia aplicável

- **Vecurônio**: nenhum dos guias. **Milrinona**: só HSL (confere). **Cetamina**: só HSL (escetamina). **Midazolam IV**: só HIAE (HSL só oral). **Cisatracúrio**: só HIAE (faixa anestésica 1–4 mcg/kg/min; app segue bula §UTI 0,5–10,2). **Lidocaína antiarrítmica**: só HIAE (confere). **Amiodarona IV**: só HIAE, sem dose de PCR (HSL só oral). **Fentanil/morfina/remifentanil/sufentanil em UTI**: HSL só traz doses anestésicas; HIAE traz UTI só para fentanil (confere com o PAD). **Haloperidol IV**: HIAE só lista IM.
- Observações sobre os guias: HIAE sufentanil "0,1–0,5 mcg/kg/min" é provável erro de unidade (esperado /h); HIAE adrenalina rotula a infusão 0,1–0,5 mcg/kg/min como "parada cardíaca" e não traz o bolus de 1 mg no adulto; HSL haloperidol "repetir 25% da última dose" (texto confuso).

## 6a.8 Verificação

`cmd /c "npx.cmd tsc --noEmit"` → sem erros. `cmd /c "npx.cmd vitest run src/tools/hemo src/tools/sed src/lib/pcr src/tools/infusion.test.ts"` → 7 arquivos, **140 testes aprovados** (11/10/2026). Nenhum commit feito.
