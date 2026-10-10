/* Armazenamento reativo sobre o cofre do núcleo (C.store).
   C.store é imperativo; aqui ele ganha um canal de mudanças para o React re-renderizar. */
import { useSyncExternalStore, useCallback } from 'react';
import { C } from './calc';

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;
export const bump = () => { version++; listeners.forEach((l) => l()); };

const rawSet = C.store.set.bind(C.store);
const rawDel = C.store.del.bind(C.store);
C.store.set = (k, v) => { rawSet(k, v); bump(); };
C.store.del = (k) => { rawDel(k); bump(); };

const subscribe = (l: Listener) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getVersion = () => version;

/* re-renderiza sempre que qualquer chave do cofre muda (barato: leitura é em memória) */
export function useStoreVersion() { return useSyncExternalStore(subscribe, getVersion, getVersion); }

export function useStore<T>(key: string, fallback: T): [T, (v: T) => void] {
  useStoreVersion();
  const value = C.store.get<T>(key, fallback);
  const set = useCallback((v: T) => C.store.set(key, v), [key]);
  return [value, set];
}

/* estado do cofre (bloqueado / aberto / temporário) */
export const useVaultState = () => {
  useStoreVersion();
  return { open: C.Vault.isOpen(), temp: C.Vault.isTemp(), exists: C.Vault.exists(), supported: C.Vault.supported() };
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
