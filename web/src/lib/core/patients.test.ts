/* Seção 11 de ../tests/tests.js (lista de pacientes — dados por paciente ativo), sem a montagem de telas:
   o que antes era digitar o peso na faixa de peso aqui é Patient.set('peso', …), que é o que a faixa faz. */
import { describe, it, expect, beforeEach } from 'vitest';
import { Patients, Patient, ptBed, ptIni, type PatientRec } from './patients';
import { store, Vault } from './vault';

beforeEach(() => { Vault.wipe(); Vault.temporary(); });

describe('11. Lista de pacientes — dados por paciente ativo', () => {
  it('fluxo completo', () => {
    const P = Patients;
    const p1 = P.add('leito', '12');
    expect(P.active()?.id).toBe(p1.id);
    expect(P.name(p1)).toBe('Leito 12');
    Patient.set('peso', '80');
    expect(P.get(p1.id)?.data.peso).toBe('80');
    const p2 = P.add('ini', 'j.s.m.');
    expect(P.name(p2)).toBe('J.S.M.');
    expect(Patient.get('peso')).toBeUndefined(); /* novo paciente vazio */
    Patient.set('peso', '55');
    P.setActive(p1.id);
    expect(Patient.get('peso')).toBe('80'); /* voltar ao Leito 12 traz 80 kg */
    expect(P.find('leito', ' 12 ')?.id).toBe(p1.id);
    const p3 = P.add('atd', '4587123');
    expect(P.name(p3)).toBe('Atend. 4587123');
    P.remove(p1.id);
    expect(P.get(p1.id)).toBeNull();
    P.setActive(null);
    expect(P.name(P.active())).toBe('Avulso');
    Patient.set('peso', '70');
    expect(Patient.get('peso')).toBe('70'); /* avulso guarda o peso separado dos pacientes */
    expect(P.get(p2.id)?.data.peso).toBe('55'); /* …sem alterar o paciente J.S.M. */
  });

  describe('bordas', () => {
    it('TYPES', () => expect(Patients.TYPES).toEqual({ ini: 'Iniciais', leito: 'Leito', atd: 'Atendimento' }));
    it('lista vazia e sem ativo no início', () => { expect(Patients.list()).toEqual([]); expect(Patients.active()).toBeNull(); expect(Patients.get('x')).toBeNull(); });
    it('add: rótulo aparado e cortado em 24 caracteres; formato do registro', () => {
      const p = Patients.add('leito', '  ' + 'A'.repeat(30) + '  ');
      expect(p.label).toBe('A'.repeat(24));
      expect(p).toEqual({ id: p.id, tipo: 'leito', label: p.label, data: {}, created: p.created, updated: p.updated });
      expect(store.get<PatientRec[]>('patients', [])).toEqual([p]);
      expect(store.get<string | null>('activePatient', null)).toBe(p.id);
    });
    it('find ignora acentos, caixa e espaços; distingue o tipo', () => {
      const p = Patients.add('ini', 'J. S. M.');
      expect(Patients.find('ini', 'j.s.m.')?.id).toBe(p.id);
      expect(Patients.find('leito', 'J.S.M.')).toBeNull();
      const q = Patients.add('leito', 'UTI-07');
      expect(Patients.find('leito', 'uti-07')?.id).toBe(q.id);
      expect(Patients.find('leito', 'UTI 07')).toBeNull();
    });
    it('remover o paciente ativo limpa o ativo; remover outro mantém', () => {
      const a = Patients.add('leito', '1');
      const b = Patients.add('leito', '2');
      Patients.remove(a.id);
      expect(Patients.active()?.id).toBe(b.id);
      Patients.remove(b.id);
      expect(Patients.active()).toBeNull();
      expect(store.get<string | null>('activePatient', null)).toBeNull();
    });
    it('name com ficha: leito/atendimento ganham as iniciais; iniciais não repetem', () => {
      const p = Patients.add('leito', '12'); p.ficha = { ini: 'j.s.' }; Patients.touch(p);
      expect(Patients.name(Patients.get(p.id))).toBe('Leito 12 · J.S.');
      const a = Patients.add('atd', '123'); a.ficha = { ini: 'ab' }; Patients.touch(a);
      expect(Patients.name(Patients.get(a.id))).toBe('Atend. 123 · AB');
      const i = Patients.add('ini', 'cd'); i.ficha = { ini: 'cd', leito: '5' }; Patients.touch(i);
      expect(Patients.name(Patients.get(i.id))).toBe('CD');
      expect(Patients.name(null)).toBe('Avulso');
      expect(Patients.name(undefined)).toBe('Avulso');
    });
    it('touch atualiza `updated` e grava a lista', () => {
      const p = Patients.add('leito', '3');
      const before = p.updated;
      p.updated = before - 5000; Patients.save(Patients.list().map((x) => (x.id === p.id ? p : x)));
      Patients.touch(p);
      expect(Patients.get(p.id)!.updated).toBeGreaterThanOrEqual(before);
    });
    it('ptBed e ptIni: leito e iniciais podem coexistir (ficha)', () => {
      const leito: PatientRec = { id: 'a', tipo: 'leito', label: '12', data: {}, ficha: { ini: 'js' }, created: 0, updated: 0 };
      const ini: PatientRec = { id: 'b', tipo: 'ini', label: 'ab', data: {}, ficha: { leito: '7' }, created: 0, updated: 0 };
      const atd: PatientRec = { id: 'c', tipo: 'atd', label: '99', data: {}, created: 0, updated: 0 };
      expect([ptBed(leito), ptIni(leito)]).toEqual(['12', 'JS']);
      expect([ptBed(ini), ptIni(ini)]).toEqual(['7', 'AB']);
      expect([ptBed(atd), ptIni(atd)]).toEqual(['', '']);
      expect([ptBed(null), ptIni(null)]).toEqual(['', '']);
    });
  });
});

