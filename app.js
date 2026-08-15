(() => {
  "use strict";

  const STORAGE_KEY = "cofrinho_web_v03";
  const LEGACY_STORAGE_KEYS = ["cofrinho_web_v02", "cofrinho_web_v01"];
  const APP_VERSION = "0.3";

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
  const BUILTIN_AVATARS = [
    { id: "retro-1", label: "Clássico 1", src: "./assets/avatars/avatar01.svg" },
    { id: "retro-2", label: "Clássico 2", src: "./assets/avatars/avatar02.svg" },
    { id: "retro-3", label: "Clássico 3", src: "./assets/avatars/avatar03.svg" },
    { id: "retro-4", label: "Clássico 4", src: "./assets/avatars/avatar04.svg" },
    { id: "retro-5", label: "Clássico 5", src: "./assets/avatars/avatar05.svg" },
    { id: "retro-6", label: "Clássico 6", src: "./assets/avatars/avatar06.svg" },
    { id: "retro-7", label: "Clássico 7", src: "./assets/avatars/avatar07.svg" },
    { id: "retro-8", label: "Clássico 8", src: "./assets/avatars/avatar08.svg" }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  let selectedMonth = monthKey();
  let currentView = "dashboard";
  let setupPlanned = [];
  let setupAvatar = { type: "builtin", value: BUILTIN_AVATARS[0].id };

  const state = loadState();

  function initialState() {
    return {
      version: APP_VERSION,
      profile: null,
      goal: null,
      categoryPriorities: { ...DEFAULT_PRIORITIES },
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
      plannedExpenses: Array.isArray((parsed || {}).plannedExpenses)
        ? parsed.plannedExpenses.map(normalizePlannedExpense)
        : [],
      movements: Array.isArray((parsed || {}).movements)
        ? parsed.movements.map(movement => ({...movement, hashVersion: Number(movement.hashVersion || 1)}))
        : []
    };
    if (base.profile) {
      base.profile.avatar = normalizeAvatar(base.profile.avatar || base.profile.avatarData || base.profile.avatarUrl || base.profile.avatarEmoji || "🙂");
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
  function plannedStatus(item, revision, month = selectedMonth) {
    const payment = paymentForPlanned(item.id, month);
    if (payment) return { key: "paid", label: "Pago", className: "status-paid", detail: `Pago em ${formatDate(payment.date)}` };
    const dueDate = effectiveDueDate(month, revision.dueDay);
    if (!dueDate) return { key: "planned", label: "Previsto", className: "status-planned", detail: "Sem vencimento fixo" };
    const currentMonth = monthKey();
    const today = todayISO();
    if (month < currentMonth || (month === currentMonth && dueDate < today)) return { key: "late", label: "Atrasado", className: "status-late", detail: `Venceu em ${formatDate(dueDate)}` };
    if (month === currentMonth && dueDate === today) return { key: "today", label: "Vence hoje", className: "status-today", detail: formatDate(dueDate) };
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

  // Avatar helpers
  function normalizeAvatar(input) {
    if (input && typeof input === "object" && input.type) {
      if (input.type === "builtin") return { type: "builtin", value: input.value || BUILTIN_AVATARS[0].id };
      if (input.type === "emoji") return { type: "emoji", value: input.value || "🙂" };
      if (input.type === "upload") return { type: "upload", value: input.value || "", name: input.name || "imagem" };
      if (input.type === "url") return { type: "url", value: input.value || "" };
    }
    if (typeof input === "string") {
      if (/^data:image\//.test(input)) return { type: "upload", value: input, name: "imagem local" };
      if (/^https?:\/\//i.test(input)) return { type: "url", value: input };
      return { type: "emoji", value: input || "🙂" };
    }
    return { type: "builtin", value: BUILTIN_AVATARS[0].id };
  }
  function findBuiltinAvatar(id) {
    return BUILTIN_AVATARS.find(item => item.id === id) || BUILTIN_AVATARS[0];
  }
  function avatarSourceLabel(avatar) {
    if (!avatar) return "avatar";
    if (avatar.type === "builtin") return "avatar pronto";
    if (avatar.type === "emoji") return "emoji";
    if (avatar.type === "upload") return "arquivo local";
    if (avatar.type === "url") return "link externo";
    return "avatar";
  }
  function avatarInner(avatar) {
    const normalized = normalizeAvatar(avatar);
    if (normalized.type === "builtin") {
      const builtin = findBuiltinAvatar(normalized.value);
      return `<img src="${escapeHtml(builtin.src)}" alt="${escapeHtml(builtin.label)}">`;
    }
    if (normalized.type === "upload" || normalized.type === "url") {
      return `<img src="${escapeHtml(normalized.value)}" alt="avatar">`;
    }
    return `<span>${escapeHtml(normalized.value || "🙂")}</span>`;
  }
  function avatarHtml(avatar, size = "md") {
    const normalized = normalizeAvatar(avatar);
    const klass = normalized.type === "emoji" ? `avatar-emoji avatar-${size}` : `avatar-img avatar-${size}`;
    return `<div class="${klass}">${avatarInner(normalized)}</div>`;
  }
  async function fileToAvatarDataUrl(file) {
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
    const maxSize = 160;
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/png", .92);
  }
  function isValidAvatarUrl(value) {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol);
    } catch {
      return false;
    }
  }
  function renderAvatarPicker(rootElement, avatarValue, onChange) {
    if (!rootElement) return;
    const current = normalizeAvatar(avatarValue);
    rootElement.innerHTML = `
      <div class="avatar-picker">
        <div class="avatar-topline">
          <div class="avatar-preview-card">
            <h3>Selecionado</h3>
            ${avatarHtml(current, "lg")}
            <div style="margin-top:8px;"><span class="source-chip">${escapeHtml(avatarSourceLabel(current))}</span></div>
          </div>
          <div>
            <div class="avatar-grid">
              ${BUILTIN_AVATARS.map(item => `
                <div class="avatar-option ${current.type === "builtin" && current.value === item.id ? "selected" : ""}">
                  <button type="button" class="pick-builtin" data-id="${item.id}">
                    <div class="avatar-img avatar-lg"><img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.label)}"></div>
                    <small>${escapeHtml(item.label)}</small>
                  </button>
                </div>`).join("")}
            </div>
          </div>
        </div>

        <div class="avatar-custom-grid">
          <div class="avatar-custom-card">
            <h4>Emoji</h4>
            <p>Alternativa leve e rápida.</p>
            <input id="avatarEmojiInput" maxlength="4" placeholder="🙂" value="${current.type === "emoji" ? escapeHtml(current.value) : ""}">
            <div class="avatar-inline-actions">
              <button type="button" class="button secondary" id="useAvatarEmoji">Usar emoji</button>
            </div>
          </div>

          <div class="avatar-custom-card">
            <h4>Arquivo do computador</h4>
            <p>A imagem é reduzida e salva localmente no navegador.</p>
            <input id="avatarFileInput" type="file" accept="image/*">
          </div>

          <div class="avatar-custom-card">
            <h4>Link direto online</h4>
            <p>Use uma URL direta de imagem. O navegador vai carregar essa imagem externamente.</p>
            <input id="avatarUrlInput" placeholder="https://.../avatar.png" value="${current.type === "url" ? escapeHtml(current.value) : ""}">
            <div class="avatar-inline-actions">
              <button type="button" class="button secondary" id="useAvatarUrl">Usar link</button>
            </div>
          </div>
        </div>
      </div>`;

    $$(".pick-builtin", rootElement).forEach(btn => {
      btn.addEventListener("click", () => onChange({ type: "builtin", value: btn.dataset.id }));
    });
    $("#useAvatarEmoji", rootElement)?.addEventListener("click", () => {
      const value = $("#avatarEmojiInput", rootElement)?.value.trim() || "🙂";
      onChange({ type: "emoji", value });
    });
    $("#avatarFileInput", rootElement)?.addEventListener("change", async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await fileToAvatarDataUrl(file);
        onChange({ type: "upload", value: dataUrl, name: file.name });
      } catch {
        alertAction("Não foi possível processar essa imagem.");
      }
    });
    $("#useAvatarUrl", rootElement)?.addEventListener("click", () => {
      const value = $("#avatarUrlInput", rootElement)?.value.trim() || "";
      if (!isValidAvatarUrl(value)) {
        alertAction("Informe um link direto válido começando com http:// ou https://.");
        return;
      }
      onChange({ type: "url", value });
    });
  }

  function showSetup() {
    $("#setupScreen").classList.remove("hidden");
    $("#mainScreen").classList.add("hidden");
    if (!setupPlanned.length) addSetupPlannedRow();
    renderSetupPlanned();
    const rerenderSetupAvatar = avatar => {
      setupAvatar = normalizeAvatar(avatar);
      renderAvatarPicker($("#setupAvatarPicker"), setupAvatar, rerenderSetupAvatar);
    };
    renderAvatarPicker($("#setupAvatarPicker"), setupAvatar, rerenderSetupAvatar);
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
    $("#setupPreviewFree").style.color = free < 0 ? "var(--red-700)" : "";
  }
  function setupError(message = "") {
    const box = $("#setupError");
    if (!message) { box.classList.add("hidden"); box.textContent = ""; return; }
    box.textContent = message; box.classList.remove("hidden");
  }
  function createProfile() {
    setupError();
    const username = $("#setupUsername").value.trim();
    const monthlyIncome = Number($("#setupIncome").value);
    const payday = Number($("#setupPayday").value);
    const goalName = $("#setupGoalName").value.trim();
    const goalCategory = $("#setupGoalCategory").value;
    const goalTarget = Number($("#setupGoalTarget").value);
    const monthlyContribution = Number($("#setupGoalMonthly").value);
    if (!username) return setupError("Informe um nome de usuário.");
    if (monthlyIncome < 0) return setupError("A renda não pode ser negativa.");
    if (!(payday >= 1 && payday <= 31)) return setupError("O dia de pagamento deve estar entre 1 e 31.");
    if (!goalName) return setupError("A meta obrigatória precisa de um nome.");
    if (!(goalTarget > 0)) return setupError("O valor-alvo precisa ser maior que zero.");
    if (monthlyContribution < 0) return setupError("A reserva mensal não pode ser negativa.");
    if (monthlyContribution > monthlyIncome) return setupError("A reserva mensal não pode superar a renda.");
    state.profile = { username, avatar: normalizeAvatar(setupAvatar), monthlyIncome, payday, createdAt: nowISO() };
    state.goal = { name: goalName, category: goalCategory, target: goalTarget, monthlyContribution, createdAt: nowISO() };
    state.plannedExpenses = [];
    setupPlanned.filter(item => item.name.trim() && Number(item.value) > 0).forEach(item => {
      createPlannedExpense({ name: item.name, category: item.category, value: item.value, priority: item.priority, dueDay: item.dueDay }, monthKey());
    });
    saveState();
    showMain();
  }

  function renderHeaderIdentity() {
    const profile = state.profile;
    if (!profile) return;
    $("#headerIdentity").innerHTML = `
      ${avatarHtml(profile.avatar, "lg")}
      <div class="header-meta">
        <strong>${escapeHtml(profile.username)}</strong>
        <span class="online">● dados locais</span>
      </div>`;
  }
  function showMain() {
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
    const saved = totalSaved();
    const target = Number(state.goal.target);
    const progress = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
    const missing = Math.max(target - saved, 0);
    $("#content").innerHTML = contentWindow("MINHA META — caixinha", `
      <h2>${escapeHtml(state.goal.name)}</h2>
      <p>${escapeHtml(state.goal.category)}</p>
      <div class="goal-progress"><div style="width:${progress.toFixed(1)}%"></div></div>
      <p><strong>${progress.toFixed(1)}% concluído</strong></p>
      <p class="big-number">${money(saved)}</p>
      <p>Falta: <strong>${money(missing)}</strong></p>
      <p>Reserva automática definida: <strong>${money(state.goal.monthlyContribution)}</strong> por mês.</p>`);
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
  function openAvatarSettingsDialog() {
    let draftAvatar = normalizeAvatar(state.profile.avatar);
    openDynamicDialog({
      title: "EDITAR AVATAR",
      body: `
        <p class="dialog-note">Você pode trocar para um avatar pronto, emoji, arquivo do computador ou link direto de imagem.</p>
        <div id="dialogAvatarPicker"></div>
        <div id="dynamicFormError" class="message error hidden"></div>
        <div class="dialog-actions"><button id="cancelDynamicForm" class="button secondary" type="button">Cancelar</button><button class="button primary" type="submit">Salvar avatar</button></div>`,
      onOpen: () => {
        const root = $("#dialogAvatarPicker");
        const rerender = avatar => { draftAvatar = normalizeAvatar(avatar); renderAvatarPicker(root, draftAvatar, rerender); };
        renderAvatarPicker(root, draftAvatar, rerender);
      },
      onSubmit: () => {
        state.profile.avatar = normalizeAvatar(draftAvatar);
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
        ${avatarHtml(state.profile.avatar, "lg")}
        <div class="meta">
          <strong>${escapeHtml(state.profile.username)}</strong>
          <span class="source-chip">${escapeHtml(avatarSourceLabel(state.profile.avatar))}</span>
        </div>
      </div>
      <p><strong>Renda mensal:</strong> ${money(state.profile.monthlyIncome)}</p>
      <p><strong>Armazenamento:</strong> localStorage deste navegador.</p>
      <p><strong>Versão:</strong> ${APP_VERSION}</p>
      <div class="settings-actions">
        <button id="changeAvatarBtn" class="button secondary">🖼 Trocar avatar</button>
        <button id="verifyBtn" class="button secondary">🛡 Verificar integridade</button>
        <button id="exportBtn" class="button secondary">⬇ Exportar backup JSON</button>
        <label class="button secondary" style="display:inline-flex;align-items:center;">⬆ Importar backup<input id="importInput" type="file" accept=".json,application/json" hidden></label>
        <button id="resetBtn" class="button danger">Apagar dados locais</button>
      </div>
      <div id="settingsMessage" class="message hidden"></div>`);
    $("#changeAvatarBtn").addEventListener("click", openAvatarSettingsDialog);
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
    $("#setupAddPlanned").addEventListener("click", () => {
      addSetupPlannedRow(); renderSetupPlanned(); updateSetupPreview();
    });
    ["setupIncome", "setupGoalMonthly"].forEach(id => { $("#" + id).addEventListener("input", updateSetupPreview); });
    $("#setupCreate").addEventListener("click", createProfile);
    $$(".nav-button[data-view]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.view)));
    $("#registerIncomeBtn").addEventListener("click", registerIncome);
    $("#monthSelector").addEventListener("change", event => setSelectedMonth(event.target.value));
    $("#prevMonthBtn").addEventListener("click", () => setSelectedMonth(shiftMonth(selectedMonth, -1)));
    $("#nextMonthBtn").addEventListener("click", () => setSelectedMonth(shiftMonth(selectedMonth, 1)));
    $("#currentMonthBtn").addEventListener("click", () => setSelectedMonth(monthKey()));
    $("#formDialogClose").addEventListener("click", closeDynamicDialog);
  }

  bindStaticEvents();
  if (state.profile && state.goal) showMain(); else showSetup();
})();
