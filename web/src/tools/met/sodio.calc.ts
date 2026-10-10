/* Distúrbios do sódio — lógica pura (portada de assets/js/tools/met.js, C.sodium + tela "sodio").
   Balanço de massa em sistema fechado; fórmulas idênticas às auditadas (AUDITORIA.md). */
import { C, type Cls } from '@/lib/calc';

/* ---------- helpers (antes C.sodium) ---------- */
/* mL de NaCl 3% (513 mEq/L) para levar Na de na0 a na1 */
export const vol3 = (tbw: number, na0: number, na1: number) => tbw * (na1 - na0) / (513 - na1) * 1000;
/* Adrogué-Madias: variação do Na por 1 L de infusão */
export const adrogue = (naInf: number, na: number, tbw: number) => (naInf - na) / (tbw + 1);
/* déficit de água livre (L) até 140 */
export const waterDeficit = (tbw: number, na: number) => tbw * (na / 140 - 1);
/* L de água livre (SG 5%) para baixar de na0 a na1 */
export const volFree = (tbw: number, na0: number, na1: number) => tbw * (na0 / na1 - 1);
/* L de SF 0,45% (77 mEq/L) para baixar de na0 a na1 */
export const volHalf = (tbw: number, na0: number, na1: number) => tbw * (na0 - na1) / (na1 - 77);

/* ---------- modelo ---------- */
export type Sexo = 'm' | 'f' | 'i' | 'if';
export type Tempo = 'aguda' | 'cronica';
export type Sintomas = 'leve' | 'moderado' | 'grave';
export type Volemia = 'hipo' | 'eu' | 'hiper';

export interface SodioInputs {
  na: number;
  gl: number;        /* opcional: NaN quando ausente */
  peso: number;
  sx: Sexo;
  tempo: Tempo;
  sint: Sintomas;
  vol: Volemia;
}

/* texto de passo: pode conter <b>…</b> (texto próprio, sem entrada do usuário) */
export type Item = [Cls, string];
export interface VerdictM { cls: Cls; kicker: string; title: string; desc: string }
export interface ReadoutM { label: string; value: string; unit: string; cls?: Cls; status?: string; note?: string; big?: boolean; span2?: boolean }

export const TBW_FACTOR: Record<Sexo, number> = { m: 0.6, f: 0.5, i: 0.5, if: 0.45 };

export type SodioModel =
  | { kind: 'idle'; missing: string[]; summary: '' }
  | {
    kind: 'hipo';
    tbw: number; nae: number; corr: string | null; grau: 'leve' | 'moderada' | 'profunda';
    alvo: number; v3: number; t3: number; dL: number; usa3: boolean;
    verdict: VerdictM; readouts: ReadoutM[]; conduta: Item[]; mielinolise: Item[]; summary: string;
  }
  | {
    kind: 'hiper';
    tbw: number; nae: number; corr: string | null; grau: 'leve' | 'moderada' | 'moderada-grave' | 'grave';
    def: number; maxC: number; alvo: number; sg5: number; s045: number;
    verdict: VerdictM; readouts: ReadoutM[]; conduta: Item[]; alertas: Item[]; summary: string;
  }
  | { kind: 'normal'; tbw: number; nae: number; corr: string | null; verdict: VerdictM; summary: string };

const f1 = (n: number) => C.fmt(n, 1), f0 = (n: number) => C.fmt(n, 0);

