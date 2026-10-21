// ============ COSTANTI ============
const DEFAULT_CATEGORIES = [
  {
    id: "cat1",
    name: "Alimentari",
    icon: "🛒",
    color: "#10b981",
    type: "expense",
  },
  {
    id: "cat2",
    name: "Trasporti",
    icon: "🚗",
    color: "#3b82f6",
    type: "expense",
  },
  {
    id: "cat3",
    name: "Bollette",
    icon: "💡",
    color: "#f59e0b",
    type: "expense",
  },
  { id: "cat4", name: "Svago", icon: "🎬", color: "#a855f7", type: "expense" },
  {
    id: "cat5",
    name: "Stipendio",
    icon: "💼",
    color: "#10b981",
    type: "income",
  },
  { id: "cat6", name: "Altro", icon: "📦", color: "#64748b", type: "expense" },
];
const DEFAULT_ACCOUNTS = [
  {
    id: "acc1",
    name: "Conto Corrente",
    icon: "",
    color: "#4f46e5",
    balance: 0,
  },
  { id: "acc2", name: "Carta Visa", icon: "💳", color: "#0ea5e9", balance: 0 },
];

const MONTHS_IT = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
];

// ============ STATO ============
let state = {
  users: JSON.parse(localStorage.getItem("abt_users")) || [],
  currentUser: localStorage.getItem("abt_currentUser") || null,
  currentSection: "dashboard",
  currentType: "income",
  currentCatType: "expense",
  currentDebtType: "debt",
  currentViewId: null,
  pendingUserSwitch: null,
};

// ============ UTILS ============
const $ = (id) => document.getElementById(id);
const save = () =>
  localStorage.setItem("abt_users", JSON.stringify(state.users));
const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const formatMoney = (n) => "€ " + n.toFixed(2).replace(".", ",");
const formatDate = (d) =>
  new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const hashPwd = (p) => btoa(unescape(encodeURIComponent(p)));

function getUserData(userId) {
  const data = JSON.parse(localStorage.getItem(`abt_data_${userId}`));
  if (data) return data;
  return {
    movements: [],
    categories: [...DEFAULT_CATEGORIES],
    accounts: [...DEFAULT_ACCOUNTS],
    debts: [],
  };
}
function saveUserData(userId, data) {
  localStorage.setItem(`abt_data_${userId}`, JSON.stringify(data));
}
function getCurrentData() {
  return state.currentUser ? getUserData(state.currentUser) : null;
}
function saveCurrentData(data) {
  if (state.currentUser) saveUserData(state.currentUser, data);
}
const getCategory = (id, data) =>
  data.categories.find((c) => c.id === id) || {
    name: "—",
    icon: "❓",
    color: "#94a3b8",
  };
const getAccount = (id, data) =>
  data.accounts.find((a) => a.id === id) || {
    name: "—",
    icon: "—",
    color: "#94a3b8",
  };
const getUser = (id) => state.users.find((u) => u.id === id);

// ============ TEMA ============
function initTheme() {
  const saved = localStorage.getItem("abt_theme") || "light";
  applyTheme(saved);
}
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("abt_theme", theme);
  const isDark = theme === "dark";
  $("themeIconSidebar").className = isDark ? "fas fa-sun" : "fas fa-moon";
  $("themeLabelSidebar").textContent = isDark ? "Light Mode" : "Dark Mode";
  $("themeToggle").checked = isDark;
}
function toggleTheme() {
  const current =
    document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(current === "dark" ? "light" : "dark");
}
$("themeBtnSidebar").addEventListener("click", toggleTheme);
$("themeToggle").addEventListener("change", (e) =>
  applyTheme(e.target.checked ? "dark" : "light"),
);

// ============ NAVIGAZIONE ============
function navigateTo(section) {
  state.currentSection = section;
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.remove("active"));
  $("section-" + section).classList.add("active");
  document
    .querySelectorAll(".nav-link")
    .forEach((n) => n.classList.remove("active"));
  document
    .querySelectorAll(`.nav-link[data-section="${section}"]`)
    .forEach((n) => n.classList.add("active"));
  const titles = {
    dashboard: "Dashboard",
    movements: "Movimenti",
    categories: "Categorie",
    accounts: "Conti",
    debts: "Debiti & Crediti",
    settings: "Impostazioni",
  };
  $("pageTitle").textContent = titles[section];
  refreshCurrent();
  document.querySelector(".sidebar").classList.remove("open");
}
document
  .querySelectorAll(".nav-link")
  .forEach((btn) =>
    btn.addEventListener("click", () => navigateTo(btn.dataset.section)),
  );
document
  .querySelectorAll(".link-btn[data-goto]")
  .forEach((btn) =>
    btn.addEventListener("click", () => navigateTo(btn.dataset.goto)),
  );
$("menuToggle").addEventListener("click", () =>
  document.querySelector(".sidebar").classList.toggle("open"),
);

