/* Armazenamento reativo sobre o cofre do núcleo (store de src/lib/core/vault.ts).
   O store avisa cada mudança por `store.onChange`; aqui isso vira uma versão que o React observa. */
import { useSyncExternalStore, useCallback } from 'react';
import { store, Vault } from './core/vault';

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;
export const bump = () => { version++; listeners.forEach((l) => l()); };

/* toda gravação/remoção no cofre (e toda mudança de estado do cofre) re-renderiza quem observa */
store.onChange(bump);

const subscribe = (l: Listener) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getVersion = () => version;

/* re-renderiza sempre que qualquer chave do cofre muda (barato: leitura é em memória) */
export function useStoreVersion() { return useSyncExternalStore(subscribe, getVersion, getVersion); }

export function useStore<T>(key: string, fallback: T): [T, (v: T) => void] {
  useStoreVersion();
  const value = store.get<T>(key, fallback);
  const set = useCallback((v: T) => store.set(key, v), [key]);
  return [value, set];
}

/* estado do cofre (bloqueado / aberto / temporário) */
export const useVaultState = () => {
  useStoreVersion();
  return { open: Vault.isOpen(), temp: Vault.isTemp(), exists: Vault.exists(), supported: Vault.supported() };
};

/* tema: único dado fora do cofre, em texto claro */
export type Theme = 'auto' | 'light' | 'dark';
export function applyTheme(t: Theme) {
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.documentElement.className = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#1C1B19' : '#F6F5F1');
}
