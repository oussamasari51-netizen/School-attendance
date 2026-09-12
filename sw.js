const CACHE_NAME = 'al-nazir-v2'; // تغيير الاسم لتدمير v1 القديم
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './admin.html',
  './students.html',
  './teachers.html',
  './teachers.js',
  './timetable.html',
  './timetable.js',
  './assets/style.css',
  './assets/sidebar.js',
  './assets/config.js'
];

// تثبيت وتجاوز الانتظار
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// تنظيف الكاش القديم (v1) فوراً
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// الاستراتيجية الجديدة: حاول الجلب من الشبكة أولاً، إذا لم تتوفر شبكة استخدم الكاش
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('supabase.co')) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // تحديث الكاش بالنسخة الجديدة فوراً
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request)) // استخدام الكاش فقط عند انقطاع الإنترنت
  );
});
