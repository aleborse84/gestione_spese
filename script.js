const firebaseConfig = {
  apiKey: "AIzaSyD_tWdvjxOCFfbPADpGGzSfJ6MRz4O3rzM",
  authDomain: "gestione-spese-84.firebaseapp.com",
  databaseURL: "https://gestione-spese-84-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gestione-spese-84",
  storageBucket: "gestione-spese-84.firebasestorage.app",
  messagingSenderId: "375465380274",
  appId: "1:375465380274:web:e77fe88204c8a4fbe87cab"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

const DEFAULT_CATEGORIES = [
  { id: "cat1", name: "Alimentari", icon: "🛒", color: "#10b981", type: "expense" },
  { id: "cat2", name: "Trasporti", icon: "🚗", color: "#3b82f6", type: "expense" },
  { id: "cat3", name: "Bollette", icon: "💡", color: "#f59e0b", type: "expense" },
  { id: "cat4", name: "Svago", icon: "🎬", color: "#a855f7", type: "expense" },
  { id: "cat5", name: "Stipendio", icon: "💼", color: "#10b981", type: "income" },
  { id: "cat6", name: "Altro", icon: "📦", color: "#64748b", type: "expense" }
];
const DEFAULT_ACCOUNTS = [
  { id: "acc1", name: "Conto Corrente", icon: "", color: "#4f46e5", balance: 0 },
  { id: "acc2", name: "Carta Visa", icon: "💳", color: "#0ea5e9", balance: 0 }
];
const MONTHS_IT = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

let state = {
  currentUser: null,
  currentEmail: null,
  currentProfileId: null,
  profiles: {},
  isOffline: false,
  currentSection: "dashboard",
  currentType: "income",
  currentCatType: "expense",
  currentDebtType: "debt",
  currentViewId: null,
  data: null,
  dataRef: null,
  listeners: []
};

const $ = (id) => document.getElementById(id);
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const formatMoney = (n) => "€ " + (n || 0).toFixed(2).replace(".", ",");
const formatDate = (d) => new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
const getCategory = (id) => state.data?.categories.find((c) => c.id === id) || { name: "—", icon: "❓", color: "#94a3b8" };
const getAccount = (id) => state.data?.accounts.find((a) => a.id === id) || { name: "—", icon: "—", color: "#94a3b8" };
const arrayToObject = (arr) => { const obj = {}; arr.forEach((item) => { obj[item.id] = item; }); return obj; };
const objectToArray = (obj) => { if (!obj) return []; return Object.keys(obj).map((key) => ({ id: key, ...obj[key] })); };

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
$("themeBtnSidebar").addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(current === "dark" ? "light" : "dark");
});
$("themeToggle").addEventListener("change", (e) => applyTheme(e.target.checked ? "dark" : "light"));

const sidebar = document.querySelector(".sidebar");
const sidebarOverlay = $("sidebarOverlay");
function navigateTo(section) {
  state.currentSection = section;
  document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
  $("section-" + section).classList.add("active");
  document.querySelectorAll(".nav-link").forEach((n) => n.classList.remove("active"));
  document.querySelectorAll(`.nav-link[data-section="${section}"]`).forEach((n) => n.classList.add("active"));
  const titles = { dashboard: "Dashboard", movements: "Movimenti", categories: "Categorie", accounts: "Conti", debts: "Debiti & Crediti", settings: "Impostazioni" };
  $("pageTitle").textContent = titles[section];
  refreshCurrent();
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("active");
}
document.querySelectorAll(".nav-link").forEach((btn) => btn.addEventListener("click", () => navigateTo(btn.dataset.section)));
document.querySelectorAll(".link-btn[data-goto]").forEach((btn) => btn.addEventListener("click", () => navigateTo(btn.dataset.goto)));
$("menuToggle").addEventListener("click", () => { sidebar.classList.toggle("open"); sidebarOverlay.classList.toggle("active"); });
sidebarOverlay.addEventListener("click", () => { sidebar.classList.remove("open"); sidebarOverlay.classList.remove("active"); });

let authMode = "login";
$("authSwitchBtn").addEventListener("click", () => {
  authMode = authMode === "login" ? "register" : "login";
  if (authMode === "login") {
    $("authTitle").textContent = "Accedi";
    $("authSubmitBtn").textContent = "Accedi";
    $("authSwitchText").textContent = "Non hai un account?";
    $("authSwitchBtn").textContent = "Registrati";
    $("authNameGroup").style.display = "none";
  } else {
    $("authTitle").textContent = "Registrati";
    $("authSubmitBtn").textContent = "Crea account";
    $("authSwitchText").textContent = "Hai già un account?";
    $("authSwitchBtn").textContent = "Accedi";
    $("authNameGroup").style.display = "block";
  }
  $("authError").textContent = "";
});

$("authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const name = $("authName").value.trim();
  $("authError").textContent = "";
  $("authError").className = "error-msg";
  try {
    if (authMode === "login") {
      await auth.signInWithEmailAndPassword(email, password);
    } else {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      if (name) await cred.user.updateProfile({ displayName: name });
    }
  } catch (err) {
    $("authError").textContent = translateAuthError(err.code);
  }
});

