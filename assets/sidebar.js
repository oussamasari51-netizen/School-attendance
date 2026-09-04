// ===== القائمة الجانبية الموحّدة لصفحات الناظر =====

const NAV_ITEMS = [
  { key: "admin",    href: "admin.html",    icon: "📋", label: "الرئيسية" },
  { key: "students", href: "students.html", icon: "👥", label: "التلاميذ" },
  { key: "import",   href: "import.html",   icon: "📥", label: "استيراد التلاميذ" },
  { key: "teachers", href: "teachers.html", icon: "🧑‍🏫", label: "الأساتذة" },
  { key: "duty",     href: "duty.html",     icon: "🛡️", label: "جدول الحراسة" },
  { key: "reports",  href: "reports.html",  icon: "📊", label: "التقارير" },
  { key: "census",   href: "census.html",   icon: "🧮", label: "الحساب الدوري" },
];

function renderSidebar(activeKey) {
  const mount = document.getElementById("sidebarMount");
  if (!mount) return;

  const desktopLinks = NAV_ITEMS.map(item => `
    <a class="sb-link ${item.key === activeKey ? "active" : ""}" href="${item.href}">
      <span class="ic">${item.icon}</span><span>${item.label}</span>
    </a>
  `).join("");

  const mobileLinks = NAV_ITEMS.map(item => `
    <a class="${item.key === activeKey ? "active" : ""}" href="${item.href}">
      <span class="ic">${item.icon}</span><span>${item.label}</span>
    </a>
  `).join("");

  mount.outerHTML = `
    <div class="sidebar" id="sidebarMount">
      <div class="sb-brand">
        <div class="icon">📋</div>
        <div>
          <div class="txt">${typeof APP_NAME !== "undefined" ? APP_NAME : "برنامج الناظر"}</div>
          <div class="sub">لوحة التحكم</div>
        </div>
      </div>
      <div class="sb-school">
        <b>${typeof SCHOOL_NAME !== "undefined" ? SCHOOL_NAME : ""}</b>
        السنة الدراسية ${typeof SCHOOL_YEAR !== "undefined" ? SCHOOL_YEAR : ""}
      </div>
      <div class="sb-nav">${desktopLinks}</div>
    </div>
    <div class="mobile-nav">${mobileLinks}</div>
  `;
}
