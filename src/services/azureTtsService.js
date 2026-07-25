const speechSdk = require("microsoft-cognitiveservices-speech-sdk");
const { assertAzureConfig } = require("./azurePronunciationService");
const { splitIntoMorae } = require("./japaneseMoraTransform");

const JA_COMMA_PERIOD = "\u3001\u3002";
const JA_QUESTION_EXCLAMATION = "\uff01\uff1f";
const QUESTION_MARK = "\uff1f";
const ELLIPSIS_PAUSE = "\u2026\u2026";
const JA_COMMA = "\u3001";

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function splitFinalPhrase(text, tailLength = 3) {
  const value = String(text || "").trim();
  const punctuationChars = `${JA_COMMA_PERIOD}${JA_QUESTION_EXCLAMATION}?!.`;
  const escaped = punctuationChars.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = value.match(new RegExp(`^(.*?)([^${escaped}]{1,${tailLength}})([${escaped}]*)$`, "u"));
  if (!match) return { head: value, tail: "", punctuation: "" };
  return { head: match[1], tail: match[2], punctuation: match[3] };
}

function exaggerateFinalRiseTail(tail, punctuation) {
  const cleanTail = String(tail || "");
  const mark = punctuation || QUESTION_MARK;
  return `${cleanTail}${mark}`;
}

function flattenFinalFallTail(tail, punctuation) {
  const cleanTail = String(tail || "");
  const mark = punctuation && punctuation !== QUESTION_MARK ? punctuation : "\u3002";
  return `${cleanTail}${mark}`;
}

function prosodyChunk(text, rate, pitch, volume = "default") {
  const value = String(text || "");
  if (!value) return "";
  return `<prosody rate="${escapeXml(rate)}" pitch="${escapeXml(pitch)}" volume="${escapeXml(volume)}">${escapeXml(value)}</prosody>`;
}

function pitchHzValue(pitch) {
  const match = String(pitch || "").match(/([+-]?\d+(?:\.\d+)?)Hz/i);
  return match ? Number(match[1]) : 0;
}

function renderSegmentText(text, rate, pitch, volume = "default") {
  const value = String(text || "");
  return renderNaturalPauses(value, rate, pitch, volume);
}

function renderNaturalPauses(text, rate, pitch, volume = "default") {
  const parts = String(text || "").split(/(\u2026\u2026|\u3001)/u);
  return parts.map((part) => {
    if (part === ELLIPSIS_PAUSE) return `<break time="360ms"/>`;
    if (part === JA_COMMA) return `<break time="170ms"/>`;
    return prosodyChunk(part, rate, pitch, volume);
  }).join("");
}

// segment.pitchCurve があれば、モーラごとに違うピッチを持つ複数の<prosody>に分けて
// レンダリングする(1セグメント=1ピッチ値では、文中の細かい上げ下げの形が
// フレーズ区切りの数まで潰れてしまうため)。無ければ従来通り1つの<prosody>。
function segmentPieces(segment, fallbackPitch) {
  if (Array.isArray(segment.pitchCurve) && segment.pitchCurve.length) {
    return segment.pitchCurve.map((piece) => ({ text: piece.text, pitch: piece.pitch || segment.pitch || fallbackPitch }));
  }
  return [{ text: segment.text || "", pitch: segment.pitch || fallbackPitch }];
}

function renderSegmentBody(segment, segmentRate, segmentPitch, segmentVolume) {
  if (Array.isArray(segment.pitchCurve) && segment.pitchCurve.length) {
    return segment.pitchCurve.map((piece) => prosodyChunk(piece.text, segmentRate, piece.pitch || segmentPitch, segmentVolume)).join("");
  }
  return renderSegmentText(segment.text || "", segmentRate, segmentPitch, segmentVolume);
}

function renderVoiceScript(voiceScript, fallbackRate, fallbackPitch) {
  const segments = Array.isArray(voiceScript?.segments) ? voiceScript.segments : [];
  return segments.map((segment) => {
    const segmentRate = segment.rate || fallbackRate;
    const segmentPitch = segment.pitch || fallbackPitch;
    const segmentVolume = segment.volume || "default";
    const breakAfterMs = Math.max(0, Math.min(900, Math.round(Number(segment.breakAfterMs || 0))));
    return [
      renderSegmentBody(segment, segmentRate, segmentPitch, segmentVolume),
      breakAfterMs ? `<break time="${breakAfterMs}ms"/>` : ""
    ].join("");
  }).join("");
}

