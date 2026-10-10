/* Antipsicóticos no delirium — referência estática (haloperidol e quetiapina). */
import { useEffect } from 'react';
import { KV, Note, Section } from '@/components/ui';
import { registerTool, type ToolProps } from '@/tools/registry';

const Small = ({ children }: { children: React.ReactNode }) => <small className="block font-normal text-muted">{children}</small>;

function DeliriumTool({ api }: ToolProps) {
  useEffect(() => { api.setSummary(''); });
  return (
    <>
      <Section title="Haloperidol" aux="Delirium hiperativo">
        <KV rows={[
          ['Delirium agudo (IV)', <>2,5–5 mg em bolus<Small>repetir a cada 20–30 min</Small></>],
          ['Manutenção (VO)', '0,5–2 mg 8/8–12/12 h'],
          ['Infusão (refratário)', <>3–25 mg/h IV<Small>com monitorização de QTc</Small></>],
        ]} />
        <Note cls="crit"><b>Contraindicações:</b> QTc {'>'} 500 ms · Parkinson · demência por corpos de Lewy.</Note>
        <Note cls="info"><b>Monitorar:</b> ECG antes e 1 h após (QTc), sintomas extrapiramidais, hipotensão.</Note>
      </Section>
      <Section className="mt-3" title="Quetiapina" aux="Delirium noturno · subagudo">
        <KV rows={[
          ['Dose inicial (VO/SNE)', '12,5–50 mg 12/12 h'],
          ['Titulação', 'até 100–200 mg 12/12 h'],
          ['Via', 'Sem forma IV — usar sonda'],
        ]} />
        <Note cls="ok">Menos efeito extrapiramidal que haloperidol; efeito sedativo adicional; facilita desmame de benzodiazepínico.</Note>
        <Note cls="info"><b>Monitorar:</b> QTc, hipotensão ortostática, sonolência excessiva.</Note>
      </Section>
      <Note cls="warn"><b>SCCM PADIS 2018:</b> evidência insuficiente para uso rotineiro de antipsicóticos na prevenção ou tratamento do delirium. Priorizar medidas não farmacológicas (reorientação, mobilização precoce, ciclo sono-vigília, menos benzodiazepínico).</Note>
      <Note cls="info"><b>Delirium hipoativo</b> não se trata com sedativo: investigar dor, retenção urinária, constipação, privação de sono, abstinência.</Note>
    </>
  );
}

registerTool({
  id: 'delirium', group: 'sed', tile: 'DEL',
  title: 'Antipsicóticos no delirium',
  sub: 'Haloperidol e quetiapina · doses',
  keywords: ['haloperidol', 'haldol', 'quetiapina', 'seroquel', 'delirium', 'agitacao', 'antipsicotico', 'qtc'],
  Component: DeliriumTool,
});
