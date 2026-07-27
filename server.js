require("dotenv").config();
const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const { contrastSets, getContrastSet, STORY_STAGES } = require("./src/config/contrastSets");
const { analyzeAzureRaw } = require("./src/services/contrastAnalysisService");
const { assessPronunciationFromWav, recognizeEnglishFromWav, assertAzureConfig } = require("./src/services/azurePronunciationService");
const { compareAttempts } = require("./src/services/contrastSessionService");
const { synthesizeJapaneseSpeech, synthesizeEnglishModelSpeech, synthesizeEnglishModelSpeechWav, synthesizeJapaneseSpeechWithSegmentTimings } = require("./src/services/azureTtsService");
const { analyzePitchFromWav, analyzeExpressiveness } = require("./src/services/audioPitchService");
const { buildDeviationTimeline, buildDeviationTimelineFromSpans } = require("./src/services/pitchAlignmentService");
const { buildNeutralVoiceScriptFromSegments, buildJapaneseMirrorPitchAnalysis } = require("./src/services/mirrorGeneratorService");
const { synthesizeExpressiveJapaneseSpeech, openAiVoiceForGender, buildDeliveryInstructions, speedForEmotionLevel } = require("./src/services/openaiTtsService");
const { findCachedAudio } = require("./src/services/audioCacheService");
const app = express();
const PORT = Number(process.env.PORT || 3003);
// Azure App Service 等でGitHub連携デプロイを使う場合、デプロイのたびにアプリコード
// フォルダ(__dirname配下)が展開し直されるため、そこに書いたログは消えてしまう。
// VALIDATION_LOG_DIR を設定すれば、デプロイの影響を受けない永続領域
// (例: Azure App Service Linuxの /home/logs) にログを保存できる。
const LOG_DIR = process.env.VALIDATION_LOG_DIR || path.join(__dirname, "logs");
const VALIDATION_LOG_FILE = path.join(LOG_DIR, "validation-log.jsonl");

// ピッチ判定モデル基準化用: モデル音声(TTS)を毎回合成/評価すると遅くコストもかかるため、
// referenceText 単位でモデル側のWAVとAzure単語タイムスタンプをプロセス内キャッシュする。
// 合成/評価に失敗した場合はキャッシュに残さず、次回リクエストで再試行する。
const modelPitchReferenceCache = new Map();

async function getModelPitchReference(referenceText) {
  const cacheKey = referenceText.trim();
  if (!cacheKey) return null;
  if (modelPitchReferenceCache.has(cacheKey)) return modelPitchReferenceCache.get(cacheKey);

  const promise = (async () => {
    const modelSpeech = await synthesizeEnglishModelSpeechWav({ text: cacheKey });
    const modelAssessment = await assessPronunciationFromWav(modelSpeech.audio, cacheKey);
    return { wavBuffer: modelSpeech.audio, raw: modelAssessment.raw };
  })().catch((error) => {
    console.warn(`[pitch] model reference unavailable for "${cacheKey}":`, String(error.message || error));
    return null;
  });

  modelPitchReferenceCache.set(cacheKey, promise);
  const result = await promise;
  if (!result) modelPitchReferenceCache.delete(cacheKey);
  return result;
}

function parseJsonQuery(value) {
  if (!value) return null;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

async function appendValidationLog(entry) {
  await fs.mkdir(LOG_DIR, { recursive: true });
  const safeEntry = {
    ...entry,
    serverReceivedAt: new Date().toISOString(),
    schemaVersion: "validation-log-v1"
  };
  await fs.appendFile(VALIDATION_LOG_FILE, `${JSON.stringify(safeEntry)}\n`, "utf8");
  return safeEntry;
}

async function readRecentValidationLogs(limit = 100) {
  try {
    const text = await fs.readFile(VALIDATION_LOG_FILE, "utf8");
    return text
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-Math.max(1, Math.min(500, Number(limit) || 100)))
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

app.use(express.json({ limit: "1mb" }));
app.use("/api/assess", express.raw({ type: ["audio/wav", "audio/x-wav", "application/octet-stream"], limit: "8mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/speech-sdk", express.static(path.join(__dirname, "node_modules", "microsoft-cognitiveservices-speech-sdk", "distrib", "browser")));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    app: "Accent Mirror",
    version: "0.12.0-timeline-voice-script",
    port: PORT
  });
});

