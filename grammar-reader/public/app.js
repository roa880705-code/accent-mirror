"use strict";

/* 英文法・英語読解トレーナー フロントエンド
   - 出題は「空所に入る語＋その根拠」を一体で選ぶ2択
   - 初見問題モード: まだ解いていない問題だけを出し、その結果から共通テスト換算の推定点を出す
   - 復習問題モード: 一度間違えた問題を日を置いて再出題する（推定点には反映しない）
   - 学習記録は localStorage（reviewPlanner.js が box 管理、scoreEstimator.js が換算）  */

var STORAGE_KEY = "grammarReader.state.v1";
var SESSION_SIZE = 3; // 初見1セットの問題数
var planner = window.ReviewPlanner;
var estimator = window.ScoreEstimator;

var contentSummary = null;
var progress = loadProgress();
var session = null; // 演習中のセッション
var reading = null; // 読解中の状態

/* ---------- 小さなヘルパー ---------- */

function $(id) {
  return document.getElementById(id);
}

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function show(id) {
  var screens = document.querySelectorAll(".screen");
  for (var i = 0; i < screens.length; i += 1) screens[i].classList.add("hidden");
  $(id).classList.remove("hidden");
  window.scrollTo(0, 0);
}

function getJson(url) {
  return fetch(url).then(function (res) {
    if (!res.ok) throw new Error(url + " -> " + res.status);
    return res.json();
  });
}

function postJson(url, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(function (res) {
    if (!res.ok) throw new Error(url + " -> " + res.status);
    return res.json();
  });
}

/* ---------- 問題の取得 ----------
   通常はサーバーの API から取る。1枚版（scripts/build-standalone.js が作る HTML）では
   同じ内容が window.GRAMMAR_READER_DATA に埋め込まれているので、そちらから読む。 */

var embedded = window.GRAMMAR_READER_DATA || null;

function loadContent() {
  return embedded ? Promise.resolve(embedded.content) : getJson("/api/content");
}

var practiceQuestions = null; // 一度取ったら使い回す

function flattenEmbedded(units, kind) {
  return Object.keys(units || {}).reduce(function (list, unitId) {
    var unit = units[unitId];
    return list.concat(
      unit.questions.map(function (question) {
        return { kind: kind, groupId: unit.id, groupTitle: unit.title, question: question };
      })
    );
  }, []);
}

function loadPracticeQuestions() {
  if (practiceQuestions) return Promise.resolve(practiceQuestions);
  var source = embedded
    ? Promise.resolve({
        questions: flattenEmbedded(embedded.units, "grammar").concat(flattenEmbedded(embedded.vocabUnits, "vocab"))
      })
    : getJson("/api/practice/questions");
  return source.then(function (data) {
    practiceQuestions = data.questions;
    return practiceQuestions;
  });
}

function loadReadingPassage(passageId) {
  if (!embedded) return getJson("/api/reading/passages/" + encodeURIComponent(passageId));
  var passage = embedded.passages[passageId];
  return passage ? Promise.resolve({ passage: passage }) : Promise.reject(new Error("passage_not_found: " + passageId));
}

function loadReviewQuestions(items) {
  if (!embedded) return postJson("/api/review/questions", { items: items });
  var questions = items
    .map(function (item) {
      var groups =
        item.kind === "grammar" ? embedded.units : item.kind === "vocab" ? embedded.vocabUnits : embedded.passages;
      var group = groups[item.groupId];
      if (!group) return null;
      var question = group.questions.filter(function (candidate) {
        return candidate.id === item.questionId;
      })[0];
      if (!question) return null;
      return {
        kind: item.kind,
        groupId: item.groupId,
        groupTitle: group.title,
        question: question
      };
    })
    .filter(Boolean);
  return Promise.resolve({ questions: questions });
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

/* ---------- 学習記録 ---------- */

function loadProgress() {
  try {
    var raw = window.localStorage.getItem(STORAGE_KEY);
    return planner.normalizeState(raw ? JSON.parse(raw) : null);
  } catch (err) {
    return planner.createState();
  }
}

function saveProgress() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    /* プライベートモードなどで保存できなくても演習は続けられる */
  }
}

function recordAnswer(kind, groupId, question, correct) {
  planner.recordAnswer(progress, {
    kind: kind,
    groupId: groupId,
    questionId: question.id,
    level: question.level,
    correct: correct
  });
  saveProgress();
}

function currentEstimate() {
  return estimator.estimate(planner.firstAttempts(progress));
}

function unseenIds(kind, groupId, questionIds) {
  return questionIds.filter(function (id) {
    return !planner.hasSeen(progress, kind, groupId, id);
  });
}

function totalUnseen(kind, groups) {
  return groups.reduce(function (total, group) {
    return total + unseenIds(kind, group.id, group.questionIds).length;
  }, 0);
}

/* ---------- ホーム ---------- */

