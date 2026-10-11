/* Tromboelastograma — interpretação e hemocomponente por parâmetro. Lógica e traçado em teg.calc.ts. */
import { useEffect, useState } from 'react';
import { CellSlider } from '@/components/pro';
import { Dose, Lbl, NumField, Ref, Section, Steps, Verdict, type Step } from '@/components/ui';
import { num } from '@/lib/calc';
import { registerTool, type ToolProps } from '@/tools/registry';
import { computeTeg, curve, DEFAULTS, P, PRESETS, parseValues, type Key, type TegValues } from './teg.calc';

const fmtIn = (n: number) => String(n).replace('.', ',');
const textsOf = (v: TegValues) => Object.fromEntries(P.map(({ k }) => [k, fmtIn(v[k])])) as Record<Key, string>;

const TONE = { muted: 'var(--muted)', info: 'var(--accent)', warn: 'var(--warning)' } as const;

function Tracing({ v }: { v: TegValues }) {
  const c = curve(v);
  return (
    <svg viewBox={`0 0 ${c.W} ${c.H}`} role="img" aria-label="Traçado simulado do TEG" className="block w-full">
      <g fontFamily="var(--font-mono)" fontSize="9" fill="var(--muted)">
        {c.grid.map((g) => (
          <g key={g.label}>
            <line x1={c.L} x2={c.W - c.R} y1={c.mid - g.y} y2={c.mid - g.y} stroke="var(--separator)" strokeDasharray="2 4" />
            <line x1={c.L} x2={c.W - c.R} y1={c.mid + g.y} y2={c.mid + g.y} stroke="var(--separator)" strokeDasharray="2 4" />
            <text x="2" y={c.mid - g.y + 3}>{g.label}</text>
          </g>
        ))}
      </g>
      <line x1={c.L} x2={c.W - c.R} y1={c.mid} y2={c.mid} stroke="var(--separator)" />
      <path d={c.path} fill="color-mix(in srgb, var(--color-g-hema) 30%, transparent)" stroke="var(--color-g-hema)" strokeWidth="1.4" />
      <g fontFamily="var(--font-mono)" fontSize="10">
        {c.markers.map((m) => (
          <g key={m.label}>
            <line x1={m.x} y1="10" x2={m.x} y2={c.H - 8} stroke={TONE[m.tone]} strokeDasharray="3 3" />
            <text x={m.x + 3} y="18" fill={TONE[m.tone]}>{m.label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function TegTool({ api }: ToolProps) {
  const [texts, setTexts] = useState<Record<Key, string>>(() => textsOf(DEFAULTS));
  const [preset, setPreset] = useState<number | null>(null);
  const v = parseValues(texts);
  const m = computeTeg(v);
  useEffect(() => { api.setSummary(m.summary); });

  const setOne = (k: Key, s: string) => { setTexts((t) => ({ ...t, [k]: s })); setPreset(null); };
  const pick = (i: number) => { setTexts(textsOf(PRESETS[i].v)); setPreset(i); };

  const steps: Step[] = m.steps.length
    ? m.steps.map((st): Step => [st.cls, <><b>{st.n}. {st.t}</b><br />{st.d}{st.dose && <><br /><Dose>{st.dose}</Dose></>}</>])
    : [['ok', <b>Sem indicação de intervenção hemostática.</b>]];

  return (
    <div className="flex flex-col gap-3">
      <Section>
        <Lbl>Padrões de exemplo</Lbl>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Padrões de exemplo">
          {PRESETS.map((p, i) => {
            const on = preset === i;
            return (
              <button key={p.name} type="button" role="radio" aria-checked={on} onClick={() => pick(i)}
                className={`min-h-11 rounded-full border px-3.5 text-[14px] font-medium transition-colors ${on ? 'border-accent bg-accent-soft text-accent-soft-foreground' : 'border-border bg-surface text-foreground/85 active:bg-surface-secondary'}`}>
                {p.name}
              </button>
            );
          })}
        </div>
      </Section>

      <Section>
        <div className="flex flex-col gap-4">
          {P.map((p) => {
            const n = num(texts[p.k]);
            const sv = Number.isFinite(n) ? Math.min(Math.max(n, p.min), p.max) : p.def;
            return (
              <div key={p.k}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <b className="text-[15px] font-semibold">{p.l} <span className="text-[13px] font-normal text-muted">· {p.hint}</span></b>
                </div>
                <div className="flex items-center gap-3">
                  {/* HeroUI Pro CellSlider: arrasta em qualquer ponto da célula; a faixa de referência fica dentro dela */}
                  <CellSlider value={sv} minValue={p.min} maxValue={p.max} step={p.step} aria-label={p.l} className="min-w-0 flex-1"
                    onChange={(v) => setOne(p.k, fmtIn(Array.isArray(v) ? v[0] : v))}>
                    <CellSlider.Track className="h-11">
                      <CellSlider.Fill />
                      <CellSlider.Thumb />
                      <CellSlider.Label className="font-mono text-[11.5px] font-normal text-muted">ref {fmtIn(p.ref[0])}–{p.ref[1]} {p.u}</CellSlider.Label>
                    </CellSlider.Track>
                  </CellSlider>
                  <div className="w-28 shrink-0 [&_label]:sr-only">
                    <NumField label={`${p.l} (${p.u})`} unit={p.u} value={texts[p.k]} onChange={(s) => setOne(p.k, s)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Verdict cls={m.verdict.cls} kicker={m.verdict.kicker} title={m.verdict.title} desc={m.verdict.desc} />
      <Section title="Conduta sugerida">
        <Steps items={steps} />
        <p className="mt-2.5 text-[13px] text-muted">Ordem por grau de desvio. Não tratar número isolado sem sangramento. Repetir TEG após cada intervenção.</p>
      </Section>
      <Section title="Traçado simulado"><Tracing v={v} /></Section>
      <Section title="Por parâmetro">
        <Steps items={m.interp.map((x): Step => [x.cls, <><b>{x.head}</b>{x.body}</>])} />
      </Section>
      <Ref>Referências para TEG® citratado com caolim (faixas do fabricante; Scarpelini S et al. Braz J Med Biol Res 2009;42:1210 — PMID 19882085 — encontrou em voluntários R 3,8–9,8 · K 0,7–3,4 · α 47,8–77,7° · MA 49,7–72,7 · LY30 até 5,8%). LY30 ≥ 3% como limiar de hiperfibrinólise segue a literatura de trauma: Chapman MP et al. J Trauma Acute Care Surg 2013;75:961–967 — PMID 24256667 — doi:10.1097/TA.0b013e3182aa9c9f; a faixa do fabricante é 0–7,4% (limite 7,5%). Condutas: TXA — CRASH-2, Lancet 2010;376:23 — PMID 20554319 — doi:10.1016/S0140-6736(10)60835-5 e Rossaint R et al. Crit Care 2023;27:80 — PMID 36859355 — doi:10.1186/s13054-023-04327-7 (Rec. 23 TXA 1 g/10 min + 1 g/8 h; Rec. 29 fibrinogênio 3–4 g se ≤ 1,5 g/L; Rec. 30 plaquetas &gt; 50/&gt; 100 × 10⁹/L, 4–8 U). Reanimação guiada por TEG no trauma: Gonzalez E et al. Ann Surg 2016;263:1051 — PMID 26720428 (r-TEG; limiares ACT/ângulo &lt; 63°/MA &lt; 55 mm/LY30 ≥ 3%); Holcomb JB et al. Ann Surg 2012;256:476 — PMID 22868371; Moore EE et al. Nat Rev Dis Primers 2021;7:30 — PMID 33927200. Valores variam com reagente, dispositivo (TEG × ROTEM) e laboratório. Correlacionar com sangramento clínico e contexto (trauma, hepatopatia, CEC, sepse).</Ref>
    </div>
  );
}

registerTool({
  id: 'teg', group: 'hema', tile: 'TEG',
  title: 'Tromboelastograma',
  sub: 'Interpretação e hemocomponente por parâmetro',
  keywords: ['teg', 'rotem', 'viscoelastico', 'coagulopatia', 'sangramento', 'plasma', 'crioprecipitado', 'fibrinogenio', 'plaquetas', 'acido tranexamico', 'hiperfibrinolise', 'transfusao'],
  Component: TegTool,
});
