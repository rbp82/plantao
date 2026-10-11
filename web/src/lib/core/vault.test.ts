/* Seção 12 de ../tests/tests.js: cofre criptografado — AES-256-GCM + PBKDF2 (WebCrypto do Node, via test-setup).
   Mais: canal onChange do store, modo temporário, formato das chaves `plantao:*` e handoff/resume sem IndexedDB. */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { store, Vault } from './vault';
import { Patients, Patient } from './patients';

const V = Vault;
const raw = () => localStorage.getItem('plantao:vault') || '';

beforeEach(() => { V.wipe(); localStorage.removeItem('plantao:theme'); });
afterAll(() => { V.wipe(); });

describe('12. Cofre criptografado — AES-256-GCM + PBKDF2', () => {
  it('cria, grava cifrado, bloqueia, desbloqueia, troca a senha, recusa adulteração', async () => {
    expect(V.exists()).toBe(false);
    localStorage.setItem('plantao:favs', JSON.stringify(['dva']));
    localStorage.setItem('plantao:patient', JSON.stringify({ v: { peso: '77' }, t: Date.now() }));
    await V.create('senha-teste-1');
    expect(V.exists() && V.isOpen()).toBe(true);
    expect(JSON.stringify(store.get('favs'))).toBe('["dva"]'); /* dados antigos em texto claro migram para o cofre */
    expect(localStorage.getItem('plantao:favs')).toBeNull();      /* …e são apagados do armazenamento aberto */
    Patients.add('leito', 'UTI-07');
    Patient.set('peso', '83,5');
    await V.flush();
    const blob = raw();
    expect(blob.includes('UTI-07')).toBe(false);
    expect(blob.includes('83,5')).toBe(false);
    expect(blob.includes('senha-teste-1')).toBe(false);
    const v = JSON.parse(blob);
    expect(`${v.kdf} ${v.iter}`).toBe('PBKDF2-SHA256 600000');
    expect(atob(v.salt).length).toBe(16);
    expect(atob(v.data.iv).length).toBe(12);
    await V.lock();
    expect(store.get('patients', 'nada')).toBe('nada');
    expect(await V.unlock('senha-errada')).toBe(false);
    expect(await V.unlock('senha-teste-1')).toBe(true);
    expect(Patients.active() && Patients.name(Patients.active()) + ' ' + Patient.get('peso')).toBe('Leito UTI-07 83,5');
    const iv1 = JSON.parse(raw()).data.iv;
    store.set('x', 1); await V.flush();
    expect(JSON.parse(raw()).data.iv !== iv1).toBe(true); /* IV novo a cada gravação */
    expect(await V.changePassword('errada', 'nova-senha-2')).toBe(false);
    expect(await V.changePassword('senha-teste-1', 'nova-senha-2')).toBe(true);
    await V.lock();
    expect(await V.unlock('senha-teste-1')).toBe(false);
    expect((await V.unlock('nova-senha-2')) && Patient.get('peso')).toBe('83,5');
    await V.lock();
    const t = JSON.parse(raw());
    const ct = atob(t.data.ct).split(''); ct[5] = String.fromCharCode(ct[5].charCodeAt(0) ^ 1); t.data.ct = btoa(ct.join(''));
    localStorage.setItem('plantao:vault', JSON.stringify(t));
    let tampered = 'abriu';
    try { tampered = (await V.unlock('nova-senha-2')) ? 'abriu' : 'recusou'; } catch { tampered = 'recusou'; }
    expect(tampered).toBe('recusou'); /* autenticação GCM */
  }, 60000);

  it('após 5 erros: espera obrigatória; durante a espera nem a senha certa é testada; apagar tudo remove o cofre', async () => {
    await V.create('senha-teste-3'); await V.lock();
    for (let i = 0; i < 5; i++) await V.unlock('x' + i);
    expect(V.waitMs() > 25000).toBe(true);
    let blocked = false;
    try { await V.unlock('senha-teste-3'); } catch (e) { blocked = (e as Error).message === 'espera'; }
    expect(blocked).toBe(true);
    V.wipe();
    expect(V.exists()).toBe(false);
  }, 60000);
});