// ============ UTENTI ============
function updateUserDisplay() {
  const user = getUser(state.currentUser);
  if (user) {
    $("userAvatar").textContent = user.name.charAt(0).toUpperCase();
    $("userAvatar").style.background = user.color;
    $("userName").textContent = user.name;
  } else {
    $("userAvatar").textContent = "?";
    $("userAvatar").style.background = "#94a3b8";
    $("userName").textContent = "Nessun utente";
  }
}

$("userBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  $("userDropdown").classList.toggle("active");
  renderUserDropdown();
});

function renderUserDropdown() {
  const dropdown = $("userDropdown");
  if (state.users.length === 0) {
    dropdown.innerHTML =
      '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">Nessun utente</div>';
    return;
  }
  dropdown.innerHTML = state.users
    .map(
      (u) => `
        <div class="user-dropdown-item ${u.id === state.currentUser ? "active" : ""}" onclick="requestSwitchUser('${u.id}')">
            <div class="user-avatar" style="background:${u.color};width:28px;height:28px;font-size:12px">${u.name.charAt(0).toUpperCase()}</div>
            <span style="font-weight:600;font-size:14px">${u.name}</span>
        </div>
    `,
    )
    .join("");
}

window.requestSwitchUser = (userId) => {
  $("userDropdown").classList.remove("active");
  const user = getUser(userId);
  if (!user) return;
  if (user.password) {
    state.pendingUserSwitch = userId;
    $("loginUserName").textContent = user.name;
    $("loginPassword").value = "";
    $("loginError").textContent = "";
    $("loginModal").classList.add("active");
  } else {
    switchUser(userId);
  }
};

window.switchUser = (userId) => {
  state.currentUser = userId;
  localStorage.setItem("abt_currentUser", userId);
  updateUserDisplay();
  renderUsers();
  refreshCurrent();
};

window.deleteUser = (userId) => {
  if (!confirm("Eliminare questo utente e tutti i suoi dati?")) return;
  state.users = state.users.filter((u) => u.id !== userId);
  localStorage.removeItem(`abt_data_${userId}`);
  save();
  if (state.currentUser === userId) {
    state.currentUser = state.users.length > 0 ? state.users[0].id : null;
    localStorage.setItem("abt_currentUser", state.currentUser || "");
  }
  updateUserDisplay();
  renderUsers();
  refreshCurrent();
  updatePasswordStatus();
};

document.addEventListener("click", () =>
  $("userDropdown").classList.remove("active"),
);

$("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const user = getUser(state.pendingUserSwitch);
  if (!user) return;
  const pwd = hashPwd($("loginPassword").value);
  if (pwd === user.password) {
    $("loginModal").classList.remove("active");
    switchUser(state.pendingUserSwitch);
    state.pendingUserSwitch = null;
  } else {
    $("loginError").textContent = "Password errata";
  }
});
$("cancelLoginBtn").addEventListener("click", () => {
  $("loginModal").classList.remove("active");
  state.pendingUserSwitch = null;
});

