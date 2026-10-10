/* Casca do app: barra superior das telas internas, barra inferior fixa e contêiner de página. */
import { useEffect, type ReactNode } from 'react';
import { Button } from '@heroui/react';
import { ChevronLeft, Calculator, BookOpenText, BedDouble, HeartPulse } from 'lucide-react';
import { useRoute } from '@/lib/router';
import { useStore } from '@/lib/store';

export function TopBar({ kicker, title, right }: { kicker?: ReactNode; title: ReactNode; right?: ReactNode }) {
  /* título da aba acompanha a tela (as telas com título dinâmico sobrescrevem depois) */
  useEffect(() => { if (typeof title === 'string') document.title = `${title} — Plantão`; }, [title]);
  return (
    <header className="safe-top sticky top-0 z-20 border-b border-separator bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-2">
        <Button variant="ghost" isIconOnly aria-label="Voltar" className="size-11 rounded-xl" onPress={() => history.length > 1 ? history.back() : (location.hash = '#/')}>
          <ChevronLeft className="size-6" />
        </Button>
        <div className="min-w-0 flex-1 px-1">
          {kicker && <div className="truncate font-mono text-[10.5px] uppercase tracking-wider text-muted">{kicker}</div>}
          <h1 className="truncate text-[17px] font-semibold leading-tight tracking-tight">{title}</h1>
        </div>
        {right}
      </div>
    </header>
  );
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={`mx-auto w-full max-w-3xl px-4 pb-28 pt-3 ${className || ''}`}>{children}</main>;
}

/* legado (fase 2): leitos, gasometria e PCR ainda abrem no app anterior, com o mesmo cofre */
export const LEGACY = (hash: string) => `${import.meta.env.BASE_URL}legado/index.html${hash}`;

/* a aba PCR abre o ACLS guiado, que ainda vive no app anterior (o clique leva a sessão junto — ver main.tsx) */
const TABS = [
  { id: 'calc', label: 'Calcular', href: '#/', icon: Calculator, match: (p: string) => !['protocolos', 'protocolo', 'leitos', 'pacientes'].includes(p) },
  { id: 'proto', label: 'Protocolos', href: '#/protocolos', icon: BookOpenText, match: (p: string) => p === 'protocolos' || p === 'protocolo' },
  { id: 'leitos', label: 'Leitos', href: '#/leitos', icon: BedDouble, match: (p: string) => p === 'leitos' || p === 'pacientes' },
  { id: 'pcr', label: 'PCR', href: LEGACY('#/pcr'), icon: HeartPulse, match: () => false, danger: true },
];

export function BottomNav() {
  const { path } = useRoute();
  /* PCR em andamento (registrada no cofre pelo ACLS guiado): a aba fica vermelha cheia e diz isso */
  const [pcrAtiva] = useStore<unknown>('pcrAtiva', null);
  return (
    <nav aria-label="Navegação principal" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-separator bg-surface/92 backdrop-blur-md">
      <div className="mx-auto grid h-16 max-w-3xl grid-cols-4">
        {TABS.map((t) => {
          const on = t.match(path);
          const live = t.danger && !!pcrAtiva;
          const Icon = t.icon;
          return (
            <a key={t.id} href={t.href} aria-current={on ? 'page' : undefined} aria-label={live ? 'PCR em andamento — voltar ao cronômetro' : t.danger ? 'PCR — ACLS guiado' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${on ? (t.danger ? 'text-danger' : 'text-accent') : t.danger ? 'text-danger' : 'text-muted'}`}>
              <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${live ? 'bg-danger text-danger-foreground animate-pulse' : on ? (t.danger ? 'bg-danger-soft' : 'bg-accent-soft') : ''}`}><Icon className="size-[22px]" strokeWidth={on || live ? 2.4 : 2} /></span>
              {live ? 'Em curso' : t.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
