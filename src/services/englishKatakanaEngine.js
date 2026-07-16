// 英単語のカタカナ聞こえ方を、単語ごとの個別ルール(モグラ叩き)ではなく、
// Azureが返す音素(IPA)ごとのスコア・長さから直接組み立てる一般エンジン。
// 新しい単語・練習文が増えても、このテーブルとアルゴリズムだけで一定品質の
// カタカナ近似を出せることを目的とする。
// (実運用の英単語(could/help/you/me/she/live/leave/consider)には、これまでに
// 検証済みの個別の聞こえ方パターンが別途あり、そちらは維持したうえで、
// このエンジンは「個別対応のない単語」の既定の反映として使う)

// 母音(単母音・二重母音・r音化母音)のカタカナ表記。
const VOWEL_KATAKANA = {
  "iː": "イー", i: "イー", ɪ: "イ",
  ɛ: "エ", e: "エ",
  æ: "ア",
  "ɑː": "アー", ɑ: "アー",
  "ɔː": "オー", ɔ: "オ",
  ʊ: "ウ",
  "uː": "ウー", u: "ウー",
  ʌ: "ア",
  ə: "ア",
  "ɝː": "アー", ɝ: "アー", "ɜː": "アー", ɜ: "アー", ɚ: "アー",
  "eɪ": "エイ",
  "aɪ": "アイ",
  "ɔɪ": "オイ",
  "aʊ": "アウ",
  "oʊ": "オウ", o: "オー",
  "ɪɹ": "イア", ɪr: "イア",
  "ɛɹ": "エア", ɛr: "エア",
  "ʊɹ": "ウア", ʊr: "ウア",
  "ɑːɹ": "アー", ɑːr: "アー", ɑr: "アー",
  "ɔːɹ": "オー", ɔːr: "オー", ɔr: "オー"
};

// 母音を子音の行と組み合わせるときの列(あ/い/う/え/お)。
const VOWEL_COLUMN = {
  "iː": "i", i: "i", ɪ: "i",
  ɛ: "e", e: "e",
  æ: "a",
  "ɑː": "a", ɑ: "a",
  "ɔː": "o", ɔ: "o",
  ʊ: "u",
  "uː": "u", u: "u",
  ʌ: "a",
  ə: "a",
  "ɝː": "a", ɝ: "a", "ɜː": "a", ɜ: "a", ɚ: "a",
  "eɪ": "e",
  "aɪ": "a",
  "ɔɪ": "o",
  "aʊ": "a",
  "oʊ": "o", o: "o",
  "ɪɹ": "i", ɪr: "i",
  "ɛɹ": "e", ɛr: "e",
  "ʊɹ": "u", ʊr: "u",
  "ɑːɹ": "a", ɑːr: "a", ɑr: "a",
  "ɔːɹ": "o", ɔːr: "o", ɔr: "o"
};

// 子音の行(あ/い/う/え/お列)と、母音を伴わない語尾(コーダ)での既定形。
const CONSONANT_ROWS = {
  p: { a: "パ", i: "ピ", u: "プ", e: "ペ", o: "ポ", coda: "プ" },
  b: { a: "バ", i: "ビ", u: "ブ", e: "ベ", o: "ボ", coda: "ブ" },
  t: { a: "タ", i: "ティ", u: "トゥ", e: "テ", o: "ト", coda: "ト" },
  d: { a: "ダ", i: "ディ", u: "ドゥ", e: "デ", o: "ド", coda: "ド" },
  k: { a: "カ", i: "キ", u: "ク", e: "ケ", o: "コ", coda: "ク" },
  g: { a: "ガ", i: "ギ", u: "グ", e: "ゲ", o: "ゴ", coda: "グ" },
  f: { a: "ファ", i: "フィ", u: "フ", e: "フェ", o: "フォ", coda: "フ" },
  v: { a: "ヴァ", i: "ヴィ", u: "ヴ", e: "ヴェ", o: "ヴォ", coda: "ヴ" },
  θ: { a: "サ", i: "シ", u: "ス", e: "セ", o: "ソ", coda: "ス" },
  ð: { a: "ザ", i: "ジ", u: "ズ", e: "ゼ", o: "ゾ", coda: "ズ" },
  s: { a: "サ", i: "スィ", u: "ス", e: "セ", o: "ソ", coda: "ス" },
  z: { a: "ザ", i: "ズィ", u: "ズ", e: "ゼ", o: "ゾ", coda: "ズ" },
  ʃ: { a: "シャ", i: "シ", u: "シュ", e: "シェ", o: "ショ", coda: "シュ" },
  ʒ: { a: "ジャ", i: "ジ", u: "ジュ", e: "ジェ", o: "ジョ", coda: "ジュ" },
  h: { a: "ハ", i: "ヒ", u: "フ", e: "ヘ", o: "ホ", coda: "フ" },
  "tʃ": { a: "チャ", i: "チ", u: "チュ", e: "チェ", o: "チョ", coda: "チ" },
  "dʒ": { a: "ジャ", i: "ジ", u: "ジュ", e: "ジェ", o: "ジョ", coda: "ジ" },
  m: { a: "マ", i: "ミ", u: "ム", e: "メ", o: "モ", coda: "ム" },
  n: { a: "ナ", i: "ニ", u: "ヌ", e: "ネ", o: "ノ", coda: "ン" },
  ŋ: { a: "ンガ", i: "ンギ", u: "ング", e: "ンゲ", o: "ンゴ", coda: "ング" },
  l: { a: "ラ", i: "リ", u: "ル", e: "レ", o: "ロ", coda: "ル" },
  ɹ: { a: "ラ", i: "リ", u: "ル", e: "レ", o: "ロ", coda: "ル" },
  r: { a: "ラ", i: "リ", u: "ル", e: "レ", o: "ロ", coda: "ル" },
  j: { a: "ヤ", i: "イ", u: "ユ", e: "イェ", o: "ヨ", coda: "イ" },
  w: { a: "ワ", i: "ウィ", u: "ウ", e: "ウェ", o: "ウォ", coda: "ウ" }
};

