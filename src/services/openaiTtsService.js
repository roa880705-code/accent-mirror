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

// 録音から自動検出した表現力(3段階)。実際のミラー音声(癖の反映)専用。
const EXPRESSIVENESS_DESCRIPTOR = {
  flat: "Keep the delivery fairly calm and understated, with subtle, restrained intonation -- not monotone, but reserved.",
  natural: "Use natural, everyday emotional inflection -- not flat, not exaggerated, just how a real person casually talks.",
  expressive: "Make the delivery noticeably animated and emotionally expressive -- let the pitch and energy genuinely rise and fall, like someone speaking with real enthusiasm.",
  unknown: "Use natural, everyday emotional inflection, like a real person casually talking."
};

// 学習者が明示的に選ぶ4段階(無/弱/中/強)。Model English・模範日本語ミラー専用
// (実機フィードバック: "無(ただの読み上げ)/弱(普通の会話)/中(明るい会話)/
// 強(映画、舞台、ハイテンション)に分けて、モデル音声の再生時に選択できるように")。
const EMOTION_LEVEL_DESCRIPTOR = {
  none: "Read this in a completely flat, neutral, textbook-style voice, like a formal announcement or a dictionary pronunciation guide -- no emotional inflection, no personality, just a plain, neutral reading.",
  weak: "Read this the way an ordinary person would in a normal, calm, everyday conversation -- natural and relaxed, understated. Not flat, but not lively either -- just an average, low-key conversational tone.",
  medium: "Read this the way an ordinary person would in a bright, cheerful, engaged everyday conversation -- warm, friendly, and clearly emotionally present, with natural ups and downs in pitch and energy.",
  strong: "Read this with the full dramatic intensity of a movie or stage performance -- highly expressive, with big emotional swings in pitch, energy, and pacing, like an actor delivering a passionate, high-stakes line."
};

// 性別ごとの既定ボイス。OpenAIの音声は言語非依存の名前(alloy/onyx/nova等)で、
// 日本語専用ボイスの区別はないため、比較的男性寄り/女性寄りとされる既定値を選び、
// 環境変数で上書きできるようにしておく(実際にどちらが自然に聞こえるかは、
// このサンドボックスではAPIキーがなく確認できないため、要実機確認)。
function openAiVoiceForGender(gender) {
  if (gender === "male") return process.env.OPENAI_TTS_VOICE_MALE || "onyx";
  return process.env.OPENAI_TTS_VOICE_FEMALE || "nova";
}

// emotionLevel(明示選択の4段階)が指定されていればそちらを優先し、
// 無ければ従来通りexpressivenessLevel(録音からの自動検出3段階)を使う。
// language: "japanese"(既定, ミラー音声用)| "english"(Model English用)で、
// 文言の「どの言語のテキストを読むか」の部分だけ切り替える。
function buildDeliveryInstructions({ profile, expressivenessLevel, emotionLevel, language = "japanese" } = {}) {
  const genderDescriptor = profile?.gender === "male" ? "a Japanese man" : "a Japanese woman";
  const ageDescriptor = AGE_DESCRIPTOR[profile?.age] || "a Japanese adult";
  const sceneDescriptor = SCENE_DESCRIPTOR[profile?.scene] || "a natural conversational tone";
  const emotionDescriptor = EMOTION_LEVEL_DESCRIPTOR[emotionLevel]
    || EXPRESSIVENESS_DESCRIPTOR[expressivenessLevel]
    || EXPRESSIVENESS_DESCRIPTOR.unknown;
  const languageLabel = language === "english" ? "English" : "Japanese";
  // textbookのようなフラットな読み上げが明示的に選ばれた(emotionLevel === "none")
  // 場合は、逆に"sound natural, not like a textbook"という指示が矛盾するため、
  // その指示を差し込まない。
  const naturalnessReminder = emotionLevel === "none"
    ? []
    : ["Do not sound like a textbook reading, an announcement, or a formal recitation -- sound like a real, natural spoken conversation."];

  return [
    `Speak this ${languageLabel} text the way ${genderDescriptor} (${ageDescriptor}) would actually speak it out loud, using ${sceneDescriptor}.`,
    emotionDescriptor,
    ...naturalnessReminder,
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
