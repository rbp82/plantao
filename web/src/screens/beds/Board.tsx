/* Quadro de leitos (rota leitos / pacientes): azulejos por leito com a última gasometria, alertas e dias de UTI;
   identificar/adicionar por iniciais, leito ou atendimento; selecionar; remover com confirmação; avulso; ?volta= para a calculadora. */
import { useState, type FormEvent } from 'react';
import { Button, Input, Label, TextField, toast } from '@heroui/react';
import { ListView } from '@/components/pro';
import { Check, ChevronRight, Plus, Trash2, UserPlus } from 'lucide-react';
import { C } from '@/lib/calc';
import { useStore, useStoreVersion, useVaultState } from '@/lib/store';
import { useActivePatient } from '@/lib/patients';
import { navigate } from '@/lib/router';
import { TopBar, Page } from '@/components/Shell';
import { Note, Ref, Section, SegField } from '@/components/ui';
import { findTool } from '@/tools/registry';
import { avulso, bedSort, P, recs, type BedPatient } from '@/lib/beds';
import { BedTile } from './parts';

export function Board({ query }: { query: URLSearchParams }) {
  useStoreVersion();
  const volta = query.get('volta');
  const tool = volta ? findTool(volta) : undefined;
  const list = P.list();
  const act = list.filter((p) => !p.archived).sort(bedSort);
  const arch = list.filter((p) => p.archived).sort(bedSort);
  const a = useActivePatient();
  const av = avulso();
  const vault = useVaultState();
  const [tipo, setTipo] = useStore<string>('ptTipo', 'leito');
  const [label, setLabel] = useState('');
  const [armed, setArmed] = useState<string | null>(null);
  const fichaHref = `#/ficha${tool ? '?volta=' + tool.id : ''}`;

  /* com ?volta=: tocar num leito seleciona e volta para a calculadora */
  const pick = (id: string | null) => {
    P.setActive(id);
    if (tool) return navigate('#/' + tool.id);
    if (!id) toast('Sem paciente: cálculos avulsos');
  };
  function add(e: FormEvent) {
    e.preventDefault();
    const l = label.trim();
    if (!l) return toast.warning('Preencha a identificação.');
    const dup = P.find(tipo, l);
    if (dup) { P.setActive(dup.id); toast(`${P.name(dup)} já estava na lista — selecionado`); }
    else { const p = P.add(tipo, l); toast.success(`${P.name(p)} selecionado`); }
    setLabel('');
    if (tool) navigate('#/' + tool.id);
  }
  const remove = (p: BedPatient) => {
    if (armed !== p.id) return setArmed(p.id);
    P.remove(p.id); setArmed(null); toast(`${P.name(p)} removido`);
  };
  const labelText = { ini: 'Iniciais', leito: 'Leito', atd: 'Nº do atendimento' }[tipo] || 'Identificação';
  const ph = { ini: 'ex.: J.S.M.', leito: 'ex.: 12 ou UTI2-05', atd: 'ex.: 4587123' }[tipo] || '';

  return (
    <>
      <TopBar kicker={tool ? 'Escolha o paciente para' : 'Lista do plantão'} title={tool ? tool.title : 'Leitos'}
        right={<Button variant="ghost" isIconOnly aria-label="Admitir paciente" className="size-11 rounded-xl" onPress={() => navigate(fichaHref)}><UserPlus className="size-5" /></Button>} />
      <Page>
        {vault.temp && <Note cls="warn">Modo temporário: a lista some ao bloquear ou fechar o app.</Note>}
        {act.length ? (
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            {act.map((p) => (
              <BedTile key={p.id} p={p} active={!!a && a.id === p.id} href={`#/paciente?id=${p.id}`} onPick={tool ? () => pick(p.id) : undefined}
                action={<Button variant="ghost" isIconOnly={armed !== p.id} size="sm" aria-label={armed === p.id ? 'Confirmar remoção' : `Remover ${P.name(p)}`} className={`h-11 min-w-11 rounded-xl ${armed === p.id ? 'px-2.5 text-[13px] font-bold text-danger' : 'text-muted'}`} onPress={() => remove(p)}>
                  {armed === p.id ? 'Confirmar' : <Trash2 className="size-4" />}
                </Button>} />
            ))}
          </div>
        ) : (
          <div className="mt-2 flex flex-col items-center gap-1 rounded-2xl border border-dashed border-muted px-4 py-6 text-center">
            <b className="text-[15.5px]">Nenhum paciente na lista</b><span className="text-[14px] text-muted">Admita um paciente para acompanhar gasometrias, tendências e usar o peso dele em todas as calculadoras.</span>
          </div>
        )}
        <Button size="lg" fullWidth className="mt-3" onPress={() => navigate(fichaHref)}><Plus className="size-5" /> Admitir paciente</Button>

        {/* avulso: o mesmo registro de 12 h das calculadoras */}
        <ListView aria-label="Cálculos avulsos" variant="primary" className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface" onAction={() => pick(null)}>
          <ListView.Item id="__avulso" textValue="Avulso" className={`min-h-16 px-3 py-2.5 ${!a ? 'bg-accent-soft/40' : ''}`}>
            <ListView.ItemContent className="gap-3.5">
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${!a ? 'border-accent bg-accent text-accent-foreground' : 'border-muted/50'}`}>{!a && <Check className="size-4" strokeWidth={3} />}</span>
              <span className="min-w-0 flex-1">
                <ListView.Title className="block text-[16px] font-semibold leading-tight">Avulso (sem identificação)</ListView.Title>
                <ListView.Description className="num block text-[13px]">{Object.keys(av).length ? C.Patient.summary(av) + ' · apaga em 12 h' : 'cálculos rápidos; apaga em 12 h'}</ListView.Description>
              </span>
            </ListView.ItemContent>
            {Object.keys(av).length > 0 && (
              <ListView.ItemAction>
                <Button variant="ghost" size="sm" className={`h-10 px-2.5 text-[13px] ${armed === '__avulso' ? 'font-bold text-danger' : 'text-muted'}`}
                  onPress={() => { if (armed !== '__avulso') return setArmed('__avulso'); C.Patient.clear(); setArmed(null); toast('Dados avulsos apagados'); }}>
                  {armed === '__avulso' ? 'Confirmar' : 'Limpar'}
                </Button>
              </ListView.ItemAction>
            )}
          </ListView.Item>
        </ListView>

        {/* identificação rápida (lista da fase 1): a ficha completa fica em "Admitir paciente" */}
        <Section title="Identificação rápida" aux="sem ficha" className="mt-4">
          <SegField label="Identificar por" value={tipo} onChange={setTipo} options={[{ value: 'ini', label: 'Iniciais' }, { value: 'leito', label: 'Leito' }, { value: 'atd', label: 'Atendimento' }]} />
          <form onSubmit={add} noValidate className="mt-3 flex flex-col gap-3">
            <TextField value={label} onChange={setLabel} fullWidth>
              <Label className="text-[13.5px] font-medium">{labelText}</Label>
              <Input placeholder={ph} maxLength={24} autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="done" inputMode={tipo === 'atd' ? 'numeric' : 'text'} autoCapitalize={tipo === 'ini' ? 'characters' : 'off'} className="h-13 text-[17px]" />
              {tipo === 'ini' && <p className="text-xs text-muted">Evite nome completo.</p>}
            </TextField>
            <Button type="submit" variant="secondary" size="lg" fullWidth><Plus className="size-5" /> Adicionar e selecionar</Button>
          </form>
        </Section>

        {arch.length > 0 && (
          <details className="mt-4 rounded-2xl border border-border bg-surface">
            <summary className="flex min-h-13 cursor-pointer items-center px-4 text-[15px] font-semibold">Altas e arquivados ({arch.length})</summary>
            <ListView aria-label="Arquivados" variant="primary" className="border-t border-separator">
              {arch.map((p) => (
                <ListView.Item key={p.id} id={p.id} href={`#/paciente?id=${p.id}`} textValue={P.name(p)} className="min-h-14 px-4 py-2">
                  <ListView.ItemContent><span className="min-w-0 flex-1"><ListView.Title className="block">{P.name(p)}</ListView.Title><ListView.Description className="block">{recs(p).length} registro(s)</ListView.Description></span></ListView.ItemContent>
                  <ListView.ItemAction><ChevronRight className="size-5 text-muted" /></ListView.ItemAction>
                </ListView.Item>
              ))}
            </ListView>
          </details>
        )}
        <Ref>Use só iniciais, leito ou atendimento. Dados criptografados neste aparelho. Dê alta (arquive) ou remova os pacientes na passagem do plantão.</Ref>
      </Page>
    </>
  );
}
