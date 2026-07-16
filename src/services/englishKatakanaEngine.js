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

// --- 自由認識(参照文なし)用: 音素スコアがない場合のスペリング→カタカナ ---
// Azureの音素データが得られない(自由発話認識のみの)単語向けに、綴りから
// おおまかな発音を推定してから、上と同じ音素→カタカナの組み立てに渡す。
// 英語の綴りは例外が多く完全な精度は望めないが、固定の単語辞書(モグラ叩き)
// より遥かに広い範囲の単語に、一定水準の近似を与えられる。
const SPELLING_MULTI_LETTER_PATTERNS = [
  ["tion", ["ʃ", "ə", "n"]],
  ["sion", ["ʒ", "ə", "n"]],
  ["eigh", ["eɪ"]],
  ["ough", ["ʌ", "f"]],
  ["igh", ["aɪ"]],
  ["tch", ["tʃ"]],
  ["dge", ["dʒ"]],
  ["ck", ["k"]],
  ["ph", ["f"]],
  ["wh", ["w"]],
  ["th", ["θ"]],
  ["sh", ["ʃ"]],
  ["ch", ["tʃ"]],
  ["ng", ["ŋ"]],
  ["qu", ["k", "w"]],
  ["ee", ["iː"]],
  ["ea", ["iː"]],
  ["oo", ["uː"]],
  ["ou", ["aʊ"]],
  ["oy", ["ɔɪ"]],
  ["oi", ["ɔɪ"]],
  ["ai", ["eɪ"]],
  ["ay", ["eɪ"]],
  ["ue", ["uː"]],
  ["au", ["ɔː"]],
  ["aw", ["ɔː"]],
  ["ar", ["ɑːɹ"]],
  ["or", ["ɔːɹ"]],
  ["er", ["ɝː"]],
  ["ir", ["ɝː"]],
  ["ur", ["ɝː"]],
  ["gh", []]
];

const SPELLING_SINGLE_LETTER = {
  a: "æ", e: "ɛ", i: "ɪ", o: "ɔ", u: "ʌ",
  b: "b", d: "d", f: "f", h: "h", k: "k", l: "l", m: "m", n: "n",
  p: "p", r: "ɹ", t: "t", v: "v", w: "w", z: "z", j: "dʒ"
};

function guessPhonesFromSpelling(rawWord) {
  let word = String(rawWord || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return [];

  // 英語の綴りは二重子音(pass/will/tomorrowのss/ll/rrなど)が1つの音しか表さないため、
  // 連続する同じ子音字は1文字に畳む。
  word = word.replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, "$1");

  // 語末の e は、その直前が子音であれば大半は無音(例: leave, please, name)。
  // 短い機能語(be/he/me/we など)は自由認識辞書側で個別に対応済みのため、
  // ここでは4文字以上の場合だけ無音として扱う。
  if (word.length >= 4 && word.endsWith("e") && !/[aeiou]/.test(word[word.length - 2])) {
    word = word.slice(0, -1);
  }

  const phones = [];
  let i = 0;
  while (i < word.length) {
    const multi = SPELLING_MULTI_LETTER_PATTERNS.find(([pattern]) => word.startsWith(pattern, i));
    if (multi) {
      phones.push(...multi[1]);
      i += multi[0].length;
      continue;
    }

    const ch = word[i];
    if (ch === "c") {
      const next = word[i + 1];
      phones.push(next === "e" || next === "i" || next === "y" ? "s" : "k");
      i += 1;
      continue;
    }
    if (ch === "g") {
      const next = word[i + 1];
      phones.push(next === "e" || next === "i" || next === "y" ? "dʒ" : "g");
      i += 1;
      continue;
    }
    if (ch === "s") {
      phones.push("s");
      i += 1;
      continue;
    }
    if (ch === "y") {
      const isVowelPosition = i === 0 ? false : true;
      if (isVowelPosition) {
        const remaining = word.length - i;
        phones.push(remaining <= 2 ? "aɪ" : "ɪ");
      } else {
        phones.push("j");
      }
      i += 1;
      continue;
    }
    if (ch === "x") {
      phones.push("k", "s");
      i += 1;
      continue;
    }
    if (SPELLING_SINGLE_LETTER[ch]) {
      phones.push(SPELLING_SINGLE_LETTER[ch]);
      i += 1;
      continue;
    }
    i += 1;
  }

  return phones.filter(Boolean).map((phone) => ({ phone, score: 100, ms: null }));
}

// 音素スコアがない(自由認識のみの)単語のカタカナ近似。取得できなければ null。
function spellingToKatakana(word) {
  const phones = guessPhonesFromSpelling(word);
  if (!phones.length) return null;
  const morae = buildKatakanaFromPhones(phones);
  const text = morae.join("");
  return text || null;
}

// --- 単語間の連結(リエゾン)の一般化 ---
// 特定の単語ペア("could you"など)専用の分岐ではなく、音の並びの一般則
// (yod-coalescence: 語末の t/d + 次語頭の j が同化してtʃ/dʒになる。
// 例: could you→クッジュー, want you→ワンチュー)として、どの単語ペアにも
// 同じ判定を適用する。
function coalescedLinkingKatakana(currentPhones, nextPhones) {
  const current = (currentPhones || []).map((phone) => ({ phone: normalizePhone(phone.phone), score: Number(phone.score ?? 100), ms: phoneDurationMs(phone) }));
  const next = (nextPhones || []).map((phone) => ({ phone: normalizePhone(phone.phone), score: Number(phone.score ?? 100), ms: phoneDurationMs(phone) }));
  if (!current.length || next.length < 2) return null;
  const lastCurrent = current[current.length - 1];
  if (lastCurrent.phone !== "t" && lastCurrent.phone !== "d") return null;
  if (next[0].phone !== "j") return null;
  const followingVowel = next[1];
  if (!VOWEL_KATAKANA[followingVowel.phone]) return null;

  const coalesced = lastCurrent.phone === "d" ? "dʒ" : "tʃ";
  const row = CONSONANT_ROWS[coalesced];
  const column = VOWEL_COLUMN[followingVowel.phone] || "u";
  const mergedMora = applyVowelLength(`${row[column] || row.coda}${VOWEL_GLIDE_SUFFIX[followingVowel.phone] || ""}`, followingVowel);

  const beforeMorae = buildKatakanaFromPhones(current.slice(0, -1));
  const afterMorae = buildKatakanaFromPhones(next.slice(2));
  // 同化する前の t/d は完全には消えず、破裂の閉じが一瞬残ることが多いため、
  // 促音(小さい「ッ」)として挟む(例: could you → クッジュー)。
  return [...beforeMorae, "ッ", mergedMora, ...afterMorae].join("");
}

// t/d がほぼ聞こえないほど弱い場合は、tʃ/dʒへの同化ではなく、単に語尾の子音が
// 抜けて次の語へ緩くつながって聞こえる(例: could you → クッユー、dが同化先の
// 破擦音にすらならない場合)。
function droppedStopLinkingKatakana(currentPhones, nextPhones) {
  const current = currentPhones || [];
  const beforeMorae = buildKatakanaFromPhones(current.slice(0, -1));
  const afterText = phoneticKatakanaForWord({ phones: nextPhones });
  if (!afterText) return null;
  return [...beforeMorae, "ッ", afterText].join("");
}

module.exports = {
  phoneticKatakanaForWord,
  buildKatakanaFromPhones,
  spellingToKatakana,
  coalescedLinkingKatakana,
  droppedStopLinkingKatakana,
  VOWEL_KATAKANA,
  CONSONANT_ROWS
};
