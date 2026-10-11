# 6b. Conferência cruzada — ajuste renal e doses de antimicrobianos × Guia HSL e Manual HIAE

Data: 11/10/2026. Arquivos conferidos: `web/src/tools/inf/atb.calc.ts`, `atb.tsx`, `atb.test.ts` (ajuste renal e dose habitual) e `atb-foco.calc.ts` / `atb-foco.tsx` (doses empíricas).
Complementa `4-sepse-infeccao.md` §8 (auditoria contra bulas FDA/DailyMed, SPC e PubMed), que continua sendo a fonte regulatória do app.

## 1. Método

1. Fontes: monografias públicas baixadas em 11/10/2026 como texto limpo (sem acesso à internet nesta etapa):
   - **Guia Farmacêutico do Hospital Sírio-Libanês (HSL)** — `guiafarmaceutico.hsl.org.br/<fármaco>`; traz dose, ajuste renal (ClCr, HD, CRRT, DP), preparo, concentração máxima, tempo de infusão e data "Atualizado em".
   - **Manual Farmacêutico do Hospital Israelita Albert Einstein (HIAE)** — API pública `aplicacoes.einstein.br/manualfarmaceutico`; traz posologia, campo "Ajuste renal" (muitas vezes vazio ou com tabela perdida na conversão), alertas e data de atualização por entrada.
2. Para cada uma das 25 drogas do app comparou-se, número a número: dose habitual; limites de ClCr e dose/intervalo por faixa; hemodiálise (dose e momento); CRRT/DP; dose de ataque; infusão/concentração; alertas.
3. Classificação por item: **CONFERE** · **DIVERGE DO APP** · **APP MAIS RESTRITIVO** · **INFORMAÇÃO AUSENTE NO APP** · **GUIAS DIVERGEM ENTRE SI** · **GUIA SEM AJUSTE RENAL** (monografia sem seção renal ou com tabela ilegível).
4. Regra de alteração: o app segue a bula FDA/SPC conferida em 10/2026; só se corrige quando os **dois** guias concordam contra o app e a bula não contradiz, ou quando há erro evidente. Informação objetiva de segurança presente nos dois guias (ou em um guia **e** na bula já citada) e ausente no app foi acrescentada ao texto da droga, com guia + data em comentário e teste. Diferenças de prática = "decisão institucional" (registradas, não alteradas).

### Limitações do material baixado

| Arquivo | Problema | Consequência |
|---|---|---|
| `einstein/ampicilina-sulbactam.md` | contém só **AMPICILINA** (Id 81 injetável e Id 861 VO); a entrada "SULBACTAM + AMPICILINA" (Id 736) consta em `lista.json`, mas não foi baixada | ampicilina-sulbactam conferida só com o HSL |
| `einstein/fluconazol.md` | seção "Ajuste renal" com os cabeçalhos "Adultos / Criança" e tabela perdida na conversão | fluconazol: HIAE = GUIA SEM AJUSTE RENAL (ilegível) |
| `einstein/ceftazidima.md` | tabela de ajuste renal da ceftazidima reduzida a uma linha (DP); ceftazidima-avibactam dentro do mesmo arquivo, sem tabela | HIAE: só a linha de DP para ceftazidima |
| `einstein/*` (cefepima, meropenem, ertapenem, ciprofloxacino, levofloxacino, voriconazol, daptomicina, teicoplanina, pip-tazo, anfotericina) | campo "Ajuste renal" vazio na API | classificados como GUIA SEM AJUSTE RENAL para o HIAE |
| colistina | não consta no Manual HIAE | conferida só com o HSL |

Datas das monografias (HSL / HIAE): amp-sulb 09/02/2023 / —; pip-tazo 08/12/2021 / 28/05/2020; ceftriaxona 15/01/2026 / 03/04/2023; cefepima 01/11/2018 / 22/07/2023; ceftazidima 27/01/2025 / 18/12/2025; ceftazidima-avibactam 22/09/2026 / 27/12/2025; meropenem 07/07/2026 / 30/09/2023; ertapenem 27/09/2022 / 31/03/2025; imipenem 03/03/2017 / 24/07/2025; ciprofloxacino 27/09/2022 / 06/06/2024; levofloxacino 03/03/2017 / 26/04/2025; fluconazol 02/04/2019 / 09/06/2018; voriconazol 23/12/2022 / 20/10/2023 (IV); micafungina 08/01/2018 / 31/03/2025; anfotericina B lipossomal 30/06/2026 / 19/06/2024; metronidazol 08/12/2021 / 03/06/2023 (IV); SMX-TMP 27/09/2023 / 10/07/2025 (IV); linezolida 03/03/2017 / 11/12/2023; daptomicina 27/02/2017 / 19/07/2025; amicacina 29/12/2017 / 17/02/2025; gentamicina 17/12/2019 / 06/01/2024; vancomicina 07/03/2025 / 09/06/2018; teicoplanina 27/09/2022 / 25/04/2024; polimixina B 27/01/2026 / 26/03/2026; colistina 17/10/2022 / —.

## 2. Tabela por droga (Item | Plantão | HSL | Einstein | Resultado | Ação)

### 2.1 Betalactâmicos

