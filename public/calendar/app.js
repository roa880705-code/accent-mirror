(() => {
  "use strict";

  const STORAGE_KEY = "calendar-app-v1";
  const HOUR_HEIGHT = 48;
  const MIN_BLOCK_HEIGHT = 16;
  const SNAP_MIN = 15;
  const MIN_DURATION_MIN = 15;
  const CLICK_THRESHOLD_PX = 5;
  const WEEKDAY_JP = ["日", "月", "火", "水", "木", "金", "土"];
  const COLOR_PALETTE = ["#d5473c", "#e8710a", "#c98a2c", "#33b679", "#039be5", "#3f51b5", "#8e24aa", "#5f6368"];
  const DEFAULT_COLOR = COLOR_PALETTE[4];

  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function buildSeedEvents() {
    function at(daysFromToday, hour, minute) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + daysFromToday);
      d.setHours(hour, minute, 0, 0);
      return d.getTime();
    }
    return [
      { id: uid(), title: "チームMTG", color: "#039be5", startTs: at(0, 10, 0), endTs: at(0, 11, 0) },
      { id: uid(), title: "ランチ", color: "#33b679", startTs: at(0, 12, 0), endTs: at(0, 13, 0) },
      { id: uid(), title: "資料作成", color: "#5f6368", startTs: at(0, 14, 0), endTs: at(0, 15, 30) },
      { id: uid(), title: "1on1", color: "#8e24aa", startTs: at(1, 11, 0), endTs: at(1, 11, 30) },
      { id: uid(), title: "プロジェクトレビュー", color: "#d5473c", startTs: at(1, 15, 0), endTs: at(1, 16, 0) },
      { id: uid(), title: "ジム", color: "#e8710a", startTs: at(-1, 19, 0), endTs: at(-1, 20, 0) },
      { id: uid(), title: "歯医者", color: "#c98a2c", startTs: at(2, 9, 30), endTs: at(2, 10, 0) }
    ];
  }

  function loadEvents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return buildSeedEvents();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : buildSeedEvents();
    } catch {
      return buildSeedEvents();
    }
  }

  function saveEvents() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(events)); } catch {}
  }

  let events = loadEvents();
  let currentWeekStart = startOfWeek(new Date());
  let popoverEventId = null;
  let popoverIsNew = false;
  let suppressNextOutsideClose = false;

  function startOfWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }
  function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
  function isSameDate(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function formatClockTime(ts) {
    const d = new Date(ts);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
  function snapMinutes(raw) { return Math.round(raw / SNAP_MIN) * SNAP_MIN; }
  function minutesFromY(clientY, colTop) { return ((clientY - colTop) / HOUR_HEIGHT) * 60; }

  // An event can span midnight; split it into per-day segments clipped to
  // [00:00, 24:00) so it renders correctly across every day column it crosses.
  function splitEventByDay(ev, dayStart, dayEnd) {
    const start = Math.max(ev.startTs, dayStart.getTime());
    const end = Math.min(ev.endTs, dayEnd.getTime());
    if (end <= start) return null;
    return { ...ev, startTs: start, endTs: end };
  }

  // Lay same-day overlapping events out side-by-side (like Google Calendar)
  // instead of fully stacking them: a simple greedy column assignment.
  function layoutColumns(segments) {
    const sorted = [...segments].sort((a, b) => a.startTs - b.startTs);
    const columns = []; // each entry: last endTs placed in that column
    const placed = sorted.map((seg) => {
      let col = columns.findIndex((endTs) => endTs <= seg.startTs);
      if (col === -1) { col = columns.length; columns.push(0); }
      columns[col] = seg.endTs;
      return { seg, col };
    });
    // Width per event is driven by how many columns are in use during its
    // own time span, not the sheet-wide total, so a cluster of 2 overlapping
    // events still renders at 50% width even if another cluster used 3.
    return placed.map(({ seg, col }) => {
      const overlapping = placed.filter(
        (p) => p.seg.startTs < seg.endTs && p.seg.endTs > seg.startTs
      );
      const clusterCols = Math.max(...overlapping.map((p) => p.col)) + 1;
      return { seg, col, cols: Math.max(clusterCols, 1) };
    });
  }

  const calendarRangeEl = document.getElementById("calendar-range");
  const timeGutterEl = document.getElementById("time-gutter");
  const dayColumnsEl = document.getElementById("day-columns");
  const calendarScrollEl = document.getElementById("calendar-scroll");
  const prevWeekBtn = document.getElementById("prev-week");
  const nextWeekBtn = document.getElementById("next-week");
  const todayBtn = document.getElementById("today-btn");
  const popoverEl = document.getElementById("popover");
  const popoverTitleEl = document.getElementById("popover-title");
  const popoverTimeEl = document.getElementById("popover-time");
  const popoverColorsEl = document.getElementById("popover-colors");
  const popoverDeleteBtn = document.getElementById("popover-delete");
  const popoverDoneBtn = document.getElementById("popover-done");

  document.documentElement.style.setProperty("--hour-height", `${HOUR_HEIGHT}px`);

  COLOR_PALETTE.forEach((color) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "color-swatch";
    btn.style.background = color;
    btn.dataset.color = color;
    btn.addEventListener("click", () => {
      const ev = events.find((e) => e.id === popoverEventId);
      if (!ev) return;
      ev.color = color;
      highlightSwatch(color);
      renderCalendar();
    });
    popoverColorsEl.appendChild(btn);
  });

  function highlightSwatch(color) {
    popoverColorsEl.querySelectorAll(".color-swatch").forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.color === color);
    });
  }

  prevWeekBtn.addEventListener("click", () => { currentWeekStart = addDays(currentWeekStart, -7); renderCalendar(); });
  nextWeekBtn.addEventListener("click", () => { currentWeekStart = addDays(currentWeekStart, 7); renderCalendar(); });
  todayBtn.addEventListener("click", () => { currentWeekStart = startOfWeek(new Date()); renderCalendar(); scrollToNow(); });

  popoverTitleEl.addEventListener("input", () => {
    const ev = events.find((e) => e.id === popoverEventId);
    if (!ev) return;
    ev.title = popoverTitleEl.value;
    renderCalendar();
  });

  popoverDeleteBtn.addEventListener("click", () => {
    events = events.filter((e) => e.id !== popoverEventId);
    closePopover(false);
    saveEvents();
    renderCalendar();
  });

  popoverDoneBtn.addEventListener("click", () => closePopover(true));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && popoverEventId) closePopover(true);
  });

  document.addEventListener("pointerdown", (e) => {
    if (!popoverEventId) return;
    if (suppressNextOutsideClose) { suppressNextOutsideClose = false; return; }
    if (popoverEl.contains(e.target)) return;
    closePopover(true);
  });

  function openPopover(ev, isNew, clientX, clientY) {
    popoverEventId = ev.id;
    popoverIsNew = isNew;
    popoverTitleEl.value = ev.title || "";
    popoverTimeEl.textContent = `${formatClockTime(ev.startTs)} - ${formatClockTime(ev.endTs)}`;
    highlightSwatch(ev.color);
    popoverDeleteBtn.style.display = isNew ? "none" : "inline-block";
    popoverEl.hidden = false;

    const width = 260, height = popoverEl.offsetHeight || 190;
    let left = clientX + 12;
    let top = clientY - 20;
    if (left + width > window.innerWidth - 8) left = clientX - width - 12;
    if (left < 8) left = 8;
    if (top + height > window.innerHeight - 8) top = window.innerHeight - height - 8;
    if (top < 8) top = 8;
    popoverEl.style.left = `${left}px`;
    popoverEl.style.top = `${top}px`;

    suppressNextOutsideClose = true;
    requestAnimationFrame(() => { popoverTitleEl.focus(); popoverTitleEl.select(); });
  }

  function closePopover(commit) {
    if (!popoverEventId) return;
    const ev = events.find((e) => e.id === popoverEventId);
    if (ev) {
      if (popoverIsNew && !ev.title.trim()) {
        events = events.filter((e) => e.id !== popoverEventId);
      } else if (!ev.title.trim()) {
        ev.title = "(無題の予定)";
      }
    }
    popoverEventId = null;
    popoverIsNew = false;
    popoverEl.hidden = true;
    saveEvents();
    renderCalendar();
  }

  function columnRects() {
    return Array.from(dayColumnsEl.querySelectorAll(".day-column")).map((el, i) => ({
      index: i, rect: el.getBoundingClientRect()
    }));
  }

  function dayIndexAtX(x, rects) {
    for (const r of rects) if (x >= r.rect.left && x < r.rect.right) return r.index;
    return x < rects[0].rect.left ? rects[0].index : rects[rects.length - 1].index;
  }

  function startEventMove(pointerDownEvent, ev, blockEl) {
    pointerDownEvent.stopPropagation();
    const startClientX = pointerDownEvent.clientX;
    const startClientY = pointerDownEvent.clientY;
    const originalStart = ev.startTs;
    const duration = ev.endTs - ev.startTs;
    const rects = columnRects();
    const startDayIndex = dayIndexAtX(startClientX, rects);
    let moved = false;

    function onMove(e2) {
      const dx = e2.clientX - startClientX;
      const dy = e2.clientY - startClientY;
      if (!moved && (Math.abs(dx) > CLICK_THRESHOLD_PX || Math.abs(dy) > CLICK_THRESHOLD_PX)) {
        moved = true;
        blockEl.classList.add("dragging");
      }
      if (!moved) return;
      const newDayIndex = dayIndexAtX(e2.clientX, rects);
      const dayShiftMs = (newDayIndex - startDayIndex) * 86400000;
      const minuteDelta = snapMinutes(dy / HOUR_HEIGHT * 60);
      ev.startTs = originalStart + dayShiftMs + minuteDelta * 60000;
      ev.endTs = ev.startTs + duration;
      renderCalendar();
    }

    function onUp(e2) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (!moved) {
        openPopover(ev, false, e2.clientX, e2.clientY);
      } else {
        saveEvents();
        renderCalendar();
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startEventResize(pointerDownEvent, ev, colEl) {
    pointerDownEvent.stopPropagation();
    const colRect = colEl.getBoundingClientRect();

    function onMove(e2) {
      const minutes = snapMinutes(minutesFromY(e2.clientY, colRect.top));
      const candidateEnd = colEl._dayStartMs + minutes * 60000;
      ev.endTs = Math.max(candidateEnd, ev.startTs + MIN_DURATION_MIN * 60000);
      renderCalendar();
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      saveEvents();
      renderCalendar();
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startEventCreate(pointerDownEvent, colEl, dayStart) {
    if (pointerDownEvent.target !== colEl) return;
    const colRect = colEl.getBoundingClientRect();
    const startMin = Math.max(0, snapMinutes(minutesFromY(pointerDownEvent.clientY, colRect.top)));
    const tentative = {
      id: uid(), title: "", color: DEFAULT_COLOR,
      startTs: dayStart.getTime() + startMin * 60000,
      endTs: dayStart.getTime() + (startMin + 60) * 60000,
      tentative: true
    };
    events.push(tentative);
    let moved = false;
    renderCalendar();

    function onMove(e2) {
      const curMin = snapMinutes(minutesFromY(e2.clientY, colRect.top));
      if (Math.abs(curMin - startMin) >= SNAP_MIN) moved = true;
      if (!moved) return;
      const lo = Math.min(startMin, curMin);
      const hi = Math.max(startMin, curMin, lo + MIN_DURATION_MIN);
      tentative.startTs = dayStart.getTime() + lo * 60000;
      tentative.endTs = dayStart.getTime() + hi * 60000;
      renderCalendar();
    }

    function onUp(e2) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      openPopover(tentative, true, e2.clientX, e2.clientY);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
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

  function renderCalendar() {
    const now = new Date();
    const weekEnd = addDays(currentWeekStart, 6);
    calendarRangeEl.textContent = `${currentWeekStart.getFullYear()}年${currentWeekStart.getMonth() + 1}月${currentWeekStart.getDate()}日 - ${weekEnd.getMonth() + 1}月${weekEnd.getDate()}日`;

    dayColumnsEl.innerHTML = "";

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
      col._dayStartMs = dayStart.getTime();
      col.addEventListener("pointerdown", (e) => startEventCreate(e, col, dayStart));

      const segments = [];
      for (const ev of events) {
        const seg = splitEventByDay(ev, dayStart, dayEnd);
        if (seg) segments.push(seg);
      }
      const laidOut = layoutColumns(segments);

      for (const { seg, col: colIdx, cols } of laidOut) {
        const startMinutes = (seg.startTs - dayStart.getTime()) / 60000;
        const durationMinutes = (seg.endTs - seg.startTs) / 60000;
        const top = (startMinutes / 60) * HOUR_HEIGHT;
        const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, MIN_BLOCK_HEIGHT);
        const widthPct = 100 / cols;
        const leftPct = colIdx * widthPct;

        const block = document.createElement("div");
        block.className = `event-block${seg.tentative ? " tentative" : ""}`;
        block.style.top = `${top}px`;
        block.style.height = `${height}px`;
        block.style.left = `calc(${leftPct}% + 2px)`;
        block.style.width = `calc(${widthPct}% - 4px)`;
        block.style.background = seg.color;

        const titleSpan = document.createElement("span");
        titleSpan.className = "eb-title";
        titleSpan.textContent = seg.title || "(無題の予定)";
        block.appendChild(titleSpan);

        const timeSpan = document.createElement("span");
        timeSpan.className = "eb-time";
        timeSpan.textContent = `${formatClockTime(seg.startTs)}-${formatClockTime(seg.endTs)}`;
        block.appendChild(timeSpan);

        const fullEvent = events.find((e) => e.id === seg.id);
        block.addEventListener("pointerdown", (e) => startEventMove(e, fullEvent, block));

        const handle = document.createElement("div");
        handle.className = "resize-handle";
        handle.addEventListener("pointerdown", (e) => startEventResize(e, fullEvent, col));
        block.appendChild(handle);

        col.appendChild(block);
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
  }

  function scrollToNow() {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const target = (nowMinutes / 60) * HOUR_HEIGHT - calendarScrollEl.clientHeight / 2;
    calendarScrollEl.scrollTop = Math.max(0, target);
  }

  buildTimeGutter();
  renderCalendar();
  scrollToNow();

  setInterval(() => { if (!popoverEventId) renderCalendar(); }, 30000);
})();
