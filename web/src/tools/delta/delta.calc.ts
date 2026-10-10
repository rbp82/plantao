/* Hemodinâmica, perfusão tecidual, fluidos e ventilação — lógica pura sobre o motor C.engine (engine.js, auditado).
   Nada de DOM/React aqui: os componentes só leem os campos, chamam runSection/runFluid e renderizam o modelo. */
import { C, num, type Cls } from '@/lib/calc';

/* ---------- tipos do motor (engine.js) ---------- */
export interface FieldDef {
  l: string;
  u?: string;
  n?: [number, number];
  p?: [number, number];
  type?: 'enum' | 'bool';
  opts?: [string, string][];
  neg?: boolean;
}
export interface OutItem {
  id: string;
  l: string;
  v?: number | string;
  u?: string;
  dec?: number;
  fl?: 'ok' | 'warn' | 'crit' | null;
  n?: string;
  ref?: string;
  miss?: string[];
  txt?: boolean;
  verdict?: boolean;
}
export interface Dx { t: string; s: 'ok' | 'warn' | 'crit'; ch: string; main?: boolean }
export interface RefEntry { t: string; f: string; c: string; s: string; v?: boolean }
export type Inputs = Record<string, number | string | boolean>;
interface Engine {
  compute(r: Inputs, cfg: Record<string, unknown>, ctx: Record<string, unknown>): { ch: Record<string, OutItem[]>; dx: Dx[] };
  REF: Record<string, RefEntry>;
  fmt(v: number | null | undefined, dec?: number): string;
}
interface GasF {
  F: Record<string, FieldDef>;
  fluidFields(r: Inputs): string[];
  fluidLabel(id: string, r: Inputs): [string, string] | null | undefined;
}

export const E = C.engine as unknown as Engine;
export const G = C.gasF as unknown as GasF;
export const F = G.F;
export const REF = E.REF;
export const fmt = (v: number | null | undefined, dec = 0) => E.fmt(v, dec);
/* campos do motor que vivem na ficha do paciente */
export const PK = { age: 'idade', height: 'altura', weight: 'peso' } as const;
export const lbl = (fid: string) => (F[fid] || {}).l || fid;
/* classe clínica do item (só crit/warn/ok colorem, como no antigo) */
export const itemCls = (fl: OutItem['fl']): Cls | undefined => (fl === 'crit' || fl === 'warn' || fl === 'ok' ? fl : undefined);

/* texto digitado → número plausível (fora de lim = ausente, como C.read do antigo) */
export function readNum(s: string, lim?: [number, number]): number {
  const n = num(s);
  if (!Number.isFinite(n)) return NaN;
  if (lim && (n < lim[0] || n > lim[1])) return NaN;
  return n;
}
/* placeholder do campo numérico: meio da faixa normal, como no antigo */
export const placeholderOf = (f: FieldDef) => (f.n ? String((f.n[0] + f.n[1]) / 2).replace('.', ',') : '');

/* ---------- ferramenta por seções ---------- */
export interface SectionDef { t: string; f: string[]; o: string[]; opt?: boolean }
export interface ToolDef {
  id: string;
  title: string;
  /* canais do motor cujos achados viram a interpretação */
  dx: string[];
  intro?: string;
  sections: SectionDef[];
  preset?: Inputs;
  /* id de resultado → chave em REF (quando difere) */
  ref: Record<string, string>;
}
export interface SectionOut {
  got: OutItem[];
  /* campos que faltam para calcular (só os desta ferramenta); vazio quando não há dica */
  need: string[];
  /* texto do cabeçalho das seções opcionais */
  preview: string;
}
export interface SectionModel { sections: SectionOut[]; dx: Dx[]; txt: string }

export const defFields = (def: ToolDef) => def.sections.flatMap((s) => s.f);
export const defOutIds = (def: ToolDef) => def.sections.flatMap((s) => s.o);
/* referências (fórmulas, cortes e fontes) exibidas por uma ferramenta */
export const defRefs = (def: ToolDef): RefEntry[] =>
  [...new Set(defOutIds(def).map((id) => def.ref[id] || id))].map((k) => REF[k]).filter((r): r is RefEntry => !!r);

export function runSection(def: ToolDef, inputs: Inputs): SectionModel {
  const fids = defFields(def);
  const r: Inputs = Object.assign({}, inputs, def.preset || {});
  const res = E.compute(r, {}, {});
  const all = Object.values(res.ch).flat();
  const lines: string[] = [];
  const sections = def.sections.map((s) => {
    const got: OutItem[] = [], miss: OutItem[] = [];
    s.o.forEach((id) => { const it = all.find((x) => x.id === id); if (!it) return; (it.miss ? miss : got).push(it); });
    const needAll = [...new Set(miss.flatMap((m) => m.miss || []))].filter((m) => fids.includes(m));
    const need = needAll.length && !got.length && s.o.length ? needAll : [];
    const preview = got.length
      ? got.filter((g) => typeof g.v === 'number').slice(0, 2).map((g) => `${g.l.split(' (')[0]} ${fmt(g.v as number, g.dec)}`).join(' · ') || 'calculado'
      : 'opcional';
    got.forEach((g) => lines.push(`${g.l}: ${typeof g.v === 'number' ? fmt(g.v, g.dec) + (g.u ? ' ' + g.u : '') : g.v}${g.n ? ' (' + g.n + ')' : ''}`));
    return { got, need, preview };
  });
  const dx = res.dx.filter((x) => !x.main && def.dx.includes(x.ch));
  const txt = lines.length ? `${def.title}: ` + lines.join('; ') + (dx.length ? '. ' + dx.map((x) => x.t).join('; ') : '') + '.' : '';
  return { sections, dx, txt };
}