| Item | Plantão | HSL | Einstein | Resultado | Ação |
|---|---|---|---|---|---|
| **Amp-sulbactam** dose habitual | 1,5–3 g 6/6 h | 1,5–3 g 6–8 h; máx. 12 g/dia | (só ampicilina no material) | CONFERE | — |
| Amp-sulbactam faixas | ≥ 30: 6–8 h · 15–29: 12 h · 5–14: 24 h · < 5: sem dado | 15–29: 12 h · 5–14: 24 h (idêntico à bula) | — | CONFERE | — |
| Amp-sulbactam HD/DP | "HD: dar após a sessão" | HD após diálise 1,5–3 g 12–24 h; DP 3 g 24 h | — | INFORMAÇÃO AUSENTE NO APP (1 guia; bula sem dado) | registrar; não alterado |
| Amp-sulbactam infusão | — | 1,5 g em 15 min, 3 g em 30 min; direta 3 min | — | INFORMAÇÃO AUSENTE (1 guia) | registrar |
| **Pip-tazo** dose habitual | 4,5 g 6/6 h (pneumonia hospitalar) | 3,375 g 6/6 h (geral); 4,5 g 6/6 h PN | 4,5 g 8/8 h usual; máx. 4,5 g 6/6 h | GUIAS DIVERGEM ENTRE SI; app = coluna PN da bula | decisão institucional |
| Pip-tazo faixas (coluna PN) | > 40: 4,5 g 6/6 h · 20–40: 3,375 g 6/6 h · < 20: 2,25 g 6/6 h | idêntico (PN); geral: 2,25 g 6/6 h e 2,25 g 8/8 h | vazio | CONFERE | — |
| Pip-tazo HD/DP | HD 2,25 g 8/8 h + 0,75 g pós-HD; DP 2,25 g 8/8 h sem suplemento | HD/DP 2,25 g 8/8 h (PN); 0,75 g após HD se a dose não cair após a sessão | vazio | CONFERE (suplemento ligado à HD) | — |
| Pip-tazo infusão | — | 30 min (padrão HSL 60 min) | — | INFORMAÇÃO AUSENTE (1 guia) | registrar |
| **Ceftriaxona** dose/ajuste | 1–2 g 12–24 h; sem ajuste; hep+renal máx. 2 g/dia; não dialisável | idêntico; máx. 4 g/dia; mal dialisável | 1–2 g 1–2×/dia; máx. 4 g/dia; "não necessário ajuste" | CONFERE | — |
| Ceftriaxona segurança | ausente | máx. 4 g/dia; não reconstituir/coadministrar com cálcio | máx. 4 g/dia; não infundir simultaneamente com soluções com cálcio (Y) | INFORMAÇÃO AUSENTE NO APP (2 guias + bula) | **acrescentado** + teste |
| **Cefepime** dose/faixas | 2 g 8/8 h; > 60 · 30–60 12 h · 11–29 24 h · < 11: 1 g 24 h | 1–2 g 8–12 h; tabela idêntica à bula (coluna 2 g 8/8 h) | 2 g 8 h muito graves, 2 g 12 h graves; renal vazio | CONFERE | — |
| Cefepime HD/DP | HD 1 g D1 → 500 mg 24 h (NF 1 g 24 h); DP 2 g 48 h | HD ~68 % dialisável, após sessão; 1 g D1 → 0,5–1 g 24 h ou 1–2 g 48–72 h | — | CONFERE (HSL mais amplo) | — |
| Cefepime infusão | — | 30 min; direta 3–5 min; máx. 40 mg/mL | — | INFORMAÇÃO AUSENTE (1 guia) | registrar |
| **Ceftazidima** faixas | > 50 · 31–50: 1 g 12 h · 16–30: 1 g 24 h · 6–15: 500 mg 24 h · ≤ 5: 500 mg 48 h (+50 % se grave) | idêntico (HSL "< 5" para a última faixa); máx. 6 g/dia | 1–2 g 8–12 h; máx. 9 g/dia; só linha de DP | CONFERE | — |
| Ceftazidima HD | 1 g ataque + 1 g após cada sessão (bula) | após diálise 0,5–1 g 24 h ou 1–2 g 48–72 h; CVVH 2 g → 1–2 g 12 h; CVVHD/F 2 g → 1 g 8–12 h | — | DIVERGE DO APP (HSL = Lexicomp); bula sustenta o app | registrar |
| Ceftazidima DP | 1 g ataque → 500 mg 24 h | — | 1 g → 500 mg 24 h ou 250 mg/2 L de dialisato | CONFERE | — |
| **Ceftazidima-avibactam** | 2,5 g 8/8 h em 2 h; > 50 · 31–50: 1,25 g 8 h · 16–30: 0,94 g 12 h · 6–15: 0,94 g 24 h · ≤ 5: 0,94 g 48 h; após HD | idêntico (HSL "< 6"); infusão 2 h; HD 4×/semana para intervalo ≤ 48 h | 2,5 g 3×/dia; renal vazio; "reduzir conforme IR; creatinina diária se IR" | CONFERE | — |

### 2.2 Carbapenêmicos