function translateAuthError(code) {
  const errors = {
    "auth/user-not-found": "Utente non trovato",
    "auth/wrong-password": "Password errata",
    "auth/invalid-email": "Email non valida",
    "auth/email-already-in-use": "Email già registrata",
    "auth/weak-password": "Password troppo debole (min. 6 caratteri)",
    "auth/invalid-credential": "Credenziali non valide",
    "auth/too-many-requests": "Troppi tentativi"
  };
  return errors[code] || "Errore: " + code;
}

$("forgotPasswordBtn").addEventListener("click", async () => {
  const email = $("authEmail").value.trim();
  if (!email) {
    $("authError").textContent = "⚠️ Inserisci prima la tua email.";
    $("authError").className = "error-msg";
    return;
  }
  try {
    $("authError").textContent = "⏳ Invio email in corso...";
    await auth.sendPasswordResetEmail(email);
    $("authError").textContent = "✅ Email inviata! Controlla la casella di posta.";
    $("authError").className = "error-msg success";
  } catch (err) {
    $("authError").textContent = translateAuthError(err.code);
    $("authError").className = "error-msg";
  }
});

$("logoutBtn").addEventListener("click", async () => {
  if (confirm("Vuoi uscire dall'account?")) await auth.signOut();
});

auth.onAuthStateChanged(async (user) => {
  if (user) {
    state.currentUser = user.uid;
    state.currentEmail = user.email;
    $("authScreen").classList.add("hidden");
    $("settingsEmail").textContent = user.email;
    $("dropdownEmail").textContent = user.email;
    await loadProfiles(user.uid);
  } else {
    if (state.isOffline) return;
    state.currentUser = null;
    state.currentProfileId = null;
    state.profiles = {};
    state.data = null;
    detachListeners();
    $("authScreen").classList.remove("hidden");
  }
});

async function loadProfiles(uid) {
  try {
    const snapshot = await db.ref("users/" + uid + "/profiles").once("value");
    const profilesData = snapshot.val() || {};
    state.profiles = profilesData;
    if (Object.keys(profilesData).length === 0) {
      const defaultProfileId = genId();
      await db.ref("users/" + uid + "/profiles/" + defaultProfileId).set({
        name: "Personale",
        color: "#4f46e5",
        createdAt: firebase.database.ServerValue.TIMESTAMP
      });
      state.profiles = { [defaultProfileId]: { name: "Personale", color: "#4f46e5" } };
    }
    const savedProfileId = localStorage.getItem("abt_currentProfile_" + uid);
    const profileIds = Object.keys(state.profiles);
    state.currentProfileId = savedProfileId && state.profiles[savedProfileId] ? savedProfileId : profileIds[0];
    localStorage.setItem("abt_currentProfile_" + uid, state.currentProfileId);
    subscribeProfileData(uid, state.currentProfileId);
    updateProfileUI();
  } catch (err) {
    console.error("Errore caricamento profili:", err);
  }
}

function subscribeProfileData(uid, profileId) {
  detachListeners();
  state.dataRef = db.ref("users/" + uid + "/profiles/" + profileId);
  const listener = state.dataRef.on("value", (snapshot) => {
    const raw = snapshot.val();
    if (!raw) {
      state.dataRef.set({
        movements: {},
        categories: arrayToObject(DEFAULT_CATEGORIES),
        accounts: arrayToObject(DEFAULT_ACCOUNTS),
        debts: {},
        createdAt: firebase.database.ServerValue.TIMESTAMP
      });
      return;
    }
    state.data = {
      movements: objectToArray(raw.movements),
      categories: objectToArray(raw.categories),
      accounts: objectToArray(raw.accounts),
      debts: objectToArray(raw.debts)
    };
    refreshCurrent();
  });
  state.listeners.push({ ref: state.dataRef, event: "value", callback: listener });
}

function detachListeners() {
  state.listeners.forEach((l) => l.ref.off(l.event, l.callback));
  state.listeners = [];
}

async function switchProfile(profileId) {
  if (!state.profiles[profileId]) return;
  state.currentProfileId = profileId;
  localStorage.setItem("abt_currentProfile_" + state.currentUser, profileId);
  subscribeProfileData(state.currentUser, profileId);
  updateProfileUI();
  $("userDropdown").classList.remove("active");
}

function updateProfileUI() {
  const profile = state.profiles[state.currentProfileId];
  if (!profile) return;
  $("profileDot").style.background = profile.color;
  $("userName").textContent = profile.name;
  if ($("dropdownEmail")) $("dropdownEmail").textContent = state.currentEmail || "";
  renderProfilesDropdown();
  renderProfilesSettings();
}

function renderProfilesDropdown() {
  const container = $("profilesList");
  if (!container) return;
  container.innerHTML = Object.keys(state.profiles).map((pid) => {
    const p = state.profiles[pid];
    const isActive = pid === state.currentProfileId;
    return `<div class="profile-dropdown-item ${isActive ? "active" : ""}" onclick="switchProfile('${pid}')"><div class="profile-dot" style="background:${p.color}"></div><span style="font-weight:${isActive ? "700" : "500"};font-size:14px">${p.name}</span>${isActive ? '<i class="fas fa-check" style="margin-left:auto;color:var(--primary);font-size:12px"></i>' : ""}</div>`;
  }).join("");
}

