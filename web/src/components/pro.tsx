/* UI Components replacing private @heroui-pro/react dependency.
   Fully typed, lightweight, accessible and compatible with React 19 + Tailwind v4. */
import { createContext, useContext, type ReactNode, type MouseEvent } from 'react';
import { Check } from 'lucide-react';

/* =========================================================================
   1. Segment (Segmented Control / Tabs)
   ========================================================================= */
interface SegmentContextType {
  selectedKey?: string | number | null;
  onSelectionChange?: (key: string) => void;
}
const SegmentContext = createContext<SegmentContextType>({});

export interface SegmentProps {
  selectedKey?: string | number | null;
  onSelectionChange?: (key: string) => void;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  children: ReactNode;
}

export function Segment({ selectedKey, onSelectionChange, className = '', 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby, children }: SegmentProps) {
  return (
    <SegmentContext.Provider value={{ selectedKey, onSelectionChange }}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        className={`flex rounded-xl bg-surface-secondary p-1 border border-border/50 gap-1 ${className}`}
      >
        {children}
      </div>
    </SegmentContext.Provider>
  );
}

export interface SegmentItemProps {
  id: string;
  className?: string;
  children: ReactNode;
}

Segment.Item = function SegmentItem({ id, className = '', children }: SegmentItemProps) {
  const { selectedKey, onSelectionChange } = useContext(SegmentContext);
  const isSelected = String(selectedKey) === String(id);

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      onClick={() => onSelectionChange?.(id)}
      className={`flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-all active:scale-[0.98] ${
        isSelected
          ? 'bg-surface text-foreground shadow-sm font-semibold'
          : 'text-muted hover:text-foreground hover:bg-surface/50'
      } ${className}`}
    >
      {children}
    </button>
  );
};


/* =========================================================================
   2. ListView (Interactive List)
   ========================================================================= */
interface ListViewContextType {
  onAction?: (key: string) => void;
}
const ListViewContext = createContext<ListViewContextType>({});

export interface ListViewProps {
  'aria-label'?: string;
  variant?: 'primary' | 'secondary';
  onAction?: (key: string) => void;
  className?: string;
  children: ReactNode;
}

export function ListView({ 'aria-label': ariaLabel, onAction, className = '', children }: ListViewProps) {
  return (
    <ListViewContext.Provider value={{ onAction }}>
      <div role="list" aria-label={ariaLabel} className={`divide-y divide-separator/40 ${className}`}>
        {children}
      </div>
    </ListViewContext.Provider>
  );
}

export interface ListViewItemProps {
  id?: string;
  href?: string;
  textValue?: string;
  className?: string;
  children: ReactNode;
}

ListView.Item = function ListViewItem({ id, href, textValue, className = '', children }: ListViewItemProps) {
  const { onAction } = useContext(ListViewContext);

  const handleClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a') && (e.target as HTMLElement).closest('button, a') !== e.currentTarget) {
      return;
    }
    if (id && onAction) {
      onAction(id);
    }
  };

  const baseClass = `flex items-center justify-between gap-3 text-left transition-colors cursor-pointer hover:bg-surface-secondary/60 active:bg-surface-secondary ${className}`;

  if (href) {
    return (
      <a href={href} aria-label={textValue} className={baseClass}>
        {children}
      </a>
    );
  }

  return (
    <div role="listitem" aria-label={textValue} onClick={handleClick} className={baseClass}>
      {children}
    </div>
  );
};

ListView.ItemContent = function ListViewItemContent({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`flex flex-1 items-center gap-3.5 min-w-0 ${className}`}>{children}</div>;
};

ListView.Title = function ListViewTitle({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`text-[15.5px] font-semibold leading-tight text-foreground ${className}`}>{children}</div>;
};

ListView.Description = function ListViewDescription({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`text-[13px] text-muted ${className}`}>{children}</div>;
};

ListView.ItemAction = function ListViewItemAction({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`shrink-0 flex items-center ${className}`}>{children}</div>;
};


/* =========================================================================
   3. ItemCard (Quick Tile Card)
   ========================================================================= */
