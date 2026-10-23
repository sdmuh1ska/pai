// Service worker "Monitoring Al Islam"
// Tujuan: aplikasi bisa dipasang, tampil cepat, dan tetap terbuka (tanpa data baru) saat sinyal hilang.
// Prinsip: selalu coba ambil versi TERBARU dari jaringan lebih dulu, sehingga perubahan yang Anda
// upload ke GitHub langsung sampai ke semua pengguna. Salinan lama hanya dipakai bila jaringan gagal.
// Permintaan ke Apps Script / Google (lain origin) TIDAK pernah dicegat.

const VERSI = 'alislam-v1';
const CANGKANG = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
const BATAS_TUNGGU_MS = 4000;

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSI)
      .then(function (c) { return c.addAll(CANGKANG); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (nama) {
        return Promise.all(nama.filter(function (n) { return n !== VERSI; }).map(function (n) { return caches.delete(n); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  const kunciCache = req.mode === 'navigate' ? 'index.html' : req;

  const jaringan = fetch(req).then(function (res) {
    if (res && res.ok) {
      const salinan = res.clone();
      caches.open(VERSI).then(function (c) { c.put(kunciCache, salinan); });
    }
    return res;
  });

  const batas = new Promise(function (_, tolak) {
    setTimeout(function () { tolak(new Error('lambat')); }, BATAS_TUNGGU_MS);
  });

  e.respondWith(
    Promise.race([jaringan, batas]).catch(function () {
      return caches.match(kunciCache).then(function (hit) { return hit || jaringan; });
    })
  );
});
