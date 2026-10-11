/* PCR em andamento: cronômetro grande, ciclo de 2 min, orientação "agora" e "a fazer" (caixa a caixa), botões de um
   toque (ritmo, choque, adrenalina, antiarrítmico, mais…), H's e T's, situações especiais, linha do tempo e encerramento.
   Cronômetros pelo relógio (Date.now); estado gravado no cofre a cada evento. */
import { useEffect, useRef, useState } from 'react';
import { Button, toast } from '@heroui/react';
import { CheckGroup, CheckRow, Pill, Section, Steps } from '@/components/ui';
import { store, Vault } from '@/lib/core/vault';
import { Patients, type PatientRec } from '@/lib/core/patients';
import { navigate } from '@/lib/router';
import { active, saveActive, hist, derive, guide, mmss, hm, fmtN, dec, HT, RITMO, PROTO, type PcrCase, type PcrEvent, type PcrEventType, type Act, type Outcome } from '@/lib/pcr';
import { beep, buzz, keepAwake, metroOn, startMetro, stopMetro } from './sound';
import { PcrSheets, SrcButton, type SheetState, type PickOpt } from './sheets';
import { PcrTimeline, PostRosc, Specials } from './parts';

type SetSheet = (s: SheetState | null) => void;

/* registra um evento com um toque: grava no cofre, vibra e avisa */
function log(type: PcrEventType, extra: Partial<PcrEvent>) {
  const c = active();
  if (!c) return;
  const now = Date.now();
  const e: PcrEvent = { t: now, type, ...extra };
  c.events.push(e);
  saveActive(c);
  Vault.flush().catch(() => {});
  buzz(30);
  toast(`${mmss(now - c.start)} · ${e.label} registrado`);
}

function energySheet(setSheet: SetSheet, cb: (j: number) => void) {
  const c = active();
  setSheet({ kind: 'energy', current: c ? c.energia : null, cb: (v) => {
    const cc = active(); if (!cc) return;
    cc.energia = v; saveActive(cc); store.set('pcrEnergia', v);
    toast(`Choques em ${v} J`); cb(v);
  } });
}

const DROGA_LABEL: Record<string, string> = { bic: 'Bicarbonato de sódio IV', ca: 'Cálcio IV', mg: 'Sulfato de magnésio IV', insglic: 'Insulina regular 10 U IV + glicose 50 g', nalox: 'Naloxona IV/IO', tromb: 'Trombolítico', mec: 'Compressor mecânico instalado', dsed: 'Troca de vetor / desfibrilação dupla sequencial' };

