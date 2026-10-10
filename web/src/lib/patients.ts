/* Pacientes e dados compartilhados (peso, idade, sexo, altura, creatinina) — ganchos React sobre C.Patients/C.Patient */
import { useCallback } from 'react';
import { C, num, type PatientRec } from './calc';
import { useStoreVersion } from './store';

export type PatientKey = 'peso' | 'idade' | 'sexo' | 'altura' | 'cr' | 'crBase' | 'pamAlvo';

export function useActivePatient(): PatientRec | null {
  useStoreVersion();
  return C.Patients.active();
}
export function usePatientList(): PatientRec[] {
  useStoreVersion();
  return C.Patients.list();
}
/* valor compartilhado de um campo do paciente (texto como digitado) */
export function usePatientField(key: PatientKey): [string, (v: string) => void] {
  useStoreVersion();
  const v = C.Patient.get(key) ?? '';
  const set = useCallback((x: string) => C.Patient.set(key, x), [key]);
  return [String(v), set];
}
/* peso numérico plausível ou NaN */
export function usePeso(): number {
  const [p] = usePatientField('peso');
  const n = num(p);
  const [lo, hi] = C.LIM.peso;
  return Number.isFinite(n) && n >= lo && n <= hi ? n : NaN;
}
export const patientName = (p: PatientRec | null) => C.Patients.name(p);
export const patientSummary = () => C.Patient.summary();