| Item | Plantão | HSL | Einstein | Resultado | Ação |
|---|---|---|---|---|---|
| **Meropenem** dose habitual | 1–2 g 8/8 h | 1 g 8 h (sepse, PN, NF, Pseudomonas); 500 mg 8 h (pele, gineco); máx. 6 g/dia | 500 mg–2 g 8 h; máx. 2 g 8 h | CONFERE (faixa do app dentro do HIAE; HSL fixa 1 g) | decisão institucional (já registrada) |
| Meropenem faixas | > 50 · 26–50: plena 12 h · 10–25: metade 12 h · < 10: metade 24 h | idêntico | vazio ("ajustar em IR") | CONFERE | — |
| Meropenem HD/CRRT | "bula sem dado; dar após a sessão" | HD: 500 mg 24 h após diálise; CVVH 1 g → 500 mg 8 h; CVVHD/F 1 g → 500 mg 6–8 h ou 1 g 8–12 h | — | INFORMAÇÃO AUSENTE NO APP (1 guia) | registrar; sugerir à farmácia |
| Meropenem infusão | — | 15–30 min (padrão HSL 60 min; infusão prolongada em críticos); máx. 50 mg/mL | — | INFORMAÇÃO AUSENTE (1 guia) | registrar |
| **Ertapenem** | 1 g 24 h; ≤ 30: 500 mg; HD +150 mg se dose ≤ 6 h antes | idêntico; infusão 30 min; máx. 20 mg/mL | 1 g 1×/dia; renal vazio | CONFERE | — |
| **Imipenem** dose habitual | 500 mg 6/6 h (ClCr ≥ 90) | 250–1000 mg 6–8 h; máx. 50 mg/kg/dia | 250 mg 6 h leve · 500–1000 mg 2–3×/dia · 1 g 3–4×/dia grave; máx. 4 g/dia | CONFERE (esquema 500 mg 6/6 h é um dos da bula) | — |
| Imipenem faixas | ≥ 90: 500 · 60–89: 400 · 30–59: 300 · 15–29: 200 mg 6/6 h · < 15: não usar salvo HD em 48 h (bula 5/2022) | esquema antigo: ≤ 5 não usar salvo HD em 48 h; HD = faixa 6–20, após sessão, ou 250–500 mg 12 h; CRRT 1 g → 250 mg 6–8 h | esquema antigo: 41–70: 250–750 mg 6–8 h · 21–40: 250–500 mg 6–12 h · 6–20: 250–500 mg 12 h · após HD 250–500 mg 12 h | GUIAS DIVERGEM DO APP (ambos usam a tabela antiga da bula, por mg/kg); APP MAIS RESTRITIVO (< 15 vs ≤ 5) | mantido (bula vigente) |
| Imipenem infusão | — | ≤ 500 mg em 20–30 min; ≥ 750 mg em 40–60 min; "não administrar em push"; máx. 500 mg/60 mL | — (só Recarbrio: 30 min) | INFORMAÇÃO AUSENTE (1 guia) | registrar |

### 2.3 Quinolonas

| Item | Plantão | HSL | Einstein | Resultado | Ação |
|---|---|---|---|---|---|
| **Ciprofloxacino** dose | 400 mg 8–12 h | 400–800 mg/dia 12 h, até 1200 mg/dia 8 h | 200–400 mg 12 h (resp.); 400 mg 8 h graves/Pseudomonas | CONFERE | — |
| Ciprofloxacino faixas | > 30 · 5–29: 200–400 mg 18–24 h · < 5: sem dado; HD/DP removem < 10 % | ≥ 30 sem ajuste; 5–29: 200–400 mg 18–24 h; CRRT 200–400 mg 12–24 h | vazio | CONFERE | — |
| Ciprofloxacino infusão | — | 60 min | — | INFORMAÇÃO AUSENTE (1 guia; bula também 60 min) | registrar |
| **Levofloxacino** faixas | ≥ 50 plena · 20–49: 750 48 h / 500 → 250 24 h · 10–19: 750 → 500 48 h / 500 → 250 48 h · HD/DP = 10–19 | idêntico (inclui esquema 250 mg); CRRT ataque 500–750 → 250–750 mg 24 h | 500–750 mg 1×/dia; renal vazio; cautela em IR (convulsão, tendão) | CONFERE | — |
| Levofloxacino infusão | — | 250/500 mg em 60 min; 750 mg em 90 min | — | INFORMAÇÃO AUSENTE (1 guia; bula igual) | registrar |

### 2.4 Antifúngicos