describe('bordas do cofre', () => {
  it('formato no localStorage: só chaves plantao:*; vaultFails registra tentativas e some ao abrir', async () => {
    await V.create('senha-teste-4');
    expect(Object.keys(localStorage).filter((k) => k.startsWith('plantao:'))).toEqual(['plantao:vault']);
    const v = JSON.parse(raw());
    expect(Object.keys(v).sort()).toEqual(['data', 'iter', 'kdf', 'salt', 'v', 'wpw']);
    expect(v.v).toBe(2);
    expect(atob(v.wpw.iv).length).toBe(12);
    expect(atob(v.wpw.ct).length).toBe(32 + 16); /* DEK de 32 bytes + tag GCM de 16 */
    await V.lock();
    await V.unlock('errada');
    expect(JSON.parse(localStorage.getItem('plantao:vaultFails')!)).toEqual({ n: 1, until: 0 });
    expect(V.waitMs()).toBe(0); /* antes da 5ª tentativa não há espera */
    await V.unlock('senha-teste-4');
    expect(localStorage.getItem('plantao:vaultFails')).toBeNull();
  }, 60000);

  it('senha curta é recusada (MIN_LEN 6) em create e changePassword', async () => {
    expect(V.MIN_LEN).toBe(6);
    await expect(V.create('12345')).rejects.toThrow('curta');
    expect(V.exists()).toBe(false);
    await V.create('123456');
    await expect(V.changePassword('123456', 'abc')).rejects.toThrow('curta');
  }, 60000);

  it('unlock sem cofre devolve false; hasBio false; disableBio sem bio não quebra', async () => {
    expect(await V.unlock('qualquer')).toBe(false);
    expect(V.hasBio()).toBe(false);
    expect(() => V.disableBio()).not.toThrow();
    await expect(V.unlockBio()).rejects.toThrow('sem-bio');
  });

  it('modo temporário: calcula em memória, nada vai para o disco, isTemp true', async () => {
    V.temporary();
    expect(V.isOpen()).toBe(true);
    expect(V.isTemp()).toBe(true);
    expect(V.exists()).toBe(false);
    store.set('favs', ['dva']);
    await V.flush();
    expect(localStorage.getItem('plantao:vault')).toBeNull();
    expect(store.get('favs')).toEqual(['dva']);
    await V.lock();
    expect(V.isOpen()).toBe(false);
    expect(store.get('favs', 'nada')).toBe('nada');
  });

  it('cofre persistente não é temporário; wipe mantém o tema', async () => {
    store.set('theme', 'dark');
    await V.create('senha-teste-5');
    expect(V.isTemp()).toBe(false);
    V.wipe();
    expect(localStorage.getItem('plantao:theme')).toBe('"dark"');
    expect(store.get('theme', 'auto')).toBe('dark');
    expect(V.exists()).toBe(false);
  }, 60000);

  it('tema é texto claro (fora do cofre), legível mesmo bloqueado', () => {
    store.set('theme', 'light');
    expect(V.isOpen()).toBe(false);
    expect(store.get('theme', 'auto')).toBe('light');
    store.del('theme');
    expect(store.get('theme', 'auto')).toBe('auto');
  });

  it('store.get com uma só chave devolve undefined quando não há valor; del remove', () => {
    V.temporary();
    expect(store.get('nada')).toBeUndefined();
    store.set('k', { a: 1 });
    expect(store.get('k')).toEqual({ a: 1 });
    store.del('k');
    expect(store.get('k', 'x')).toBe('x');
  });

  it('onChange avisa a cada set/del e a cada mudança de estado do cofre; unsubscribe cancela', async () => {
    let n = 0;
    const off = store.onChange(() => { n++; });
    V.temporary(); expect(n).toBe(1);
    store.set('a', 1); expect(n).toBe(2);
    store.del('a'); expect(n).toBe(3);
    store.set('theme', 'dark'); expect(n).toBe(4);
    await V.lock(); expect(n).toBe(5);
    store.set('a', 1); expect(n).toBe(5); /* bloqueado: nada muda, ninguém é avisado */
    off();
    V.temporary(); store.set('a', 2);
    expect(n).toBe(5);
  });

  it('gravação é agendada (250 ms) e flush grava na hora', async () => {
    await V.create('senha-teste-6');
    const before = raw();
    store.set('favs', ['x']);
    expect(raw()).toBe(before); /* ainda não gravou */
    await V.flush();
    expect(raw()).not.toBe(before);
    await V.lock();
    await V.unlock('senha-teste-6');
    expect(store.get('favs')).toEqual(['x']);
  }, 60000);

  it('lock grava o que estava pendente', async () => {
    await V.create('senha-teste-7');
    store.set('recents', ['dva']);
    await V.lock();
    await V.unlock('senha-teste-7');
    expect(store.get('recents')).toEqual(['dva']);
  }, 60000);

  it('handoff sem sessão persistente devolve false; resume sem IndexedDB devolve false (e true se já aberto)', async () => {
    expect(await V.handoff()).toBe(false);
    V.temporary();
    expect(await V.handoff()).toBe(false);
    expect(await V.resume()).toBe(true);
    await V.lock();
    expect(await V.resume()).toBe(false);
  });

  it('cofre gravado pelo app anterior (formato v2) abre com a senha', async () => {
    /* o mesmo formato que o core.js gravava: só reproduzimos a gravação e lemos de volta "frio" */
    await V.create('senha-teste-8');
    store.set('gasCfg', { agRef: 12 });
    await V.lock();
    const saved = raw();
    V.wipe();
    localStorage.setItem('plantao:vault', saved);
    expect(V.exists()).toBe(true);
    expect(await V.unlock('senha-teste-8')).toBe(true);
    expect(store.get('gasCfg')).toEqual({ agRef: 12 });
  }, 60000);
});