function renderProfilesSettings() {
  const container = $("profilesListSettings");
  if (!container) return;
  container.innerHTML = Object.keys(state.profiles).map((pid) => {
    const p = state.profiles[pid];
    const isActive = pid === state.currentProfileId;
    return `<div class="profile-item ${isActive ? "active" : ""}"><div class="profile-color" style="background:${p.color}">${p.name.charAt(0).toUpperCase()}</div><div class="profile-info"><div class="profile-name">${p.name} ${isActive ? '<span style="color:var(--primary);font-size:12px;margin-left:6px">● Attivo</span>' : ""}</div><div class="profile-stats">Profilo personale</div></div><div class="profile-actions"><button class="btn-sm edit" onclick="editProfile('${pid}')" title="Modifica"><i class="fas fa-pen"></i></button><button class="btn-sm danger" onclick="deleteProfile('${pid}')" title="Elimina"><i class="fas fa-trash"></i></button></div></div>`;
  }).join("");
}

window.switchProfile = switchProfile;
window.editProfile = (profileId) => {
  const p = state.profiles[profileId];
  if (!p) return;
  $("profileModalTitle").textContent = "Modifica Profilo";
  $("profileId").value = profileId;
  $("profileName").value = p.name;
  $("profileColor").value = p.color;
  $("profileModal").classList.add("active");
};
window.deleteProfile = async (profileId) => {
  const profileIds = Object.keys(state.profiles);
  if (profileIds.length <= 1) { alert("Devi avere almeno un profilo!"); return; }
  if (!confirm("Eliminare questo profilo e tutti i suoi dati?")) return;
  await db.ref("users/" + state.currentUser + "/profiles/" + profileId).remove();
  delete state.profiles[profileId];
  if (state.currentProfileId === profileId) {
    await switchProfile(Object.keys(state.profiles)[0]);
  } else {
    updateProfileUI();
  }
};

$("addProfileBtn2").addEventListener("click", () => {
  $("profileModalTitle").textContent = "Nuovo Profilo";
  $("profileForm").reset();
  $("profileId").value = "";
  $("profileColor").value = "#4f46e5";
  $("profileModal").classList.add("active");
});

$("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const profileId = $("profileId").value || genId();
  const name = $("profileName").value.trim();
  const color = $("profileColor").value;

  if (state.isOffline) {
    if (state.profiles[profileId]) {
      state.profiles[profileId] = { ...state.profiles[profileId], name, color };
    } else {
      state.profiles[profileId] = { name, color, movements: [], categories: [...DEFAULT_CATEGORIES], accounts: [...DEFAULT_ACCOUNTS], debts: [] };
    }
    localStorage.setItem("abt_offline_profiles", JSON.stringify(state.profiles));
    if (!$("profileId").value) { await switchProfile(profileId); } else { updateProfileUI(); }
    $("profileModal").classList.remove("active");
    return;
  }

  await db.ref("users/" + state.currentUser + "/profiles/" + profileId).update({
    name, color, updatedAt: firebase.database.ServerValue.TIMESTAMP
  });

  if (!$("profileId").value) {
    await db.ref("users/" + state.currentUser + "/profiles/" + profileId).update({
      movements: {}, categories: arrayToObject(DEFAULT_CATEGORIES), accounts: arrayToObject(DEFAULT_ACCOUNTS), debts: {}
    });
  }

  state.profiles[profileId] = { name, color };
  if (!$("profileId").value) { await switchProfile(profileId); } else { updateProfileUI(); }
  $("profileModal").classList.remove("active");
});

$("cancelProfileBtn").addEventListener("click", () => $("profileModal").classList.remove("active"));
$("userBtn").addEventListener("click", (e) => { e.stopPropagation(); $("userDropdown").classList.toggle("active"); });
document.addEventListener("click", () => $("userDropdown").classList.remove("active"));

async function saveMovements() { if (!state.dataRef) return; const obj = {}; state.data.movements.forEach((m) => { obj[m.id] = m; }); await state.dataRef.child("movements").set(obj); }
async function saveCategories() { if (!state.dataRef) return; const obj = {}; state.data.categories.forEach((c) => { obj[c.id] = c; }); await state.dataRef.child("categories").set(obj); }
async function saveAccounts() { if (!state.dataRef) return; const obj = {}; state.data.accounts.forEach((a) => { obj[a.id] = a; }); await state.dataRef.child("accounts").set(obj); }
async function saveDebts() { if (!state.dataRef) return; const obj = {}; state.data.debts.forEach((d) => { obj[d.id] = d; }); await state.dataRef.child("debts").set(obj); }

const hostname = window.location.hostname;
const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "" || hostname.startsWith("192.168.") || hostname.endsWith(".local");

if (isLocal) {
  document.body.classList.add("is-local");
  $("offlineModeBtn").addEventListener("click", () => {
    $("authScreen").classList.add("hidden");
    let offlineProfiles = JSON.parse(localStorage.getItem("abt_offline_profiles") || "{}");
    let offlineCurrentId = localStorage.getItem("abt_offline_currentProfile");
    if (Object.keys(offlineProfiles).length === 0) {
      const defaultId = genId();
      offlineProfiles[defaultId] = { name: "Personale", color: "#4f46e5", movements: [], categories: [...DEFAULT_CATEGORIES], accounts: [...DEFAULT_ACCOUNTS], debts: [] };
      offlineCurrentId = defaultId;
      localStorage.setItem("abt_offline_profiles", JSON.stringify(offlineProfiles));
      localStorage.setItem("abt_offline_currentProfile", defaultId);
    }
    state.isOffline = true;
    state.currentUser = "offline_user";
    state.currentEmail = "demo@offline.com";
    state.profiles = offlineProfiles;
    state.currentProfileId = offlineCurrentId || Object.keys(offlineProfiles)[0];
    const profile = state.profiles[state.currentProfileId];
    state.data = { movements: profile.movements || [], categories: profile.categories || [...DEFAULT_CATEGORIES], accounts: profile.accounts || [...DEFAULT_ACCOUNTS], debts: profile.debts || [] };
    $("settingsEmail").textContent = "demo@offline.com (Locale)";
    $("dropdownEmail").textContent = "demo@offline.com (Locale)";
    updateProfileUI();
    refreshCurrent();
  });
}

