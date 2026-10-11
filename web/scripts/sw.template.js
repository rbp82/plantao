/* Service worker do Plantão — GERADO em scripts/postbuild.mjs a partir deste modelo; não editar dist/sw.js à mão.
   Escopo: a raiz do app (/plantao/). Fontes vêm empacotadas no build: entram no pré-cache como qualquer asset. */
const VERSION = 'plantao-web-__VERSION__';
const PRECACHE = __PRECACHE__;
const BASE = new URL('./', self.location).pathname;
/* leitor de foto (Tesseract, ≈ 15 MB em ocr/): baixado só no primeiro uso e mantido entre versões do app */
const OCR = 'plantao-ocr-v1';
/* caches de versões anteriores do app (raiz com Jekyll, legado/ e o mecanismo antigo de protocolos): podem ser removidos */
const isStale = (k) => /^plantao-v\d+$/.test(k) || k === 'plantao-protocolos-v1' || k === 'plantao-ocr-7.0.0' || k === 'plantao-fonts';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => (k.startsWith('plantao-web-') && k !== VERSION) || isStale(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* rede primeiro, guardando a resposta; sem rede, a cópia do cache */
const networkFirst = (req, cacheKey) => fetch(req).then((r) => {
  if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(cacheKey || req, copy)); }
  return r;
}).catch(() => caches.match(cacheKey || req, { ignoreSearch: true }).then((hit) => hit || Response.error()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* leitor de foto: cache próprio, preenchido no primeiro uso */
  if (url.pathname.startsWith(BASE + 'ocr/')) {
    e.respondWith(caches.open(OCR).then(async (c) => {
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok) c.put(req, r.clone());
      return r;
    }));
    return;
  }

  /* protocolos (índice, .md e imagens): podem mudar sem nova versão do app → rede primeiro; offline, a cópia pré-cacheada */
  if (url.pathname.startsWith(BASE + 'protocolos/')) { e.respondWith(networkFirst(req)); return; }

  /* navegação: rede primeiro (pega versão nova), shell em cache como reserva (rotas são por hash) */
  if (req.mode === 'navigate') { e.respondWith(networkFirst(req, BASE + 'index.html')); return; }

  /* assets com hash no nome: cache primeiro, rede como reserva */
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return r;
    }))
  );
});
