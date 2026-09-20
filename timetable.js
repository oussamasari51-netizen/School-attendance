let profile = null;
let allClasses = [];
let selectedClassId = null;
let currentClassEntries = {};

async function init() {
  profile = await requireSession("admin");
  if (!profile) return;
  const adminEl = document.getElementById("adminName");
  if (adminEl) adminEl.textContent = profile.full_name;

  const { data: classes } = await db.from("classes").select("id, name").order("name");
  allClasses = classes || [];
  const classSelect = document.getElementById("classSelect");
  if (classSelect) {
    classSelect.innerHTML = allClasses.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  }
  
  if (allClasses.length) { 
    selectedClassId = allClasses[0].id; 
    await loadClassGrid(); 
  }

  await populateFilterSelect("teacherSelect", "teacher_label");
  await populateFilterSelect("roomSelect", "room");
}

const classSelectEl = document.getElementById("classSelect");
if (classSelectEl) {
  classSelectEl.addEventListener("change", (e) => { selectedClassId = e.target.value; loadClassGrid(); });
}

const teacherSelectEl = document.getElementById("teacherSelect");
if (teacherSelectEl) teacherSelectEl.addEventListener("change", loadTeacherGrid);

const roomSelectEl = document.getElementById("roomSelect");
if (roomSelectEl) roomSelectEl.addEventListener("change", loadRoomGrid);

async function populateFilterSelect(elId, column) {
  const { data } = await db.from("timetable_entries").select(column).not(column, "is", null);
  const values = [...new Set((data || []).map(r => r[column]).filter(Boolean))].sort();
  const sel = document.getElementById(elId);
  if (sel) {
    sel.innerHTML = values.length ? values.map(v => `<option value="${v}">${v}</option>`).join("") : `<option value="">لا توجد بيانات بعد</option>`;
  }
}

const TABS = { class: "viewClass", teacher: "viewTeacher", room: "viewRoom", import: "viewImport" };
function switchTab(key) {
  Object.keys(TABS).forEach(k => {
    const el = document.getElementById(TABS[k]);
    if (el) el.style.display = k === key ? "block" : "none";
  });
  
  const tClass = document.getElementById("tabClass");
  const tTeacher = document.getElementById("tabTeacher");
  const tRoom = document.getElementById("tabRoom");
  const tImport = document.getElementById("tabImport");

  if (tClass) tClass.classList.toggle("active", key === "class");
  if (tTeacher) tTeacher.classList.toggle("active", key === "teacher");
  if (tRoom) tRoom.classList.toggle("active", key === "room");
  if (tImport) tImport.classList.toggle("active", key === "import");

  if (key === "teacher") loadTeacherGrid();
  if (key === "room") loadRoomGrid();
}

if (document.getElementById("tabClass")) document.getElementById("tabClass").onclick = () => switchTab("class");
if (document.getElementById("tabTeacher")) document.getElementById("tabTeacher").onclick = () => switchTab("teacher");
if (document.getElementById("tabRoom")) document.getElementById("tabRoom").onclick = () => switchTab("room");
if (document.getElementById("tabImport")) document.getElementById("tabImport").onclick = () => switchTab("import");

async function loadClassGrid() {
  if (!selectedClassId) return;
  const { data } = await db.from("timetable_entries").select("*").eq("class_id", selectedClassId);
  currentClassEntries = {};
  (data || []).forEach(r => currentClassEntries[`${r.day_of_week}_${r.period_slot}`] = r);
  renderClassGrid();
}

