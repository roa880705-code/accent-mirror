(() => {
  const STORAGE_KEY = "todoStopwatch:v1";
  const ITEM_COUNT = 12;
  const DEFAULT_LABELS = ["休憩", "作業", "移動", "食事", "運動"];

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
    return Array.from({ length: ITEM_COUNT }, (_, i) => ({
      label: DEFAULT_LABELS[i] || "",
      elapsedMs: 0,
      running: false,
      startedAt: null,
    }));
  }

  let state = loadState();

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  const template = document.getElementById("cardTemplate");
  const totalTimeEl = document.getElementById("totalTime");
  const resetAllBtn = document.getElementById("resetAllBtn");

  const cardEls = [];

  function buildCards() {
    state.forEach((item, index) => {
      const node = template.content.firstElementChild.cloneNode(true);
      const labelInput = node.querySelector(".label-input");
      const timeDisplay = node.querySelector(".time-display");
      const toggleBtn = node.querySelector(".btn-toggle");
      const resetBtn = node.querySelector(".btn-reset");

      labelInput.value = item.label;
      labelInput.addEventListener("input", () => {
        state[index].label = labelInput.value;
        saveState();
      });

      toggleBtn.addEventListener("click", () => toggleItem(index));
      resetBtn.addEventListener("click", () => resetItem(index));

      cardEls.push({ node, labelInput, timeDisplay, toggleBtn });
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
    const label = item.label || `項目${index + 1}`;
    if (!window.confirm(`「${label}」の記録をリセットしますか?`)) {
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
      const { node, timeDisplay, toggleBtn } = cardEls[index];
      timeDisplay.textContent = formatTime(elapsed);
      toggleBtn.textContent = item.running ? "停止" : "開始";
      node.classList.toggle("running", item.running);
    });
    totalTimeEl.textContent = formatTime(total);
  }

  buildCards();
  render();
  setInterval(() => {
    render();
    saveState();
  }, 1000);

  window.addEventListener("beforeunload", saveState);
})();