function renderUsers() {
  const list = $("usersList");
  if (state.users.length === 0) {
    list.innerHTML =
      '<div class="empty-state"><i class="fas fa-users"></i><p>Nessun utente creato. Crea il tuo primo profilo!</p></div>';
    return;
  }
  list.innerHTML = state.users
    .map((u) => {
      const data = getUserData(u.id);
      const mvCount = data.movements.length;
      const isActive = u.id === state.currentUser;
      const hasPwd = !!u.password;
      return `
            <div class="user-item ${isActive ? "active" : ""}">
                <div class="user-avatar" style="background:${u.color};width:48px;height:48px;font-size:18px">${u.name.charAt(0).toUpperCase()}</div>
                <div class="user-item-info">
                    <div class="user-item-name">
                        ${u.name}
                        ${isActive ? '<span class="badge-active">Attivo</span>' : ""}
                        ${hasPwd ? '<i class="fas fa-lock icon-lock" title="Protetto da password"></i>' : ""}
                    </div>
                    <div class="user-item-stats">${mvCount} moviment${mvCount === 1 ? "o" : "i"} • ${data.debts.length} debit${data.debts.length === 1 ? "o" : "i"}/credit${data.debts.length === 1 ? "o" : "i"}</div>
                </div>
                <div class="user-item-actions">
                    ${!isActive ? `<button class="btn-use" onclick="requestSwitchUser('${u.id}')"><i class="fas fa-sign-in-alt"></i> Usa</button>` : '<button class="btn-use active-user"><i class="fas fa-check"></i> In uso</button>'}
                    <button class="btn-icon edit" onclick="editUser('${u.id}')" title="Modifica"><i class="fas fa-pen"></i></button>
                    <button class="btn-icon delete" onclick="deleteUser('${u.id}')" title="Elimina"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    })
    .join("");
}

window.editUser = (userId) => {
  const user = state.users.find((u) => u.id === userId);
  if (!user) return;
  $("userModalTitle").textContent = "Modifica Utente";
  $("userId").value = user.id;
  $("userNameInput").value = user.name;
  $("userColor").value = user.color;
  $("userPassword").value = "";
  $("userPassword").placeholder =
    "Lascia vuoto per mantenere la password attuale";
  $("userModal").classList.add("active");
};

$("addUserBtn").addEventListener("click", () => {
  $("userModalTitle").textContent = "Nuovo Utente";
  $("userForm").reset();
  $("userId").value = "";
  $("userColor").value = "#4f46e5";
  $("userPassword").placeholder = "Lascia vuoto per nessuna";
  $("userModal").classList.add("active");
});

$("userForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = $("userId").value || genId();
  const name = $("userNameInput").value.trim();
  const color = $("userColor").value;
  const pwdRaw = $("userPassword").value;

  const existing = state.users.findIndex((u) => u.id === id);
  if (existing !== -1) {
    const updated = { ...state.users[existing], name, color };
    if (pwdRaw) updated.password = hashPwd(pwdRaw);
    state.users[existing] = updated;
  } else {
    const newUser = { id, name, color };
    if (pwdRaw) newUser.password = hashPwd(pwdRaw);
    state.users.push(newUser);
    saveUserData(id, {
      movements: [],
      categories: [...DEFAULT_CATEGORIES],
      accounts: [...DEFAULT_ACCOUNTS],
      debts: [],
    });
  }
  save();
  if (!state.currentUser) {
    state.currentUser = id;
    localStorage.setItem("abt_currentUser", id);
  }
  updateUserDisplay();
  $("userModal").classList.remove("active");
  renderUsers();
  refreshCurrent();
  updatePasswordStatus();
});

// ============ PASSWORD ============
function updatePasswordStatus() {
  const user = getUser(state.currentUser);
  if (!user) {
    $("passwordStatus").textContent = "Nessun utente selezionato";
    return;
  }
  $("passwordStatus").textContent = user.password
    ? "🔒 Password attiva"
    : "Nessuna password impostata";
}

$("managePasswordBtn").addEventListener("click", () => {
  if (!state.currentUser) {
    alert("Seleziona prima un utente");
    return;
  }
  const user = getUser(state.currentUser);
  $("pwdModalTitle").textContent = user.password
    ? "Cambia Password"
    : "Imposta Password";
  $("pwdCurrent").value = "";
  $("pwdNew").value = "";
  $("pwdConfirm").value = "";
  $("pwdCurrent").parentElement.style.display = user.password
    ? "block"
    : "none";
  $("passwordModal").classList.add("active");
});

$("passwordForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const user = getUser(state.currentUser);
  if (!user) return;
  const currentRaw = $("pwdCurrent").value;
  const newRaw = $("pwdNew").value;
  const confirmRaw = $("pwdConfirm").value;

  if (user.password && hashPwd(currentRaw) !== user.password) {
    alert("Password attuale errata");
    return;
  }
  if (newRaw && newRaw !== confirmRaw) {
    alert("Le password non corrispondono");
    return;
  }

  if (newRaw) user.password = hashPwd(newRaw);
  else delete user.password;

  save();
  $("passwordModal").classList.remove("active");
  updatePasswordStatus();
  renderUsers();
});
$("cancelPwdBtn").addEventListener("click", () =>
  $("passwordModal").classList.remove("active"),
);

// ============ IMPORT/EXPORT/CLEAR ============
$("exportBtn").addEventListener("click", () => {
  const data = {
    users: state.users,
    theme: localStorage.getItem("abt_theme") || "light",
    userData: {},
  };
  state.users.forEach((u) => {
    data.userData[u.id] = getUserData(u.id);
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `abtracker_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

$("importBtn").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!confirm("Questo sostituirà tutti i dati attuali. Continuare?"))
        return;
      localStorage.clear();
      state.users = data.users || [];
      save();
      if (data.userData) {
        Object.keys(data.userData).forEach((uid) =>
          saveUserData(uid, data.userData[uid]),
        );
      }
      state.currentUser = state.users.length > 0 ? state.users[0].id : null;
      localStorage.setItem("abt_currentUser", state.currentUser || "");
      if (data.theme) applyTheme(data.theme);
      updateUserDisplay();
      renderUsers();
      refreshCurrent();
      updatePasswordStatus();
      alert("Dati importati con successo!");
    } catch (err) {
      alert("File non valido");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

$("clearAllBtn").addEventListener("click", () => {
  if (
    !confirm(
      "⚠️ ATTENZIONE: Questo eliminerà TUTTI gli utenti e i dati. Continuare?",
    )
  )
    return;
  if (!confirm("Sei davvero sicuro? Questa azione è irreversibile.")) return;
  localStorage.clear();
  state.users = [];
  state.currentUser = null;
  updateUserDisplay();
  renderUsers();
  refreshCurrent();
  updatePasswordStatus();
});

// ============ DASHBOARD (mese attuale) ============
function renderDashboard() {
  const data = getCurrentData();
  if (!data) {
    $("dashIncome").textContent = "€ 0,00";
    $("dashExpense").textContent = "€ 0,00";
    $("dashMovementsList").innerHTML =
      '<div class="empty-state"><i class="fas fa-user"></i><p>Vai in Impostazioni per creare il tuo primo profilo utente.</p></div>';
    $("dashMonthBadge").textContent = "Nessun utente";
    return;
  }

  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();
  $("dashMonthBadge").textContent = `${MONTHS_IT[curMonth]} ${curYear}`;

  const monthMovements = data.movements.filter((m) => {
    const d = new Date(m.date);
    return d.getMonth() === curMonth && d.getFullYear() === curYear;
  });

  const income = monthMovements
    .filter((m) => m.type === "income")
    .reduce((s, m) => s + m.amount, 0);
  const expense = monthMovements
    .filter((m) => m.type === "expense")
    .reduce((s, m) => s + m.amount, 0);

  $("dashIncome").textContent = formatMoney(income);
  $("dashExpense").textContent = formatMoney(expense);

  const list = $("dashMovementsList");
  const recent = [...monthMovements]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
  list.innerHTML = recent.length
    ? recent.map((m) => movementHTML(m, data)).join("")
    : '<div class="empty-state"><i class="fas fa-receipt"></i><p>Nessun movimento questo mese</p></div>';
  attachMovementListeners(list, data);
}

// ============ MOVIMENTI (tutti con filtri) ============
function movementHTML(m, data) {
  const cat = getCategory(m.categoryId, data);
  const acc = getAccount(m.accountId, data);
  const sign = m.type === "income" ? "+" : "-";
  return `
        <div class="movement-item" data-id="${m.id}">
            <div class="mv-icon ${m.type}">${cat.icon}</div>
            <div class="mv-info">
                <div class="mv-top">
                    <span class="mv-title">${m.description}</span>
                    <span class="mv-badge ${m.type}">${m.type === "income" ? "ENTRATA" : "USCITA"}</span>
                </div>
                <div class="mv-details">
                    <span class="cat-dot" style="background:${cat.color}"></span>
                    ${cat.name} • ${acc.name} • ${formatDate(m.date)}
                </div>
            </div>
            <div class="mv-amount ${m.type}">${sign} ${formatMoney(m.amount)}</div>
        </div>
    `;
}

function attachMovementListeners(container, data) {
  container.querySelectorAll(".movement-item").forEach((el) => {
    el.addEventListener("click", () => openViewModal(el.dataset.id, data));
  });
}

function populateMonthFilter(data) {
  const sel = $("filterMonth");
  const current = sel.value;
  sel.innerHTML =
    '<option value="all">Tutti i mesi</option>' +
    MONTHS_IT.map((m, i) => `<option value="${i}">${m}</option>`).join("");
  sel.value = current;
}

function populateYearFilter(data) {
  const sel = $("filterYear");
  const current = sel.value;
  const years = new Set([new Date().getFullYear()]);
  data.movements.forEach((m) => years.add(new Date(m.date).getFullYear()));
  const sorted = [...years].sort((a, b) => b - a);
  sel.innerHTML =
    '<option value="all">Tutti gli anni</option>' +
    sorted.map((y) => `<option value="${y}">${y}</option>`).join("");
  sel.value = current;
}

function renderMovements() {
  const data = getCurrentData();
  if (!data) {
    $("movementsList").innerHTML =
      '<div class="empty-state"><i class="fas fa-user"></i><p>Seleziona un utente</p></div>';
    $("movIncome").textContent = "€ 0,00";
    $("movExpense").textContent = "€ 0,00";
    return;
  }

  populateMonthFilter(data);
  populateYearFilter(data);

  const search = $("searchInput").value.toLowerCase();
  const typeFilter = $("filterType").value;
  const monthFilter = $("filterMonth").value;
  const yearFilter = $("filterYear").value;

  let list = [...data.movements];

  if (typeFilter !== "all") list = list.filter((m) => m.type === typeFilter);
  if (monthFilter !== "all")
    list = list.filter(
      (m) => new Date(m.date).getMonth() === parseInt(monthFilter),
    );
  if (yearFilter !== "all")
    list = list.filter(
      (m) => new Date(m.date).getFullYear() === parseInt(yearFilter),
    );
  if (search)
    list = list.filter(
      (m) =>
        m.description.toLowerCase().includes(search) ||
        getCategory(m.categoryId, data).name.toLowerCase().includes(search),
    );

  list.sort((a, b) => new Date(b.date) - new Date(a.date));

  const income = list
    .filter((m) => m.type === "income")
    .reduce((s, m) => s + m.amount, 0);
  const expense = list
    .filter((m) => m.type === "expense")
    .reduce((s, m) => s + m.amount, 0);
  $("movIncome").textContent = formatMoney(income);
  $("movExpense").textContent = formatMoney(expense);

  const container = $("movementsList");
  container.innerHTML = list.length
    ? list.map((m) => movementHTML(m, data)).join("")
    : '<div class="empty-state"><i class="fas fa-receipt"></i><p>Nessun movimento trovato</p></div>';
  attachMovementListeners(container, data);
}

$("searchInput").addEventListener("input", renderMovements);
$("filterType").addEventListener("change", renderMovements);
$("filterMonth").addEventListener("change", renderMovements);
$("filterYear").addEventListener("change", renderMovements);

// ============ CATEGORIE ============
function renderCategories() {
  const data = getCurrentData();
  if (!data) {
    $("incomeCategoriesGrid").innerHTML =
      '<div class="empty-state"><i class="fas fa-user"></i><p>Seleziona un utente</p></div>';
    $("expenseCategoriesGrid").innerHTML =
      '<div class="empty-state"><i class="fas fa-user"></i><p>Seleziona un utente</p></div>';
    return;
  }
  renderCategoryGrid(
    "incomeCategoriesGrid",
    data.categories.filter((c) => c.type === "income"),
    data,
  );
  renderCategoryGrid(
    "expenseCategoriesGrid",
    data.categories.filter((c) => c.type === "expense"),
    data,
  );
}

function renderCategoryGrid(containerId, categories, data) {
  const container = $(containerId);
  if (categories.length === 0) {
    container.innerHTML =
      '<div class="empty-state" style="padding:30px 20px"><i class="fas fa-folder-open"></i><p>Nessuna categoria</p></div>';
    return;
  }
  container.innerHTML = categories
    .map((c) => {
      const count = data.movements.filter((m) => m.categoryId === c.id).length;
      return `
            <div class="cat-card">
                <div class="card-actions">
                    <button class="icon-btn-sm edit-cat" data-id="${c.id}"><i class="fas fa-pen"></i></button>
                    <button class="icon-btn-sm delete del-cat" data-id="${c.id}"><i class="fas fa-trash"></i></button>
                </div>
                <div class="cat-icon" style="background:${c.color}20;color:${c.color}">${c.icon}</div>
                <div class="cat-name">${c.name}</div>
                <div class="cat-meta">${count} moviment${count === 1 ? "o" : "i"}</div>
            </div>
        `;
    })
    .join("");
  container.querySelectorAll(".edit-cat").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      openCategoryModal(b.dataset.id, data);
    }),
  );
  container.querySelectorAll(".del-cat").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("Eliminare questa categoria?")) {
        data.categories = data.categories.filter((c) => c.id !== b.dataset.id);
        saveCurrentData(data);
        renderCategories();
      }
    }),
  );
}

