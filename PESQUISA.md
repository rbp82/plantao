# Fase 1 — Parâmetros de maior interesse em UTI adulto (base da calculadora)

Pesquisa de 3/out/2026: 5 ângulos de busca, 25 fontes, 118 afirmações extraídas e 25 verificadas por 3 votos adversariais (23 confirmadas, 2 refutadas).
Legenda: **[V]** = verificado nesta pesquisa · **[R]** = fórmula clássica de referência (livro-texto/diretriz), não passou pela verificação adversarial.

---

## 1. Perfusão e oferta de O2

| Cálculo | Fórmula | Corte / alvo | Nível |
|---|---|---|---|
| PAM | (PAS + 2·PAD)/3 | ≥ 65 mmHg inicial no choque séptico (SSC 2021, forte/moderada) | [V] |
| Índice de choque | FC/PAS | > 0,9–1,0 = alterado | [R] |
| CaO2 / CvO2 | 1,34·Hb·Sat + 0,0031·PO2 | CaO2 normal ≈ 16–22 mL/dL | [R] |
| DO2 / DO2I | DC·CaO2·10 (÷ASC) | DO2I ≈ 500–600 mL/min/m² | [R] |
| VO2 | DC·(CaO2−CvO2)·10 | VO2I ≈ 110–160 mL/min/m² | [R] |
| TEO2 | (CaO2−CvO2)/CaO2 | 20–30 % normal; > 30–40 % = oferta insuficiente | [R] |
| ScvO2 | medida | ≥ 70 % (SvO2 ≥ 65 %) | [V] (corte usado nos estudos de gap) |
| **Gap de CO2 (Pv-aCO2)** | PvCO2 − PaCO2 | **≥ 6 mmHg = alto**. Persistir alto com ScvO2 ≥ 70 % → RR de morte em 28 d ≈ 2,2–2,4 | [V] Ospina-Tascón, Crit Care 2013 |
| Pv-aCO2/Ca-vO2 | ΔPCO2 / (CaO2−CvO2) | > 1,4 = sugere metabolismo anaeróbio | [V] parcial (evidência fraca; 1,8 de um estudo de 2026 descartado) |
| Clearance de lactato | (L0−L1)/L0·100 | queda guia a ressuscitação (SSC 2021, fraca) | [V] |
| Tempo de enchimento capilar | medido | > 3 s = alterado; adjuvante (SSC 2021/2026; ANDROMEDA-SHOCK-2) | [V] |
| Débito cardíaco (VTI) | π·(dVSVE/2)²·VTI·FC | IC 2,5–4,0 L/min/m²; VTI < 15 cm = baixo | [R] |
| Débito cardíaco (Fick estimado) | VO2 estimado (LaFarge/Dehmer) / (CaO2−CvO2) | **erro de 25–45 % vs termodiluição → só tendência** | [V] JACC Adv 2025; Herz 2023 |
| Potência cardíaca (CPO) | PAM·DC/451 | < 0,6 W = pior prognóstico no choque cardiogênico | [R] |
| RVS / RVP | 80·(PAM−PVC)/DC · 80·(PAPm−POAP)/DC | RVS 800–1200; RVP < 250 dyn·s·cm⁻⁵ | [R] |

ESICM 2025 (Monnet et al., ICM 51:1971): com cateter central, medir ScvO2 e Pv-aCO2 de forma seriada (boa prática não graduada, sem número de corte) **[V]**.

## 2. Responsividade a volume (ESICM 2025 e SSC 2021: preferir índices dinâmicos)

| Teste | Positivo se | Condições / limitações | Nível |
|---|---|---|---|
| PLR | ΔDC ou ΔVTI ≥ 10 % | medir no DC/VTI, não na pressão arterial | [V] |
| EEO 15 s | ΔDC ≥ 5 % (monitor contínuo) | com eco: EEO + EIO, soma ≥ 13 %; inviável com esforço respiratório | [V] |
| Mini-bolus 100–150 mL | ΔDC ≥ 5 % (contorno de pulso) | VTI só detecta mudança ≥ ~10–12 % | [V] |
| VPP | > 12–13 % (zona cinzenta 9–13 %) | só vale com VM controlada, Vt ≥ 8 mL/kg, ritmo sinusal, tórax fechado, FC/FR > 3,6 | [R] (o corte de 15 % foi **refutado**) |
| VVS | > 10–12 % | mesmas condições da VPP | [R] |
| Tidal volume challenge | ΔVPP ≥ 3,5 % ao passar Vt de 6 para 8 mL/kg | corrige o Vt baixo | [R] |
| Distensibilidade da VCI (VM) | (máx−mín)/mín > 18 % | baixa acurácia em ventilação espontânea | [R] |

AUROCs agrupadas (33 estudos, 1.352 pacientes): EEO 0,92 · VtC 0,92 · VVS 0,90 · VCI 0,86 · PLR 0,84 · mini-bolus 0,84 · VPP 0,82 **[V]**.

## 3. Gasometria — Boston (Henderson-Hasselbalch) [R]