// このスコア未満の子音は、聞こえないほど弱い(ほぼ無音)として扱い、
// 対応する母音だけを残す(子音は削らず、聞こえた通りに近似する)。
const CONSONANT_DROP_SCORE = 45;
// このスコア・長さの母音は、目立って伸びて聞こえるとみなし、長音を足す。
const VOWEL_ELONGATE_SCORE_BAR = 80;
const VOWEL_ELONGATE_MS = 260;
// 長い母音のあとに強く・長く残る破裂音が続くと、間に軽い「ル」寄りの
// 遷移音が挟まって聞こえることがある(例: "could" の母音が伸びて d が
// 強く残ると「クルド」寄りに聞こえる)。特定の単語ではなく、この音響
// パターン自体を一般ルールとして扱う。
const INTRUSIVE_LIQUID_VOWEL_MS = 175;
const INTRUSIVE_LIQUID_STOP_MS = 150;
const INTRUSIVE_LIQUID_STOP_SCORE_BAR = 70;

function normalizePhone(phone) {
  const value = String(phone || "").trim();
  if (VOWEL_KATAKANA[value] || CONSONANT_ROWS[value]) return value;
  const stripped = value.replace(/ː/g, "");
  if (VOWEL_KATAKANA[stripped] || CONSONANT_ROWS[stripped]) return stripped;
  return value;
}

function phoneDurationMs(phone) {
  if (Number.isFinite(phone?.durationMs)) return Number(phone.durationMs);
  const duration100ns = Number(phone?.duration100ns ?? 0);
  return duration100ns > 0 ? Math.round(duration100ns / 10000) : null;
}

// 二重母音・中心化母音(eɪ/aɪ/ɔɪ/aʊ/oʊ/ɪɹ/ɛɹ/ʊɹ)は、子音と結合すると列(あ/い/う/え/お)の
// 選択だけでは後半の移行音(グライド)が失われる(例: d+eɪ が「デ」になり「デイ」を落とす)。
// 子音+母音の結合モーラのあとに、この移行音を別モーラとして補う。
const VOWEL_GLIDE_SUFFIX = {
  "eɪ": "イ", "aɪ": "イ", "ɔɪ": "イ",
  "aʊ": "ウ", "oʊ": "ウ",
  "ɪɹ": "ア", ɪr: "ア",
  "ɛɹ": "ア", ɛr: "ア",
  "ʊɹ": "ア", ʊr: "ア"
};

// 音素自体が長母音(iː/uː/ɑː/ɔː/r音化した長母音など)の場合、または通常の短母音でも
// スコアが高く目立って長く伸びている場合は、長音として扱う。子音と結合したモーラ
// (例: t+iː→ティ)でも、この長さの情報を落とさず「ティー」のように反映する。
// 二重母音は既にVOWEL_GLIDE_SUFFIXで移行音を表しているため、時間ベースの追加の
// 長音判定はしない(母音自体の記号による長母音判定のみ適用する)。
function isLongVowelPhone(item) {
  if (String(item.phone || "").includes("ː")) return true;
  if (["ɝ", "ɜ", "ɚ"].includes(item.phone)) return true;
  if (VOWEL_GLIDE_SUFFIX[item.phone]) return false;
  return item.score >= VOWEL_ELONGATE_SCORE_BAR && item.ms !== null && item.ms >= VOWEL_ELONGATE_MS;
}

