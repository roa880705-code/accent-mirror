"use strict";

const { grammarUnits } = require("../../data/grammarBank");
const { vocabUnits } = require("../../data/vocabBank");
const { readingPassages } = require("../../data/readingBank");

function countWords(paragraphs) {
  return paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
}

function unitSummary(unit) {
  return {
    id: unit.id,
    order: unit.order,
    title: unit.title,
    subtitle: unit.subtitle,
    questionCount: unit.questions.length,
    // 未解答（初見）の問題数をクライアント側で数えるために id を渡す
    questionIds: unit.questions.map((q) => q.id),
    points: unit.questions.map((q) => q.point)
  };
}

function readingPassageSummary(passage) {
  return {
    id: passage.id,
    order: passage.order,
    level: passage.level,
    title: passage.title,
    titleJa: passage.titleJa,
    topic: passage.topic,
    wordCount: countWords(passage.paragraphs),
    questionCount: passage.questions.length,
    questionIds: passage.questions.map((q) => q.id)
  };
}

function listGrammarUnits() {
  return grammarUnits.slice().sort((a, b) => a.order - b.order).map(unitSummary);
}

function getGrammarUnit(id) {
  return grammarUnits.find((unit) => unit.id === id) || null;
}

function listVocabUnits() {
  return vocabUnits.slice().sort((a, b) => a.order - b.order).map(unitSummary);
}

function getVocabUnit(id) {
  return vocabUnits.find((unit) => unit.id === id) || null;
}

function listReadingPassages() {
  return readingPassages.slice().sort((a, b) => a.order - b.order).map(readingPassageSummary);
}

function getReadingPassage(id) {
  const passage = readingPassages.find((item) => item.id === id);
  if (!passage) return null;
  return Object.assign({}, passage, { wordCount: countWords(passage.paragraphs) });
}

function flatten(units, kind) {
  return units
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((unit) =>
      unit.questions.map((question) => ({
        kind,
        groupId: unit.id,
        groupTitle: unit.title,
        question
      }))
    );
}

/**
 * 文法と語彙の問題をフラットに並べて返す。
 * 分野をまたいでランダムに出題するときに使う（返す形は復習と同じ）。
 */
function listPracticeQuestions() {
  return flatten(grammarUnits, "grammar").concat(flatten(vocabUnits, "vocab"));
}

/** 復習画面が問題本体を引き当てるための逆引き。 */
function findQuestion(kind, groupId, questionId) {
  if (kind === "grammar" || kind === "vocab") {
    const unit = kind === "grammar" ? getGrammarUnit(groupId) : getVocabUnit(groupId);
    if (!unit) return null;
    const question = unit.questions.find((q) => q.id === questionId);
    if (!question) return null;
    return { kind, groupId, groupTitle: unit.title, question };
  }
  if (kind === "reading") {
    const passage = getReadingPassage(groupId);
    if (!passage) return null;
    const question = passage.questions.find((q) => q.id === questionId);
    if (!question) return null;
    return { kind, groupId, groupTitle: passage.title, question };
  }
  return null;
}

function contentSummary() {
  const units = listGrammarUnits();
  const vocab = listVocabUnits();
  const passages = listReadingPassages();
  return {
    grammar: {
      unitCount: units.length,
      questionCount: units.reduce((total, unit) => total + unit.questionCount, 0),
      units
    },
    vocab: {
      unitCount: vocab.length,
      questionCount: vocab.reduce((total, unit) => total + unit.questionCount, 0),
      units: vocab
    },
    reading: {
      passageCount: passages.length,
      questionCount: passages.reduce((total, p) => total + p.questionCount, 0),
      passages
    }
  };
}

module.exports = {
  countWords,
  listGrammarUnits,
  getGrammarUnit,
  listVocabUnits,
  getVocabUnit,
  listPracticeQuestions,
  listReadingPassages,
  getReadingPassage,
  findQuestion,
  contentSummary
};
