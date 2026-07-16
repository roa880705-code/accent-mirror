const { extractPitchTrack, toSemitone, sampleHzAt } = require("./audioPitchService");
const thresholds = require("../config/pitchThresholds");

// Step 1: モデル発話とユーザー発話の音素/単語境界を1対1で対応づける。
// 両方とも同じ referenceText に対して Azure Pronunciation Assessment を実行しているため、
// NBest[0].Words は同じ語順で並ぶ想定。DTWは使わず、単語インデックスでそのまま対応づける。
function buildWordSpansFromRaw(raw) {
  const words = raw?.NBest?.[0]?.Words || [];
  return words.map((word) => {
    const startMs = Number(word.Offset ?? word.offset ?? 0) / 10000;
    const durationMs = Number(word.Duration ?? word.duration ?? 0) / 10000;
    return {
      word: String(word.Word || word.word || "").toLowerCase(),
      startMs,
      durationMs,
      endMs: startMs + durationMs
    };
  });
}

// 各音素/単語区間内で開始点・中間点・終了点の3点をサンプリングする（フルDTWは採用しない）。
function sampleWordPoints(span) {
  const durationMs = Math.max(1, span.endMs - span.startMs);
  return {
    start: span.startMs + durationMs * 0.15,
    mid: span.startMs + durationMs * 0.5,
    end: span.startMs + durationMs * 0.85
  };
}

function safeSemitone(hz, medianHz) {
  return Number.isFinite(hz) && hz > 0 && Number.isFinite(medianHz) && medianHz > 0 ? toSemitone(hz, medianHz) : null;
}