export function ItemCard({ variant: _variant, className = '', children }: { variant?: string; className?: string; children: ReactNode }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border border-border bg-surface p-2.5 shadow-xs transition-colors hover:border-accent/40 ${className}`}>
      {children}
    </div>
  );
}

ItemCard.Icon = function ItemCardIcon({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`shrink-0 flex items-center justify-center ${className}`}>{children}</div>;
};

ItemCard.Content = function ItemCardContent({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`flex-1 min-w-0 ${className}`}>{children}</div>;
};

ItemCard.Title = function ItemCardTitle({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`text-[14px] font-semibold leading-tight text-foreground ${className}`}>{children}</div>;
};


/* =========================================================================
   4. RadioButtonGroup
   ========================================================================= */
interface RadioGroupContextType {
  value: string | null;
  onChange?: (val: string) => void;
}
const RadioGroupContext = createContext<RadioGroupContextType>({ value: null });

export function RadioButtonGroup({
  layout: _layout,
  value,
  onChange,
  'aria-label': ariaLabel,
  className = '',
  children,
}: {
  layout?: 'grid';
  value: string | null;
  onChange?: (val: string) => void;
  'aria-label'?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <RadioGroupContext.Provider value={{ value, onChange }}>
      <div role="radiogroup" aria-label={ariaLabel} className={`flex ${className.includes('grid') ? 'grid' : ''} ${className}`}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

RadioButtonGroup.Item = function RadioButtonItem({ value, className = '', children }: { value: string; className?: string; children: ReactNode }) {
  const ctx = useContext(RadioGroupContext);
  const isSelected = ctx.value === value;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      data-selected={isSelected ? 'true' : 'false'}
      onClick={() => ctx.onChange?.(value)}
      className={`flex items-center border border-border/60 bg-surface text-foreground transition-all cursor-pointer ${
        isSelected ? 'bg-accent-soft/70 border-accent/60 text-accent-soft-foreground font-semibold shadow-xs' : 'hover:bg-surface-secondary'
      } ${className}`}
    >
      {children}
    </button>
  );
};

RadioButtonGroup.ItemContent = function RadioButtonItemContent({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`flex flex-col text-left ${className}`}>{children}</div>;
};

RadioButtonGroup.Indicator = function RadioButtonGroupIndicator({ className = '' }: { className?: string }) {
  return (
    <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-muted/60 transition-colors ${className}`}>
      <span className="size-2.5 rounded-full bg-accent opacity-0 [button[data-selected=true]_&]:opacity-100" />
    </span>
  );
};


/* =========================================================================
   5. CheckboxButtonGroup
   ========================================================================= */
interface CheckboxGroupContextType {
  value: string[];
  onChange?: (vals: string[]) => void;
}
const CheckboxGroupContext = createContext<CheckboxGroupContextType>({ value: [] });

export function CheckboxButtonGroup({
  value = [],
  onChange,
  'aria-label': ariaLabel,
  className = '',
  children,
}: {
  value: string[];
  onChange?: (vals: string[]) => void;
  'aria-label'?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <CheckboxGroupContext.Provider value={{ value, onChange }}>
      <div role="group" aria-label={ariaLabel} className={`flex flex-col gap-1.5 ${className}`}>
        {children}
      </div>
    </CheckboxGroupContext.Provider>
  );
}

CheckboxButtonGroup.Item = function CheckboxButtonItem({ value, className = '', children }: { value: string; className?: string; children: ReactNode }) {
  const ctx = useContext(CheckboxGroupContext);
  const isSelected = ctx.value.includes(value);

  const toggle = () => {
    if (!ctx.onChange) return;
    if (isSelected) {
      ctx.onChange(ctx.value.filter((v) => v !== value));
    } else {
      ctx.onChange([...ctx.value, value]);
    }
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isSelected}
      data-selected={isSelected ? 'true' : 'false'}
      onClick={toggle}
      className={`flex items-start text-left border border-border/60 bg-surface text-foreground transition-all cursor-pointer ${
        isSelected ? 'bg-accent-soft/70 border-accent/60 text-accent-soft-foreground font-semibold shadow-xs' : 'hover:bg-surface-secondary'
      } ${className}`}
    >
      {children}
    </button>
  );
};

CheckboxButtonGroup.ItemContent = function CheckboxButtonItemContent({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`flex flex-col ${className}`}>{children}</div>;
};

