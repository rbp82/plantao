# Auditoria clínica — 11/10/2026 — resumo e correções

Escopo: **todas** as fórmulas, limiares, faixas de dose e condutas do Plantão (v5.1.0): motor de gasometria/hemodinâmica/ventilação/renal (`web/src/lib/engine.ts`, 63 itens), núcleo (`core/num.ts`, `core/renal.ts`, `core/infMath.ts`), 18 calculadoras (`web/src/tools/**`), leitos (`lib/beds.ts`) e PCR guiada (`lib/pcr.ts`).

Método: cada item foi transcrito número a número, comparado com a **fonte primária** (artigo original, diretriz ou bula FDA/DailyMed e SPC) e verificado no **PubMed** (metadados, PMID e DOI; texto integral via PMC quando disponível), com busca de publicações 2020–2026 que corroborassem ou modificassem o valor. Resultado por item: CONFERE, DIVERGE (corrigido) ou DECISÃO INSTITUCIONAL (escolha entre fontes aceitáveis — não alterada, registrada). Nenhum PMID foi escrito de memória: quando a busca não devolveu o artigo, o item ficou marcado "não localizado na busca". Cada fórmula ficou com ao menos uma referência completa **no código** (objeto `REF` do motor, comentários nos módulos de cálculo) **e na tela** (rodapé `Ref` de cada calculadora).

Relatórios por domínio (tabelas completas, decisões institucionais e itens em aberto):

1. [Gasometria, ácido-base, oxigenação e SDRA](1-gasometria-oxigenacao.md)
2. [Hemodinâmica, perfusão, débito, fluido-responsividade, ventilação e renal](2-hemodinamica-ventilacao-renal.md)
3. [Vasoativas, sedação/analgesia, escalas, opioides e lidocaína](3-vasoativas-sedacao-opioides.md)
4. [Sepse, SOFA, bundle, perfusão, oxigenação, ATB por foco e ajuste renal de antimicrobianos](4-sepse-infeccao.md)
5. [Cetoacidose diabética, sódio, tromboelastograma e PCR guiada](5-cad-sodio-teg-acls.md)

Verificação automática após a auditoria: `tsc --noEmit` sem erros; **643 testes** no Vitest (30 novos, cada um citando a fonte).

## Correções aplicadas no código (antes → depois · fonte)

### Gasometria e oxigenação
| Item | Antes → Depois | Fonte |
|---|---|---|
| Compensação da acidose respiratória **crônica** | HCO₃ sobe 3,5 → **4** mEq/L por 10 mmHg de PaCO₂ (banda ± 2 mantida) | Berend K et al., N Engl J Med 2014;371:1434 (PMID 25295502): 4–5 por 10 mmHg; González SB, Adrogué HJ, Madias NE et al., Kidney Int Rep 2018;3:1163 (PMID 30197983): 0,476 mEq/L por mmHg em estudo prospectivo |
| SDRA grave pela P/F | `< 100` → **`≤ 100`** (P/F = 100 saía "moderada") | Ranieri VM et al., JAMA 2012;307:2526 (PMID 22797452); Matthay MA et al., AJRCCM 2024 (PMID 37487152) |
| Índice de oxigenação grave | `> 16` → **`≥ 16`** | Emeriaud G et al., PALICC-2, Pediatr Crit Care Med 2023;24:143 (PMID 36661420) |
| Nota do Na corrigido | texto reescrito fiel ao achado de Hillier (2,4 médio; 1,6 até 400 mg/dL) | Hillier TA et al., Am J Med 1999;106:399 (PMID 10225241) |

### Hemodinâmica e renal
| Item | Antes → Depois | Fonte |
|---|---|---|
| **Fick estimado em mulheres** (VO₂ por LaFarge) | `138,1 − 17,04 − 11,49·ln(idade) + 0,378·FC` → **`138,1 − 17,04·ln(idade) + 0,378·FC`** (o 17,04 é o coeficiente de ln(idade), não uma constante; o DC estimado em mulheres saía 5–9 % alto) | LaFarge CG, Miettinen OS. Cardiovasc Res 1970;4:23 (PMID 5416840); transcrita em Reiter T et al., Herz 2023 (PMID 37439804) |
| FeUreia pré-renal | `< 35 %` → **`≤ 35 %`** | Carvounis CP et al., Kidney Int 2002;62:2223 (PMID 12427149) |

