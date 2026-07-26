/* ===================== Data model ===================== */

const STORAGE_KEY = "gastos_app_data_v1";

const CATEGORIES = [
  { id: "comida", name: "Comida", emoji: "🍔", color: "#ff8a5c" },
  { id: "transporte", name: "Transporte", emoji: "🚗", color: "#6c8dff" },
  { id: "vivienda", name: "Vivienda", emoji: "🏠", color: "#4bd9c0" },
  { id: "entretenimiento", name: "Entretenimiento", emoji: "🎬", color: "#c084fc" },
  { id: "salud", name: "Salud", emoji: "💊", color: "#ff6b7a" },
  { id: "compras", name: "Compras", emoji: "🛍️", color: "#ffd166" },
  { id: "servicios", name: "Servicios", emoji: "🧾", color: "#5eead4" },
  { id: "otros", name: "Otros", emoji: "📦", color: "#93a2c6" },
];

const INCOME_CATEGORIES = [
  { id: "salario", name: "Salario", emoji: "💼", color: "#4bd9c0" },
  { id: "freelance", name: "Freelance", emoji: "💻", color: "#6c8dff" },
  { id: "regalo", name: "Regalo", emoji: "🎁", color: "#ffd166" },
  { id: "inversion", name: "Inversión", emoji: "📈", color: "#5eead4" },
  { id: "otro_ingreso", name: "Otro ingreso", emoji: "💰", color: "#93a2c6" },
];

const DEMO_BANKS = [
  { id: "bancolombia", name: "Bancolombia", emoji: "🏦" },
  { id: "davivienda", name: "Davivienda", emoji: "🏛️" },
  { id: "bbva", name: "BBVA", emoji: "🏢" },
  { id: "nu", name: "Nu", emoji: "💜" },
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtMoney(n) {
  const sign = n < 0 ? "-" : "";
  return sign + "$" + Math.abs(Math.round(n)).toLocaleString("es-CO");
}

// Live thousands-separator formatting for plain-number text inputs (type="number"
// inputs can't show "1.000.000" while typing, so these use type="text" instead).
function attachThousandsInput(input, allowNegative) {
  input.addEventListener("input", () => {
    const raw = input.value;
    const negative = !!allowNegative && raw.trim().startsWith("-");
    const digits = raw.replace(/\D/g, "");
    input.value = digits ? (negative ? "-" : "") + parseInt(digits, 10).toLocaleString("es-CO") : (negative ? "-" : "");
  });
}

function getNumericInputValue(input) {
  const raw = input.value;
  const negative = raw.trim().startsWith("-");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return NaN;
  const n = parseInt(digits, 10);
  return negative ? -n : n;
}

function setNumericInputValue(input, value) {
  input.value = Number.isFinite(value) ? Math.round(value).toLocaleString("es-CO") : "";
}

/* ===================== Storage ===================== */

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* corrupt data, fall through to fresh state */ }
  return null;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function makeDemoState() {
  const accounts = [
    { id: uid(), bankId: "bancolombia", bankName: "Bancolombia", type: "Cuenta de ahorros", nickname: "Cuenta principal", balance: 3250000, emoji: "🏦" },
    { id: uid(), bankId: "nu", bankName: "Nu", type: "Tarjeta de crédito", nickname: "Tarjeta Nu", balance: -420000, emoji: "💜" },
    { id: uid(), bankId: "manual", bankName: "Manual", type: "Efectivo", nickname: "Efectivo", balance: 150000, emoji: "💵" },
  ];

  const sampleDesc = {
    comida: ["Supermercado", "Restaurante", "Domicilio comida", "Café"],
    transporte: ["Gasolina", "Uber", "Parqueadero", "Peaje"],
    vivienda: ["Arriendo", "Administración", "Ferretería"],
    entretenimiento: ["Cine", "Streaming", "Bar"],
    salud: ["Droguería", "Consulta médica"],
    compras: ["Ropa", "Tecnología", "Regalo"],
    servicios: ["Internet", "Celular", "Luz", "Agua"],
    otros: ["Varios", "Comisión bancaria"],
  };

  const transactions = [];
  const now = new Date();
  for (let d = 0; d < 45; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const numTx = Math.random() < 0.7 ? 1 : (Math.random() < 0.5 ? 0 : 2);
    for (let i = 0; i < numTx; i++) {
      const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const descs = sampleDesc[cat.id];
      const desc = descs[Math.floor(Math.random() * descs.length)];
      const acc = accounts[Math.floor(Math.random() * (accounts.length - 1))]; // skip cash mostly
      const base = { comida: 45000, transporte: 25000, vivienda: 900000, entretenimiento: 60000, salud: 80000, compras: 120000, servicios: 150000, otros: 30000 }[cat.id];
      const amount = Math.round(base * (0.4 + Math.random() * 1.2));
      transactions.push({
        id: uid(),
        date: date.toISOString().slice(0, 10),
        amount,
        desc,
        categoryId: cat.id,
        accountId: acc.id,
        source: "bank",
        type: "expense",
      });
    }
  }

  // recurring income (salary every ~15 days) plus an occasional extra
  for (let d = 0; d < 45; d += 15) {
    const date = new Date(now); date.setDate(date.getDate() - d);
    transactions.push({
      id: uid(),
      date: date.toISOString().slice(0, 10),
      amount: Math.round(2200000 + Math.random() * 600000),
      desc: "Salario",
      categoryId: "salario",
      accountId: accounts[0].id,
      source: "bank",
      type: "income",
    });
  }
  if (Math.random() < 0.6) {
    const date = new Date(now); date.setDate(date.getDate() - Math.floor(Math.random() * 45));
    transactions.push({
      id: uid(),
      date: date.toISOString().slice(0, 10),
      amount: Math.round(300000 + Math.random() * 500000),
      desc: "Proyecto freelance",
      categoryId: "freelance",
      accountId: accounts[0].id,
      source: "bank",
      type: "income",
    });
  }

  return { accounts, transactions };
}

