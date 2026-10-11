import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { toast } from '@heroui/react';
import '@/styles/app.css';
import { applyTheme } from '@/lib/store';
import { C } from '@/lib/calc';
import { App } from '@/App';

applyTheme(C.store.get('theme', 'auto'));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(C.store.get('theme', 'auto')));

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !import.meta.env.DEV) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {});
    /* o app anterior (publicado em legado/ até a v4.1) tinha o próprio service worker: remove o registro que sobrou */
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => { if (r.scope.includes('/legado/')) r.unregister(); })).catch(() => {});
  });
  /* versão nova ativada (skipWaiting): avisa e recarrega na próxima troca de tela, para não perder o que está sendo digitado */
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; }
    toast('Atualização instalada — aplicada na próxima tela');
    /* recarrega levando a sessão (handoff para si mesmo), para não pedir a senha de novo no meio do plantão */
    window.addEventListener('hashchange', () => { C.Vault.handoff().catch(() => false).then(() => location.reload()); }, { once: true });
  });
}
