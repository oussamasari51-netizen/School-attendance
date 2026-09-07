// ===== القائمة الجانبية الموحّدة لصفحات الناظر والمشرف =====

const NAV_ITEMS = [
  { key: "admin",     href: "admin.html",     icon: "📋", label: "الرئيسية",         roles: ["admin", "supervisor"] },
  { key: "students",  href: "students.html",  icon: "👥", label: "التلاميذ",          roles: ["admin"] },
  { key: "import",    href: "import.html",    icon: "📥", label: "استيراد التلاميذ",   roles: ["admin"] },
  { key: "teachers",  href: "teachers.html",  icon: "🧑‍🏫", label: "الأساتذة",          roles: ["admin"] },
  { key: "timetable", href: "timetable.html", icon: "🗓️", label: "استعمال الزمن",     roles: ["admin"] },
  { key: "duty",      href: "duty.html",      icon: "🛡️", label: "جدول الحراسة",      roles: ["admin", "supervisor"] },
  { key: "reports",   href: "reports.html",   icon: "📊", label: "التقارير",          roles: ["admin", "supervisor"] },
  { key: "census",    href: "census.html",    icon: "🧮", label: "الحساب الدوري",     roles: ["admin"] },
];

// activeKey: مفتاح الصفحة الحالية. role: دور المستخدم الحالي ("admin" أو "supervisor") — مررها بعد نجاح requireSession
function renderSidebar(activeKey, role) {
  const mount = document.getElementById("sidebarMount");
  if (!mount) return;

  const visibleItems = NAV_ITEMS.filter(item => !role || item.roles.includes(role));

  const desktopLinks = visibleItems.map(item => `
    <a class="sb-link ${item.key === activeKey ? "active" : ""}" href="${item.href}">
      <span class="ic">${item.icon}</span><span>${item.label}</span>
    </a>
  `).join("");

  const mobileLinks = visibleItems.map(item => `
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
        <button class="sb-toggle" onclick="toggleSidebar()" title="طي القائمة">☰</button>
      </div>
      <div class="sb-school">
        <b>${typeof SCHOOL_NAME !== "undefined" ? SCHOOL_NAME : ""}</b>
        السنة الدراسية ${typeof SCHOOL_YEAR !== "undefined" ? SCHOOL_YEAR : ""}
      </div>
      <div class="sb-nav">${desktopLinks}</div>
    </div>
    <div class="mobile-nav">${mobileLinks}</div>
    <button class="floating-toggle" onclick="toggleSidebar()" title="إظهار القائمة">☰</button>
  `;

  if (localStorage.getItem("sidebarCollapsed") === "1") {
    document.querySelector(".app-shell").classList.add("sidebar-collapsed");
  }
}

function toggleSidebar() {
  const shell = document.querySelector(".app-shell");
  shell.classList.toggle("sidebar-collapsed");
  localStorage.setItem("sidebarCollapsed", shell.classList.contains("sidebar-collapsed") ? "1" : "0");
}
