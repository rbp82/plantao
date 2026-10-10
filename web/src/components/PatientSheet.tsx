/* Troca rápida de paciente sem sair da calculadora: HeroUI Pro Sheet (de baixo) com a lista do plantão. */
import { Button, toast } from '@heroui/react';
import { ListView, Sheet } from '@/components/pro';
import { Check, Plus } from 'lucide-react';
import { C } from '@/lib/calc';
import { useActivePatient, usePatientList } from '@/lib/patients';

export function PatientSheet({ isOpen, onOpenChange, toolId }: { isOpen: boolean; onOpenChange: (open: boolean) => void; toolId: string }) {
  const list = usePatientList().slice().sort((a, b) => b.updated - a.updated);
  const active = useActivePatient();
  const avulso = C.store.get<{ v?: Record<string, string> } | null>('patient', null);
  const Mark = ({ on }: { on: boolean }) => (
    <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-accent bg-accent text-accent-foreground' : 'border-muted/50'}`}>{on && <Check className="size-4" strokeWidth={3} />}</span>
  );
  return (
    <Sheet isOpen={isOpen} onOpenChange={onOpenChange} placement="bottom">
      <Sheet.Backdrop variant="opaque">
        <Sheet.Content>
          <Sheet.Dialog aria-label="Paciente">
            <Sheet.Handle />
            <Sheet.Header>
              <Sheet.Heading>Paciente</Sheet.Heading>
              <p className="text-[13px] text-muted">Peso, idade, sexo, altura e creatinina do paciente escolhido valem em todas as calculadoras.</p>
            </Sheet.Header>
            <Sheet.Body className="safe-bottom pb-5">
              <ListView aria-label="Pacientes do plantão" variant="primary"
                onAction={(k) => { const id = k === '__avulso' ? null : String(k); C.Patients.setActive(id); onOpenChange(false); toast(id ? `${C.Patients.name(C.Patients.active())} selecionado` : 'Cálculo avulso'); }}>
                {list.map((p) => (
                  <ListView.Item key={p.id} id={p.id} textValue={C.Patients.name(p)} className="min-h-15 px-3 py-2.5">
                    <ListView.ItemContent>
                      <Mark on={active?.id === p.id} />
                      <span className="min-w-0 flex-1">
                        <ListView.Title className="block text-[16px] font-semibold leading-tight">{C.Patients.name(p)}</ListView.Title>
                        <ListView.Description className="num block text-[13px]">{C.Patient.summary(p.data || {}) || 'sem dados'}</ListView.Description>
                      </span>
                    </ListView.ItemContent>
                  </ListView.Item>
                ))}
                <ListView.Item id="__avulso" textValue="Avulso" className="min-h-15 px-3 py-2.5">
                  <ListView.ItemContent>
                    <Mark on={!active} />
                    <span className="min-w-0 flex-1">
                      <ListView.Title className="block text-[16px] font-semibold leading-tight">Avulso (sem identificação)</ListView.Title>
                      <ListView.Description className="block text-[13px]">{avulso?.v && Object.keys(avulso.v).length ? C.Patient.summary(avulso.v) + ' · apaga em 12 h' : 'para cálculos rápidos; apaga em 12 h'}</ListView.Description>
                    </span>
                  </ListView.ItemContent>
                </ListView.Item>
              </ListView>
              <Button variant="secondary" fullWidth className="mt-3 h-12" onPress={() => { onOpenChange(false); location.hash = `#/leitos?volta=${toolId}`; }}>
                <Plus className="size-5" /> Novo paciente ou lista completa
              </Button>
            </Sheet.Body>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}