// ============ CONTI ============
function renderAccounts() {
  const data = getCurrentData();
  if (!data) {
    $("accountsGrid").innerHTML =
      '<div class="empty-state"><i class="fas fa-user"></i><p>Seleziona un utente</p></div>';
    return;
  }
  const grid = $("accountsGrid");
  grid.innerHTML = data.accounts
    .map((a) => {
      const count = data.movements.filter((m) => m.accountId === a.id).length;
      const iconHtml = a.logo
        ? `<img src="${a.logo}" alt="${a.name}" onerror="this.style.display='none';this.parentElement.innerHTML='${a.icon || ""}'">`
        : `<span>${a.icon || "💳"}</span>`;
      return `
            <div class="acc-card">
                <div class="card-actions">
                    <button class="icon-btn-sm edit-acc" data-id="${a.id}"><i class="fas fa-pen"></i></button>
                    <button class="icon-btn-sm delete del-acc" data-id="${a.id}"><i class="fas fa-trash"></i></button>
                </div>
                <div class="acc-icon" style="background:${a.color}20;color:${a.color}">${iconHtml}</div>
                <div class="acc-name">${a.name}</div>
                <div class="acc-meta">${count} movimenti • ${formatMoney(a.balance)}</div>
            </div>
        `;
    })
    .join("");
  grid.querySelectorAll(".edit-acc").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      openAccountModal(b.dataset.id, data);
    }),
  );
  grid.querySelectorAll(".del-acc").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("Eliminare questo conto?")) {
        data.accounts = data.accounts.filter((a) => a.id !== b.dataset.id);
        saveCurrentData(data);
        renderAccounts();
      }
    }),
  );
}

