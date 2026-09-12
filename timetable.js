let profile = null;
let allClasses = [];
let selectedClassId = null;
let currentClassEntries = {};

async function init() {
  profile = await requireSession("admin");
  if (!profile) return;
  document.getElementById("adminName").textContent = profile.full_name;

  const { data: classes } = await db.from("classes").select("id, name").order("name");
  allClasses = classes || [];
  document.getElementById("classSelect").innerHTML = allClasses.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  if (allClasses.length) { selectedClassId = allClasses[0].id; loadClassGrid(); }

  await populateFilterSelect("teacherSelect", "teacher_label");
  await populateFilterSelect("roomSelect", "room");
}

document.getElementById("classSelect").addEventListener("change", (e) => { selectedClassId = e.target.value; loadClassGrid(); });
document.getElementById("teacherSelect").addEventListener("change", loadTeacherGrid);
document.getElementById("roomSelect").addEventListener("change", loadRoomGrid);

async function populateFilterSelect(elId, column) {
  const { data } = await db.from("timetable_entries").select(column).not(column, "is", null);
  const values = [...new Set((data || []).map(r => r[column]).filter(Boolean))].sort();
  const sel = document.getElementById(elId);
  sel.innerHTML = values.length ? values.map(v => `<option value="${v}">${v}</option>`).join("") : `<option value="">لا توجد بيانات بعد</option>`;
}

const TABS = { class: "viewClass", teacher: "viewTeacher", room: "viewRoom", import: "viewImport" };
function switchTab(key) {
  Object.keys(TABS).forEach(k => document.getElementById(TABS[k]).style.display = k === key ? "block" : "none");
  document.getElementById("tabClass").classList.toggle("active", key === "class");
  document.getElementById("tabTeacher").classList.toggle("active", key === "teacher");
  document.getElementById("tabRoom").classList.toggle("active", key === "room");
  document.getElementById("tabImport").classList.toggle("active", key === "import");
  if (key === "teacher") loadTeacherGrid();
  if (key === "room") loadRoomGrid();
}
document.getElementById("tabClass").onclick = () => switchTab("class");
document.getElementById("tabTeacher").onclick = () => switchTab("teacher");
document.getElementById("tabRoom").onclick = () => switchTab("room");
document.getElementById("tabImport").onclick = () => switchTab("import");

async function loadClassGrid() {
  const { data } = await db.from("timetable_entries").select("*").eq("class_id", selectedClassId);
  currentClassEntries = {};
  (data || []).forEach(r => currentClassEntries[`${r.day_of_week}_${r.period_slot}`] = r);
  renderClassGrid();
}

function renderClassGrid() {
  let html = "<thead><tr><th>اليوم</th>" + TIMETABLE_PERIODS.map(p => `<th>${p.label}<br><small>${p.time}</small></th>`).join("") + "</tr></thead><tbody>";
  TIMETABLE_DAYS.forEach((dayName, dow) => {
    html += `<tr><td class="day-label">${dayName}</td>`;
    TIMETABLE_PERIODS.forEach(p => {
      const key = `${dow}_${p.slot}`;
      const r = currentClassEntries[key] || {};
      html += `<td>
        <div class="cell-stack">
          <input class="subj" placeholder="المادة" value="${r.subject || ""}" data-day="${dow}" data-slot="${p.slot}" data-field="subject" onchange="saveCell(this)">
          <input placeholder="الأستاذ" value="${r.teacher_label || ""}" data-day="${dow}" data-slot="${p.slot}" data-field="teacher_label" onchange="saveCell(this)">
          <input class="room" placeholder="القاعة" value="${r.room || ""}" data-day="${dow}" data-slot="${p.slot}" data-field="room" onchange="saveCell(this)">
        </div>
      </td>`;
    });
    html += "</tr>";
  });
  html += "</tbody>";
  document.getElementById("classGrid").innerHTML = html;
}

async function saveCell(el) {
  const day = parseInt(el.dataset.day, 10), slot = parseInt(el.dataset.slot, 10), field = el.dataset.field;
  const key = `${day}_${slot}`;
  const existing = currentClassEntries[key] || { class_id: selectedClassId, day_of_week: day, period_slot: slot, group_label: "" };
  existing[field] = el.value.trim();

  if (!existing.subject && !existing.teacher_label && !existing.room) {
    if (existing.id) await db.from("timetable_entries").delete().eq("id", existing.id);
    delete currentClassEntries[key];
    return;
  }

  const { data, error } = await db.from("timetable_entries")
    .upsert(existing, { onConflict: "class_id,day_of_week,period_slot,group_label" })
    .select().single();
  if (error) { showToast("حدث خطأ أثناء الحفظ"); return; }
  currentClassEntries[key] = data;
}

async function loadTeacherGrid() {
  const teacher = document.getElementById("teacherSelect").value;
  if (!teacher) { document.getElementById("teacherGrid").innerHTML = ""; return; }
  const { data } = await db.from("timetable_entries").select("*, classes(name)").eq("teacher_label", teacher);
  renderReadonlyGrid("teacherGrid", data || [], "classes");
}

async function loadRoomGrid() {
  const room = document.getElementById("roomSelect").value;
  if (!room) { document.getElementById("roomGrid").innerHTML = ""; return; }
  const { data } = await db.from("timetable_entries").select("*, classes(name)").eq("room", room);
  renderReadonlyGrid("roomGrid", data || [], "classes");
}

