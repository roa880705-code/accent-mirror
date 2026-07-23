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

// 清音→濁音のずらし(例: す→ず, く→ぐ)。r/l のように「別の子音に置き換わって
// 聞こえる」タイプの崩れは、母音だけにする(weaken)よりも、近い子音にずれる
// この操作の方が実際の聞こえ方に近い。
const DEVOICE_MAP = {
  か: "が", き: "ぎ", く: "ぐ", け: "げ", こ: "ご",
  さ: "ざ", し: "じ", す: "ず", せ: "ぜ", そ: "ぞ",
  た: "だ", ち: "ぢ", つ: "づ", て: "で", と: "ど",
  は: "ば", ひ: "び", ふ: "ぶ", へ: "べ", ほ: "ぼ",
  カ: "ガ", キ: "ギ", ク: "グ", ケ: "ゲ", コ: "ゴ",
  サ: "ザ", シ: "ジ", ス: "ズ", セ: "ゼ", ソ: "ゾ",
  タ: "ダ", チ: "ヂ", ツ: "ヅ", テ: "デ", ト: "ド",
  ハ: "バ", ヒ: "ビ", フ: "ブ", ヘ: "ベ", ホ: "ボ"
};
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

// 漢字はモーラ分解できない(読みの情報を持たないため)。この変形エンジンが
// 対象にできるのはあくまで「読み」であって「表記」ではないので、練習文の
// 日本語訳に登場する既知の漢字語彙だけ、変形の前にひらがな読みへ変換しておく。
// 未知の漢字はそのまま(変形されない=安全側にフォールバック)。
const KANJI_READINGS = {
  住んでいます: "すんでいます",
  住んでいる: "すんでいる",
  暮らしています: "くらしています",
  暮らしている: "くらしている",
  電話番号: "でんわばんごう",
  検討します: "けんとうします",
  大好きです: "だいすきです",
  手伝って: "てつだって",
  手伝う: "てつだう",
  助ける: "たすける",
  教えて: "おしえて",
  取って: "とって",
  持っています: "もっています",
  働かなければなりません: "はたらかなければなりません",
  会いましょう: "あいましょう",
  去ります: "さります",
  本当に: "ほんとうに",
  今日: "きょう",
  明日: "あした",
  電話: "でんわ",
  番号: "ばんごう",
  塩: "しお",
  海: "うみ",
  // 「彼女」は「彼」を含むため、先に置換しないと「彼」だけ変換されて
  // 「かれ女」のように壊れる。順序が意味を持つので、彼女を彼より前に置く。
  彼女: "かのじょ",
  彼: "かれ",
  私: "わたし"
};

function toReadableKana(text) {
  let output = String(text || "");
  Object.entries(KANJI_READINGS).forEach(([kanji, reading]) => {
    output = output.split(kanji).join(reading);
  });
  return output;
}

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

// 弱化(weaken)・母音追加(elongate)それぞれで「どのモーラを対象にするか」を
// 選ぶロジック本体。weaken/elongate単体でも、両方を別モーラに重ねる
// weakenAndElongateJapaneseMoraText でも共通して使う。
//
// tokens が渡された場合、拗音(きゃ/しょ/りゅ など2文字のモーラ)は弱化の対象から
// 極力外す。拗音は「表記は2文字でもモーラとしては1つ」という短い語句の中で
// 特に情報量が多い部分であり、ここを子音だけ落として母音化すると、単語の
// 判別に必要な音が丸ごと消えて別の単語に聞こえてしまうリスクが単純なモーラより
// 高い(実機フィードバック: 意訳で複数の英単語が同じ日本語1語("会いましょう")に
// 畳み込まれるようになった結果、"しょ"が弱化対象に選ばれて「あいまおう」という
// 意味の取れない語になってしまった)。単純なモーラの候補がある限りはそちらを
// 優先し、無い場合だけ拗音も対象にする(何も弱化できないよりはまし)。
function pickWeakenTargets(weakenableIdx, strength, tokens = []) {
  if (!weakenableIdx.length) return [];
  const isSimpleMora = (index) => String(tokens[index]?.text || "").length <= 1;
  const simpleIdx = weakenableIdx.filter(isSimpleMora);
  const pool = simpleIdx.length ? simpleIdx : weakenableIdx;
  const first = pool[0];
  const last = pool[pool.length - 1];
  const interior = pool.filter((index) => index !== first && index !== last);
  if (strength === "strong") {
    return pool.length === 1 ? pool : pool.filter((index) => index !== first);
  }
  // 弱化できるモーラが1つしかない短い語句では、medium でも何も変わらないと
  // 「反映されていないように見える」実害があるため、その1つだけは弱める。
  return interior.length
    ? [interior[Math.floor(interior.length / 2)]]
    : (pool.length > 1 ? [last] : pool);
}

