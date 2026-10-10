/* Ambiente de teste (jsdom): o que os componentes HeroUI e o app anterior esperam do navegador e o jsdom não tem. */
import { webcrypto } from 'node:crypto';

if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false, media: query, onchange: null,
      addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    }) as MediaQueryList;
  }
  if (!('ResizeObserver' in window)) {
    (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  }
  if (!window.scrollTo) window.scrollTo = () => {};
  /* a bateria do app anterior lê o texto renderizado com innerText, que o jsdom não implementa */
  if (!('innerText' in HTMLElement.prototype) || HTMLElement.prototype.innerText === undefined) {
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get() { return (this as HTMLElement).textContent ?? ''; },
      set(v: string) { (this as HTMLElement).textContent = v; },
    });
  }
  /* cofre: AES-GCM/PBKDF2 pelo WebCrypto do Node quando o jsdom não o expõe */
  const g = globalThis as unknown as { crypto?: Crypto };
  if (!g.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}