const _origSaveMovements = saveMovements; saveMovements = async () => { if (state.isOffline) { saveOffline(); return; } return _origSaveMovements(); };
const _origSaveCategories = saveCategories; saveCategories = async () => { if (state.isOffline) { saveOffline(); return; } return _origSaveCategories(); };
const _origSaveAccounts = saveAccounts; saveAccounts = async () => { if (state.isOffline) { saveOffline(); return; } return _origSaveAccounts(); };
const _origSaveDebts = saveDebts; saveDebts = async () => { if (state.isOffline) { saveOffline(); return; } return _origSaveDebts(); };

function saveOffline() {
  if (!state.isOffline || !state.data) return;
  const profiles = JSON.parse(localStorage.getItem("abt_offline_profiles") || "{}");
  profiles[state.currentProfileId] = { ...state.profiles[state.currentProfileId], movements: state.data.movements, categories: state.data.categories, accounts: state.data.accounts, debts: state.data.debts };
  localStorage.setItem("abt_offline_profiles", JSON.stringify(profiles));
  state.profiles = profiles;
}

const _origSwitchProfile = switchProfile;
switchProfile = async (profileId) => {
  if (state.isOffline) {
    if (!state.profiles[profileId]) return;
    state.currentProfileId = profileId;
    localStorage.setItem("abt_offline_currentProfile", profileId);
    const profile = state.profiles[profileId];
    state.data = { movements: profile.movements || [], categories: profile.categories || [...DEFAULT_CATEGORIES], accounts: profile.accounts || [...DEFAULT_ACCOUNTS], debts: profile.debts || [] };
    updateProfileUI(); refreshCurrent(); $("userDropdown").classList.remove("active"); return;
  }
  return _origSwitchProfile(profileId);
};

const _origDeleteProfile = window.deleteProfile;
window.deleteProfile = async (profileId) => {
  if (state.isOffline) {
    const profileIds = Object.keys(state.profiles);
    if (profileIds.length <= 1) { alert("Devi avere almeno un profilo!"); return; }
    if (!confirm("Eliminare questo profilo e tutti i suoi dati?")) return;
    delete state.profiles[profileId];
    localStorage.setItem("abt_offline_profiles", JSON.stringify(state.profiles));
    if (state.currentProfileId === profileId) { await switchProfile(Object.keys(state.profiles)[0]); } else { updateProfileUI(); }
    return;
  }
  return _origDeleteProfile(profileId);
};

let pendingAction = null;
$("clearAllDataBtn").addEventListener("click", () => {
  if (state.isOffline) {
    if (!confirm("Eliminare tutti i dati di questo profilo offline?")) return;
    state.data = { movements: [], categories: [...DEFAULT_CATEGORIES], accounts: [...DEFAULT_ACCOUNTS], debts: [] };
    saveOffline(); refreshCurrent(); return;
  }
  pendingAction = "clearData";
  $("confirmModalTitle").textContent = "⚠️ Elimina tutti i dati";
  $("confirmModalDesc").textContent = "Eliminerà movimenti, categorie, conti e debiti di questo profilo. Gli altri profili rimarranno intatti.";
  $("confirmPasswordInput").value = ""; $("confirmError").textContent = ""; $("confirmPasswordModal").classList.add("active");
});

$("deleteAccountBtn").addEventListener("click", () => {
  if (state.isOffline) return;
  pendingAction = "deleteAccount";
  $("confirmModalTitle").textContent = "🚨 Elimina account";
  $("confirmModalDesc").textContent = "IRREVERSIBILE. Account, tutti i profili e tutti i dati verranno persi per sempre.";
  $("confirmPasswordInput").value = ""; $("confirmError").textContent = ""; $("confirmPasswordModal").classList.add("active");
});

$("confirmPasswordForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = $("confirmPasswordInput").value;
  const user = auth.currentUser;
  if (!user) return;
  try {
    $("confirmError").textContent = "Verifica...";
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
    await user.reauthenticateWithCredential(credential);
    if (pendingAction === "clearData") {
      await db.ref("users/" + user.uid + "/profiles/" + state.currentProfileId).remove();
      alert("Dati del profilo eliminati."); location.reload();
    } else if (pendingAction === "deleteAccount") {
      await db.ref("users/" + user.uid).remove(); await user.delete(); alert("Account eliminato.");
    }
    $("confirmPasswordModal").classList.remove("active");
  } catch (err) {
    $("confirmError").textContent = err.code === "auth/wrong-password" ? "Password errata" : "Errore: " + err.message;
  }
});
$("cancelConfirmBtn").addEventListener("click", () => $("confirmPasswordModal").classList.remove("active"));

