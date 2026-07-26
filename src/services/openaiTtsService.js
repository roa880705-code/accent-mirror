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

// 学習者が明示的に選ぶ4段階(無/弱/中/強)。Model English・模範日本語ミラー専用。
// 長い相対比較の文章(v1)はAIにうまく反映されなかった(実機フィードバック:
// "あなたの指示は悪くないですが、AIがうまく反映できていないようです")。
// 代わりに、短く直接的で分かりやすい合言葉的な指示(弱=普通の発話、中=ハイ
// テンション、強=超ハイテンション)に変えた。"ハイテンション"は英語に直訳
// すると"high tension"(緊張・ストレス状態)という逆の意味に取られるため、
// 意図(興奮気味・テンションが高い)が伝わる"excited / hyped-up / high-energy"
// という表現を使う。
const EMOTION_LEVEL_DESCRIPTOR = {
  none: "This is level 1 of 4 on an emotional-intensity scale. Read this in a completely flat, neutral, textbook-style voice, with no emotional inflection at all -- like a plain announcement or a dictionary pronunciation guide.",
  weak: "This is level 2 of 4 on an emotional-intensity scale. Read this in an ordinary, normal speaking voice -- just standard, everyday, natural speech, the way anyone would casually talk.",
  medium: "This is level 3 of 4 on an emotional-intensity scale. Read this in a high-energy, excited, hyped-up voice -- like someone who is genuinely enthusiastic and pumped up right now.",
  strong: "This is level 4 of 4 on an emotional-intensity scale, the maximum. Read this in an extremely high-energy, super excited, over-the-top hyped-up voice -- like someone shouting with excitement, as energetic and intense as humanly possible."
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
// instructions(自由文)だけに頼ると、モデルの指示追従のばらつきで「段階として
// 一貫して聞こえない」ことがある(実機フィードバック: "変化は起きているけど、
// 感情の込め方での段階づけにはなっていない")。文章の解釈に依存しない、確実に
// 反映される数値パラメータ(speed: OpenAI音声合成APIの再生速度、0.25〜4.0)も
// 段階に応じて変えることで、指示文だけでは安定しない部分を技術的に補強する。
const EMOTION_LEVEL_SPEED = {
  none: 0.9,
  weak: 1.0,
  medium: 1.08,
  strong: 1.2
};

function speedForEmotionLevel(emotionLevel) {
  return EMOTION_LEVEL_SPEED[emotionLevel] ?? 1.0;
}

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
  // emotionLevel(明示選択)がある時は、場面の説明("relaxed, everyday tone"など)を
  // 文頭に混ぜない。例えば強(超ハイテンション)を選んでいるのに daily 場面の
  // "relaxed" が同じ文に混在すると、指示同士が矛盾して伝わってしまう
  // (実機フィードバック: "AIがうまく反映できていないようです"の一因と思われる)。
  // 場面の雰囲気は expressivenessLevel(自動検出、場面選択と連動)側でのみ使う。
  const sceneClause = emotionLevel ? "" : `, using ${sceneDescriptor}`;

  return [
    `Speak this ${languageLabel} text the way ${genderDescriptor} (${ageDescriptor}) would actually speak it out loud${sceneClause}.`,
    emotionDescriptor,
    ...naturalnessReminder,
    "Follow the pronunciation exactly as written (including any deliberately non-standard or simplified spellings), but apply natural human intonation, rhythm, and emotion on top of it."
  ].join(" ");
}

async function synthesizeExpressiveJapaneseSpeech({ text, voice, instructions, model, speed }) {
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
      speed: Number.isFinite(Number(speed)) ? Number(speed) : 1.0,
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

module.exports = { synthesizeExpressiveJapaneseSpeech, openAiVoiceForGender, buildDeliveryInstructions, speedForEmotionLevel };
