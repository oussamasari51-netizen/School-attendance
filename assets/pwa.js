// ===== تهيئة وتفعيل خيار التثبيت تلقائياً (PWA) =====
(function initPWA() {
  // 1. ربط الـ Manifest في رأس الصفحة تلقائياً
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = './manifest.json';
    document.head.appendChild(link);
  }

  // 2. تسجيل الـ Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('PWA Service Worker Registered!'))
        .catch(err => console.log('SW Error:', err));
    });
  }
})();

// 3. التقاط حدث التثبيت وإبراز زر التثبيت
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('pwaInstallBtn');
  if (btn) btn.style.display = 'flex';
});

async function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    const btn = document.getElementById('pwaInstallBtn');
    if (btn) btn.style.display = 'none';
  }
  deferredPrompt = null;
}