/* ---------- definições das ferramentas (idênticas ao delta.js) ---------- */
export const GAP_CO2: ToolDef = {
  id: 'gap-co2', title: 'Perfusão tecidual', dx: ['perf'],
  intro: 'Amostras arterial e venosa central colhidas juntas.',
  sections: [
    { t: 'Gap venoarterial de CO₂', f: ['paco2', 'pvco2', 'svo2'], o: ['gap', 'svo2'] },
    { t: 'Razão ΔPCO₂/Ca−vO₂ e extração', f: ['hb', 'sao2', 'pao2', 'pvo2'], o: ['gapratio', 'teo2', 'cao2', 'avdo2'], opt: true },
    { t: 'Lactato', f: ['lac'], o: ['lac'], opt: true },
  ],
  ref: {},
};

export const DEBITO: ToolDef = {
  id: 'debito', title: 'Débito cardíaco', dx: ['hemo'],
  sections: [
    { t: 'Paciente', f: ['sex', 'age', 'height'], o: [] },
    { t: 'Débito pelo VTI (eco)', f: ['dvsve', 'vti', 'fc'], o: ['dcvti', 'ci'] },
    { t: 'Conteúdo de O₂ e Fick estimado', f: ['hb', 'sao2', 'pao2', 'svo2'], o: ['dcfick', 'do2', 'vo2'], opt: true },
    { t: 'Resistências e potência', f: ['dcMed', 'pam', 'pvc', 'papm', 'poap'], o: ['rvs', 'rvp', 'cpo'], opt: true },
  ],
  ref: {},
};

export const VENTILACAO: ToolDef = {
  id: 'ventilacao', title: 'Mecânica ventilatória', dx: ['vent'],
  sections: [
    { t: 'Paciente', f: ['sex', 'height'], o: ['pbw'] },
    { t: 'Mecânica', f: ['vt', 'peep', 'pplat', 'ppico', 'fr'], o: ['vtkg', 'dp', 'cst', 'mp'] },
    { t: 'Resistência de via aérea', f: ['fluxo'], o: ['raw'], opt: true },
    { t: 'Ventilatory ratio (espaço morto)', f: ['paco2', 've'], o: ['vr'], opt: true },
    { t: 'CNAF — índice ROX', f: ['spo2', 'fio2'], o: ['rox'], opt: true },
  ],
  preset: { sup: 'CNAF' },
  ref: {},
};

/* ---------- fluido-responsividade ---------- */
export const FL = ['ppv', 'ppMax', 'ppMin', 'svv', 'fBase', 'fPost', 'fEio', 'vciMax', 'vciMin', 'ppv6', 'ppv8'] as const;
export const CHK = ['chkVc', 'chkSinus', 'chkTorax', 'chkVt8'] as const;
export const VAL = ['vt', 'fc', 'fr'] as const;
export const HINT: Record<string, string> = {
  vpp: 'Válida só com VM controlada sem esforço, ritmo sinusal, Vt ≥ 8 mL/kg e tórax fechado.',
  vvs: 'Do monitor de contorno de pulso; mesmas condições da VPP.',
  plr: 'Partir de 45° semi-sentado; medir o DC ou o VTI (não a pressão) em 30–90 s.',
  eeo: 'Pausa expiratória de 15 s. Com eco (VTI), acrescente oclusão inspiratória de 15 s.',
  mfc: '100–150 mL de cristaloide em 1–2 min.',
  vci: 'Subxifoide, modo M, 2 cm da junção com o átrio direito. Em VM usa a distensibilidade.',
  vtc: 'Vt de 6 → 8 mL/kg de peso predito por 1 min; anote a VPP antes e depois.',
};
export const testLabel = (ftest: string) => (F.ftest.opts || []).find((o) => o[0] === ftest)?.[1] || ftest;

export interface FluidModel {
  /* campos visíveis para o teste escolhido (G.fluidFields) */
  show: Set<string>;
  it: OutItem | null;
  cls: Cls | 'idle';
  kicker: string;
  title: string;
  desc: string;
  txt: string;
}

export function runFluid(inputs: Inputs): FluidModel {
  const r: Inputs = { ...inputs };
  if (r.ftest === 'vci') r.sup = 'VM';
  const show = new Set(G.fluidFields(r));
  const res = E.compute(r, {}, {});
  const it = Object.values(res.ch).flat().find((x) => x.id === 'fr_' + String(r.ftest)) || null;
  if (!it || it.miss) {
    return { show, it, cls: 'idle', kicker: 'Aguardando', title: 'Preencha as medidas do teste', desc: it && it.miss ? 'Faltam: ' + it.miss.map(lbl).join(', ') : '', txt: '' };
  }
  const cls: Cls = it.l === 'Responsivo' ? 'ok' : it.l === 'Não responsivo' ? 'info' : 'warn';
  const tl = testLabel(String(r.ftest));
  const val = typeof it.v === 'number' ? fmt(it.v, it.dec) + (it.u || '') : '';
  return {
    show, it, cls,
    kicker: `${tl}${val ? ' · ' + val : ''}`,
    title: it.l,
    desc: it.n || '',
    txt: `Fluido-responsividade (${tl}): ${it.l}${val ? ' (' + val + ')' : ''}. ${it.n || ''}`,
  };
}
