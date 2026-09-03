(() => {
  const STORAGE_KEY = "todoStopwatch:v6";
  const HISTORY_KEY = "todoStopwatch:history:v1";
  const DRAFTS_KEY = "todoStopwatch:drafts:v1";
  const PLANS_KEY = "todoStopwatch:plans:v1";
  const MAX_HISTORY = 60;
  const DEFAULT_COUNT = 10;
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

  function defaultItems() {
    return Array.from({ length: DEFAULT_COUNT }, () => freshItem(""));
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
          parsed.items.length >= 1 &&
          parsed.sidework &&
          parsed.interrupt &&
          parsed.chore
        ) {
          if (!Array.isArray(parsed.segments)) parsed.segments = [];
          if (!parsed.itemsMigratedToPlans) {
            // One-time cleanup for the 予定<->タイマー linkage: items are now
            // meant to originate from calendar plans, so drop unused blank
            // rows left over from the old free-typed list. Anything with
            // real recorded time is kept (just left unlinked to a plan).
            parsed.items = parsed.items.filter((it) => it.elapsedMs > 0 || it.running);
            parsed.itemsMigratedToPlans = true;
          }
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
      sidework: freshItem("別件"),
      interrupt: freshItem("割込対応"),
      chore: freshItem("雑務"),
      segments: [],
      itemsMigratedToPlans: true,
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
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
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

  let state = loadState();
  let history = loadHistory();
  let drafts = loadDrafts();
  let plans = loadPlans();

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

  // viewingDate is the date currently shown in the タイマー list. It usually
  // tracks state.day, but the day picker can point it at a future date to
  // edit a draft task list without touching today's live tracking.
  let viewingDate = state.day;
  let draftItems = [];

  function isLive() {
    return viewingDate === state.day;
  }

  function currentItemsArray() {
    return isLive() ? state.items : draftItems;
  }

  function persistItemsChange() {
    if (isLive()) {
      saveState();
    } else {
      drafts[viewingDate] = draftItems.map((it) => it.label);
      saveDrafts();
    }
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
      { item: state.sidework, fallback: "別件" },
      { item: state.interrupt, fallback: "割込対応" },
      { item: state.chore, fallback: "雑務" },
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
      state.items = draftForToday.map((label) => freshItem(label));
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
    saveState();

    if (wasFollowingToday) viewingDate = today;
    return true;
  }

  // --- timer list ---

  const list = document.getElementById("list");
  const template = document.getElementById("rowTemplate");
  const totalTimeEl = document.getElementById("totalTime");
  const resetAllBtn = document.getElementById("resetAllBtn");
  const breakdownEl = document.getElementById("breakdown");
  const historyEl = document.getElementById("history");
  const listWrap = document.querySelector(".list-wrap");
  const calendarWeekLabel = document.getElementById("calendarWeekLabel");
  const calendarWeekHeader = document.getElementById("calendarWeekHeader");
  const calendarWeekBody = document.getElementById("calendarWeekBody");
  const calendarHours = document.getElementById("calendarHours");
  const calendarWeekGrid = document.getElementById("calendarWeekGrid");
  const calendarDetail = document.getElementById("calendarDetail");
  const calendarPrevBtn = document.getElementById("calendarPrevBtn");
  const calendarNextBtn = document.getElementById("calendarNextBtn");

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
        if (live && item.planId) {
          const plan = plansForDate(state.day).find((p) => p.id === item.planId);
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

      rowEls.push({ node, input, timeDisplay, toggleBtn, item });
      list.appendChild(node);
    });

    const addRow = document.createElement("button");
    addRow.type = "button";
    addRow.className = "add-row";
    addRow.textContent = "＋ ウォッチの追加";
    addRow.addEventListener("click", addWatch);
    list.appendChild(addRow);
  }

  function addWatch() {
    const items = currentItemsArray();
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
    if (item === state.sidework) return "別件";
    if (item === state.chore) return "雑務";
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

  // --- sidework (別件) widget ---

  const sideworkInput = document.getElementById("sideworkInput");
  const sideworkCircle = document.getElementById("sideworkCircle");
  const sideworkTime = document.getElementById("sideworkTime");
  const sideworkWidget = document.getElementById("sideworkWidget");
  const foldInterruptBtn = document.getElementById("foldInterruptBtn");
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

  foldInterruptBtn.addEventListener("click", () => {
    stopIfRunning(state.sidework);
    const elapsed = state.sidework.elapsedMs;
    if (elapsed <= 0) return;
    const prev = exclusiveGroup().find((it) => it.running);
    if (prev) {
      subtractElapsed(prev, elapsed);
    }
    state.interrupt.elapsedMs += elapsed;
    state.sidework.elapsedMs = 0;
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

  function openNameModal(initial) {
    return openModal({ title: "タスク名を入力", showInput: true, initialValue: initial });
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

  // --- chore (雑務) widget: joins the exclusive group, unlike sidework ---

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
    const { node, item: draggedItem } = dragCtx;

    document.removeEventListener("pointermove", onDragMove);
    document.removeEventListener("pointerup", onDragEnd);
    document.removeEventListener("pointercancel", onDragEnd);

    node.classList.remove("dragging");
    node.style.transition = "transform 0.15s ease";
    node.style.transform = "";

    const domOrder = Array.from(list.children).filter((n) => n.classList.contains("row"));
    rowEls = domOrder.map((n) => rowEls.find((r) => r.node === n));
    const newOrder = rowEls.map((r) => r.item);
    if (isLive()) {
      state.items = newOrder;
      const draggedIndex = newOrder.indexOf(draggedItem);
      if (draggedIndex >= 0) resnapPlanForReorderedItem(newOrder, draggedIndex);
    } else {
      draftItems = newOrder;
    }
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
      empty.textContent = "まだ記録がありません。タイマーを開始してみましょう。";
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
  const CAL_DAYS = 3; // days shown at once; narrower than a full week so columns stay usable on a phone
  const CAL_PALETTE = ["#b8672a", "#3e8c4e", "#5b7596", "#a3651f", "#7a6ba8", "#3f7a75", "#ab3d3d", "#62744c"];

  let weekAnchor = state.day; // any date string within the displayed week
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

  // --- keeping today's timer list and today's plans in sync ---

  // Orders state.items by their linked plan's start time; items with no
  // plan (or whose plan vanished) sort after all planned ones, keeping
  // their existing relative order (Array#sort is stable).
  function sortItemsByPlan() {
    const todays = plansForDate(state.day);
    const startOf = (planId) => {
      const p = planId && todays.find((pl) => pl.id === planId);
      return p ? p.startMin : Infinity;
    };
    state.items.sort((a, b) => {
      const sa = startOf(a.planId);
      const sb = startOf(b.planId);
      return sa === sb ? 0 : sa - sb;
    });
  }

  // After a manual drag reorders the timer list, re-times the moved item's
  // plan so it actually sits in the gap between its new neighbors' plans,
  // instead of leaving the list order and the calendar time out of sync.
  function resnapPlanForReorderedItem(items, index) {
    const item = items[index];
    if (!item.planId) return;
    const todays = plansForDate(state.day);
    const plan = todays.find((p) => p.id === item.planId);
    if (!plan) return;
    const duration = plan.endMin - plan.startMin;

    const prevItem = items[index - 1];
    const nextItem = items[index + 1];
    const prevPlan = prevItem && prevItem.planId ? todays.find((p) => p.id === prevItem.planId) : null;
    const nextPlan = nextItem && nextItem.planId ? todays.find((p) => p.id === nextItem.planId) : null;
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
    if (!isLive()) {
      const stored = drafts[viewingDate];
      draftItems = stored && stored.length ? stored.map((label) => freshItem(label)) : defaultItems();
    }
    dayPicker.value = viewingDate;
    applyModeUI();
    buildRows();
    render();
  }

  function onCalendarHeaderClick(dateStr) {
    if (dateStr >= state.day) {
      goToDate(dateStr);
      goToPage(0);
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
      if (dateStr === state.day) {
        const item = state.items.find((it) => it.planId === plan.id);
        if (item) {
          item.label = plan.label;
          saveState();
          buildRows();
          render();
        }
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
      if (dateStr === state.day) {
        const idx = state.items.findIndex((it) => it.planId === plan.id);
        if (idx >= 0) {
          state.items.splice(idx, 1);
          saveState();
          buildRows();
          render();
        }
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
  const PLAN_LONGPRESS_MS = 500;
  const PLAN_MOVE_TOLERANCE = 8;

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
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      }
      if (scrolling) calendarWeekBody.scrollTop = startScrollTop - dy;
    }
    function onUp() {
      cleanup();
      activeDayPress = null;
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
      createPlanAtPosition(dayCol, dateStr, startY);
    }, PLAN_LONGPRESS_MS);
  }

  async function createPlanAtPosition(dayCol, dateStr, clientY) {
    vibrate(20);
    const rect = dayCol.getBoundingClientRect();
    const relY = clientY - rect.top;
    const rawMin = (relY / rect.height) * 1440;
    let startMin = Math.round(rawMin / 15) * 15;
    startMin = Math.max(0, Math.min(1440 - PLAN_DEFAULT_MIN, startMin));
    const endMin = startMin + PLAN_DEFAULT_MIN;

    const name = await openNameModal("");
    if (name === null) return;
    const label = name.trim() || "予定";
    const id = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    addPlan(dateStr, { id, label, startMin, endMin });

    if (dateStr === state.day) {
      const item = freshItem(label);
      item.planId = id;
      state.items.push(item);
      sortItemsByPlan();
      saveState();
      buildRows();
      render();
    }

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

    const cols = Array.from(calendarWeekGrid.children);
    let targetCol = null;
    for (const col of cols) {
      const rect = col.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX < rect.right) {
        targetCol = col;
        break;
      }
    }
    if (!targetCol) return;

    const rect = targetCol.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const rawMin = (relY / rect.height) * 1440;
    let startMin = Math.round(rawMin / 15) * 15;
    startMin = Math.max(0, Math.min(1440 - planDragCtx.duration, startMin));

    planDragCtx.hoverDate = targetCol.dataset.date;
    planDragCtx.previewStartMin = startMin;
    if (startMin !== planDragCtx.lastVibrateMin) {
      vibrate(8);
      planDragCtx.lastVibrateMin = startMin;
    }

    if (planDragCtx.block.parentElement !== targetCol) targetCol.appendChild(planDragCtx.block);
    planDragCtx.block.style.top = `${(startMin / 1440) * 100}%`;
    planDragCtx.block.style.height = `${(planDragCtx.duration / 1440) * 100}%`;
    planDragCtx.block.style.left = "1px";
    planDragCtx.block.style.width = "calc(100% - 2px)";
  }

  function onPlanDragEnd(e) {
    if (!planDragCtx) return;
    const { block, dateStr, plan, duration, moved, hoverDate, previewStartMin } = planDragCtx;
    document.removeEventListener("pointermove", onPlanDragMove);
    document.removeEventListener("pointerup", onPlanDragEnd);
    document.removeEventListener("pointercancel", onPlanDragEnd);
    block.classList.remove("dragging");
    planDragCtx = null;

    if (!moved) {
      onPlanBlockClick(e, dateStr, plan);
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

    const wasToday = dateStr === state.day;
    const isToday = hoverDate === state.day;
    if (wasToday && isToday) {
      // same-day move: the linked item's time slot changed, keep the list ordered to match
      if (state.items.some((it) => it.planId === movedPlan.id)) {
        sortItemsByPlan();
        saveState();
        buildRows();
        render();
      }
    } else if (wasToday && !isToday) {
      // moved off today: drop the item if nothing was ever tracked on it, otherwise keep
      // the recorded time but unlink it from the (no longer today's) plan
      const idx = state.items.findIndex((it) => it.planId === movedPlan.id);
      if (idx >= 0) {
        if (state.items[idx].elapsedMs > 0 || state.items[idx].running) {
          state.items[idx].planId = null;
        } else {
          state.items.splice(idx, 1);
        }
        saveState();
        buildRows();
        render();
      }
    } else if (!wasToday && isToday) {
      // moved onto today: give it a linked item so it shows up in the timer list
      const item = freshItem(movedPlan.label);
      item.planId = movedPlan.id;
      state.items.push(item);
      sortItemsByPlan();
      saveState();
      buildRows();
      render();
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
    const { dayCol, plan, startClientY } = planResizeCtx;
    const rect = dayCol.getBoundingClientRect();
    const deltaMin = ((e.clientY - startClientY) / rect.height) * 1440;
    let endMin = Math.round((plan.endMin + deltaMin) / 15) * 15;
    endMin = Math.max(plan.startMin + 15, Math.min(1440, endMin));
    planResizeCtx.previewEndMin = endMin;
    if (endMin !== planResizeCtx.lastVibrateMin) {
      vibrate(8);
      planResizeCtx.lastVibrateMin = endMin;
    }
    planResizeCtx.block.style.height = `${((endMin - plan.startMin) / 1440) * 100}%`;
    planResizeCtx.handle.style.top = `${(endMin / 1440) * 100}%`;
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

  // Lays same-day overlapping segments (e.g. a task plus a concurrent 別件
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

    for (let i = 0; i < CAL_DAYS; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

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
        block.style.top = `${(startMinOfDay / 1440) * 100}%`;
        block.style.height = `${(durMin / 1440) * 100}%`;
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
        line.style.top = `${(nowMin / 1440) * 100}%`;
        dayCol.appendChild(line);
        calendarNowLineEl = line;
      }

      if (dateStr >= state.day) {
        layoutSegments(plansForDate(dateStr).map((p) => ({ startMs: p.startMin, endMs: p.endMin, ref: p }))).forEach(
          ({ seg, col, colCount }) => {
            const p = seg.ref;
            const block = document.createElement("div");
            block.className = "cal-plan-block";
            block.style.top = `${(p.startMin / 1440) * 100}%`;
            block.style.height = `${Math.max(1, p.endMin - p.startMin) / 1440 * 100}%`;
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
              handle.style.top = `${(p.endMin / 1440) * 100}%`;
              handle.style.left = `calc(${(col / colCount) * 100}% + ${(1 / colCount) * 50}%)`;
              handle.style.background = color;
              handle.addEventListener("pointerdown", (e) => startPlanResize(e, block, handle, dayCol, dateStr, p));
              dayCol.appendChild(handle);
            }
          }
        );

        dayCol.addEventListener("pointerdown", (e) => onDayColPointerDown(e, dayCol, dateStr));
      }

      calendarWeekGrid.appendChild(dayCol);
    }

    tickCalendarLive();

    renderCalendarDetail();

    if (calendarAutoScrollPending) {
      calendarAutoScrollPending = false;
      requestAnimationFrame(() => {
        const now = new Date();
        const nowHour = now.getHours() + now.getMinutes() / 60;
        calendarWeekBody.scrollTop = Math.max(0, (nowHour - 1.5) * CAL_HOUR_H);
      });
    }
  }

  function tickCalendarLive() {
    if (calendarNowLineEl) {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      calendarNowLineEl.style.top = `${(nowMin / 1440) * 100}%`;
    }
    const now = Date.now();
    calendarLiveBlocks.forEach(({ el, startMs, dayStart }) => {
      const startMinOfDay = Math.max(0, (startMs - dayStart) / 60000);
      const durMin = Math.max(1, (now - startMs) / 60000);
      el.style.top = `${(startMinOfDay / 1440) * 100}%`;
      el.style.height = `${(durMin / 1440) * 100}%`;
    });
  }

  function initCalendarHours() {
    calendarHours.innerHTML = "";
    for (let h = 0; h < 24; h++) {
      const label = document.createElement("div");
      label.className = "cal-hour-label";
      label.style.top = `${h * CAL_HOUR_H}px`;
      label.textContent = `${h}:00`;
      calendarHours.appendChild(label);
    }
  }

  calendarPrevBtn.addEventListener("click", () => shiftCalendarWeek(-1));
  calendarNextBtn.addEventListener("click", () => shiftCalendarWeek(1));

  initCalendarHours();

  // --- tabs / paging ---

  const pages = document.getElementById("pages");
  const tabBtns = Array.from(document.querySelectorAll(".tab-btn"));
  let activePage = 0;

  function setActiveTab(i) {
    if (i !== 3 && activePage === 3 && selectedPlanId) {
      selectedPlanId = null;
      renderCalendar();
    }
    if (i === 3 && activePage !== 3) {
      renderCalendar(); // pick up any plan/label changes made from the timer tab
    }
    activePage = i;
    tabBtns.forEach((b, idx) => b.classList.toggle("active", idx === i));
  }

  function goToPage(i) {
    pages.scrollTo({ left: i * pages.clientWidth, behavior: "smooth" });
    setActiveTab(i);
  }

  tabBtns.forEach((btn, i) => btn.addEventListener("click", () => goToPage(i)));

  pages.addEventListener(
    "scroll",
    () => {
      const i = Math.round(pages.scrollLeft / pages.clientWidth);
      if (i !== activePage) setActiveTab(i);
    },
    { passive: true }
  );

  window.addEventListener("resize", () => {
    pages.scrollTo({ left: activePage * pages.clientWidth });
  });

  // --- day picker / draft mode ---

  const dayPicker = document.getElementById("dayPicker");
  const draftBadge = document.getElementById("draftBadge");
  const liveOnlyControls = [sideworkCircle, choreCircle, foldInterruptBtn, deductPrevBtn, newTaskBtn, resetAllBtn];

  function applyModeUI() {
    const live = isLive();
    draftBadge.hidden = live;
    dayPicker.classList.toggle("is-draft", !live);
    liveOnlyControls.forEach((btn) => {
      btn.disabled = !live;
    });
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
  dayPicker.value = viewingDate;
  applyModeUI();
  buildRows();
  render();
  renderHistory();

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