let state = loadState() || { accounts: [], transactions: [] };
if (!loadState()) saveState();
state.transactions.forEach(t => { t.type = t.type || "expense"; });
state.history = state.history || [];

/* ===================== Helpers ===================== */

function categoryById(id) {
  return CATEGORIES.find(c => c.id === id) || INCOME_CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}
function accountById(id) {
  return state.accounts.find(a => a.id === id);
}

function balanceDelta(tx) {
  return tx.type === "income" ? tx.amount : 0;
}

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function startOfWeek(d) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  return x;
}
function startOfMonth(d) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

function periodRange(period) {
  const now = new Date();
  let start, prevStart, prevEnd;
  if (period === "day") {
    start = startOfDay(now);
    prevEnd = new Date(start);
    prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 1);
  } else if (period === "week") {
    start = startOfWeek(now);
    prevEnd = new Date(start);
    prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 7);
  } else {
    start = startOfMonth(now);
    prevEnd = new Date(start);
    prevStart = new Date(start); prevStart.setMonth(prevStart.getMonth() - 1);
  }
  return { start, end: new Date(now.getTime() + 86400000), prevStart, prevEnd };
}

function txInRange(tx, start, end) {
  const d = new Date(tx.date + "T00:00:00");
  return d >= start && d < end;
}

/* ===================== Rendering: Home ===================== */

let currentPeriod = "day";
let charts = {};

function renderHome() {
  const { start, end } = periodRange(currentPeriod);
  const current = state.transactions.filter(t => txInRange(t, start, end));

  const income = state.accounts.reduce((s, a) => s + a.balance, 0);
  const expense = current.filter(t => t.type !== "income").reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  document.getElementById("statIncome").textContent = fmtMoney(income);
  document.getElementById("statExpense").textContent = fmtMoney(expense);
  const balanceEl = document.getElementById("statBalance");
  balanceEl.textContent = fmtMoney(net);
  balanceEl.style.color = net < 0 ? "var(--danger)" : "var(--safe)";

  renderAccountsRow();
  renderCategoryChart(current.filter(t => t.type !== "income"));
  renderTrendChart();
  renderRecentList(current);
  renderHistoryList();
}

function renderAccountsRow() {
  const row = document.getElementById("accountsRow");
  row.innerHTML = "";
  state.accounts.forEach(acc => {
    const div = document.createElement("div");
    div.className = "account-chip";
    div.innerHTML = `
      <div class="bank">${acc.emoji} ${acc.nickname}</div>
      <div class="balance">${fmtMoney(acc.balance)}</div>
    `;
    row.appendChild(div);
  });
}

