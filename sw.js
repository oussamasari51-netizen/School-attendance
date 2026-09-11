const CACHE_NAME = 'al-nazir-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './admin.html',
  './students.html',
  './teachers.html',
  './timetable.html',
  './assets/style.css',
  './assets/sidebar.js',
  './assets/config.js'
];

// تثبيت الـ Service Worker وتخزين الملفات الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// تفعيل وتحديث الكاش القديم
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

// جلب الملفات: التخديم من الكاش أولاً ثم الشبكة
self.addEventListener('fetch', (event) => {
  // تجاهل طلبات API الخارجية لـ Supabase لتسليم البيانات المباشرة
  if (event.request.url.includes('supabase.co')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
