# Auditoria de fórmulas e algoritmos — Plantão

Data: 03/10/2026 · Escopo: as 18 ferramentas do app, comparadas linha a linha com os 9 arquivos originais (`calculadoras.zip`) e com a fonte primária que cada calculadora cita (bula FDA/SPC, diretriz ou artigo original).

**Verificação automática:** `tests/index.html`, 175 testes, todos passando. Os testes rodam o código real do app, e os valores esperados foram calculados à mão a partir das fórmulas publicadas. Para rodar de novo depois de qualquer alteração, abra `tests/index.html` servido por HTTP.

Legenda: **[B]** erro de lógica ou matemática · **[F]** valor divergente da fonte citada · **[S]** proteção de segurança acrescentada · **[V]** item que depende de decisão institucional (ver o fim do documento).

---

## 1. Entrada de dados (afeta todas as calculadoras)

| | Problema | Correção |
|---|---|---|
| [B] | "1.000" (milhar no padrão brasileiro) era lido como **1**. Uma diluição de propofol "1.000 mg" virava 1 mg. | Leitor numérico pt-BR: "1.000" = 1000; "1,5" = 1,5; "1.000,5" = 1000,5; "7.25" = 7,25. Entradas ambíguas ou ilegíveis são recusadas. |
| [S] | Valores impossíveis (peso 7000 kg, pH 72) entravam no cálculo. | Limites de plausibilidade em todos os campos. Fora do limite, o campo fica vermelho e nada é calculado. |
| [B] | Comparação de ponto flutuante: 0,04 UI/min de vasopressina aparecia "acima da faixa". | Arredondamento a 9 casas antes de comparar com as faixas. |

## 2. Drogas vasoativas

- Fórmula de dose (conc × mL/h ÷ 60 ÷ peso) e o modo inverso conferidos (testes 2 e 2b).
- [F] **Dopamina:** cortes 0,5–2 dopaminérgica / 2–10 β1 / 10–20 com efeito α / > 20 α predominante (bula Baxter). O original usava ≤ 5 / 5–10 / > 10.
- [F] **Nitroglicerina:** passou a ser dosada em mcg/min (5–200 habitual; a bula não define máximo). O original usava mcg/kg/min com teto de 10, o que equivale a cerca de 700 mcg/min para 70 kg.
- [S] **Nitroprussiato:** alerta de cianeto acima de 2 mcg/kg/min, e limites da bula para máximo e para TFG < 30.
- Noradrenalina 0,01–3, dobutamina 2–20, milrinona 0,375–0,75 e vasopressina 0,01–0,04: conferidos, sem alteração.

## 3. Sedação e analgesia (fonte citada: SCCM PAD 2013, tabelas 3 e 6)

- [F] **Propofol:** faixa 5–50 mcg/kg/min (o original usava 5–67). O alerta de PRIS (> 4 mg/kg/h) foi mantido.
- [F] **Dexmedetomidina:** faixa 0,2–0,7 mcg/kg/h, com aviso até 1,5 (o original tratava 0,2–1,5 como faixa).
- [F] **Fentanil:** 0,7–10 mcg/kg/h (original 0,5–2).
- [F] **Morfina:** 2–30 mg/h, sem ajuste por peso (original 0,01–0,05 mg/kg/h).
- [F] **Remifentanil:** 0,5–15 mcg/kg/h (original 0,05–2 mcg/kg/min, faixa anestésica). O ataque de 1,5 mcg/kg é opcional pelo PAD; o original dizia "não fazer bolus".
- Midazolam: conferido. Cetamina, sufentanil e BNM: faixas usuais mantidas, sinalizadas como "não constam no PAD".

## 4. Escalas

- **RASS:** descritores revistos conforme Sessler 2002. [F] Meta corrigida para "sedação leve, RASS −2 a 0" (o original dizia −1 a 0; o PADIS aceita até +1).
- **BPS:** descritores conforme Payen 2001. [F] Ponto de corte validado é > 5. A gradação 6–7 "moderada" / ≥ 8 "intensa" do original não é validada e foi retirada.

## 5. Equivalência de opioides