function renderCategoryChart(transactions) {
  const totals = {};
  transactions.forEach(t => { totals[t.categoryId] = (totals[t.categoryId] || 0) + t.amount; });
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const grandTotal = entries.reduce((s, [, v]) => s + v, 0);

  const canvas = document.getElementById("categoryChart");
  const ctx = canvas.getContext("2d");
  setupCanvasSize(canvas);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const legend = document.getElementById("categoryLegend");
  legend.innerHTML = "";

  if (entries.length === 0) {
    ctx.fillStyle = "#93a2c6";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Sin gastos en este periodo", canvas.width / (2 * dpr()), canvas.height / (2 * dpr()));
    return;
  }

  const cw = canvas.width / dpr();
  const ch = canvas.height / dpr();
  const cx = cw / 2, cy = ch / 2;
  const radius = Math.min(cw, ch) / 2 - 14;
  let angle = -Math.PI / 2;

  entries.forEach(([catId, val]) => {
    const cat = categoryById(catId);
    const slice = (val / grandTotal) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = cat.color;
    ctx.fill();
    angle += slice;

    const li = document.createElement("div");
    li.className = "legend-item";
    const pct = ((val / grandTotal) * 100).toFixed(0);
    li.innerHTML = `<span class="legend-dot" style="background:${cat.color}"></span>${cat.emoji} ${cat.name} · ${pct}%`;
    legend.appendChild(li);
  });

  // donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--surface") || "#131c2e";
  ctx.fill();
}

function renderTrendChart() {
  const canvas = document.getElementById("trendChart");
  const ctx = canvas.getContext("2d");
  setupCanvasSize(canvas);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const days = 14;
  const now = startOfDay(new Date());
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const total = state.transactions.filter(t => t.type !== "income" && txInRange(t, d, next)).reduce((s, t) => s + t.amount, 0);
    buckets.push({ date: d, total });
  }

  const cw = canvas.width / dpr();
  const ch = canvas.height / dpr();
  const padding = 16;
  const max = Math.max(...buckets.map(b => b.total), 1);
  const barW = (cw - padding * 2) / days * 0.6;
  const gap = (cw - padding * 2) / days;

  buckets.forEach((b, i) => {
    const h = (b.total / max) * (ch - padding * 2);
    const x = padding + i * gap + (gap - barW) / 2;
    const y = ch - padding - h;
    ctx.fillStyle = "#6c8dff";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, barW, Math.max(h, 2), 3);
    else ctx.rect(x, y, barW, Math.max(h, 2));
    ctx.fill();
  });
}