// 日本語ミラーのピッチ比較用: 各"欠片"(pitchCurveがあればモーラ単位、無ければ
// セグメント単位)の開始位置に <bookmark> を挿入し、合成音声中での実際の境界(ms)を
// bookmarkReached イベントから取得できるようにする。以前はセグメント単位(例: 2区切り)
// でしかタイミングを取れず、セグメント内のモーラごとの音程の動き(zigzagなど)を
// 比較分析側では検知できなかった(実機フィードバック: "音程の上下の反映が課題"。
// ミラー音声のSSML自体はモーラ単位でピッチを変えても、比較分析はセグメント単位の
// 大まかな3点サンプリングしかしていなかったため、実際の変化を拾えていなかった)。
// bookmark をモーラ単位まで細かくすることで、比較分析(buildDeviationTimelineFromSpans)
// も同じ解像度で実際の音声を測れるようにする。通常再生用の renderVoiceScript とは
// 別に用意し、既存の再生パスには影響を与えない。
function renderVoiceScriptWithBookmarks(voiceScript, fallbackRate, fallbackPitch) {
  const segments = Array.isArray(voiceScript?.segments) ? voiceScript.segments : [];
  const marks = [];
  let bookmarkIndex = 0;
  const body = segments.map((segment, segmentIndex) => {
    const segmentRate = segment.rate || fallbackRate;
    const segmentVolume = segment.volume || "default";
    const breakAfterMs = Math.max(0, Math.min(900, Math.round(Number(segment.breakAfterMs || 0))));
    const pieces = segmentPieces(segment, fallbackPitch);
    const rendered = pieces.map((piece) => {
      const mark = `b${bookmarkIndex}`;
      marks.push({ mark, text: piece.text, role: segment.role || "", segmentIndex });
      bookmarkIndex += 1;
      return [`<bookmark mark="${mark}"/>`, prosodyChunk(piece.text, segmentRate, piece.pitch, segmentVolume)].join("");
    }).join("");
    return [rendered, breakAfterMs ? `<break time="${breakAfterMs}ms"/>` : ""].join("");
  }).join("");
  return { body, marks };
}

function buildSsmlWithBookmarks({ voiceScript, voice, rate, pitch, style, language = "ja-JP" }) {
  const { body, marks } = renderVoiceScriptWithBookmarks(voiceScript, rate, pitch);
  const styledBody = style ? `<mstts:express-as style="${escapeXml(style)}">${body}</mstts:express-as>` : body;
  const ssml = [
    `<speak version="1.0" xml:lang="${escapeXml(language)}" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts">`,
    `<voice name="${escapeXml(voice)}">`,
    styledBody,
    `</voice>`,
    `</speak>`
  ].join("");
  return { ssml, marks };
}

function buildProsodyBody({ text, rate, pitch, pausePattern, voiceScript }) {
  if (Array.isArray(voiceScript?.segments) && voiceScript.segments.length) {
    return renderVoiceScript(voiceScript, rate, pitch);
  }

  if (pausePattern === "final-rise") {
    const { head, tail, punctuation } = splitFinalPhrase(text, 3);
    const finalTail = exaggerateFinalRiseTail(tail, punctuation);
    return [
      renderNaturalPauses(head, rate, "+0Hz"),
      `<break time="35ms"/>`,
      renderNaturalPauses(finalTail, rate, "+14Hz")
    ].join("");
  }

  if (pausePattern === "final-fall") {
    const { head, tail, punctuation } = splitFinalPhrase(text, 3);
    const finalTail = flattenFinalFallTail(tail, punctuation);
    return [
      renderNaturalPauses(head, rate, "+0Hz"),
      `<break time="25ms"/>`,
      renderNaturalPauses(finalTail, rate, "-12Hz")
    ].join("");
  }

  if (pausePattern === "flat") return renderNaturalPauses(text, rate, "+0Hz");
  if (pausePattern === "hesitation") return `<break time="220ms"/>${renderNaturalPauses(text, rate, pitch)}`;
  return renderNaturalPauses(text, rate, pitch);
}

