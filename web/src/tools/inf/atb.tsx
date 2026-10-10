/* Ajuste renal de ATB: Cockcroft-Gault, CKD-EPI 2021 e dose por droga (chips de seleção, cartões de dose). */
import { useEffect, useRef, useState } from 'react';
import { Button, Card } from '@heroui/react';
import { ChevronDown } from 'lucide-react';
import { C, fmt } from '@/lib/calc';
import { usePatientField } from '@/lib/patients';
import { Empty, Grid, Lbl, Note, NumField, Pill, Readout, Readouts, Ref, Section, SegField, Span2, tone } from '@/components/ui';
import { registerTool, type ToolProps } from '@/tools/registry';
import { CLS, computeAtb, DB, type Sex } from './atb.calc';
import { val } from './shared';

/* seleção mantida enquanto o app está aberto (como o Set do app anterior), sem ir ao cofre */
let selectedCache: string[] = [];

const rxBorder: Record<string, string> = { success: 'border-l-success', warning: 'border-l-warning', danger: 'border-l-danger', accent: 'border-l-accent', default: 'border-l-border' };

function AtbTool({ api }: ToolProps) {
  const [idade, setIdade] = usePatientField('idade');
  const [cr, setCr] = usePatientField('cr');
  const [peso, setPeso] = usePatientField('peso');
  const [altura, setAltura] = usePatientField('altura');
  const [sexo, setSexo] = usePatientField('sexo');
  const [basis, setBasis] = useState<'cg' | 'ckd'>('cg');
  const [selected, setSelectedState] = useState<string[]>(selectedCache);
  const setSelected = (s: string[]) => { selectedCache = s; setSelectedState(s); };
  const toggle = (d: string) => setSelected(selected.includes(d) ? selected.filter((x) => x !== d) : [...selected, d]);
  const sex: Sex = sexo === 'M' || sexo === 'F' ? sexo : '';
  const m = computeAtb({ age: val(idade, C.LIM.idade), cr: val(cr, C.LIM.cr), wt: val(peso, C.LIM.peso), ht: val(altura, C.LIM.altura), sex, basis, selected });
  useEffect(() => { api.setSummary(m.summary); });

  /* atalho flutuante para as doses quando estão abaixo da tela */
  const res = useRef<HTMLDivElement>(null);
  const [resVisible, setResVisible] = useState(false);
  useEffect(() => {
    const el = res.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([en]) => setResVisible(en.isIntersecting || en.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const n = selected.length;

  return (
    <div className="flex flex-col gap-3">
      <Section>
        <Grid>
          <NumField label="Idade" unit="anos" placeholder="65" lim={C.LIM.idade} value={idade} onChange={setIdade} />
          <NumField label="Creatinina" unit="mg/dL" placeholder="1,4" lim={C.LIM.cr} value={cr} onChange={setCr} />
          <NumField label="Peso" unit="kg" placeholder="70" lim={C.LIM.peso} value={peso} onChange={setPeso} />
          <NumField label="Altura" unit="cm" placeholder="170" optional lim={C.LIM.altura} value={altura} onChange={setAltura} />
          <Span2><SegField label="Sexo biológico" value={sex} onChange={setSexo} options={[{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Feminino' }]} /></Span2>
        </Grid>
      </Section>
      <Readouts>
        <Readout label="Cockcroft-Gault" value={Number.isFinite(m.cg) ? fmt(m.cg, 1) : null} unit="mL/min" cls={m.sCg[0]} status={m.sCg[1]} note={Number.isFinite(m.cg) ? m.w.label : 'idade, peso, sexo, Cr'} />
        <Readout label="CKD-EPI 2021" value={Number.isFinite(m.ckd) ? fmt(m.ckd, 1) : null} unit="mL/min/1,73m²" cls={m.sCk[0]} status={m.sCk[1]} note={Number.isFinite(m.ckd) ? 'estadiamento KDIGO' : 'idade, sexo, Cr'} />
      </Readouts>
      {m.diverg && <Note cls="info">{m.diverg}</Note>}
      <SegField label="Ajustar doses por" value={basis} onChange={(v) => setBasis(v as 'cg' | 'ckd')} options={[{ value: 'cg', label: 'Cockcroft-Gault', small: 'padrão das bulas' }, { value: 'ckd', label: 'CKD-EPI' }]} />
      <Section title="Antimicrobianos" aux={n > 0 && <Button variant="ghost" size="sm" className="h-8 rounded-lg" onPress={() => setSelected([])}>Limpar</Button>}>
        <div className="flex flex-col gap-3">
          {Object.entries(CLS).map(([k, [l, ds]]) => (
            <div key={k}>
              <Lbl className="mb-1.5">{l}</Lbl>
              <div className="flex flex-wrap gap-1.5">
                {ds.map((d) => {
                  const on = selected.includes(d);
                  return (
                    <button key={d} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(d)}
                      className={`min-h-10 rounded-full border px-3.5 text-[14px] font-medium transition-colors ${on ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-surface active:bg-surface-secondary'}`}>{d}</button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Section>
      <div ref={res} className="flex scroll-mt-16 flex-col gap-2.5">
        {m.state === 'none' && <Empty>Selecione os antimicrobianos acima.</Empty>}
        {m.state === 'missing' && <Note cls="warn">Preencha idade, sexo e creatinina (e peso para Cockcroft-Gault) para ver as doses.</Note>}
        {m.state === 'ok' && (
          <>
            <Lbl className="mb-0">Doses para ClCr {fmt(m.cl, 1)} mL/min · {m.basisLbl}</Lbl>
            {m.cards.map((c) => (
              <Card key={c.name} className={`w-full gap-0 border-l-4 p-3.5 ${rxBorder[tone(c.cls)]}`}>
                <div className="flex items-start justify-between gap-2"><b className="text-[16px] font-semibold leading-tight">{c.name}</b><Pill cls={c.cls}>{c.badge}</Pill></div>
                <div className="mt-1.5 text-[15px] leading-snug">{c.dose}</div>
                <div className="mt-1.5 text-[12.5px] text-muted">Dose habitual: <s>{c.normal}</s></div>
              </Card>
            ))}
          </>
        )}
      </div>
      {n > 0 && !resVisible && (
        <div className="pointer-events-none sticky bottom-20 z-10 flex justify-end">
          <Button variant="primary" className="pointer-events-auto h-11 rounded-full px-4 shadow-lg" onPress={() => res.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            Ver {n} dose{n > 1 ? 's' : ''} <ChevronDown className="size-4" />
          </Button>
        </div>
      )}
      <Ref>Fontes: bulas FDA (DailyMed) de cada droga; teicoplanina: SPC Targocid (UK); gentamicina: nomograma de Hartford (Nicolau 1995); vancomicina: ASHP/IDSA 2020; colistina: consenso internacional 2019 (Tsuji). O consenso da colistina calcula o ClCr com peso ajustado. Drogas nefrotóxicas exigem controle laboratorial seriado; validar com a farmácia clínica.</Ref>
    </div>
  );
}

registerTool({
  id: 'atb', group: 'inf', tile: 'ClCr',
  title: 'Ajuste renal de ATB',
  sub: 'Cockcroft-Gault, CKD-EPI 2021 e dose por droga',
  keywords: ['clearance', 'creatinina', 'tfg', 'cockcroft', 'ckd-epi', 'funcao renal', 'antibiotico', ...Object.keys(DB), 'pipetazo', 'tazocin', 'vanco', 'mero', 'polimixina', 'hemodialise'],
  Component: AtbTool,
});