/* ações dos botões e das pendências ("registrar") — textos e doses idênticos ao app anterior */
function act(a: Act | 'mais' | 'energia' | 'nota', setSheet: SetSheet, openHt: () => void) {
  const c = active();
  if (!c) return;
  const s = derive(c, Date.now());
  const w = c.weight;
  if (a === 'choque') {
    const doShock = (j: number) => log('choque', { v: j, label: `Choque ${j} J (${s.shocks + 1}º)` });
    if (c.energia) return doShock(c.energia);
    /* 1º choque: a energia é a do fabricante do aparelho; fica salva para os próximos */
    return energySheet(setSheet, (j) => doShock(j));
  }
  if (a === 'epi') return log('epi', { label: `Adrenalina 1 mg IV/IO (${s.epi.length + 1}ª dose)` });
  if (a === 'ht') return openHt();
  if (a === 'troca') return log('troca', { label: 'Troca do compressor' });
  if (a === 'aa') {
    const amioNext = s.amio === 0 ? 300 : 150;
    const lido = s.lido === 0 ? PROTO.lido1 : PROTO.lido2;
    const mgkg = `${dec(lido[0])}–${dec(lido[1])} mg/kg`;
    const lidoMg = w ? `${fmtN(lido[0] * w)}–${fmtN(lido[1] * w)} mg` : mgkg;
    const opts: PickOpt[] = [
      ['amio', `Amiodarona ${amioNext} mg IV/IO`, s.amio === 0 ? '1ª dose: 300 mg em bolus' : s.amio === 1 ? '2ª dose: 150 mg' : 'as 2 doses do algoritmo já foram dadas', s.amio >= 2],
      ['lido', `Lidocaína ${lidoMg} IV/IO`, `${s.lido === 0 ? '1ª dose' : s.lido === 1 ? '2ª dose' : 'as 2 doses do algoritmo já foram dadas'}: ${mgkg}${w ? ' · ' + fmtN(w) + ' kg' : ' — informe o peso no paciente'}`, s.lido >= 2],
    ];
    return setSheet({ kind: 'pick', title: 'Amiodarona ou lidocaína (barra lateral do algoritmo)', opts, ref: 'amio', cb: (k) => {
      if (k === 'amio') log('amio', { v: amioNext, label: `Amiodarona ${amioNext} mg IV/IO` });
      else log('lido', { v: w ? Math.round(lido[0] * w) : null, label: `Lidocaína ${lidoMg} IV/IO (${s.lido === 0 ? '1ª' : '2ª'} dose)` });
    } });
  }
  if (a === 'acesso') return setSheet({ kind: 'pick', title: 'Acesso vascular', ref: 'acesso', opts: [['iv', 'Acesso IV', 'tentar primeiro (1, A)'], ['io', 'Acesso intraósseo (IO)', 'se o IV falhar ou não for viável (2a, A)'], ['cvc', 'Acesso venoso central', 'se IV e IO falharem, por profissional treinado (2b)']],
    cb: (k) => log('acesso', { v: k, label: ({ iv: 'Acesso IV', io: 'Acesso IO', cvc: 'Acesso venoso central' } as Record<string, string>)[k] }) });
  if (a === 'via') return setSheet({ kind: 'pick', title: 'Via aérea', ref: 'rcp', opts: [['bvm', 'Bolsa-valva-máscara', '30:2'], ['sga', 'Dispositivo supraglótico', 'depois 1 ventilação a cada 6 s com compressões contínuas'], ['iot', 'Intubação orotraqueal', 'confirmar com capnografia contínua; 1 ventilação a cada 6 s']],
    cb: (k) => log('via', { v: k, label: ({ bvm: 'Ventilação com bolsa-valva-máscara', sga: 'Dispositivo supraglótico inserido', iot: 'Intubação orotraqueal' } as Record<string, string>)[k] }) });
  if (a === 'etco2') return setSheet({ kind: 'number', title: 'ETCO₂ (capnografia)', unit: 'mmHg', quick: [10, 15, 20, 30, 40], cb: (v) => log('etco2', { v, label: `ETCO₂ ${v} mmHg` }) });
  if (a === 'energia') return energySheet(setSheet, () => {});
  if (a === 'nota') return setSheet({ kind: 'text', cb: (t) => log('nota', { label: t }) });
  if (a === 'mais') {
    return setSheet({ kind: 'pick', title: 'Outras ações e drogas', opts: [
      ['acesso', s.access ? 'Acesso vascular (já registrado)' : 'Acesso vascular', 'IV primeiro; IO se o IV falhar'],
      ['via', s.airway ? 'Via aérea (já registrada)' : 'Via aérea', 'BVM, supraglótico ou IOT'],
      ['etco2', 'Registrar ETCO₂', 'capnografia'],
      ['troca', 'Troca do compressor', 'a cada 2 min'],
      ['energia', c.energia ? `Energia do choque: ${c.energia} J` : 'Energia do choque: não definida', 'conforme o fabricante do desfibrilador'],
      ['dsed', 'Troca de vetor / desfibrilação dupla sequencial', 'FV após ≥ 3 choques — utilidade não estabelecida (2b)'],
      ['bic', 'Bicarbonato de sódio 50–150 mEq IV', 'bloqueador de canal de sódio (ex.: tricíclicos), cocaína ou anestésico local — dose adulta da Tabela 4; sem benefício de rotina'],
      ['ca', 'Cálcio', 'sem benefício de rotina; hipercalemia: efetividade não estabelecida, dose não especificada; BB/BCC: cloreto 10% 20 mL ou gluconato 10% 60 mL (Tabela 4)'],
      ['mg', 'Sulfato de magnésio', 'torsades com QT longo (2b); dose não especificada na AHA 2025'],
      ['insglic', 'Insulina regular 10 U IV (em 15–30 min) + glicose 50 g', 'hipercalemia (Tabela 3); efetividade não estabelecida (2b)'],
      ['nalox', 'Naloxona 0,2–2 mg IV/IO', 'suspeita de opioide, se não atrapalhar a RCP (2b); dose da Tabela 4'],
      ['tromb', 'Trombolítico', 'TEP confirmada (2a) ou suspeita (2b)'],
      ['mec', 'Compressor mecânico', 'só se a RCP manual for difícil ou perigosa (2b)'],
      ['nota', 'Anotação livre', ''],
    ], cb: (k) => {
      if (k === 'etco2' || k === 'troca' || k === 'acesso' || k === 'via' || k === 'energia' || k === 'nota') { setTimeout(() => act(k, setSheet, openHt), 0); return; }
      log('droga', { v: k, label: DROGA_LABEL[k] });
    } });
  }
}
/* encerramento: RCE / óbito / interrompida gravam no histórico e abrem o relatório; descartar pede confirmação */
function endCase(k: Outcome) {
  const cc = active();
  if (!cc) return;
  const s = derive(cc, Date.now());
  const now = Date.now();
  if (k === 'rce' && s.rhythm !== 'rce') cc.events.push({ t: now, type: 'ritmo', v: 'rce', label: 'RCE — retorno da circulação espontânea' });
  cc.events.push({ t: now, type: 'fim', label: ({ rce: 'Encerrada com RCE', obito: 'Óbito constatado — esforços encerrados', inter: 'PCR interrompida / transferida' } as Record<Outcome, string>)[k] });
  cc.end = now; cc.outcome = k;
  const h = hist(); h.push(cc); store.set('pcrHist', h.slice(-30));
  if (cc.patientId) { const p = Patients.get(cc.patientId); if (p) { const pp = p as PatientRec & { pcrs?: string[] }; pp.pcrs = (pp.pcrs || []).concat(cc.id); Patients.touch(p); } }
  store.del('pcrAtiva');
  Vault.flush().catch(() => {});
  keepAwake(false); stopMetro();
  navigate(`pcr-relatorio?id=${cc.id}`);
}

