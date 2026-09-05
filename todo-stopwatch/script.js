(() => {
  const STORAGE_KEY = "todoStopwatch:v6";
  const HISTORY_KEY = "todoStopwatch:history:v1";
  const DRAFTS_KEY = "todoStopwatch:drafts:v1";
  const PLANS_KEY = "todoStopwatch:plans:v1";
  const SOMEDAY_KEY = "todoStopwatch:someday:v1";
  const DAY_TITLES_KEY = "todoStopwatch:dayTitles:v1";
  const MAX_HISTORY = 60;
  const MAX_COUNT = 40;
  const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function formatDateLabel(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return `${m}/${d}(${WEEKDAYS[dt.getDay()]})`;
  }

  function freshItem(label) {
    return { label: label || "", elapsedMs: 0, running: false, startedAt: null, planId: null };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed.day === "string" &&
          Array.isArray(parsed.items) &&
          parsed.sidework &&
          parsed.interrupt &&
          parsed.chore
        ) {
          if (!Array.isArray(parsed.segments)) parsed.segments = [];
          // Items with no linked plan (old free-typed rows, or ones added via
          // the + button) are kept as-is; sortItemsByPlan() groups them after
          // all planned items whenever the list is sorted.
          parsed.items.forEach((it) => {
            if (it.planId === undefined) it.planId = null;
          });
          return parsed;
        }
      }
    } catch (e) {
      // corrupt storage, fall through to defaults
    }
    return {
      day: todayStr(),
      items: [], // items are now meant to come from calendar plans (or the manual + button)
      sidework: freshItem("割込"),
      interrupt: freshItem("割込対応"),
      chore: freshItem("予定外タスク"),
      segments: [],
    };
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      // corrupt storage, fall through to empty
    }
    return [];
  }

  function loadDrafts() {
    try {
      const raw = localStorage.getItem(DRAFTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          // Older versions stored each date as a plain array of label strings.
          // Upgrade those to full item objects so planId links survive.
          Object.keys(parsed).forEach((dateStr) => {
            if (!Array.isArray(parsed[dateStr])) return;
            parsed[dateStr] = parsed[dateStr].map((it) =>
              typeof it === "string" ? freshItem(it) : { ...it, planId: it.planId ?? null }
            );
          });
          return parsed;
        }
      }
    } catch (e) {
      // corrupt storage, fall through to empty
    }
    return {};
  }

  function loadPlans() {
    try {
      const raw = localStorage.getItem(PLANS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      // corrupt storage, fall through to empty
    }
    return {};
  }

  function loadSomeday() {
    try {
      const raw = localStorage.getItem(SOMEDAY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // parentId links a subtask to its parent いつか task; older saves
        // predate this and never set it, so normalize those to top-level.
        if (Array.isArray(parsed)) return parsed.map((t) => ({ ...t, parentId: t.parentId || null }));
      }
    } catch (e) {
      // corrupt storage, fall through to empty
    }
    return [];
  }

  function loadDayTitles() {
    try {
      const raw = localStorage.getItem(DAY_TITLES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      // corrupt storage, fall through to empty
    }
    return {};
  }

  let state = loadState();
  let history = loadHistory();
  let drafts = loadDrafts();
  let plans = loadPlans();
  let someday = loadSomeday(); // tasks with no day or time assigned yet ("いつか")
  // day titles are a label on the DATE itself (e.g. "旅行"), distinct from
  // any plan or task placed on that date — keyed by date string.
  let dayTitles = loadDayTitles();

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function saveHistory() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  function saveDrafts() {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  }

  function savePlans() {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  }

  function saveSomeday() {
    localStorage.setItem(SOMEDAY_KEY, JSON.stringify(someday));
  }

  function saveDayTitles() {
    localStorage.setItem(DAY_TITLES_KEY, JSON.stringify(dayTitles));
  }

  function dayTitleFor(dateStr) {
    return dayTitles[dateStr] || "";
  }

  async function editDayTitle(dateStr) {
    const current = dayTitleFor(dateStr);
    const name = await openNameModal(current, "日付のタイトルを入力");
    if (name === null) return;
    const trimmed = name.trim();
    if (trimmed) dayTitles[dateStr] = trimmed;
    else delete dayTitles[dateStr];
    saveDayTitles();
    renderCalendar();
  }

  // viewingDate is the date currently shown in the タスク list. It usually
  // tracks state.day, but the day picker can point it at a future date to
  // edit that date's task list without touching today's live tracking.
  let viewingDate = state.day;

  function isLive() {
    return viewingDate === state.day;
  }

  // Every date has its own item list: today's is state.items, any other
  // date's lives in drafts[dateStr]. This is what keeps a calendar plan and
  // its linked timer task in sync across any day, not just today.
  function itemsArrayForDate(dateStr) {
    return dateStr === state.day ? state.items : drafts[dateStr] || [];
  }

  // Same as itemsArrayForDate, but materializes drafts[dateStr] first if it
  // doesn't exist yet — use this before pushing a new item onto a date.
  function ensureItemsArrayForDate(dateStr) {
    if (dateStr === state.day) return state.items;
    if (!drafts[dateStr]) drafts[dateStr] = [];
    return drafts[dateStr];
  }

  function persistItemsForDate(dateStr) {
    if (dateStr === state.day) {
      saveState();
    } else {
      if (drafts[dateStr] && !drafts[dateStr].length) delete drafts[dateStr];
      saveDrafts();
    }
  }

  function refreshTimerIfShowing(dateStr) {
    if (viewingDate === dateStr) {
      buildRows();
      render();
    }
  }

  function currentItemsArray() {
    return itemsArrayForDate(viewingDate);
  }

  function persistItemsChange() {
    persistItemsForDate(viewingDate);
  }

  function labelOf(item, fallback) {
    return item.label.trim() || fallback;
  }

  function currentElapsed(item) {
    if (item.running && item.startedAt) {
      return item.elapsedMs + (Date.now() - item.startedAt);
    }
    return item.elapsedMs;
  }

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  }

  function allTrackedEntries() {
    return [
      ...state.items.map((it, i) => ({ item: it, fallback: `タスク${i + 1}` })),
      { item: state.sidework, fallback: "割込" },
      { item: state.interrupt, fallback: "割込対応" },
      { item: state.chore, fallback: "予定外タスク" },
    ];
  }

  // --- history archiving ---

  function archiveDay(dayStr) {
    const snapshot = allTrackedEntries()
      .map(({ item, fallback }) => ({ label: labelOf(item, fallback), elapsedMs: currentElapsed(item) }))
      .filter((e) => e.elapsedMs > 0)
      .sort((a, b) => b.elapsedMs - a.elapsedMs);
    const totalMs = snapshot.reduce((s, e) => s + e.elapsedMs, 0);
    if (totalMs <= 0) return;

    const record = { date: dayStr, totalMs, items: snapshot, segments: state.segments.slice() };
    const idx = history.findIndex((h) => h.date === dayStr);
    if (idx >= 0) history[idx] = record;
    else history.unshift(record);
    history.sort((a, b) => b.date.localeCompare(a.date));
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    saveHistory();
  }

  function resetAllTracking() {
    state.items.forEach((item) => {
      item.elapsedMs = 0;
      item.running = false;
      item.startedAt = null;
    });
    state.sidework.elapsedMs = 0;
    state.sidework.running = false;
    state.sidework.startedAt = null;
    state.interrupt.elapsedMs = 0;
    state.interrupt.running = false;
    state.interrupt.startedAt = null;
    state.chore.elapsedMs = 0;
    state.chore.running = false;
    state.chore.startedAt = null;
  }

  function rolloverIfNeeded() {
    const today = todayStr();
    if (state.day === today) return false;

    const wasFollowingToday = viewingDate === state.day;
    const now = Date.now();
    closeRunningSegments(now);
    archiveDay(state.day);

    const draftForToday = drafts[today];
    if (draftForToday && draftForToday.length) {
      // Already full item objects with their planId links intact, so a plan
      // made for this date while it was still "tomorrow" stays linked.
      state.items = draftForToday;
      delete drafts[today];
      saveDrafts();
    } else {
      state.items.forEach((it) => {
        if (it.running) it.startedAt = now;
        it.elapsedMs = 0;
      });
    }
    if (state.sidework.running) state.sidework.startedAt = now;
    state.sidework.elapsedMs = 0;
    if (state.chore.running) state.chore.startedAt = now;
    state.chore.elapsedMs = 0;
    state.interrupt.elapsedMs = 0;
    state.segments = [];
    state.day = today;
    sortItemsByPlan(today);
    saveState();

    if (wasFollowingToday) viewingDate = today;
    return true;
  }

  // --- timer list ---

  const list = document.getElementById("list");
  const template = document.getElementById("rowTemplate");
  const totalTimeEl = document.getElementById("totalTime");
  const resetAllBtn = document.getElementById("resetAllBtn");
  const appHeaderEl = document.querySelector(".app-header");
  const breakdownEl = document.getElementById("breakdown");
  const historyEl = document.getElementById("history");
  const listWrap = document.querySelector(".list-wrap");
  // デイリー(1日だけ)とウィークリー(7日間)は同じ時間軸グリッドUIを共有する。
  // DOMは2ページ分(id違い)存在するが、レンダリング関数群は今まで通り
  // calendarWeekGrid 等の単一の名前を参照し続けられるよう、それらを
  // "現在アクティブなページの実体を指すポインタ" にしている ―
  // enterCalendarPage() がタブ切り替え時にこのポインタの向き先と
  // CAL_DAYS/weekAnchor を差し替える。dailyXxxEl/weeklyXxxEl は
  // 差し替えられない、各ページ固有の実体そのもの。
  const dailyWeekLabelEl = document.getElementById("calendarWeekLabel");
  const dailyWeekHeaderEl = document.getElementById("calendarWeekHeader");
  const dailyWeekBodyEl = document.getElementById("calendarWeekBody");
  const dailyHoursEl = document.getElementById("calendarHours");
  const dailyWeekGridEl = document.getElementById("calendarWeekGrid");
  const dailyDetailEl = document.getElementById("calendarDetail");
  const weeklyWeekLabelEl = document.getElementById("weeklyWeekLabel");
  const weeklyWeekHeaderEl = document.getElementById("weeklyWeekHeader");
  const weeklyWeekBodyEl = document.getElementById("weeklyWeekBody");
  const weeklyHoursEl = document.getElementById("weeklyHours");
  const weeklyWeekGridEl = document.getElementById("weeklyWeekGrid");
  const weeklyDetailEl = document.getElementById("weeklyDetail");
  let calendarWeekLabel = dailyWeekLabelEl;
  let calendarWeekHeader = dailyWeekHeaderEl;
  let calendarWeekBody = dailyWeekBodyEl;
  let calendarHours = dailyHoursEl;
  let calendarWeekGrid = dailyWeekGridEl;
  let calendarDetail = dailyDetailEl;
  const calendarUnplannedBox = document.getElementById("calendarUnplannedBox");
  const calendarUnplannedList = document.getElementById("calendarUnplannedList");
  const calendarSomedayAddBtn = document.getElementById("calendarSomedayAddBtn");
  const calendarSubtaskBox = document.getElementById("calendarSubtaskBox");
  const calendarSubtaskList = document.getElementById("calendarSubtaskList");
  const calendarSubtaskAddBtn = document.getElementById("calendarSubtaskAddBtn");
  const calendarGrandchildBox = document.getElementById("calendarGrandchildBox");
  const calendarGrandchildList = document.getElementById("calendarGrandchildList");
  const calendarGrandchildAddBtn = document.getElementById("calendarGrandchildAddBtn");
  const calendarGreatGrandchildBox = document.getElementById("calendarGreatGrandchildBox");
  const calendarGreatGrandchildList = document.getElementById("calendarGreatGrandchildList");
  const calendarGreatGrandchildAddBtn = document.getElementById("calendarGreatGrandchildAddBtn");
  const calendarPrevBtn = document.getElementById("calendarPrevBtn");
  const calendarNextBtn = document.getElementById("calendarNextBtn");
  const weeklyUnplannedBox = document.getElementById("weeklyUnplannedBox");
  const weeklyUnplannedList = document.getElementById("weeklyUnplannedList");
  const weeklySomedayAddBtn = document.getElementById("weeklySomedayAddBtn");
  const weeklySubtaskBox = document.getElementById("weeklySubtaskBox");
  const weeklySubtaskList = document.getElementById("weeklySubtaskList");
  const weeklySubtaskAddBtn = document.getElementById("weeklySubtaskAddBtn");
  const weeklyGrandchildBox = document.getElementById("weeklyGrandchildBox");
  const weeklyGrandchildList = document.getElementById("weeklyGrandchildList");
  const weeklyGrandchildAddBtn = document.getElementById("weeklyGrandchildAddBtn");
  const weeklyGreatGrandchildBox = document.getElementById("weeklyGreatGrandchildBox");
  const weeklyGreatGrandchildList = document.getElementById("weeklyGreatGrandchildList");
  const weeklyGreatGrandchildAddBtn = document.getElementById("weeklyGreatGrandchildAddBtn");
  const weeklyPrevBtn = document.getElementById("weeklyPrevBtn");
  const weeklyNextBtn = document.getElementById("weeklyNextBtn");
  const monthlyLabel = document.getElementById("monthlyLabel");
  const monthlyWeekdayRow = document.getElementById("monthlyWeekdayRow");
  const monthlyWeeksScroll = document.getElementById("monthlyWeeksScroll");
  const monthlyWeeks = document.getElementById("monthlyWeeks");
  const monthlyPrevBtn = document.getElementById("monthlyPrevBtn");
  const monthlyNextBtn = document.getElementById("monthlyNextBtn");
  const monthlyUnplannedList = document.getElementById("monthlyUnplannedList");
  const monthlySomedayAddBtn = document.getElementById("monthlySomedayAddBtn");
  const monthlySubtaskBox = document.getElementById("monthlySubtaskBox");
  const monthlySubtaskList = document.getElementById("monthlySubtaskList");
  const monthlySubtaskAddBtn = document.getElementById("monthlySubtaskAddBtn");
  const monthlyGrandchildBox = document.getElementById("monthlyGrandchildBox");
  const monthlyGrandchildList = document.getElementById("monthlyGrandchildList");
  const monthlyGrandchildAddBtn = document.getElementById("monthlyGrandchildAddBtn");
  const monthlyGreatGrandchildBox = document.getElementById("monthlyGreatGrandchildBox");
  const monthlyGreatGrandchildList = document.getElementById("monthlyGreatGrandchildList");
  const monthlyGreatGrandchildAddBtn = document.getElementById("monthlyGreatGrandchildAddBtn");
  const taskUnplannedBox = document.getElementById("taskUnplannedBox");
  const taskUnplannedList = document.getElementById("taskUnplannedList");
  const taskSomedayAddBtn = document.getElementById("taskSomedayAddBtn");
  const taskSubtaskBox = document.getElementById("taskSubtaskBox");
  const taskSubtaskList = document.getElementById("taskSubtaskList");
  const taskSubtaskAddBtn = document.getElementById("taskSubtaskAddBtn");
  const taskGrandchildBox = document.getElementById("taskGrandchildBox");
  const taskGrandchildList = document.getElementById("taskGrandchildList");
  const taskGrandchildAddBtn = document.getElementById("taskGrandchildAddBtn");
  const taskGreatGrandchildBox = document.getElementById("taskGreatGrandchildBox");
  const taskGreatGrandchildList = document.getElementById("taskGreatGrandchildList");
  const taskGreatGrandchildAddBtn = document.getElementById("taskGreatGrandchildAddBtn");
  const breakdownModal = document.getElementById("breakdownModal");
  const historyModal = document.getElementById("historyModal");
  const openBreakdownBtn = document.getElementById("openBreakdownBtn");
  const openHistoryBtn = document.getElementById("openHistoryBtn");
  const breakdownModalClose = document.getElementById("breakdownModalClose");
  const historyModalClose = document.getElementById("historyModalClose");

  let rowEls = [];

  function buildRows() {
    list.innerHTML = "";
    rowEls = [];
    const live = isLive();
    currentItemsArray().forEach((item) => {
      const node = template.content.firstElementChild.cloneNode(true);
      const input = node.querySelector(".row-input");
      const timeDisplay = node.querySelector(".row-time");
      const toggleBtn = node.querySelector(".row-toggle");
      const resetBtn = node.querySelector(".row-reset");
      const handle = node.querySelector(".row-handle");

      input.value = item.label;
      input.addEventListener("input", () => {
        item.label = input.value;
        if (item.planId) {
          const plan = plansForDate(viewingDate).find((p) => p.id === item.planId);
          if (plan) {
            plan.label = item.label;
            savePlans();
          }
        }
        persistItemsChange();
      });

      if (live) {
        toggleBtn.addEventListener("click", () => toggleExclusive(item));
        resetBtn.addEventListener("click", () => resetItem(item));
        timeDisplay.addEventListener("click", () => addManualTime(item));
      } else {
        toggleBtn.disabled = true;
        resetBtn.disabled = true;
        timeDisplay.disabled = true;
        timeDisplay.textContent = "--:--:--";
      }
      handle.addEventListener("pointerdown", (e) => startDrag(e, node, item));
      node.addEventListener("pointerdown", (e) => onRowPointerDown(e, node, input, item));

      rowEls.push({ node, input, timeDisplay, toggleBtn, item });
      list.appendChild(node);
    });

    const addRow = document.createElement("button");
    addRow.type = "button";
    addRow.className = "add-row";
    addRow.textContent = "＋ タスクの追加";
    addRow.addEventListener("click", addWatch);
    list.appendChild(addRow);
  }

  // Long-press anywhere on a row except its dedicated buttons (which already
  // have their own tap behavior) opens the 変更修正/削除 choice, the same
  // pattern used for いつかタスク — a plain tap still just focuses the name
  // field for live inline editing, unchanged.
  function onRowPointerDown(e, node, input, item) {
    if (e.target.closest(".row-time, .row-toggle, .row-reset, .row-handle")) return;
    if (e.button !== undefined && e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let timer = setTimeout(() => {
      timer = null;
      cleanup();
      input.blur();
      vibrate(10);
      promptRegularTaskEdit(viewingDate, item);
    }, PLAN_LONGPRESS_MS);

    function onMove(ev) {
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > PLAN_MOVE_TOLERANCE) cleanup();
    }
    function cleanup() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", cleanup);
      document.removeEventListener("pointercancel", cleanup);
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", cleanup);
    document.addEventListener("pointercancel", cleanup);
  }

  function addWatch() {
    const items = ensureItemsArrayForDate(viewingDate);
    if (items.length >= MAX_COUNT) return;
    items.push(freshItem(""));
    persistItemsChange();
    buildRows();
    render();
    requestAnimationFrame(() => {
      listWrap.scrollTop = listWrap.scrollHeight;
    });
  }

  function fallbackLabelFor(item) {
    if (item === state.sidework) return "割込";
    if (item === state.chore) return "予定外タスク";
    if (item === state.interrupt) return "割込対応";
    const idx = state.items.indexOf(item);
    return idx >= 0 ? `タスク${idx + 1}` : "無題";
  }

  function stopIfRunning(item) {
    if (!item.running) return;
    const endMs = Date.now();
    state.segments.push({ label: labelOf(item, fallbackLabelFor(item)), startMs: item.startedAt, endMs });
    item.elapsedMs += endMs - item.startedAt;
    item.running = false;
    item.startedAt = null;
  }

  function subtractElapsed(item, amount) {
    if (amount <= 0) return;
    if (item.running && item.startedAt) {
      const runningDuration = Date.now() - item.startedAt;
      const fromRunning = Math.min(amount, runningDuration);
      item.startedAt += fromRunning;
      amount -= fromRunning;
    }
    if (amount > 0) {
      item.elapsedMs = Math.max(0, item.elapsedMs - amount);
    }
  }

  function exclusiveGroup() {
    return [...state.items, state.chore];
  }

  function toggleExclusive(target) {
    if (target.running) {
      stopIfRunning(target);
    } else {
      exclusiveGroup().forEach((item) => {
        if (item !== target) stopIfRunning(item);
      });
      target.running = true;
      target.startedAt = Date.now();
    }

    saveState();
    render();
  }

  async function resetItem(item) {
    const index = state.items.indexOf(item);
    const ok = await openConfirmModal(`「${labelOf(item, `タスク${index + 1}`)}」の記録をリセットしますか?(履歴には保存されません)`);
    if (!ok) return;
    item.elapsedMs = 0;
    item.running = false;
    item.startedAt = null;
    saveState();
    render();
  }

  async function addManualTime(item) {
    const index = state.items.indexOf(item);
    const result = await openDurationModal(`「${labelOf(item, `タスク${index + 1}`)}」に時間を追加`);
    if (!result) return;
    const ms = (result.hours * 60 + result.minutes) * 60000;
    if (ms <= 0) return;
    item.elapsedMs += ms;
    saveState();
    render();
  }

  // --- sidework (割込) widget ---

  const sideworkInput = document.getElementById("sideworkInput");
  const sideworkCircle = document.getElementById("sideworkCircle");
  const sideworkTime = document.getElementById("sideworkTime");
  const sideworkWidget = document.getElementById("sideworkWidget");
  const deductPrevBtn = document.getElementById("deductPrevBtn");

  sideworkInput.value = state.sidework.label;
  sideworkInput.addEventListener("input", () => {
    state.sidework.label = sideworkInput.value;
    saveState();
  });

  sideworkCircle.addEventListener("click", () => {
    // Runs independently: does not stop whichever regular watch is active.
    if (state.sidework.running) {
      stopIfRunning(state.sidework);
    } else {
      state.sidework.running = true;
      state.sidework.startedAt = Date.now();
    }
    saveState();
    render();
  });

  deductPrevBtn.addEventListener("click", () => {
    stopIfRunning(state.sidework);
    const elapsed = state.sidework.elapsedMs;
    if (elapsed <= 0) return;
    const prev = exclusiveGroup().find((it) => it.running);
    if (prev) {
      subtractElapsed(prev, elapsed);
    }
    state.sidework.elapsedMs = 0;
    saveState();
    render();
  });

  // --- modal (custom, since window.prompt/confirm are blocked in sandboxed views) ---

  const nameModal = document.getElementById("nameModal");
  const nameModalTitle = document.getElementById("nameModalTitle");
  const nameModalInput = document.getElementById("nameModalInput");
  const nameModalDuration = document.getElementById("nameModalDuration");
  const durationHoursInput = document.getElementById("durationHoursInput");
  const durationMinutesInput = document.getElementById("durationMinutesInput");
  const nameModalOk = document.getElementById("nameModalOk");
  const nameModalCancel = document.getElementById("nameModalCancel");

  function openModal({ title, showInput, showDuration, initialValue }) {
    return new Promise((resolve) => {
      nameModalTitle.textContent = title;
      nameModalInput.hidden = !showInput;
      nameModalDuration.hidden = !showDuration;
      if (showInput) nameModalInput.value = initialValue || "";
      if (showDuration) {
        durationHoursInput.value = "0";
        durationMinutesInput.value = "0";
      }
      nameModal.hidden = false;
      if (showInput) {
        nameModalInput.focus();
        nameModalInput.select();
      } else if (showDuration) {
        durationHoursInput.focus();
        durationHoursInput.select();
      } else {
        nameModalOk.focus();
      }

      function cleanup(result) {
        nameModal.hidden = true;
        nameModalInput.hidden = false;
        nameModalDuration.hidden = true;
        nameModalOk.removeEventListener("click", onOk);
        nameModalCancel.removeEventListener("click", onCancel);
        nameModal.removeEventListener("mousedown", onBackdrop);
        document.removeEventListener("keydown", onKeydown);
        resolve(result);
      }
      function onOk() {
        if (showInput) {
          cleanup(nameModalInput.value);
        } else if (showDuration) {
          const hours = Math.max(0, parseInt(durationHoursInput.value, 10) || 0);
          const minutes = Math.max(0, parseInt(durationMinutesInput.value, 10) || 0);
          cleanup({ hours, minutes });
        } else {
          cleanup(true);
        }
      }
      function onCancel() {
        cleanup(showInput || showDuration ? null : false);
      }
      function onBackdrop(e) {
        if (e.target === nameModal) onCancel();
      }
      function onKeydown(e) {
        if (e.key === "Enter") {
          e.preventDefault();
          onOk();
        } else if (e.key === "Escape") {
          onCancel();
        }
      }

      nameModalOk.addEventListener("click", onOk);
      nameModalCancel.addEventListener("click", onCancel);
      nameModal.addEventListener("mousedown", onBackdrop);
      document.addEventListener("keydown", onKeydown);
    });
  }

  function openNameModal(initial, title = "タスク名を入力") {
    return openModal({ title, showInput: true, initialValue: initial });
  }

  function openConfirmModal(message) {
    return openModal({ title: message, showInput: false });
  }

  function openDurationModal(title) {
    return openModal({ title, showDuration: true });
  }

  const newTaskBtn = document.getElementById("newTaskBtn");

  newTaskBtn.addEventListener("click", async () => {
    stopIfRunning(state.sidework);
    const elapsed = state.sidework.elapsedMs;
    if (elapsed <= 0) return;

    const name = await openNameModal("");
    if (name === null) return;

    const prev = exclusiveGroup().find((it) => it.running);
    if (prev) {
      subtractElapsed(prev, elapsed);
    }

    const newTask = freshItem(name);
    newTask.elapsedMs = elapsed;
    state.items.unshift(newTask);
    state.sidework.elapsedMs = 0;
    saveState();
    buildRows();
    render();
  });

  // --- chore (予定外タスク) widget: joins the exclusive group, unlike sidework ---

  const choreInput = document.getElementById("choreInput");
  const choreCircle = document.getElementById("choreCircle");
  const choreTime = document.getElementById("choreTime");
  const choreWidget = document.getElementById("choreWidget");

  choreInput.value = state.chore.label;
  choreInput.addEventListener("input", () => {
    state.chore.label = choreInput.value;
    saveState();
  });

  choreCircle.addEventListener("click", () => toggleExclusive(state.chore));

  // --- drag to reorder ---

  let dragCtx = null;

  function startDrag(e, node, item) {
    if (e.button !== undefined && e.button !== 0) return;
    dragCtx = {
      node,
      item,
      startClientY: e.clientY,
      startTop: node.offsetTop,
    };
    node.classList.add("dragging");
    node.style.transition = "none";
    document.addEventListener("pointermove", onDragMove);
    document.addEventListener("pointerup", onDragEnd);
    document.addEventListener("pointercancel", onDragEnd);
    e.preventDefault();
  }

  function onDragMove(e) {
    if (!dragCtx) return;
    e.preventDefault();
    const { node, startClientY, startTop } = dragCtx;
    const desiredTop = startTop + (e.clientY - startClientY);
    const currentTop = node.offsetTop;
    node.style.transform = `translateY(${desiredTop - currentTop}px)`;

    // dragging a row down past the list, onto いつか, sends it back there
    // instead of just reordering it
    const boxRect = taskUnplannedBox.getBoundingClientRect();
    const overUnplannedBox =
      e.clientX >= boxRect.left &&
      e.clientX <= boxRect.right &&
      e.clientY >= boxRect.top &&
      e.clientY <= boxRect.bottom;
    taskUnplannedBox.classList.toggle("drop-target", overUnplannedBox);
    dragCtx.overUnplannedBox = overUnplannedBox;
    if (overUnplannedBox) return;

    const rowRect = node.getBoundingClientRect();
    const rowCenter = rowRect.top + rowRect.height / 2;
    const siblings = Array.from(list.children).filter((n) => n.classList.contains("row"));
    const draggedIndex = siblings.indexOf(node);

    for (let j = 0; j < siblings.length; j++) {
      const sib = siblings[j];
      if (sib === node) continue;
      const sibRect = sib.getBoundingClientRect();
      if (rowCenter > sibRect.top && rowCenter < sibRect.bottom) {
        if (j < draggedIndex) {
          list.insertBefore(node, sib);
        } else {
          list.insertBefore(node, sib.nextSibling);
        }
        break;
      }
    }
  }

  function onDragEnd() {
    if (!dragCtx) return;
    const { node, item: draggedItem, overUnplannedBox } = dragCtx;

    document.removeEventListener("pointermove", onDragMove);
    document.removeEventListener("pointerup", onDragEnd);
    document.removeEventListener("pointercancel", onDragEnd);
    taskUnplannedBox.classList.remove("drop-target");

    if (overUnplannedBox) {
      if (draggedItem.elapsedMs > 0 || draggedItem.running) {
        // real recorded time exists: refuse the move so it isn't lost,
        // いつか has no time fields to hold it — just settle back in place
        vibrate([10, 30, 10]);
        node.classList.remove("dragging");
        node.style.transition = "transform 0.15s ease";
        node.style.transform = "";
        setTimeout(() => {
          node.style.transition = "";
        }, 160);
        dragCtx = null;
        return;
      }
      const items = currentItemsArray();
      const idx = items.indexOf(draggedItem);
      if (idx >= 0) items.splice(idx, 1);
      if (draggedItem.planId) removePlan(viewingDate, draggedItem.planId);
      someday.push({ id: `someday_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, label: labelOf(draggedItem, "予定"), parentId: null });
      saveSomeday();
      persistItemsChange();
      vibrate(20);
      buildRows();
      render();
      dragCtx = null;
      return;
    }

    node.classList.remove("dragging");
    node.style.transition = "transform 0.15s ease";
    node.style.transform = "";

    const domOrder = Array.from(list.children).filter((n) => n.classList.contains("row"));
    rowEls = domOrder.map((n) => rowEls.find((r) => r.node === n));
    const newOrder = rowEls.map((r) => r.item);
    if (isLive()) {
      state.items = newOrder;
    } else {
      drafts[viewingDate] = newOrder;
    }
    const draggedIndex = newOrder.indexOf(draggedItem);
    if (draggedIndex >= 0) resnapPlanForReorderedItem(viewingDate, newOrder, draggedIndex);
    persistItemsChange();
    render();

    setTimeout(() => {
      node.style.transition = "";
    }, 160);
    dragCtx = null;
  }

  resetAllBtn.addEventListener("click", async () => {
    const ok = await openConfirmModal("今日の記録を履歴に保存してリセットします。よろしいですか?");
    if (!ok) return;
    closeRunningSegments();
    archiveDay(state.day);
    resetAllTracking();
    state.segments = [];
    saveState();
    renderHistory();
    render();
  });

  // --- breakdown page ---

  function renderBreakdown() {
    const rows = allTrackedEntries()
      .map(({ item, fallback }) => ({ label: labelOf(item, fallback), elapsed: currentElapsed(item), running: item.running }))
      .filter((r) => r.elapsed > 0)
      .sort((a, b) => b.elapsed - a.elapsed);

    breakdownEl.innerHTML = "";

    if (rows.length === 0) {
      const empty = document.createElement("div");
      empty.className = "breakdown-empty";
      empty.textContent = "まだ記録がありません。タスクを開始してみましょう。";
      breakdownEl.appendChild(empty);
      return;
    }

    const total = rows.reduce((s, r) => s + r.elapsed, 0);

    rows.forEach((r) => {
      const row = document.createElement("div");
      row.className = "breakdown-row" + (r.running ? " running" : "");

      const label = document.createElement("span");
      label.className = "b-label";
      label.textContent = r.label;

      const track = document.createElement("div");
      track.className = "bar-track";
      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.width = `${Math.max(2, (r.elapsed / total) * 100)}%`;
      track.appendChild(fill);

      const pct = document.createElement("span");
      pct.className = "b-pct";
      pct.textContent = `${Math.round((r.elapsed / total) * 100)}%`;

      const time = document.createElement("span");
      time.className = "b-time";
      time.textContent = formatTime(r.elapsed);

      row.append(label, track, pct, time);
      breakdownEl.appendChild(row);
    });
  }

  // --- history page ---

  function renderHistory() {
    historyEl.innerHTML = "";

    if (history.length === 0) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.textContent = "過去の記録はまだありません。日付が変わると自動的に記録されます。";
      historyEl.appendChild(empty);
      return;
    }

    history.forEach((rec) => {
      const row = document.createElement("div");
      row.className = "history-row";

      const top = document.createElement("div");
      top.className = "h-top";
      const date = document.createElement("span");
      date.className = "h-date";
      date.textContent = formatDateLabel(rec.date);
      const total = document.createElement("span");
      total.className = "h-total";
      total.textContent = formatTime(rec.totalMs);
      top.append(date, total);

      const stack = document.createElement("div");
      stack.className = "history-stack";
      rec.items.forEach((it, i) => {
        const seg = document.createElement("span");
        seg.style.width = `${(it.elapsedMs / rec.totalMs) * 100}%`;
        seg.style.opacity = String(Math.max(0.32, 1 - i * 0.16));
        seg.title = `${it.label} ${formatTime(it.elapsedMs)}`;
        stack.appendChild(seg);
      });

      const legend = document.createElement("div");
      legend.className = "history-legend";
      legend.textContent = rec.items
        .slice(0, 4)
        .map((it) => `${it.label} ${formatTime(it.elapsedMs)}`)
        .join(" ・ ");

      row.append(top, stack, legend);
      historyEl.appendChild(row);
    });
  }

  // --- calendar page (weekly, vertical) ---

  const CAL_HOUR_H = 40; // px per hour row; keep in sync with --hour-h in style.css
  // days shown at once — 1 on デイリー, 7 on ウィークリー. Swapped by
  // enterCalendarPage() alongside the calendarWeekGrid-etc. pointers above,
  // so renderCalendar()/shiftCalendarWeek() always operate on whichever
  // page is currently active without needing to know which one that is.
  let CAL_DAYS = 1;
  const CAL_PALETTE = ["#b8672a", "#3e8c4e", "#5b7596", "#a3651f", "#7a6ba8", "#3f7a75", "#ab3d3d", "#62744c"];
  const CAL_UNSCHEDULED_ROW_H = 34; // px per row in today's "unscheduled but today" list
  const CAL_UNSCHEDULED_GAP = 4;
  // 学校の時限表示: 8-9時を0限、9-13時を1-4限、13-14時は昼休みで表示なし、
  // 14-20時を5-10限として、各時間枠の中央にマークする。
  const PERIOD_LABELS = [
    { hour: 8, symbol: "0" },
    { hour: 9, symbol: "1" },
    { hour: 10, symbol: "2" },
    { hour: 11, symbol: "3" },
    { hour: 12, symbol: "4" },
    { hour: 14, symbol: "5" },
    { hour: 15, symbol: "6" },
    { hour: 16, symbol: "7" },
    { hour: 17, symbol: "8" },
    { hour: 18, symbol: "9" },
    { hour: 19, symbol: "10" },
  ];

  // Grid block positions are pixel-based (not %) because the grid's total
  // height isn't always exactly 24h anymore — it grows to fit today's
  // unscheduled-item list below the 24:00 line, and % would rescale the
  // whole 0-24h timeline to match that taller box instead of staying put.
  function minToPx(min) {
    return (min / 60) * CAL_HOUR_H;
  }
  function pxToMin(px) {
    return (px / CAL_HOUR_H) * 60;
  }

  // any date string within the currently-displayed window — this always
  // tracks whichever of デイリー/ウィークリー is currently active (see
  // enterCalendarPage()); each page's own position is remembered
  // separately in dailyWeekAnchor/weeklyWeekAnchor while the other is active.
  let weekAnchor = state.day;
  let dailyWeekAnchor = state.day;
  let weeklyWeekAnchor = state.day;
  let monthAnchor = state.day; // any date string within the displayed month (マンスリーカレンダー)
  let selectedDayDetail = null; // date string whose textual summary is shown below the grid
  let selectedPlanId = null; // plan currently tapped; shows a resize handle on its block
  let calendarAutoScrollPending = true;
  // live-updating pieces, refreshed every second without a full rebuild
  let calendarLiveBlocks = []; // { el, startMs, dayStart }
  let calendarNowLineEl = null;

  function closeRunningSegments(now = Date.now()) {
    allTrackedEntries().forEach(({ item, fallback }) => {
      if (item.running && item.startedAt) {
        state.segments.push({ label: labelOf(item, fallback), startMs: item.startedAt, endMs: now });
      }
    });
  }

  function colorForLabel(label) {
    let hash = 0;
    for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
    return CAL_PALETTE[hash % CAL_PALETTE.length];
  }

  function formatHM(ms) {
    const d = new Date(ms);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  function formatMinHM(min) {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${pad2(h)}:${pad2(m)}`;
  }

  function plansForDate(dateStr) {
    return plans[dateStr] || [];
  }

  function addPlan(dateStr, plan) {
    if (!plans[dateStr]) plans[dateStr] = [];
    plans[dateStr].push(plan);
    savePlans();
  }

  function removePlan(dateStr, id) {
    if (!plans[dateStr]) return;
    plans[dateStr] = plans[dateStr].filter((p) => p.id !== id);
    if (!plans[dateStr].length) delete plans[dateStr];
    savePlans();
  }

  // --- keeping a date's timer list and that date's plans in sync ---

  // Orders a date's items by their linked plan's start time; items with no
  // plan (or whose plan vanished) sort after all planned ones, keeping
  // their existing relative order (Array#sort is stable).
  function sortItemsByPlan(dateStr) {
    const dayPlans = plansForDate(dateStr);
    const startOf = (planId) => {
      const p = planId && dayPlans.find((pl) => pl.id === planId);
      return p ? p.startMin : Infinity;
    };
    itemsArrayForDate(dateStr).sort((a, b) => {
      const sa = startOf(a.planId);
      const sb = startOf(b.planId);
      return sa === sb ? 0 : sa - sb;
    });
  }

  // After a manual drag reorders the timer list, re-times the moved item's
  // plan so it actually sits in the gap between its new neighbors' plans,
  // instead of leaving the list order and the calendar time out of sync.
  function resnapPlanForReorderedItem(dateStr, items, index) {
    const item = items[index];
    if (!item.planId) return;
    const dayPlans = plansForDate(dateStr);
    const plan = dayPlans.find((p) => p.id === item.planId);
    if (!plan) return;
    const duration = plan.endMin - plan.startMin;

    const prevItem = items[index - 1];
    const nextItem = items[index + 1];
    const prevPlan = prevItem && prevItem.planId ? dayPlans.find((p) => p.id === prevItem.planId) : null;
    const nextPlan = nextItem && nextItem.planId ? dayPlans.find((p) => p.id === nextItem.planId) : null;
    if (!prevPlan && !nextPlan) return;

    let newStart = prevPlan ? prevPlan.endMin : Math.max(0, nextPlan.startMin - duration);
    let newEnd = newStart + duration;
    if (nextPlan && newEnd > nextPlan.startMin) {
      newEnd = Math.max(nextPlan.startMin, newStart + 15);
    }
    if (newEnd > 1440) {
      newEnd = 1440;
      newStart = Math.max(0, newEnd - duration);
    }

    plan.startMin = newStart;
    plan.endMin = newEnd;
    savePlans();
  }

  function formatShort(ms) {
    if (ms <= 0) return "";
    const totalMinutes = Math.round(ms / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0 && m > 0) return `${h}h${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }

  function parseDateStr(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function shiftCalendarWeek(delta) {
    const start = parseDateStr(weekAnchor);
    start.setDate(start.getDate() + delta * CAL_DAYS);
    weekAnchor = `${start.getFullYear()}-${pad2(start.getMonth() + 1)}-${pad2(start.getDate())}`;
    calendarAutoScrollPending = true;
    renderCalendar();
  }

  function closedSegmentsForDate(dateStr) {
    if (dateStr === state.day) return state.segments;
    const rec = history.find((h) => h.date === dateStr);
    return rec && Array.isArray(rec.segments) ? rec.segments : [];
  }

  function goToDate(dateStr) {
    viewingDate = dateStr;
    dayPicker.value = viewingDate;
    applyModeUI();
    buildRows();
    render();
  }

  function onCalendarHeaderClick(dateStr) {
    if (dateStr >= state.day) {
      goToDate(dateStr);
      goToPage(TASK_PAGE);
      return;
    }
    selectedDayDetail = selectedDayDetail === dateStr ? null : dateStr;
    selectedPlanId = null;
    renderCalendar();
  }

  function onCalendarBlockClick(seg, e) {
    e.stopPropagation();
    if (selectedPlanId) {
      selectedPlanId = null;
      renderCalendar();
    }
    const endMs = seg.live ? Date.now() : seg.endMs;
    calendarDetail.hidden = false;
    calendarDetail.innerHTML = "";
    const line = document.createElement("div");
    line.className = "cal-block-detail";
    line.textContent = `${seg.label}: ${formatHM(seg.startMs)}〜${formatHM(endMs)} (${formatShort(endMs - seg.startMs) || "1分未満"})`;
    calendarDetail.appendChild(line);
  }

  function vibrate(ms) {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch (err) {
        // vibration not permitted/supported here; ignore
      }
    }
  }

  function onPlanBlockClick(e, dateStr, plan) {
    if (e) {
      e.stopPropagation();
      vibrate(10);
    }
    selectedPlanId = plan.id;
    renderCalendar();
    calendarDetail.hidden = false;
    calendarDetail.innerHTML = "";
    const line = document.createElement("div");
    line.className = "cal-block-detail";
    line.textContent = `${plan.label}: ${formatMinHM(plan.startMin)}〜${formatMinHM(plan.endMin)} (予定)`;

    const actions = document.createElement("div");
    actions.className = "cal-plan-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-modal-ok cal-plan-edit";
    editBtn.textContent = "編集";
    editBtn.addEventListener("click", async () => {
      const name = await openNameModal(plan.label);
      if (name === null) return;
      plan.label = name.trim() || plan.label;
      savePlans();
      const items = itemsArrayForDate(dateStr);
      const item = items.find((it) => it.planId === plan.id);
      if (item) {
        item.label = plan.label;
        persistItemsForDate(dateStr);
        refreshTimerIfShowing(dateStr);
      }
      onPlanBlockClick(null, dateStr, plan);
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn-modal-cancel cal-plan-delete";
    delBtn.textContent = "削除";
    delBtn.addEventListener("click", () => {
      removePlan(dateStr, plan.id);
      selectedPlanId = null;
      const items = itemsArrayForDate(dateStr);
      const idx = items.findIndex((it) => it.planId === plan.id);
      if (idx >= 0) {
        if (items[idx].elapsedMs > 0 || items[idx].running) {
          // real recorded time exists: keep the item, just unlink it
          items[idx].planId = null;
        } else {
          items.splice(idx, 1);
        }
        persistItemsForDate(dateStr);
        refreshTimerIfShowing(dateStr);
      }
      calendarDetail.hidden = true;
      calendarDetail.innerHTML = "";
      renderCalendar();
    });

    actions.append(editBtn, delBtn);
    calendarDetail.append(line, actions);
  }

  // --- plan creation (long-press on empty grid space) ---

  const PLAN_DEFAULT_MIN = 30;
  const PLAN_MIN_DURATION = 15; // minimum length a hand-drawn plan can shrink to
  const PLAN_LONGPRESS_MS = 500;
  const PLAN_MOVE_TOLERANCE = 8;

  // shared with the swipe-navigation block further down: how much a drag
  // must favor the horizontal axis before it's read as a swipe rather than a
  // vertical scroll, and how far (in px) it must travel to actually fire.
  const SWIPE_NAV_AXIS_RATIO = 1.5;
  const SWIPE_NAV_MIN_DX = 60;

  // .calendar-day-col uses touch-action: none (see style.css) so this handler
  // gets full control of the gesture instead of the browser racing it against
  // native scroll — on touch, letting the browser's own pan-detection compete
  // tends to cancel the long-press on the tiniest finger tremor. Because native
  // scrolling is disabled there, a drag that turns out not to be a long-press
  // is scrolled manually (calendarWeekBody.scrollTop) to keep the same feel.
  let activeDayPress = null; // { cleanup } for the in-progress gesture, if any

  function clearLongPress() {
    if (activeDayPress) {
      activeDayPress.cleanup();
      activeDayPress = null;
    }
  }

  function onDayColPointerDown(e, dayCol, dateStr) {
    if (e.target !== dayCol) return; // an existing block handles its own gesture
    if (e.button !== undefined && e.button !== 0) return;
    clearLongPress();

    const startX = e.clientX;
    const startY = e.clientY;
    const startScrollTop = calendarWeekBody.scrollTop;
    let scrolling = false;
    // decided once, on the first movement past PLAN_MOVE_TOLERANCE: 'v' keeps
    // the pre-existing manual vertical-scroll behavior, 'h' means the finger
    // is clearly swiping sideways instead — see SWIPE_NAV_AXIS_RATIO below,
    // biased toward 'v' so ordinary scrolling is never misread as a swipe.
    let gestureAxis = null;
    let lastDx = 0;
    let timer = null;

    function cleanup() {
      if (timer) clearTimeout(timer);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    }
    function onMove(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!scrolling && Math.hypot(dx, dy) > PLAN_MOVE_TOLERANCE) {
        scrolling = true;
        gestureAxis = Math.abs(dx) > Math.abs(dy) * SWIPE_NAV_AXIS_RATIO ? "h" : "v";
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      }
      if (gestureAxis === "v") calendarWeekBody.scrollTop = startScrollTop - dy;
      else if (gestureAxis === "h") lastDx = dx;
    }
    function onUp() {
      cleanup();
      activeDayPress = null;
      if (gestureAxis === "h" && Math.abs(lastDx) > SWIPE_NAV_MIN_DX) {
        selectedPlanId = null;
        shiftCalendarWeek(lastDx < 0 ? 1 : -1);
        return;
      }
      if (selectedPlanId) {
        selectedPlanId = null;
        renderCalendar();
      }
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    activeDayPress = { cleanup };

    timer = setTimeout(() => {
      timer = null;
      cleanup();
      activeDayPress = null;
      startPlanRangeDraw(dayCol, dateStr, startY);
    }, PLAN_LONGPRESS_MS);
  }

  // --- Googleカレンダー式: 長押しで始点を固定し、指を離すまでドラッグで
  // 任意の時間帯(長さ)を決めてから、最後に名前の入力に進む ---

  let planDrawCtx = null;

  function startPlanRangeDraw(dayCol, dateStr, startClientY) {
    vibrate(20);
    const rect = dayCol.getBoundingClientRect();
    const rawMin = pxToMin(startClientY - rect.top);
    let anchorMin = Math.round(rawMin / 15) * 15;
    anchorMin = Math.max(0, Math.min(1440 - PLAN_DEFAULT_MIN, anchorMin));
    // starts at the usual default length so a long-press with no follow-up
    // drag still creates a normal-sized plan; dragging overrides this as
    // soon as the pointer moves.
    const initialEnd = Math.min(1440, anchorMin + PLAN_DEFAULT_MIN);

    planDrawCtx = {
      dayCol,
      dateStr,
      anchorMin,
      startClientY,
      startMin: anchorMin,
      endMin: initialEnd,
      lastVibrateStart: anchorMin,
      lastVibrateEnd: initialEnd,
    };
    showDragPreview(dayCol, `${formatMinHM(anchorMin)}〜${formatMinHM(initialEnd)}`, anchorMin, initialEnd - anchorMin);

    document.addEventListener("pointermove", onPlanRangeDrawMove);
    document.addEventListener("pointerup", onPlanRangeDrawEnd);
    document.addEventListener("pointercancel", onPlanRangeDrawEnd);
  }

  function onPlanRangeDrawMove(e) {
    if (!planDrawCtx) return;
    e.preventDefault();
    const ctx = planDrawCtx;
    // ignore sub-pixel jitter right after the long-press fires so the
    // default 30-min block doesn't shrink to the 15-min floor on a
    // stationary finger — only a real, deliberate drag should override it
    if (Math.abs(e.clientY - ctx.startClientY) < PLAN_MOVE_TOLERANCE) return;
    const rect = ctx.dayCol.getBoundingClientRect();
    const rawMin = pxToMin(e.clientY - rect.top);
    let pointerMin = Math.round(rawMin / 15) * 15;
    pointerMin = Math.max(0, Math.min(1440, pointerMin));

    // the drag can extend either later (below the anchor) or earlier (above
    // it) — whichever side the pointer is on becomes the moving edge, while
    // the long-press point itself never moves, like a click-drag selection
    let startMin = Math.min(ctx.anchorMin, pointerMin);
    let endMin = Math.max(ctx.anchorMin, pointerMin);
    if (endMin - startMin < PLAN_MIN_DURATION) {
      if (pointerMin >= ctx.anchorMin) endMin = startMin + PLAN_MIN_DURATION;
      else startMin = endMin - PLAN_MIN_DURATION;
    }
    startMin = Math.max(0, startMin);
    endMin = Math.min(1440, endMin);

    ctx.startMin = startMin;
    ctx.endMin = endMin;

    if (startMin !== ctx.lastVibrateStart || endMin !== ctx.lastVibrateEnd) {
      vibrate(8);
      ctx.lastVibrateStart = startMin;
      ctx.lastVibrateEnd = endMin;
    }
    showDragPreview(ctx.dayCol, `${formatMinHM(startMin)}〜${formatMinHM(endMin)}`, startMin, endMin - startMin);
  }

  function onPlanRangeDrawEnd() {
    if (!planDrawCtx) return;
    const { dateStr, startMin, endMin } = planDrawCtx;
    document.removeEventListener("pointermove", onPlanRangeDrawMove);
    document.removeEventListener("pointerup", onPlanRangeDrawEnd);
    document.removeEventListener("pointercancel", onPlanRangeDrawEnd);
    clearDragPreview();
    planDrawCtx = null;
    vibrate(20);
    finalizePlanRangeDraw(dateStr, startMin, endMin);
  }

  async function finalizePlanRangeDraw(dateStr, startMin, endMin) {
    const name = await openNameModal("");
    if (name === null) return;
    const label = name.trim() || "予定";
    const id = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    addPlan(dateStr, { id, label, startMin, endMin });

    const item = freshItem(label);
    item.planId = id;
    ensureItemsArrayForDate(dateStr).push(item);
    sortItemsByPlan(dateStr);
    persistItemsForDate(dateStr);
    refreshTimerIfShowing(dateStr);

    renderCalendar();
  }

  // --- plan drag-to-move ---

  let planDragCtx = null;

  function startPlanDrag(e, block, dateStr, plan) {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    planDragCtx = {
      block,
      dateStr,
      plan,
      duration: plan.endMin - plan.startMin,
      startClientX: e.clientX,
      startClientY: e.clientY,
      moved: false,
      hoverDate: dateStr,
      previewStartMin: plan.startMin,
      lastVibrateMin: plan.startMin,
    };
    document.addEventListener("pointermove", onPlanDragMove);
    document.addEventListener("pointerup", onPlanDragEnd);
    document.addEventListener("pointercancel", onPlanDragEnd);
    e.preventDefault();
  }

  function onPlanDragMove(e) {
    if (!planDragCtx) return;
    e.preventDefault();
    const dx = e.clientX - planDragCtx.startClientX;
    const dy = e.clientY - planDragCtx.startClientY;
    if (!planDragCtx.moved) {
      if (Math.hypot(dx, dy) < PLAN_MOVE_TOLERANCE) return;
      planDragCtx.moved = true;
      planDragCtx.block.classList.add("dragging");
      vibrate(15);
    }

    // dragging a plan into the いつか tray sends it back to the backlog instead of moving it
    const boxRect = calendarUnplannedBox.getBoundingClientRect();
    const overBox =
      e.clientX >= boxRect.left &&
      e.clientX <= boxRect.right &&
      e.clientY >= boxRect.top &&
      e.clientY <= boxRect.bottom;
    calendarUnplannedBox.classList.toggle("drop-target", overBox);
    planDragCtx.overUnplannedBox = overBox;
    if (overBox) {
      planDragCtx.overDayUnscheduled = false;
      return;
    }

    const cols = Array.from(calendarWeekGrid.children);
    let targetCol = null;
    for (const col of cols) {
      const rect = col.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX < rect.right) {
        targetCol = col;
        break;
      }
    }
    if (!targetCol) {
      cols.forEach((c) => c.classList.remove("drop-target"));
      planDragCtx.overDayUnscheduled = false;
      return;
    }

    const rect = targetCol.getBoundingClientRect();
    const relY = e.clientY - rect.top;

    // dropping below the plan's own day's 24-hour line sends it back to that
    // day's own "time undetermined" list instead of moving it to a new time
    const overDayUnscheduled = targetCol.dataset.date === planDragCtx.dateStr && relY > 24 * CAL_HOUR_H;
    cols.forEach((c) => c.classList.toggle("drop-target", overDayUnscheduled && c === targetCol));
    planDragCtx.overDayUnscheduled = overDayUnscheduled;
    if (overDayUnscheduled) return;

    const rawMin = pxToMin(relY);
    let startMin = Math.round(rawMin / 15) * 15;
    startMin = Math.max(0, Math.min(1440 - planDragCtx.duration, startMin));

    planDragCtx.hoverDate = targetCol.dataset.date;
    planDragCtx.previewStartMin = startMin;
    if (startMin !== planDragCtx.lastVibrateMin) {
      vibrate(8);
      planDragCtx.lastVibrateMin = startMin;
    }

    if (planDragCtx.block.parentElement !== targetCol) targetCol.appendChild(planDragCtx.block);
    planDragCtx.block.style.top = `${minToPx(startMin)}px`;
    planDragCtx.block.style.height = `${minToPx(planDragCtx.duration)}px`;
    planDragCtx.block.style.left = "1px";
    planDragCtx.block.style.width = "calc(100% - 2px)";
  }

  function onPlanDragEnd(e) {
    if (!planDragCtx) return;
    const { block, dateStr, plan, duration, moved, hoverDate, previewStartMin, overUnplannedBox, overDayUnscheduled } = planDragCtx;
    document.removeEventListener("pointermove", onPlanDragMove);
    document.removeEventListener("pointerup", onPlanDragEnd);
    document.removeEventListener("pointercancel", onPlanDragEnd);
    block.classList.remove("dragging");
    calendarUnplannedBox.classList.remove("drop-target");
    Array.from(calendarWeekGrid.children).forEach((c) => c.classList.remove("drop-target"));
    planDragCtx = null;

    if (!moved) {
      onPlanBlockClick(e, dateStr, plan);
      return;
    }

    if (overDayUnscheduled) {
      // send it back to this same day's own "time undetermined" list — the
      // item stays right where it is, just loses its scheduled time
      vibrate(20);
      removePlan(dateStr, plan.id);
      const items = itemsArrayForDate(dateStr);
      const idx = items.findIndex((it) => it.planId === plan.id);
      if (idx >= 0) {
        items[idx].planId = null;
        sortItemsByPlan(dateStr);
        persistItemsForDate(dateStr);
        refreshTimerIfShowing(dateStr);
      }
      renderCalendar();
      return;
    }

    if (overUnplannedBox) {
      removePlan(dateStr, plan.id);
      const items = itemsArrayForDate(dateStr);
      const idx = items.findIndex((it) => it.planId === plan.id);
      if (idx >= 0) {
        if (items[idx].elapsedMs > 0 || items[idx].running) {
          // real recorded time exists: keep the item, just unlink it from the removed plan
          items[idx].planId = null;
          sortItemsByPlan(dateStr);
        } else {
          // nothing was ever tracked: drop the item and send it back to the いつか backlog
          items.splice(idx, 1);
          someday.push({ id: `someday_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, label: plan.label });
          saveSomeday();
        }
        persistItemsForDate(dateStr);
        refreshTimerIfShowing(dateStr);
      } else {
        // a plan with no linked item goes straight to いつか
        someday.push({ id: `someday_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, label: plan.label });
        saveSomeday();
      }
      vibrate(20);
      renderCalendar();
      return;
    }

    if (!hoverDate || hoverDate < state.day) {
      renderCalendar();
      return;
    }

    vibrate(20);
    removePlan(dateStr, plan.id);
    const movedPlan = { ...plan, startMin: previewStartMin, endMin: previewStartMin + duration };
    addPlan(hoverDate, movedPlan);

    if (dateStr === hoverDate) {
      // same-date move: the linked item's time slot changed, keep the list ordered to match
      if (itemsArrayForDate(dateStr).some((it) => it.planId === movedPlan.id)) {
        sortItemsByPlan(dateStr);
        persistItemsForDate(dateStr);
        refreshTimerIfShowing(dateStr);
      }
    } else {
      // moved to a different date: migrate the linked item across the two date lists
      const sourceItems = itemsArrayForDate(dateStr);
      const idx = sourceItems.findIndex((it) => it.planId === movedPlan.id);
      const item = idx >= 0 ? sourceItems[idx] : freshItem(movedPlan.label);
      if (idx >= 0 && (item.elapsedMs > 0 || item.running)) {
        // real recorded time exists: keep it on its original date, just unlink it
        item.planId = null;
      } else {
        if (idx >= 0) sourceItems.splice(idx, 1);
        item.planId = movedPlan.id;
        ensureItemsArrayForDate(hoverDate).push(item);
        sortItemsByPlan(hoverDate);
        persistItemsForDate(hoverDate);
        refreshTimerIfShowing(hoverDate);
      }
      persistItemsForDate(dateStr);
      refreshTimerIfShowing(dateStr);
    }

    renderCalendar();
  }

  // --- plan resize (drag the handle on a selected block's bottom edge) ---

  let planResizeCtx = null;

  function startPlanResize(e, block, handle, dayCol, dateStr, plan) {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    planResizeCtx = {
      block,
      handle,
      dayCol,
      dateStr,
      plan,
      startClientY: e.clientY,
      previewEndMin: plan.endMin,
      lastVibrateMin: plan.endMin,
    };
    document.addEventListener("pointermove", onPlanResizeMove);
    document.addEventListener("pointerup", onPlanResizeEnd);
    document.addEventListener("pointercancel", onPlanResizeEnd);
  }

  function onPlanResizeMove(e) {
    if (!planResizeCtx) return;
    e.preventDefault();
    const { plan, startClientY } = planResizeCtx;
    const deltaMin = pxToMin(e.clientY - startClientY);
    let endMin = Math.round((plan.endMin + deltaMin) / 15) * 15;
    endMin = Math.max(plan.startMin + 15, Math.min(1440, endMin));
    planResizeCtx.previewEndMin = endMin;
    if (endMin !== planResizeCtx.lastVibrateMin) {
      vibrate(8);
      planResizeCtx.lastVibrateMin = endMin;
    }
    planResizeCtx.block.style.height = `${minToPx(endMin - plan.startMin)}px`;
    planResizeCtx.handle.style.top = `${minToPx(endMin)}px`;
  }

  function onPlanResizeEnd() {
    if (!planResizeCtx) return;
    const { dateStr, plan, previewEndMin } = planResizeCtx;
    document.removeEventListener("pointermove", onPlanResizeMove);
    document.removeEventListener("pointerup", onPlanResizeEnd);
    document.removeEventListener("pointercancel", onPlanResizeEnd);
    planResizeCtx = null;

    if (previewEndMin !== plan.endMin) {
      vibrate(20);
      plan.endMin = previewEndMin;
      savePlans();
    }
    onPlanBlockClick(null, dateStr, plan);
  }

  // --- a "ghost" preview block shown while dragging a いつか chip or a
  // day's own unscheduled row over the grid, so the task's name visibly
  // tracks the time slot it would land on instead of the drag being
  // invisible until drop (mirrors the real .cal-plan-block styling) ---

  let dragPreviewEl = null;

  function showDragPreview(dayCol, label, startMin, duration) {
    if (!dragPreviewEl) {
      dragPreviewEl = document.createElement("div");
      dragPreviewEl.className = "cal-plan-block cal-plan-preview";
      dragPreviewEl.style.pointerEvents = "none";
    }
    if (dragPreviewEl.parentElement !== dayCol) dayCol.appendChild(dragPreviewEl);
    const color = colorForLabel(label);
    dragPreviewEl.style.top = `${minToPx(startMin)}px`;
    dragPreviewEl.style.height = `${minToPx(Math.max(1, duration))}px`;
    dragPreviewEl.style.left = "1px";
    dragPreviewEl.style.width = "calc(100% - 2px)";
    dragPreviewEl.style.borderColor = color;
    dragPreviewEl.style.color = color;
    dragPreviewEl.textContent = label;
  }

  function clearDragPreview() {
    if (dragPreviewEl && dragPreviewEl.parentElement) dragPreviewEl.parentElement.removeChild(dragPreviewEl);
  }

  // --- a small floating chip that tracks the pointer 1:1 for the whole
  // drag, so the item visibly "sticks" to the finger/cursor even before
  // (or without ever) landing on a valid drop target — showDragPreview
  // above only appears once hovering a specific droppable time slot. ---

  let dragGhostEl = null;

  function showDragGhost(clientX, clientY, label) {
    if (!dragGhostEl) {
      dragGhostEl = document.createElement("div");
      dragGhostEl.className = "drag-ghost";
      dragGhostEl.style.pointerEvents = "none";
      document.body.appendChild(dragGhostEl);
    }
    dragGhostEl.textContent = label;
    dragGhostEl.style.left = `${clientX}px`;
    dragGhostEl.style.top = `${clientY}px`;
  }

  function clearDragGhost() {
    if (dragGhostEl && dragGhostEl.parentElement) dragGhostEl.parentElement.removeChild(dragGhostEl);
    dragGhostEl = null;
  }

  // --- a day's own "unscheduled but on that day" list, drawn below the
  // 24:00 line (items already in that date's item list with no plan —
  // dragging one up onto its own column schedules it; only that same day
  // is a valid drop target since these items only exist on that date.)

  let dayUnschedDragCtx = null;

  function startDayUnscheduledDrag(e, row, item, dateStr) {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    dayUnschedDragCtx = { row, item, dateStr, moved: false, startClientX: e.clientX, startClientY: e.clientY, targetCol: null, clientY: e.clientY };
    document.addEventListener("pointermove", onDayUnscheduledDragMove);
    document.addEventListener("pointerup", onDayUnscheduledDragEnd);
    document.addEventListener("pointercancel", onDayUnscheduledDragEnd);
  }

  function onDayUnscheduledDragMove(e) {
    if (!dayUnschedDragCtx) return;
    e.preventDefault();
    const dx = e.clientX - dayUnschedDragCtx.startClientX;
    const dy = e.clientY - dayUnschedDragCtx.startClientY;
    if (!dayUnschedDragCtx.moved) {
      if (Math.hypot(dx, dy) < PLAN_MOVE_TOLERANCE) return;
      dayUnschedDragCtx.moved = true;
      dayUnschedDragCtx.row.classList.add("dragging");
      vibrate(15);
    }
    showDragGhost(e.clientX, e.clientY, labelOf(dayUnschedDragCtx.item, "予定"));

    // dragging this row into the いつか tray sends it back to the backlog
    // instead of scheduling it
    const boxRect = calendarUnplannedBox.getBoundingClientRect();
    const overBox =
      e.clientX >= boxRect.left &&
      e.clientX <= boxRect.right &&
      e.clientY >= boxRect.top &&
      e.clientY <= boxRect.bottom;
    calendarUnplannedBox.classList.toggle("drop-target", overBox);
    dayUnschedDragCtx.overUnplannedBox = overBox;
    if (overBox) {
      Array.from(calendarWeekGrid.children).forEach((c) => c.classList.remove("drop-target"));
      dayUnschedDragCtx.targetCol = null;
      clearDragPreview();
      return;
    }

    const cols = Array.from(calendarWeekGrid.children);
    let targetCol = null;
    for (const col of cols) {
      const rect = col.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.top + 24 * CAL_HOUR_H &&
        col.dataset.date === dayUnschedDragCtx.dateStr
      ) {
        targetCol = col;
        break;
      }
    }
    cols.forEach((c) => c.classList.toggle("drop-target", c === targetCol));
    dayUnschedDragCtx.targetCol = targetCol;
    dayUnschedDragCtx.clientY = e.clientY;

    if (targetCol) {
      const colRect = targetCol.getBoundingClientRect();
      const relY = e.clientY - colRect.top;
      const rawMin = pxToMin(relY);
      let startMin = Math.round(rawMin / 15) * 15;
      startMin = Math.max(0, Math.min(1440 - PLAN_DEFAULT_MIN, startMin));
      showDragPreview(targetCol, labelOf(dayUnschedDragCtx.item, "予定"), startMin, PLAN_DEFAULT_MIN);
    } else {
      clearDragPreview();
    }
  }

  function onDayUnscheduledDragEnd() {
    if (!dayUnschedDragCtx) return;
    const { row, item, dateStr, moved, targetCol, clientY, overUnplannedBox } = dayUnschedDragCtx;
    document.removeEventListener("pointermove", onDayUnscheduledDragMove);
    document.removeEventListener("pointerup", onDayUnscheduledDragEnd);
    document.removeEventListener("pointercancel", onDayUnscheduledDragEnd);
    row.classList.remove("dragging");
    Array.from(calendarWeekGrid.children).forEach((c) => c.classList.remove("drop-target"));
    calendarUnplannedBox.classList.remove("drop-target");
    clearDragPreview();
    clearDragGhost();
    dayUnschedDragCtx = null;

    if (!moved) {
      // a plain tap (no drag): 時間未定のタスク gets the same 変更修正/削除
      // choice as a regular ログ行, instead of doing nothing as before
      promptRegularTaskEdit(dateStr, item);
      return;
    }

    if (overUnplannedBox) {
      if (item.elapsedMs > 0 || item.running) {
        // real recorded time exists: refuse the move so it isn't lost, いつか
        // entries carry no time fields to hold it
        vibrate([10, 30, 10]);
        return;
      }
      const items = itemsArrayForDate(dateStr);
      const idx = items.indexOf(item);
      if (idx >= 0) items.splice(idx, 1);
      someday.push({ id: `someday_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, label: labelOf(item, "予定") });
      saveSomeday();
      persistItemsForDate(dateStr);
      refreshTimerIfShowing(dateStr);
      vibrate(20);
      renderCalendar();
      return;
    }

    if (!targetCol) return;

    const rect = targetCol.getBoundingClientRect();
    const relY = clientY - rect.top;
    const rawMin = pxToMin(relY);
    let startMin = Math.round(rawMin / 15) * 15;
    startMin = Math.max(0, Math.min(1440 - PLAN_DEFAULT_MIN, startMin));
    const endMin = startMin + PLAN_DEFAULT_MIN;
    const id = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    addPlan(dateStr, { id, label: labelOf(item, "予定"), startMin, endMin });
    item.planId = id;
    vibrate(20);
    sortItemsByPlan(dateStr);
    persistItemsForDate(dateStr);
    refreshTimerIfShowing(dateStr);
    renderCalendar();
  }

  // --- いつか tray: tasks with no day or time yet, draggable onto any visible
  // day's grid to schedule them (or add new ones directly here). A chip's
  // gesture is one of three things, disambiguated in onSomedayChipDragMove:
  //   - a quick mostly-horizontal swipe: scroll the tray (native, we bail)
  //   - a quick mostly-vertical drag up: schedule it onto the grid
  //   - a still, held press (CHIP_REORDER_LONGPRESS_MS) then a drag:
  //     reorder the chip within the tray
  // ---

  const CHIP_REORDER_LONGPRESS_MS = 400;

  // いつか tasks can carry subtasks of their own: a task with parentId
  // set is a child, living in the SAME someday array as top-level tasks;
  // a top-level task with at least one child renders filled-in as a
  // "parent" and, once tapped, shows its children in a second tray
  // ("子タスク") instead of opening the rename/add-subtask choice.
  const SOMEDAY_MAX_DEPTH = 3; // deepest tappable level (0=いつか .. 3=ひ孫タスク)
  const SOMEDAY_CHILD_LABELS = ["子タスク名を入力", "孫タスク名を入力", "ひ孫タスク名を入力"];
  // activeSomedayIds[i] = the task (at depth i) whose children populate the
  // depth-(i+1) tray; e.g. activeSomedayIds[0] drives 子タスク's contents.
  let activeSomedayIds = [null, null, null];

  // Every tray level, across all four pages it's duplicated onto — used to
  // drive rendering/visibility generically instead of hand-listing every
  // list/box combination at each call site. Index 0 is いつか itself
  // (always visible, no box to show/hide).
  const somedayLevelEls = [
    { lists: [calendarUnplannedList, weeklyUnplannedList, monthlyUnplannedList, taskUnplannedList], boxes: null },
    {
      lists: [calendarSubtaskList, weeklySubtaskList, monthlySubtaskList, taskSubtaskList],
      boxes: [calendarSubtaskBox, weeklySubtaskBox, monthlySubtaskBox, taskSubtaskBox],
    },
    {
      lists: [calendarGrandchildList, weeklyGrandchildList, monthlyGrandchildList, taskGrandchildList],
      boxes: [calendarGrandchildBox, weeklyGrandchildBox, monthlyGrandchildBox, taskGrandchildBox],
    },
    {
      lists: [calendarGreatGrandchildList, weeklyGreatGrandchildList, monthlyGreatGrandchildList, taskGreatGrandchildList],
      boxes: [calendarGreatGrandchildBox, weeklyGreatGrandchildBox, monthlyGreatGrandchildBox, taskGreatGrandchildBox],
    },
  ];

  // A task's nesting depth: 0=top-level, 1=子タスク, 2=孫タスク, 3=ひ孫タスク.
  function somedayTaskDepth(task) {
    let depth = 0;
    let current = task;
    while (current && current.parentId) {
      depth++;
      current = someday.find((t) => t.id === current.parentId);
    }
    return depth;
  }

  function levelIndexForSomedayList(listEl) {
    return somedayLevelEls.findIndex((lvl) => lvl.lists.includes(listEl));
  }

  function topLevelSomeday() {
    return someday.filter((t) => !t.parentId);
  }

  function childrenOf(parentId) {
    return someday.filter((t) => t.parentId === parentId);
  }

  function isParentTask(id) {
    return someday.some((t) => t.parentId === id);
  }

  // Assigns a task its own solid color the first time it becomes a parent
  // (lazily, so tasks that already had children before this feature existed
  // pick one up on first render too), cycling through CAL_PALETTE in the
  // order tasks became parents. Idempotent — a task keeps the same color
  // for as long as it stays a parent, even across reloads.
  function ensureParentColor(task) {
    if (task.colorIdx == null) {
      const maxIdx = someday.reduce((m, t) => (t.colorIdx != null && t.colorIdx > m ? t.colorIdx : m), -1);
      task.colorIdx = maxIdx + 1;
      saveSomeday();
    }
    return CAL_PALETTE[task.colorIdx % CAL_PALETTE.length];
  }

  // Removes a task from someday; if it had subtasks of its own, they're
  // promoted back to top-level instead of being orphaned under a parent
  // that no longer exists (e.g. when the parent itself gets scheduled).
  function removeSomedayTaskPromotingChildren(id) {
    someday.forEach((t) => {
      if (t.parentId === id) t.parentId = null;
    });
    someday = someday.filter((t) => t.id !== id);
  }

  // いつか is shown in two places (デイリー's tray and マンスリー's), and
  // 子タスク likewise in two places — all four render from the same
  // someday array, just filtered to a different subset of it.
  function renderSomedayListInto(listEl, tasks) {
    listEl.innerHTML = "";
    if (!tasks.length) {
      const empty = document.createElement("span");
      empty.className = "calendar-unplanned-empty";
      empty.textContent = "なし";
      listEl.appendChild(empty);
      return;
    }
    tasks.forEach((task) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "cal-unplanned-chip";
      if (isParentTask(task.id)) {
        // a parent: filled solid with its own color, so it visibly reads as
        // a container rather than something you can schedule directly
        chip.classList.add("parent");
        if (activeSomedayIds.includes(task.id)) chip.classList.add("active-parent");
        const solid = ensureParentColor(task);
        chip.style.borderColor = solid;
        chip.style.background = solid;
      } else if (task.parentId) {
        // a leaf whose parent has its own color — outline it in that SAME
        // color (no fill) so the family resemblance still reads at a
        // glance, while the white interior doubles as the "this one can be
        // scheduled" marker leaf tasks already have by default
        const parentTask = someday.find((t) => t.id === task.parentId);
        if (parentTask) {
          chip.style.borderColor = ensureParentColor(parentTask);
        }
      }
      const labelEl = document.createElement("span");
      labelEl.className = "cal-unplanned-chip-label";
      labelEl.textContent = task.label;
      chip.appendChild(labelEl);

      // every non-leaf-eligible depth (いつか/子/孫, not the always-leaf
      // ひ孫) shows how many of the next tier hang off it, even when that's
      // currently zero — so a glance tells you whether there's more to
      // drill into without having to tap and check
      const depth = somedayTaskDepth(task);
      if (depth < SOMEDAY_MAX_DEPTH) {
        const badge = document.createElement("span");
        badge.className = "cal-child-count-badge";
        // rendered via CSS content: attr(), not textContent — so chip.textContent
        // stays just the label, which the rest of the someday code (and tests)
        // rely on for reading/comparing a chip's name
        badge.dataset.count = String(childrenOf(task.id).length);
        chip.appendChild(badge);
      }

      chip.dataset.somedayId = task.id;
      chip.addEventListener("pointerdown", (e) => startSomedayChipDrag(e, chip, task));
      listEl.appendChild(chip);
    });
  }

  function siblingSomedayLists(listEl) {
    const level = levelIndexForSomedayList(listEl);
    if (level < 0) return [];
    return somedayLevelEls[level].lists.filter((l) => l !== listEl);
  }

  function tasksForSomedayList(listEl) {
    const level = levelIndexForSomedayList(listEl);
    if (level <= 0) return topLevelSomeday();
    const parentId = activeSomedayIds[level - 1];
    return parentId ? childrenOf(parentId) : [];
  }

  // Walks the active-parent chain one level at a time, rendering (and
  // validating) each layer in turn; the moment a link turns out stale
  // (its parent was renamed away, scheduled, deleted, ...) that level and
  // everything deeper is cleared and hidden.
  function renderSubtaskTrays() {
    let stale = false;
    for (let level = 0; level < activeSomedayIds.length; level++) {
      const cfg = somedayLevelEls[level + 1];
      if (!stale) {
        const parentId = activeSomedayIds[level];
        const parentTask = parentId && someday.find((t) => t.id === parentId);
        const expectedParentOf = level === 0 ? null : activeSomedayIds[level - 1];
        if (!parentTask || (parentTask.parentId || null) !== expectedParentOf) stale = true;
      }
      if (stale) {
        activeSomedayIds[level] = null;
        cfg.boxes.forEach((b) => (b.hidden = true));
        continue;
      }
      const tasks = childrenOf(activeSomedayIds[level]);
      cfg.boxes.forEach((b) => (b.hidden = false));
      cfg.lists.forEach((listEl) => renderSomedayListInto(listEl, tasks));
    }
  }

  function renderSomedayList() {
    somedayLevelEls[0].lists.forEach((listEl) => renderSomedayListInto(listEl, topLevelSomeday()));
    renderSubtaskTrays();
  }

  // Hides every 子/孫/ひ孫タスク layer, leaving just いつか — used whenever
  // the user taps somewhere else (the grid, a day header, a plan block...)
  // instead of continuing to drill into the いつか hierarchy.
  function collapseSomedaySubtaskLayers() {
    if (activeSomedayIds.every((id) => !id)) return;
    activeSomedayIds = activeSomedayIds.map(() => null);
    renderSomedayList();
  }

  // Activates taskId at the given depth (revealing its children in the next
  // layer down), then keeps drilling deeper on its own: at each level, if
  // one of the newly-shown children is itself a parent, that child becomes
  // the next level's active task too — so a task whose descendants go all
  // the way down to ひ孫タスク reveals every populated layer in one tap,
  // instead of requiring a separate tap at each level. A branch with no
  // further descendants simply stops here, leaving deeper layers closed.
  function activateSomedayChain(depth, taskId) {
    activeSomedayIds[depth] = taskId;
    let node = taskId;
    let slot = depth + 1;
    while (slot < activeSomedayIds.length) {
      const deeper = childrenOf(node).find((k) => isParentTask(k.id));
      if (!deeper) break;
      activeSomedayIds[slot] = deeper.id;
      node = deeper.id;
      slot++;
    }
    for (let l = slot; l < activeSomedayIds.length; l++) activeSomedayIds[l] = null;
  }

  async function addSomedayTask() {
    const name = await openNameModal("");
    if (name === null) return;
    const label = name.trim();
    if (!label) return;
    someday.push({ id: `someday_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, label, parentId: null });
    saveSomeday();
    renderSomedayList();
  }

  // Adds a subtask under whichever task is currently active at this level
  // (level 0 = the タスク追加 button in 子タスク's own tray, and so on).
  async function addSubtaskAtLevel(level) {
    const parentId = activeSomedayIds[level];
    if (!parentId) return;
    const name = await openNameModal("", SOMEDAY_CHILD_LABELS[level]);
    if (name === null) return;
    const label = name.trim();
    if (!label) return;
    someday.push({ id: `someday_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, label, parentId });
    saveSomeday();
    renderSomedayList();
  }

  // --- choice modal: tapping any task (いつか/子/孫/ひ孫タスク, a regular
  // ログ行, or a 時間未定のタスク) opens this to decide between renaming it,
  // deleting it, or (いつか系のみ、まだ最下層でなければ) turning it into a
  // parent by adding its first subtask ---

  const somedayChoiceModal = document.getElementById("somedayChoiceModal");
  const somedayChoiceTitle = document.getElementById("somedayChoiceTitle");
  const somedayChoiceEditBtn = document.getElementById("somedayChoiceEditBtn");
  const somedayChoiceAddChildBtn = document.getElementById("somedayChoiceAddChildBtn");
  const somedayChoiceDeleteBtn = document.getElementById("somedayChoiceDeleteBtn");
  const somedayChoiceCancelBtn = document.getElementById("somedayChoiceCancelBtn");

  function openTaskChoiceModal(task, opts) {
    const showAddChild = !!(opts && opts.showAddChild);
    return new Promise((resolve) => {
      somedayChoiceTitle.textContent = `「${task.label}」を編集`;
      somedayChoiceAddChildBtn.hidden = !showAddChild;
      somedayChoiceModal.hidden = false;

      function cleanup(result) {
        somedayChoiceModal.hidden = true;
        somedayChoiceEditBtn.removeEventListener("click", onEdit);
        somedayChoiceAddChildBtn.removeEventListener("click", onAddChild);
        somedayChoiceDeleteBtn.removeEventListener("click", onDelete);
        somedayChoiceCancelBtn.removeEventListener("click", onCancel);
        somedayChoiceModal.removeEventListener("mousedown", onBackdrop);
        resolve(result);
      }
      function onEdit() {
        cleanup("edit");
      }
      function onAddChild() {
        cleanup("addChild");
      }
      function onDelete() {
        cleanup("delete");
      }
      function onCancel() {
        cleanup(null);
      }
      function onBackdrop(e) {
        if (e.target === somedayChoiceModal) onCancel();
      }

      somedayChoiceEditBtn.addEventListener("click", onEdit);
      somedayChoiceAddChildBtn.addEventListener("click", onAddChild);
      somedayChoiceDeleteBtn.addEventListener("click", onDelete);
      somedayChoiceCancelBtn.addEventListener("click", onCancel);
      somedayChoiceModal.addEventListener("mousedown", onBackdrop);
    });
  }

  function renameSomedayTask(task) {
    openNameModal(task.label).then((name) => {
      if (name === null) return;
      const label = name.trim();
      if (!label) return;
      task.label = label;
      saveSomeday();
      renderSomedayList();
    });
  }

  // Removes a task and every descendant beneath it (子/孫/ひ孫), unlike
  // removeSomedayTaskPromotingChildren which detaches them to survive as
  // new top-level tasks instead.
  function removeSomedayTaskAndDescendants(id) {
    const idsToRemove = new Set([id]);
    let added = true;
    while (added) {
      added = false;
      someday.forEach((t) => {
        if (t.parentId && idsToRemove.has(t.parentId) && !idsToRemove.has(t.id)) {
          idsToRemove.add(t.id);
          added = true;
        }
      });
    }
    someday = someday.filter((t) => !idsToRemove.has(t.id));
  }

  const somedayDeleteChildrenModal = document.getElementById("somedayDeleteChildrenModal");
  const somedayDeleteKeepChildrenBtn = document.getElementById("somedayDeleteKeepChildrenBtn");
  const somedayDeleteAllBtn = document.getElementById("somedayDeleteAllBtn");
  const somedayDeleteChildrenCancelBtn = document.getElementById("somedayDeleteChildrenCancelBtn");

  function openSomedayDeleteChildrenModal() {
    return new Promise((resolve) => {
      somedayDeleteChildrenModal.hidden = false;

      function cleanup(result) {
        somedayDeleteChildrenModal.hidden = true;
        somedayDeleteKeepChildrenBtn.removeEventListener("click", onKeep);
        somedayDeleteAllBtn.removeEventListener("click", onAll);
        somedayDeleteChildrenCancelBtn.removeEventListener("click", onCancel);
        somedayDeleteChildrenModal.removeEventListener("mousedown", onBackdrop);
        resolve(result);
      }
      function onKeep() {
        cleanup("keep");
      }
      function onAll() {
        cleanup("all");
      }
      function onCancel() {
        cleanup(null);
      }
      function onBackdrop(e) {
        if (e.target === somedayDeleteChildrenModal) onCancel();
      }

      somedayDeleteKeepChildrenBtn.addEventListener("click", onKeep);
      somedayDeleteAllBtn.addEventListener("click", onAll);
      somedayDeleteChildrenCancelBtn.addEventListener("click", onCancel);
      somedayDeleteChildrenModal.addEventListener("mousedown", onBackdrop);
    });
  }

  // A leaf task deletes outright. A parent task (has its own subtasks) asks
  // first whether to keep the subtree (detached to top-level) or drop the
  // whole branch.
  function confirmDeleteSomedayTask(task) {
    if (!isParentTask(task.id)) {
      removeSomedayTaskPromotingChildren(task.id);
      saveSomeday();
      renderSomedayList();
      return;
    }
    openSomedayDeleteChildrenModal().then((choice) => {
      if (choice === "keep") {
        removeSomedayTaskPromotingChildren(task.id);
      } else if (choice === "all") {
        removeSomedayTaskAndDescendants(task.id);
      } else {
        return;
      }
      saveSomeday();
      renderSomedayList();
    });
  }

  // Shared by a leaf task's tap and an already-expanded parent's tap alike,
  // so either one offers the same 変更修正/子タスク追加/削除 choice instead
  // of a parent tap ever forcing straight into rename.
  function promptSomedayEditOrAddChild(task, depth) {
    openTaskChoiceModal(task, { showAddChild: depth < SOMEDAY_MAX_DEPTH }).then((choice) => {
      if (choice === "edit") {
        renameSomedayTask(task);
      } else if (choice === "addChild") {
        openNameModal("", SOMEDAY_CHILD_LABELS[depth]).then((name) => {
          if (name === null) return;
          const label = name.trim();
          if (!label) return;
          someday.push({ id: `someday_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, label, parentId: task.id });
          saveSomeday();
          activateSomedayChain(depth, task.id);
          renderSomedayList();
        });
      } else if (choice === "delete") {
        confirmDeleteSomedayTask(task);
      }
    });
  }

  // Regular tasks (ログ行/時間未定のタスク) never have subtasks of their
  // own, so this is always a plain 変更修正/削除 choice — no addChild, no
  // keep-vs-delete-all follow-up.
  function promptRegularTaskEdit(dateStr, item) {
    openTaskChoiceModal(item, { showAddChild: false }).then((choice) => {
      if (choice === "edit") {
        openNameModal(item.label).then((name) => {
          if (name === null) return;
          const label = name.trim();
          if (!label) return;
          item.label = label;
          if (item.planId) {
            const plan = plansForDate(dateStr).find((p) => p.id === item.planId);
            if (plan) {
              plan.label = label;
              savePlans();
            }
          }
          persistItemsForDate(dateStr);
          refreshTimerIfShowing(dateStr);
          renderCalendar();
        });
      } else if (choice === "delete") {
        deleteTaskItem(dateStr, item);
      }
    });
  }

  // Deletes a regular task outright: drops its plan block (if any) along
  // with the item itself, rather than the more conservative "unschedule"
  // flow elsewhere that keeps the item when it already has recorded time.
  function deleteTaskItem(dateStr, item) {
    if (item.planId) removePlan(dateStr, item.planId);
    const items = itemsArrayForDate(dateStr);
    const idx = items.indexOf(item);
    if (idx >= 0) items.splice(idx, 1);
    persistItemsForDate(dateStr);
    refreshTimerIfShowing(dateStr);
    renderCalendar();
  }

  let somedayDragCtx = null;

  function startSomedayChipDrag(e, chip, task) {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    const listEl = chip.parentElement;
    somedayDragCtx = {
      chip,
      task,
      listEl,
      phase: "pending", // "pending" -> "schedule" | "reorder" | "scroll"
      heldLongEnough: false, // long-press fired while still stationary
      startClientX: e.clientX,
      startClientY: e.clientY,
      startLeft: chip.offsetLeft,
      startScrollLeft: listEl.scrollLeft,
      targetCol: null,
      clientY: e.clientY,
      longPressTimer: null,
    };
    somedayDragCtx.longPressTimer = setTimeout(() => {
      if (!somedayDragCtx || somedayDragCtx.phase !== "pending") return;
      somedayDragCtx.longPressTimer = null;
      somedayDragCtx.heldLongEnough = true;
      somedayDragCtx.chip.classList.add("armed");
      vibrate(10);
    }, CHIP_REORDER_LONGPRESS_MS);
    document.addEventListener("pointermove", onSomedayChipDragMove);
    document.addEventListener("pointerup", onSomedayChipDragEnd);
    document.addEventListener("pointercancel", onSomedayChipDragEnd);
  }

  function onSomedayChipDragMove(e) {
    if (!somedayDragCtx) return;
    const ctx = somedayDragCtx;

    if (ctx.phase === "pending") {
      const dx = e.clientX - ctx.startClientX;
      const dy = e.clientY - ctx.startClientY;
      if (Math.hypot(dx, dy) < PLAN_MOVE_TOLERANCE) return;
      if (ctx.longPressTimer) {
        clearTimeout(ctx.longPressTimer);
        ctx.longPressTimer = null;
      }
      // A clearly vertical movement always means "lift this into the grid,"
      // whether or not the long-press already fired — only an ambiguous
      // horizontal movement needs the long-press to tell a scroll swipe
      // apart from "pick this chip up to reorder it."
      if (Math.abs(dx) > Math.abs(dy)) {
        ctx.chip.classList.remove("armed");
        if (ctx.heldLongEnough) {
          ctx.phase = "reorder";
          ctx.chip.classList.add("reordering");
          ctx.chip.style.transition = "none";
          vibrate(15);
        } else {
          ctx.phase = "scroll";
        }
      } else {
        ctx.chip.classList.remove("armed");
        if (isParentTask(ctx.task.id)) {
          // a task that's itself become a parent isn't broken down into
          // something concrete yet, so it can't be turned into a scheduled
          // action — only its (eventually leaf) descendants can be
          ctx.phase = "blocked";
          vibrate([10, 30, 10]);
        } else {
          ctx.phase = "schedule";
          ctx.chip.classList.add("dragging");
          vibrate(15);
        }
      }
    }

    if (ctx.phase === "blocked") {
      e.preventDefault();
      return;
    }

    if (ctx.phase === "scroll") {
      e.preventDefault();
      ctx.listEl.scrollLeft = ctx.startScrollLeft - (e.clientX - ctx.startClientX);
      return;
    }

    if (ctx.phase === "schedule") {
      e.preventDefault();
      showDragGhost(e.clientX, e.clientY, ctx.task.label);
      const cols = Array.from(calendarWeekGrid.children);
      let targetCol = null;
      // .calendar-day-col is often much taller than what's actually visible
      // (24h plus the "time undetermined" zone, while calendarWeekBody only
      // shows a scrolled slice of it) — a column's own rect still reports
      // that full, unclipped height, so without also checking the visible
      // viewport, dragging back down past the calendar (e.g. toward the
      // いつか tray below it, to abort the schedule) would still register as
      // hovering the column instead of finding no target at all.
      const bodyRect = calendarWeekBody.getBoundingClientRect();
      if (e.clientY >= bodyRect.top && e.clientY <= bodyRect.bottom) {
        for (const col of cols) {
          // a past day can't be a drop target: いつか has no linked timer item
          // once its date has passed, so anything dropped there would just
          // vanish into an unreachable past-day draft
          if (col.dataset.date < state.day) continue;
          const rect = col.getBoundingClientRect();
          if (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          ) {
            targetCol = col;
            break;
          }
        }
      }
      cols.forEach((c) => c.classList.toggle("drop-target", c === targetCol));
      ctx.targetCol = targetCol;
      ctx.clientY = e.clientY;

      if (targetCol) {
        document.querySelectorAll(".monthly-cell.drop-target").forEach((c) => c.classList.remove("drop-target"));
        ctx.targetMonthlyCell = null;
        const colRect = targetCol.getBoundingClientRect();
        const relY = e.clientY - colRect.top;
        // dropping below the 24-hour line sends it to that day's own "time
        // undetermined" list instead of a specific timed slot
        const overZone = relY > 24 * CAL_HOUR_H;
        ctx.overZone = overZone;
        const zoneEl = targetCol.querySelector(".cal-unscheduled-day");
        if (zoneEl) zoneEl.classList.toggle("drop-target", overZone);
        if (overZone) {
          clearDragPreview();
        } else {
          const rawMin = pxToMin(relY);
          let startMin = Math.round(rawMin / 15) * 15;
          startMin = Math.max(0, Math.min(1440 - PLAN_DEFAULT_MIN, startMin));
          showDragPreview(targetCol, ctx.task.label, startMin, PLAN_DEFAULT_MIN);
        }
        return;
      }

      // No day-column target — we may be on the マンスリー page instead,
      // where a chip has no specific time slot to land on, only a date: it
      // always goes into that date's own "time undetermined" list.
      ctx.overZone = false;
      clearDragPreview();
      let targetMonthlyCell = null;
      const monthlyCells = Array.from(document.querySelectorAll(".monthly-cell"));
      for (const cell of monthlyCells) {
        if (cell.dataset.date < state.day) continue;
        const rect = cell.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          targetMonthlyCell = cell;
          break;
        }
      }
      monthlyCells.forEach((c) => c.classList.toggle("drop-target", c === targetMonthlyCell));
      ctx.targetMonthlyCell = targetMonthlyCell;
      if (targetMonthlyCell) return;

      // Still nothing — we may be on the ログ page instead, where dropping
      // onto the task list adds it as a plain task with no time set, same
      // as a day's own "time undetermined" zone. Same past-day protection
      // as everywhere else: a date already gone can't be a drop target.
      let targetTaskList = null;
      const listWrapRect = listWrap.getBoundingClientRect();
      if (
        viewingDate >= state.day &&
        e.clientX >= listWrapRect.left &&
        e.clientX <= listWrapRect.right &&
        e.clientY >= listWrapRect.top &&
        e.clientY <= listWrapRect.bottom
      ) {
        targetTaskList = listWrap;
      }
      listWrap.classList.toggle("drop-target", !!targetTaskList);
      ctx.targetTaskList = targetTaskList;
      return;
    }

    if (ctx.phase === "reorder") {
      e.preventDefault();
      const desiredLeft = ctx.startLeft + (e.clientX - ctx.startClientX);
      const currentLeft = ctx.chip.offsetLeft;
      ctx.chip.style.transform = `translateX(${desiredLeft - currentLeft}px)`;

      const chipRect = ctx.chip.getBoundingClientRect();
      const chipCenter = chipRect.left + chipRect.width / 2;
      const siblings = Array.from(ctx.listEl.children).filter((n) => n.classList.contains("cal-unplanned-chip"));
      const draggedIndex = siblings.indexOf(ctx.chip);
      for (let j = 0; j < siblings.length; j++) {
        const sib = siblings[j];
        if (sib === ctx.chip) continue;
        const sibRect = sib.getBoundingClientRect();
        if (chipCenter > sibRect.left && chipCenter < sibRect.right) {
          if (j < draggedIndex) {
            ctx.listEl.insertBefore(ctx.chip, sib);
          } else {
            ctx.listEl.insertBefore(ctx.chip, sib.nextSibling);
          }
          break;
        }
      }
    }
  }

  function onSomedayChipDragEnd() {
    if (!somedayDragCtx) return;
    const ctx = somedayDragCtx;
    document.removeEventListener("pointermove", onSomedayChipDragMove);
    document.removeEventListener("pointerup", onSomedayChipDragEnd);
    document.removeEventListener("pointercancel", onSomedayChipDragEnd);
    if (ctx.longPressTimer) clearTimeout(ctx.longPressTimer);
    ctx.chip.classList.remove("armed");
    Array.from(calendarWeekGrid.children).forEach((c) => c.classList.remove("drop-target"));
    Array.from(document.querySelectorAll(".cal-unscheduled-day.drop-target")).forEach((z) => z.classList.remove("drop-target"));
    Array.from(document.querySelectorAll(".monthly-cell.drop-target")).forEach((c) => c.classList.remove("drop-target"));
    listWrap.classList.remove("drop-target");
    clearDragPreview();
    clearDragGhost();

    if (ctx.phase === "scroll" || ctx.phase === "blocked") {
      somedayDragCtx = null;
      return;
    }

    if (ctx.phase === "schedule") {
      ctx.chip.classList.remove("dragging");
      somedayDragCtx = null;
      const { task, targetCol, targetMonthlyCell, targetTaskList, clientY, overZone } = ctx;

      if (targetMonthlyCell) {
        // マンスリーには時間軸がないので、常にその日の「時間未定」リストへ
        const dateStr = targetMonthlyCell.dataset.date;
        const item = freshItem(task.label);
        ensureItemsArrayForDate(dateStr).push(item);
        persistItemsForDate(dateStr);
        refreshTimerIfShowing(dateStr);
        removeSomedayTaskPromotingChildren(task.id);
        saveSomeday();
        vibrate(20);
        renderCalendar();
        return;
      }

      if (targetTaskList) {
        // ログのタスク一覧に落とした場合も、時間は決めず現在表示中の日付の
        // タスクとして追加する
        const dateStr = viewingDate;
        const item = freshItem(task.label);
        ensureItemsArrayForDate(dateStr).push(item);
        persistItemsForDate(dateStr);
        refreshTimerIfShowing(dateStr);
        removeSomedayTaskPromotingChildren(task.id);
        saveSomeday();
        vibrate(20);
        renderCalendar();
        return;
      }

      if (!targetCol) return;

      const dateStr = targetCol.dataset.date;

      if (overZone) {
        const item = freshItem(task.label);
        ensureItemsArrayForDate(dateStr).push(item);
        persistItemsForDate(dateStr);
        refreshTimerIfShowing(dateStr);
        removeSomedayTaskPromotingChildren(task.id);
        saveSomeday();
        vibrate(20);
        renderCalendar();
        return;
      }

      const rect = targetCol.getBoundingClientRect();
      const relY = clientY - rect.top;
      const rawMin = pxToMin(relY);
      let startMin = Math.round(rawMin / 15) * 15;
      startMin = Math.max(0, Math.min(1440 - PLAN_DEFAULT_MIN, startMin));
      const endMin = startMin + PLAN_DEFAULT_MIN;
      const id = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      addPlan(dateStr, { id, label: task.label, startMin, endMin });
      const item = freshItem(task.label);
      item.planId = id;
      ensureItemsArrayForDate(dateStr).push(item);
      sortItemsByPlan(dateStr);
      persistItemsForDate(dateStr);
      refreshTimerIfShowing(dateStr);
      removeSomedayTaskPromotingChildren(task.id);
      saveSomeday();
      vibrate(20);
      renderCalendar();
      return;
    }

    if (ctx.phase === "reorder") {
      ctx.chip.classList.remove("reordering");
      ctx.chip.style.transition = "transform 0.15s ease";
      ctx.chip.style.transform = "";
      const domOrder = Array.from(ctx.listEl.children).filter((n) => n.classList.contains("cal-unplanned-chip"));
      const orderedIds = domOrder.map((n) => n.dataset.somedayId);
      // only the tasks actually shown in this scoped list (top-level, or one
      // parent's children) get reordered — everything else keeps its slot
      const reorderedSet = new Set(orderedIds);
      const reorderedTasks = orderedIds.map((id) => someday.find((t) => t.id === id));
      let ri = 0;
      someday = someday.map((t) => (reorderedSet.has(t.id) ? reorderedTasks[ri++] : t));
      saveSomeday();
      vibrate(15);
      const chipRef = ctx.chip;
      setTimeout(() => {
        chipRef.style.transition = "";
      }, 160);
      // the other lists showing this same scope weren't touched by this
      // drag, so sync them too — ctx.listEl's own DOM order is already
      // correct and mid-settle-animation
      siblingSomedayLists(ctx.listEl).forEach((sibling) => renderSomedayListInto(sibling, tasksForSomedayList(sibling)));
      somedayDragCtx = null;
      return;
    }

    if (ctx.phase === "pending") {
      // a plain tap, with no drag ever starting
      const { task } = ctx;
      somedayDragCtx = null;
      const depth = somedayTaskDepth(task);

      if (depth >= SOMEDAY_MAX_DEPTH) {
        // the deepest level (ひ孫タスク): always a leaf, so no 子タスク追加
        // option, but 変更修正/削除 is still offered like every other level
        promptSomedayEditOrAddChild(task, depth);
        return;
      }

      if (isParentTask(task.id)) {
        // already has subtasks of its own: tapping it drills into the next
        // layer down — but a SECOND tap on the SAME already-active one
        // opens the same 変更修正/子タスク追加 choice as a leaf task, instead
        // of always renaming — otherwise there was no way to add ANOTHER
        // child from an already-expanded parent without first collapsing
        // and re-tapping it
        if (activeSomedayIds[depth] === task.id) {
          promptSomedayEditOrAddChild(task, depth);
        } else {
          activateSomedayChain(depth, task.id);
          renderSomedayList();
        }
        return;
      }

      promptSomedayEditOrAddChild(task, depth);
      return;
    }

    // a gesture that bailed out early some other way — nothing to do
    somedayDragCtx = null;
  }

  // Lays same-day overlapping segments (e.g. a task plus a concurrent 割込
  // run) out side by side instead of stacking them on top of one another,
  // the way Google Calendar handles overlapping events.
  function layoutSegments(segments) {
    const sorted = segments.slice().sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
    const laidOut = [];
    let columns = [];
    let clusterMembers = [];
    let clusterEnd = -Infinity;

    function flushCluster() {
      if (!clusterMembers.length) return;
      const colCount = Math.max(...clusterMembers.map((m) => m.col)) + 1;
      clusterMembers.forEach((m) => laidOut.push({ seg: m.seg, col: m.col, colCount }));
      clusterMembers = [];
    }

    sorted.forEach((seg) => {
      if (seg.startMs >= clusterEnd) {
        flushCluster();
        columns = [];
        clusterEnd = -Infinity;
      }
      let col = columns.findIndex((endMs) => endMs <= seg.startMs);
      if (col === -1) {
        col = columns.length;
        columns.push(seg.endMs);
      } else {
        columns[col] = seg.endMs;
      }
      clusterMembers.push({ seg, col });
      clusterEnd = Math.max(clusterEnd, seg.endMs);
    });
    flushCluster();

    return laidOut;
  }

  function renderCalendarDetail() {
    if (!selectedDayDetail) {
      calendarDetail.hidden = true;
      calendarDetail.innerHTML = "";
      return;
    }
    calendarDetail.hidden = false;
    calendarDetail.innerHTML = "";

    const top = document.createElement("div");
    top.className = "h-top";
    const dateLabel = document.createElement("span");
    dateLabel.className = "h-date";
    dateLabel.textContent = formatDateLabel(selectedDayDetail);
    top.appendChild(dateLabel);

    const rec = history.find((h) => h.date === selectedDayDetail);
    const totalEl = document.createElement("span");
    totalEl.className = "h-total";
    totalEl.textContent = formatTime(rec ? rec.totalMs : 0);
    top.appendChild(totalEl);
    calendarDetail.appendChild(top);

    if (!rec) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.textContent = "この日の記録はありません。";
      calendarDetail.appendChild(empty);
      return;
    }

    const stack = document.createElement("div");
    stack.className = "history-stack";
    rec.items.forEach((it, i) => {
      const seg = document.createElement("span");
      seg.style.width = `${(it.elapsedMs / rec.totalMs) * 100}%`;
      seg.style.opacity = String(Math.max(0.32, 1 - i * 0.16));
      seg.title = `${it.label} ${formatTime(it.elapsedMs)}`;
      stack.appendChild(seg);
    });

    const legend = document.createElement("div");
    legend.className = "history-legend calendar-legend";
    legend.textContent = rec.items.map((it) => `${it.label} ${formatTime(it.elapsedMs)}`).join(" ・ ");

    calendarDetail.append(stack, legend);
  }

  function renderCalendar() {
    clearLongPress(); // the grid is about to be torn down and rebuilt
    const start = parseDateStr(weekAnchor);
    const end = new Date(start);
    end.setDate(end.getDate() + CAL_DAYS - 1);
    calendarWeekLabel.textContent = `${start.getMonth() + 1}/${start.getDate()} 〜 ${end.getMonth() + 1}/${end.getDate()}`;

    calendarWeekHeader.innerHTML = "";
    const spacer = document.createElement("div");
    spacer.className = "cal-gutter-spacer";
    calendarWeekHeader.appendChild(spacer);

    calendarWeekGrid.innerHTML = "";
    calendarLiveBlocks = [];
    calendarNowLineEl = null;

    const dayDates = Array.from({ length: CAL_DAYS }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    });
    const dayUnscheduled = {};
    let maxUnscheduled = 0;
    let anyEligibleDay = false;
    dayDates.forEach((dateStr) => {
      const eligible = dateStr >= state.day;
      if (eligible) anyEligibleDay = true;
      const unscheduled = eligible ? itemsArrayForDate(dateStr).filter((it) => !it.planId) : [];
      dayUnscheduled[dateStr] = unscheduled;
      maxUnscheduled = Math.max(maxUnscheduled, unscheduled.length);
    });
    // The zone is always shown (even with nothing in it) for any day that
    // could have one, so always reserve at least one row of space for it.
    const unschedRowCount = anyEligibleDay ? Math.max(maxUnscheduled, 1) : 0;
    const unschedExtraH = unschedRowCount
      ? unschedRowCount * CAL_UNSCHEDULED_ROW_H + (unschedRowCount - 1) * CAL_UNSCHEDULED_GAP + 16
      : 0;
    calendarWeekGrid.style.height = `${24 * CAL_HOUR_H + unschedExtraH}px`;

    for (let i = 0; i < CAL_DAYS; i++) {
      const dateStr = dayDates[i];
      const d = parseDateStr(dateStr);

      const header = document.createElement("button");
      header.type = "button";
      header.className = "calendar-day-header";
      if (dateStr === state.day) header.classList.add("today");
      if (dateStr === selectedDayDetail) header.classList.add("selected");

      const weekdayEl = document.createElement("span");
      weekdayEl.className = "cdh-weekday";
      weekdayEl.textContent = WEEKDAYS[d.getDay()];
      const dateEl = document.createElement("span");
      dateEl.className = "cdh-date";
      dateEl.textContent = String(d.getDate());
      header.append(weekdayEl, dateEl);

      // day title: a label on the date itself, separate from any plan or
      // task placed on it — shown right under the date, above the time grid
      const titleEl = document.createElement("span");
      const dayTitle = dayTitleFor(dateStr);
      titleEl.className = dayTitle ? "cdh-title" : "cdh-title empty";
      titleEl.textContent = dayTitle || "+";
      titleEl.title = dayTitle ? "タップしてタイトルを編集" : "タップして日付にタイトルを追加";
      titleEl.addEventListener("click", (e) => {
        e.stopPropagation();
        editDayTitle(dateStr);
      });
      header.appendChild(titleEl);

      const draft = drafts[dateStr];
      if (dateStr > state.day && draft && draft.length) {
        const dot = document.createElement("span");
        dot.className = "cdh-dot";
        header.appendChild(dot);
      }

      header.addEventListener("click", () => onCalendarHeaderClick(dateStr));
      calendarWeekHeader.appendChild(header);

      const dayCol = document.createElement("div");
      dayCol.className = "calendar-day-col";
      dayCol.dataset.date = dateStr;
      const dayStart = new Date(`${dateStr}T00:00:00`).getTime();

      let segs = closedSegmentsForDate(dateStr).map((seg) => ({ ...seg, live: false }));
      if (dateStr === state.day) {
        allTrackedEntries().forEach(({ item, fallback }) => {
          if (item.running && item.startedAt) {
            segs.push({ label: labelOf(item, fallback), startMs: item.startedAt, endMs: Date.now(), live: true });
          }
        });
      }

      layoutSegments(segs).forEach(({ seg, col, colCount }) => {
        const startMinOfDay = Math.max(0, (seg.startMs - dayStart) / 60000);
        const durMin = Math.max(1, (seg.endMs - seg.startMs) / 60000);
        const block = document.createElement("div");
        block.className = "cal-block";
        block.style.top = `${minToPx(startMinOfDay)}px`;
        block.style.height = `${minToPx(durMin)}px`;
        block.style.left = `calc(${(col / colCount) * 100}% + 1px)`;
        block.style.width = `calc(${(1 / colCount) * 100}% - 2px)`;
        block.style.background = colorForLabel(seg.label);
        block.textContent = seg.label;
        block.addEventListener("click", (e) => onCalendarBlockClick(seg, e));
        dayCol.appendChild(block);
        if (seg.live) calendarLiveBlocks.push({ el: block, startMs: seg.startMs, dayStart });
      });

      if (dateStr === state.day) {
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const line = document.createElement("div");
        line.className = "cal-now-line";
        line.style.top = `${minToPx(nowMin)}px`;
        dayCol.appendChild(line);
        calendarNowLineEl = line;
      }

      if (dateStr >= state.day) {
        layoutSegments(plansForDate(dateStr).map((p) => ({ startMs: p.startMin, endMs: p.endMin, ref: p }))).forEach(
          ({ seg, col, colCount }) => {
            const p = seg.ref;
            const block = document.createElement("div");
            block.className = "cal-plan-block";
            block.style.top = `${minToPx(p.startMin)}px`;
            block.style.height = `${minToPx(Math.max(1, p.endMin - p.startMin))}px`;
            block.style.left = `calc(${(col / colCount) * 100}% + 1px)`;
            block.style.width = `calc(${(1 / colCount) * 100}% - 2px)`;
            const color = colorForLabel(p.label);
            block.style.borderColor = color;
            block.style.color = color;
            block.textContent = p.label;
            block.addEventListener("pointerdown", (e) => startPlanDrag(e, block, dateStr, p));

            dayCol.appendChild(block);

            if (p.id === selectedPlanId) {
              block.classList.add("selected");
              // A sibling of block, not a child: .cal-plan-block clips overflow
              // for text-ellipsis, which would clip a handle meant to protrude
              // past its bottom edge and make it untappable.
              const handle = document.createElement("div");
              handle.className = "cal-plan-resize-handle";
              handle.style.top = `${minToPx(p.endMin)}px`;
              handle.style.left = `calc(${(col / colCount) * 100}% + ${(1 / colCount) * 50}%)`;
              handle.style.background = color;
              handle.addEventListener("pointerdown", (e) => startPlanResize(e, block, handle, dayCol, dateStr, p));
              dayCol.appendChild(handle);
            }
          }
        );

        dayCol.addEventListener("pointerdown", (e) => onDayColPointerDown(e, dayCol, dateStr));
      }

      const unscheduledForDay = dayUnscheduled[dateStr];
      if (dateStr >= state.day) {
        // Always shown for a day that could have one, so it's a
        // discoverable, dependable drop target even with nothing in it yet.
        const zone = document.createElement("div");
        zone.className = "cal-unscheduled-day";
        zone.style.top = `${24 * CAL_HOUR_H}px`;
        if (unscheduledForDay.length) {
          unscheduledForDay.forEach((item, idx) => {
            const row = document.createElement("div");
            row.className = "cal-unscheduled-row";
            row.textContent = labelOf(item, `タスク${idx + 1}`);
            row.addEventListener("pointerdown", (e) => startDayUnscheduledDrag(e, row, item, dateStr));
            zone.appendChild(row);
          });
        } else {
          const empty = document.createElement("span");
          empty.className = "cal-unscheduled-empty";
          empty.textContent = "時間未定のタスクなし";
          zone.appendChild(empty);
        }
        dayCol.appendChild(zone);
      }

      calendarWeekGrid.appendChild(dayCol);
    }

    tickCalendarLive();

    renderSomedayList();
    renderCalendarDetail();

    if (calendarAutoScrollPending) {
      calendarAutoScrollPending = false;
      requestAnimationFrame(() => {
        const now = new Date();
        const nowHour = now.getHours() + now.getMinutes() / 60;
        calendarWeekBody.scrollTop = Math.max(0, (nowHour - 1.5) * CAL_HOUR_H);
      });
    }

    refreshAllMonthlyContent();
  }

  function tickCalendarLive() {
    if (calendarNowLineEl) {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      calendarNowLineEl.style.top = `${minToPx(nowMin)}px`;
    }
    const now = Date.now();
    calendarLiveBlocks.forEach(({ el, startMs, dayStart }) => {
      const startMinOfDay = Math.max(0, (startMs - dayStart) / 60000);
      const durMin = Math.max(1, (now - startMs) / 60000);
      el.style.top = `${minToPx(startMinOfDay)}px`;
      el.style.height = `${minToPx(durMin)}px`;
    });
  }

  // Takes an explicit target (rather than reading the swappable calendarHours
  // pointer) since both デイリー's and ウィークリー's hour-label columns need
  // seeding once at boot, regardless of which page happens to be active then.
  function initCalendarHours(hoursEl) {
    hoursEl.innerHTML = "";
    for (let h = 0; h < 24; h++) {
      const label = document.createElement("div");
      label.className = "cal-hour-label";
      label.style.top = `${h * CAL_HOUR_H}px`;
      label.textContent = `${h}:00`;
      hoursEl.appendChild(label);
    }
    PERIOD_LABELS.forEach(({ hour, symbol }) => {
      const label = document.createElement("div");
      label.className = "cal-period-label";
      label.style.top = `${(hour + 0.5) * CAL_HOUR_H}px`;
      label.textContent = symbol;
      hoursEl.appendChild(label);
    });
  }

  // --- monthly calendar page (Monday-start; weeks flow by on vertical
  // scroll instead of paging month-to-month, tap a day to jump the daily
  // 3-day view to it) ---

  const MONTH_WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];
  const MONTHLY_ROW_H = 147; // px per week row; keep in sync with --monthly-row-h in style.css
  const MONTHLY_WEEKS_BEFORE = 6; // weeks rendered above today's week on first load
  const MONTHLY_WEEKS_AFTER = 8; // weeks rendered below today's week on first load
  const MONTHLY_EXTEND_WEEKS = 6; // weeks appended/prepended once the user scrolls near an edge
  const MONTHLY_EDGE_THRESHOLD = MONTHLY_ROW_H * 2; // how close to an edge triggers an extend
  const MONTHLY_MAX_WEEKS = 40; // cap on rendered weeks; the far edge is trimmed past this

  // A cell's event list has no fixed item cap, but showing every label
  // unconditionally let a long list squeeze the day title down to nothing
  // (both shared the same flexible space). These mirror the fixed pixel
  // values in style.css's .monthly-cell/.mc-day-title/.mc-event rules — kept
  // in sync by hand, same as MONTHLY_ROW_H above — so the number of events
  // that actually fit can be worked out before the row is even in the DOM
  // (buildMonthlyWeekRow renders a cell before its row is attached, so a
  // live measurement isn't available yet).
  const MC_CELL_PAD_V = 8; // .monthly-cell padding: 4px top + 4px bottom
  const MC_DATE_H = 22; // .mc-date circle height
  const MC_BODY_GAP = 2; // gap between mc-date/mc-body, and between title/events inside mc-body
  const MC_TITLE_H = 19; // .mc-day-title: up to 2 lines at 0.42rem/1.2 + 1px top/bottom padding
  const MC_EVENT_ROW_H = 11; // .mc-event: 0.5rem/1.3 line-height
  const MC_EVENT_GAP = 1; // gap between .mc-event rows

  function maxEventsForCell(hasTitle) {
    let avail = MONTHLY_ROW_H - MC_CELL_PAD_V - MC_DATE_H - MC_BODY_GAP;
    if (hasTitle) avail -= MC_TITLE_H + MC_BODY_GAP;
    if (avail <= 0) return 0;
    return Math.max(0, Math.floor((avail + MC_EVENT_GAP) / (MC_EVENT_ROW_H + MC_EVENT_GAP)));
  }

  let monthlyWeeksStart = null; // Monday date string of the first rendered week row
  let monthlyWeeksEnd = null; // Monday date string of the last rendered week row

  function addDaysStr(dateStr, days) {
    const d = parseDateStr(dateStr);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function mondayOfWeek(dateStr) {
    const d = parseDateStr(dateStr);
    const lead = (d.getDay() + 6) % 7; // JS getDay() is 0=Sun..6=Sat; shift so weeks start Monday
    d.setDate(d.getDate() - lead);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function jumpDailyToDate(dateStr) {
    dailyWeekAnchor = dateStr;
    goToPage(DAILY_PAGE);
  }

  // Tasks already placed on a specific date, in time order (plans first,
  // then time-undetermined ones) — shown right in the monthly cell so a
  // scheduled day is readable without drilling into デイリー.
  function labelsForDate(dateStr) {
    return itemsArrayForDate(dateStr)
      .map((it) => labelOf(it, ""))
      .filter((label) => label);
  }

  // (Re)builds one cell's date circle / month tag / event list in place —
  // used both when a week row is first created and to refresh already-
  // rendered cells (e.g. after a task is added) without touching which
  // weeks are on screen or the scroll position.
  function refreshMonthlyCellContent(cell, dateStr) {
    cell.classList.toggle("today", dateStr === todayStr());
    cell.querySelectorAll(".mc-date, .mc-month-tag, .mc-body").forEach((el) => el.remove());

    const d = parseDateStr(dateStr);
    const dateEl = document.createElement("span");
    dateEl.className = "mc-date";
    dateEl.textContent = String(d.getDate());
    cell.appendChild(dateEl);

    if (d.getDate() === 1) {
      const tag = document.createElement("span");
      tag.className = "mc-month-tag";
      tag.textContent = `${d.getMonth() + 1}月`;
      cell.appendChild(tag);
    }

    // day title (if any) stacks above the event list, both inside .mc-body —
    // it takes priority over the timed plans/tasks below it
    const body = document.createElement("div");
    body.className = "mc-body";

    const dayTitle = dayTitleFor(dateStr);
    if (dayTitle) {
      const titleEl = document.createElement("span");
      titleEl.className = "mc-day-title";
      titleEl.textContent = dayTitle;
      titleEl.title = "タップしてタイトルを編集";
      titleEl.addEventListener("click", (e) => {
        e.stopPropagation();
        editDayTitle(dateStr);
      });
      body.appendChild(titleEl);
    }

    // shows as many events as actually fit next to the title (if any) —
    // more than the old fixed 4-item cap when there's no title, fewer when
    // there is one, so the title itself never gets squeezed down to fit
    const labels = labelsForDate(dateStr);
    if (labels.length) {
      const list = document.createElement("div");
      list.className = "mc-events";
      const maxEvents = maxEventsForCell(!!dayTitle);
      const showCount = labels.length > maxEvents ? Math.max(0, maxEvents - 1) : labels.length;
      labels.slice(0, showCount).forEach((label) => {
        const row = document.createElement("span");
        row.className = "mc-event";
        row.textContent = label;
        row.style.color = colorForLabel(label);
        list.appendChild(row);
      });
      if (showCount < labels.length) {
        const more = document.createElement("span");
        more.className = "mc-event mc-event-more";
        more.textContent = `+${labels.length - showCount}`;
        list.appendChild(more);
      }
      body.appendChild(list);
    }

    if (dayTitle || labels.length) cell.appendChild(body);
  }

  function buildMonthlyWeekRow(mondayStr) {
    const rowEl = document.createElement("div");
    rowEl.className = "monthly-week-row";
    for (let i = 0; i < 7; i++) {
      const dateStr = addDaysStr(mondayStr, i);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "monthly-cell";
      cell.dataset.date = dateStr;
      refreshMonthlyCellContent(cell, dateStr);
      cell.addEventListener("click", () => jumpDailyToDate(dateStr));
      rowEl.appendChild(cell);
    }
    return rowEl;
  }

  // Refreshes every already-rendered cell's content (called whenever task/
  // plan data changes) without rebuilding the week list or moving scroll.
  function refreshAllMonthlyContent() {
    Array.from(monthlyWeeks.children).forEach((rowEl) => {
      Array.from(rowEl.children).forEach((cell) => {
        refreshMonthlyCellContent(cell, cell.dataset.date);
      });
    });
  }

  function trimMonthlyWeeks(fromStart) {
    const rows = Array.from(monthlyWeeks.children);
    const excess = rows.length - MONTHLY_MAX_WEEKS;
    if (excess <= 0) return;
    if (fromStart) {
      rows.slice(0, excess).forEach((r) => r.remove());
      monthlyWeeksStart = addDaysStr(monthlyWeeksStart, 7 * excess);
      monthlyWeeksScroll.scrollTop -= excess * MONTHLY_ROW_H;
    } else {
      rows.slice(rows.length - excess).forEach((r) => r.remove());
      monthlyWeeksEnd = addDaysStr(monthlyWeeksEnd, -7 * excess);
    }
  }

  function extendMonthlyWeeksBefore() {
    const newStart = addDaysStr(monthlyWeeksStart, -7 * MONTHLY_EXTEND_WEEKS);
    const rows = [];
    for (let cursor = newStart; cursor < monthlyWeeksStart; cursor = addDaysStr(cursor, 7)) {
      rows.push(buildMonthlyWeekRow(cursor));
    }
    const firstChild = monthlyWeeks.firstChild;
    rows.forEach((row) => monthlyWeeks.insertBefore(row, firstChild));
    monthlyWeeksStart = newStart;
    // added above the viewport, so bump scrollTop by the same amount to
    // keep whatever week the user was looking at visually in place
    monthlyWeeksScroll.scrollTop += rows.length * MONTHLY_ROW_H;
    trimMonthlyWeeks(false);
  }

  function extendMonthlyWeeksAfter() {
    let cursor = monthlyWeeksEnd;
    for (let i = 0; i < MONTHLY_EXTEND_WEEKS; i++) {
      cursor = addDaysStr(cursor, 7);
      monthlyWeeks.appendChild(buildMonthlyWeekRow(cursor));
    }
    monthlyWeeksEnd = cursor;
    trimMonthlyWeeks(true);
  }

  function updateMonthlyLabelFromScroll() {
    const idx = Math.max(0, Math.round(monthlyWeeksScroll.scrollTop / MONTHLY_ROW_H));
    const mondayStr = addDaysStr(monthlyWeeksStart, 7 * idx);
    const d = parseDateStr(mondayStr);
    monthlyLabel.textContent = `${d.getFullYear()}年${d.getMonth() + 1}月`;
  }

  let monthlyScrollTicking = false;
  function onMonthlyScroll() {
    if (monthlyScrollTicking) return;
    monthlyScrollTicking = true;
    requestAnimationFrame(() => {
      monthlyScrollTicking = false;
      const { scrollTop, clientHeight, scrollHeight } = monthlyWeeksScroll;
      if (scrollTop < MONTHLY_EDGE_THRESHOLD) extendMonthlyWeeksBefore();
      if (scrollHeight - (scrollTop + clientHeight) < MONTHLY_EDGE_THRESHOLD) extendMonthlyWeeksAfter();
      updateMonthlyLabelFromScroll();
    });
  }

  // One-time setup: seeds the initial window of weeks around today and
  // wires up the scroll-driven extend/trim behavior. Later data changes
  // call refreshAllMonthlyContent() instead, which never touches this.
  function initMonthlyWeeks() {
    MONTH_WEEKDAYS.forEach((w) => {
      const span = document.createElement("span");
      span.textContent = w;
      monthlyWeekdayRow.appendChild(span);
    });

    const centerMonday = mondayOfWeek(monthAnchor);
    monthlyWeeksStart = addDaysStr(centerMonday, -7 * MONTHLY_WEEKS_BEFORE);
    monthlyWeeksEnd = addDaysStr(centerMonday, 7 * MONTHLY_WEEKS_AFTER);
    for (let cursor = monthlyWeeksStart; cursor <= monthlyWeeksEnd; cursor = addDaysStr(cursor, 7)) {
      monthlyWeeks.appendChild(buildMonthlyWeekRow(cursor));
    }
    updateMonthlyLabelFromScroll();

    monthlyWeeksScroll.addEventListener("scroll", onMonthlyScroll, { passive: true });

    requestAnimationFrame(() => {
      // today's week starts one row down from the top, not flush against it
      monthlyWeeksScroll.scrollTop = Math.max(0, (MONTHLY_WEEKS_BEFORE - 1) * MONTHLY_ROW_H);
    });
  }

  function scrollMonthlyByWeeks(deltaWeeks) {
    monthlyWeeksScroll.scrollBy({ top: deltaWeeks * MONTHLY_ROW_H, behavior: "smooth" });
  }

  monthlyPrevBtn.addEventListener("click", () => scrollMonthlyByWeeks(-4));
  monthlyNextBtn.addEventListener("click", () => scrollMonthlyByWeeks(4));

  calendarPrevBtn.addEventListener("click", () => shiftCalendarWeek(-1));
  calendarNextBtn.addEventListener("click", () => shiftCalendarWeek(1));
  weeklyPrevBtn.addEventListener("click", () => shiftCalendarWeek(-1));
  weeklyNextBtn.addEventListener("click", () => shiftCalendarWeek(1));
  calendarSomedayAddBtn.addEventListener("click", addSomedayTask);
  weeklySomedayAddBtn.addEventListener("click", addSomedayTask);
  monthlySomedayAddBtn.addEventListener("click", addSomedayTask);
  taskSomedayAddBtn.addEventListener("click", addSomedayTask);
  calendarSubtaskAddBtn.addEventListener("click", () => addSubtaskAtLevel(0));
  weeklySubtaskAddBtn.addEventListener("click", () => addSubtaskAtLevel(0));
  monthlySubtaskAddBtn.addEventListener("click", () => addSubtaskAtLevel(0));
  taskSubtaskAddBtn.addEventListener("click", () => addSubtaskAtLevel(0));
  calendarGrandchildAddBtn.addEventListener("click", () => addSubtaskAtLevel(1));
  weeklyGrandchildAddBtn.addEventListener("click", () => addSubtaskAtLevel(1));
  monthlyGrandchildAddBtn.addEventListener("click", () => addSubtaskAtLevel(1));
  taskGrandchildAddBtn.addEventListener("click", () => addSubtaskAtLevel(1));
  calendarGreatGrandchildAddBtn.addEventListener("click", () => addSubtaskAtLevel(2));
  weeklyGreatGrandchildAddBtn.addEventListener("click", () => addSubtaskAtLevel(2));
  monthlyGreatGrandchildAddBtn.addEventListener("click", () => addSubtaskAtLevel(2));
  taskGreatGrandchildAddBtn.addEventListener("click", () => addSubtaskAtLevel(2));

  // tapping anywhere outside the いつか/子/孫/ひ孫タスク trays (the grid, a
  // day header, a plan block, ...) collapses back to just いつか — but not
  // a tab switch (state should still carry over between デイリー/マンスリー)
  // or a modal click (those already manage this state deliberately).
  document.addEventListener("click", (e) => {
    if (!document.contains(e.target)) return; // stale target from a chip rebuilt this same tap
    if (e.target.closest(".calendar-unplanned")) return;
    if (e.target.closest(".modal-backdrop")) return;
    if (e.target.closest(".tabs")) return;
    collapseSomedaySubtaskLayers();
  });

  initCalendarHours(dailyHoursEl);
  initCalendarHours(weeklyHoursEl);
  initMonthlyWeeks();

  // --- tabs / paging ---
  // Page order: 0 マンスリー, 1 ウィークリー, 2 デイリー, 3 タスク.
  // Switching PAGES (tabs) is tap-only: goToPage() slides pagesTrack via a
  // CSS transform instead of relying on native horizontal scrolling. Swiping
  // left/right instead advances the content WITHIN whichever page is active
  // (next/prev month/week/day) — see the swipe-navigation block below.

  const MONTHLY_PAGE = 0;
  const WEEKLY_PAGE = 1;
  const DAILY_PAGE = 2;
  const TASK_PAGE = 3;
  const pagesTrack = document.getElementById("pagesTrack");
  const tabBtns = Array.from(document.querySelectorAll(".tab-btn"));
  let activePage = 0;

  function isCalendarPage(i) {
    return i === WEEKLY_PAGE || i === DAILY_PAGE;
  }

  // Swaps the calendarWeekGrid-etc. pointers (see their declaration above)
  // and CAL_DAYS/weekAnchor to represent whichever of ウィークリー/デイリー
  // is being entered, saving the page being left behind's own position
  // first so switching back to it later resumes where it was. Called
  // whenever entering either page, even if that page was already active
  // (harmless resync), so callers like jumpDailyToDate can rely on it
  // unconditionally rather than tracking activePage transitions themselves.
  function enterCalendarPage(target) {
    if (activePage === WEEKLY_PAGE) weeklyWeekAnchor = weekAnchor;
    else if (activePage === DAILY_PAGE) dailyWeekAnchor = weekAnchor;

    if (target === WEEKLY_PAGE) {
      CAL_DAYS = 7;
      calendarWeekLabel = weeklyWeekLabelEl;
      calendarWeekHeader = weeklyWeekHeaderEl;
      calendarWeekBody = weeklyWeekBodyEl;
      calendarHours = weeklyHoursEl;
      calendarWeekGrid = weeklyWeekGridEl;
      calendarDetail = weeklyDetailEl;
      weekAnchor = weeklyWeekAnchor;
    } else {
      CAL_DAYS = 1;
      calendarWeekLabel = dailyWeekLabelEl;
      calendarWeekHeader = dailyWeekHeaderEl;
      calendarWeekBody = dailyWeekBodyEl;
      calendarHours = dailyHoursEl;
      calendarWeekGrid = dailyWeekGridEl;
      calendarDetail = dailyDetailEl;
      weekAnchor = dailyWeekAnchor;
    }
  }

  // 日付・合計・全リセットはタスクタブでしか意味を持たないので、他のタブでは
  // 隠して画面を広く使う。
  function updateHeaderForTab() {
    const onTask = activePage === TASK_PAGE;
    appHeaderEl.hidden = !onTask;
    draftBadge.hidden = isLive();
  }

  let weeklyEverShown = false; // so ウィークリー auto-scrolls to "now" on its first visit only, like デイリー already does at boot

  function setActiveTab(i) {
    if (isCalendarPage(activePage) && !isCalendarPage(i) && selectedPlanId) {
      selectedPlanId = null;
      renderCalendar();
    }
    if (isCalendarPage(i)) {
      const firstWeeklyVisit = i === WEEKLY_PAGE && !weeklyEverShown;
      enterCalendarPage(i);
      if (firstWeeklyVisit) {
        weeklyEverShown = true;
        calendarAutoScrollPending = true;
      }
      if (i !== activePage) {
        renderCalendar(); // pick up any plan/label changes made elsewhere
      }
    }
    activePage = i;
    tabBtns.forEach((b, idx) => b.classList.toggle("active", idx === i));
    updateHeaderForTab();
  }

  function goToPage(i) {
    pagesTrack.style.transform = `translateX(-${i * 100}%)`;
    setActiveTab(i);
  }

  tabBtns.forEach((btn, i) => btn.addEventListener("click", () => goToPage(i)));

  // --- swipe navigation (回転什器のように左右にスライドすると隣の月/週/日) ---
  // One shared horizontal-swipe detector, delegated from pagesTrack, covers
  // all four pages: swipe left -> 次(未来)側, swipe right -> 前(過去)側,
  // dispatched to whichever page is currently active. This does NOT switch
  // pages (that stays tap-only, see goToPage above) — it only advances the
  // content of the page you're already on, mirroring its existing prev/next
  // button.
  //
  // Elements that already own a horizontal or precision gesture of their own
  // are excluded so this never competes with them: day columns (handled
  // inline by onDayColPointerDown instead, since their long-press-to-create
  // gesture needs the same pointer stream and axis decision), plan blocks
  // and their resize handles, the someday-tray drag chips and its own
  // natively horizontally-scrolling list, the task-row drag handle, and
  // text inputs (whose native drag-to-select must not be hijacked).
  const SWIPE_NAV_EXCLUDE =
    ".calendar-day-col, .row-handle, .cal-unplanned-chip, .cal-plan-block, " +
    ".cal-plan-resize-handle, .cal-unscheduled-row, .calendar-unplanned, input, textarea";

  function swipeToAdjacentPeriod(delta) {
    // delta: +1 = 次(未来)側, -1 = 前(過去)側
    if (activePage === MONTHLY_PAGE) scrollMonthlyByWeeks(delta * 4);
    else if (isCalendarPage(activePage)) shiftCalendarWeek(delta);
    else if (activePage === TASK_PAGE) goToDate(addDaysStr(viewingDate, delta));
  }

  let pageSwipeCtx = null;

  pagesTrack.addEventListener("pointerdown", (e) => {
    if (pageSwipeCtx) return;
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest(SWIPE_NAV_EXCLUDE)) return;

    const ctx = { startX: e.clientX, startY: e.clientY, axis: null, lastDx: 0 };
    function onMove(ev) {
      const dx = ev.clientX - ctx.startX;
      const dy = ev.clientY - ctx.startY;
      if (!ctx.axis && Math.hypot(dx, dy) > PLAN_MOVE_TOLERANCE) {
        ctx.axis = Math.abs(dx) > Math.abs(dy) * SWIPE_NAV_AXIS_RATIO ? "h" : "v";
      }
      if (ctx.axis === "h") ctx.lastDx = dx;
    }
    function onEnd() {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onEnd);
      document.removeEventListener("pointercancel", onEnd);
      pageSwipeCtx = null;
      if (ctx.axis === "h" && Math.abs(ctx.lastDx) > SWIPE_NAV_MIN_DX) {
        swipeToAdjacentPeriod(ctx.lastDx < 0 ? 1 : -1);
      }
    }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onEnd);
    document.addEventListener("pointercancel", onEnd);
    pageSwipeCtx = ctx;
  });

  openBreakdownBtn.addEventListener("click", () => {
    renderBreakdown();
    breakdownModal.hidden = false;
  });
  breakdownModalClose.addEventListener("click", () => {
    breakdownModal.hidden = true;
  });
  breakdownModal.addEventListener("mousedown", (e) => {
    if (e.target === breakdownModal) breakdownModal.hidden = true;
  });

  openHistoryBtn.addEventListener("click", () => {
    renderHistory();
    historyModal.hidden = false;
  });
  historyModalClose.addEventListener("click", () => {
    historyModal.hidden = true;
  });
  historyModal.addEventListener("mousedown", (e) => {
    if (e.target === historyModal) historyModal.hidden = true;
  });

  // --- day picker / draft mode ---

  const dayPicker = document.getElementById("dayPicker");
  const draftBadge = document.getElementById("draftBadge");
  const liveOnlyControls = [sideworkCircle, choreCircle, deductPrevBtn, newTaskBtn, resetAllBtn];

  function applyModeUI() {
    const live = isLive();
    dayPicker.classList.toggle("is-draft", !live);
    liveOnlyControls.forEach((btn) => {
      btn.disabled = !live;
    });
    updateHeaderForTab();
  }

  dayPicker.addEventListener("change", () => {
    const val = dayPicker.value;
    if (!val) {
      dayPicker.value = viewingDate;
      return;
    }
    goToDate(val);
  });

  // --- main render loop ---

  function render(opts) {
    const tickOnly = !!(opts && opts.tickOnly);
    let total = 0;
    state.items.forEach((item) => {
      total += currentElapsed(item);
    });

    if (isLive()) {
      state.items.forEach((item, index) => {
        const { node, timeDisplay, toggleBtn, input } = rowEls[index];
        timeDisplay.textContent = formatTime(currentElapsed(item));
        node.classList.toggle("running", item.running);
        toggleBtn.textContent = item.running ? "停止" : "開始";
        input.disabled = item.running;
        input.title = item.running ? "実行中は変更できません" : "";
      });
    }

    const sideElapsed = currentElapsed(state.sidework);
    total += sideElapsed;
    total += currentElapsed(state.interrupt);
    sideworkTime.textContent = formatTime(sideElapsed);
    sideworkWidget.classList.toggle("running", state.sidework.running);
    sideworkInput.disabled = state.sidework.running;
    sideworkInput.title = state.sidework.running ? "実行中は変更できません" : "";

    const choreElapsed = currentElapsed(state.chore);
    total += choreElapsed;
    choreTime.textContent = formatTime(choreElapsed);
    choreWidget.classList.toggle("running", state.chore.running);
    choreInput.disabled = state.chore.running;
    choreInput.title = state.chore.running ? "実行中は変更できません" : "";

    totalTimeEl.textContent = formatTime(total);
    renderBreakdown();
    if (tickOnly) {
      tickCalendarLive();
    } else {
      renderCalendar();
    }
  }

  rolloverIfNeeded();
  sortItemsByPlan(state.day);
  dayPicker.value = viewingDate;
  applyModeUI();
  buildRows();
  render();
  renderHistory();
  goToPage(TASK_PAGE); // default to タスク on launch

  setInterval(() => {
    const rolled = rolloverIfNeeded();
    if (rolled) {
      dayPicker.value = viewingDate;
      applyModeUI();
      buildRows();
      renderHistory();
      render();
    } else {
      render({ tickOnly: true });
    }
    saveState();
  }, 1000);

  window.addEventListener("beforeunload", saveState);
})();
