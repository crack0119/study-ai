// 오프라인 동작용 앱 셸 캐시 + 알림 클릭 처리.
const VERSION = 'v1';
const CACHE = `selfctrl-${VERSION}`;
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/main.js', './js/router.js', './js/db.js', './js/store.js',
  './js/notify.js', './js/ui.js', './js/backup.js',
  './js/lib/date.js',
  './js/features/bedtimeGuard.js', './js/features/pomodoro.js',
  './js/features/urgeFlow.js', './js/features/stats.js',
  './js/views/home.js', './js/views/sleep.js', './js/views/urge.js',
  './js/views/timer.js', './js/views/settings.js',
  './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.allSettled(SHELL.map(u => c.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // 화면 이동은 네트워크 우선 → 실패하면 캐시된 셸
  if (req.mode === 'navigate'){
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        (await caches.open(CACHE)).put('./index.html', fresh.clone());
        return fresh;
      } catch {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // 정적 자산은 캐시 우선 + 백그라운드 갱신
  e.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req).then(async (res) => {
      if (res && res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    }).catch(() => null);
    return cached || (await network) || Response.error();
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = e.notification.tag === 'wake' ? './#/sleep'
               : e.notification.tag === 'pomo' ? './#/timer' : './';
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins){
      if ('focus' in w){ await w.focus(); if ('navigate' in w) await w.navigate(target); return; }
    }
    await self.clients.openWindow(target);
  })());
});
