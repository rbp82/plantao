/* Folhas inferiores da PCR: uma aberta por vez (estado `SheetState` na tela). Textos idênticos ao app anterior. */
import { useState, type ReactNode } from 'react';
import { Button } from '@heroui/react';
import { ChevronRight, X } from 'lucide-react';
import { Sheet } from '@/components/pro';
import { NumField } from '@/components/ui';
import { num } from '@/lib/core/num';
import { REF } from '@/lib/pcr';

/* [chave, rótulo, descrição?, desabilitado?] */
export type PickOpt = [string, string, string?, boolean?];
export type SheetState =
  | { kind: 'pick'; title: string; opts: PickOpt[]; cb: (k: string) => void; ref?: string }
  | { kind: 'ref'; id: string }
  | { kind: 'energy'; current: number | null; cb: (j: number) => void }
  | { kind: 'number'; title: string; unit: string; quick: number[]; cb: (v: number) => void }
  | { kind: 'text'; cb: (t: string) => void }
  | { kind: 'confirm'; title: string; text: string; ok: string; cb: () => void; danger?: boolean };

/* botão "fonte": abre o trecho literal da diretriz */
export function SrcButton({ id, onOpen, children, className }: { id: string; onOpen: (id: string) => void; children?: ReactNode; className?: string }) {
  return (
    <button type="button" onClick={() => onOpen(id)} aria-label={children ? undefined : 'Fonte'}
      className={`inline-flex min-h-8 items-center rounded-full border border-separator bg-surface px-2.5 font-mono text-[11px] text-muted active:bg-surface-secondary ${className || ''}`}>
      {children || 'fonte'}
    </button>
  );
}