describe('Patient (dados do paciente ativo ou avulso)', () => {
  it('set grava no paciente ativo e marca updated; valor vazio apaga a chave', () => {
    const p = Patients.add('leito', '12');
    Patient.set('peso', '70'); Patient.set('idade', '65');
    expect(Patients.get(p.id)?.data).toEqual({ peso: '70', idade: '65' });
    Patient.set('idade', '');
    expect(Patients.get(p.id)?.data).toEqual({ peso: '70' });
    Patient.set('peso', null);
    expect(Patients.get(p.id)?.data).toEqual({});
    expect(Patients.get(p.id)!.updated).toBeGreaterThanOrEqual(p.created);
  });
  it('avulso: formato { v, t } na chave "patient" e expira em 12 h', () => {
    Patient.set('peso', '77');
    const rec = store.get<{ v: Record<string, string>; t: number }>('patient')!;
    expect(rec.v).toEqual({ peso: '77' });
    expect(Math.abs(Date.now() - rec.t)).toBeLessThan(2000);
    expect(Patient.data()).toEqual({ peso: '77' });
    store.set('patient', { v: { peso: '77' }, t: Date.now() - 12 * 3600 * 1000 - 1 });
    expect(Patient.data()).toEqual({});
    expect(Patient.get('peso')).toBeUndefined();
    store.set('patient', { v: { peso: '77' } }); /* sem t = inválido */
    expect(Patient.data()).toEqual({});
  });
  it('clear apaga só o avulso', () => {
    Patient.set('peso', '77');
    const p = Patients.add('leito', '1'); Patient.set('peso', '80'); Patients.setActive(null);
    Patient.clear();
    expect(Patient.data()).toEqual({});
    expect(Patients.get(p.id)?.data.peso).toBe('80');
  });
  it('summary monta "70 kg · 65 anos · masc. · 170 cm · Cr 1,2"', () => {
    expect(Patient.summary({ peso: '70', idade: '65', sexo: 'M', altura: '170', cr: '1,2' })).toBe('70 kg · 65 anos · masc. · 170 cm · Cr 1,2');
    expect(Patient.summary({ sexo: 'F' })).toBe('fem.');
    expect(Patient.summary({})).toBe('');
    Patient.set('peso', '83,5');
    expect(Patient.summary()).toBe('83,5 kg');
  });
  it('cofre bloqueado: nada se lê nem se grava', () => {
    Vault.wipe();
    expect(Patients.list()).toEqual([]);
    Patient.set('peso', '1');
    expect(Patient.data()).toEqual({});
  });
});
