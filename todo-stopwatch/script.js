(() => {
  const STORAGE_KEY = "todoStopwatch:v3";
  const HISTORY_KEY = "todoStopwatch:history:v1";
  const MAX_HISTORY = 60;
  const ITEM_COUNT = 12;
  const PRESETS = ["休憩", "作業", "移動", "食事", "運動", "睡眠", "学習", "家事", "買い物", "趣味", "その他"];
  const OTHER = "その他";
  const DEFAULT_PICKS = ["休憩", "作業", "移動", "食事", "運動", "睡眠", "学習", "家事", "買い物", "趣味", OTHER, OTHER];
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

  function defaultItems() {
    return Array.from({ length: ITEM_COUNT }, (_, i) => ({
      select: DEFAULT_PICKS[i] || OTHER,
      custom: "",
      elapsedMs: 0,
      running: false,
      startedAt: null,
    }));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.day === "string" && Array.isArray(parsed.items) && parsed.items.length === ITEM_COUNT) {
          return parsed;
        }
      }
    } catch (e) {
      // corrupt storage, fall through to defaults
    }
    return { day: todayStr(), items: defaultItems() };
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

  function labelOf(item) {
    if (item.select === OTHER) {
      return item.custom.trim() || OTHER;
    }
    return item.select;
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

  // --- history archiving ---

  function archiveDay(dayStr, items) {
    const snapshot = items
      .map((it) => ({ label: labelOf(it), elapsedMs: currentElapsed(it) }))
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

  function rolloverIfNeeded() {
    const today = todayStr();
    if (state.day === today) return;
    archiveDay(state.day, state.items);
    state.items.forEach((it) => {
      if (it.running) it.startedAt = Date.now();
      it.elapsedMs = 0;
    });
    state.day = today;
    saveState();
  }

  // --- timer grid ---

  const grid = document.getElementById("grid");
  const template = document.getElementById("tileTemplate");
  const totalTimeEl = document.getElementById("totalTime");
  const resetAllBtn = document.getElementById("resetAllBtn");
  const breakdownEl = document.getElementById("breakdown");
  const historyEl = document.getElementById("history");

  const tileEls = [];

  function otherOptionOf(select) {
    return Array.from(select.options).find((opt) => opt.value === OTHER);
  }

  function syncOtherOptionLabel(select, item) {
    otherOptionOf(select).textContent = item.custom.trim() || OTHER;
  }

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

  async function promptForCustomName(index, select) {
    const item = state.items[index];
    if (item.running) return;
    const name = await openNameModal(item.custom);
    if (name !== null) {
      item.custom = name;
      syncOtherOptionLabel(select, item);
      saveState();
    }
    render();
  }

  function buildTiles() {
    state.items.forEach((item, index) => {
      const node = template.content.firstElementChild.cloneNode(true);
      const select = node.querySelector(".label-select");
      const editBtn = node.querySelector(".edit-btn");
      const circle = node.querySelector(".circle");
      const timeDisplay = node.querySelector(".time-display");
      const resetBtn = node.querySelector(".reset-btn");

      PRESETS.forEach((preset) => {
        const opt = document.createElement("option");
        opt.value = preset;
        opt.textContent = preset;
        select.appendChild(opt);
      });
      select.value = item.select;
      syncOtherOptionLabel(select, item);
      editBtn.hidden = item.select !== OTHER;

      select.addEventListener("change", () => {
        state.items[index].select = select.value;
        editBtn.hidden = select.value !== OTHER;
        saveState();
        if (select.value === OTHER) {
          promptForCustomName(index, select);
        } else {
          render();
        }
      });

      editBtn.addEventListener("click", () => promptForCustomName(index, select));

      circle.addEventListener("click", () => toggleItem(index));
      resetBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        resetItem(index);
      });

      tileEls.push({ node, select, editBtn, circle, timeDisplay });
      grid.appendChild(node);
    });
  }

  function toggleItem(index) {
    const now = Date.now();
    const target = state.items[index];

    if (target.running) {
      target.elapsedMs += now - target.startedAt;
      target.running = false;
      target.startedAt = null;
    } else {
      state.items.forEach((item, i) => {
        if (i !== index && item.running) {
          item.elapsedMs += now - item.startedAt;
          item.running = false;
          item.startedAt = null;
        }
      });
      target.running = true;
      target.startedAt = now;
    }

    saveState();
    render();
  }

  function resetItem(index) {
    const item = state.items[index];
    if (!window.confirm(`「${labelOf(item)}」の記録をリセットしますか?(履歴には保存されません)`)) {
      return;
    }
    item.elapsedMs = 0;
    item.running = false;
    item.startedAt = null;
    saveState();
    render();
  }

  resetAllBtn.addEventListener("click", () => {
    if (!window.confirm("今日の記録を履歴に保存してリセットします。よろしいですか?")) {
      return;
    }
    archiveDay(state.day, state.items);
    state.items.forEach((item) => {
      item.elapsedMs = 0;
      item.running = false;
      item.startedAt = null;
    });
    saveState();
    renderHistory();
    render();
  });

  // --- breakdown page ---

  function renderBreakdown() {
    const rows = state.items
      .map((item) => ({ label: labelOf(item), elapsed: currentElapsed(item), running: item.running }))
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
      const { node, timeDisplay, circle, select, editBtn } = tileEls[index];
      timeDisplay.textContent = formatTime(elapsed);
      node.classList.toggle("running", item.running);
      circle.setAttribute(
        "aria-label",
        `${labelOf(item)} ${formatTime(elapsed)} ${item.running ? "停止する" : "開始する"}`
      );
      select.disabled = item.running;
      select.title = item.running ? "実行中は変更できません" : "";
      editBtn.disabled = item.running;
      editBtn.title = item.running ? "実行中は変更できません" : "名前を編集";
    });
    totalTimeEl.textContent = formatTime(total);
    renderBreakdown();
  }

  rolloverIfNeeded();
  buildTiles();
  render();
  renderHistory();

  setInterval(() => {
    rolloverIfNeeded();
    render();
    saveState();
  }, 1000);

  window.addEventListener("beforeunload", saveState);
})();
