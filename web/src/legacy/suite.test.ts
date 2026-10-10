/* Roda a bateria completa do app anterior (../tests/tests.js — valores esperados calculados à mão) dentro do Vitest/jsdom,
   com os mesmos scripts e na mesma ordem de ../tests/index.html. Antes só rodava abrindo a página no navegador. */
import { describe, it, expect } from 'vitest';
import '@/lib/calc'; /* core.js + engine.js (window.Calc) */
import '../../../assets/js/beds.js';
import '../../../assets/js/scan.js';
import '../../../assets/js/pcr.js';
import '../../../assets/js/tools/hemo.js';
import '../../../assets/js/tools/inf.js';
import '../../../assets/js/tools/sed.js';
import '../../../assets/js/tools/met.js';
import '../../../assets/js/tools/hema.js';
import '../../../assets/js/tools/delta.js';

type Result = { pass: number; fail: number };
const wait = (cond: () => Result | undefined, ms: number) => new Promise<Result>((res, rej) => {
  const t0 = Date.now();
  const tick = () => { const r = cond(); if (r) return res(r); if (Date.now() - t0 > ms) return rej(new Error('a bateria não terminou')); setTimeout(tick, 50); };
  tick();
});

describe('bateria do app anterior (tests/tests.js)', () => {
  it('todos os testes passam', async () => {
    document.body.innerHTML = '<div id="sum"></div><table><tbody id="out"></tbody></table><div id="sandbox"></div>';
    // @ts-expect-error script clássico (IIFE que escreve em window.__testResult), não é um módulo
    await import('../../../tests/tests.js');
    const r = await wait(() => (window as unknown as { __testResult?: Result }).__testResult, 90_000);
    const failed = [...document.querySelectorAll('#out tr')]
      .filter((tr) => tr.querySelector('td.bad'))
      .map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent?.trim()).join(' | '));
    expect(failed, 'testes que falharam').toEqual([]);
    expect(r.fail).toBe(0);
    expect(r.pass).toBeGreaterThan(250);
  }, 120_000);
});
