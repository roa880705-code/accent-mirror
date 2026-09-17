"use strict";

// English Grammar & Reading (grammar-reader)
// accent-mirror とは独立した小さな Express サーバー。
// 問題はすべてサーバー内の問題バンクから配信し、外部 API キーは不要。

const path = require("path");
const express = require("express");

const content = require("./src/services/contentService");

const app = express();
const PORT = Number(process.env.GRAMMAR_PORT || process.env.PORT || 3004);

app.use(express.json({ limit: "256kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  const summary = content.contentSummary();
  res.json({
    ok: true,
    app: "grammar-reader",
    grammarUnits: summary.grammar.unitCount,
    grammarQuestions: summary.grammar.questionCount,
    readingPassages: summary.reading.passageCount,
    readingQuestions: summary.reading.questionCount
  });
});

app.get("/api/content", (_req, res) => {
  res.json(content.contentSummary());
});

app.get("/api/grammar/units", (_req, res) => {
  res.json({ units: content.listGrammarUnits() });
});

app.get("/api/grammar/units/:unitId", (req, res) => {
  const unit = content.getGrammarUnit(req.params.unitId);
  if (!unit) {
    res.status(404).json({ error: "unit_not_found", unitId: req.params.unitId });
    return;
  }
  res.json({ unit });
});

app.get("/api/reading/passages", (_req, res) => {
  res.json({ passages: content.listReadingPassages() });
});

app.get("/api/reading/passages/:passageId", (req, res) => {
  const passage = content.getReadingPassage(req.params.passageId);
  if (!passage) {
    res.status(404).json({ error: "passage_not_found", passageId: req.params.passageId });
    return;
  }
  res.json({ passage });
});

/**
 * 復習用の問題取り出し。
 * 学習履歴はブラウザの localStorage にあるので、クライアントが
 * 「どの問題を出したいか」のリストを送り、サーバーは本体を返すだけ。
 */
app.post("/api/review/questions", (req, res) => {
  const requested = Array.isArray(req.body && req.body.items) ? req.body.items : [];
  if (requested.length > 100) {
    res.status(400).json({ error: "too_many_items", limit: 100 });
    return;
  }
  const found = [];
  const missing = [];
  requested.forEach((item) => {
    const hit = content.findQuestion(item && item.kind, item && item.groupId, item && item.questionId);
    if (hit) found.push(hit);
    else missing.push(item);
  });
  res.json({ questions: found, missing });
});

if (require.main === module) {
  app.listen(PORT, () => {
    const summary = content.contentSummary();
    console.log(`grammar-reader listening on http://localhost:${PORT}/`);
    console.log(
      `content: ${summary.grammar.questionCount} grammar questions in ${summary.grammar.unitCount} units, ` +
        `${summary.reading.passageCount} reading passages`
    );
  });
}

module.exports = { app, PORT };
