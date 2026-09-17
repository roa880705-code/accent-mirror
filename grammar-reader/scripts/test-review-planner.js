"use strict";

// 復習キューのロジックのテスト。
//   node grammar-reader/scripts/test-review-planner.js

const assert = require("assert");
const planner = require("../public/reviewPlanner");

const DAY = planner.DAY_MS;
const T0 = Date.UTC(2026, 0, 1, 9, 0, 0);

function answer(state, correct, at, questionId) {
  return planner.recordAnswer(
    state,
    { kind: "grammar", groupId: "tense", questionId: questionId || "tense-1", correct: correct },
    at
  );
}

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log("  ok  " + name);
}

test("不正解の問題はすぐ復習対象になる", () => {
  const state = planner.createState();
  answer(state, false, T0);
  const due = planner.getDueItems(state, T0);
  assert.strictEqual(due.length, 1);
  assert.strictEqual(due[0].questionId, "tense-1");
  assert.strictEqual(due[0].box, 0);
});

test("1回正解すると翌日まで出題されない", () => {
  const state = planner.createState();
  answer(state, true, T0);
  assert.strictEqual(planner.getDueItems(state, T0).length, 0);
  assert.strictEqual(planner.getDueItems(state, T0 + DAY).length, 1);
});

test("3回続けて正解すると習得済みになり、キューから外れる", () => {
  const state = planner.createState();
  answer(state, true, T0);
  answer(state, true, T0 + DAY);
  answer(state, true, T0 + 5 * DAY);
  const item = state.items[planner.itemKey("grammar", "tense", "tense-1")];
  assert.strictEqual(item.box, planner.MASTERED_BOX);
  assert.strictEqual(planner.isMastered(item), true);
  assert.strictEqual(planner.getDueItems(state, T0 + 400 * DAY).length, 0);
});

test("習得済みの問題でも間違えれば box 0 に戻る", () => {
  const state = planner.createState();
  answer(state, true, T0);
  answer(state, true, T0 + DAY);
  answer(state, true, T0 + 5 * DAY);
  answer(state, false, T0 + 6 * DAY);
  const item = state.items[planner.itemKey("grammar", "tense", "tense-1")];
  assert.strictEqual(item.box, 0);
  assert.strictEqual(planner.getDueItems(state, T0 + 6 * DAY).length, 1);
});

test("復習キューは間違いの多い順に並ぶ", () => {
  const state = planner.createState();
  answer(state, false, T0, "tense-1");
  answer(state, false, T0, "tense-2");
  answer(state, false, T0 + 1000, "tense-2");
  const due = planner.getDueItems(state, T0 + 2000);
  assert.deepStrictEqual(due.map((item) => item.questionId), ["tense-2", "tense-1"]);
});

test("集計は正答率とユニット別成績を返す", () => {
  const state = planner.createState();
  answer(state, true, T0, "tense-1");
  answer(state, false, T0, "tense-2");
  planner.recordAnswer(state, { kind: "reading", groupId: "yawn", questionId: "yawn-q1", correct: true }, T0);

  const summary = planner.summarize(state, T0);
  assert.strictEqual(summary.answered, 3);
  assert.strictEqual(summary.correct, 2);
  assert.strictEqual(summary.accuracy, 67);
  assert.strictEqual(summary.dueNow, 1); // 間違えた tense-2 のみ
  assert.strictEqual(summary.touched, 3);

  const unit = planner.groupStats(state, "tense");
  assert.strictEqual(unit.answered, 2);
  assert.strictEqual(unit.correct, 1);
  assert.strictEqual(unit.accuracy, 50);
  assert.deepStrictEqual(planner.groupStats(state, "unknown-unit"), {
    answered: 0,
    correct: 0,
    accuracy: 0,
    lastStudiedAt: null
  });
});

test("壊れた保存データは初期状態として読み込まれる", () => {
  assert.deepStrictEqual(planner.normalizeState(null), planner.createState());
  assert.deepStrictEqual(planner.normalizeState({ version: 999, items: { x: {} } }), planner.createState());
  const restored = planner.normalizeState({ version: 1, items: {}, totals: { answered: 4, correct: 3 }, groups: {} });
  assert.strictEqual(restored.totals.answered, 4);
});

console.log(`\n${passed} tests passed`);
