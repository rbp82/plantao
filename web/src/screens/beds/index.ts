/* Rotas do quadro de leitos (nomes e parâmetros os mesmos do beds.js, para os links antigos continuarem válidos):
   leitos (alias pacientes) ?volta=<id da calculadora> · paciente?id= · ficha?id=&volta=&de=gaso · gaso?id=&rec=&novo=1 (aceita p=/r=). */
import type { ComponentType } from 'react';
import { Board } from './Board';
import { PatientPage } from './PatientPage';
import { Ficha } from './Ficha';
import { Gaso } from './Gaso';

export const BEDS_ROUTES: Record<string, ComponentType<{ query: URLSearchParams }>> = {
  leitos: Board,
  pacientes: Board,
  paciente: PatientPage,
  ficha: Ficha,
  gaso: Gaso,
};