function buildSsml({ text, voice, rate, pitch, pausePattern, style, voiceScript, language = "ja-JP" }) {
  const body = buildProsodyBody({ text, rate, pitch, pausePattern, voiceScript });
  const styledBody = style ? `<mstts:express-as style="${escapeXml(style)}">${body}</mstts:express-as>` : body;
  return [
    `<speak version="1.0" xml:lang="${escapeXml(language)}" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts">`,
    `<voice name="${escapeXml(voice)}">`,
    styledBody,
    `</voice>`,
    `</speak>`
  ].join("");
}

async function synthesizeJapaneseSpeech({
  text,
  voice = process.env.MIRROR_TTS_VOICE || "ja-JP-NanamiNeural",
  rate = "-4%",
  pitch = "+0Hz",
  pausePattern = "plain",
  style = process.env.MIRROR_TTS_STYLE || "",
  voiceScript = null
}) {
  return synthesizeSpeech({
    text,
    voice,
    rate,
    pitch,
    pausePattern,
    style,
    voiceScript,
    language: "ja-JP"
  });
}

async function requestSpeechAudio(ssml, { key, region, outputFormat }) {
  const response = await fetch(`https://${encodeURIComponent(region)}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": outputFormat,
      "User-Agent": "AccentMirror"
    },
    body: ssml
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Azure TTS error: ${response.status} ${detail}`);
    error.statusCode = response.status;
    throw error;
  }

  return Buffer.from(await response.arrayBuffer());
}

async function synthesizeSpeech({
  text,
  voice,
  rate = "-4%",
  pitch = "+0Hz",
  pausePattern = "plain",
  style = "",
  voiceScript = null,
  language = "ja-JP",
  outputFormat = "audio-24khz-48kbitrate-mono-mp3"
}) {
  const { key, region } = assertAzureConfig();
  const scriptText = voiceScript?.segments?.map((segment) => segment.text).join("") || "";
  const spokenText = String(text || scriptText || "").trim();

  if (!spokenText) {
    const error = new Error("text is required");
    error.statusCode = 400;
    throw error;
  }

  const ssml = buildSsml({ text: spokenText, voice, rate, pitch, pausePattern, style, voiceScript, language });
  let audio;
  let appliedStyle = style;
  try {
    audio = await requestSpeechAudio(ssml, { key, region, outputFormat });
  } catch (error) {
    // mstts:express-as の style は話者(voice)によって対応不可の場合Azure側が
    // エラーを返す。どの話者がどのstyleに対応しているかをここでは確証できない
    // ため(実機での検証ができない)、style指定が原因の失敗ならstyleなしで
    // 1度だけ再試行し、話し方の自然さ改善が丸ごと壊れないようにする。
    if (!style || error.statusCode >= 500) throw error;
    const fallbackSsml = buildSsml({ text: spokenText, voice, rate, pitch, pausePattern, style: "", voiceScript, language });
    audio = await requestSpeechAudio(fallbackSsml, { key, region, outputFormat });
    appliedStyle = "";
  }

  return {
    audio,
    contentType: outputFormat.startsWith("riff") ? "audio/wav" : "audio/mpeg",
    voice,
    spokenText,
    ssmlPlan: { rate, pitch, pausePattern, style: appliedStyle || "none", voiceScript: voiceScript?.version || "none", language }
  };
}

async function synthesizeEnglishModelSpeech({
  text,
  voice = process.env.MODEL_TTS_VOICE || "en-US-JennyNeural",
  rate = process.env.MODEL_TTS_RATE || "+0%",
  pitch = process.env.MODEL_TTS_PITCH || "+0Hz",
  style = process.env.MODEL_TTS_STYLE || ""
}) {
  return synthesizeSpeech({
    text,
    voice,
    rate,
    pitch,
    pausePattern: "plain",
    style,
    language: "en-US"
  });
}

