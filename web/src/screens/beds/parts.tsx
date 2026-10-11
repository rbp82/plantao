/* Peças do quadro de leitos: azulejo, tendência (strip), mapa de Davenport, folha inferior, chips e botão de confirmação. */
import { useState, type ReactNode } from 'react';
import { Button } from '@heroui/react';
import { Sheet } from '@/components/pro';
import { Pill } from '@/components/ui';
import { C } from '@/lib/calc';
import { ago, ageSex, arrow, CHC, davenport, dUti, fmt, hasAlergia, isoLabel, keyDisp, lastInfo, mainText, normOf, outOf, strip, TILE_VALS, type BedPatient, type Sev, type StripPt } from '@/lib/beds';

/* cor de severidade (borda esquerda do azulejo e dos registros) */
export const SEV_BORDER: Record<string, string> = { crit: 'border-l-danger', warn: 'border-l-warning', ok: 'border-l-success', none: 'border-l-border' };
export const sevCls = (s: Sev | null | undefined) => (s === 'crit' ? 'crit' : s === 'warn' ? 'warn' : s === 'ok' ? 'ok' : 'idle') as 'crit' | 'warn' | 'ok' | 'idle';

/* ---------- azulejo de leito: última gasometria, alertas, alergia, dias de UTI, paciente ativo ---------- */
export function BedTile({ p, active, href, onPick, action }: { p: BedPatient; active: boolean; href: string; onPick?: () => void; action?: ReactNode }) {
  const { last, res, prev } = lastInfo(p);
  const bed = C.ptBed(p), ini = C.ptIni(p);
  const big = bed || ini || p.label;
  const d = dUti(p);
  const iso = p.ficha && p.ficha.iso;
  return (
    <div className={`relative flex flex-col rounded-2xl border bg-surface ${active ? 'border-accent ring-1 ring-accent' : 'border-border'}`}>
      <a href={href} onClick={onPick ? (e) => { e.preventDefault(); onPick(); } : undefined} className={`flex min-h-36 flex-1 flex-col gap-1.5 rounded-2xl border-l-4 px-3 py-2.5 active:bg-surface-secondary ${SEV_BORDER[(res && res.worst) || 'none']}`}>
        <div className="flex items-start justify-between gap-1.5">
          <span className={`num font-semibold leading-none tracking-tight ${bed ? 'text-[34px]' : 'text-[24px]'}`}>{big}</span>
          <span className="text-right text-[12.5px] leading-tight text-muted">{bed && ini && <b className="block text-[15px] tracking-wide text-foreground">{ini}</b>}<span>{ageSex(p).split(' · ').slice(0, 2).join(' ')}</span></span>
        </div>
        {(d || iso || hasAlergia(p) || active) && (
          <div className="flex flex-wrap gap-1">
            {d ? <Pill cls="info">D{d}</Pill> : null}{iso ? <Pill cls="warn">{isoLabel(iso)}</Pill> : null}{hasAlergia(p) && <Pill cls="crit">alergia</Pill>}{active && <Pill cls="ok">ativo</Pill>}
          </div>
        )}
        {p.ficha && p.ficha.diag && <div className="line-clamp-2 text-[13px] font-medium leading-tight">{p.ficha.diag}</div>}
        <div className="mt-auto grid grid-cols-3 gap-1 border-t border-separator pt-1.5">
          {TILE_VALS.map(([k, l, dec, n]) => {
            const x = res && res.key[k];
            const off = x != null && outOf(keyDisp(k, x), normOf(k, n, p));
            return (
              <span key={k} className={`num text-[19px] font-semibold leading-none ${off ? 'text-warning' : ''}`}>
                <i className="mb-0.5 block font-mono text-[10px] not-italic font-normal text-muted">{l}</i>
                {x == null ? '—' : <>{fmt(keyDisp(k, x), dec)}<em className="ml-px text-[13px] not-italic text-muted">{arrow(x, prev && prev.key[k], dec)}</em></>}
              </span>
            );
          })}
        </div>
        <div className="flex justify-between gap-1.5 text-[12px] leading-tight text-muted">
          <span className="truncate">{res ? mainText(res) : 'sem gasometria'}</span>{last && <time className="shrink-0">{ago(last.ts)}</time>}
        </div>
      </a>
      {action && <div className="absolute right-1 top-1">{action}</div>}
    </div>
  );
}

