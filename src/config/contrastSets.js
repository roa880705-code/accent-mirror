const politeRequestQuestionIntonation = {
  sentenceType: "polite_request_question",
  expectedFinalContour: "moderate_rise",
  naturalRiseRange: [1.2, 5.0],
  overRiseAbove: 5.0,
  fallingBelow: 0.3,
  flatRange: [-0.5, 1.0]
};

const neutralStatementIntonation = {
  sentenceType: "statement",
  expectedFinalContour: "neutral_or_falling",
  naturalRiseRange: [-3.0, 1.2],
  overRiseAbove: 3.8,
  fallingBelow: -5.0,
  flatRange: [-0.8, 0.8]
};

const neutralFragmentIntonation = {
  sentenceType: "fragment",
  expectedFinalContour: "neutral",
  naturalRiseRange: [-1.5, 2.5],
  overRiseAbove: 4.5,
  fallingBelow: -2.5,
  flatRange: [-0.8, 0.8]
};

const contrastSets = [
  {
    id: "could-only",
    label: "A. Could only",
    text: "Could",
    critical: ["could"],
    intonationTarget: neutralFragmentIntonation,
    focus: "Could 単体の母音と語尾 d を確認する"
  },
  {
    id: "could-you",
    label: "B. Could you",
    text: "Could you",
    critical: ["could"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "Could と you の連結・区切りを確認する"
  },
  {
    id: "could-help-me",
    label: "C. Could you help me?",
    text: "Could you help me?",
    critical: ["could", "help"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "依頼文全体で could/help と文尾上昇を確認する"
  },
  {
    id: "help-only",
    label: "D. Help only",
    text: "Help",
    critical: ["help"],
    intonationTarget: neutralFragmentIntonation,
    focus: "help 単体の h/l/p を確認する"
  },
  {
    id: "teach-me",
    label: "E. Can you teach me?",
    text: "Can you teach me?",
    critical: ["can", "teach", "me"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "Can you の連結と teach の ch を確認する"
  },
  {
    id: "pass-salt",
    label: "F. Could you pass me the salt?",
    text: "Could you pass me the salt?",
    critical: ["could", "pass", "salt"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "pass/salt の s と語尾 t、文全体の速度を確認する"
  },
  {
    id: "phone-number",
    label: "G. Can I have your phone number?",
    text: "Can I have your phone number?",
    critical: ["can", "have", "phone", "number"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "phone number の連結、v/f/n の輪郭を確認する"
  },
  {
    id: "have-pen",
    label: "H. I have a pen.",
    text: "I have a pen.",
    critical: ["have", "pen"],
    intonationTarget: neutralStatementIntonation,
    focus: "肯定文の文尾を上げすぎないか確認する"
  },
  {
    id: "see-you",
    label: "I. I will see you tomorrow.",
    text: "I will see you tomorrow.",
    critical: ["will", "see", "tomorrow"],
    intonationTarget: neutralStatementIntonation,
    focus: "will の弱化、see you の連結、肯定文のピッチを確認する"
  },
  {
    id: "work-today",
    label: "J. I have to work today.",
    text: "I have to work today.",
    critical: ["have", "work", "today"],
    intonationTarget: neutralStatementIntonation,
    focus: "have to の連結、work の r/k、文末の下がり方を確認する"
  },
  {
    id: "consider-it",
    label: "K. I will consider it.",
    text: "I will consider it.",
    critical: ["consider"],
    intonationTarget: neutralStatementIntonation,
    focus: "consider vs con cider"
  },
  {
    id: "she-is-here",
    label: "L. She is here.",
    text: "She is here.",
    critical: ["she"],
    intonationTarget: neutralStatementIntonation,
    focus: "she vs see / sea"
  },
  {
    id: "live-here",
    label: "M. I live here.",
    text: "I live here.",
    critical: ["live"],
    intonationTarget: neutralStatementIntonation,
    focus: "live vs leave"
  },
  {
    id: "leave-here",
    label: "N. I leave here.",
    text: "I leave here.",
    critical: ["leave"],
    intonationTarget: neutralStatementIntonation,
    focus: "leave vs live"
  },

  // ここから下は「ストーリーモード」用。stage(1〜10)は友達数のしきい値で解放され、
  // 日本→カナダへの留学ストーリーに沿って発話シーンが進んでいく。
  {
    id: "greet-hi",
    label: "出会いの挨拶",
    text: "Hi, nice to meet you.",
    critical: ["nice", "meet"],
    intonationTarget: neutralStatementIntonation,
    focus: "nice/meet の子音連結と語尾の下がり方を確認する",
    stage: 1
  },
  {
    id: "greet-name",
    label: "自己紹介",
    text: "My name is Sora.",
    critical: ["name"],
    intonationTarget: neutralStatementIntonation,
    focus: "name の鼻音と My の弱化を確認する",
    stage: 1
  },
  {
    id: "greet-thanks",
    label: "お礼を言う",
    text: "Thank you so much.",
    critical: ["thank"],
    intonationTarget: neutralStatementIntonation,
    focus: "th音と so much の連結を確認する",
    stage: 1
  },
  {
    id: "school-start-time",
    label: "登校中の会話",
    text: "What time does school start?",
    critical: ["school", "start"],
    intonationTarget: neutralStatementIntonation,
    focus: "school の sk 連結と start の語頭子音を確認する",
    stage: 2
  },
  {
    id: "walk-together",
    label: "一緒に登下校",
    text: "Let's walk together.",
    critical: ["walk", "together"],
    intonationTarget: neutralStatementIntonation,
    focus: "walk の l と together の th を確認する",
    stage: 2
  },
  {
    id: "borrow-pen",
    label: "文房具を借りる",
    text: "Can I borrow your pen?",
    critical: ["borrow", "pen"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "borrow の r と pen の語尾鼻音を確認する",
    stage: 2
  },
  {
    id: "order-fries",
    label: "ファストフードで注文",
    text: "Can I get a medium fries?",
    critical: ["fries"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "fries の fr 連結と語尾のz音を確認する",
    stage: 3
  },
  {
    id: "movie-time",
    label: "映画館で確認",
    text: "What time does the movie start?",
    critical: ["movie", "start"],
    intonationTarget: neutralStatementIntonation,
    focus: "movie の v と start の語頭子音を確認する",
    stage: 3
  },
  {
    id: "ask-price",
    label: "モールで買い物",
    text: "How much is this?",
    critical: ["much"],
    intonationTarget: neutralStatementIntonation,
    focus: "much の ch と how much の連結を確認する",
    stage: 3
  },
  {
    id: "homestay-bathroom",
    label: "ホームステイの朝",
    text: "Can I use the bathroom first?",
    critical: ["bathroom"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "bathroom の th と語尾 m を確認する",
    stage: 4
  },
  {
    id: "homestay-dinner",
    label: "夕食の時間",
    text: "Dinner smells great.",
    critical: ["dinner", "smells"],
    intonationTarget: neutralStatementIntonation,
    focus: "dinner の n と smells の sm 連結を確認する",
    stage: 4
  },
  {
    id: "homestay-curfew",
    label: "門限の確認",
    text: "What time should I be back?",
    critical: ["back"],
    intonationTarget: neutralStatementIntonation,
    focus: "back の語尾 k と be back の連結を確認する",
    stage: 4
  },
  {
    id: "class-repeat",
    label: "授業で聞き返す",
    text: "Could you repeat the question?",
    critical: ["repeat"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "repeat の r と語尾の t を確認する",
    stage: 5
  },
  {
    id: "class-missed",
    label: "聞き取れなかった時",
    text: "I didn't catch that.",
    critical: ["catch"],
    intonationTarget: neutralStatementIntonation,
    focus: "catch の ch と didn't の連結を確認する",
    stage: 5
  },
  {
    id: "class-deadline",
    label: "提出物の相談",
    text: "Can I turn this in tomorrow?",
    critical: ["turn"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "turn の r と in の連結を確認する",
    stage: 5
  },
  {
    id: "present-slide",
    label: "プレゼンの説明",
    text: "Let me walk you through this slide.",
    critical: ["walk", "slide"],
    intonationTarget: neutralStatementIntonation,
    focus: "walk you through の連結と slide の s を確認する",
    stage: 6
  },
  {
    id: "present-conclusion",
    label: "プレゼンの結び",
    text: "In conclusion, this project was a success.",
    critical: ["conclusion"],
    intonationTarget: neutralStatementIntonation,
    focus: "conclusion の sh音と語尾を確認する",
    stage: 6
  },
  {
    id: "present-questions",
    label: "質疑応答の呼びかけ",
    text: "Any questions so far?",
    critical: ["questions"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "questions の qu と語尾 s を確認する",
    stage: 6
  },
  {
    id: "discuss-disagree",
    label: "意見の相違を伝える",
    text: "I see your point, but I disagree.",
    critical: ["disagree"],
    intonationTarget: neutralStatementIntonation,
    focus: "disagree の s と強勢位置を確認する",
    stage: 7
  },
  {
    id: "discuss-clarify",
    label: "確認を求める",
    text: "Could you clarify that?",
    critical: ["clarify"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "clarify の cl 連結と r を確認する",
    stage: 7
  },
  {
    id: "discuss-addpoint",
    label: "意見を付け加える",
    text: "I'd like to add something.",
    critical: ["something"],
    intonationTarget: neutralStatementIntonation,
    focus: "something の th と語尾 ng を確認する",
    stage: 7
  },
  {
    id: "intern-deadline",
    label: "締め切りの報告",
    text: "I'll have the draft ready by Friday.",
    critical: ["draft", "ready"],
    intonationTarget: neutralStatementIntonation,
    focus: "draft の dr 連結と ready の r を確認する",
    stage: 8
  },
  {
    id: "intern-review",
    label: "レビュー依頼",
    text: "Could you review this before the meeting?",
    critical: ["review"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "review の v と語頭の強勢を確認する",
    stage: 8
  },
  {
    id: "intern-effort",
    label: "謙虚な意気込み",
    text: "I'm still learning, but I'll do my best.",
    critical: ["learning"],
    intonationTarget: neutralStatementIntonation,
    focus: "learning の l と語尾 ng を確認する",
    stage: 8
  },
  {
    id: "biz-followup",
    label: "フォローアップ連絡",
    text: "I'd like to follow up on our last call.",
    critical: ["follow"],
    intonationTarget: neutralStatementIntonation,
    focus: "follow up の連結と l を確認する",
    stage: 9
  },
  {
    id: "biz-align",
    label: "次のステップの確認",
    text: "Let's align on next steps.",
    critical: ["align"],
    intonationTarget: neutralStatementIntonation,
    focus: "align の l と語頭母音を確認する",
    stage: 9
  },
  {
    id: "biz-lookforward",
    label: "協働への期待",
    text: "I look forward to working with you.",
    critical: ["forward"],
    intonationTarget: neutralStatementIntonation,
    focus: "forward の r と語尾 d を確認する",
    stage: 9
  },
  {
    id: "propose",
    label: "プロポーズ",
    text: "Will you marry me?",
    critical: ["marry"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "marry の r と語尾 y を確認する",
    stage: 10
  },
  {
    id: "life-together",
    label: "人生を共にする誓い",
    text: "I want to spend my life with you.",
    critical: ["spend"],
    intonationTarget: neutralStatementIntonation,
    focus: "spend の sp 連結を確認する",
    stage: 10
  },
  {
    id: "everything-to-me",
    label: "深い愛情表現",
    text: "You mean everything to me.",
    critical: ["everything"],
    intonationTarget: neutralStatementIntonation,
    focus: "everything の th と語尾 ng を確認する",
    stage: 10
  },

  // ここから下は相槌・感嘆詞・呼びかけ表現。ステージに関係なく常時解放し、
  // 日本語ミラー訳は年代・性別のプロフィール(mirrorProfile)によって変わる
  // ものがある(CASUAL_EXPRESSION_MIRRORS参照)。
  {
    id: "react-uhhuh",
    label: "軽い相槌",
    text: "Uh huh.",
    critical: ["uh", "huh"],
    intonationTarget: neutralFragmentIntonation,
    focus: "uh/huh の弱い母音と鼻にかかる音を確認する",
    category: "reaction"
  },
  {
    id: "react-yeah",
    label: "カジュアルな相槌",
    text: "Yeah.",
    critical: ["yeah"],
    intonationTarget: neutralFragmentIntonation,
    focus: "yeah の二重母音と語尾の抜き方を確認する",
    category: "reaction"
  },
  {
    id: "react-isee",
    label: "納得の相槌",
    text: "I see.",
    critical: ["see"],
    intonationTarget: neutralStatementIntonation,
    focus: "see の長母音と文末の下がり方を確認する",
    category: "reaction"
  },
  {
    id: "react-really",
    label: "驚きの聞き返し",
    text: "Really?",
    critical: ["really"],
    intonationTarget: politeRequestQuestionIntonation,
    focus: "really の r と文末の上がり方を確認する",
    category: "reaction"
  },
  {
    id: "react-gotit",
    label: "理解の相槌",
    text: "Got it.",
    critical: ["got"],
    intonationTarget: neutralFragmentIntonation,
    focus: "got it の連結と語尾の t を確認する",
    category: "reaction"
  },
  {
    id: "react-soundsgood",
    label: "同意の相槌",
    text: "Sounds good.",
    critical: ["sounds"],
    intonationTarget: neutralStatementIntonation,
    focus: "sounds の語尾の z と連結を確認する",
    category: "reaction"
  },
  {
    id: "react-noway",
    label: "驚きの感嘆詞",
    text: "No way!",
    critical: ["way"],
    intonationTarget: neutralFragmentIntonation,
    focus: "way の二重母音と感嘆の強さを確認する",
    category: "reaction"
  },
  {
    id: "react-thatsgreat",
    label: "喜びの感嘆詞",
    text: "That's great!",
    critical: ["great"],
    intonationTarget: neutralStatementIntonation,
    focus: "great の gr 連結と語尾の t を確認する",
    category: "reaction"
  },
  {
    id: "react-ohiunderstand",
    label: "納得の感嘆詞",
    text: "Oh, I understand.",
    critical: ["understand"],
    intonationTarget: neutralStatementIntonation,
    focus: "understand の連結と語尾の d を確認する",
    category: "reaction"
  },
  {
    id: "react-sorrytohear",
    label: "共感の相槌",
    text: "I'm sorry to hear that.",
    critical: ["sorry"],
    intonationTarget: neutralStatementIntonation,
    focus: "sorry の r と文末の下がり方を確認する",
    category: "reaction"
  },
  {
    id: "react-hey",
    label: "呼びかけ",
    text: "Hey!",
    critical: ["hey"],
    intonationTarget: neutralFragmentIntonation,
    focus: "hey の二重母音と呼びかけの強さを確認する",
    category: "reaction"
  },
  {
    id: "react-heyguys",
    label: "グループへの呼びかけ",
    text: "Hey, guys!",
    critical: ["guys"],
    intonationTarget: neutralFragmentIntonation,
    focus: "guys の二重母音と語尾の z を確認する",
    category: "reaction"
  },
  {
    id: "react-thanksguys",
    label: "みんなへのお礼",
    text: "Thanks, guys.",
    critical: ["thanks", "guys"],
    intonationTarget: neutralStatementIntonation,
    focus: "thanks の子音連結と guys の語尾 z を確認する",
    category: "reaction"
  }
];

const STORY_STAGES = [
  { stage: 1, name: "挨拶＋一言", threshold: 248, location: "japan" },
  { stage: 2, name: "立ち話・登下校", threshold: 300, location: "japan" },
  { stage: 3, name: "休日の外出", threshold: 400, location: "japan" },
  { stage: 4, name: "ホームステイ", threshold: 550, location: "canada" },
  { stage: 5, name: "留学先の授業", threshold: 700, location: "canada" },
  { stage: 6, name: "スピーチ・プレゼン", threshold: 900, location: "canada" },
  { stage: 7, name: "ディスカッション", threshold: 1100, location: "canada" },
  { stage: 8, name: "海外インターン", threshold: 1400, location: "canada" },
  { stage: 9, name: "グローバル企業への就職", threshold: 1800, location: "canada" },
  { stage: 10, name: "国際結婚", threshold: 2300, location: "canada" }
];

function getContrastSet(idOrText) {
  return contrastSets.find((set) => set.id === idOrText || set.text === idOrText) || contrastSets[0];
}

module.exports = { contrastSets, getContrastSet, STORY_STAGES };
