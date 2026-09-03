// ===== إعدادات الاتصال بـ Supabase =====
// هذا الملف يحتوي على رابط ومفتاح المشروع (المفتاح publishable آمن للاستخدام هنا)

const SUPABASE_URL = "https://lvnofpsksamoppmkuywh.supabase.co";
const SUPABASE_KEY = "sb_publishable_-PltDkklG2Cf5oubRAH2zQ_oT-Gdbxh";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== الحصص الدراسية (التوقيت المعتمد) =====
// عدّل الأوقات هنا إذا كان توقيت مدرستك مختلفاً
const PERIODS = [
  { slot: 1, label: "1", time: "08:00–09:00" },
  { slot: 2, label: "2", time: "09:00–10:00" },
  { slot: 3, label: "3", time: "10:00–11:00" },
  { slot: 4, label: "4", time: "11:00–12:00" },
  { slot: 5, label: "5", time: "13:00–14:00" },
  { slot: 6, label: "6", time: "14:00–15:00" },
  { slot: 7, label: "7", time: "15:00–16:00" },
];

// عدد الحصص الفعلي لكل يوم (0=الأحد ... 6=السبت). الثلاثاء 4 حصص فقط (صباحاً)، الجمعة والسبت عطلة.
const DAY_PERIODS_COUNT = { 0: 7, 1: 7, 2: 4, 3: 7, 4: 7, 5: 0, 6: 0 };

function isSchoolDay(dow) {
  return DAY_PERIODS_COUNT[dow] > 0;
}

// يرجع فقط الحصص المتاحة فعلياً في يوم معيّن (تاريخ أو رقم يوم)
function getPeriodsForDay(dateOrDow) {
  const dow = typeof dateOrDow === "number" ? dateOrDow : new Date(dateOrDow + "T00:00:00").getDay();
  const count = DAY_PERIODS_COUNT[dow] || 0;
  return PERIODS.filter(p => p.slot <= count);
}

// آخر حصة في اليوم (لتحديد هل التلميذ ممنوع من الدخول غداً)
function lastPeriodOfDay(dateOrDow) {
  const dow = typeof dateOrDow === "number" ? dateOrDow : new Date(dateOrDow + "T00:00:00").getDay();
  return DAY_PERIODS_COUNT[dow] || 0;
}

const SCHOOL_NAME = "متوسطة بوزراد حسين — عنابة";
const APP_NAME = "برنامج الناظر";
const SCHOOL_YEAR = "2026-2027"; // عدّل هذا كل بداية سنة دراسية

const STATUS_OPTIONS = [
  { value: "تسوية وضعية", cls: "opt-resolved" },
  { value: "خروج استثنائي", cls: "opt-pending" },
];

// تصنيف الحالة: "resolved" (تسوية وضعية) يُستبعد كلياً من إحصاء الغياب، وأي شيء آخر يُحتسب غياباً
function reportCategory(status) {
  if (status === "تسوية وضعية") return "resolved";
  if (status === "خروج استثنائي") return "exit";
  return "plain"; // الحالة الافتراضية "غائب"
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// تحويل يوم الأسبوع الحالي إلى نظام (0=الأحد ... 4=الخميس) المعتمد في الجدول
function currentDayOfWeek() {
  return new Date().getDay(); // الأحد=0 ... السبت=6 (نعتمد فقط 0-4 للمتوسطة)
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
  if (expectedRole && profile.role !== expectedRole) {
    window.location.href = profile.role === "admin" ? "admin.html" : "teacher.html";
    return null;
  }
  return profile;
}

async function logout() {
  await db.auth.signOut();
  window.location.href = "index.html";
}