/* ---------- traçado de tendência com faixa normal ---------- */
export function Sparkline({ pts, normal, big, color }: { pts: StripPt[]; normal: [number, number]; big?: boolean; color: string }) {
  const g = strip(pts, normal, big);
  if (!g) return null;
  return (
    <svg viewBox={`0 0 ${g.w} ${g.h}`} preserveAspectRatio="none" aria-hidden="true" className="block h-full w-full overflow-visible" style={{ color }}>
      {g.band && <rect x="0" width={g.w} y={g.band.y} height={g.band.h} fill="currentColor" opacity={0.12} />}
      <path d={g.d} fill="none" stroke="currentColor" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
      {g.dots.map((d, i) => <path key={i} d={`M${d.x},${d.y}h0`} fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" strokeWidth={d.sw} stroke={d.last ? 'var(--foreground)' : d.out ? 'var(--warning)' : 'currentColor'} />)}
    </svg>
  );
}

/* ---------- mapa de Davenport (pH × HCO3) ---------- */
export function DavenportMap({ ph, hco3 }: { ph: number; hco3: number }) {
  const g = davenport(ph, hco3);
  const wash = (c: string) => `color-mix(in oklch, var(--${c}) 14%, transparent)`;
  return (
    <svg viewBox={`0 0 ${g.W} ${g.H}`} role="img" aria-label={g.label} className="mt-2 block w-full">
      <rect x={g.L} y={g.T} width={g.mx - g.L} height={g.my - g.T} fill={wash('danger')} />
      <rect x={g.mx} y={g.T} width={g.W - g.R - g.mx} height={g.my - g.T} fill={wash('accent')} />
      <rect x={g.L} y={g.my} width={g.mx - g.L} height={g.H - g.B - g.my} fill={wash('warning')} />
      <rect x={g.mx} y={g.my} width={g.W - g.R - g.mx} height={g.H - g.B - g.my} fill={wash('success')} />
      <g fontFamily="var(--font-mono)" fontSize="9" fill="var(--color-muted)">
        <text x={g.L + 5} y={g.T + 12}>acid. resp.</text><text x={g.W - g.R - 5} y={g.T + 12} textAnchor="end">alc. metab.</text>
        <text x={g.L + 5} y={g.H - g.B - 6}>acid. metab.</text><text x={g.W - g.R - 5} y={g.H - g.B - 6} textAnchor="end">alc. resp.</text>
        {g.xTicks.map((t) => <text key={t.label} x={t.x} y={g.H - g.B + 14} textAnchor="middle">{t.label}</text>)}
        {g.yTicks.map((t) => <text key={t.label} x={g.L - 6} y={t.y + 3} textAnchor="end">{t.label}</text>)}
        <text x={(g.L + g.W - g.R) / 2} y={g.H - 3} textAnchor="middle">pH</text>
      </g>
      <line x1={g.L} y1={g.my} x2={g.W - g.R} y2={g.my} stroke="var(--color-muted)" strokeDasharray="3 3" strokeWidth=".8" />
      <line x1={g.mx} y1={g.T} x2={g.mx} y2={g.H - g.B} stroke="var(--color-muted)" strokeDasharray="3 3" strokeWidth=".8" />
      <circle cx={g.cx} cy={g.cy} r="6.5" fill="var(--foreground)" stroke="var(--surface)" strokeWidth="2" />
    </svg>
  );
}

/* ---------- folha inferior (referência, confirmação, horário, leitura por foto) ---------- */
export function BottomSheet({ open, onClose, title, label, children }: { open: boolean; onClose: () => void; title?: ReactNode; label: string; children: ReactNode }) {
  return (
    <Sheet isOpen={open} onOpenChange={(o) => { if (!o) onClose(); }} placement="bottom">
      <Sheet.Backdrop variant="opaque">
        <Sheet.Content>
          <Sheet.Dialog aria-label={label}>
            <Sheet.Handle />
            {title && <Sheet.Header><Sheet.Heading>{title}</Sheet.Heading></Sheet.Header>}
            <Sheet.Body className="safe-bottom pb-5">{children}</Sheet.Body>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}

/* ---------- chips de escolha múltipla (comorbidades, dispositivos) ---------- */
export function Chips({ label, options, value, onChange }: { label: string; options: [string, string][]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13.5px] font-medium">{label}</span>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map(([k, l]) => {
          const on = value.includes(k);
          return <button key={k} type="button" role="checkbox" aria-checked={on} onClick={() => onChange(on ? value.filter((x) => x !== k) : [...value, k])}
            className={`min-h-11 rounded-full border px-3.5 text-[14px] font-medium transition-colors ${on ? 'border-accent bg-accent-soft text-accent-soft-foreground' : 'border-border bg-surface text-foreground/80'}`}>{l}</button>;
        })}
      </div>
    </div>
  );
}

/* ---------- ação destrutiva em dois toques ---------- */
export function ArmedButton({ label, armedLabel, onConfirm, variant = 'danger', className }: { label: string; armedLabel: string; onConfirm: () => void; variant?: 'danger' | 'ghost' | 'secondary'; className?: string }) {
  const [armed, setArmed] = useState(false);
  return <Button variant={armed ? 'danger' : variant} className={className} onPress={() => { if (!armed) return setArmed(true); setArmed(false); onConfirm(); }}>{armed ? armedLabel : label}</Button>;
}

/* cor do canal do motor como estilo inline */
export const chStyle = (ch: string) => ({ color: CHC[ch] || CHC.base });
