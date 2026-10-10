# PCR em adultos — base do módulo "PCR guiada (ACLS)"

Fonte principal: **AHA 2025 Guidelines for CPR and ECC, Part 9 — Adult Advanced Life Support** (Circulation 2025;152(Suppl 2):S538–S577, DOI 10.1161/CIR.0000000000001376), lida em cpr.heart.org.
Complementos: Partes 7 (BLS adulto), 10 (circunstâncias especiais) e 11 (pós-PCR), além do algoritmo em versão texto. Classe e nível de evidência entre parênteses.
Pesquisa feita em 03/10/2026. Marcado **[2025]** o que mudou em relação a 2020.

## Algoritmo (como o app guia): caixas da Figure 2 da Part 9
O app reproduz as setas do algoritmo oficial e mostra em cada passo a caixa correspondente e o trecho literal da diretriz, tocando em "fonte".

| Caixa | Texto oficial | No app |
|---|---|---|
| 1 | Start CPR • bag-mask ventilation, oxygen • attach monitor/defibrillator | início |
| 3 / 5 / 7 | Deliver shock | choque (1º, 2º e 3º da sequência) |
| 4 | CPR 2 minutes • IV/IO access | após o 1º choque |
| 6 | CPR 2 minutes • Epinephrine every 3 to 5 minutes • Consider advanced airway, capnography | após o 2º choque e após cada choque que vem da caixa 8 |
| 8 | CPR 2 minutes • Amiodarone or lidocaine • Treat reversible causes | após o 3º choque. Na figura, a seta da caixa 8 volta ao losango → 5 → 6 → 7 → 8; a 2ª passagem (após o 5º choque) recebe a 2ª dose da barra lateral |
| 9 | Asystole/PEA. Give Epinephrine ASAP | 1º ritmo não chocável |
| 10 | CPR 2 minutes • IV/IO access • Epinephrine every 3 to 5 minutes • Consider advanced airway, capnography | ritmo não chocável vindo das caixas 1, 4, 6, 8 ou 11 (via caixa 12) |
| 11 | CPR 2 minutes • Treat reversible causes | ritmo não chocável vindo da caixa 10 |
| 12 | Sem RCE → caixa 10; RCE → pós-PCR; considerar a adequação de continuar | RCE ou nova checagem |

- **Adrenalina:** "1 milligram every 3 to 5 minutes". O texto acrescenta: "operationally, administering epinephrine every second cycle of CPR, after the initial dose, meets this recommendation". Por isso o app só sugere adrenalina nas caixas 6, 9 e 10.
- **Amiodarona:** 300 mg em bolus e depois 150 mg. **Lidocaína:** 1–1,5 mg/kg e depois 0,5–0,75 mg/kg. Ambas 2b, B-R. Os textos AHA 2025 **não trazem dose máxima de lidocaína** e **não fixam em texto o momento da 2ª dose**; o app usa o fluxo da figura e avisa isso na fonte.
- **Energia:** bifásico conforme o fabricante (ex.: 120–200 J); se desconhecida, a máxima. Choques seguintes iguais ou maiores. Monofásico 360 J. O app pergunta a energia no 1º choque e não assume valor padrão.
- **TV polimórfica:** choque não sincronizado na energia máxima (1).
- **Acesso [2025]:** IV primeiro (1, A); IO se o IV falhar (2a, A); central se ambos falharem (2b). A via endotraqueal saiu da diretriz.
- **Via aérea:** BVM ou via aérea avançada conforme a habilidade da equipe (2b). Não interromper compressões para isso. Com via aérea avançada, 1 ventilação a cada 6 s e compressões contínuas. Capnografia confirma o tubo (1).
- **Qualidade da RCP:**
  - frequência 100–120/min; profundidade ≥ 5 cm, sem passar de 6 cm; retorno total do tórax;
  - fração de compressão ≥ 60 %; troca do compressor a cada 2 min; 30:2 sem via aérea avançada.
- **ETCO₂:**
  - < 10 mmHg = RCP inadequada ou mau prognóstico; mirar ≥ 10, idealmente ≥ 20 mmHg;
  - aumento súbito (> 10 mmHg) pode indicar RCE (2b). O valor "≥ 40 mmHg" **não consta** em 2025.
