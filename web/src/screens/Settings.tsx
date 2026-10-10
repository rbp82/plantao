/* Ajustes: tema, bloqueio automático, biometria, troca de senha, bloquear, apagar tudo. */
import { useEffect, useState, type FormEvent } from 'react';
import { Button, Input, Label, TextField, toast } from '@heroui/react';
import { Fingerprint, LockKeyhole } from 'lucide-react';
import { C } from '@/lib/calc';
import { useStore, useVaultState, applyTheme, bump, type Theme } from '@/lib/store';
import { TopBar, Page } from '@/components/Shell';
import { SegField, Section } from '@/components/ui';

function Pw({ label, value, onChange, auto }: { label: string; value: string; onChange: (v: string) => void; auto: string }) {
  return (
    <TextField value={value} onChange={onChange} fullWidth>
      <Label className="text-[13.5px] font-medium">{label}</Label>
      <Input type="password" autoComplete={auto} autoCapitalize="off" className="h-12 text-[16px]" />
    </TextField>
  );
}

export function Settings() {
  const vault = useVaultState();
  const [theme, setTheme] = useStore<Theme>('theme', 'auto');
  const [autolock, setAutolock] = useStore<number>('autolock', 10);
  const [bioOk, setBioOk] = useState(false);
  const [bioPw, setBioPw] = useState(''); const [bioMsg, setBioMsg] = useState('');
  const [o, setO] = useState(''); const [n1, setN1] = useState(''); const [n2, setN2] = useState(''); const [pwMsg, setPwMsg] = useState<[string, boolean]>(['', false]);
  const [wipeArmed, setWipeArmed] = useState(false);
  const hasBio = C.Vault.hasBio();
  useEffect(() => { if (!vault.temp) C.Vault.bioAvailable().then(setBioOk); }, [vault.temp]);

  async function enableBio(e: FormEvent) {
    e.preventDefault();
    try {
      const ok = await C.Vault.enableBio(bioPw);
      if (!ok) return setBioMsg('Senha incorreta.');
      setBioPw(''); setBioMsg(''); bump(); toast.success('Biometria ativada');
    } catch (err) {
      const m = (err as Error)?.message;
      setBioMsg(m === 'prf-indisponivel' ? 'Este aparelho não oferece a biometria compatível com criptografia.' : (err as Error)?.name === 'NotAllowedError' ? 'Cadastro cancelado.' : 'Não foi possível ativar a biometria.');
    }
  }
  async function changePw(e: FormEvent) {
    e.preventDefault();
    if (n1.length < C.Vault.MIN_LEN) return setPwMsg([`A nova senha precisa ter pelo menos ${C.Vault.MIN_LEN} caracteres.`, false]);
    if (n1 !== n2) return setPwMsg(['As novas senhas não coincidem.', false]);
    setPwMsg(['Trocando…', true]);
    const ok = await C.Vault.changePassword(o, n1);
    if (!ok) return setPwMsg(['Senha atual incorreta.', false]);
    setO(''); setN1(''); setN2(''); setPwMsg(['Senha trocada.', true]);
  }

  return (
    <>
      <TopBar kicker="Preferências e cofre local" title="Ajustes e segurança" />
      <Page>
        <Section title="Aparência" className="mt-2">
          <SegField label="Tema" value={theme} onChange={(v) => { setTheme(v as Theme); applyTheme(v as Theme); }} options={[{ value: 'auto', label: 'Automático' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Escuro' }]} />
        </Section>
        <Section title="Como os dados são protegidos">
          <p className="text-[14.5px] leading-relaxed text-foreground/80">Pacientes, valores digitados, diluições e preferências ficam cifrados com <b>AES-256-GCM</b>. A chave vem da sua senha (PBKDF2-SHA256, 600 mil iterações) e só existe na memória enquanto o app está aberto. Nada é enviado para servidores.{vault.temp && <><br /><br /><b>Você está no modo temporário:</b> nada está sendo salvo.</>}</p>
        </Section>
        {!vault.temp && (
          <>
            <Section title="Bloqueio automático">
              <SegField value={String(autolock)} onChange={(v) => { setAutolock(+v); toast(`Bloqueio após ${v} min sem uso`); }} options={[2, 5, 10, 30].map((m) => ({ value: String(m), label: `${m} min` }))} />
              <p className="mt-2 text-xs text-muted">Sem uso por esse tempo, o app pede a senha de novo.</p>
            </Section>
            <Section title="Digital / Face ID" aux={hasBio ? 'ativada' : bioOk ? 'disponível' : 'indisponível'}>
              {hasBio ? (
                <><p className="mb-2.5 text-xs text-muted">A biometria abre o cofre neste aparelho. A senha continua valendo.</p><Button variant="secondary" fullWidth onPress={() => { C.Vault.disableBio(); bump(); toast('Biometria desativada. A passkey pode ser removida nas configurações de senhas do aparelho.'); }}>Desativar biometria</Button></>
              ) : bioOk ? (
                <form onSubmit={enableBio} noValidate className="flex flex-col gap-3">
                  <Pw label="Confirme a senha para ativar" value={bioPw} onChange={setBioPw} auto="current-password" />
                  {bioMsg && <p role="alert" className="text-sm font-medium text-danger">{bioMsg}</p>}
                  <Button type="submit" fullWidth><Fingerprint className="size-5" /> Ativar biometria</Button>
                </form>
              ) : <p className="text-xs text-muted">Este aparelho/navegador não oferece biometria compatível com criptografia (requer Android com Chrome recente ou iPhone com iOS 18+, e o app aberto pelo endereço definitivo).</p>}
            </Section>
            <Section title="Trocar senha">
              <form onSubmit={changePw} noValidate className="flex flex-col gap-3">
                <Pw label="Senha atual" value={o} onChange={setO} auto="current-password" />
                <Pw label="Nova senha" value={n1} onChange={setN1} auto="new-password" />
                <Pw label="Repita a nova senha" value={n2} onChange={setN2} auto="new-password" />
                {pwMsg[0] && <p role="alert" className={`text-sm font-medium ${pwMsg[1] ? 'text-success' : 'text-danger'}`}>{pwMsg[0]}</p>}
                <Button type="submit" fullWidth>Trocar senha</Button>
              </form>
            </Section>
          </>
        )}
        <Section>
          <Button variant="secondary" fullWidth onPress={() => C.Vault.lock().then(() => { bump(); toast('Bloqueado'); })}><LockKeyhole className="size-5" /> Bloquear agora</Button>
          <div className="h-2.5" />
          <Button variant="danger" fullWidth onPress={() => { if (!wipeArmed) return setWipeArmed(true); C.Vault.wipe(); bump(); toast('Todos os dados foram apagados'); location.hash = '#/'; }}>{wipeArmed ? 'Toque de novo para confirmar — apaga tudo' : 'Apagar todos os dados deste aparelho'}</Button>
          <p className="mt-2 text-xs text-muted">Apaga pacientes, preferências e a senha. Não há como desfazer.</p>
        </Section>
      </Page>
    </>
  );
}
