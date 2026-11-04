// Mỗi lần phát hành bản mới, đổi số phiên bản này (ví dụ caro-v2) để máy người dùng nhận cập nhật.
const V = 'caro-v3';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './app.js', './firebase-config.js', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Ưu tiên mạng (luôn lấy bản mới nhất), mất mạng thì dùng bản đã lưu để chơi offline.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then(res => { const copy = res.clone(); caches.open(V).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(m => m || caches.match('./index.html')))
  );
});
