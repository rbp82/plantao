/* Armazenamento: cofre criptografado no aparelho (portado do núcleo do app anterior, auditado).
   Tudo o que o app guarda (dados do paciente, diluições, favoritos, recentes, preferências)
   fica num único bloco cifrado com AES-256-GCM. A chave é derivada da senha com PBKDF2-SHA256
   (600 000 iterações, sal aleatório de 16 bytes), não é exportável e só existe na memória
   enquanto o app está desbloqueado. Só o tema fica em texto claro (aplicado antes do login).

   FORMATO IDÊNTICO ao do app anterior (chaves `plantao:*` no localStorage, estrutura do cofre,
   banco IndexedDB 'plantao-handoff'): há aparelhos com dados reais gravados nesse formato. */

const LS = {
  get(k: string): string | null { try { return localStorage.getItem('plantao:' + k); } catch { return null; } },
  set(k: string, v: string): boolean { try { localStorage.setItem('plantao:' + k, v); return true; } catch { return false; } },
  del(k: string): void { try { localStorage.removeItem('plantao:' + k); } catch { /* */ } },
  keys(): string[] {
    const out: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('plantao:')) out.push(k.slice(8)); }
    } catch { /* */ }
    return out;
  },
};
const PLAIN = new Set(['theme']);
const RESERVED = new Set(['theme', 'vault', 'vaultFails']);

type Mem = Record<string, unknown>;
let mem: Mem | null = null;        /* dados decifrados (null = bloqueado) */
let vkey: CryptoKey | null = null; /* CryptoKey AES-GCM, não exportável */
let persistent = false;            /* false = modo temporário (nada é gravado) */
let saveT: ReturnType<typeof setTimeout> | undefined;

/* ---- canal de mudanças (novo): o React assina para re-renderizar ---- */
type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => { try { l(); } catch { /* */ } }); }

export interface Store {
  get<T>(k: string, d: T): T;
  get<T = unknown>(k: string): T | undefined;
  set(k: string, v: unknown): void;
  del(k: string): void;
  /* chama fn a cada set/del e a cada mudança de estado do cofre; devolve a função que cancela a assinatura */
  onChange(fn: Listener): () => void;
}

export const store: Store = {
  get<T>(k: string, d?: T): T {
    if (PLAIN.has(k)) { const v = LS.get(k); try { return v === null ? (d as T) : (JSON.parse(v) as T); } catch { return d as T; } }
    return mem && Object.prototype.hasOwnProperty.call(mem, k) ? (mem[k] as T) : (d as T);
  },
  set(k, v) {
    if (PLAIN.has(k)) { LS.set(k, JSON.stringify(v)); notify(); return; }
    if (!mem) return;
    mem[k] = v; scheduleSave(); notify();
  },
  del(k) {
    if (PLAIN.has(k)) { LS.del(k); notify(); return; }
    if (!mem) return;
    delete mem[k]; scheduleSave(); notify();
  },
  onChange(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
};

/* Estrutura do cofre (localStorage 'plantao:vault'):
   { v: 2, kdf, iter, salt,            ← PBKDF2 da senha
     wpw:  {iv, ct},                   ← chave de dados (DEK, 32 bytes) cifrada pela chave da senha
     data: {iv, ct},                   ← dados do app cifrados pela DEK
     bio:  { cred, prfSalt, w:{iv,ct} } ← opcional: DEK cifrada pela chave da biometria (passkey + PRF) }
   Trocar a senha só recifra 'wpw'; a biometria continua válida. */
interface Sealed { iv: string; ct: string }
interface VaultBio { cred: string; prfSalt: string; w: Sealed }
interface VaultRec { v: number; kdf: string; iter: number; salt: string; wpw: Sealed; data: Sealed; bio?: VaultBio }
interface Fails { n: number; until: number }

const ITER = 600000;
const enc = new TextEncoder(), dec = new TextDecoder();
const toB64 = (buf: ArrayBuffer | Uint8Array): string => { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); };
const fromB64 = (s: string): Uint8Array => { const t = atob(s); const b = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) b[i] = t.charCodeAt(i); return b; };
const rand = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));
/* o WebCrypto exige buffers com ArrayBuffer "puro" (não SharedArrayBuffer) */
const buf = (b: Uint8Array): BufferSource => b as unknown as BufferSource;

