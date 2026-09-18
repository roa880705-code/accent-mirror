"use strict";

const { grammarUnits } = require("../../data/grammarBank");
const { readingPassages } = require("../../data/readingBank");

function countWords(paragraphs) {
  return paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
}

function grammarUnitSummary(unit) {
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
  return grammarUnits.slice().sort((a, b) => a.order - b.order).map(grammarUnitSummary);
}

function getGrammarUnit(id) {
  return grammarUnits.find((unit) => unit.id === id) || null;
}

function listReadingPassages() {
  return readingPassages.slice().sort((a, b) => a.order - b.order).map(readingPassageSummary);
}

function getReadingPassage(id) {
  const passage = readingPassages.find((item) => item.id === id);
  if (!passage) return null;
  return Object.assign({}, passage, { wordCount: countWords(passage.paragraphs) });
}

/**
 * 全ユニットの文法問題をフラットに並べて返す。
 * 分野をまたいでランダムに出題するときに使う（返す形は復習と同じ）。
 */
function listAllGrammarQuestions() {
  return grammarUnits
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((unit) =>
      unit.questions.map((question) => ({
        kind: "grammar",
        groupId: unit.id,
        groupTitle: unit.title,
        question
      }))
    );
}

/** 復習画面が問題本体を引き当てるための逆引き。 */
function findQuestion(kind, groupId, questionId) {
  if (kind === "grammar") {
    const unit = getGrammarUnit(groupId);
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
  const passages = listReadingPassages();
  return {
    grammar: {
      unitCount: units.length,
      questionCount: units.reduce((total, unit) => total + unit.questionCount, 0),
      units
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
  listAllGrammarQuestions,
  getGrammarUnit,
  listReadingPassages,
  getReadingPassage,
  findQuestion,
  contentSummary
};