function dpr() { return window.devicePixelRatio || 1; }
function setupCanvasSize(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = dpr();
  canvas.width = rect.width * ratio;
  canvas.height = (canvas.height && canvas.getAttribute("height") ? parseInt(canvas.getAttribute("height")) : rect.height) * ratio;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function txItemHTML(t, actions) {
  const cat = categoryById(t.categoryId);
  const acc = accountById(t.accountId);
  const actionsHTML = actions ? `
    <div class="tx-actions">
      <button class="tx-action-btn" data-edit-tx="${t.id}">Editar</button>
      <button class="tx-action-btn danger" data-delete-tx="${t.id}">Eliminar</button>
    </div>
  ` : "";
  return `
    <div class="tx-item">
      <div class="tx-icon" style="background:${cat.color}22;color:${cat.color}">${cat.emoji}</div>
      <div class="tx-info">
        <div class="tx-desc">${escapeHTML(t.desc)}</div>
        <div class="tx-meta">${cat.name} · ${acc ? acc.nickname : "—"} · ${t.date}</div>
      </div>
      <div class="tx-right">
        <div class="tx-amount${t.type === "income" ? " income" : ""}">${t.type === "income" ? "+" : "-"}${fmtMoney(t.amount)}</div>
        ${actionsHTML}
      </div>
    </div>
  `;
}

function escapeHTML(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function renderRecentList(currentPeriodTx) {
  const list = document.getElementById("recentList");
  const sorted = [...currentPeriodTx].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  if (sorted.length === 0) {
    list.innerHTML = `<div class="empty-state">No hay movimientos en este periodo.</div>`;
    return;
  }
  list.innerHTML = sorted.map(t => txItemHTML(t, false)).join("");
}

/* ===================== Saved history ===================== */

function renderHistoryList() {
  const container = document.getElementById("historyList");
  const entries = state.history || [];
  if (entries.length === 0) {
    container.innerHTML = `<div class="empty-state">Aún no has guardado historial.</div>`;
    return;
  }
  container.innerHTML = [...entries].sort((a, b) => b.savedAt.localeCompare(a.savedAt)).map(h => `
    <div class="history-item" data-history-id="${h.id}">
      <div>
        <div class="hname">${escapeHTML(h.name)}</div>
        <div class="hrange">${h.startDate} → ${h.endDate}</div>
      </div>
      <div class="hcount">${h.transactions.length} mov.</div>
    </div>
  `).join("");
  container.querySelectorAll("[data-history-id]").forEach(el => {
    el.addEventListener("click", () => openViewHistoryModal(el.getAttribute("data-history-id")));
  });
}

document.getElementById("btnSaveHistory").addEventListener("click", () => {
  document.getElementById("histName").value = "";
  document.getElementById("histStart").value = todayISO();
  document.getElementById("histEnd").value = todayISO();
  document.getElementById("modalSaveHistory").classList.remove("hidden");
});
document.getElementById("btnCancelSaveHistory").addEventListener("click", () => {
  document.getElementById("modalSaveHistory").classList.add("hidden");
});

document.getElementById("formSaveHistory").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("histName").value.trim();
  const startDate = document.getElementById("histStart").value;
  const endDate = document.getElementById("histEnd").value;
  if (!name || !startDate || !endDate) return;
  if (startDate > endDate) {
    showToast("La fecha 'Desde' debe ser anterior o igual a 'Hasta'");
    return;
  }

  const matching = state.transactions.filter(t => t.date >= startDate && t.date <= endDate);
  state.history.push({
    id: uid(),
    name,
    startDate,
    endDate,
    savedAt: todayISO(),
    transactions: JSON.parse(JSON.stringify(matching)),
  });
  saveState();
  document.getElementById("modalSaveHistory").classList.add("hidden");
  renderHistoryList();
  showToast(`Historial "${name}" guardado (${matching.length} movimientos)`);
});

function openViewHistoryModal(id) {
  const h = state.history.find(x => x.id === id);
  if (!h) return;
  document.getElementById("viewHistoryTitle").textContent = h.name;
  document.getElementById("viewHistoryRange").textContent = `${h.startDate} → ${h.endDate} · ${h.transactions.length} movimientos`;
  const list = document.getElementById("viewHistoryList");
  if (h.transactions.length === 0) {
    list.innerHTML = `<div class="empty-state">No hay movimientos en este rango.</div>`;
  } else {
    list.innerHTML = [...h.transactions].sort((a, b) => b.date.localeCompare(a.date)).map(t => txItemHTML(t, false)).join("");
  }
  document.getElementById("modalViewHistory").dataset.historyId = id;
  document.getElementById("modalViewHistory").classList.remove("hidden");
}
document.getElementById("btnCloseViewHistory").addEventListener("click", () => {
  document.getElementById("modalViewHistory").classList.add("hidden");
});
document.getElementById("btnDeleteHistory").addEventListener("click", () => {
  const id = document.getElementById("modalViewHistory").dataset.historyId;
  showConfirm("¿Eliminar este historial guardado? Los movimientos originales no se ven afectados.", () => {
    state.history = state.history.filter(h => h.id !== id);
    saveState();
    document.getElementById("modalViewHistory").classList.add("hidden");
    renderHistoryList();
    showToast("Historial eliminado");
  });
});

/* ===================== Transactions view ===================== */

function populateFilterSelects() {
  const catSel = document.getElementById("filterCategory");
  const accSel = document.getElementById("filterAccount");
  catSel.innerHTML = `<option value="">Todas las categorías</option>` +
    CATEGORIES.concat(INCOME_CATEGORIES).map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join("");
  accSel.innerHTML = `<option value="">Todas las cuentas</option>` +
    state.accounts.map(a => `<option value="${a.id}">${a.nickname}</option>`).join("");
}