// ============ DEBITI & CREDITI ============
function renderDebts() {
  const data = getCurrentData();
  if (!data) {
    $("debtsList").innerHTML =
      '<div class="empty-state"><i class="fas fa-user"></i><p>Seleziona un utente</p></div>';
    $("dashDebts").textContent = "€ 0,00";
    $("dashCredits").textContent = "€ 0,00";
    $("dashNet").textContent = "€ 0,00";
    return;
  }
  const debts = data.debts.filter((d) => d.type === "debt");
  const credits = data.debts.filter((d) => d.type === "credit");
  const totalDebts = debts.reduce(
    (s, d) => s + Math.max(0, d.totalAmount - d.paidAmount),
    0,
  );
  const totalCredits = credits.reduce(
    (s, d) => s + Math.max(0, d.totalAmount - d.paidAmount),
    0,
  );
  const net = totalCredits - totalDebts;
  const openDebts = debts.filter((d) => d.paidAmount < d.totalAmount).length;
  const openCredits = credits.filter(
    (d) => d.paidAmount < d.totalAmount,
  ).length;

  $("dashDebts").textContent = formatMoney(totalDebts);
  $("dashCredits").textContent = formatMoney(totalCredits);
  $("dashNet").textContent = (net >= 0 ? "+" : "") + formatMoney(net);
  $("dashDebtsCount").textContent =
    `${openDebts} debit${openDebts === 1 ? "o" : "i"} aperto${openDebts === 1 ? "" : "i"}`;
  $("dashCreditsCount").textContent =
    `${openCredits} credit${openCredits === 1 ? "o" : "i"} aperto${openCredits === 1 ? "" : "i"}`;
  $("dashNetLabel").textContent =
    net >= 0 ? "Sei in attivo ✓" : "Sei in passivo ⚠";
  $("dashNet").style.color = net >= 0 ? "var(--income)" : "var(--expense)";

  const list = $("debtsList");
  if (data.debts.length === 0) {
    list.innerHTML =
      '<div class="empty-state"><i class="fas fa-hand-holding-usd"></i><p>Nessun debito o credito registrato</p></div>';
    return;
  }

  list.innerHTML = data.debts
    .map((d) => {
      const progress = Math.min(100, (d.paidAmount / d.totalAmount) * 100);
      const remaining = Math.max(0, d.totalAmount - d.paidAmount);
      const isCompleted = remaining === 0;
      return `
            <div class="debt-item ${isCompleted ? "completed" : ""}">
                <div class="debt-header">
                    <div class="debt-info">
                        <div class="debt-person">${d.person} ${isCompleted ? '<span class="badge-completed">SALDATO</span>' : ""}</div>
                        <div class="debt-desc">${d.description} • ${formatDate(d.date)}</div>
                    </div>
                    <div class="debt-amount ${d.type}">${d.type === "debt" ? "Devo" : "Mi devono"}<br>${formatMoney(remaining)}</div>
                </div>
                <div class="debt-progress">
                    <div class="progress-bar-bg"><div class="progress-bar-fill ${d.type}" style="width:${progress}%"></div></div>
                    <div class="progress-info"><span>${formatMoney(d.paidAmount)} di ${formatMoney(d.totalAmount)}</span><span class="progress-percent">${progress.toFixed(0)}%</span></div>
                </div>
                <div class="debt-actions">
                    ${!isCompleted ? `<button class="btn-sm primary" onclick="openPaymentModal('${d.id}')"><i class="fas fa-plus"></i> Aggiungi Pagamento</button>` : ""}
                    <button class="btn-sm danger" onclick="deleteDebt('${d.id}')"><i class="fas fa-trash"></i> Elimina</button>
                </div>
            </div>
        `;
    })
    .join("");
}

