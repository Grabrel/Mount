(() => {
  "use strict";

  const STORAGE_KEY = "cofrinho_web_v01";
  const APP_VERSION = "0.1";

  const EXPENSE_CATEGORIES = [
    "Moradia", "Alimentação", "Transporte", "Saúde", "Educação",
    "Contas e serviços", "Assinaturas", "Dívidas", "Lazer", "Compras", "Outros"
  ];

  const DEFAULT_PRIORITIES = {
    "Moradia": 1,
    "Alimentação": 1,
    "Transporte": 2,
    "Saúde": 1,
    "Educação": 2,
    "Contas e serviços": 2,
    "Assinaturas": 3,
    "Dívidas": 1,
    "Lazer": 3,
    "Compras": 3,
    "Outros": 3
  };

  const state = loadState();
  let currentView = "dashboard";
  let setupPlanned = [];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

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
      if (!raw) return initialState();
      const parsed = JSON.parse(raw);
      return {
        ...initialState(),
        ...parsed,
        categoryPriorities: {
          ...DEFAULT_PRIORITIES,
          ...(parsed.categoryPriorities || {})
        },
        plannedExpenses: Array.isArray(parsed.plannedExpenses) ? parsed.plannedExpenses : [],
        movements: Array.isArray(parsed.movements) ? parsed.movements : []
      };
    } catch {
      return initialState();
    }
  }

  function saveState() {
    state.version = APP_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function money(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(value) || 0);
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function monthKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function nextId(items) {
    return Math.max(0, ...items.map(item => Number(item.id) || 0)) + 1;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function bytesToHex(buffer) {
    return [...new Uint8Array(buffer)]
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return bytesToHex(digest);
  }

  async function movementHash(movement) {
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
      plannedId: movement.plannedId ?? null,
      previousHash: movement.previousHash
    };
    return sha256(JSON.stringify(payload));
  }

  async function addMovement({ type, category, description, value, priority = null, plannedId = null }) {
    const previous = state.movements.at(-1)?.hash || "GENESIS";
    const movement = {
      id: nextId(state.movements),
      createdAt: nowISO(),
      date: todayISO(),
      month: monthKey(),
      type,
      category,
      description,
      value: Number(value),
      priority,
      plannedId,
      previousHash: previous
    };
    movement.hash = await movementHash(movement);
    state.movements.push(movement);
    saveState();
    return movement;
  }

  async function verifyIntegrity() {
    let previous = "GENESIS";
    for (const movement of state.movements) {
      if (movement.previousHash !== previous) {
        return { ok: false, message: `Quebra na cadeia antes do registro #${movement.id}.` };
      }
      const calculated = await movementHash(movement);
      if (calculated !== movement.hash) {
        return { ok: false, message: `Possível adulteração no registro #${movement.id}.` };
      }
      previous = movement.hash;
    }
    return { ok: true, message: "Histórico íntegro." };
  }

  function currentMonthMovements() {
    const month = monthKey();
    return state.movements.filter(m => m.month === month);
  }

  function incomeAlreadyRegistered() {
    return currentMonthMovements().some(
      m => m.type === "RENDA" && m.category === "Renda fixa"
    );
  }

  function monthSummary() {
    const movements = currentMonthMovements();
    const income = movements
      .filter(m => m.type === "RENDA")
      .reduce((s, m) => s + Number(m.value), 0);
    const goal = movements
      .filter(m => m.type === "META")
      .reduce((s, m) => s + Number(m.value), 0);
    const expenses = movements
      .filter(m => m.type === "GASTO")
      .reduce((s, m) => s + Number(m.value), 0);

    return {
      income,
      goal,
      expenses,
      available: income - goal - expenses
    };
  }

  function totalSaved() {
    return state.movements
      .filter(m => m.type === "META")
      .reduce((s, m) => s + Number(m.value), 0);
  }

  function activePlanned() {
    return state.plannedExpenses.filter(item => item.active !== false);
  }

  function isPlannedPaidThisMonth(plannedId) {
    return currentMonthMovements().some(
      m => m.type === "GASTO" && Number(m.plannedId) === Number(plannedId)
    );
  }

  function planningSummary() {
    const income = Number(state.profile?.monthlyIncome || 0);
    const goal = Math.min(Number(state.goal?.monthlyContribution || 0), income);
    const active = activePlanned();
    const plannedTotal = active.reduce((s, item) => s + Number(item.value), 0);
    const remaining = active
      .filter(item => !isPlannedPaidThisMonth(item.id))
      .reduce((s, item) => s + Number(item.value), 0);
    const available = monthSummary().available;

    return {
      expectedIncome: income,
      expectedGoal: goal,
      plannedTotal,
      remainingCommitments: remaining,
      projectedFree: income - goal - plannedTotal,
      freeAfterCommitments: available - remaining
    };
  }

  function priorityLabel(level) {
    return `Prioridade ${Number(level) || 3}`;
  }

  function showSetup() {
    $("#setupScreen").classList.remove("hidden");
    $("#mainScreen").classList.add("hidden");
    if (!setupPlanned.length) addSetupPlannedRow();
    renderSetupPlanned();
    updateSetupPreview();
  }

  function showMain() {
    $("#setupScreen").classList.add("hidden");
    $("#mainScreen").classList.remove("hidden");
    $("#headerUser").textContent = `${state.profile.avatar || "🙂"} ${state.profile.username}`;
    navigate("dashboard");
  }

  function addSetupPlannedRow() {
    setupPlanned.push({
      tempId: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      name: "",
      category: "Moradia",
      value: 0,
      priority: 1
    });
  }

  function renderSetupPlanned() {
    const list = $("#setupPlannedList");
    list.innerHTML = "";

    setupPlanned.forEach(item => {
      const row = document.createElement("div");
      row.className = "planned-editor-row";
      row.dataset.id = item.tempId;

      const categoryOptions = EXPENSE_CATEGORIES
        .map(cat => `<option ${cat === item.category ? "selected" : ""}>${escapeHtml(cat)}</option>`)
        .join("");

      row.innerHTML = `
        <input class="sp-name" placeholder="Ex.: Aluguel" value="${escapeHtml(item.name)}">
        <select class="sp-category">${categoryOptions}</select>
        <input class="sp-value" type="number" min="0" step="0.01" value="${Number(item.value) || 0}">
        <select class="sp-priority">
          <option value="1" ${Number(item.priority) === 1 ? "selected" : ""}>Prioridade 1</option>
          <option value="2" ${Number(item.priority) === 2 ? "selected" : ""}>Prioridade 2</option>
          <option value="3" ${Number(item.priority) === 3 ? "selected" : ""}>Prioridade 3</option>
        </select>
        <button class="button danger remove-planned" type="button">Remover</button>
      `;

      $(".sp-name", row).addEventListener("input", e => {
        item.name = e.target.value;
      });
      $(".sp-category", row).addEventListener("change", e => {
        item.category = e.target.value;
        item.priority = DEFAULT_PRIORITIES[item.category] || 3;
        renderSetupPlanned();
        updateSetupPreview();
      });
      $(".sp-value", row).addEventListener("input", e => {
        item.value = Number(e.target.value) || 0;
        updateSetupPreview();
      });
      $(".sp-priority", row).addEventListener("change", e => {
        item.priority = Number(e.target.value);
      });
      $(".remove-planned", row).addEventListener("click", () => {
        setupPlanned = setupPlanned.filter(p => p.tempId !== item.tempId);
        renderSetupPlanned();
        updateSetupPreview();
      });

      list.appendChild(row);
    });

    if (!setupPlanned.length) {
      list.innerHTML = `<div class="empty-state">Nenhum gasto previsto. Você pode criar a conta assim mesmo.</div>`;
    }
  }

  function updateSetupPreview() {
    const income = Number($("#setupIncome")?.value || 0);
    const goal = Number($("#setupGoalMonthly")?.value || 0);
    const planned = setupPlanned.reduce((s, item) => s + Number(item.value || 0), 0);
    const free = income - goal - planned;

    $("#setupPreviewIncome").textContent = money(income);
    $("#setupPreviewGoal").textContent = money(goal);
    $("#setupPreviewPlanned").textContent = money(planned);
    $("#setupPreviewFree").textContent = money(free);
    $("#setupPreviewFree").style.color = free < 0 ? "var(--red)" : "";
  }

  function setupError(message = "") {
    const box = $("#setupError");
    if (!message) {
      box.classList.add("hidden");
      box.textContent = "";
      return;
    }
    box.textContent = message;
    box.classList.remove("hidden");
  }

  function createProfile() {
    setupError();

    const username = $("#setupUsername").value.trim();
    const avatar = $("#setupAvatar").value.trim() || "🙂";
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

    state.profile = {
      username,
      avatar,
      monthlyIncome,
      payday,
      createdAt: nowISO()
    };

    state.goal = {
      name: goalName,
      category: goalCategory,
      target: goalTarget,
      monthlyContribution,
      createdAt: nowISO()
    };

    state.plannedExpenses = setupPlanned
      .filter(item => item.name.trim() && Number(item.value) > 0)
      .map(item => ({
        id: nextId(state.plannedExpenses),
        name: item.name.trim(),
        category: item.category,
        value: Number(item.value),
        priority: Number(item.priority),
        active: true,
        createdAt: nowISO()
      }));

    saveState();
    showMain();
  }

  function contentWindow(title, html) {
    return `
      <section class="window content-window">
        <div class="titlebar">${title}</div>
        <div class="content-body">${html}</div>
      </section>
    `;
  }

  function navigate(view) {
    currentView = view;
    $$(".nav-button[data-view]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });

    if (view === "dashboard") renderDashboard();
    if (view === "planning") renderPlanning();
    if (view === "expense") renderExpenseForm();
    if (view === "goal") renderGoal();
    if (view === "history") renderHistory();
    if (view === "settings") renderSettings();
  }

  function renderDashboard() {
    const summary = monthSummary();
    const plan = planningSummary();
    const saved = totalSaved();
    const target = Number(state.goal.target);
    const progress = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
    const status = incomeAlreadyRegistered()
      ? "🟢 Renda deste mês registrada. A caixinha já foi separada."
      : `🟡 Renda ainda não registrada. Dia previsto: ${state.profile.payday}.`;

    $("#content").innerHTML =
      contentWindow("INÍCIO — visão mensal", `
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
      `)
      + contentWindow(`🎯 META — ${escapeHtml(state.goal.name)}`, `
        <p><strong>Categoria:</strong> ${escapeHtml(state.goal.category)}</p>
        <div class="goal-progress"><div style="width:${progress.toFixed(1)}%"></div></div>
        <p><strong>${money(saved)}</strong> de <strong>${money(target)}</strong> — ${progress.toFixed(1)}%</p>
        <div class="notice">${status}</div>
      `)
      + contentWindow("📊 PRIORIDADES", priorityTable());
  }

  function metric(label, value, className = "") {
    return `<div class="metric ${className}"><span>${label}</span><strong>${money(value)}</strong></div>`;
  }

  function priorityTable() {
    const planned = { 1: 0, 2: 0, 3: 0 };
    const actual = { 1: 0, 2: 0, 3: 0 };

    activePlanned().forEach(item => {
      planned[item.priority] = (planned[item.priority] || 0) + Number(item.value);
    });

    currentMonthMovements()
      .filter(m => m.type === "GASTO")
      .forEach(m => {
        const p = Number(m.priority) || 3;
        actual[p] = (actual[p] || 0) + Number(m.value);
      });

    return `
      <div class="table-wrap">
        <table class="retro-table">
          <thead><tr><th>Nível</th><th>Previsto</th><th>Realizado</th></tr></thead>
          <tbody>
            ${[1, 2, 3].map(level => `
              <tr>
                <td>${priorityLabel(level)}</td>
                <td>${money(planned[level])}</td>
                <td>${money(actual[level])}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderPlanning() {
    const plan = planningSummary();
    const rows = activePlanned();

    $("#content").innerHTML =
      contentWindow("PLANEJAMENTO — gastos previstos", `
        <div class="metric-grid">
          ${metric("Renda mensal", plan.expectedIncome)}
          ${metric("Caixinha", plan.expectedGoal)}
          ${metric("Compromissos previstos", plan.plannedTotal)}
          ${metric("Livre previsto", plan.projectedFree, plan.projectedFree < 0 ? "danger" : "good")}
        </div>
        <p class="notice"><strong>✓ Pago</strong> transforma a previsão em um gasto real deste mês. A previsão continua existindo para o mês seguinte.</p>
        <div class="table-wrap">
          ${rows.length ? `
            <table class="retro-table">
              <thead><tr><th>Gasto</th><th>Categoria</th><th>Prioridade</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                ${rows.map(item => `
                  <tr>
                    <td>${escapeHtml(item.name)}</td>
                    <td>${escapeHtml(item.category)}</td>
                    <td><span class="priority-badge">${priorityLabel(item.priority)}</span></td>
                    <td>${money(item.value)}</td>
                    <td>${isPlannedPaidThisMonth(item.id) ? '<span class="online">✓ Pago</span>' : '● Pendente'}</td>
                    <td>
                      <div class="row-actions">
                        <button class="button success pay-planned" data-id="${item.id}" ${isPlannedPaidThisMonth(item.id) ? "disabled" : ""}>✓ Pago</button>
                        <button class="button danger archive-planned" data-id="${item.id}">Arquivar</button>
                      </div>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          ` : '<div class="empty-state">Nenhum gasto previsto cadastrado.</div>'}
        </div>
      `)
      + contentWindow("ADICIONAR NOVO GASTO PREVISTO", plannedExpenseFormHtml());

    $$(".pay-planned").forEach(btn => btn.addEventListener("click", async () => {
      const item = state.plannedExpenses.find(p => Number(p.id) === Number(btn.dataset.id));
      if (!item) return;
      if (isPlannedPaidThisMonth(item.id)) return;
      await addMovement({
        type: "GASTO",
        category: item.category,
        description: item.name,
        value: item.value,
        priority: item.priority,
        plannedId: item.id
      });
      renderPlanning();
    }));

    $$(".archive-planned").forEach(btn => btn.addEventListener("click", async () => {
      const item = state.plannedExpenses.find(p => Number(p.id) === Number(btn.dataset.id));
      if (!item) return;
      const ok = await confirmAction(`Arquivar "${item.name}"? O histórico de pagamentos anteriores não será apagado.`);
      if (!ok) return;
      item.active = false;
      saveState();
      renderPlanning();
    }));

    $("#addPlannedForm")?.addEventListener("submit", e => {
      e.preventDefault();
      const name = $("#plannedName").value.trim();
      const category = $("#plannedCategory").value;
      const value = Number($("#plannedValue").value);
      const priority = Number($("#plannedPriority").value);

      if (!name || !(value > 0)) {
        $("#plannedFormMessage").textContent = "Informe nome e valor maior que zero.";
        $("#plannedFormMessage").classList.remove("hidden");
        return;
      }

      state.plannedExpenses.push({
        id: nextId(state.plannedExpenses),
        name,
        category,
        value,
        priority,
        active: true,
        createdAt: nowISO()
      });
      saveState();
      renderPlanning();
    });

    $("#plannedCategory")?.addEventListener("change", e => {
      $("#plannedPriority").value = String(state.categoryPriorities[e.target.value] || DEFAULT_PRIORITIES[e.target.value] || 3);
    });
  }

  function plannedExpenseFormHtml() {
    return `
      <form id="addPlannedForm" class="form-grid">
        <label class="wide">Nome
          <input id="plannedName" placeholder="Ex.: Aluguel, Internet, Academia">
        </label>
        <label>Categoria
          <select id="plannedCategory">${EXPENSE_CATEGORIES.map(c => `<option>${escapeHtml(c)}</option>`).join("")}</select>
        </label>
        <label>Valor mensal
          <input id="plannedValue" type="number" min="0.01" step="0.01">
        </label>
        <label>Prioridade
          <select id="plannedPriority">
            <option value="1">Prioridade 1</option>
            <option value="2">Prioridade 2</option>
            <option value="3">Prioridade 3</option>
          </select>
        </label>
        <div></div>
        <div id="plannedFormMessage" class="message error hidden wide"></div>
        <div class="actions-right wide">
          <button class="button primary" type="submit">+ Adicionar ao planejamento</button>
        </div>
      </form>
    `;
  }

  function renderExpenseForm() {
    const summary = monthSummary();
    $("#content").innerHTML =
      contentWindow("NOVO GASTO — registrar saída", `
        <p class="notice"><strong>Disponível antes do gasto:</strong> ${money(summary.available)}<br>
        O Cofrinho permite registrar o que realmente aconteceu. Se o gasto ultrapassar o disponível, o painel mostrará saldo negativo.</p>
        <form id="expenseForm" class="form-grid">
          <label>Categoria
            <select id="expenseCategory">${EXPENSE_CATEGORIES.map(c => `<option>${escapeHtml(c)}</option>`).join("")}</select>
          </label>
          <label>Prioridade
            <select id="expensePriority">
              <option value="1">Prioridade 1</option>
              <option value="2">Prioridade 2</option>
              <option value="3">Prioridade 3</option>
            </select>
          </label>
          <label class="wide">Descrição
            <input id="expenseDescription" placeholder="O que foi pago?">
          </label>
          <label>Valor
            <input id="expenseValue" type="number" min="0.01" step="0.01">
          </label>
          <div></div>
          <div id="expenseMessage" class="message error hidden wide"></div>
          <div class="actions-right wide">
            <button class="button primary" type="submit">💾 Registrar gasto</button>
          </div>
        </form>
      `);

    const category = $("#expenseCategory");
    const priority = $("#expensePriority");
    priority.value = String(state.categoryPriorities[category.value] || DEFAULT_PRIORITIES[category.value] || 3);

    category.addEventListener("change", () => {
      priority.value = String(state.categoryPriorities[category.value] || DEFAULT_PRIORITIES[category.value] || 3);
    });

    $("#expenseForm").addEventListener("submit", async e => {
      e.preventDefault();
      const description = $("#expenseDescription").value.trim();
      const value = Number($("#expenseValue").value);
      if (!description || !(value > 0)) {
        $("#expenseMessage").textContent = "Informe descrição e um valor maior que zero.";
        $("#expenseMessage").classList.remove("hidden");
        return;
      }

      await addMovement({
        type: "GASTO",
        category: category.value,
        description,
        value,
        priority: Number(priority.value)
      });
      navigate("dashboard");
    });
  }

  async function registerIncome() {
    if (incomeAlreadyRegistered()) {
      await alertAction("A renda fixa deste mês já foi registrada.");
      return;
    }

    const income = Number(state.profile.monthlyIncome);
    const contribution = Math.min(Number(state.goal.monthlyContribution), income);
    const ok = await confirmAction(
      `Registrar ${money(income)} como renda deste mês e separar ${money(contribution)} para "${state.goal.name}"?`
    );
    if (!ok) return;

    await addMovement({
      type: "RENDA",
      category: "Renda fixa",
      description: `Renda líquida de ${monthKey()}`,
      value: income
    });

    if (contribution > 0) {
      await addMovement({
        type: "META",
        category: state.goal.category,
        description: `Reserva automática para: ${state.goal.name}`,
        value: contribution
      });
    }

    navigate("dashboard");
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
      <p>Reserva automática definida: <strong>${money(state.goal.monthlyContribution)}</strong> por mês.</p>
    `);
  }

  function renderHistory() {
    const rows = [...currentMonthMovements()].reverse();
    $("#content").innerHTML = contentWindow("HISTÓRICO.LOG — movimentos do mês", `
      <div class="table-wrap">
        ${rows.length ? `
          <table class="retro-table">
            <thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Valor</th></tr></thead>
            <tbody>
              ${rows.map(m => {
                const sign = ["GASTO", "META"].includes(m.type) ? "-" : "+";
                return `
                  <tr>
                    <td>${escapeHtml(m.date)}</td>
                    <td>${escapeHtml(m.type)}</td>
                    <td>${escapeHtml(m.category)}</td>
                    <td>${escapeHtml(m.description)}</td>
                    <td>${sign} ${money(m.value)}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        ` : '<div class="empty-state">Nenhum movimento neste mês.</div>'}
      </div>
      <p class="muted">O histórico usa uma cadeia SHA-256 para detectar alterações nos registros salvos pelo aplicativo.</p>
    `);
  }

  function renderSettings() {
    $("#content").innerHTML =
      contentWindow("CONFIGURAÇÕES", `
        <p><strong>Perfil:</strong> ${escapeHtml(state.profile.avatar)} ${escapeHtml(state.profile.username)}</p>
        <p><strong>Renda mensal:</strong> ${money(state.profile.monthlyIncome)}</p>
        <p><strong>Armazenamento:</strong> localStorage deste navegador.</p>
        <p><strong>Versão:</strong> ${APP_VERSION}</p>
        <div class="settings-actions">
          <button id="verifyBtn" class="button secondary">🛡 Verificar integridade</button>
          <button id="exportBtn" class="button secondary">⬇ Exportar backup JSON</button>
          <label class="button secondary" style="display:inline-flex;align-items:center;">
            ⬆ Importar backup
            <input id="importInput" type="file" accept=".json,application/json" hidden>
          </label>
          <button id="resetBtn" class="button danger">Apagar dados locais</button>
        </div>
        <div id="settingsMessage" class="message hidden"></div>
      `);

    $("#verifyBtn").addEventListener("click", async () => {
      const result = await verifyIntegrity();
      const box = $("#settingsMessage");
      box.textContent = result.message;
      box.className = `message ${result.ok ? "success" : "error"}`;
    });

    $("#exportBtn").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cofrinho-backup-${todayISO()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    $("#importInput").addEventListener("change", async e => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const parsed = JSON.parse(await file.text());
        if (!parsed.profile || !parsed.goal || !Array.isArray(parsed.movements)) {
          throw new Error("O arquivo não parece ser um backup válido do Cofrinho.exe.");
        }

        const ok = await confirmAction("Importar este backup substituirá os dados locais atuais. Continuar?");
        if (!ok) return;

        Object.keys(state).forEach(key => delete state[key]);
        Object.assign(state, {
          ...initialState(),
          ...parsed,
          categoryPriorities: { ...DEFAULT_PRIORITIES, ...(parsed.categoryPriorities || {}) }
        });
        saveState();
        showMain();
      } catch (err) {
        const box = $("#settingsMessage");
        box.textContent = err.message || "Não foi possível importar o arquivo.";
        box.className = "message error";
      }
    });

    $("#resetBtn").addEventListener("click", async () => {
      const ok = await confirmAction("Apagar todos os dados deste navegador? Faça um backup antes se quiser preservar o histórico.");
      if (!ok) return;
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    });
  }

  function confirmAction(text) {
    return new Promise(resolve => {
      const dialog = $("#confirmDialog");
      $("#confirmText").textContent = text;

      const onClose = () => {
        dialog.removeEventListener("close", onClose);
        resolve(dialog.returnValue === "default");
      };

      dialog.addEventListener("close", onClose);
      dialog.showModal();
    });
  }

  async function alertAction(text) {
    await confirmAction(text);
  }

  function bindStaticEvents() {
    $("#setupAddPlanned").addEventListener("click", () => {
      addSetupPlannedRow();
      renderSetupPlanned();
      updateSetupPreview();
    });

    ["setupIncome", "setupGoalMonthly"].forEach(id => {
      $(`#${id}`).addEventListener("input", updateSetupPreview);
    });

    $("#setupCreate").addEventListener("click", createProfile);

    $$(".nav-button[data-view]").forEach(btn => {
      btn.addEventListener("click", () => navigate(btn.dataset.view));
    });

    $("#registerIncomeBtn").addEventListener("click", registerIncome);
  }

  bindStaticEvents();

  if (state.profile && state.goal) {
    showMain();
  } else {
    showSetup();
  }
})();