function renderAllTx() {
  const catFilter = document.getElementById("filterCategory").value;
  const accFilter = document.getElementById("filterAccount").value;
  let list = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date));
  if (catFilter) list = list.filter(t => t.categoryId === catFilter);
  if (accFilter) list = list.filter(t => t.accountId === accFilter);

  const container = document.getElementById("allTxList");
  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state">No hay movimientos.</div>`;
    return;
  }
  container.innerHTML = list.map(t => txItemHTML(t, true)).join("");

  container.querySelectorAll("[data-edit-tx]").forEach(btn => {
    btn.addEventListener("click", () => openEditTxModal(btn.getAttribute("data-edit-tx")));
  });
  container.querySelectorAll("[data-delete-tx]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-delete-tx");
      showConfirm("¿Eliminar este movimiento? Si afectaba el saldo de una cuenta, se le devolverá el monto.", () => {
        deleteTransaction(id);
        renderAllTx();
        renderHome();
        renderAccountsView();
        showToast("Movimiento eliminado");
      });
    });
  });
}

function deleteTransaction(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  const acc = accountById(tx.accountId);
  if (acc) acc.balance -= balanceDelta(tx);
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveState();
}

/* ===================== Accounts view ===================== */

function renderAccountsView() {
  const list = document.getElementById("accountsList");
  if (state.accounts.length === 0) {
    list.innerHTML = `<div class="empty-state">No tienes cuentas conectadas.</div>`;
    return;
  }
  list.innerHTML = state.accounts.map(acc => `
    <div class="account-card">
      <div class="emoji">${acc.emoji}</div>
      <div class="info">
        <div class="name">${escapeHTML(acc.nickname)}</div>
        <div class="type">${escapeHTML(acc.bankName)} · ${escapeHTML(acc.type)}</div>
      </div>
      <div class="balwrap">
        <div class="bal">${fmtMoney(acc.balance)}</div>
        <button class="edit-btn" data-edit-account="${acc.id}">Ajustar saldo</button>
      </div>
      <button class="remove-btn" data-remove-account="${acc.id}" aria-label="Eliminar cuenta">✕</button>
    </div>
  `).join("");

  list.querySelectorAll("[data-remove-account]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-remove-account");
      showConfirm("¿Desconectar esta cuenta? Sus movimientos se conservarán.", () => {
        state.accounts = state.accounts.filter(a => a.id !== id);
        saveState();
        renderAccountsView();
        populateFilterSelects();
        renderHome();
        showToast("Cuenta desconectada");
      });
    });
  });

  list.querySelectorAll("[data-edit-account]").forEach(btn => {
    btn.addEventListener("click", () => {
      openEditBalanceModal(btn.getAttribute("data-edit-account"));
    });
  });
}

function openBankModal() {
  const opts = document.getElementById("bankOptions");
  opts.innerHTML = DEMO_BANKS.map(b => `
    <div class="bank-option" data-bank="${b.id}">
      <div class="emoji">${b.emoji}</div>
      <div>
        <div class="bname">${b.name}</div>
        <div class="btype">Simulado · toca para conectar</div>
      </div>
    </div>
  `).join("") + `
    <div class="bank-option other" data-bank="other">
      <div class="emoji">➕</div>
      <div>
        <div class="bname">Otro</div>
        <div class="btype">Agregar un banco o cuenta que no está en la lista</div>
      </div>
    </div>
  `;
  opts.querySelectorAll("[data-bank]").forEach(el => {
    el.addEventListener("click", () => {
      const bankId = el.getAttribute("data-bank");
      document.getElementById("modalBank").classList.add("hidden");
      if (bankId === "other") {
        openCustomAccountModal();
      } else {
        const bank = DEMO_BANKS.find(b => b.id === bankId);
        openCustomAccountModal(bank);
      }
    });
  });
  document.getElementById("modalBank").classList.remove("hidden");
}

let customAccountEmoji = "🏦";

function openCustomAccountModal(prefillBank) {
  document.getElementById("customAccountTitle").textContent = prefillBank ? `Conectar ${prefillBank.name}` : "Agregar cuenta";
  document.getElementById("caName").value = prefillBank ? prefillBank.name : "";
  document.getElementById("caType").value = "Cuenta de ahorros";
  document.getElementById("caBalance").value = "";
  customAccountEmoji = prefillBank ? prefillBank.emoji : "🏦";
  document.getElementById("modalCustomAccount").classList.remove("hidden");
}