function Frame({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  return (
    <Sheet isOpen onOpenChange={(o) => { if (!o) onClose(); }} placement="bottom">
      <Sheet.Backdrop variant="opaque">
        <Sheet.Content>
          <Sheet.Dialog aria-label={typeof title === 'string' ? title : 'Folha'}>
            <Sheet.Handle />
            <Sheet.Header>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1"><Sheet.Heading>{title}</Sheet.Heading></div>
                <Button variant="ghost" isIconOnly aria-label="Fechar" className="-mr-2 -mt-1 size-11 shrink-0 rounded-xl" onPress={onClose}><X className="size-5" /></Button>
              </div>
            </Sheet.Header>
            <Sheet.Body className="safe-bottom pb-5">{children}</Sheet.Body>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}

const Quick = ({ on, onPress, children }: { on?: boolean; onPress: () => void; children: ReactNode }) => (
  <Button variant={on ? 'primary' : 'secondary'} className="h-12 min-w-20 px-4 text-[15px] font-semibold" onPress={onPress}>{children}</Button>
);

export function PcrSheets({ sheet, onClose, onRef }: { sheet: SheetState | null; onClose: () => void; onRef: (id: string) => void }) {
  if (!sheet) return null;
  if (sheet.kind === 'pick') return <PickSheet s={sheet} onClose={onClose} onRef={onRef} />;
  if (sheet.kind === 'ref') return <RefSheet id={sheet.id} onClose={onClose} />;
  if (sheet.kind === 'energy') return <EnergySheet s={sheet} onClose={onClose} />;
  if (sheet.kind === 'number') return <NumberSheet s={sheet} onClose={onClose} />;
  if (sheet.kind === 'text') return <TextSheet s={sheet} onClose={onClose} />;
  return <ConfirmSheet s={sheet} onClose={onClose} />;
}

function PickSheet({ s, onClose, onRef }: { s: Extract<SheetState, { kind: 'pick' }>; onClose: () => void; onRef: (id: string) => void }) {
  return (
    <Frame title={s.title} onClose={onClose}>
      <div role="list" className="divide-y divide-separator/40">
        {s.opts.map(([k, l, sub, dis]) => (
          <button key={k} type="button" role="listitem" disabled={!!dis} onClick={() => { onClose(); s.cb(k); }}
            className="flex min-h-14 w-full items-center gap-3 px-1 py-2.5 text-left active:bg-surface-secondary disabled:opacity-45">
            <span className="min-w-0 flex-1">
              <span className="block text-[15.5px] font-semibold leading-tight">{l}</span>
              {sub && <span className="block text-[13px] leading-snug text-muted">{sub}</span>}
            </span>
            <ChevronRight className="size-5 shrink-0 text-muted" />
          </button>
        ))}
      </div>
      {s.ref && REF[s.ref] && <SrcButton id={s.ref} onOpen={onRef} className="mt-3">fonte: {REF[s.ref].t}</SrcButton>}
    </Frame>
  );
}

/* trecho literal da diretriz, classe/nível e link */
function RefSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const r = REF[id];
  if (!r) return null;
  return (
    <Frame title={<><span className="mb-1 inline-block rounded-full bg-success-soft px-2 py-0.5 font-mono text-[11px] text-success-soft-foreground">AHA 2025</span><br />{r.t}</>} onClose={onClose}>
      {r.c && <p className="mb-2 text-[13.5px] text-muted">Origem e classe: <b className="text-foreground">{r.c}</b></p>}
      <div className="rounded-lg border border-separator bg-surface-secondary px-3 py-2 text-[13.5px] leading-relaxed text-foreground/85">
        <span className="font-mono text-[11px] text-muted">Trecho literal</span><br />“{r.q}”
      </div>
      {r.n && <div className="mt-2.5 rounded-xl bg-warning-soft px-3.5 py-2.5 text-[13.5px] leading-snug text-warning-soft-foreground">{r.n}</div>}
      <p className="mt-3 text-xs leading-relaxed text-muted"><a href={r.u} target="_blank" rel="noopener" className="break-all text-link underline">{r.u.replace('https://', '')}</a></p>
    </Frame>
  );
}

function EnergySheet({ s, onClose }: { s: Extract<SheetState, { kind: 'energy' }>; onClose: () => void }) {
  const [v, setV] = useState('');
  const set = (j: number) => { onClose(); s.cb(j); };
  const n = num(v);
  const okCustom = Number.isFinite(n) && n > 0 && n <= 400;
  return (
    <Frame title="Energia do choque" onClose={onClose}>
      <p className="mb-3 text-[13.5px] leading-snug text-muted">“Biphasic: Manufacturer recommendation (eg, initial dose of 120 to 200 Joules); if unknown, use maximum available.” Monofásico: 360 J. A energia escolhida fica salva para os próximos choques e para as próximas PCRs.</p>
      <div className="flex flex-wrap gap-2">{[120, 150, 200, 360].map((j) => <Quick key={j} on={s.current === j} onPress={() => set(j)}>{j} J</Quick>)}</div>
      <div className="mt-3"><NumField label="Outra energia (máxima do aparelho, se desconhecida)" unit="J" value={v} onChange={setV} /></div>
      <Button variant="primary" fullWidth className="mt-3 h-13 text-[16px]" isDisabled={!okCustom} onPress={() => { if (okCustom) set(n); }}>Usar esta energia</Button>
    </Frame>
  );
}

function NumberSheet({ s, onClose }: { s: Extract<SheetState, { kind: 'number' }>; onClose: () => void }) {
  const [v, setV] = useState('');
  const n = num(v);
  const ok = Number.isFinite(n) && n >= 0;
  return (
    <Frame title={s.title} onClose={onClose}>
      <div className="flex flex-wrap gap-2">{s.quick.map((q) => <Quick key={q} onPress={() => { onClose(); s.cb(q); }}>{q} {s.unit}</Quick>)}</div>
      <div className="mt-3"><NumField label="Outro valor" unit={s.unit} value={v} onChange={setV} /></div>
      <Button variant="primary" fullWidth className="mt-3 h-13 text-[16px]" isDisabled={!ok} onPress={() => { if (ok) { onClose(); s.cb(n); } }}>Registrar</Button>
    </Frame>
  );
}

function TextSheet({ s, onClose }: { s: Extract<SheetState, { kind: 'text' }>; onClose: () => void }) {
  const [t, setT] = useState('');
  const ok = !!t.trim();
  return (
    <Frame title="Anotação" onClose={onClose}>
      <textarea value={t} onChange={(e) => setT(e.target.value)} rows={3} maxLength={200} aria-label="Anotação" placeholder="ex.: retorno do pulso femoral, família avisada…"
        className="w-full resize-none rounded-xl border border-separator bg-field px-3.5 py-3 text-[16px] leading-snug text-foreground outline-none focus:border-accent" />
      <Button variant="primary" fullWidth className="mt-3 h-13 text-[16px]" isDisabled={!ok} onPress={() => { if (ok) { onClose(); s.cb(t.trim()); } }}>Registrar</Button>
    </Frame>
  );
}

function ConfirmSheet({ s, onClose }: { s: Extract<SheetState, { kind: 'confirm' }>; onClose: () => void }) {
  return (
    <Frame title={s.title} onClose={onClose}>
      <p className="mb-4 text-[15px] leading-snug text-foreground/80">{s.text}</p>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" className="h-14 text-[16px]" onPress={onClose}>Cancelar</Button>
        <Button variant={s.danger ? 'danger' : 'primary'} className="h-14 text-[16px]" onPress={() => { onClose(); s.cb(); }}>{s.ok}</Button>
      </div>
    </Frame>
  );
}
