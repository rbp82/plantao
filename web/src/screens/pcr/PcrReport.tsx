/* Rota `pcr-relatorio?id=`: resumo, linha do tempo e texto do relatório (cópia/compartilhamento), vínculo a paciente. */
import { useEffect, useState } from 'react';
import { Button, toast } from '@heroui/react';
import { Copy, Share2, UserRound } from 'lucide-react';
import { TopBar, Page } from '@/components/Shell';
import { Readout, Readouts, Ref, Section, Verdict } from '@/components/ui';
import { store } from '@/lib/core/vault';
import { Patients, type PatientRec } from '@/lib/core/patients';
import { num } from '@/lib/core/num';
import { useStore } from '@/lib/store';
import { navigate } from '@/lib/router';
import { hm, mmss, outcomeTxt, report, RITMO, type PcrCase } from '@/lib/pcr';
import { PcrTimeline } from './parts';
import { PcrSheets, type SheetState } from './sheets';

const AIRWAY: Record<string, string> = { bvm: 'BVM', sga: 'Supraglótico', iot: 'IOT' };

export function PcrReport({ query }: { query: URLSearchParams }) {
  const id = query.get('id');
  const [h] = useStore<PcrCase[]>('pcrHist', []);
  const c = h.find((x) => x.id === id);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  useEffect(() => { if (!c) navigate('pcr', true); }, [c]);
  useEffect(() => { document.title = 'Relatório de PCR — Plantão'; }, []);
  if (!c) return null;
  const { text, s } = report(c);
  const end = c.end ?? c.start;
  const copy = () => navigator.clipboard.writeText(text).then(() => toast.success('Relatório copiado')).catch(() => toast.danger('Não foi possível copiar'));
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: 'Relatório de PCR', text }); } catch { /* cancelado */ } }
    else copy();
  };
  const link = () => {
    const list = Patients.list().filter((x) => !(x as PatientRec & { archived?: boolean }).archived);
    if (!list.length) return toast('Nenhum paciente na lista de leitos');
    setSheet({ kind: 'pick', title: 'Vincular a qual paciente?', opts: list.map((x) => [x.id, Patients.name(x), '']), cb: (pid) => {
      const p = Patients.get(pid);
      if (!p) return;
      const hh = store.get<PcrCase[]>('pcrHist', []);
      const it = hh.find((x) => x.id === c.id);
      if (!it) return;
      it.patientId = p.id; it.patientName = Patients.name(p);
      if (!it.weight && p.data && Number.isFinite(num(p.data.peso))) it.weight = num(p.data.peso);
      store.set('pcrHist', hh);
      const pp = p as PatientRec & { pcrs?: string[] };
      pp.pcrs = (pp.pcrs || []).concat(c.id); Patients.touch(p);
      toast(`Relatório vinculado a ${Patients.name(p)}`);
    } });
  };
  return (
    <>
      <TopBar kicker={`${new Date(c.start).toLocaleDateString('pt-BR')} · ${hm(c.start)}`} title="Relatório de PCR"
        right={<Button variant="ghost" isIconOnly aria-label="Copiar relatório" className="size-11 rounded-xl" onPress={copy}><Copy className="size-5" /></Button>} />
      <Page>
        <Verdict cls={c.outcome === 'rce' ? 'ok' : c.outcome === 'obito' ? 'crit' : 'info'} kicker={`${c.patientName || 'Sem identificação'} · duração ${mmss(end - c.start)}`} title={outcomeTxt(c)} desc={`Ritmo inicial: ${s.firstRhythm ? RITMO[s.firstRhythm] : 'não registrado'}`} />
        <Readouts className="mt-3">
          <Readout label="Choques" value={s.shocks} />
          <Readout label="Adrenalina" value={s.epi.length} unit="doses" />
          <Readout label="Antiarrítmico" value={s.amio + s.lido} unit="doses" />
          <Readout label="Via aérea" value={s.airway ? AIRWAY[s.airway] || s.airway : '—'} />
        </Readouts>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button variant="primary" className="h-13 text-[15px]" onPress={copy}><Copy className="size-5" /> Copiar para o prontuário</Button>
          <Button variant="secondary" className="h-13 text-[15px]" onPress={share}><Share2 className="size-5" /> Compartilhar</Button>
        </div>
        {!c.patientId && <Button variant="secondary" fullWidth className="mt-3 h-13 text-[15px]" onPress={link}><UserRound className="size-5" /> Vincular a um paciente da lista</Button>}
        <Section title="Linha do tempo" aux={`${c.events.length} eventos`} className="mt-3"><PcrTimeline c={c} /></Section>
        <details className="mt-3 rounded-2xl border border-separator bg-surface">
          <summary className="flex min-h-14 cursor-pointer items-center px-4 text-[16px] font-semibold tracking-tight">Texto do relatório</summary>
          <pre className="whitespace-pre-wrap break-words px-4 pb-4 font-mono text-[12.5px] leading-relaxed text-foreground/85">{text}</pre>
        </details>
        <Ref>Revise e complemente antes de anexar ao prontuário. Horários conforme o relógio deste aparelho.</Ref>
      </Page>
      <PcrSheets sheet={sheet} onClose={() => setSheet(null)} onRef={(rid) => setSheet({ kind: 'ref', id: rid })} />
    </>
  );
}
