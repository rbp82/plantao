/* Leitos, ficha do paciente e gasometria com tendência — lógica pura portada do app anterior.
   Usa o motor (engine) e os pacientes do núcleo (C.Patients): o que é digitado aqui
   (peso, idade, sexo, altura, creatinina) alimenta também as demais calculadoras.
   FORMATO DOS DADOS IDÊNTICO ao app anterior: patients[].{data, ficha, records[].{id, ts, i, via}, archived, pcrs},
   chaves do store 'patient' (avulso, 12 h) e 'gasCfg'. */
import { engine, gasF } from '@/lib/engine';
import { C, type PatientRec } from '@/lib/calc';

/* ================================================================ tipos */
export type Sev = 'ok' | 'warn' | 'crit';
/* valor lançado num campo do registro: número (campos numéricos), string (enum) ou booleano (checagens) */
export type GasInput = number | string | boolean;
export type GasInputs = Record<string, GasInput | string[] | undefined>;
export interface GasRecord { id: string; ts: number; i: Partial<Record<string, GasInput>>; via?: 'foto' }
/* ficha gravada em p.ficha (exatamente o que beds.js escreve) */
export type Ficha = {
  leito?: string; ini?: string; atd?: string;
  adm?: string; iso?: string; diag?: string; alerg?: string; obs?: string;
  com?: string[]; dev?: string[];
};
export interface BedPatient extends PatientRec { ficha?: Ficha; records?: GasRecord[]; archived?: boolean; pcrs?: string[] }
export interface GasCfg { lacUnit: 'mmol' | 'mgdl'; patm: number; agRef: number }

/* contrato do motor (engine.ts) — a forma é a de C.engine/C.gasF do app anterior */
export interface FieldDef { l: string; u?: string; n?: [number, number]; p?: [number, number]; neg?: boolean; mask?: string; type?: 'enum' | 'bool'; opts?: [string, string][]; demo?: boolean; lacUnit?: boolean }
export interface GroupDef { id: string; t: string; ch: string; f: string[]; dyn?: boolean; open?: boolean }
export interface ChItem { id: string; l: string; v?: number | string; u?: string; dec?: number; fl?: Sev | null; n?: string; ref?: string; miss?: string[]; txt?: boolean; verdict?: boolean }
export interface Dx { t: string; s: Sev; ch: string; main?: boolean }
export interface GasResult { d: Record<string, number | string | null | undefined>; dx: Dx[]; ch: Record<string, ChItem[]>; worst: Sev | null; key: Record<string, number | null | undefined>; main: Dx | null }
export interface RefDef { t: string; f: string; c: string; s: string; v?: boolean }
export type TrendRow = [string, string, number, string, [number, number]];
export interface EngineApi {
  compute(r: GasInputs, cfg: GasCfg, ctx: { ts?: number; prev?: GasInputs | null; prevTs?: number | null }): GasResult;
  REF: Record<string, RefDef>;
  CHANNELS: { id: string; t: string }[];
  fmt(v: number | null | undefined, dec?: number): string;
  H(x: unknown): boolean;
}
export interface GasFApi {
  F: Record<string, FieldDef>;
  GROUPS: GroupDef[];
  fluidFields(r: GasInputs): string[];
  fluidLabel(id: string, r: GasInputs): [string, string] | null | undefined;
  TREND: TrendRow[];
  DEMO: string[];
  COM: [string, string][];
  DEV: [string, string][];
  ISO: [string, string][];
}
export const E = engine as unknown as EngineApi;
export const G = gasF as unknown as GasFApi;
export const F = G.F;
export const fmt = (v: number | null | undefined, dec = 0) => E.fmt(v, dec);
export const H = (x: unknown): boolean => E.H(x);

interface PatientsApi { list(): BedPatient[]; get(id: string): BedPatient | null; active(): BedPatient | null; setActive(id: string | null): void; find(tipo: string, label: string): BedPatient | null; add(tipo: string, label: string): BedPatient; remove(id: string): void; name(p: BedPatient | null | undefined): string; touch(p: BedPatient | null | undefined): void }
export const P = C.Patients as unknown as PatientsApi;

