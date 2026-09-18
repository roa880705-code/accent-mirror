"use strict";

// 問題バンクの整合性チェック。
//   node grammar-reader/scripts/validate-content.js
// 問題を追加したら必ずこれを通してからコミットする。

const { grammarUnits } = require("../data/grammarBank");
const { vocabUnits } = require("../data/vocabBank");
const { readingPassages } = require("../data/readingBank");
const { countWords } = require("../src/services/contentService");

const MIN_WORDS = 180;
const MAX_WORDS = 320;

const errors = [];
const seenIds = new Set();

function check(condition, message) {
  if (!condition) errors.push(message);
}

function checkUniqueId(id, label) {
  check(!seenIds.has(id), `${label}: id が重複しています (${id})`);
  seenIds.add(id);
}

/**
 * 2択＋根拠の共通チェック。
 * - 選択肢はちょうど2つ、正解はちょうど1つ
 * - すべての選択肢に根拠を書く（誤答には「もっともらしいが誤った根拠」）
 * - 根拠は「〜から」で終える（形をそろえて読み比べやすくする）
 * - variant "reason" は語が同じ、"word" は語が異なる
 */
function checkOptionBlock(question, label) {
  const options = question.options;
  check(Array.isArray(options) && options.length === 2, `${label}: 選択肢はちょうど2つにしてください`);
  if (!Array.isArray(options) || options.length !== 2) return;

  const correctCount = options.filter((option) => option.correct === true).length;
  check(correctCount === 1, `${label}: 正解の選択肢はちょうど1つにしてください（現在 ${correctCount} 個）`);

  options.forEach((option, index) => {
    const oLabel = `${label}/選択肢${index + 1}`;
    check(typeof option.answer === "string" && option.answer.trim().length > 0, `${oLabel}: answer が空です`);
    check(typeof option.reason === "string" && option.reason.length >= 10, `${oLabel}: 根拠が短すぎます`);
    check(/から$/.test(String(option.reason)), `${oLabel}: 根拠は「〜から」で終えてください`);
  });

  const [first, second] = options.map((option) => String(option.answer).trim());
  check(["word", "reason"].includes(question.variant), `${label}: variant は "word" か "reason" です`);
  if (question.variant === "reason") {
    check(first === second, `${label}: variant "reason" では2つの選択肢の語を同じにしてください`);
    check(options[0].reason !== options[1].reason, `${label}: 根拠まで同じになっています`);
  } else if (question.variant === "word") {
    check(first.toLowerCase() !== second.toLowerCase(), `${label}: variant "word" では語を変えてください`);
  }

  check(typeof question.explanation === "string" && question.explanation.length >= 10, `${label}: 解説が短すぎます`);
  check(
    typeof question.misconception === "string" && question.misconception.length >= 10,
    `${label}: misconception（誤った根拠のどこが違うか）が必要です`
  );
}

/* ---- 文法・語彙（同じ形式） ---- */

function checkUnits(units, kind) {
  const orders = new Set();
  check(units.length > 0, `${kind} のユニットが1つもありません`);

  units.forEach((unit) => {
    const label = `${kind}/${unit.id}`;
    checkUniqueId(unit.id, label);
    check(Number.isInteger(unit.order), `${label}: order が整数ではありません`);
    check(!orders.has(unit.order), `${label}: order が重複しています (${unit.order})`);
    orders.add(unit.order);
    check(!!unit.title && !!unit.subtitle && !!unit.overview, `${label}: title / subtitle / overview が必要です`);
    check(unit.questions.length === 6, `${label}: 1ユニット6問にそろえてください（現在 ${unit.questions.length} 問）`);
    check(
      unit.questions.some((question) => question.variant === "reason"),
      `${label}: 「語は同じで根拠だけが違う」問題を1問以上入れてください`
    );

    unit.questions.forEach((question) => {
      const qLabel = `${label}/${question.id}`;
      checkUniqueId(question.id, qLabel);
      check(question.prompt.includes("____"), `${qLabel}: 空所 ____ が prompt にありません`);
      check([1, 2, 3].includes(question.level), `${qLabel}: level は 1〜3 で指定してください`);
      check(!!question.point, `${qLabel}: point（項目名）が必要です`);
      check(typeof question.translation === "string" && question.translation.length > 0, `${qLabel}: 和訳が必要です`);
      checkOptionBlock(question, qLabel);
    });
  });
}

checkUnits(grammarUnits, "grammar");
checkUnits(vocabUnits, "vocab");

