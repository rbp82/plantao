/* Plantão — núcleo: utilidades, componentes, paciente, infusões, registro de ferramentas */
(function () {
  'use strict';

  const C = (window.Calc = { tools: [], groups: {} });

  /* ---------- utilidades ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  C.$ = $; C.$$ = $$;

  /* converte texto digitado em número, no padrão brasileiro:
     "1,5" → 1,5 · "1.000" → 1000 · "1.000,5" → 1000,5 · "7.25" → 7,25 (ponto como decimal quando não é milhar) */
  C.num = function (v) {
    if (v === null || v === undefined) return NaN;
    if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
    let s = String(v).trim().replace(/\s/g, '');
    if (s === '') return NaN;
    const hasDot = s.includes('.'), hasComma = s.includes(',');
    if (hasDot && hasComma) {
      if (!/^-?\d{1,3}(\.\d{3})+,\d+$/.test(s)) return NaN;
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
      if ((s.match(/,/g) || []).length > 1) return NaN;
      s = s.replace(',', '.');
    } else if (hasDot) {
      if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
      else if ((s.match(/\./g) || []).length > 1) return NaN;
    }
    if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };
  /* lê um campo respeitando limites de plausibilidade (data-min / data-max) */
  C.read = function (el) {
    if (!el) return NaN;
    const n = C.num(el.value);
    if (!Number.isFinite(n)) return NaN;
    const mn = el.dataset && el.dataset.min !== undefined ? Number(el.dataset.min) : -Infinity;
    const mx = el.dataset && el.dataset.max !== undefined ? Number(el.dataset.max) : Infinity;
    return n < mn || n > mx ? NaN : n;
  };
  /* marca visualmente valores implausíveis ou ilegíveis */
  C.validate = function (el) {
    if (!el || el.tagName !== 'INPUT' || el.type !== 'text') return;
    const box = el.closest('.fld') || el.closest('.fld-box');
    if (!box) return;
    const raw = el.value.trim();
    const n = C.num(raw);
    let msg = '';
    if (raw !== '' && !Number.isFinite(n)) msg = 'Número inválido';
    else if (raw !== '' && el.dataset.min !== undefined && (n < Number(el.dataset.min) || n > Number(el.dataset.max)))
      msg = `Fora do plausível (${String(el.dataset.min).replace('.', ',')}–${String(el.dataset.max).replace('.', ',')})`;
    box.classList.toggle('bad', !!msg);
    let w = box.querySelector('.fld-w');
    if (msg) {
      if (!w) { w = document.createElement('span'); w.className = 'fld-w'; (box.classList.contains('fld') ? box : box.parentElement).appendChild(w); }
      w.textContent = msg;
    } else if (w) w.remove();
  };
  C.ok = (...xs) => xs.every((x) => Number.isFinite(x));
  C.fmt = function (n, d = 1) {
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  /* casas decimais adaptativas para doses */
  C.fmtDose = function (v) {
    if (!Number.isFinite(v)) return '—';
    const a = Math.abs(v);
    const d = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : a >= 0.01 ? 3 : 4;
    return C.fmt(v, d);
  };
  C.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  C.norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  /* ---------- armazenamento: cofre criptografado no aparelho ----------
     Tudo o que o app guarda (dados do paciente, diluições, favoritos, recentes, preferências)
     fica num único bloco cifrado com AES-256-GCM. A chave é derivada da senha com PBKDF2-SHA256
     (600 000 iterações, sal aleatório de 16 bytes), não é exportável e só existe na memória
     enquanto o app está desbloqueado. Só o tema fica em texto claro (aplicado antes do login). */
  const LS = {
    get(k) { try { return localStorage.getItem('plantao:' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('plantao:' + k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem('plantao:' + k); } catch (e) { /* */ } },
    keys() { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('plantao:')) out.push(k.slice(8)); } } catch (e) { /* */ } return out; },
  };
  const PLAIN = new Set(['theme']);
  const RESERVED = new Set(['theme', 'vault', 'vaultFails']);
  let mem = null;          /* dados decifrados (null = bloqueado) */
  let vkey = null;         /* CryptoKey AES-GCM, não exportável */
  let persistent = false;  /* false = modo temporário (nada é gravado) */
  let saveT = null;

  const store = {
    get(k, d) {
      if (PLAIN.has(k)) { const v = LS.get(k); try { return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
      return mem && Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : d;
    },
    set(k, v) {
      if (PLAIN.has(k)) { LS.set(k, JSON.stringify(v)); return; }
      if (!mem) return;
      mem[k] = v; scheduleSave();
    },
    del(k) {
      if (PLAIN.has(k)) { LS.del(k); return; }
      if (!mem) return;
      delete mem[k]; scheduleSave();
    },
  };
  C.store = store;

  /* Estrutura do cofre (localStorage 'plantao:vault'):
     { v: 2, kdf, iter, salt,            ← PBKDF2 da senha
       wpw:  {iv, ct},                   ← chave de dados (DEK, 32 bytes) cifrada pela chave da senha
       data: {iv, ct},                   ← dados do app cifrados pela DEK
       bio:  { cred, prfSalt, w:{iv,ct} } ← opcional: DEK cifrada pela chave da biometria (passkey + PRF) }
     Trocar a senha só recifra 'wpw'; a biometria continua válida. */
  const ITER = 600000;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const toB64 = (buf) => { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); };
  const fromB64 = (s) => { const t = atob(s); const b = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) b[i] = t.charCodeAt(i); return b; };
  const rand = (n) => crypto.getRandomValues(new Uint8Array(n));

  async function passKey(pass, salt, iter) {
    const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  /* saída PRF (32 bytes do autenticador) → HKDF-SHA256 → chave AES-GCM */
  async function bioKey(prfOut) {
    const base = await crypto.subtle.importKey('raw', prfOut, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: enc.encode('plantao-vault-bio-v1') }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  const dataKey = (raw) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  async function sealBytes(key, bytes) {
    const iv = rand(12);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
    return { iv: toB64(iv), ct: toB64(ct) };
  }
  async function openBytes(key, blob) {
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(blob.iv) }, key, fromB64(blob.ct)));
  }
  const sealObj = (key, obj) => sealBytes(key, enc.encode(JSON.stringify(obj)));
  const openObj = async (key, blob) => JSON.parse(dec.decode(await openBytes(key, blob)));

  function readVault() { try { return JSON.parse(LS.get('vault')); } catch (e) { return null; } }
  async function writeVault() {
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
  async function dekFromPassword(v, pass) {
    const k = await passKey(pass, fromB64(v.salt), v.iter);
    try { return await openBytes(k, v.wpw); } catch (e) { return null; }
  }

  /* tentativas de senha erradas: espera crescente a partir da 5ª (30 s, 60 s, 120 s… até 15 min) */
  function fails() { try { return JSON.parse(LS.get('vaultFails')) || { n: 0, until: 0 }; } catch (e) { return { n: 0, until: 0 }; } }
  function registerFail() {
    const f = fails(); f.n += 1;
    f.until = f.n >= 5 ? Date.now() + Math.min(30000 * Math.pow(2, f.n - 5), 15 * 60000) : 0;
    LS.set('vaultFails', JSON.stringify(f));
  }

  /* ---- WebAuthn / passkey com extensão PRF ---- */
  async function prfAssert(credB64, prfSalt) {
    const cred = await navigator.credentials.get({ publicKey: {
      challenge: rand(32), rpId: location.hostname, userVerification: 'required', timeout: 60000,
      allowCredentials: [{ type: 'public-key', id: fromB64(credB64) }],
      extensions: { prf: { eval: { first: prfSalt } } },
    } });
    const r = cred && cred.getClientExtensionResults().prf;
    if (!r || !r.results || !r.results.first) throw new Error('prf-indisponivel');
    return new Uint8Array(r.results.first);
  }

  C.Vault = {
    MIN_LEN: 6,
    supported: () => !!(window.isSecureContext && window.crypto && crypto.subtle),
    exists: () => !!readVault(),
    isOpen: () => mem !== null,
    isTemp: () => mem !== null && !persistent,
    waitMs: () => Math.max(0, fails().until - Date.now()),
    hasBio: () => { const v = readVault(); return !!(v && v.bio); },

    /* biometria disponível neste aparelho/navegador? (autenticador de plataforma + PRF) */
    async bioAvailable() {
      if (!C.Vault.supported() || !window.PublicKeyCredential) return false;
      try {
        if (PublicKeyCredential.getClientCapabilities) {
          const caps = await PublicKeyCredential.getClientCapabilities();
          if (caps && caps['extension:prf'] === false) return false;
        }
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch (e) { return false; }
    },

    /* cria o cofre; migra e apaga dados antigos em texto claro */
    async create(pass) {
      if (String(pass).length < C.Vault.MIN_LEN) throw new Error('curta');
      const raw = rand(32);
      const salt = rand(16);
      const kpw = await passKey(pass, salt, ITER);
      const data = {};
      LS.keys().filter((k) => !RESERVED.has(k)).forEach((k) => { try { data[k] = JSON.parse(LS.get(k)); } catch (e) { /* */ } LS.del(k); });
      vkey = await dataKey(raw);
      const v = { v: 2, kdf: 'PBKDF2-SHA256', iter: ITER, salt: toB64(salt), wpw: await sealBytes(kpw, raw), data: await sealObj(vkey, data) };
      LS.set('vault', JSON.stringify(v));
      raw.fill(0);
      mem = data; persistent = true;
      LS.del('vaultFails');
    },

    /* true = desbloqueado; false = senha incorreta; lança Error('espera') durante o bloqueio por tentativas */
    async unlock(pass) {
      if (C.Vault.waitMs() > 0) throw new Error('espera');
      const v = readVault();
      if (!v) return false;
      const raw = await dekFromPassword(v, pass);
      if (!raw) { registerFail(); return false; }
      vkey = await dataKey(raw); raw.fill(0);
      mem = await openObj(vkey, v.data); persistent = true;
      LS.del('vaultFails');
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
      return true;
    },

    /* ativa biometria: confirma a senha, cria a passkey e cifra a DEK com a chave PRF */
    async enableBio(pass) {
      const v = readVault();
      const raw = await dekFromPassword(v, pass);
      if (!raw) { registerFail(); return false; }
      const prfSalt = rand(32);
      const cred = await navigator.credentials.create({ publicKey: {
        rp: { name: 'Plantão', id: location.hostname },
        user: { id: rand(16), name: 'plantao', displayName: 'Plantão — cofre local' },
        challenge: rand(32),
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'preferred', userVerification: 'required' },
        timeout: 60000,
        extensions: { prf: { eval: { first: prfSalt } } },
      } });
      const ext = cred.getClientExtensionResults().prf;
      if (!ext || ext.enabled === false) { raw.fill(0); throw new Error('prf-indisponivel'); }
      const credB64 = toB64(cred.rawId);
      /* alguns autenticadores só devolvem a saída PRF numa autenticação, não na criação */
      let out = ext.results && ext.results.first ? new Uint8Array(ext.results.first) : await prfAssert(credB64, prfSalt);
      const kb = await bioKey(out); out.fill(0);
      v.bio = { cred: credB64, prfSalt: toB64(prfSalt), w: await sealBytes(kb, raw) };
      raw.fill(0);
      LS.set('vault', JSON.stringify(v));
      return true;
    },

    disableBio() { const v = readVault(); if (v && v.bio) { delete v.bio; LS.set('vault', JSON.stringify(v)); } },

    /* sessão sem salvar nada (calculadoras funcionam; nada vai para o disco) */
    temporary() { mem = {}; vkey = null; persistent = false; },

    async lock() {
      clearTimeout(saveT);
      try { await writeVault(); } catch (e) { /* */ }
      mem = null; vkey = null; persistent = false;
    },

    async flush() { clearTimeout(saveT); await writeVault(); },

    /* troca a senha: recifra só a DEK (dados e biometria não mudam) */
    async changePassword(oldPass, newPass) {
      if (String(newPass).length < C.Vault.MIN_LEN) throw new Error('curta');
      const v = readVault();
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
    },

    /* ---- passagem de sessão entre o app novo (../) e o legado (legado/) ----
       A DEK (CryptoKey não exportável) vai pelo IndexedDB, vale 60 s e é apagada ao ser lida,
       para não pedir a senha a cada troca de tela entre os dois apps. O JS nunca vê os bytes da chave. */
    async handoff() {
      if (!vkey || !persistent) return false;
      await C.Vault.flush();
      await handoffDb('readwrite', (s) => s.put({ key: vkey, exp: Date.now() + 60000 }, 'dek'));
      return true;
    },
    async resume() {
      if (mem !== null) return true;
      let rec;
      try { rec = await handoffDb('readwrite', (s) => { const r = s.get('dek'); s.delete('dek'); return r; }); } catch (e) { return false; }
      if (!rec || !rec.key || rec.exp < Date.now()) return false;
      const v = readVault();
      if (!v) return false;
      try { mem = await openObj(rec.key, v.data); } catch (e) { return false; }
      vkey = rec.key; persistent = true;
      return true;
    },
    /* navega para o outro app levando a sessão */
    async go(url) {
      try { await C.Vault.handoff(); } catch (e) { /* sem IndexedDB: o outro app pede a senha */ }
      location.href = url;
    },
  };
  function handoffDb(mode, fn) {
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

  /* ---------- ícones ---------- */
  const I = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/></svg>',
    starOn: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    finger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M7.5 5.5A7 7 0 0 1 19 11v1.5"/><path d="M5 9a7 7 0 0 0-.5 2.6c0 2 .4 3.9 1.2 5.6"/><path d="M9 18.8a12 12 0 0 1-1.5-6.3 4.5 4.5 0 0 1 9 0v1"/><path d="M12 12.5c0 3 .7 5.7 2 7.8"/><path d="M16.4 16.3c-.1 1.3-.2 2.5-.6 3.7"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><path d="M16.75 13.5v6.5M13.5 16.75H20"/></svg>',
    beds: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18V6M3 14h18v4M21 14v-2.5a3 3 0 0 0-3-3h-7v5.5"/><circle cx="7" cy="10.5" r="2"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="M12 4 21 19H3z"/><path d="M12 10v4M12 16.5v.5"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/><path d="M3.5 12.5h4l1.5-3 3 6 1.5-3h7"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.8" r="3.4"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M5 17l4.5-4.5 3 3 2.5-2.5L20 18"/></svg>',
    rotate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12a7 7 0 1 1-2.1-5"/><path d="M19 4v4h-4"/></svg>',
    down: '<svg class="chev"viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  };
  C.icon = I;

  /* ---------- componentes (strings HTML) ---------- */
  let uid = 0;
  C.uid = (p = 'f') => p + (++uid);

  /* campo numérico. o: {id, label, unit, ph, hint, p (chave do paciente), opt, cls, lim:[min,max]} */
  C.field = function (o) {
    const id = o.id || C.uid();
    const lim = o.lim || (o.p && C.LIM[o.p]);
    return `<label class="fld ${o.cls || ''}" for="${id}">
      <span class="fld-l">${o.label}${o.opt ? ' <span class="opt">(opcional)</span>' : ''}</span>
      <span class="fld-box ${o.unit ? 'has-u' : ''}">
        <input id="${id}" type="text" inputmode="decimal" autocomplete="off" autocorrect="off" spellcheck="false"
          enterkeyhint="next" ${o.p ? `data-p="${o.p}"` : ''} ${lim ? `data-min="${lim[0]}" data-max="${lim[1]}"` : ''} placeholder="${o.ph || ''}" ${o.value !== undefined ? `value="${o.value}"` : ''}>
        ${o.unit ? `<span class="u">${o.unit}</span>` : ''}
      </span>
      ${o.hint ? `<span class="fld-h">${o.hint}</span>` : ''}
    </label>`;
  };

  /* grupo segmentado (radio). o: {name, label, options:[[v,label,small?]], value, cls, p} */
  C.seg = function (o) {
    const name = o.name || C.uid('s');
    const opts = o.options.map(([v, l, s]) => {
      const id = C.uid('o');
      return `<input type="radio" name="${name}" id="${id}" value="${v}" ${String(v) === String(o.value) ? 'checked' : ''} ${o.p ? `data-p="${o.p}"` : ''}><label for="${id}">${l}${s ? `<small>${s}</small>` : ''}</label>`;
    }).join('');
    return `<div class="fld">${o.label ? `<span class="fld-l">${o.label}</span>` : ''}<div class="seg ${o.cls || ''}" role="radiogroup">${opts}</div></div>`;
  };

  C.tabs = function (name, options, value) {
    return `<div class="tabs" role="tablist">${options.map(([v, l]) => {
      const id = C.uid('t');
      return `<input type="radio" name="${name}" id="${id}" value="${v}" ${v === value ? 'checked' : ''}><label for="${id}">${l}</label>`;
    }).join('')}</div>`;
  };

  /* linha de checagem. o: {id, label, sub} */
  C.check = function (o) {
    const id = o.id || C.uid('c');
    return `<label class="chk" for="${id}"><input type="checkbox" id="${id}" ${o.checked ? 'checked' : ''}><span class="box">${I.check}</span><span class="t">${o.label}${o.sub ? `<small>${o.sub}</small>` : ''}</span></label>`;
  };

  /* limites de plausibilidade dos dados do paciente (adulto) */
  C.LIM = { peso: [20, 350], idade: [18, 120], altura: [120, 230], cr: [0.1, 25] };
  C.peso = (root) => C.read(root.querySelector('[data-p="peso"]'));
  C.radioVal = (root, name) => { const el = root.querySelector(`input[name="${name}"]:checked`); return el ? el.value : null; };
  C.val = (root, id) => C.read(root.querySelector('#' + id));
  C.checked = (root, id) => !!(root.querySelector('#' + id) || {}).checked;

  /* faixa terapêutica */
  C.rangeTag = function (v, lo, hi) {
    const r = C.rangeLbl(lo, hi);
    v = Math.round(v * 1e9) / 1e9; /* evita 0,04000000001 > 0,04 */
    if (v < lo) return { cls: 'warn', txt: `Abaixo da faixa (${r})` };
    if (v > hi) return { cls: 'crit', txt: `Acima da faixa (${r})` };
    return { cls: 'ok', txt: `Na faixa (${r})` };
  };
  C.rangeLbl = (lo, hi, unit) => `${String(lo).replace('.', ',')}–${String(hi).replace('.', ',')}${unit ? ' ' + unit : ''}`;
  /* FiO₂ digitada em % (21–100) ou fração (0,21–1) → fração; fora disso NaN */
  C.fio2 = (v) => (!Number.isFinite(v) ? NaN : v <= 1 ? (v >= 0.21 ? v : NaN) : v >= 21 && v <= 100 ? v / 100 : NaN);
  /* PaO₂/FiO₂ — faixas de Berlim (ARDS Definition Task Force, JAMA 2012) */
  C.berlin = (pf) => (pf > 300 ? ['ok', 'Sem critério de SDRA (> 300)']
    : pf > 200 ? ['warn', 'Faixa de SDRA leve (201–300)']
    : pf > 100 ? ['crit', 'Faixa de SDRA moderada (101–200)']
    : ['crit', 'Faixa de SDRA grave (≤ 100)']);
  /* número sem zeros à direita (até 3 casas) */
  C.fmtN = (n) => (Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 3 }) : '—');

  C.out = function (o) {
    return `<div class="out idle ${o.cls || ''}" id="${o.id}"><div class="o-l">${o.label}</div><div class="o-v ${o.sm ? 'sm' : ''}">—</div><div class="o-s"></div><div class="o-n">${o.note || ''}</div></div>`;
  };
  /* atualiza readout. st: 'ok'|'warn'|'crit'|'info'|'violet'|'' */
  C.setOut = function (root, id, value, unit, st, status, note) {
    const el = root.querySelector('#' + id);
    if (!el) return;
    const has = value !== null && value !== undefined && value !== '—' && value !== '';
    el.className = 'out ' + (has ? (st || '') : 'idle') + (el.classList.contains('span2') ? ' span2' : '');
    el.querySelector('.o-v').innerHTML = has ? `${value}${unit ? `<span class="u">${unit}</span>` : ''}` : '—';
    el.querySelector('.o-s').innerHTML = has ? (status || '') : '';
    if (note !== undefined) el.querySelector('.o-n').innerHTML = note;
  };

  C.verdict = (cls, kicker, title, desc) => `<div class="verdict ${cls}"><div class="v-k">${kicker}</div><div class="v-t">${title}</div>${desc ? `<div class="v-d">${desc}</div>` : ''}</div>`;
  C.note = (cls, html) => `<div class="note ${cls}">${html}</div>`;
  C.steps = (items) => `<ul class="steps">${items.filter(Boolean).map(([c, t]) => `<li class="${c || ''}">${t}</li>`).join('')}</ul>`;
  C.card = (title, inner, aux) => `<section class="card">${title ? `<div class="card-h"><h2>${title}</h2>${aux ? `<span class="aux">${aux}</span>` : ''}</div>` : ''}${inner}</section>`;
  C.lbl = (t, cls) => `<span class="lbl ${cls || ''}">${t}</span>`;

  /* ---------- pacientes ----------
     Lista de pacientes identificados por iniciais, leito ou nº de atendimento (à escolha).
     Os dados clínicos (peso, idade, sexo, altura, creatinina) ficam no paciente ativo e
     alimentam todas as calculadoras. Sem paciente selecionado, usa-se um registro "avulso"
     que expira em 12 h. Tudo fica dentro do cofre criptografado. */
  const PT_TTL = 12 * 3600 * 1000;
  const PT_TYPES = { ini: 'Iniciais', leito: 'Leito', atd: 'Atendimento' };
  const Patients = {
    TYPES: PT_TYPES,
    list() { return store.get('patients', []); },
    save(list) { store.set('patients', list); },
    get(id) { return this.list().find((p) => p.id === id) || null; },
    active() { const id = store.get('activePatient', null); return id ? this.get(id) : null; },
    setActive(id) { store.set('activePatient', id || null); },
    find(tipo, label) { const n = C.norm(label).replace(/\s+/g, ''); return this.list().find((p) => p.tipo === tipo && C.norm(p.label).replace(/\s+/g, '') === n) || null; },
    add(tipo, label) {
      const now = Date.now();
      const p = { id: now.toString(36) + Math.random().toString(36).slice(2, 7), tipo, label: String(label).trim().slice(0, 24), data: {}, created: now, updated: now };
      const list = this.list(); list.push(p); this.save(list); this.setActive(p.id);
      return p;
    },
    remove(id) {
      this.save(this.list().filter((p) => p.id !== id));
      if (store.get('activePatient', null) === id) this.setActive(null);
    },
    /* rótulo curto: "Leito 12", "J.S.", "Atend. 123456" */
    name(p) {
      if (!p) return 'Avulso';
      const base = p.tipo === 'ini' ? p.label.toUpperCase() : p.tipo === 'leito' ? 'Leito ' + p.label : 'Atend. ' + p.label;
      const ini = p.tipo !== 'ini' && p.ficha && p.ficha.ini ? ' · ' + p.ficha.ini.toUpperCase() : '';
      return base + ini;
    },
    /* grava alterações feitas no objeto do paciente (ficha, registros) */
    touch(p) { if (p) p.updated = Date.now(); this.save(this.list()); },
  };
  C.Patients = Patients;

  const Patient = {
    data() {
      const a = Patients.active();
      if (a) return a.data || {};
      const d = store.get('patient', null);
      if (!d || !d.t || Date.now() - d.t > PT_TTL) return {};
      return d.v || {};
    },
    get(k) { return this.data()[k]; },
    set(k, v) {
      const a = Patients.active();
      if (a) {
        const list = Patients.list();
        const p = list.find((x) => x.id === a.id);
        p.data = p.data || {};
        if (v === '' || v === null || v === undefined) delete p.data[k]; else p.data[k] = v;
        p.updated = Date.now();
        Patients.save(list);
        return;
      }
      const cur = this.data();
      if (v === '' || v === null || v === undefined) delete cur[k]; else cur[k] = v;
      store.set('patient', { v: cur, t: Date.now() });
    },
    /* limpa os dados do avulso (pacientes da lista são removidos na tela de pacientes) */
    clear() { store.del('patient'); },
    summary(d) {
      d = d || this.data();
      const parts = [];
      if (d.peso) parts.push(d.peso + ' kg');
      if (d.idade) parts.push(d.idade + ' anos');
      if (d.sexo) parts.push(d.sexo === 'M' ? 'masc.' : 'fem.');
      if (d.altura) parts.push(d.altura + ' cm');
      if (d.cr) parts.push('Cr ' + d.cr);
      return parts.join(' · ');
    },
  };
  C.Patient = Patient;

  /* faixa fixa no topo das ferramentas que usam peso: paciente ativo + peso */
  C.patientStrip = function (toolId) {
    const a = Patients.active();
    return `<div class="pt-strip">
      <a class="pt-chip ${a ? 'on' : ''}" href="#/pacientes?volta=${toolId || ''}" aria-label="Paciente: ${C.esc(Patients.name(a))}. Trocar paciente">${I.user}<span>${C.esc(Patients.name(a))}</span></a>
      <span class="fld-box has-u"><input type="text" inputmode="decimal" autocomplete="off" data-p="peso" data-min="${C.LIM.peso[0]}" data-max="${C.LIM.peso[1]}" placeholder="peso" aria-label="Peso do paciente em kg" enterkeyhint="next"><span class="u">kg</span></span>
    </div>`;
  };
  C.bindPatient = function (root, onChange) {
    const d = Patient.data();
    $$('[data-p]', root).forEach((el) => {
      const k = el.dataset.p;
      if (el.type === 'radio') { el.checked = d[k] !== undefined && String(d[k]) === el.value; }
      else if (d[k] !== undefined) el.value = d[k];
    });
    const onPt = (e) => {
      const el = e.target;
      if (!el.dataset || !el.dataset.p) return;
      const k = el.dataset.p;
      const v = el.type === 'radio' ? el.value : el.value.trim();
      Patient.set(k, v);
      $$(`[data-p="${k}"]`, root).forEach((o) => { if (o !== el && o.type !== 'radio') o.value = v; });
    };
    root.addEventListener('input', onPt);
    root.addEventListener('change', onPt);

  };

  /* ---------- função renal (funções puras, cobertas por testes) ---------- */
  C.renal = {
    /* peso ideal de Devine: 50 (H) / 45,5 (M) + 2,3 kg por polegada acima de 152,4 cm */
    ibw: (sex, ht) => (sex === 'M' ? 50 : 45.5) + 2.3 * ((ht - 152.4) / 2.54),
    /* peso para Cockcroft-Gault: real se ≤ ideal; ideal se até 130% do ideal; ajustado (ideal + 0,4 × excesso) acima disso */
    cgWeight(wt, ht, sex) {
      if (!Number.isFinite(wt)) return { kg: NaN, label: '' };
      if (!(ht > 0) || !sex) return { kg: wt, label: 'peso real — informe a altura para usar peso ideal/ajustado' };
      const ibw = C.renal.ibw(sex, ht);
      if (wt <= ibw) return { kg: wt, label: `peso real ${C.fmtN(Math.round(wt * 10) / 10)} kg (≤ ideal)` };
      if (wt <= 1.3 * ibw) return { kg: ibw, label: `peso ideal ${C.fmt(ibw, 1)} kg` };
      const adj = ibw + 0.4 * (wt - ibw);
      return { kg: adj, label: `peso ajustado ${C.fmt(adj, 1)} kg (real > 130% do ideal)` };
    },
    /* Cockcroft DW, Gault MH. Nephron 1976 */
    cockcroft(age, kg, cr, sex) {
      if (!C.ok(age, kg, cr) || !sex || cr <= 0) return NaN;
      return Math.max(((140 - age) * kg) / (72 * cr) * (sex === 'F' ? 0.85 : 1), 0);
    },
    /* CKD-EPI 2021 sem raça — Inker LA et al. NEJM 2021;385:1737 */
    ckdepi(age, cr, sex) {
      if (!C.ok(age, cr) || !sex || cr <= 0) return NaN;
      const k = sex === 'F' ? 0.7 : 0.9, a = sex === 'F' ? -0.241 : -0.302, r = cr / k;
      return 142 * Math.pow(Math.min(r, 1), a) * Math.pow(Math.max(r, 1), -1.2) * Math.pow(0.9938, age) * (sex === 'F' ? 1.012 : 1);
    },
  };

  /* ---------- infusões contínuas ---------- */
  const BASE = { mcg: 1, mg: 1000, g: 1e6, UI: 1, mUI: 0.001 };
  function parseUnit(u) {
    const p = u.split('/');
    return { n: p[0], kg: p.length === 3, t: p[p.length - 1] };
  }
  /* taxa base por minuto (mcg/min ou UI/min) -> unidade */
  function toUnit(basePerMin, unit, peso) {
    const u = parseUnit(unit);
    let v = basePerMin / BASE[u.n] * (u.t === 'h' ? 60 : 1);
    if (u.kg) v = v / peso;
    return v;
  }
  function fromUnit(dose, unit, peso) {
    const u = parseUnit(unit);
    let v = dose * BASE[u.n] / (u.t === 'h' ? 60 : 1);
    if (u.kg) v = v * peso;
    return v;
  }
  C.infMath = { toUnit, fromUnit, BASE };

  /* drug: {id, name, sub, amt, amtU, vol, dose, range:[lo,hi], band(d)->{cls,txt}, alt:[units], note, locked, alerts(d,ctx)->[[cls,html]]} */
  C.infCard = function (d) {
    const dil = store.get('dil:' + d.id, null);
    const amt = d.locked || !dil ? d.amt : dil.amt;
    const vol = d.locked || !dil ? d.vol : dil.vol;
    const has = amt !== undefined && amt !== null && amt !== '';
    return `<section class="card inf" data-inf="${d.id}">
      <div class="inf-h">
        <div class="nm"><b>${d.name}</b><span>${d.sub || ''}</span></div>
        <button type="button" class="dil ${d.locked ? 'locked' : ''}" data-dil ${d.locked ? 'disabled' : ''} aria-label="Diluição">
          ${d.locked ? I.lock : I.edit}<span data-dil-lbl>${has ? `${C.fmtN(+amt)} ${d.amtU} / ${C.fmtN(+vol)} mL` : 'definir diluição'}</span>
        </button>
      </div>
      <div class="dil-edit" data-dil-edit ${has ? 'hidden' : ''}>
        ${C.field({ label: d.amtU + ' na solução', id: `${d.id}_amt`, unit: d.amtU, value: has ? amt : '', ph: d.ph || '', lim: [0.001, 1e6] })}
        ${C.field({ label: 'Volume total', id: `${d.id}_vol`, unit: 'mL', value: has ? vol : '', ph: '', lim: [1, 2000] })}
        ${d.amt !== undefined ? `<button type="button" class="btn sm" data-dil-reset>Padrão</button>` : '<span></span>'}
      </div>
      <div class="inf-b">
        <label class="fld" for="${d.id}_in">
          <span class="fld-l" data-in-lbl>Vazão</span>
          <span class="fld-box has-u"><input id="${d.id}_in" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" data-min="0" data-max="100000" placeholder="—"><span class="u" data-in-u>mL/h</span></span>
        </label>
        <div class="out idle" data-res><div class="o-l" data-res-lbl>Dose</div><div class="o-v">—</div><div class="o-s"></div><div class="o-n"></div></div>
      </div>
      <div class="inf-f" data-conc></div>
      ${d.note ? `<div class="inf-f">${d.note}</div>` : ''}
      <div data-alerts></div>
    </section>`;
  };

  /* liga cards de infusão. getPeso(), getMode() -> 'dose'|'rate' */
  C.bindInf = function (root, drugs, getPeso, getMode) {
    const byId = {}; drugs.forEach((d) => (byId[d.id] = d));

    function calcCard(card) {
      const d = byId[card.dataset.inf];
      const mode = getMode();
      const peso = getPeso();
      const amt = C.val(card, d.id + '_amt');
      const vol = C.val(card, d.id + '_vol');
      const inp = C.val(card, d.id + '_in');
      const res = card.querySelector('[data-res]');
      const resV = res.querySelector('.o-v'), resS = res.querySelector('.o-s'), resN = res.querySelector('.o-n');
      const unitU = parseUnit(d.dose);
      const needsKg = unitU.kg;

      card.querySelector('[data-in-lbl]').textContent = mode === 'dose' ? 'Vazão na bomba' : 'Dose desejada';
      card.querySelector('[data-in-u]').textContent = mode === 'dose' ? 'mL/h' : d.dose;
      card.querySelector('[data-res-lbl]').textContent = mode === 'dose' ? 'Dose' : 'Programar bomba';
      const inEl = card.querySelector('#' + d.id + '_in');
      inEl.style.paddingRight = ((mode === 'dose' ? 4 : d.dose.length) * 7.4 + 22) + 'px';

      const conc = C.ok(amt, vol) && vol > 0 ? amt * BASE[d.amtU] / vol : NaN; // base/mL
      const lbl = card.querySelector('[data-dil-lbl]');
      lbl.textContent = C.ok(amt, vol) ? `${C.fmtN(amt)} ${d.amtU} / ${C.fmtN(vol)} mL` : 'definir diluição';
      const concU = d.amtU === 'UI' ? 'UI/mL' : (conc >= 1000 ? 'mg/mL' : 'mcg/mL');
      const concV = d.amtU === 'UI' ? conc : (conc >= 1000 ? conc / 1000 : conc);
      card.querySelector('[data-conc]').innerHTML = Number.isFinite(conc) ? `Concentração <b class="num">${C.fmtN(concV)} ${concU}</b>` : '<span style="color:var(--warn)">Defina a diluição (toque no rótulo tracejado)</span>';

      const alertsEl = card.querySelector('[data-alerts]');
      const idle = (msg) => { res.className = 'out idle'; resV.innerHTML = '—'; resS.textContent = ''; resN.textContent = msg || ''; alertsEl.innerHTML = ''; };

      if (!Number.isFinite(conc) || !Number.isFinite(inp) || inp <= 0) return idle('');
      if (needsKg && !(peso > 0)) return idle('Informe o peso');

      let dose, mlh;
      if (mode === 'dose') {
        mlh = inp;
        const basePerMin = conc * mlh / 60;
        dose = toUnit(basePerMin, d.dose, peso);
        resV.innerHTML = `${C.fmtDose(dose)}<span class="u">${d.dose}</span>`;
        const alt = (d.alt || []).filter((u) => !parseUnit(u).kg || peso > 0).map((u) => `${C.fmtDose(toUnit(basePerMin, u, peso))} ${u}`);
        resN.innerHTML = alt.join(' · ');
      } else {
        dose = inp;
        const basePerMin = fromUnit(dose, d.dose, peso);
        mlh = basePerMin * 60 / conc;
        resV.innerHTML = `${C.fmt(mlh, mlh >= 100 ? 0 : 1)}<span class="u">mL/h</span>`;
        const alt = (d.alt || []).filter((u) => !parseUnit(u).kg || peso > 0).map((u) => `${C.fmtDose(toUnit(basePerMin, u, peso))} ${u}`);
        resN.innerHTML = alt.join(' · ');
      }
      let tag = d.band ? d.band(dose) : (d.range ? C.rangeTag(dose, d.range[0], d.range[1], d.dose) : { cls: 'info', txt: '' });
      res.className = 'out ' + tag.cls;
      resS.textContent = tag.txt;
      const al = d.alerts ? d.alerts(dose, { mlh, peso, conc }) : [];
      alertsEl.innerHTML = al.map(([c, h]) => C.note(c, h)).join('');
    }

    function calcAll() { $$('[data-inf]', root).forEach(calcCard); }

    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-dil]');
      if (b) {
        const ed = b.closest('[data-inf]').querySelector('[data-dil-edit]');
        ed.hidden = !ed.hidden;
        if (!ed.hidden) ed.querySelector('input').focus();
        return;
      }
      const r = e.target.closest('[data-dil-reset]');
      if (r) {
        const card = r.closest('[data-inf]'); const d = byId[card.dataset.inf];
        card.querySelector('#' + d.id + '_amt').value = d.amt;
        card.querySelector('#' + d.id + '_vol').value = d.vol;
        store.del('dil:' + d.id);
        calcCard(card);
      }
    });
    root.addEventListener('input', (e) => {
      const card = e.target.closest('[data-inf]');
      if (!card) return;
      const d = byId[card.dataset.inf];
      if (e.target.id === d.id + '_amt' || e.target.id === d.id + '_vol') {
        const amt = C.val(card, d.id + '_amt'), vol = C.val(card, d.id + '_vol');
        if (C.ok(amt, vol) && (amt !== d.amt || vol !== d.vol)) store.set('dil:' + d.id, { amt, vol });
        else if (amt === d.amt && vol === d.vol) store.del('dil:' + d.id);
      }
      calcCard(card);
    });
    return calcAll;
  };

  /* resumo em texto das infusões preenchidas */
  C.infSummary = function (root, drugs, mode, peso) {
    const lines = [];
    $$('[data-inf]', root).forEach((card) => {
      const res = card.querySelector('[data-res]');
      if (!res || res.classList.contains('idle')) return;
      const d = drugs.find((x) => x.id === card.dataset.inf);
      if (!d) return;
      const inV = card.querySelector('#' + d.id + '_in').value.trim();
      const v = res.querySelector('.o-v').innerText.replace(/\s+/g, ' ').trim();
      const dil = card.querySelector('[data-dil-lbl]').textContent;
      lines.push(mode === 'dose' ? `${d.name} (${dil}): ${inV} mL/h = ${v}` : `${d.name} (${dil}): ${inV} ${d.dose} = ${v}`);
    });
    if (!lines.length) return '';
    return (peso > 0 ? `Peso ${C.fmtN(peso)} kg\n` : '') + lines.join('\n');
  };

  /* ---------- toast / cópia ---------- */
  let toastT;
  C.toast = function (msg) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1800);
  };
  C.copy = async function (text) {
    try { await navigator.clipboard.writeText(text); C.toast('Copiado para a área de transferência'); }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); C.toast('Copiado'); } catch (e2) { C.toast('Não foi possível copiar'); }
      ta.remove();
    }
  };

  /* ---------- registro ---------- */
  C.groups = {
    emerg: { name: 'Emergência', color: 'var(--crit)' },
    hemo: { name: 'Hemodinâmica e perfusão', color: 'var(--g-hemo)' },
    resp: { name: 'Ventilação e oxigenação', color: 'var(--g-resp)' },
    sed: { name: 'Sedação, analgesia e arritmia', color: 'var(--g-sed)' },
    inf: { name: 'Sepse e infecção', color: 'var(--g-inf)' },
    met: { name: 'Metabólico e ácido-base', color: 'var(--g-met)' },
    hema: { name: 'Hemostasia', color: 'var(--g-hema)' },
  };
  C.groupOrder = ['emerg', 'met', 'hemo', 'resp', 'inf', 'sed', 'hema'];
  /* true enquanto há algo que não pode ser interrompido pelo bloqueio automático (ex.: PCR em andamento) */
  C.isBusy = () => false;
  /* tool: {id, group, tile, title, sub, keywords, weight(bool), render(root, api)}
     ou {…, href: '#/rota'} para ferramentas que são telas próprias (ex.: gasometria com leitos) */
  C.register = (tool) => C.tools.push(tool);
  C.tool = (id) => C.tools.find((t) => t.id === id);
  C.toolHref = (t) => t.href || '#/' + t.id;

  /* telas além das ferramentas (leitos, paciente, ficha, gasometria): id → render(query) */
  C.routes = {};
  /* monta uma tela num elemento novo, para que os ouvintes de eventos morram com ela */
  C.mount = function (html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    document.getElementById('app').replaceChildren(d);
    return d;
  };

  /* identificação do paciente na lista: leito e iniciais podem coexistir (ficha) */
  C.ptBed = (p) => (!p ? '' : p.tipo === 'leito' ? p.label : (p.ficha && p.ficha.leito) || '');
  C.ptIni = (p) => (!p ? '' : (p.tipo === 'ini' ? p.label : (p.ficha && p.ficha.ini) || '').toUpperCase());
})();