| Item | Plantão | HSL | Einstein | Resultado | Ação |
|---|---|---|---|---|---|
| **Fluconazol** dose | 400–800 mg 24 h | sistêmica 200–600 mg/dia; cripto 400 mg/dia; máx. 12 mg/kg (800 mg) | candidemia/cripto: ataque 400 → 200–400 mg/dia | CONFERE (app no limite superior; guias mais antigos) | — |
| Fluconazol faixas | > 50 plena · ≤ 50: ataque pleno → 50 %; HD 100 % após cada sessão | < 50: 50 %/dia; CVVH 400–800 → 200–400 24 h; CVVHD/F 400–800 → 400–800 24 h | tabela ilegível | CONFERE (HSL "< 50" vs app/bula "≤ 50": app mais restritivo em 50 exato) | — |
| Fluconazol infusão | — | 200 mg em 1 h; nunca > 10 mL/min (QT) | — | INFORMAÇÃO AUSENTE (1 guia) | registrar |
| **Voriconazol IV** | 6 mg/kg 12 h × 2 → 4 mg/kg 12 h; < 50: SBECD acumula, preferir VO | idêntico; Candida 3–4 mg/kg; < 50 priorizar VO, creatinina rigorosa; infusão 1–2 h (≤ 3 mg/kg/h); máx. 5 mg/mL | 6 mg/kg × 2 → 3–4 mg/kg 12 h; renal vazio | CONFERE (manutenção 3–4 mg/kg em Candida nos 2 guias e na bula; app usa o teto) | registrar |
| **Micafungina** | 100 mg (candidemia) · 150 (esofágica); sem ajuste | 100/150/50 mg; até 200 mg se resposta inadequada; sem seção renal; infusão 1 h | 100–150 mg 1×/dia; "não é necessário ajuste" | CONFERE; HSL = GUIA SEM AJUSTE RENAL | — |
| **Anfotericina B lipossomal** dose | 3–5 mg/kg 24 h; sem ajuste; Cr, K, Mg diários | 3–6 mg/kg/dia; sem ajuste; HD pouco dialisada, sem suplemento | 3–5 mg/kg/dia em 1–2 h; renal vazio; suspender se ureia > 80 / Cr > 3 | CONFERE | — |
| Anfotericina B segurança | ausente | diluir em SG 5% (0,2–2 mg/mL); incompatível com SF: lavar acesso com SG 5%; infusão 2 h (1 h se tolerada) | incompatível com SF; infusão 1–2 h | INFORMAÇÃO AUSENTE NO APP (2 guias + bula AmBisome) | **acrescentado** + teste |

### 2.5 Outros (metronidazol, SMX-TMP, linezolida, daptomicina)

| Item | Plantão | HSL | Einstein | Resultado | Ação |
|---|---|---|---|---|---|
| **Metronidazol** dose | 500 mg 8/8 h | EV 500 mg 6–8 h; máx. 4 g/dia | EV 500–750 mg 8 h | CONFERE (bula 7,5 mg/kg 6/6 h = decisão já registrada) | — |
| Metronidazol ajuste | sem ajuste; HD após a sessão; DRC grave: neurotoxicidade | ClCr < 10 sem diálise: "considerar 50 % a cada 12 h"; HD 500 mg 8–12 h; CRRT 500 mg 6–12 h | "não é necessário ajuste; monitorar efeitos adversos; após HD considerar suplemento" | GUIAS DIVERGEM ENTRE SI (ClCr < 10); app = bula = HIAE | registrar |
| Metronidazol infusão | — | > 20 min (5 mL/min); padrão HSL 60 min | — | INFORMAÇÃO AUSENTE (1 guia) | registrar |
| **SMX-TMP** dose habitual | TMP 8–10 mg/kg/dia 6/6–12/12 h (PCP 15–20) | bacteremia 3–5 mg/kg TMP 8 h; meningite 10–20; ITU/shigelose 8–10 mg/kg/dia; PCP 15–20; máx. 20 | 160 mg TMP 2×/dia (graves 240 mg 2×/dia); PCP 20 mg/kg/dia 6/6 h | CONFERE | — |
| SMX-TMP faixas | > 30 usual · 15–30: 50 % · < 15: não recomendado | idêntico; HD após diálise (2,5–10 mg/kg 24 h ou 5–20 mg/kg 3×/sem) | idêntico (tabela 8–20 mg/kg/dia); HD: dose normal e meia dose após diálise; VO contraindicado < 15 | CONFERE; HD: GUIAS DIVERGEM ENTRE SI | registrar |
| SMX-TMP infusão | — | 60–90 min; máx. 1 ampola/75 mL; estabilidade 2–6 h | — | INFORMAÇÃO AUSENTE (1 guia) | registrar |
| **Linezolida** dose/ajuste | 600 mg 12 h; sem ajuste; DRC + > 14 d: plaquetopenia | 400–600 mg 12 h; sem ajuste; HD ~30 % dialisável, após a sessão; infusão 30–120 min | 600 mg 2×/dia; IR leve-grave sem ajuste (cautela); IR = risco de trombocitopenia; hemograma semanal | CONFERE | — |
| Linezolida segurança | HD e hemograma só em comentário | HD após a sessão; leucograma em risco | hemograma semanal | INFORMAÇÃO AUSENTE NO APP (HSL + bula Zyvox; HIAE + bula) | **acrescentado** + teste |
| **Daptomicina** dose habitual | 6–10 mg/kg 24 h | 4–6 mg/kg/dia; máx. 8–10 mg/kg | 4 mg/kg pele; 6 mg/kg bacteremia | DIVERGE DO APP (2 guias = bula 4–6; 8–10 = IDSA MRSA 2011) | decisão institucional (já registrada) |
| Daptomicina ajuste | < 30: mesma dose 48 h; HD/DP após sessão | < 30: 48 h; HD 48 h após sessão; máx. 50 mg/mL; 30 min ou direta 2 min | vazio; "menor eficácia se ClCr < 50"; CPK semanal; estatinas | CONFERE | — |
| Daptomicina segurança | ausente | — | CPK semanal | INFORMAÇÃO AUSENTE NO APP (HIAE + bula Cubicin RF: mais frequente em DRC) | **acrescentado** + teste |

### 2.6 Aminoglicosídeos