function refreshHomeStats() {
  var summary = planner.summarize(progress);
  $("statAnswered").textContent = String(summary.answered);
  $("statAccuracy").textContent = summary.answered ? summary.accuracy + "%" : "--";
  $("statDue").textContent = String(summary.dueNow);
  $("statMastered").textContent = String(summary.mastered);

  var est = currentEstimate();
  renderScoreBlock($("homeScoreBlock"), est, false);

  var practiceLeft = totalUnseen("grammar", contentSummary.grammar.units) + totalUnseen("vocab", contentSummary.vocab.units);
  var readingLeft = totalUnseen("reading", contentSummary.reading.passages);
  $("freshCardNote").textContent =
    practiceLeft + readingLeft > 0
      ? "次は レベル" + progress.difficulty.target + " の問題を3問。初見は残り " + (practiceLeft + readingLeft) +
        "問（文法・語彙 " + practiceLeft + "／読解 " + readingLeft + "）。"
      : "初見の問題はすべて解き終わりました。";
  $("homeRankNote").textContent = est.ready
    ? est.scoreReady
      ? "レベル3までクリア。共通テスト換算で表示しています。"
      : est.rank.goal + "まで あと" + est.rank.steps + "歩。上の階級は、上のレベルの問題を解いて初めて届きます。"
    : "";

  var reviewCard = $("goReviewButton");
  if (summary.dueNow > 0) {
    reviewCard.classList.add("has-due");
    $("reviewCardNote").textContent = "復習待ち " + summary.dueNow + " 問。2回続けて正解すると習得済みになります。";
  } else {
    reviewCard.classList.remove("has-due");
    $("reviewCardNote").textContent =
      summary.answered > 0 ? "今すぐ復習する問題はありません。" : "復習待ちはまだありません。";
  }
}

function goHome() {
  refreshHomeStats();
  show("homeScreen");
}

/* ---------- 初見問題モード ---------- */

function areaLabel(key) {
  if (key === "grammar") return "文法";
  if (key === "vocab") return "語彙";
  if (key === "reading") return "読解";
  return key;
}

function groupTitle(groupId) {
  var unit = contentSummary.grammar.units.concat(contentSummary.vocab.units).filter(function (item) {
    return item.id === groupId;
  })[0];
  if (unit) return unit.title;
  var passage = contentSummary.reading.passages.filter(function (item) {
    return item.id === groupId;
  })[0];
  return passage ? passage.title : groupId;
}

function breakdownRow(label, summary) {
  var row = el("div", "breakdown-row");
  row.appendChild(el("span", "breakdown-label", label));
  var bar = el("span", "breakdown-bar");
  var fill = el("span", "breakdown-bar-fill");
  fill.style.width = Math.round(summary.accuracy * 100) + "%";
  bar.appendChild(fill);
  row.appendChild(bar);
  row.appendChild(el("span", "breakdown-value", Math.round(summary.accuracy * 100) + "%（" + summary.answered + "問）"));
  return row;
}

/* ---------- 実力表示（ホームと初見モードで共用） ----------
   共通テストの点数は、レベル3までクリアして初めて出す。
   それまでは英検相当の階級と「あと何歩か」で現在地を示す。 */

function stepDots(stepsLeft, max) {
  var row = el("span", "step-dots");
  for (var i = 0; i < max; i += 1) {
    row.appendChild(el("span", "step-dot" + (i < max - stepsLeft ? " done" : "")));
  }
  return row;
}

function meter(ratio) {
  var bar = el("div", "score-meter");
  var fill = el("div", "score-meter-fill");
  fill.style.width = Math.round(clampRatio(ratio) * 100) + "%";
  bar.appendChild(fill);
  return bar;
}

function clampRatio(value) {
  return Math.min(1, Math.max(0, value));
}

function levelRow(summary) {
  var row = el("div", "level-row" + (summary.cleared ? " is-cleared" : ""));
  row.appendChild(el("span", "level-row-name", "レベル " + summary.level));
  var bar = el("span", "breakdown-bar");
  var fill = el("span", "breakdown-bar-fill");
  fill.style.width = Math.round(summary.accuracy * 100) + "%";
  bar.appendChild(fill);
  row.appendChild(bar);
  var note;
  if (summary.impliedByHigher) note = "クリア（上のレベル達成による）";
  else if (summary.cleared) note = "クリア";
  else if (summary.answered === 0) note = "未挑戦";
  else if (summary.answered < summary.minAnswers) note = "あと" + (summary.minAnswers - summary.answered) + "問";
  else note = "正答率が不足";
  row.appendChild(
    el("span", "level-row-value", Math.round(summary.accuracy * 100) + "%（" + summary.answered + "問）・" + note)
  );
  return row;
}

