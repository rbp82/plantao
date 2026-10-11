/* Antipsicóticos no delirium — referência estática (haloperidol e quetiapina). */
import { useEffect } from 'react';
import { KV, Note, Ref, Section } from '@/components/ui';
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
        {/* Guia HSL (haloperidol, 02/09/2021): via EV off label, ECG contínuo na infusão; Manual HIAE (haloperidol injetável, 27/07/2024): só IM */}
        <Note cls="warn"><b>Via IV é uso off label</b> (bula brasileira: IM) — HSL e HIAE; em infusão contínua, ECG contínuo (HSL: 2–25 mg/h, média 9, máximo 40 mg/h).</Note>
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
      <Ref>Antipsicóticos sem recomendação de rotina e prioridade às medidas não farmacológicas: Devlin JW et al. SCCM PADIS 2018. Crit Care Med 2018;46:e825–e873 (PMID 30113379; DOI 10.1097/CCM.0000000000003299). Ensaios sem benefício do haloperidol (máximo de 20 mg/dia nos protocolos): Girard TD et al. MIND-USA. N Engl J Med 2018;379:2506–16 (PMID 30346242); Andersen-Ranberg NC et al. AID-ICU (2,5 mg IV 3×/dia + resgate, máx. 20 mg/dia). N Engl J Med 2022;387:2425–35 (PMID 36286254). Infusão de haloperidol 3–25 mg/h: série de 8 casos — Riker RR et al. Crit Care Med 1994;22:433–40 (PMID 8124994). Quetiapina 50 mg 12/12 h titulada até 200 mg 12/12 h: Devlin JW et al. Crit Care Med 2010;38:419–27 (PMID 19915454). Diagnóstico: CAM-ICU — Ely EW et al. JAMA 2001;286:2703–10 (PMID 11730446). Conferido com o Guia Farmacêutico do Hospital Sírio-Libanês e o Manual Farmacêutico do Hospital Israelita Albert Einstein (monografias públicas, 11/10/2026). Divergências: os guias divergem entre si na dose aguda — HSL (delirium em UTI) 0,5–1 mg IV, repetindo a cada 15–30 min, e HIAE 2,5–5 mg IM, repetindo a cada hora (app mantém 2,5–5 mg do AID-ICU/MIND-USA); infusão 2–25 mg/h (média 9; máximo 40) no HSL vs 3–25 no app; via IV off label nos dois guias (nota acrescentada); contraindicações (Parkinson, corpos de Lewy, QT) conferem.</Ref>
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
