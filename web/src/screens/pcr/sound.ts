/* Áudio, vibração e tela acesa durante a PCR (como no app anterior). */
import { active } from '@/lib/pcr';

let ac: AudioContext | null = null;
export function beep(freq = 880, dur = 0.12, n = 1) {
  try {
    const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctor = W.AudioContext || W.webkitAudioContext;
    if (!Ctor) return;
    ac = ac || new Ctor();
    for (let i = 0; i < n; i++) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = freq; o.connect(g); g.connect(ac.destination);
      const t0 = ac.currentTime + i * (dur + 0.08);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.start(t0); o.stop(t0 + dur + 0.02);
    }
  } catch { /* sem áudio */ }
}
export const buzz = (p: number | number[]) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch { /* */ } };

/* tela acesa: pedido enquanto houver PCR ativa; re-pedido quando o app volta a ficar visível */
type Sentinel = { release(): Promise<void>; addEventListener(t: 'release', fn: () => void): void };
type WakeNav = Navigator & { wakeLock?: { request(type: 'screen'): Promise<Sentinel> } };
let wake: Sentinel | null = null;
export async function keepAwake(on: boolean) {
  try {
    const nav = navigator as WakeNav;
    if (on && nav.wakeLock && !wake) { wake = await nav.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); }
    if (!on && wake) { await wake.release(); wake = null; }
  } catch { wake = null; }
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && active()) keepAwake(true); });
}

/* metrônomo de compressões (110/min), um por vez */
let metro: ReturnType<typeof setInterval> | null = null;
export const metroOn = () => metro !== null;
export function startMetro() { if (metro) return; metro = setInterval(() => beep(1200, 0.03), 60000 / 110); }
export function stopMetro() { if (metro) clearInterval(metro); metro = null; }