### Vasoativas
| Item | Antes → Depois | Fonte |
|---|---|---|
| Alerta de vasopressina na noradrenalina | só acima de 1 mcg/kg/min → **aviso a partir de 0,25 mcg/kg/min** (associar vasopressina em vez de escalar); "alta dose" acima de 1 mantido | Evans L et al., SSC 2021, Crit Care Med 2021;49:e1063 (PMID 34605781), rec. 38; Auchet T et al., 2017 (PMID 28425079) |

### Infecção
| Item | Antes → Depois | Fonte |
|---|---|---|
| Cefepime em hemodiálise | "1 g 24/24 h" → **1 g no 1º dia, depois 500 mg 24/24 h (neutropenia febril: 1 g 24/24 h), após a sessão** | Bula cefepime (Hospira), DailyMed setId e80c27e2-164d-4836-ba24-c160d75dc5d3, rev. 11/2024 |
| SMX-TMP dose habitual IV | "TMP 5 mg/kg/dia" → **8–10 mg/kg/dia em 6/6–12/12 h (PCP: 15–20)** | Bula SMX-TMP IV (Teva), DailyMed setId 640f5b0c-748d-4a68-a1de-59cc3e00ed49, rev. 4/2025 |
| Piperacilina-tazobactam em diálise peritoneal | suplemento pós-sessão indevido → **DP: 2,25 g 8/8 h sem suplemento** (HD mantém 0,75 g pós-sessão) | Bula Zosyn (Baxter), DailyMed setId 8db6bd91-2106-4bfd-8cc8-38aaf1e18d17, rev. 5/2026 |
| Candidemia suspeita | "fluconazol ou equinocandina" → **equinocandina (1ª escolha); fluconazol só se não crítico e sem azol recente** | Pappas PG et al., IDSA 2016, Clin Infect Dis 2016;62:e1 (PMID 26679628) |

### Cetoacidose diabética (consenso ADA/EASD/JBDS/AACE/DTS 2024 substitui ADA 2009)
Fonte: Umpierrez GE et al., Diabetes Care 2024;47:1257 (PMID 39052901; DOI 10.2337/dci24-0032) / Diabetologia 2024;67:1455 (PMID 38907161) — texto integral conferido pelo integrador para potássio, bicarbonato, insulina, dextrose e fluidos.
| Item | Antes → Depois |
|---|---|
| Potássio baixo | segurar insulina se K < 3,3 e repor 20–30 mEq/h → **segurar se K < 3,5 e repor 10 mmol/h até > 3,5**; repor 20–30 mmol/L se 3,5 ≤ K < 5,0; não repor se ≥ 5,0; dosar K 2 h após a insulina e a cada 4 h |
| Bicarbonato | se pH < 6,9 → **considerar se pH < 7,0** (100 mmol em 400 mL a cada 2 h até pH > 7,0) |
| Dextrose | glicemia 200 → **< 250 mg/dL**: glicose 5–10 % no SF 0,9 % e insulina **0,05 U/kg/h** |
| Insulina | bolus de rotina → **infusão fixa 0,1 U/kg/h; bolus 0,1 U/kg só se atraso no acesso venoso** |
| Fluidos | 1 L/h na 1ª hora → **SF 0,9 % ou cristaloide balanceado 500–1000 mL/h nas primeiras 2–4 h**; 0,45 % só se a osmolalidade não cair |
| CAD euglicêmica | glicemia ≤ 250 → **< 200 mg/dL** |
| Critério de acidose | pH ≤ 7,30 → **pH < 7,30** (faixas de gravidade mantidas: leve 7,25 a < 7,30; moderada 7,00 a < 7,25; grave < 7,00) |
| Resolução | glicemia < 200 e 2 de 3 (HCO₃, pH, AG) → **β-OHB < 0,6 mmol/L e pH ≥ 7,3 ou HCO₃ ≥ 18**; AG não é critério |
| Transição SC | 0,5–0,8 U/kg/dia → **0,5–0,6 U/kg/dia (~0,3 em doença renal/fragilidade)** |

