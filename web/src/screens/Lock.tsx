/* Login do cofre local: criar senha, desbloquear (senha ou biometria), modo temporário, esqueci a senha. */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, Input, Label, TextField, toast } from '@heroui/react';
import { Fingerprint, LockKeyhole } from 'lucide-react';
import { C } from '@/lib/calc';
import { bump } from '@/lib/store';

const V = () => C.Vault;

function PwField({ id, label, value, onChange, auto, hint, autoFocus }: { id: string; label: string; value: string; onChange: (v: string) => void; auto: string; hint?: string; autoFocus?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <TextField id={id} value={value} onChange={onChange} fullWidth>
      <Label className="text-[13.5px] font-medium">{label}</Label>
      <div className="relative">
        <Input type={show ? 'text' : 'password'} autoComplete={auto} autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="go" autoFocus={autoFocus} className="h-13 pr-20 text-[17px]" />
        <Button type="button" variant="ghost" size="sm" className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs" onPress={() => setShow((s) => !s)}>{show ? 'ocultar' : 'mostrar'}</Button>
      </div>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </TextField>
  );
}

function Frame({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-8">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">{icon}</div>
      <h1 className="text-[30px] font-semibold leading-tight tracking-tight">{title}</h1>
      <p className="mb-6 mt-2 text-[15px] leading-relaxed text-foreground/75">{sub}</p>
      {children}
    </div>
  );
}

