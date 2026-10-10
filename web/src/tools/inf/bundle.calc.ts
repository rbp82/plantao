/* Bundle da 1ª hora (SSC/ILAS) — checklist e volume de 30 mL/kg. Lógica pura. */
import { fmt, type Cls } from '@/lib/calc';

export const BUNDLE: [string, string][] = [
  ['Medir lactato', 'Se > 2 mmol/L: ressuscitação ativa. Se ≥ 4: fluido mesmo sem hipotensão.'],
  ['Hemoculturas antes do antibiótico', 'Mínimo 2 pares. Não atrasar o antibiótico pela coleta.'],
  ['Antibiótico de amplo espectro', 'Dentro da 1ª hora. Ver “ATB empírico por foco”.'],
  ['Cristaloide 30 mL/kg', 'Se hipotensão ou lactato ≥ 4. Completar em até 3 h.'],
  ['Vasopressor se hipotensão persistente', 'Meta PAM ≥ 65. Pode iniciar em acesso periférico. 1ª escolha: noradrenalina.'],
  ['Repetir lactato em 2–4 h', 'Se lactato inicial > 2. Meta: queda ≥ 10%.'],
];

export interface BundleInputs { peso: number; lac: number; done: boolean[] }
export interface BundleModel {
  /* volume de cristaloide (texto formatado) ou null sem peso */
  vol: string | null; volNote: string;
  lacNote: { cls: Cls; t: string } | null;
  done: number; count: string; barCls: Cls; pct: number;
  pend: string[];
  summary: string;
}

export function computeBundle({ peso: p, lac, done: d }: BundleInputs): BundleModel {
  const hasP = p > 0;
  const vol = hasP ? fmt(Math.round(p * 30), 0) : null;
  const volNote = hasP ? `${fmt(p, 0)} kg × 30 mL/kg · em até 3 h` : 'Informe o peso no topo';
  const lacNote: BundleModel['lacNote'] = lac >= 4 ? { cls: 'crit', t: 'Lactato ≥ 4: iniciar 30 mL/kg independentemente da PA.' } : lac > 2 ? { cls: 'warn', t: 'Lactato > 2: repetir em 2–4 h (meta queda ≥ 10%).' } : null;
  const done = BUNDLE.filter((_, i) => d[i]).length;
  const pend = BUNDLE.filter((_, i) => !d[i]).map(([t]) => t.toLowerCase());
  const summary = `Bundle sepse 1ª h: ${done}/6 concluídos${pend.length ? '; pendente: ' + pend.join('; ') : ''}.${hasP ? ` Volume 30 mL/kg = ${Math.round(p * 30)} mL.` : ''}${Number.isFinite(lac) ? ` Lactato inicial ${fmt(lac, 1)} mmol/L.` : ''}`;
  return {
    vol, volNote, lacNote, done,
    count: done === 6 ? 'Completo' : `${done}/6`,
    barCls: done === 6 ? 'ok' : done >= 3 ? 'warn' : 'crit',
    pct: done / 6 * 100, pend, summary,
  };
}