- Consistência: [H+] = 24·PaCO2/HCO3 deve bater com 10^(9−pH).
- Acidose metabólica (Winter): PaCO2 esperada = 1,5·HCO3 + 8 ± 2.
- Alcalose metabólica: PaCO2 esperada = 0,7·HCO3 + 21 ± 2.
- Acidose respiratória: HCO3 sobe 1 (aguda) ou 3,5 (crônica) a cada 10 mmHg de PaCO2.
- Alcalose respiratória: HCO3 cai 2 (aguda) ou 4–5 (crônica) a cada 10 mmHg.
- Ânion gap = Na − (Cl + HCO3); AG corrigido = AG + 2,5·(4 − albumina em g/dL).
- Delta ratio = (AGc − 12)/(24 − HCO3): < 0,4 acidose hiperclorêmica · 0,4–0,8 mista · 0,8–2 AG alto puro · > 2 AG alto + alcalose metabólica.
- SBE = 0,9287·[HCO3 − 24,4 + 14,83·(pH − 7,40)].

## 4. Gasometria — Stewart [R] (fórmulas confirmadas nas fontes extraídas, sem verificação adversarial)

- SIDa = Na + K + 2·Ca²⁺ + 2·Mg²⁺ − Cl − lactato (≈ 40–42 mEq/L).
- SIDe (Figge) = HCO3 + Alb(g/L)·(0,123·pH − 0,631) + Fosfato(mmol/L)·(0,309·pH − 0,469).
- SIG = SIDa − SIDe (normal < 2).
- BE parcionado (Story/Gilfix): BE(Na−Cl) = Na − Cl − 38; BE(alb) = 0,25·(42 − Alb em g/L); BE(lactato) = −(lactato − 1); BE(íons não medidos) = SBE − soma dos anteriores.
- BJA 2026: o parcionamento simplificado falha in vivo, então serve como ferramenta de raciocínio e não como medida exata.

## 5. Oxigenação e ventilação [R]

- PAO2 = FiO2·(Patm − 47) − PaCO2/0,8; gradiente A-a = PAO2 − PaO2 (esperado ≈ idade/4 + 4).
- P/F; S/F (válido com SpO2 ≤ 97 %); índice de oxigenação = FiO2·Paw·100/PaO2.
- SDRA, definição global 2024 (Matthay, AJRCCM 209:37):
  - intubado: leve 200 < P/F ≤ 300 (S/F 235–315); moderada 100–200 (S/F 148–235); grave ≤ 100 (S/F ≤ 148);
  - não intubado (CNAF ≥ 30 L/min ou VNI com PEEP ≥ 5): P/F ≤ 300 ou S/F ≤ 315.
- ROX = (SpO2/FiO2)/FR: ≥ 4,88 = menor risco de intubação; < 2,85 (2 h), < 3,47 (6 h) ou < 3,85 (12 h) = falha provável.
- Peso predito (ARDSNet): homem 50 + 0,91·(altura − 152,4); mulher 45,5 + 0,91·(altura − 152,4). Vt de 6 mL/kg.
- Driving pressure = Pplat − PEEP (< 15 cmH2O); Cst = Vt/ΔP; resistência = (Ppico − Pplat)/fluxo.
- Ventilatory ratio = VE·PaCO2/(PBW·100·37,5): > 2 = espaço morto alto.
- Mechanical power (simplificado) = 0,098·FR·Vt(L)·(Ppico − ΔP/2): > 17 J/min = associado a mortalidade.

## 6. Renal e eletrólitos [R]

- CKD-EPI 2021 sem raça (não vale em IRA ou sem estado estável); Cockcroft-Gault; estágio KDIGO pela razão Cr/Cr basal e pela diurese em mL/kg/h.
- Osmolaridade = 2·Na + glicose/18 + ureia/6; gap osmolar = medida − calculada (> 10).
- Na corrigido pela glicemia: Katz +1,6 e Hillier +2,4 a cada 100 mg/dL acima de 100.
- Déficit de água livre = ACT·(Na/140 − 1).
- Ca corrigido = Ca + 0,8·(4 − albumina). FeNa < 1 % = pré-renal; FeUreia < 35 % = pré-renal.

## Refutado na verificação
- "Corte de VPP/VVS ≥ 15 %": usar 12–13 % com zona cinzenta.
- A classificação dos índices em "excelente/bom" atribuída à meta-análise de 2021.

## Fontes principais
Monnet, Shi e Teboul, Ann Intensive Care 2022;12:46 · Alvarado Sánchez, Ann Intensive Care 2021;11:28 · Joseph, ICM 2024;50:1850 (HEMOPRED) · Monnet, ICM 2025;51:1971 (ESICM) · Evans, ICM 2021 (SSC 2021) · Ospina-Tascón, Crit Care 2013;17:R294 · Palanques-Tost, JACC Adv 2025 · Herz 2023 (PMC10830659) · Gavelli, Teboul e Monnet, J Thorac Dis 2019 · Wooten, Crit Care 2004 (Stewart) · Story, BJA 2004 · Matthay, AJRCCM 2024.

> Ferramenta de apoio à decisão: os cortes vêm de populações específicas e não substituem o julgamento clínico.
