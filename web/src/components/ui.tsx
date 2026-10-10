/* Peças de interface compartilhadas pelas calculadoras.
   Princípios: resultado grande e legível à distância; cor só no que está fora do normal;
   alvos de toque ≥ 44 px; números tabulares. Construído sobre HeroUI (OSS + Pro). */
import { Children, cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { Alert, Card, Chip, Description, FieldError, Input, Label, TextField } from '@heroui/react';
import { CheckboxButtonGroup, EmptyState, RadioButtonGroup, Segment, Timeline } from '@/components/pro';
import type { Cls } from '@/lib/calc';
import { num } from '@/lib/calc';

/* classe clínica → cor semântica do HeroUI */
export const tone = (cls: Cls | undefined) =>
  cls === 'ok' ? 'success' : cls === 'warn' ? 'warning' : cls === 'crit' ? 'danger' : cls === 'info' || cls === 'violet' ? 'accent' : 'default';

const toneBg: Record<string, string> = {
  success: 'bg-success-soft text-success-soft-foreground',
  warning: 'bg-warning-soft text-warning-soft-foreground',
  danger: 'bg-danger-soft text-danger-soft-foreground',
  accent: 'bg-accent-soft text-accent-soft-foreground',
  default: 'bg-surface-secondary text-foreground',
};
const toneText: Record<string, string> = {
  success: 'text-success', warning: 'text-warning', danger: 'text-danger', accent: 'text-accent', default: 'text-muted',
};
const toneBorder: Record<string, string> = {
  success: 'border-success', warning: 'border-warning', danger: 'border-danger', accent: 'border-accent', default: 'border-border',
};

/* ---------- campo numérico (texto com teclado decimal, parse pt-BR, plausibilidade) ---------- */
export interface NumFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  placeholder?: string;
  hint?: string;
  lim?: [number, number];
  optional?: boolean;
  autoFocus?: boolean;
  className?: string;
}
export function fieldError(raw: string, lim?: [number, number]): string {
  const t = raw.trim();
  if (t === '') return '';
  const n = num(t);
  if (!Number.isFinite(n)) return 'Número inválido';
  if (lim && (n < lim[0] || n > lim[1])) return `Fora do plausível (${String(lim[0]).replace('.', ',')}–${String(lim[1]).replace('.', ',')})`;
  return '';
}
export function NumField({ label, value, onChange, unit, placeholder, hint, lim, optional, autoFocus, className }: NumFieldProps) {
  const err = fieldError(value, lim);
  return (
    <TextField className={className} value={value} onChange={onChange} isInvalid={!!err} fullWidth>
      <Label className="text-[13.5px] font-medium">{label}{optional && <span className="text-muted font-normal"> (opcional)</span>}</Label>
      <div className="relative">
        <Input
          inputMode="decimal"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`num h-13 text-[21px] font-mono font-medium ${unit ? 'pr-16' : ''}`}
        />
        {unit && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-muted">{unit}</span>}
      </div>
      {hint && !err && <Description className="text-xs">{hint}</Description>}
      {err && <FieldError className="text-xs">{err}</FieldError>}
    </TextField>
  );
}

/* ---------- escolha única (segmentado) ---------- */
export interface SegOption { value: string; label: ReactNode; small?: ReactNode }
export interface SegFieldProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: SegOption[];
  className?: string;
}
export function SegField({ label, value, onChange, options, className }: SegFieldProps) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className || ''}`}>
      {label && <span id={id} className="text-[13.5px] font-medium">{label}</span>}
      <Segment aria-labelledby={label ? id : undefined} selectedKey={value} onSelectionChange={(k) => onChange(String(k))} className="w-full">
        {options.map((o) => (
          <Segment.Item key={o.value} id={o.value} className="min-h-11 flex-1 flex-col gap-0 py-1.5 leading-tight">
            <span>{o.label}</span>
            {o.small && <span className="text-[11px] font-normal text-muted">{o.small}</span>}
          </Segment.Item>
        ))}
      </Segment>
    </div>
  );
}

/* ---------- escolha única em grade compacta (2–3 colunas, rótulos curtos; opções que não cabem num Segment) ----------
   HeroUI Pro RadioButtonGroup em layout de grade; o item selecionado ganha o anel de destaque do kit. */
export interface PickOption { value: string; label: ReactNode; small?: ReactNode }
export function PickGrid({ label, value, onChange, options, cols = 2 }: { label?: string; value: string | null; onChange: (v: string) => void; options: PickOption[]; cols?: 2 | 3 }) {
  return (
    <RadioButtonGroup layout="grid" value={value} onChange={onChange} aria-label={label ? undefined : 'Opções'} className={`gap-1.5 ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {label && <Label className="col-span-full text-[13.5px] font-medium">{label}</Label>}
      {options.map((o) => (
        <RadioButtonGroup.Item key={o.value} value={o.value} className="min-h-11 items-center justify-center rounded-xl px-2 py-1.5 text-center leading-tight data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent-soft-foreground">
          <RadioButtonGroup.ItemContent className="items-center">
            <span className="text-[13.5px] font-semibold">{o.label}</span>
            {o.small !== undefined && <span className="font-mono text-[11px] font-normal text-muted">{o.small}</span>}
          </RadioButtonGroup.ItemContent>
        </RadioButtonGroup.Item>
      ))}
    </RadioButtonGroup>
  );
}

