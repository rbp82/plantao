/* Peças compartilhadas pelas telas da PCR: linha do tempo, checklist pós-RCE, situações especiais. */
import { Section, Steps } from '@/components/ui';
import { hms, mmss, type PcrInput } from '@/lib/pcr';
import { SrcButton } from './sheets';

const DOT: Record<string, string> = {
  inicio: 'bg-foreground/60', ritmo: 'bg-accent', choque: 'bg-danger', epi: 'bg-warning', amio: 'bg-warning', lido: 'bg-warning',
  fim: 'bg-foreground', nota: 'bg-muted/60',
};
export function PcrTimeline({ c }: { c: PcrInput }) {
  return (
    <ol className="flex flex-col">
      {c.events.slice().reverse().map((e, i) => (
        <li key={`${e.t}-${i}`} className="flex items-baseline gap-3 border-t border-separator/60 py-2 text-[14.5px] first:border-t-0">
          <span className={`mt-0.5 size-2.5 shrink-0 self-center rounded-full ${DOT[e.type] || 'bg-muted/40'}`} aria-hidden="true" />
          <time className="num w-12 shrink-0 font-mono text-[13px] font-semibold">{mmss(e.t - c.start)}</time>
          <span className="min-w-0 flex-1 leading-snug">{e.label}</span>
          <small className="num shrink-0 font-mono text-[11px] text-muted">{hms(e.t)}</small>
        </li>
      ))}
    </ol>
  );
}

export function PostRosc({ onRef }: { onRef: (id: string) => void }) {
  return (
    <Section title="Cuidados pós-parada" aux={<SrcButton id="post" onOpen={onRef} />} className="mt-3">
      <Steps items={[
        ['warn', 'PAM ≥ 65 mmHg (1, B-R)'],
        ['warn', 'SpO₂ 90–98 % (PaO₂ 60–105 mmHg) (2a, B-R)'],
        ['warn', 'PaCO₂ 35–45 mmHg (1, B-R)'],
        ['warn', 'ECG de 12 derivações assim que possível (1, B-NR); supra de ST com suspeita de causa cardíaca → coronariografia de emergência (1, B-NR); sem supra, se choque cardiogênico, arritmia ventricular recorrente ou isquemia em curso (2a, B-NR)'],
        ['info', 'Não responde a comando verbal: temperatura entre 32 e 37,5 °C (1, B-R) por pelo menos 36 h (2a, B-R)'],
        ['info', 'TC da cabeça à pelve (2b, B-NR) e ecocardiograma/POCUS (2b, C-LD) podem ser razoáveis'],
        ['info', 'Evitar glicemia < 70 e > 180 mg/dL (2b, B-NR)'],
        ['info', 'Prognóstico multimodal, consolidado ≥ 72 h após normotermia e suspensão de sedativos (2a, B-NR)'],
      ]} />
    </Section>
  );
}

export function Specials({ onRef }: { onRef: (id: string) => void }) {
  return (
    <>
      <Steps items={[
        ['warn', <><b>Gestante:</b> desvio uterino manual para a esquerda (1); parto de ressuscitação em até 5 min (1)</>],
        ['warn', <><b>Hipotermia:</b> adiar novos choques e adrenalina até temperatura central ≥ 30 °C (2b)</>],
        ['warn', <><b>TEP:</b> confirmada → trombólise ou embolectomia (2a); suspeita → trombólise pode ser considerada (2b)</>],
        ['info', <><b>Hipercalemia:</b> cálcio, bicarbonato e insulina + glicose com efetividade não estabelecida (2b); dose da Tabela 3: insulina regular 10 U IV em 15–30 min + glicose 50 g</>],
        ['info', <><b>Bloqueadores de canal de sódio (ex.: tricíclicos), cocaína, anestésicos locais:</b> bicarbonato 50–150 mEq IV (dose adulta, Tabela 4)</>],
        ['info', <><b>Opioide:</b> naloxona se não atrapalhar a RCP (2b)</>],
        ['info', <><b>Torsades com QT longo:</b> magnésio pode ser considerado (2b; dose não especificada na AHA 2025)</>],
      ]} />
      <div className="mt-3 flex flex-wrap gap-1.5">
        <SrcButton id="especiais" onOpen={onRef}>fonte: gestante, hipotermia</SrcButton>
        <SrcButton id="hiperk" onOpen={onRef}>hipercalemia</SrcButton>
        <SrcButton id="tox" onOpen={onRef}>antídotos</SrcButton>
        <SrcButton id="torsades" onOpen={onRef}>torsades</SrcButton>
        <SrcButton id="tep" onOpen={onRef}>TEP</SrcButton>
      </div>
    </>
  );
}
