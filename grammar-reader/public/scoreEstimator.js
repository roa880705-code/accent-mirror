/*
 * 初見（1回目）の解答から、いまの実力が入りそうな「範囲」を推定する。
 * ブラウザでは window.ScoreEstimator、Node からは require() で使う。
 *
 * 考え方:
 *   1. 復習は答えを覚えているため、材料は初見の解答だけに限る。
 *   2. ものさしは1本。共通テスト英語 Reading の換算点（20〜90）を軸にして、
 *      その上に英検相当の帯を置く。
 *   3. 問題にはレベルごとの「難しさ」があり、実力が難しさを上回るほど正解しやすい、
 *      という素直なモデルで、正誤の並びと辻褄が合う実力の分布を求める。
 *   4. 2択なので、実力が足りなくても半分は当たる。その分はモデルに組み込む。
 *   5. 表示するのは1点ではなく範囲。解答が少なければ範囲は広いままで、
 *      やさしい問題しか解いていなければ上限は絞れない。そこを隠さない。
 *
 * この換算は本アプリの問題で測った目安で、公式の換算表でも英検の合否判定でもない。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ScoreEstimator = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var SCALE_MIN = 20;
  var SCALE_MAX = 88; // この教材で測れる上限（本番の分量は再現していないため）

  // 共通テスト換算点の軸に置いた、英検相当の帯。上限は帯の終わり。
  var BANDS = [
    { max: 38, label: "英検3級", full: "英検3級 相当" },
    { max: 52, label: "英検準2級", full: "英検準2級 相当" },
    { max: 68, label: "英検2級", full: "英検2級 相当" },
    { max: SCALE_MAX, label: "共通テスト", full: "共通テスト 高得点帯" }
  ];

  // 各レベルの問題の「難しさ」。この実力の人がちょうど手こずる、という位置。
  var LEVEL_DIFFICULTY = { 1: 42, 2: 58, 3: 74 };
  var SLOPE = 10; // 難しさの前後どれくらいで正答率が変わるか
  var GUESS = 0.5; // 2択なので、実力が届かなくても半分は当たる

  // 何も解いていないときの出発点（だいたい真ん中から少し下）。
  var PRIOR_MEAN = 45;
  var PRIOR_SD = 16;

  var CREDIBLE = 0.8; // 範囲の確からしさ（8割）
  var MIN_ANSWERS = 3; // これ未満では範囲を出さない
  var NARROW_WIDTH = 16; // これ以下なら「絞れてきた」
  var WIDE_WIDTH = 26; // これ以上なら「まだ広い」

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function levelOf(item) {
    var level = Math.round(Number(item.level));
    return LEVEL_DIFFICULTY[level] ? level : 1;
  }

  /** 実力 ability の人が、レベル level の問題に正解する確率。 */
  function correctChance(ability, level) {
    var logistic = 1 / (1 + Math.exp(-(ability - LEVEL_DIFFICULTY[level]) / SLOPE));
    return GUESS + (1 - GUESS) * logistic;
  }

  function priorWeight(ability) {
    var z = (ability - PRIOR_MEAN) / PRIOR_SD;
    return Math.exp(-0.5 * z * z);
  }

  /**
   * 実力の分布。軸上の各点について、そこに実力があるとしたときの
   * 「その正誤の並びの起こりやすさ」を出し、出発点の重みと掛け合わせる。
   */
  function posterior(attempts) {
    var grid = [];
    var total = 0;
    for (var ability = SCALE_MIN; ability <= SCALE_MAX; ability += 1) {
      var weight = priorWeight(ability);
      for (var i = 0; i < attempts.length; i += 1) {
        var chance = correctChance(ability, levelOf(attempts[i]));
        weight *= attempts[i].firstCorrect ? chance : 1 - chance;
      }
      grid.push({ ability: ability, weight: weight });
      total += weight;
    }
    if (total > 0) {
      grid.forEach(function (point) {
        point.weight /= total;
      });
    }
    return grid;
  }

  function mean(grid) {
    return grid.reduce(function (sum, point) {
      return sum + point.ability * point.weight;
    }, 0);
  }

  /** 累積が ratio に達する位置（範囲の端を出すのに使う）。 */
  function quantile(grid, ratio) {
    var cumulative = 0;
    for (var i = 0; i < grid.length; i += 1) {
      cumulative += grid[i].weight;
      if (cumulative >= ratio) return grid[i].ability;
    }
    return grid[grid.length - 1].ability;
  }

  function bandOf(score) {
    for (var i = 0; i < BANDS.length; i += 1) {
      if (score < BANDS[i].max) return BANDS[i];
    }
    return BANDS[BANDS.length - 1];
  }

  /** 軸上の1点を、いちばん意味の伝わる言い方にする。 */
  function labelOf(score) {
    var band = bandOf(score);
    if (band === BANDS[BANDS.length - 1]) return "共通テスト" + Math.round(score) + "点";
    return band.label;
  }

  function rangeLabel(low, high) {
    var lowLabel = labelOf(low);
    var highLabel = labelOf(high);
    if (lowLabel === highLabel) return lowLabel;
    return lowLabel + " 〜 " + highLabel;
  }

  function levelSummary(attempts, level) {
    var subset = attempts.filter(function (item) {
      return levelOf(item) === level;
    });
    var correct = subset.filter(function (item) {
      return item.firstCorrect;
    }).length;
    return {
      level: level,
      answered: subset.length,
      correct: correct,
      accuracy: subset.length ? correct / subset.length : 0,
      difficulty: LEVEL_DIFFICULTY[level]
    };
  }

  /**
   * 範囲を狭めるのにいちばん効くレベル。
   * 推定の中心に近い難しさほど情報量が多く、すでに解いた数が多いほど新しい情報は減る。
   * その2つを足し合わせて、いちばん小さいものを選ぶ。
   */
  var ANSWER_PENALTY = 1.5;

  function nextUsefulLevel(levels, point) {
    return levels
      .slice()
      .sort(function (a, b) {
        var costA = Math.abs(a.difficulty - point) + a.answered * ANSWER_PENALTY;
        var costB = Math.abs(b.difficulty - point) + b.answered * ANSWER_PENALTY;
        return costA - costB;
      })[0];
  }

  function summarizeAttempts(attempts) {
    var correct = attempts.filter(function (item) {
      return item.firstCorrect;
    }).length;
    return {
      answered: attempts.length,
      correct: correct,
      accuracy: attempts.length ? correct / attempts.length : 0
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
   * ready が false のときは、まだ範囲を出さずに必要な解答数だけを返す。
   */
  function estimate(attempts) {
    var list = attempts || [];
    var overall = summarizeAttempts(list);

    if (overall.answered < MIN_ANSWERS) {
      return {
        ready: false,
        answered: overall.answered,
        needMore: MIN_ANSWERS - overall.answered,
        minAnswers: MIN_ANSWERS,
        scaleMin: SCALE_MIN,
        scaleMax: SCALE_MAX,
        bands: BANDS
      };
    }

    var grid = posterior(list);
    var point = mean(grid);
    var low = quantile(grid, (1 - CREDIBLE) / 2);
    var high = quantile(grid, 1 - (1 - CREDIBLE) / 2);
    var width = high - low;
    var levels = [1, 2, 3].map(function (level) {
      return levelSummary(list, level);
    });
    var next = nextUsefulLevel(levels, point);

    return {
      ready: true,
      answered: overall.answered,
      correct: overall.correct,
      accuracyPercent: Math.round(overall.accuracy * 100),
      scaleMin: SCALE_MIN,
      scaleMax: SCALE_MAX,
      bands: BANDS,
      credible: CREDIBLE,
      low: Math.round(low),
      high: Math.round(high),
      point: Math.round(point),
      width: Math.round(width),
      lowLabel: labelOf(low),
      highLabel: labelOf(high),
      pointLabel: labelOf(point),
      rangeLabel: rangeLabel(low, high),
      precision: width <= NARROW_WIDTH ? "narrow" : width >= WIDE_WIDTH ? "wide" : "medium",
      levels: levels,
      nextLevel: next,
      byArea: breakdownBy(list, function (item) {
        return item.kind;
      }),
      byGroup: breakdownBy(list, function (item) {
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
    SCALE_MIN: SCALE_MIN,
    SCALE_MAX: SCALE_MAX,
    BANDS: BANDS,
    LEVEL_DIFFICULTY: LEVEL_DIFFICULTY,
    GUESS: GUESS,
    MIN_ANSWERS: MIN_ANSWERS,
    CREDIBLE: CREDIBLE,
    correctChance: correctChance,
    posterior: posterior,
    labelOf: labelOf,
    rangeLabel: rangeLabel,
    nextUsefulLevel: nextUsefulLevel,
    estimate: estimate,
    weakestGroup: weakestGroup
  };
});