$("exportBtn").addEventListener("click", () => {
  if (!state.data) return;
  const data = { email: state.currentEmail, uid: state.currentUser, profileId: state.currentProfileId, profileName: state.profiles[state.currentProfileId]?.name, exportedAt: new Date().toISOString(), movements: state.data.movements, categories: state.data.categories, accounts: state.data.accounts, debts: state.data.debts };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `abtracker_${state.profiles[state.currentProfileId]?.name}_${new Date().toISOString().slice(0, 10)}.json`; a.click();
});
$("importBtn").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!confirm("Sostituire i dati del profilo attuale?")) return;
      state.data = { movements: data.movements || [], categories: data.categories || [...DEFAULT_CATEGORIES], accounts: data.accounts || [...DEFAULT_ACCOUNTS], debts: data.debts || [] };
      await Promise.all([saveMovements(), saveCategories(), saveAccounts(), saveDebts()]);
      alert("Dati importati!");
    } catch (err) { alert("File non valido"); }
  };
  reader.readAsText(file); e.target.value = "";
});

function renderDashboard() {
  if (!state.data) { $("dashMovementsList").innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Caricamento...</p></div>'; return; }
  const now = new Date();
  $("dashMonthBadge").textContent = `${MONTHS_IT[now.getMonth()]} ${now.getFullYear()}`;
  const monthMovements = state.data.movements.filter((m) => { const d = new Date(m.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const income = monthMovements.filter((m) => m.type === "income").reduce((s, m) => s + m.amount, 0);
  const expense = monthMovements.filter((m) => m.type === "expense").reduce((s, m) => s + m.amount, 0);
  $("dashIncome").textContent = formatMoney(income); $("dashExpense").textContent = formatMoney(expense);
  const list = $("dashMovementsList");
  const recent = [...monthMovements].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  list.innerHTML = recent.length ? recent.map(movementHTML).join("") : '<div class="empty-state"><i class="fas fa-receipt"></i><p>Nessun movimento questo mese</p></div>';
  attachMovementListeners(list);
}

function movementHTML(m) {
  const cat = getCategory(m.categoryId); const acc = getAccount(m.accountId);
  const sign = m.type === "income" ? "+" : "-";
  return `<div class="movement-item" data-id="${m.id}"><div class="mv-icon ${m.type}">${cat.icon}</div><div class="mv-info"><div class="mv-top"><span class="mv-title">${m.description}</span><span class="mv-badge ${m.type}">${m.type === "income" ? "ENTRATA" : "USCITA"}</span></div><div class="mv-details"><span class="cat-dot" style="background:${cat.color};width:6px;height:6px;border-radius:50%;display:inline-block"></span>${cat.name} • ${acc.name} • ${formatDate(m.date)}</div></div><div class="mv-amount ${m.type}">${sign} ${formatMoney(m.amount)}</div></div>`;
}
function attachMovementListeners(container) { container.querySelectorAll(".movement-item").forEach((el) => el.addEventListener("click", () => openViewModal(el.dataset.id))); }

function renderMovements() {
  if (!state.data) return;
  const search = $("searchInput").value.toLowerCase();
  const typeFilter = $("filterType").value; const monthFilter = $("filterMonth").value; const yearFilter = $("filterYear").value;
  let list = [...state.data.movements];
  if (typeFilter !== "all") list = list.filter((m) => m.type === typeFilter);
  if (monthFilter !== "all") list = list.filter((m) => new Date(m.date).getMonth() === parseInt(monthFilter));
  if (yearFilter !== "all") list = list.filter((m) => new Date(m.date).getFullYear() === parseInt(yearFilter));
  if (search) list = list.filter((m) => m.description.toLowerCase().includes(search) || getCategory(m.categoryId).name.toLowerCase().includes(search));
  list.sort((a, b) => new Date(b.date) - new Date(a.date));
  const income = list.filter((m) => m.type === "income").reduce((s, m) => s + m.amount, 0);
  const expense = list.filter((m) => m.type === "expense").reduce((s, m) => s + m.amount, 0);
  $("movIncome").textContent = formatMoney(income); $("movExpense").textContent = formatMoney(expense);
  const container = $("movementsList");
  container.innerHTML = list.length ? list.map(movementHTML).join("") : '<div class="empty-state"><i class="fas fa-receipt"></i><p>Nessun movimento</p></div>';
  attachMovementListeners(container);
}
$("searchInput").addEventListener("input", renderMovements);
$("filterType").addEventListener("change", renderMovements);
$("filterMonth").addEventListener("change", renderMovements);
$("filterYear").addEventListener("change", renderMovements);

function renderCategories() {
  if (!state.data) return;
  renderCategoryGrid("incomeCategoriesGrid", state.data.categories.filter((c) => c.type === "income"));
  renderCategoryGrid("expenseCategoriesGrid", state.data.categories.filter((c) => c.type === "expense"));
}
function renderCategoryGrid(containerId, categories) {
  const container = $(containerId);
  if (categories.length === 0) { container.innerHTML = '<div class="empty-state" style="padding:30px"><i class="fas fa-folder-open"></i><p>Nessuna categoria</p></div>'; return; }
  container.innerHTML = categories.map((c) => {
    const count = state.data.movements.filter((m) => m.categoryId === c.id).length;
    return `<div class="cat-card"><div class="card-actions"><button class="icon-btn-sm edit-cat" data-id="${c.id}"><i class="fas fa-pen"></i></button><button class="icon-btn-sm delete del-cat" data-id="${c.id}"><i class="fas fa-trash"></i></button></div><div class="cat-icon" style="background:${c.color}20;color:${c.color}">${c.icon}</div><div class="cat-name">${c.name}</div><div class="cat-meta">${count} movimenti</div></div>`;
  }).join("");
  container.querySelectorAll(".edit-cat").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); openCategoryModal(b.dataset.id); }));
  container.querySelectorAll(".del-cat").forEach((b) => b.addEventListener("click", async (e) => { e.stopPropagation(); if (confirm("Eliminare?")) { state.data.categories = state.data.categories.filter((c) => c.id !== b.dataset.id); await saveCategories(); } }));
}

