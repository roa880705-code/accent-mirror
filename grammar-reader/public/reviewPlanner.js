/*
 * 復習キューのロジック。
 * ブラウザでは window.ReviewPlanner、Node からは require() で同じ関数を使う。
 * 状態は localStorage に保存できる素の JSON にしておく。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ReviewPlanner = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var STATE_VERSION = 2;
  var MASTERED_BOX = 3;
  var MIN_LEVEL = 1;
  var MAX_LEVEL = 3;
  // 1セットの正答率がこれ以上ならレベルを上げる／下げない
  var LEVEL_UP_RATE = 1;
  var LEVEL_KEEP_RATE = 0.6;
  // box が上がるほど次に出るまでの間隔を延ばす（0 はその場で復習）。
  var INTERVAL_DAYS = [0, 1, 3];
  var DAY_MS = 24 * 60 * 60 * 1000;

  function createState() {
    return {
      version: STATE_VERSION,
      items: {},
      totals: { answered: 0, correct: 0 },
      groups: {},
      // 次に出す問題の難易度。1セットの成績で上下する。
      difficulty: { target: MIN_LEVEL }
    };
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object" || raw.version !== STATE_VERSION) {
      return createState();
    }
    var state = createState();
    if (raw.items && typeof raw.items === "object") state.items = raw.items;
    if (raw.totals && typeof raw.totals === "object") {
      state.totals.answered = Number(raw.totals.answered) || 0;
      state.totals.correct = Number(raw.totals.correct) || 0;
    }
    if (raw.groups && typeof raw.groups === "object") state.groups = raw.groups;
    if (raw.difficulty && typeof raw.difficulty === "object") {
      state.difficulty.target = clampLevel(raw.difficulty.target);
    }
    return state;
  }

  function clampLevel(level) {
    var value = Math.round(Number(level));
    if (!isFinite(value)) return MIN_LEVEL;
    return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, value));
  }

  /**
   * 1セット解き終えたあとの出題レベル。
   * 全問正解なら1つ上げ、6割以上なら据え置き、それ未満なら1つ下げる。
   */
  function nextTargetLevel(current, correct, total) {
    var level = clampLevel(current);
    if (!total) return level;
    var rate = correct / total;
    if (rate >= LEVEL_UP_RATE) return clampLevel(level + 1);
    if (rate >= LEVEL_KEEP_RATE) return level;
    return clampLevel(level - 1);
  }

  /** セットの結果を反映し、変化の前後を返す。 */
  function applySessionResult(state, correct, total) {
    var from = clampLevel(state.difficulty.target);
    var to = nextTargetLevel(from, correct, total);
    state.difficulty.target = to;
    return { from: from, to: to, changed: from !== to };
  }

  function itemKey(kind, groupId, questionId) {
    return kind + ":" + groupId + ":" + questionId;
  }

  /** その問題をすでに解いたことがあるか（初見問題モードの絞り込みに使う）。 */
  function hasSeen(state, kind, groupId, questionId) {
    return Object.prototype.hasOwnProperty.call(state.items, itemKey(kind, groupId, questionId));
  }

  /**
   * 初見（1回目）の解答だけを取り出す。
   * 復習では答えを覚えているため、実力の推定には初見の結果しか使わない。
   */
  function firstAttempts(state) {
    return Object.keys(state.items)
      .map(function (key) {
        return state.items[key];
      })
      .filter(function (item) {
        return typeof item.firstCorrect === "boolean";
      });
  }

  function nextDueAt(box, now) {
    if (box >= MASTERED_BOX) return null;
    var days = INTERVAL_DAYS[box] || 0;
    return now + days * DAY_MS;
  }

  /**
   * 1問分の解答を記録する。
   * 正解すると box が 1 つ上がり、MASTERED_BOX に届くと復習キューから外れる。
   * 不正解なら box は 0 に戻り、すぐ復習対象になる。
   */
  function recordAnswer(state, answer, now) {
    var at = typeof now === "number" ? now : Date.now();
    var key = itemKey(answer.kind, answer.groupId, answer.questionId);
    var item = state.items[key];
    if (!item) {
      item = {
        key: key,
        kind: answer.kind,
        groupId: answer.groupId,
        questionId: answer.questionId,
        level: [1, 2, 3].indexOf(answer.level) >= 0 ? answer.level : 1,
        box: 0,
        wrongCount: 0,
        rightCount: 0,
        dueAt: at,
        lastAnsweredAt: at,
        // 初見の結果はあとから書き換えない（実力推定の材料になる）
        firstCorrect: answer.correct === true,
        firstAnsweredAt: at
      };
      state.items[key] = item;
    }

    if (answer.correct) {
      item.rightCount += 1;
      item.box = Math.min(MASTERED_BOX, item.box + 1);
    } else {
      item.wrongCount += 1;
      item.box = 0;
    }
    item.lastAnsweredAt = at;
    item.dueAt = nextDueAt(item.box, at);

    state.totals.answered += 1;
    if (answer.correct) state.totals.correct += 1;

    var group = state.groups[answer.groupId];
    if (!group) {
      group = { groupId: answer.groupId, kind: answer.kind, answered: 0, correct: 0, lastStudiedAt: at };
      state.groups[answer.groupId] = group;
    }
    group.answered += 1;
    if (answer.correct) group.correct += 1;
    group.lastStudiedAt = at;

    return item;
  }

  function isMastered(item) {
    return item.box >= MASTERED_BOX;
  }

  function isDue(item, now) {
    if (isMastered(item)) return false;
    if (typeof item.dueAt !== "number") return true;
    return item.dueAt <= now;
  }

  /** 復習すべき問題を、間違いが多い順・期限が古い順に返す。 */
  function getDueItems(state, now, limit) {
    var at = typeof now === "number" ? now : Date.now();
    var due = [];
    Object.keys(state.items).forEach(function (key) {
      var item = state.items[key];
      if (isDue(item, at)) due.push(item);
    });
    due.sort(function (a, b) {
      if (b.wrongCount !== a.wrongCount) return b.wrongCount - a.wrongCount;
      return (a.dueAt || 0) - (b.dueAt || 0);
    });
    if (typeof limit === "number" && limit > 0) return due.slice(0, limit);
    return due;
  }

  function summarize(state, now) {
    var at = typeof now === "number" ? now : Date.now();
    var keys = Object.keys(state.items);
    var mastered = 0;
    var due = 0;
    var learning = 0;
    keys.forEach(function (key) {
      var item = state.items[key];
      if (isMastered(item)) mastered += 1;
      else if (isDue(item, at)) due += 1;
      else learning += 1;
    });
    var answered = state.totals.answered;
    return {
      answered: answered,
      correct: state.totals.correct,
      accuracy: answered ? Math.round((state.totals.correct / answered) * 100) : 0,
      touched: keys.length,
      mastered: mastered,
      dueNow: due,
      learning: learning
    };
  }

  function groupStats(state, groupId) {
    var group = state.groups[groupId];
    if (!group) return { answered: 0, correct: 0, accuracy: 0, lastStudiedAt: null };
    return {
      answered: group.answered,
      correct: group.correct,
      accuracy: group.answered ? Math.round((group.correct / group.answered) * 100) : 0,
      lastStudiedAt: group.lastStudiedAt || null
    };
  }

  return {
    STATE_VERSION: STATE_VERSION,
    MASTERED_BOX: MASTERED_BOX,
    MIN_LEVEL: MIN_LEVEL,
    MAX_LEVEL: MAX_LEVEL,
    clampLevel: clampLevel,
    nextTargetLevel: nextTargetLevel,
    applySessionResult: applySessionResult,
    INTERVAL_DAYS: INTERVAL_DAYS,
    DAY_MS: DAY_MS,
    createState: createState,
    normalizeState: normalizeState,
    itemKey: itemKey,
    hasSeen: hasSeen,
    firstAttempts: firstAttempts,
    recordAnswer: recordAnswer,
    getDueItems: getDueItems,
    isMastered: isMastered,
    isDue: isDue,
    summarize: summarize,
    groupStats: groupStats
  };
});