async function passKey(pass: string, salt: Uint8Array, iter: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: buf(salt), iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
/* saída PRF (32 bytes do autenticador) → HKDF-SHA256 → chave AES-GCM */
async function bioKey(prfOut: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', buf(prfOut), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: enc.encode('plantao-vault-bio-v1') }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
const dataKey = (raw: Uint8Array): Promise<CryptoKey> => crypto.subtle.importKey('raw', buf(raw), 'AES-GCM', false, ['encrypt', 'decrypt']);
async function sealBytes(key: CryptoKey, bytes: Uint8Array): Promise<Sealed> {
  const iv = rand(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: buf(iv) }, key, buf(bytes));
  return { iv: toB64(iv), ct: toB64(ct) };
}
async function openBytes(key: CryptoKey, blob: Sealed): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf(fromB64(blob.iv)) }, key, buf(fromB64(blob.ct))));
}
const sealObj = (key: CryptoKey, obj: unknown): Promise<Sealed> => sealBytes(key, enc.encode(JSON.stringify(obj)));
const openObj = async (key: CryptoKey, blob: Sealed): Promise<Mem> => JSON.parse(dec.decode(await openBytes(key, blob))) as Mem;

function readVault(): VaultRec | null { try { return JSON.parse(LS.get('vault') as string) as VaultRec | null; } catch { return null; } }
async function writeVault(): Promise<void> {
  if (!persistent || !vkey || !mem) return;
  const v = readVault();
  if (!v) return;
  v.data = await sealObj(vkey, mem);
  LS.set('vault', JSON.stringify(v));
}
function scheduleSave() {
  if (!persistent) return;
  clearTimeout(saveT);
  saveT = setTimeout(() => { writeVault().catch(() => {}); }, 250);
}
/* abre a DEK com a senha; null se a senha estiver errada */
async function dekFromPassword(v: VaultRec, pass: string): Promise<Uint8Array | null> {
  const k = await passKey(pass, fromB64(v.salt), v.iter);
  try { return await openBytes(k, v.wpw); } catch { return null; }
}

/* tentativas de senha erradas: espera crescente a partir da 5ª (30 s, 60 s, 120 s… até 15 min) */
function fails(): Fails { try { return (JSON.parse(LS.get('vaultFails') as string) as Fails | null) || { n: 0, until: 0 }; } catch { return { n: 0, until: 0 }; } }
function registerFail() {
  const f = fails(); f.n += 1;
  f.until = f.n >= 5 ? Date.now() + Math.min(30000 * Math.pow(2, f.n - 5), 15 * 60000) : 0;
  LS.set('vaultFails', JSON.stringify(f));
}

/* ---- WebAuthn / passkey com extensão PRF ----
   A extensão PRF ainda não está completa nas definições DOM do TypeScript; tipos locais mínimos. */
interface PrfResults { first?: ArrayBuffer }
interface PrfExt { enabled?: boolean; results?: PrfResults }
interface ExtResults { prf?: PrfExt }
interface PkCred { rawId: ArrayBuffer; getClientExtensionResults(): ExtResults }
type PkCredStatic = { getClientCapabilities?: () => Promise<Record<string, boolean> | undefined>; isUserVerifyingPlatformAuthenticatorAvailable(): Promise<boolean> };

async function prfAssert(credB64: string, prfSalt: Uint8Array): Promise<Uint8Array> {
  const publicKey = {
    challenge: rand(32), rpId: location.hostname, userVerification: 'required', timeout: 60000,
    allowCredentials: [{ type: 'public-key', id: fromB64(credB64) }],
    extensions: { prf: { eval: { first: prfSalt } } },
  } as unknown as PublicKeyCredentialRequestOptions;
  const cred = (await navigator.credentials.get({ publicKey })) as PkCred | null;
  const r = cred && cred.getClientExtensionResults().prf;
  if (!r || !r.results || !r.results.first) throw new Error('prf-indisponivel');
  return new Uint8Array(r.results.first);
}

