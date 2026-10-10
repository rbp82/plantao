/* Tromboelastograma (TEG) — lógica pura (portada de assets/js/tools/hema.js).
   Referências para ativação por caolim; LY30 > 3% como limiar de hiperfibrinólise (Chapman 2013). */
import { C, type Cls } from '@/lib/calc';

export type Key = 'R' | 'K' | 'A' | 'MA' | 'LY';
export type TegValues = Record<Key, number>;
export type Status = 'low' | 'normal' | 'high';

export interface Param { k: Key; l: string; u: string; min: number; max: number; step: number; def: number; ref: [number, number]; hint: string }
export const P: Param[] = [
  { k: 'R', l: 'R', u: 'min', min: 1, max: 20, step: 0.1, def: 6, ref: [5, 10], hint: 'Iniciação · fatores' },
  { k: 'K', l: 'K', u: 'min', min: 0.5, max: 10, step: 0.1, def: 2, ref: [1, 3], hint: 'Cinética até 20 mm' },
  { k: 'A', l: 'Ângulo α', u: '°', min: 10, max: 80, step: 1, def: 63, ref: [53, 72], hint: 'Velocidade · fibrinogênio' },
  { k: 'MA', l: 'MA', u: 'mm', min: 20, max: 90, step: 1, def: 60, ref: [50, 70], hint: 'Força · plaquetas' },
  { k: 'LY', l: 'LY30', u: '%', min: 0, max: 30, step: 0.5, def: 1, ref: [0, 3], hint: 'Fibrinólise' },
];
export const PRESETS: { name: string; v: TegValues }[] = [
  { name: 'Normal', v: { R: 6, K: 2, A: 63, MA: 60, LY: 1 } },
  { name: 'Déficit de fatores', v: { R: 14, K: 3, A: 55, MA: 58, LY: 1 } },
  { name: 'Hipofibrinogenemia', v: { R: 6, K: 5, A: 38, MA: 45, LY: 1 } },
  { name: 'Disfunção plaquetária', v: { R: 6, K: 3, A: 55, MA: 38, LY: 1 } },
  { name: 'Hiperfibrinólise', v: { R: 6, K: 2, A: 60, MA: 55, LY: 15 } },
  { name: 'Hipercoagulável', v: { R: 3.5, K: 1, A: 74, MA: 78, LY: 0.5 } },
];
export const DEFAULTS: TegValues = { R: 6, K: 2, A: 63, MA: 60, LY: 1 };

export const status = (v: number, [lo, hi]: [number, number]): Status => (v < lo ? 'low' : v > hi ? 'high' : 'normal');
export const dev = (v: number, lo: number, hi: number) => (v < lo ? (lo - v) / (hi - lo) : v > hi ? (v - hi) / (hi - lo) : 0);

/* o campo numérico manda (aceita valores fora do alcance do slider); ilegível → padrão */
export function parseValues(text: Record<Key, string>): TegValues {
  const o = {} as TegValues;
  P.forEach(({ k, min, def }) => {
    const n = C.num(text[k]);
    o[k] = Number.isFinite(n) ? Math.max(n, k === 'K' ? 0.1 : min === 0 ? 0 : 0.1) : def;
  });
  return o;
}

export interface Cand { u: number; t: string; d: string; dose?: string }
export interface StepM { cls: Cls; n: number; t: string; d: string; dose?: string }
export interface Interp { cls: Cls; head: string; body: string }
export interface TegModel {
  v: TegValues;
  s: Record<Key, Status>;
  ab: string[];
  hyper: boolean;
  verdict: { cls: Cls; kicker: string; title: string; desc: string };
  cand: Cand[];
  steps: StepM[];         /* vazio = "Sem indicação de intervenção hemostática." */
  interp: Interp[];
  summary: string;
}

