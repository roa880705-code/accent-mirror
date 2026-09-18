/*
 * 初見（1回目）の解答から、共通テスト英語 Reading 換算の推定点を出す。
 * ブラウザでは window.ScoreEstimator、Node からは require() で使う。
 *
 * 考え方:
 *   1. 復習は答えを覚えているため、材料は初見の解答だけに限る。
 *   2. 難易度（level 1〜3）を配点として加重正答率を出す。
 *   3. 2択なので、当てずっぽうでも 50% は当たる。その分を差し引いて到達度に直す。
 *   4. 到達度を共通テストの点数帯に翻訳する（下のアンカー表を直線で補間）。
 *   5. 解答数が少ないうちは推定が揺れるので、標準誤差から幅を出して併記する。
 *
 * この換算はあくまで本アプリの問題で測った目安で、公式な換算表ではない。
 * 本番の分量（およそ6000語・80分）や4択・複数正答の形式は再現していないため、
 * 満点相当は 88 点で頭打ちにしてある。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ScoreEstimator = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var LEVEL_WEIGHT = { 1: 1, 2: 2, 3: 3 };
  var GUESS_RATE = 0.5; // 2択
  var MIN_ANSWERS = 8; // これ未満では点数を出さない
  var STABLE_ANSWERS = 25; // これ以上で「安定してきた」とみなす

  // [到達度, 共通テスト Reading 換算点]
  var ANCHORS = [
    [0.0, 25],
    [0.25, 40],
    [0.5, 55],
    [0.7, 68],
    [0.85, 78],
    [1.0, 88]
  ];

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function weightOf(level) {
    return LEVEL_WEIGHT[level] || 1;
  }

  /** 加重正答率（0〜1）から、まぐれ当たり分を差し引いた到達度（0〜1）を出す。 */
  function masteryFromAccuracy(accuracy) {
    return clamp((accuracy - GUESS_RATE) / (1 - GUESS_RATE), 0, 1);
  }

  /** 到達度（0〜1）をアンカー表の直線補間で点数に直す。 */
  function scoreFromMastery(mastery) {
    var m = clamp(mastery, 0, 1);
    for (var i = 1; i < ANCHORS.length; i += 1) {
      var prev = ANCHORS[i - 1];
      var next = ANCHORS[i];
      if (m <= next[0]) {
        var span = next[0] - prev[0];
        var ratio = span === 0 ? 0 : (m - prev[0]) / span;
        return prev[1] + (next[1] - prev[1]) * ratio;
      }
    }
    return ANCHORS[ANCHORS.length - 1][1];
  }

  function scoreFromAccuracy(accuracy) {
    return scoreFromMastery(masteryFromAccuracy(accuracy));
  }

  function summarizeAttempts(attempts) {
    var points = 0;
    var max = 0;
    var correct = 0;
    attempts.forEach(function (item) {
      var weight = weightOf(item.level);
      max += weight;
      if (item.firstCorrect) {
        points += weight;
        correct += 1;
      }
    });
    return {
      answered: attempts.length,
      correct: correct,
      points: points,
      max: max,
      accuracy: max > 0 ? points / max : 0
    };
  }

  function breakdownBy(attempts, keyOf) {
    var buckets = {};
    attempts.forEach(function (item) {
      var key = keyOf(item);
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(item);
    });
    return Object.keys(buckets).map(function (key) {
      var summary = summarizeAttempts(buckets[key]);
      summary.key = key;
      return summary;
    });
  }

  /**
   * 推定のまとめ。引数は ReviewPlanner.firstAttempts(state) が返す初見の解答の配列。
   * ready が false のときは、まだ点数を出さずに必要な問題数だけを返す。
   */
  function estimate(attempts) {
    var overall = summarizeAttempts(attempts || []);

    if (overall.answered < MIN_ANSWERS) {
      return {
        ready: false,
        answered: overall.answered,
        needMore: MIN_ANSWERS - overall.answered,
        minAnswers: MIN_ANSWERS
      };
    }

    var accuracy = overall.accuracy;
    // 標準誤差。解いた問題が少ないほど幅が広がる。
    var se = Math.sqrt(Math.max(accuracy * (1 - accuracy), 0.01) / overall.answered);
    var score = scoreFromAccuracy(accuracy);
    var low = scoreFromAccuracy(accuracy - se);
    var high = scoreFromAccuracy(accuracy + se);

    return {
      ready: true,
      answered: overall.answered,
      correct: overall.correct,
      points: overall.points,
      max: overall.max,
      accuracy: accuracy,
      accuracyPercent: Math.round(accuracy * 100),
      mastery: masteryFromAccuracy(accuracy),
      score: Math.round(score),
      low: Math.round(low),
      high: Math.round(high),
      stable: overall.answered >= STABLE_ANSWERS,
      untilStable: Math.max(0, STABLE_ANSWERS - overall.answered),
      byArea: breakdownBy(attempts, function (item) {
        return item.kind;
      }),
      byLevel: breakdownBy(attempts, function (item) {
        return String(weightOf(item.level) === 1 ? 1 : item.level);
      }).sort(function (a, b) {
        return Number(a.key) - Number(b.key);
      }),
      byGroup: breakdownBy(attempts, function (item) {
        return item.groupId;
      })
    };
  }

  /** 初見の成績がいちばん低いユニット／パッセージを返す（弱点の提示用）。 */
  function weakestGroup(estimateResult, minAnswers) {
    if (!estimateResult.ready) return null;
    var threshold = typeof minAnswers === "number" ? minAnswers : 3;
    var candidates = estimateResult.byGroup.filter(function (group) {
      return group.answered >= threshold;
    });
    if (!candidates.length) return null;
    return candidates.reduce(function (worst, group) {
      return group.accuracy < worst.accuracy ? group : worst;
    });
  }

  return {
    LEVEL_WEIGHT: LEVEL_WEIGHT,
    GUESS_RATE: GUESS_RATE,
    MIN_ANSWERS: MIN_ANSWERS,
    STABLE_ANSWERS: STABLE_ANSWERS,
    ANCHORS: ANCHORS,
    weightOf: weightOf,
    masteryFromAccuracy: masteryFromAccuracy,
    scoreFromMastery: scoreFromMastery,
    scoreFromAccuracy: scoreFromAccuracy,
    summarizeAttempts: summarizeAttempts,
    estimate: estimate,
    weakestGroup: weakestGroup
  };
});
