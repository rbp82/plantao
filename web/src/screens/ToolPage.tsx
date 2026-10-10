/* Página de uma calculadora: barra, faixa do paciente (quando usa peso) e o componente da ferramenta. */
import { useEffect, useRef, useState } from 'react';
import { Button, toast } from '@heroui/react';
import { Copy, Star, UserRound } from 'lucide-react';
import { C } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { useActivePatient, usePatientField, usePeso } from '@/lib/patients';
import { TopBar, Page } from '@/components/Shell';
import { NumField } from '@/components/ui';
import { PatientSheet } from '@/components/PatientSheet';
import { GROUPS, type Tool } from '@/tools/registry';

export function PatientStrip({ toolId }: { toolId: string }) {
  const active = useActivePatient();
  const [peso, setPeso] = usePatientField('peso');
  const [open, setOpen] = useState(false);
  return (
    <div className="sticky top-14 z-10 -mx-4 mb-3 flex items-center gap-2.5 border-b border-separator bg-background/90 px-4 py-2 backdrop-blur-md">
      {/* toque abre a folha de pacientes (troca sem sair da calculadora) */}
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={`flex h-13 max-w-[46%] items-center gap-1.5 rounded-xl border px-3 text-[14px] font-semibold ${active ? 'border-accent bg-accent-soft text-accent-soft-foreground' : 'border-dashed border-muted text-foreground/80'}`}>
        <UserRound className="size-4 shrink-0" /><span className="truncate">{C.Patients.name(active)}</span>
      </button>
      <PatientSheet isOpen={open} onOpenChange={setOpen} toolId={toolId} />
      {/* rótulo só para leitores de tela: na faixa compacta o campo se explica pelo "kg" e pelo placeholder */}
      <div className="flex-1"><NumField className="[&_label]:sr-only" label="Peso" unit="kg" value={peso} onChange={setPeso} lim={C.LIM.peso} placeholder="Peso" /></div>
    </div>
  );
}

export function ToolPage({ tool }: { tool: Tool }) {
  const [favs, setFavs] = useStore<string[]>('favs', []);
  const [recents, setRecents] = useStore<string[]>('recents', []);
  const peso = usePeso();
  const summary = useRef<string>('');
  const [hasSummary, setHasSummary] = useState(false);
  const active = useActivePatient();
  useEffect(() => { document.title = `${tool.title} — Plantão`; }, [tool]);
  useEffect(() => {
    const r = recents.filter((x) => x !== tool.id); r.unshift(tool.id);
    if (r.join() !== recents.join()) setRecents(r.slice(0, 6));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool.id]);
  const fav = favs.includes(tool.id);
  const api = useRef({ setSummary: (s: string) => { summary.current = s; setHasSummary(!!s); } }).current;
  const Comp = tool.Component!;
  return (
    <>
      <TopBar kicker={GROUPS[tool.group].name} title={tool.title} right={
        <>
          {hasSummary && <Button variant="ghost" isIconOnly aria-label="Copiar resumo para o prontuário" className="size-11 rounded-xl" onPress={() => {
            const s = summary.current; if (!s) return toast('Preencha os dados primeiro');
            navigator.clipboard.writeText((active ? `[${C.Patients.name(active)}] ` : '') + s).then(() => toast.success('Copiado para o prontuário')).catch(() => toast.danger('Não foi possível copiar'));
          }}><Copy className="size-5" /></Button>}
          <Button variant="ghost" isIconOnly aria-label={fav ? 'Remover das fixadas' : 'Fixar na tela inicial'} aria-pressed={fav} className={`size-11 rounded-xl ${fav ? 'text-warning' : ''}`} onPress={() => { setFavs(fav ? favs.filter((x) => x !== tool.id) : [...favs, tool.id]); toast(fav ? 'Removida das fixadas' : 'Fixada na tela inicial'); }}>
            <Star className="size-5" fill={fav ? 'currentColor' : 'none'} />
          </Button>
        </>
      } />
      <Page>
        {tool.weight && <PatientStrip toolId={tool.id} />}
        <Comp api={api} peso={peso} />
      </Page>
    </>
  );
}
