const assert = require("node:assert/strict");
const { generateJapaneseMirror } = require("../src/services/mirrorGeneratorService");
const { buildSsml } = require("../src/services/azureTtsService");

function word(original, normalized, score, offsetMs, durationMs, phones = []) {
  return {
    original,
    word: normalized,
    score,
    errorType: "None",
    isCritical: ["could", "help"].includes(normalized),
    consonantMin: Math.min(...phones.map((phone) => phone.score || 100), 100),
    offset100ns: offsetMs * 10000,
    duration100ns: durationMs * 10000,
    phones: phones.map((phone, index) => ({
      ...phone,
      offset100ns: offsetMs * 10000 + index * 700000
    }))
  };
}

const result = generateJapaneseMirror({
  contrastSet: { text: "Could you help me?", critical: ["could", "help"] },
  scores: { accuracy: 86, fluency: 62, completeness: 100, prosody: 70 },
  consonantAvg: 80,
  consonantMin: 68,
  muffled: false,
  couldBlindSpot: false,
  recordingDurationMs: 2300,
  intonationFeatures: { available: true, earlyHz: 150, finalHz: 143, riseSemitones: -0.8 },
  wordDiagnostics: [
    word("Could", "could", 94, 0, 310, [
      { phone: "k", score: 95, duration100ns: 600000 },
      { phone: "u", score: 92, duration100ns: 800000 },
      { phone: "d", score: 73, duration100ns: 1200000 }
    ]),
    word("you", "you", 98, 540, 220, [
      { phone: "j", score: 97, duration100ns: 500000 },
      { phone: "u", score: 98, duration100ns: 1000000 }
    ]),
    word("help", "help", 76, 900, 320, [
      { phone: "h", score: 90, duration100ns: 500000 },
      { phone: "e", score: 80, duration100ns: 900000 },
      { phone: "l", score: 58, duration100ns: 700000 },
      { phone: "p", score: 66, duration100ns: 600000 }
    ]),
    word("me", "me", 96, 1300, 220, [
      { phone: "m", score: 97, duration100ns: 600000 },
      { phone: "i", score: 98, duration100ns: 1000000 }
    ])
  ]
});

assert.equal(result.mirrorTimeline.version, "0.2");
assert.equal(result.voiceScript.version, "timeline-voice-0.1");
assert.match(result.phoneticText, /クドゥ/);
assert.ok(result.phoneticText.includes("\u30d8\u30d7"));
assert.ok(result.voiceScript.segments.some((segment) => Number(segment.breakAfterMs) >= 170));

assert.ok(result.voiceScript.segments.every((segment) => String(segment.rate || "").endsWith("%")));

const ssml = buildSsml({
  text: result.voiceText,
  voice: "ja-JP-NanamiNeural",
  rate: result.voicePlan.rate,
  pitch: result.voicePlan.pitch,
  pausePattern: result.voicePlan.pausePattern,
  voiceScript: result.voiceScript
});

assert.match(ssml, /<break time="\d+ms"\/>/);
assert.match(ssml, /<prosody rate="[+-]?\d+%"/);

console.log(JSON.stringify({
  ok: true,
  phoneticText: result.phoneticText,
  voiceScript: result.voiceScript,
  ssml
}, null, 2));