const SEV_BG: Record<string, string> = { crit: 'bg-danger-soft text-danger-soft-foreground', warn: 'bg-warning-soft text-warning-soft-foreground', ok: 'bg-success-soft text-success-soft-foreground', info: 'bg-accent-soft text-accent-soft-foreground' };
const SEV_BAR: Record<string, string> = { crit: 'border-danger', warn: 'border-warning', ok: 'border-success', info: 'border-accent' };
const ARC = 119.4; /* 2π · 19 */

export function PcrLive({ c }: { c: PcrCase }) {
  const [now, setNow] = useState(() => Date.now());
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [htOpen, setHtOpen] = useState(false);
  const [metro, setMetro] = useState(metroOn());
  const htRef = useRef<HTMLDetailsElement>(null);
  const lastCycleAlert = useRef<number | null>(null);
  const lastEpiAlert = useRef<number | null>(null);
  useEffect(() => { document.title = 'PCR em andamento — Plantão'; keepAwake(true); }, []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  /* sair da tela para o metrônomo (a PCR continua ativa e a tela acesa, como no app anterior) */
  useEffect(() => () => { stopMetro(); }, []);

  const g = guide(c, now);
  const s = g.s;
  const left = s.inArrest && s.rhythm ? s.cycleLeft : null;
  const lastEpi = s.epi[s.epi.length - 1];
  /* alertas sonoros: fim do ciclo (uma vez por ciclo) e adrenalina aos 3 min */
  useEffect(() => {
    if (left != null && left <= 0 && lastCycleAlert.current !== s.lastCheck) { lastCycleAlert.current = s.lastCheck; beep(880, 0.18, 3); buzz([300, 120, 300]); }
    if (lastEpi && s.inArrest && (s.sinceEpi as number) >= PROTO.epiMinMs && lastEpiAlert.current !== lastEpi) { lastEpiAlert.current = lastEpi; beep(520, 0.25, 1); }
  }, [left, s.lastCheck, lastEpi, s.inArrest, s.sinceEpi]);

  const openRef = (id: string) => setSheet({ kind: 'ref', id });
  const openHt = () => { setHtOpen(true); setTimeout(() => htRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); };
  const run = (a: Act | 'mais') => act(a, setSheet, openHt);
  const rhythm = (r: 'fv' | 'aesp' | 'assist' | 'rce') => {
    if (r === 'rce') return setSheet({ kind: 'confirm', title: 'Confirmar RCE?', text: 'Pulso central palpável / sinais de circulação. O cronômetro de ciclo para; se a parada voltar, registre o ritmo.', ok: 'Confirmar RCE', cb: () => { log('ritmo', { v: 'rce', label: 'RCE — retorno da circulação espontânea' }); beep(990, 0.1, 3); } });
    log('ritmo', { v: r, label: 'Ritmo: ' + RITMO[r] });
  };
  const setHt = (k: string, on: boolean) => { const cc = active(); if (!cc) return; cc.hts = cc.hts || {}; cc.hts[k] = on; saveActive(cc); };
  const undo = () => {
    const cc = active(); if (!cc) return;
    if (cc.events.length <= 1) return toast('Nada para desfazer');
    const e = cc.events.pop(); saveActive(cc); toast('Desfeito: ' + (e?.label || ''));
  };
  const toggleMetro = () => { if (metroOn()) stopMetro(); else startMetro(); setMetro(metroOn()); };
  const end = () => setSheet({ kind: 'pick', title: 'Encerrar a PCR', opts: [
    ['rce', 'RCE — paciente com circulação espontânea', s.rhythm === 'rce' ? 'RCE já registrado' : 'registra o RCE e encerra'],
    ['obito', 'Óbito — esforços encerrados', 'registra o horário do óbito'],
    ['inter', 'Interrompida / transferida', 'ex.: transferência, ECPR, decisão da família'],
    ['cancel', 'Descartar (registro aberto por engano)', 'não gera relatório'],
  ], cb: (k) => {
    if (k === 'cancel') { setTimeout(() => setSheet({ kind: 'confirm', danger: true, title: 'Descartar esta PCR?', text: 'Os eventos registrados serão apagados.', ok: 'Descartar', cb: () => { store.del('pcrAtiva'); keepAwake(false); stopMetro(); toast('PCR descartada'); navigate('/'); } }), 0); return; }
    endCase(k as Outcome);
  } });

  const cycleTxt = left == null ? (s.rhythm === 'rce' ? 'RCE' : '—') : left > 0 ? mmss(left).replace(/^0/, '') : 'agora';
  const frac = left == null ? 0 : Math.max(0, Math.min(1, left / PROTO.cicloMs));
  const cycleTone = s.rhythm === 'rce' ? 'text-success' : left != null && left <= 0 ? 'text-danger' : left != null && left <= 15000 ? 'text-warning' : 'text-accent';
  const htN = Object.values(c.hts || {}).filter(Boolean).length;
  const n = g.now;
  return (
    <div className="pcr-live">
      {/* cabeçalho fixo: tempo total e ciclo de 2 min */}
      <header className={`safe-top sticky top-0 z-20 border-b border-separator bg-background/90 backdrop-blur-md ${left != null && left <= 0 ? 'animate-pulse' : ''}`}>
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10.5px] uppercase tracking-wider text-muted">Tempo total</div>
            <b className="readout block text-[44px] leading-none">{mmss(s.elapsed)}</b>
            <small className="block truncate text-[12px] text-muted">início {hm(c.start)}{c.patientName ? ' · ' + c.patientName : ''}</small>
          </div>
          <div className={`relative size-[76px] shrink-0 ${cycleTone}`} role="timer" aria-label={`Próxima checagem de ritmo em ${cycleTxt}`}>
            <svg viewBox="0 0 44 44" className="size-full -rotate-90" aria-hidden="true">
              <circle cx="22" cy="22" r="19" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4" />
              <circle cx="22" cy="22" r="19" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray={ARC} strokeDashoffset={ARC * (1 - frac)} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
              <b className="readout text-[17px]">{cycleTxt}</b><span className="mt-0.5 text-[10px] text-muted">ritmo</span>
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-3xl flex-wrap gap-1.5 px-4 pb-2">
          {s.rhythm ? <Pill cls={s.shockable ? 'crit' : s.rhythm === 'rce' ? 'ok' : 'info'}>{RITMO[s.rhythm]}</Pill> : <Pill cls="">ritmo não registrado</Pill>}
          <Pill cls="">{s.shocks} choque{s.shocks === 1 ? '' : 's'}</Pill>
          <Pill cls={s.epi.length && s.inArrest && (s.sinceEpi as number) >= PROTO.epiMinMs ? 'warn' : ''}>adrenalina {s.epi.length}× {lastEpi ? '· há ' + mmss(s.sinceEpi as number) : ''}</Pill>
          {(s.amio || s.lido) ? <Pill cls="">{s.amio ? 'amiodarona ' + s.amio + '×' : ''}{s.amio && s.lido ? ' · ' : ''}{s.lido ? 'lidocaína ' + s.lido + '×' : ''}</Pill> : null}
          {s.etco2 && <Pill cls={s.etco2.v < PROTO.etco2Baixo ? 'warn' : ''}>ETCO₂ {s.etco2.v}</Pill>}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-[300px] pt-3">
        {/* agora: a caixa do algoritmo em que a equipe está */}
        <section className={`rounded-2xl border-l-4 px-4 py-3.5 ${SEV_BG[n.sev]} ${SEV_BAR[n.sev]}`} aria-live="polite">
          <div className="flex items-center gap-2">
            <span className="flex-1 font-mono text-[11px] uppercase tracking-wider opacity-80">Agora{n.box ? ' · caixa ' + n.box + ' do algoritmo' : ''}</span>
            {n.ref && <SrcButton id={n.ref} onOpen={openRef} />}
          </div>
          <b className="mt-1 block text-[22px] font-bold leading-tight tracking-tight">{n.txt}</b>
          <p className="mt-1.5 text-[14px] leading-snug opacity-90">{n.sub || ''}</p>
          {n.act && <Button variant="danger" fullWidth className="mt-3 h-14 text-[17px] font-bold" onPress={() => run(n.act!)}>Registrar choque{c.energia ? ' ' + c.energia + ' J' : ''}</Button>}
        </section>

        {/* a fazer: até 3 pendências, cada uma com botão "registrar" e fonte */}
        <div className="mt-2.5 flex flex-col gap-2">
          {g.todo.slice(0, 3).map((t, i) => (
            <div key={i} className={`flex items-stretch gap-2 rounded-xl border-l-4 ${SEV_BG[t.sev]} ${SEV_BAR[t.sev]}`}>
              <button type="button" disabled={!t.act} onClick={() => t.act && run(t.act)} className="flex min-h-14 flex-1 flex-col justify-center px-3.5 py-2 text-left disabled:cursor-default">
                <span className="text-[15px] font-semibold leading-snug">{t.txt}</span>
                {t.act && <em className="font-mono text-[11px] not-italic opacity-75">registrar</em>}
              </button>
              {t.ref && <div className="flex items-center pr-2.5"><SrcButton id={t.ref} onOpen={openRef} /></div>}
            </div>
          ))}
        </div>
        {s.rhythm === 'rce' && <PostRosc onRef={openRef} />}

        <details ref={htRef} open={htOpen} onToggle={(e) => setHtOpen(e.currentTarget.open)} className="mt-3 rounded-2xl border border-separator bg-surface">
          <summary className="flex min-h-14 cursor-pointer items-center gap-2 px-4 text-[16px] font-semibold tracking-tight"><span className="flex-1">Causas reversíveis — 5 H e 5 T</span><span className="text-xs font-normal text-muted">{htN ? `${htN} considerada${htN > 1 ? 's' : ''}` : ''}</span></summary>
          <div className="px-3 pb-3">
            <CheckGroup label="Causas reversíveis">{HT.map(([k, l]) => <CheckRow key={k} checked={!!(c.hts || {})[k]} onChange={(v) => setHt(k, v)} label={l} />)}</CheckGroup>
          </div>
        </details>
        <details className="mt-3 rounded-2xl border border-separator bg-surface">
          <summary className="flex min-h-14 cursor-pointer items-center px-4 text-[16px] font-semibold tracking-tight">Situações especiais</summary>
          <div className="px-4 pb-4"><Specials onRef={openRef} /></div>
        </details>
        <details className="mt-3 rounded-2xl border border-separator bg-surface">
          <summary className="flex min-h-14 cursor-pointer items-center gap-2 px-4 text-[16px] font-semibold tracking-tight"><span className="flex-1">Linha do tempo</span><span className="text-xs font-normal text-muted">{c.events.length} eventos</span></summary>
          <div className="px-4 pb-3"><PcrTimeline c={c} /></div>
        </details>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button variant="secondary" className="h-13 text-[14px]" onPress={undo}>Desfazer último</Button>
          <Button variant={metro ? 'primary' : 'secondary'} aria-pressed={metro} className="h-13 text-[14px]" onPress={toggleMetro}>Metrônomo 110</Button>
          <Button variant="danger-soft" className="h-13 text-[14px]" onPress={end}>Encerrar</Button>
        </div>
        <Section className="mt-3 border-0 bg-transparent p-0 shadow-none"><Steps items={[['info', 'Registre cada ação no momento em que acontece: o relatório final sai da linha do tempo.']]} /></Section>
      </main>

      {/* base fixa na zona do polegar: o que se usa a cada 2 minutos (acima da barra de abas) */}
      <nav aria-label="Registro rápido" className="fixed inset-x-0 z-20 border-t border-separator bg-surface/95 px-3 pb-2 pt-2 backdrop-blur-md" style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="mx-auto max-w-3xl">
          <div role="group" aria-label="Ritmo na checagem" className="grid grid-cols-4 gap-2">
            <DockBtn cls="bg-danger-soft text-danger-soft-foreground" onClick={() => rhythm('fv')} label="FV / TV" small="chocável" />
            <DockBtn cls="bg-surface-secondary" onClick={() => rhythm('aesp')} label="AESP" />
            <DockBtn cls="bg-surface-secondary" onClick={() => rhythm('assist')} label="Assistolia" />
            <DockBtn cls="bg-success-soft text-success-soft-foreground" onClick={() => rhythm('rce')} label="RCE" small="pulso" />
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            <DockBtn cls="bg-danger text-danger-foreground" onClick={() => run('choque')} label="Choque" small={c.energia ? c.energia + ' J' : 'definir J'} />
            <DockBtn cls="bg-warning-soft text-warning-soft-foreground" onClick={() => run('epi')} label="Adrenalina" small="1 mg" />
            <DockBtn cls="bg-surface-secondary" onClick={() => run('aa')} label="Antiarrítm." small={s.amio === 0 && s.lido === 0 ? 'amiodarona 300' : s.amio === 1 ? 'amiodarona 150' : 'lidocaína'} />
            <DockBtn cls="bg-surface-secondary" onClick={() => run('mais')} label="Mais" small="acesso, via aérea…" />
          </div>
        </div>
      </nav>
      <PcrSheets sheet={sheet} onClose={() => setSheet(null)} onRef={openRef} />
    </div>
  );
}

/* botão grande da base (≥ 56 px) */
function DockBtn({ cls, onClick, label, small }: { cls: string; onClick: () => void; label: string; small?: string }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-h-16 flex-col items-center justify-center rounded-xl px-1 leading-tight active:opacity-80 ${cls}`}>
      <span className="text-[14px] font-bold">{label}</span>
      {small && <small className="mt-0.5 truncate font-mono text-[10px] opacity-80">{small}</small>}
    </button>
  );
}