function renderScoreBlock(node, est, detailed) {
  clear(node);

  if (!est.ready) {
    node.appendChild(
      el(
        "p",
        "lead",
        est.answered === 0
          ? "初見問題を " + est.minAnswers + "問 解くと、いまのレベルを判定します。"
          : "初見 " + est.answered + "問。あと " + est.needMore + "問で、いまのレベルを判定します。"
      )
    );
    return;
  }

  var rank = est.rank;

  if (est.scoreReady) {
    var headline = el("div", "score-headline");
    headline.appendChild(el("span", "score-label", "共通テスト英語 Reading"));
    var value = el("span", "score-value");
    value.appendChild(el("strong", null, String(est.score)));
    value.appendChild(document.createTextNode("点"));
    headline.appendChild(value);
    node.appendChild(headline);
    node.appendChild(el("div", "score-range", rank.label + "／推定の幅 " + est.low + "〜" + est.high + "点"));
    node.appendChild(meter(est.score / 100));
  } else {
    node.appendChild(el("div", "rank-headline", rank.label));
    var stepRow = el("div", "step-row");
    stepRow.appendChild(el("span", "step-goal", rank.goal + "まで"));
    stepRow.appendChild(stepDots(rank.steps, estimator.MAX_STEPS));
    stepRow.appendChild(el("span", "step-count", "あと" + rank.steps + "歩"));
    node.appendChild(stepRow);
    node.appendChild(meter(rank.ladderProgress));
  }

  node.appendChild(el("p", "minor", rank.message));
  node.appendChild(
    el(
      "p",
      "minor",
      "初見 " + est.answered + "問／難易度で重みをつけた正答率 " + est.accuracyPercent + "%" +
        (est.stable ? "。判定はほぼ安定しています。" : "。あと " + est.untilStable + "問で安定します。")
    )
  );

  if (!detailed) return;

  var levels = el("div", "score-breakdown");
  levels.appendChild(el("div", "feedback-label", "難易度ごとの到達（初見のみ）"));
  rank.levels.forEach(function (summary) {
    levels.appendChild(levelRow(summary));
  });
  levels.appendChild(el("div", "feedback-label", "分野別"));
  est.byArea.forEach(function (area) {
    levels.appendChild(breakdownRow(areaLabel(area.key), area));
  });
  node.appendChild(levels);

  var weakest = estimator.weakestGroup(est);
  if (weakest && weakest.accuracy < 0.8) {
    var weak = el("div", "weak-point");
    weak.appendChild(el("span", "weak-point-label", "いちばん弱いところ"));
    weak.appendChild(
      el(
        "span",
        "weak-point-body",
        groupTitle(weakest.key) + "　初見の加重正答率 " + Math.round(weakest.accuracy * 100) + "%（" + weakest.answered + "問）"
      )
    );
    node.appendChild(weak);
  }

  var details = el("details", "score-note");
  details.appendChild(el("summary", null, "この判定の出し方"));
  var body = el("div", "score-note-body");
  [
    "材料は初見（1回目）の解答だけです。復習の結果は、答えを覚えているぶん実力より高く出るので使いません。",
    "階級は「解いた問題の難易度」で決まります。やさしい問題だけを正解しても上の階級には届きません。レベル1をクリアで" +
      estimator.TIERS[1].clearedLabel + "、レベル2で" + estimator.TIERS[2].clearedLabel + "、レベル3で" +
      estimator.TIERS[3].clearedLabel + "です。",
    "クリアの条件は、そのレベルを " + estimator.TIERS[2].minAnswers + "問前後解いたうえで、2択のまぐれ当たりを差し引いた到達度が基準を超えること（素の正答率でおよそ8割）。",
    "共通テストの点数は、レベル3をクリアして初めて出します。到達度と点数の対応は" +
      estimator.ANCHORS.map(function (anchor) {
        return " " + Math.round(anchor[0] * 100) + "%→" + anchor[1] + "点";
      }).join("、") + "（あいだは直線で補間）。",
    "本アプリの問題で測った目安であり、公式の換算表でも英検の合否判定でもありません。本番の分量（およそ6000語・80分）は再現していないため、全問正解でも " +
      estimator.ANCHORS[estimator.ANCHORS.length - 1][1] + "点で頭打ちにしています。"
  ].forEach(function (line) {
    body.appendChild(el("p", null, line));
  });
  details.appendChild(body);
  node.appendChild(details);
}

function renderFreshScreen() {
  renderScoreBlock($("freshScoreBlock"), currentEstimate(), true);
  var grammarLeft = totalUnseen("grammar", contentSummary.grammar.units);
  var vocabLeft = totalUnseen("vocab", contentSummary.vocab.units);
  var readingLeft = totalUnseen("reading", contentSummary.reading.passages);
  $("freshLevelLabel").textContent = "レベル " + progress.difficulty.target;
  $("freshGrammarNote").textContent = grammarLeft + vocabLeft
    ? "文法と語彙をまたいで、いまのレベルに近い問題から出します。初見の残り " + (grammarLeft + vocabLeft) +
      "問（文法 " + grammarLeft + "／語彙 " + vocabLeft + "）。全問正解で次はレベルが上がります。"
    : "初見の文法・語彙問題はもうありません（復習問題モードへ）";
  $("freshReadingNote").textContent = readingLeft
    ? "本文を読んでから設問4問。初見の設問が " + readingLeft + "問 残っています"
    : "初見の設問はもうありません（復習問題モードへ）";
  show("freshScreen");
}

