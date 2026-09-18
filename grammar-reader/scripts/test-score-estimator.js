"use strict";

// 共通テスト換算の推定ロジックのテスト。
//   node grammar-reader/scripts/test-score-estimator.js

const assert = require("assert");
const planner = require("../public/reviewPlanner");
const estimator = require("../public/scoreEstimator");

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log("  ok  " + name);
}

function stateWith(results) {
  const state = planner.createState();
  results.forEach((result, index) => {
    planner.recordAnswer(
      state,
      {
        kind: result.kind || "grammar",
        groupId: result.groupId || "tense",
        questionId: "q" + index,
        correct: result.correct,
        level: result.level
      },
      1000 + index
    );
  });
  return state;
}

function estimateOf(state) {
  return estimator.estimate(planner.firstAttempts(state));
}

function repeat(count, template) {
  return Array.from({ length: count }, () => Object.assign({}, template));
}

test("解答数が足りないうちは点数を出さない", () => {
  const result = estimateOf(stateWith(repeat(5, { level: 2, correct: true })));
  assert.strictEqual(result.ready, false);
  assert.strictEqual(result.answered, 5);
  assert.strictEqual(result.needMore, estimator.MIN_ANSWERS - 5);
});

test("正答率50%（2択のまぐれと同じ）は最低ラインの点になる", () => {
  const state = stateWith(repeat(10, { level: 1, correct: true }).concat(repeat(10, { level: 1, correct: false })));
  const result = estimateOf(state);
  assert.strictEqual(result.accuracyPercent, 50);
  assert.strictEqual(result.mastery, 0);
  assert.strictEqual(result.score, 25);
});

test("全問正解でも上限は88点", () => {
  const result = estimateOf(stateWith(repeat(30, { level: 3, correct: true })));
  assert.strictEqual(result.accuracy, 1);
  assert.strictEqual(result.score, 88);
  assert.strictEqual(result.high, 88);
});

test("難しい問題に正解するほど点が上がる（加重）", () => {
  const easyOnly = estimateOf(
    stateWith(repeat(10, { level: 1, correct: true }).concat(repeat(10, { level: 3, correct: false })))
  );
  const hardOnly = estimateOf(
    stateWith(repeat(10, { level: 1, correct: false }).concat(repeat(10, { level: 3, correct: true })))
  );
  assert.strictEqual(easyOnly.answered, hardOnly.answered);
  assert.ok(hardOnly.score > easyOnly.score, `${hardOnly.score} > ${easyOnly.score}`);
});

test("解答数が増えると推定の幅が狭まる", () => {
  const few = estimateOf(stateWith(repeat(6, { level: 2, correct: true }).concat(repeat(4, { level: 2, correct: false }))));
  const many = estimateOf(
    stateWith(repeat(48, { level: 2, correct: true }).concat(repeat(32, { level: 2, correct: false })))
  );
  assert.strictEqual(few.accuracyPercent, many.accuracyPercent);
  assert.ok(many.high - many.low < few.high - few.low, `${many.high - many.low} < ${few.high - few.low}`);
  assert.strictEqual(few.stable, false);
  assert.strictEqual(many.stable, true);
});

test("復習で正解しても初見の結果は書き換わらない", () => {
  const state = stateWith(repeat(10, { level: 2, correct: false }));
  const before = estimateOf(state);
  Object.keys(state.items).forEach((key) => {
    const item = state.items[key];
    planner.recordAnswer(
      state,
      { kind: item.kind, groupId: item.groupId, questionId: item.questionId, correct: true, level: item.level },
      9999
    );
  });
  const after = estimateOf(state);
  assert.strictEqual(after.score, before.score);
  assert.strictEqual(after.answered, before.answered);
});

test("分野別・難易度別・ユニット別の内訳を返す", () => {
  const state = stateWith(
    repeat(6, { level: 1, correct: true, groupId: "tense" })
      .concat(repeat(6, { level: 3, correct: false, groupId: "relative" }))
      .concat(repeat(4, { kind: "reading", level: 2, correct: true, groupId: "yawn" }))
  );
  const result = estimateOf(state);
  const areas = result.byArea.reduce((map, area) => Object.assign(map, { [area.key]: area }), {});
  assert.strictEqual(areas.grammar.answered, 12);
  assert.strictEqual(areas.reading.answered, 4);
  assert.deepStrictEqual(result.byLevel.map((entry) => entry.key), ["1", "2", "3"]);

  const weakest = estimator.weakestGroup(result);
  assert.strictEqual(weakest.key, "relative");
  assert.strictEqual(weakest.accuracy, 0);
});

test("アンカー表は到達度に対して単調に増える", () => {
  let previous = -1;
  for (let m = 0; m <= 1.0001; m += 0.05) {
    const score = estimator.scoreFromMastery(m);
    assert.ok(score >= previous, `mastery ${m.toFixed(2)} で下がった`);
    previous = score;
  }
  assert.strictEqual(estimator.scoreFromMastery(0), 25);
  assert.strictEqual(estimator.scoreFromMastery(1), 88);
});

console.log(`\n${passed} tests passed`);
