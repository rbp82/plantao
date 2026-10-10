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
      <Ref>Faixas de sedativos e opioides: SCCM PAD 2013 (Barr J et al. Crit Care Med 2013;41:263). BNM: faixas usuais de bula — titular pelo TOF. Diluições editáveis — a alteração fica salva neste aparelho.</Ref>
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
