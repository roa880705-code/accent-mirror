const { generateJapaneseMirror } = require("./mirrorGeneratorService");

const consonantPhones = [
  "p", "b", "t", "d", "k", "g", "f", "v", "s", "z",
  "sh", "zh", "ch", "jh", "th", "dh", "h", "m", "n", "ng",
  "l", "r", "w", "j"
];

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function norm(word) {
  return String(word || "").toLowerCase().replace(/[^a-z]/g, "");
}

function sentenceNorm(text) {
  return String(text || "").toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
}

function isConsonant(phone) {
  const value = String(phone || "").toLowerCase();
  return consonantPhones.some((candidate) => value.includes(candidate));
}

function extractWords(raw) {
  return raw?.NBest?.[0]?.Words || [];
}

function phoneName(phone) {
  return phone?.Phoneme || phone?.phoneme || phone?.NBestPhonemes?.[0]?.Phoneme || "";
}

function phoneScore(phone) {
  return Number(phone?.PronunciationAssessment?.AccuracyScore ?? phone?.AccuracyScore ?? 100);
}

function phoneOffset(phone) {
  return Number(phone?.Offset ?? phone?.offset ?? 0);
}

function phoneDuration(phone) {
  return Number(phone?.Duration ?? phone?.duration ?? 0);
}

function extractPhones(word) {
  const out = [];
  (word?.Phonemes || []).forEach((phone) => out.push({
    phone: phoneName(phone),
    score: phoneScore(phone),
    offset100ns: phoneOffset(phone),
    duration100ns: phoneDuration(phone)
  }));
  (word?.Syllables || []).forEach((syllable) => {
    (syllable?.Phonemes || []).forEach((phone) => out.push({
      phone: phoneName(phone),
      score: phoneScore(phone),
      offset100ns: phoneOffset(phone),
      duration100ns: phoneDuration(phone)
    }));
  });
  return out.filter((item) => item.phone);
}

function wordScore(word) {
  return Number(word?.PronunciationAssessment?.AccuracyScore ?? 100);
}

function errorType(word) {
  return word?.PronunciationAssessment?.ErrorType || "None";
}

function makeUtteranceCheck(contrastSet, freeRecognizedText) {
  const referenceNorm = sentenceNorm(contrastSet.text);
  const freeNorm = sentenceNorm(freeRecognizedText);
  const status = !freeNorm ? "unavailable" : freeNorm === referenceNorm ? "match" : "possible_mismatch";

  return {
    referenceText: contrastSet.text || "",
    freeRecognizedText,
    status,
    warning: status === "unavailable"
      ? "参照文なし認識を利用できませんでした。"
      : status === "match"
        ? "参照文なし認識でも、選択した英文として聞こえています。"
        : "参照文なし認識では別の英文として聞こえている可能性があります。文全体のスコアは、発音能力そのものではなく、選択英文との一致度を強く含みます。"
  };
}