export function computeSodio(i: SodioInputs): SodioModel {
  const { na, gl, peso, sx, tempo, sint, vol } = i;
  if (!C.ok(na, peso)) {
    return { kind: 'idle', missing: [!Number.isFinite(peso) && 'peso', !Number.isFinite(na) && 'Na⁺'].filter(Boolean) as string[], summary: '' };
  }
  const tbw = peso * TBW_FACTOR[sx];
  let nae = na, corr: string | null = null;
  if (gl > 100) { nae = na + 2.4 * (gl - 100) / 100; corr = `<b>Na⁺ corrigido pela glicemia:</b> ${f1(nae)} mEq/L (glicemia ${f0(gl)}).`; }
  const aguda = tempo === 'aguda';

  if (nae < 135) {
    const alvo = Math.min(nae + (aguda ? 6 : 8), 135);
    const v3 = vol3(tbw, nae, alvo), t3 = v3 / 24;
    const dL = adrogue(513, nae, tbw);
    /* classificação bioquímica — Spasovski G et al. Eur J Endocrinol 2014: leve 130–134,9 · moderada 125–129,9 · profunda < 125 */
    const grau = nae < 125 ? 'profunda' : nae < 130 ? 'moderada' : 'leve';
    const usa3 = sint === 'grave' || (sint === 'moderado' && aguda);
    const verdict: VerdictM = {
      cls: nae < 125 ? 'crit' : 'warn', kicker: 'Hiponatremia ' + grau, title: `Na⁺ ${f1(nae)} mEq/L`,
      desc: `Meta: ${f1(alvo)} mEq/L em 24 h · ${aguda ? 'aguda: elevar 4–6 mEq/L rapidamente se sintomática' : 'crônica: elevar 4–8 mEq/L em 24 h (máx. 10–12; 8 se alto risco de desmielinização)'}`,
    };
    const readouts: ReadoutM[] = [
      { label: 'Água corporal total', value: f1(tbw), unit: 'L' },
      { label: '1 L de NaCl 3% eleva', value: f1(dL), unit: 'mEq/L', note: 'Adrogué-Madias' },
    ];
    if (usa3) readouts.push({ label: 'NaCl 3% · manutenção para a meta', value: f0(t3), unit: 'mL/h', cls: 'crit', big: true, span2: true, status: `${f0(v3)} mL em 24 h → ${f1(alvo)} mEq/L (sem contar perdas)` });
    let conduta: Item[];
    if (usa3) conduta = [['crit', '<b>NaCl 3% indicado.</b>'], ['crit', '<b>Bolus 150 mL IV em 20 min</b> — repetir até 3× (checando Na⁺ entre os bolus) até melhora ou alta de 5 mEq/L.'], ['info', `Depois, se necessário, ~${f0(t3)} mL/h até a meta.`], ['warn', 'Dosar Na⁺ a cada 2 h nas primeiras horas.']];
    else if (vol === 'hipo') conduta = [['info', 'SF 0,9% para restaurar a volemia.'], ['', 'Corrigir a causa (vômitos, diarreia, diurético).'], ['warn', 'Sem melhora após expansão → reavaliar etiologia.']];
    else if (vol === 'eu') conduta = [['info', 'Restrição hídrica: 500–800 mL/dia abaixo da diurese.'], ['', 'Investigar SIADH: TSH, cortisol, osmolalidade urinária.'], ['', 'Refratário: tolvaptana ou demeclociclina.']];
    else conduta = [['info', 'Restrição hídrica e de sódio.'], ['info', 'Furosemida para balanço negativo.'], ['', 'Tratar a causa (ICC, cirrose, síndrome nefrótica).']];
    const mielinolise: Item[] = [
      ['crit', 'Não ultrapassar <b>10–12 mEq/L em 24 h</b> (forma crônica).'],
      ['warn', 'Correção excessiva: SG 5% + desmopressina 2–4 mcg IV.'],
      ['warn', 'Risco maior: desnutrição, etilismo, hipocalemia (K⁺ < 3,5).'],
      ['info', 'Dosar Na⁺ a cada 4–6 h durante a correção.'],
    ];
    const summary = `Hiponatremia ${grau} (Na ${f1(nae)} mEq/L${gl > 100 ? ', corrigido pela glicemia' : ''}), ${aguda ? 'aguda' : 'crônica/indeterminada'}, ${{ hipo: 'hipovolêmica', eu: 'euvolêmica', hiper: 'hipervolêmica' }[vol]}, sintomas ${sint === 'leve' ? 'leves/ausentes' : sint === 'moderado' ? 'moderados' : 'graves'}. ACT ${f1(tbw)} L. Meta Na ${f1(alvo)} mEq/L em 24 h (Δ máx. ${aguda ? '6–8' : '10–12'}). ` +
      (usa3 ? `NaCl 3%: bolus 150 mL em 20 min (até 3×); se necessário, ~${f0(t3)} mL/h (${f0(v3)} mL em 24 h).` : vol === 'hipo' ? 'SF 0,9% para expansão.' : vol === 'eu' ? 'Restrição hídrica.' : 'Restrição hídrica e de sódio + furosemida.') + ' Na a cada 4–6 h.';
    return { kind: 'hipo', tbw, nae, corr, grau, alvo, v3, t3, dL, usa3, verdict, readouts, conduta, mielinolise, summary };
  }

  if (nae > 145) {
    const delta = nae - 145;
    const def = waterDeficit(tbw, nae);
    const maxC = aguda ? delta : Math.min(10, delta);
    const alvo = nae - maxC;
    const sg5 = volFree(tbw, nae, alvo);   /* L de SG 5% */
    const s045 = volHalf(tbw, nae, alvo);  /* L de SF 0,45% */
    const grau = nae > 160 ? 'grave' : nae > 155 ? 'moderada-grave' : nae > 150 ? 'moderada' : 'leve';
    const verdict: VerdictM = {
      cls: nae > 155 ? 'crit' : 'warn', kicker: 'Hipernatremia ' + grau, title: `Na⁺ ${f1(nae)} mEq/L`,
      desc: `Meta em 24 h: ${f1(alvo)} mEq/L (−${f1(maxC)})${aguda ? ' · aguda: correção mais rápida é segura (até 1 mEq/L/h)' : ' · crônica: máx. 10 mEq/L em 24 h'}`,
    };
    const readouts: ReadoutM[] = [
      { label: 'Déficit de água livre', value: f1(def), unit: 'L', note: 'para chegar a 140' },
      { label: 'Água corporal total', value: f1(tbw), unit: 'L' },
      { label: 'SG 5% (água livre) para a meta', value: f0(sg5 * 1000 / 24), unit: 'mL/h', cls: 'info', big: true, span2: true, status: `${f1(sg5)} L em 24 h + perdas em curso` },
      { label: 'Se usar SF 0,45%', value: f0(s045 * 1000 / 24), unit: 'mL/h', span2: true, note: `${f1(s045)} L em 24 h — cerca do dobro do volume` },
    ];
    const conduta: Item[] = [
      ['info', 'Via oral/enteral preferencial (água). IV: SG 5%; SF 0,45% exige cerca do dobro do volume.'],
      ['', 'Somar perdas em curso (febre, poliúria, diarreia).'],
      ['warn', 'Dosar Na⁺ a cada 4–6 h e ajustar a vazão.'],
    ];
    const alertas: Item[] = [
      ['crit', 'Correção rápida → edema cerebral, convulsão, herniação.'],
      ['crit', 'Forma crônica: não ultrapassar 10 mEq/L em 24 h.'],
      ['', 'Investigar diabetes insipidus, perdas insensíveis, acesso restrito à água.'],
      ['info', 'DI central confirmado: desmopressina 1–4 mcg IV/SC.'],
    ];
    const summary = `Hipernatremia ${grau} (Na ${f1(nae)} mEq/L), ${aguda ? 'aguda' : 'crônica/indeterminada'}. ACT ${f1(tbw)} L. Déficit de água livre ${f1(def)} L. Para Na ${f1(alvo)} em 24 h: SG 5% ${f1(sg5)} L (~${f0(sg5 * 1000 / 24)} mL/h) ou SF 0,45% ${f1(s045)} L (~${f0(s045 * 1000 / 24)} mL/h), + perdas em curso. Na a cada 4–6 h.`;
    return { kind: 'hiper', tbw, nae, corr, grau, def, maxC, alvo, sg5, s045, verdict, readouts, conduta, alertas, summary };
  }

  return {
    kind: 'normal', tbw, nae, corr,
    verdict: { cls: 'ok', kicker: 'Normal', title: `Na⁺ ${f1(nae)} mEq/L`, desc: 'Dentro de 135–145 mEq/L. Sem distúrbio do sódio.' },
    summary: `Na ${f1(nae)} mEq/L — normal.`,
  };
}

/* texto visível do resultado (equivalente ao innerText de #nOut do app anterior) — usado nos testes */
export function sodioText(m: SodioModel): string {
  const strip = (s: string) => s.replace(/<[^>]+>/g, '');
  const parts: string[] = [];
  if (m.kind === 'idle') return `Aguardando Faltam: ${m.missing.join(', ')}`;
  parts.push(m.verdict.kicker, m.verdict.title, m.verdict.desc);
  if (m.corr) parts.push(strip(m.corr));
  if (m.kind === 'hipo' || m.kind === 'hiper') {
    m.readouts.forEach((r) => parts.push(r.label, `${r.value} ${r.unit}`, r.status || '', r.note || ''));
    parts.push('Conduta', ...m.conduta.map(([, t]) => strip(t)));
    if (m.kind === 'hipo') parts.push('Mielinólise osmótica', ...m.mielinolise.map(([, t]) => strip(t)));
    else parts.push('Alertas', ...m.alertas.map(([, t]) => strip(t)));
  }
  return parts.filter(Boolean).join('\n');
}