function averageFinite(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (!finite.length) return null;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

// Step 3 (文中の区間ごとの差分): 語ごとの平均deviationの推移から、モデルにない急な上下(zigzag)
// や目立つ上げ下げ(phrase_movement)を検出する。既存の自己相対アルゴリズム(buildPitchContour)
// と同じ形状 { moves, directionChanges, rangeSemitones, pattern } を返し、下流のロジックを再利用する。
function buildDeviationContour(words) {
  const valid = words.filter((word) => Number.isFinite(word.avgDeviation));
  const moves = [];
  for (let i = 0; i < valid.length - 1; i += 1) {
    const semitones = Number((valid[i + 1].avgDeviation - valid[i].avgDeviation).toFixed(1));
    const direction = semitones >= thresholds.midSentenceMoveSemitone
      ? "rise"
      : semitones <= -thresholds.midSentenceMoveSemitone
        ? "fall"
        : "flat";
    moves.push({ from: i, to: i + 1, semitones, direction, word: valid[i + 1].word });
  }

  const significantMoves = moves.filter((move) => move.direction !== "flat");
  const directionChanges = significantMoves.reduce((count, move, index) => {
    if (index === 0) return 0;
    return significantMoves[index - 1].direction !== move.direction ? count + 1 : count;
  }, 0);
  const rangeSemitones = valid.length
    ? Number((Math.max(...valid.map((word) => word.avgDeviation)) - Math.min(...valid.map((word) => word.avgDeviation))).toFixed(1))
    : 0;
  // 方向転換の「回数」だけでは、単語ごとのピッチ推定ノイズ(1半音前後の揺れ)だけで
  // zigzag と誤判定しやすいことが実機テストで判明したため、回数と音域差の両方を
  // 満たす場合のみ zigzag とする(回数だけ・音域差だけでは phrase_movement 止まり)。
  const pattern = directionChanges >= thresholds.zigzagMinDirectionChanges && rangeSemitones >= thresholds.zigzagRangeSemitone
    ? "zigzag"
    : directionChanges >= 1 && rangeSemitones >= thresholds.phraseMovementRangeSemitone
      ? "phrase_movement"
      : "simple";

  return { moves, directionChanges, rangeSemitones, pattern };
}

// Step 1-3 一式: モデル側とユーザー側のWAV+区間(span)一覧から、
// deviation(t) = userSemitone(t) - modelSemitone(t) の区間ごとの系列を組み立てる。
// 返り値は既存の intonationFeatures (audioPitchService.analyzePitchFromWav の出力) と
// 同じ形状 { available, riseSemitones, contour, confidence } を持たせ、
// mirrorGeneratorService 側の分類ロジックをそのまま再利用できるようにする。
// span は { word, startMs, durationMs, endMs } の配列であればよく、Azureの単語タイムスタンプ
// (buildWordSpansFromRaw) だけでなく、TTS合成時のbookmarkから得たセグメント区間も渡せる
// (模範日本語ミラー vs ミラー音声のピッチ比較で利用)。
function buildDeviationTimelineFromSpans({ modelWavBuffer, modelSpans, userWavBuffer, userSpans }) {
  const modelTrack = extractPitchTrack(modelWavBuffer);
  if (!modelTrack.available) return { available: false, reason: `model:${modelTrack.reason}` };

  const userTrack = extractPitchTrack(userWavBuffer);
  if (!userTrack.available) return { available: false, reason: `user:${userTrack.reason}` };

  const modelWords = Array.isArray(modelSpans) ? modelSpans : [];
  const userWords = Array.isArray(userSpans) ? userSpans : [];
  const pairCount = Math.min(modelWords.length, userWords.length);
  if (pairCount < 1) return { available: false, reason: "no-aligned-words" };

  const words = [];
  for (let i = 0; i < pairCount; i += 1) {
    const modelPoints = sampleWordPoints(modelWords[i]);
    const userPoints = sampleWordPoints(userWords[i]);

    const modelSemitone = {
      start: safeSemitone(sampleHzAt(modelTrack.frames, modelPoints.start), modelTrack.medianHz),
      mid: safeSemitone(sampleHzAt(modelTrack.frames, modelPoints.mid), modelTrack.medianHz),
      end: safeSemitone(sampleHzAt(modelTrack.frames, modelPoints.end), modelTrack.medianHz)
    };
    const userSemitone = {
      start: safeSemitone(sampleHzAt(userTrack.frames, userPoints.start), userTrack.medianHz),
      mid: safeSemitone(sampleHzAt(userTrack.frames, userPoints.mid), userTrack.medianHz),
      end: safeSemitone(sampleHzAt(userTrack.frames, userPoints.end), userTrack.medianHz)
    };
    const deviation = {
      start: Number.isFinite(modelSemitone.start) && Number.isFinite(userSemitone.start) ? userSemitone.start - modelSemitone.start : null,
      mid: Number.isFinite(modelSemitone.mid) && Number.isFinite(userSemitone.mid) ? userSemitone.mid - modelSemitone.mid : null,
      end: Number.isFinite(modelSemitone.end) && Number.isFinite(userSemitone.end) ? userSemitone.end - modelSemitone.end : null
    };

    words.push({
      word: userWords[i].word || modelWords[i].word,
      modelSemitone,
      userSemitone,
      deviation,
      avgDeviation: averageFinite([deviation.start, deviation.mid, deviation.end]),
      // ユーザー側の区間の長さ(ms)。短い機能語ほど3点サンプルのピッチ推定が
      // ノイズに弱いため、下流(ミラー音声生成)で信頼度の重み付けに使う。
      durationMs: Number(userWords[i]?.durationMs ?? modelWords[i]?.durationMs ?? 0)
    });
  }

  const validWords = words.filter((word) => Number.isFinite(word.avgDeviation));
  if (!validWords.length) return { available: false, reason: "no-voiced-deviation-samples" };

  const lastValidWord = validWords[validWords.length - 1];
  const finalDeviation = Number(lastValidWord.avgDeviation.toFixed(1));
  const contour = buildDeviationContour(words);

  return {
    available: true,
    basis: "model-relative",
    riseSemitones: finalDeviation,
    contour,
    words,
    modelMedianHz: Math.round(modelTrack.medianHz),
    userMedianHz: Math.round(userTrack.medianHz),
    pairCount,
    modelWordCount: modelWords.length,
    userWordCount: userWords.length,
    confidence: pairCount >= 3 && modelTrack.voicedFrameCount >= 8 && userTrack.voicedFrameCount >= 8 ? "high" : "medium"
  };
}

// 英語モデル音声 vs 録音音声用: Azure Pronunciation Assessment の単語タイムスタンプ(raw)から
// spanを組み立てたうえで buildDeviationTimelineFromSpans を呼び出す、既存呼び出し元向けの薄いラッパー。
function buildDeviationTimeline({ modelWavBuffer, modelRaw, userWavBuffer, userRaw }) {
  return buildDeviationTimelineFromSpans({
    modelWavBuffer,
    modelSpans: buildWordSpansFromRaw(modelRaw),
    userWavBuffer,
    userSpans: buildWordSpansFromRaw(userRaw)
  });
}

module.exports = { buildDeviationTimeline, buildDeviationTimelineFromSpans, buildWordSpansFromRaw };