/* ---------- 復習問題モード ---------- */

function renderReviewScreen() {
  var summary = planner.summarize(progress);
  $("reviewDueCount").textContent = String(summary.dueNow);
  $("reviewLearningCount").textContent = String(summary.learning);
  $("reviewMasteredCount").textContent = String(summary.mastered);

  var nextDue = null;
  Object.keys(progress.items).forEach(function (key) {
    var item = progress.items[key];
    if (planner.isMastered(item) || typeof item.dueAt !== "number") return;
    if (item.dueAt > Date.now() && (nextDue === null || item.dueAt < nextDue)) nextDue = item.dueAt;
  });

  if (summary.dueNow > 0) {
    $("reviewScheduleNote").textContent = "いま " + summary.dueNow + " 問が復習の時期です（1回20問まで出題します）。";
  } else if (nextDue) {
    $("reviewScheduleNote").textContent = "次の復習は " + formatDate(nextDue) + " からです。";
  } else {
    $("reviewScheduleNote").textContent = "まだ復習対象がありません。初見問題モードから始めてください。";
  }
  $("startReviewButton").disabled = summary.dueNow === 0;
  show("reviewScreen");
}

/* ---------- 一覧（初見問題モード） ---------- */

function renderReadingList() {
  var listNode = $("readingPassageList");
  clear(listNode);
  contentSummary.reading.passages.forEach(function (passage) {
    var left = unseenIds("reading", passage.id, passage.questionIds).length;
    var stats = planner.groupStats(progress, passage.id);
    var button = el("button", "list-item");
    button.type = "button";
    if (left === 0) button.classList.add("is-done");

    var head = el("div", "list-item-head");
    head.appendChild(el("span", "list-item-order", "Passage " + passage.order));
    head.appendChild(el("span", "list-item-title", passage.title));
    button.appendChild(head);
    button.appendChild(el("div", "list-item-sub", passage.titleJa + "／" + passage.topic));

    var tags = el("div", "tag-row");
    tags.appendChild(el("span", "tag", passage.wordCount + " words"));
    tags.appendChild(el("span", "tag accent", "レベル " + passage.level));
    tags.appendChild(el("span", left > 0 ? "tag accent" : "tag", left > 0 ? "初見 " + left + "問" : "初見なし"));
    if (stats.answered > 0) {
      tags.appendChild(el("span", stats.accuracy >= 75 ? "tag ok" : "tag ng", "正答率 " + stats.accuracy + "%"));
    }
    button.appendChild(tags);

    button.addEventListener("click", function () {
      openReadingPassage(passage.id);
    });
    listNode.appendChild(button);
  });
  show("readingListScreen");
}

/* ---------- 2択＋根拠の描画（文法・読解で共用） ---------- */

function correctIndexOf(question) {
  for (var i = 0; i < question.options.length; i += 1) {
    if (question.options[i].correct === true) return i;
  }
  return 0;
}

// 正解が常に同じ位置に来ないよう、表示のたびに並びを入れ替える。
function shuffledOrder() {
  return Math.random() < 0.5 ? [0, 1] : [1, 0];
}

function renderOptionButtons(question, container, onPick) {
  var order = shuffledOrder();
  clear(container);
  order.forEach(function (optionIndex, displayIndex) {
    var option = question.options[optionIndex];
    var button = el("button", "choice");
    button.type = "button";
    button.appendChild(el("span", "choice-mark", String.fromCharCode(65 + displayIndex)));
    var body = el("span", "choice-body");
    body.appendChild(el("span", "choice-answer", option.answer));
    body.appendChild(el("span", "choice-reason", option.reason));
    button.appendChild(body);
    button.addEventListener("click", function () {
      onPick(optionIndex);
    });
    container.appendChild(button);
  });
  return order;
}

function revealOptions(container, order, question, chosenIndex) {
  var buttons = container.querySelectorAll(".choice");
  for (var i = 0; i < buttons.length; i += 1) {
    var option = question.options[order[i]];
    buttons[i].disabled = true;
    buttons[i].classList.add(option.correct ? "is-correct" : "is-wrong");
    if (order[i] === chosenIndex) {
      buttons[i].classList.add("is-picked");
      buttons[i].appendChild(el("span", "picked-badge", "選んだ根拠"));
    }
  }
}

function feedbackBlock(label, text) {
  var block = el("div", "feedback-block");
  block.appendChild(el("div", "feedback-label", label));
  block.appendChild(el("div", "feedback-text", text));
  return block;
}