export function computeTeg(v: TegValues): TegModel {
  const s: Record<Key, Status> = { R: status(v.R, [5, 10]), K: status(v.K, [1, 3]), A: status(v.A, [53, 72]), MA: status(v.MA, [50, 70]), LY: v.LY > 3 ? 'high' : 'normal' };
  const ab: string[] = [];
  if (s.R === 'high') ab.push('déficit de fatores');
  if (s.A === 'low' || s.K === 'high') ab.push('hipofibrinogenemia');
  if (s.MA === 'low') ab.push('disfunção plaquetária');
  if (s.LY === 'high') ab.push('hiperfibrinólise');
  const hyper = (s.R === 'low' || s.MA === 'high' || s.A === 'high') && s.LY !== 'high';
  const verdict: TegModel['verdict'] = ab.length
    ? { cls: 'crit', kicker: 'Padrão global', title: 'Hipocoagulabilidade', desc: 'Compatível com ' + ab.join(', ') + '. Repor o componente do parâmetro mais alterado.' }
    : hyper
      ? { cls: 'warn', kicker: 'Padrão global', title: 'Hipercoagulabilidade', desc: 'R curto e/ou ângulo/MA aumentados, sem hiperfibrinólise. Avaliar risco tromboembólico.' }
      : { cls: 'ok', kicker: 'Padrão global', title: 'Dentro da normalidade', desc: 'Todos os parâmetros nas faixas de referência.' };

  const cand: Cand[] = [];
  if (v.LY > 3) cand.push({ u: dev(v.LY, 0, 3) * 1.4 + 1, t: 'Ácido tranexâmico', d: 'LY30 elevado = hiperfibrinólise. Com sangramento ativo/trauma é prioridade: os hemocomponentes são degradados enquanto ela persiste.', dose: 'TXA 1 g IV em 10 min → 1 g IV em 8 h' });
  else if (v.LY < 0.5) cand.push({ u: 0.3, t: 'Fibrinólise “shutdown” — não tratar empiricamente', d: 'LY30 muito baixo (trauma grave, sepse) não indica antifibrinolítico. Monitorar risco trombótico.' });
  if (s.A === 'low' || s.K === 'high') cand.push({ u: Math.max(dev(v.A, 53, 72), dev(v.K, 1, 3)), t: 'Repor fibrinogênio', d: `${s.A === 'low' ? 'Ângulo α reduzido' : 'K prolongado'}${s.A === 'low' && s.K === 'high' ? ' e K prolongado' : ''} sugere hipofibrinogenemia funcional. Corrigir antes ou junto das plaquetas.`, dose: 'Crioprecipitado ~1 U/10 kg ou concentrado de fibrinogênio 3–4 g · meta > 150–200 mg/dL' });
  if (s.MA === 'low') cand.push({ u: dev(v.MA, 50, 70) + 0.15, t: 'Transfundir plaquetas', d: 'MA reduzida reflete sobretudo disfunção/deficiência plaquetária (~80% da força do coágulo). Checar antiagregantes.', dose: '1 aférese ou 4–6 U randômicas · meta > 50.000 (> 100.000 em SNC)' });
  if (s.R === 'high') cand.push({ u: dev(v.R, 5, 10), t: 'Plasma fresco congelado', d: 'R prolongado = déficit de fatores. Excluir heparina residual (TEG com heparinase, sobretudo pós-CEC).', dose: 'PFC 10–15 mL/kg · CCP se reversão de anticoagulante' });
  if (hyper) cand.push({ u: Math.max(dev(v.R, 5, 10), dev(v.A, 53, 72), dev(v.MA, 50, 70)) * 0.6, t: 'Sem indicação de hemocomponente', d: 'Padrão pró-coagulante. Considerar profilaxia de TEV conforme o contexto.' });
  cand.sort((a, b) => b.u - a.u);
  const steps: StepM[] = cand.map((c, i) => ({ cls: c.u < 0.35 ? 'ok' : i === 0 ? 'crit' : i === 1 ? 'warn' : 'info', n: i + 1, t: c.t, d: c.d, dose: c.dose }));

  const interp: Interp[] = [
    s.R === 'high' ? { cls: 'warn', head: 'R prolongado:', body: ' déficit de fatores (iniciação). Excluir heparina.' } : s.R === 'low' ? { cls: 'info', head: 'R curto:', body: ' hipercoagulabilidade na geração de trombina.' } : { cls: 'ok', head: 'R normal:', body: ' iniciação preservada.' },
    s.K === 'high' ? { cls: 'warn', head: 'K prolongado:', body: ' formação lenta do coágulo — hipofibrinogenemia (± plaquetas).' } : s.K === 'low' ? { cls: 'info', head: 'K curto:', body: ' cinética acelerada.' } : { cls: 'ok', head: 'K normal.', body: '' },
    s.A === 'low' ? { cls: 'warn', head: 'α reduzido:', body: ' hipofibrinogenemia ou polimerização de fibrina deficiente.' } : s.A === 'high' ? { cls: 'info', head: 'α aumentado:', body: ' cinética acelerada — hiperfibrinogenemia/pró-coagulante.' } : { cls: 'ok', head: 'α normal:', body: ' contribuição do fibrinogênio preservada.' },
    s.MA === 'low' ? { cls: 'warn', head: 'MA reduzida:', body: ' disfunção/deficiência plaquetária ± fibrinogênio.' } : s.MA === 'high' ? { cls: 'info', head: 'MA aumentada:', body: ' hipercoagulabilidade plaquetária.' } : { cls: 'ok', head: 'MA normal:', body: ' força do coágulo preservada.' },
    s.LY === 'high' ? { cls: 'crit', head: 'LY30 elevado:', body: ' hiperfibrinólise.' } : v.LY < 0.5 ? { cls: 'info', head: 'LY30 muito baixo:', body: ' possível shutdown fibrinolítico.' } : { cls: 'ok', head: 'LY30 normal:', body: ' sem hiperativação fibrinolítica.' },
  ];

  const fmtP = ({ k, l, u }: Param) => `${l} ${C.fmt(v[k], k === 'A' || k === 'MA' ? 0 : 1)}${u === '°' ? '°' : ' ' + u}`;
  const summary = `TEG: ${P.map(fmtP).join(', ')}. ${ab.length ? 'Hipocoagulabilidade (' + ab.join(', ') + ')' : hyper ? 'Hipercoagulabilidade' : 'Normal'}. Conduta: ${cand.length ? cand.map((c) => c.t).join(' → ') : 'sem intervenção hemostática'}.`;
  return { v, s, ab, hyper, verdict, cand, steps, interp, summary };
}

