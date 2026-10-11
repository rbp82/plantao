/* Tela inicial da PCR: iniciar (paciente ativo, peso, energia guardada) e relatórios anteriores. */
import { useEffect } from 'react';
import { ChevronRight, HeartPulse } from 'lucide-react';
import { ListView } from '@/components/pro';
import { TopBar, Page } from '@/components/Shell';
import { Ref } from '@/components/ui';
import { store, Vault } from '@/lib/core/vault';
import { Patients } from '@/lib/core/patients';
import { num } from '@/lib/core/num';
import { useStore } from '@/lib/store';
import { useActivePatient } from '@/lib/patients';
import { hm, mmss, outcomeTxt, saveActive, uid, type PcrCase } from '@/lib/pcr';
import { beep } from './sound';

export function PcrStart() {
  const a = useActivePatient();
  const [h] = useStore<PcrCase[]>('pcrHist', []);
  useEffect(() => { document.title = 'PCR — Plantão'; }, []);
  const start = () => {
    const p = Patients.active();
    const now = Date.now();
    const w = p && p.data ? num(p.data.peso) : NaN;
    saveActive({ id: uid(), start: now, patientId: p ? p.id : null, patientName: p ? Patients.name(p) : '', weight: Number.isFinite(w) ? w : null, energia: store.get<number | null>('pcrEnergia', null), events: [{ t: now, type: 'inicio', label: 'Início da RCP' }], hts: {}, end: null });
    Vault.flush().catch(() => {});
    beep(660, 0.1, 2);
  };
  return (
    <>
      <TopBar root kicker="ACLS adulto · AHA 2025" title="Parada cardiorrespiratória" />
      <Page>
        <button type="button" onClick={start} className="flex min-h-24 w-full items-center gap-4 rounded-2xl bg-danger px-5 py-4 text-left text-danger-foreground shadow-lg active:opacity-90">
          <HeartPulse className="size-10 shrink-0" strokeWidth={2.2} />
          <span className="min-w-0 flex-1">
            <b className="block text-[24px] font-bold leading-tight tracking-tight">Iniciar PCR</b>
            <span className="block text-[14px] opacity-90">{a ? 'Paciente: ' + Patients.name(a) : 'Sem paciente selecionado'} · cronômetro começa agora</span>
          </span>
        </button>
        <p className="mx-1 mb-4 mt-2 text-[13.5px] leading-snug text-muted">O app guia o algoritmo, avisa a checagem de ritmo a cada 2 min e as doses de adrenalina, e registra cada ação com um toque para gerar o relatório. A tela fica acesa e o bloqueio automático é suspenso até encerrar.</p>
        {h.length > 0 && (
          <section className="rounded-2xl border border-separator bg-surface p-3">
            <div className="mb-1 flex items-baseline gap-2 px-1"><h2 className="flex-1 text-[16px] font-semibold tracking-tight">Relatórios anteriores</h2><span className="text-xs text-muted">{h.length}</span></div>
            <ListView aria-label="Relatórios anteriores" variant="primary">
              {h.slice().reverse().slice(0, 10).map((c) => (
                <ListView.Item key={c.id} id={c.id} href={`#/pcr-relatorio?id=${c.id}`} textValue={c.patientName || 'Sem identificação'} className="min-h-15 px-2 py-2.5">
                  <ListView.ItemContent>
                    <span className="min-w-0 flex-1">
                      <ListView.Title className="block whitespace-normal">{c.patientName || 'Sem identificação'} · {new Date(c.start).toLocaleDateString('pt-BR')} {hm(c.start)}</ListView.Title>
                      <ListView.Description className="block">{outcomeTxt(c)} · {mmss((c.end ?? c.start) - c.start)}</ListView.Description>
                    </span>
                  </ListView.ItemContent>
                  <ListView.ItemAction><ChevronRight className="size-5 text-muted" /></ListView.ItemAction>
                </ListView.Item>
              ))}
            </ListView>
          </section>
        )}
        <Ref>Apoio à decisão baseado nas diretrizes AHA 2025 (adulto). Não substitui o julgamento da equipe nem os protocolos da instituição.</Ref>
      </Page>
    </>
  );
}