function pickElongateTargets(elongatableIdx, strength) {
  if (!elongatableIdx.length) return [];
  // 伸ばせるモーラが1〜2個しかない短い語句では「1つ飛ばし」だと0個になって
  // しまうことがあるため、その場合は最後の1つだけは必ず伸ばす。
  return strength === "strong"
    ? elongatableIdx
    : elongatableIdx.length <= 2
      ? [elongatableIdx[elongatableIdx.length - 1]]
      : elongatableIdx.filter((_, order) => order % 2 === 1);
}

// 子音を落として母音だけのモーラに置き換える(例: もらえ→もあえ, ますか→まうか)。
// 絶対ルール: 冒頭のモーラ(語頭の輪郭)は残し、聞き取りの手がかりを完全には失わせない。
// medium と strong ははっきり強度が違うようにする: medium は中間のモーラを1つだけ
// 弱め、strong は冒頭以外のほぼ全体を弱める。
function weakenJapaneseMoraText(text, strength = "medium") {
  const tokens = splitIntoMorae(toReadableKana(text));
  const weakenableIdx = tokens.map((token, index) => (token.kind === "consonant" ? index : -1)).filter((index) => index >= 0);
  if (!weakenableIdx.length) return String(text || "");
  const targetSet = new Set(pickWeakenTargets(weakenableIdx, strength, tokens));
  return tokens.map((token, index) => (targetSet.has(index) ? (vowelOnlyKanaFor(token) || token.text) : token.text)).join("");
}

// モーラの母音を重ねて伸ばす(例: ますか→まあすか, とって→とってえ)。
function elongateJapaneseMoraText(text, strength = "medium") {
  const tokens = splitIntoMorae(toReadableKana(text));
  const elongatableIdx = tokens
    .map((token, index) => (token.kind === "consonant" || token.kind === "vowelOnly" ? index : -1))
    .filter((index) => index >= 0);
  if (!elongatableIdx.length) return String(text || "");
  const targets = new Set(pickElongateTargets(elongatableIdx, strength));
  return tokens.map((token, index) => {
    if (!targets.has(index)) return token.text;
    const vowelKana = vowelOnlyKanaFor(token);
    return vowelKana ? token.text + vowelKana : token.text;
  }).join("");
}

// 同じ語句の中で「本当に脱落した子音」と「本当に母音が付いた子音」が別々の
// 音として両方観測される場合向け(実機フィードバック: "lの弱さ、pでの母音の
// 追加は、それぞれ別の文字で起きているわけなので、同じ1文字でその2つを反映
// させるのはおかしい")。弱化と母音追加を別モーラに割り当てて重ねる。
function weakenAndElongateJapaneseMoraText(text, weakenStrength = "medium", elongateStrength = "medium") {
  const tokens = splitIntoMorae(toReadableKana(text));
  const weakenableIdx = tokens.map((token, index) => (token.kind === "consonant" ? index : -1)).filter((index) => index >= 0);
  const elongatableIdx = tokens
    .map((token, index) => (token.kind === "consonant" || token.kind === "vowelOnly" ? index : -1))
    .filter((index) => index >= 0);
  if (!weakenableIdx.length && !elongatableIdx.length) return String(text || "");

  const weakenSet = new Set(pickWeakenTargets(weakenableIdx, weakenStrength, tokens));
  // 母音追加の対象は弱化と重ならないモーラから選ぶ。どうしても候補が
  // 1つしかない(=弱化と母音追加が同じモーラでしか表現できない)場合だけ、
  // やむを得ず同じモーラを共有する(何も反映しないよりまし)。
  const elongateCandidates = elongatableIdx.filter((index) => !weakenSet.has(index));
  const elongateSet = new Set(pickElongateTargets(elongateCandidates.length ? elongateCandidates : elongatableIdx, elongateStrength));

  return tokens.map((token, index) => {
    if (weakenSet.has(index)) return vowelOnlyKanaFor(token) || token.text;
    if (elongateSet.has(index)) {
      const vowelKana = vowelOnlyKanaFor(token);
      return vowelKana ? token.text + vowelKana : token.text;
    }
    return token.text;
  }).join("");
}

// r/l のように「子音が別の子音に置き換わって聞こえる」タイプの崩れを、
// 語頭モーラの清音→濁音のずらしで表現する(例: 住んでいる→ずんでいる,
// 暮らしている→ぐらしている)。weaken(母音だけにする)と違い、「別の音に
// なった」感覚を残す。濁音化できるモーラが無い場合はそのまま返す。
function muddleJapaneseMoraText(text) {
  const tokens = splitIntoMorae(toReadableKana(text));
  const targetIndex = tokens.findIndex((token) => token.kind === "consonant" && DEVOICE_MAP[token.text]);
  if (targetIndex === -1) return String(text || "");
  return tokens.map((token, index) => (index === targetIndex ? DEVOICE_MAP[token.text] : token.text)).join("");
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
  toReadableKana,
  weakenJapaneseMoraText,
  elongateJapaneseMoraText,
  weakenAndElongateJapaneseMoraText,
  muddleJapaneseMoraText,
  segmentPauseJapaneseMoraText
};