window.openPaymentModal = (debtId) => {
  $("paymentDebtId").value = debtId;
  $("paymentForm").reset();
  $("paymentDate").valueAsDate = new Date();
  $("paymentModal").classList.add("active");
};
window.deleteDebt = (debtId) => {
  if (!confirm("Eliminare questo debito/credito?")) return;
  const data = getCurrentData();
  data.debts = data.debts.filter((d) => d.id !== debtId);
  saveCurrentData(data);
  renderDebts();
};
$("paymentForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const debtId = $("paymentDebtId").value;
  const amount = parseFloat($("paymentAmount").value);
  const data = getCurrentData();
  const debt = data.debts.find((d) => d.id === debtId);
  if (debt) {
    debt.paidAmount = Math.min(debt.totalAmount, debt.paidAmount + amount);
    saveCurrentData(data);
    $("paymentModal").classList.remove("active");
    renderDebts();
  }
});

$("addDebtBtn").addEventListener("click", () => {
  $("debtModalTitle").textContent = "Nuovo Debito/Credito";
  $("debtForm").reset();
  $("debtId").value = "";
  $("debtPaid").value = 0;
  $("debtDate").valueAsDate = new Date();
  state.currentDebtType = "debt";
  document
    .querySelectorAll("#debtForm .type-btn")
    .forEach((b) =>
      b.classList.toggle("active", b.dataset.debttype === "debt"),
    );
  $("debtModal").classList.add("active");
});
document.querySelectorAll("#debtForm .type-btn").forEach((btn) =>
  btn.addEventListener("click", () => {
    document
      .querySelectorAll("#debtForm .type-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.currentDebtType = btn.dataset.debttype;
  }),
);
$("debtForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = getCurrentData();
  const debt = {
    id: $("debtId").value || genId(),
    type: state.currentDebtType,
    person: $("debtPerson").value.trim(),
    description: $("debtDescription").value.trim(),
    totalAmount: parseFloat($("debtTotal").value),
    paidAmount: parseFloat($("debtPaid").value) || 0,
    date: $("debtDate").value,
    notes: $("debtNotes").value.trim(),
  };
  const idx = data.debts.findIndex((d) => d.id === debt.id);
  if (idx !== -1) data.debts[idx] = debt;
  else data.debts.push(debt);
  saveCurrentData(data);
  $("debtModal").classList.remove("active");
  renderDebts();
});