export const gasCfg = (): GasCfg => Object.assign({ lacUnit: 'mmol', patm: 760, agRef: 12 } as GasCfg, C.store.get<Partial<GasCfg> | null>('gasCfg', {}) || {});
export const setGasCfg = (patch: Partial<GasCfg>) => C.store.set('gasCfg', { ...gasCfg(), ...patch });
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ================================================================ dados */
/* campos do motor ↔ dados do paciente compartilhados com as calculadoras */
export const MAPK: Record<string, string> = { sex: 'sexo', age: 'idade', height: 'altura', weight: 'peso', crBase: 'crBase', pamAlvo: 'pamAlvo' };
export const PT_TTL = 12 * 3600 * 1000;
export const toStr = (v: number) => String(Math.round(v * 1000) / 1000).replace('.', ',');
/* avulso: o mesmo registro de 12 h usado pelas calculadoras quando não há paciente ativo */
export function avulso(): Record<string, string> {
  const d = C.store.get<{ v?: Record<string, string>; t?: number } | null>('patient', null);
  return d && d.t && Date.now() - d.t <= PT_TTL ? d.v || {} : {};
}
export function setAvulso(k: string, v: string | null | undefined) {
  const cur = { ...avulso() };
  if (v === '' || v == null) delete cur[k]; else cur[k] = v;
  C.store.set('patient', { v: cur, t: Date.now() });
}

export interface Demo { sex?: 'M' | 'F'; age?: number; height?: number; weight?: number; crBase?: number; pamAlvo?: number; com: string[] }
export function demoOf(p: BedPatient | null | undefined): Demo {
  const d = p ? p.data || {} : avulso();
  const o: Record<string, unknown> = {};
  for (const k in MAPK) {
    const v = d[MAPK[k]];
    if (v === undefined || v === null || v === '') continue;
    if (k === 'sex') { if (v === 'M' || v === 'F') o.sex = v; } else { const n = C.num(v); if (Number.isFinite(n)) o[k] = n; }
  }
  o.com = (p && p.ficha && p.ficha.com) || [];
  return o as unknown as Demo;
}
export const merged = (p: BedPatient | null | undefined, rec: GasRecord): GasInputs => Object.assign({}, rec.i, demoOf(p)) as GasInputs;
export const recs = (p: BedPatient | null | undefined): GasRecord[] => (p && p.records) || [];
export const sorted = (p: BedPatient | null | undefined) => recs(p).slice().sort((a, b) => a.ts - b.ts);
export const isEmpty = (rec: GasRecord) => !Object.keys(rec.i).some((k) => rec.i[k] !== undefined && rec.i[k] !== '' && k !== 'ftest' && k !== 'fMet');
export const prevOf = (p: BedPatient | null | undefined, rec: GasRecord): GasRecord | null => (p ? sorted(p).filter((r) => r.ts < rec.ts && !isEmpty(r)).pop() || null : null);
export function calc(p: BedPatient | null | undefined, rec: GasRecord): GasResult {
  const pr = prevOf(p, rec);
  return E.compute(merged(p, rec), gasCfg(), { ts: rec.ts, prev: pr ? merged(p, pr) : null, prevTs: pr ? pr.ts : null });
}

