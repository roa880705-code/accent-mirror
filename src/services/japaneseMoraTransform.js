// 日本語テキストを「モーラ(拍)」単位に分解し、単語をべた書きせずに機械的に
// 変形するための汎用エンジン。
//
// これまでの実装は「手伝って」→「てうあって」のように、単語ごとにハードコードした
// 正規表現置換で崩れを表現していた。この方式だと、新しい練習文を追加するたびに、
// その文の日本語訳に登場する単語の分だけ手作業でパターンを追加する必要があり、
// 単語数・文の数に比例して作業量が増えてしまう(スケールしない)。
//
// ここでは代わりに、五十音の各モーラを「子音+母音」に分解できるという事実を使い、
// 2つの操作だけで既存のべた書きパターンのほぼすべてを再現できることを利用する:
//   - 弱化(weaken): 子音を落として母音だけのモーラに置き換える(例: ら→あ, す→う)
//   - 伸長(elongate): モーラの母音をもう一度重ねて伸ばす(例: た→たあ, て→てえ)
// この2操作は特定の単語に依存せず、どんな日本語テキストにも機械的に適用できる。

const VOWEL_GROUPS = {
  a: ["あ", "か", "さ", "た", "な", "は", "ま", "や", "ら", "わ", "が", "ざ", "だ", "ば", "ぱ",
    "ア", "カ", "サ", "タ", "ナ", "ハ", "マ", "ヤ", "ラ", "ワ", "ガ", "ザ", "ダ", "バ", "パ"],
  i: ["い", "き", "し", "ち", "に", "ひ", "み", "り", "ぎ", "じ", "ぢ", "び", "ぴ",
    "イ", "キ", "シ", "チ", "ニ", "ヒ", "ミ", "リ", "ギ", "ジ", "ヂ", "ビ", "ピ"],
  u: ["う", "く", "す", "つ", "ぬ", "ふ", "む", "ゆ", "る", "ぐ", "ず", "づ", "ぶ", "ぷ",
    "ウ", "ク", "ス", "ツ", "ヌ", "フ", "ム", "ユ", "ル", "グ", "ズ", "ヅ", "ブ", "プ"],
  e: ["え", "け", "せ", "て", "ね", "へ", "め", "れ", "げ", "ぜ", "で", "べ", "ぺ",
    "エ", "ケ", "セ", "テ", "ネ", "ヘ", "メ", "レ", "ゲ", "ゼ", "デ", "ベ", "ペ"],
  o: ["お", "こ", "そ", "と", "の", "ほ", "も", "よ", "ろ", "を", "ご", "ぞ", "ど", "ぼ", "ぽ",
    "オ", "コ", "ソ", "ト", "ノ", "ホ", "モ", "ヨ", "ロ", "ヲ", "ゴ", "ゾ", "ド", "ボ", "ポ"]
};

const VOWEL_ONLY_KANA = new Set(["あ", "い", "う", "え", "お", "ア", "イ", "ウ", "エ", "オ", "を", "ヲ"]);
const HIRAGANA_VOWEL_KANA = { a: "あ", i: "い", u: "う", e: "え", o: "お" };
const KATAKANA_VOWEL_KANA = { a: "ア", i: "イ", u: "ウ", e: "エ", o: "オ" };
const SMALL_YOUON = new Set(["ゃ", "ゅ", "ょ", "ャ", "ュ", "ョ"]);
const YOUON_VOWEL = { ゃ: "a", ゅ: "u", ょ: "o", ャ: "a", ュ: "u", ョ: "o" };
const I_ROW_FOR_YOUON = new Set([
  "き", "し", "ち", "に", "ひ", "み", "り", "ぎ", "じ", "ぢ", "び", "ぴ",
  "キ", "シ", "チ", "ニ", "ヒ", "ミ", "リ", "ギ", "ジ", "ヂ", "ビ", "ピ"
]);

const VOWEL_LOOKUP = new Map();
Object.entries(VOWEL_GROUPS).forEach(([vowel, kanaList]) => {
  kanaList.forEach((kana) => VOWEL_LOOKUP.set(kana, vowel));
});

function scriptOf(char) {
  if (/[぀-ゟ]/.test(char)) return "hiragana";
  if (/[゠-ヿ]/.test(char)) return "katakana";
  return "other";
}