| Item | Plantão | HSL | Einstein | Resultado | Ação |
|---|---|---|---|---|---|
| **Amicacina** dose habitual | 15 mg/kg 24 h (intervalo estendido) | 15–20 mg/kg/dia dose única (função renal normal) ou 5–7,5 mg/kg 8 h; máx. 1,5 g/dia | bula: 7,5 mg/kg 12 h ou 5 mg/kg 8 h; dose alta: 15–20 mg/kg (até 30 em graves) | CONFERE (ambos aceitam dose única diária) | — |
| Amicacina faixas | ≥ 60: 24 h · 40–59: 36 h · 20–39: 48 h · < 20: convencional por nível | ≥ 50 sem ajuste; 10–50: 24–72 h por nível; < 10: 48–72 h por nível; HD ~20 %: 5–7,5 mg/kg 48–72 h após sessão; CRRT 10 mg/kg → 7,5 mg/kg 24–48 h | dose alta (UpToDate): ≥ 60: 24 h · 40–< 60: 36 h · 20–< 40: 48 h · < 20: dose usual uma vez e nível; cautela se ClCr < 40; convencional (bula): > 50 7,5 mg/kg 12 h · 10–50: 12–18 h · < 10: 24–48 h; após HD 2,5–3,75 mg/kg | **CONFERE com o HIAE** (intervalos idênticos aos do app — a extrapolação de Hartford ganha respaldo institucional); GUIAS DIVERGEM ENTRE SI | comentário no código atualizado + teste |
| Amicacina outros | — | infusão 30–60 min; máx. 5 mg/mL; obeso: peso ideal; pico ≤ 40 mcg/mL | pico 20–30, vale < 10 mcg/mL (neonatos) | INFORMAÇÃO AUSENTE (1 guia) | registrar |
| **Gentamicina** | Hartford 7 mg/kg; ≥ 60: 24 h · 40–59: 36 h · 20–39: 48 h · < 20: nível | 5 mg/kg/dia; 60–79: 4 mg/kg 24 h; 50: 3,5 mg/kg; 40: 2,5 mg/kg 24 h; < 30: dose íntegra e depois por nível; CRRT 2–3 mg/kg → 1–1,5 mg/kg 24–36 h; peso ideal | 3–5 mg/kg/dia 8/8 h (convencional); ≥ 60 sem ajuste · 40–< 60: 12 h · 20–< 40: 24 h · < 20: 24 h + nível; HD 2–3 mg/kg → 1–1,5 mg/kg 24–36 h; DP 1–3 mg/kg 48–72 h | GUIAS DIVERGEM ENTRE SI e DO APP (três esquemas distintos: Hartford 7 mg/kg · HSL dose única reduzida · HIAE convencional) | decisão institucional; app mantém Nicolau 1995 |

### 2.7 Glicopeptídeos

| Item | Plantão | HSL | Einstein | Resultado | Ação |
|---|---|---|---|---|---|
| **Vancomicina** ataque | 20–35 mg/kg (peso real, máx. 3 g) | 25–30 mg/kg (peso real); máx. 2000 mg/dose | —; máx. 2 g/dose | DIVERGE (guias limitam a dose unitária a 2 g; Rybak 2020 admite ataque até 3 g) | registrar; validar com farmácia |
| Vancomicina manutenção | 15–20 mg/kg 8–12 h por AUC 400–600 | 15–20 mg/kg 8–12 h; protocolo de vancocinemia | 15–20 mg/kg 8–12 h; "avaliar nível sérico" | CONFERE | — |
| Vancomicina faixas | ≥ 30: 15 mg/kg 12–24 h · 15–29: 24–48 h · < 15: só por nível | 20–49: 15–20 mg/kg 24 h · < 20: intervalos maiores por nível | só nível sérico | DIVERGE PARCIALMENTE (HSL 24 h fixo em 30–49; app 12–24 h); ambos "guiados por nível" | registrar (esquema de partida sem fonte única, já sinalizado) |
| Vancomicina HD/CRRT | "HD: dose após a sessão" | HD 500–1000 mg ou 5–10 mg/kg após cada sessão; CVVH/CVVHD/CVVHDF 1 g 24 h; dialisador F8 | — | INFORMAÇÃO AUSENTE (1 guia) | registrar |
| Vancomicina infusão | ausente | ≤ 15 mg/min: 500–1000 mg em 60 min, 1250–1500 em 90, 1750–2000 em 120; 5 mg/mL (máx. 10); bomba; reação infusional | "infusão rápida (< 60 min) pode resultar em reação grave" | INFORMAÇÃO AUSENTE NO APP (2 guias + bula: ≥ 60 min, ≤ 10 mg/min) | **acrescentado** em todas as faixas + teste |
| **Teicoplanina** dose | 400 mg 24 h após 400 mg 12 h × 3 | idêntico (≈ 6 mg/kg; > 85 kg: 6 mg/kg; endocardite/queimados 12 mg/kg/dia); alvo ≥ 10 mg/L | ataque "800–400 mg" 12 h × 3 → 400 mg 1×/dia | CONFERE (dose fixa já registrada como decisão) | — |
| Teicoplanina faixas | > 80 plena · 30–80: metade a partir do 4º dia · < 30 e HD: 1/3 (SPC 12/2025) | sem redução até o 4º dia; 40–60: 50 % 24 h ou 100 % 48 h; < 40: 1/3 ou 100 % 72 h | vazio | GUIAS DIVERGEM DO APP (HSL = SPC antigo): APP MAIS RESTRITIVO em 60–80; HSL mais restritivo em 30–39 | mantido (SPC vigente) |

