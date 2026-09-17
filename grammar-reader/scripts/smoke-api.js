"use strict";

// サーバーを実際に起動して API を一通り叩く。
//   node grammar-reader/scripts/smoke-api.js

const assert = require("assert");
const { app } = require("../server");

const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const checks = [];

  async function get(path) {
    const res = await fetch(base + path);
    return { status: res.status, body: res.status === 204 ? null : await res.json() };
  }

  try {
    const health = await get("/api/health");
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.body.ok, true);
    assert.strictEqual(health.body.grammarQuestions, 60);
    checks.push("GET /api/health");

    const content = await get("/api/content");
    assert.strictEqual(content.body.grammar.units.length, 10);
    assert.strictEqual(content.body.reading.passages.length, 5);
    assert.ok(content.body.reading.passages[0].wordCount > 100);
    checks.push("GET /api/content");

    const unit = await get("/api/grammar/units/relative");
    assert.strictEqual(unit.body.unit.questions.length, 6);
    assert.ok(unit.body.unit.questions[0].choiceNotes.length === 4);
    checks.push("GET /api/grammar/units/:unitId");

    const missingUnit = await get("/api/grammar/units/nope");
    assert.strictEqual(missingUnit.status, 404);
    checks.push("GET /api/grammar/units/:unitId (404)");

    const passage = await get("/api/reading/passages/sleep");
    assert.strictEqual(passage.body.passage.questions.length, 4);
    assert.strictEqual(passage.body.passage.paragraphs.length, passage.body.passage.translations.length);
    checks.push("GET /api/reading/passages/:passageId");

    const missingPassage = await get("/api/reading/passages/nope");
    assert.strictEqual(missingPassage.status, 404);
    checks.push("GET /api/reading/passages/:passageId (404)");

    const reviewRes = await fetch(base + "/api/review/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          { kind: "grammar", groupId: "tense", questionId: "tense-1" },
          { kind: "reading", groupId: "yawn", questionId: "yawn-q2" },
          { kind: "grammar", groupId: "tense", questionId: "does-not-exist" }
        ]
      })
    });
    const review = await reviewRes.json();
    assert.strictEqual(review.questions.length, 2);
    assert.strictEqual(review.missing.length, 1);
    assert.strictEqual(review.questions[0].groupTitle, "時制");
    checks.push("POST /api/review/questions");

    const indexRes = await fetch(base + "/");
    assert.strictEqual(indexRes.status, 200);
    assert.ok((await indexRes.text()).includes("英文法・英語読解トレーナー"));
    checks.push("GET / (static index.html)");

    checks.forEach((name) => console.log("  ok  " + name));
    console.log(`\n${checks.length} API checks passed`);
    server.close();
  } catch (err) {
    console.error("smoke test failed:", err.message);
    server.close();
    process.exitCode = 1;
  }
});
