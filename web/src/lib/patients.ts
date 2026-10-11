/* Pacientes e dados compartilhados (peso, idade, sexo, altura, creatinina) — ganchos React sobre Patients/Patient do núcleo */
import { useCallback } from 'react';
import { num, LIM } from './core/num';
import { Patients, Patient, type PatientRec } from './core/patients';
import { useStoreVersion } from './store';

export type PatientKey = 'peso' | 'idade' | 'sexo' | 'altura' | 'cr' | 'crBase' | 'pamAlvo';

export function useActivePatient(): PatientRec | null {
  useStoreVersion();
  return Patients.active();
}
export function usePatientList(): PatientRec[] {
  useStoreVersion();
  return Patients.list();
}
/* valor compartilhado de um campo do paciente (texto como digitado) */
export function usePatientField(key: PatientKey): [string, (v: string) => void] {
  useStoreVersion();
  const v = Patient.get(key) ?? '';
  const set = useCallback((x: string) => Patient.set(key, x), [key]);
  return [String(v), set];
}
/* peso numérico plausível ou NaN */
export function usePeso(): number {
  const [p] = usePatientField('peso');
  const n = num(p);
  const [lo, hi] = LIM.peso;
  return Number.isFinite(n) && n >= lo && n <= hi ? n : NaN;
}
export const patientName = (p: PatientRec | null) => Patients.name(p);
export const patientSummary = () => Patient.summary();
