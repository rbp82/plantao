/* Sedação e analgesia contínua — sedativos, opioides e BNM (ver sedacao.calc.ts). */
import { useEffect } from 'react';
import { InfusionCard, ModeSwitch, useInfusionSet } from '@/components/InfusionCard';
import { Note, Ref, SegField } from '@/components/ui';
import { useStore } from '@/lib/store';
import { registerTool, type ToolProps } from '@/tools/registry';
import { SED_ALL, SED_BY_CAT, SED_CATS, type SedCat } from './sedacao.calc';

const NOTES: Record<SedCat, React.ReactNode> = {
  sed: <Note cls="warn"><b>PRIS</b> (síndrome de infusão do propofol): risco com dose {'>'} 4 mg/kg/h por {'>'} 48 h.</Note>,
  opi: <Note cls="info"><b>Analgesia primeiro</b> (SCCM PAD): tratar a dor antes de escalar sedação. Reavaliar diariamente e desmamar precocemente.</Note>,
  bnm: (
    <>
      <Note cls="crit">BNM exige sedação profunda (RASS −4 a −5) e analgesia adequada. Monitorar TOF — meta 1–2 respostas em 4. Indicações: SDRA grave, HIC, hipotermia terapêutica.</Note>
      <Note cls="info">Sugamadex reverte rocurônio e vecurônio. Cisatracúrio não necessita reversão farmacológica.</Note>
    </>
  ),
};

function SedTool({ api, peso }: ToolProps) {
  const [catS, setCat] = useStore<string>('sedCat', 'sed');
  const cat: SedCat = catS === 'opi' || catS === 'bnm' ? catS : 'sed';
  const set = useInfusionSet('sed', SED_ALL, peso);
  useEffect(() => { api.setSummary(set.summary()); });
  return (
    <>
      <SegField value={cat} onChange={setCat} options={SED_CATS} className="mb-3" />
      <ModeSwitch mode={set.mode} onChange={set.switchMode} />
      <div className="flex flex-col gap-3">
        {SED_BY_CAT[cat].map((d) => <InfusionCard key={d.id} d={d} mode={set.mode} peso={peso} input={set.inputs[d.id] || ''} onInput={(v) => set.setInput(d.id, v)} />)}
      </div>
      {NOTES[cat]}
      <Ref>Faixas de sedativos e opioides: SCCM PAD 2013 — Barr J et al. Crit Care Med 2013;41:263–306 (PMID 23269131; DOI 10.1097/CCM.0b013e3182783b72), tabelas 3 e 6; conduta (analgesia primeiro, sedação leve, evitar benzodiazepínico): PADIS 2018 — Devlin JW et al. Crit Care Med 2018;46:e825–e873 (PMID 30113379). Propofol, midazolam e dexmedetomidina também conforme bula FDA/DailyMed (Diprivan, midazolam, Precedex); dexmedetomidina até 1,5 mcg/kg/h: Shehabi Y et al. N Engl J Med 2019;380:2506 (SPICE III, PMID 31112380) e Hughes CG et al. N Engl J Med 2021;384:1424 (MENDS2, PMID 33528922). PRIS: bula Diprivan (&gt; 5 mg/kg/h por &gt; 48 h; não exceder 4 mg/kg/h) e Krajčová A et al. Crit Care 2015;19:398 (PMID 26558513 — descrita também abaixo de 4 mg/kg/h). BNM: bulas (cisatracúrio 0,5–10,2 mcg/kg/min; rocurônio 4–16 mcg/kg/min; vecurônio 0,8–1,2 mcg/kg/min) e SCCM 2016 — Murray MJ et al. Crit Care Med 2016;44:2079 (PMID 27755068) — titular pelo TOF. Diluições editáveis — a alteração fica salva neste aparelho. Conferido com o Guia Farmacêutico do Hospital Sírio-Libanês e o Manual Farmacêutico do Hospital Israelita Albert Einstein (monografias públicas, 11/10/2026). Divergências: rocurônio em UTI 0,48–0,72 mg/kg/h (HSL) e 10–12 mcg/kg/min (HIAE) — teto do app ampliado de 0,6 para 0,72; midazolam até 0,2 mg/kg/h no HIAE (app mantém 0,02–0,1 da bula FDA/PAD; HSL só tem a monografia oral); propofol 0,3–4 mg/kg/h nos dois guias (app sinaliza acima de 3); dexmedetomidina e fentanil com nota de redução em hepatopatia/disfunção renal (acrescentada); a monografia de cetamina do HSL é de escetamina (2–7 mcg/kg/min); sufentanil com provável erro de unidade no HIAE (0,1–0,5 mcg/kg/min); cisatracúrio 1–4 mcg/kg/min no HIAE (app mantém 0,5–10 da bula); vecurônio sem monografia nos dois guias.</Ref>
    </>
  );
}

registerTool({
  id: 'sedacao', group: 'sed', tile: 'SED', weight: true,
  title: 'Sedação e analgesia contínua',
  sub: 'Propofol, midazolam, dexmed, fentanil, BNM',
  keywords: ['propofol', 'midazolam', 'dormonid', 'dexmedetomidina', 'precedex', 'cetamina', 'ketamina', 'fentanil', 'morfina', 'sufentanil', 'remifentanil', 'rocuronio', 'cisatracurio', 'vecuronio', 'bloqueador neuromuscular', 'bnm', 'pris', 'infusao', 'ml/h', 'sedoanalgesia'],
  Component: SedTool,
});
