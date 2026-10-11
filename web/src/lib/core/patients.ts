/* Pacientes (portado do núcleo do app anterior, auditado).
   Lista de pacientes identificados por iniciais, leito ou nº de atendimento (à escolha).
   Os dados clínicos (peso, idade, sexo, altura, creatinina) ficam no paciente ativo e
   alimentam todas as calculadoras. Sem paciente selecionado, usa-se um registro "avulso"
   que expira em 12 h. Tudo fica dentro do cofre criptografado.

   Formato dos dados (chaves do store 'patients', 'activePatient', 'patient') idêntico ao anterior. */
import { norm } from './num';
import { store } from './vault';

export type PatientTipo = 'ini' | 'leito' | 'atd';

/* ficha do leito (preenchida pelo quadro de leitos); 'ini' e 'leito' podem coexistir com o rótulo */
export interface PatientFicha { ini?: string; leito?: string; [k: string]: unknown }

export interface PatientRec {
  id: string;
  tipo: PatientTipo;
  label: string;
  data: Record<string, string>;
  ficha?: PatientFicha;
  records?: unknown[];
  created: number;
  updated: number;
}

/* registro "avulso" (sem paciente selecionado): { v: dados, t: gravado em } */
export interface AvulsoRec { v?: Record<string, string>; t?: number }

const PT_TTL = 12 * 3600 * 1000;
const PT_TYPES: Record<PatientTipo, string> = { ini: 'Iniciais', leito: 'Leito', atd: 'Atendimento' };

export const Patients = {
  TYPES: PT_TYPES as Record<string, string>,
  list(): PatientRec[] { return store.get<PatientRec[]>('patients', []); },
  save(list: PatientRec[]): void { store.set('patients', list); },
  get(id: string): PatientRec | null { return this.list().find((p) => p.id === id) || null; },
  active(): PatientRec | null { const id = store.get<string | null>('activePatient', null); return id ? this.get(id) : null; },
  setActive(id: string | null): void { store.set('activePatient', id || null); },
  find(tipo: string, label: string): PatientRec | null {
    const n = norm(label).replace(/\s+/g, '');
    return this.list().find((p) => p.tipo === tipo && norm(p.label).replace(/\s+/g, '') === n) || null;
  },
  add(tipo: string, label: string): PatientRec {
    const now = Date.now();
    const p: PatientRec = { id: now.toString(36) + Math.random().toString(36).slice(2, 7), tipo: tipo as PatientTipo, label: String(label).trim().slice(0, 24), data: {}, created: now, updated: now };
    const list = this.list(); list.push(p); this.save(list); this.setActive(p.id);
    return p;
  },
  remove(id: string): void {
    this.save(this.list().filter((p) => p.id !== id));
    if (store.get<string | null>('activePatient', null) === id) this.setActive(null);
  },
  /* rótulo curto: "Leito 12", "J.S.", "Atend. 123456" */
  name(p: PatientRec | null | undefined): string {
    if (!p) return 'Avulso';
    const base = p.tipo === 'ini' ? p.label.toUpperCase() : p.tipo === 'leito' ? 'Leito ' + p.label : 'Atend. ' + p.label;
    const ini = p.tipo !== 'ini' && p.ficha && p.ficha.ini ? ' · ' + p.ficha.ini.toUpperCase() : '';
    return base + ini;
  },
  /* grava alterações feitas no objeto do paciente (ficha, registros) */
  touch(p: PatientRec | null | undefined): void { if (p) p.updated = Date.now(); this.save(this.list()); },
};
export type PatientsApi = typeof Patients;

export const Patient = {
  data(): Record<string, string> {
    const a = Patients.active();
    if (a) return a.data || {};
    const d = store.get<AvulsoRec | null>('patient', null);
    if (!d || !d.t || Date.now() - d.t > PT_TTL) return {};
    return d.v || {};
  },
  get(k: string): string | undefined { return this.data()[k]; },
  set(k: string, v: string | null | undefined): void {
    const a = Patients.active();
    if (a) {
      const list = Patients.list();
      const p = list.find((x) => x.id === a.id);
      if (!p) return;
      p.data = p.data || {};
      if (v === '' || v === null || v === undefined) delete p.data[k]; else p.data[k] = v;
      p.updated = Date.now();
      Patients.save(list);
      return;
    }
    const cur = this.data();
    if (v === '' || v === null || v === undefined) delete cur[k]; else cur[k] = v;
    store.set('patient', { v: cur, t: Date.now() });
  },
  /* limpa os dados do avulso (pacientes da lista são removidos na tela de pacientes) */
  clear(): void { store.del('patient'); },
  summary(d?: Record<string, string>): string {
    d = d || this.data();
    const parts: string[] = [];
    if (d.peso) parts.push(d.peso + ' kg');
    if (d.idade) parts.push(d.idade + ' anos');
    if (d.sexo) parts.push(d.sexo === 'M' ? 'masc.' : 'fem.');
    if (d.altura) parts.push(d.altura + ' cm');
    if (d.cr) parts.push('Cr ' + d.cr);
    return parts.join(' · ');
  },
};
export type PatientApi = typeof Patient;

/* identificação do paciente na lista: leito e iniciais podem coexistir (ficha) */
export const ptBed = (p: PatientRec | null | undefined): string => (!p ? '' : p.tipo === 'leito' ? p.label : (p.ficha && p.ficha.leito) || '');
export const ptIni = (p: PatientRec | null | undefined): string => (!p ? '' : (p.tipo === 'ini' ? p.label : (p.ficha && p.ficha.ini) || '').toUpperCase());
