"use strict";

/* 英文法・英語読解トレーナー フロントエンド
   - 問題は /api から取得
   - 学習記録は localStorage（reviewPlanner.js のロジックで box 管理）    */

var STORAGE_KEY = "grammarReader.state.v1";
var planner = window.ReviewPlanner;

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

function recordAnswer(kind, groupId, questionId, correct) {
  planner.recordAnswer(progress, { kind: kind, groupId: groupId, questionId: questionId, correct: correct });
  saveProgress();
}

function refreshHomeStats() {
  var summary = planner.summarize(progress);
  $("statAnswered").textContent = String(summary.answered);
  $("statAccuracy").textContent = summary.answered ? summary.accuracy + "%" : "--";
  $("statDue").textContent = String(summary.dueNow);
  $("statMastered").textContent = String(summary.mastered);

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

/* ---------- ホーム ---------- */

function goHome() {
  refreshHomeStats();
  show("homeScreen");
}

/* ---------- 文法ユニット一覧 ---------- */

function renderGrammarList() {
  var listNode = $("grammarUnitList");
  clear(listNode);
  contentSummary.grammar.units.forEach(function (unit) {
    var stats = planner.groupStats(progress, unit.id);
    var button = el("button", "list-item");
    button.type = "button";

    var head = el("div", "list-item-head");
    head.appendChild(el("span", "list-item-order", "Unit " + unit.order));
    head.appendChild(el("span", "list-item-title", unit.title));
    button.appendChild(head);
    button.appendChild(el("div", "list-item-sub", unit.subtitle));

    var tags = el("div", "tag-row");
    tags.appendChild(el("span", "tag", unit.questionCount + "問"));
    if (stats.answered > 0) {
      var tone = stats.accuracy >= 80 ? "tag ok" : stats.accuracy >= 50 ? "tag" : "tag ng";
      tags.appendChild(el("span", tone, "正答率 " + stats.accuracy + "%（" + stats.answered + "問解答）"));
    } else {
      tags.appendChild(el("span", "tag accent", "未着手"));
    }
    button.appendChild(tags);

    button.addEventListener("click", function () {
      startGrammarUnit(unit.id);
    });
    listNode.appendChild(button);
  });
  show("grammarListScreen");
}

/* ---------- 読解パッセージ一覧 ---------- */

function renderReadingList() {
  var listNode = $("readingPassageList");
  clear(listNode);
  contentSummary.reading.passages.forEach(function (passage) {
    var stats = planner.groupStats(progress, passage.id);
    var button = el("button", "list-item");
    button.type = "button";

    var head = el("div", "list-item-head");
    head.appendChild(el("span", "list-item-order", "Passage " + passage.order));
    head.appendChild(el("span", "list-item-title", passage.title));
    button.appendChild(head);
    button.appendChild(el("div", "list-item-sub", passage.titleJa + "／" + passage.topic));

    var tags = el("div", "tag-row");
    tags.appendChild(el("span", "tag", passage.wordCount + " words"));
    tags.appendChild(el("span", "tag", "設問 " + passage.questionCount + "問"));
    tags.appendChild(el("span", "tag accent", "レベル " + passage.level));
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

/* ---------- 演習セッション（文法ドリル・復習で共用） ---------- */

function startGrammarUnit(unitId) {
  getJson("/api/grammar/units/" + encodeURIComponent(unitId))
    .then(function (data) {
      var unit = data.unit;
      session = {
        mode: "grammar",
        eyebrow: "文法ドリル",
        title: unit.title,
        overview: unit.overview,
        backTo: "grammar",
        replay: function () {
          startGrammarUnit(unitId);
        },
        items: unit.questions.map(function (question) {
          return { kind: "grammar", groupId: unit.id, groupTitle: unit.title, question: question };
        }),
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
    window.alert("いま復習が必要な問題はありません。文法ドリルか読解を進めてみてください。");
    return;
  }
  var request = due.map(function (item) {
    return { kind: item.kind, groupId: item.groupId, questionId: item.questionId };
  });
  postJson("/api/review/questions", { items: request })
    .then(function (data) {
      if (!data.questions.length) {
        window.alert("復習用の問題を取り出せませんでした。");
        return;
      }
      session = {
        mode: "review",
        eyebrow: "復習",
        title: "間違えた問題の復習",
        overview: "文法・読解の両方から、いま復習すべき問題を集めています。2回続けて正解すると習得済みになります。",
        backTo: "home",
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

  var label = question.point || question.typeJa || "";
  if (session.mode === "review") {
    label = (item.kind === "grammar" ? "文法" : "読解") + "／" + item.groupTitle + (label ? "／" + label : "");
  }
  $("quizPoint").textContent = label;

  renderPromptInto($("quizPrompt"), question.prompt);

  var choicesNode = $("quizChoices");
  clear(choicesNode);
  question.choices.forEach(function (choice, index) {
    var button = el("button", "choice");
    button.type = "button";
    button.appendChild(el("span", "choice-mark", String.fromCharCode(65 + index)));
    button.appendChild(el("span", "choice-text", choice));
    button.addEventListener("click", function () {
      answerQuizQuestion(index);
    });
    choicesNode.appendChild(button);
  });

  $("quizFeedback").classList.add("hidden");
  $("quizNextButton").classList.add("hidden");
  $("quizNextButton").textContent =
    session.index === session.items.length - 1 ? "結果を見る" : "次の問題へ";
  show("quizScreen");
}

function answerQuizQuestion(chosenIndex) {
  var item = session.items[session.index];
  var question = item.question;
  var correct = chosenIndex === question.answerIndex;

  if (correct) session.correctCount += 1;
  else session.missed.push({ item: item, chosenIndex: chosenIndex });
  recordAnswer(item.kind, item.groupId, question.id, correct);

  var buttons = $("quizChoices").querySelectorAll(".choice");
  for (var i = 0; i < buttons.length; i += 1) {
    buttons[i].disabled = true;
    if (i === question.answerIndex) buttons[i].classList.add("is-correct");
    else if (i === chosenIndex) buttons[i].classList.add("is-wrong");
    else buttons[i].classList.add("is-dimmed");
  }

  renderFeedback($("quizFeedback"), item, question, correct);
  $("quizNextButton").classList.remove("hidden");
  $("quizProgress").style.width = Math.round(((session.index + 1) / session.items.length) * 100) + "%";
}

function renderFeedback(node, item, question, correct) {
  clear(node);
  node.className = "feedback " + (correct ? "correct" : "wrong");
  node.appendChild(el("div", "feedback-verdict", correct ? "正解" : "不正解"));

  var answerBlock = el("div", "feedback-block");
  answerBlock.appendChild(el("div", "feedback-label", "正解"));
  answerBlock.appendChild(el("div", "feedback-text", question.choices[question.answerIndex]));
  node.appendChild(answerBlock);

  if (question.translation) {
    var transBlock = el("div", "feedback-block");
    transBlock.appendChild(el("div", "feedback-label", "和訳"));
    transBlock.appendChild(el("div", "feedback-text", question.translation));
    node.appendChild(transBlock);
  }

  if (question.evidence) {
    var evidenceBlock = el("div", "feedback-block");
    evidenceBlock.appendChild(el("div", "feedback-label", "本文の根拠"));
    evidenceBlock.appendChild(el("div", "feedback-text", "“" + question.evidence + "”"));
    node.appendChild(evidenceBlock);
  }

  var explanationBlock = el("div", "feedback-block");
  explanationBlock.appendChild(el("div", "feedback-label", "解説"));
  explanationBlock.appendChild(el("div", "feedback-text", question.explanation));
  node.appendChild(explanationBlock);

  if (question.choiceNotes && question.choiceNotes.length === question.choices.length) {
    var notesBlock = el("div", "feedback-block");
    notesBlock.appendChild(el("div", "feedback-label", "選択肢ごとのチェック"));
    var list = el("ul", "note-list");
    question.choiceNotes.forEach(function (note, index) {
      var li = el("li", index === question.answerIndex ? "is-answer" : null, question.choices[index] + " — " + note);
      list.appendChild(li);
    });
    notesBlock.appendChild(list);
    node.appendChild(notesBlock);
  }

  node.classList.remove("hidden");
}

function advanceQuiz() {
  if (session.index < session.items.length - 1) {
    session.index += 1;
    renderQuizQuestion();
    return;
  }
  renderResult();
}

function renderResult() {
  var total = session.items.length;
  var correct = session.correctCount;
  var accuracy = Math.round((correct / total) * 100);
  $("resultScore").textContent = correct + " / " + total;
  $("resultAccuracy").textContent = "正答率 " + accuracy + "%";

  var comment;
  if (accuracy === 100) comment = "全問正解です。次のユニットへ進みましょう。";
  else if (accuracy >= 70) comment = "間違えた問題は復習キューに入りました。日を置いてもう一度出てきます。";
  else comment = "解説を読んでから、同じセットをもう一度解くのが近道です。";
  $("resultComment").textContent = comment;

  var missedNode = $("resultMissedList");
  clear(missedNode);
  if (session.missed.length) {
    missedNode.appendChild(el("div", "feedback-label", "間違えた問題"));
    session.missed.forEach(function (entry) {
      var question = entry.item.question;
      var card = el("div", "missed-item");
      var prompt = el("div", "missed-item-prompt");
      renderPromptInto(prompt, question.prompt);
      card.appendChild(prompt);
      card.appendChild(
        el(
          "div",
          "missed-item-answer",
          "あなたの答え: " + question.choices[entry.chosenIndex] + " ／ 正解: " + question.choices[question.answerIndex]
        )
      );
      missedNode.appendChild(card);
    });
  }

  $("resultBackButton").textContent = session.backTo === "grammar" ? "ユニット一覧に戻る" : "ホームに戻る";
  show("resultScreen");
}

/* ---------- 読解 ---------- */

function openReadingPassage(passageId) {
  getJson("/api/reading/passages/" + encodeURIComponent(passageId))
    .then(function (data) {
      reading = {
        passage: data.passage,
        startedAt: Date.now(),
        elapsedMs: null,
        timerId: null,
        answered: 0,
        correct: 0,
        showTranslation: false
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
    block.appendChild(el("div", "eyebrow", "設問 " + (qIndex + 1) + "／" + question.typeJa));
    block.appendChild(el("p", "reading-question-prompt", question.prompt));

    var choicesNode = el("div", "choice-list");
    var feedbackNode = el("div", "feedback hidden");

    question.choices.forEach(function (choice, index) {
      var button = el("button", "choice");
      button.type = "button";
      button.appendChild(el("span", "choice-mark", String.fromCharCode(65 + index)));
      button.appendChild(el("span", "choice-text", choice));
      button.addEventListener("click", function () {
        answerReadingQuestion(question, index, choicesNode, feedbackNode);
      });
      choicesNode.appendChild(button);
    });

    block.appendChild(choicesNode);
    block.appendChild(feedbackNode);
    listNode.appendChild(block);
  });
}

function answerReadingQuestion(question, chosenIndex, choicesNode, feedbackNode) {
  var buttons = choicesNode.querySelectorAll(".choice");
  if (buttons.length && buttons[0].disabled) return; // 二重解答を防ぐ

  var correct = chosenIndex === question.answerIndex;
  reading.answered += 1;
  if (correct) reading.correct += 1;
  recordAnswer("reading", reading.passage.id, question.id, correct);

  for (var i = 0; i < buttons.length; i += 1) {
    buttons[i].disabled = true;
    if (i === question.answerIndex) buttons[i].classList.add("is-correct");
    else if (i === chosenIndex) buttons[i].classList.add("is-wrong");
    else buttons[i].classList.add("is-dimmed");
  }

  renderFeedback(feedbackNode, null, question, correct);

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
  $("goGrammarButton").addEventListener("click", renderGrammarList);
  $("goReadingButton").addEventListener("click", renderReadingList);
  $("goReviewButton").addEventListener("click", startReviewSession);

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
    if (session.backTo === "grammar") renderGrammarList();
    else goHome();
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
  getJson("/api/content")
    .then(function (data) {
      contentSummary = data;
      $("footerStatus").textContent =
        "文法 " + data.grammar.questionCount + "問（" + data.grammar.unitCount + "ユニット）／読解 " +
        data.reading.passageCount + "本・設問 " + data.reading.questionCount + "問";
      goHome();
    })
    .catch(showLoadError);
}

boot();