// 階級判定がレベル3で止まらないよう、各レベルに十分な問題数があることを確かめる
const practiceQuestions = grammarUnits.concat(vocabUnits).flatMap((unit) => unit.questions);
[1, 2, 3].forEach((level) => {
  const count = practiceQuestions.filter((question) => question.level === level).length;
  check(count >= 12, `レベル${level}の問題が ${count} 問しかありません（12問以上にしてください）`);
});

/* ---- 読解 ---- */

const passageOrders = new Set();
check(readingPassages.length > 0, "読解パッセージが1つもありません");

readingPassages.forEach((passage) => {
  const label = `reading/${passage.id}`;
  checkUniqueId(passage.id, label);
  check(!passageOrders.has(passage.order), `${label}: order が重複しています (${passage.order})`);
  passageOrders.add(passage.order);
  check(!!passage.title && !!passage.titleJa && !!passage.topic, `${label}: title / titleJa / topic が必要です`);
  check([1, 2, 3].includes(passage.level), `${label}: level は 1〜3 で指定してください`);

  const words = countWords(passage.paragraphs);
  check(words >= MIN_WORDS && words <= MAX_WORDS, `${label}: 語数 ${words} が範囲外です（${MIN_WORDS}〜${MAX_WORDS}）`);
  check(
    passage.paragraphs.length === passage.translations.length,
    `${label}: 段落数(${passage.paragraphs.length})と和訳数(${passage.translations.length})が一致しません`
  );
  passage.translations.forEach((text, index) => {
    check(typeof text === "string" && text.length > 0, `${label}: 第${index + 1}段落の和訳が空です`);
  });
  check(passage.glossary.length >= 4, `${label}: 語注は4語以上つけてください`);
  passage.glossary.forEach((entry) => {
    check(!!entry.word && !!entry.meaning, `${label}: 語注に word / meaning が必要です`);
  });
  check(passage.keySentences.length >= 1, `${label}: 重要文の構文解説が必要です`);

  const body = passage.paragraphs.join(" ");
  passage.keySentences.forEach((entry) => {
    check(body.includes(entry.text), `${label}: 重要文が本文に見つかりません -> ${entry.text.slice(0, 40)}...`);
    check(!!entry.structure && !!entry.translation, `${label}: 重要文に structure / translation が必要です`);
  });

  check(passage.questions.length === 4, `${label}: 設問は4問にそろえてください（現在 ${passage.questions.length} 問）`);
  passage.questions.forEach((question) => {
    const qLabel = `${label}/${question.id}`;
    checkUniqueId(question.id, qLabel);
    check(!!question.typeJa, `${qLabel}: typeJa（設問の種類）が必要です`);
    check([1, 2, 3].includes(question.level), `${qLabel}: level は 1〜3 で指定してください（推定点の配点になります）`);
    checkOptionBlock(question, qLabel);
    check(typeof question.evidence === "string" && question.evidence.length > 0, `${qLabel}: evidence（根拠）が必要です`);
    // evidence は本文からの引用。"..." でつないだ場合は各断片が本文にあることを確認する。
    String(question.evidence)
      .split("...")
      .map((fragment) => fragment.trim())
      .filter(Boolean)
      .forEach((fragment) => {
        check(body.includes(fragment), `${qLabel}: 根拠が本文と一致しません -> ${fragment.slice(0, 40)}`);
      });
  });
});

/* ---- 結果 ---- */

const grammarQuestions = grammarUnits.flatMap((unit) => unit.questions);
const vocabQuestions = vocabUnits.flatMap((unit) => unit.questions);
const readingQuestions = readingPassages.flatMap((passage) => passage.questions);
const reasonOnly = grammarQuestions
  .concat(vocabQuestions, readingQuestions)
  .filter((question) => question.variant === "reason");
const byLevel = [1, 2, 3].map((level) => {
  const count = practiceQuestions.filter((question) => question.level === level).length;
  return `レベル${level} ${count}問`;
});

if (errors.length) {
  console.error(`問題バンクの検証に失敗しました（${errors.length} 件）`);
  errors.forEach((message) => console.error(" - " + message));
  process.exit(1);
}

console.log("問題バンクの検証に成功しました");
console.log(` 文法: ${grammarUnits.length} ユニット / ${grammarQuestions.length} 問`);
console.log(` 語彙: ${vocabUnits.length} ユニット / ${vocabQuestions.length} 問`);
console.log(` 難易度の内訳（文法＋語彙）: ${byLevel.join(" / ")}`);
console.log(` 読解: ${readingPassages.length} 本 / 設問 ${readingQuestions.length} 問`);
console.log(` うち「語は同じで根拠だけが違う」問題: ${reasonOnly.length} 問`);
readingPassages.forEach((passage) => {
  console.log(`  - ${passage.id}: ${countWords(passage.paragraphs)} words`);
});