export interface VaultApi {
  MIN_LEN: number;
  supported(): boolean;
  exists(): boolean;
  isOpen(): boolean;
  isTemp(): boolean;
  waitMs(): number;
  hasBio(): boolean;
  bioAvailable(): Promise<boolean>;
  create(pass: string): Promise<void>;
  unlock(pass: string): Promise<boolean>;
  unlockBio(): Promise<boolean>;
  enableBio(pass: string): Promise<boolean>;
  disableBio(): void;
  temporary(): void;
  lock(): Promise<void>;
  flush(): Promise<void>;
  changePassword(oldPass: string, newPass: string): Promise<boolean>;
  wipe(): void;
  handoff(): Promise<boolean>;
  resume(): Promise<boolean>;
}

export const Vault: VaultApi = {
  MIN_LEN: 6,
  supported: () => !!(window.isSecureContext && window.crypto && crypto.subtle),
  exists: () => !!readVault(),
  isOpen: () => mem !== null,
  isTemp: () => mem !== null && !persistent,
  waitMs: () => Math.max(0, fails().until - Date.now()),
  hasBio: () => { const v = readVault(); return !!(v && v.bio); },

  /* biometria disponível neste aparelho/navegador? (autenticador de plataforma + PRF) */
  async bioAvailable() {
    if (!Vault.supported() || !window.PublicKeyCredential) return false;
    try {
      const PKC = window.PublicKeyCredential as unknown as PkCredStatic;
      if (PKC.getClientCapabilities) {
        const caps = await PKC.getClientCapabilities();
        if (caps && caps['extension:prf'] === false) return false;
      }
      return await PKC.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch { return false; }
  },

  /* cria o cofre; migra e apaga dados antigos em texto claro */
  async create(pass) {
    if (String(pass).length < Vault.MIN_LEN) throw new Error('curta');
    const raw = rand(32);
    const salt = rand(16);
    const kpw = await passKey(pass, salt, ITER);
    const data: Mem = {};
    LS.keys().filter((k) => !RESERVED.has(k)).forEach((k) => { try { data[k] = JSON.parse(LS.get(k) as string); } catch { /* */ } LS.del(k); });
    vkey = await dataKey(raw);
    const v: VaultRec = { v: 2, kdf: 'PBKDF2-SHA256', iter: ITER, salt: toB64(salt), wpw: await sealBytes(kpw, raw), data: await sealObj(vkey, data) };
    LS.set('vault', JSON.stringify(v));
    raw.fill(0);
    mem = data; persistent = true;
    LS.del('vaultFails');
    notify();
  },

  /* true = desbloqueado; false = senha incorreta; lança Error('espera') durante o bloqueio por tentativas */
  async unlock(pass) {
    if (Vault.waitMs() > 0) throw new Error('espera');
    const v = readVault();
    if (!v) return false;
    const raw = await dekFromPassword(v, pass);
    if (!raw) { registerFail(); return false; }
    vkey = await dataKey(raw); raw.fill(0);
    mem = await openObj(vkey, v.data); persistent = true;
    LS.del('vaultFails');
    notify();
    return true;
  },

  /* desbloqueio por digital / Face ID */
  async unlockBio() {
    const v = readVault();
    if (!v || !v.bio) throw new Error('sem-bio');
    const out = await prfAssert(v.bio.cred, fromB64(v.bio.prfSalt));
    const kb = await bioKey(out); out.fill(0);
    const raw = await openBytes(kb, v.bio.w);
    vkey = await dataKey(raw); raw.fill(0);
    mem = await openObj(vkey, v.data); persistent = true;
    LS.del('vaultFails');
    notify();
    return true;
  },

  /* ativa biometria: confirma a senha, cria a passkey e cifra a DEK com a chave PRF */
  async enableBio(pass) {
    const v = readVault();
    if (!v) return false;
    const raw = await dekFromPassword(v, pass);
    if (!raw) { registerFail(); return false; }
    const prfSalt = rand(32);
    const publicKey = {
      rp: { name: 'Plantão', id: location.hostname },
      user: { id: rand(16), name: 'plantao', displayName: 'Plantão — cofre local' },
      challenge: rand(32),
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'preferred', userVerification: 'required' },
      timeout: 60000,
      extensions: { prf: { eval: { first: prfSalt } } },
    } as unknown as PublicKeyCredentialCreationOptions;
    const cred = (await navigator.credentials.create({ publicKey })) as PkCred | null;
    if (!cred) { raw.fill(0); throw new Error('prf-indisponivel'); }
    const ext = cred.getClientExtensionResults().prf;
    if (!ext || ext.enabled === false) { raw.fill(0); throw new Error('prf-indisponivel'); }
    const credB64 = toB64(cred.rawId);
    /* alguns autenticadores só devolvem a saída PRF numa autenticação, não na criação */
    const out = ext.results && ext.results.first ? new Uint8Array(ext.results.first) : await prfAssert(credB64, prfSalt);
    const kb = await bioKey(out); out.fill(0);
    v.bio = { cred: credB64, prfSalt: toB64(prfSalt), w: await sealBytes(kb, raw) };
    raw.fill(0);
    LS.set('vault', JSON.stringify(v));
    notify();
    return true;
  },

  disableBio() { const v = readVault(); if (v && v.bio) { delete v.bio; LS.set('vault', JSON.stringify(v)); notify(); } },

  /* sessão sem salvar nada (calculadoras funcionam; nada vai para o disco) */
  temporary() { mem = {}; vkey = null; persistent = false; notify(); },

  async lock() {
    clearTimeout(saveT);
    try { await writeVault(); } catch { /* */ }
    mem = null; vkey = null; persistent = false;
    notify();
  },

  async flush() { clearTimeout(saveT); await writeVault(); },

  /* troca a senha: recifra só a DEK (dados e biometria não mudam) */
  async changePassword(oldPass, newPass) {
    if (String(newPass).length < Vault.MIN_LEN) throw new Error('curta');
    const v = readVault();
    if (!v) return false;
    const raw = await dekFromPassword(v, oldPass);
    if (!raw) { registerFail(); return false; }
    const salt = rand(16);
    const kpw = await passKey(newPass, salt, ITER);
    v.salt = toB64(salt); v.iter = ITER; v.kdf = 'PBKDF2-SHA256';
    v.wpw = await sealBytes(kpw, raw); raw.fill(0);
    LS.set('vault', JSON.stringify(v));
    return true;
  },

  /* apaga o cofre e qualquer dado do app neste aparelho (mantém só o tema) */
  wipe() {
    clearTimeout(saveT);
    LS.keys().filter((k) => k !== 'theme').forEach((k) => LS.del(k));
    mem = null; vkey = null; persistent = false;
    notify();
  },

  /* ---- passagem de sessão (o app usa para recarregar a si mesmo ao aplicar uma atualização) ----
     A DEK (CryptoKey não exportável) vai pelo IndexedDB, vale 60 s e é apagada ao ser lida,
     para não pedir a senha de novo. O JS nunca vê os bytes da chave. */
  async handoff() {
    if (!vkey || !persistent) return false;
    await Vault.flush();
    const key = vkey;
    await handoffDb('readwrite', (s) => s.put({ key, exp: Date.now() + 60000 }, 'dek'));
    return true;
  },
  async resume() {
    if (mem !== null) return true;
    let rec: HandoffRec | undefined;
    try { rec = (await handoffDb('readwrite', (s) => { const r = s.get('dek'); s.delete('dek'); return r; })) as HandoffRec | undefined; } catch { return false; }
    if (!rec || !rec.key || rec.exp < Date.now()) return false;
    const v = readVault();
    if (!v) return false;
    try { mem = await openObj(rec.key, v.data); } catch { return false; }
    vkey = rec.key; persistent = true;
    notify();
    return true;
  },
};

interface HandoffRec { key: CryptoKey; exp: number }

function handoffDb(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | undefined): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('sem-idb')); return; }
    const open = indexedDB.open('plantao-handoff', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('k');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('k', mode);
      const req = fn(tx.objectStore('k'));
      tx.oncomplete = () => { db.close(); resolve(req && req.result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}