### 2.8 Polimixinas

| Item | Plantão | HSL | Einstein | Resultado | Ação |
|---|---|---|---|---|---|
| **Polimixina B** ajuste renal | sem ajuste (Tsuji 2019) | "não é necessário ajuste de dose" | "não adotaremos o ajuste por função renal da bula, seguindo a literatura atualizada" | CONFERE (os dois guias confirmam o consenso contra a bula antiga) | — |
| Polimixina B dose | 1,25–1,5 mg/kg 12/12 h; ataque 2–2,5 mg/kg | ataque 25.000 UI/kg (2,5 mg/kg); 15.000–25.000 UI/kg/dia 12/12 h; máx. 2 MUI (200 mg)/dia; infusão 60–120 min; 500.000 UI em 300–500 mL SG 5% | 15.000–25.000 UI/kg/dia 12/12 h; 10.000 UI = 1 mg | DIVERGE DO APP (guias = bula, 1,5–2,5 mg/kg/dia; app = consenso, 2,5–3 mg/kg/dia) — a fonte citada (Tsuji 2019) contradiz os guias | decisão institucional; **acrescentada** a equivalência 1 mg = 10.000 UI, a faixa da bula/guias e a infusão em 1 h |
| **Colistina** dose | ataque 300 mg CBA; tabela CBA por ClCr (360 → 130 mg/dia), 12/12 h | 1 MUI = 34 mg CBA; > 60 kg: 1–2 MUI 8/8 h; máx. 6 MUI (bula) ou 9 MUI (Lexicomp)/dia; > 80: 1–2 MUI 8 h · 50–79: 1–1,5 MUI 12 h · 30–49: 1 MUI 12–24 h · 10–29: 1–1,5 MUI 36 h | sem monografia | DIVERGE DO APP (HSL = bula/Lexicomp, doses menores e sem ataque; app = consenso Nation/Tsuji, ex.: ClCr ≥ 90 → 10,9 MUI/dia) | decisão institucional; 1 guia só |
| Colistina HD/CRRT | HD 130 mg/dia + 40 (3 h) ou 50 mg (4 h) pós-sessão; CRRT 440 mg CBA/dia | HD 45.000 UI/kg 24–48 h após diálise; CRRT ataque 9 MUI → 6,6 MUI 12 h (≈ 440 mg CBA/dia) | — | CRRT CONFERE (mesma fonte Nation 2017); HD DIVERGE | registrar |
| Colistina infusão | ataque em 0,5–1 h | intermitente ≥ 30 min; máx. 75 mg/mL | — | CONFERE | — |

### 2.9 Doses empíricas em `atb-foco.calc.ts`

| Esquema | HSL | Einstein | Resultado |
|---|---|---|---|
| Ceftriaxona 2 g 1×/dia (ITU grave) e 2 g 12/12 h (meningite) | 1–2 g 12–24 h; máx. 4 g/dia | 1–2 g 1–2×/dia; máx. 4 g/dia | CONFERE |
| Ertapenem 1 g 1×/dia | 1 g/dia | 1 g 1×/dia | CONFERE |
| Ciprofloxacino 400 mg 12/12 h | 400–800 mg/dia 12 h | 200–400 mg 12 h (400 mg 8 h se grave) | CONFERE |
| Ampicilina 2 g 4/4 h (enterococo, Listeria) | — | meningite 8–12 g/dia 4/4 h; endocardite 300 mg/kg/dia (máx. 12 g) | CONFERE (HIAE) |
| Pip-tazo 4,5 g 6/6 h (peritonite comunitária, foco desconhecido) | peritonite 3,375 g 6/6 h; 4,5 g 6/6 h só PN | usual 4,5 g 8/8 h; máx. 4,5 g 6/6 h | DIVERGE (app usa a dose máxima dos dois guias) — decisão institucional |
| Meropenem 1 g 8/8 h | 1 g 8 h | 500 mg–2 g 8 h | CONFERE |
| Vancomicina 15–20 mg/kg 12/12 h | 15–20 mg/kg 8–12 h (ataque 25–30 mg/kg) | 15–20 mg/kg 8–12 h | CONFERE |
| Linezolida 600 mg 12/12 h | 400–600 mg 12 h | 600 mg 2×/dia | CONFERE |
| Micafungina 100 mg/dia | 100 mg/dia | 100–150 mg/dia | CONFERE |
| Oxacilina, amoxicilina-clavulanato, azitromicina, clindamicina, rifampicina, penicilina G, dexametasona | sem monografia no material | sem monografia no material | não conferidos |

## 3. Correções e acréscimos feitos (antes → depois)

Nenhum limite de ClCr, intervalo ou dose por faixa foi alterado: todas as faixas conferiram com a bula vigente ou as divergências dos guias decorrem de bulas antigas (imipenem, teicoplanina), de referência terciária (ceftazidima em HD, colistina) ou de prática institucional. Os acréscimos são de segurança/monitorização.

