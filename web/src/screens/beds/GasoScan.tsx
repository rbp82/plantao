/* Leitura por foto do ticket do gasômetro: câmera/galeria → progresso → folha de conferência com recortes → lançar nos campos.
   O OCR roda no aparelho (lib/scan). Amostra venosa redireciona PCO2/PO2/SaO2 para a venosa central. */
import { useRef, useState } from 'react';
import { Button, toast } from '@heroui/react';
import { Camera, Check, Image, RotateCw } from 'lucide-react';
import { read, type ReadResult, type ScanItem } from '@/lib/scan';
import { SegField } from '@/components/ui';
import { ART_ONLY, artFilled, F, H, numTxt, SCAN_MSG, scanDefaults, scanMsg, scanProgress, scanTarget, toDisp, unitOf, venFilled, type GasInput, type Sample } from '@/lib/beds';
import { BottomSheet } from './parts';
import { S } from './session';

type Phase = { k: 'idle' } | { k: 'reading'; msg: string; pct: number } | { k: 'error'; offline: boolean } | { k: 'result'; res: ReadResult; smp: Sample; on: Record<string, boolean> } | { k: 'offer'; msg: string; other: Sample };

export function GasoScan({ cur, apply }: { cur: (fid: string) => GasInput | undefined; apply: (vals: { fid: string; v: number }[], smp: Sample) => void }) {
  const cam = useRef<HTMLInputElement>(null), pick = useRef<HTMLInputElement>(null);
  const [ph, setPh] = useState<Phase>({ k: 'idle' });
  const job = useRef<{ file: File; rot: number; tok: object } | null>(null);

  function run(file: File, rot: number) {
    const tok = {};
    job.current = { file, rot, tok };
    setPh({ k: 'reading', msg: 'Preparando', pct: 3 });
    const onProgress = (m: { status: string; progress?: number }) => {
      if (job.current?.tok !== tok) return;
      const msg = SCAN_MSG[m.status];
      if (!msg) return;
      setPh({ k: 'reading', msg: msg + (m.status === 'recognizing text' ? ` · ${Math.round((m.progress || 0) * 100)}%` : ''), pct: scanProgress(m.status, m.progress || 0) });
    };
    read(file, { rot, onProgress }).then((res) => {
      if (job.current?.tok !== tok) return; /* fechou a folha ou saiu da tela */
      const smp: Sample = res.sample || S.scanWant || 'art'; /* o "Tipo de amostra" impresso vale mais que o botão escolhido */
      S.scanWant = null;
      res.items.forEach((it) => { if (it.img === undefined) it.img = res.crop(it); });
      setPh({ k: 'result', res, smp, on: scanDefaults(res.items, smp, cur) });
    }).catch((err: unknown) => {
      if (job.current?.tok !== tok) return;
      setPh({ k: 'error', offline: (err as Error)?.message === 'offline' });
    });
  }
  const onFile = (inp: HTMLInputElement) => { const f = inp.files && inp.files[0]; inp.value = ''; if (f) run(f, 0); else S.scanWant = null; };
  const close = () => { job.current = null; setPh({ k: 'idle' }); };
  const shoot = (src: 'cam' | 'pick', want: Sample | null = null) => { S.scanWant = want; close(); (src === 'cam' ? cam : pick).current?.click(); };

  function doApply() {
    if (ph.k !== 'result') return;
    const chosen = ph.res.items.filter((it) => ph.on[it.fid]);
    apply(chosen.map((it) => ({ fid: scanTarget(it.fid, ph.smp), v: it.v })), ph.smp);
    const msg = scanMsg(chosen.length, ph.smp);
    /* gaso arterial + venosa central costumam vir juntas: oferece a outra, se ainda estiver vazia */
    const other: Sample | null = ph.smp === 'ven' ? (artFilled(cur) ? null : 'art') : (venFilled(cur) ? null : 'ven');
    if (!other) { close(); return toast(msg); }
    setPh({ k: 'offer', msg, other });
  }

  const row = (it: ScanItem, smp: Sample, on: boolean) => {
    const tf = scanTarget(it.fid, smp), c = cur(tf);
    const note = [smp === 'ven' && ART_ONLY.includes(it.fid) ? 'amostra venosa: não substitui o valor arterial' : '', it.note].filter(Boolean).join(' · ');
    return (
      <button key={it.fid} type="button" role="checkbox" aria-checked={on} onClick={() => setPh((s) => (s.k === 'result' ? { ...s, on: { ...s.on, [it.fid]: !on } } : s))}
        className={`grid min-h-14 w-full grid-cols-[24px_1fr_auto] items-center gap-x-3 rounded-xl border px-3 py-2 text-left ${on ? 'border-accent/60 bg-surface' : 'border-border bg-surface'}`}>
        <span className={`flex size-6 items-center justify-center rounded-md border-2 ${on ? 'border-accent bg-accent text-accent-foreground' : 'border-muted/60'}`}>{on && <Check className="size-4" strokeWidth={3} />}</span>
        <span className="flex min-w-0 flex-col gap-1"><b className="text-[14px] font-semibold">{F[tf]?.l || tf}</b>{it.img ? <img alt="trecho da foto" src={it.img} className="block h-[26px] w-auto max-w-full rounded object-contain object-left" /> : <small className="font-mono text-[11px] text-muted">lido: {it.raw} {it.unit}</small>}</span>
        <span className="flex flex-col items-end leading-tight"><b className={`num text-[24px] font-medium ${on ? '' : 'text-muted'}`}>{numTxt(toDisp(tf, it.v))}</b><small className="font-mono text-[10.5px] text-muted">{unitOf(tf)}</small>{H(c) && <small className="font-mono text-[10.5px] text-warning">atual {numTxt(toDisp(tf, Number(c)))}</small>}</span>
        {note && <span className="col-start-2 col-end-4 text-[12px] leading-snug text-warning">{note}</span>}
      </button>
    );
  };

  return (
    <>
      <div className="mb-3 grid grid-cols-[1fr_auto] gap-2">
        <Button variant="secondary" className="h-12" onPress={() => shoot('cam')}><Camera className="size-5" /> Ler ticket do gasômetro</Button>
        <Button variant="secondary" className="h-12" aria-label="Escolher foto ou scan da galeria" onPress={() => shoot('pick')}><Image className="size-5" /> Galeria</Button>
      </div>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.currentTarget)} />
      <input ref={pick} type="file" accept="image/*" hidden onChange={(e) => onFile(e.currentTarget)} />

      <BottomSheet open={ph.k === 'reading'} onClose={close} label="Lendo a foto" title="Lendo a foto">
        {ph.k === 'reading' && <>
          <b className="text-[14.5px] font-medium text-foreground/85">{ph.msg}</b>
          <div className="my-3 h-1.5 overflow-hidden rounded-full bg-surface-secondary"><i className="block h-full bg-accent transition-[width]" style={{ width: `${Math.max(3, ph.pct)}%` }} /></div>
          <p className="text-xs text-muted">A leitura roda no próprio celular: a foto não sai do aparelho e não é guardada. Na primeira vez o leitor (≈ 7 MB) é baixado e fica disponível offline.</p>
        </>}
      </BottomSheet>

      <BottomSheet open={ph.k === 'error'} onClose={close} label="Não foi possível ler" title="Não foi possível ler">
        {ph.k === 'error' && <>
          <p className="text-xs text-muted">{ph.offline ? 'O leitor ainda não foi baixado neste aparelho. Conecte-se à internet uma vez e tente de novo; depois funciona offline.' : 'A imagem não pôde ser processada. Tente outra foto.'}</p>
          <Button fullWidth className="mt-3 h-12" onPress={() => shoot('cam')}><Camera className="size-5" /> Tirar outra foto</Button>
        </>}
      </BottomSheet>

      <BottomSheet open={ph.k === 'result'} onClose={close} label="Conferir leitura" title={ph.k === 'result' ? `Conferir leitura${ph.res.items.length ? (ph.smp === 'ven' ? ' · venosa' : ' · arterial') : ''}` : ''}>
        {ph.k === 'result' && (() => {
          const n = ph.res.items.filter((it) => ph.on[it.fid]).length;
          return <>
            {ph.res.items.length ? <>
              <p className="text-xs text-muted">Compare cada valor com o recorte da foto. Só os marcados serão lançados.</p>
              <div className="my-3"><SegField value={ph.smp} onChange={(v) => setPh((s) => (s.k === 'result' ? { ...s, smp: v as Sample, on: scanDefaults(s.res.items, v as Sample, cur) } : s))} options={[{ value: 'art', label: 'Arterial' }, { value: 'ven', label: 'Venosa central' }]} /></div>
              <div className="mb-3 flex flex-col gap-1.5">{ph.res.items.map((it) => row(it, ph.smp, !!ph.on[it.fid]))}</div>
              <Button fullWidth className="h-12" isDisabled={!n} onPress={doApply}>{n ? `Lançar ${n} valor${n > 1 ? 'es' : ''}` : 'Nada marcado'}</Button>
            </> : <p className="text-xs text-muted">Não encontrei valores de gasometria nesta foto. Ticket plano, sem reflexo, texto na horizontal e ocupando a tela ajudam; o modo "digitalizar documento" da câmera do celular dá o melhor resultado.</p>}
            <div className="mt-2.5 flex gap-2">
              <Button variant="secondary" size="sm" className="h-11 flex-1" onPress={() => shoot('cam')}><Camera className="size-4" /> Outra foto</Button>
              <Button variant="secondary" size="sm" className="h-11 flex-1" onPress={() => { const j = job.current; if (j) run(j.file, (j.rot + 90) % 360); }}><RotateCw className="size-4" /> Girar e reler</Button>
            </div>
            <details className="mt-3.5 text-[13px] text-muted"><summary className="min-h-11 cursor-pointer leading-[44px]">Foto tratada e texto lido</summary>
              {ph.res.preview && <img alt="foto após o tratamento" src={ph.res.preview} className="mx-auto mt-2 block max-h-[60vh] max-w-full rounded-md border border-separator" />}
              {ph.res.text && <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-separator bg-surface-secondary px-2.5 py-2 font-mono text-[11px] leading-relaxed">{ph.res.text}</pre>}
            </details>
          </>;
        })()}
      </BottomSheet>

      <BottomSheet open={ph.k === 'offer'} onClose={close} label="Lançados" title={ph.k === 'offer' ? ph.msg : ''}>
        {ph.k === 'offer' && <>
          <p className="text-xs text-muted">Tem também o ticket da {ph.other === 'ven' ? 'gasometria venosa central' : 'gasometria arterial'}?</p>
          <Button fullWidth className="mt-3 h-12" onPress={() => shoot('cam', ph.other)}><Camera className="size-5" /> Fotografar a {ph.other === 'ven' ? 'venosa' : 'arterial'}</Button>
          <div className="mt-2 flex gap-2"><Button variant="secondary" size="sm" className="h-11 flex-1" onPress={() => shoot('pick', ph.other)}><Image className="size-4" /> Da galeria</Button><Button variant="secondary" size="sm" className="h-11 flex-1" onPress={close}>Agora não</Button></div>
        </>}
      </BottomSheet>
    </>
  );
}