### Sódio e TEG
| Item | Antes → Depois | Fonte |
|---|---|---|
| SIADH refratário | "tolvaptana ou demeclociclina" → **ureia VO 0,25–0,5 g/kg/dia ou diurético de alça + NaCl**; lítio/demeclociclina não recomendados; tolvaptana só por protocolo local | Spasovski G et al., ESE 2014, Eur J Endocrinol 2014;170:G1 (PMID 24569125); Verbalis JG et al., Am J Med 2013 (PMID 24074529) |
| TEG LY30 (hiperfibrinólise) | `> 3 %` → **`≥ 3 %`**; nota do fabricante "até 8 %" → 0–7,4 % | Chapman MP et al., J Trauma Acute Care Surg 2013;75:961 (PMID 24256667) |
| TEG condutas | crio ~1 U/10 kg → **fibrinogênio 3–4 g ≈ crio 15–20 U se ≤ 1,5 g/L**; plaquetas 4–6 → **4–8 U**, alvo > 50 (> 100 no TCE) ×10⁹/L | Rossaint R et al., Crit Care 2023;27:80 (PMID 36859355), rec. 29–30 |

### PCR guiada (ACLS)
Nenhuma divergência numérica. Todas as doses, tempos e metas pós-RCE conferidas verbatim nas diretrizes AHA 2025: Parte 9 (ALS adulto) Wigginton JG et al., Circulation 2025;152(16 Suppl 2):S538 (PMID 41122884; DOI 10.1161/CIR.0000000000001376); Parte 7 (BLS) PMID 41122888; Parte 10 (circunstâncias especiais) PMID 41122889; Parte 11 (pós-PCR) PMID 41122894; e AHA 2020 Parte 3, Panchal AR et al. (PMID 33081529). Citações gravadas em `pcr.ts` (`CITATIONS`) e impressas no relatório da PCR.

## Decisões institucionais a confirmar
As escolhas entre fontes aceitáveis não foram alteradas e estão listadas em cada relatório. As de maior impacto:
- ~~Meta de PAM 70–80 mmHg em hipertensos crônicos~~ → **DECIDIDO (11/10/2026): PAM alvo 65 mmHg para todos** (SSC 2021; SEPSISPAM, Asfar P et al., NEJM 2014), individualizável só pela PAM alvo da ficha do paciente. Hb alvo 8–9 (SSC: 7 com exceções) segue em aberto.
- Esquemas empíricos de PAC moderada-grave (pip-tazo + azitromicina) e PAV "precoce" (ATS/IDSA 2019 e IDSA 2016 preferem outros esquemas) — validar com a CCIH.
- ~~Teto de correção do sódio 10–12 mEq/L/24 h~~ → **DECIDIDO (11/10/2026): teto 10 mEq/L em 24 h, 8 em alto risco de desmielinização** (ESE 2014, Spasovski; Sterns & Rondon-Berrios 2025), aplicado em `sodio.calc.ts`.
- Vasopressina até 0,04 UI/min (bula até 0,07; SSC 0,03 fixo); propofol crítico em 4 mg/kg/h; sufentanil 10× vs 7,5× o fentanil.
- Tabela de ajuste renal de antimicrobianos: conferida contra as bulas; **assinatura da farmácia clínica** antes do uso assistencial continua recomendada.

## Itens em aberto
Textos integrais não acessíveis para verificação número a número: LaFarge 1970 (via Reiter 2023), Winter 1967, Katz 1973, Fig. 1 de Ferreira 2001 (mortalidade por faixa de SOFA, sustentada pelo texto "≤ 9 → < 33 %" e "> 11 → 95 %"), faixas R/K/α/MA do fabricante do TEG (Scarpelini 2009 anotado). Não implementados: critério S/F ≤ 315 da definição global de SDRA 2024 e correção automática da pressão barométrica.

## Revisão cruzada com guias institucionais (11/10/2026)
As monografias públicas do Guia Farmacêutico do Hospital Sírio-Libanês (guiafarmaceutico.hsl.org.br) e do Manual Farmacêutico do Hospital Israelita Albert Einstein (aplicacoes.einstein.br/manualfarmaceutico) foram baixadas para 52 fármacos do app e comparadas número a número: [6a vasoativas e sedação](6a-guias-hsl-einstein-vasoativas-sedacao.md), [6b antimicrobianos](6b-guias-hsl-einstein-antimicrobianos.md), [6c eletrólitos e insulina](6c-guias-hsl-einstein-eletrolitos-insulina.md).
