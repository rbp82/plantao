/* Os motores auditados existem em dois lugares: ../assets/js/ (app anterior, publicado em legado/) e src/legacy/ (app novo).
   Este teste garante que são byte a byte iguais — uma correção de fórmula feita só em um lado quebra o CI. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

describe('paridade dos motores auditados (assets/js ↔ web/src/legacy)', () => {
  for (const f of ['core.js', 'engine.js']) {
    it(`${f} é idêntico nos dois apps`, () => {
      expect(read(`./${f}`)).toBe(read(`../../../assets/js/${f}`));
    });
  }
});