function renderAccounts() {
  if (!state.data) return;
  const grid = $("accountsGrid");
  grid.innerHTML = state.data.accounts.map((a) => {
    const count = state.data.movements.filter((m) => m.accountId === a.id).length;
    const iconHtml = a.logo ? `<img src="${a.logo}" alt="${a.name}" onerror="this.style.display='none';this.parentElement.innerHTML='${a.icon || ""}'">` : `<span>${a.icon || ""}</span>`;
    return `<div class="acc-card"><div class="card-actions"><button class="icon-btn-sm edit-acc" data-id="${a.id}"><i class="fas fa-pen"></i></button><button class="icon-btn-sm delete del-acc" data-id="${a.id}"><i class="fas fa-trash"></i></button></div><div class="acc-icon" style="background:${a.color}20;color:${a.color}">${iconHtml}</div><div class="acc-name">${a.name}</div><div class="acc-meta">${count} movimenti • ${formatMoney(a.balance)}</div></div>`;
  }).join("");
  grid.querySelectorAll(".edit-acc").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); openAccountModal(b.dataset.id); }));
  grid.querySelectorAll(".del-acc").forEach((b) => b.addEventListener("click", async (e) => { e.stopPropagation(); if (confirm("Eliminare?")) { state.data.accounts = state.data.accounts.filter((a) => a.id !== b.dataset.id); await saveAccounts(); } }));
}

function renderDebts() {
  if (!state.data) return;
  const debts = state.data.debts.filter((d) => d.type === "debt");
  const credits = state.data.debts.filter((d) => d.type === "credit");
  const totalDebts = debts.reduce((s, d) => s + Math.max(0, d.totalAmount - d.paidAmount), 0);
  const totalCredits = credits.reduce((s, d) => s + Math.max(0, d.totalAmount - d.paidAmount), 0);
  const net = totalCredits - totalDebts;
  $("dashDebts").textContent = formatMoney(totalDebts); $("dashCredits").textContent = formatMoney(totalCredits);
  $("dashNet").textContent = (net >= 0 ? "+" : "") + formatMoney(net);
  $("dashDebtsCount").textContent = `${debts.filter((d) => d.paidAmount < d.totalAmount).length} debiti aperti`;
  $("dashCreditsCount").textContent = `${credits.filter((d) => d.paidAmount < d.totalAmount).length} crediti aperti`;
  $("dashNetLabel").textContent = net >= 0 ? "Sei in attivo ✓" : "Sei in passivo ";
  $("dashNet").style.color = net >= 0 ? "var(--income)" : "var(--expense)";
  const list = $("debtsList");
  if (state.data.debts.length === 0) { list.innerHTML = '<div class="empty-state"><i class="fas fa-hand-holding-usd"></i><p>Nessun debito/credito</p></div>'; return; }
  list.innerHTML = state.data.debts.map((d) => {
    const progress = Math.min(100, (d.paidAmount / d.totalAmount) * 100);
    const remaining = Math.max(0, d.totalAmount - d.paidAmount);
    const isCompleted = remaining === 0;
    return `<div class="debt-item ${isCompleted ? "completed" : ""}"><div class="debt-header"><div class="debt-info"><div class="debt-person">${d.person} ${isCompleted ? '<span class="badge-completed">SALDATO</span>' : ""}</div><div class="debt-desc">${d.description} • ${formatDate(d.date)}</div></div><div class="debt-amount ${d.type}">${d.type === "debt" ? "Devo" : "Mi devono"}<br>${formatMoney(remaining)}</div></div><div class="debt-progress"><div class="progress-bar-bg"><div class="progress-bar-fill ${d.type}" style="width:${progress}%"></div></div><div class="progress-info"><span>${formatMoney(d.paidAmount)} di ${formatMoney(d.totalAmount)}</span><span class="progress-percent">${progress.toFixed(0)}%</span></div></div><div class="debt-actions">${!isCompleted ? `<button class="btn-action" onclick="openPaymentModal('${d.id}')" style="padding:8px 12px;font-size:12px"><i class="fas fa-plus"></i> Pagamento</button>` : ""}<button class="btn-action danger" onclick="deleteDebt('${d.id}')" style="padding:8px 12px;font-size:12px"><i class="fas fa-trash"></i></button></div></div>`;
  }).join("");
}

