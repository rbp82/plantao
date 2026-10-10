/* Lidocaína antiarrítmica — bolus por peso, contexto e infusão (ver lidocaina.calc.ts). */
import { useEffect, useState } from 'react';
import { InfusionCard } from '@/components/InfusionCard';
import { ChoiceList, Note, Readout, Readouts, Section, Steps } from '@/components/ui';
import { registerTool, type ToolProps } from '@/tools/registry';
import { LIDO, LIDO_CTX, LIDO_CTX_NOTE, computeLidoBolus, type LidoCtx } from './lidocaina.calc';

function LidoTool({ api, peso }: ToolProps) {
  const [ctx, setCtx] = useState<LidoCtx>('arrest');
  const [inp, setInp] = useState('');
  const b = computeLidoBolus(peso);
  useEffect(() => { api.setSummary(b ? b.summary : ''); });
  const [nCls, nTxt] = LIDO_CTX_NOTE[ctx];
  return (
    <>
      <Section>
        <ChoiceList label="Contexto" value={ctx} onChange={(v) => setCtx(v as LidoCtx)} options={LIDO_CTX.map((o) => ({ value: o.value, label: o.label, sub: o.small }))} />
      </Section>
      <Section className="mt-3" title="Bolus IV/IO">
        <Readouts>
          <Readout label="1ª dose · 1–1,5 mg/kg" value={b?.b1} unit="mg" cls="info" className="col-span-full" note={b ? undefined : 'Informe o peso no topo'} />
          <Readout label="Repetir · 0,5–0,75 mg/kg" value={b?.b2} unit="mg" note="a cada 5–10 min se refratário" />
          <Readout label="Máximo · 3 mg/kg" value={b?.max} unit="mg" cls="warn" note="dose cumulativa" />
        </Readouts>
        <Note cls={nCls}>{nTxt}</Note>
      </Section>
      <div className="mt-3"><InfusionCard d={LIDO} mode="dose" peso={peso} input={inp} onInput={setInp} /></div>
      <Section className="mt-3" title="Protocolo">
        <Steps items={[
          ['crit', <><b>FV/TV sem pulso refratária:</b> amiodarona ou lidocaína (AHA 2020/2025), administrada após o 3º choque — a epinefrina entra após o 2º choque.</>],
          ['', <><b>Pós-ROSC:</b> iniciar infusão 1–4 mg/min. Se atraso {'>'} 15 min entre bolus e infusão, repetir bolus de 0,5 mg/kg.</>],
          ['', <><b>TV monomórfica estável:</b> bolus 1 mg/kg → 1–4 mg/min. Alternativa a procainamida/amiodarona (ACC/AHA/HRS 2017).</>],
          ['', <><b>Duração:</b> reavaliar em 12–24 h e descontinuar gradualmente.</>],
          ['warn', <><b>ICC, hepatopatia ou idoso:</b> reduzir ~50% (≤ 1 mg/min). Nível sérico obrigatório.</>],
          ['info', <><b>Monitorar:</b> nível sérico (1,5–5 mcg/mL; tóxico {'>'} 5–6), ECG contínuo, sinais de toxicidade.</>],
        ]} />
      </Section>
      <Note cls="info">Amiodarona é 1ª linha para TV/FV com cardiopatia estrutural. Lidocaína: TV associada a isquemia aguda/pós-IAM ou quando amiodarona indisponível/contraindicada.</Note>
    </>
  );
}

registerTool({
  id: 'lidocaina', group: 'sed', tile: 'LIDO', weight: true,
  title: 'Lidocaína antiarrítmica',
  sub: 'FV/TV refratária · bolus e manutenção',
  keywords: ['lidocaina', 'xylocaina', 'antiarritmico', 'fibrilacao ventricular', 'taquicardia ventricular', 'fv', 'tv', 'acls', 'pcr', 'parada'],
  Component: LidoTool,
});
