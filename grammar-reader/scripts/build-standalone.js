"use strict";

// 画面・スタイル・スクリプト・問題バンクを1枚の HTML にまとめる。
//   node grammar-reader/scripts/build-standalone.js [出力先]
// サーバーなしで動く配布用・体験用のファイルを作るためのもの。
// 出力は Artifact の雛形（doctype / head / body）に差し込める形にするため、
// <title> と <style> と body の中身だけを書き出す。

const fs = require("fs");
const path = require("path");
const content = require("../src/services/contentService");

const root = path.join(__dirname, "..");
const outPath = process.argv[2] || path.join(root, "dist", "grammar-reader.html");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const html = read("public/index.html");
const title = /<title>(.*?)<\/title>/.exec(html)[1];

let body = html.slice(html.indexOf("<body>") + "<body>".length, html.lastIndexOf("</body>"));
body = body.replace(/<script src="[^"]+"><\/script>\s*/g, "").trim();
body = body.replace(
  "</footer>",
  '  <span class="standalone-note">サーバー不要の1枚版（記録はこのブラウザにのみ保存されます）</span>\n</footer>'
);

const data = {
  content: content.contentSummary(),
  units: {},
  vocabUnits: {},
  passages: {}
};
content.listGrammarUnits().forEach((unit) => {
  data.units[unit.id] = content.getGrammarUnit(unit.id);
});
content.listVocabUnits().forEach((unit) => {
  data.vocabUnits[unit.id] = content.getVocabUnit(unit.id);
});
content.listReadingPassages().forEach((passage) => {
  data.passages[passage.id] = content.getReadingPassage(passage.id);
});

// </script> や < が本文に混ざっても壊れないようにしておく
const dataJson = JSON.stringify(data).replace(/</g, "\\u003c");

const page = `<title>${title}</title>
<style>
${read("public/styles.css").trim()}
.standalone-note{display:block;margin-top:4px;opacity:.8}
</style>

${body}

<script>window.GRAMMAR_READER_DATA = ${dataJson};</script>
<script>
${read("public/reviewPlanner.js").trim()}
</script>
<script>
${read("public/scoreEstimator.js").trim()}
</script>
<script>
${read("public/app.js").trim()}
</script>
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, page);

const summary = data.content;
console.log(`1枚版を書き出しました: ${outPath}`);
console.log(` ${(Buffer.byteLength(page) / 1024).toFixed(0)} KB / 文法 ${summary.grammar.questionCount}問 / 語彙 ${summary.vocab.questionCount}問 / 読解 ${summary.reading.questionCount}問`);