/* valor de um campo: os demográficos vêm do paciente (ou do avulso), os demais do registro */
export function getV(p: BedPatient | null | undefined, rec: GasRecord, fid: string): GasInput | undefined {
  const f = F[fid];
  if (f && f.demo) {
    const raw = p ? (p.data || {})[MAPK[fid]] : avulso()[MAPK[fid]];
    if (fid === 'sex') return raw === 'M' || raw === 'F' ? raw : undefined;
    const n = C.num(raw);
    return Number.isFinite(n) ? n : undefined;
  }
  return rec.i[fid];
}
export function setV(p: BedPatient | null | undefined, rec: GasRecord, fid: string, v: GasInput | undefined | null) {
  const f = F[fid];
  if (f && f.demo) {
    const sv = v === undefined || v === null || v === '' ? '' : fid === 'sex' ? String(v) : toStr(Number(v));
    if (p) { p.data = p.data || {}; if (sv === '') delete p.data[MAPK[fid]]; else p.data[MAPK[fid]] = sv; }
    else setAvulso(MAPK[fid], sv);
  } else {
    if (v === undefined || v === null || v === '') delete rec.i[fid]; else rec.i[fid] = v;
    /* a creatinina mais recente vira a "Cr atual" do paciente (ajuste renal de ATB etc.) */
    if (fid === 'cr' && p && v != null && v !== '' && !sorted(p).some((r) => r.ts > rec.ts && H(r.i.cr))) { p.data = p.data || {}; p.data.cr = toStr(Number(v)); }
  }
  if (p) P.touch(p);
}
export const prevV = (p: BedPatient | null | undefined, rec: GasRecord, fid: string): GasInput | string[] | undefined => { const pr = prevOf(p, rec); return pr ? merged(p, pr)[fid] : undefined; };
export const groupFields = (g: GroupDef, r: GasInputs): string[] => (g.dyn ? g.f.concat(G.fluidFields(r)) : g.f);
export function filled(g: GroupDef, p: BedPatient | null | undefined, rec: GasRecord): [number, number] {
  const fs = groupFields(g, merged(p, rec)).filter((f) => F[f].type !== 'bool');
  return [fs.filter((f) => { const v = getV(p, rec, f); return v !== undefined && v !== ''; }).length, fs.length];
}
export const newRecord = (): GasRecord => ({ id: uid(), ts: Date.now(), i: {} });
/* sair da gasometria sem digitar nada não deixa registro vazio */
export function removeRecord(p: BedPatient, rec: GasRecord) { p.records = recs(p).filter((r) => r !== rec && r.id !== rec.id); P.touch(p); }
export function cleanupEmpty(p: BedPatient | null | undefined, rec: GasRecord | null | undefined) { if (p && rec && isEmpty(rec) && recs(p).includes(rec)) removeRecord(p, rec); }

