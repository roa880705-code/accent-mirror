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

// [レベル, 出題数, 正解数] の組から初見の記録を作る
function estimateFor(spec) {
  const results = spec.flatMap(([level, total, correct]) =>
    Array.from({ length: total }, (unused, index) => ({ level, correct: index < correct }))
  );
  return estimateOf(stateWith(results));
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

test("やさしい問題だけ全問正解しても、共通テストの点数は出ない", () => {
  const result = estimateFor([[1, 10, 10]]);
  assert.strictEqual(result.ready, true);
  assert.strictEqual(result.scoreReady, false, "レベル3をクリアするまで点数は出さない");
  assert.strictEqual(result.rank.label, estimator.TIERS[1].clearedLabel);
  assert.strictEqual(result.rank.goal, estimator.TIERS[2].goal);
  assert.strictEqual(result.rank.levels[2].answered, 0);
});

test("レベルを上げてクリアするほど階級が上がる", () => {
  assert.strictEqual(estimateFor([[1, 8, 4]]).rank.label, estimator.BASE_LABEL);
  assert.strictEqual(estimateFor([[1, 8, 8]]).rank.label, estimator.TIERS[1].clearedLabel);
  assert.strictEqual(estimateFor([[1, 6, 6], [2, 8, 8]]).rank.label, estimator.TIERS[2].clearedLabel);

  const top = estimateFor([[1, 6, 6], [2, 8, 8], [3, 8, 8]]);
  assert.strictEqual(top.rank.label, estimator.TIERS[3].clearedLabel);
  assert.strictEqual(top.scoreReady, true);
  assert.strictEqual(top.score, 88);
});

test("挑戦中は「あと◯歩」が出て、進むほど減る", () => {
  const early = estimateFor([[1, 6, 6], [2, 2, 1]]);
  const late = estimateFor([[1, 6, 6], [2, 5, 5]]);
  assert.strictEqual(early.rank.label, estimator.TIERS[2].tryLabel);
  assert.strictEqual(early.rank.goal, estimator.TIERS[2].goal);
  assert.ok(early.rank.steps >= 1 && early.rank.steps <= estimator.MAX_STEPS);
  assert.ok(late.rank.steps < early.rank.steps, `${late.rank.steps} < ${early.rank.steps}`);
  assert.ok(late.rank.message.length > 0);
});

test("そのレベルを解く前は、クリア済みの階級を名乗って次を促す", () => {
  const result = estimateFor([[1, 8, 8]]);
  assert.strictEqual(result.rank.label, estimator.TIERS[1].clearedLabel);
  assert.strictEqual(result.rank.steps, estimator.MAX_STEPS);
  assert.ok(result.rank.message.includes("レベル2"));
});

test("難しい問題を落とすと、上の階級には上がらない", () => {
  const result = estimateFor([[1, 6, 6], [2, 8, 8], [3, 8, 4]]);
  assert.strictEqual(result.scoreReady, false);
  assert.strictEqual(result.rank.label, estimator.TIERS[3].tryLabel);
  assert.strictEqual(result.rank.levels[2].cleared, false);
});

test("上のレベルをクリアしていれば、下のレベルの解答数不足で足踏みしない", () => {
  // 適応出題でレベル3まで進み、レベル1・2の解答数が足りていない状態
  const result = estimateFor([[1, 3, 3], [2, 3, 3], [3, 18, 18]]);
  assert.strictEqual(result.scoreReady, true, "レベル3をクリアしていれば点数を出す");
  assert.strictEqual(result.rank.label, estimator.TIERS[3].clearedLabel);
  assert.strictEqual(result.rank.levels[0].impliedByHigher, true);
  assert.strictEqual(result.rank.levels[1].impliedByHigher, true);
  assert.strictEqual(result.rank.levels[2].impliedByHigher, false, "レベル3は自力のクリア");
});

test("上のレベルを落としていれば、下のクリアは引き継がれない", () => {
  const result = estimateFor([[1, 3, 3], [2, 8, 4], [3, 6, 2]]);
  assert.strictEqual(result.scoreReady, false);
  assert.strictEqual(result.rank.levels[1].cleared, false);
  assert.strictEqual(result.rank.levels[0].impliedByHigher, false);
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