function renderReadonlyGrid(tableId, rows, joinKey) {
  const map = {};
  rows.forEach(r => map[`${r.day_of_week}_${r.period_slot}`] = r);
  let html = "<thead><tr><th>اليوم</th>" + TIMETABLE_PERIODS.map(p => `<th>${p.label}<br><small>${p.time}</small></th>`).join("") + "</tr></thead><tbody>";
  TIMETABLE_DAYS.forEach((dayName, dow) => {
    html += `<tr><td class="day-label">${dayName}</td>`;
    TIMETABLE_PERIODS.forEach(p => {
      const r = map[`${dow}_${p.slot}`];
      html += `<td class="ro-cell">${r ? `<b>${r.subject || ""}</b>${r[joinKey] ? r[joinKey].name : (r.teacher_label || "")}<br>${r.room || ""}` : ""}</td>`;
    });
    html += "</tr>";
  });
  html += "</tbody>";
  document.getElementById(tableId).innerHTML = html;
}

function printGrid(title, tableId) {
  const tableHtml = document.getElementById(tableId).outerHTML;
  let html = `
  <html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>${title}</title>
  <style>
    body{font-family:Arial,Tahoma,sans-serif; padding:22px; color:#111;}
    .head{display:flex; justify-content:space-between; border-bottom:2px solid #111; padding-bottom:10px; margin-bottom:14px; font-size:12px;}
    h1{font-size:17px; text-align:center; margin:6px 0 16px;}
    table{width:100%; border-collapse:collapse;}
    th,td{border:1px solid #999; padding:5px; text-align:center; font-size:10.5px;}
    th{background:#eee;}
    input{border:none; background:transparent; text-align:center; font-size:10.5px; width:100%;}
  </style></head><body>
    <div class="head"><span>${SCHOOL_NAME}<br>السنة الدراسية: ${SCHOOL_YEAR}</span><span>الجمهورية الجزائرية الديمقراطية الشعبية<br>وزارة التربية الوطنية</span></div>
    <h1>${title}</h1>
    ${tableHtml}
  </body></html>`;
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
}

document.getElementById("printClassBtn").onclick = () => {
  const cname = allClasses.find(c => c.id === selectedClassId);
  printGrid(`استعمال الزمن — قسم ${cname ? cname.name : ""}`, "classGrid");
};
document.getElementById("printTeacherBtn").onclick = () => {
  printGrid(`استعمال الزمن — الأستاذ ${document.getElementById("teacherSelect").value}`, "teacherGrid");
};
document.getElementById("printRoomBtn").onclick = () => {
  printGrid(`استعمال الزمن — ${document.getElementById("roomSelect").value}`, "roomGrid");
};

let parsedRows = [];
document.getElementById("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const status = document.getElementById("importStatus");
  status.style.display = "block"; status.textContent = "جاري القراءة...";

  const rows = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: "array" });
      resolve(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" }));
    };
    reader.readAsArrayBuffer(file);
  });

  const classByName = {}; allClasses.forEach(c => classByName[c.name.trim()] = c.id);
  const dayIndex = { "الأحد":0,"الاثنين":1,"الثلاثاء":2,"الأربعاء":3,"الخميس":4 };

  parsedRows = rows.map(r => {
    const className = String(r["القسم"] || "").trim();
    let day = r["اليوم"];
    day = (typeof day === "string" && dayIndex[day.trim()] !== undefined) ? dayIndex[day.trim()] : parseInt(day, 10);
    return {
      class_id: classByName[className] || null,
      className,
      day_of_week: day,
      period_slot: parseInt(r["الحصة"], 10),
      subject: String(r["المادة"] || "").trim() || null,
      teacher_label: String(r["الأستاذ"] || "").trim() || null,
      room: String(r["القاعة"] || "").trim() || null,
      group_label: String(r["المجموعة"] || "").trim() || ""
    };
  }).filter(r => r.period_slot && !isNaN(r.day_of_week));

  const unmatched = parsedRows.filter(r => !r.class_id);
  status.style.display = "none";
  document.getElementById("importPreview").style.display = "block";
  document.getElementById("importSummary").innerHTML =
    `تم العثور على <b>${parsedRows.length}</b> خانة صالحة.` +
    (unmatched.length ? `<br><span style="color:var(--absent);">تحذير: ${unmatched.length} خانة قسمها غير معروف وستُتجاهل (تأكد أن اسم القسم مطابق تماماً).</span>` : "");
});

document.getElementById("confirmImportBtn").addEventListener("click", async () => {
  const btn = document.getElementById("confirmImportBtn");
  btn.disabled = true; btn.textContent = "جاري الاستيراد...";
  const valid = parsedRows.filter(r => r.class_id).map(({ className, ...rest }) => rest);

  let done = 0;
  for (let i = 0; i < valid.length; i += 200) {
    const chunk = valid.slice(i, i + 200);
    const { error } = await db.from("timetable_entries").upsert(chunk, { onConflict: "class_id,day_of_week,period_slot,group_label" });
    if (error) { showToast("حدث خطأ أثناء الاستيراد"); btn.disabled = false; btn.textContent = "تأكيد الاستيراد"; return; }
    done += chunk.length;
  }
  showToast(`تم استيراد ${done} خانة بنجاح ✓`);
  btn.disabled = false; btn.textContent = "تأكيد الاستيراد";
  document.getElementById("importPreview").style.display = "none";
  document.getElementById("importFile").value = "";
  if (selectedClassId) loadClassGrid();
});

init();