/* ================================================================ formatação */
export const pad2 = (n: number) => String(n).padStart(2, '0');
export const dt = (ts: number) => { const d = new Date(ts); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
export const hm = (ts: number) => { const d = new Date(ts); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
export function ago(ts: number, now = Date.now()) {
  const m = Math.round((now - ts) / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m} min`;
  if (m < 48 * 60) return `há ${Math.round(m / 60)} h`;
  return `há ${Math.round(m / 1440)} d`;
}
export function dUti(p: BedPatient | null | undefined): number | null {
  const a = p && p.ficha && p.ficha.adm;
  if (!a) return null;
  const [y, m, d] = a.split('-').map(Number);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.floor((t.getTime() - new Date(y, m - 1, d).getTime()) / 864e5) + 1; /* dia da admissão = D1 */
}
export const isLac = (fid: string) => !!(F[fid] && F[fid].lacUnit && gasCfg().lacUnit === 'mgdl');
export const unitOf = (fid: string) => (isLac(fid) ? 'mg/dL' : (F[fid] && F[fid].u) || '');
export const toDisp = (fid: string, v: number) => (isLac(fid) ? v * 9.01 : v);
export const numTxt = (x: number) => String(Math.round(x * 1000) / 1000).replace('.', ',').replace(/^-/, '−');
export const keyDisp = (k: string, v: number | null | undefined) => (k === 'lac' && gasCfg().lacUnit === 'mgdl' && v != null ? v * 9.01 : v);
export const normOf = (k: string, n: [number, number], p: BedPatient | null | undefined): [number, number] =>
  (k === 'lac' && gasCfg().lacUnit === 'mgdl' ? [n[0] * 9.01, n[1] * 9.01] : k === 'pam' && p && p.data && C.num(p.data.pamAlvo) > 0 ? [C.num(p.data.pamAlvo), 100] : n);
export const outOf = (v: number | null | undefined, n: [number, number]) => v != null && (v < n[0] || v > n[1]);
export const ageSex = (p: BedPatient | null | undefined) => { const d = (p && p.data) || {}; return [d.idade && d.idade + ' a', d.sexo, d.peso && d.peso + ' kg'].filter(Boolean).join(' · '); };
export const hasAlergia = (p: BedPatient | null | undefined): boolean => !!(p && p.ficha && p.ficha.alerg && !/^nega/i.test(p.ficha.alerg.trim()));
/* cor por canal do motor (tokens do tema) */
export const CHC: Record<string, string> = { ab: 'var(--color-g-met)', st: 'var(--color-g-met)', o2: 'var(--color-g-resp)', perf: 'var(--color-g-inf)', fluid: 'var(--color-g-hemo)', hemo: 'var(--color-g-hemo)', vent: 'var(--color-g-resp)', renal: 'var(--color-g-sed)', base: 'var(--color-muted)' };
export const isoLabel = (iso: string | undefined) => (iso ? (G.ISO.find((x) => x[0] === iso) || [])[1] || iso : '');
export const labelsOf = (opts: [string, string][], sel: string[] | undefined) => (sel || []).map((k) => (opts.find((o) => o[0] === k) || [k, k])[1]);
export const mainText = (res: GasResult | null, fallback = 'sem achados') => (res ? (res.main || res.dx[0] || { t: fallback }).t : fallback);

/* ================================================================ tendência (strip) e Davenport — geometria pura, o SVG é montado pela tela */
export interface StripPt { t: number; v: number | null | undefined }
export interface StripGeo { w: number; h: number; band: { y: number; h: number } | null; d: string; dots: { x: number; y: number; sw: number; last: boolean; out: boolean }[] }
/* traçado de tendência com faixa normal; pontos como segmentos de comprimento zero (não distorcem) */
export function strip(pts: StripPt[], normal: [number, number], big?: boolean): StripGeo | null {
  const Pp = pts.filter((p): p is { t: number; v: number } => p.v != null && Number.isFinite(p.v));
  if (!Pp.length) return null;
  const w = big ? 320 : 240, h = big ? 110 : 40;
  const vs = Pp.map((p) => p.v);
  let lo = Math.min(...vs, normal[0]), hi = Math.max(...vs, normal[1]);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) { lo = Math.min(...vs); hi = Math.max(...vs); }
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
  const t0 = Pp[0].t, t1 = Pp[Pp.length - 1].t;
  const px = (t: number) => (Pp.length === 1 ? w - 8 : 8 + ((t - t0) / (t1 - t0 || 1)) * (w - 16));
  const py = (v: number) => h - 4 - ((v - lo) / (hi - lo)) * (h - 8);
  const nTop = py(Math.min(normal[1], hi)), nBot = py(Math.max(normal[0], lo));
  const band = nBot > nTop ? { y: nTop, h: nBot - nTop } : null;
  const d = Pp.map((p, i) => `${i ? 'L' : 'M'}${px(p.t).toFixed(1)},${py(p.v).toFixed(1)}`).join('');
  const dots = Pp.map((p, i) => ({ x: +px(p.t).toFixed(1), y: +py(p.v).toFixed(1), sw: i === Pp.length - 1 ? (big ? 9 : 7) : big ? 5 : 4, last: i === Pp.length - 1, out: outOf(p.v, normal) }));
  return { w, h, band, d, dots };
}

export interface DavGeo { W: number; H: number; L: number; R: number; T: number; B: number; mx: number; my: number; cx: number; cy: number; xTicks: { x: number; label: string }[]; yTicks: { y: number; label: string }[]; label: string }
/* mapa de Davenport (pH × HCO3) — do Plantão original */
export function davenport(ph: number, hco3: number): DavGeo {
  const W = 340, Hh = 220, L = 36, R = 10, T = 12, B = 30;
  const x = (v: number) => L + (Math.max(7, Math.min(7.8, v)) - 7) / 0.8 * (W - L - R);
  const y = (v: number) => Hh - B - Math.max(0, Math.min(44, v)) / 44 * (Hh - T - B);
  const xTicks: { x: number; label: string }[] = [];
  for (let v = 7.0; v <= 7.81; v += 0.2) xTicks.push({ x: x(v), label: v.toFixed(1).replace('.', ',') });
  const yTicks: { y: number; label: string }[] = [];
  for (let v = 0; v <= 44; v += 11) yTicks.push({ y: y(v), label: String(v) });
  return { W, H: Hh, L, R, T, B, mx: x(7.4), my: y(24), cx: x(ph), cy: y(hco3), xTicks, yTicks, label: `Mapa ácido-base: pH ${fmt(ph, 2)}, HCO3 ${fmt(hco3, 1)}` };
}

/* ================================================================ leitos */
export const bedKey = (p: BedPatient) => C.ptBed(p) || C.ptIni(p) || p.label;
export const bedSort = (a: BedPatient, b: BedPatient) => String(bedKey(a)).localeCompare(String(bedKey(b)), 'pt', { numeric: true });
export interface LastInfo { rs: GasRecord[]; last: GasRecord | undefined; res: GasResult | null; prev: GasResult | null }
export function lastInfo(p: BedPatient): LastInfo {
  const rs = sorted(p).filter((r) => !isEmpty(r));
  const last = rs[rs.length - 1];
  return { rs, last, res: last ? calc(p, last) : null, prev: rs.length > 1 ? calc(p, rs[rs.length - 2]) : null };
}
/* valores do azulejo: [chave, rótulo, decimais, faixa normal] */
export const TILE_VALS: [string, string, number, [number, number]][] = [['ph', 'pH', 2, [7.35, 7.45]], ['lac', 'Lac', 1, [0, 2]], ['pf', 'P/F', 0, [300, 9999]]];
/* seta de variação entre dois valores (≥ meia unidade da última casa) */
export const arrow = (x: number, pv: number | null | undefined, dec: number) => (pv != null && Math.abs(x - pv) >= 0.5 * 10 ** -dec ? (x > pv ? '↑' : '↓') : '');
export const delta = (lv: number, pv: number | null | undefined, dec: number): string | null => (pv != null && Math.abs(lv - pv) >= 0.5 * 10 ** -dec ? (lv - pv > 0 ? '▲' : '▼') + fmt(Math.abs(lv - pv), dec) : null);

/* ================================================================ ficha */
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
export const emptyFicha = (): Ficha => ({ adm: today(), com: [], dev: [], iso: '' });
/* campos numéricos da ficha → chave em p.data */
export const FICHA_NUMS = ['idade', 'altura', 'peso', 'cr', 'crBase', 'pamAlvo'] as const;
export type FichaNum = typeof FICHA_NUMS[number];
export const FICHA_LIM: Record<FichaNum, [number, number]> = { idade: C.LIM.idade, altura: C.LIM.altura, peso: C.LIM.peso, cr: C.LIM.cr, crBase: C.LIM.cr, pamAlvo: [50, 110] };
/* valor numérico plausível de um campo da ficha, ou NaN (equivale a C.read do app anterior) */
export function readNum(raw: string, lim?: [number, number]): number {
  const n = C.num(raw);
  if (!Number.isFinite(n)) return NaN;
  return lim && (n < lim[0] || n > lim[1]) ? NaN : n;
}
/* peso predito, Vt protetor, ASC e IMC a partir do que já foi digitado na ficha */
export function pfCalc(h: number, w: number, sex: string): [string, string][] {
  const bits: [string, string][] = [];
  if (h > 0 && sex) { const pbw = (sex === 'F' ? 45.5 : 50) + 0.91 * (h - 152.4); bits.push(['Peso predito', `${fmt(pbw, 1)} kg`], ['Vt 6 mL/kg', `${fmt(pbw * 6)} mL`]); }
  if (h > 0 && w > 0) bits.push(['ASC', `${fmt(0.007184 * Math.pow(w, 0.425) * Math.pow(h, 0.725), 2)} m²`], ['IMC', fmt(w / (h / 100) ** 2, 1)]);
  return bits;
}
export const extraFilled = (f: Ficha) => !!(f.diag || f.alerg || f.obs || (f.com && f.com.length) || (f.dev && f.dev.length) || f.iso);
/* troca de identificação principal: mantém o tipo se ainda houver valor; senão cai para o próximo disponível */
export function nextTipo(cur: string | null, b: string, i: string, at: string): 'leito' | 'ini' | 'atd' {
  if (!cur) return b ? 'leito' : i ? 'ini' : 'atd';
  return cur === 'leito' && b ? 'leito' : cur === 'ini' && i ? 'ini' : cur === 'atd' && at ? 'atd' : b ? 'leito' : i ? 'ini' : 'atd';
}

/* ================================================================ gasometria */
export const MON: TrendRow[] = [['ph', 'pH', 2, 'ab', [7.35, 7.45]], ['paco2', 'PaCO₂', 0, 'ab', [35, 45]], ['hco3', 'HCO₃', 0, 'ab', [22, 26]], ['agc', 'AG', 1, 'ab', [0, 16]], ['lac', 'Lac', 1, 'perf', [0, 2]], ['pf', 'P/F', 0, 'o2', [300, 9999]]];
export const FLUID_HINT: Record<string, string> = { vpp: 'Só interpretável com todos os itens marcados.', vvs: 'Só interpretável com todos os itens marcados.', plr: 'Partir de 45° semi-sentado; medir DC ou VTI (não PA) em 30–90 s.', eeo: 'Pausa expiratória de 15 s. Com eco, acrescente oclusão inspiratória de 15 s.', mfc: '100–150 mL em 1–2 min.', vci: 'Subxifoide, modo M, 2 cm da junção com o átrio direito.', vtc: 'Vt 6 → 8 mL/kg de peso predito por 1 min; anote a VPP antes e depois.' };
export const fluidHint = (r: GasInputs) => (typeof r.ftest === 'string' ? FLUID_HINT[r.ftest] || '' : '');
/* 'bad' = fora do plausível · 'off' = fora da faixa normal */
export function inFlag(fid: string, v: number): 'bad' | 'off' | '' {
  const f = F[fid];
  if (f.p && (v < f.p[0] || v > f.p[1])) return 'bad';
  if (f.n && (v < f.n[0] || v > f.n[1])) return 'off';
  return '';
}
/* Vt por kg de peso predito, para o rótulo da checagem "Vt ≥ 8 mL/kg" */
export const vtKg = (r: GasInputs): number | null => (H(r.vt) && H(r.height) && r.sex ? Number(r.vt) / ((r.sex === 'F' ? 45.5 : 50) + 0.91 * (Number(r.height) - 152.4)) : null);
/* texto digitado → valor do campo (lactato em mg/dL volta para mmol/L; FiO2 em fração vira %) */
export function parseField(fid: string, raw: string): number | undefined {
  let v = parseFloat(raw.replace(',', '.').replace('−', '-'));
  if (!Number.isFinite(v)) return undefined;
  if (isLac(fid)) v = Math.round((v / 9.01) * 100) / 100;
  if (fid === 'fio2' && v > 0 && v <= 1) v = Math.round(v * 100);
  return v;
}
/* valor guardado → texto do editor (na unidade exibida) */
export const rawOf = (fid: string, v: GasInput | undefined) => (H(v) ? String(Math.round(toDisp(fid, Number(v)) * 1000) / 1000).replace('.', ',') : '');
/* "722" → "7,22" na máscara de pH */
export const phMask = (fid: string, raw: string) => (F[fid] && F[fid].mask === 'ph' && !/[.,]/.test(raw) && raw.length === 1 ? raw + ',' : raw);
/* faixa plausível na unidade exibida (para o campo marcar o implausível) */
export const limOf = (fid: string): [number, number] | undefined => { const p = F[fid] && F[fid].p; return p ? (isLac(fid) ? [Math.round(p[0] * 9.01 * 10) / 10, Math.round(p[1] * 9.01 * 10) / 10] : p) : undefined; };
/* grupo que contém o campo (dinâmico no teste de fluido) */
export const groupOfField = (fid: string, r: GasInputs): GroupDef | undefined => G.GROUPS.find((x) => x.f.includes(fid) || (!!x.dyn && G.fluidFields(r).includes(fid)));
/* achados além do principal, por gravidade; a linha de compensação do ácido-base fica no veredito */
export const SEV_RANK: Record<Sev, number> = { crit: 0, warn: 1, ok: 2 };
export function restDx(res: GasResult): { compLine: Dx | undefined; rest: Dx[] } {
  const main = res.main;
  const compLine = main ? res.dx.find((x) => !x.main && x.ch === 'ab') : undefined;
  const rest = res.dx.filter((x) => !x.main && x !== compLine).sort((a, b) => SEV_RANK[a.s] - SEV_RANK[b.s]);
  return { compLine, rest };
}
/* valores numéricos do registro anterior por id de item (para a seta de variação na leitura) */
export function prevItemValues(p: BedPatient | null | undefined, rec: GasRecord): Record<string, number> {
  const pv: Record<string, number> = {};
  const pr = prevOf(p, rec);
  if (pr) { const r0 = calc(p, pr); Object.values(r0.ch).flat().forEach((it) => { if (typeof it.v === 'number') pv[it.id] = it.v; }); }
  return pv;
}

/* ---------- leitura por foto (scan): o que vai para cada campo ---------- */
/* amostra venosa: PCO2, PO2 e saturação vão para a gasometria venosa central.
   Eletrólitos, glicose, lactato e Hb valem para as duas amostras: entram se o campo ainda estiver vazio.
   pH, HCO3 e BE venosos não têm campo próprio e não substituem os arteriais: vêm desmarcados. */
export const VEN: Record<string, string> = { paco2: 'pvco2', pao2: 'pvo2', sao2: 'svo2' };
export const ART_ONLY = ['ph', 'hco3', 'be', 'fio2'];
export type Sample = 'art' | 'ven';
export const scanTarget = (fid: string, smp: Sample) => (smp === 'ven' ? VEN[fid] || fid : fid);
export const SCAN_MSG: Record<string, string> = { scan: 'Tratando a foto: recorte, luz e nitidez', 'loading tesseract core': 'Carregando o leitor', 'initializing tesseract': 'Carregando o leitor', 'loading language traineddata': 'Carregando o leitor', 'initializing api': 'Preparando', 'recognizing text': 'Lendo o ticket', 'second pass': 'Tentando de novo com a foto original', zoom: 'Relendo os resultados ampliados' };
/* progresso da barra: 20 % até começar a ler, depois 25–100 % */
export const scanProgress = (status: string, progress = 0) => Math.round((status === 'recognizing text' ? 0.25 + 0.75 * progress : 0.2 * progress) * 100);
/* marcados por padrão: só os seguros; na venosa, só o que tem campo próprio ou ainda está vazio */
export function scanDefaults(items: { fid: string; sure: boolean }[], smp: Sample, cur: (fid: string) => GasInput | undefined): Record<string, boolean> {
  const on: Record<string, boolean> = {};
  items.forEach((it) => { on[it.fid] = it.sure && (smp !== 'ven' || !!VEN[it.fid] || (!ART_ONLY.includes(it.fid) && !H(cur(it.fid)))); });
  return on;
}
export const venFilled = (cur: (fid: string) => GasInput | undefined) => ['pvco2', 'svo2', 'pvo2'].some((f) => H(cur(f)));
export const artFilled = (cur: (fid: string) => GasInput | undefined) => ['ph', 'paco2', 'pao2'].some((f) => H(cur(f)));
export const scanMsg = (n: number, smp: Sample) => `${n} valor${n > 1 ? 'es lançados' : ' lançado'} da ${smp === 'ven' ? 'venosa' : 'arterial'}`;

/* ---------- salvar gasometria avulsa num leito: dados do avulso completam o que o paciente não tem ---------- */
export function adoptAvulso(dest: BedPatient) {
  const av = avulso();
  dest.data = dest.data || {};
  Object.values(MAPK).forEach((k) => { if (av[k] !== undefined && (dest.data[k] === undefined || dest.data[k] === '')) dest.data[k] = av[k]; });
}

/* registro na busca (mesmos textos de beds.js) */
export const GASO_TOOL = {
  id: 'gasometria', group: 'met' as const, tile: 'pH', href: '#/gaso?novo=1',
  title: 'Gasometria completa',
  sub: 'Ácido-base (Boston + Stewart), oxigenação, perfusão, fluidos, ventilação, renal',
  keywords: ['acido-base', 'acidose', 'alcalose', 'winter', 'anion gap', 'gap anionico', 'bicarbonato', 'pco2', 'lactato', 'base excess', 'davenport', 'gaso', 'stewart', 'sig', 'delta delta', 'gap co2', 'scvo2', 'sdra', 'kdigo', 'tendencia', 'leito'],
};