// ============ MODAL MOVIMENTO ============
function populateCategorySelect(data) {
  const sel = $("mvCategory");
  sel.innerHTML =
    data.categories
      .filter((c) => c.type === state.currentType)
      .map((c) => `<option value="${c.id}">${c.icon} ${c.name}</option>`)
      .join("") || '<option value="">Nessuna categoria</option>';
}
function populateAccountSelect(data) {
  const sel = $("mvAccount");
  sel.innerHTML = data.accounts.length
    ? data.accounts
        .map((a) => `<option value="${a.id}">${a.icon} ${a.name}</option>`)
        .join("")
    : '<option value="">Nessun conto</option>';
}

function openMovementModal(id = null) {
  const data = getCurrentData();
  if (!data) return;
  state.currentType = "income";
  document
    .querySelectorAll("#movementForm .type-btn")
    .forEach((b) => b.classList.remove("active"));
  document
    .querySelector('#movementForm .type-btn[data-type="income"]')
    .classList.add("active");

  if (id) {
    const m = data.movements.find((x) => x.id === id);
    if (!m) return;
    $("mvModalTitle").textContent = "Modifica Movimento";
    $("mvId").value = m.id;
    $("mvAmount").value = m.amount;
    $("mvDescription").value = m.description;
    $("mvDate").value = m.date;
    $("mvNotes").value = m.notes || "";
    state.currentType = m.type;
    document
      .querySelectorAll("#movementForm .type-btn")
      .forEach((b) => b.classList.toggle("active", b.dataset.type === m.type));
    populateCategorySelect(data);
    populateAccountSelect(data);
    setTimeout(() => {
      $("mvCategory").value = m.categoryId;
      $("mvAccount").value = m.accountId;
    }, 0);
  } else {
    $("mvModalTitle").textContent = "Nuovo Movimento";
    $("movementForm").reset();
    $("mvId").value = "";
    $("mvDate").valueAsDate = new Date();
    populateCategorySelect(data);
    populateAccountSelect(data);
  }
  $("movementModal").classList.add("active");
}

document.querySelectorAll("#movementForm .type-btn").forEach((btn) =>
  btn.addEventListener("click", () => {
    document
      .querySelectorAll("#movementForm .type-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.currentType = btn.dataset.type;
    const data = getCurrentData();
    if (data) populateCategorySelect(data);
  }),
);

$("movementForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = getCurrentData();
  if (!data) return;
  const mv = {
    id: $("mvId").value || genId(),
    type: state.currentType,
    amount: parseFloat($("mvAmount").value),
    description: $("mvDescription").value.trim(),
    categoryId: $("mvCategory").value,
    accountId: $("mvAccount").value,
    date: $("mvDate").value,
    notes: $("mvNotes").value.trim(),
  };
  const idx = data.movements.findIndex((m) => m.id === mv.id);
  if (idx !== -1) data.movements[idx] = mv;
  else data.movements.push(mv);
  saveCurrentData(data);
  $("movementModal").classList.remove("active");
  refreshCurrent();
});

// ============ VIEW MODAL ============
function openViewModal(id, data) {
  const m = data.movements.find((x) => x.id === id);
  if (!m) return;
  state.currentViewId = id;
  const cat = getCategory(m.categoryId, data);
  const acc = getAccount(m.accountId, data);
  const isIncome = m.type === "income";
  $("viewContent").innerHTML = `
        <div class="view-item"><label>Importo</label><p class="amount-big" style="color:${isIncome ? "var(--income)" : "var(--expense)"}">${isIncome ? "+" : "-"} ${formatMoney(m.amount)}</p></div>
        <div class="view-item"><label>Tipo</label><p><span class="mv-badge ${m.type}">${isIncome ? "ENTRATA" : "USCITA"}</span></p></div>
        <div class="view-item"><label>Descrizione</label><p>${m.description}</p></div>
        <div class="view-item"><label>Categoria</label><p>${cat.icon} ${cat.name}</p></div>
        <div class="view-item"><label>Conto</label><p>${acc.icon} ${acc.name}</p></div>
        <div class="view-item"><label>Data</label><p>${formatDate(m.date)}</p></div>
        ${m.notes ? `<div class="view-item"><label>Note</label><p style="font-weight:400;font-size:14px">${m.notes}</p></div>` : ""}
    `;
  $("viewModal").classList.add("active");
}
$("editFromViewBtn").addEventListener("click", () => {
  $("viewModal").classList.remove("active");
  setTimeout(() => openMovementModal(state.currentViewId), 200);
});
$("deleteFromViewBtn").addEventListener("click", () => {
  if (!confirm("Eliminare questo movimento?")) return;
  const data = getCurrentData();
  data.movements = data.movements.filter((m) => m.id !== state.currentViewId);
  saveCurrentData(data);
  $("viewModal").classList.remove("active");
  refreshCurrent();
});

