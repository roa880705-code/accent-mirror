(() => {
  const STORAGE_KEY = "todoStopwatch:v2";
  const ITEM_COUNT = 12;
  const PRESETS = ["休憩", "作業", "移動", "食事", "運動", "睡眠", "学習", "家事", "買い物", "趣味", "その他"];
  const OTHER = "その他";
  const DEFAULT_PICKS = ["休憩", "作業", "移動", "食事", "運動", "睡眠", "学習", "家事", "買い物", "趣味", OTHER, OTHER];

  function defaultState() {
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
        if (Array.isArray(parsed) && parsed.length === ITEM_COUNT) {
          return parsed;
        }
      }
    } catch (e) {
      // corrupt storage, fall through to defaults
    }
    return defaultState();
  }

  let state = loadState();

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  const grid = document.getElementById("grid");
  const template = document.getElementById("tileTemplate");
  const totalTimeEl = document.getElementById("totalTime");
  const resetAllBtn = document.getElementById("resetAllBtn");

  const tileEls = [];

  function otherOptionOf(select) {
    return Array.from(select.options).find((opt) => opt.value === OTHER);
  }

  function syncOtherOptionLabel(select, item) {
    otherOptionOf(select).textContent = item.custom.trim() || OTHER;
  }

  function promptForCustomName(index, select) {
    const item = state[index];
    const name = window.prompt("項目名を入力してください", item.custom);
    if (name !== null) {
      item.custom = name;
      syncOtherOptionLabel(select, item);
      saveState();
    }
    render();
  }

  function buildTiles() {
    state.forEach((item, index) => {
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
        state[index].select = select.value;
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

      tileEls.push({ node, select, circle, timeDisplay });
      grid.appendChild(node);
    });
  }

  function toggleItem(index) {
    const now = Date.now();
    const target = state[index];

    if (target.running) {
      target.elapsedMs += now - target.startedAt;
      target.running = false;
      target.startedAt = null;
    } else {
      state.forEach((item, i) => {
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
    const item = state[index];
    if (!window.confirm(`「${labelOf(item)}」の記録をリセットしますか?`)) {
      return;
    }
    item.elapsedMs = 0;
    item.running = false;
    item.startedAt = null;
    saveState();
    render();
  }

  resetAllBtn.addEventListener("click", () => {
    if (!window.confirm("今日の記録をすべてリセットしますか?この操作は取り消せません。")) {
      return;
    }
    state.forEach((item) => {
      item.elapsedMs = 0;
      item.running = false;
      item.startedAt = null;
    });
    saveState();
    render();
  });

  function render() {
    let total = 0;
    state.forEach((item, index) => {
      const elapsed = currentElapsed(item);
      total += elapsed;
      const { node, timeDisplay, circle } = tileEls[index];
      timeDisplay.textContent = formatTime(elapsed);
      node.classList.toggle("running", item.running);
      circle.setAttribute(
        "aria-label",
        `${labelOf(item)} ${formatTime(elapsed)} ${item.running ? "停止する" : "開始する"}`
      );
    });
    totalTimeEl.textContent = formatTime(total);
  }

  buildTiles();
  render();
  setInterval(() => {
    render();
    saveState();
  }, 1000);

  window.addEventListener("beforeunload", saveState);
})();