function renderClassGrid() {
  const grid = document.getElementById("classGrid");
  if (!grid) return;

  const days = typeof TIMETABLE_DAYS !== 'undefined' ? TIMETABLE_DAYS : ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  const periods = typeof TIMETABLE_PERIODS !== 'undefined' ? TIMETABLE_PERIODS : [
    {slot:1, label:"الحصة 1", time:"08:00 - 09:00"},
    {slot:2, label:"الحصة 2", time:"09:00 - 10:00"},
    {slot:3, label:"الحصة 3", time:"10:00 - 11:00"},
    {slot:4, label:"الحصة 4", time:"11:00 - 12:00"},
    {slot:5, label:"الحصة 5", time:"13:00 - 14:00"},
    {slot:6, label:"الحصة 6", time:"14:00 - 15:00"},
    {slot:7, label:"الحصة 7", time:"15:00 - 16:00"},
    {slot:8, label:"الحصة 8", time:"16:00 - 17:00"}
  ];

  let html = "<thead><tr><th>اليوم</th>" + periods.map(p => `<th>${p.label}<br><small>${p.time}</small></th>`).join("") + "</tr></thead><tbody>";
  days.forEach((dayName, dow) => {
    html += `<tr><td class="day-label">${dayName}</td>`;
    periods.forEach(p => {
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
  grid.innerHTML = html;
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
  if (error) { if (typeof showToast === 'function') showToast("حدث خطأ أثناء الحفظ"); return; }
  currentClassEntries[key] = data;
}

async function loadTeacherGrid() {
  const sel = document.getElementById("teacherSelect");
  if (!sel) return;
  const teacher = sel.value;
  if (!teacher) { document.getElementById("teacherGrid").innerHTML = ""; return; }
  const { data } = await db.from("timetable_entries").select("*, classes(name)").eq("teacher_label", teacher);
  renderReadonlyGrid("teacherGrid", data || [], "classes");
}

async function loadRoomGrid() {
  const sel = document.getElementById("roomSelect");
  if (!sel) return;
  const room = sel.value;
  if (!room) { document.getElementById("roomGrid").innerHTML = ""; return; }
  const { data } = await db.from("timetable_entries").select("*, classes(name)").eq("room", room);
  renderReadonlyGrid("roomGrid", data || [], "classes");
}

function renderReadonlyGrid(tableId, rows, joinKey) {
  const grid = document.getElementById(tableId);
  if (!grid) return;

  const days = typeof TIMETABLE_DAYS !== 'undefined' ? TIMETABLE_DAYS : ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  const periods = typeof TIMETABLE_PERIODS !== 'undefined' ? TIMETABLE_PERIODS : [
    {slot:1, label:"الحصة 1", time:"08:00 - 09:00"},
    {slot:2, label:"الحصة 2", time:"09:00 - 10:00"},
    {slot:3, label:"الحصة 3", time:"10:00 - 11:00"},
    {slot:4, label:"الحصة 4", time:"11:00 - 12:00"},
    {slot:5, label:"الحصة 5", time:"13:00 - 14:00"},
    {slot:6, label:"الحصة 6", time:"14:00 - 15:00"},
    {slot:7, label:"الحصة 7", time:"15:00 - 16:00"},
    {slot:8, label:"الحصة 8", time:"16:00 - 17:00"}
  ];

  const map = {};
  rows.forEach(r => map[`${r.day_of_week}_${r.period_slot}`] = r);
  let html = "<thead><tr><th>اليوم</th>" + periods.map(p => `<th>${p.label}<br><small>${p.time}</small></th>`).join("") + "</tr></thead><tbody>";
  days.forEach((dayName, dow) => {
    html += `<tr><td class="day-label">${dayName}</td>`;
    periods.forEach(p => {
      const r = map[`${dow}_${p.slot}`];
      html += `<td class="ro-cell">${r ? `<b>${r.subject || ""}</b>${r[joinKey] ? r[joinKey].name : (r.teacher_label \vert{}\vert{} "")}<br>${r.room || ""}` : ""}</td>`;
    });
    html += "</tr>";
  });
  html += "</tbody>";
  grid.innerHTML = html;
}

function printGrid(title, tableId) {
  const grid = document.getElementById(tableId);
  if (!grid) return;
  const tableHtml = grid.outerHTML;
  const sName = typeof SCHOOL_NAME !== 'undefined' ? SCHOOL_NAME : "برنامج الناظر";
  const sYear = typeof SCHOOL_YEAR !== 'undefined' ? SCHOOL_YEAR : "2026-2027";

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
    <div class="head"><span>${sName}<br>السنة الدراسية: ${sYear}</span><span>الجمهورية الجزائرية الديمقراطية الشعبية<br>وزارة التربية الوطنية</span></div>
    <h1>${title}</h1>
    ${tableHtml}
  </body></html>`;
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
}

async function printAllClasses() {
  const btn = document.getElementById("printAllClassesBtn");
  if (btn) { btn.disabled = true; btn.textContent = "جاري التحضير..."; }

  const { data: entries, error } = await db.from("timetable_entries").select("*, classes(name)").order("class_id");
  
  if (error) {
    if (typeof showToast === 'function') showToast("حدث خطأ أثناء جلب البيانات للطباعة");
    if (btn) { btn.disabled = false; btn.textContent = "🖨️ طباعة كل الأقسام (جماعي)"; }
    return;
  }

  const days = typeof TIMETABLE_DAYS !== 'undefined' ? TIMETABLE_DAYS : ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  const periods = typeof TIMETABLE_PERIODS !== 'undefined' ? TIMETABLE_PERIODS : [
    {slot:1, label:"الحصة 1", time:"08:00 - 09:00"},
    {slot:2, label:"الحصة 2", time:"09:00 - 10:00"},
    {slot:3, label:"الحصة 3", time:"10:00 - 11:00"},
    {slot:4, label:"الحصة 4", time:"11:00 - 12:00"},
    {slot:5, label:"الحصة 5", time:"13:00 - 14:00"},
    {slot:6, label:"الحصة 6", time:"14:00 - 15:00"},
    {slot:7, label:"الحصة 7", time:"15:00 - 16:00"},
    {slot:8, label:"الحصة 8", time:"16:00 - 17:00"}
  ];

  const classMap = {};
  allClasses.forEach(c => {
    classMap[c.id] = { name: c.name, entries: {} };
  });

  (entries || []).forEach(r => {
    if (classMap[r.class_id]) {
      classMap[r.class_id].entries[`${r.day_of_week}_${r.period_slot}`] = r;
    }
  });

  const sName = typeof SCHOOL_NAME !== 'undefined' ? SCHOOL_NAME : "برنامج الناظر";
  const sYear = typeof SCHOOL_YEAR !== 'undefined' ? SCHOOL_YEAR : "2026-2027";
  let allGridsHtml = "";

  Object.values(classMap).forEach(cls => {
    let tableHtml = "<table><thead><tr><th>اليوم</th>" + periods.map(p => `<th>${p.label}<br><small>${p.time}</small></th>`).join("") + "</tr></thead><tbody>";
    
    days.forEach((dayName, dow) => {
      tableHtml += `<tr><td class="day-label">${dayName}</td>`;
      periods.forEach(p => {
        const r = cls.entries[`${dow}_${p.slot}`] || {};
        tableHtml += `<td class="ro-cell">
          ${r.subject ? `<b>${r.subject}</b>` : ""}
          ${r.teacher_label ? `${r.teacher_label}<br>` : ""}
          ${r.room ? `<small>${r.room}</small>` : ""}
        </td>`;
      });
      tableHtml += "</tr>";
    });
    tableHtml += "</tbody></table>";

    allGridsHtml += `
      <div class="print-page">
        <div class="head">
          <span>${sName}<br>السنة الدراسية: ${sYear}</span>
          <span>الجمهورية الجزائرية الديمقراطية الشعبية<br>وزارة التربية الوطنية</span>
        </div>
        <h1>استعمال الزمن — قسم ${cls.name}</h1>
        ${tableHtml}
      </div>
    `;
  });

  let fullHtml = `
  <html dir="rtl" lang="ar"><head><meta charset="UTF-8">
  <title>استعمال الزمن - جميع الأقسام</title>
  <style>
    body { font-family: Arial, Tahoma, sans-serif; padding: 10px; color: #111; }
    .print-page { page-break-after: always; margin-bottom: 30px; }
    .print-page:last-child { page-break-after: avoid; }
    .head { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 14px; font-size: 12px; }
    h1 { font-size: 17px; text-align: center; margin: 6px 0 16px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #777; padding: 6px 4px; text-align: center; font-size: 11px; }
    th { background: #eee; }
    .ro-cell b { display: block; font-size: 11.5px; }
    @media print {
      body { padding: 0; }
      .print-page { page-break-after: always; height: 98vh; display: flex; flex-direction: column; justify-content: flex-start; }
    }
  </style></head><body>
    ${allGridsHtml}
  </body></html>`;

  const w = window.open("", "_blank");
  w.document.write(fullHtml);
  w.document.close();
  
  if (btn) { btn.disabled = false; btn.textContent = "🖨️ طباعة كل الأقسام (جماعي)"; }
}

const printClassBtn = document.getElementById("printClassBtn");
if (printClassBtn) {
  printClassBtn.onclick = () => {
    const cname = allClasses.find(c => c.id === selectedClassId);
    printGrid(`استعمال الزمن — قسم ${cname ? cname.name : ""}`, "classGrid");
  };
}

const printTeacherBtn = document.getElementById("printTeacherBtn");
if (printTeacherBtn) {
  printTeacherBtn.onclick = () => {
    printGrid(`استعمال الزمن — الأستاذ ${document.getElementById("teacherSelect").value}`, "teacherGrid");
  };
}

const printRoomBtn = document.getElementById("printRoomBtn");
if (printRoomBtn) {
  printRoomBtn.onclick = () => {
    printGrid(`استعمال الزمن — ${document.getElementById("roomSelect").value}`, "roomGrid");
  };
}

const printAllClassesBtn = document.getElementById("printAllClassesBtn");
if (printAllClassesBtn) printAllClassesBtn.onclick = printAllClasses;

let parsedRows = [];
const importFileEl = document.getElementById("importFile");
if (importFileEl) {
  importFileEl.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const status = document.getElementById("importStatus");
    if (status) { status.style.display = "block"; status.textContent = "جاري القراءة..."; }

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
    if (status) status.style.display = "none";
    
    const preview = document.getElementById("importPreview");
    if (preview) preview.style.display = "block";
    
    const summary = document.getElementById("importSummary");
    if (summary) {
      summary.innerHTML =
        `تم العثور على <b>${parsedRows.length}</b> خانة صالحة.` +
        (unmatched.length ? `<br><span style="color:var(--absent);">تحذير: ${unmatched.length} خانة قسمها غير معروف وستُتجاهل (تأكد أن اسم القسم مطابق تماماً).</span>` : "");
    }
  });
}

const confirmImportBtnEl = document.getElementById("confirmImportBtn");
if (confirmImportBtnEl) {
  confirmImportBtnEl.addEventListener("click", async () => {
    const btn = document.getElementById("confirmImportBtn");
    btn.disabled = true; btn.textContent = "جاري الاستيراد...";
    const valid = parsedRows.filter(r => r.class_id).map(({ className, ...rest }) => rest);

    let done = 0;
    for (let i = 0; i < valid.length; i += 200) {
      const chunk = valid.slice(i, i + 200);
      const { error } = await db.from("timetable_entries").upsert(chunk, { onConflict: "class_id,day_of_week,period_slot,group_label" });
      if (error) { if (typeof showToast === 'function') showToast("حدث خطأ أثناء الاستيراد"); btn.disabled = false; btn.textContent = "تأكيد الاستيراد"; return; }
      done += chunk.length;
    }
    if (typeof showToast === 'function') showToast(`تم استيراد ${done} خانة بنجاح ✓`);
    btn.disabled = false; btn.textContent = "تأكيد الاستيراد";
    document.getElementById("importPreview").style.display = "none";
    document.getElementById("importFile").value = "";
    if (selectedClassId) loadClassGrid();
  });
}

init();