document.getElementById("formCustomAccount").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("caName").value.trim();
  const type = document.getElementById("caType").value;
  const balance = getNumericInputValue(document.getElementById("caBalance"));
  if (!name || isNaN(balance)) return;

  state.accounts.push({
    id: uid(),
    bankId: "manual",
    bankName: name,
    type,
    nickname: name,
    balance,
    emoji: customAccountEmoji,
  });
  saveState();
  document.getElementById("modalCustomAccount").classList.add("hidden");
  renderAccountsView();
  populateFilterSelects();
  renderHome();
  showToast("Cuenta agregada");
});
document.getElementById("btnCancelCustomAccount").addEventListener("click", () => {
  document.getElementById("modalCustomAccount").classList.add("hidden");
});

function openEditBalanceModal(accountId) {
  const acc = accountById(accountId);
  if (!acc) return;
  document.getElementById("ebAccountName").textContent = `${acc.emoji} ${acc.nickname}`;
  setNumericInputValue(document.getElementById("ebBalance"), acc.balance);
  document.getElementById("formEditBalance").dataset.accountId = accountId;
  document.getElementById("modalEditBalance").classList.remove("hidden");
}

document.getElementById("formEditBalance").addEventListener("submit", (e) => {
  e.preventDefault();
  const accountId = document.getElementById("formEditBalance").dataset.accountId;
  const acc = accountById(accountId);
  const newBalance = getNumericInputValue(document.getElementById("ebBalance"));
  if (!acc || isNaN(newBalance)) return;

  acc.balance = newBalance;
  saveState();
  document.getElementById("modalEditBalance").classList.add("hidden");
  renderAccountsView();
  renderHome();
  showToast("Saldo actualizado");
});
document.getElementById("btnCancelEditBalance").addEventListener("click", () => {
  document.getElementById("modalEditBalance").classList.add("hidden");
});

/* ===================== Add expense modal ===================== */

let editingTxId = null;

function setFormType(type) {
  document.getElementById("fType").value = type;
  document.querySelectorAll(".type-btn").forEach(b => b.classList.toggle("active", b.dataset.type === type));
  const catSel = document.getElementById("fCategory");
  const cats = type === "income" ? INCOME_CATEGORIES : CATEGORIES;
  catSel.innerHTML = cats.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join("");
}

function populateAddForm(tx) {
  const accSel = document.getElementById("fAccount");
  accSel.innerHTML = state.accounts.map(a => `<option value="${a.id}">${a.nickname}</option>`).join("");

  const type = tx ? (tx.type || "expense") : "expense";
  setFormType(type);

  if (tx) {
    document.getElementById("addModalTitle").textContent = type === "income" ? "Editar ingreso" : "Editar gasto";
    setNumericInputValue(document.getElementById("fAmount"), tx.amount);
    document.getElementById("fDesc").value = tx.desc;
    document.getElementById("fCategory").value = tx.categoryId;
    document.getElementById("fAccount").value = tx.accountId;
    document.getElementById("fDate").value = tx.date;
  } else {
    document.getElementById("addModalTitle").textContent = "Nuevo movimiento";
    document.getElementById("fDate").value = todayISO();
    document.getElementById("fAmount").value = "";
    document.getElementById("fDesc").value = "";
  }
}

document.querySelectorAll(".type-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    setFormType(btn.dataset.type);
    if (editingTxId) {
      document.getElementById("addModalTitle").textContent = btn.dataset.type === "income" ? "Editar ingreso" : "Editar gasto";
    }
  });
});

function openEditTxModal(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  editingTxId = id;
  populateAddForm(tx);
  document.getElementById("modalAdd").classList.remove("hidden");
}

