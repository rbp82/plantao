/* SOFA: disfunção orgânica por sistema e mortalidade observada (Ferreira 2001). */
import { useEffect, useState } from 'react';
import { ChoiceList, Ref, Section, Verdict } from '@/components/ui';
import { registerTool, type ToolProps } from '@/tools/registry';
import { computeSofa, SOFA } from './sofa.calc';
import { PickGrid } from './shared';

function SofaTool({ api }: ToolProps) {
  const [pts, setPts] = useState<number[]>(SOFA.map(() => 0));
  const m = computeSofa(pts);
  useEffect(() => { api.setSummary(m.summary); });
  const set = (i: number, v: string) => { const n = pts.slice(); n[i] = +v; setPts(n); };
  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-14 z-10 -mx-1 px-1 pt-1">
        <Verdict cls={m.cls} kicker="SOFA total" title={<span className="num">{m.total} <span className="text-[16px] opacity-70">/ 24</span></span>} desc={m.txt}>
          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-foreground/10"><i className="block h-full bg-current transition-[width]" style={{ width: `${m.pct}%` }} /></div>
        </Verdict>
      </div>
      {SOFA.map((s, i) => (
        <Section key={s.k} title={s.sys} aux={s.par}>
          {s.stack
            ? <ChoiceList value={String(pts[i])} onChange={(v) => set(i, v)} options={s.opts.map((o, p) => ({ value: String(p), label: o, lead: p }))} />
            : <PickGrid cols={3} value={String(pts[i])} onChange={(v) => set(i, v)} options={s.opts.map((o, p) => ({ value: String(p), label: o, small: `${p} pt` }))} />}
        </Section>
      ))}
      <Ref>Δ SOFA ≥ 2 em relação ao basal define disfunção orgânica (Sepsis-3). Itens não avaliados ficam em 0. Respiratório: 3 ou 4 pontos exigem suporte ventilatório; P/F {'<'} 200 sem suporte pontua 2. Mortalidade observada por faixa de SOFA na admissão (Ferreira, JAMA 2001: 0–1, 2–3, 4–5, 6–7, 8–9, 10–11, ≥ 12); é dado de coorte, não previsão individual.</Ref>
    </div>
  );
}

registerTool({
  id: 'sofa', group: 'inf', tile: 'SOFA',
  title: 'SOFA',
  sub: 'Disfunção orgânica e mortalidade estimada',
  keywords: ['sequential organ failure', 'disfuncao organica', 'mortalidade', 'sepse', 'escore'],
  Component: SofaTool,
});
