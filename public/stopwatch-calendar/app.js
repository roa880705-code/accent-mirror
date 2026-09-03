(() => {
  "use strict";

  const STORAGE_KEY = "stopwatch-calendar-v1";
  const HOUR_HEIGHT = 56;
  const MIN_BLOCK_HEIGHT = 15;
  const WEEKDAY_JP = ["日", "月", "火", "水", "木", "金", "土"];
  const COLOR_PALETTE = [
    "#4361ee", "#e5484d", "#2a9d8f", "#f4a261", "#8338ec",
    "#3a86ff", "#ff6392", "#06a77d", "#e07a5f", "#5f6caf"
  ];

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { stopwatches: [], sessions: [], colorCursor: 0 };
      const parsed = JSON.parse(raw);
      return {
        stopwatches: Array.isArray(parsed.stopwatches) ? parsed.stopwatches : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        colorCursor: Number(parsed.colorCursor) || 0
      };
    } catch {
      return { stopwatches: [], sessions: [], colorCursor: 0 };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  const state = loadState();
  let currentWeekStart = startOfWeek(new Date());
  let selectedSessionId = null;

  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function nextColor() {
    const color = COLOR_PALETTE[state.colorCursor % COLOR_PALETTE.length];
    state.colorCursor += 1;
    return color;
  }

  function startOfWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function isSameDate(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatElapsed(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  }

  function formatDurationShort(ms) {
    const totalMinutes = Math.max(0, Math.round(ms / 60000));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m}分`;
    if (m === 0) return `${h}時間`;
    return `${h}時間${m}分`;
  }

  function formatClockTime(ts) {
    const d = new Date(ts);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  function elapsedForStopwatch(sw, now) {
    return sw.accumulatedMs + (sw.running ? now - sw.startedAt : 0);
  }

  function getLiveSessions(now) {
    return state.stopwatches
      .filter((sw) => sw.running)
      .map((sw) => ({
        id: `live-${sw.id}`,
        stopwatchId: sw.id,
        name: sw.name,
        color: sw.color,
        startTs: sw.startedAt,
        endTs: now,
        live: true
      }));
  }

  // A session can span midnight (e.g. left running overnight); split it into
  // per-day segments clipped to each day's [00:00, 24:00) so it renders
  // correctly across the day columns it actually crosses.
  function splitSessionByDay(session, dayStart, dayEnd) {
    const start = Math.max(session.startTs, dayStart.getTime());
    const end = Math.min(session.endTs, dayEnd.getTime());
    if (end <= start) return null;
    return { ...session, startTs: start, endTs: end };
  }

  function weekSessionsForStopwatch(stopwatchId, weekStart, now) {
    const weekEnd = addDays(weekStart, 7).getTime();
    const all = [...state.sessions, ...getLiveSessions(now)];
    let total = 0;
    for (const s of all) {
      if (s.stopwatchId !== stopwatchId) continue;
      const start = Math.max(s.startTs, weekStart.getTime());
      const end = Math.min(s.endTs, weekEnd);
      if (end > start) total += end - start;
    }
    return total;
  }

  // --- DOM refs ---
  const stopwatchListEl = document.getElementById("stopwatch-list");
  const stopwatchEmptyEl = document.getElementById("stopwatch-empty");
  const addForm = document.getElementById("add-stopwatch-form");
  const newNameInput = document.getElementById("new-stopwatch-name");
  const calendarRangeEl = document.getElementById("calendar-range");
  const timeGutterEl = document.getElementById("time-gutter");
  const dayColumnsEl = document.getElementById("day-columns");
  const calendarScrollEl = document.getElementById("calendar-scroll");
  const prevWeekBtn = document.getElementById("prev-week");
  const nextWeekBtn = document.getElementById("next-week");
  const todayBtn = document.getElementById("today-btn");
  const sessionDetailEl = document.getElementById("session-detail");
  const sessionDetailSwatch = document.getElementById("session-detail-swatch");
  const sessionDetailName = document.getElementById("session-detail-name");
  const sessionDetailRange = document.getElementById("session-detail-range");
  const sessionDetailDelete = document.getElementById("session-detail-delete");
  const sessionDetailClose = document.getElementById("session-detail-close");

  document.documentElement.style.setProperty("--hour-height", `${HOUR_HEIGHT}px`);

  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = newNameInput.value.trim();
    if (!name) return;
    state.stopwatches.push({
      id: uid(),
      name,
      color: nextColor(),
      running: false,
      startedAt: null,
      accumulatedMs: 0
    });
    newNameInput.value = "";
    saveState();
    renderAll();
  });

  prevWeekBtn.addEventListener("click", () => {
    currentWeekStart = addDays(currentWeekStart, -7);
    renderCalendar();
  });

  nextWeekBtn.addEventListener("click", () => {
    currentWeekStart = addDays(currentWeekStart, 7);
    renderCalendar();
  });

  todayBtn.addEventListener("click", () => {
    currentWeekStart = startOfWeek(new Date());
    renderCalendar();
    scrollToNow();
  });

  sessionDetailClose.addEventListener("click", () => {
    selectedSessionId = null;
    renderCalendar();
  });

  sessionDetailDelete.addEventListener("click", () => {
    if (!selectedSessionId) return;
    const idx = state.sessions.findIndex((s) => s.id === selectedSessionId);
    if (idx !== -1) {
      state.sessions.splice(idx, 1);
      saveState();
    }
    selectedSessionId = null;
    renderCalendar();
  });

  function startStopwatch(sw) {
    if (sw.running) return;
    sw.running = true;
    sw.startedAt = Date.now();
  }

  function pauseStopwatch(sw) {
    if (!sw.running) return;
    const now = Date.now();
    state.sessions.push({
      id: uid(),
      stopwatchId: sw.id,
      name: sw.name,
      color: sw.color,
      startTs: sw.startedAt,
      endTs: now
    });
    sw.accumulatedMs += now - sw.startedAt;
    sw.running = false;
    sw.startedAt = null;
  }

  function resetStopwatch(sw) {
    if (sw.running) pauseStopwatch(sw);
    sw.accumulatedMs = 0;
  }

  function deleteStopwatch(id) {
    const sw = state.stopwatches.find((s) => s.id === id);
    if (sw && sw.running) pauseStopwatch(sw);
    state.stopwatches = state.stopwatches.filter((s) => s.id !== id);
    saveState();
    renderAll();
  }

  function renameStopwatch(sw) {
    const name = prompt("新しい名前を入力してください", sw.name);
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    sw.name = trimmed;
    state.sessions.forEach((s) => {
      if (s.stopwatchId === sw.id) s.name = trimmed;
    });
    saveState();
    renderAll();
  }

  function renderStopwatches() {
    const now = Date.now();
    stopwatchListEl.innerHTML = "";
    stopwatchEmptyEl.style.display = state.stopwatches.length ? "none" : "block";

    for (const sw of state.stopwatches) {
      const li = document.createElement("li");
      li.className = `stopwatch-item${sw.running ? " running" : ""}`;
      li.style.setProperty("--sw-color", sw.color);
      li.style.borderLeftColor = sw.color;

      const nameRow = document.createElement("div");
      nameRow.className = "stopwatch-name-row";

      const dot = document.createElement("span");
      dot.className = "dot";
      nameRow.appendChild(dot);

      const nameBtn = document.createElement("button");
      nameBtn.type = "button";
      nameBtn.className = "stopwatch-name";
      nameBtn.textContent = sw.name;
      nameBtn.title = "クリックして名前を変更";
      nameBtn.addEventListener("click", () => renameStopwatch(sw));
      nameRow.appendChild(nameBtn);

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "stopwatch-delete-btn";
      delBtn.textContent = "削除";
      delBtn.addEventListener("click", () => {
        if (confirm(`「${sw.name}」を削除しますか?(記録済みの時間帯はカレンダーに残ります)`)) {
          deleteStopwatch(sw.id);
        }
      });
      nameRow.appendChild(delBtn);

      li.appendChild(nameRow);

      const elapsedEl = document.createElement("div");
      elapsedEl.className = "stopwatch-elapsed";
      elapsedEl.textContent = formatElapsed(elapsedForStopwatch(sw, now));
      li.appendChild(elapsedEl);

      const weekTotalEl = document.createElement("div");
      weekTotalEl.className = "stopwatch-week-total";
      weekTotalEl.textContent = `今週の合計: ${formatDurationShort(weekSessionsForStopwatch(sw.id, currentWeekStart, now))}`;
      li.appendChild(weekTotalEl);

      const controls = document.createElement("div");
      controls.className = "stopwatch-controls";

      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "primary";
      toggleBtn.textContent = sw.running ? "一時停止" : "スタート";
      toggleBtn.addEventListener("click", () => {
        if (sw.running) pauseStopwatch(sw); else startStopwatch(sw);
        saveState();
        renderAll();
      });
      controls.appendChild(toggleBtn);

      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.textContent = "リセット";
      resetBtn.addEventListener("click", () => {
        resetStopwatch(sw);
        saveState();
        renderAll();
      });
      controls.appendChild(resetBtn);

      li.appendChild(controls);
      stopwatchListEl.appendChild(li);
    }
  }

  function buildTimeGutter() {
    timeGutterEl.innerHTML = "";
    for (let h = 0; h < 24; h++) {
      const label = document.createElement("div");
      label.className = "time-gutter-label";
      label.textContent = `${h}:00`;
      timeGutterEl.appendChild(label);
    }
  }

  function showSessionDetail(session) {
    selectedSessionId = session.id;
    sessionDetailEl.hidden = false;
    sessionDetailSwatch.style.background = session.color;
    sessionDetailName.textContent = session.name;
    sessionDetailRange.textContent = `${formatClockTime(session.startTs)} - ${formatClockTime(session.endTs)} (${formatDurationShort(session.endTs - session.startTs)})`;
    sessionDetailDelete.style.display = session.live ? "none" : "inline-block";
  }

  function renderCalendar() {
    const now = new Date();
    const weekEnd = addDays(currentWeekStart, 6);
    calendarRangeEl.textContent = `${currentWeekStart.getFullYear()}年${currentWeekStart.getMonth() + 1}月${currentWeekStart.getDate()}日 - ${weekEnd.getMonth() + 1}月${weekEnd.getDate()}日`;

    dayColumnsEl.innerHTML = "";
    const liveSessions = getLiveSessions(now.getTime());
    const allSessions = [...state.sessions, ...liveSessions];

    let stillSelected = false;

    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(currentWeekStart, i);
      const dayStart = new Date(dayDate);
      const dayEnd = addDays(dayStart, 1);
      const isToday = isSameDate(dayDate, now);

      const wrap = document.createElement("div");
      wrap.className = "day-column-wrap";

      const header = document.createElement("div");
      header.className = `day-header${isToday ? " today" : ""}`;
      header.textContent = `${dayDate.getMonth() + 1}/${dayDate.getDate()} (${WEEKDAY_JP[dayDate.getDay()]})`;
      wrap.appendChild(header);

      const col = document.createElement("div");
      col.className = `day-column${isToday ? " today" : ""}`;

      for (const session of allSessions) {
        const seg = splitSessionByDay(session, dayStart, dayEnd);
        if (!seg) continue;
        const startMinutes = (seg.startTs - dayStart.getTime()) / 60000;
        const durationMinutes = (seg.endTs - seg.startTs) / 60000;
        const top = (startMinutes / 60) * HOUR_HEIGHT;
        const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, MIN_BLOCK_HEIGHT);

        const block = document.createElement("div");
        block.className = `session-block${seg.live ? " live" : ""}${selectedSessionId === session.id ? " selected" : ""}`;
        block.style.top = `${top}px`;
        block.style.height = `${height}px`;
        block.style.background = seg.color;

        const nameSpan = document.createElement("span");
        nameSpan.className = "sb-name";
        nameSpan.textContent = seg.name;
        block.appendChild(nameSpan);

        const timeSpan = document.createElement("span");
        timeSpan.className = "sb-time";
        timeSpan.textContent = `${formatClockTime(seg.startTs)}-${seg.live ? "…" : formatClockTime(seg.endTs)}`;
        block.appendChild(timeSpan);

        block.addEventListener("click", () => {
          showSessionDetail(session);
          renderCalendar();
        });

        col.appendChild(block);
        if (selectedSessionId === session.id) stillSelected = true;
      }

      if (isToday) {
        const nowMinutes = (now.getTime() - dayStart.getTime()) / 60000;
        const nowLine = document.createElement("div");
        nowLine.className = "now-line";
        nowLine.style.top = `${(nowMinutes / 60) * HOUR_HEIGHT}px`;
        col.appendChild(nowLine);
      }

      wrap.appendChild(col);
      dayColumnsEl.appendChild(wrap);
    }

    if (!stillSelected) {
      selectedSessionId = null;
      sessionDetailEl.hidden = true;
    }
  }

  function scrollToNow() {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const target = (nowMinutes / 60) * HOUR_HEIGHT - calendarScrollEl.clientHeight / 2;
    calendarScrollEl.scrollTop = Math.max(0, target);
  }

  function renderAll() {
    renderStopwatches();
    renderCalendar();
  }

  buildTimeGutter();
  renderAll();
  scrollToNow();

  setInterval(() => {
    renderStopwatches();
    renderCalendar();
  }, 1000);

  window.addEventListener("beforeunload", saveState);
})();