// ============ MODAL CATEGORIA ============
function openCategoryModal(id = null, data, defaultType = "expense") {
  if (id) {
    const c = data.categories.find((x) => x.id === id);
    if (!c) return;
    $("catModalTitle").textContent = "Modifica Categoria";
    $("catId").value = c.id;
    $("catName").value = c.name;
    $("catIcon").value = c.icon;
    $("catColor").value = c.color;
    state.currentCatType = c.type;
    document
      .querySelectorAll("#categoryForm .type-btn")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.cattype === c.type),
      );
  } else {
    $("catModalTitle").textContent = "Nuova Categoria";
    $("categoryForm").reset();
    $("catId").value = "";
    state.currentCatType = defaultType;
    $("catColor").value = defaultType === "income" ? "#10b981" : "#ef4444";
    document
      .querySelectorAll("#categoryForm .type-btn")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.cattype === defaultType),
      );
  }
  $("categoryModal").classList.add("active");
}
document.querySelectorAll("#categoryForm .type-btn").forEach((btn) =>
  btn.addEventListener("click", () => {
    document
      .querySelectorAll("#categoryForm .type-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.currentCatType = btn.dataset.cattype;
  }),
);
$("categoryForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = getCurrentData();
  if (!data) return;
  const cat = {
    id: $("catId").value || genId(),
    name: $("catName").value.trim(),
    icon: $("catIcon").value.trim(),
    color: $("catColor").value,
    type: state.currentCatType,
  };
  const idx = data.categories.findIndex((c) => c.id === cat.id);
  if (idx !== -1) data.categories[idx] = cat;
  else data.categories.push(cat);
  saveCurrentData(data);
  $("categoryModal").classList.remove("active");
  renderCategories();
});

// ============ MODAL CONTO ============
function openAccountModal(id = null, data) {
  if (id) {
    const a = data.accounts.find((x) => x.id === id);
    if (!a) return;
    $("accModalTitle").textContent = "Modifica Conto";
    $("accId").value = a.id;
    $("accName").value = a.name;
    $("accIcon").value = a.icon;
    $("accLogo").value = a.logo || "";
    $("accColor").value = a.color;
    $("accBalance").value = a.balance;
  } else {
    $("accModalTitle").textContent = "Nuovo Conto / Carta";
    $("accountForm").reset();
    $("accId").value = "";
    $("accColor").value = "#4f46e5";
    $("accBalance").value = 0;
  }
  $("accountModal").classList.add("active");
}
$("accountForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = getCurrentData();
  if (!data) return;
  const acc = {
    id: $("accId").value || genId(),
    name: $("accName").value.trim(),
    icon: $("accIcon").value.trim(),
    logo: $("accLogo").value.trim(),
    color: $("accColor").value,
    balance: parseFloat($("accBalance").value) || 0,
  };
  const idx = data.accounts.findIndex((a) => a.id === acc.id);
  if (idx !== -1) data.accounts[idx] = acc;
  else data.accounts.push(acc);
  saveCurrentData(data);
  $("accountModal").classList.remove("active");
  renderAccounts();
});

// ============ CHIUSURA MODAL ============
function closeAllModals() {
  document
    .querySelectorAll(".modal")
    .forEach((m) => m.classList.remove("active"));
}
document
  .querySelectorAll(".close-modal")
  .forEach((b) => b.addEventListener("click", closeAllModals));
document
  .querySelectorAll(".modal-overlay")
  .forEach((o) => o.addEventListener("click", closeAllModals));
$("cancelMvBtn").addEventListener("click", closeAllModals);
$("closeViewBtn").addEventListener("click", closeAllModals);
$("cancelCatBtn").addEventListener("click", closeAllModals);
$("cancelAccBtn").addEventListener("click", closeAllModals);
$("cancelDebtBtn").addEventListener("click", closeAllModals);
$("cancelPaymentBtn").addEventListener("click", closeAllModals);
$("cancelUserBtn").addEventListener("click", closeAllModals);

// ============ FAB ============
$("fabAdd").addEventListener("click", () => {
  if (state.currentSection === "categories") $("addExpenseCategoryBtn").click();
  else if (state.currentSection === "accounts") $("addAccountBtn").click();
  else if (state.currentSection === "debts") $("addDebtBtn").click();
  else if (state.currentSection === "settings") $("addUserBtn").click();
  else openMovementModal();
});
$("addIncomeCategoryBtn").addEventListener("click", () => {
  const d = getCurrentData();
  if (d) openCategoryModal(null, d, "income");
});
$("addExpenseCategoryBtn").addEventListener("click", () => {
  const d = getCurrentData();
  if (d) openCategoryModal(null, d, "expense");
});
$("addAccountBtn").addEventListener("click", () => {
  const d = getCurrentData();
  if (d) openAccountModal(null, d);
});

// ============ REFRESH ============
function refreshCurrent() {
  if (state.currentSection === "dashboard") renderDashboard();
  else if (state.currentSection === "movements") renderMovements();
  else if (state.currentSection === "categories") renderCategories();
  else if (state.currentSection === "accounts") renderAccounts();
  else if (state.currentSection === "debts") renderDebts();
  else if (state.currentSection === "settings") {
    renderUsers();
    updatePasswordStatus();
  }
}

// ============ INIT ============
initTheme();
if (state.users.length > 0 && !state.currentUser) {
  state.currentUser = state.users[0].id;
  localStorage.setItem("abt_currentUser", state.currentUser);
}
updateUserDisplay();
navigateTo("dashboard");
