// ==========================================
// 1. تسجيل الـ Service Worker وربط الـ Manifest (PWA)
// ==========================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW registration failed:', err));
  });
}

// إضافة رابط الـ Manifest تلقائياً لكافة الصفحات
if (!document.querySelector('link[rel="manifest"]')) {
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = './manifest.json';
  document.head.appendChild(link);
}

// ==========================================
// 2. كود الشريط الجانبي الأصلي (Sidebar)
// ==========================================
function renderSidebar(activeKey) {
  const mount = document.getElementById("sidebarMount");
  if (!mount) return;

  const items = [
    { key: "index", label: "الرئيسية", icon: "🏠", href: "index.html" },
    { key: "students", label: "التلاميذ", icon: "👥", href: "students.html" },
    { key: "teachers", label: "الأساتذة", icon: "👨‍🏫", href: "teachers.html" },
    { key: "timetable", label: "استعمال الزمن", icon: "🗓️", href: "timetable.html" },
    { key: "duty", label: "الحراسة", icon: "🛡️", href: "duty.html" },
    { key: "census", label: "التعداد", icon: "📊", href: "census.html" },
    { key: "reports", label: "التقارير", icon: "📄", href: "reports.html" },
    { key: "admin", label: "الإدارة", icon: "⚙️", href: "admin.html" }
  ];

  let html = `
  <div class="sidebar">
    <div class="brand">
      <div class="icon">🏫</div>
      <div>
        <h2>برنامج الناظر</h2>
        <small>مؤمن ومباشر</small>
      </div>
    </div>
    <ul class="nav">
  `;

  items.forEach(item => {
    const activeClass = item.key === activeKey ? "active" : "";
    html += `
      <li>
        <a href="${item.href}" class="${activeClass}">
          <span class="icon">${item.icon}</span>
          <span>${item.label}</span>
        </a>
      </li>
    `;
  });

  html += `
    </ul>
  </div>
  `;

  mount.innerHTML = html;
}