function renderFeedback(node, question, correct) {
  clear(node);
  node.className = "feedback " + (correct ? "correct" : "wrong");
  node.appendChild(el("div", "feedback-verdict", correct ? "正解" : "不正解"));

  var answerIndex = correctIndexOf(question);
  var right = question.options[answerIndex];
  var wrong = question.options[answerIndex === 0 ? 1 : 0];

  node.appendChild(feedbackBlock("正しい根拠", right.answer + " — " + right.reason));

  var wrongBlock = el("div", "feedback-block");
  wrongBlock.appendChild(el("div", "feedback-label", "もう一方の根拠はどこが違うか"));
  wrongBlock.appendChild(el("div", "feedback-text wrong-reason", "「" + wrong.reason + "」"));
  wrongBlock.appendChild(el("div", "feedback-text", question.misconception));
  node.appendChild(wrongBlock);

  if (question.translation) node.appendChild(feedbackBlock("和訳", question.translation));
  if (question.evidence) node.appendChild(feedbackBlock("本文の根拠", "“" + question.evidence + "”"));
  node.appendChild(feedbackBlock("解説", question.explanation));

  node.classList.remove("hidden");
}

/* ---------- 演習セッション ---------- */

function shuffled(list) {
  var copy = list.slice();
  for (var i = copy.length - 1; i > 0; i -= 1) {
    var j = Math.floor(Math.random() * (i + 1));
    var swap = copy[i];
    copy[i] = copy[j];
    copy[j] = swap;
  }
  return copy;
}

/** いまの出題レベルに近い問題を優先しつつ、分野はまたいでランダムに選ぶ。 */
function pickQuestions(pool, target, count) {
  return shuffled(pool)
    .sort(function (a, b) {
      return Math.abs(a.question.level - target) - Math.abs(b.question.level - target);
    })
    .slice(0, count);
}

function startRandomSession() {
  loadPracticeQuestions()
    .then(function (items) {
      var pool = items.filter(function (item) {
        return !planner.hasSeen(progress, item.kind, item.groupId, item.question.id);
      });
      if (!pool.length) {
        window.alert("初見の文法・語彙問題はすべて解き終わりました。復習問題モードか読解へどうぞ。");
        return;
      }
      var target = progress.difficulty.target;
      var picked = pickQuestions(pool, target, SESSION_SIZE);
      session = {
        kind: "fresh",
        eyebrow: "初見問題モード",
        title: "レベル" + target + " の問題 " + picked.length + "問",
        overview: "文法と語彙から、分野をまたいでランダムに出題します。全問正解すると、次のセットのレベルが上がります。",
        backTo: "fresh",
        scoreBefore: currentEstimate(),
        levelBefore: target,
        replay: startRandomSession,
        items: picked,
        index: 0,
        correctCount: 0,
        missed: []
      };
      renderQuizQuestion();
    })
    .catch(showLoadError);
}

function startReviewSession() {
  var due = planner.getDueItems(progress, Date.now(), 20);
  if (due.length === 0) {
    window.alert("いま復習が必要な問題はありません。初見問題モードから進めてください。");
    return;
  }
  var request = due.map(function (item) {
    return { kind: item.kind, groupId: item.groupId, questionId: item.questionId };
  });
  loadReviewQuestions(request)
    .then(function (data) {
      if (!data.questions.length) {
        window.alert("復習用の問題を取り出せませんでした。");
        return;
      }
      session = {
        kind: "review",
        eyebrow: "復習問題モード",
        title: "間違えた問題の復習",
        overview: "文法・読解の両方から、いま復習すべき問題を集めています。ここでの結果は推定点には反映しません。",
        backTo: "review",
        scoreBefore: null,
        replay: startReviewSession,
        items: data.questions,
        index: 0,
        correctCount: 0,
        missed: []
      };
      renderQuizQuestion();
    })
    .catch(showLoadError);
}

function renderPromptInto(node, text) {
  clear(node);
  var parts = String(text).split("____");
  parts.forEach(function (part, i) {
    if (i > 0) node.appendChild(el("span", "blank", "＿＿＿＿"));
    if (part) node.appendChild(document.createTextNode(part));
  });
}

function renderQuizQuestion() {
  var item = session.items[session.index];
  var question = item.question;

  $("quizEyebrow").textContent = session.eyebrow;
  $("quizTitle").textContent = session.title;
  $("quizCounter").textContent = session.index + 1 + " / " + session.items.length;
  $("quizProgress").style.width = Math.round((session.index / session.items.length) * 100) + "%";
  $("quizUnitOverview").textContent = session.overview || "";

  // 分野をまたいで出題するので、どのユニットの問題かを必ず添える
  var label = areaLabel(item.kind) + "／" + item.groupTitle;
  if (question.point || question.typeJa) label += "／" + (question.point || question.typeJa);
  if (question.level) label += "　レベル" + question.level;
  if (question.variant === "reason") label += "（根拠だけが違う2択）";
  $("quizPoint").textContent = label;

  renderPromptInto($("quizPrompt"), question.prompt);
  $("quizHint").textContent =
    question.variant === "reason"
      ? "入る語は同じです。根拠が正しいほうを選んでください。"
      : "語と根拠がセットです。根拠まで正しいほうを選んでください。";

  session.currentOrder = renderOptionButtons(question, $("quizChoices"), answerQuizQuestion);

  $("quizFeedback").classList.add("hidden");
  $("quizNextButton").classList.add("hidden");
  $("quizNextButton").textContent =
    session.index === session.items.length - 1 ? "結果を見る" : "次の問題へ";
  show("quizScreen");
}

