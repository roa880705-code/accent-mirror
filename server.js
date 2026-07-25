require("dotenv").config();
const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const { contrastSets, getContrastSet, STORY_STAGES } = require("./src/config/contrastSets");
const { analyzeAzureRaw } = require("./src/services/contrastAnalysisService");
const { assessPronunciationFromWav, recognizeEnglishFromWav, assertAzureConfig } = require("./src/services/azurePronunciationService");
const { compareAttempts } = require("./src/services/contrastSessionService");
const { synthesizeJapaneseSpeech, synthesizeEnglishModelSpeech, synthesizeEnglishModelSpeechWav, synthesizeJapaneseSpeechWithSegmentTimings } = require("./src/services/azureTtsService");
const { analyzePitchFromWav } = require("./src/services/audioPitchService");
const { buildDeviationTimeline, buildDeviationTimelineFromSpans } = require("./src/services/pitchAlignmentService");
const { buildNeutralVoiceScriptFromSegments, buildJapaneseMirrorPitchAnalysis } = require("./src/services/mirrorGeneratorService");
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

    const analysis = analyzeAzureRaw(azureResult.raw, { ...contrastSet, text: referenceText }, {
      recordingDurationMs,
      rhythmHints,
      intonationFeatures,
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

app.post("/api/model-voice", async (req, res) => {
  try {
    const contrastSet = getContrastSet(req.body?.contrastSetId || req.body?.referenceText);
    const text = String(req.body?.referenceText || contrastSet.text || "").trim();
    const voice = req.body?.voice || process.env.MODEL_TTS_VOICE || "en-US-JennyNeural";
    const rate = req.body?.rate || process.env.MODEL_TTS_RATE || "+0%";
    const pitch = req.body?.pitch || process.env.MODEL_TTS_PITCH || "+0Hz";
    const style = req.body?.style || process.env.MODEL_TTS_STYLE || "";

    if (!text) return res.status(400).json({ error: "referenceText is required" });

    const result = await synthesizeEnglishModelSpeech({ text, voice, rate, pitch, style });
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("X-Accent-Mirror-Voice", result.voice);
    res.setHeader("X-Accent-Mirror-Spoken-Text", encodeURIComponent(result.spokenText));
    res.setHeader("X-Accent-Mirror-Voice-Plan", encodeURIComponent(JSON.stringify(result.ssmlPlan || {})));
    res.send(result.audio);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: "Model voice failed", detail: String(e.message || e) });
  }
});

app.post("/api/mirror-voice", async (req, res) => {
  try {
    const confidence = String(req.body?.confidence || "").toLowerCase();
    const source = req.body?.source === "meaning" ? "meaning" : "voice";
    const text = source === "meaning" ? req.body?.meaningJapanese : req.body?.voiceText;
    const voice = req.body?.voice || process.env.MIRROR_TTS_VOICE || "ja-JP-NanamiNeural";
    const rate = req.body?.rate || "-4%";
    const pitch = req.body?.pitch || "+0Hz";
    const pausePattern = req.body?.pausePattern || "plain";
    const style = req.body?.style || process.env.MIRROR_TTS_STYLE || "";
    const voiceScript = req.body?.voiceScript && Array.isArray(req.body.voiceScript.segments)
      ? req.body.voiceScript
      : null;

    const result = await synthesizeJapaneseSpeech({ text, voice, rate, pitch, pausePattern, style, voiceScript });
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("X-Accent-Mirror-Voice", result.voice);
    res.setHeader("X-Accent-Mirror-Spoken-Text", encodeURIComponent(result.spokenText));
    res.setHeader("X-Accent-Mirror-Confidence", confidence || "unknown");
    res.setHeader("X-Accent-Mirror-Voice-Plan", encodeURIComponent(JSON.stringify(result.ssmlPlan || {})));
    res.send(result.audio);
  } catch (e) {
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
