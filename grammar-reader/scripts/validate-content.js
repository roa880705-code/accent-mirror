"use strict";

// 問題バンクの整合性チェック。
//   node grammar-reader/scripts/validate-content.js
// 問題を追加したら必ずこれを通してからコミットする。

const { grammarUnits } = require("../data/grammarBank");
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

function checkChoiceBlock(question, label) {
  check(Array.isArray(question.choices) && question.choices.length === 4, `${label}: 選択肢は4つ必要です`);
  if (!Array.isArray(question.choices)) return;
  const unique = new Set(question.choices.map((choice) => String(choice).trim().toLowerCase()));
  check(unique.size === question.choices.length, `${label}: 同じ選択肢が重複しています`);
  question.choices.forEach((choice, index) => {
    check(typeof choice === "string" && choice.trim().length > 0, `${label}: 選択肢${index + 1}が空です`);
  });
  check(
    Number.isInteger(question.answerIndex) && question.answerIndex >= 0 && question.answerIndex < question.choices.length,
    `${label}: answerIndex が選択肢の範囲外です`
  );
  check(typeof question.explanation === "string" && question.explanation.length >= 10, `${label}: 解説が短すぎます`);
}

/* ---- 文法 ---- */

const unitOrders = new Set();
check(grammarUnits.length > 0, "文法ユニットが1つもありません");

grammarUnits.forEach((unit) => {
  const label = `grammar/${unit.id}`;
  checkUniqueId(unit.id, label);
  check(Number.isInteger(unit.order), `${label}: order が整数ではありません`);
  check(!unitOrders.has(unit.order), `${label}: order が重複しています (${unit.order})`);
  unitOrders.add(unit.order);
  check(!!unit.title && !!unit.subtitle && !!unit.overview, `${label}: title / subtitle / overview が必要です`);
  check(unit.questions.length === 6, `${label}: 1ユニット6問にそろえてください（現在 ${unit.questions.length} 問）`);

  unit.questions.forEach((question) => {
    const qLabel = `${label}/${question.id}`;
    checkUniqueId(question.id, qLabel);
    check(question.prompt.includes("____"), `${qLabel}: 空所 ____ が prompt にありません`);
    check([1, 2, 3].includes(question.level), `${qLabel}: level は 1〜3 で指定してください`);
    check(!!question.point, `${qLabel}: point（文法項目）が必要です`);
    check(typeof question.translation === "string" && question.translation.length > 0, `${qLabel}: 和訳が必要です`);
    checkChoiceBlock(question, qLabel);
    check(
      Array.isArray(question.choiceNotes) && question.choiceNotes.length === question.choices.length,
      `${qLabel}: choiceNotes は選択肢と同じ数だけ必要です`
    );
    (question.choiceNotes || []).forEach((note, index) => {
      check(typeof note === "string" && note.length >= 5, `${qLabel}: 選択肢${index + 1}のコメントが短すぎます`);
    });
  });
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
    checkChoiceBlock(question, qLabel);
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

const grammarQuestionCount = grammarUnits.reduce((total, unit) => total + unit.questions.length, 0);
const readingQuestionCount = readingPassages.reduce((total, passage) => total + passage.questions.length, 0);

if (errors.length) {
  console.error(`問題バンクの検証に失敗しました（${errors.length} 件）`);
  errors.forEach((message) => console.error(" - " + message));
  process.exit(1);
}

console.log("問題バンクの検証に成功しました");
console.log(` 文法: ${grammarUnits.length} ユニット / ${grammarQuestionCount} 問`);
console.log(` 読解: ${readingPassages.length} 本 / 設問 ${readingQuestionCount} 問`);
readingPassages.forEach((passage) => {
  console.log(`  - ${passage.id}: ${countWords(passage.paragraphs)} words`);
});