// テキストをモーラ単位のトークン列に分解する。
// 各トークン: { text, vowel, kind, script }
//   kind: "vowelOnly"(あ行) | "consonant"(子音+母音) | "sokuon"(っ) | "nasal"(ん) | "other"(記号など)
function splitIntoMorae(text) {
  const chars = Array.from(String(text || ""));
  const tokens = [];
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    const next = chars[i + 1];
    if (I_ROW_FOR_YOUON.has(ch) && next && SMALL_YOUON.has(next)) {
      tokens.push({ text: ch + next, vowel: YOUON_VOWEL[next], kind: "consonant", script: scriptOf(ch) });
      i += 1;
      continue;
    }
    if (ch === "っ" || ch === "ッ") {
      tokens.push({ text: ch, vowel: null, kind: "sokuon", script: scriptOf(ch) });
      continue;
    }
    if (ch === "ん" || ch === "ン") {
      tokens.push({ text: ch, vowel: null, kind: "nasal", script: scriptOf(ch) });
      continue;
    }
    if (ch === "ー") {
      if (tokens.length) tokens[tokens.length - 1].text += ch;
      else tokens.push({ text: ch, vowel: null, kind: "other", script: "other" });
      continue;
    }
    const vowel = VOWEL_LOOKUP.get(ch);
    if (vowel) {
      tokens.push({ text: ch, vowel, kind: VOWEL_ONLY_KANA.has(ch) ? "vowelOnly" : "consonant", script: scriptOf(ch) });
      continue;
    }
    tokens.push({ text: ch, vowel: null, kind: "other", script: "other" });
  }
  return tokens;
}

function vowelOnlyKanaFor(token) {
  const table = token.script === "katakana" ? KATAKANA_VOWEL_KANA : HIRAGANA_VOWEL_KANA;
  return table[token.vowel] || "";
}

// 子音を落として母音だけのモーラに置き換える(例: もらえ→もあえ, ますか→まうか)。
// 絶対ルール: 冒頭のモーラ(語頭の輪郭)は残し、聞き取りの手がかりを完全には失わせない。
// medium と strong ははっきり強度が違うようにする: medium は中間のモーラを1つだけ
// 弱め、strong は冒頭以外のほぼ全体を弱める。
function weakenJapaneseMoraText(text, strength = "medium") {
  const tokens = splitIntoMorae(text);
  const weakenableIdx = tokens.map((token, index) => (token.kind === "consonant" ? index : -1)).filter((index) => index >= 0);
  if (!weakenableIdx.length) return String(text || "");
  const first = weakenableIdx[0];
  const last = weakenableIdx[weakenableIdx.length - 1];
  const interior = weakenableIdx.filter((index) => index !== first && index !== last);

  let targets;
  if (strength === "strong") {
    targets = weakenableIdx.length === 1 ? weakenableIdx : weakenableIdx.filter((index) => index !== first);
  } else {
    // 弱化できるモーラが1つしかない短い語句(手伝って→っ+て など、漢字混じりの
    // 短い日本語では珍しくない)では、medium でも何も変わらないと「反映されて
    // いないように見える」実害があるため、その1つだけは弱める。
    targets = interior.length
      ? [interior[Math.floor(interior.length / 2)]]
      : (weakenableIdx.length > 1 ? [last] : weakenableIdx);
  }
  const targetSet = new Set(targets);
  return tokens.map((token, index) => (targetSet.has(index) ? (vowelOnlyKanaFor(token) || token.text) : token.text)).join("");
}

// モーラの母音を重ねて伸ばす(例: ますか→まあすか, とって→とってえ)。
function elongateJapaneseMoraText(text, strength = "medium") {
  const tokens = splitIntoMorae(text);
  const elongatableIdx = tokens
    .map((token, index) => (token.kind === "consonant" || token.kind === "vowelOnly" ? index : -1))
    .filter((index) => index >= 0);
  if (!elongatableIdx.length) return String(text || "");
  // 伸ばせるモーラが1〜2個しかない短い語句では「1つ飛ばし」だと0個になって
  // しまうことがあるため、その場合は最後の1つだけは必ず伸ばす。
  const targets = new Set(
    strength === "strong"
      ? elongatableIdx
      : elongatableIdx.length <= 2
        ? [elongatableIdx[elongatableIdx.length - 1]]
        : elongatableIdx.filter((_, order) => order % 2 === 1)
  );
  return tokens.map((token, index) => {
    if (!targets.has(index)) return token.text;
    const vowelKana = vowelOnlyKanaFor(token);
    return vowelKana ? token.text + vowelKana : token.text;
  }).join("");
}

// 軽い区切り(間)だけを表現する(例: もらえますか→もら えま すか)。
// 音そのものは変えず、モーラを軽くグループ分けして間を空ける。
function segmentPauseJapaneseMoraText(text) {
  const tokens = splitIntoMorae(text);
  if (tokens.length <= 2) return String(text || "");
  const chunks = [];
  for (let index = 0; index < tokens.length; index += 2) {
    chunks.push(tokens.slice(index, index + 2).map((token) => token.text).join(""));
  }
  return chunks.join(" ");
}

module.exports = {
  splitIntoMorae,
  weakenJapaneseMoraText,
  elongateJapaneseMoraText,
  segmentPauseJapaneseMoraText
};