window.openPaymentModal = (debtId) => { $("paymentDebtId").value = debtId; $("paymentForm").reset(); $("paymentDate").valueAsDate = new Date(); $("paymentModal").classList.add("active"); };
window.deleteDebt = async (debtId) => { if (confirm("Eliminare?")) { state.data.debts = state.data.debts.filter((d) => d.id !== debtId); await saveDebts(); } };
$("paymentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const debt = state.data.debts.find((d) => d.id === $("paymentDebtId").value);
  if (debt) { debt.paidAmount = Math.min(debt.totalAmount, debt.paidAmount + parseFloat($("paymentAmount").value)); await saveDebts(); $("paymentModal").classList.remove("active"); }
});

$("addDebtBtn").addEventListener("click", () => {
  $("debtModalTitle").textContent = "Nuovo Debito/Credito"; $("debtForm").reset(); $("debtId").value = ""; $("debtPaid").value = 0; $("debtDate").valueAsDate = new Date(); state.currentDebtType = "debt";
  document.querySelectorAll("#debtForm .type-btn").forEach((b) => b.classList.toggle("active", b.dataset.debttype === "debt"));
  $("debtModal").classList.add("active");
});
document.querySelectorAll("#debtForm .type-btn").forEach((btn) => btn.addEventListener("click", () => {
  document.querySelectorAll("#debtForm .type-btn").forEach((b) => b.classList.remove("active")); btn.classList.add("active"); state.currentDebtType = btn.dataset.debttype;
}));
$("debtForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const debt = { id: $("debtId").value || genId(), type: state.currentDebtType, person: $("debtPerson").value.trim(), description: $("debtDescription").value.trim(), totalAmount: parseFloat($("debtTotal").value), paidAmount: parseFloat($("debtPaid").value) || 0, date: $("debtDate").value };
  const idx = state.data.debts.findIndex((d) => d.id === debt.id);
  if (idx !== -1) state.data.debts[idx] = debt; else state.data.debts.push(debt);
  await saveDebts(); $("debtModal").classList.remove("active");
});

function populateCategorySelect() { const sel = $("mvCategory"); sel.innerHTML = state.data.categories.filter((c) => c.type === state.currentType).map((c) => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join("") || '<option value="">Nessuna</option>'; }
function populateAccountSelect() { const sel = $("mvAccount"); sel.innerHTML = state.data.accounts.length ? state.data.accounts.map((a) => `<option value="${a.id}">${a.icon} ${a.name}</option>`).join("") : '<option value="">Nessun conto</option>'; }

function openMovementModal(id = null) {
  state.currentType = "income";
  document.querySelectorAll("#movementForm .type-btn").forEach((b) => b.classList.remove("active"));
  document.querySelector('#movementForm .type-btn[data-type="income"]').classList.add("active");
  if (id) {
    const m = state.data.movements.find((x) => x.id === id); if (!m) return;
    $("mvModalTitle").textContent = "Modifica Movimento"; $("mvId").value = m.id; $("mvAmount").value = m.amount; $("mvDescription").value = m.description; $("mvDate").value = m.date; $("mvNotes").value = m.notes || "";
    state.currentType = m.type; document.querySelectorAll("#movementForm .type-btn").forEach((b) => b.classList.toggle("active", b.dataset.type === m.type));
    populateCategorySelect(); populateAccountSelect();
    setTimeout(() => { $("mvCategory").value = m.categoryId; $("mvAccount").value = m.accountId; }, 0);
  } else {
    $("mvModalTitle").textContent = "Nuovo Movimento"; $("movementForm").reset(); $("mvId").value = ""; $("mvDate").valueAsDate = new Date();
    populateCategorySelect(); populateAccountSelect();
  }
  $("movementModal").classList.add("active");
}
document.querySelectorAll("#movementForm .type-btn").forEach((btn) => btn.addEventListener("click", () => {
  document.querySelectorAll("#movementForm .type-btn").forEach((b) => b.classList.remove("active")); btn.classList.add("active"); state.currentType = btn.dataset.type; populateCategorySelect();
}));
$("movementForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const mv = { id: $("mvId").value || genId(), type: state.currentType, amount: parseFloat($("mvAmount").value), description: $("mvDescription").value.trim(), categoryId: $("mvCategory").value, accountId: $("mvAccount").value, date: $("mvDate").value, notes: $("mvNotes").value.trim() };
  const idx = state.data.movements.findIndex((m) => m.id === mv.id);
  if (idx !== -1) state.data.movements[idx] = mv; else state.data.movements.push(mv);
  await saveMovements(); $("movementModal").classList.remove("active");
});

function openViewModal(id) {
  const m = state.data.movements.find((x) => x.id === id); if (!m) return; state.currentViewId = id;
  const cat = getCategory(m.categoryId); const acc = getAccount(m.accountId); const isIncome = m.type === "income";
  $("viewContent").innerHTML = `<div class="view-item"><label>Importo</label><p class="amount-big" style="color:${isIncome ? "var(--income)" : "var(--expense)"}">${isIncome ? "+" : "-"} ${formatMoney(m.amount)}</p></div><div class="view-item"><label>Tipo</label><p><span class="mv-badge ${m.type}">${isIncome ? "ENTRATA" : "USCITA"}</span></p></div><div class="view-item"><label>Descrizione</label><p>${m.description}</p></div><div class="view-item"><label>Categoria</label><p>${cat.icon} ${cat.name}</p></div><div class="view-item"><label>Conto</label><p>${acc.icon} ${acc.name}</p></div><div class="view-item"><label>Data</label><p>${formatDate(m.date)}</p></div>${m.notes ? `<div class="view-item"><label>Note</label><p style="font-weight:400;font-size:14px">${m.notes}</p></div>` : ""}`;
  $("viewModal").classList.add("active");
}
$("editFromViewBtn").addEventListener("click", () => { $("viewModal").classList.remove("active"); setTimeout(() => openMovementModal(state.currentViewId), 200); });
$("deleteFromViewBtn").addEventListener("click", async () => { if (confirm("Eliminare?")) { state.data.movements = state.data.movements.filter((m) => m.id !== state.currentViewId); await saveMovements(); $("viewModal").classList.remove("active"); } });

