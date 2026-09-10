// ===== القائمة الجانبية الموحّدة لصفحات الناظر والمشرف (v3: أيقونات حقيقية + وضع ليلي + لون مخصص) =====

const NAV_ITEMS = [
  { key: "admin",     href: "admin.html",     icon: "layout-dashboard", label: "الرئيسية",       roles: ["admin", "supervisor"] },
  { key: "students",  href: "students.html",  icon: "users",            label: "التلاميذ",        roles: ["admin"] },
  { key: "import",    href: "import.html",    icon: "upload",           label: "استيراد التلاميذ", roles: ["admin"] },
  { key: "teachers",  href: "teachers.html",  icon: "user-round",       label: "الأساتذة",        roles: ["admin"] },
  { key: "timetable", href: "timetable.html", icon: "calendar-days",    label: "استعمال الزمن",   roles: ["admin"] },
  { key: "duty",      href: "duty.html",      icon: "shield-check",     label: "جدول المشرفين",    roles: ["admin", "supervisor"] },
  { key: "coverage",  href: "coverage.html",  icon: "refresh-cw",       label: "المداومة",        roles: ["admin", "supervisor"] },
  { key: "reports",   href: "reports.html",   icon: "bar-chart-3",      label: "التقارير",        roles: ["admin", "supervisor"] },
  { key: "census",    href: "census.html",    icon: "calculator",       label: "الحساب الدوري",   roles: ["admin"] },
];

// تحميل مكتبة الأيقونات مرة واحدة تلقائياً (لا حاجة لتعديل كل صفحة يدوياً)
(function loadLucide() {
  if (window.lucide || document.getElementById("lucide-cdn")) return;
  const s = document.createElement("script");
  s.id = "lucide-cdn";
  s.src = "https://unpkg.com/lucide@latest/dist/umd/lucide.js";
  s.onload = () => { if (window.lucide) window.lucide.createIcons(); };
  document.head.appendChild(s);
})();

function icon(name) { return `<i data-lucide="${name}"></i>`; }

function renderSidebar(activeKey, role) {
  const mount = document.getElementById("sidebarMount");
  if (!mount) return;

  const visibleItems = NAV_ITEMS.filter(item => !role || item.roles.includes(role));

  const desktopLinks = visibleItems.map(item => `
    <a class="sb-link ${item.key === activeKey ? "active" : ""}" href="${item.href}">
      <span class="ic">${icon(item.icon)}</span><span>${item.label}</span>
    </a>
  `).join("");

  const mobileLinks = visibleItems.map(item => `
    <a class="${item.key === activeKey ? "active" : ""}" href="${item.href}">
      <span class="ic">${icon(item.icon)}</span><span>${item.label}</span>
    </a>
  `).join("");

  const isAdmin = role === "admin";

  mount.outerHTML = `
    <div class="sidebar" id="sidebarMount">
      <div class="sb-brand">
        <div class="icon">${icon("clipboard-list")}</div>
        <div>
          <div class="txt">${typeof APP_NAME !== "undefined" ? APP_NAME : "برنامج الناظر"}</div>
          <div class="sub">لوحة التحكم</div>
        </div>
        <button class="theme-toggle" onclick="toggleTheme()" title="الوضع الليلي">${icon("moon")}</button>
        <button class="sb-toggle" onclick="toggleSidebar()" title="طي القائمة">${icon("panel-right-close")}</button>
      </div>
      <div class="sb-school">
        <b>${typeof SCHOOL_NAME !== "undefined" ? SCHOOL_NAME : ""}</b>
        السنة الدراسية ${typeof SCHOOL_YEAR !== "undefined" ? SCHOOL_YEAR : ""}
      </div>
      ${isAdmin ? `
      <div class="field" style="margin-bottom:14px;">
        <label style="font-size:11px;">لون هوية المؤسسة</label>
        <input type="color" id="brandColorPicker" style="width:100%; height:34px; padding:2px; cursor:pointer;">
      </div>` : ""}
      <div class="sb-nav">${desktopLinks}</div>
    </div>
    <div class="mobile-nav">${mobileLinks}</div>
    <button class="floating-toggle" onclick="toggleSidebar()" title="إظهار القائمة">${icon("menu")}</button>
  `;

  if (window.lucide) window.lucide.createIcons();
  else { const t = setInterval(() => { if (window.lucide) { window.lucide.createIcons(); clearInterval(t); } }, 150); }

  if (localStorage.getItem("sidebarCollapsed") === "1") {
    document.querySelector(".app-shell").classList.add("sidebar-collapsed");
  }

  applyTheme();
  loadAndApplyBrandColor(isAdmin);
}

function toggleSidebar() {
  const shell = document.querySelector(".app-shell");
  shell.classList.toggle("sidebar-collapsed");
  localStorage.setItem("sidebarCollapsed", shell.classList.contains("sidebar-collapsed") ? "1" : "0");
}

// ===== الوضع الليلي =====
function applyTheme() {
  const saved = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
}

// ===== لون هوية المؤسسة (يُقرأ ويُطبَّق لكل الأدوار، والتعديل خاص بالناظر فقط) =====
async function loadAndApplyBrandColor(withPickerUI) {
  let saved = null;
  try {
    const { data } = await db.from("app_settings").select("value").eq("key", "brand_color");
    saved = (data && data[0]) ? data[0].value : null;
    if (saved) applyBrandColor(saved);
  } catch (e) { /* الجدول قد لا يكون موجوداً بعد، تجاهل بصمت */ }

  if (!withPickerUI) return;
  const picker = document.getElementById("brandColorPicker");
  if (!picker) return;
  picker.value = saved || "#2563eb";

  picker.addEventListener("change", async () => {
    const color = picker.value;
    applyBrandColor(color);
    await db.from("app_settings").upsert({ key: "brand_color", value: color }, { onConflict: "key" });
    if (typeof showToast === "function") showToast("تم حفظ لون الهوية");
  });
}

function applyBrandColor(hex) {
  document.documentElement.style.setProperty("--primary", hex);
  // درجة أغمق تلقائياً للتفاعل (hover/press)
  const dark = shadeColor(hex, -18);
  document.documentElement.style.setProperty("--primary-dark", dark);
  document.documentElement.style.setProperty("--primary-glass", `linear-gradient(135deg, ${hexToRgba(hex,0.90)}, ${hexToRgba(dark,0.85)})`);
}
function shadeColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + percent, g = ((num >> 8) & 0x00FF) + percent, b = (num & 0x0000FF) + percent;
  r = Math.min(255, Math.max(0, r)); g = Math.min(255, Math.max(0, g)); b = Math.min(255, Math.max(0, b));
  return "#" + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}
function hexToRgba(hex, alpha) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = num >> 16, g = (num >> 8) & 0x00FF, b = num & 0x0000FF;
  return `rgba(${r},${g},${b},${alpha})`;
}

// تطبيق الثيم فوراً حتى قبل رسم القائمة (يمنع "ومضة" الوضع النهاري عند تحميل صفحة في الوضع الليلي)
applyTheme();