function analyzeAzureRaw(raw, contrastSet, options = {}) {
  const freeRecognizedText = String(options.freeRecognizedText || "").trim();
  const utteranceCheck = makeUtteranceCheck(contrastSet, freeRecognizedText);
  const critical = (contrastSet.critical || []).map(norm);
  const wordDiagnostics = extractWords(raw).map((wordResult) => {
    const word = norm(wordResult.Word);
    const score = wordScore(wordResult);
    const err = errorType(wordResult);
    const isCritical = critical.includes(word);
    const phones = extractPhones(wordResult);
    const consonants = phones.filter((phone) => isConsonant(phone.phone)).map((phone) => phone.score);
    const consonantAvg = consonants.length ? consonants.reduce((a, b) => a + b, 0) / consonants.length : null;
    const consonantMin = consonants.length ? Math.min(...consonants) : null;
    let judgment = "OK";

    if (isCritical && score < 88) judgment = "Critical word concern";
    if (score < 70) judgment = "Word-level problem";
    if (isCritical && consonantMin !== null && consonantMin < 75) judgment = "Critical consonant concern";

    return {
      original: wordResult.Word,
      word,
      score,
      errorType: err,
      isCritical,
      phones,
      consonantAvg,
      consonantMin,
      offset100ns: Number(wordResult.Offset ?? wordResult.offset ?? 0),
      duration100ns: Number(wordResult.Duration ?? wordResult.duration ?? 0),
      judgment
    };
  });

  const allConsonants = wordDiagnostics
    .flatMap((word) => word.phones)
    .filter((phone) => isConsonant(phone.phone))
    .map((phone) => phone.score);
  const consonantAvg = allConsonants.length ? allConsonants.reduce((a, b) => a + b, 0) / allConsonants.length : null;
  const consonantMin = allConsonants.length ? Math.min(...allConsonants) : null;
  const criticalConcerns = wordDiagnostics.filter((word) => word.isCritical && (word.score < 88 || (word.consonantMin !== null && word.consonantMin < 75)));
  const criticalOk = wordDiagnostics.filter((word) => word.isCritical && word.score >= 88 && (word.consonantMin === null || word.consonantMin >= 75));
  const muffled = (consonantAvg !== null && consonantMin !== null && consonantAvg < 70 && consonantMin < 50)
    || (consonantMin !== null && consonantMin < 35);
  const couldBlindSpot = critical.includes("could") && criticalOk.some((word) => word.word === "could");

  let blindSpotJudgment;
  let conclusion;
  let nextDecision;

  if (utteranceCheck.status === "possible_mismatch") {
    blindSpotJudgment = "選択英文との不一致候補";
    conclusion = "別の英文として聞こえている可能性があります。文全体スコアは、発音そのものの良し悪しではなく、選択英文との一致度も含めて見てください。";
    nextDecision = "自由認識の英文を優先して、日本語訳とミラーを確認します。選択英文で練習したい場合は、同じ英文を読み直してください。";
  } else if (criticalConcerns.length) {
    blindSpotJudgment = "Azureが弱点を検出";
    conclusion = "Azureは重要語または子音の弱さを拾っています。";
    nextDecision = "Mirror変換ロジックへ反映できます。";
  } else if (couldBlindSpot) {
    blindSpotJudgment = "Azure見落とし候補";
    conclusion = "AzureはCouldを高評価にしていますが、人間の耳では別語寄りに聞こえる可能性を検証します。";
    nextDecision = "録音音声そのものの特徴、単語単体比較、独自ルールで確認します。";
  } else if (muffled) {
    blindSpotJudgment = "こもり候補";
    conclusion = "子音スコアが低く、こもって聞こえる候補をAzureが拾っています。";
    nextDecision = "Mirror Voice側でこもりや弱さを反映する段階です。";
  } else {
    blindSpotJudgment = "大きな弱点は少ない";
    conclusion = "Azure上では大きな弱点として扱われていません。人間の耳とのズレを確認してください。";
    nextDecision = "速度、区切り、音調、カタカナ聞こえ方を中心に検証します。";
  }

  const scores = {
    accuracy: clamp(raw?.NBest?.[0]?.PronunciationAssessment?.AccuracyScore),
    fluency: clamp(raw?.NBest?.[0]?.PronunciationAssessment?.FluencyScore),
    completeness: clamp(raw?.NBest?.[0]?.PronunciationAssessment?.CompletenessScore),
    prosody: clamp(raw?.NBest?.[0]?.PronunciationAssessment?.ProsodyScore)
  };

  const mirror = generateJapaneseMirror({
    contrastSet,
    wordDiagnostics,
    scores,
    consonantAvg,
    consonantMin,
    muffled,
    couldBlindSpot,
    recordingDurationMs: options.recordingDurationMs,
    rhythmHints: options.rhythmHints,
    intonationFeatures: options.intonationFeatures,
    freeRecognizedText,
    utteranceCheck
  });

  return {
    scores,
    scoreInterpretation: utteranceCheck.status === "possible_mismatch"
      ? "選択英文と違う英文として聞こえているため、このスコアは発音の上手さだけでなく、参照文との不一致ペナルティを含みます。"
      : "選択英文に対する発音評価です。",
    recognizedText: raw?.DisplayText || raw?.NBest?.[0]?.Display || "",
    wordDiagnostics,
    consonantAvg,
    consonantMin,
    criticalConcerns,
    criticalOk,
    muffled,
    couldBlindSpot,
    blindSpotJudgment,
    conclusion,
    nextDecision,
    mirrorPreview: mirror.heardAsJapanese,
    mirror,
    utteranceCheck
  };
}

module.exports = { analyzeAzureRaw, consonantPhones };
