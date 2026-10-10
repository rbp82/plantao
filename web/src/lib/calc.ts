/* Ponte tipada para os motores legados (window.Calc).
   core.js e engine.js são carregados como módulos de efeito colateral: funções puras, cofre,
   pacientes e motor de gasometria continuam byte a byte iguais aos auditados em AUDITORIA.md,
   e o cofre criptografado tem o mesmo formato do app anterior (os dados do aparelho são compartilhados). */
import '../legacy/core.js';
import '../legacy/engine.js';

export type Cls = 'ok' | 'warn' | 'crit' | 'info' | 'violet' | '';

export interface RangeTag { cls: Cls; txt: string }

export interface PatientRec {
  id: string;
  tipo: 'ini' | 'leito' | 'atd';
  label: string;
  data: Record<string, string>;
  ficha?: Record<string, unknown>;
  records?: unknown[];
  created: number;
  updated: number;
}

export interface VaultApi {
  MIN_LEN: number;
  supported(): boolean;
  exists(): boolean;
  isOpen(): boolean;
  isTemp(): boolean;
  waitMs(): number;
  hasBio(): boolean;
  bioAvailable(): Promise<boolean>;
  create(pass: string): Promise<void>;
  unlock(pass: string): Promise<boolean>;
  unlockBio(): Promise<boolean>;
  enableBio(pass: string): Promise<boolean>;
  disableBio(): void;
  temporary(): void;
  lock(): Promise<void>;
  flush(): Promise<void>;
  changePassword(oldPass: string, newPass: string): Promise<boolean>;
  wipe(): void;
  /* passagem de sessão para/do app legado (legado/) — ver core.js */
  handoff(): Promise<boolean>;
  resume(): Promise<boolean>;
  go(url: string): Promise<void>;
}

export interface CalcApi {
  num(v: unknown): number;
  ok(...xs: number[]): boolean;
  fmt(n: number, d?: number): string;
  fmtDose(n: number): string;
  fmtN(n: number): string;
  norm(s: string): string;
  esc(s: string): string;
  fio2(v: number): number;
  berlin(pf: number): [Cls, string];
  rangeTag(v: number, lo: number, hi: number): RangeTag;
  rangeLbl(lo: number, hi: number, unit?: string): string;
  LIM: Record<string, [number, number]>;
  renal: {
    ibw(sex: 'M' | 'F', ht: number): number;
    cgWeight(wt: number, ht: number, sex: string | null): { kg: number; label: string };
    cockcroft(age: number, kg: number, cr: number, sex: string | null): number;
    ckdepi(age: number, cr: number, sex: string | null): number;
  };
  infMath: {
    toUnit(basePerMin: number, unit: string, peso: number): number;
    fromUnit(dose: number, unit: string, peso: number): number;
    BASE: Record<string, number>;
  };
  store: {
    get<T>(k: string, d: T): T;
    set(k: string, v: unknown): void;
    del(k: string): void;
  };
  Vault: VaultApi;
  Patients: {
    TYPES: Record<string, string>;
    list(): PatientRec[];
    save(list: PatientRec[]): void;
    get(id: string): PatientRec | null;
    active(): PatientRec | null;
    setActive(id: string | null): void;
    find(tipo: string, label: string): PatientRec | null;
    add(tipo: string, label: string): PatientRec;
    remove(id: string): void;
    name(p: PatientRec | null): string;
  };
  Patient: {
    data(): Record<string, string>;
    get(k: string): string | undefined;
    set(k: string, v: string): void;
    clear(): void;
    summary(d?: Record<string, string>): string;
  };
  ptBed(p: PatientRec | null): string;
  ptIni(p: PatientRec | null): string;
  engine: Record<string, unknown>;
  gasF: Record<string, unknown>;
  groups: Record<string, { name: string; color: string }>;
  groupOrder: string[];
  isBusy(): boolean;
  [k: string]: unknown;
}

declare global {
  interface Window { Calc: CalcApi }
}

export const C: CalcApi = window.Calc;

/* limites de plausibilidade usados nos campos (adulto) */
export const LIM = C.LIM;
export const num = (v: unknown) => C.num(v);
export const fmt = (n: number, d = 1) => C.fmt(n, d);
export const fmtDose = (n: number) => C.fmtDose(n);
export const fmtN = (n: number) => C.fmtN(n);
export const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
/* arredonda a 9 casas antes de comparar com limites de faixa (evita 0,04000000001 > 0,04) */
export const r9 = (v: number) => Math.round(v * 1e9) / 1e9;
