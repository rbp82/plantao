import { useEffect, useState } from 'react';
import { Toast, toast } from '@heroui/react';
import { C } from '@/lib/calc';
import { useRoute } from '@/lib/router';
import { useStoreVersion, useVaultState, bump } from '@/lib/store';
import { BottomNav } from '@/components/Shell';
import { Lock, Unsupported } from '@/screens/Lock';
import { Home } from '@/screens/Home';
import { ToolPage } from '@/screens/ToolPage';
import { Patients } from '@/screens/Patients';
import { Settings } from '@/screens/Settings';
import { Protocols, ProtocolView } from '@/screens/Protocols';
import { findTool } from '@/tools/registry';
import '@/tools';

/* bloqueio automático por inatividade (minutos no cofre; padrão 10) */
function useAutoLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let last = Date.now();
    const touch = () => { last = Date.now(); };
    const evs: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'input'];
    evs.forEach((e) => window.addEventListener(e, touch, { passive: true, capture: true }));
    const check = () => {
      if (!C.Vault.isOpen()) return;
      const min = C.store.get<number>('autolock', 10);
      if (Date.now() - last > min * 60000) { C.Vault.lock().then(() => { bump(); toast('Bloqueado por inatividade'); }); }
    };
    const t = setInterval(check, 15000);
    const vis = () => { if (document.visibilityState === 'hidden') C.Vault.flush().catch(() => {}); else check(); };
    document.addEventListener('visibilitychange', vis);
    const hide = () => { C.Vault.flush().catch(() => {}); };
    window.addEventListener('pagehide', hide);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, touch, { capture: true } as EventListenerOptions));
      clearInterval(t); document.removeEventListener('visibilitychange', vis); window.removeEventListener('pagehide', hide);
    };
  }, [active]);
}

export function App() {
  const { path, query } = useRoute();
  const vault = useVaultState();
  useStoreVersion();
  useAutoLock(vault.open);
  const [, force] = useState(0);
  /* sessão trazida do app legado (legado/), se houver, antes de decidir pela tela de senha */
  const [resumed, setResumed] = useState(false);
  useEffect(() => { C.Vault.resume().catch(() => false).then(() => { bump(); setResumed(true); }); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [path]);

  let screen: React.ReactNode;
  let nav = true;
  if (!resumed) { screen = null; nav = false; }
  else if (!vault.supported) { screen = <Unsupported />; nav = false; }
  else if (!vault.open) { screen = <Lock onDone={() => force((x) => x + 1)} />; nav = false; }
  else if (path === '' || path === 'home') screen = <Home />;
  else if (path === 'leitos' || path === 'pacientes') screen = <Patients query={query} />;
  else if (path === 'ajustes' || path === 'seguranca') screen = <Settings />;
  else if (path === 'protocolos') screen = <Protocols query={query} />;
  else if (path === 'protocolo') screen = <ProtocolView slug={query.get('id') || ''} />;
  else {
    const t = findTool(path);
    if (t && t.href) { C.Vault.go(t.href); screen = null; }
    else if (t) screen = <ToolPage tool={t} />;
    else screen = <Home />;
  }

  return (
    <>
      <Toast.Provider placement="top" />
      {screen}
      {nav && <BottomNav />}
    </>
  );
}
