/* Registro das ferramentas. Cada calculadora é um componente React + uma função de cálculo pura
   (testada em *.test.ts). `href` aponta para telas que ainda vivem no app anterior (fase 2). */
import type { ComponentType } from 'react';

export type Group = 'emerg' | 'hemo' | 'resp' | 'sed' | 'inf' | 'met' | 'hema';

export interface ToolApi {
  /* resumo em texto para o prontuário; vazio quando não há o que copiar */
  setSummary: (s: string) => void;
}
export interface ToolProps { api: ToolApi; peso: number }

export interface Tool {
  id: string;
  group: Group;
  tile: string;
  title: string;
  sub: string;
  keywords: string[];
  /* usa o peso do paciente (mostra a faixa de paciente no topo) */
  weight?: boolean;
  Component?: ComponentType<ToolProps>;
  /* tela própria (app anterior) */
  href?: string;
}

export const GROUPS: Record<Group, { name: string; short: string; color: string }> = {
  emerg: { name: 'Emergência', short: 'Emergência', color: 'var(--color-g-emerg)' },
  met: { name: 'Metabólico e ácido-base', short: 'Metabólico', color: 'var(--color-g-met)' },
  hemo: { name: 'Hemodinâmica e perfusão', short: 'Hemodinâmica', color: 'var(--color-g-hemo)' },
  resp: { name: 'Ventilação e oxigenação', short: 'Ventilação', color: 'var(--color-g-resp)' },
  inf: { name: 'Sepse e infecção', short: 'Infecção', color: 'var(--color-g-inf)' },
  sed: { name: 'Sedação, analgesia e arritmia', short: 'Sedação', color: 'var(--color-g-sed)' },
  hema: { name: 'Hemostasia', short: 'Hemostasia', color: 'var(--color-g-hema)' },
};
export const GROUP_ORDER: Group[] = ['emerg', 'met', 'hemo', 'resp', 'inf', 'sed', 'hema'];

const tools: Tool[] = [];
export const registerTool = (t: Tool) => { tools.push(t); };
export const allTools = () => tools;
export const findTool = (id: string) => tools.find((t) => t.id === id);
export const toolHref = (t: Tool) => t.href || '#/' + t.id;