| Arquivo | Droga | Antes | Depois | Fonte |
|---|---|---|---|---|
| `atb.calc.ts` DB | Vancomicina (4 faixas) | sem orientação de infusão | + "Infundir em ≥ 60 min e ≤ 10 mg/min (1 g em 1 h, 2 g em 2 h), diluída a 5 mg/mL (máx. 10 mg/mL), em bomba: infusão rápida causa síndrome do homem vermelho e hipotensão." (constante `VANCO_INF`) | HSL 07/03/2025 (≤ 15 mg/min; 5–10 mg/mL; bomba) + HIAE 09/06/2018 (< 60 min = reação grave) + bula Hospira rev. 10/2021 (≥ 60 min, ≤ 10 mg/min) |
| `atb.calc.ts` DB | Ceftriaxona | "… Não é removida por diálise." | + "Máx. 4 g/dia. Não misturar nem infundir simultaneamente (via Y) com soluções que contêm cálcio." | HSL 15/01/2026 + HIAE 03/04/2023 + bula Hikma |
| `atb.calc.ts` DB | Anfotericina B lipossomal | "… creatinina, K e Mg diários." | + "Diluir só em SG 5% (incompatível com SF 0,9%; lavar o acesso com SG 5%); infundir em 1–2 h." | HSL 30/06/2026 + HIAE 19/06/2024 + bula AmBisome |
| `atb.calc.ts` DB | Linezolida | "… Em DRC grave e uso > 14 dias: vigiar plaquetopenia e anemia." | "… Hemodiálise: dar após a sessão (remove ~30%). Hemograma semanal; em DRC grave e uso > 14 dias: vigiar plaquetopenia e anemia." | HSL 03/03/2017 + HIAE 11/12/2023 + bula Zyvox (itens já no comentário do código) |
| `atb.calc.ts` DB | Daptomicina (2 faixas) | sem monitorização | + "CPK semanal." / "CPK semanal ou mais frequente (DRC eleva o risco de miopatia)." | HIAE 19/07/2025 + bula Cubicin RF |
| `atb.calc.ts` DB | Polimixina B | "Sem ajuste renal: 1,25–1,5 mg/kg IV 12/12 h, ataque 2–2,5 mg/kg. Nefrotóxica…" | + "infundir em 1 h" e "Equivalência: 1 mg = 10.000 UI (a bula e os guias HSL/Einstein dosam 15.000–25.000 UI/kg/dia; HSL máx. 200 mg/dia)." — dose do consenso mantida | HSL 27/01/2026 + HIAE 26/03/2026 + Tsuji 2019 (infusão 1 h) |
| `atb.calc.ts` comentário | Amicacina | "SEM FONTE PRIMÁRIA" | mantido, acrescido: o Manual HIAE (17/02/2025, ref. UpToDate) reproduz os mesmos intervalos; HSL usa outra estrutura | HIAE 17/02/2025 |
| `atb.test.ts` | — | 110 testes | 117 testes: vancomicina (4 faixas), ceftriaxona, anfotericina, linezolida, daptomicina, polimixina B, amicacina; resumo da tela atualizado | — |
| `atb.tsx`, `atb-foco.tsx` | rodapé `<Ref>` | — | + "Conferido com o Guia Farmacêutico do Hospital Sírio-Libanês e o Manual Farmacêutico do Hospital Israelita Albert Einstein (monografias públicas, 11/10/2026)." | — |

## 4. Decisões institucionais (registradas, não alteradas — validar com CCIH / farmácia clínica)

1. **Imipenem — faixas de ClCr.** HSL (2017) e HIAE (2025) usam a tabela antiga da bula (41–70 / 21–40 / 6–20 / ≤ 5 por mg/kg); o app segue a bula vigente (≥ 90 / 60–89 / 30–59 / 15–29 / < 15 não usar salvo HD em 48 h), que é mais restritiva no limite inferior. Manter o app; informar a farmácia da diferença.
2. **Teicoplanina — limiares.** HSL: 40–60 metade, < 40 um terço (SPC antigo); app: 30–80 metade, < 30 um terço (SPC 12/2025). Manter o SPC vigente. HSL acrescenta: > 85 kg usar 6 mg/kg; endocardite/queimados 12 mg/kg/dia; alvo sérico ≥ 10 mg/L.
3. **Polimixina B — dose.** Guias (bula): 15.000–25.000 UI/kg/dia (0,75–1,25 mg/kg 12/12 h), HSL máx. 200 mg/dia; app (Tsuji 2019): 1,25–1,5 mg/kg 12/12 h com ataque 2–2,5 mg/kg. A dose do consenso ultrapassa o teto dos guias; o app agora exibe a equivalência e a faixa dos guias para que a escolha seja consciente.
4. **Colistina — esquema.** HSL segue bula/Lexicomp (1–2 MUI 8/8 h, máx. 6–9 MUI/dia, sem ataque); app segue Nation 2017/Tsuji 2019 (ataque 9 MUI; até 10,9 MUI/dia). CRRT coincide (≈ 440 mg CBA/dia). Decisão a formalizar com a CCIH.
5. **Gentamicina.** Três esquemas: Hartford 7 mg/kg (app), dose única 5 mg/kg/dia reduzida por ClCr (HSL), convencional 3–5 mg/kg/dia 8/8 h com alargamento de intervalo (HIAE). Manter Hartford (fonte primária).
6. **Vancomicina.** Dose unitária máxima 2 g nos dois guias vs ataque até 3 g (Rybak 2020) no app; HSL fixa 24 h em ClCr 20–49 (app 12–24 h). Esquema de partida já marcado como "sem fonte única"; o AUC/nível decide.
7. **Meropenem 1–2 g, daptomicina 6–10 mg/kg, metronidazol 500 mg 8/8 h, pip-tazo 4,5 g 6/6 h fora de pneumonia hospitalar** — já registradas em `4-sepse-infeccao.md` §10; os guias reforçam as doses da bula (meropenem 1 g no HSL; daptomicina 4–6 mg/kg nos dois; pip-tazo 3,375 g 6/6 h no HSL e 4,5 g 8/8 h no HIAE).
8. **Ceftazidima em HD.** App/bula: 1 g ataque + 1 g após cada sessão; HSL (Lexicomp): 0,5–1 g 24 h ou 1–2 g 48–72 h após diálise. Manter a bula.
9. **Metronidazol com ClCr < 10 sem diálise.** HSL "considerar 50 % 12/12 h"; HIAE e bula: sem ajuste, vigiar efeitos. Manter.

