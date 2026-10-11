/* Agregador do núcleo: monta `C` com a mesma forma que as calculadoras e telas React já usam
   (antes era a ponte para window.Calc do app anterior; agora tudo é TypeScript em src/lib). */
import { num, ok, fmt, fmtDose, fmtN, norm, esc, LIM, rangeTag, rangeLbl, berlin, fio2 } from './core/num';
import type { Cls, RangeTag, LimKey } from './core/num';
import { renal } from './core/renal';
import { infMath } from './core/infMath';
import { store, Vault } from './core/vault';
import type { Store, VaultApi } from './core/vault';
import { Patients, Patient, ptBed, ptIni } from './core/patients';
import type { PatientRec, PatientTipo, PatientFicha, AvulsoRec, PatientsApi, PatientApi } from './core/patients';
import { engine, gasF } from './engine';
import { isBusy } from './pcr';

export type { Cls, RangeTag, LimKey, Store, VaultApi, PatientRec, PatientTipo, PatientFicha, AvulsoRec, PatientsApi, PatientApi };
export { num, ok, fmt, fmtDose, fmtN, norm, esc, LIM, rangeTag, rangeLbl, berlin, fio2, renal, infMath, store, Vault, Patients, Patient, ptBed, ptIni };

export const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
/* arredonda a 9 casas antes de comparar com limites de faixa (evita 0,04000000001 > 0,04) */
export const r9 = (v: number) => Math.round(v * 1e9) / 1e9;

export interface CalcApi {
  num: typeof num;
  ok: typeof ok;
  fmt: typeof fmt;
  fmtDose: typeof fmtDose;
  fmtN: typeof fmtN;
  norm: typeof norm;
  esc: typeof esc;
  fio2: typeof fio2;
  berlin: typeof berlin;
  rangeTag: typeof rangeTag;
  rangeLbl: typeof rangeLbl;
  LIM: typeof LIM;
  renal: typeof renal;
  infMath: typeof infMath;
  store: Store;
  Vault: VaultApi;
  Patients: PatientsApi;
  Patient: PatientApi;
  ptBed: typeof ptBed;
  ptIni: typeof ptIni;
  engine: typeof engine;
  gasF: typeof gasF;
  /* true enquanto há algo que não pode ser interrompido pelo bloqueio automático (ex.: PCR em andamento) */
  isBusy: typeof isBusy;
}

export const C: CalcApi = {
  num, ok, fmt, fmtDose, fmtN, norm, esc, fio2, berlin, rangeTag, rangeLbl, LIM,
  renal, infMath, store, Vault, Patients, Patient, ptBed, ptIni,
  engine, gasF, isBusy,
};