- **Pressão diastólica com PAI [2025]:** não há valor-alvo para adultos.
- **Causas reversíveis:** hipovolemia, hipóxia, H⁺ (acidose), hipo/hipercalemia, hipotermia, pneumotórax hipertensivo, tamponamento, toxinas, trombose pulmonar e trombose coronária.

## Sem benefício de rotina (3)
- Bicarbonato, cálcio e magnésio de rotina.
- Vasopressina, isolada ou com adrenalina **[2025]**.
- Adrenalina em alta dose.
- Marcapasso na PCR.
- Compressor mecânico de rotina. Pode ser usado quando a RCP manual é difícil ou perigosa (2b).
- RCP com cabeça elevada (head-up).

## Utilidade não estabelecida (2b)
- Troca de vetor e desfibrilação dupla sequencial após 3 ou mais choques **[2025]**.
- Outros antiarrítmicos.
- Esteroides.
- POCUS para causas, desde que não interrompa a RCP.

## Situações especiais
- **Hipercalemia:** cálcio com efetividade não estabelecida (2b) **[2025]**; bicarbonato (2b). Doses de cálcio e de bicarbonato não constam. Insulina regular 10 U IV em 15–30 min + glicose 50 g (Tabela 3; 2b).
- **Tricíclicos e bloqueadores de canal de sódio, cocaína, anestésicos locais:** bicarbonato, 50–150 mEq na dose adulta da Tabela 4 (a coluna de 1–3 mEq/kg é a pediátrica).
- **Intoxicação por betabloqueador ou bloqueador de canal de cálcio:** cloreto de cálcio 2 g (20 mL a 10 %) ou gluconato 6 g (60 mL a 10 %) (Tabela 4).
- **Opioide:** naloxona 0,2–2 mg IV/IO/IM, repetida a cada 2–3 min (Tabela 4, indicação geral para opioide).
- **Torsades com QT longo:** magnésio (2b). A dose não consta na AHA 2025 nem no update de 2018, então o app não mostra dose.
- **TEP:** confirmada, trombólise ou embolectomia (2a); suspeita, trombólise (2b); ECLS (2a).
- **Hipotermia:** 1 choque e adiar choques e adrenalina até ≥ 30 °C (2b).
- **Gestante:** desvio uterino para a esquerda (1); parto de ressuscitação em até 5 min (1).
- **Opioide:** naloxona se não atrapalhar a RCP (2b).

## Término dos esforços
- **Intubado:** ETCO₂ ≤ 10 mmHg após 20 min de ACLS, só como parte de uma decisão multimodal (2b). Em não intubado, não usar corte de ETCO₂ (3: dano).

## Pós-PCR (Parte 11)
- **Hemodinâmica:** PAM ≥ 65 mmHg (1) **[2025: alvo de PAS removido]**.
- **Oxigênio e ventilação:** FiO₂ 100 % até medir a saturação com confiança; depois SpO₂ 90–98 % (PaO₂ 60–105) (2a) **[2025]**. PaCO₂ 35–45 mmHg (1).
- **Temperatura:** controle em 32–37,5 °C por ≥ 36 h em quem não obedece comandos (1 / 2a) **[2025]**.
- **Exames:** ECG de 12 derivações (1); cateterismo de emergência no supra de ST (1) ou em choque, arritmia ou isquemia (2a). Considerar TC da cabeça à pelve e eco **[2025]**.
- **Glicemia:** 70–180 mg/dL (2b).
- **EEG:** precoce em quem não obedece comandos (1).
- **Prognóstico:** multimodal, ≥ 72 h após normotermia e suspensão de sedativos (2a).

## Ainda não confirmados em fonte primária 2025
- Dose de magnésio na torsades: não exibida no app.
- Momento da 2ª dose do antiarrítmico: derivado do fluxo gráfico da figura e sinalizado no app.
- Glicose para hipoglicemia e dose máxima de lidocaína: não constam e foram removidas do app.
- Recomendação geral de ECPR em PCR refratária (vem do update de 2023).

## Links
- ALS: https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-advanced-life-support
- Algoritmo em texto: https://cpr.heart.org/-/media/CPR-Files/CPR-Guidelines-Files/2025-Accessible/Algorithm-ACLS-CA-LngDscrp-250725-Ed.pdf
- Pós-PCR: https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/post-cardiac-arrest-care
- Circunstâncias especiais: https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-and-pediatric-special-circumstances-of-resuscitation
- Comparação ERC/RCUK 2025: https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/adult-advanced-life-support-guidelines