function answerQuizQuestion(optionIndex) {
  var item = session.items[session.index];
  var question = item.question;
  var correct = question.options[optionIndex].correct === true;

  if (correct) session.correctCount += 1;
  else session.missed.push({ item: item, chosenIndex: optionIndex });
  recordAnswer(item.kind, item.groupId, question, correct);

  revealOptions($("quizChoices"), session.currentOrder, question, optionIndex);
  renderFeedback($("quizFeedback"), question, correct);
  $("quizNextButton").classList.remove("hidden");
  $("quizProgress").style.width = Math.round(((session.index + 1) / session.items.length) * 100) + "%";
}

function advanceQuiz() {
  if (session.index < session.items.length - 1) {
    session.index += 1;
    renderQuizQuestion();
    return;
  }
  renderResult();
}

function renderScoreShift() {
  var node = $("resultScoreShift");
  clear(node);
  if (session.kind !== "fresh") {
    node.classList.add("hidden");
    return;
  }
  var after = currentEstimate();
  node.classList.remove("hidden");
  if (!after.ready) {
    node.appendChild(el("div", "score-shift-text", "あと " + after.needMore + "問の初見で推定点が出ます。"));
    return;
  }
  var before = session.scoreBefore;
  var line = el("div", "score-shift-text");
  line.appendChild(el("span", "score-shift-label", "共通テスト英語 Reading 推定"));
  if (before && before.ready) {
    line.appendChild(el("span", "score-shift-old", before.score + "点"));
    line.appendChild(el("span", "score-shift-arrow", "→"));
  }
  line.appendChild(el("span", "score-shift-new", after.score + "点"));
  if (before && before.ready) {
    var diff = after.score - before.score;
    line.appendChild(
      el("span", "score-shift-diff " + (diff > 0 ? "up" : diff < 0 ? "down" : ""), diff > 0 ? "+" + diff : String(diff))
    );
  }
  node.appendChild(line);
  node.appendChild(el("div", "minor", "推定の幅 " + after.low + "〜" + after.high + "点／初見 " + after.answered + "問"));
}

function renderLevelShift(shift) {
  var node = $("resultLevelShift");
  clear(node);
  if (!shift) {
    node.classList.add("hidden");
    return;
  }
  node.classList.remove("hidden");
  node.appendChild(el("span", "level-shift-label", "次のセットの出題レベル"));
  if (shift.changed) {
    node.appendChild(
      el("span", "level-shift-body", "レベル" + shift.from + " → レベル" + shift.to + (shift.to > shift.from ? "（全問正解）" : "（少し戻します）"))
    );
  } else {
    node.appendChild(el("span", "level-shift-body", "レベル" + shift.to + " のまま（全問正解で上がります）"));
  }
}

function renderResult() {
  var total = session.items.length;
  var correct = session.correctCount;
  var accuracy = Math.round((correct / total) * 100);
  $("resultScore").textContent = correct + " / " + total;
  $("resultAccuracy").textContent = "正答率 " + accuracy + "%";

  var comment;
  if (correct === total) comment = "全問正解です。この調子で次のセットへ。";
  else if (total - correct === 1) comment = "取りこぼしは1問。間違えた問題は復習キューに入りました。";
  else comment = "誤った根拠のどこが違うかを読み直してから、次のセットへ進みましょう。";
  $("resultComment").textContent = comment;

  renderScoreShift();

  var levelShift = null;
  if (session.kind === "fresh") {
    levelShift = planner.applySessionResult(progress, correct, total);
    saveProgress();
  }
  renderLevelShift(levelShift);

  var missedNode = $("resultMissedList");
  clear(missedNode);
  if (session.missed.length) {
    missedNode.appendChild(el("div", "feedback-label", "選んだ根拠が誤っていた問題"));
    session.missed.forEach(function (entry) {
      var question = entry.item.question;
      var right = question.options[correctIndexOf(question)];
      var card = el("div", "missed-item");
      var prompt = el("div", "missed-item-prompt");
      renderPromptInto(prompt, question.prompt);
      card.appendChild(prompt);
      card.appendChild(el("div", "missed-item-answer", "選んだ根拠: " + question.options[entry.chosenIndex].reason));
      card.appendChild(el("div", "missed-item-answer", "正しい根拠: " + right.answer + " — " + right.reason));
      missedNode.appendChild(card);
    });
  }

  // 初見モードでは同じ問題は二度と出ないので、「次の3問」を出す
  $("resultRetryButton").textContent = session.kind === "fresh" ? "次の3問へ" : "もう一度解く";
  $("resultBackButton").textContent = session.backTo === "review" ? "復習モードに戻る" : "初見モードに戻る";
  show("resultScreen");
}