app.get("/api/contrast-sets", (_req, res) => {
  res.json({ contrastSets, storyStages: STORY_STAGES });
});

app.get("/api/validation-logs", async (req, res) => {
  try {
    const logs = await readRecentValidationLogs(req.query.limit || 100);
    res.json({ ok: true, file: "logs/validation-log.jsonl", count: logs.length, logs });
  } catch (e) {
    res.status(500).json({ error: "Validation log read failed", detail: String(e.message || e) });
  }
});

app.post("/api/validation-logs", async (req, res) => {
  try {
    const log = req.body?.log || req.body;
    if (!log || typeof log !== "object" || Array.isArray(log)) {
      return res.status(400).json({ error: "validation log object is required" });
    }
    if (!log.verdict) return res.status(400).json({ error: "verdict is required" });
    const saved = await appendValidationLog(log);
    res.json({ ok: true, file: "logs/validation-log.jsonl", id: saved.id, savedAt: saved.serverReceivedAt });
  } catch (e) {
    res.status(500).json({ error: "Validation log save failed", detail: String(e.message || e) });
  }
});

app.get("/api/speech-token", async (_req, res) => {
  try {
    const { key, region } = assertAzureConfig();
    const r = await fetch(`https://${encodeURIComponent(region)}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": "0"
      }
    });
    if (!r.ok) return res.status(r.status).json({ error: "Azure token error", detail: await r.text() });
    res.json({ token: await r.text(), region });
  } catch(e) {
    res.status(e.statusCode || 500).json({ error: "Azure接続エラー", detail: String(e.message || e) });
  }
});

app.post("/api/assess", async (req, res) => {
  try {
    const contrastSet = getContrastSet(req.query.contrastSetId || req.query.referenceText);
    const referenceText = String(req.query.referenceText || contrastSet.text || "").trim();

    if (!referenceText) return res.status(400).json({ error: "referenceText is required" });
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ error: "WAV audio body is required" });

    const recordingDurationMs = Number(req.query.durationMs || 0) || null;
    const rhythmHints = parseJsonQuery(req.query.rhythmHints) || {};
    const profile = {
      gender: req.query.gender === "male" ? "male" : req.query.gender === "female" ? "female" : undefined,
      age: ["teens", "20s", "30s"].includes(req.query.age) ? req.query.age : undefined,
      scene: req.query.scene || undefined
    };
    const [azureResult, freeRecognition, modelReference] = await Promise.all([
      assessPronunciationFromWav(req.body, referenceText),
      recognizeEnglishFromWav(req.body).catch((error) => ({ text: "", raw: {}, error: String(error.message || error) })),
      getModelPitchReference(referenceText)
    ]);

    // ピッチ判定はモデル音声基準(deviation = userSemitone - modelSemitone)を優先し、
    // モデル参照が使えない場合のみ自己相対の旧ロジックにフォールバックする
    // (フォールバック時は mirrorGeneratorService 側で低信頼度=表示のみに格下げされる)。
    let intonationFeatures = modelReference
      ? buildDeviationTimeline({
          modelWavBuffer: modelReference.wavBuffer,
          modelRaw: modelReference.raw,
          userWavBuffer: req.body,
          userRaw: azureResult.raw
        })
      : { available: false, reason: "model-reference-unavailable" };
    if (!intonationFeatures.available) {
      intonationFeatures = analyzePitchFromWav(req.body);
    }

    // 感情をどれだけ込めているかの「程度」をミラーへ反映するための指標。
    // モデル比較(deviation)とは別に、録音そのもの(話者内)のピッチ・音量の
    // 動的レンジを見るので、モデル参照の有無に関わらず常に計算できる。
    // ただしextractPitchTrackは計算コストがあり、上のbuildDeviationTimelineが
    // 既に同じユーザー音声で一度計算済み(userTrack)のことが多いため、二重に
    // 計算せずそれを再利用する(実機フィードバック: 診断が時々止まって進まない=
    // 負荷の高い環境で二重計算が処理時間を押し上げていた可能性への対応)。
    const expressiveness = analyzeExpressiveness(intonationFeatures.userTrack || req.body);

    // 学習者がModel English/模範ミラーで選んでいた目標の感情強度(自然/豊か)。
    // 実際の発話の表現力(expressiveness)と比べて、目標との差を分析結果に含める
    // (実機フィードバック: "modelと録音音声の違いをそれぞれ見極める必要があるし、
    // その違いを...模範ミラーと生成されたミラーでの違いとして反映させる必要が
    // ある")。
    const targetEmotionLevel = ["natural", "expressive"].includes(req.query.emotionLevel)
      ? req.query.emotionLevel
      : undefined;

    const analysis = analyzeAzureRaw(azureResult.raw, { ...contrastSet, text: referenceText }, {
      recordingDurationMs,
      rhythmHints,
      intonationFeatures,
      expressiveness,
      targetEmotionLevel,
      freeRecognizedText: freeRecognition.text || "",
      freeRecognitionError: freeRecognition.error || "",
      profile
    });

    res.json({
      version: "0.12.0-timeline-voice-script",
      referenceText,
      contrastSet,
      scores: {
        ...analysis.scores,
        pronunciation: Math.round(Number(azureResult.assessment.pronunciationScore) || 0)
      },
      recognizedText: azureResult.text || analysis.recognizedText,
      freeRecognizedText: freeRecognition.text || "",
      utteranceCheck: analysis.utteranceCheck,
      scoreInterpretation: analysis.scoreInterpretation,
      wordDiagnostics: analysis.wordDiagnostics,
      consonantAvg: analysis.consonantAvg,
      consonantMin: analysis.consonantMin,
      intonationFeatures,
      recordingDurationMs,
      rhythmHints,
      criticalConcerns: analysis.criticalConcerns,
      blindSpotJudgment: analysis.blindSpotJudgment,
      conclusion: analysis.conclusion,
      nextDecision: analysis.nextDecision,
      mirrorPreview: analysis.mirrorPreview,
      mirror: analysis.mirror,
      flags: {
        muffled: analysis.muffled,
        couldBlindSpot: analysis.couldBlindSpot
      },
      raw: azureResult.raw
    });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: "Assessment failed", detail: String(e.message || e) });
  }
});

app.post("/api/contrast-session", (req, res) => {
  try {
    const attempts = Array.isArray(req.body?.attempts) ? req.body.attempts : [];
    res.json(compareAttempts(attempts));
  } catch (e) {
    res.status(500).json({ error: "Contrast session failed", detail: String(e.message || e) });
  }
});

// 学習者のミラー音声プロフィール(性別・年代・場面)に合わせて、Model English(お手本の
// 英語音声)・模範日本語ミラーの両方の話し方を「教科書的な読み上げ」ではなく、実際の
// 会話の場面に近い自然な速さ・話し方に近づける(実機フィードバック: "現在の模範ミラー
// 音声の読み上げは教科書的な読み上げ方だと思う。ビジネスシーンであればビジネス
// パーソンが使うような言い回し、性別ぽい言い回しに")。性別は別の話者(Neural voice)を
// 選ぶ方が違いとして明確なのに対し、年代・場面を専用の話者で表現できる確証がないため
// (Azureの年代・場面別ボイスは公式に保証された特性ではない)、年代・場面は同じ話者の
// まま速度・ピッチ・mstts:express-as styleを揺らす方法に留める。styleは話者によって
// 対応可否が異なりここでは確証が持てないため、azureTtsService.synthesizeSpeech側で
// 対応していない場合は自動的にstyleなしへフォールバックする。
const MODEL_VOICE_BY_GENDER = { male: "en-US-GuyNeural", female: "en-US-JennyNeural" };
const SCENE_DELIVERY = {
  daily: { style: "chat", rateDelta: 2 },
  friend: { style: "chat", rateDelta: 4 },
  business: { style: "", rateDelta: -2 },
  travel: { style: "chat", rateDelta: 2 }
};
const AGE_DELIVERY = {
  teens: { rateDelta: 4, pitchDelta: 2 },
  "20s": { rateDelta: 0, pitchDelta: 0 },
  "30s": { rateDelta: -3, pitchDelta: -2 }
};

function formatSignedPercent(value) {
  const rounded = Math.round(value);
  return `${rounded >= 0 ? "+" : ""}${rounded}%`;
}

function naturalDeliveryForProfile(profile) {
  const scene = SCENE_DELIVERY[profile?.scene] || SCENE_DELIVERY.daily;
  const age = AGE_DELIVERY[profile?.age] || AGE_DELIVERY["20s"];
  return {
    style: scene.style,
    rate: formatSignedPercent(scene.rateDelta + age.rateDelta),
    pitch: formatSignedPercent(age.pitchDelta)
  };
}

app.post("/api/model-voice", async (req, res) => {
  try {
    const contrastSet = getContrastSet(req.body?.contrastSetId || req.body?.referenceText);
    const text = String(req.body?.referenceText || contrastSet.text || "").trim();
    if (!text) return res.status(400).json({ error: "referenceText is required" });

    // 人間が「理想通りに発音できた」と選んで保存した固定音声(public/audio-cache配下、
    // gitコミット済みで再デプロイでも消えない)があれば、ライブ生成を一切せずそれを返す。
    const cachedAudio = findCachedAudio({
      kind: "model-english",
      contrastSetId: req.body?.contrastSetId,
      emotionLevel: req.body?.emotionLevel,
      gender: req.body?.gender
    });
    if (cachedAudio) {
      console.log(`[model-voice] serving cached audio contrastSetId=${req.body?.contrastSetId} emotionLevel=${req.body?.emotionLevel} gender=${req.body?.gender}`);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("X-Accent-Mirror-Voice", "cached");
      return res.send(cachedAudio);
    }

    // 感情の込め具合(自然/豊か)が明示的に選ばれている場合、Azureの固定style+
    // 度合いより自然な自由指示ができるOpenAI経路を優先する。未設定・失敗時は
    // 既存のAzure経路にそのままフォールスルーする。
    // 成功・失敗どちらの場合もログに残す(実機フィードバック: "その時間帯のログが
    // ありません" -- 失敗時のwarnしか無く、成功時は何もログが残らないため、
    // 実際にどちらの経路を通ったのか外側から確認できなかった)。
    console.log(`[model-voice] request text="${text}" emotionLevel=${req.body?.emotionLevel || "(none)"} openaiConfigured=${Boolean(process.env.OPENAI_API_KEY)}`);
    if (process.env.OPENAI_API_KEY) {
      try {
        const instructions = buildDeliveryInstructions({
          profile: req.body,
          emotionLevel: req.body?.emotionLevel,
          language: "english"
        });
        const openAiVoice = req.body?.openAiVoice || openAiVoiceForGender(req.body?.gender);
        const speed = speedForEmotionLevel(req.body?.emotionLevel);
        const result = await synthesizeExpressiveJapaneseSpeech({ text, voice: openAiVoice, instructions, speed });
        console.log(`[model-voice] engine=openai voice=${openAiVoice} speed=${speed} succeeded`);
        res.setHeader("Content-Type", result.contentType);
        res.setHeader("X-Accent-Mirror-Voice", `openai:${result.voice}`);
        res.setHeader("X-Accent-Mirror-Spoken-Text", encodeURIComponent(result.spokenText));
        res.setHeader("X-Accent-Mirror-Voice-Plan", encodeURIComponent(JSON.stringify({ engine: "openai", voice: result.voice, instructions })));
        return res.send(result.audio);
      } catch (openAiError) {
        console.warn("[model-voice] OpenAI TTS failed, falling back to Azure:", String(openAiError.message || openAiError));
      }
    } else {
      console.log("[model-voice] OPENAI_API_KEY not set, using Azure");
    }

    const genderVoice = MODEL_VOICE_BY_GENDER[req.body?.gender];
    const delivery = naturalDeliveryForProfile(req.body || {});
    const voice = req.body?.voice || genderVoice || process.env.MODEL_TTS_VOICE || "en-US-JennyNeural";
    const rate = req.body?.rate || process.env.MODEL_TTS_RATE || delivery.rate;
    const pitch = req.body?.pitch || process.env.MODEL_TTS_PITCH || delivery.pitch;
    const style = req.body?.style || process.env.MODEL_TTS_STYLE || delivery.style;

    console.log(`[model-voice] engine=azure voice=${voice} rate=${rate} pitch=${pitch} style=${style || "(none)"}`);
    const result = await synthesizeEnglishModelSpeech({ text, voice, rate, pitch, style });
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("X-Accent-Mirror-Voice", result.voice);
    res.setHeader("X-Accent-Mirror-Spoken-Text", encodeURIComponent(result.spokenText));
    res.setHeader("X-Accent-Mirror-Voice-Plan", encodeURIComponent(JSON.stringify(result.ssmlPlan || {})));
    res.send(result.audio);
  } catch (e) {
    console.error("[model-voice] request failed entirely:", String(e.message || e));
    res.status(e.statusCode || 500).json({ error: "Model voice failed", detail: String(e.message || e) });
  }
});

app.post("/api/mirror-voice", async (req, res) => {
  try {
    const confidence = String(req.body?.confidence || "").toLowerCase();
    const source = req.body?.source === "meaning" ? "meaning" : "voice";
    const text = source === "meaning" ? req.body?.meaningJapanese : req.body?.voiceText;
    const voice = req.body?.voice || process.env.MIRROR_TTS_VOICE || "ja-JP-NanamiNeural";
    // 模範日本語ミラー(source: "model-japanese-mirror")は、癖の反映を行わない
    // 「正しい発音の基準」のはずが、rate/pitch固定("+0%"/"+0Hz")の平板な読み上げに
    // なっていた。実際のミラー音声(癖の反映を含む、voicePlanで計算済みのrate/pitch)
    // はそのまま使い、模範日本語ミラーの時だけ場面・性別・年代に応じた自然な
    // 話し方(naturalDeliveryForProfile)に置き換える。
    const isModelMirror = req.body?.source === "model-japanese-mirror";
    const delivery = naturalDeliveryForProfile(req.body?.profile || {});
    const rate = isModelMirror ? (process.env.MIRROR_TTS_RATE || delivery.rate) : (req.body?.rate || "-4%");
    const pitch = isModelMirror ? (process.env.MIRROR_TTS_PITCH || delivery.pitch) : (req.body?.pitch || "+0Hz");
    const pausePattern = req.body?.pausePattern || "plain";
    const style = req.body?.style || process.env.MIRROR_TTS_STYLE || delivery.style;
    // 実際のミラー音声(癖の反映)だけ、学習者の録音の表現力(expressiveness)から
    // 計算したstyledegreeをそのまま渡す。模範日本語ミラーは常に既定の度合い
    // (styledegree指定なし=1)にし、癖の反映と同じく「録音の感情の込め方」を
    // 反映するのはミラー音声側だけにする。
    const styleDegree = isModelMirror ? undefined : req.body?.styleDegree;
    const voiceScript = req.body?.voiceScript && Array.isArray(req.body.voiceScript.segments)
      ? req.body.voiceScript
      : null;

    // 模範日本語ミラーのみ、人間が選んで保存した固定音声(public/audio-cache配下)が
    // あればそれを返す。実際のミラー音声(癖の反映)は録音ごとに変わるためキャッシュ対象外。
    if (isModelMirror) {
      const cachedAudio = findCachedAudio({
        kind: "model-mirror",
        contrastSetId: req.body?.contrastSetId,
        emotionLevel: req.body?.emotionLevel,
        gender: req.body?.profile?.gender
      });
      if (cachedAudio) {
        console.log(`[mirror-voice] serving cached audio contrastSetId=${req.body?.contrastSetId} emotionLevel=${req.body?.emotionLevel} gender=${req.body?.profile?.gender}`);
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("X-Accent-Mirror-Voice", "cached");
        res.setHeader("X-Accent-Mirror-Confidence", confidence || "unknown");
        return res.send(cachedAudio);
      }
    }

    // 実際のミラー音声(癖の反映)は常に、模範日本語ミラーは明示的な感情の込め具合
    // (emotionLevel: 自然/豊か)が選ばれている時だけ、OpenAIのinstructions式TTSを
    // 先に試す(Azureの固定スタイル+度合いより人間らしい抑揚が期待できるため)。
    // 模範日本語ミラーはModel Englishに対するミラーとして同じ度合いを再現したい
    // という要望のため、emotionLevel未指定時は従来通りAzureの自然な話し方のまま。
    // 未設定・失敗時は既存のAzure経路にフォールスルーし、この機能自体が壊れて
    // 聞けなくなることがないようにする。
    console.log(`[mirror-voice] request source=${req.body?.source || "voice"} emotionLevel=${req.body?.emotionLevel || "(none)"} openaiConfigured=${Boolean(process.env.OPENAI_API_KEY)}`);
    if ((!isModelMirror || req.body?.emotionLevel) && process.env.OPENAI_API_KEY) {
      try {
        const instructions = buildDeliveryInstructions({
          profile: req.body?.profile,
          expressivenessLevel: req.body?.expressivenessLevel,
          emotionLevel: req.body?.emotionLevel
        });
        const openAiVoice = req.body?.openAiVoice || openAiVoiceForGender(req.body?.profile?.gender);
        const speed = speedForEmotionLevel(req.body?.emotionLevel);
        const result = await synthesizeExpressiveJapaneseSpeech({ text, voice: openAiVoice, instructions, speed });
        console.log(`[mirror-voice] engine=openai voice=${openAiVoice} speed=${speed} succeeded`);
        res.setHeader("Content-Type", result.contentType);
        res.setHeader("X-Accent-Mirror-Voice", `openai:${result.voice}`);
        res.setHeader("X-Accent-Mirror-Spoken-Text", encodeURIComponent(result.spokenText));
        res.setHeader("X-Accent-Mirror-Confidence", confidence || "unknown");
        res.setHeader("X-Accent-Mirror-Voice-Plan", encodeURIComponent(JSON.stringify({ engine: "openai", voice: result.voice, instructions })));
        return res.send(result.audio);
      } catch (openAiError) {
        console.warn("[mirror-voice] OpenAI TTS failed, falling back to Azure:", String(openAiError.message || openAiError));
      }
    } else if (!process.env.OPENAI_API_KEY) {
      console.log("[mirror-voice] OPENAI_API_KEY not set, using Azure");
    }

    console.log(`[mirror-voice] engine=azure voice=${voice} rate=${rate} pitch=${pitch} style=${style || "(none)"}`);
    const result = await synthesizeJapaneseSpeech({ text, voice, rate, pitch, pausePattern, style, styleDegree, voiceScript });
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("X-Accent-Mirror-Voice", result.voice);
    res.setHeader("X-Accent-Mirror-Spoken-Text", encodeURIComponent(result.spokenText));
    res.setHeader("X-Accent-Mirror-Confidence", confidence || "unknown");
    res.setHeader("X-Accent-Mirror-Voice-Plan", encodeURIComponent(JSON.stringify(result.ssmlPlan || {})));
    res.send(result.audio);
  } catch (e) {
    console.error("[mirror-voice] request failed entirely:", String(e.message || e));
    res.status(e.statusCode || 500).json({ error: "Mirror voice failed", detail: String(e.message || e) });
  }
});
app.post("/api/mirror-pitch-contour", async (req, res) => {
  try {
    const voiceScript = req.body?.voiceScript;
    if (!voiceScript || !Array.isArray(voiceScript.segments) || !voiceScript.segments.length) {
      return res.status(400).json({ error: "voiceScript with segments is required" });
    }

    const voice = req.body?.voice || process.env.MIRROR_TTS_VOICE || "ja-JP-NanamiNeural";
    const neutralVoiceScript = buildNeutralVoiceScriptFromSegments(voiceScript);

    const [neutral, mirror] = await Promise.all([
      synthesizeJapaneseSpeechWithSegmentTimings({ voiceScript: neutralVoiceScript, voice }),
      synthesizeJapaneseSpeechWithSegmentTimings({ voiceScript, voice })
    ]);

    const intonationFeatures = buildDeviationTimelineFromSpans({
      modelWavBuffer: neutral.audio,
      modelSpans: neutral.spans,
      userWavBuffer: mirror.audio,
      userSpans: mirror.spans
    });

    res.json({
      intonationFeatures,
      analysis: buildJapaneseMirrorPitchAnalysis(intonationFeatures)
    });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: "Mirror pitch contour failed", detail: String(e.message || e) });
  }
});

app.listen(PORT, () => console.log(`Accent Mirror v0.12.0 Timeline Voice Script: http://localhost:${PORT}`));
