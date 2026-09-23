// ===== إعدادات الاتصال بـ Supabase =====
const SUPABASE_URL = "https://lvnofpsksamoppmkuywh.supabase.co";
const SUPABASE_KEY = "sb_publishable_-PltDkklG2Cf5oubRAH2zQ_oT-Gdbxh";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== الحصص الدراسية المعتمدة (4 صباحاً + 3 مساءً = 7 حصص) =====
const PERIODS = [
  { slot: 1, label: "ح1", time: "08:00–09:00", period: "morning" },
  { slot: 2, label: "ح2", time: "09:00–10:00", period: "morning" },
  { slot: 3, label: "ح3", time: "10:00–11:00", period: "morning" },
  { slot: 4, label: "ح4", time: "11:00–12:00", period: "morning" },
  { slot: 5, label: "ح5", time: "13:00–14:00", period: "afternoon" },
  { slot: 6, label: "ح6", time: "14:00–15:00", period: "afternoon" },
  { slot: 7, label: "ح7", time: "15:00–16:00", period: "afternoon" }
];

// عدد الحصص الفعلي حسب أيام الأسبوع (0=الأحد ... 6=السبت)
// الأحد، الاثنين، الأربعاء، الخميس = 7 حصص
// الثلاثاء = 4 حصص فقط (صباحاً)
// الجمعة والسبت = 0 (عطلة)
const DAY_PERIODS_COUNT = { 0: 7, 1: 7, 2: 4, 3: 7, 4: 7, 5: 0, 6: 0 };

function isSchoolDay(dow) {
  return DAY_PERIODS_COUNT[dow] > 0;
}

// أخذ الحصص الخاصة باليوم المحدد فقط
function getPeriodsForDay(dateOrDow) {
  const dow = typeof dateOrDow === "number" ? dateOrDow : new Date(dateOrDow + "T00:00:00").getDay();
  const count = DAY_PERIODS_COUNT[dow] || 0;
  return PERIODS.filter(p => p.slot <= count);
}

function lastPeriodOfDay(dateOrDow) {
  const dow = typeof dateOrDow === "number" ? dateOrDow : new Date(dateOrDow + "T00:00:00").getDay();
  return DAY_PERIODS_COUNT[dow] || 0;
}

const SCHOOL_NAME = "متوسطة بوزراد حسين — عنابة";
const APP_NAME = "برنامج الناظر";
const SCHOOL_YEAR = "2026-2027";

// استعمال الزمن البيداغوجي
const TIMETABLE_PERIODS = [
  { slot: 1, label: "1", time: "08:00–09:00" },
  { slot: 2, label: "2", time: "09:00–10:00" },
  { slot: 3, label: "3", time: "10:00–11:00" },
  { slot: 4, label: "4", time: "11:00–12:00" },
  { slot: 5, label: "5", time: "13:00–14:00" },
  { slot: 6, label: "6", time: "14:00–15:00" },
  { slot: 7, label: "7", time: "15:00–16:00" }
];
const TIMETABLE_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

const STATUS_OPTIONS = [
  { value: "غائب", cls: "opt-absent" },
  { value: "تسوية وضعية", cls: "opt-resolved" },
  { value: "خروج استثنائي", cls: "opt-pending" }
];

function reportCategory(status) {
  if (status === "تسوية وضعية") return "resolved";
  if (status === "خروج استثنائي") return "exit";
  return "plain"; // غائب
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function currentDayOfWeek() {
  return new Date().getDay();
}

function showToast(msg) {
  let t = document.getElementById("app-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "app-toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}

async function requireSession(expectedRole) {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  const { data: profile, error } = await db
    .from("users")
    .select("*")
    .eq("auth_id", session.user.id)
    .single();

  if (error || !profile) {
    await db.auth.signOut();
    window.location.href = "index.html";
    return null;
  }
  
  const allowed = Array.isArray(expectedRole) ? expectedRole : (expectedRole ? [expectedRole] : null);
  if (allowed && !allowed.includes(profile.role)) {
    window.location.href = profile.role === "teacher" ? "teacher.html" : "admin.html";
    return null;
  }
  return profile;
}

async function logout() {
  await db.auth.signOut();
  window.location.href = "index.html";
}