- [F] **Tramadol:** fator 0,2 sobre morfina VO; o original usava 0,1. **Codeína:** fator 0,15; o original usava 0,1. Fonte: CDC 2022. O original subestimava a codeína em 33% e o tramadol em 50%.
- [F] **Fentanil 1:100 com morfina IV** (original 1:120) e **sufentanil 10× o fentanil** (original 8×). Agora a tabela exibida e o cálculo usam os mesmos números.

## 6. Lidocaína

- Doses (1–1,5 mg/kg; repetir 0,5–0,75 mg/kg; máximo 3 mg/kg; infusão 1–4 mg/min): conferidas.
- [F] O texto dizia "após o 2º choque". O algoritmo da AHA 2020/2025 indica o antiarrítmico **após o 3º choque**; a epinefrina vem após o 2º.

## 7. Sepse

- [F] **Choque séptico (Sepsis-3):** lactato **> 2** mmol/L. O original usava ≥ 2: lactato exatamente 2 com vasopressor era classificado como choque.
- [F] **SIRS e ILAS:** foram acrescentados "PaCO₂ < 32", "queda da PAS > 40 mmHg" e o critério respiratório completo (SpO₂ < 90% com O₂, ou P/F < 300).
- [F] **SOFA (pontuação):** conferida item a item com Vincent 1996. A mortalidade agora usa as faixas observadas por Ferreira (JAMA 2001): 0–1: 0%, 2–3: 6,4%, 4–5: 20,2%, 6–7: 21,5%, 8–9: 33,3%, 10–11: 50%, ≥ 12: 95,2%. A tabela do original (e a que eu tinha colocado) não vinha desse artigo. **Ressalva:** as faixas 2–3 e 4–5 foram confirmadas numa fonte secundária que cita o artigo, não na tabela original do JAMA.
- [B] **Bundle:** o contador de itens pendentes mostrava "NaN" no original.
- [F] **Estratégia vasopressora:** passou a seguir o SSC 2021 (vasopressina quando a noradrenalina chega a 0,25–0,5 mcg/kg/min; dopamina não recomendada de rotina).

## 8. Oxigenação e gasometria

- [B] **Berlim:** os cortes estavam deslocados no original. P/F = 300 saía "normal", 200 saía "leve" e 100 saía "moderada". Corrigido para > 300 / 201–300 / 101–200 / ≤ 100.
- [B] **FiO₂:** valores entre 1 e 21 (por exemplo, "5") viravam 0,05 e geravam P/F absurdo. Agora são aceitos 21–100% ou 0,21–1.
- [B] **Compensação respiratória:** quando o HCO₃⁻ ficava *entre* o esperado agudo e o crônico, o original acusava "distúrbio metabólico associado". O correto é **compensação parcial**. Isso valia para acidose e para alcalose.
- [F] **Alcalose metabólica:** PaCO₂ esperada = 0,7 × (HCO₃⁻ − 24) + 40 ± 2 (Berend, NEJM 2014). O original usava 0,7 × HCO₃⁻ + 20 ± 5; essa margem de ±5 não aparece na fonte.
- [S] **Henderson-Hasselbalch:** alerta quando pH, PaCO₂ e HCO₃⁻ são incompatíveis entre si (erro de digitação ou de coleta).
- [S] **Delta-delta:** quando o ânion gap está elevado (Berend 2014).
- Winter, compensação de acidose/alcalose respiratória (1/3,5 e 2/5 por 10 mmHg), ânion gap com correção pela albumina (+2,5 × (4 − alb)) e DO₂/VO₂/extração: conferidos.

## 9. Cetoacidose diabética (fonte citada: ADA 2009, Kitabchi)

- [F] **Na corrigido:** +1,6 por 100 mg/dL (o original usava 2,0).
- [F] **Potássio:** limite superior 5,2 (original 5,3). Com K < 3,3, repor 20–30 mEq/h (original 20–40).
- [F] **Fluidos:** a 1ª hora de SF 0,9% 1 L/h vale para todos. No **choque cardiogênico**, o original prescrevia SF 1 L/h; o algoritmo indica monitorização hemodinâmica e vasopressores.
- [F] **Glicemia que não cai ≥ 10% na 1ª hora:** bolus de 0,14 U/kg EV. O original mandava "dobrar a dose", que é a regra da versão de 2006.
- [F] **Resolução:** glicemia < 200 **e 2 de 3** critérios (o original exigia todos). Sobreposição EV/SC de **1–2 h** (original 2–4 h).
- [B] **Classificação de gravidade:** pH > 7,30 com HCO₃⁻ > 18 era classificado como "CAD leve". Agora o resultado é "sem critério gasométrico". Com critérios discordantes, vale o mais grave.