// ピッチ判定のモデル基準化用: Azure Pronunciation Assessment / audioPitchService は
// WAV(16bit PCM)を前提とするため、再生用のmp3とは別にWAV出力の合成を提供する。
async function synthesizeEnglishModelSpeechWav({
  text,
  voice = process.env.MODEL_TTS_VOICE || "en-US-JennyNeural",
  rate = process.env.MODEL_TTS_RATE || "+0%",
  pitch = process.env.MODEL_TTS_PITCH || "+0Hz",
  style = process.env.MODEL_TTS_STYLE || ""
}) {
  return synthesizeSpeech({
    text,
    voice,
    rate,
    pitch,
    pausePattern: "plain",
    style,
    language: "en-US",
    outputFormat: "riff-24khz-16bit-mono-pcm"
  });
}

// REST合成にはタイミング情報がないため、Speech SDK の SpeechSynthesizer + <bookmark> を使い、
// bookmarkReached イベントからセグメント境界(ms)を取得する。日本語ミラーのピッチ比較専用。
function synthesizeSpeechWithBookmarks({ ssml }) {
  const { key, region } = assertAzureConfig();

  return new Promise((resolve, reject) => {
    let synthesizer;
    try {
      const speechConfig = speechSdk.SpeechConfig.fromSubscription(key, region);
      speechConfig.speechSynthesisOutputFormat = speechSdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm;
      synthesizer = new speechSdk.SpeechSynthesizer(speechConfig, null);
      const bookmarks = [];

      synthesizer.bookmarkReached = (_sender, event) => {
        bookmarks.push({ mark: event.text, offsetMs: Number(event.audioOffset || 0) / 10000 });
      };

      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          synthesizer.close();
          if (result.reason === speechSdk.ResultReason.SynthesizingAudioCompleted) {
            resolve({
              audio: Buffer.from(result.audioData),
              bookmarks,
              durationMs: Number(result.audioDuration || 0) / 10000
            });
            return;
          }
          reject(new Error(`Azure TTS synthesis failed: ${result.reason} ${result.errorDetails || ""}`.trim()));
        },
        (error) => {
          synthesizer.close();
          reject(new Error(String(error)));
        }
      );
    } catch (error) {
      if (synthesizer) synthesizer.close();
      reject(error);
    }
  });
}

// 模範日本語ミラー vs ミラー音声のピッチ比較用: 同じセグメント構成のvoiceScriptから、
// セグメントごとの実際の開始/終了時刻(ms)付きでWAVを合成する。
async function synthesizeJapaneseSpeechWithSegmentTimings({
  voiceScript,
  voice = process.env.MIRROR_TTS_VOICE || "ja-JP-NanamiNeural",
  style = process.env.MIRROR_TTS_STYLE || ""
}) {
  const segments = Array.isArray(voiceScript?.segments) ? voiceScript.segments : [];
  if (!segments.length) {
    const error = new Error("voiceScript.segments is required");
    error.statusCode = 400;
    throw error;
  }

  const { ssml, marks } = buildSsmlWithBookmarks({ voiceScript, voice, rate: "-4%", pitch: "+0Hz", style, language: "ja-JP" });
  const { audio, bookmarks, durationMs } = await synthesizeSpeechWithBookmarks({ ssml });

  // marks は pitchCurve があればモーラ単位、無ければセグメント単位の欠片ごとに
  // 1つずつ発行されている。bookmarkReached で実際に得られた時刻をそのまま
  // 各欠片の区間(次の欠片の開始まで)として使うことで、セグメント単位より
  // 細かい解像度でピッチ比較(buildDeviationTimelineFromSpans)ができる。
  const spans = marks.map((mark, index) => {
    const startMs = bookmarks.find((bookmark) => bookmark.mark === mark.mark)?.offsetMs ?? 0;
    const nextOffsetMs = bookmarks.find((bookmark) => bookmark.mark === marks[index + 1]?.mark)?.offsetMs;
    const endMs = Number.isFinite(nextOffsetMs) ? nextOffsetMs : durationMs;
    return {
      word: mark.text,
      role: mark.role,
      startMs,
      durationMs: Math.max(1, endMs - startMs),
      endMs: Math.max(startMs + 1, endMs)
    };
  });

  return { audio, spans, durationMs };
}

module.exports = {
  synthesizeJapaneseSpeech,
  synthesizeEnglishModelSpeech,
  synthesizeEnglishModelSpeechWav,
  synthesizeJapaneseSpeechWithSegmentTimings,
  buildSsml
};
