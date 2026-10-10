import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { toast } from '@heroui/react';
import '@/styles/app.css';
import { applyTheme } from '@/lib/store';
import { C } from '@/lib/calc';
import { App } from '@/App';

applyTheme(C.store.get('theme', 'auto'));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(C.store.get('theme', 'auto')));

/* links para o app legado (legado/…) levam a sessão junto, para não pedir a senha de novo */
document.addEventListener('click', (e) => {
  const a = (e.target as Element | null)?.closest?.('a[href*="/legado/"]') as HTMLAnchorElement | null;
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || a.target === '_blank') return;
  e.preventDefault();
  C.Vault.go(a.href);
});

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !import.meta.env.DEV) {
  window.addEventListener('load', () => { navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {}); });
  /* versão nova ativada (skipWaiting): avisa e recarrega na próxima troca de tela, para não perder o que está sendo digitado */
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; }
    toast('Atualização instalada — aplicada na próxima tela');
    /* recarrega levando a sessão (handoff para si mesmo), para não pedir a senha de novo no meio do plantão */
    window.addEventListener('hashchange', () => { C.Vault.handoff().catch(() => false).then(() => location.reload()); }, { once: true });
  });
}