/* texto visível do resultado (equivalente ao innerText de #tOut do app anterior) — usado nos testes */
export function tegText(m: TegModel): string {
  const parts = [m.verdict.kicker, m.verdict.title, m.verdict.desc, 'Conduta sugerida'];
  if (m.steps.length) m.steps.forEach((st) => parts.push(`${st.n}. ${st.t}`, st.d, st.dose || ''));
  else parts.push('Sem indicação de intervenção hemostática.');
  parts.push('Ordem por grau de desvio. Não tratar número isolado sem sangramento. Repetir TEG após cada intervenção.', 'Traçado simulado', 'Por parâmetro');
  m.interp.forEach((x) => parts.push(x.head + x.body));
  return parts.filter(Boolean).join('\n');
}

/* ---------- traçado simulado (mesma matemática do app anterior) ---------- */
export interface Curve {
  W: number; H: number; L: number; R: number; mid: number;
  path: string;                                              /* contorno fechado (ida por cima, volta por baixo) */
  grid: { y: number; label: string }[];                      /* linhas horizontais ±mm (label só na metade de cima) */
  markers: { x: number; label: string; tone: 'muted' | 'info' | 'warn' }[];
}
export function curve(v: TegValues): Curve {
  const W = 340, H = 180, L = 30, R = 8, mid = H / 2;
  const total = v.R + v.K + 30;
  const xs = (W - L - R) / total, ys = (H * 0.42) / 80;
  const ma = Math.max(v.MA, 21);
  const b = -Math.log(1 - 20 / ma) / v.K;
  const maT = v.R + v.K * 6;
  const lr = -Math.log(1 - Math.min(v.LY, 95) / 100) / 30;
  const amp = (t: number) => t <= v.R ? 0 : t <= maT ? Math.min(ma * (1 - Math.exp(-b * (t - v.R))), ma) : ma * Math.exp(-lr * (t - maT));
  let top = '', bot = '';
  for (let i = 0; i <= 160; i++) {
    const t = i / 160 * total, a = amp(t), x = (L + t * xs).toFixed(1);
    top += `${i ? 'L' : 'M'}${x},${(mid - a * ys).toFixed(1)}`;
    bot = `L${x},${(mid + a * ys).toFixed(1)}` + bot;
  }
  const grid: Curve['grid'] = [];
  for (let mm = 20; mm <= 60; mm += 20) grid.push({ y: mm * ys, label: String(mm) });
  const markers: Curve['markers'] = [
    { x: L + v.R * xs, label: 'R', tone: 'muted' },
    { x: L + (v.R + v.K) * xs, label: 'K', tone: 'info' },
    { x: L + maT * xs, label: 'MA', tone: 'warn' },
  ];
  return { W, H, L, R, mid, path: top + bot + 'Z', grid, markers };
}
