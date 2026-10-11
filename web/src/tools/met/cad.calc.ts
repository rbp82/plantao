/* Cetoacidose diabética — lógica pura (portada de assets/js/tools/met.js, tela "cad").
   Fonte primária: Umpierrez GE et al. Hyperglycemic Crises in Adults With Diabetes: A Consensus Report (ADA/EASD/JBDS/AACE/DTS).
   Diabetes Care 2024;47(8):1257–1275 — PMID 39052901 — doi:10.2337/dci24-0032 (versão Diabetologia 2024;67:1455–1479, PMID 38907161).
   Substitui Kitabchi AE et al. Diabetes Care 2009;32:1335 (PMID 19564476), mantido onde o consenso 2024 não traz número
   (marcado "ADA 2009"). Limiares e textos auditados (AUDITORIA.md; docs/auditoria-2026-10/5-cad-sodio-teg-acls.md). */
import { C, type Cls } from '@/lib/calc';

export type Volemia = 'leve' | 'grave' | 'choque';
export type Via = 'iv' | 'sc';
export type SimNao = 'sim' | 'nao';

export interface CadInputs {
  peso: number; gl: number; ph: number; hc: number; k: number; na: number;
  vol: Volemia; via: Via; diu: SimNao; oral: SimNao;
}

/* texto de passo: pode conter <b>…</b> (texto próprio, sem entrada do usuário) */
export type Item = [Cls, string];
export interface VerdictM { cls: Cls; kicker: string; title: string; desc: string }

export type CadModel =
  | { kind: 'idle'; missing: string[]; summary: '' }
  | { kind: 'none'; verdict: VerdictM; summary: string }
  | {
    kind: 'cad';
    sev: 'leve' | 'moderada' | 'grave'; naC: number;
    verdict: VerdictM; alerts: Item[];
    fluidos: Item[]; potassio: Item[]; insulina: Item[]; bicarbonato: Item[]; monitorizacao: Item[];
    summary: string;
  };

/* Limiares do consenso 2024 (Umpierrez 2024, texto e Table 2):
   K⁺ < 3,5 mmol/L → repor 10 mmol/h e adiar a insulina até K⁺ > 3,5 · repor (20–30 mmol/L) quando K⁺ < 5,0 · bicarbonato só se pH < 7,0 ·
   glicemia < 250 mg/dL → acrescentar glicose 5–10 % e reduzir a insulina para 0,05 U/kg/h · CAD euglicêmica = glicemia < 200 mg/dL. */
export const CAD_K_BAIXO = 3.5;
export const CAD_K_ALTO = 5.0;
export const CAD_PH_BIC = 7.0;
export const CAD_GL_DEXTROSE = 250;
export const CAD_GL_EUGLICEMICA = 200;

const f1 = (n: number) => C.fmt(n, 1), f2 = (n: number) => C.fmt(n, 2), f0 = (n: number) => C.fmt(n, 0);
const r1 = (x: number) => C.fmt(Math.round(x * 10) / 10, 1);

