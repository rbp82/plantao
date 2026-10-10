/* Plantão — shell: login/cofre, rotas, tela inicial, pacientes, segurança, ferramentas, tema, PWA */
(function () {
  'use strict';
  const C = window.Calc;
  const { $, $$, icon: I, store, esc, Vault, Patients } = C;
  const app = $('#app');

  /* ---------- tema (único dado fora do cofre) ---------- */
  const THEMES = ['auto', 'dark', 'light'];
  function applyTheme(t) {
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0D0F0F' : '#F3F2EE');
  }
  let theme = store.get('theme', 'auto');
  applyTheme(theme);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(theme));
  const themeIcon = () => (theme === 'auto' ? I.auto : theme === 'dark' ? I.moon : I.sun);
  const themeLabel = () => ({ auto: 'Tema automático', dark: 'Tema escuro', light: 'Tema claro' }[theme]);

  /* ---------- favoritos / recentes ---------- */
  const favs = () => store.get('favs', []);
  const recents = () => store.get('recents', []);
  function pushRecent(id) {
    const r = recents().filter((x) => x !== id);
    r.unshift(id);
    store.set('recents', r.slice(0, 6));
  }

  const hashParts = () => {
    const h = location.hash.replace(/^#\/?/, '');
    const [id, qs] = h.split('?');
    return { id: id || '', q: new URLSearchParams(qs || '') };
  };
  const ago = (t) => {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'agora';
    if (m < 60) return `há ${m} min`;
    const h = Math.round(m / 60);
    if (h < 24) return `há ${h} h`;
    return `há ${Math.round(h / 24)} d`;
  };
  const pwField = (id, label, autocomplete, hint) => `
    <label class="fld" for="${id}">
      <span class="fld-l">${label}</span>
      <span class="fld-box pw">
        <input id="${id}" type="password" autocomplete="${autocomplete}" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go">
        <button type="button" class="pw-eye" data-eye="${id}" aria-label="Mostrar senha">mostrar</button>
      </span>
      ${hint ? `<span class="fld-h">${hint}</span>` : ''}
    </label>`;
  function bindEyes(root) {
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-eye]'); if (!b) return;
      const i = $('#' + b.dataset.eye, root);
      const show = i.type === 'password';
      i.type = show ? 'text' : 'password';
      b.textContent = show ? 'ocultar' : 'mostrar';
      b.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
    });
  }

  /* cada tela é montada num elemento novo, para que os ouvintes de eventos morram com ela */
  function mount(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    app.replaceChildren(d);
    return d;
  }

  /* =====================================================================
     LOGIN / COFRE
     ===================================================================== */
  function renderUnsupported() {
    const pg = mount(`<div class="lock"><div class="lock-card">
      <div class="lock-mark">${I.lock}</div>
      <h1 class="lock-title">Abra pelo endereço seguro</h1>
      <p class="lock-sub">A criptografia dos dados exige que o app seja aberto por um endereço <b>https://</b> (ou instalado a partir dele). Abrir o arquivo direto do computador não permite proteger os dados.</p>
    </div></div>`);
  }

  async function renderLock() {
    document.title = 'Plantão';
    const setup = !Vault.exists();
    const bio = !setup && Vault.hasBio();
    const pg = mount(`<div class="lock"><form class="lock-card" id="lockForm" novalidate>
      <div class="lock-mark">${I.lock}</div>
      <h1 class="lock-title">${setup ? 'Proteja seus dados' : 'Plantão'}</h1>
      <p class="lock-sub">${setup
        ? 'Pacientes, pesos, creatininas e preferências ficam <b>criptografados neste aparelho</b> (AES-256). Não há conta nem servidor: <b>a senha não pode ser recuperada</b>.'
        : 'Digite a senha para abrir os dados deste aparelho.'}</p>
      ${bio ? `<button type="button" class="btn primary block bio-btn" id="bioBtn">${I.finger} Entrar com digital / Face ID</button><div class="lock-or">ou com a senha</div>` : ''}
      ${setup
        ? pwField('pw1', 'Crie uma senha', 'new-password', `Mínimo de ${Vault.MIN_LEN} caracteres. Senhas só com números são mais fáceis de adivinhar.`) + '<div style="height:12px"></div>' + pwField('pw2', 'Repita a senha', 'new-password')
        : pwField('pw1', 'Senha', 'current-password')}
      <div class="lock-msg" id="lockMsg" role="alert"></div>
      <button type="submit" class="btn ${bio ? '' : 'primary'} block lock-go" id="lockGo">${setup ? 'Criar senha e entrar' : 'Entrar'}</button>
      <div class="lock-links">
        <button type="button" class="link" id="tempBtn">Usar sem salvar dados</button>
        ${setup ? '' : '<button type="button" class="link danger" id="forgotBtn">Esqueci a senha</button>'}
      </div>
    </form></div>`);
    bindEyes(pg);
    const msg = $('#lockMsg'), go = $('#lockGo'), pw1 = $('#pw1');
    const say = (t, cls) => { msg.textContent = t; msg.className = 'lock-msg ' + (cls || ''); };
    const busy = (on, t) => { go.disabled = on; go.textContent = on ? t : setup ? 'Criar senha e entrar' : 'Entrar'; };

    let waitT;
    const showWait = () => {
      clearInterval(waitT);
      const tick = () => {
        const ms = Vault.waitMs();
        if (ms <= 0) { clearInterval(waitT); say(''); go.disabled = false; return; }
        go.disabled = true; say(`Muitas tentativas. Aguarde ${Math.ceil(ms / 1000)} s.`, 'err');
      };
      tick(); waitT = setInterval(tick, 1000);
    };
    if (!setup && Vault.waitMs() > 0) showWait();

    $('#lockForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const p1 = pw1.value;
      if (setup) {
        const p2 = $('#pw2').value;
        if (p1.length < Vault.MIN_LEN) return say(`A senha precisa ter pelo menos ${Vault.MIN_LEN} caracteres.`, 'err');
        if (p1 !== p2) return say('As senhas não coincidem.', 'err');
        busy(true, 'Criando cofre…');
        try { await Vault.create(p1); } catch (err) { busy(false); return say('Não foi possível criar o cofre neste navegador.', 'err'); }
        afterUnlock(true);
      } else {
        if (!p1) return say('Digite a senha.', 'err');
        busy(true, 'Verificando…');
        try {
          const ok = await Vault.unlock(p1);
          if (ok) return afterUnlock(false);
          busy(false);
          pw1.value = ''; pw1.focus();
          if (Vault.waitMs() > 0) showWait(); else say('Senha incorreta.', 'err');
        } catch (err) { busy(false); showWait(); }
      }
    });
    if (bio) $('#bioBtn').addEventListener('click', async () => {
      say('');
      try { await Vault.unlockBio(); afterUnlock(false); }
      catch (err) { say(err && err.name === 'NotAllowedError' ? 'Leitura cancelada. Tente de novo ou use a senha.' : 'Não foi possível usar a biometria. Use a senha.', 'err'); }
    });
    $('#tempBtn').addEventListener('click', () => { Vault.temporary(); afterUnlock(false); });
    const fb = $('#forgotBtn');
    if (fb) fb.addEventListener('click', () => {
      if (fb.dataset.armed) { Vault.wipe(); C.toast('Dados apagados. Crie uma nova senha.'); renderLock(); return; }
      fb.dataset.armed = '1';
      fb.textContent = 'Toque de novo para APAGAR todos os dados';
      say('Sem a senha não há como recuperar os dados: só é possível apagar tudo e começar de novo.', 'err');
    });
    if (!bio) setTimeout(() => pw1.focus(), 50);
  }

  async function afterUnlock(justCreated) {
    touch();
    if (justCreated && await Vault.bioAvailable()) return renderBioOffer();
    route();
  }

  function renderBioOffer() {
    const pg = mount(`<div class="lock"><div class="lock-card">
      <div class="lock-mark">${I.finger}</div>
      <h1 class="lock-title">Entrar com digital ou Face ID?</h1>
      <p class="lock-sub">Nas próximas vezes você abre o app com a biometria do aparelho. A senha continua valendo como reserva. Dá para ativar ou desativar depois em <b>Segurança</b>.</p>
      <form id="bioForm" novalidate>${pwField('bioPw', 'Confirme a senha', 'current-password')}
        <div class="lock-msg" id="bioMsg" role="alert"></div>
        <button type="submit" class="btn primary block">${I.finger} Ativar biometria</button>
      </form>
      <div class="lock-links"><button type="button" class="link" id="bioSkip">Agora não</button></div>
    </div></div>`);
    bindEyes(pg);
    $('#bioSkip').addEventListener('click', () => { location.hash = '#/'; route(); });
    $('#bioForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const m = $('#bioMsg');
      try {
        const ok = await Vault.enableBio($('#bioPw').value);
        if (!ok) { m.textContent = 'Senha incorreta.'; m.className = 'lock-msg err'; return; }
        C.toast('Biometria ativada');
        location.hash = '#/'; route();
      } catch (err) {
        m.className = 'lock-msg err';
        m.textContent = err && err.message === 'prf-indisponivel'
          ? 'Este aparelho/navegador não oferece a biometria compatível com criptografia. Continue usando a senha.'
          : err && err.name === 'NotAllowedError' ? 'Cadastro cancelado.' : 'Não foi possível ativar a biometria.';
      }
    });
  }

  /* ---------- bloqueio automático ---------- */
  let lastActive = Date.now();
  const autolockMin = () => store.get('autolock', 10);
  function touch() { lastActive = Date.now(); }
  ['pointerdown', 'keydown', 'input'].forEach((ev) => window.addEventListener(ev, touch, { passive: true, capture: true }));
  async function lockNow(msg) {
    await Vault.lock();
    query = '';
    renderLock();
    if (msg) C.toast(msg);
  }
  function checkIdle() {
    if (C.isBusy()) { lastActive = Date.now(); return; } /* PCR em andamento: nunca bloquear */
    if (Vault.isOpen() && Date.now() - lastActive > autolockMin() * 60000) lockNow('Bloqueado por inatividade');
  }
  setInterval(checkIdle, 15000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') Vault.flush().catch(() => {});
    else checkIdle();
  });
  window.addEventListener('pagehide', () => { Vault.flush().catch(() => {}); });

  /* =====================================================================
     TELA INICIAL
     ===================================================================== */
  let query = '';
  const tile = (t) => `<span class="tile" style="--gc:${C.groups[t.group].color}">${t.tile}</span>`;
  const row = (t, hl) => `<a class="row" href="${C.toolHref(t)}">${tile(t)}<span class="row-t"><b>${t.title}</b><span>${hl || t.sub}</span></span>${I.chev}</a>`;
  const qcard = (t) => `<a class="qcard" href="${C.toolHref(t)}">${tile(t)}<b>${t.title}</b></a>`;

  function searchMatches(q) {
    const words = C.norm(q).split(/\s+/).filter(Boolean);
    return C.tools
      .map((t) => {
        const hay = C.norm([t.title, t.sub, t.tile, (t.keywords || []).join(' ')].join(' '));
        if (!words.every((w) => hay.includes(w))) return null;
        let score = 0;
        const title = C.norm(t.title + ' ' + t.tile);
        words.forEach((w) => { if (title.includes(w)) score += 3; if (title.startsWith(w)) score += 2; });
        const kw = (t.keywords || []).find((k) => words.some((w) => C.norm(k).includes(w)) && !C.norm(t.title + t.sub).includes(C.norm(k)));
        return { t, score, kw };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
  }

  function renderHome() {
    document.title = 'Plantão — calculadoras';
    const a = Patients.active();
    const sum = C.Patient.summary();
    const pg = mount(`
      <header class="home-head">
        <div class="brand">
          <h1 class="brand-name">Plantão</h1>
          <p class="brand-sub">Calculadoras de UTI e emergência</p>
        </div>
        <button class="icon-btn" id="lockBtn" aria-label="Bloquear agora" title="Bloquear agora">${I.lock}</button>
        <button class="icon-btn" id="themeBtn" aria-label="${themeLabel()}" title="${themeLabel()}">${themeIcon()}</button>
      </header>
      <div class="search">
        <div class="search-box">
          ${I.search}
          <input id="q" type="search" placeholder="Buscar: nora, cefepime, SOFA, sódio…" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="go" value="${esc(query)}" aria-label="Buscar calculadora">
          <button class="icon-btn clear" id="qClear" aria-label="Limpar busca" ${query ? '' : 'hidden'}>${I.x}</button>
        </div>
      </div>
      ${Vault.isTemp() ? '<div class="temp-note">Modo temporário — nada é salvo. Ao bloquear ou fechar, os dados somem.</div>' : ''}
      ${store.get('pcrAtiva', null)
        ? `<a class="pcr-cta live" href="#/pcr">${I.heart}<span><b>PCR em andamento</b><small>toque para voltar ao cronômetro</small></span>${I.chev}</a>`
        : `<a class="pcr-cta" href="#/pcr">${I.heart}<span><b>PCR — ACLS guiado</b><small>cronômetro, algoritmo e relatório</small></span>${I.chev}</a>`}
      <a class="pt-card" href="${a ? '#/paciente?id=' + a.id : '#/leitos'}">
        <span class="pt-ico">${I.user}</span>
        <span class="pt-t">${a ? `<b>${esc(Patients.name(a))}</b>` : '<b>Sem paciente selecionado</b>'}<small class="num">${esc(sum || (a ? 'sem dados ainda' : 'cálculos avulsos · toque para escolher um leito'))}</small></span>
        <span class="pt-act">${a ? 'Abrir' : 'Leitos'}</span>
      </a>
      <div id="installWrap" class="install" hidden><button class="btn block" id="installBtn">${I.download} Instalar no celular</button></div>
      <div id="homeBody"></div>
      <p class="foot"><a href="#/seguranca">Ajustes e segurança</a><br><br>Ferramenta de apoio à decisão. Não substitui o julgamento clínico nem os protocolos da instituição.<br>Funciona sem internet depois de aberta uma vez.</p>
    `);
    renderHomeBody();
    const q = $('#q');
    q.addEventListener('input', () => { query = q.value; $('#qClear').hidden = !query; renderHomeBody(); });
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const first = $('#homeBody a'); if (first && query) location.hash = first.getAttribute('href'); } });
    $('#qClear').addEventListener('click', () => { query = ''; q.value = ''; $('#qClear').hidden = true; renderHomeBody(); q.focus(); });
    $('#themeBtn').addEventListener('click', (e) => {
      theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
      store.set('theme', theme); applyTheme(theme);
      e.currentTarget.innerHTML = themeIcon();
      e.currentTarget.setAttribute('aria-label', themeLabel());
      C.toast(themeLabel());
    });
    $('#lockBtn').addEventListener('click', () => lockNow('Bloqueado'));
    showInstall();
  }

  function renderHomeBody() {
    const body = $('#homeBody');
    if (query.trim()) {
      const res = searchMatches(query);
      body.innerHTML = res.length
        ? `<div class="home-section"><div class="h-label">${res.length} resultado${res.length > 1 ? 's' : ''}</div><div class="list">${res.map((r) => row(r.t, r.kw ? `contém <mark>${esc(r.kw)}</mark>` : '')).join('')}</div></div>`
        : `<div class="empty">Nada encontrado para “${esc(query)}”.</div>`;
      return;
    }
    const f = favs().map(C.tool).filter(Boolean);
    const r = recents().filter((id) => !favs().includes(id)).map(C.tool).filter(Boolean).slice(0, 4);
    let html = '';
    if (f.length) html += `<div class="home-section"><div class="h-label">Fixadas</div><div class="quick">${f.map(qcard).join('')}</div></div>`;
    if (r.length) html += `<div class="home-section"><div class="h-label">Recentes</div><div class="quick">${r.map(qcard).join('')}</div></div>`;
    /* categorias em acordeão: só uma aberta por vez, para não despejar 25 itens de uma vez */
    const open = store.get('homeGroup', null);
    html += '<div class="home-section"><div class="h-label">Todas as calculadoras</div><div class="gacc">';
    C.groupOrder.forEach((g) => {
      const ts = C.tools.filter((t) => t.group === g);
      if (!ts.length || g === 'emerg') return; /* PCR já tem o botão vermelho no topo; a busca continua achando */
      html += `<details class="gacc-i" data-g="${g}" ${open === g ? 'open' : ''}>
        <summary style="--gc:${C.groups[g].color}"><i class="gdot"></i><b>${C.groups[g].name}</b><span class="gcount">${ts.length}</span>${I.down}</summary>
        <div class="list">${ts.map((t) => row(t)).join('')}</div></details>`;
    });
    html += '</div></div>';
    body.innerHTML = html;
    body.querySelectorAll('.gacc-i').forEach((d) => d.addEventListener('toggle', () => {
      if (d.open) {
        body.querySelectorAll('.gacc-i[open]').forEach((o) => { if (o !== d) o.open = false; });
        store.set('homeGroup', d.dataset.g);
      } else if (store.get('homeGroup', null) === d.dataset.g) store.set('homeGroup', null);
    }));
  }

  /* =====================================================================
     SEGURANÇA
     ===================================================================== */
  async function renderSecurity() {
    document.title = 'Ajustes — Plantão';
    const temp = Vault.isTemp();
    const bioOk = !temp && await Vault.bioAvailable();
    const hasBio = Vault.hasBio();
    const alName = C.uid('al'), luName = C.uid('lu');
    const gc = C.gasCfg();
    const pg = mount(`
      <header class="bar" id="bar">
        <a class="icon-btn" href="#/" aria-label="Voltar">${I.back}</a>
        <div class="bar-title"><span class="k">Preferências e cofre local</span><h1>Ajustes e segurança</h1></div>
      </header>
      <main class="tool">
        <section class="card">
          <div class="card-h"><h2>Gasometria</h2><span class="aux">vale para a gasometria e os leitos</span></div>
          ${C.seg({ name: luName, label: 'Unidade do lactato', cls: 'cols', value: gc.lacUnit, options: [['mmol', 'mmol/L'], ['mgdl', 'mg/dL']] })}
          <div class="grid" style="margin-top:12px">
            ${C.field({ id: 'gcPatm', label: 'Pressão barométrica', unit: 'mmHg', value: gc.patm, lim: [400, 800], hint: 'Para o gradiente A-a. Nível do mar 760.' })}
            ${C.field({ id: 'gcAlt', label: 'ou altitude da cidade', unit: 'm', ph: 'ex.: 1170', lim: [0, 5000], hint: 'Calcula a pressão.' })}
            ${C.field({ id: 'gcAg', label: 'Ânion gap de referência', unit: 'mEq/L', value: gc.agRef, lim: [4, 20], hint: 'AG alto acima de referência + 4.' })}
          </div>
        </section>
        <section class="card">
          <div class="card-h"><h2>Como os dados são protegidos</h2></div>
          <p style="margin:0;font-size:14.5px;color:var(--ink-2)">Pacientes, valores digitados, diluições e preferências ficam cifrados com <b>AES-256-GCM</b>. A chave vem da sua senha (PBKDF2-SHA256, 600 mil iterações) e só existe na memória enquanto o app está aberto. Nada é enviado para servidores. ${temp ? '<br><br><b>Você está no modo temporário:</b> nada está sendo salvo.' : ''}</p>
        </section>
        ${temp ? '' : `
        <section class="card">
          <div class="card-h"><h2>Bloqueio automático</h2></div>
          ${C.seg({ name: alName, cls: 'cols', value: autolockMin(), options: [[2, '2 min'], [5, '5 min'], [10, '10 min'], [30, '30 min']] })}
          <p class="fld-h" style="margin-top:8px">Sem uso por esse tempo, o app pede a senha de novo.</p>
        </section>
        <section class="card">
          <div class="card-h"><h2>Digital / Face ID</h2><span class="aux">${hasBio ? 'ativada' : bioOk ? 'disponível' : 'indisponível'}</span></div>
          ${hasBio
            ? `<p class="fld-h" style="margin:0 0 10px">A biometria abre o cofre neste aparelho. A senha continua valendo.</p><button type="button" class="btn block" id="bioOff">Desativar biometria</button>`
            : bioOk
              ? `<form id="bioOn" novalidate>${pwField('bioPw', 'Confirme a senha para ativar', 'current-password')}<div class="lock-msg" id="bioMsg" role="alert"></div><button type="submit" class="btn primary block">${I.finger} Ativar biometria</button></form>`
              : '<p class="fld-h" style="margin:0">Este aparelho/navegador não oferece biometria compatível com criptografia (requer Android com Chrome recente ou iPhone com iOS 18+, e o app aberto pelo endereço definitivo).</p>'}
        </section>
        <section class="card">
          <div class="card-h"><h2>Trocar senha</h2></div>
          <form id="pwForm" novalidate>
            ${pwField('pwOld', 'Senha atual', 'current-password')}
            <div style="height:12px"></div>
            ${pwField('pwNew', 'Nova senha', 'new-password', `Mínimo de ${Vault.MIN_LEN} caracteres.`)}
            <div style="height:12px"></div>
            ${pwField('pwNew2', 'Repita a nova senha', 'new-password')}
            <div class="lock-msg" id="pwMsg" role="alert"></div>
            <button type="submit" class="btn primary block">Trocar senha</button>
          </form>
        </section>`}
        <section class="card">
          <button type="button" class="btn block" id="lockNow">${I.lock} Bloquear agora</button>
          <div style="height:10px"></div>
          <button type="button" class="btn block danger" id="wipe">Apagar todos os dados deste aparelho</button>
          <p class="fld-h" style="margin-top:8px">Apaga pacientes, preferências e a senha. Não há como desfazer.</p>
        </section>
      </main>`);
    bindEyes(pg);
    const saveGc = (k, v) => { store.set('gasCfg', { ...C.gasCfg(), [k]: v }); };
    pg.addEventListener('change', (e) => { if (e.target.name === luName) { saveGc('lacUnit', e.target.value); C.toast('Lactato em ' + (e.target.value === 'mgdl' ? 'mg/dL' : 'mmol/L')); } });
    pg.addEventListener('input', (e) => {
      C.validate(e.target);
      const n = C.read(e.target);
      if (!Number.isFinite(n)) return;
      if (e.target.id === 'gcPatm') saveGc('patm', n);
      if (e.target.id === 'gcAg') saveGc('agRef', n);
      if (e.target.id === 'gcAlt') {
        const p = Math.round(760 * Math.pow(1 - 2.25577e-5 * n, 5.25588));
        $('#gcPatm').value = p; saveGc('patm', p);
      }
    });
    $('#lockNow').addEventListener('click', () => lockNow('Bloqueado'));
    const wipe = $('#wipe');
    wipe.addEventListener('click', () => {
      if (!wipe.dataset.armed) { wipe.dataset.armed = '1'; wipe.textContent = 'Toque de novo para confirmar — apaga tudo'; return; }
      Vault.wipe(); C.toast('Todos os dados foram apagados'); location.hash = '#/'; renderLock();
    });
    if (temp) return;
    pg.addEventListener('change', (e) => { if (e.target.name === alName) { store.set('autolock', +e.target.value); C.toast(`Bloqueio após ${e.target.value} min sem uso`); } });
    const off = $('#bioOff');
    if (off) off.addEventListener('click', () => {
      Vault.disableBio();
      C.toast('Biometria desativada. A passkey pode ser removida nas configurações de senhas do aparelho.');
      renderSecurity();
    });
    const on = $('#bioOn');
    if (on) on.addEventListener('submit', async (e) => {
      e.preventDefault();
      const m = $('#bioMsg'); m.className = 'lock-msg err';
      try {
        const ok = await Vault.enableBio($('#bioPw').value);
        if (!ok) { m.textContent = 'Senha incorreta.'; return; }
        C.toast('Biometria ativada'); renderSecurity();
      } catch (err) {
        m.textContent = err && err.message === 'prf-indisponivel'
          ? 'Este aparelho não oferece a biometria compatível com criptografia.'
          : err && err.name === 'NotAllowedError' ? 'Cadastro cancelado.' : 'Não foi possível ativar a biometria.';
      }
    });
    $('#pwForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const m = $('#pwMsg'); m.className = 'lock-msg err';
      const o = $('#pwOld').value, n1 = $('#pwNew').value, n2 = $('#pwNew2').value;
      if (n1.length < Vault.MIN_LEN) { m.textContent = `A nova senha precisa ter pelo menos ${Vault.MIN_LEN} caracteres.`; return; }
      if (n1 !== n2) { m.textContent = 'As novas senhas não coincidem.'; return; }
      m.textContent = 'Trocando…'; m.className = 'lock-msg';
      const ok = await Vault.changePassword(o, n1);
      if (!ok) { m.className = 'lock-msg err'; m.textContent = 'Senha atual incorreta.'; return; }
      ['pwOld', 'pwNew', 'pwNew2'].forEach((id) => ($('#' + id).value = ''));
      m.className = 'lock-msg ok'; m.textContent = 'Senha trocada.';
    });
  }

  /* =====================================================================
     FERRAMENTA
     ===================================================================== */
  function renderTool(t) {
    document.title = t.title + ' — Plantão';
    pushRecent(t.id);
    const isFav = favs().includes(t.id);
    const pg = mount(`
      <header class="bar" id="bar">
        <a class="icon-btn" href="#/" aria-label="Voltar">${I.back}</a>
        <div class="bar-title"><span class="k">${C.groups[t.group].name}</span><h1>${t.title}</h1></div>
        <button class="icon-btn" id="copyBtn" aria-label="Copiar resumo para o prontuário" title="Copiar resumo" hidden>${I.copy}</button>
        <button class="icon-btn" id="favBtn" aria-label="Fixar na tela inicial" aria-pressed="${isFav}">${isFav ? I.starOn : I.star}</button>
      </header>
      <main class="tool" id="tool">${t.weight ? C.patientStrip(t.id) : ''}<div id="toolBody"></div></main>
    `);
    const root = $('#tool');
    const api = { summary: null };
    root.addEventListener('input', (e) => C.validate(e.target));
    t.render($('#toolBody'), api, root);
    C.bindPatient(root, () => root.dispatchEvent(new Event('input')));
    $$('input[type="text"]', root).forEach(C.validate);
    root.dispatchEvent(new Event('input', { bubbles: true }));

    const copyBtn = $('#copyBtn');
    if (api.summary) {
      copyBtn.hidden = false;
      copyBtn.addEventListener('click', () => {
        const s = api.summary();
        if (!s) { C.toast('Preencha os dados primeiro'); return; }
        const a = Patients.active();
        C.copy((a ? `[${Patients.name(a)}] ` : '') + s);
      });
    }
    $('#favBtn').addEventListener('click', (e) => {
      let f = favs();
      const on = !f.includes(t.id);
      f = on ? [...f, t.id] : f.filter((x) => x !== t.id);
      store.set('favs', f);
      e.currentTarget.setAttribute('aria-pressed', on);
      e.currentTarget.innerHTML = on ? I.starOn : I.star;
      C.toast(on ? 'Fixada na tela inicial' : 'Removida das fixadas');
    });
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || e.target.type === 'checkbox' || e.target.type === 'radio') return;
      e.preventDefault();
      const ins = $$('input[type="text"]', root).filter((i) => i.offsetParent !== null);
      const i = ins.indexOf(e.target);
      if (i > -1 && ins[i + 1]) ins[i + 1].focus(); else e.target.blur();
    });
  }

  /* ---------- barra inferior: três destinos, sempre os mesmos ---------- */
  const nav = document.createElement('nav');
  nav.className = 'bnav';
  nav.setAttribute('aria-label', 'Navegação principal');
  document.body.appendChild(nav);
  C.navHidden = (on) => document.body.classList.toggle('nav-off', !!on);
  function renderNav(where) {
    if (!where) { nav.hidden = true; document.body.classList.remove('has-nav'); return; }
    nav.hidden = false;
    document.body.classList.add('has-nav');
    const a = Patients.active();
    /* publicado em legado/ (abaixo do app novo): "Calculadoras" volta para o app novo */
    const home = /\/legado\//.test(location.pathname) ? '../#/' : '#/';
    nav.innerHTML = `
      <a href="${home}" class="${where === 'calc' ? 'on' : ''}" ${home !== '#/' ? 'data-app' : ''}>${I.grid}<span>Calculadoras</span></a>
      <a href="#/gaso?novo=1" class="bn-main" aria-label="Nova gasometria ${a ? 'para ' + esc(Patients.name(a)) : 'avulsa'}">${I.plus}<span>Gaso</span></a>
      <a href="#/leitos" class="${where === 'leitos' ? 'on' : ''}">${I.beds}<span>Leitos</span></a>`;
    const toApp = nav.querySelector('a[data-app]');
    if (toApp) toApp.addEventListener('click', (e) => { e.preventDefault(); Vault.go(toApp.getAttribute('href')); });
  }

  /* ---------- rotas ---------- */
  function route() {
    C.navHidden(false);
    if (!Vault.supported()) { renderNav(null); return renderUnsupported(); }
    if (!Vault.isOpen()) { renderNav(null); return renderLock(); }
    const { id, q } = hashParts();
    let where = 'calc';
    if (id === 'pacientes') { where = 'leitos'; C.routes.leitos(q); }        /* compatibilidade: lista antiga → Leitos */
    else if (id === 'seguranca') renderSecurity();
    else if (C.routes[id]) { where = C.routes[id].nav || 'leitos'; C.routes[id](q); }
    else {
      const t = id && C.tool(id);
      if (t && t.href) { pushRecent(t.id); location.replace(t.href); return; }
      if (t) renderTool(t); else renderHome();
    }
    renderNav(where);
    window.scrollTo(0, 0);
  }
  C.route = route;
  window.addEventListener('hashchange', route);
  window.addEventListener('scroll', () => {
    const bar = $('#bar');
    if (bar) bar.classList.toggle('scrolled', window.scrollY > 4);
  }, { passive: true });

  /* ---------- PWA ---------- */
  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; showInstall(); });
  window.addEventListener('appinstalled', () => { deferred = null; showInstall(); });
  function showInstall() {
    const w = $('#installWrap');
    if (!w) return;
    w.hidden = !deferred;
    const b = $('#installBtn');
    if (b && !b.dataset.bound) {
      b.dataset.bound = '1';
      b.addEventListener('click', async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; showInstall(); });
    }
  }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }

  /* sessão trazida do app novo (legado/), se houver; senão, tela de senha */
  Vault.resume().catch(() => false).then(route);
})();