/* ---------- escolha única em lista (opções longas, com descrição) — HeroUI Pro RadioButtonGroup ---------- */
export interface ChoiceOption { value: string; label: ReactNode; sub?: ReactNode; lead?: ReactNode; tone?: Cls }
export function ChoiceList({ label, value, onChange, options }: { label?: string; value: string | null; onChange: (v: string) => void; options: ChoiceOption[] }) {
  return (
    <RadioButtonGroup value={value} onChange={onChange} aria-label={label ? undefined : 'Opções'} className="flex-col gap-1.5">
      {label && <Label className="text-[13.5px] font-medium">{label}</Label>}
      {options.map((o) => (
        <RadioButtonGroup.Item key={o.value} value={o.value} className="min-h-14 flex-row items-center gap-3 rounded-xl px-3.5 py-2 data-[selected=true]:bg-accent-soft/60">
          {o.lead !== undefined && <span className={`readout w-11 shrink-0 text-center text-xl ${o.tone ? toneText[tone(o.tone)] : ''}`}>{o.lead}</span>}
          <RadioButtonGroup.ItemContent className="flex-1">
            <span className="text-[15px] font-semibold leading-tight">{o.label}</span>
            {o.sub && <span className="text-[13px] leading-snug text-muted">{o.sub}</span>}
          </RadioButtonGroup.ItemContent>
          <RadioButtonGroup.Indicator className="static shrink-0" />
        </RadioButtonGroup.Item>
      ))}
    </RadioButtonGroup>
  );
}

/* ---------- itens de checagem — HeroUI Pro CheckboxButtonGroup ----------
   A API por linha (checked/onChange) é mantida: o CheckGroup lê os filhos e traduz para o valor do grupo. */
export interface CheckRowProps { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; sub?: ReactNode; __v?: string }
export function CheckRow({ checked, onChange, label, sub, __v }: CheckRowProps) {
  /* linha solta (sem CheckGroup): vira um grupo de um item */
  if (__v === undefined) return <CheckGroup><CheckRow checked={checked} onChange={onChange} label={label} sub={sub} /></CheckGroup>;
  return (
    <CheckboxButtonGroup.Item value={__v} className="min-h-13 flex-row items-start gap-3 rounded-xl px-3.5 py-3 data-[selected=true]:bg-accent-soft/60">
      <CheckboxButtonGroup.Indicator className="static mt-0.5 shrink-0" />
      <CheckboxButtonGroup.ItemContent className="flex-1">
        <span className="text-[15px] leading-snug">{label}</span>
        {sub && <span className="text-[13px] text-muted">{sub}</span>}
      </CheckboxButtonGroup.ItemContent>
    </CheckboxButtonGroup.Item>
  );
}
export function CheckGroup({ children, label }: { children: ReactNode; label?: string }) {
  const rows = Children.toArray(children).filter((k): k is ReactElement<CheckRowProps> => isValidElement(k) && k.type === CheckRow);
  const value = rows.map((k, i) => (k.props.checked ? String(i) : null)).filter((v): v is string => v !== null);
  return (
    <CheckboxButtonGroup value={value} aria-label={label || 'Itens'} className="flex-col gap-1.5"
      onChange={(vals) => rows.forEach((k, i) => { const next = vals.includes(String(i)); if (next !== k.props.checked) k.props.onChange(next); })}>
      {rows.map((k, i) => cloneElement(k, { __v: String(i) }))}
    </CheckboxButtonGroup>
  );
}