function applyVowelLength(base, item) {
  if (!isLongVowelPhone(item) || base.endsWith("ー")) return base;
  return `${base}ー`;
}

function vowelKatakanaFor(item) {
  return applyVowelLength(VOWEL_KATAKANA[item.phone] || "ア", item);
}

function isStopPhone(phone) {
  return ["p", "b", "t", "d", "k", "g"].includes(phone);
}

// 音素の並びから、聞こえ方に近いカタカナのモーラ列を組み立てる。
// (子音+母音を1モーラに結合し、母音のない子音・クラスターは既定母音を補う)
function buildKatakanaFromPhones(rawPhones) {
  const items = (rawPhones || [])
    .map((phone) => ({
      phone: normalizePhone(phone.phone),
      score: Number(phone.score ?? 100),
      ms: phoneDurationMs(phone)
    }))
    .filter((item) => VOWEL_KATAKANA[item.phone] || CONSONANT_ROWS[item.phone]);

  const morae = [];
  let pendingConsonants = [];

  const pushCodaConsonant = (item) => {
    if (item.score < CONSONANT_DROP_SCORE) return;
    const row = CONSONANT_ROWS[item.phone];
    if (!row) return;
    morae.push(item.phone === "n" ? "ン" : row.coda);
  };

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (VOWEL_KATAKANA[item.phone]) {
      // 子音が連続していた場合(クラスター)、最後の1つだけをこの母音と組み合わせ、
      // それより前の子音は個別の既定コーダとして先に確定させる。
      pendingConsonants.slice(0, -1).forEach(pushCodaConsonant);
      const last = pendingConsonants[pendingConsonants.length - 1];
      const vowelText = vowelKatakanaFor(item);

      if (!last || last.score < CONSONANT_DROP_SCORE) {
        morae.push(vowelText);
      } else {
        const row = CONSONANT_ROWS[last.phone];
        const column = VOWEL_COLUMN[item.phone] || "a";
        const combinedBase = row ? (row[column] || row.coda) : vowelText;
        const withGlide = `${combinedBase}${VOWEL_GLIDE_SUFFIX[item.phone] || ""}`;
        morae.push(applyVowelLength(withGlide, item));
      }
      pendingConsonants = [];
      continue;
    }
    if (CONSONANT_ROWS[item.phone]) pendingConsonants.push(item);
  }
  pendingConsonants.forEach(pushCodaConsonant);

  return morae;
}

// 長い母音の直後に、強く・長く残る破裂音が単独で続く場合、間に軽い遷移音を
// 挟んで聞こえることがある聴覚パターンを一般ルールとして反映する。
function applyIntrusiveLiquidPattern(morae, phones) {
  const items = (phones || []).map((phone) => ({
    phone: normalizePhone(phone.phone),
    score: Number(phone.score ?? 100),
    ms: phoneDurationMs(phone)
  }));
  if (items.length < 2) return morae;
  const lastVowelIndex = [...items].reverse().findIndex((item) => VOWEL_KATAKANA[item.phone]);
  if (lastVowelIndex === -1) return morae;
  const vowelIndex = items.length - 1 - lastVowelIndex;
  const vowel = items[vowelIndex];
  const finalStop = items[items.length - 1];
  if (vowelIndex !== items.length - 2) return morae;
  if (!isStopPhone(finalStop.phone)) return morae;
  const vowelIsLong = vowel.ms !== null && vowel.ms >= INTRUSIVE_LIQUID_VOWEL_MS;
  const stopIsHeavy = finalStop.score >= INTRUSIVE_LIQUID_STOP_SCORE_BAR
    && finalStop.ms !== null && finalStop.ms >= INTRUSIVE_LIQUID_STOP_MS;
  if (!vowelIsLong || !stopIsHeavy) return morae;
  // 語尾の破裂音モーラの直前に「ル」を挿入する。
  const withoutFinal = morae.slice(0, -1);
  return [...withoutFinal, "ル", morae[morae.length - 1]];
}

// word.phones (Azureの音素スコア・長さ)から、聞こえ方に近いカタカナを組み立てる。
// 音素データがない場合は null を返す(呼び出し側で英語表記そのままにフォールバックする)。
function phoneticKatakanaForWord(word) {
  const phones = word?.phones || [];
  if (!phones.length) return null;
  const morae = applyIntrusiveLiquidPattern(buildKatakanaFromPhones(phones), phones);
  const text = morae.join("");
  return text || null;
}

module.exports = { phoneticKatakanaForWord, buildKatakanaFromPhones, VOWEL_KATAKANA, CONSONANT_ROWS };
