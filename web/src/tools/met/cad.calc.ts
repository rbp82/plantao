/* Cetoacidose diabética — lógica pura (portada de assets/js/tools/met.js, tela "cad").
   Kitabchi AE et al. Diabetes Care 2009;32:1335 (ADA) · UpToDate. Limiares e textos auditados (AUDITORIA.md). */
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

const f1 = (n: number) => C.fmt(n, 1), f2 = (n: number) => C.fmt(n, 2), f0 = (n: number) => C.fmt(n, 0);
const r1 = (x: number) => C.fmt(Math.round(x * 10) / 10, 1);

export function computeCad(i: CadInputs): CadModel {
  const { peso, gl, ph, hc, k, na, vol, via, diu, oral } = i;
  const miss = ([[peso, 'peso'], [gl, 'glicemia'], [ph, 'pH'], [hc, 'HCO₃'], [k, 'K⁺'], [na, 'Na⁺']] as [number, string][]).filter(([x]) => !Number.isFinite(x)).map(([, l]) => l);
  if (miss.length) return { kind: 'idle', missing: miss, summary: '' };

  /* gravidade (ADA 2009): leve pH 7,25–7,30 e HCO₃⁻ 15–18 · moderada pH 7,00–7,24 e HCO₃⁻ 10–14,9 · grave pH < 7,00 e HCO₃⁻ < 10.
     Com critérios discordantes, vale o mais grave. pH > 7,30 e HCO₃⁻ > 18 = sem critério gasométrico. */
  const sPh = ph < 7.0 ? 3 : ph < 7.25 ? 2 : ph <= 7.30 ? 1 : 0;
  const sHc = hc < 10 ? 3 : hc < 15 ? 2 : hc <= 18 ? 1 : 0;
  const sv = Math.max(sPh, sHc);
  if (sv === 0) {
    return {
      kind: 'none',
      verdict: { cls: 'ok', kicker: 'Classificação', title: 'Sem critério gasométrico de CAD', desc: `pH ${f2(ph)} (> 7,30) e HCO₃⁻ ${f1(hc)} (> 18). Considerar estado hiperglicêmico hiperosmolar ou outra causa.` },
      summary: `Sem critério gasométrico de CAD (glicemia ${f0(gl)}, pH ${f2(ph)}, HCO₃ ${f1(hc)}).`,
    };
  }
  const sev = (['', 'leve', 'moderada', 'grave'] as const)[sv] as 'leve' | 'moderada' | 'grave';
  /* Na corrigido (ADA 2009): + 1,6 mEq/L a cada 100 mg/dL de glicose acima de 100 */
  const naC = na + 1.6 * (gl - 100) / 100;
  const verdict: VerdictM = { cls: sev === 'leve' ? 'warn' : 'crit', kicker: 'Classificação', title: `CAD ${sev}`, desc: `pH ${f2(ph)} · HCO₃⁻ ${f1(hc)} · Na corrigido ${f1(naC)} mEq/L` };

  const alerts: Item[] = [];
  if (sPh === 0 || sHc === 0) alerts.push(['warn', 'Só um dos critérios gasométricos está alterado — confirmar cetonemia e ânion gap.']);
  if (gl <= 250) alerts.push(['warn', '<b>Glicemia ≤ 250:</b> considerar CAD euglicêmica (iSGLT2, gestação, jejum prolongado).']);
  if (k < 3.3) alerts.push(['crit', '<b>K⁺ < 3,3:</b> não iniciar insulina até corrigir o potássio. Risco de arritmia e PCR.']);
  if (ph < 6.9) alerts.push(['crit', '<b>pH < 6,9:</b> bicarbonato indicado.']);
  if (diu === 'nao') alerts.push(['warn', 'Diurese inadequada: <b>não repor K⁺ EV</b> até diurese ≥ 50 mL/h.']);
  if (sev === 'grave') alerts.push(['crit', '<b>CAD grave:</b> considerar UTI e investigar precipitante (infecção, IAM, pancreatite).']);

  const fluidos: Item[] = [];
  fluidos.push(['info', `<b>1ª hora: SF 0,9% 1 L/h</b> (15–20 mL/kg/h ≈ ${f0(peso * 15)}–${f0(peso * 20)} mL/h), na ausência de comprometimento cardíaco.`]);
  if (vol === 'choque') fluidos.push(['crit', '<b>Choque cardiogênico:</b> monitorização hemodinâmica e vasopressores; volume guiado por avaliação hemodinâmica.']);
  else if (vol === 'grave') fluidos.push(['info', '<b>Hipovolemia grave:</b> manter SF 0,9% 1 L/h.']);
  else fluidos.push(['info', naC > 145 ? `Na corrigido ${f1(naC)} (alto): <b>SF 0,45% 250–500 mL/h</b>.` : `Na corrigido ${f1(naC)} (normal ou baixo): <b>SF 0,9% 250–500 mL/h</b>.`]);
  fluidos.push(['warn', '<b>Glicemia 200 mg/dL:</b> trocar para SG 5% + SF 0,45% 150–250 mL/h.']);

  /* potássio (ADA 2009): < 3,3 segura insulina e repõe 20–30 mEq/h; 3,3–5,2 repõe 20–30 mEq/L de soro; > 5,2 não repõe */
  const potassio: Item[] = [];
  if (diu === 'nao') potassio.push(['crit', '<b>Aguardar diurese ≥ 50 mL/h</b> antes de repor K⁺.']);
  if (k < 3.3) potassio.push(['crit', '<b>Segurar a insulina.</b> Repor 20–30 mEq K⁺/h EV até K⁺ > 3,3.']);
  else if (k <= 5.2) potassio.push(['info', '<b>20–30 mEq de K⁺ em cada litro</b> de soro para manter K⁺ 4–5.']);
  else potassio.push(['warn', 'K⁺ > 5,2: <b>não repor</b>. Dosar K⁺ a cada 2 h.']);

  const insulina: Item[] = [];
  let insTxt = '';
  if (k < 3.3) { insulina.push(['crit', '<b>Insulina suspensa</b> até K⁺ > 3,3 mEq/L.']); insTxt = 'insulina suspensa (K < 3,3)'; }
  else if (via === 'iv') {
    insulina.push(['info', `<b>Bolus ${r1(peso * 0.1)} U</b> de insulina regular EV (0,1 U/kg).`]);
    insulina.push(['info', `<b>Infusão ${r1(peso * 0.1)} U/h</b> (0,1 U/kg/h).`]);
    insulina.push(['', `Sem bolus: ${r1(peso * 0.14)} U/h (0,14 U/kg/h).`]);
    insTxt = `insulina regular EV bolus ${r1(peso * 0.1)} U + ${r1(peso * 0.1)} U/h`;
  } else {
    insulina.push(['info', `<b>${r1(peso * 0.3)} U</b> de análogo rápido SC agora (0,3 U/kg).`]);
    insulina.push(['info', `Após 1 h: <b>${r1(peso * 0.2)} U</b> SC (0,2 U/kg), depois 0,2 U/kg a cada 2 h.`]);
    insTxt = `análogo rápido SC ${r1(peso * 0.3)} U, depois ${r1(peso * 0.2)} U 2/2 h`;
  }
  if (k >= 3.3) {
    insulina.push(['warn', via === 'iv'
      ? `<b>Glicemia não caiu ≥ 10% na 1ª hora:</b> bolus EV de 0,14 U/kg (${r1(peso * 0.14)} U) e manter o esquema.`
      : '<b>Glicemia não caiu ≥ 10% na 1ª hora:</b> reavaliar via e dose (considerar insulina EV).']);
    insulina.push(['warn', `<b>Glicemia 200 mg/dL:</b> reduzir para 0,02–0,05 U/kg/h EV (${r1(peso * 0.02)}–${r1(peso * 0.05)} U/h) ou 0,1 U/kg SC 2/2 h. Manter 150–200 mg/dL.`]);
  }
  if (oral === 'sim') {
    insulina.push(['ok', '<b>Transição:</b> basal-bolus SC; manter a insulina EV por 1–2 h após a 1ª dose SC.']);
    insulina.push(['ok', `Virgem de insulina: 0,5–0,8 U/kg/dia (≈ ${f0(peso * 0.5)}–${f0(peso * 0.8)} U/dia, divididas).`]);
  }

  const bicarbonato: Item[] = ph < 6.9 ? [
    ['crit', '<b>Indicado (pH < 6,9).</b>'],
    ['info', '<b>100 mmol de NaHCO₃</b> em 400 mL de água + 20 mEq KCl, em 2 h.'],
    ['warn', 'Repetir a cada 2 h até pH > 7,0. Dosar K⁺ a cada 2 h.'],
  ] : [['ok', 'pH ≥ 6,9 — <b>não indicado</b>.']];

  const monitorizacao: Item[] = ([
    ['info', 'Eletrólitos, ureia, creatinina, pH venoso e glicemia a cada <b>2–4 h</b>.'],
    ['warn', '<b>Precipitante:</b> infecção (hemograma, culturas, RX), IAM (ECG, troponina), pancreatite, abandono de insulina.'],
    k > 5.2 ? ['warn', 'K⁺ > 5,2: dosar a cada 2 h.'] : null,
    ['ok', '<b>Resolução:</b> glicemia < 200 mg/dL <b>e</b> 2 dos 3: HCO₃⁻ ≥ 15, pH venoso > 7,3, ânion gap ≤ 12.'],
    ['', 'HCO₃⁻ pode normalizar antes do pH — guiar pela gasometria venosa.'],
  ] as (Item | null)[]).filter((x): x is Item => !!x);

  const summary = `CAD ${sev} (glicemia ${f0(gl)}, pH ${f2(ph)}, HCO₃ ${f1(hc)}, K ${f1(k)}, Na ${f0(na)} / corrigido ${f1(naC)}). Peso ${C.fmtN(peso)} kg. ` +
    `Hidratação: SF 0,9% 1 L/h na 1ª hora, depois ${vol === 'choque' ? 'guiada por monitorização hemodinâmica (choque cardiogênico)' : vol === 'grave' ? 'SF 0,9% 1 L/h' : (naC > 145 ? 'SF 0,45%' : 'SF 0,9%') + ' 250–500 mL/h'}. ` +
    `K: ${k < 3.3 ? 'repor 20–30 mEq/h, insulina suspensa' : k <= 5.2 ? '20–30 mEq/L de soro' : 'não repor'}${diu === 'nao' ? ' (aguardar diurese)' : ''}. ` +
    `Insulina: ${insTxt}. Bicarbonato: ${ph < 6.9 ? 'indicado (100 mmol em 2 h)' : 'não indicado'}.`;

  return { kind: 'cad', sev, naC, verdict, alerts, fluidos, potassio, insulina, bicarbonato, monitorizacao, summary };
}

/* texto visível do resultado (equivalente ao innerText de #cOut do app anterior) — usado nos testes */
export function cadText(m: CadModel): string {
  const strip = (s: string) => s.replace(/<[^>]+>/g, '');
  if (m.kind === 'idle') return `Aguardando Faltam: ${m.missing.join(', ')} A conduta aparece assim que todos os campos forem preenchidos.`;
  const parts: string[] = [m.verdict.kicker, m.verdict.title, m.verdict.desc];
  if (m.kind === 'cad') {
    parts.push(...m.alerts.map(([, t]) => strip(t)));
    ([['Fluidos', m.fluidos], ['Potássio', m.potassio], ['Insulina', m.insulina], ['Bicarbonato', m.bicarbonato], ['Monitorização', m.monitorizacao]] as [string, Item[]][])
      .forEach(([t, items]) => parts.push(t, ...items.map(([, s]) => strip(s))));
  }
  return parts.join('\n');
}