/* ---------- resultado (readout) ---------- */
export interface ReadoutProps {
  label: string;
  value?: string | number | null;
  unit?: string;
  cls?: Cls;
  status?: ReactNode;
  note?: ReactNode;
  big?: boolean;
  className?: string;
}
export function Readout({ label, value, unit, cls, status, note, big, className }: ReadoutProps) {
  const has = value !== null && value !== undefined && value !== '' && value !== '—';
  const t = has ? tone(cls) : 'default';
  return (
    <div className={`rounded-xl px-3.5 py-3 ${toneBg[t]} ${className || ''}`}>
      <div className="font-mono text-[11.5px] text-muted">{label}</div>
      <div className={`readout mt-0.5 leading-none ${big ? 'text-[38px]' : 'text-[27px]'} ${has ? '' : 'text-muted'}`}>
        {has ? value : '—'}
        {has && unit && <span className="ml-1 font-mono text-xs font-normal tracking-normal text-muted">{unit}</span>}
      </div>
      {has && status && <div className={`mt-1.5 text-[13.5px] font-medium ${toneText[t]}`}>{status}</div>}
      {note && <div className="mt-0.5 text-[13px] text-muted">{note}</div>}
    </div>
  );
}
export function Readouts({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-2 gap-2 ${className || ''}`}>{children}</div>;
}

/* ---------- veredito (manchete do resultado) ---------- */
export function Verdict({ cls, kicker, title, desc, children }: { cls: Cls | 'idle'; kicker?: ReactNode; title: ReactNode; desc?: ReactNode; children?: ReactNode }) {
  const t = cls === 'idle' ? 'default' : tone(cls);
  return (
    <div className={`rounded-2xl border-l-4 px-4 py-3.5 ${toneBg[t]} ${toneBorder[t]}`}>
      {kicker && <div className={`font-mono text-xs ${toneText[t]}`}>{kicker}</div>}
      <div className={`mt-0.5 text-[24px] font-semibold leading-tight tracking-tight ${cls === 'idle' ? 'text-muted' : toneText[t]}`}>{title}</div>
      {desc && <div className="mt-1.5 text-[14.5px] text-foreground/80">{desc}</div>}
      {children}
    </div>
  );
}

/* ---------- nota / alerta ---------- */
export function Note({ cls, children }: { cls: Cls; children: ReactNode }) {
  const t = tone(cls);
  return (
    <Alert status={t === 'default' ? 'default' : t} className="mt-2.5">
      <Alert.Indicator />
      <Alert.Content><Alert.Description className="text-[14px] leading-snug">{children}</Alert.Description></Alert.Content>
    </Alert>
  );
}

/* ---------- passos de conduta — HeroUI Pro Timeline (marcador colorido pela classe clínica) ---------- */
export type Step = [Cls, ReactNode] | null | false | undefined;
const STEP_STATUS: Record<string, 'success' | 'warning' | 'danger' | 'current' | 'default'> = { ok: 'success', warn: 'warning', crit: 'danger', info: 'current', violet: 'current' };
export function Steps({ items }: { items: Step[] }) {
  const list = items.filter(Boolean) as [Cls, ReactNode][];
  return (
    <Timeline size="sm" density="compact" className="[--timeline-gap:0.625rem]">
      {list.map(([cls, t], i) => (
        <Timeline.Item key={i} status={(cls && STEP_STATUS[cls]) || 'default'}>
          <Timeline.Content className="text-[15px] leading-snug">{t}</Timeline.Content>
        </Timeline.Item>
      ))}
    </Timeline>
  );
}
export const Dose = ({ children }: { children: ReactNode }) => <span className="mt-1 inline-block rounded-md bg-surface-secondary px-2 py-0.5 font-mono text-[12.5px] text-foreground/80">{children}</span>;

/* ---------- cartão de seção ---------- */
export function Section({ title, aux, children, className }: { title?: ReactNode; aux?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={`w-full gap-0 p-4 ${className || ''}`}>
      {title && (
        <div className="mb-3 flex items-baseline gap-2">
          <h2 className="flex-1 text-[16px] font-semibold tracking-tight">{title}</h2>
          {aux && <span className="text-xs text-muted">{aux}</span>}
        </div>
      )}
      {children}
    </Card>
  );
}
export const Grid = ({ children, cols = 2, className }: { children: ReactNode; cols?: 2 | 3; className?: string }) => (
  <div className={`grid gap-3 ${cols === 3 ? 'grid-cols-2 min-[400px]:grid-cols-3' : 'grid-cols-2'} ${className || ''}`}>{children}</div>
);
export const Span2 = ({ children }: { children: ReactNode }) => <div className="col-span-full">{children}</div>;
export const Lbl = ({ children, className }: { children: ReactNode; className?: string }) => <div className={`mb-2 font-mono text-[11.5px] text-muted ${className || ''}`}>{children}</div>;
export const Ref = ({ children }: { children: ReactNode }) => <p className="mx-1 mt-4 text-xs leading-relaxed text-muted">{children}</p>;
export const KV = ({ rows }: { rows: [ReactNode, ReactNode][] }) => (
  <div className="flex flex-col">
    {rows.map(([k, v], i) => (
      <div key={i} className="flex justify-between gap-3 border-t border-separator py-2.5 text-[15px] first:border-t-0 first:pt-0">
        <span className="text-foreground/75">{k}</span><span className="num text-right font-semibold">{v}</span>
      </div>
    ))}
  </div>
);
export const Pill = ({ cls, children }: { cls: Cls; children: ReactNode }) => {
  const t = tone(cls);
  return <Chip color={t === 'default' ? 'default' : t} size="sm"><Chip.Label className="font-semibold">{children}</Chip.Label></Chip>;
};
export const CalcLine = ({ children }: { children: ReactNode }) => <div className="my-2 rounded-lg border border-separator bg-surface-secondary px-3 py-2 font-mono text-[12.5px] leading-relaxed text-foreground/80">{children}</div>;
/* estado vazio — HeroUI Pro EmptyState (ícone opcional) */
export const Empty = ({ children, icon, title }: { children: ReactNode; icon?: ReactNode; title?: ReactNode }) => (
  <EmptyState size="sm" className="w-full">
    <EmptyState.Header>
      {icon && <EmptyState.Media variant="icon">{icon}</EmptyState.Media>}
      {title && <EmptyState.Title>{title}</EmptyState.Title>}
      <EmptyState.Description className="text-[14.5px]">{children}</EmptyState.Description>
    </EmptyState.Header>
  </EmptyState>
);