/* ---------- 読解 ---------- */

function openReadingPassage(passageId) {
  loadReadingPassage(passageId)
    .then(function (data) {
      reading = {
        passage: data.passage,
        startedAt: Date.now(),
        elapsedMs: null,
        timerId: null,
        answered: 0,
        correct: 0,
        showTranslation: false,
        scoreBefore: currentEstimate(),
        freshCount: unseenIds(
          "reading",
          data.passage.id,
          data.passage.questions.map(function (question) {
            return question.id;
          })
        ).length
      };
      renderReadingPassage();
    })
    .catch(showLoadError);
}

function renderReadingPassage() {
  var passage = reading.passage;
  $("readingTopic").textContent = passage.topic + "／レベル " + passage.level;
  $("readingTitle").textContent = passage.title;
  $("readingMeta").textContent = passage.titleJa + "　" + passage.wordCount + " words";
  $("readingFreshNote").textContent =
    reading.freshCount === passage.questions.length
      ? "設問 " + passage.questions.length + "問すべてが初見です。"
      : reading.freshCount > 0
        ? "設問 " + passage.questions.length + "問のうち初見は " + reading.freshCount + "問です（推定点に反映されるのはこの分だけ）。"
        : "この本文の設問はすべて解答済みです。推定点は変わりません。";

  var glossaryNode = $("readingGlossary");
  clear(glossaryNode);
  passage.glossary.forEach(function (entry) {
    var row = el("div", "glossary-row");
    row.appendChild(el("span", "glossary-word", entry.word));
    row.appendChild(el("span", "glossary-meaning", entry.meaning));
    glossaryNode.appendChild(row);
  });
  glossaryNode.classList.add("hidden");
  $("toggleGlossaryButton").classList.remove("active");
  $("toggleGlossaryButton").textContent = "語注を見る";

  reading.showTranslation = false;
  $("toggleTranslationButton").classList.remove("active");
  $("toggleTranslationButton").textContent = "段落の和訳を見る";

  renderReadingBody();

  $("readingQuestionsCard").classList.add("hidden");
  $("readingNotesCard").classList.add("hidden");
  $("readingToQuestionsButton").classList.remove("hidden");
  $("readingShowNotesButton").classList.add("hidden");

  startReadingTimer();
  show("readingScreen");
}

function renderReadingBody() {
  var passage = reading.passage;
  var bodyNode = $("readingBody");
  clear(bodyNode);
  passage.paragraphs.forEach(function (paragraph, index) {
    var block = el("div", "reading-paragraph");
    block.appendChild(el("span", "reading-paragraph-index", "第" + (index + 1) + "段落"));
    block.appendChild(document.createTextNode(paragraph));
    if (reading.showTranslation && passage.translations[index]) {
      block.appendChild(el("div", "paragraph-translation", passage.translations[index]));
    }
    bodyNode.appendChild(block);
  });
}

function startReadingTimer() {
  stopReadingTimer();
  reading.startedAt = Date.now();
  $("readingTimer").textContent = "0:00";
  reading.timerId = window.setInterval(function () {
    var seconds = Math.floor((Date.now() - reading.startedAt) / 1000);
    var mm = Math.floor(seconds / 60);
    var ss = seconds % 60;
    $("readingTimer").textContent = mm + ":" + (ss < 10 ? "0" : "") + ss;
  }, 1000);
}

function stopReadingTimer() {
  if (reading && reading.timerId) {
    window.clearInterval(reading.timerId);
    reading.timerId = null;
  }
}