export function computeCad(i: CadInputs): CadModel {
  const { peso, gl, ph, hc, k, na, vol, via, diu, oral } = i;
  const miss = ([[peso, 'peso'], [gl, 'glicemia'], [ph, 'pH'], [hc, 'HCO₃'], [k, 'K⁺'], [na, 'Na⁺']] as [number, string][]).filter(([x]) => !Number.isFinite(x)).map(([, l]) => l);
  if (miss.length) return { kind: 'idle', missing: miss, summary: '' };

  /* gravidade (Umpierrez 2024, Table 2): leve pH 7,25 a < 7,30 e HCO₃⁻ 15–18 · moderada pH 7,00 a < 7,25 e HCO₃⁻ 10 a < 15 · grave pH < 7,00 e HCO₃⁻ < 10.
     Critério de acidose do diagnóstico: pH < 7,30 ou HCO₃⁻ < 18. Com critérios discordantes, vale o mais grave.
     pH ≥ 7,30 e HCO₃⁻ > 18 = sem critério gasométrico. */
  const sPh = ph < 7.0 ? 3 : ph < 7.25 ? 2 : ph < 7.30 ? 1 : 0; /* 7,25 ≤ pH < 7,30 = leve; 7,00 ≤ pH < 7,25 = moderada (Kitabchi 2009 Tab. 1; Umpierrez 2024 Tab. 2: leve 7,25–7,30, moderada 7,00 a < 7,25) */
  const sHc = hc < 10 ? 3 : hc < 15 ? 2 : hc <= 18 ? 1 : 0;
  const sv = Math.max(sPh, sHc);
  if (sv === 0) {
    return {
      kind: 'none',
      verdict: { cls: 'ok', kicker: 'Classificação', title: 'Sem critério gasométrico de CAD', desc: `pH ${f2(ph)} (≥ 7,30) e HCO₃⁻ ${f1(hc)} (> 18). Considerar estado hiperglicêmico hiperosmolar ou outra causa.` },
      summary: `Sem critério gasométrico de CAD (glicemia ${f0(gl)}, pH ${f2(ph)}, HCO₃ ${f1(hc)}).`,
    };
  }
  const sev = (['', 'leve', 'moderada', 'grave'] as const)[sv] as 'leve' | 'moderada' | 'grave';
  /* Na corrigido: + 1,6 mEq/L a cada 100 mg/dL de glicose acima de 100 (Umpierrez 2024, mesma correção da ADA 2009) */
  const naC = na + 1.6 * (gl - 100) / 100;
  const verdict: VerdictM = { cls: sev === 'leve' ? 'warn' : 'crit', kicker: 'Classificação', title: `CAD ${sev}`, desc: `pH ${f2(ph)} · HCO₃⁻ ${f1(hc)} · Na corrigido ${f1(naC)} mEq/L` };

  const alerts: Item[] = [];
  if (sPh === 0 || sHc === 0) alerts.push(['warn', 'Só um dos critérios gasométricos está alterado — confirmar cetonemia (β-hidroxibutirato ≥ 3,0 mmol/L ou cetonúria ≥ 2+).']);
  if (gl < CAD_GL_EUGLICEMICA) alerts.push(['warn', '<b>Glicemia < 200:</b> CAD euglicêmica (iSGLT2, gestação, jejum prolongado, etilismo) — o diagnóstico vale com história de diabetes + cetose + acidose.']);
  if (k < CAD_K_BAIXO) alerts.push(['crit', '<b>K⁺ < 3,5:</b> não iniciar insulina até corrigir o potássio. Risco de arritmia e PCR.']);
  if (ph < CAD_PH_BIC) alerts.push(['crit', '<b>pH < 7,0:</b> considerar bicarbonato.']);
  if (diu === 'nao') alerts.push(['warn', 'Diurese inadequada: <b>não repor K⁺ EV</b> até diurese ≥ 50 mL/h.']);
  if (sev === 'grave') alerts.push(['crit', '<b>CAD grave:</b> UTI e investigar precipitante (infecção, IAM, pancreatite).']);

  const fluidos: Item[] = [];
  fluidos.push(['info', `<b>Primeiras 2–4 h: SF 0,9% ou cristaloide balanceado 500–1000 mL/h</b> (≈ ${f0(peso * 15)}–${f0(peso * 20)} mL/h a 15–20 mL/kg/h), sem comprometimento renal ou cardíaco.`]);
  if (vol === 'choque') fluidos.push(['crit', '<b>Choque cardiogênico:</b> monitorização hemodinâmica e vasopressores; volume guiado por avaliação hemodinâmica.']);
  else if (vol === 'grave') fluidos.push(['info', '<b>Hipovolemia grave:</b> manter SF 0,9% 1 L/h.']);
  else fluidos.push(['info', `Depois, corrigir o déficit estimado em 24–48 h (ADA 2009: 250–500 mL/h), guiado por PA, FC, balanço e Na⁺ (corrigido ${f1(naC)}). <b>SF 0,45% só se a osmolalidade não cair</b> apesar de balanço positivo e insulina adequados.`]);
  fluidos.push(['warn', '<b>Glicemia < 250 mg/dL:</b> acrescentar glicose 5–10% ao SF 0,9% e reduzir a insulina para 0,05 U/kg/h, até resolver a cetoacidose.']);

  /* potássio (Umpierrez 2024): < 3,5 segura insulina e repõe 10 mmol/h até > 3,5; < 5,0 repõe 20–30 mmol/L de soro (meta 4–5); ≥ 5,0 não repõe */
  const potassio: Item[] = [];
  if (diu === 'nao') potassio.push(['crit', '<b>Aguardar diurese ≥ 50 mL/h</b> antes de repor K⁺.']);
  if (k < CAD_K_BAIXO) potassio.push(['crit', '<b>Segurar a insulina.</b> Repor 10 mmol K⁺/h EV até K⁺ > 3,5.']);
  else if (k < CAD_K_ALTO) potassio.push(['info', '<b>20–30 mmol de K⁺ em cada litro</b> de soro para manter K⁺ 4–5.']);
  else potassio.push(['warn', 'K⁺ ≥ 5,0: <b>não repor</b>. Dosar K⁺ 2 h após o início da insulina e a cada 4 h.']);
  /* Limites de preparo/segurança do KCl 19,1% (2,56 mEq/mL; ampola 10 mL = 25,6 mEq) — conferidos em 11/10/2026 (docs/auditoria-2026-10/6c-…):
     Guia Farmacêutico HSL (16/04/2026): "SOMENTE … APÓS DILUIÇÃO", vesicante; concentração máxima periférica 10 mEq/100 mL, central 20–40 mEq/100 mL;
     velocidade máxima periférica 10 mEq/h, central 40 mEq/h. Manual Farmacêutico HIAE (24/08/2024): alta vigilância (MAVi), urgência "até 20 mEq/hora",
     monitorização cardíaca; assistolia/FV com administração rápida. Não altera a dose do consenso 2024 (20–30 mmol/L; 10 mmol/h): 20–30 mmol ÷ 2,56 = 7,8–11,7 mL. */
  if (k < CAD_K_ALTO) potassio.push(['warn', '<b>KCl 19,1%</b> (2,56 mEq/mL; ampola 10 mL = 25,6 mEq; 20–30 mmol ≈ 8–12 mL por litro): alta vigilância, vesicante — <b>sempre diluído, nunca em bolus</b>. Veia periférica: ≤ 10 mEq/100 mL e ≤ 10 mEq/h; acima disso só por acesso central com monitorização cardíaca contínua (Guia HSL 16/04/2026: até 40 mEq/h; Manual HIAE 24/08/2024: até 20 mEq/h).']);

  const insulina: Item[] = [];
  let insTxt = '';
  if (k < CAD_K_BAIXO) { insulina.push(['crit', '<b>Insulina suspensa</b> até K⁺ > 3,5 mEq/L.']); insTxt = 'insulina suspensa (K < 3,5)'; }
  else if (via === 'iv') {
    insulina.push(['info', `<b>Infusão ${r1(peso * 0.1)} U/h</b> de insulina regular EV (0,1 U/kg/h, taxa fixa) — a 1 U/mL, ${r1(peso * 0.1)} mL/h.`]);
    insulina.push(['', `Bolus ${r1(peso * 0.1)} U (0,1 U/kg) IV ou IM só se houver atraso no acesso venoso.`]);
    /* Preparo — Guia Farmacêutico HSL, Insulina regular humana (27/01/2026): "diluir cada 100 UI em 100 mL de SF 0,9% sem PVC (equipo e soro)", concentração
       máxima 1 U/mL, alta vigilância; contraindicação: hipoglicemia. Manual Farmacêutico HIAE, Insulina humana regular (16/02/2026): MAVi, diluir em SF e
       administrar em bomba de infusão, preparo por 2 profissionais, equipo convencional (com PVC) desprezando 20 mL para saturar, estabilidade 24 h.
       Os guias divergem na estratégia contra adsorção (sem PVC vs. saturar o equipo) → remete à padronização local. A dose de CAD do HSL (0,14 U/kg/h,
       ajuste 0,02–0,05, meta 150–200 = ADA 2009) NÃO foi adotada: prevalece o consenso 2024 (0,1 U/kg/h). Hipocalemia como contraindicação não consta nos guias. */
    insulina.push(['warn', '<b>Preparo (alta vigilância, dupla checagem):</b> insulina regular 100 U em 100 mL de SF 0,9% (1 U/mL, concentração máxima) em bomba de infusão; estável por 24 h. Adsorção ao plástico: o HSL usa soro e equipo sem PVC; o HIAE usa equipo convencional e despreza 20 mL da solução para saturá-lo — seguir a padronização da farmácia (Guia HSL 27/01/2026; Manual HIAE 16/02/2026).']);
    insTxt = `insulina regular EV ${r1(peso * 0.1)} U/h (bolus ${r1(peso * 0.1)} U se atraso no acesso)`;
  } else {
    insulina.push(['info', `<b>${r1(peso * 0.3)} U</b> de análogo rápido SC agora (0,3 U/kg — ADA 2009; o consenso 2024 só fixa o intervalo de 1–2 h, em CAD leve/moderada não complicada).`]);
    insulina.push(['info', `Após 1 h: <b>${r1(peso * 0.2)} U</b> SC (0,2 U/kg), depois 0,2 U/kg a cada 2 h.`]);
    insTxt = `análogo rápido SC ${r1(peso * 0.3)} U, depois ${r1(peso * 0.2)} U 2/2 h`;
  }
  if (k >= CAD_K_BAIXO) {
    insulina.push(['warn', via === 'iv'
      ? `<b>Glicemia não caiu ≥ 10% na 1ª hora</b> (ADA 2009; sem regra no consenso 2024): bolus EV de 0,14 U/kg (${r1(peso * 0.14)} U) e manter o esquema.`
      : '<b>Glicemia não caiu ≥ 10% na 1ª hora:</b> reavaliar via e dose (considerar insulina EV).']);
    insulina.push(['warn', `<b>Glicemia < 250 mg/dL:</b> reduzir para 0,05 U/kg/h EV (${r1(peso * 0.05)} U/h) com glicose 5–10% no soro, ou 0,1 U/kg SC 2/2 h (ADA 2009), até resolver a cetoacidose.`]);
  }
  if (oral === 'sim') {
    insulina.push(['ok', '<b>Transição:</b> basal-bolus SC; manter a insulina EV por 1–2 h após a 1ª dose SC (basal).']);
    insulina.push(['ok', `Virgem de insulina: 0,5–0,6 U/kg/dia (≈ ${f0(peso * 0.5)}–${f0(peso * 0.6)} U/dia, divididas); ~0,3 U/kg/dia (≈ ${f0(peso * 0.3)} U) se doença renal ou fragilidade.`]);
  }

  /* Preparo/segurança do NaHCO₃ 8,4% (1 mEq/mL) — conferido em 11/10/2026. Guia Farmacêutico HSL (25/07/2018): diluir (puro só em PCR); infusão em acidose
     metabólica 2–8 h, taxa máxima 1 mEq/kg/h; vesicante — adulto em veia periférica só até 10 mL por 50 mL de diluente (10 mEq/60 mL ≈ 167 mEq/L = 1,4%, isotônico).
     Manual Farmacêutico HIAE (25/06/2021): extravasamento → necrose tecidual; não administrar catecolaminas no mesmo cateter (inativação); monitorar pH/gasometria.
     A solução do consenso 2024/ADA 2009 (100 mmol em 400 mL de água = 100 mL + 400 mL = 200 mEq/L) fica acima do limite periférico do HSL (12,5 mL/50 mL):
     a nota sugere acesso central ou 500 mL de água (= 1,4%). Tempo mínimo = max(2 h, 100 mmol ÷ peso) pela taxa máxima do HSL. Dose do consenso mantida. */
  const bicarbonato: Item[] = ph < CAD_PH_BIC ? [
    ['crit', '<b>Considerar (pH < 7,0).</b>'],
    ['info', '<b>100 mmol de NaHCO₃ 8,4%</b> em 400 mL de água (isotônico), a cada 2 h até pH > 7,0 (ADA 2009 acrescentava 20 mEq de KCl).'],
    ['warn', `<b>Preparo:</b> 8,4% = 1 mEq/mL (100 mmol = 100 mL). Infundir em ≥ ${f1(Math.max(2, 100 / peso))} h (Guia HSL: acidose metabólica em 2–8 h, máx. 1 mEq/kg/h). Vesicante: em veia periférica ≤ 10 mL de 8,4% por 50 mL de diluente — 100 mmol em 400 mL (200 mEq/L) excede um pouco esse limite: preferir acesso central ou 500 mL de água (1,4%, isotônico). Não infundir na mesma via de catecolaminas (inativação). Guia HSL 25/07/2018; Manual HIAE 25/06/2021.`],
    ['warn', 'Risco: hipocalemia, edema cerebral, acidose paradoxal do SNC. Dosar K⁺ a cada 2 h.'],
  ] : [['ok', 'pH ≥ 7,0 — <b>não indicado</b> (uso de rotina não recomendado).']];

  const monitorizacao: Item[] = ([
    ['info', 'Glicemia capilar a cada <b>1–2 h</b>; eletrólitos, fosfato, creatinina, β-hidroxibutirato e pH venoso a cada <b>4 h</b> até a resolução.'],
    ['info', 'K⁺ 2 h após o início da insulina e depois a cada 4 h.'],
    ['warn', '<b>Precipitante:</b> infecção (hemograma, culturas, RX), IAM (ECG, troponina), pancreatite, abandono de insulina, iSGLT2.'],
    ['ok', '<b>Resolução:</b> β-hidroxibutirato < 0,6 mmol/L <b>e</b> pH venoso ≥ 7,3 <b>ou</b> HCO₃⁻ ≥ 18; idealmente glicemia < 200 mg/dL.'],
    ['', 'Não usar o ânion gap como critério de resolução (acidose hiperclorêmica pelo SF 0,9%). HCO₃⁻ pode normalizar antes do pH — guiar pela gasometria venosa.'],
  ] as (Item | null)[]).filter((x): x is Item => !!x);

  const summary = `CAD ${sev} (glicemia ${f0(gl)}, pH ${f2(ph)}, HCO₃ ${f1(hc)}, K ${f1(k)}, Na ${f0(na)} / corrigido ${f1(naC)}). Peso ${C.fmtN(peso)} kg. ` +
    `Hidratação: SF 0,9% ou balanceado 500–1000 mL/h nas primeiras 2–4 h, depois ${vol === 'choque' ? 'guiada por monitorização hemodinâmica (choque cardiogênico)' : vol === 'grave' ? 'SF 0,9% 1 L/h' : 'corrigir o déficit em 24–48 h guiado por PA, FC, balanço e Na (SF 0,45% só se a osmolalidade não cair)'}. ` +
    `K: ${k < CAD_K_BAIXO ? 'repor 10 mmol/h, insulina suspensa' : k < CAD_K_ALTO ? '20–30 mmol/L de soro' : 'não repor'}${diu === 'nao' ? ' (aguardar diurese)' : ''}. ` +
    `Insulina: ${insTxt}. Bicarbonato: ${ph < CAD_PH_BIC ? 'considerar (100 mmol a cada 2 h até pH > 7,0)' : 'não indicado'}.`;

  return { kind: 'cad', sev, naC, verdict, alerts, fluidos, potassio, insulina, bicarbonato, monitorizacao, summary };
}

/* texto visível do resultado (equivalente ao innerText de #cOut do app anterior) — usado nos testes */
export function cadText(m: CadModel): string {
  /* só as marcas <b>…</b> que rich() reconhece — o texto clínico usa "<" literal ("K⁺ < 3,5") */
  const strip = (s: string) => s.replace(/<\/?b>/g, '');
  if (m.kind === 'idle') return `Aguardando Faltam: ${m.missing.join(', ')} A conduta aparece assim que todos os campos forem preenchidos.`;
  const parts: string[] = [m.verdict.kicker, m.verdict.title, m.verdict.desc];
  if (m.kind === 'cad') {
    parts.push(...m.alerts.map(([, t]) => strip(t)));
    ([['Fluidos', m.fluidos], ['Potássio', m.potassio], ['Insulina', m.insulina], ['Bicarbonato', m.bicarbonato], ['Monitorização', m.monitorizacao]] as [string, Item[]][])
      .forEach(([t, items]) => parts.push(t, ...items.map(([, s]) => strip(s))));
  }
  return parts.join('\n');
}