## 10. Sódio

- [B] **NaCl 3%:** o original usava ΔNa × ACT ÷ 0,513, que ignora o volume infundido. Exemplo: de 118 a 126 com ACT de 42 L dava **655 mL**; o balanço de massa correto dá **868 mL**. Agora o app usa ACT × ΔNa ÷ (513 − Na alvo) e mostra também Adrogué-Madias.
- [B] **Hipernatremia:** o original dava o mesmo volume para SG 5% e SF 0,45%. O SF 0,45% exige cerca do dobro (5,6 L contra 2,8 L no exemplo). Agora os dois volumes são calculados.
- [F] **Classificação da hiponatremia:** leve / moderada / profunda (< 125), conforme a diretriz europeia de 2014.

## 11. TEG

- [F] **K prolongado** passou a indicar hipofibrinogenemia; o original considerava só o ângulo α.
- **LY30 > 3%:** é o limiar do trauma, enquanto o fabricante considera normal até 8%. A diferença foi anotada na tela.

## 12. Ajuste renal de antimicrobianos (fontes: bulas FDA/DailyMed, SPC, consensos)

**Cálculo do clearance**
- [F] Peso ideal pela fórmula exata de Devine (0,9055 por cm; o original usava 0,91).
- [F] **Obesidade:** acima de 130% do peso ideal, o app usa o peso ajustado (ideal + 0,4 × excesso). O original usava o peso ideal, o que subestima o ClCr no obeso.
- [B] O ClCr era exibido arredondado a inteiro enquanto as faixas usavam o valor exato: 29,6 aparecia "30" mas caía na faixa < 30. Agora é exibido com 1 casa decimal.

**Limites das faixas** — [B] o original usava "≥" onde a bula diz ">" (por exemplo, cefepime "> 60", meropenem "> 50", ertapenem "> 30", fluconazol "> 50", ceftazidima-avibactam "> 50 / > 30 / > 15 / > 5"). No valor exato do limite, a dose saía errada. Todos os limites agora seguem a bula e estão cobertos por teste.

**Doses corrigidas**

| Droga | Original | Corrigido (fonte) |
|---|---|---|
| Meropenem ClCr 10–25 / < 10 | 1 g 24/24 h / 0,5 g 24/24 h | metade da dose 12/12 h / metade 24/24 h (bula) |
| Imipenem | tabela antiga | tabela da bula 2022: 500 → 400 → 300 → 200 mg 6/6 h; < 15 não usar salvo HD em 48 h |
| Cefepime 11–29 | "1 g 12/12 h ou 2 g 24 h" | 2 g 24/24 h; HD 1 g 24/24 h pós-sessão (bula) |
| Ceftazidima | 2 g 12/12 → 24/24 → 1 g → 0,5 g 24 h | tabela da bula para 1 g, com +50% em infecção grave; ≤ 5: 48/48 h |
| Ceftazidima-avibactam | nota "≥ 130: 3,75 g" | removida (não existe na bula) |
| Gentamicina / amicacina | reduzia dose **e** intervalo | dose fixa, intervalo 24/36/48 h (Hartford); < 20: guiar por nível |
| Teicoplanina | cortes em 80/50 | SPC: 30–80 metade, < 30 um terço, a partir do 4º dia |
| Vancomicina | ataque 25 mg/kg só em ClCr < 15 | ataque 20–35 mg/kg (máx. 3 g) em todas as faixas; AUC 400–600 (ASHP/IDSA 2020) |
| Colistina | "reduzir ~25% / ~40–50%" | tabela do consenso 2019 (mg CBA/dia por faixa de ClCr), ataque, HD e CRRT |
| Ampicilina-sulbactam < 5 | 3 g 48/48 h | sem recomendação em bula (5–14: 24/24 h) |
| Ciprofloxacino < 30 | 200–400 mg 12–24 h, "nefrotóxico" | 200–400 mg 18–24 h (bula); afirmação de nefrotoxicidade removida |
| Levofloxacino em HD | "250 mg após cada sessão" | sem suplemento pós-HD; mesma dose de ClCr 10–19 (bula) |
| SMX-TMP < 15 | "25% da dose" | uso não recomendado (bula) |
| Ceftriaxona < 10 | "ajuste mínimo" | sem ajuste; máx. 2 g/dia se houver também disfunção hepática (bula) |
| Pip-tazo em HD | "dose extra" | 0,75 g após cada hemodiálise (bula) |

