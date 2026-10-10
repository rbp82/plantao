/* Service worker do Plantão — GERADO em scripts/postbuild.mjs a partir deste modelo; não editar dist/sw.js à mão.
   Escopo: a raiz do app (/plantao/). O app legado em legado/ tem o próprio service worker e não passa por aqui.
   O Cache Storage é compartilhado por origem: cada SW só apaga os caches com o seu prefixo. */
const VERSION = 'plantao-web-__VERSION__';
const PRECACHE = __PRECACHE__;
const FONTS = 'plantao-fonts';
const BASE = new URL('./', self.location).pathname;
/* caches do app antigo publicado na raiz (antes da migração): podem ser removidos */
const isOldRootCache = (k) => /^plantao-v[1-7]$/.test(k);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => (k.startsWith('plantao-web-') && k !== VERSION) || isOldRootCache(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* Google Fonts: cache, atualizado em segundo plano */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONTS).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req).then((r) => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  /* GitHub (protocolos) e demais origens: o app cuida do próprio cache */
  if (url.origin !== location.origin) return;
  /* app legado: tem o próprio service worker */
  if (url.pathname.startsWith(BASE + 'legado/')) return;

  /* navegação: rede primeiro (pega versão nova), shell em cache como reserva (rotas são por hash) */
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(BASE + 'index.html', copy)); }
      return r;
    }).catch(() => caches.match(BASE + 'index.html')));
    return;
  }

  /* assets com hash no nome: cache primeiro, rede como reserva */
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return r;
    }))
  );
});
