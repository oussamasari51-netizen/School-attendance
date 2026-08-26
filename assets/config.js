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

const SCHOOL_NAME = "متوسطة بوزراد حسين — عنابة";

const STATUS_OPTIONS = [
  { value: "تسوية وضعية", cls: "opt-resolved" },
  { value: "خروج استثنائي", cls: "opt-pending" },
  { value: "غياب بعذر مقبول", cls: "opt-pending" },
  { value: "غياب بعذر غير مقبول", cls: "opt-absent" },
];

// تصنيف كل حالة إلى فئات تقرير الوزارة الرسمية
function reportCategory(status) {
  if (status === "تسوية وضعية") return "resolved"; // لا يُحتسب كغياب إطلاقاً
  if (status === "غياب بعذر مقبول" || status === "خروج استثنائي") return "justified";
  if (status === "غياب بعذر غير مقبول") return "unjustified_explained";
  return "no_excuse"; // الحالة الافتراضية "غائب" (لم يُبت في أمرها بعد)
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