function openCategoryModal(id = null, defaultType = "expense") {
  if (id) {
    const c = state.data.categories.find((x) => x.id === id); if (!c) return;
    $("catModalTitle").textContent = "Modifica Categoria"; $("catId").value = c.id; $("catName").value = c.name; $("catIcon").value = c.icon; $("catColor").value = c.color;
    state.currentCatType = c.type; document.querySelectorAll("#categoryForm .type-btn").forEach((b) => b.classList.toggle("active", b.dataset.cattype === c.type));
  } else {
    $("catModalTitle").textContent = "Nuova Categoria"; $("categoryForm").reset(); $("catId").value = "";
    state.currentCatType = defaultType; $("catColor").value = defaultType === "income" ? "#10b981" : "#ef4444";
    document.querySelectorAll("#categoryForm .type-btn").forEach((b) => b.classList.toggle("active", b.dataset.cattype === defaultType));
  }
  $("categoryModal").classList.add("active");
}
document.querySelectorAll("#categoryForm .type-btn").forEach((btn) => btn.addEventListener("click", () => {
  document.querySelectorAll("#categoryForm .type-btn").forEach((b) => b.classList.remove("active")); btn.classList.add("active"); state.currentCatType = btn.dataset.cattype;
}));
$("categoryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const cat = { id: $("catId").value || genId(), name: $("catName").value.trim(), icon: $("catIcon").value.trim(), color: $("catColor").value, type: state.currentCatType };
  const idx = state.data.categories.findIndex((c) => c.id === cat.id);
  if (idx !== -1) state.data.categories[idx] = cat; else state.data.categories.push(cat);
  await saveCategories(); $("categoryModal").classList.remove("active");
});

function openAccountModal(id = null) {
  if (id) {
    const a = state.data.accounts.find((x) => x.id === id); if (!a) return;
    $("accModalTitle").textContent = "Modifica Conto"; $("accId").value = a.id; $("accName").value = a.name; $("accIcon").value = a.icon; $("accLogo").value = a.logo || ""; $("accColor").value = a.color; $("accBalance").value = a.balance;
  } else {
    $("accModalTitle").textContent = "Nuovo Conto"; $("accountForm").reset(); $("accId").value = ""; $("accColor").value = "#4f46e5"; $("accBalance").value = 0;
  }
  $("accountModal").classList.add("active");
}
$("accountForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const acc = { id: $("accId").value || genId(), name: $("accName").value.trim(), icon: $("accIcon").value.trim(), logo: $("accLogo").value.trim(), color: $("accColor").value, balance: parseFloat($("accBalance").value) || 0 };
  const idx = state.data.accounts.findIndex((a) => a.id === acc.id);
  if (idx !== -1) state.data.accounts[idx] = acc; else state.data.accounts.push(acc);
  await saveAccounts(); $("accountModal").classList.remove("active");
});

document.querySelectorAll(".toggle-password").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    const icon = btn.querySelector("i");
    if (input.type === "password") { input.type = "text"; icon.classList.remove("fa-eye"); icon.classList.add("fa-eye-slash"); }
    else { input.type = "password"; icon.classList.remove("fa-eye-slash"); icon.classList.add("fa-eye"); }
  });
});

function closeAllModals() { document.querySelectorAll(".modal").forEach((m) => m.classList.remove("active")); }
document.querySelectorAll(".close-modal, .modal-overlay").forEach((el) => el.addEventListener("click", closeAllModals));
["cancelMvBtn", "closeViewBtn", "cancelCatBtn", "cancelAccBtn", "cancelDebtBtn", "cancelPaymentBtn"].forEach((id) => $(id).addEventListener("click", closeAllModals));

$("fabAdd").addEventListener("click", () => {
  if (state.currentSection === "categories") $("addExpenseCategoryBtn").click();
  else if (state.currentSection === "accounts") $("addAccountBtn").click();
  else if (state.currentSection === "debts") $("addDebtBtn").click();
  else openMovementModal();
});
$("addIncomeCategoryBtn").addEventListener("click", () => openCategoryModal(null, "income"));
$("addExpenseCategoryBtn").addEventListener("click", () => openCategoryModal(null, "expense"));
$("addAccountBtn").addEventListener("click", () => openAccountModal(null));

function refreshCurrent() {
  if (!state.data) return;
  if (state.currentSection === "dashboard") renderDashboard();
  else if (state.currentSection === "movements") renderMovements();
  else if (state.currentSection === "categories") renderCategories();
  else if (state.currentSection === "accounts") renderAccounts();
  else if (state.currentSection === "debts") renderDebts();
}

initTheme();