## 13. Fusão com o Delta UTI (03/10/2026)

A gasometria passou a usar um único motor (`assets/js/engine.js`), com a base científica em [PESQUISA.md](PESQUISA.md). As correções desta auditoria foram preservadas no motor novo e os casos do grupo 4 dos testes continuam valendo:
- primário = componente que se desvia de 40/24 na direção do pH; os dois na direção do pH = distúrbio misto;
- compensação parcial entre o esperado agudo e o crônico;
- alcalose metabólica de Berend;
- Henderson-Hasselbalch com tolerância de ± 0,05;
- FiO₂ aceita só 21–100 % ou 0,21–1;
- Berlim com P/F 300 classificado como leve.

O que mudou:
- **Acrescentado:** Stewart (SIDa, SIDe, SIG, BE parcionado), osmolaridade e gap osmolar, Na corrigido, déficit de água livre, S/F e critério de oxigenação da definição global de SDRA 2024, gradiente A-a com pressão barométrica ajustável, índice de oxigenação, ROX, perfusão (gap de CO₂, razão ΔPCO₂/Ca−vO₂, ScvO₂, extração, clearance de lactato pela gasometria anterior), débito (VTI, Fick estimado com alerta de erro de 25–45 %), DO₂/VO₂, RVS/RVP, potência cardíaca, fluido-responsividade (VPP/VVS com condições de validade, PLR, EEO, mini-bolus, VCI, tidal volume challenge), mecânica ventilatória e KDIGO/FeNa/FeUreia.
- **Delta-delta:** passou a ter 4 faixas (< 0,4 / 0,4–0,8 / 0,8–2 / > 2). Com distúrbio respiratório primário, a base do HCO₃⁻ é o esperado agudo, e não 24.
- **Ânion gap:** a referência é ajustável em Ajustes (padrão 12; alto acima de referência + 4).
- **VPP:** o corte é > 13 %, com zona cinzenta de 9–13 %. O corte de 15 % foi refutado na pesquisa.

---

## Itens que dependem de validação institucional [V]

Não alterei estes itens porque são escolhas de protocolo, não erros de fórmula:

1. **ATB empírico por foco:** "PAC moderada-grave: piperacilina-tazobactam + azitromicina". A diretriz ATS/IDSA 2019 indica betalactâmico sem cobertura anti-Pseudomonas (ceftriaxona ou ampicilina-sulbactam) + macrolídeo, reservando pip-tazo para quem tem fator de risco. Confirmar com a CCIH. Na endocardite corrigi, conforme a AHA 2015: estreptococo sensível (penicilina G ou ceftriaxona, ± gentamicina, como 1ª escolha), MRSA em valva nativa (vancomicina sem gentamicina) e valva protética (vancomicina + rifampicina + gentamicina).
2. **Faixas de BNM** (rocurônio, cisatracúrio, vecurônio): mantidas do original. São faixas de titulação pelo TOF.
3. **Diluições padrão** (por exemplo, vasopressina 100 UI/250 mL, dopamina 200 mg/250 mL): mantidas do original. Conferir com o padrão da farmácia do hospital; cada aparelho pode salvar a sua.
4. **Metas de correção do sódio** (aguda +6, crônica +8 mEq/L em 24 h): mantidas do original. Estão dentro das diretrizes (4–8; limite 10–12).

**Recomendação:** a tabela de ajuste renal foi conferida contra as bulas oficiais, mas, por se tratar de prescrição, deve ser revisada e assinada pela farmácia clínica antes do uso assistencial.