function goToReadingQuestions() {
  reading.elapsedMs = Date.now() - reading.startedAt;
  stopReadingTimer();

  var minutes = reading.elapsedMs / 60000;
  var wpm = minutes > 0 ? Math.round(reading.passage.wordCount / minutes) : 0;
  var seconds = Math.round(reading.elapsedMs / 1000);
  var elapsedText = "読了時間 " + Math.floor(seconds / 60) + "分" + (seconds % 60) + "秒";
  if (seconds < 15) {
    // 読まずに進んだ場合に極端な数値が出るのを防ぐ
    $("readingWpm").textContent = elapsedText + "／短すぎるため読む速さは計測していません。";
  } else {
    var pace = wpm >= 150 ? "速め" : wpm >= 100 ? "標準的なペース" : "じっくり読むペース";
    $("readingWpm").textContent =
      elapsedText + "／約 " + wpm + " wpm（" + pace + "）。高校レベルの英文は 100〜150 wpm が目安です。";
  }

  renderReadingQuestions();
  $("readingQuestionsCard").classList.remove("hidden");
  $("readingToQuestionsButton").classList.add("hidden");
  $("readingQuestionsCard").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderReadingQuestions() {
  var passage = reading.passage;
  var listNode = $("readingQuestionList");
  clear(listNode);

  passage.questions.forEach(function (question, qIndex) {
    var block = el("div", "reading-question");
    var label = "設問 " + (qIndex + 1) + "／" + question.typeJa + "　レベル" + question.level;
    if (question.variant === "reason") label += "（根拠だけが違う2択）";
    if (planner.hasSeen(progress, "reading", passage.id, question.id)) label += "　解答済み";
    block.appendChild(el("div", "eyebrow", label));
    block.appendChild(el("p", "reading-question-prompt", question.prompt));

    var choicesNode = el("div", "choice-list");
    var feedbackNode = el("div", "feedback hidden");
    var order = renderOptionButtons(question, choicesNode, function (optionIndex) {
      answerReadingQuestion(question, optionIndex, choicesNode, feedbackNode, order);
    });

    block.appendChild(choicesNode);
    block.appendChild(feedbackNode);
    listNode.appendChild(block);
  });
}

function answerReadingQuestion(question, optionIndex, choicesNode, feedbackNode, order) {
  var buttons = choicesNode.querySelectorAll(".choice");
  if (buttons.length && buttons[0].disabled) return; // 二重解答を防ぐ

  var correct = question.options[optionIndex].correct === true;
  reading.answered += 1;
  if (correct) reading.correct += 1;
  recordAnswer("reading", reading.passage.id, question, correct);

  revealOptions(choicesNode, order, question, optionIndex);
  renderFeedback(feedbackNode, question, correct);

  if (reading.answered === reading.passage.questions.length) {
    var button = $("readingShowNotesButton");
    button.textContent =
      "設問 " + reading.correct + "/" + reading.passage.questions.length + " 正解　構文解説と全文和訳を見る";
    button.classList.remove("hidden");
  }
}

function showReadingNotes() {
  var passage = reading.passage;

  var keyNode = $("readingKeySentences");
  clear(keyNode);
  passage.keySentences.forEach(function (entry) {
    var card = el("div", "key-sentence");
    card.appendChild(el("div", "key-sentence-text", entry.text));
    card.appendChild(el("div", "key-sentence-structure", entry.structure));
    card.appendChild(el("div", "key-sentence-translation", entry.translation));
    keyNode.appendChild(card);
  });

  var transNode = $("readingFullTranslation");
  clear(transNode);
  passage.translations.forEach(function (paragraph, index) {
    var wrapper = el("div");
    wrapper.appendChild(el("span", "reading-paragraph-index", "第" + (index + 1) + "段落"));
    wrapper.appendChild(el("p", null, paragraph));
    transNode.appendChild(wrapper);
  });

  $("readingNotesCard").classList.remove("hidden");
  $("readingShowNotesButton").classList.add("hidden");
  $("readingNotesCard").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- 起動 ---------- */

function showLoadError(err) {
  $("footerStatus").textContent = "読み込みに失敗しました: " + err.message;
}

function bindEvents() {
  $("headerHomeButton").addEventListener("click", function () {
    stopReadingTimer();
    goHome();
  });
  $("goFreshButton").addEventListener("click", renderFreshScreen);
  $("goReviewButton").addEventListener("click", renderReviewScreen);
  $("startReviewButton").addEventListener("click", startReviewSession);
  $("startRandomButton").addEventListener("click", startRandomSession);
  $("freshReadingButton").addEventListener("click", renderReadingList);

  $("resetProgressButton").addEventListener("click", function () {
    if (!window.confirm("学習の記録をすべて消します。よろしいですか？")) return;
    progress = planner.createState();
    saveProgress();
    refreshHomeStats();
  });

  $("quizNextButton").addEventListener("click", advanceQuiz);
  $("resultRetryButton").addEventListener("click", function () {
    session.replay();
  });
  $("resultBackButton").addEventListener("click", function () {
    if (session.backTo === "review") renderReviewScreen();
    else renderFreshScreen();
  });

  $("toggleGlossaryButton").addEventListener("click", function () {
    var node = $("readingGlossary");
    var willShow = node.classList.contains("hidden");
    node.classList.toggle("hidden", !willShow);
    this.classList.toggle("active", willShow);
    this.textContent = willShow ? "語注を隠す" : "語注を見る";
  });

  $("toggleTranslationButton").addEventListener("click", function () {
    reading.showTranslation = !reading.showTranslation;
    this.classList.toggle("active", reading.showTranslation);
    this.textContent = reading.showTranslation ? "段落の和訳を隠す" : "段落の和訳を見る";
    renderReadingBody();
  });

  $("readingToQuestionsButton").addEventListener("click", goToReadingQuestions);
  $("readingShowNotesButton").addEventListener("click", showReadingNotes);
  $("readingBackButton").addEventListener("click", renderReadingList);
}

function boot() {
  bindEvents();
  loadContent()
    .then(function (data) {
      contentSummary = data;
      $("footerStatus").textContent =
        "文法 " + data.grammar.questionCount + "問／語彙 " + data.vocab.questionCount + "問／読解 " +
        data.reading.passageCount + "本・設問 " + data.reading.questionCount + "問";
      goHome();
    })
    .catch(showLoadError);
}

boot();