## 5. Informações presentes em um só guia (não acrescentadas — sugestões para a farmácia)

- HD/CRRT com dose numérica: amp-sulbactam (HD 1,5–3 g 12–24 h; DP 3 g 24 h), meropenem (HD 500 mg 24 h; CVVH 1 g → 500 mg 8 h), vancomicina (HD 500–1000 mg ou 5–10 mg/kg após sessão; CRRT 1 g 24 h), amicacina (HD 5–7,5 mg/kg 48–72 h; CRRT 10 → 7,5 mg/kg 24–48 h), gentamicina e SMX-TMP em HD — todas só no HSL (ou HSL e HIAE com números diferentes).
- Tempo de infusão / concentração máxima (HSL): amp-sulbactam 15–30 min; pip-tazo 30 min; cefepime 30 min, 40 mg/mL; meropenem 15–30 min (infusão prolongada em críticos), 50 mg/mL; ertapenem 30 min, 20 mg/mL; imipenem 20–30 min (≤ 500 mg) / 40–60 min (≥ 750 mg), "não em push"; ciprofloxacino 60 min; levofloxacino 60 min (250/500) / 90 min (750); fluconazol ≤ 10 mL/min; voriconazol 1–2 h (≤ 3 mg/kg/h), 5 mg/mL; micafungina 1 h; metronidazol ≥ 20 min; SMX-TMP 60–90 min, 1 ampola/75 mL; daptomicina 30 min, 50 mg/mL; amicacina 30–60 min, 5 mg/mL; colistina ≥ 30 min, 75 mg/mL.
- Voriconazol: manutenção 3–4 mg/kg em candidíase invasiva (HSL, HIAE e bula); o app mostra 4 mg/kg (aspergilose).
- Aminoglicosídeos em obesos: calcular pelo peso ideal (HSL, amicacina e gentamicina).
- Ceftazidima-avibactam em HD: HSL aumenta a hemodiálise para 4×/semana para garantir intervalo ≤ 48 h.

## 6. Drogas sem monografia ou sem ajuste renal nos guias

| Droga | HSL | HIAE |
|---|---|---|
| Ampicilina-sulbactam | monografia completa | **sem monografia no material** (arquivo traz só ampicilina; a entrada "SULBACTAM + AMPICILINA", Id 736, existe na lista e não foi baixada) |
| Colistina | monografia completa | **não consta no Manual** |
| Fluconazol | ajuste renal presente | tabela de ajuste renal **ilegível** na conversão |
| Micafungina | **sem seção de ajuste renal** (não necessário) | "não é necessário ajuste" |
| Cefepima, pip-tazo, meropenem, ertapenem, ciprofloxacino, levofloxacino, voriconazol, daptomicina, teicoplanina, anfotericina B lipossomal, ceftazidima-avibactam | ajuste renal presente | campo "Ajuste renal" **vazio** |
| Ceftazidima | ajuste renal presente | só a linha de DP |
| Polimixina B | "não é necessário ajuste" | nota explícita de não adotar o ajuste da bula |
| Oxacilina, amoxicilina-clavulanato, azitromicina, clindamicina, rifampicina, penicilina G (só em `atb-foco`) | não baixadas | não baixadas |

## 7. Verificação

- `cmd /c "npx.cmd tsc --noEmit"` → sem erros.
- `cmd /c "npx.cmd vitest run src/tools/inf"` → 8 arquivos, **117 testes aprovados** (110 anteriores + 7 novos).
- Nenhum outro arquivo foi alterado; sem commit.

## 8. Pendências

1. Baixar a monografia HIAE "SULBACTAM + AMPICILINA" (Id 736) e a tabela renal do fluconazol (Id 357) e completar as duas linhas da tabela.
2. Levar à farmácia clínica as decisões do §4 (imipenem, teicoplanina, polimixina B, colistina, gentamicina, vancomicina ataque > 2 g) e as sugestões do §5 (doses em HD/CRRT e tempos de infusão com fonte única).
3. Avaliar, como produto, um campo "infusão" por droga (tempo e concentração máxima) alimentado pela bula — hoje só vancomicina, anfotericina B lipossomal, polimixina B, colistina e ceftazidima-avibactam trazem essa informação no texto.
