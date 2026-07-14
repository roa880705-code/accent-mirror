const { assertAzureConfig } = require("./azurePronunciationService");

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

function renderVoiceScript(voiceScript, fallbackRate, fallbackPitch) {
  const segments = Array.isArray(voiceScript?.segments) ? voiceScript.segments : [];
  return segments.map((segment) => {
    const segmentRate = segment.rate || fallbackRate;
    const segmentPitch = segment.pitch || fallbackPitch;
    const segmentVolume = segment.volume || "default";
    const breakAfterMs = Math.max(0, Math.min(900, Math.round(Number(segment.breakAfterMs || 0))));
    return [
      renderSegmentText(segment.text || "", segmentRate, segmentPitch, segmentVolume),
      breakAfterMs ? `<break time="${breakAfterMs}ms"/>` : ""
    ].join("");
  }).join("");
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

  return {
    audio: Buffer.from(await response.arrayBuffer()),
    contentType: outputFormat.startsWith("riff") ? "audio/wav" : "audio/mpeg",
    voice,
    spokenText,
    ssmlPlan: { rate, pitch, pausePattern, style: style || "none", voiceScript: voiceScript?.version || "none", language }
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

module.exports = { synthesizeJapaneseSpeech, synthesizeEnglishModelSpeech, synthesizeEnglishModelSpeechWav, buildSsml };
