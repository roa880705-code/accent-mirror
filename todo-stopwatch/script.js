(() => {
  const STORAGE_KEY = "todoStopwatch:v6";
  const HISTORY_KEY = "todoStopwatch:history:v1";
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
    return { label: label || "", elapsedMs: 0, running: false, startedAt: null };
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
          return parsed;
        }
      }
    } catch (e) {
      // corrupt storage, fall through to defaults
    }
    return {
      day: todayStr(),
      items: defaultItems(),
      sidework: freshItem("別件"),
      interrupt: freshItem("割込対応"),
      chore: freshItem("雑務"),
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

  let state = loadState();
  let history = loadHistory();

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function saveHistory() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
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

    const record = { date: dayStr, totalMs, items: snapshot };
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
    if (state.day === today) return;
    archiveDay(state.day);
    state.items.forEach((it) => {
      if (it.running) it.startedAt = Date.now();
      it.elapsedMs = 0;
    });
    if (state.sidework.running) state.sidework.startedAt = Date.now();
    state.sidework.elapsedMs = 0;
    if (state.chore.running) state.chore.startedAt = Date.now();
    state.chore.elapsedMs = 0;
    state.interrupt.elapsedMs = 0;
    state.day = today;
    saveState();
  }

  // --- timer list ---

  const list = document.getElementById("list");
  const template = document.getElementById("rowTemplate");
  const totalTimeEl = document.getElementById("totalTime");
  const resetAllBtn = document.getElementById("resetAllBtn");
  const breakdownEl = document.getElementById("breakdown");
  const historyEl = document.getElementById("history");
  const listWrap = document.querySelector(".list-wrap");

  let rowEls = [];

  function buildRows() {
    list.innerHTML = "";
    rowEls = [];
    state.items.forEach((item) => {
      const node = template.content.firstElementChild.cloneNode(true);
      const input = node.querySelector(".row-input");
      const timeDisplay = node.querySelector(".row-time");
      const toggleBtn = node.querySelector(".row-toggle");
      const resetBtn = node.querySelector(".row-reset");
      const handle = node.querySelector(".row-handle");

      input.value = item.label;
      input.addEventListener("input", () => {
        item.label = input.value;
        saveState();
      });

      toggleBtn.addEventListener("click", () => toggleExclusive(item));
      resetBtn.addEventListener("click", () => resetItem(item));
      handle.addEventListener("pointerdown", (e) => startDrag(e, node));

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
    if (state.items.length >= MAX_COUNT) return;
    state.items.push(freshItem(""));
    saveState();
    buildRows();
    render();
    requestAnimationFrame(() => {
      listWrap.scrollTop = listWrap.scrollHeight;
    });
  }

  function stopIfRunning(item) {
    if (!item.running) return;
    item.elapsedMs += Date.now() - item.startedAt;
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

  function resetItem(item) {
    const index = state.items.indexOf(item);
    if (!window.confirm(`「${labelOf(item, `タスク${index + 1}`)}」の記録をリセットしますか?(履歴には保存されません)`)) {
      return;
    }
    item.elapsedMs = 0;
    item.running = false;
    item.startedAt = null;
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

  // --- name modal (custom, since window.prompt is blocked in sandboxed views) ---

  const nameModal = document.getElementById("nameModal");
  const nameModalInput = document.getElementById("nameModalInput");
  const nameModalOk = document.getElementById("nameModalOk");
  const nameModalCancel = document.getElementById("nameModalCancel");

  function openNameModal(initial) {
    return new Promise((resolve) => {
      nameModalInput.value = initial;
      nameModal.hidden = false;
      nameModalInput.focus();
      nameModalInput.select();

      function cleanup(result) {
        nameModal.hidden = true;
        nameModalOk.removeEventListener("click", onOk);
        nameModalCancel.removeEventListener("click", onCancel);
        nameModal.removeEventListener("mousedown", onBackdrop);
        nameModalInput.removeEventListener("keydown", onKeydown);
        resolve(result);
      }
      function onOk() {
        cleanup(nameModalInput.value);
      }
      function onCancel() {
        cleanup(null);
      }
      function onBackdrop(e) {
        if (e.target === nameModal) cleanup(null);
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
      nameModalInput.addEventListener("keydown", onKeydown);
    });
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

  function startDrag(e, node) {
    if (e.button !== undefined && e.button !== 0) return;
    dragCtx = {
      node,
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
    const { node } = dragCtx;

    document.removeEventListener("pointermove", onDragMove);
    document.removeEventListener("pointerup", onDragEnd);
    document.removeEventListener("pointercancel", onDragEnd);

    node.classList.remove("dragging");
    node.style.transition = "transform 0.15s ease";
    node.style.transform = "";

    const domOrder = Array.from(list.children).filter((n) => n.classList.contains("row"));
    rowEls = domOrder.map((n) => rowEls.find((r) => r.node === n));
    state.items = rowEls.map((r) => r.item);
    saveState();
    render();

    setTimeout(() => {
      node.style.transition = "";
    }, 160);
    dragCtx = null;
  }

  resetAllBtn.addEventListener("click", () => {
    if (!window.confirm("今日の記録を履歴に保存してリセットします。よろしいですか?")) {
      return;
    }
    archiveDay(state.day);
    resetAllTracking();
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

  // --- tabs / paging ---

  const pages = document.getElementById("pages");
  const tabBtns = Array.from(document.querySelectorAll(".tab-btn"));
  let activePage = 0;

  function setActiveTab(i) {
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

  // --- main render loop ---

  function render() {
    let total = 0;
    state.items.forEach((item, index) => {
      const elapsed = currentElapsed(item);
      total += elapsed;
      const { node, timeDisplay, toggleBtn, input } = rowEls[index];
      timeDisplay.textContent = formatTime(elapsed);
      node.classList.toggle("running", item.running);
      toggleBtn.textContent = item.running ? "停止" : "開始";
      input.disabled = item.running;
      input.title = item.running ? "実行中は変更できません" : "";
    });

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
  }

  rolloverIfNeeded();
  buildRows();
  render();
  renderHistory();

  setInterval(() => {
    rolloverIfNeeded();
    render();
    saveState();
  }, 1000);

  window.addEventListener("beforeunload", saveState);
})();
