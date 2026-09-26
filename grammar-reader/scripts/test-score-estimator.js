"use strict";

// 実力の範囲を出す推定ロジックのテスト。
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

// [レベル, 出題数, 正解数] の組から初見の記録を作る
function estimateFor(spec, kind) {
  const state = planner.createState();
  let index = 0;
  spec.forEach(([level, total, correct]) => {
    for (let i = 0; i < total; i += 1) {
      planner.recordAnswer(
        state,
        {
          kind: kind || "grammar",
          groupId: "g" + level,
          questionId: "q" + index++,
          level,
          correct: i < correct
        },
        1000 + index
      );
    }
  });
  return estimator.estimate(planner.firstAttempts(state));
}

test("解答が少なすぎるうちは範囲を出さない", () => {
  const result = estimateFor([[1, 2, 2]]);
  assert.strictEqual(result.ready, false);
  assert.strictEqual(result.answered, 2);
  assert.strictEqual(result.needMore, estimator.MIN_ANSWERS - 2);
  assert.ok(Array.isArray(result.bands), "範囲が出せなくても、ものさしの情報は返す");
});

test("範囲は必ず 下限 ≦ 中心 ≦ 上限 で、ものさしの中に収まる", () => {
  [
    [[1, 3, 0]],
    [[1, 3, 3]],
    [[3, 20, 20]],
    [[3, 20, 0]],
    [[1, 6, 6], [2, 6, 3], [3, 6, 0]]
  ].forEach((spec) => {
    const result = estimateFor(spec);
    assert.ok(result.low <= result.point, `${result.low} <= ${result.point}`);
    assert.ok(result.point <= result.high, `${result.point} <= ${result.high}`);
    assert.ok(result.low >= estimator.SCALE_MIN && result.high <= estimator.SCALE_MAX);
  });
});

test("解答が増えると範囲が狭まる", () => {
  const few = estimateFor([[2, 4, 3]]);
  const many = estimateFor([[2, 24, 18]]);
  assert.ok(many.width < few.width, `${many.width} < ${few.width}`);
  assert.strictEqual(few.precision, "wide");
  assert.notStrictEqual(many.precision, "wide");
});

test("やさしい問題だけ解いても上限は絞れず、範囲が上に広いまま残る", () => {
  const easyOnly = estimateFor([[1, 9, 9]]);
  assert.ok(easyOnly.high >= 70, `上限 ${easyOnly.high} が上に開いたまま`);
  assert.ok(easyOnly.low >= 38, `下限 ${easyOnly.low} は持ち上がる`);
  assert.ok(easyOnly.width >= 20, "断定せず、幅で不確かさを示す");
  assert.strictEqual(easyOnly.levels[2].answered, 0);
});

test("難しい問題を解けていると、範囲ごと上に移る", () => {
  const easyOnly = estimateFor([[1, 12, 12]]);
  const hardToo = estimateFor([[1, 6, 6], [3, 12, 12]]);
  assert.ok(hardToo.point > easyOnly.point, `${hardToo.point} > ${easyOnly.point}`);
  assert.ok(hardToo.low > easyOnly.low);
  assert.ok(hardToo.width < easyOnly.width, "難易度の幅が広いほど絞り込める");
});

test("難しい問題を落とすと上限が下がる", () => {
  const passed3 = estimateFor([[3, 8, 8]]);
  const failed3 = estimateFor([[3, 8, 2]]);
  assert.ok(failed3.high < passed3.high, `${failed3.high} < ${passed3.high}`);
  assert.ok(failed3.point < passed3.point);
});

test("当てずっぽう相当（2択で5割）では下のほうに寄る", () => {
  const result = estimateFor([[2, 20, 10]]);
  assert.ok(result.point < estimator.LEVEL_DIFFICULTY[2], `${result.point} < ${estimator.LEVEL_DIFFICULTY[2]}`);
});

test("範囲の呼び名は、上の帯だけ点数で言う", () => {
  assert.strictEqual(estimator.labelOf(30), "英検3級");
  assert.strictEqual(estimator.labelOf(45), "英検準2級");
  assert.strictEqual(estimator.labelOf(60), "英検2級");
  assert.strictEqual(estimator.labelOf(75), "共通テスト75点");
  assert.strictEqual(estimator.rangeLabel(45, 80), "英検準2級 〜 共通テスト80点");
  assert.strictEqual(estimator.rangeLabel(44, 46), "英検準2級", "同じ帯なら1つにまとめる");
});

test("復習で正解しても初見の結果は書き換わらない", () => {
  const state = planner.createState();
  for (let i = 0; i < 10; i += 1) {
    planner.recordAnswer(state, { kind: "grammar", groupId: "g", questionId: "q" + i, level: 2, correct: false }, 1000);
  }
  const before = estimator.estimate(planner.firstAttempts(state));
  Object.keys(state.items).forEach((key) => {
    const item = state.items[key];
    planner.recordAnswer(
      state,
      { kind: item.kind, groupId: item.groupId, questionId: item.questionId, correct: true, level: item.level },
      9999
    );
  });
  const after = estimator.estimate(planner.firstAttempts(state));
  assert.strictEqual(after.point, before.point);
  assert.strictEqual(after.answered, before.answered);
});

test("正解する確率は、実力が上がるほど・問題がやさしいほど高い", () => {
  assert.ok(estimator.correctChance(70, 1) > estimator.correctChance(40, 1));
  assert.ok(estimator.correctChance(50, 1) > estimator.correctChance(50, 3));
  assert.ok(estimator.correctChance(20, 3) >= estimator.GUESS, "2択なので下限は50%");
  assert.ok(estimator.correctChance(88, 1) <= 1);
});

test("次に効くレベルは、推定の中心に近く、まだ解いていないものを選ぶ", () => {
  const result = estimateFor([[1, 9, 9]]);
  assert.strictEqual(result.nextLevel.level, 2, "レベル1を解き切ったら次はレベル2");
  const levels = [
    { level: 1, answered: 0, difficulty: estimator.LEVEL_DIFFICULTY[1] },
    { level: 2, answered: 0, difficulty: estimator.LEVEL_DIFFICULTY[2] },
    { level: 3, answered: 0, difficulty: estimator.LEVEL_DIFFICULTY[3] }
  ];
  assert.strictEqual(estimator.nextUsefulLevel(levels, 75).level, 3);
  assert.strictEqual(estimator.nextUsefulLevel(levels, 40).level, 1);
});

test("分野別とユニット別の内訳を返す", () => {
  const state = planner.createState();
  [["grammar", "tense", true], ["grammar", "tense", false], ["vocab", "phrasal", true]].forEach((entry, index) => {
    planner.recordAnswer(
      state,
      { kind: entry[0], groupId: entry[1], questionId: "q" + index, level: 2, correct: entry[2] },
      1000
    );
  });
  const result = estimator.estimate(planner.firstAttempts(state));
  const areas = result.byArea.reduce((map, area) => Object.assign(map, { [area.key]: area }), {});
  assert.strictEqual(areas.grammar.answered, 2);
  assert.strictEqual(areas.vocab.answered, 1);
  assert.strictEqual(estimator.weakestGroup(result, 2).key, "tense");
});

console.log(`\n${passed} tests passed`);