document.getElementById("formAdd").addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = getNumericInputValue(document.getElementById("fAmount"));
  const desc = document.getElementById("fDesc").value.trim();
  const categoryId = document.getElementById("fCategory").value;
  const accountId = document.getElementById("fAccount").value;
  const date = document.getElementById("fDate").value;
  const type = document.getElementById("fType").value;
  if (!amount || amount <= 0 || !desc || !date) return;

  if (editingTxId) {
    const tx = state.transactions.find(t => t.id === editingTxId);
    if (tx) {
      const oldAcc = accountById(tx.accountId);
      if (oldAcc) oldAcc.balance -= balanceDelta(tx);
      tx.amount = amount;
      tx.desc = desc;
      tx.categoryId = categoryId;
      tx.accountId = accountId;
      tx.date = date;
      tx.type = type;
      tx.source = "manual";
      const newAcc = accountById(accountId);
      if (newAcc) newAcc.balance += balanceDelta(tx);
    }
    editingTxId = null;
    showToast(type === "income" ? "Ingreso actualizado" : "Gasto actualizado");
  } else {
    const tx = { id: uid(), date, amount, desc, categoryId, accountId, source: "manual", type };
    state.transactions.push(tx);
    const acc = accountById(accountId);
    if (acc) acc.balance += balanceDelta(tx);
    showToast(type === "income" ? "Ingreso guardado" : "Gasto guardado");
  }

  saveState();
  document.getElementById("modalAdd").classList.add("hidden");
  renderHome();
  renderAllTx();
  renderAccountsView();
});

/* ===================== Navigation ===================== */

function switchView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById("view-" + name).classList.remove("hidden");
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === name));
  if (name === "transactions") renderAllTx();
  if (name === "accounts") renderAccountsView();
  if (name === "home") renderHome();
}

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

document.querySelectorAll(".period-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".period-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    currentPeriod = tab.dataset.period;
    renderHome();
  });
});

document.getElementById("btnViewAll").addEventListener("click", () => switchView("transactions"));

document.getElementById("btnSettings").addEventListener("click", () => switchView("settings"));

document.getElementById("btnAdd").addEventListener("click", () => {
  editingTxId = null;
  populateAddForm();
  document.getElementById("modalAdd").classList.remove("hidden");
});
document.getElementById("btnCancelAdd").addEventListener("click", () => {
  editingTxId = null;
  document.getElementById("modalAdd").classList.add("hidden");
});

document.getElementById("btnConnectBank").addEventListener("click", openBankModal);
document.getElementById("btnCancelBank").addEventListener("click", () => {
  document.getElementById("modalBank").classList.add("hidden");
});

document.getElementById("filterCategory").addEventListener("change", renderAllTx);
document.getElementById("filterAccount").addEventListener("change", renderAllTx);

document.getElementById("btnResetDemo").addEventListener("click", () => {
  showConfirm("Esto reemplazará tus datos actuales con datos de demostración nuevos. ¿Continuar?", () => {
    state = makeDemoState();
    state.history = [];
    saveState();
    populateFilterSelects();
    renderHome();
    renderAccountsView();
    renderAllTx();
    showToast("Datos de demo restablecidos");
  });
});
document.getElementById("btnClearAll").addEventListener("click", () => {
  showConfirm("Esto borrará TODOS tus datos (cuentas, movimientos e historial guardado). ¿Continuar?", () => {
    state = { accounts: [], transactions: [], history: [] };
    saveState();
    populateFilterSelects();
    renderHome();
    renderAccountsView();
    renderAllTx();
    showToast("Datos borrados");
  });
});

let confirmCallback = null;
function showConfirm(message, onConfirm) {
  document.getElementById("confirmMessage").textContent = message;
  confirmCallback = onConfirm;
  document.getElementById("modalConfirm").classList.remove("hidden");
}
document.getElementById("btnConfirmOk").addEventListener("click", () => {
  document.getElementById("modalConfirm").classList.add("hidden");
  const cb = confirmCallback;
  confirmCallback = null;
  if (cb) cb();
});
document.getElementById("btnConfirmCancel").addEventListener("click", () => {
  document.getElementById("modalConfirm").classList.add("hidden");
  confirmCallback = null;
});

let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 2200);
}

/* ===================== Init ===================== */

function init() {
  attachThousandsInput(document.getElementById("fAmount"), false);
  attachThousandsInput(document.getElementById("caBalance"), true);
  attachThousandsInput(document.getElementById("ebBalance"), true);

  populateFilterSelects();
  renderHome();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  let lastResizeWidth = window.innerWidth;
  let resizeTimer;
  window.addEventListener("resize", () => {
    // Mobile browsers fire "resize" when the address bar hides/shows during scroll,
    // which changes innerHeight but not innerWidth — ignore those so charts don't
    // get wiped and redrawn (canvas.width reset) on every scroll tick.
    if (window.innerWidth === lastResizeWidth) return;
    lastResizeWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderHome(), 200);
  });
}

init();
