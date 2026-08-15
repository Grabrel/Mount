(() => {
  "use strict";

  const STORAGE_KEY = "cofrinho_web_v04";
  const LEGACY_STORAGE_KEYS = ["cofrinho_web_v03", "cofrinho_web_v02", "cofrinho_web_v01"];
  const THEME_KEY = "cofrinho_theme";
  const LOCAL_AUTH_KEY = "nervi_local_auth_v051";
  const APP_VERSION = "0.5.1";
  window.COFRINHO_VERSION = APP_VERSION;
  const PUBLIC_VERSION = "Versão Beta 0.4";

  const PRIORITIES = {1: "Essencial", 2: "Importante", 3: "Flexível"};
  const EXPENSE_CATEGORIES = [
    "Moradia", "Alimentação", "Transporte", "Saúde", "Educação",
    "Contas e serviços", "Assinaturas", "Dívidas", "Lazer", "Compras", "Outros"
  ];
  const DEFAULT_PRIORITIES = {
    "Moradia": 1, "Alimentação": 1, "Transporte": 2, "Saúde": 1,
    "Educação": 2, "Contas e serviços": 2, "Assinaturas": 3,
    "Dívidas": 1, "Lazer": 3, "Compras": 3, "Outros": 3
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  let selectedMonth = monthKey();
  let currentView = "dashboard";
  let setupPlanned = [];
  let setupPhoto = { type: "none", value: "" };

  const state = loadState();

  function initialState() {
    return {
      version: APP_VERSION,
      profile: null,
      goal: null,
      categoryPriorities: { ...DEFAULT_PRIORITIES },
      notificationPrefs: {
        enabled: true,
        daysBefore: 3,
        showOverdue: true,
        showDashboard: true
      },
      goalCycles: [],
      plannedExpenses: [],
      movements: []
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return migrateState(JSON.parse(raw));
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const rawLegacy = localStorage.getItem(legacyKey);
        if (rawLegacy) {
          const migrated = migrateState(JSON.parse(rawLegacy));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
          return migrated;
        }
      }
    } catch (err) {
      console.warn("Falha ao carregar dados locais:", err);
    }
    return initialState();
  }

  function migrateState(parsed) {
    const base = {
      ...initialState(),
      ...(parsed || {}),
      categoryPriorities: {
        ...DEFAULT_PRIORITIES,
        ...((parsed || {}).categoryPriorities || {})
      },
      notificationPrefs: {
        enabled: (parsed || {}).notificationPrefs?.enabled !== false,
        daysBefore: Math.max(1, Math.min(7, Number((parsed || {}).notificationPrefs?.daysBefore || 3))),
        showOverdue: (parsed || {}).notificationPrefs?.showOverdue !== false,
        showDashboard: (parsed || {}).notificationPrefs?.showDashboard !== false
      },
      plannedExpenses: Array.isArray((parsed || {}).plannedExpenses)
        ? parsed.plannedExpenses.map(normalizePlannedExpense)
        : [],
      movements: Array.isArray((parsed || {}).movements)
        ? parsed.movements.map(movement => ({...movement, hashVersion: Number(movement.hashVersion || 1)}))
        : []
    };
    if (base.profile) {
      base.profile.photo = normalizePhoto(
        base.profile.photo || base.profile.avatar || base.profile.avatarData || base.profile.avatarUrl || null
      );
    }
    if (!Array.isArray(base.goalCycles)) base.goalCycles = [];
    if (base.goal) {
      base.goal.cycleNumber = Number(base.goal.cycleNumber || 1);
      base.goal.startDate = base.goal.startDate || monthFromISO(base.goal.createdAt) + "-01";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(base.goal.startDate || ""))) {
        base.goal.startDate = todayISO();
      }
      // Perfis antigos ficam desbloqueados para iniciar um ciclo formal da v0.5.
      base.goal.endDate = base.goal.endDate || todayISO();
      base.goal.durationMonths = Number(base.goal.durationMonths || 0);
    }
    base.version = APP_VERSION;
    return base;
  }

  function normalizePlannedExpense(item) {
    if (Array.isArray(item.revisions)) {
      return {
        ...item,
        startMonth: item.startMonth || monthFromISO(item.createdAt) || monthKey(),
        archivedFrom: item.archivedFrom || null,
        revisions: item.revisions.map(rev => ({
          ...rev,
          priority: Number(rev.priority || 3),
          value: Number(rev.value || 0),
          dueDay: normalizeDueDay(rev.dueDay)
        }))
      };
    }
    const startMonth = monthFromISO(item.createdAt) || monthKey();
    return {
      id: Number(item.id),
      createdAt: item.createdAt || nowISO(),
      startMonth,
      archivedFrom: item.active === false ? monthKey() : null,
      revisions: [{
        effectiveMonth: startMonth,
        name: item.name || "Gasto previsto",
        category: item.category || "Outros",
        value: Number(item.value || 0),
        priority: Number(item.priority || 3),
        dueDay: normalizeDueDay(item.dueDay),
        updatedAt: item.createdAt || nowISO()
      }]
    };
  }

  function saveState() {
    state.version = APP_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function normalizeAccessUsername(value) {
    return String(value || "").trim().toLowerCase();
  }

  function bytesToBase64(bytes) {
    let binary = "";
    bytes.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }

  async function derivePasswordHash(password, saltBytes, iterations = 120000) {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt: saltBytes,
        iterations
      },
      keyMaterial,
      256
    );
    return bytesToBase64(new Uint8Array(bits));
  }

  function readLocalAuth() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_AUTH_KEY) || "null");
    } catch {
      return null;
    }
  }

  async function saveLocalCredential(username, password) {
    if (!crypto?.subtle) throw new Error("Este navegador não oferece o recurso de segurança necessário.");
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iterations = 120000;
    const hash = await derivePasswordHash(password, salt, iterations);
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify({
      username: normalizeAccessUsername(username),
      salt: bytesToBase64(salt),
      hash,
      iterations
    }));
  }

  async function verifyLocalCredential(username, password) {
    const auth = readLocalAuth();
    if (!auth) return false;
    if (normalizeAccessUsername(username) !== normalizeAccessUsername(auth.username)) return false;
    const hash = await derivePasswordHash(
      password,
      base64ToBytes(auth.salt),
      Number(auth.iterations || 120000)
    );
    return hash === auth.hash;
  }

  function setLoginError(message = "") {
    const box = $("#loginError");
    if (!box) return;
    box.textContent = message;
    box.classList.toggle("hidden", !message);
  }

  function showLogin(prefill = true) {
    $("#loginScreen")?.classList.remove("hidden");
    $("#setupScreen")?.classList.add("hidden");
    $("#mainScreen")?.classList.add("hidden");
    setLoginError();
    if (prefill && state.profile?.username && $("#loginUsername")) {
      $("#loginUsername").value = state.profile.username;
    }
    if ($("#loginPassword")) $("#loginPassword").value = "";
    setTimeout(() => ($("#loginUsername")?.value ? $("#loginPassword") : $("#loginUsername"))?.focus(), 0);
  }

  async function handleLogin(event) {
    event?.preventDefault();
    setLoginError();
    const username = $("#loginUsername")?.value.trim() || "";
    const password = $("#loginPassword")?.value || "";
    if (!username) return setLoginError("Informe seu usuário.");
    if (!password) return setLoginError("Informe sua senha.");

    const button = $("#loginSubmit");
    if (button) { button.disabled = true; button.textContent = "Entrando..."; }
    try {
      if (!state.profile || !state.goal) {
        setLoginError("Conta não encontrada neste dispositivo. Clique em “Criar conta”.");
        return;
      }
      const auth = readLocalAuth();
      if (!auth) {
        setLoginError("Este perfil foi criado antes da tela de login. Clique em “Criar conta” para definir seu acesso.");
        return;
      }
      const ok = await verifyLocalCredential(username, password);
      if (!ok || normalizeAccessUsername(state.profile.username) !== normalizeAccessUsername(username)) {
        setLoginError("Usuário ou senha incorretos.");
        return;
      }
      showMain();
    } catch (err) {
      console.error(err);
      setLoginError("Não foi possível entrar agora.");
    } finally {
      if (button) { button.disabled = false; button.textContent = "Entrar"; }
    }
  }

  function openCreateAccountFlow() {
    setLoginError();
    showSetup();
  }

  async function signOutLocal() {
    $("#loginPassword") && ($("#loginPassword").value = "");
    showLogin(true);
  }

  function money(value) {
    return new Intl.NumberFormat("pt-BR", {style: "currency", currency: "BRL"}).format(Number(value) || 0);
  }
  function todayISO() {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  }
  function nowISO() { return new Date().toISOString(); }
  function monthKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }
  function monthFromISO(value) {
    if (!value || typeof value !== "string") return null;
    const match = value.match(/^(\d{4})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}` : null;
  }
  function validMonth(value) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || "")); }
  function shiftMonth(month, delta) {
    const [year, mon] = month.split("-").map(Number);
    return monthKey(new Date(year, mon - 1 + delta, 1));
  }
  function monthLabel(month) {
    const [year, mon] = month.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, mon - 1, 1));
  }
  function daysInMonth(month) {
    const [year, mon] = month.split("-").map(Number);
    return new Date(year, mon, 0).getDate();
  }
  function normalizeDueDay(value) {
    if (value === null || value === undefined || value === "") return null;
    const day = Number(value);
    return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null;
  }
  function effectiveDueDate(month, dueDay) {
    const day = normalizeDueDay(dueDay);
    if (!day) return null;
    return `${month}-${String(Math.min(day, daysInMonth(month))).padStart(2, "0")}`;
  }
  function defaultDateForMonth(month, preferredDay = null) {
    if (month === monthKey()) return todayISO();
    const day = preferredDay ? Math.min(Number(preferredDay), daysInMonth(month)) : 1;
    return `${month}-${String(day).padStart(2, "0")}`;
  }
  function formatDate(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  function addMonthsISO(iso, months) {
    const [y, m, d] = String(iso).split("-").map(Number);
    const target = new Date(y, (m - 1) + Number(months || 0), d);
    if (target.getDate() !== d) {
      target.setDate(0);
    }
    return [
      target.getFullYear(),
      String(target.getMonth() + 1).padStart(2, "0"),
      String(target.getDate()).padStart(2, "0")
    ].join("-");
  }

  function cycleLocked() {
    return Boolean(state.goal?.endDate && todayISO() < state.goal.endDate);
  }

  function cycleDaysRemaining() {
    if (!state.goal?.endDate) return 0;
    return Math.max(0, diffDays(todayISO(), state.goal.endDate));
  }

  function currentCycleSaved() {
    if (!state.goal?.startDate) return totalSaved();
    const start = state.goal.startDate;
    const end = state.goal.endDate || "9999-12-31";
    return state.movements
      .filter(m => m.type === "META" && m.date >= start && m.date <= end)
      .reduce((sum, m) => sum + Number(m.value), 0);
  }
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function nextId(items) { return Math.max(0, ...items.map(item => Number(item.id) || 0)) + 1; }
  function priorityLabel(level) { return PRIORITIES[Number(level)] || PRIORITIES[3]; }

  function bytesToHex(buffer) {
    return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return bytesToHex(digest);
  }
  async function movementHash(movement) {
    const version = Number(movement.hashVersion || 1);
    const payload = {
      id: movement.id,
      createdAt: movement.createdAt,
      date: movement.date,
      month: movement.month,
      type: movement.type,
      category: movement.category,
      description: movement.description,
      value: Number(movement.value).toFixed(2),
      priority: movement.priority ?? null,
      plannedId: movement.plannedId ?? null
    };
    if (version >= 2) {
      payload.expectedValue = movement.expectedValue === null || movement.expectedValue === undefined ? null : Number(movement.expectedValue).toFixed(2);
      payload.dueDay = normalizeDueDay(movement.dueDay);
    }
    payload.previousHash = movement.previousHash;
    return sha256(JSON.stringify(payload));
  }
  async function addMovement({ type, category, description, value, priority = null, plannedId = null, expectedValue = null, dueDay = null, referenceMonth = selectedMonth, paymentDate = null }) {
    const previous = state.movements.at(-1)?.hash || "GENESIS";
    const movement = {
      id: nextId(state.movements),
      createdAt: nowISO(),
      date: paymentDate || defaultDateForMonth(referenceMonth),
      month: referenceMonth,
      type,
      category,
      description,
      value: Number(value),
      priority,
      plannedId,
      expectedValue: expectedValue === null ? null : Number(expectedValue),
      dueDay: normalizeDueDay(dueDay),
      previousHash: previous,
      hashVersion: 2
    };
    movement.hash = await movementHash(movement);
    state.movements.push(movement);
    saveState();
    return movement;
  }
  async function verifyIntegrity() {
    let previous = "GENESIS";
    for (const movement of state.movements) {
      if (movement.previousHash !== previous) return { ok: false, message: `Quebra na cadeia antes do registro #${movement.id}.` };
      const calculated = await movementHash(movement);
      if (calculated !== movement.hash) return { ok: false, message: `Possível adulteração no registro #${movement.id}.` };
      previous = movement.hash;
    }
    return { ok: true, message: "Histórico íntegro." };
  }

  function revisionForMonth(item, month = selectedMonth) {
    if (!item || month < item.startMonth) return null;
    if (item.archivedFrom && month >= item.archivedFrom) return null;
    const revisions = [...item.revisions].filter(rev => rev.effectiveMonth <= month).sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth));
    return revisions.at(-1) || null;
  }
  function plannedForMonth(month = selectedMonth) {
    return state.plannedExpenses.map(item => {
      const revision = revisionForMonth(item, month);
      return revision ? { item, revision } : null;
    }).filter(Boolean);
  }
  function findPlanned(id) { return state.plannedExpenses.find(item => Number(item.id) === Number(id)); }
  function savePlannedRevision(itemId, data, effectiveMonth = selectedMonth) {
    const item = findPlanned(itemId);
    if (!item) throw new Error("Gasto previsto não encontrado.");
    const revision = {
      effectiveMonth,
      name: data.name.trim(),
      category: data.category,
      value: Number(data.value),
      priority: Number(data.priority),
      dueDay: normalizeDueDay(data.dueDay),
      updatedAt: nowISO()
    };
    if (!revision.name) throw new Error("Informe o nome do gasto previsto.");
    if (!(revision.value > 0)) throw new Error("O valor previsto precisa ser maior que zero.");
    const existingIndex = item.revisions.findIndex(rev => rev.effectiveMonth === effectiveMonth);
    if (existingIndex >= 0) item.revisions[existingIndex] = revision; else item.revisions.push(revision);
    item.revisions.sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth));
    saveState();
  }
  function createPlannedExpense(data, startMonth = selectedMonth) {
    const name = data.name.trim();
    const value = Number(data.value);
    if (!name) throw new Error("Informe o nome do gasto previsto.");
    if (!(value > 0)) throw new Error("O valor previsto precisa ser maior que zero.");
    const item = {
      id: nextId(state.plannedExpenses),
      createdAt: nowISO(),
      startMonth,
      archivedFrom: null,
      revisions: [{
        effectiveMonth: startMonth,
        name,
        category: data.category,
        value,
        priority: Number(data.priority),
        dueDay: normalizeDueDay(data.dueDay),
        updatedAt: nowISO()
      }]
    };
    state.plannedExpenses.push(item);
    saveState();
    return item;
  }
  function archivePlanned(itemId, fromMonth = selectedMonth) {
    const item = findPlanned(itemId);
    if (!item) throw new Error("Gasto previsto não encontrado.");
    item.archivedFrom = fromMonth;
    saveState();
  }

  function monthMovements(month = selectedMonth) { return state.movements.filter(movement => movement.month === month); }
  function incomeAlreadyRegistered(month = selectedMonth) {
    return monthMovements(month).some(m => m.type === "RENDA" && m.category === "Renda fixa");
  }
  function monthSummary(month = selectedMonth) {
    const movements = monthMovements(month);
    const income = movements.filter(m => m.type === "RENDA").reduce((sum, m) => sum + Number(m.value), 0);
    const goal = movements.filter(m => m.type === "META").reduce((sum, m) => sum + Number(m.value), 0);
    const expenses = movements.filter(m => m.type === "GASTO").reduce((sum, m) => sum + Number(m.value), 0);
    return { income, goal, expenses, available: income - goal - expenses };
  }
  function totalSaved() {
    return state.movements.filter(m => m.type === "META").reduce((sum, m) => sum + Number(m.value), 0);
  }
  function paymentForPlanned(plannedId, month = selectedMonth) {
    return monthMovements(month).find(m => m.type === "GASTO" && Number(m.plannedId) === Number(plannedId)) || null;
  }
  function notificationPrefs() {
    if (!state.notificationPrefs) {
      state.notificationPrefs = {
        enabled: true,
        daysBefore: 3,
        showOverdue: true,
        showDashboard: true
      };
    }
    return state.notificationPrefs;
  }

  function diffDays(fromISO, toISO) {
    const from = new Date(`${fromISO}T12:00:00`);
    const to = new Date(`${toISO}T12:00:00`);
    return Math.round((to - from) / 86400000);
  }

  function notificationLabel(days) {
    if (days === 0) return "Vence hoje";
    if (days === 1) return "Vence amanhã";
    if (days > 1) return `Vence em ${days} dias`;
    const overdue = Math.abs(days);
    if (overdue === 1) return "Atrasado há 1 dia";
    return `Atrasado há ${overdue} dias`;
  }

  function currentNotifications() {
    const prefs = notificationPrefs();
    if (!prefs.enabled || !state.profile || !state.goal) return [];

    const currentMonth = monthKey();
    const today = todayISO();

    return plannedForMonth(currentMonth)
      .map(({ item, revision }) => {
        if (paymentForPlanned(item.id, currentMonth)) return null;

        const dueDate = effectiveDueDate(currentMonth, revision.dueDay);
        if (!dueDate) return null;

        const days = diffDays(today, dueDate);

        if (days > Number(prefs.daysBefore || 3)) return null;
        if (days < 0 && !prefs.showOverdue) return null;

        return {
          plannedId: item.id,
          name: revision.name,
          category: revision.category,
          value: Number(revision.value),
          priority: Number(revision.priority),
          dueDate,
          days,
          label: notificationLabel(days),
          severity: days < 0 ? "late" : days === 0 ? "today" : "upcoming"
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const order = { late: 0, today: 1, upcoming: 2 };
        return order[a.severity] - order[b.severity] || a.days - b.days;
      });
  }

  function notificationClass(item) {
    if (item.severity === "late") return "notification-late";
    if (item.severity === "today") return "notification-today";
    return "notification-upcoming";
  }

  function notificationsHtml(items, emptyText = "Nenhum vencimento próximo.") {
    if (!items.length) {
      return `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
    }

    return `<div class="notification-list">
      ${items.map(item => `
        <div class="notification-item ${notificationClass(item)}">
          <div class="notification-icon">${item.severity === "late" ? "⚠" : "🔔"}</div>
          <div class="notification-copy">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(item.label)} • ${money(item.value)}</span>
            <small>${escapeHtml(item.category)} • ${priorityLabel(item.priority)} • ${formatDate(item.dueDate)}</small>
          </div>
        </div>
      `).join("")}
    </div>`;
  }

  function updateNotificationBell() {
    const badge = $("#notificationBadge");
    if (!badge) return;
    const count = currentNotifications().length;
    badge.textContent = String(count);
    badge.classList.toggle("hidden", count === 0);
    const bell = $("#notificationBell");
    if (bell) {
      bell.classList.toggle("has-alerts", count > 0);
      bell.title = count ? `${count} notificação(ões)` : "Sem notificações";
    }
  }

  function openNotificationsDialog() {
    const prefs = notificationPrefs();
    const items = currentNotifications();

    openDynamicDialog({
      title: "NOTIFICAÇÕES",
      body: `
        <div class="dialog-note">
          O Cofrinho avisa sobre vencimentos até
          <strong>${Number(prefs.daysBefore || 3)} dia(s)</strong> antes.
        </div>
        ${notificationsHtml(items)}
        <div class="dialog-actions">
          <button id="cancelDynamicForm" class="button secondary" type="button">Fechar</button>
          <button id="openNotificationSettings" class="button primary" type="button">Configurar avisos</button>
        </div>
      `,
      onOpen: () => {
        $("#openNotificationSettings")?.addEventListener("click", () => {
          closeDynamicDialog();
          navigate("settings");
          setTimeout(() => {
            $("#notificationSettings")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 50);
        });
      },
      onSubmit: () => closeDynamicDialog()
    });
  }

  function dashboardNotificationsHtml() {
    const prefs = notificationPrefs();
    if (!prefs.enabled || !prefs.showDashboard || selectedMonth !== monthKey()) return "";
    const items = currentNotifications();
    if (!items.length) return "";

    return contentWindow(
      `🔔 AVISOS — ${items.length} vencimento${items.length === 1 ? "" : "s"}`,
      notificationsHtml(items)
    );
  }

  function plannedStatus(item, revision, month = selectedMonth) {
    const payment = paymentForPlanned(item.id, month);
    if (payment) return { key: "paid", label: "Pago", className: "status-paid", detail: `Pago em ${formatDate(payment.date)}` };
    const dueDate = effectiveDueDate(month, revision.dueDay);
    if (!dueDate) return { key: "planned", label: "Previsto", className: "status-planned", detail: "Sem vencimento fixo" };
    const currentMonth = monthKey();
    const today = todayISO();
    if (month < currentMonth || (month === currentMonth && dueDate < today)) {
      const days = month === currentMonth ? diffDays(today, dueDate) : -1;
      return { key: "late", label: "Atrasado", className: "status-late", detail: month === currentMonth ? notificationLabel(days) : `Venceu em ${formatDate(dueDate)}` };
    }
    if (month === currentMonth && dueDate === today) return { key: "today", label: "Vence hoje", className: "status-today", detail: formatDate(dueDate) };
    if (month === currentMonth) {
      const days = diffDays(today, dueDate);
      const prefs = notificationPrefs();
      if (days > 0 && days <= Number(prefs.daysBefore || 3)) {
        return { key: "upcoming", label: notificationLabel(days), className: "status-upcoming", detail: formatDate(dueDate) };
      }
    }
    return { key: "planned", label: "Previsto", className: "status-planned", detail: `Vence em ${formatDate(dueDate)}` };
  }
  function planningSummary(month = selectedMonth) {
    const expectedIncome = Number(state.profile?.monthlyIncome || 0);
    const expectedGoal = Math.min(Number(state.goal?.monthlyContribution || 0), expectedIncome);
    const rows = plannedForMonth(month);
    const plannedTotal = rows.reduce((sum, row) => sum + Number(row.revision.value), 0);
    const remainingCommitments = rows.filter(row => !paymentForPlanned(row.item.id, month)).reduce((sum, row) => sum + Number(row.revision.value), 0);
    const actualPaidForPlanned = rows.map(row => paymentForPlanned(row.item.id, month)).filter(Boolean).reduce((sum, payment) => sum + Number(payment.value), 0);
    const expectedPaid = rows.map(row => paymentForPlanned(row.item.id, month)).filter(Boolean).reduce((sum, payment) => {
      const expected = payment.expectedValue === null || payment.expectedValue === undefined ? Number(payment.value) : Number(payment.expectedValue);
      return sum + expected;
    }, 0);
    const summary = monthSummary(month);
    return {
      expectedIncome,
      expectedGoal,
      plannedTotal,
      remainingCommitments,
      projectedFree: expectedIncome - expectedGoal - plannedTotal,
      freeAfterCommitments: summary.available - remainingCommitments,
      actualPaidForPlanned,
      expectedPaid,
      paidDifference: actualPaidForPlanned - expectedPaid
    };
  }
  function deviationInfo(item, revision, month = selectedMonth) {
    const payment = paymentForPlanned(item.id, month);
    if (!payment) return { paid: false, expected: Number(revision.value), actual: null, diff: null, text: "Aguardando pagamento.", className: "difference-neutral" };
    const expected = payment.expectedValue === null || payment.expectedValue === undefined ? Number(revision.value) : Number(payment.expectedValue);
    const actual = Number(payment.value);
    const diff = actual - expected;
    if (Math.abs(diff) < 0.005) return { paid: true, expected, actual, diff: 0, text: "Pago exatamente como previsto.", className: "difference-neutral" };
    if (diff > 0) return { paid: true, expected, actual, diff, text: `${money(diff)} acima do previsto.`, className: "difference-bad" };
    return { paid: true, expected, actual, diff, text: `${money(Math.abs(diff))} abaixo do previsto.`, className: "difference-good" };
  }

  // Aparência e foto de perfil
  function getTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  }
  function applyTheme(theme, persist = true) {
    const normalized = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = normalized;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", normalized === "dark" ? "#321B24" : "#B3261E");
    if (persist) {
      try { localStorage.setItem(THEME_KEY, normalized); } catch (_) {}
    }
    syncThemeButtons();
  }
  function syncThemeButtons() {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    $$('[data-theme-choice]').forEach(button => {
      const active = button.dataset.themeChoice === current;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }
  function themeControlHtml() {
    const current = getTheme();
    return `<div class="theme-switch">
      <button type="button" data-theme-choice="light" class="${current === "light" ? "active" : ""}">☀ Claro</button>
      <button type="button" data-theme-choice="dark" class="${current === "dark" ? "active" : ""}">☾ Escuro</button>
    </div>`;
  }

  function normalizePhoto(input) {
    if (input && typeof input === "object") {
      if (input.type === "upload" && /^data:image\//.test(input.value || "")) {
        return { type: "upload", value: input.value, name: input.name || "imagem local" };
      }
      if (input.type === "url" && /^https?:\/\//i.test(input.value || "")) {
        return { type: "url", value: input.value };
      }
      return { type: "none", value: "" };
    }
    if (typeof input === "string") {
      if (/^data:image\//.test(input)) return { type: "upload", value: input, name: "imagem local" };
      if (/^https?:\/\//i.test(input)) return { type: "url", value: input };
    }
    return { type: "none", value: "" };
  }
  function photoSourceLabel(photo) {
    const normalized = normalizePhoto(photo);
    if (normalized.type === "upload") return "arquivo local";
    if (normalized.type === "url") return "link externo";
    return "sem foto";
  }
  function profileInitial(name = "") {
    const first = String(name || "?").trim().charAt(0).toUpperCase();
    return first || "?";
  }
  function photoHtml(photo, size = "md", username = "") {
    const normalized = normalizePhoto(photo);
    if (normalized.type === "upload" || normalized.type === "url") {
      return `<img class="profile-photo ${size}" src="${escapeHtml(normalized.value)}" alt="Foto de perfil" referrerpolicy="no-referrer">`;
    }
    return `<span class="profile-placeholder ${size}" aria-label="Sem foto">${escapeHtml(profileInitial(username))}</span>`;
  }
  async function fileToPhotoDataUrl(file) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const img = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = dataUrl;
    });
    const maxSize = 240;
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", .86);
  }
  function isValidPhotoUrl(value) {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol);
    } catch {
      return false;
    }
  }
  function updateSetupPhotoCompact() {
    const root = $("#setupPhotoCompact");
    if (!root) return;
    const username = $("#setupUsername")?.value || "";
    root.innerHTML = `${photoHtml(setupPhoto, "sm", username)}<span class="source-chip">${escapeHtml(photoSourceLabel(setupPhoto))}</span>`;
  }

  function displayUsername(value) {
    const clean = String(value || "").trim();
    return clean || "Usuário";
  }

  function updateSetupPlatformTitle() {
    const username = displayUsername($("#setupUsername")?.value);
    const title = $("#setupTitle");
    if (title) title.textContent = `${username} - Plataforma Nervi`;
  }

  function updateSetupProfileHero() {
    const root = $("#setupProfilePhotoHero");
    if (!root) return;
    const username = $("#setupUsername")?.value || "";
    root.innerHTML = photoHtml(setupPhoto, "hero", username);
  }

  function updateSetupIdentityVisuals() {
    updateSetupPhotoCompact();
    updateSetupProfileHero();
    updateSetupPlatformTitle();
  }
  function renderPhotoPicker(rootElement, photoValue, onChange, username = "") {
    if (!rootElement) return;
    const current = normalizePhoto(photoValue);
    rootElement.innerHTML = `
      <div class="photo-picker">
        <div class="photo-preview-row">
          ${photoHtml(current, "lg", username)}
          <div>
            <strong>Foto atual</strong><br>
            <span class="source-chip">${escapeHtml(photoSourceLabel(current))}</span>
          </div>
        </div>
        <div class="photo-methods">
          <div class="photo-method">
            <h4>Arquivo do dispositivo</h4>
            <p>Escolha uma foto. Ela será reduzida e ficará salva localmente no navegador.</p>
            <input class="photo-file-input" type="file" accept="image/*">
          </div>
          <div class="photo-method">
            <h4>Link direto online</h4>
            <p>Cole uma URL direta de imagem. A imagem será carregada pelo navegador a partir desse endereço.</p>
            <input class="photo-url-input" placeholder="https://.../foto.jpg" value="${current.type === "url" ? escapeHtml(current.value) : ""}">
            <div class="photo-actions"><button type="button" class="button secondary use-photo-url">Usar link</button></div>
          </div>
        </div>
        ${current.type !== "none" ? `<div class="photo-actions"><button type="button" class="button danger remove-photo">Remover foto</button></div>` : ""}
      </div>`;

    $(".photo-file-input", rootElement)?.addEventListener("change", async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const value = await fileToPhotoDataUrl(file);
        onChange({ type: "upload", value, name: file.name });
      } catch {
        await alertAction("Não foi possível processar essa imagem.");
      }
    });
    $(".use-photo-url", rootElement)?.addEventListener("click", async () => {
      const value = $(".photo-url-input", rootElement)?.value.trim() || "";
      if (!isValidPhotoUrl(value)) {
        await alertAction("Informe um link válido começando com http:// ou https://.");
        return;
      }
      onChange({ type: "url", value });
    });
    $(".remove-photo", rootElement)?.addEventListener("click", () => onChange({ type: "none", value: "" }));
  }

  function showSetup() {
    $("#loginScreen")?.classList.add("hidden");
    $("#setupScreen").classList.remove("hidden");
    $("#mainScreen").classList.add("hidden");
    if (!setupPlanned.length) addSetupPlannedRow();
    renderSetupPlanned();
    const rerenderSetupPhoto = photo => {
      setupPhoto = normalizePhoto(photo);
      renderPhotoPicker($("#setupPhotoPicker"), setupPhoto, rerenderSetupPhoto, $("#setupUsername")?.value || "");
      updateSetupIdentityVisuals();
    };
    renderPhotoPicker($("#setupPhotoPicker"), setupPhoto, rerenderSetupPhoto, $("#setupUsername")?.value || "");
    updateSetupIdentityVisuals();
    updateSetupPreview();
  }
  function addSetupPlannedRow() {
    setupPlanned.push({ tempId: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()), name: "", category: "Moradia", value: 0, priority: 1, dueDay: null });
  }
  function renderSetupPlanned() {
    const list = $("#setupPlannedList");
    list.innerHTML = "";
    setupPlanned.forEach(item => {
      const row = document.createElement("div");
      row.className = "planned-editor-row";
      row.innerHTML = `
        <input class="sp-name" placeholder="Ex.: Aluguel" value="${escapeHtml(item.name)}">
        <select class="sp-category">${EXPENSE_CATEGORIES.map(cat => `<option ${cat === item.category ? "selected" : ""}>${escapeHtml(cat)}</option>`).join("")}</select>
        <input class="sp-value" type="number" min="0" step="0.01" value="${Number(item.value) || 0}" title="Valor previsto">
        <select class="sp-priority">${[1, 2, 3].map(level => `<option value="${level}" ${Number(item.priority) === level ? "selected" : ""}>${PRIORITIES[level]}</option>`).join("")}</select>
        <input class="sp-due" type="number" min="1" max="31" placeholder="Venc. dia" value="${item.dueDay || ""}" title="Dia de vencimento opcional">
        <button class="button danger remove-planned" type="button">Remover</button>`;
      $(".sp-name", row).addEventListener("input", e => { item.name = e.target.value; });
      $(".sp-category", row).addEventListener("change", e => {
        item.category = e.target.value;
        item.priority = DEFAULT_PRIORITIES[item.category] || 3;
        renderSetupPlanned();
        updateSetupPreview();
      });
      $(".sp-value", row).addEventListener("input", e => { item.value = Number(e.target.value) || 0; updateSetupPreview(); });
      $(".sp-priority", row).addEventListener("change", e => { item.priority = Number(e.target.value); });
      $(".sp-due", row).addEventListener("input", e => { item.dueDay = normalizeDueDay(e.target.value); });
      $(".remove-planned", row).addEventListener("click", () => {
        setupPlanned = setupPlanned.filter(p => p.tempId !== item.tempId);
        renderSetupPlanned();
        updateSetupPreview();
      });
      list.appendChild(row);
    });
    if (!setupPlanned.length) list.innerHTML = `<div class="empty-state">Nenhum gasto previsto. Você pode criar a conta assim mesmo.</div>`;
  }
  function updateSetupPreview() {
    const income = Number($("#setupIncome")?.value || 0);
    const goal = Number($("#setupGoalMonthly")?.value || 0);
    const planned = setupPlanned.reduce((sum, item) => sum + Number(item.value || 0), 0);
    const free = income - goal - planned;
    $("#setupPreviewIncome").textContent = money(income);
    $("#setupPreviewGoal").textContent = money(goal);
    $("#setupPreviewPlanned").textContent = money(planned);
    $("#setupPreviewFree").textContent = money(free);
    $("#setupPreviewFree").style.color = free < 0 ? "var(--danger)" : "";
  }
  function setupError(message = "") {
    const box = $("#setupError");
    if (!message) { box.classList.add("hidden"); box.textContent = ""; return; }
    box.textContent = message; box.classList.remove("hidden");
  }
  async function createProfile() {
    setupError();
    const username = $("#setupUsername").value.trim();
    const password = $("#setupPassword").value;
    const passwordConfirm = $("#setupPasswordConfirm").value;
    const monthlyIncome = Number($("#setupIncome").value);
    const payday = Number($("#setupPayday").value);
    const goalName = $("#setupGoalName").value.trim();
    const goalCategory = $("#setupGoalCategory").value;
    const goalTarget = Number($("#setupGoalTarget").value);
    const monthlyContribution = Number($("#setupGoalMonthly").value);
    const goalDurationMonths = Number($("#setupGoalDuration").value);
    if (!username) return setupError("Informe um nome de usuário.");
    if (username.length < 3) return setupError("O usuário precisa ter pelo menos 3 caracteres.");
    if (password.length < 6) return setupError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== passwordConfirm) return setupError("As senhas não coincidem.");
    if (monthlyIncome < 0) return setupError("A renda não pode ser negativa.");
    if (!(payday >= 1 && payday <= 31)) return setupError("O dia de pagamento deve estar entre 1 e 31.");
    if (!goalName) return setupError("A meta obrigatória precisa de um nome.");
    if (!(goalTarget > 0)) return setupError("O valor-alvo precisa ser maior que zero.");
    if (monthlyContribution < 0) return setupError("A reserva mensal não pode ser negativa.");
    if (monthlyContribution > monthlyIncome) return setupError("A reserva mensal não pode superar a renda.");
    if (!(goalDurationMonths >= 1 && goalDurationMonths <= 60)) return setupError("Escolha uma duração válida para a meta.");
    const cycleStart = todayISO();
    const cycleEnd = addMonthsISO(cycleStart, goalDurationMonths);
    state.profile = {
      username,
      photo: normalizePhoto(setupPhoto),
      monthlyIncome,
      payday,
      lockedUntil: cycleEnd,
      createdAt: nowISO()
    };
    state.goal = {
      name: goalName,
      category: goalCategory,
      target: goalTarget,
      monthlyContribution,
      durationMonths: goalDurationMonths,
      startDate: cycleStart,
      endDate: cycleEnd,
      cycleNumber: 1,
      createdAt: nowISO()
    };
    state.plannedExpenses = [];
    setupPlanned.filter(item => item.name.trim() && Number(item.value) > 0).forEach(item => {
      createPlannedExpense({ name: item.name, category: item.category, value: item.value, priority: item.priority, dueDay: item.dueDay }, monthKey());
    });
    try {
      await saveLocalCredential(username, password);
    } catch (err) {
      return setupError(err.message || "Não foi possível criar a senha de acesso.");
    }
    saveState();
    showMain();
  }

  function renderHeaderIdentity() {
    const profile = state.profile;
    if (!profile) return;
    $("#headerIdentity").innerHTML = `
      ${photoHtml(profile.photo, "xl", profile.username)}
      <div class="header-meta">
        <strong>${escapeHtml(profile.username)}</strong>
        <span class="beta-status">${PUBLIC_VERSION}</span>
      </div>`;
    const platformTitle = $("#mainPlatformTitle");
    if (platformTitle) {
      platformTitle.textContent = `${displayUsername(profile.username)} - Plataforma Nervi`;
    }
  }
  function showMain() {
    $("#loginScreen")?.classList.add("hidden");
    $("#setupScreen").classList.add("hidden");
    $("#mainScreen").classList.remove("hidden");
    renderHeaderIdentity();
    $("#monthSelector").value = selectedMonth;
    navigate(currentView);
  }
  function setSelectedMonth(month) {
    if (!validMonth(month)) return;
    selectedMonth = month;
    $("#monthSelector").value = selectedMonth;
    navigate(currentView);
  }
  function contentWindow(title, html) {
    return `<section class="window content-window"><div class="titlebar">${title}</div><div class="content-body">${html}</div></section>`;
  }
  function navigate(view) {
    currentView = view;
    $$(".nav-button[data-view]").forEach(btn => btn.classList.toggle("active", btn.dataset.view === view));
    if (view === "dashboard") renderDashboard();
    if (view === "planning") renderPlanning();
    if (view === "expense") renderExpenseForm();
    if (view === "goal") renderGoal();
    if (view === "history") renderHistory();
    if (view === "settings") renderSettings();
    updateNotificationBell();
  }
  function metric(label, value, className = "") {
    return `<div class="metric ${className}"><span>${label}</span><strong>${money(value)}</strong></div>`;
  }
  function renderDashboard() {
    const summary = monthSummary(selectedMonth);
    const plan = planningSummary(selectedMonth);
    const saved = totalSaved();
    const target = Number(state.goal.target);
    const progress = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
    const status = incomeAlreadyRegistered(selectedMonth)
      ? "🟢 Renda deste mês registrada. A caixinha já foi separada."
      : `🟡 Renda ainda não registrada em ${monthLabel(selectedMonth)}.`;
    $("#content").innerHTML =
      contentWindow(`INÍCIO — ${escapeHtml(monthLabel(selectedMonth))}`, `
        <div class="metric-grid">
          ${metric("Renda recebida", summary.income)}
          ${metric("Reservado p/ meta", summary.goal)}
          ${metric("Gastos realizados", summary.expenses)}
          ${metric("Disponível hoje", summary.available, summary.available < 0 ? "danger" : "")}
        </div>
        <div style="height:8px"></div>
        <div class="metric-grid">
          ${metric("Gastos previstos", plan.plannedTotal)}
          ${metric("Ainda comprometido", plan.remainingCommitments)}
          ${metric("Livre após compromissos", plan.freeAfterCommitments, plan.freeAfterCommitments < 0 ? "danger" : "")}
          ${metric("Livre previsto do mês", plan.projectedFree, plan.projectedFree < 0 ? "danger" : "good")}
        </div>
        <div class="dashboard-alert">
          Você tem <strong>${money(summary.available)}</strong> disponíveis no mês,
          mas <strong>${money(plan.remainingCommitments)}</strong> ainda estão comprometidos.
          Livre de verdade: <strong>${money(plan.freeAfterCommitments)}</strong>.
        </div>`)
      + dashboardNotificationsHtml()
      + contentWindow(`🎯 META — ${escapeHtml(state.goal.name)}`, `
        <p><strong>Categoria:</strong> ${escapeHtml(state.goal.category)}</p>
        <div class="goal-progress"><div style="width:${progress.toFixed(1)}%"></div></div>
        <p><strong>${money(saved)}</strong> de <strong>${money(target)}</strong> — ${progress.toFixed(1)}%</p>
        <div class="notice">${status}</div>`)
      + contentWindow("📊 PRIORIDADES", priorityTable())
      + renderDeviationPanel();
  }
  function priorityTable() {
    const planned = {1: 0, 2: 0, 3: 0};
    const actual = {1: 0, 2: 0, 3: 0};
    plannedForMonth(selectedMonth).forEach(({ revision }) => { planned[revision.priority] += Number(revision.value); });
    monthMovements(selectedMonth).filter(m => m.type === "GASTO").forEach(m => {
      const priority = Number(m.priority) || 3;
      actual[priority] += Number(m.value);
    });
    return `<div class="table-wrap"><table class="retro-table"><thead><tr><th>Nível</th><th>Previsto</th><th>Realizado</th></tr></thead><tbody>${[1, 2, 3].map(level => `<tr><td>${PRIORITIES[level]}</td><td>${money(planned[level])}</td><td>${money(actual[level])}</td></tr>`).join("")}</tbody></table></div>`;
  }
  function renderDeviationPanel() {
    const observations = plannedForMonth(selectedMonth).map(({ item, revision }) => ({ item, revision, info: deviationInfo(item, revision, selectedMonth) })).filter(row => row.info.paid && Math.abs(row.info.diff || 0) >= 0.005);
    if (!observations.length) return contentWindow("📝 OBSERVAÇÕES — previsto x realizado", `<div class="empty-state">Nenhuma diferença entre previsão e valor real foi registrada neste mês.</div>`);
    return contentWindow("📝 OBSERVAÇÕES — previsto x realizado", `<div class="observation-list">${observations.map(({ revision, info }) => `<div class="observation-item"><strong>${escapeHtml(revision.name)}</strong>: previsto ${money(info.expected)}, pago ${money(info.actual)} — <span class="${info.className}">${info.text}</span></div>`).join("")}</div>`);
  }
  async function registerIncome() {
    if (incomeAlreadyRegistered(selectedMonth)) { await alertAction(`A renda fixa de ${monthLabel(selectedMonth)} já foi registrada.`); return; }
    const income = Number(state.profile.monthlyIncome);
    const contribution = Math.min(Number(state.goal.monthlyContribution), income);
    const ok = await confirmAction(`Registrar ${money(income)} como renda de ${monthLabel(selectedMonth)} e separar ${money(contribution)} para "${state.goal.name}"?`);
    if (!ok) return;
    const incomeDate = defaultDateForMonth(selectedMonth, state.profile.payday);
    await addMovement({ type: "RENDA", category: "Renda fixa", description: `Renda líquida de ${selectedMonth}`, value: income, referenceMonth: selectedMonth, paymentDate: incomeDate });
    if (contribution > 0) {
      await addMovement({ type: "META", category: state.goal.category, description: `Reserva automática para: ${state.goal.name}`, value: contribution, referenceMonth: selectedMonth, paymentDate: incomeDate });
    }
    navigate("dashboard");
  }

  function renderPlanning() {
    const plan = planningSummary(selectedMonth);
    const rows = plannedForMonth(selectedMonth);
    $("#content").innerHTML =
      contentWindow(`PLANEJAMENTO — ${escapeHtml(monthLabel(selectedMonth))}`, `
        <div class="metric-grid">
          ${metric("Renda mensal", plan.expectedIncome)}
          ${metric("Caixinha", plan.expectedGoal)}
          ${metric("Compromissos previstos", plan.plannedTotal)}
          ${metric("Livre previsto", plan.projectedFree, plan.projectedFree < 0 ? "danger" : "good")}
        </div>
        <p class="notice"><strong>✓ Pago</strong> pede o valor real e a data real do pagamento. A previsão original fica registrada para mostrar a diferença.</p>
        <p class="notice"><strong>Obs. sobre edição:</strong> alterações em um gasto previsto passam a valer a partir do mês selecionado (<strong>${escapeHtml(monthLabel(selectedMonth))}</strong>) e não reescrevem pagamentos já registrados.</p>
        <div class="table-wrap">${rows.length ? planningTable(rows) : `<div class="empty-state">Nenhum gasto previsto válido para este mês.</div>`}</div>`)
      + contentWindow("ADICIONAR NOVO GASTO PREVISTO", plannedExpenseFormHtml());
    bindPlanningEvents();
  }
  function planningTable(rows) {
    return `<table class="retro-table"><thead><tr><th>Gasto</th><th>Categoria</th><th>Prioridade</th><th>Vencimento</th><th>Previsto</th><th>Status</th><th>Pago</th><th>Obs. previsto x real</th><th>Ações</th></tr></thead><tbody>${rows.map(({ item, revision }) => {
      const status = plannedStatus(item, revision, selectedMonth);
      const payment = paymentForPlanned(item.id, selectedMonth);
      const deviation = deviationInfo(item, revision, selectedMonth);
      const dueText = revision.dueDay ? `dia ${revision.dueDay}` : "sem vencimento";
      return `<tr>
        <td><strong>${escapeHtml(revision.name)}</strong></td>
        <td>${escapeHtml(revision.category)}</td>
        <td><span class="priority-badge">${priorityLabel(revision.priority)}</span></td>
        <td>${dueText}${revision.dueDay ? `<div class="due-help">${formatDate(effectiveDueDate(selectedMonth, revision.dueDay))}</div>` : ``}</td>
        <td>${money(revision.value)}</td>
        <td><span class="status ${status.className}">${status.label}</span><div class="due-help">${status.detail}</div></td>
        <td>${payment ? money(payment.value) : "—"}</td>
        <td><span class="${deviation.className}">${escapeHtml(deviation.text)}</span></td>
        <td><div class="row-actions">
          <button class="button success pay-planned" data-id="${item.id}" ${payment ? "disabled" : ""}>✓ Pago</button>
          <button class="button secondary edit-planned" data-id="${item.id}">Editar</button>
          <button class="button danger archive-planned" data-id="${item.id}">Arquivar</button>
        </div></td>
      </tr>`;
    }).join("")}</tbody></table>`;
  }
  function plannedExpenseFormHtml() {
    return `<form id="addPlannedForm" class="form-grid">
      <label class="wide">Nome<input id="plannedName" placeholder="Ex.: Aluguel, Internet, Academia"></label>
      <label>Categoria<select id="plannedCategory">${EXPENSE_CATEGORIES.map(category => `<option>${escapeHtml(category)}</option>`).join("")}</select></label>
      <label>Valor previsto<input id="plannedValue" type="number" min="0.01" step="0.01"></label>
      <label>Prioridade<select id="plannedPriority">${[1, 2, 3].map(level => `<option value="${level}">${PRIORITIES[level]}</option>`).join("")}</select></label>
      <label>Vencimento<input id="plannedDueDay" type="number" min="1" max="31" placeholder="Opcional"></label>
      <div class="wide due-help">Deixe vazio para “sem vencimento fixo”. Se usar dia 31 em um mês menor, o Cofrinho considera o último dia do mês.</div>
      <div id="plannedFormMessage" class="message error hidden wide"></div>
      <div class="actions-right wide"><button class="button primary" type="submit">+ Adicionar ao planejamento</button></div>
    </form>`;
  }
  function bindPlanningEvents() {
    $$(".pay-planned").forEach(button => button.addEventListener("click", () => {
      const item = findPlanned(button.dataset.id);
      const revision = revisionForMonth(item, selectedMonth);
      if (item && revision) openPaymentDialog(item, revision);
    }));
    $$(".edit-planned").forEach(button => button.addEventListener("click", () => {
      const item = findPlanned(button.dataset.id);
      const revision = revisionForMonth(item, selectedMonth);
      if (item && revision) openEditPlannedDialog(item, revision);
    }));
    $$(".archive-planned").forEach(button => button.addEventListener("click", async () => {
      const item = findPlanned(button.dataset.id);
      const revision = revisionForMonth(item, selectedMonth);
      if (!item || !revision) return;
      const ok = await confirmAction(`Arquivar "${revision.name}" a partir de ${monthLabel(selectedMonth)}? Meses anteriores permanecerão preservados.`);
      if (!ok) return;
      archivePlanned(item.id, selectedMonth);
      renderPlanning();
    }));
    $("#addPlannedForm")?.addEventListener("submit", event => {
      event.preventDefault();
      const data = { name: $("#plannedName").value, category: $("#plannedCategory").value, value: Number($("#plannedValue").value), priority: Number($("#plannedPriority").value), dueDay: $("#plannedDueDay").value };
      try { createPlannedExpense(data, selectedMonth); renderPlanning(); }
      catch (err) {
        const box = $("#plannedFormMessage");
        box.textContent = err.message; box.classList.remove("hidden");
      }
    });
    $("#plannedCategory")?.addEventListener("change", event => {
      $("#plannedPriority").value = String(state.categoryPriorities[event.target.value] || DEFAULT_PRIORITIES[event.target.value] || 3);
    });
  }
  function openEditPlannedDialog(item, revision) {
    const alreadyPaid = paymentForPlanned(item.id, selectedMonth);
    openDynamicDialog({
      title: `EDITAR PREVISÃO — ${monthLabel(selectedMonth)}`,
      body: `
        <div class="dialog-note">Esta alteração passa a valer a partir de <strong>${escapeHtml(monthLabel(selectedMonth))}</strong>. Meses anteriores mantêm a versão anterior.${alreadyPaid ? `<br><br><strong>Este gasto já foi pago neste mês.</strong> O pagamento e o valor previsto capturado naquele momento continuarão imutáveis no histórico.` : ``}</div>
        <div class="dialog-form-grid">
          <label>Nome<input id="editPlannedName" value="${escapeHtml(revision.name)}"></label>
          <label>Categoria<select id="editPlannedCategory">${EXPENSE_CATEGORIES.map(category => `<option ${category === revision.category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}</select></label>
          <label>Valor previsto<input id="editPlannedValue" type="number" min="0.01" step="0.01" value="${Number(revision.value)}"></label>
          <label>Prioridade<select id="editPlannedPriority">${[1, 2, 3].map(level => `<option value="${level}" ${Number(revision.priority) === level ? "selected" : ""}>${PRIORITIES[level]}</option>`).join("")}</select></label>
          <label>Vencimento<input id="editPlannedDueDay" type="number" min="1" max="31" placeholder="Sem vencimento fixo" value="${revision.dueDay || ""}"></label>
        </div>
        <div id="dynamicFormError" class="message error hidden"></div>
        <div class="dialog-actions"><button id="cancelDynamicForm" class="button secondary" type="button">Cancelar</button><button class="button primary" type="submit">Salvar previsão</button></div>`,
      onSubmit: () => {
        try {
          savePlannedRevision(item.id, { name: $("#editPlannedName").value, category: $("#editPlannedCategory").value, value: Number($("#editPlannedValue").value), priority: Number($("#editPlannedPriority").value), dueDay: $("#editPlannedDueDay").value }, selectedMonth);
          closeDynamicDialog(); renderPlanning();
        } catch (err) { showDynamicError(err.message); }
      }
    });
  }
  function openPaymentDialog(item, revision) {
    const dueDate = effectiveDueDate(selectedMonth, revision.dueDay);
    const defaultPaymentDate = defaultDateForMonth(selectedMonth, revision.dueDay || 1);
    openDynamicDialog({
      title: `✓ PAGAR — ${escapeHtml(revision.name)}`,
      body: `
        <div class="dialog-note"><strong>Valor previsto:</strong> ${money(revision.value)}<br><strong>Vencimento:</strong> ${dueDate ? formatDate(dueDate) : "sem vencimento fixo"}<br><br>Informe abaixo o <strong>valor que realmente foi pago</strong>. O Cofrinho manterá a previsão original para calcular a diferença.</div>
        <div class="dialog-form-grid">
          <label>Valor real pago<input id="paymentActualValue" type="number" min="0.01" step="0.01" value="${Number(revision.value)}"></label>
          <label>Data real do pagamento<input id="paymentDate" type="date" value="${defaultPaymentDate}"></label>
        </div>
        <div id="dynamicFormError" class="message error hidden"></div>
        <div class="dialog-actions"><button id="cancelDynamicForm" class="button secondary" type="button">Cancelar</button><button class="button success" type="submit">✓ Confirmar pagamento</button></div>`,
      onSubmit: async () => {
        try {
          const actualValue = Number($("#paymentActualValue").value);
          const paymentDate = $("#paymentDate").value;
          if (!(actualValue > 0)) throw new Error("Informe um valor real maior que zero.");
          if (!paymentDate) throw new Error("Informe a data real do pagamento.");
          await addMovement({ type: "GASTO", category: revision.category, description: revision.name, value: actualValue, priority: Number(revision.priority), plannedId: Number(item.id), expectedValue: Number(revision.value), dueDay: revision.dueDay, referenceMonth: selectedMonth, paymentDate });
          closeDynamicDialog(); renderPlanning();
        } catch (err) { showDynamicError(err.message); }
      }
    });
  }
  function renderExpenseForm() {
    const summary = monthSummary(selectedMonth);
    $("#content").innerHTML = contentWindow(`NOVO GASTO — ${escapeHtml(monthLabel(selectedMonth))}`, `
      <p class="notice"><strong>Disponível antes do gasto:</strong> ${money(summary.available)}. O Cofrinho registra o que realmente aconteceu; se o gasto ultrapassar o disponível, o painel mostrará saldo negativo.</p>
      <form id="expenseForm" class="form-grid">
        <label>Categoria<select id="expenseCategory">${EXPENSE_CATEGORIES.map(category => `<option>${escapeHtml(category)}</option>`).join("")}</select></label>
        <label>Prioridade<select id="expensePriority">${[1, 2, 3].map(level => `<option value="${level}">${PRIORITIES[level]}</option>`).join("")}</select></label>
        <label class="wide">Descrição<input id="expenseDescription" placeholder="O que foi pago?"></label>
        <label>Valor<input id="expenseValue" type="number" min="0.01" step="0.01"></label>
        <label>Data real<input id="expenseDate" type="date" value="${defaultDateForMonth(selectedMonth)}"></label>
        <div id="expenseMessage" class="message error hidden wide"></div>
        <div class="actions-right wide"><button class="button primary" type="submit">💾 Registrar gasto</button></div>
      </form>`);
    const category = $("#expenseCategory");
    const priority = $("#expensePriority");
    priority.value = String(state.categoryPriorities[category.value] || DEFAULT_PRIORITIES[category.value] || 3);
    category.addEventListener("change", () => { priority.value = String(state.categoryPriorities[category.value] || DEFAULT_PRIORITIES[category.value] || 3); });
    $("#expenseForm").addEventListener("submit", async event => {
      event.preventDefault();
      const description = $("#expenseDescription").value.trim();
      const value = Number($("#expenseValue").value);
      const paymentDate = $("#expenseDate").value;
      if (!description || !(value > 0)) {
        const box = $("#expenseMessage");
        box.textContent = "Informe descrição e um valor maior que zero."; box.classList.remove("hidden");
        return;
      }
      await addMovement({ type: "GASTO", category: category.value, description, value, priority: Number(priority.value), referenceMonth: selectedMonth, paymentDate });
      navigate("dashboard");
    });
  }
  function renderGoal() {
    const saved = currentCycleSaved();
    const target = Number(state.goal.target);
    const progress = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
    const missing = Math.max(target - saved, 0);
    const locked = cycleLocked();
    const days = cycleDaysRemaining();
    $("#content").innerHTML = contentWindow("MINHA META — ciclo atual", `
      <div class="cycle-header-row">
        <div>
          <span class="source-chip">Ciclo ${Number(state.goal.cycleNumber || 1)}</span>
          <h2>${escapeHtml(state.goal.name)}</h2>
          <p>${escapeHtml(state.goal.category)}</p>
        </div>
        <div class="cycle-status ${locked ? "locked" : "ready"}">
          ${locked ? "🔒 Ciclo ativo" : "✓ Ciclo concluído"}
        </div>
      </div>
      <div class="goal-progress"><div style="width:${progress.toFixed(1)}%"></div></div>
      <p><strong>${progress.toFixed(1)}% concluído</strong></p>
      <p class="big-number">${money(saved)}</p>
      <p>Falta: <strong>${money(missing)}</strong></p>
      <p>Reserva automática definida: <strong>${money(state.goal.monthlyContribution)}</strong> por mês.</p>
      <div class="cycle-period">
        <div><span>Início</span><strong>${formatDate(state.goal.startDate)}</strong></div>
        <div><span>Fim do ciclo</span><strong>${formatDate(state.goal.endDate)}</strong></div>
        <div><span>Restante</span><strong>${locked ? `${days} dia${days === 1 ? "" : "s"}` : "Concluído"}</strong></div>
      </div>
      <div class="notice">
        ${locked
          ? `🔒 Até <strong>${formatDate(state.goal.endDate)}</strong>, nome de usuário, renda líquida mensal, dia de pagamento e os dados principais desta meta não podem ser alterados.`
          : `✓ O ciclo terminou. Você já pode iniciar um novo ciclo e atualizar os dados bloqueados.`}
      </div>
      ${locked ? "" : `<div class="actions-right" style="margin-top:12px;"><button id="startNewCycleBtn" class="button primary" type="button">Iniciar novo ciclo</button></div>`}
    `);
    $("#startNewCycleBtn")?.addEventListener("click", openNewCycleDialog);
  }

  function openNewCycleDialog() {
    if (cycleLocked()) {
      alertAction(`Este ciclo continua bloqueado até ${formatDate(state.goal.endDate)}.`);
      return;
    }
    openDynamicDialog({
      title: "NOVO CICLO — NERVI",
      body: `
        <div class="dialog-note">O ciclo anterior será preservado. As mudanças abaixo passam a valer a partir de hoje e ficam bloqueadas até o fim da nova meta.</div>
        <div class="dialog-form-grid">
          <label>Nome de usuário<input id="cycleUsername" maxlength="40" value="${escapeHtml(state.profile.username)}"></label>
          <label>Renda líquida mensal<input id="cycleIncome" type="number" min="0" step="0.01" value="${Number(state.profile.monthlyIncome)}"></label>
          <label>Dia de pagamento<input id="cyclePayday" type="number" min="1" max="31" value="${Number(state.profile.payday)}"></label>
          <label>Nome da meta<input id="cycleGoalName" maxlength="80" value="${escapeHtml(state.goal.name)}"></label>
          <label>Categoria<select id="cycleGoalCategory">${["Emergência","Reserva de segurança","Objetivo pessoal","Compra planejada","Viagem","Moradia"].map(cat => `<option ${cat === state.goal.category ? "selected" : ""}>${escapeHtml(cat)}</option>`).join("")}</select></label>
          <label>Valor-alvo<input id="cycleGoalTarget" type="number" min="0.01" step="0.01" value="${Number(state.goal.target)}"></label>
          <label>Reserva mensal<input id="cycleGoalMonthly" type="number" min="0" step="0.01" value="${Number(state.goal.monthlyContribution)}"></label>
          <label>Duração<select id="cycleGoalDuration">${[3,6,12,18,24,36].map(months => `<option value="${months}" ${months === 12 ? "selected" : ""}>${months} meses</option>`).join("")}</select></label>
        </div>
        <div id="dynamicFormError" class="message error hidden"></div>
        <div class="dialog-actions">
          <button id="cancelDynamicForm" class="button secondary" type="button">Cancelar</button>
          <button class="button primary" type="submit">Criar novo ciclo</button>
        </div>`,
      onSubmit: () => {
        try {
          const username = $("#cycleUsername").value.trim();
          const monthlyIncome = Number($("#cycleIncome").value);
          const payday = Number($("#cyclePayday").value);
          const goalName = $("#cycleGoalName").value.trim();
          const category = $("#cycleGoalCategory").value;
          const target = Number($("#cycleGoalTarget").value);
          const monthlyContribution = Number($("#cycleGoalMonthly").value);
          const durationMonths = Number($("#cycleGoalDuration").value);
          if (!username) throw new Error("Informe o nome de usuário.");
          if (monthlyIncome < 0) throw new Error("A renda não pode ser negativa.");
          if (!(payday >= 1 && payday <= 31)) throw new Error("O dia de pagamento deve estar entre 1 e 31.");
          if (!goalName) throw new Error("Informe o nome da meta.");
          if (!(target > 0)) throw new Error("O valor-alvo precisa ser maior que zero.");
          if (monthlyContribution < 0 || monthlyContribution > monthlyIncome) throw new Error("Confira a reserva mensal.");
          if (!(durationMonths >= 1 && durationMonths <= 60)) throw new Error("Escolha uma duração válida.");

          state.goalCycles = Array.isArray(state.goalCycles) ? state.goalCycles : [];
          state.goalCycles.push(JSON.parse(JSON.stringify(state.goal)));

          const startDate = todayISO();
          const endDate = addMonthsISO(startDate, durationMonths);
          state.profile.username = username;
          state.profile.monthlyIncome = monthlyIncome;
          state.profile.payday = payday;
          state.profile.lockedUntil = endDate;
          state.goal = {
            name: goalName,
            category,
            target,
            monthlyContribution,
            durationMonths,
            startDate,
            endDate,
            cycleNumber: Number(state.goal.cycleNumber || 1) + 1,
            createdAt: nowISO()
          };
          saveState();
          renderHeaderIdentity();
          closeDynamicDialog();
          renderGoal();
        } catch (err) {
          showDynamicError(err.message);
        }
      }
    });
  }

  function renderHistory() {
    const rows = [...monthMovements(selectedMonth)].reverse();
    $("#content").innerHTML = contentWindow(`HISTÓRICO.LOG — ${escapeHtml(monthLabel(selectedMonth))}`, `
      <div class="table-wrap">${rows.length ? `<table class="retro-table"><thead><tr><th>Data real</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Valor</th><th>Previsto</th><th>Diferença</th></tr></thead><tbody>${rows.map(movement => {
        const sign = ["GASTO", "META"].includes(movement.type) ? "-" : "+";
        const expected = movement.expectedValue;
        const hasExpected = expected !== null && expected !== undefined;
        const diff = hasExpected ? Number(movement.value) - Number(expected) : null;
        return `<tr><td>${formatDate(movement.date)}</td><td>${escapeHtml(movement.type)}</td><td>${escapeHtml(movement.category)}</td><td>${escapeHtml(movement.description)}</td><td>${sign} ${money(movement.value)}</td><td>${hasExpected ? money(expected) : "—"}</td><td>${diff === null ? "—" : Math.abs(diff) < 0.005 ? "Conforme previsto" : diff > 0 ? `<span class="difference-bad">${money(diff)} acima</span>` : `<span class="difference-good">${money(Math.abs(diff))} abaixo</span>`}</td></tr>`;
      }).join("")}</tbody></table>` : `<div class="empty-state">Nenhum movimento neste mês.</div>`}</div>
      <p class="muted">O histórico real não é editável pela interface. Mudanças nas previsões não alteram pagamentos já registrados.</p>`);
  }
  function openPhotoSettingsDialog() {
    let draftPhoto = normalizePhoto(state.profile.photo);
    openDynamicDialog({
      title: "FOTO DE PERFIL",
      body: `
        <p class="dialog-note">Escolha um arquivo do dispositivo ou informe um link direto online.</p>
        <div id="dialogPhotoPicker"></div>
        <div id="dynamicFormError" class="message error hidden"></div>
        <div class="dialog-actions"><button id="cancelDynamicForm" class="button secondary" type="button">Cancelar</button><button class="button primary" type="submit">Salvar foto</button></div>`,
      onOpen: () => {
        const root = $("#dialogPhotoPicker");
        const rerender = photo => {
          draftPhoto = normalizePhoto(photo);
          renderPhotoPicker(root, draftPhoto, rerender, state.profile.username);
        };
        renderPhotoPicker(root, draftPhoto, rerender, state.profile.username);
      },
      onSubmit: () => {
        state.profile.photo = normalizePhoto(draftPhoto);
        saveState();
        renderHeaderIdentity();
        closeDynamicDialog();
        renderSettings();
      }
    });
  }
  function renderSettings() {
    $("#content").innerHTML = contentWindow("CONFIGURAÇÕES", `
      <div class="profile-card">
        ${photoHtml(state.profile.photo, "lg", state.profile.username)}
        <div class="meta">
          <strong>${escapeHtml(state.profile.username)}</strong>
          <span class="source-chip">${escapeHtml(photoSourceLabel(state.profile.photo))}</span>
        </div>
      </div>
      <div class="appearance-box cycle-settings-box">
        <h3>🔒 Dados do ciclo</h3>
        <div class="locked-data-grid">
          <div><span>Usuário</span><strong>${escapeHtml(state.profile.username)}</strong></div>
          <div><span>Renda mensal</span><strong>${money(state.profile.monthlyIncome)}</strong></div>
          <div><span>Dia de pagamento</span><strong>Dia ${Number(state.profile.payday)}</strong></div>
          <div><span>Meta</span><strong>${escapeHtml(state.goal.name)}</strong></div>
        </div>
        <p class="muted">${cycleLocked()
          ? `Essas informações ficam bloqueadas até ${formatDate(state.goal.endDate)}.`
          : `O ciclo terminou. Você pode iniciar um novo ciclo na área Minha meta.`}</p>
      </div>
      <div id="notificationSettings" class="appearance-box notification-settings-box">
        <h3>🔔 Notificações de vencimento</h3>
        <p class="muted">Avisos aparecem dentro do Cofrinho quando a página é aberta.</p>
        <label class="toggle-setting">
          <span>Ativar avisos</span>
          <input id="notifyEnabled" type="checkbox" ${notificationPrefs().enabled ? "checked" : ""}>
        </label>
        <label class="toggle-setting">
          <span>Avisar com antecedência</span>
          <select id="notifyDaysBefore">
            ${[1,2,3,4,5,6,7].map(day => `<option value="${day}" ${Number(notificationPrefs().daysBefore) === day ? "selected" : ""}>${day} dia${day === 1 ? "" : "s"}</option>`).join("")}
          </select>
        </label>
        <label class="toggle-setting">
          <span>Mostrar atrasados</span>
          <input id="notifyOverdue" type="checkbox" ${notificationPrefs().showOverdue ? "checked" : ""}>
        </label>
        <label class="toggle-setting">
          <span>Mostrar avisos no Início</span>
          <input id="notifyDashboard" type="checkbox" ${notificationPrefs().showDashboard ? "checked" : ""}>
        </label>
      </div>
      <div class="appearance-box">
        <h3>Aparência</h3>
        <p class="muted">Claro: mostarda suave + vermelho. Escuro: vinho + mostarda.</p>
        ${themeControlHtml()}
      </div>
      <p><strong>Renda mensal:</strong> ${money(state.profile.monthlyIncome)}</p>
      <p><strong>Armazenamento:</strong> localStorage deste navegador.</p>
      <p><strong>Versão:</strong> ${APP_VERSION}</p>
      <div class="settings-actions">
        <button id="changePhotoBtn" class="button secondary">🖼 Trocar foto</button>
        <button id="verifyBtn" class="button secondary">🛡 Verificar integridade</button>
        <button id="exportBtn" class="button secondary">⬇ Exportar backup JSON</button>
        <label class="button secondary" style="display:inline-flex;align-items:center;">⬆ Importar backup<input id="importInput" type="file" accept=".json,application/json" hidden></label>
        <button id="resetBtn" class="button danger">Apagar dados locais</button>
      </div>
      <div id="settingsMessage" class="message hidden"></div>`);
    $("#changePhotoBtn").addEventListener("click", openPhotoSettingsDialog);
    syncThemeButtons();

    const saveNotificationSettings = () => {
      state.notificationPrefs = {
        enabled: $("#notifyEnabled")?.checked !== false,
        daysBefore: Math.max(1, Math.min(7, Number($("#notifyDaysBefore")?.value || 3))),
        showOverdue: $("#notifyOverdue")?.checked !== false,
        showDashboard: $("#notifyDashboard")?.checked !== false
      };
      saveState();
      updateNotificationBell();
      showToast("Preferências de notificação salvas.");
    };

    ["notifyEnabled", "notifyDaysBefore", "notifyOverdue", "notifyDashboard"].forEach(id => {
      $("#" + id)?.addEventListener("change", saveNotificationSettings);
    });

    $("#verifyBtn").addEventListener("click", async () => {
      const result = await verifyIntegrity();
      const box = $("#settingsMessage");
      box.textContent = result.message; box.className = `message ${result.ok ? "success" : "error"}`;
    });
    $("#exportBtn").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `cofrinho-backup-${todayISO()}.json`; link.click(); URL.revokeObjectURL(url);
    });
    $("#importInput").addEventListener("change", async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        if (!parsed.profile || !parsed.goal || !Array.isArray(parsed.movements)) throw new Error("O arquivo não parece ser um backup válido do Cofrinho.exe.");
        const ok = await confirmAction("Importar este backup substituirá os dados locais atuais. Continuar?");
        if (!ok) return;
        const imported = migrateState(parsed);
        Object.keys(state).forEach(key => delete state[key]);
        Object.assign(state, imported);
        saveState();
        renderHeaderIdentity();
        showMain();
      } catch (err) {
        const box = $("#settingsMessage");
        box.textContent = err.message || "Não foi possível importar o arquivo."; box.className = "message error";
      }
    });
    $("#resetBtn").addEventListener("click", async () => {
      const ok = await confirmAction("Apagar todos os dados deste navegador? Faça um backup antes se quiser preservar o histórico.");
      if (!ok) return;
      localStorage.removeItem(STORAGE_KEY);
      LEGACY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
      location.reload();
    });
  }


  function openHowItWorksDialog() {
    openDynamicDialog({
      title: "? COMO FUNCIONA?",
      body: `
        <div class="help-simple">
          <div><strong>1. Crie sua conta</strong><span>Escolha seu usuário e senha e depois defina renda, dia de pagamento e sua meta obrigatória.</span></div>
          <div><strong>2. Escolha a duração da meta</strong><span>Durante esse ciclo, esses dados principais ficam bloqueados.</span></div>
          <div><strong>3. Planeje o mês</strong><span>Cadastre contas previstas, vencimentos e prioridades.</span></div>
          <div><strong>4. Registre o que aconteceu</strong><span>Ao pagar, informe o valor e a data reais. O Nervi compara previsto x realizado.</span></div>
          <div><strong>5. Receba avisos</strong><span>O sino mostra contas próximas do vencimento, vencendo hoje ou atrasadas.</span></div>
          <div><strong>6. Novo ciclo</strong><span>Quando a data final da meta chegar, você pode atualizar os dados bloqueados e criar a próxima meta.</span></div>
        </div>
        <div class="dialog-note"><strong>Resumo:</strong> o objetivo é separar o que está disponível do que já está comprometido e mostrar quanto está realmente livre.</div>
        <div class="dialog-actions"><button id="cancelDynamicForm" class="button primary" type="button">Entendi</button></div>
      `,
      onSubmit: () => closeDynamicDialog()
    });
  }

  function projectShareUrl() {
    return window.location.href.split("#")[0];
  }

  function closeShareMenus() {
    $$(".window-menu-details[open]").forEach(menu => menu.removeAttribute("open"));
  }

  function showToast(message) {
    let toast = $("#nerviToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "nerviToast";
      toast.className = "nervi-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  async function copyProjectLink() {
    const url = projectShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link do projeto copiado.");
    } catch {
      window.prompt("Copie o link do projeto:", url);
    }
    closeShareMenus();
  }

  async function shareProject() {
    const url = projectShareUrl();
    const shareData = {
      title: "Nervi — Cofrinho.exe",
      text: "Conheça o projeto Nervi — Cofrinho.exe.",
      url
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        closeShareMenus();
        return;
      } catch (error) {
        if (error && error.name === "AbortError") {
          closeShareMenus();
          return;
        }
      }
    }

    await copyProjectLink();
  }

  function confirmAction(text) {
    return new Promise(resolve => {
      const dialog = $("#confirmDialog");
      $("#confirmText").textContent = text;
      const onClose = () => { dialog.removeEventListener("close", onClose); resolve(dialog.returnValue === "default"); };
      dialog.addEventListener("close", onClose);
      dialog.showModal();
    });
  }
  async function alertAction(text) { await confirmAction(text); }
  function openDynamicDialog({ title, body, onSubmit, onOpen = null }) {
    const dialog = $("#formDialog");
    $("#formDialogTitle").textContent = title;
    $("#formDialogBody").innerHTML = body;
    const form = $("#dynamicDialogForm");
    const submitHandler = event => { event.preventDefault(); onSubmit(); };
    form._cofrinhoSubmitHandler = submitHandler;
    form.addEventListener("submit", submitHandler);
    $("#cancelDynamicForm")?.addEventListener("click", closeDynamicDialog);
    dialog.showModal();
    if (typeof onOpen === "function") onOpen();
  }
  function closeDynamicDialog() {
    const dialog = $("#formDialog");
    const form = $("#dynamicDialogForm");
    if (form._cofrinhoSubmitHandler) {
      form.removeEventListener("submit", form._cofrinhoSubmitHandler);
      delete form._cofrinhoSubmitHandler;
    }
    dialog.close();
    $("#formDialogBody").innerHTML = "";
  }
  function showDynamicError(message) {
    const box = $("#dynamicFormError");
    if (!box) return;
    box.textContent = message; box.classList.remove("hidden");
  }

  function bindStaticEvents() {
    $("#loginForm")?.addEventListener("submit", handleLogin);
    $("#openCreateAccount")?.addEventListener("click", openCreateAccountFlow);
    $("#backToLogin")?.addEventListener("click", () => showLogin(true));
    $("#toggleLoginPassword")?.addEventListener("click", () => {
      const input = $("#loginPassword");
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
    });

    $("#setupAddPlanned").addEventListener("click", () => {
      addSetupPlannedRow(); renderSetupPlanned(); updateSetupPreview();
    });
    ["setupIncome", "setupGoalMonthly"].forEach(id => { $("#" + id).addEventListener("input", updateSetupPreview); });
    $("#setupUsername").addEventListener("input", updateSetupIdentityVisuals);
    $("#setupCreate").addEventListener("click", createProfile);
    $$(".nav-button[data-view]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.view)));
    $("#registerIncomeBtn").addEventListener("click", registerIncome);
    $("#monthSelector").addEventListener("change", event => setSelectedMonth(event.target.value));
    $("#prevMonthBtn").addEventListener("click", () => setSelectedMonth(shiftMonth(selectedMonth, -1)));
    $("#nextMonthBtn").addEventListener("click", () => setSelectedMonth(shiftMonth(selectedMonth, 1)));
    $("#currentMonthBtn").addEventListener("click", () => setSelectedMonth(monthKey()));
    $("#formDialogClose").addEventListener("click", closeDynamicDialog);
    $("#notificationBell")?.addEventListener("click", openNotificationsDialog);
    document.addEventListener("click", event => {
      const themeButton = event.target.closest("[data-theme-choice]");
      if (themeButton) {
        applyTheme(themeButton.dataset.themeChoice, true);
        return;
      }

      const shareButton = event.target.closest(".share-project");
      if (shareButton) {
        event.preventDefault();
        shareProject();
        return;
      }

      const copyButton = event.target.closest(".copy-project-link");
      if (copyButton) {
        event.preventDefault();
        copyProjectLink();
        return;
      }

      const helpButton = event.target.closest(".how-it-works");
      if (helpButton) {
        event.preventDefault();
        closeShareMenus();
        openHowItWorksDialog();
        return;
      }

      const signOutButton = event.target.closest(".sign-out-action");
      if (signOutButton) {
        event.preventDefault();
        closeShareMenus();
        signOutLocal();
      }
    });
    applyTheme(getTheme(), false);
  }

  bindStaticEvents();
  showLogin(true);
})();
