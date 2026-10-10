/* Service worker — app offline-first. Ao alterar qualquer arquivo, incremente VERSION. */
const VERSION = 'plantao-v8';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/css/app.css',
  'assets/js/core.js',
  'assets/js/engine.js',
  'assets/js/beds.js',
  'assets/js/scan.js',
  'assets/js/pcr.js',
  'assets/js/app.js',
  'assets/js/tools/hemo.js',
  'assets/js/tools/inf.js',
  'assets/js/tools/sed.js',
  'assets/js/tools/met.js',
  'assets/js/tools/hema.js',
  'assets/js/tools/delta.js',
  'assets/icons/icon.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/maskable-512.png',
  'assets/icons/apple-touch-icon.png',
];
const FONTS = 'plantao-fonts';
/* leitor de foto (Tesseract, ≈ 7 MB): baixado só no primeiro uso e mantido entre versões do app */
const OCR = 'plantao-ocr-7.0.0';
const isOcr = (p) => /(?:^|\/)(?:tesseract[\w.-]*\.js|worker\.min\.js|eng\.traineddata\.gz)$/.test(p);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      /* o Cache Storage é da origem inteira (dividido com o app novo em ../): só apaga versões antigas deste app */
      .then((keys) => Promise.all(keys.filter((k) => /^plantao-v\d+$/.test(k) && k !== VERSION).map((k) => caches.delete(k))))
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

  if (url.origin !== location.origin) return;

  if (isOcr(url.pathname)) {
    e.respondWith(caches.open(OCR).then(async (c) => {
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok) c.put(req, r.clone());
      return r;
    }));
    return;
  }

  /* navegação: sempre devolve o shell (rotas são por hash) */
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put('index.html', copy)); }
      return r;
    }).catch(() => caches.match('index.html')));
    return;
  }

  /* demais arquivos: cache primeiro, rede como reserva */
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return r;
    }))
  );
});
