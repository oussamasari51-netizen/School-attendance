const CACHE_NAME = 'al-nazir-v4'; // رفع الإصدار إلى v4 لتدمير v3 العالق على الهواتف

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './admin.html',
  './teacher.html', // تم إضافته ليعمل بثبات على الهاتف
  './students.html',
  './teachers.html',
  './teachers.js',
  './timetable.html',
  './timetable.js',
  './assets/style.css',
  './assets/sidebar.js',
  './assets/config.js'
];

// 1. التثبيت وتجاوز الانتظار
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// 2. تفعيل الحزمة الجديدة وحذف جميع النسخ القديمة
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

// 3. استراتيجية الجلب الصحيحة والمستقرة
self.addEventListener('fetch', (event) => {
  const reqUrl = event.request.url;

  // أ) تجاوز Supabase وترك الشبكة تتعامل معها مباشرة وحياً 100%
  if (reqUrl.includes('supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // ب) إهمال طلبات غير GET (مثل POST أو PUT) لتجنب أخطاء الكاش
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // ج) بالنسبة للملفات الثابتة (HTML/CSS/JS): جلب من الشبكة أولاً وتحديث الكاش
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request)) // الاستعانة بالكاش فقط عند انقطاع الإنترنت
  );
});
