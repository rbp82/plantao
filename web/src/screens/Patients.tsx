/* Leitos (fase 1): lista do plantão — escolher, cadastrar e remover pacientes.
   O quadro completo (ficha, gasometrias com tendência) ainda abre no app anterior, com o mesmo cofre. */
import { useState, type FormEvent } from 'react';
import { Button, Input, Label, TextField, toast } from '@heroui/react';
import { ListView } from '@/components/pro';
import { Check, ExternalLink, Plus } from 'lucide-react';
import { C } from '@/lib/calc';
import { useStore, useVaultState } from '@/lib/store';
import { useActivePatient, usePatientList } from '@/lib/patients';
import { TopBar, Page, LEGACY } from '@/components/Shell';
import { SegField, Section, Note, Ref } from '@/components/ui';
import { findTool } from '@/tools/registry';

const ago = (t: number) => { const m = Math.round((Date.now() - t) / 60000); if (m < 1) return 'agora'; if (m < 60) return `há ${m} min`; const h = Math.round(m / 60); if (h < 24) return `há ${h} h`; return `há ${Math.round(h / 24)} d`; };

export function Patients({ query }: { query: URLSearchParams }) {
  const volta = query.get('volta');
  const backTo = volta && findTool(volta) ? '#/' + volta : '#/';
  const list = usePatientList().slice().sort((a, b) => b.updated - a.updated);
  const active = useActivePatient();
  const vault = useVaultState();
  const [tipo, setTipo] = useStore<string>('ptTipo', 'leito');
  const [label, setLabel] = useState('');
  const [armed, setArmed] = useState<string | null>(null);
  const avulso = C.store.get<{ v?: Record<string, string> } | null>('patient', null);

  const go = () => { location.hash = backTo; };
  function add(e: FormEvent) {
    e.preventDefault();
    const l = label.trim();
    if (!l) return toast.warning('Preencha a identificação.');
    const dup = C.Patients.find(tipo, l);
    if (dup) { C.Patients.setActive(dup.id); toast(`${C.Patients.name(dup)} já estava na lista — selecionado`); return go(); }
    const p = C.Patients.add(tipo, l);
    toast.success(`${C.Patients.name(p)} selecionado`);
    go();
  }
  const labelText = { ini: 'Iniciais', leito: 'Leito', atd: 'Nº do atendimento' }[tipo] || 'Identificação';
  const ph = { ini: 'ex.: J.S.M.', leito: 'ex.: 12 ou UTI2-05', atd: 'ex.: 4587123' }[tipo] || '';

  return (
    <>
      <TopBar kicker="Lista do plantão" title="Leitos e pacientes" />
      <Page>
        {vault.temp && <Note cls="warn">Modo temporário: a lista some ao bloquear ou fechar o app.</Note>}
        <Section title="Novo paciente" className="mt-2">
          <SegField label="Identificar por" value={tipo} onChange={setTipo} options={[{ value: 'ini', label: 'Iniciais' }, { value: 'leito', label: 'Leito' }, { value: 'atd', label: 'Atendimento' }]} />
          <form onSubmit={add} noValidate className="mt-3 flex flex-col gap-3">
            <TextField value={label} onChange={setLabel} fullWidth>
              <Label className="text-[13.5px] font-medium">{labelText}</Label>
              <Input placeholder={ph} maxLength={24} autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="done" inputMode={tipo === 'atd' ? 'numeric' : 'text'} autoCapitalize={tipo === 'ini' ? 'characters' : 'off'} className="h-13 text-[17px]" />
              {tipo === 'ini' && <p className="text-xs text-muted">Evite nome completo.</p>}
            </TextField>
            <Button type="submit" size="lg" fullWidth><Plus className="size-5" /> Adicionar e selecionar</Button>
          </form>
        </Section>

        <div className="mb-2 mt-5 font-mono text-[11.5px] text-muted">{list.length} paciente{list.length === 1 ? '' : 's'} na lista</div>
        {/* lista do plantão — HeroUI Pro ListView; tocar na linha seleciona e volta; "Remover" pede confirmação */}
        <ListView aria-label="Pacientes do plantão" variant="primary"
          onAction={(k) => { C.Patients.setActive(k === '__avulso' ? null : String(k)); go(); }}>
          {list.map((p) => {
            const on = active?.id === p.id;
            return (
              <ListView.Item key={p.id} id={p.id} textValue={C.Patients.name(p)} className={`min-h-16 px-3 py-2.5 ${on ? 'bg-accent-soft/40' : ''}`}>
                <ListView.ItemContent className="gap-3.5">
                  <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-accent bg-accent text-accent-foreground' : 'border-muted/50'}`}>{on && <Check className="size-4" strokeWidth={3} />}</span>
                  <span className="min-w-0 flex-1">
                    <ListView.Title className="block text-[16px] font-semibold leading-tight">{C.Patients.name(p)}</ListView.Title>
                    <ListView.Description className="num block text-[13px]">{C.Patient.summary(p.data || {}) || 'sem dados'} · {ago(p.updated)}</ListView.Description>
                  </span>
                </ListView.ItemContent>
                <ListView.ItemAction>
                  <Button variant="ghost" size="sm" className={`h-10 px-2.5 text-[13px] ${armed === p.id ? 'font-bold text-danger' : 'text-muted'}`}
                    onPress={() => { if (armed !== p.id) return setArmed(p.id); C.Patients.remove(p.id); setArmed(null); toast(`${C.Patients.name(p)} removido`); }}>
                    {armed === p.id ? 'Confirmar' : 'Remover'}
                  </Button>
                </ListView.ItemAction>
              </ListView.Item>
            );
          })}
          <ListView.Item id="__avulso" textValue="Avulso" className={`min-h-16 px-3 py-2.5 ${!active ? 'bg-accent-soft/40' : ''}`}>
            <ListView.ItemContent className="gap-3.5">
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${!active ? 'border-accent bg-accent text-accent-foreground' : 'border-muted/50'}`}>{!active && <Check className="size-4" strokeWidth={3} />}</span>
              <span className="min-w-0 flex-1">
                <ListView.Title className="block text-[16px] font-semibold leading-tight">Avulso (sem identificação)</ListView.Title>
                <ListView.Description className="block text-[13px]">{avulso?.v && Object.keys(avulso.v).length ? C.Patient.summary(avulso.v) + ' · apaga em 12 h' : 'para cálculos rápidos; apaga em 12 h'}</ListView.Description>
              </span>
            </ListView.ItemContent>
            {avulso && (
              <ListView.ItemAction>
                <Button variant="ghost" size="sm" className={`h-10 px-2.5 text-[13px] ${armed === '__avulso' ? 'font-bold text-danger' : 'text-muted'}`}
                  onPress={() => { if (armed !== '__avulso') return setArmed('__avulso'); C.Patient.clear(); setArmed(null); toast('Dados avulsos apagados'); }}>
                  {armed === '__avulso' ? 'Confirmar' : 'Limpar'}
                </Button>
              </ListView.ItemAction>
            )}
          </ListView.Item>
        </ListView>

        <a href={LEGACY('#/leitos')} className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 active:bg-surface-secondary">
          <span className="min-w-0 flex-1 leading-tight"><b className="block text-[15px] font-semibold">Quadro de leitos completo</b><small className="text-[13px] text-muted">Ficha, gasometria com tendência e leitura por foto — abre na versão anterior do app (mesmos dados).</small></span>
          <ExternalLink className="size-5 shrink-0 text-muted" />
        </a>
        <Ref>Use só o necessário para identificar o paciente no plantão (iniciais, leito ou atendimento). Os dados ficam criptografados neste aparelho. Remova os pacientes na alta ou na passagem do plantão.</Ref>
      </Page>
    </>
  );
}