export function Unsupported() {
  return (
    <Frame icon={<LockKeyhole className="size-7" />} title="Abra pelo endereço seguro" sub={<>A criptografia dos dados exige que o app seja aberto por um endereço <b>https://</b> (ou instalado a partir dele). Abrir o arquivo direto do computador não permite proteger os dados.</>}>{null}</Frame>
  );
}

export function Lock({ onDone }: { onDone: () => void }) {
  const setup = !V().exists();
  const bio = !setup && V().hasBio();
  const [pw1, setPw1] = useState(''); const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState('');
  const [wait, setWait] = useState(0);
  const [offerBio, setOfferBio] = useState(false);
  const [forgetArmed, setForgetArmed] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => { const ms = V().waitMs(); setWait(ms); if (ms <= 0 && timer.current) { clearInterval(timer.current); timer.current = null; } };
    tick();
    if (V().waitMs() > 0) timer.current = window.setInterval(tick, 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [msg]);

  const done = () => { bump(); onDone(); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    if (setup) {
      if (pw1.length < V().MIN_LEN) return setMsg(`A senha precisa ter pelo menos ${V().MIN_LEN} caracteres.`);
      if (pw1 !== pw2) return setMsg('As senhas não coincidem.');
      setBusy('Criando cofre…');
      try { await V().create(pw1); } catch { setBusy(''); return setMsg('Não foi possível criar o cofre neste navegador.'); }
      setBusy('');
      if (await V().bioAvailable()) { setPw1(''); setOfferBio(true); return; }
      done();
    } else {
      if (!pw1) return setMsg('Digite a senha.');
      setBusy('Verificando…');
      try {
        const ok = await V().unlock(pw1);
        setBusy('');
        if (ok) return done();
        setPw1('');
        setMsg(V().waitMs() > 0 ? '' : 'Senha incorreta.');
        if (V().waitMs() > 0) { setWait(V().waitMs()); if (!timer.current) timer.current = window.setInterval(() => { const ms = V().waitMs(); setWait(ms); if (ms <= 0 && timer.current) { clearInterval(timer.current); timer.current = null; } }, 1000); }
      } catch { setBusy(''); setWait(V().waitMs()); }
    }
  }
  async function viaBio() {
    setMsg('');
    try { await V().unlockBio(); done(); }
    catch (err) { setMsg((err as Error)?.name === 'NotAllowedError' ? 'Leitura cancelada. Tente de novo ou use a senha.' : 'Não foi possível usar a biometria. Use a senha.'); }
  }
  async function enableBio(e: FormEvent) {
    e.preventDefault();
    try {
      const ok = await V().enableBio(pw1);
      if (!ok) return setMsg('Senha incorreta.');
      toast.success('Biometria ativada');
      done();
    } catch (err) {
      const m = (err as Error)?.message;
      setMsg(m === 'prf-indisponivel' ? 'Este aparelho/navegador não oferece a biometria compatível com criptografia. Continue usando a senha.' : (err as Error)?.name === 'NotAllowedError' ? 'Cadastro cancelado.' : 'Não foi possível ativar a biometria.');
    }
  }

  if (offerBio) {
    return (
      <Frame icon={<Fingerprint className="size-7" />} title="Entrar com digital ou Face ID?" sub={<>Nas próximas vezes você abre o app com a biometria do aparelho. A senha continua valendo como reserva. Dá para ativar ou desativar depois em <b>Ajustes</b>.</>}>
        <form onSubmit={enableBio} noValidate className="flex flex-col gap-3">
          <PwField id="bioPw" label="Confirme a senha" value={pw1} onChange={setPw1} auto="current-password" autoFocus />
          {msg && <p role="alert" className="text-sm font-medium text-danger">{msg}</p>}
          <Button type="submit" size="lg" fullWidth><Fingerprint className="size-5" /> Ativar biometria</Button>
          <Button type="button" variant="ghost" onPress={done}>Agora não</Button>
        </form>
      </Frame>
    );
  }

  return (
    <Frame icon={<LockKeyhole className="size-7" />} title={setup ? 'Proteja seus dados' : 'Plantão'}
      sub={setup ? <>Pacientes, pesos, creatininas e preferências ficam <b>criptografados neste aparelho</b> (AES-256). Não há conta nem servidor: <b>a senha não pode ser recuperada</b>.</> : 'Digite a senha para abrir os dados deste aparelho.'}>
      {bio && (
        <>
          <Button size="lg" fullWidth onPress={viaBio} className="h-14 text-[16px]"><Fingerprint className="size-6" /> Entrar com digital / Face ID</Button>
          <div className="my-4 text-center text-[13px] text-muted">ou com a senha</div>
        </>
      )}
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        {setup ? (
          <>
            <PwField id="pw1" label="Crie uma senha" value={pw1} onChange={setPw1} auto="new-password" hint={`Mínimo de ${V().MIN_LEN} caracteres. Senhas só com números são mais fáceis de adivinhar.`} autoFocus />
            <PwField id="pw2" label="Repita a senha" value={pw2} onChange={setPw2} auto="new-password" />
          </>
        ) : (
          <PwField id="pw1" label="Senha" value={pw1} onChange={setPw1} auto="current-password" autoFocus={!bio} />
        )}
        {(msg || wait > 0) && <p role="alert" className="text-sm font-medium text-danger">{wait > 0 ? `Muitas tentativas. Aguarde ${Math.ceil(wait / 1000)} s.` : msg}</p>}
        <Button type="submit" size="lg" fullWidth variant={bio ? 'secondary' : 'primary'} isDisabled={wait > 0} isPending={!!busy} className="h-13 text-[16px]">
          {busy || (setup ? 'Criar senha e entrar' : 'Entrar')}
        </Button>
        <div className="mt-2 flex flex-wrap justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onPress={() => { V().temporary(); done(); }}>Usar sem salvar dados</Button>
          {!setup && (
            <Button type="button" variant="ghost" size="sm" className="text-danger" onPress={() => {
              if (forgetArmed) { V().wipe(); bump(); toast('Dados apagados. Crie uma nova senha.'); setForgetArmed(false); setMsg(''); return; }
              setForgetArmed(true); setMsg('Sem a senha não há como recuperar os dados: só é possível apagar tudo e começar de novo.');
            }}>{forgetArmed ? 'Toque de novo para APAGAR tudo' : 'Esqueci a senha'}</Button>
          )}
        </div>
      </form>
    </Frame>
  );
}