CheckboxButtonGroup.Indicator = function CheckboxButtonGroupIndicator({ className = '' }: { className?: string }) {
  return (
    <span className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-muted/60 transition-colors [button[data-selected=true]_&]:border-accent [button[data-selected=true]_&]:bg-accent [button[data-selected=true]_&]:text-accent-foreground ${className}`}>
      <Check className="size-3.5 stroke-[3] opacity-0 [button[data-selected=true]_&]:opacity-100" />
    </span>
  );
};


/* =========================================================================
   6. Timeline
   ========================================================================= */
export function Timeline({ size: _size, density: _density, className = '', children }: { size?: string; density?: string; className?: string; children: ReactNode }) {
  return <div className={`flex flex-col gap-3 relative border-l-2 border-border/60 ml-2 pl-4 py-1 ${className}`}>{children}</div>;
}

const TIMELINE_DOT: Record<string, string> = {
  success: 'bg-success text-success-foreground border-success',
  warning: 'bg-warning text-warning-foreground border-warning',
  danger: 'bg-danger text-danger-foreground border-danger',
  current: 'bg-accent text-accent-foreground border-accent',
  default: 'bg-surface-secondary text-foreground border-border',
};

Timeline.Item = function TimelineItem({ status = 'default', className = '', children }: { status?: string; className?: string; children: ReactNode }) {
  const dotColor = TIMELINE_DOT[status] || TIMELINE_DOT.default;
  return (
    <div className={`relative flex items-start gap-2.5 ${className}`}>
      <span className={`absolute -left-[23px] top-1.5 size-3 rounded-full border-2 border-surface ${dotColor}`} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

Timeline.Content = function TimelineContent({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`leading-snug ${className}`}>{children}</div>;
};

Timeline.Indicator = function TimelineIndicator({ className = '' }: { className?: string }) {
  return <span className={className} />;
};

Timeline.Title = function TimelineTitle({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`font-semibold ${className}`}>{children}</div>;
};

Timeline.Description = function TimelineDescription({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`text-muted text-xs ${className}`}>{children}</div>;
};


/* =========================================================================
   7. EmptyState
   ========================================================================= */
export function EmptyState({ size: _size, className = '', children }: { size?: string; className?: string; children: ReactNode }) {
  return <div className={`flex flex-col items-center justify-center p-6 text-center ${className}`}>{children}</div>;
}

EmptyState.Header = function EmptyStateHeader({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-center justify-center text-center gap-1.5">{children}</div>;
};

EmptyState.Media = function EmptyStateMedia({ variant: _variant, children }: { variant?: string; children: ReactNode }) {
  return <div className="text-muted/60 mb-2 [&_svg]:size-10">{children}</div>;
};

EmptyState.Title = function EmptyStateTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-[17px] font-semibold text-foreground">{children}</h3>;
};

EmptyState.Description = function EmptyStateDescription({ className = '', children }: { className?: string; children: ReactNode }) {
  return <p className={`text-[14px] text-muted ${className}`}>{children}</p>;
};


/* =========================================================================
   8. Sheet (Bottom Drawer Modal)
   ========================================================================= */
interface SheetContextType {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}
const SheetContext = createContext<SheetContextType>({ isOpen: false, onOpenChange: () => {} });

export function Sheet({ isOpen, onOpenChange, placement: _placement, children }: { isOpen: boolean; onOpenChange: (open: boolean) => void; placement?: string; children: ReactNode }) {
  if (!isOpen) return null;

  return (
    <SheetContext.Provider value={{ isOpen, onOpenChange }}>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        {children}
      </div>
    </SheetContext.Provider>
  );
}

Sheet.Backdrop = function SheetBackdrop({ variant: _variant, children }: { variant?: string; children: ReactNode }) {
  const { onOpenChange } = useContext(SheetContext);
  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </>
  );
};

Sheet.Content = function SheetContent({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-50 w-full max-w-lg rounded-t-3xl border-t border-border bg-surface shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[85vh] flex flex-col">
      {children}
    </div>
  );
};

Sheet.Dialog = function SheetDialog({ 'aria-label': ariaLabel, children }: { 'aria-label'?: string; children: ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={ariaLabel} className="flex flex-col h-full max-h-[85vh]">
      {children}
    </div>
  );
};

Sheet.Handle = function SheetHandle() {
  return <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-muted/40 shrink-0" />;
};

Sheet.Header = function SheetHeader({ children }: { children: ReactNode }) {
  return <div className="px-5 pt-2 pb-3 border-b border-separator/40 shrink-0">{children}</div>;
};

Sheet.Heading = function SheetHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-[18px] font-semibold text-foreground leading-tight">{children}</h2>;
};

Sheet.Body = function SheetBody({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`flex-1 overflow-y-auto px-5 py-3 ${className}`}>{children}</div>;
};


/* =========================================================================
   9. CellSlider
   ========================================================================= */
interface CellSliderContextType {
  value: number;
  minValue: number;
  maxValue: number;
  step: number;
  onChange: (val: number) => void;
}
const CellSliderContext = createContext<CellSliderContextType>({ value: 0, minValue: 0, maxValue: 100, step: 1, onChange: () => {} });

export function CellSlider({
  value,
  minValue = 0,
  maxValue = 100,
  step = 1,
  'aria-label': ariaLabel,
  className = '',
  onChange,
  children,
}: {
  value: number;
  minValue?: number;
  maxValue?: number;
  step?: number;
  'aria-label'?: string;
  className?: string;
  onChange: (val: number) => void;
  children: ReactNode;
}) {
  return (
    <CellSliderContext.Provider value={{ value, minValue, maxValue, step, onChange }}>
      <div className={`relative flex items-center ${className}`} aria-label={ariaLabel}>
        {children}
      </div>
    </CellSliderContext.Provider>
  );
}

CellSlider.Track = function CellSliderTrack({ className = '', children }: { className?: string; children: ReactNode }) {
  const { value, minValue, maxValue, step, onChange } = useContext(CellSliderContext);
  const pct = Math.min(100, Math.max(0, ((value - minValue) / (maxValue - minValue)) * 100));

  return (
    <div className={`relative flex items-center w-full rounded-xl bg-surface-secondary border border-border/70 overflow-hidden ${className}`}>
      <div
        className="absolute inset-y-0 left-0 bg-accent/25 transition-[width] pointer-events-none"
        style={{ width: `${pct}%` }}
      />
      <input
        type="range"
        min={minValue}
        max={maxValue}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      {children}
    </div>
  );
};

CellSlider.Fill = function CellSliderFill() {
  return null;
};

CellSlider.Thumb = function CellSliderThumb() {
  return null;
};

CellSlider.Label = function CellSliderLabel({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`relative z-0 px-3.5 select-none pointer-events-none ${className}`}>{children}</div>;
};
