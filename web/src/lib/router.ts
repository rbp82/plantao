/* Rotas por hash (#/id?chave=valor), como no app anterior — links antigos continuam válidos. */
import { useSyncExternalStore } from 'react';

export interface Route { path: string; query: URLSearchParams; raw: string }

function parse(): Route {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  return { path: path || '', query: new URLSearchParams(qs || ''), raw };
}

let cached = parse();
let cachedHash = location.hash;
const get = () => {
  if (location.hash !== cachedHash) { cachedHash = location.hash; cached = parse(); }
  return cached;
};
const subscribe = (cb: () => void) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb); };

export const useRoute = () => useSyncExternalStore(subscribe, get, get);
export const navigate = (to: string, replace = false) => {
  const h = to.startsWith('#') ? to : '#/' + to.replace(/^\/?/, '');
  if (replace) location.replace(h); else location.hash = h;
};
export const href = (path: string, q?: Record<string, string>) => {
  const qs = q ? new URLSearchParams(q).toString() : '';
  return '#/' + path + (qs ? '?' + qs : '');
};
