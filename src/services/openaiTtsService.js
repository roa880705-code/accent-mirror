// Azureのmstts:express-as(固定スタイル+度合いの数値)は、事前に用意されたプリセットの
// 強弱調整でしかなく、学習者ごとの「感情の込め方の程度」を人間らしく反映するには
// 表現力の天井が低い(実機フィードバック: "感情を込めた音声を生成することはやはり
// 難しい？"、"30代男性で試したが、他のプロフィールでも再現できないと思う")。
// OpenAIのgpt-4o-mini-tts系の音声合成は、固定スタイルを選ぶのではなく自由な文章で
// 話し方を指示できる(instructions)ため、性別・年代・場面・表現力の度合いを
// 自然文の演技指示に変換して渡せば、より人間らしい抑揚に近づけられる可能性が高い。
// ミラー音声(癖の反映)専用の追加経路とし、未設定・失敗時は呼び出し側で既存の
// Azure経路にフォールバックできるよう、エラーはそのままthrowする。

const AGE_DESCRIPTOR = {
  teens: "a Japanese teenager",
  "20s": "a Japanese person in their twenties",
  "30s": "a Japanese person in their thirties or older"
};

const SCENE_DESCRIPTOR = {
  daily: "a relaxed, everyday conversational tone",
  friend: "a warm, casual tone, like talking with a close friend",
  business: "a polite, measured, professional tone appropriate for a business setting",
  travel: "a friendly, approachable tone, like chatting while traveling"
};

const EXPRESSIVENESS_DESCRIPTOR = {
  flat: "Keep the delivery fairly calm and understated, with subtle, restrained intonation -- not monotone, but reserved.",
  natural: "Use natural, everyday emotional inflection -- not flat, not exaggerated, just how a real person casually talks.",
  expressive: "Make the delivery noticeably animated and emotionally expressive -- let the pitch and energy genuinely rise and fall, like someone speaking with real enthusiasm.",
  unknown: "Use natural, everyday emotional inflection, like a real person casually talking."
};

// 性別ごとの既定ボイス。OpenAIの音声は言語非依存の名前(alloy/onyx/nova等)で、
// 日本語専用ボイスの区別はないため、比較的男性寄り/女性寄りとされる既定値を選び、
// 環境変数で上書きできるようにしておく(実際にどちらが自然に聞こえるかは、
// このサンドボックスではAPIキーがなく確認できないため、要実機確認)。
function openAiVoiceForGender(gender) {
  if (gender === "male") return process.env.OPENAI_TTS_VOICE_MALE || "onyx";
  return process.env.OPENAI_TTS_VOICE_FEMALE || "nova";
}

function buildDeliveryInstructions({ profile, expressivenessLevel } = {}) {
  const genderDescriptor = profile?.gender === "male" ? "a Japanese man" : "a Japanese woman";
  const ageDescriptor = AGE_DESCRIPTOR[profile?.age] || "a Japanese adult";
  const sceneDescriptor = SCENE_DESCRIPTOR[profile?.scene] || "a natural conversational tone";
  const expressivenessDescriptor = EXPRESSIVENESS_DESCRIPTOR[expressivenessLevel] || EXPRESSIVENESS_DESCRIPTOR.unknown;

  return [
    `Speak this Japanese text naturally, the way ${genderDescriptor} (${ageDescriptor}) would actually speak it out loud, using ${sceneDescriptor}.`,
    expressivenessDescriptor,
    "Do not sound like a textbook reading, an announcement, or a formal recitation -- sound like a real, natural spoken conversation.",
    "Follow the pronunciation exactly as written (including any deliberately non-standard or simplified spellings), but apply natural human intonation, rhythm, and emotion on top of it."
  ].join(" ");
}

async function synthesizeExpressiveJapaneseSpeech({ text, voice, instructions, model }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is not configured");
    error.statusCode = 501;
    throw error;
  }

  const spokenText = String(text || "").trim();
  if (!spokenText) {
    const error = new Error("text is required");
    error.statusCode = 400;
    throw error;
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model || process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      voice: voice || "alloy",
      input: spokenText,
      instructions,
      response_format: "mp3"
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`OpenAI TTS error: ${response.status} ${detail}`);
    error.statusCode = response.status;
    throw error;
  }

  return {
    audio: Buffer.from(await response.arrayBuffer()),
    contentType: "audio/mpeg",
    voice: voice || "alloy",
    instructions,
    spokenText
  };
}

module.exports = { synthesizeExpressiveJapaneseSpeech, openAiVoiceForGender, buildDeliveryInstructions };
